import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import type { Response, NextFunction } from 'express';
import type { RequestWithLogging } from '../../../../src/server/middleware/requestLogger.js';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

// Mock logger before importing the middleware
const mockChildLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  logRequest: jest.fn(),
  child: jest.fn()
};

const mockLogger = {
  child: jest.fn(() => mockChildLogger),
  debug: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

// Make child return itself for nested child() calls
mockChildLogger.child.mockReturnValue(mockChildLogger);

jest.mock('../../../../src/server/services/logging/config.js', () => ({
  logger: mockLogger
}));

import {
  requestLoggerMiddleware,
  userContextMiddleware
} from '../../../../src/server/middleware/requestLogger.js';

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<RequestWithLogging>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date.now for consistent timing tests
    originalDateNow = Date.now;
    Date.now = jest.fn(() => 1000000);

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return undefined;
      })
    } as any;

    mockResponse = {
      send: jest.fn(),
      statusCode: 200
    };

    mockNext = jest.fn() as jest.Mock<NextFunction>;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('requestLoggerMiddleware', () => {
    it('should generate a unique request ID', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBe('mock-uuid-1234');
    });

    it('should set request start time', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockRequest.startTime).toBe(1000000);
    });

    it('should create a child logger with request context', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockLogger.child).toHaveBeenCalledWith({
        requestId: 'mock-uuid-1234',
        method: 'GET',
        url: '/api/test',
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1'
      });
      expect(mockRequest.logger).toBeDefined();
    });

    it('should log request start in debug mode', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockChildLogger.debug).toHaveBeenCalledWith('Request started');
    });

    it('should call next middleware', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log request completion when response is sent', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      // Advance time by 500ms
      (Date.now as jest.Mock).mockReturnValue(1000500);

      // Send response
      mockResponse.send?.('test response');

      expect(mockChildLogger.logRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'mock-uuid-1234',
          startTime: 1000000
        }),
        200,
        500
      );
    });

    it('should log warning for slow requests (>1000ms)', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      // Advance time by 2000ms (slow request)
      (Date.now as jest.Mock).mockReturnValue(1002000);

      // Send response
      mockResponse.send?.('test response');

      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        {
          duration: '2000ms',
          statusCode: 200
        }
      );
    });

    it('should not log warning for fast requests (<1000ms)', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      // Advance time by 500ms (fast request)
      (Date.now as jest.Mock).mockReturnValue(1000500);

      // Send response
      mockResponse.send?.('test response');

      expect(mockChildLogger.warn).not.toHaveBeenCalled();
    });

    it('should not log warning for requests exactly at 1000ms', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      // Advance time by exactly 1000ms
      (Date.now as jest.Mock).mockReturnValue(1001000);

      // Send response
      mockResponse.send?.('test response');

      expect(mockChildLogger.warn).not.toHaveBeenCalled();
    });

    it('should preserve response body when logging', () => {
      const originalSend = mockResponse.send as jest.Mock;

      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      const testBody = { data: 'test' };
      mockResponse.send?.(testBody);

      // Verify original send was called with the same body
      expect(originalSend).toHaveBeenCalledWith(testBody);
    });

    it('should log different status codes correctly', () => {
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      mockResponse.statusCode = 404;
      (Date.now as jest.Mock).mockReturnValue(1000100);

      mockResponse.send?.('Not found');

      expect(mockChildLogger.logRequest).toHaveBeenCalledWith(
        expect.any(Object),
        404,
        100
      );
    });

    it('should handle missing User-Agent header', () => {
      mockRequest.get = jest.fn(() => undefined);

      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockLogger.child).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: undefined
        })
      );
    });
  });

  describe('userContextMiddleware', () => {
    beforeEach(() => {
      // Setup request with logger from requestLoggerMiddleware
      mockRequest.logger = mockChildLogger;
    });

    it('should add user context to logger when user is authenticated', () => {
      (mockRequest as any).user = {
        id: 'user-123',
        role: 'admin'
      };

      userContextMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockChildLogger.child).toHaveBeenCalledWith({
        userId: 'user-123',
        userRole: 'admin'
      });
      expect(mockRequest.logger).toBe(mockChildLogger);
    });

    it('should not modify logger when user is not authenticated', () => {
      userContextMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockChildLogger.child).not.toHaveBeenCalled();
    });

    it('should call next middleware', () => {
      userContextMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle partial user object', () => {
      (mockRequest as any).user = {
        id: 'user-456'
        // role is missing
      };

      userContextMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockChildLogger.child).toHaveBeenCalledWith({
        userId: 'user-456',
        userRole: undefined
      });
    });
  });

  describe('Integration: Both Middlewares Together', () => {
    it('should work correctly when both middlewares are used in sequence', () => {
      // First: request logger
      requestLoggerMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext);

      expect(mockRequest.requestId).toBe('mock-uuid-1234');
      expect(mockRequest.logger).toBeDefined();

      // Second: user context (simulating authenticated user)
      (mockRequest as any).user = {
        id: 'user-789',
        role: 'editor'
      };

      const mockNext2 = jest.fn();
      userContextMiddleware(mockRequest as RequestWithLogging, mockResponse as Response, mockNext2);

      // Verify user context was added
      expect(mockChildLogger.child).toHaveBeenCalledWith({
        userId: 'user-789',
        userRole: 'editor'
      });

      // Simulate response
      (Date.now as jest.Mock).mockReturnValue(1000750);
      mockResponse.send?.({ success: true });

      // Verify logging works end-to-end
      expect(mockChildLogger.logRequest).toHaveBeenCalledWith(
        expect.any(Object),
        200,
        750
      );
    });
  });
});

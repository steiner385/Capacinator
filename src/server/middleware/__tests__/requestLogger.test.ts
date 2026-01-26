import { requestLoggerMiddleware, userContextMiddleware } from '../requestLogger';
import type { Response, NextFunction } from 'express';
import type { RequestWithLogging } from '../requestLogger';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock logger - must be inside the factory function due to hoisting
jest.mock('../../services/logging/config.js', () => ({
  logger: {
    child: jest.fn().mockReturnThis(),
    debug: jest.fn(),
    logRequest: jest.fn(),
    warn: jest.fn()
  }
}));

describe('requestLoggerMiddleware', () => {
  let mockReq: Partial<RequestWithLogging>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked logger
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockLogger = require('../../services/logging/config.js').logger;

    mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Test User Agent';
        return undefined;
      })
    };

    mockRes = {
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset the mock logger to return itself for chaining
    mockLogger.child.mockReturnValue(mockLogger);
  });

  it('should generate unique request ID', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockReq.requestId).toBe('test-uuid-1234');
  });

  it('should set start time', () => {
    const beforeTime = Date.now();

    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockReq.startTime).toBeGreaterThanOrEqual(beforeTime);
    expect(mockReq.startTime).toBeLessThanOrEqual(Date.now());
  });

  it('should create child logger with request context', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockLogger.child).toHaveBeenCalledWith({
      requestId: 'test-uuid-1234',
      method: 'GET',
      url: '/api/test',
      userAgent: 'Test User Agent',
      ip: '127.0.0.1'
    });
  });

  it('should log request start', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockLogger.debug).toHaveBeenCalledWith('Request started');
  });

  it('should call next middleware', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should log request completion on response send', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    mockReq.startTime = Date.now() - 100; // 100ms ago
    mockRes.statusCode = 200;

    // Call the wrapped send function
    (mockRes.send as jest.Mock)('test response');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    const logRequestCall = mockLogger.logRequest.mock.calls[0];
    expect(logRequestCall[0]).toBe(mockReq);
    expect(logRequestCall[1]).toBe(200);
    expect(logRequestCall[2]).toBeGreaterThan(0); // duration
  });

  it('should warn about slow requests over 1000ms', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    mockReq.startTime = Date.now() - 1500; // 1500ms ago (slow)
    mockRes.statusCode = 200;

    (mockRes.send as jest.Mock)('test response');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Slow request detected',
      expect.objectContaining({
        statusCode: 200
      })
    );
  });

  it('should not warn about fast requests under 1000ms', () => {
    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    mockReq.startTime = Date.now() - 500; // 500ms ago (fast)
    mockRes.statusCode = 200;

    (mockRes.send as jest.Mock)('test response');

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should return the original send result', () => {
    const originalSend = jest.fn().mockReturnValue('send result');
    mockRes.send = originalSend;

    requestLoggerMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    mockReq.startTime = Date.now();
    const result = (mockRes.send as jest.Mock)('test body');

    // The wrapped send should have been called
    expect(result).toBeDefined();
  });
});

describe('userContextMiddleware', () => {
  let mockReq: Partial<RequestWithLogging>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockChildLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChildLogger = {
      child: jest.fn().mockReturnThis()
    };

    mockReq = {
      logger: mockChildLogger
    };

    mockRes = {};
    mockNext = jest.fn();
  });

  it('should add user context to logger when user is authenticated', () => {
    (mockReq as any).user = {
      id: 'user-123',
      role: 'admin'
    };

    userContextMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockChildLogger.child).toHaveBeenCalledWith({
      userId: 'user-123',
      userRole: 'admin'
    });
  });

  it('should not modify logger when user is not authenticated', () => {
    userContextMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockChildLogger.child).not.toHaveBeenCalled();
  });

  it('should call next middleware', () => {
    userContextMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle user with only id', () => {
    (mockReq as any).user = {
      id: 'user-456'
    };

    userContextMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockChildLogger.child).toHaveBeenCalledWith({
      userId: 'user-456',
      userRole: undefined
    });
  });

  it('should update logger reference on req', () => {
    const newLogger = { child: jest.fn() };
    mockChildLogger.child.mockReturnValue(newLogger);

    (mockReq as any).user = {
      id: 'user-789',
      role: 'user'
    };

    userContextMiddleware(mockReq as RequestWithLogging, mockRes as Response, mockNext);

    expect(mockReq.logger).toBe(newLogger);
  });
});

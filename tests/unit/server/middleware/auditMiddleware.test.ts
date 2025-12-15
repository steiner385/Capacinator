import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { Request, Response, NextFunction } from 'express';
import {
  createAuditMiddleware,
  auditModelChanges,
  auditableController
} from '../../../../src/server/middleware/enhancedAuditMiddleware';
import { AuditService } from '../../../../src/server/services/audit/AuditService';

describe('Audit Middleware', () => {
  let mockAuditService: jest.Mocked<AuditService>;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    mockAuditService = {
      logChange: jest.fn().mockResolvedValue('audit-id-123')
    } as any;

    mockRequest = {
      ip: '192.168.1.1',
      connection: { remoteAddress: '192.168.1.100' },
      headers: { 'user-agent': 'Test Browser/1.0' },
      user: { id: 'user-123' },
      get: jest.fn()
    } as any;

    mockResponse = {
      setHeader: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('createAuditMiddleware', () => {
    test('should attach audit context to request', () => {
      const middleware = createAuditMiddleware(mockAuditService);
      
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.audit).toBeDefined();
      expect(mockRequest.audit?.auditService).toBe(mockAuditService);
      expect(mockRequest.audit?.userId).toBe('user-123');
      expect(mockRequest.audit?.ipAddress).toBe('192.168.1.1');
      expect(mockRequest.audit?.userAgent).toBe('Test Browser/1.0');
      expect(typeof mockRequest.audit?.requestId).toBe('string');
      expect(mockRequest.audit?.requestId).toHaveLength(36); // UUID length
    });

    test('should handle missing user gracefully', () => {
      mockRequest.user = undefined;
      
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.audit?.userId).toBeUndefined();
      expect(mockRequest.audit?.auditService).toBe(mockAuditService);
    });

    test('should handle missing IP address gracefully', () => {
      mockRequest.ip = undefined;
      mockRequest.connection = undefined;
      
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.audit?.ipAddress).toBe('unknown');
    });

    test('should handle missing user agent gracefully', () => {
      mockRequest.headers = {};
      
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.audit?.userAgent).toBe('unknown');
    });

    test('should use connection.remoteAddress as fallback for IP', () => {
      mockRequest.ip = undefined;
      
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.audit?.ipAddress).toBe('192.168.1.100');
    });

    test('should set X-Request-ID header', () => {
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        mockRequest.audit?.requestId
      );
    });

    test('should call next function', () => {
      const middleware = createAuditMiddleware(mockAuditService);
      middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('auditModelChanges', () => {
    beforeEach(() => {
      mockRequest.audit = {
        requestId: 'req-123',
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        auditService: mockAuditService
      };
    });

    test('should log model changes successfully', async () => {
      const oldValues = { name: 'John', status: 'active' };
      const newValues = { name: 'Jane', status: 'active' };

      const auditId = await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'UPDATE',
        oldValues,
        newValues,
        'Updated user name'
      );

      expect(auditId).toBe('audit-id-123');
      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'people',
        recordId: 'user-456',
        action: 'UPDATE',
        changedBy: 'user-123',
        oldValues,
        newValues,
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: 'Updated user name'
      });
    });

    test('should handle CREATE action with no old values', async () => {
      const newValues = { name: 'John', email: 'john@example.com' };

      await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'CREATE',
        undefined,
        newValues,
        'Created new user'
      );

      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'people',
        recordId: 'user-456',
        action: 'CREATE',
        changedBy: 'user-123',
        oldValues: undefined,
        newValues,
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: 'Created new user'
      });
    });

    test('should handle DELETE action with no new values', async () => {
      const oldValues = { name: 'John', email: 'john@example.com' };

      await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'DELETE',
        oldValues,
        undefined,
        'Deleted user'
      );

      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'people',
        recordId: 'user-456',
        action: 'DELETE',
        changedBy: 'user-123',
        oldValues,
        newValues: undefined,
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: 'Deleted user'
      });
    });

    test('should return null when audit context is missing', async () => {
      mockRequest.audit = undefined;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const auditId = await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'UPDATE',
        {},
        {}
      );

      expect(auditId).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Audit context not available - audit middleware may not be configured'
      );
      expect(mockAuditService.logChange).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle audit service errors gracefully', async () => {
      mockAuditService.logChange.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const auditId = await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'UPDATE',
        {},
        {}
      );

      expect(auditId).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log audit entry:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing optional parameters', async () => {
      await auditModelChanges(
        mockRequest,
        'people',
        'user-456',
        'UPDATE'
      );

      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'people',
        recordId: 'user-456',
        action: 'UPDATE',
        changedBy: 'user-123',
        oldValues: undefined,
        newValues: undefined,
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: undefined
      });
    });
  });

  describe('auditableController', () => {
    beforeEach(() => {
      mockRequest.audit = {
        requestId: 'req-123',
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        auditService: mockAuditService
      };

      mockRequest.url = '/api/people';
      mockRequest.method = 'POST';
      mockRequest.body = { name: 'John' };
      mockRequest.query = { filter: 'active' };
      mockRequest.params = { id: '123' };
    });

    test('should execute controller function successfully', async () => {
      const mockController = jest.fn().mockResolvedValue({ id: 'user-123', name: 'John' }) as any;
      const wrappedController = auditableController(mockController);

      const result = await wrappedController(
        mockRequest, 
        mockResponse, 
        mockNext
      );

      expect(result).toEqual({ id: 'user-123', name: 'John' });
      expect(mockController).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockAuditService.logChange).not.toHaveBeenCalled(); // No error occurred
    });

    test('should log errors in audit trail when controller throws', async () => {
      const controllerError = new Error('Controller failed');
      const mockController = jest.fn().mockRejectedValue(controllerError) as any;
      const wrappedController = auditableController(mockController);

      await expect(
        wrappedController(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('Controller failed');

      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'system_errors',
        recordId: 'req-123',
        action: 'CREATE',
        changedBy: 'user-123',
        newValues: {
          error: 'Controller failed',
          stack: expect.stringContaining('Error: Controller failed'),
          url: '/api/people',
          method: 'POST',
          body: { name: 'John' },
          query: { filter: 'active' },
          params: { id: '123' }
        },
        requestId: 'req-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: 'System error occurred'
      });
    });

    test('should handle missing audit context when logging errors', async () => {
      mockRequest.audit = undefined;
      
      const controllerError = new Error('Controller failed');
      const mockController = jest.fn().mockRejectedValue(controllerError) as any;
      const wrappedController = auditableController(mockController);

      await expect(
        wrappedController(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('Controller failed');

      expect(mockAuditService.logChange).not.toHaveBeenCalled();
    });

    test('should handle audit service errors during error logging', async () => {
      mockAuditService.logChange.mockRejectedValue(new Error('Audit service error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const controllerError = new Error('Controller failed');
      const mockController = jest.fn().mockRejectedValue(controllerError) as any;
      const wrappedController = auditableController(mockController);

      await expect(
        wrappedController(mockRequest as Request, mockResponse as Response, mockNext)
      ).rejects.toThrow('Controller failed');

      // Should still throw the original error, not the audit service error
      expect(consoleSpy).not.toHaveBeenCalled(); // Error logging is fire-and-forget

      consoleSpy.mockRestore();
    });

    test('should preserve async controller behavior', async () => {
      const mockController = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });

      const wrappedController = auditableController(mockController);
      const result = await wrappedController(
        mockRequest, 
        mockResponse, 
        mockNext
      );

      expect(result).toBe('async result');
    });
  });

  describe('Integration Tests', () => {
    test('should work end-to-end with real request flow', async () => {
      // Setup middleware
      const middleware = createAuditMiddleware(mockAuditService);
      
      // Create a mock controller that uses audit logging
      const mockController = async (req: Request, res: Response) => {
        const userData = { name: 'John Doe', email: 'john@example.com' };
        
        // Simulate database insert
        const userId = 'user-123';
        
        // Log the creation
        await auditModelChanges(
          req,
          'people',
          userId,
          'CREATE',
          undefined,
          userData,
          'User created via API'
        );
        
        return { id: userId, ...userData };
      };

      const wrappedController = auditableController(mockController);

      // Execute middleware first
      middleware(mockRequest, mockResponse, mockNext);
      
      // Then execute controller
      const result = await wrappedController(
        mockRequest, 
        mockResponse, 
        mockNext
      );

      // Verify middleware attached audit context
      expect(mockRequest.audit).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID', 
        mockRequest.audit?.requestId
      );

      // Verify controller executed and logged audit entry
      expect(result).toEqual({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'people',
        recordId: 'user-123',
        action: 'CREATE',
        changedBy: 'user-123',
        oldValues: undefined,
        newValues: { name: 'John Doe', email: 'john@example.com' },
        requestId: mockRequest.audit?.requestId,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser/1.0',
        comment: 'User created via API'
      });
    });

    test('should handle concurrent requests with unique request IDs', async () => {
      const middleware = createAuditMiddleware(mockAuditService);
      
      const requests = Array.from({ length: 5 }, (_, i) => ({
        ip: `192.168.1.${i + 1}`,
        headers: { 'user-agent': `Browser ${i}` },
        user: { id: `user-${i}` }
      }));

      const auditContexts: any[] = [];

      // Process all requests
      requests.forEach((req, i) => {
        const mockRes = { setHeader: jest.fn() };
        const mockNext = jest.fn();
        
        middleware(req as any, mockRes as any, mockNext);
        auditContexts.push((req as any).audit);
      });

      // Verify all request IDs are unique
      const requestIds = auditContexts.map(ctx => ctx.requestId);
      const uniqueRequestIds = new Set(requestIds);
      
      expect(uniqueRequestIds.size).toBe(5);
      expect(requestIds).toHaveLength(5);

      // Verify each context has correct data
      auditContexts.forEach((ctx, i) => {
        expect(ctx.userId).toBe(`user-${i}`);
        expect(ctx.ipAddress).toBe(`192.168.1.${i + 1}`);
        expect(ctx.userAgent).toBe(`Browser ${i}`);
        expect(ctx.auditService).toBe(mockAuditService);
      });
    });
  });
});
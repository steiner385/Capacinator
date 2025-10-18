import { EnhancedBaseController } from '../EnhancedBaseController';
import type { Response, NextFunction } from 'express';
import type { RequestWithLogging } from '../../../middleware/requestLogger';

// Create a concrete implementation for testing
class TestEnhancedController extends EnhancedBaseController {
  public testCreateOperationalError(message: string, statusCode?: number) {
    return this.createOperationalError(message, statusCode);
  }

  public testHandleError(error: any, req: RequestWithLogging, res: Response, message?: string) {
    return this.handleError(error, req, res, message);
  }

  public testHandleNotFound(req: RequestWithLogging, res: Response, resource?: string) {
    return this.handleNotFound(req, res, resource);
  }

  public testHandleValidationError(req: RequestWithLogging, res: Response, errors: any) {
    return this.handleValidationError(req, res, errors);
  }

  public testExecuteQuery<T>(
    queryFn: () => Promise<T>,
    req: RequestWithLogging,
    res: Response,
    errorMessage?: string
  ) {
    return this.executeQuery(queryFn, req, res, errorMessage);
  }

  public testPaginate(query: any, page?: number, limit?: number) {
    return this.paginate(query, page, limit);
  }

  public testBuildFilters(query: any, filters: Record<string, any>) {
    return this.buildFilters(query, filters);
  }

  public testLogBusinessOperation(
    req: RequestWithLogging,
    operation: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ) {
    return this.logBusinessOperation(req, operation, entityType, entityId, metadata);
  }

  public testAsyncHandler(fn: (req: RequestWithLogging, res: Response, next: NextFunction) => Promise<any>) {
    return this.asyncHandler(fn);
  }

  public testSendSuccess(req: RequestWithLogging, res: Response, data: any, message?: string) {
    return this.sendSuccess(req, res, data, message);
  }

  public testSendPaginatedResponse(
    req: RequestWithLogging,
    res: Response,
    data: any[],
    total: number,
    page: number,
    limit: number
  ) {
    return this.sendPaginatedResponse(req, res, data, total, page, limit);
  }

  public testSendError(req: RequestWithLogging, res: Response, message: string, statusCode?: number) {
    return this.sendError(req, res, message, statusCode);
  }
}

describe('EnhancedBaseController', () => {
  let controller: TestEnhancedController;
  let mockReq: Partial<RequestWithLogging>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockQuery: any;

  beforeEach(() => {
    controller = new TestEnhancedController();

    mockReq = {
      requestId: 'test-request-id',
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        logPerformance: jest.fn(),
        logBusinessOperation: jest.fn()
      } as any
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis()
    };
  });

  describe('createOperationalError', () => {
    it('should create operational error with default status code', () => {
      const error = controller.testCreateOperationalError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.isOperational).toBe(true);
      expect(error.statusCode).toBe(400);
    });

    it('should create operational error with custom status code', () => {
      const error = controller.testCreateOperationalError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.isOperational).toBe(true);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('handleError', () => {
    it('should handle operational errors', () => {
      const operationalError = controller.testCreateOperationalError('Validation failed', 400);

      controller.testHandleError(operationalError, mockReq as RequestWithLogging, mockRes as Response);

      expect(mockReq.logger?.error).toHaveBeenCalledWith(
        'Controller error',
        operationalError,
        expect.objectContaining({
          controller: 'TestEnhancedController'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        requestId: 'test-request-id'
      });
    });

    it('should handle non-operational errors', () => {
      const error = new Error('Unexpected error');

      controller.testHandleError(error, mockReq as RequestWithLogging, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        requestId: 'test-request-id',
        details: undefined
      });
    });

    it('should handle non-operational errors with custom message', () => {
      const error = new Error('Database error');

      controller.testHandleError(error, mockReq as RequestWithLogging, mockRes as Response, 'Custom error message');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Custom error message',
        requestId: 'test-request-id',
        details: undefined
      });
    });

    it('should include error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Database error');

      controller.testHandleError(error, mockReq as RequestWithLogging, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        requestId: 'test-request-id',
        details: 'Database error'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should log SQLite errors with code', () => {
      const sqliteError = new Error('SQLITE error') as any;
      sqliteError.code = 'SQLITE_ERROR';

      controller.testHandleError(sqliteError, mockReq as RequestWithLogging, mockRes as Response);

      expect(mockReq.logger?.error).toHaveBeenCalledWith(
        'Controller error',
        sqliteError,
        expect.objectContaining({
          controller: 'TestEnhancedController',
          sqlError: 'SQLITE error'
        })
      );
    });
  });

  describe('handleNotFound', () => {
    it('should handle not found with default resource', () => {
      controller.testHandleNotFound(mockReq as RequestWithLogging, mockRes as Response);

      expect(mockReq.logger?.info).toHaveBeenCalledWith(
        'Resource not found',
        expect.objectContaining({ controller: 'TestEnhancedController' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Resource not found',
        requestId: 'test-request-id'
      });
    });

    it('should handle not found with custom resource', () => {
      controller.testHandleNotFound(mockReq as RequestWithLogging, mockRes as Response, 'User');

      expect(mockReq.logger?.info).toHaveBeenCalledWith(
        'User not found',
        expect.objectContaining({ controller: 'TestEnhancedController' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        requestId: 'test-request-id'
      });
    });
  });

  describe('handleValidationError', () => {
    it('should handle validation errors', () => {
      const errors = { field: 'is required', email: 'invalid format' };

      controller.testHandleValidationError(mockReq as RequestWithLogging, mockRes as Response, errors);

      expect(mockReq.logger?.warn).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          controller: 'TestEnhancedController',
          validationErrors: errors
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors,
        requestId: 'test-request-id'
      });
    });
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      const queryFn = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const result = await controller.testExecuteQuery(
        queryFn,
        mockReq as RequestWithLogging,
        mockRes as Response
      );

      expect(queryFn).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(mockReq.logger?.logPerformance).not.toHaveBeenCalled();
    });

    it('should log performance for slow queries', async () => {
      const queryFn = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 1 }), 150))
      );

      await controller.testExecuteQuery(
        queryFn,
        mockReq as RequestWithLogging,
        mockRes as Response
      );

      expect(mockReq.logger?.logPerformance).toHaveBeenCalledWith(
        'Database Query',
        expect.any(Number),
        expect.objectContaining({ controller: 'TestEnhancedController' })
      );
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      const queryFn = jest.fn().mockRejectedValue(error);

      const result = await controller.testExecuteQuery(
        queryFn,
        mockReq as RequestWithLogging,
        mockRes as Response,
        'Custom error message'
      );

      expect(result).toBeUndefined();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('paginate', () => {
    it('should paginate with default values', () => {
      controller.testPaginate(mockQuery);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should paginate with custom page and limit', () => {
      controller.testPaginate(mockQuery, 3, 20);

      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });
  });

  describe('buildFilters', () => {
    it('should handle exact match filters', () => {
      const filters = { id: '123', status: 'active' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('id', '123');
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
    });

    it('should handle LIKE filters with % wildcard', () => {
      const filters = { name: '%test%' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('name', 'like', '%test%');
    });

    it('should handle array filters with whereIn', () => {
      const filters = { status: ['active', 'pending'] };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.whereIn).toHaveBeenCalledWith('status', ['active', 'pending']);
    });

    it('should skip null, undefined, and empty string values', () => {
      const filters = { a: null, b: undefined, c: '', d: 'valid' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(1);
      expect(mockQuery.where).toHaveBeenCalledWith('d', 'valid');
    });
  });

  describe('asyncHandler', () => {
    it('should wrap async function and handle success', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const handler = controller.testAsyncHandler(asyncFn);

      await handler(mockReq as RequestWithLogging, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const handler = controller.testAsyncHandler(asyncFn);

      await handler(mockReq as RequestWithLogging, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendSuccess', () => {
    it('should send success response without message', () => {
      const data = { id: 1, name: 'Test' };

      controller.testSendSuccess(mockReq as RequestWithLogging, mockRes as Response, data);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        requestId: 'test-request-id'
      });
    });

    it('should send success response with message', () => {
      const data = { id: 1, name: 'Test' };

      controller.testSendSuccess(mockReq as RequestWithLogging, mockRes as Response, data, 'Operation completed');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        requestId: 'test-request-id',
        message: 'Operation completed'
      });
    });
  });

  describe('sendPaginatedResponse', () => {
    it('should send paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];

      controller.testSendPaginatedResponse(
        mockReq as RequestWithLogging,
        mockRes as Response,
        data,
        50,
        2,
        10
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNextPage: true,
          hasPrevPage: true
        },
        requestId: 'test-request-id'
      });
    });

    it('should indicate no next page on last page', () => {
      const data = [{ id: 1 }];

      controller.testSendPaginatedResponse(
        mockReq as RequestWithLogging,
        mockRes as Response,
        data,
        21,
        3,
        10
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 3,
          limit: 10,
          total: 21,
          totalPages: 3,
          hasNextPage: false,
          hasPrevPage: true
        },
        requestId: 'test-request-id'
      });
    });

    it('should indicate no previous page on first page', () => {
      const data = [{ id: 1 }];

      controller.testSendPaginatedResponse(
        mockReq as RequestWithLogging,
        mockRes as Response,
        data,
        10,
        1,
        10
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        },
        requestId: 'test-request-id'
      });
    });
  });

  describe('sendError', () => {
    it('should send error response with default status code', () => {
      controller.testSendError(mockReq as RequestWithLogging, mockRes as Response, 'Something went wrong');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Something went wrong'
      });
    });

    it('should send error response with custom status code', () => {
      controller.testSendError(mockReq as RequestWithLogging, mockRes as Response, 'Not found', 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not found'
      });
    });
  });
});

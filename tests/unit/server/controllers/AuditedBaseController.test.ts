import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';

// Unmock the controller to test the real implementation
jest.unmock('../../../../src/server/api/controllers/AuditedBaseController.ts');

// Import the controller - no mocking needed with dependency injection!
import { AuditedBaseController } from '../../../../src/server/api/controllers/AuditedBaseController.js';

// Create mock objects - these will be injected directly
const mockSetDefaultContext = jest.fn();
const mockAuditedDb = {
  setDefaultContext: mockSetDefaultContext,
  raw: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn(),
  first: jest.fn()
};

// Create a concrete test class to test the abstract base
class TestController extends AuditedBaseController {
  constructor(auditedDb?: any) {
    super(auditedDb);
  }

  // Expose protected methods for testing
  public testGetDb(req?: Request) {
    return this.getDb(req);
  }

  public testDb() {
    return this.db;
  }

  public testHandleError(error: any, res: Response, message?: string) {
    return this.handleError(error, res, message);
  }

  public testHandleNotFound(res: Response, resource?: string) {
    return this.handleNotFound(res, resource);
  }

  public testHandleValidationError(res: Response, errors: any) {
    return this.handleValidationError(res, errors);
  }

  public async testExecuteQuery<T>(
    queryFn: () => Promise<T>,
    res: Response,
    errorMessage?: string
  ) {
    return this.executeQuery(queryFn, res, errorMessage);
  }

  public async testExecuteAuditedQuery<T>(
    req: Request,
    queryFn: (db: any) => Promise<T>,
    res: Response,
    errorMessage?: string
  ) {
    return this.executeAuditedQuery(req, queryFn, res, errorMessage);
  }

  public testPaginate(query: any, page?: number, limit?: number) {
    return this.paginate(query, page, limit);
  }

  public testBuildFilters(query: any, filters: Record<string, any>) {
    return this.buildFilters(query, filters);
  }
}

describe('AuditedBaseController', () => {
  let controller: TestController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    mockSetDefaultContext.mockClear();

    // Inject mock database via constructor
    controller = new TestController(mockAuditedDb);

    mockRequest = {
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return undefined;
      })
    } as any;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock as any,
      json: jsonMock
    };

    // Reset environment
    delete process.env.NODE_ENV;
  });

  describe('constructor', () => {
    it('should initialize auditedDb', () => {
      expect(controller.testDb()).toBe(mockAuditedDb);
    });
  });

  describe('getDb', () => {
    it('should return database with audit context when request is provided', () => {
      (mockRequest as any).requestId = 'req-123';
      (mockRequest as any).user = { id: 'user-456' };

      const result = controller.testGetDb(mockRequest as Request);

      expect(mockSetDefaultContext).toHaveBeenCalledWith({
        userId: 'user-456',
        requestId: 'req-123',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      });
      expect(result).toBe(mockAuditedDb);
    });

    it('should handle missing user context', () => {
      (mockRequest as any).requestId = 'req-789';

      controller.testGetDb(mockRequest as Request);

      expect(mockSetDefaultContext).toHaveBeenCalledWith({
        userId: undefined,
        requestId: 'req-789',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      });
    });

    it('should handle missing User-Agent header', () => {
      mockRequest.get = jest.fn(() => undefined);
      (mockRequest as any).requestId = 'req-101';

      controller.testGetDb(mockRequest as Request);

      expect(mockSetDefaultContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: undefined
        })
      );
    });

    it('should return auditedDb without context when no request is provided', () => {
      const result = controller.testGetDb();

      expect(result).toBe(mockAuditedDb);
      expect(mockSetDefaultContext).not.toHaveBeenCalled();
    });
  });

  describe('db getter', () => {
    it('should return auditedDb instance', () => {
      expect(controller.testDb()).toBe(mockAuditedDb);
    });
  });

  describe('handleError', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return 500 error with custom message', () => {
      const error = new Error('Test error');

      controller.testHandleError(error, mockResponse as Response, 'Custom error message');

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Custom error message',
        details: undefined
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Controller error:', error);
    });

    it('should use default error message if not provided', () => {
      const error = new Error('Test error');

      controller.testHandleError(error, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: undefined
      });
    });

    it('should include error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');

      controller.testHandleError(error, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Detailed error message'
      });
    });

    it('should log SQL error details for SQLite errors', () => {
      const error: any = {
        message: 'SQLITE_ERROR: syntax error near "FROM"',
        code: 'SQLITE_ERROR'
      };

      controller.testHandleError(error, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Controller error:', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('SQL Error details:', error.message);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should not include details in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Sensitive error');

      controller.testHandleError(error, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: undefined
      });
    });
  });

  describe('handleNotFound', () => {
    it('should return 404 with default message', () => {
      controller.testHandleNotFound(mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Resource not found'
      });
    });

    it('should return 404 with custom resource name', () => {
      controller.testHandleNotFound(mockResponse as Response, 'Project');

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Project not found'
      });
    });
  });

  describe('handleValidationError', () => {
    it('should return 400 with validation errors', () => {
      const errors = {
        name: 'Name is required',
        email: 'Invalid email format'
      };

      controller.testHandleValidationError(mockResponse as Response, errors);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors
      });
    });

    it('should handle array of validation errors', () => {
      const errors = ['Field is required', 'Field must be unique'];

      controller.testHandleValidationError(mockResponse as Response, errors);

      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors
      });
    });
  });

  describe('executeQuery', () => {
    it('should execute query successfully and return result', async () => {
      const queryFn = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const result = await controller.testExecuteQuery(
        queryFn,
        mockResponse as Response
      );

      expect(queryFn).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should handle query error and return undefined', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const queryFn = jest.fn().mockRejectedValue(new Error('Query failed'));

      const result = await controller.testExecuteQuery(
        queryFn,
        mockResponse as Response,
        'Failed to execute query'
      );

      expect(result).toBeUndefined();
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to execute query',
        details: undefined
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeAuditedQuery', () => {
    it('should execute audited query successfully', async () => {
      (mockRequest as any).requestId = 'req-123';
      (mockRequest as any).user = { id: 'user-456' };

      const queryFn = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await controller.testExecuteAuditedQuery(
        mockRequest as Request,
        queryFn,
        mockResponse as Response
      );

      expect(mockSetDefaultContext).toHaveBeenCalled();
      expect(queryFn).toHaveBeenCalledWith(mockAuditedDb);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle audited query error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const queryFn = jest.fn().mockRejectedValue(new Error('DB error'));

      const result = await controller.testExecuteAuditedQuery(
        mockRequest as Request,
        queryFn,
        mockResponse as Response,
        'Query execution failed'
      );

      expect(result).toBeUndefined();
      expect(statusMock).toHaveBeenCalledWith(500);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('paginate', () => {
    let mockQuery: any;

    beforeEach(() => {
      mockQuery = {
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis()
      };
    });

    it('should paginate with default values (page 1, limit 50)', () => {
      controller.testPaginate(mockQuery);

      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });

    it('should paginate with custom page and limit', () => {
      controller.testPaginate(mockQuery, 3, 25);

      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(mockQuery.offset).toHaveBeenCalledWith(50); // (3-1) * 25
    });

    it('should calculate correct offset for different pages', () => {
      controller.testPaginate(mockQuery, 5, 10);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.offset).toHaveBeenCalledWith(40); // (5-1) * 10
    });

    it('should handle page 1 with zero offset', () => {
      controller.testPaginate(mockQuery, 1, 20);

      expect(mockQuery.offset).toHaveBeenCalledWith(0);
    });
  });

  describe('buildFilters', () => {
    let mockQuery: any;

    beforeEach(() => {
      mockQuery = {
        where: jest.fn().mockReturnThis()
      };
    });

    it('should add equality filters for non-wildcard values', () => {
      const filters = {
        status: 'active',
        type: 'project',
        priority: 1
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
      expect(mockQuery.where).toHaveBeenCalledWith('type', 'project');
      expect(mockQuery.where).toHaveBeenCalledWith('priority', 1);
      expect(mockQuery.where).toHaveBeenCalledTimes(3);
    });

    it('should add LIKE filters for values containing %', () => {
      const filters = {
        name: '%test%',
        email: 'john%'
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('name', 'like', '%test%');
      expect(mockQuery.where).toHaveBeenCalledWith('email', 'like', 'john%');
    });

    it('should skip undefined values', () => {
      const filters = {
        name: 'test',
        status: undefined,
        type: 'active'
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(2);
      expect(mockQuery.where).toHaveBeenCalledWith('name', 'test');
      expect(mockQuery.where).toHaveBeenCalledWith('type', 'active');
      expect(mockQuery.where).not.toHaveBeenCalledWith('status', expect.anything());
    });

    it('should skip null values', () => {
      const filters = {
        name: 'test',
        status: null,
        type: 'active'
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(2);
    });

    it('should skip empty string values', () => {
      const filters = {
        name: 'test',
        status: '',
        type: 'active'
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(2);
    });

    it('should include zero values', () => {
      const filters = {
        count: 0,
        enabled: false
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('count', 0);
      expect(mockQuery.where).toHaveBeenCalledWith('enabled', false);
    });

    it('should handle empty filters object', () => {
      controller.testBuildFilters(mockQuery, {});

      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    it('should handle mixed equality and LIKE filters', () => {
      const filters = {
        name: '%project%',
        status: 'active',
        description: '%test%',
        type: 'internal'
      };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('name', 'like', '%project%');
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
      expect(mockQuery.where).toHaveBeenCalledWith('description', 'like', '%test%');
      expect(mockQuery.where).toHaveBeenCalledWith('type', 'internal');
    });
  });
});

import { BaseController } from '../BaseController';
import type { Response } from 'express';

// Create a concrete implementation for testing
class TestController extends BaseController {
  public testHandleError(error: any, res: Response, message?: string) {
    return this.handleError(error, res, message);
  }

  public testHandleValidationError(res: Response, errors: any) {
    return this.handleValidationError(res, errors);
  }

  public testBuildFilters(query: any, filters: Record<string, any>) {
    return this.buildFilters(query, filters);
  }
}

describe('BaseController', () => {
  let controller: TestController;
  let mockRes: Partial<Response>;
  let mockQuery: any;

  beforeEach(() => {
    controller = new TestController();

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis()
    };
  });

  describe('handleError', () => {
    it('should log SQL error details for SQLITE errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const sqliteError = new Error('SQLITE_CONSTRAINT error') as any;
      sqliteError.code = 'SQLITE_ERROR';

      controller.testHandleError(sqliteError, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Controller error:', sqliteError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('SQL Error details:', 'SQLITE_CONSTRAINT error');
      expect(mockRes.status).toHaveBeenCalledWith(500);

      consoleErrorSpy.mockRestore();
    });

    it('should handle regular errors without SQL logging', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const regularError = new Error('Regular error');

      controller.testHandleError(regularError, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Controller error:', regularError);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // Only called once, not twice
      expect(mockRes.status).toHaveBeenCalledWith(500);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleValidationError', () => {
    it('should return 400 with validation errors', () => {
      const errors = { field: 'is required' };

      controller.testHandleValidationError(mockRes as Response, errors);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: errors
      });
    });
  });

  describe('buildFilters', () => {
    it('should handle LIKE filters with % wildcard', () => {
      const filters = { name: '%test%' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('name', 'like', '%test%');
    });

    it('should handle exact match filters', () => {
      const filters = { id: '123', status: 'active' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledWith('id', '123');
      expect(mockQuery.where).toHaveBeenCalledWith('status', 'active');
    });

    it('should skip null, undefined, and empty string values', () => {
      const filters = { a: null, b: undefined, c: '', d: 'valid' };

      controller.testBuildFilters(mockQuery, filters);

      expect(mockQuery.where).toHaveBeenCalledTimes(1);
      expect(mockQuery.where).toHaveBeenCalledWith('d', 'valid');
    });
  });
});

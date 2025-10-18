import { errorHandler } from '../errorHandler';
import type { Request, Response, NextFunction } from 'express';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should log error to console', () => {
    const error = new Error('Test error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error);
  });

  it('should return 500 status code', () => {
    const error = new Error('Test error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should return error response with message', () => {
    const error = new Error('Test error message');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: 'Test error message'
    });
  });

  it('should handle errors without messages', () => {
    const error = new Error();

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: ''
    });
  });

  it('should handle custom error messages', () => {
    const error = new Error('Database connection failed');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      message: 'Database connection failed'
    });
  });
});

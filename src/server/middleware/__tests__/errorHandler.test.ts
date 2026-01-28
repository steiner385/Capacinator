// Mock the logger
jest.mock('../../services/logging/config.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn()
  }
}));

import { errorHandler } from '../errorHandler.js';
import { logger } from '../../services/logging/config.js';
import type { Request, Response, NextFunction } from 'express';

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      url: '/test',
      method: 'GET'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should log error to logger', () => {
    const error = new Error('Test error');

    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled error',
      error,
      { url: '/test', method: 'GET' }
    );
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

import type { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { RequestWithLogging } from '../../middleware/requestLogger.js';

export interface OperationalError extends Error {
  isOperational: boolean;
  statusCode: number;
}

export abstract class EnhancedBaseController {
  protected db = db;

  // Create operational errors that are safe to show to users
  protected createOperationalError(message: string, statusCode: number = 400): OperationalError {
    const error = new Error(message) as OperationalError;
    error.isOperational = true;
    error.statusCode = statusCode;
    return error;
  }

  protected handleError(error: any, req: RequestWithLogging, res: Response, message = 'Internal server error') {
    // Use request logger for consistent context
    req.logger.error('Controller error', error, {
      controller: this.constructor.name,
      sqlError: error.code === 'SQLITE_ERROR' ? error.message : undefined
    });

    if (error.isOperational) {
      return res.status(error.statusCode).json({
        error: error.message,
        requestId: req.requestId
      });
    }

    res.status(500).json({
      error: message,
      requestId: req.requestId,
      details: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'e2e' ? error.message : undefined
    });
  }

  protected handleNotFound(req: RequestWithLogging, res: Response, resource = 'Resource') {
    req.logger.info(`${resource} not found`, {
      controller: this.constructor.name
    });

    res.status(404).json({
      error: `${resource} not found`,
      requestId: req.requestId
    });
  }

  protected handleValidationError(req: RequestWithLogging, res: Response, errors: any) {
    req.logger.warn('Validation failed', {
      controller: this.constructor.name,
      validationErrors: errors
    });

    res.status(400).json({
      error: 'Validation failed',
      details: errors,
      requestId: req.requestId
    });
  }

  protected async executeQuery<T>(
    queryFn: () => Promise<T>,
    req: RequestWithLogging,
    res: Response,
    errorMessage?: string
  ): Promise<T | undefined> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      
      // Log performance for slow queries
      const duration = Date.now() - startTime;
      if (duration > 100) {
        req.logger.logPerformance('Database Query', duration, {
          controller: this.constructor.name
        });
      }
      
      return result;
    } catch (error) {
      this.handleError(error, req, res, errorMessage);
      return undefined;
    }
  }

  protected paginate(query: any, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }

  protected buildFilters(query: any, filters: Record<string, any>) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query.whereIn(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query.where(key, 'like', value);
        } else {
          query.where(key, value);
        }
      }
    });
    return query;
  }

  // Helper method for logging business operations
  protected logBusinessOperation(
    req: RequestWithLogging,
    operation: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {}
  ) {
    req.logger.logBusinessOperation(
      operation,
      entityType,
      entityId,
      (req as any).user?.id,
      {
        controller: this.constructor.name,
        ...metadata
      }
    );
  }

  // Wrapper for async route handlers
  protected asyncHandler(fn: (req: RequestWithLogging, res: Response, next: NextFunction) => Promise<any>) {
    return (req: RequestWithLogging, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Helper for success responses
  protected sendSuccess(req: RequestWithLogging, res: Response, data: any, message?: string) {
    const response: any = {
      success: true,
      data,
      requestId: req.requestId
    };

    if (message) {
      response.message = message;
    }

    res.json(response);
  }

  // Helper for paginated responses
  protected sendPaginatedResponse(
    req: RequestWithLogging,
    res: Response,
    data: any[],
    total: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      requestId: req.requestId
    });
  }
}
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logging/config.js';

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function enhancedErrorHandler(err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) {
  // Determine error status
  const status = err.status || err.statusCode || 500;
  const isOperational = err.isOperational || status < 500;

  // Create error context
  const errorContext = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: (req as any).requestId,
    userId: (req as any).user?.id,
    statusCode: status,
    isOperational
  };

  // Log the error with appropriate level
  if (status >= 500) {
    logger.error('Server Error', err, errorContext);
  } else if (status >= 400) {
    logger.warn('Client Error', errorContext);
  } else {
    logger.info('Request Error', errorContext);
  }

  // Send appropriate response
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response: any = {
    error: getErrorMessage(err, status),
    requestId: (req as any).requestId
  };

  // Include details in development or for operational errors
  if (isDevelopment || isOperational) {
    response.details = err.message;
  }

  // Include stack trace only in development for server errors
  if (isDevelopment && status >= 500) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

function getErrorMessage(err: ErrorWithStatus, status: number): string {
  // Known operational errors
  if (err.isOperational) {
    return err.message;
  }

  // HTTP status-based messages
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation Failed';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return status >= 500 ? 'Internal Server Error' : 'Request Failed';
  }
}

// Handle unhandled promise rejections
export function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', reason || 'Unknown reason', {
      promise: promise?.toString() || 'Unknown promise',
      reason: reason?.toString() || 'No reason provided',
      stack: reason?.stack || 'No stack trace'
    });
    
    // In E2E mode, don't exit the process - just log the error
    if (process.env.NODE_ENV === 'e2e') {
      console.error('❌ Unhandled Promise Rejection -', reason?.message || reason || 'Unknown reason');
      return;
    }
    
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    
    // Exit gracefully
    process.exit(1);
  });

  // Handle graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    // Close server, database connections, etc.
    setTimeout(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
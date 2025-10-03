import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logging/config.js';

export interface RequestWithLogging extends Request {
  requestId: string;
  startTime: number;
  logger: any;
}

export function requestLoggerMiddleware(req: RequestWithLogging, res: Response, next: NextFunction) {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Create child logger with request context
  req.logger = logger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log request start (only in debug mode to avoid noise)
  req.logger.debug('Request started');

  // Capture response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - req.startTime;
    
    // Log request completion
    req.logger.logRequest(req, res.statusCode, duration);

    // Log slow requests as warnings
    if (duration > 1000) {
      req.logger.warn('Slow request detected', {
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }

    return originalSend.call(this, body);
  };

  next();
}

// Middleware to extract user information and add to logger context
export function userContextMiddleware(req: RequestWithLogging, res: Response, next: NextFunction) {
  // If user is authenticated, add to logger context
  if ((req as any).user) {
    req.logger = req.logger.child({
      userId: (req as any).user.id,
      userRole: (req as any).user.role
    });
  }

  next();
}
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logging/config.js';

export interface RequestWithLogging extends Request {
  requestId: string;
  startTime: number;
  logger: any;
}

export const requestLoggerMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  // Generate unique request ID
  reqWithLogging.requestId = uuidv4();
  reqWithLogging.startTime = Date.now();

  // Create child logger with request context
  reqWithLogging.logger = logger.child({
    requestId: reqWithLogging.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log request start (only in debug mode to avoid noise)
  reqWithLogging.logger.debug('Request started');

  // Capture response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - reqWithLogging.startTime;

    // Log request completion
    reqWithLogging.logger.logRequest(req, res.statusCode, duration);

    // Log slow requests as warnings
    if (duration > 1000) {
      reqWithLogging.logger.warn('Slow request detected', {
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// Middleware to extract user information and add to logger context
export const userContextMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  // If user is authenticated, add to logger context
  if ((req as any).user) {
    reqWithLogging.logger = reqWithLogging.logger.child({
      userId: (req as any).user.id,
      userRole: (req as any).user.role
    });
  }

  next();
};
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logging/config.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error', err, { url: req.url, method: req.method });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
}
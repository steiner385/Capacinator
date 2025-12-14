import type { Request, Response, NextFunction } from 'express';
import { authService, AuthError, TokenPayload } from '../services/auth/index.js';

// Extend Express Request to include auth user
declare global {
  namespace Express {
    interface Request {
      authUser?: TokenPayload;
    }
  }
}

/**
 * Middleware to verify JWT authentication token
 * Extracts Bearer token from Authorization header and validates it
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_TOKEN',
          message: 'Authorization header is missing'
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>'
        });
      }

      const token = parts[1];
      const payload = authService.verifyAccessToken(token);

      // Attach user info to request for downstream use
      req.authUser = payload;

      // Also set user for compatibility with existing permissions middleware
      req.user = {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
        is_system_admin: payload.isSystemAdmin,
        user_role_id: payload.userRoleId
      };

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        const statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 401;
        return res.status(statusCode).json({
          error: 'Authentication failed',
          code: error.code,
          message: error.message
        });
      }

      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        code: 'AUTH_ERROR',
        message: 'An error occurred while authenticating'
      });
    }
  };
}

/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return next();
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next();
      }

      const token = parts[1];
      const payload = authService.verifyAccessToken(token);

      req.authUser = payload;
      req.user = {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
        is_system_admin: payload.isSystemAdmin,
        user_role_id: payload.userRoleId
      };

      next();
    } catch {
      // Token invalid or expired, continue without auth
      next();
    }
  };
}

/**
 * Middleware to require system admin access
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_TOKEN',
          message: 'Authorization header is missing'
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>'
        });
      }

      const token = parts[1];
      const payload = authService.verifyAccessToken(token);

      // Check admin status
      if (!payload.isSystemAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'NOT_ADMIN',
          message: 'System administrator access required'
        });
      }

      // Attach user info to request
      req.authUser = payload;
      req.user = {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
        is_system_admin: payload.isSystemAdmin,
        user_role_id: payload.userRoleId
      };

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(401).json({
          error: 'Authentication failed',
          code: error.code,
          message: error.message
        });
      }

      console.error('Admin middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        code: 'AUTH_ERROR',
        message: 'An error occurred while authenticating'
      });
    }
  };
}

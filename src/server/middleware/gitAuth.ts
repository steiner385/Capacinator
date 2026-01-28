/**
 * GitHub authentication middleware
 * Feature: 001-git-sync-integration
 *
 * Validates GitHub Enterprise credentials for Git sync API routes
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require GitHub credentials for sync operations
 *
 * Extends Express Request with gitCredentials property
 */
export function requireGitAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if Git sync feature is enabled
      const gitSyncEnabled = process.env.ENABLE_GIT_SYNC === 'true';
      if (!gitSyncEnabled) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'GIT_SYNC_DISABLED',
            message: 'Git sync feature is not enabled. Set ENABLE_GIT_SYNC=true in environment.',
          },
        });
      }

      // TODO: Retrieve credentials from Electron secure store via IPC
      // For now, we'll rely on credentials being passed in request headers
      // or stored in session context

      // Check for GitHub token in Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'GIT_AUTH_REQUIRED',
            message: 'GitHub authentication required. Please provide credentials.',
          },
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token format (basic check)
      if (!token || token.length < 20) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid GitHub authentication token format.',
          },
        });
      }

      // Attach credentials to request for use in controllers
      req.gitCredentials = {
        token,
        repositoryUrl: process.env.GIT_REPOSITORY_URL || '',
      };

      next();
    } catch (error) {
      console.error('Git authentication middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_MIDDLEWARE_ERROR',
          message: 'Authentication validation failed',
        },
      });
    }
  };
}

/**
 * Middleware to check if Git sync is available (does not require auth)
 *
 * Used for status endpoints that should work without credentials
 */
export function checkGitSyncAvailable() {
  return (req: Request, res: Response, next: NextFunction) => {
    const gitSyncEnabled = process.env.ENABLE_GIT_SYNC === 'true';
    const repositoryUrl = process.env.GIT_REPOSITORY_URL;

    if (!gitSyncEnabled) {
      req.gitSyncStatus = {
        available: false,
        reason: 'Feature not enabled',
      };
    } else if (!repositoryUrl) {
      req.gitSyncStatus = {
        available: false,
        reason: 'Repository URL not configured',
      };
    } else {
      req.gitSyncStatus = {
        available: true,
        repositoryUrl,
      };
    }

    next();
  };
}

// Extend Express Request type to include git properties
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      gitCredentials?: {
        token: string;
        repositoryUrl: string;
      };
      gitSyncStatus?: {
        available: boolean;
        repositoryUrl?: string;
        reason?: string;
      };
    }
  }
}

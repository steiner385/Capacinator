import { Router } from 'express';
import type { Request, Response } from 'express';
import { authService, AuthError } from '../../services/auth/index.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { logger } from '../../services/logging/config.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login by selecting a person (capacity planning tool - no password needed)
 * Body: { personId: string }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { personId } = req.body;

    if (!personId) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'MISSING_PERSON_ID',
        message: 'Person ID is required'
      });
    }

    const tokens = await authService.loginByPersonId(personId);
    const user = await authService.getUserById(personId);

    res.json({
      success: true,
      user,
      ...tokens
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({
        error: 'Login failed',
        code: error.code,
        message: error.message
      });
    }

    logger.error('Login error', error instanceof Error ? error : undefined);
    res.status(500).json({
      error: 'Login failed',
      code: 'SERVER_ERROR',
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Body: { refreshToken: string }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required'
      });
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      ...tokens
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const statusCode = error.code === 'REFRESH_TOKEN_EXPIRED' ? 401 : 400;
      return res.status(statusCode).json({
        error: 'Token refresh failed',
        code: error.code,
        message: error.message
      });
    }

    logger.error('Token refresh error', error instanceof Error ? error : undefined);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'SERVER_ERROR',
      message: 'An error occurred during token refresh'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout - client should clear tokens
 * In a production system, this would invalidate the refresh token
 */
router.post('/logout', async (_req: Request, res: Response) => {
  // For now, just acknowledge the logout
  // In a production system, we would:
  // 1. Add the refresh token to a blacklist
  // 2. Clear any server-side session data
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', requireAuth(), async (req: Request, res: Response) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NO_USER',
        message: 'No authenticated user'
      });
    }

    const user = await authService.getUserById(req.authUser.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'Authenticated user not found in database'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Get current user error', error instanceof Error ? error : undefined);
    res.status(500).json({
      error: 'Failed to get user',
      code: 'SERVER_ERROR',
      message: 'An error occurred while getting user info'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify that the current token is valid
 */
router.get('/verify', requireAuth(), async (req: Request, res: Response) => {
  res.json({
    success: true,
    valid: true,
    user: req.authUser
  });
});

export default router;

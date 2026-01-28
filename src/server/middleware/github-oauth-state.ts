import type { Response, NextFunction } from 'express';
import type { RequestWithContext } from '../api/controllers/BaseController.js';
import { getGitHubOAuthService } from '../services/GitHubOAuthService.js';
import { logger } from '../services/logging/config.js';

/**
 * OAuth State Validation Middleware
 *
 * Validates the OAuth state parameter from GitHub callback to prevent CSRF attacks.
 * Ensures the state token is valid, not expired, and matches the stored state.
 *
 * Usage:
 * router.get('/oauth/callback', validateOAuthState, controller.handleCallback);
 */
export function validateOAuthState(
  req: RequestWithContext,
  res: Response,
  next: NextFunction
): void {
  const { state, error, error_description } = req.query;

  // Check for OAuth errors from GitHub
  if (error) {
    logger.warn('GitHub OAuth error', {
      error,
      errorDescription: error_description,
      requestId: req.requestId,
    });

    res.status(400).json({
      error: 'OAuth authorization failed',
      details: error_description || error,
      requestId: req.requestId,
    });
    return;
  }

  // Validate state parameter exists
  if (!state || typeof state !== 'string') {
    logger.warn('OAuth callback missing state parameter', {
      requestId: req.requestId,
      query: req.query,
    });

    res.status(400).json({
      error: 'Invalid OAuth callback: missing state parameter',
      requestId: req.requestId,
    });
    return;
  }

  // Validate state token
  const oauthService = getGitHubOAuthService();
  const oauthState = oauthService.validateState(state);

  if (!oauthState) {
    logger.warn('OAuth state validation failed', {
      state,
      requestId: req.requestId,
    });

    res.status(400).json({
      error: 'Invalid or expired OAuth state token',
      details: 'The authorization request may have expired. Please try connecting again.',
      requestId: req.requestId,
    });
    return;
  }

  // Attach validated state to request for use in controller
  (req as any).oauthState = oauthState;

  logger.debug('OAuth state validated successfully', {
    state,
    userId: oauthState.user_id,
    requestId: req.requestId,
  });

  next();
}

/**
 * Extended request interface with OAuth state
 */
export interface RequestWithOAuthState extends RequestWithContext {
  oauthState: {
    state: string;
    user_id: number;
    expires_at: number;
    github_base_url?: string;
  };
}

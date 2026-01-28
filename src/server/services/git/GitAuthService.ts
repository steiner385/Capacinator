/**
 * GitHub Enterprise authentication service
 * Feature: 001-git-sync-integration
 * Task: T096
 *
 * Manages GitHub PAT/OAuth token authentication, validation, and refresh
 */

import type { GitCredential } from '../../../../shared/types/git-entities.js';
import { gitLogger } from './GitLogger.js';

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  rateLimitRemaining?: number;
  error?: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  needsUserAction: boolean;
  message: string;
  newToken?: string;
  expiresAt?: Date;
}

export class GitAuthService {
  /**
   * Validate GitHub Enterprise token by attempting a test API call
   *
   * @param token - Personal access token or OAuth token
   * @param repositoryUrl - GitHub Enterprise repository URL
   * @returns True if token is valid and has repository access
   */
  async validateToken(token: string, repositoryUrl: string): Promise<boolean> {
    try {
      // Extract owner and repo from URL
      // Example: https://github.enterprise.com/orgname/reponame.git
      const match = repositoryUrl.match(/github\.enterprise\.com\/([^/]+)\/([^/.]+)/);
      if (!match) {
        throw new Error('Invalid repository URL format');
      }

      const [, owner, repo] = match;

      // Test token by fetching repository info
      const apiUrl = repositoryUrl.replace(/github\.enterprise\.com/, 'github.enterprise.com/api/v3');
      const response = await fetch(`${apiUrl}/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Create GitCredential from user input
   *
   * @param userId - Person ID from people table
   * @param credentialType - PAT or OAuth
   * @param token - Authentication token
   * @param repositoryUrl - GitHub Enterprise repository URL
   * @param expiresAt - Optional expiration date
   * @returns GitCredential object
   */
  createCredential(
    userId: string,
    credentialType: 'personal-access-token' | 'oauth',
    token: string,
    repositoryUrl: string,
    expiresAt?: Date
  ): GitCredential {
    return {
      userId,
      provider: 'github-enterprise',
      credentialType,
      token,
      repositoryUrl,
      expiresAt,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
  }

  /**
   * Add credentials to Git URL for authentication
   *
   * @param url - Repository URL
   * @param token - Authentication token
   * @returns URL with embedded credentials
   */
  addCredentialsToUrl(url: string, token: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.username = 'x-access-token';
      urlObj.password = token;
      return urlObj.toString();
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  /**
   * Check if token is about to expire (within 7 days)
   *
   * @param credential - Git credential to check
   * @returns True if token expires soon
   */
  isTokenExpiringSoon(credential: GitCredential): boolean {
    if (!credential.expiresAt) {
      return false;
    }

    const expirationDate = new Date(credential.expiresAt);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return expirationDate < sevenDaysFromNow;
  }

  /**
   * Refresh OAuth token (placeholder for OAuth flow)
   *
   * @param refreshToken - OAuth refresh token
   * @returns New access token
   */
  async refreshOAuthToken(_refreshToken: string): Promise<string> {
    // TODO: Implement OAuth refresh flow when OAuth support is added
    // For now, this is a placeholder for PAT-based authentication
    throw new Error('OAuth refresh not yet implemented. Please use Personal Access Tokens.');
  }

  /**
   * Validate token and get detailed status
   * Task: T096
   *
   * @param token - GitHub PAT or OAuth token
   * @param repositoryUrl - Repository URL to check access for
   * @returns Detailed validation result
   */
  async validateTokenDetailed(token: string, repositoryUrl: string): Promise<TokenValidationResult> {
    try {
      // Extract API base URL from repository URL
      const url = new URL(repositoryUrl);
      const apiBaseUrl = `${url.protocol}//${url.host}/api/v3`;

      // Call GitHub API to check token validity and get scopes
      const response = await fetch(`${apiBaseUrl}/user`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');

        if (response.status === 401) {
          return {
            valid: false,
            error: 'Token is invalid or has been revoked',
          };
        }

        if (response.status === 403) {
          return {
            valid: false,
            error: 'Token has insufficient permissions or rate limit exceeded',
          };
        }

        return {
          valid: false,
          error: `GitHub API error: ${response.status} ${errorBody}`,
        };
      }

      // Extract useful headers
      const scopes = response.headers.get('X-OAuth-Scopes')?.split(', ') || [];
      const rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10);

      // PATs don't have expiration in headers, but we can track when we last validated
      return {
        valid: true,
        scopes,
        rateLimitRemaining,
      };
    } catch (error) {
      gitLogger.warn('validateToken', 'Token validation request failed', { error });
      return {
        valid: false,
        error: `Network error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Check if token needs refresh and handle appropriately
   * Task: T096
   *
   * @param credential - Git credential to check
   * @param repositoryUrl - Repository URL to validate against
   * @returns Refresh result with guidance for the user
   */
  async checkAndRefreshToken(
    credential: GitCredential,
    repositoryUrl: string
  ): Promise<TokenRefreshResult> {
    const timer = gitLogger.startTimer();
    gitLogger.info('tokenRefresh', 'Checking token validity', { userId: credential.userId });

    // Step 1: Check if token is already known to be expired
    if (credential.expiresAt && new Date() > new Date(credential.expiresAt)) {
      gitLogger.warn('tokenRefresh', 'Token is expired based on stored expiration date');
      return {
        success: false,
        needsUserAction: true,
        message:
          'Your GitHub token has expired. Please generate a new Personal Access Token in GitHub Settings and update your credentials.',
      };
    }

    // Step 2: Check if token is expiring soon (within 7 days)
    if (this.isTokenExpiringSoon(credential)) {
      gitLogger.warn('tokenRefresh', 'Token is expiring soon', {
        expiresAt: credential.expiresAt,
      });
      // Continue validation but prepare warning
    }

    // Step 3: Validate token against GitHub API
    const validation = await this.validateTokenDetailed(credential.token, repositoryUrl);

    if (!validation.valid) {
      gitLogger.error('tokenRefresh', 'Token validation failed', {
        error: validation.error,
        duration: timer(),
      });

      // For PAT tokens, user must manually generate a new one
      if (credential.credentialType === 'personal-access-token') {
        return {
          success: false,
          needsUserAction: true,
          message: `GitHub authentication failed: ${validation.error}. Please generate a new Personal Access Token with 'repo' scope in GitHub Settings > Developer settings > Personal access tokens.`,
        };
      }

      // For OAuth tokens, we could potentially refresh (future implementation)
      return {
        success: false,
        needsUserAction: true,
        message: `GitHub authentication failed: ${validation.error}. Please re-authenticate with GitHub.`,
      };
    }

    // Step 4: Check for required scopes
    const requiredScopes = ['repo'];
    const hasRequiredScopes = requiredScopes.every(
      (scope) => validation.scopes?.includes(scope) || validation.scopes?.includes('repo')
    );

    if (!hasRequiredScopes) {
      gitLogger.warn('tokenRefresh', 'Token missing required scopes', {
        required: requiredScopes,
        actual: validation.scopes,
      });
      return {
        success: false,
        needsUserAction: true,
        message: `Your GitHub token is missing required permissions. Please generate a new token with 'repo' scope.`,
      };
    }

    // Step 5: Warn about low rate limit
    if (validation.rateLimitRemaining !== undefined && validation.rateLimitRemaining < 100) {
      gitLogger.warn('tokenRefresh', 'Low rate limit remaining', {
        remaining: validation.rateLimitRemaining,
      });
    }

    // Token is valid
    gitLogger.info('tokenRefresh', 'Token validated successfully', {
      duration: timer(),
      rateLimitRemaining: validation.rateLimitRemaining,
      scopes: validation.scopes,
    });

    // Return success with expiration warning if applicable
    if (this.isTokenExpiringSoon(credential)) {
      return {
        success: true,
        needsUserAction: false,
        message: `Token is valid but will expire soon (${credential.expiresAt?.toLocaleDateString()}). Consider generating a new token.`,
      };
    }

    return {
      success: true,
      needsUserAction: false,
      message: 'Token is valid',
    };
  }

  /**
   * Generate instructions for creating a new PAT
   * Task: T096
   *
   * @param enterpriseUrl - GitHub Enterprise base URL
   * @returns Instructions object with steps
   */
  getTokenGenerationInstructions(enterpriseUrl: string): {
    steps: string[];
    url: string;
    requiredScopes: string[];
    recommendedExpiration: string;
  } {
    const url = new URL(enterpriseUrl);
    const settingsUrl = `${url.protocol}//${url.host}/settings/tokens/new`;

    return {
      steps: [
        `1. Navigate to ${settingsUrl}`,
        '2. Enter a descriptive note (e.g., "Capacinator Git Sync")',
        '3. Set expiration to 90 days (recommended)',
        '4. Select the "repo" scope (Full control of private repositories)',
        '5. Click "Generate token"',
        '6. Copy the token immediately (it won\'t be shown again)',
        '7. Paste the token in Capacinator Settings > Git Sync > Update Credentials',
      ],
      url: settingsUrl,
      requiredScopes: ['repo'],
      recommendedExpiration: '90 days',
    };
  }
}

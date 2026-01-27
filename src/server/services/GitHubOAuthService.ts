import crypto from 'crypto';
import { AuthorizationCode } from 'simple-oauth2';
import { Octokit } from '@octokit/rest';
import type {
  OAuthState,
  OAuthAuthorizationResponse,
  GitHubUserInfo,
  GitHubEmail,
} from '../../../shared/types/github.js';
import { logger } from './logging/config.js';

/**
 * GitHubOAuthService
 *
 * Manages GitHub OAuth 2.0 authorization flow.
 * Handles state generation, authorization URL creation, and token exchange.
 *
 * OAuth Flow:
 * 1. Client calls initiateOAuth() -> receives authorization URL
 * 2. User redirects to GitHub, authorizes
 * 3. GitHub redirects back with code and state
 * 4. Server calls handleCallback() -> exchanges code for token
 * 5. Token stored encrypted in database via GitHubConnectionService
 */
export class GitHubOAuthService {
  private client: AuthorizationCode;
  private stateStore: Map<string, OAuthState>;
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new Error(
        'GitHub OAuth not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL environment variables.'
      );
    }

    // Configure simple-oauth2 client
    this.client = new AuthorizationCode({
      client: {
        id: clientId,
        secret: clientSecret,
      },
      auth: {
        tokenHost: 'https://github.com',
        tokenPath: '/login/oauth/access_token',
        authorizePath: '/login/oauth/authorize',
      },
    });

    // In-memory state store (consider Redis for production)
    this.stateStore = new Map();

    // Clean up expired states every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  /**
   * Initiate OAuth authorization flow
   *
   * @param userId - User initiating the connection
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns Authorization URL and state token
   */
  initiateOAuth(
    userId: number,
    githubBaseUrl?: string
  ): OAuthAuthorizationResponse {
    // Generate cryptographically random state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with expiry
    const oauthState: OAuthState = {
      state,
      user_id: userId,
      expires_at: Date.now() + this.STATE_EXPIRY_MS,
      github_base_url: githubBaseUrl,
    };
    this.stateStore.set(state, oauthState);

    // Build authorization URL
    const authorizationUri = this.client.authorizeURL({
      redirect_uri: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email', 'repo', 'read:org'],
      state,
    });

    logger.info('OAuth flow initiated', {
      userId,
      state,
      githubBaseUrl: githubBaseUrl || 'https://github.com',
    });

    return {
      authorization_url: authorizationUri,
      state,
    };
  }

  /**
   * Validate OAuth state parameter from callback
   *
   * @param state - State token from callback
   * @returns OAuthState if valid, null if invalid/expired
   */
  validateState(state: string): OAuthState | null {
    const oauthState = this.stateStore.get(state);

    if (!oauthState) {
      logger.warn('OAuth state not found', { state });
      return null;
    }

    // Check expiry
    if (Date.now() > oauthState.expires_at) {
      logger.warn('OAuth state expired', { state, expiresAt: oauthState.expires_at });
      this.stateStore.delete(state);
      return null;
    }

    return oauthState;
  }

  /**
   * Consume OAuth state (one-time use)
   *
   * @param state - State token to consume
   */
  consumeState(state: string): void {
    this.stateStore.delete(state);
    logger.debug('OAuth state consumed', { state });
  }

  /**
   * Exchange authorization code for access token
   *
   * @param code - Authorization code from callback
   * @param state - State token from callback
   * @returns Access token details
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    try {
      const tokenParams = {
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL!,
      };

      const accessToken = await this.client.getToken(tokenParams);

      logger.info('OAuth token exchange successful', {
        state,
        scopes: accessToken.token.scope,
      });

      return {
        access_token: accessToken.token.access_token as string,
        token_type: accessToken.token.token_type as string,
        scope: accessToken.token.scope as string,
        refresh_token: accessToken.token.refresh_token as string | undefined,
        expires_in: accessToken.token.expires_in as number | undefined,
      };
    } catch (error) {
      logger.error('OAuth token exchange failed', error instanceof Error ? error : undefined, {
        state,
        code: code.substring(0, 10) + '...',
      });
      throw new Error(
        `Failed to exchange authorization code: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch GitHub user information
   *
   * @param accessToken - GitHub access token
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns GitHub user info
   */
  async fetchUserInfo(
    accessToken: string,
    githubBaseUrl?: string
  ): Promise<GitHubUserInfo> {
    try {
      const octokit = new Octokit({
        auth: accessToken,
        baseUrl: githubBaseUrl || 'https://api.github.com',
      });

      const { data: user } = await octokit.users.getAuthenticated();

      logger.info('GitHub user info fetched', {
        githubUserId: user.id,
        githubUsername: user.login,
      });

      return {
        id: user.id,
        login: user.login,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      };
    } catch (error) {
      logger.error('Failed to fetch GitHub user info', error instanceof Error ? error : undefined);
      throw new Error(
        `Failed to fetch user info: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch all verified emails for a GitHub account
   *
   * @param accessToken - GitHub access token
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns Array of GitHub email addresses
   */
  async fetchUserEmails(
    accessToken: string,
    githubBaseUrl?: string
  ): Promise<GitHubEmail[]> {
    try {
      const octokit = new Octokit({
        auth: accessToken,
        baseUrl: githubBaseUrl || 'https://api.github.com',
      });

      const { data: emails } = await octokit.users.listEmailsForAuthenticatedUser();

      logger.info('GitHub user emails fetched', {
        emailCount: emails.length,
        verifiedCount: emails.filter((e) => e.verified).length,
      });

      return emails.map((email) => ({
        email: email.email,
        primary: email.primary,
        verified: email.verified,
        visibility: email.visibility,
      }));
    } catch (error) {
      logger.error('Failed to fetch GitHub user emails', error instanceof Error ? error : undefined);
      throw new Error(
        `Failed to fetch user emails: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Refresh an OAuth access token using refresh token
   *
   * Task T053 (Phase 7)
   *
   * @param refreshToken - Refresh token from previous OAuth flow
   * @returns New access token details
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    try {
      // Create access token object with refresh token
      const accessToken = this.client.createToken({
        refresh_token: refreshToken,
      });

      // Refresh the token
      const refreshedToken = await accessToken.refresh();

      logger.info('OAuth token refresh successful', {
        scopes: refreshedToken.token.scope,
        expiresIn: refreshedToken.token.expires_in,
      });

      return {
        access_token: refreshedToken.token.access_token as string,
        token_type: refreshedToken.token.token_type as string,
        scope: refreshedToken.token.scope as string,
        refresh_token: refreshedToken.token.refresh_token as string | undefined,
        expires_in: refreshedToken.token.expires_in as number | undefined,
      };
    } catch (error) {
      logger.error('OAuth token refresh failed', error instanceof Error ? error : undefined);
      throw new Error(
        `Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [state, oauthState] of this.stateStore.entries()) {
      if (now > oauthState.expires_at) {
        this.stateStore.delete(state);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug('Cleaned up expired OAuth states', { expiredCount });
    }
  }
}

// Singleton instance for application-wide use
let gitHubOAuthServiceInstance: GitHubOAuthService | null = null;

/**
 * Get singleton GitHubOAuthService instance
 *
 * @returns GitHubOAuthService instance
 */
export function getGitHubOAuthService(): GitHubOAuthService {
  if (!gitHubOAuthServiceInstance) {
    gitHubOAuthServiceInstance = new GitHubOAuthService();
  }
  return gitHubOAuthServiceInstance;
}

export default getGitHubOAuthService();

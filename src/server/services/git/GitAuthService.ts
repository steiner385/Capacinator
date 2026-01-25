/**
 * GitHub Enterprise authentication service
 * Feature: 001-git-sync-integration
 *
 * Manages GitHub PAT/OAuth token authentication and validation
 */

import type { GitCredential } from '../../../../shared/types/git-entities.js';

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
}

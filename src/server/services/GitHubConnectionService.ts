import { getDb } from '../database/index.js';
import type { Knex } from 'knex';
import { getEncryptionService } from './EncryptionService.js';
import { Octokit } from '@octokit/rest';
import { logger } from './logging/config.js';
import type {
  GitHubConnection,
  GitHubConnectionMethod,
  GitHubConnectionStatus,
  CreateGitHubConnectionInput,
  UpdateGitHubConnectionInput,
} from '../../../shared/types/github.js';

/**
 * GitHubConnectionService
 *
 * Manages GitHub account connections for users.
 * Handles CRUD operations for github_connections table with token encryption.
 *
 * This is the skeleton implementation - OAuth and PAT logic will be added later.
 */
export class GitHubConnectionService {
  private db: Knex;
  private encryptionService;

  constructor() {
    this.db = getDb();
    this.encryptionService = getEncryptionService();
  }

  /**
   * Create a new GitHub connection
   *
   * @param input - Connection details including plaintext token
   * @returns Created connection with encrypted token
   */
  async create(input: CreateGitHubConnectionInput): Promise<GitHubConnection> {
    // Encrypt the access token before storage
    const encryptedToken = this.encryptionService.encrypt(input.access_token);

    // Prepare connection data
    const connectionData = {
      user_id: input.user_id,
      github_user_id: input.github_user_id,
      github_username: input.github_username,
      connection_method: input.connection_method,
      encrypted_token: encryptedToken,
      token_expires_at: input.token_expires_at || null,
      refresh_token: input.refresh_token
        ? this.encryptionService.encrypt(input.refresh_token)
        : null,
      scopes: JSON.stringify(input.scopes || []),
      github_base_url: input.github_base_url || 'https://api.github.com',
      status: (input.status as GitHubConnectionStatus) || 'active',
      is_default: input.is_default ?? false,
      last_used_at: null,
      encryption_version: 1,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now(),
    };

    const [id] = await this.db('github_connections').insert(connectionData);

    // Retrieve and return the created connection
    const connection = await this.findById(id);
    if (!connection) {
      throw new Error(`Failed to retrieve created connection with id ${id}`);
    }

    return connection;
  }

  /**
   * Find a GitHub connection by ID
   *
   * @param id - Connection ID
   * @returns Connection or null if not found
   */
  async findById(id: number): Promise<GitHubConnection | null> {
    const row = await this.db('github_connections')
      .where({ id })
      .first();

    if (!row) {
      return null;
    }

    return this.mapRowToConnection(row);
  }

  /**
   * Find all GitHub connections for a user
   *
   * @param userId - User ID
   * @param includeInactive - Include connections with status != 'active'
   * @returns Array of connections
   */
  async findByUserId(
    userId: number,
    includeInactive = false
  ): Promise<GitHubConnection[]> {
    let query = this.db('github_connections').where({ user_id: userId });

    if (!includeInactive) {
      query = query.where({ status: 'active' });
    }

    const rows = await query.orderBy('created_at', 'desc');

    return rows.map((row) => this.mapRowToConnection(row));
  }

  /**
   * Find the default GitHub connection for a user
   *
   * @param userId - User ID
   * @returns Default connection or null if none set
   */
  async findDefaultByUserId(userId: number): Promise<GitHubConnection | null> {
    const row = await this.db('github_connections')
      .where({ user_id: userId, is_default: true, status: 'active' })
      .first();

    if (!row) {
      return null;
    }

    return this.mapRowToConnection(row);
  }

  /**
   * Update a GitHub connection
   *
   * @param id - Connection ID
   * @param updates - Fields to update
   * @returns Updated connection
   */
  async update(
    id: number,
    updates: UpdateGitHubConnectionInput
  ): Promise<GitHubConnection> {
    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: this.db.fn.now(),
    };

    // Handle token re-encryption if provided
    if (updates.access_token) {
      updateData.encrypted_token = this.encryptionService.encrypt(
        updates.access_token
      );
    }

    // Handle refresh token re-encryption if provided
    if (updates.refresh_token) {
      updateData.refresh_token = this.encryptionService.encrypt(
        updates.refresh_token
      );
    }

    // Copy other allowed fields
    const allowedFields = [
      'github_username',
      'token_expires_at',
      'scopes',
      'status',
      'is_default',
      'last_used_at',
    ];

    for (const field of allowedFields) {
      if (field in updates) {
        if (field === 'scopes' && updates.scopes) {
          updateData.scopes = JSON.stringify(updates.scopes);
        } else {
          updateData[field] = updates[field as keyof UpdateGitHubConnectionInput];
        }
      }
    }

    // Perform update
    await this.db('github_connections').where({ id }).update(updateData);

    // Retrieve and return updated connection
    const connection = await this.findById(id);
    if (!connection) {
      throw new Error(`Connection with id ${id} not found after update`);
    }

    return connection;
  }

  /**
   * Delete a GitHub connection
   *
   * @param id - Connection ID
   * @returns True if deleted, false if not found
   */
  async delete(id: number): Promise<boolean> {
    const deletedCount = await this.db('github_connections')
      .where({ id })
      .delete();

    return deletedCount > 0;
  }

  /**
   * Set a connection as the default for a user
   * (Unsets all other connections for that user)
   *
   * @param id - Connection ID to set as default
   * @returns Updated connection
   */
  async setAsDefault(id: number): Promise<GitHubConnection> {
    // Get the connection to find the user_id
    const connection = await this.findById(id);
    if (!connection) {
      throw new Error(`Connection with id ${id} not found`);
    }

    // Use transaction to ensure atomicity
    await this.db.transaction(async (trx) => {
      // Unset all defaults for this user
      await trx('github_connections')
        .where({ user_id: connection.user_id })
        .update({ is_default: false, updated_at: trx.fn.now() });

      // Set this connection as default
      await trx('github_connections')
        .where({ id })
        .update({ is_default: true, updated_at: trx.fn.now() });
    });

    // Return updated connection
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Connection with id ${id} not found after update`);
    }

    return updated;
  }

  /**
   * Update last_used_at timestamp
   *
   * @param id - Connection ID
   */
  async markAsUsed(id: number): Promise<void> {
    await this.db('github_connections')
      .where({ id })
      .update({
        last_used_at: this.db.fn.now(),
        updated_at: this.db.fn.now(),
      });
  }

  /**
   * Create a GitHub connection from OAuth flow
   *
   * @param userId - User ID
   * @param githubUserInfo - GitHub user info from API
   * @param accessToken - Plaintext access token
   * @param scopes - Token scopes as array
   * @param refreshToken - Optional refresh token
   * @param expiresIn - Optional token expiry (seconds)
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns Created connection
   */
  async createFromOAuth(
    userId: number,
    githubUserInfo: { id: number; login: string },
    accessToken: string,
    scopes: string[],
    refreshToken?: string,
    expiresIn?: number,
    githubBaseUrl?: string
  ): Promise<GitHubConnection> {
    // Validate GitHub account uniqueness (Task T046)
    const uniquenessCheck = await this.validateGitHubAccountUniqueness(
      githubUserInfo.id,
      userId
    );

    if (!uniquenessCheck.valid) {
      throw new Error(
        uniquenessCheck.error || 'GitHub account already connected to another user'
      );
    }

    // Calculate token expiry if provided
    let tokenExpiresAt: string | null = null;
    if (expiresIn) {
      const expiryDate = new Date(Date.now() + expiresIn * 1000);
      tokenExpiresAt = expiryDate.toISOString();
    }

    // Check if this is the user's first connection (set as default)
    const existingConnections = await this.findByUserId(userId, false);
    const isFirstConnection = existingConnections.length === 0;

    // Create the connection
    return this.create({
      user_id: userId,
      github_user_id: githubUserInfo.id,
      github_username: githubUserInfo.login,
      connection_method: 'oauth',
      access_token: accessToken,
      token_expires_at: tokenExpiresAt,
      refresh_token: refreshToken,
      scopes,
      github_base_url: githubBaseUrl || 'https://api.github.com',
      status: 'active',
      is_default: isFirstConnection,
    });
  }

  /**
   * Validate a Personal Access Token with GitHub API
   *
   * Task T026 (Phase 4 - User Story 2)
   *
   * @param token - GitHub Personal Access Token
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns Validation result with user info and scopes
   */
  async validatePAT(
    token: string,
    githubBaseUrl?: string
  ): Promise<{
    valid: boolean;
    user?: { id: number; login: string; email: string | null };
    scopes?: string[];
    missingScopes?: string[];
    error?: string;
  }> {
    try {
      const octokit = new Octokit({
        auth: token,
        baseUrl: githubBaseUrl || 'https://api.github.com',
      });

      // Fetch user info to validate token
      const { data: user, headers } = await octokit.users.getAuthenticated();

      // Parse scopes from response headers
      const scopeHeader = headers['x-oauth-scopes'] || '';
      const scopes = scopeHeader
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      // Define required scopes for Git sync operations
      const requiredScopes = ['repo', 'user:email', 'read:org'];
      const missingScopes = requiredScopes.filter(
        (required) => !scopes.includes(required)
      );

      logger.info('PAT validation successful', {
        githubUserId: user.id,
        githubUsername: user.login,
        scopes,
        missingScopes,
      });

      return {
        valid: true,
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
        },
        scopes,
        missingScopes,
      };
    } catch (error: any) {
      logger.error('PAT validation failed', error instanceof Error ? error : undefined);

      let errorMessage = 'Invalid token';
      if (error.status === 401) {
        errorMessage = 'Invalid or expired token';
      } else if (error.status === 403) {
        errorMessage = 'Token lacks required permissions';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create a GitHub connection from Personal Access Token
   *
   * Task T029 (Phase 4 - User Story 2)
   *
   * @param userId - User ID
   * @param token - GitHub Personal Access Token
   * @param githubBaseUrl - Optional GitHub Enterprise URL
   * @returns Created connection or error
   */
  async createFromPAT(
    userId: number,
    token: string,
    githubBaseUrl?: string
  ): Promise<
    | { success: true; connection: GitHubConnection }
    | { success: false; error: string; missingScopes?: string[] }
  > {
    // Validate the PAT
    const validation = await this.validatePAT(token, githubBaseUrl);

    if (!validation.valid || !validation.user) {
      return {
        success: false,
        error: validation.error || 'Token validation failed',
      };
    }

    // Validate GitHub account uniqueness (Task T046)
    const uniquenessCheck = await this.validateGitHubAccountUniqueness(
      validation.user.id,
      userId
    );

    if (!uniquenessCheck.valid) {
      return {
        success: false,
        error: uniquenessCheck.error || 'GitHub account already connected to another user',
      };
    }

    // Warn if missing required scopes but allow connection
    if (validation.missingScopes && validation.missingScopes.length > 0) {
      logger.warn('PAT missing recommended scopes', {
        githubUserId: validation.user.id,
        missingScopes: validation.missingScopes,
      });
    }

    // Check if this is the user's first connection (set as default)
    const existingConnections = await this.findByUserId(userId, false);
    const isFirstConnection = existingConnections.length === 0;

    // Create the connection
    const connection = await this.create({
      user_id: userId,
      github_user_id: validation.user.id,
      github_username: validation.user.login,
      connection_method: 'pat',
      access_token: token,
      token_expires_at: null, // PATs don't expire unless revoked
      refresh_token: null,
      scopes: validation.scopes || [],
      github_base_url: githubBaseUrl || 'https://api.github.com',
      status: 'active',
      is_default: isFirstConnection,
    });

    return {
      success: true,
      connection,
    };
  }

  /**
   * Detect token revocation by attempting to use it
   *
   * Task T032 (Phase 4 - User Story 2)
   *
   * @param connectionId - Connection ID to check
   * @returns True if token is still valid, false if revoked/expired
   */
  async checkTokenValidity(connectionId: number): Promise<boolean> {
    const connection = await this.findById(connectionId);
    if (!connection) {
      return false;
    }

    // Decrypt the token
    const token = this.encryptionService.decrypt(connection.encrypted_token);

    // Try to use the token
    try {
      const octokit = new Octokit({
        auth: token,
        baseUrl: connection.github_base_url,
      });

      await octokit.users.getAuthenticated();
      return true;
    } catch (error: any) {
      // Token is invalid - update connection status
      if (error.status === 401) {
        await this.update(connectionId, { status: 'revoked' });
        logger.warn('Token revoked, connection marked as revoked', {
          connectionId,
          githubUsername: connection.github_username,
        });
      } else if (error.status === 403) {
        await this.update(connectionId, { status: 'error' });
        logger.warn('Token has insufficient permissions', {
          connectionId,
          githubUsername: connection.github_username,
        });
      }
      return false;
    }
  }

  /**
   * Check if a GitHub account is already connected to any user
   *
   * Task T046 (Phase 6 - User Story 4)
   *
   * @param githubUserId - GitHub user ID
   * @param excludeUserId - Optional user ID to exclude from check (for updating own connection)
   * @returns Existing connection if found, null otherwise
   */
  async findByGitHubUserId(
    githubUserId: number,
    excludeUserId?: number
  ): Promise<GitHubConnection | null> {
    let query = this.db('github_connections').where({
      github_user_id: githubUserId,
      status: 'active',
    });

    // Exclude specific user if provided (for allowing same user to update their connection)
    if (excludeUserId) {
      query = query.whereNot('user_id', excludeUserId);
    }

    const row = await query.first();

    if (!row) {
      return null;
    }

    return this.mapRowToConnection(row);
  }

  /**
   * Validate that a GitHub account can be connected to a user
   *
   * Task T046 (Phase 6 - User Story 4)
   *
   * @param githubUserId - GitHub user ID to check
   * @param userId - User ID trying to connect
   * @returns Validation result
   */
  async validateGitHubAccountUniqueness(
    githubUserId: number,
    userId: number
  ): Promise<{ valid: boolean; error?: string; existingConnection?: GitHubConnection }> {
    // Check if this GitHub account is already connected to a different user
    const existingConnection = await this.findByGitHubUserId(githubUserId, userId);

    if (existingConnection) {
      return {
        valid: false,
        error: `This GitHub account is already connected to another user (${existingConnection.github_username})`,
        existingConnection,
      };
    }

    return { valid: true };
  }

  /**
   * Check if OAuth token needs refresh (1 hour before expiry)
   *
   * Task T053 (Phase 7)
   *
   * @param connection - GitHub connection to check
   * @returns True if token needs refresh
   */
  needsTokenRefresh(connection: GitHubConnection): boolean {
    // PATs don't expire
    if (connection.connection_method === 'pat') {
      return false;
    }

    // No expiry set (GitHub OAuth apps don't always provide expiry)
    if (!connection.token_expires_at) {
      return false;
    }

    // Check if token expires within 1 hour
    const expiryDate = new Date(connection.token_expires_at);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    return expiryDate <= oneHourFromNow;
  }

  /**
   * Refresh OAuth token if needed
   *
   * Task T053 (Phase 7)
   *
   * @param connectionId - Connection ID to refresh
   * @returns Refreshed connection or original if no refresh needed
   */
  async refreshTokenIfNeeded(connectionId: number): Promise<GitHubConnection> {
    const connection = await this.findById(connectionId);
    if (!connection) {
      throw new Error(`Connection with id ${connectionId} not found`);
    }

    // Check if refresh is needed
    if (!this.needsTokenRefresh(connection)) {
      return connection;
    }

    // Must have refresh token
    if (!connection.refresh_token) {
      logger.warn('Token needs refresh but no refresh token available', {
        connectionId,
        githubUsername: connection.github_username,
      });
      return connection;
    }

    try {
      // Import here to avoid circular dependency
      const { getGitHubOAuthService } = await import('./GitHubOAuthService.js');
      const oauthService = getGitHubOAuthService();

      // Decrypt refresh token
      const decryptedRefreshToken = this.encryptionService.decrypt(connection.refresh_token);

      // Refresh the token
      const refreshedTokenData = await oauthService.refreshAccessToken(decryptedRefreshToken);

      // Calculate new expiry
      let newExpiresAt: string | null = null;
      if (refreshedTokenData.expires_in) {
        const expiryDate = new Date(Date.now() + refreshedTokenData.expires_in * 1000);
        newExpiresAt = expiryDate.toISOString();
      }

      // Update connection with new token
      const updated = await this.update(connectionId, {
        access_token: refreshedTokenData.access_token,
        refresh_token: refreshedTokenData.refresh_token,
        token_expires_at: newExpiresAt,
        scopes: refreshedTokenData.scope ? refreshedTokenData.scope.split(',') : connection.scopes,
      });

      logger.info('OAuth token refreshed successfully', {
        connectionId,
        githubUsername: connection.github_username,
        newExpiresAt,
      });

      return updated;
    } catch (error) {
      logger.error('Failed to refresh OAuth token', error instanceof Error ? error : undefined, {
        connectionId,
        githubUsername: connection.github_username,
      });

      // Mark connection as expired
      await this.update(connectionId, { status: 'expired' });

      throw error;
    }
  }

  /**
   * Perform health check on all connections for a user
   *
   * Task T067 (Phase 9)
   *
   * @param userId - User ID
   * @returns Health check results
   */
  async performHealthCheck(userId: number): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    errors: number;
    needsRefresh: number;
    details: Array<{
      id: number;
      github_username: string;
      status: string;
      needsRefresh: boolean;
      isValid: boolean;
    }>;
  }> {
    const connections = await this.findByUserId(userId, true); // Include inactive

    const details = await Promise.all(
      connections.map(async (connection) => {
        const needsRefresh = this.needsTokenRefresh(connection);
        let isValid = connection.status === 'active';

        // For active connections, check token validity
        if (isValid && connection.connection_method === 'oauth') {
          try {
            isValid = await this.checkTokenValidity(connection.id);
          } catch {
            isValid = false;
          }
        }

        return {
          id: connection.id,
          github_username: connection.github_username,
          status: connection.status,
          needsRefresh,
          isValid,
        };
      })
    );

    const statusCounts = connections.reduce(
      (acc, conn) => {
        acc[conn.status]++;
        return acc;
      },
      { active: 0, expired: 0, revoked: 0, error: 0 } as Record<string, number>
    );

    const needsRefresh = details.filter((d) => d.needsRefresh).length;

    return {
      total: connections.length,
      active: statusCounts.active || 0,
      expired: statusCounts.expired || 0,
      revoked: statusCounts.revoked || 0,
      errors: statusCounts.error || 0,
      needsRefresh,
      details,
    };
  }

  /**
   * Map database row to GitHubConnection interface
   *
   * @param row - Database row
   * @returns GitHubConnection object
   */
  private mapRowToConnection(row: any): GitHubConnection {
    return {
      id: row.id,
      user_id: row.user_id,
      github_user_id: row.github_user_id,
      github_username: row.github_username,
      connection_method: row.connection_method as GitHubConnectionMethod,
      encrypted_token: row.encrypted_token,
      token_expires_at: row.token_expires_at,
      refresh_token: row.refresh_token,
      scopes: JSON.parse(row.scopes),
      github_base_url: row.github_base_url,
      status: row.status as GitHubConnectionStatus,
      is_default: Boolean(row.is_default),
      last_used_at: row.last_used_at,
      encryption_version: row.encryption_version,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Singleton instance for application-wide use
let gitHubConnectionServiceInstance: GitHubConnectionService | null = null;

/**
 * Get singleton GitHubConnectionService instance
 *
 * @returns GitHubConnectionService instance
 */
export function getGitHubConnectionService(): GitHubConnectionService {
  if (!gitHubConnectionServiceInstance) {
    gitHubConnectionServiceInstance = new GitHubConnectionService();
  }
  return gitHubConnectionServiceInstance;
}

// Export singleton instance as default
export default getGitHubConnectionService();

/**
 * MSW Mock Git Server for E2E Testing
 * Feature: 001-git-sync-integration (Issue #109)
 *
 * Provides a Mock Service Worker (MSW) server that simulates GitHub Enterprise
 * for end-to-end testing of Git sync operations. Supports:
 * - Configurable pull/push responses
 * - Conflict scenario simulation
 * - Network error injection
 * - Authentication mocking (PAT/OAuth)
 *
 * @example
 * ```typescript
 * const mockServer = new MockGitServer();
 * await mockServer.start();
 *
 * // Configure responses
 * mockServer.configurePullResponse({ success: true, filesChanged: 3 });
 * mockServer.simulateConflict(['data/scenarios.json']);
 * mockServer.injectNetworkError('timeout', 2);
 *
 * // Test your Git sync operations...
 *
 * await mockServer.stop();
 * ```
 */

import { http, HttpResponse, delay } from 'msw';
import { setupServer, SetupServerApi } from 'msw/node';

// ============================================================================
// Types
// ============================================================================

/**
 * GitHub Enterprise repository information
 */
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    type: 'Organization' | 'User';
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/**
 * GitHub user information
 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

/**
 * Pull operation response configuration
 */
export interface PullResponseConfig {
  success: boolean;
  filesChanged?: number;
  conflicts?: string[];
  behind?: number;
  ahead?: number;
  error?: string;
}

/**
 * Push operation response configuration
 */
export interface PushResponseConfig {
  success: boolean;
  rejected?: boolean;
  protectedBranch?: boolean;
  error?: string;
}

/**
 * Conflict scenario configuration
 */
export interface ConflictScenario {
  conflictedFiles: string[];
  baseContent?: Record<string, string>;
  localContent?: Record<string, string>;
  remoteContent?: Record<string, string>;
}

/**
 * Network error types for injection
 */
export type NetworkErrorType =
  | 'timeout'
  | 'connection-refused'
  | 'dns-failure'
  | 'ssl-error'
  | 'rate-limit'
  | 'server-error';

/**
 * Authentication configuration
 */
export interface AuthConfig {
  validTokens: string[];
  invalidTokens?: string[];
  expiredTokens?: string[];
  tokenScopes?: Record<string, string[]>;
  rateLimitRemaining?: number;
}

/**
 * Server configuration
 */
export interface MockGitServerConfig {
  baseUrl?: string;
  defaultRepository?: Partial<GitHubRepository>;
  defaultUser?: Partial<GitHubUser>;
  auth?: Partial<AuthConfig>;
}

// ============================================================================
// Mock Git Server Implementation
// ============================================================================

export class MockGitServer {
  private server: SetupServerApi | null = null;
  private baseUrl: string;
  private isRunning: boolean = false;

  // Response configurations
  private pullResponse: PullResponseConfig = { success: true, filesChanged: 0 };
  private pushResponse: PushResponseConfig = { success: true };
  private conflictScenario: ConflictScenario | null = null;

  // Error injection
  private networkErrorQueue: Array<{ type: NetworkErrorType; count: number }> = [];
  private requestDelay: number = 0;

  // Authentication
  private authConfig: AuthConfig = {
    validTokens: ['test-valid-token'],
    invalidTokens: ['invalid-token'],
    expiredTokens: ['expired-token'],
    tokenScopes: {
      'test-valid-token': ['repo', 'read:user']
    },
    rateLimitRemaining: 5000
  };

  // Default mock data
  private repository: GitHubRepository;
  private user: GitHubUser;

  // Request tracking
  private requestLog: Array<{
    method: string;
    url: string;
    timestamp: Date;
    headers?: Record<string, string>;
  }> = [];

  constructor(config: MockGitServerConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://github.enterprise.com';

    this.repository = {
      id: 1,
      name: 'capacinator-data',
      full_name: 'orgname/capacinator-data',
      private: true,
      owner: {
        login: 'orgname',
        id: 100,
        type: 'Organization'
      },
      html_url: `${this.baseUrl}/orgname/capacinator-data`,
      clone_url: `${this.baseUrl}/orgname/capacinator-data.git`,
      ssh_url: 'git@github.enterprise.com:orgname/capacinator-data.git',
      default_branch: 'main',
      permissions: {
        admin: false,
        push: true,
        pull: true
      },
      ...config.defaultRepository
    };

    this.user = {
      id: 1,
      login: 'testuser',
      name: 'Test User',
      email: 'testuser@example.com',
      avatar_url: `${this.baseUrl}/avatars/testuser`,
      ...config.defaultUser
    };

    if (config.auth) {
      this.authConfig = { ...this.authConfig, ...config.auth };
    }
  }

  // ==========================================================================
  // Server Lifecycle
  // ==========================================================================

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('MockGitServer is already running');
      return;
    }

    const handlers = this.createHandlers();
    this.server = setupServer(...handlers);

    this.server.listen({
      onUnhandledRequest: 'bypass'
    });

    this.isRunning = true;
    console.log(`MockGitServer started for ${this.baseUrl}`);
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    this.server.close();
    this.server = null;
    this.isRunning = false;
    this.reset();
    console.log('MockGitServer stopped');
  }

  /**
   * Reset all configurations to defaults
   */
  reset(): void {
    this.pullResponse = { success: true, filesChanged: 0 };
    this.pushResponse = { success: true };
    this.conflictScenario = null;
    this.networkErrorQueue = [];
    this.requestDelay = 0;
    this.requestLog = [];
    this.authConfig.rateLimitRemaining = 5000;
  }

  // ==========================================================================
  // Response Configuration
  // ==========================================================================

  /**
   * Configure the pull operation response
   */
  configurePullResponse(config: PullResponseConfig): void {
    this.pullResponse = config;
  }

  /**
   * Configure the push operation response
   */
  configurePushResponse(config: PushResponseConfig): void {
    this.pushResponse = config;
  }

  /**
   * Simulate a conflict scenario
   */
  simulateConflict(conflictedFiles: string[], options?: {
    baseContent?: Record<string, string>;
    localContent?: Record<string, string>;
    remoteContent?: Record<string, string>;
  }): void {
    this.conflictScenario = {
      conflictedFiles,
      ...options
    };
    this.pullResponse = {
      success: false,
      conflicts: conflictedFiles
    };
  }

  /**
   * Clear any conflict simulation
   */
  clearConflict(): void {
    this.conflictScenario = null;
    this.pullResponse = { success: true, filesChanged: 0 };
  }

  // ==========================================================================
  // Network Error Injection
  // ==========================================================================

  /**
   * Inject a network error for the next N requests
   * @param errorType - Type of error to simulate
   * @param count - Number of requests to fail (default: 1)
   */
  injectNetworkError(errorType: NetworkErrorType, count: number = 1): void {
    this.networkErrorQueue.push({ type: errorType, count });
  }

  /**
   * Set a delay for all requests (useful for testing loading states)
   * @param delayMs - Delay in milliseconds
   */
  setRequestDelay(delayMs: number): void {
    this.requestDelay = delayMs;
  }

  /**
   * Clear all injected errors
   */
  clearErrors(): void {
    this.networkErrorQueue = [];
    this.requestDelay = 0;
  }

  // ==========================================================================
  // Authentication Configuration
  // ==========================================================================

  /**
   * Add a valid token
   */
  addValidToken(token: string, scopes: string[] = ['repo']): void {
    this.authConfig.validTokens.push(token);
    this.authConfig.tokenScopes![token] = scopes;
  }

  /**
   * Simulate token expiration
   */
  expireToken(token: string): void {
    this.authConfig.validTokens = this.authConfig.validTokens.filter(t => t !== token);
    this.authConfig.expiredTokens!.push(token);
  }

  /**
   * Set rate limit remaining
   */
  setRateLimitRemaining(remaining: number): void {
    this.authConfig.rateLimitRemaining = remaining;
  }

  // ==========================================================================
  // Request Tracking
  // ==========================================================================

  /**
   * Get all logged requests
   */
  getRequestLog(): typeof this.requestLog {
    return [...this.requestLog];
  }

  /**
   * Get requests matching a path pattern
   */
  getRequestsMatching(pathPattern: string | RegExp): typeof this.requestLog {
    return this.requestLog.filter(req => {
      if (typeof pathPattern === 'string') {
        return req.url.includes(pathPattern);
      }
      return pathPattern.test(req.url);
    });
  }

  /**
   * Clear the request log
   */
  clearRequestLog(): void {
    this.requestLog = [];
  }

  // ==========================================================================
  // Handler Creation
  // ==========================================================================

  private createHandlers() {
    const apiBase = `${this.baseUrl}/api/v3`;

    return [
      // User authentication endpoint
      http.get(`${apiBase}/user`, async ({ request }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            {
              status: authResult.status,
              headers: this.getRateLimitHeaders()
            }
          );
        }

        return HttpResponse.json(this.user, {
          headers: {
            ...this.getRateLimitHeaders(),
            'X-OAuth-Scopes': authResult.scopes?.join(', ') || ''
          }
        });
      }),

      // Repository info endpoint
      http.get(`${apiBase}/repos/:owner/:repo`, async ({ request, params }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            { status: authResult.status }
          );
        }

        // Check if repo exists
        if (params.owner !== this.repository.owner.login ||
            params.repo !== this.repository.name) {
          return HttpResponse.json(
            { message: 'Not Found' },
            { status: 404 }
          );
        }

        return HttpResponse.json(this.repository, {
          headers: this.getRateLimitHeaders()
        });
      }),

      // Branches endpoint
      http.get(`${apiBase}/repos/:owner/:repo/branches`, async ({ request }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            { status: authResult.status }
          );
        }

        return HttpResponse.json([
          {
            name: 'main',
            commit: { sha: 'abc123', url: `${apiBase}/repos/${this.repository.full_name}/commits/abc123` },
            protected: false
          }
        ], {
          headers: this.getRateLimitHeaders()
        });
      }),

      // Commits endpoint
      http.get(`${apiBase}/repos/:owner/:repo/commits`, async ({ request }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            { status: authResult.status }
          );
        }

        return HttpResponse.json([
          {
            sha: 'abc123',
            commit: {
              author: {
                name: this.user.name,
                email: this.user.email,
                date: new Date().toISOString()
              },
              message: 'Latest commit'
            },
            author: this.user
          }
        ], {
          headers: this.getRateLimitHeaders()
        });
      }),

      // Compare branches endpoint (for sync status)
      http.get(`${apiBase}/repos/:owner/:repo/compare/:base...:head`, async ({ request }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            { status: authResult.status }
          );
        }

        return HttpResponse.json({
          status: this.pullResponse.behind ? 'behind' :
                  this.pullResponse.ahead ? 'ahead' : 'identical',
          ahead_by: this.pullResponse.ahead || 0,
          behind_by: this.pullResponse.behind || 0,
          total_commits: (this.pullResponse.ahead || 0) + (this.pullResponse.behind || 0),
          files: this.conflictScenario?.conflictedFiles.map(f => ({
            filename: f,
            status: 'modified',
            changes: 10
          })) || []
        }, {
          headers: this.getRateLimitHeaders()
        });
      }),

      // Contents endpoint (for file operations)
      http.get(`${apiBase}/repos/:owner/:repo/contents/:path*`, async ({ request, params }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        const authResult = this.validateAuth(request.headers.get('Authorization'));
        if (!authResult.valid) {
          return HttpResponse.json(
            { message: authResult.error },
            { status: authResult.status }
          );
        }

        const path = Array.isArray(params.path) ? params.path.join('/') : params.path;

        // Check if this is a conflicted file
        if (this.conflictScenario?.remoteContent?.[path || '']) {
          const content = this.conflictScenario.remoteContent[path || ''];
          return HttpResponse.json({
            name: path?.split('/').pop() || 'file',
            path: path,
            sha: 'remote-sha',
            size: content.length,
            type: 'file',
            content: Buffer.from(content).toString('base64'),
            encoding: 'base64'
          }, {
            headers: this.getRateLimitHeaders()
          });
        }

        return HttpResponse.json({
          name: path?.split('/').pop() || 'scenarios.json',
          path: path,
          sha: 'abc123',
          size: 100,
          type: 'file',
          content: Buffer.from('{}').toString('base64'),
          encoding: 'base64'
        }, {
          headers: this.getRateLimitHeaders()
        });
      }),

      // OAuth authorization endpoint
      http.post(`${this.baseUrl}/login/oauth/authorize`, async ({ request }) => {
        this.logRequest('POST', request.url, request.headers);

        return HttpResponse.json({
          code: 'oauth-code-123',
          state: 'state-token'
        });
      }),

      // OAuth token exchange endpoint
      http.post(`${this.baseUrl}/login/oauth/access_token`, async ({ request }) => {
        this.logRequest('POST', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        return HttpResponse.json({
          access_token: 'oauth-access-token',
          token_type: 'bearer',
          scope: 'repo,read:user'
        });
      }),

      // Git info/refs endpoint (for push/pull operations)
      http.get(`${this.baseUrl}/:owner/:repo.git/info/refs`, async ({ request }) => {
        this.logRequest('GET', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        // Simulate git protocol response
        const refs = '001e# service=git-upload-pack\n' +
                     '0000' +
                     '003fabc123 refs/heads/main\n' +
                     '0000';

        return new HttpResponse(refs, {
          headers: {
            'Content-Type': 'application/x-git-upload-pack-advertisement'
          }
        });
      }),

      // Git upload-pack (pull)
      http.post(`${this.baseUrl}/:owner/:repo.git/git-upload-pack`, async ({ request }) => {
        this.logRequest('POST', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        if (!this.pullResponse.success) {
          return new HttpResponse(
            `error: ${this.pullResponse.error || 'Pull failed'}`,
            { status: 500 }
          );
        }

        // Simulate successful pack response
        return new HttpResponse('PACK...', {
          headers: {
            'Content-Type': 'application/x-git-upload-pack-result'
          }
        });
      }),

      // Git receive-pack (push)
      http.post(`${this.baseUrl}/:owner/:repo.git/git-receive-pack`, async ({ request }) => {
        this.logRequest('POST', request.url, request.headers);

        if (this.requestDelay > 0) {
          await delay(this.requestDelay);
        }

        const errorResponse = this.checkForInjectedError();
        if (errorResponse) return errorResponse;

        if (this.pushResponse.rejected) {
          return new HttpResponse(
            'error: rejected non-fast-forward',
            { status: 422 }
          );
        }

        if (this.pushResponse.protectedBranch) {
          return HttpResponse.json(
            { message: 'Protected branch rules prevent pushing' },
            { status: 403 }
          );
        }

        if (!this.pushResponse.success) {
          return new HttpResponse(
            `error: ${this.pushResponse.error || 'Push failed'}`,
            { status: 500 }
          );
        }

        return new HttpResponse('ok refs/heads/main', {
          headers: {
            'Content-Type': 'application/x-git-receive-pack-result'
          }
        });
      })
    ];
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private logRequest(method: string, url: string, headers: Headers): void {
    this.requestLog.push({
      method,
      url,
      timestamp: new Date(),
      headers: Object.fromEntries(headers.entries())
    });
  }

  private validateAuth(authHeader: string | null): {
    valid: boolean;
    status?: number;
    error?: string;
    scopes?: string[];
  } {
    if (!authHeader) {
      return { valid: false, status: 401, error: 'Requires authentication' };
    }

    const token = authHeader.replace(/^(token|Bearer)\s+/, '');

    if (this.authConfig.expiredTokens?.includes(token)) {
      return { valid: false, status: 401, error: 'Token has expired' };
    }

    if (this.authConfig.invalidTokens?.includes(token)) {
      return { valid: false, status: 401, error: 'Bad credentials' };
    }

    if (!this.authConfig.validTokens.includes(token)) {
      return { valid: false, status: 401, error: 'Bad credentials' };
    }

    // Check rate limit
    if (this.authConfig.rateLimitRemaining !== undefined &&
        this.authConfig.rateLimitRemaining <= 0) {
      return { valid: false, status: 403, error: 'API rate limit exceeded' };
    }

    // Decrement rate limit
    if (this.authConfig.rateLimitRemaining !== undefined) {
      this.authConfig.rateLimitRemaining--;
    }

    return {
      valid: true,
      scopes: this.authConfig.tokenScopes?.[token] || []
    };
  }

  private checkForInjectedError(): HttpResponse | null {
    if (this.networkErrorQueue.length === 0) {
      return null;
    }

    const currentError = this.networkErrorQueue[0];
    currentError.count--;

    if (currentError.count <= 0) {
      this.networkErrorQueue.shift();
    }

    switch (currentError.type) {
      case 'timeout':
        // MSW doesn't support true timeouts, so we simulate with a delay + error
        return HttpResponse.error();

      case 'connection-refused':
        return HttpResponse.error();

      case 'dns-failure':
        return HttpResponse.error();

      case 'ssl-error':
        return HttpResponse.json(
          { message: 'SSL certificate problem' },
          { status: 495 }
        );

      case 'rate-limit':
        return HttpResponse.json(
          {
            message: 'API rate limit exceeded',
            documentation_url: 'https://docs.github.com/rest'
          },
          {
            status: 403,
            headers: {
              'X-RateLimit-Limit': '5000',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
            }
          }
        );

      case 'server-error':
        return HttpResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        );

      default:
        return null;
    }
  }

  private getRateLimitHeaders(): Record<string, string> {
    return {
      'X-RateLimit-Limit': '5000',
      'X-RateLimit-Remaining': String(this.authConfig.rateLimitRemaining ?? 5000),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600)
    };
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  /**
   * Get the current repository configuration
   */
  getRepository(): GitHubRepository {
    return { ...this.repository };
  }

  /**
   * Get the current user configuration
   */
  getUser(): GitHubUser {
    return { ...this.user };
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a pre-configured MockGitServer instance
 */
export function createMockGitServer(config?: MockGitServerConfig): MockGitServer {
  return new MockGitServer(config);
}

/**
 * Create a MockGitServer with common test configurations
 */
export const mockGitServerPresets = {
  /**
   * Server configured for successful operations
   */
  successfulSync: (): MockGitServer => {
    const server = new MockGitServer();
    server.configurePullResponse({ success: true, filesChanged: 0 });
    server.configurePushResponse({ success: true });
    return server;
  },

  /**
   * Server configured for conflict testing
   */
  conflictScenario: (files: string[]): MockGitServer => {
    const server = new MockGitServer();
    server.simulateConflict(files, {
      baseContent: Object.fromEntries(files.map(f => [f, '{"version": "base"}'])),
      localContent: Object.fromEntries(files.map(f => [f, '{"version": "local"}'])),
      remoteContent: Object.fromEntries(files.map(f => [f, '{"version": "remote"}']))
    });
    return server;
  },

  /**
   * Server configured for network failure testing
   */
  networkFailure: (errorType: NetworkErrorType = 'timeout'): MockGitServer => {
    const server = new MockGitServer();
    server.injectNetworkError(errorType, 3);
    return server;
  },

  /**
   * Server configured for auth failure testing
   */
  authFailure: (): MockGitServer => {
    const server = new MockGitServer({
      auth: {
        validTokens: [], // No valid tokens
        invalidTokens: ['test-token']
      }
    });
    return server;
  },

  /**
   * Server configured for rate limiting testing
   */
  rateLimited: (): MockGitServer => {
    const server = new MockGitServer();
    server.setRateLimitRemaining(0);
    return server;
  }
};

export default MockGitServer;

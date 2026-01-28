import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { logger } from './logging/config.js';

/**
 * GitHubApiService
 *
 * Centralized GitHub API client with retry and rate limiting support.
 *
 * Tasks T050-T051 (Phase 7)
 */

// Create Octokit with plugins
const OctokitWithPlugins = Octokit.plugin(retry, throttling);

export interface GitHubApiConfig {
  auth: string;
  baseUrl?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

export class GitHubApiService {
  /**
   * Create a configured Octokit instance
   *
   * Task T050 (Phase 7)
   *
   * @param config - API configuration
   * @returns Configured Octokit instance
   */
  static createClient(config: GitHubApiConfig): Octokit {
    return new OctokitWithPlugins({
      auth: config.auth,
      baseUrl: config.baseUrl || 'https://api.github.com',

      // Retry configuration (Task T050)
      retry: {
        doNotRetry: [400, 401, 403, 404, 422], // Don't retry client errors
      },

      // Throttling configuration (Task T051)
      throttle: {
        onRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
          logger.warn('GitHub API rate limit reached', {
            retryAfter,
            retryCount,
            method: options.method,
            url: options.url,
          });

          // Retry up to 3 times
          if (retryCount < 3) {
            logger.info(`Retrying after ${retryAfter} seconds`, {
              retryCount: retryCount + 1,
            });
            return true;
          }

          logger.error('GitHub API rate limit exceeded, max retries reached');
          return false;
        },

        onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
          logger.warn('GitHub API secondary rate limit reached', {
            retryAfter,
            retryCount,
            method: options.method,
            url: options.url,
          });

          // Retry up to 2 times for secondary rate limits
          if (retryCount < 2) {
            logger.info(`Retrying secondary rate limit after ${retryAfter} seconds`);
            return true;
          }

          return false;
        },
      },

      // Logging for debugging
      log: {
        debug: (message: string) => logger.debug(`GitHub API: ${message}`),
        info: (message: string) => logger.info(`GitHub API: ${message}`),
        warn: (message: string) => logger.warn(`GitHub API: ${message}`),
        error: (message: string) => logger.error(`GitHub API: ${message}`),
      },
    });
  }

  /**
   * Get rate limit information from Octokit instance
   *
   * Task T051 (Phase 7)
   *
   * @param octokit - Octokit instance
   * @returns Rate limit information
   */
  static async getRateLimitInfo(octokit: Octokit): Promise<RateLimitInfo> {
    try {
      const { data } = await octokit.rateLimit.get();
      const core = data.resources.core;

      return {
        limit: core.limit,
        remaining: core.remaining,
        reset: new Date(core.reset * 1000),
        used: core.used,
      };
    } catch (error) {
      logger.error('Failed to get rate limit info', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Check if rate limit is close to being exceeded
   *
   * Task T051 (Phase 7)
   *
   * @param octokit - Octokit instance
   * @param threshold - Percentage threshold (default 10%)
   * @returns True if rate limit is low
   */
  static async isRateLimitLow(octokit: Octokit, threshold = 0.1): Promise<boolean> {
    const rateLimit = await this.getRateLimitInfo(octokit);
    const remainingPercentage = rateLimit.remaining / rateLimit.limit;

    if (remainingPercentage <= threshold) {
      logger.warn('GitHub API rate limit running low', {
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        percentage: (remainingPercentage * 100).toFixed(2) + '%',
        resetAt: rateLimit.reset,
      });
      return true;
    }

    return false;
  }

  /**
   * Parse GitHub API error and return user-friendly message
   *
   * Task T055 (Phase 7)
   *
   * @param error - Error from GitHub API
   * @returns User-friendly error message
   */
  static parseGitHubError(error: any): string {
    // Rate limit errors
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response?.headers?.['x-ratelimit-reset'];
      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime, 10) * 1000);
        return `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}.`;
      }
      return 'GitHub API rate limit exceeded. Please try again later.';
    }

    // Authentication errors
    if (error.status === 401) {
      return 'GitHub authentication failed. Your token may be invalid or expired.';
    }

    if (error.status === 403) {
      if (error.message?.includes('token')) {
        return 'GitHub token lacks required permissions. Please reconnect with proper scopes.';
      }
      return 'Access forbidden. You may not have permission to access this resource.';
    }

    // Not found errors
    if (error.status === 404) {
      return 'GitHub resource not found. It may have been deleted or you may not have access.';
    }

    // Validation errors
    if (error.status === 422) {
      const message = error.response?.data?.message || error.message;
      return `GitHub validation error: ${message}`;
    }

    // Server errors
    if (error.status >= 500) {
      return 'GitHub servers are experiencing issues. Please try again later.';
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'Unable to connect to GitHub. Please check your internet connection.';
    }

    // Default error message
    return error.message || 'An unexpected error occurred while communicating with GitHub.';
  }

  /**
   * Wrap GitHub API call with error handling
   *
   * Task T055 (Phase 7)
   *
   * @param apiCall - Function that makes the GitHub API call
   * @returns Result or throws user-friendly error
   */
  static async withErrorHandling<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      const userMessage = this.parseGitHubError(error);

      logger.error('GitHub API error', error instanceof Error ? error : undefined, {
        status: error.status,
        message: error.message,
        userMessage,
      });

      // Re-throw with user-friendly message
      const enhancedError = new Error(userMessage);
      (enhancedError as any).originalError = error;
      (enhancedError as any).status = error.status;
      throw enhancedError;
    }
  }
}

// Singleton instance for application-wide use
let gitHubApiServiceInstance: GitHubApiService | null = null;

/**
 * Get singleton GitHubApiService instance
 *
 * @returns GitHubApiService instance
 */
export function getGitHubApiService(): GitHubApiService {
  if (!gitHubApiServiceInstance) {
    gitHubApiServiceInstance = new GitHubApiService();
  }
  return gitHubApiServiceInstance;
}

// Export singleton instance as default
export default GitHubApiService;

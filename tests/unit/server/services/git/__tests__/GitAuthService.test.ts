/**
 * GitAuthService Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #107 - Git Sync Unit Tests - Tier 3 Supporting Services
 *
 * Tests for GitAuthService covering:
 * - Token validation (simple and detailed)
 * - Credential creation and management
 * - URL credential embedding
 * - Token expiration checks
 * - Token refresh workflow
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { GitAuthService, TokenValidationResult, TokenRefreshResult } from '../../../../../../src/server/services/git/GitAuthService.js';
import type { GitCredential } from '../../../../../../shared/types/git-entities.js';

// ===========================================
// Mock fetch globally
// ===========================================

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// ===========================================
// Mock gitLogger
// ===========================================

jest.mock('../../../../../../src/server/services/git/GitLogger.js', () => ({
  gitLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    startTimer: jest.fn(() => () => 100),
  },
}));

// ===========================================
// Test Helpers
// ===========================================

function createTestCredential(overrides: Partial<GitCredential> = {}): GitCredential {
  return {
    userId: 'user-123',
    provider: 'github-enterprise',
    credentialType: 'personal-access-token',
    token: 'ghp_test_token_12345',
    repositoryUrl: 'https://github.enterprise.com/org/repo.git',
    createdAt: new Date('2024-01-01'),
    lastUsedAt: new Date('2024-01-15'),
    ...overrides,
  };
}

function createMockResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    json: jest.fn().mockResolvedValue(body),
    headers: new Map(Object.entries(headers)) as unknown as Headers,
  } as unknown as Response;
}

function createSuccessResponse(scopes: string[] = ['repo'], rateLimitRemaining = 4999): Response {
  const response = createMockResponse(200, { login: 'testuser' });
  // Override headers.get to return proper values
  (response.headers as unknown as Map<string, string>).get = (name: string) => {
    if (name === 'X-OAuth-Scopes') return scopes.join(', ');
    if (name === 'X-RateLimit-Remaining') return rateLimitRemaining.toString();
    return null;
  };
  return response;
}

// ===========================================
// Tests
// ===========================================

describe('GitAuthService', () => {
  let service: GitAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    service = new GitAuthService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateToken', () => {
    test('should return true for valid token with repository access', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200));

      const result = await service.validateToken(
        'ghp_valid_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result).toBe(true);
    });

    test('should return false for invalid token (401)', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401));

      const result = await service.validateToken(
        'ghp_invalid_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result).toBe(false);
    });

    test('should return false for forbidden access (403)', async () => {
      mockFetch.mockResolvedValue(createMockResponse(403));

      const result = await service.validateToken(
        'ghp_limited_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result).toBe(false);
    });

    test('should return false for invalid repository URL format', async () => {
      const result = await service.validateToken(
        'ghp_token',
        'https://invalid-url.com/repo'
      );

      expect(result).toBe(false);
    });

    test('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.validateToken(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result).toBe(false);
    });

    test('should construct correct API URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200));

      await service.validateToken(
        'ghp_token',
        'https://github.enterprise.com/myorg/myrepo.git'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/myorg/myrepo'),
        expect.any(Object)
      );
    });

    test('should send authorization header with token', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200));

      await service.validateToken(
        'ghp_my_secret_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token ghp_my_secret_token',
          }),
        })
      );
    });
  });

  describe('createCredential', () => {
    test('should create PAT credential with all fields', () => {
      const result = service.createCredential(
        'user-456',
        'personal-access-token',
        'ghp_token_123',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.userId).toBe('user-456');
      expect(result.provider).toBe('github-enterprise');
      expect(result.credentialType).toBe('personal-access-token');
      expect(result.token).toBe('ghp_token_123');
      expect(result.repositoryUrl).toBe('https://github.enterprise.com/org/repo.git');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.lastUsedAt).toBeInstanceOf(Date);
    });

    test('should create OAuth credential', () => {
      const result = service.createCredential(
        'user-789',
        'oauth',
        'gho_oauth_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.credentialType).toBe('oauth');
    });

    test('should include expiration date when provided', () => {
      const expiresAt = new Date('2024-06-01');
      const result = service.createCredential(
        'user-123',
        'personal-access-token',
        'ghp_token',
        'https://github.enterprise.com/org/repo.git',
        expiresAt
      );

      expect(result.expiresAt).toEqual(expiresAt);
    });

    test('should not include expiration date when not provided', () => {
      const result = service.createCredential(
        'user-123',
        'personal-access-token',
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.expiresAt).toBeUndefined();
    });

    test('should set createdAt to current time', () => {
      const beforeCreate = new Date();
      const result = service.createCredential(
        'user-123',
        'personal-access-token',
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );
      const afterCreate = new Date();

      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('addCredentialsToUrl', () => {
    test('should embed token in HTTPS URL', () => {
      const result = service.addCredentialsToUrl(
        'https://github.enterprise.com/org/repo.git',
        'ghp_my_token'
      );

      expect(result).toBe('https://x-access-token:ghp_my_token@github.enterprise.com/org/repo.git');
    });

    test('should handle URL without .git extension', () => {
      const result = service.addCredentialsToUrl(
        'https://github.enterprise.com/org/repo',
        'token123'
      );

      expect(result).toContain('x-access-token:token123@github.enterprise.com');
    });

    test('should throw error for invalid URL', () => {
      expect(() => {
        service.addCredentialsToUrl('not-a-valid-url', 'token');
      }).toThrow('Invalid URL format');
    });

    test('should throw error for empty URL', () => {
      expect(() => {
        service.addCredentialsToUrl('', 'token');
      }).toThrow('Invalid URL format');
    });

    test('should handle URL with existing path', () => {
      const result = service.addCredentialsToUrl(
        'https://github.enterprise.com/org/deep/path/repo.git',
        'token'
      );

      expect(result).toContain('/org/deep/path/repo.git');
      expect(result).toContain('x-access-token:token@');
    });
  });

  describe('isTokenExpiringSoon', () => {
    test('should return false when no expiration date', () => {
      const credential = createTestCredential({ expiresAt: undefined });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(false);
    });

    test('should return true when token expires within 7 days', () => {
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      const credential = createTestCredential({ expiresAt: fiveDaysFromNow });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(true);
    });

    test('should return false when token expires after 7 days', () => {
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      const credential = createTestCredential({ expiresAt: tenDaysFromNow });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(false);
    });

    test('should return true when token is already expired', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const credential = createTestCredential({ expiresAt: yesterday });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(true);
    });

    test('should return true when token expires exactly in 7 days', () => {
      const exactlySevenDays = new Date();
      exactlySevenDays.setDate(exactlySevenDays.getDate() + 7);
      // Subtract 1 second to be just under 7 days
      exactlySevenDays.setSeconds(exactlySevenDays.getSeconds() - 1);
      const credential = createTestCredential({ expiresAt: exactlySevenDays });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(true);
    });

    test('should handle string date format for expiresAt', () => {
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      // Simulate date stored as string (common in JSON)
      const credential = createTestCredential({
        expiresAt: fiveDaysFromNow.toISOString() as unknown as Date,
      });

      const result = service.isTokenExpiringSoon(credential);

      expect(result).toBe(true);
    });
  });

  describe('refreshOAuthToken', () => {
    test('should throw not implemented error', async () => {
      await expect(service.refreshOAuthToken('refresh_token_123'))
        .rejects.toThrow('OAuth refresh not yet implemented');
    });

    test('should throw with guidance to use PAT', async () => {
      await expect(service.refreshOAuthToken('any_token'))
        .rejects.toThrow('Please use Personal Access Tokens');
    });
  });

  describe('validateTokenDetailed', () => {
    test('should return valid result for successful validation', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse(['repo', 'read:user'], 4500));

      const result = await service.validateTokenDetailed(
        'ghp_valid_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(true);
      expect(result.scopes).toContain('repo');
      expect(result.rateLimitRemaining).toBe(4500);
    });

    test('should return invalid result for 401 response', async () => {
      const response = createMockResponse(401);
      mockFetch.mockResolvedValue(response);

      const result = await service.validateTokenDetailed(
        'ghp_invalid_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or has been revoked');
    });

    test('should return invalid result for 403 response', async () => {
      const response = createMockResponse(403);
      mockFetch.mockResolvedValue(response);

      const result = await service.validateTokenDetailed(
        'ghp_limited_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('insufficient permissions');
    });

    test('should return invalid result for other error statuses', async () => {
      const response = createMockResponse(500, { message: 'Server error' });
      mockFetch.mockResolvedValue(response);

      const result = await service.validateTokenDetailed(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GitHub API error: 500');
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await service.validateTokenDetailed(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.error).toContain('Connection refused');
    });

    test('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse());

      await service.validateTokenDetailed(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.enterprise.com/api/v3/user',
        expect.any(Object)
      );
    });

    test('should return empty scopes array when header missing', async () => {
      const response = createMockResponse(200);
      (response.headers as unknown as Map<string, string>).get = () => null;
      mockFetch.mockResolvedValue(response);

      const result = await service.validateTokenDetailed(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.valid).toBe(true);
      expect(result.scopes).toEqual([]);
    });
  });

  describe('checkAndRefreshToken', () => {
    test('should return success for valid non-expiring token', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse(['repo']));
      const credential = createTestCredential();

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(true);
      expect(result.needsUserAction).toBe(false);
      expect(result.message).toBe('Token is valid');
    });

    test('should return failure for already expired token', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const credential = createTestCredential({ expiresAt: yesterday });

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(false);
      expect(result.needsUserAction).toBe(true);
      expect(result.message).toContain('expired');
    });

    test('should return success with warning for expiring soon token', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse(['repo']));
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      const credential = createTestCredential({ expiresAt: fiveDaysFromNow });

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(true);
      expect(result.needsUserAction).toBe(false);
      expect(result.message).toContain('expire soon');
    });

    test('should return failure for PAT validation failure', async () => {
      const response = createMockResponse(401);
      mockFetch.mockResolvedValue(response);
      const credential = createTestCredential({ credentialType: 'personal-access-token' });

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(false);
      expect(result.needsUserAction).toBe(true);
      expect(result.message).toContain('Personal Access Token');
    });

    test('should return failure for OAuth validation failure', async () => {
      const response = createMockResponse(401);
      mockFetch.mockResolvedValue(response);
      const credential = createTestCredential({ credentialType: 'oauth' });

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(false);
      expect(result.needsUserAction).toBe(true);
      expect(result.message).toContain('re-authenticate');
    });

    test('should return failure when missing required scopes', async () => {
      // Return scopes without 'repo'
      mockFetch.mockResolvedValue(createSuccessResponse(['read:user', 'gist']));
      const credential = createTestCredential();

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(false);
      expect(result.needsUserAction).toBe(true);
      expect(result.message).toContain("missing required permissions");
    });

    test('should succeed with low rate limit but log warning', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse(['repo'], 50));
      const credential = createTestCredential();

      const result = await service.checkAndRefreshToken(
        credential,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getTokenGenerationInstructions', () => {
    test('should return correct steps', () => {
      const result = service.getTokenGenerationInstructions(
        'https://github.enterprise.com'
      );

      expect(result.steps).toHaveLength(7);
      expect(result.steps[0]).toContain('Navigate to');
      expect(result.steps[4]).toContain('Generate token');
    });

    test('should return correct settings URL', () => {
      const result = service.getTokenGenerationInstructions(
        'https://github.enterprise.com'
      );

      expect(result.url).toBe('https://github.enterprise.com/settings/tokens/new');
    });

    test('should return required scopes', () => {
      const result = service.getTokenGenerationInstructions(
        'https://github.enterprise.com'
      );

      expect(result.requiredScopes).toContain('repo');
    });

    test('should return recommended expiration', () => {
      const result = service.getTokenGenerationInstructions(
        'https://github.enterprise.com'
      );

      expect(result.recommendedExpiration).toBe('90 days');
    });

    test('should handle custom enterprise URL', () => {
      const result = service.getTokenGenerationInstructions(
        'https://git.mycompany.com'
      );

      expect(result.url).toBe('https://git.mycompany.com/settings/tokens/new');
    });

    test('should preserve protocol from input URL', () => {
      const result = service.getTokenGenerationInstructions(
        'http://internal-git.local'
      );

      expect(result.url).toContain('http://');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle credential with future createdAt date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const credential = createTestCredential({ createdAt: futureDate });

      // Should still work - no validation on createdAt
      expect(service.isTokenExpiringSoon(credential)).toBe(false);
    });

    test('should handle very long tokens', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse());
      const longToken = 'ghp_' + 'a'.repeat(1000);

      await service.validateToken(
        longToken,
        'https://github.enterprise.com/org/repo.git'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `token ${longToken}`,
          }),
        })
      );
    });

    test('should handle URL with port number', () => {
      const result = service.addCredentialsToUrl(
        'https://github.enterprise.com:8443/org/repo.git',
        'token'
      );

      expect(result).toContain(':8443');
      expect(result).toContain('x-access-token:token@');
    });

    test('should handle repository URL with query parameters', async () => {
      mockFetch.mockResolvedValue(createSuccessResponse());

      const result = await service.validateTokenDetailed(
        'ghp_token',
        'https://github.enterprise.com/org/repo.git?ref=main'
      );

      expect(result.valid).toBe(true);
    });
  });
});

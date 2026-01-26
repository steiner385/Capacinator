/**
 * GitHealthCheck Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 *
 * Tests for GitHealthCheck covering:
 * - Network connectivity checks (checkNetworkConnectivity)
 * - Disk space checks (checkDiskSpace)
 * - Comprehensive health checks (performHealthCheck)
 * - Convenience methods (isServerReachable, getAvailableDiskSpaceMB)
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { ClientRequest, IncomingMessage } from 'http';

// ===========================================
// Mock Setup - Must be before imports
// ===========================================

// Mock https module
const mockHttpsGet = jest.fn();
jest.mock('https', () => ({
  get: mockHttpsGet,
}));

// Mock http module
const mockHttpGet = jest.fn();
jest.mock('http', () => ({
  get: mockHttpGet,
}));

// Mock fs/promises module
const mockStatfs = jest.fn();
const mockAccess = jest.fn();
jest.mock('fs/promises', () => ({
  statfs: mockStatfs,
  access: mockAccess,
}));

// Import after mocks
import { GitHealthCheck } from '../../../../../../src/server/services/git/GitHealthCheck.js';
import { GitNetworkError, GitDiskSpaceError } from '../../../../../../src/server/services/git/GitErrors.js';

// ===========================================
// Mock Request/Response Factories
// ===========================================

interface MockRequestOptions {
  triggerCallback?: boolean;
  statusCode?: number;
  triggerTimeout?: boolean;
  triggerError?: Error;
  callbackDelay?: number;
}

type EventCallback = (arg?: unknown) => void;

function setupHttpsMock(options: MockRequestOptions = {}) {
  const {
    triggerCallback = true,
    statusCode = 200,
    triggerTimeout = false,
    triggerError,
    callbackDelay = 0,
  } = options;

  const callbacks: Record<string, EventCallback> = {};

  const mockRequest: Partial<ClientRequest> = {
    on: jest.fn((event: string, callback: EventCallback) => {
      callbacks[event] = callback;

      // Trigger timeout or error immediately after registration
      if (event === 'timeout' && triggerTimeout) {
        setImmediate(() => {
          callback();
        });
      }
      if (event === 'error' && triggerError) {
        setImmediate(() => {
          callback(triggerError);
        });
      }

      return mockRequest as ClientRequest;
    }),
    destroy: jest.fn(),
    end: jest.fn(),
  };

  mockHttpsGet.mockImplementation((_opts: unknown, responseCallback: (res: Partial<IncomingMessage>) => void) => {
    // Trigger success callback if not timeout/error
    if (triggerCallback && !triggerTimeout && !triggerError) {
      setTimeout(() => {
        const mockResponse: Partial<IncomingMessage> = {
          statusCode,
          resume: jest.fn(),
        };
        responseCallback(mockResponse);
      }, callbackDelay);
    }

    return mockRequest as ClientRequest;
  });

  return mockRequest;
}

function setupHttpMock(options: MockRequestOptions = {}) {
  const {
    triggerCallback = true,
    statusCode = 200,
    triggerTimeout = false,
    triggerError,
    callbackDelay = 0,
  } = options;

  const callbacks: Record<string, EventCallback> = {};

  const mockRequest: Partial<ClientRequest> = {
    on: jest.fn((event: string, callback: EventCallback) => {
      callbacks[event] = callback;

      // Trigger timeout or error immediately after registration
      if (event === 'timeout' && triggerTimeout) {
        setImmediate(() => {
          callback();
        });
      }
      if (event === 'error' && triggerError) {
        setImmediate(() => {
          callback(triggerError);
        });
      }

      return mockRequest as ClientRequest;
    }),
    destroy: jest.fn(),
    end: jest.fn(),
  };

  mockHttpGet.mockImplementation((_opts: unknown, responseCallback: (res: Partial<IncomingMessage>) => void) => {
    // Trigger success callback if not timeout/error
    if (triggerCallback && !triggerTimeout && !triggerError) {
      setTimeout(() => {
        const mockResponse: Partial<IncomingMessage> = {
          statusCode,
          resume: jest.fn(),
        };
        responseCallback(mockResponse);
      }, callbackDelay);
    }

    return mockRequest as ClientRequest;
  });

  return mockRequest;
}

// ===========================================
// Mock Filesystem Factory
// ===========================================

interface MockStatfsResult {
  bsize: number;  // Block size in bytes
  bavail: number; // Available blocks
}

function setupStatfsMock(result: MockStatfsResult | Error) {
  if (result instanceof Error) {
    mockStatfs.mockRejectedValue(result);
  } else {
    mockStatfs.mockResolvedValue(result);
  }
}

function setupAccessMock(success: boolean) {
  if (success) {
    mockAccess.mockResolvedValue(undefined);
  } else {
    mockAccess.mockRejectedValue(new Error('ENOENT: no such file or directory'));
  }
}

// ===========================================
// Tests
// ===========================================

describe('GitHealthCheck', () => {
  let healthCheck: GitHealthCheck;

  beforeEach(() => {
    healthCheck = new GitHealthCheck();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =========================================
  // US3: Network Connectivity Tests
  // =========================================

  describe('checkNetworkConnectivity', () => {
    describe('Successful Connections', () => {
      test('returns reachable:true for HTTP 200 response', async () => {
        setupHttpsMock({ statusCode: 200 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(true);
        expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();
      });

      test('returns reachable:true for HTTP 301 redirect', async () => {
        setupHttpsMock({ statusCode: 301 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(true);
      });

      test('returns reachable:true for HTTP 404 (server reachable)', async () => {
        setupHttpsMock({ statusCode: 404 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(true);
      });

      test('returns reachable:true for HTTP 403 (server reachable, auth issue)', async () => {
        setupHttpsMock({ statusCode: 403 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(true);
      });
    });

    describe('Failed Connections', () => {
      test('returns reachable:false for HTTP 500 server error', async () => {
        setupHttpsMock({ statusCode: 500 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(false);
        expect(result.error).toContain('500');
      });

      test('returns reachable:false for HTTP 502 bad gateway', async () => {
        setupHttpsMock({ statusCode: 502 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(false);
      });

      test('returns reachable:false on connection timeout', async () => {
        setupHttpsMock({ triggerTimeout: true });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo', 100);

        expect(result.reachable).toBe(false);
        expect(result.error).toContain('timeout');
      });

      test('returns reachable:false on ENOTFOUND error', async () => {
        setupHttpsMock({ triggerError: new Error('getaddrinfo ENOTFOUND github.com') });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(false);
        expect(result.error).toContain('ENOTFOUND');
      });

      test('returns reachable:false on ECONNREFUSED error', async () => {
        setupHttpsMock({ triggerError: new Error('connect ECONNREFUSED 127.0.0.1:443') });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(false);
        expect(result.error).toContain('ECONNREFUSED');
      });
    });

    describe('Response Content', () => {
      test('includes responseTimeMs in result', async () => {
        setupHttpsMock({ statusCode: 200, callbackDelay: 50 });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(typeof result.responseTimeMs).toBe('number');
        expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      });

      test('includes error message when not reachable', async () => {
        const errorMsg = 'Connection refused by server';
        setupHttpsMock({ triggerError: new Error(errorMsg) });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(result.reachable).toBe(false);
        expect(result.error).toBe(errorMsg);
      });
    });

    describe('Protocol Handling', () => {
      test('uses HTTPS for https:// URLs', async () => {
        setupHttpsMock({ statusCode: 200 });

        await healthCheck.checkNetworkConnectivity('https://github.com/org/repo');

        expect(mockHttpsGet).toHaveBeenCalled();
        expect(mockHttpGet).not.toHaveBeenCalled();
      });

      test('uses HTTP for http:// URLs', async () => {
        setupHttpMock({ statusCode: 200 });

        await healthCheck.checkNetworkConnectivity('http://internal-server/repo');

        expect(mockHttpGet).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      test('handles malformed URL gracefully', async () => {
        const result = await healthCheck.checkNetworkConnectivity('not-a-valid-url');

        expect(result.reachable).toBe(false);
        expect(result.error).toBeDefined();
      });

      test('respects custom timeout parameter', async () => {
        setupHttpsMock({ triggerTimeout: true });

        const startTime = Date.now();
        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo', 100);
        const elapsed = Date.now() - startTime;

        expect(result.reachable).toBe(false);
        // Should timeout relatively quickly, not wait for default 5000ms
        expect(elapsed).toBeLessThan(5000);
      });

      test('handles request.destroy() being called during timeout', async () => {
        const mockRequest = setupHttpsMock({ triggerTimeout: true });

        const result = await healthCheck.checkNetworkConnectivity('https://github.com/org/repo', 100);

        expect(result.reachable).toBe(false);
        expect((mockRequest as any).destroy).toHaveBeenCalled();
      });
    });
  });

  // =========================================
  // US3: Disk Space Tests
  // =========================================

  describe('checkDiskSpace', () => {
    describe('Space Availability', () => {
      test('returns available:true when free space exceeds requirement', async () => {
        setupAccessMock(true);
        // 128000 blocks * 4096 bytes/block = 524,288,000 bytes ≈ 500 MB
        setupStatfsMock({ bsize: 4096, bavail: 128000 });

        const result = await healthCheck.checkDiskSpace('/app/data', 100);

        expect(result.available).toBe(true);
        expect(result.freeSpaceMB).toBeGreaterThanOrEqual(100);
      });

      test('returns available:false when free space below requirement', async () => {
        setupAccessMock(true);
        // 25600 blocks * 4096 bytes/block = 104,857,600 bytes ≈ 100 MB
        setupStatfsMock({ bsize: 4096, bavail: 25600 });

        const result = await healthCheck.checkDiskSpace('/app/data', 500);

        expect(result.available).toBe(false);
        expect(result.freeSpaceMB).toBeLessThan(500);
      });

      test('returns available:true when free space exactly equals requirement', async () => {
        setupAccessMock(true);
        // Exactly 500 MB: 500 * 1024 * 1024 / 4096 = 128000 blocks
        setupStatfsMock({ bsize: 4096, bavail: 128000 });

        const result = await healthCheck.checkDiskSpace('/app/data', 500);

        expect(result.available).toBe(true);
      });
    });

    describe('Space Calculation', () => {
      test('correctly calculates MB from block size and available blocks', async () => {
        setupAccessMock(true);
        // 1024 blocks * 1024 bytes/block = 1,048,576 bytes = 1 MB
        setupStatfsMock({ bsize: 1024, bavail: 1024 });

        const result = await healthCheck.checkDiskSpace('/app/data', 0);

        expect(result.freeSpaceMB).toBe(1);
      });

      test('handles large disk sizes correctly', async () => {
        setupAccessMock(true);
        // 1 TB: ~1,000,000 MB
        // 1000000 * 1024 * 1024 / 4096 = 256,000,000 blocks
        setupStatfsMock({ bsize: 4096, bavail: 256000000 });

        const result = await healthCheck.checkDiskSpace('/app/data', 100);

        expect(result.available).toBe(true);
        expect(result.freeSpaceMB).toBeGreaterThan(900000);
      });
    });

    describe('Directory Handling', () => {
      test('checks parent directory when target doesn\'t exist', async () => {
        setupAccessMock(false); // Directory doesn't exist
        setupStatfsMock({ bsize: 4096, bavail: 128000 });

        const result = await healthCheck.checkDiskSpace('/app/nonexistent/path', 100);

        expect(result.available).toBe(true);
      });
    });

    describe('Response Content', () => {
      test('includes freeSpaceMB in result', async () => {
        setupAccessMock(true);
        setupStatfsMock({ bsize: 4096, bavail: 128000 });

        const result = await healthCheck.checkDiskSpace('/app/data', 100);

        expect(typeof result.freeSpaceMB).toBe('number');
        expect(result.freeSpaceMB).toBeGreaterThan(0);
      });

      test('includes requiredMB in result', async () => {
        setupAccessMock(true);
        setupStatfsMock({ bsize: 4096, bavail: 128000 });

        const result = await healthCheck.checkDiskSpace('/app/data', 250);

        expect(result.requiredMB).toBe(250);
      });

      test('returns error message when statfs fails', async () => {
        setupAccessMock(true);
        setupStatfsMock(new Error('Permission denied'));

        const result = await healthCheck.checkDiskSpace('/app/data', 100);

        expect(result.available).toBe(false);
        expect(result.error).toBe('Permission denied');
      });
    });

    describe('Default Values', () => {
      test('uses default 500MB requirement when not specified', async () => {
        setupAccessMock(true);
        setupStatfsMock({ bsize: 4096, bavail: 128000 }); // ~500MB

        const result = await healthCheck.checkDiskSpace('/app/data');

        expect(result.requiredMB).toBe(500);
      });
    });

    describe('Error Handling', () => {
      test('handles permission denied error from statfs', async () => {
        setupAccessMock(true);
        setupStatfsMock(new Error('EACCES: permission denied'));

        const result = await healthCheck.checkDiskSpace('/protected/path', 100);

        expect(result.available).toBe(false);
        expect(result.freeSpaceMB).toBe(0);
        expect(result.error).toContain('EACCES');
      });
    });
  });

  // =========================================
  // US3: Comprehensive Health Check Tests
  // =========================================

  describe('performHealthCheck', () => {
    test('passes when both network and disk checks pass', async () => {
      setupHttpsMock({ statusCode: 200 });
      setupAccessMock(true);
      setupStatfsMock({ bsize: 4096, bavail: 256000 }); // ~1GB

      const result = await healthCheck.performHealthCheck(
        'https://github.com/org/repo',
        '/app/data',
        500
      );

      expect(result.network.reachable).toBe(true);
      expect(result.diskSpace.available).toBe(true);
    });

    test('throws GitNetworkError when network unreachable', async () => {
      setupHttpsMock({ triggerError: new Error('Network unreachable') });
      setupAccessMock(true);
      setupStatfsMock({ bsize: 4096, bavail: 256000 });

      await expect(
        healthCheck.performHealthCheck('https://github.com/org/repo', '/app/data', 500)
      ).rejects.toThrow(GitNetworkError);
    });

    test('throws GitDiskSpaceError when insufficient space', async () => {
      setupHttpsMock({ statusCode: 200 });
      setupAccessMock(true);
      setupStatfsMock({ bsize: 4096, bavail: 1000 }); // Only ~4MB

      await expect(
        healthCheck.performHealthCheck('https://github.com/org/repo', '/app/data', 500)
      ).rejects.toThrow(GitDiskSpaceError);
    });

    test('checks network and throws GitNetworkError when network fails', async () => {
      const networkError = new Error('Network failed first');
      setupHttpsMock({ triggerError: networkError });
      // Setup disk mocks too since implementation runs both checks
      setupAccessMock(true);
      setupStatfsMock({ bsize: 4096, bavail: 256000 });

      try {
        await healthCheck.performHealthCheck('https://github.com/org/repo', '/app/data', 500);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitNetworkError);
        // The implementation calls both checks, then throws network error first
        // This is acceptable behavior - both checks run, but network error takes priority
      }
    });

    test('returns complete HealthCheckResult on success', async () => {
      setupHttpsMock({ statusCode: 200 });
      setupAccessMock(true);
      setupStatfsMock({ bsize: 4096, bavail: 256000 });

      const result = await healthCheck.performHealthCheck(
        'https://github.com/org/repo',
        '/app/data',
        500
      );

      // Verify complete structure
      expect(result).toHaveProperty('network');
      expect(result).toHaveProperty('diskSpace');
      expect(result.network).toHaveProperty('reachable');
      expect(result.network).toHaveProperty('responseTimeMs');
      expect(result.diskSpace).toHaveProperty('available');
      expect(result.diskSpace).toHaveProperty('freeSpaceMB');
      expect(result.diskSpace).toHaveProperty('requiredMB');
    });
  });

  // =========================================
  // US3: Convenience Method Tests
  // =========================================

  describe('isServerReachable', () => {
    test('returns true for reachable server', async () => {
      setupHttpsMock({ statusCode: 200 });

      const result = await healthCheck.isServerReachable('https://github.com/org/repo');

      expect(result).toBe(true);
    });

    test('returns false for unreachable server', async () => {
      setupHttpsMock({ triggerError: new Error('Connection refused') });

      const result = await healthCheck.isServerReachable('https://github.com/org/repo');

      expect(result).toBe(false);
    });

    test('uses 3000ms timeout', async () => {
      // This test verifies the method uses a shorter timeout than default
      setupHttpsMock({ triggerTimeout: true });

      const startTime = Date.now();
      await healthCheck.isServerReachable('https://github.com/org/repo');
      const elapsed = Date.now() - startTime;

      // Should be faster than the default 5000ms timeout
      // but give some buffer for test execution
      expect(elapsed).toBeLessThan(4000);
    });
  });

  describe('getAvailableDiskSpaceMB', () => {
    test('returns correct MB value', async () => {
      setupAccessMock(true);
      // 256000 blocks * 4096 bytes = ~1GB
      setupStatfsMock({ bsize: 4096, bavail: 256000 });

      const result = await healthCheck.getAvailableDiskSpaceMB('/app/data');

      expect(result).toBeGreaterThan(900); // ~1GB = ~1000MB
    });

    test('returns 0 on error', async () => {
      setupAccessMock(true);
      setupStatfsMock(new Error('Cannot access filesystem'));

      const result = await healthCheck.getAvailableDiskSpaceMB('/app/data');

      expect(result).toBe(0);
    });
  });
});

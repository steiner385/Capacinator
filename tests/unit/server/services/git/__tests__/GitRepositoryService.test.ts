/**
 * GitRepositoryService Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #105 - Git Sync Unit Tests - Tier 1 Critical Services
 *
 * Tests for GitRepositoryService covering:
 * - Repository status operations
 * - Clone, pull, push operations
 * - Branch operations
 * - Commit operations
 * - Error handling and categorization
 *
 * Coverage target: 85% statements, 80% branches
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupGitMatchers } from '../../../../../utils/git-matchers.js';

// ===========================================
// Mock State Management
// ===========================================

interface MockGitState {
  initialized: boolean;
  currentBranch: string;
  branches: string[];
  remoteUrl: string | null;
  ahead: number;
  behind: number;
  modifiedFiles: Set<string>;
  stagedFiles: Set<string>;
  untrackedFiles: Set<string>;
  conflictedFiles: Set<string>;
  commits: Array<{
    hash: string;
    date: string;
    message: string;
    author_name: string;
    author_email: string;
  }>;
  networkAvailable: boolean;
  simulateError?: { operation: string; error: Error };
}

let mockState: MockGitState = createDefaultState();

function createDefaultState(): MockGitState {
  return {
    initialized: false,
    currentBranch: 'main',
    branches: ['main'],
    remoteUrl: null,
    ahead: 0,
    behind: 0,
    modifiedFiles: new Set(),
    stagedFiles: new Set(),
    untrackedFiles: new Set(),
    conflictedFiles: new Set(),
    commits: [],
    networkAvailable: true,
  };
}

function resetMockState() {
  mockState = createDefaultState();
}

function checkError(operation: string) {
  if (mockState.simulateError?.operation === operation) {
    throw mockState.simulateError.error;
  }
}

// ===========================================
// Mock Implementations
// ===========================================

const mockGitInstance = {
  clone: jest.fn().mockImplementation(async (url: string, localPath: string, options?: any) => {
    checkError('clone');
    if (!mockState.networkAvailable) {
      throw new Error('fatal: unable to access remote repository');
    }
    mockState.initialized = true;
    mockState.remoteUrl = url.replace(/\/\/[^@]*@/, '//'); // Strip credentials
    return undefined;
  }),
  status: jest.fn().mockImplementation(async () => {
    checkError('status');
    return {
      current: mockState.currentBranch,
      tracking: `origin/${mockState.currentBranch}`,
      ahead: mockState.ahead,
      behind: mockState.behind,
      modified: Array.from(mockState.modifiedFiles),
      staged: Array.from(mockState.stagedFiles),
      not_added: Array.from(mockState.untrackedFiles),
      conflicted: Array.from(mockState.conflictedFiles),
      files: [],
      isClean: () =>
        mockState.modifiedFiles.size === 0 &&
        mockState.stagedFiles.size === 0 &&
        mockState.untrackedFiles.size === 0 &&
        mockState.conflictedFiles.size === 0,
    };
  }),
  getRemotes: jest.fn().mockImplementation(async () => {
    checkError('getRemotes');
    if (!mockState.remoteUrl) return [];
    return [{ name: 'origin', refs: { fetch: mockState.remoteUrl, push: mockState.remoteUrl } }];
  }),
  branch: jest.fn().mockImplementation(async () => {
    checkError('branch');
    const branches: Record<string, any> = {};
    for (const name of mockState.branches) {
      branches[name] = { current: name === mockState.currentBranch, name };
    }
    return { all: mockState.branches, branches, current: mockState.currentBranch, detached: false };
  }),
  checkout: jest.fn().mockImplementation(async (branch: string) => {
    checkError('checkout');
    const branchName = Array.isArray(branch) ? branch[0] : branch;
    if (!mockState.branches.includes(branchName)) {
      throw new Error(`error: pathspec '${branchName}' did not match any file(s)`);
    }
    mockState.currentBranch = branchName;
    return '';
  }),
  checkoutBranch: jest.fn().mockImplementation(async (branchName: string, startPoint: string) => {
    checkError('checkoutBranch');
    if (!mockState.branches.includes(startPoint)) {
      throw new Error(`fatal: invalid reference: ${startPoint}`);
    }
    if (mockState.branches.includes(branchName)) {
      throw new Error(`fatal: A branch named '${branchName}' already exists`);
    }
    mockState.branches.push(branchName);
    mockState.currentBranch = branchName;
  }),
  checkoutLocalBranch: jest.fn().mockImplementation(async (branchName: string) => {
    checkError('checkoutLocalBranch');
    if (mockState.branches.includes(branchName)) {
      throw new Error(`fatal: A branch named '${branchName}' already exists`);
    }
    mockState.branches.push(branchName);
    mockState.currentBranch = branchName;
  }),
  deleteLocalBranch: jest.fn().mockImplementation(async (branchName: string) => {
    checkError('deleteLocalBranch');
    const index = mockState.branches.indexOf(branchName);
    if (index === -1) {
      throw new Error(`error: branch '${branchName}' not found`);
    }
    if (mockState.currentBranch === branchName) {
      throw new Error(`error: Cannot delete branch '${branchName}' checked out`);
    }
    mockState.branches.splice(index, 1);
    return { branch: branchName, success: true };
  }),
  pull: jest.fn().mockImplementation(async () => {
    checkError('pull');
    if (!mockState.networkAvailable) {
      throw new Error('fatal: unable to access remote repository');
    }
    const conflictedFiles = Array.from(mockState.conflictedFiles);
    if (conflictedFiles.length > 0) {
      return {
        files: conflictedFiles,
        summary: { conflicts: conflictedFiles, changes: 0, insertions: 0, deletions: 0 },
      };
    }
    mockState.behind = 0;
    return { files: [], summary: { conflicts: [], changes: 0, insertions: 0, deletions: 0 } };
  }),
  add: jest.fn().mockImplementation(async (files: string | string[]) => {
    checkError('add');
    const filesToAdd = Array.isArray(files) ? files : [files];
    for (const file of filesToAdd) {
      if (file === './*' || file === '.') {
        for (const f of mockState.modifiedFiles) mockState.stagedFiles.add(f);
        mockState.modifiedFiles.clear();
        for (const f of mockState.untrackedFiles) mockState.stagedFiles.add(f);
        mockState.untrackedFiles.clear();
      }
    }
    return '';
  }),
  commit: jest.fn().mockImplementation(async (message: string, files?: any, options?: any) => {
    checkError('commit');
    if (mockState.stagedFiles.size === 0 && mockState.modifiedFiles.size === 0) {
      throw new Error('nothing to commit, working tree clean');
    }
    const hash = Math.random().toString(16).substring(2, 10);
    const authorMatch = options?.['--author']?.match(/^(.+) <(.+)>$/);
    mockState.commits.unshift({
      hash,
      date: new Date().toISOString(),
      message: Array.isArray(message) ? message.join('\n') : message,
      author_name: authorMatch?.[1] || 'Test User',
      author_email: authorMatch?.[2] || 'test@example.com',
    });
    mockState.stagedFiles.clear();
    mockState.ahead++;
    return { commit: hash, summary: { changes: 1 } };
  }),
  push: jest.fn().mockImplementation(async () => {
    checkError('push');
    if (!mockState.networkAvailable) {
      throw new Error('fatal: unable to access remote repository');
    }
    mockState.ahead = 0;
    return { pushed: [] };
  }),
  merge: jest.fn().mockImplementation(async (options: string | string[]) => {
    checkError('merge');
    const branchToMerge = Array.isArray(options) ? options[0] : options;
    if (!mockState.branches.includes(branchToMerge)) {
      throw new Error(`merge: ${branchToMerge} - not something we can merge`);
    }
    if (mockState.conflictedFiles.size > 0) {
      throw new Error(`CONFLICT (content): Merge conflict`);
    }
    return { files: [], conflicts: [], result: 'success' };
  }),
  log: jest.fn().mockImplementation(async (options?: any) => {
    checkError('log');
    const maxCount = options?.maxCount || 50;
    return {
      all: mockState.commits.slice(0, maxCount),
      total: mockState.commits.length,
      latest: mockState.commits[0] || null,
    };
  }),
  diff: jest.fn().mockImplementation(async () => {
    checkError('diff');
    return 'diff --git a/file.json b/file.json';
  }),
};

// Mock the simple-git module
jest.mock('simple-git', () => {
  const mockSimpleGit = (repoPath?: string) => mockGitInstance;
  mockSimpleGit.default = mockSimpleGit;
  return {
    __esModule: true,
    default: mockSimpleGit,
    simpleGit: mockSimpleGit,
  };
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
}));

// Mock health check
const mockPerformHealthCheck = jest.fn().mockResolvedValue(undefined);
const mockCheckNetworkConnectivity = jest.fn().mockResolvedValue({ reachable: true });

jest.mock('../../../../../../src/server/services/git/GitHealthCheck.js', () => ({
  GitHealthCheck: jest.fn().mockImplementation(() => ({
    performHealthCheck: mockPerformHealthCheck,
    checkNetworkConnectivity: mockCheckNetworkConnectivity,
  })),
}));

// Mock auth service
jest.mock('../../../../../../src/server/services/git/GitAuthService.js', () => ({
  GitAuthService: jest.fn().mockImplementation(() => ({
    addCredentialsToUrl: jest.fn((url: string, token: string) => {
      try {
        const urlObj = new URL(url);
        urlObj.username = 'token';
        urlObj.password = token;
        return urlObj.toString();
      } catch {
        return url;
      }
    }),
  })),
}));

// Mock logger
jest.mock('../../../../../../src/server/services/git/GitLogger.js', () => ({
  gitLogger: {
    startTimer: jest.fn(() => jest.fn(() => 100)),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationFailure: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Now import the service after all mocks are set up
import { GitRepositoryService } from '../../../../../../src/server/services/git/GitRepositoryService.js';

const fs = require('fs/promises');

// Setup custom matchers
setupGitMatchers();

// ===========================================
// Test Helpers
// ===========================================

function createTestCredential() {
  return {
    userId: 'test-user',
    provider: 'github-enterprise' as const,
    credentialType: 'personal-access-token' as const,
    token: 'ghp_test123456789',
    repositoryUrl: 'https://github.com/org/repo.git',
    createdAt: new Date(),
  };
}

function createTestAuthor() {
  return {
    name: 'Test User',
    email: 'test@example.com',
  };
}

function initializeRepo(options: Partial<MockGitState> = {}) {
  mockState.initialized = true;
  mockState.remoteUrl = options.remoteUrl ?? 'https://github.com/org/repo.git';
  if (options.branches) mockState.branches = options.branches;
  if (options.currentBranch) mockState.currentBranch = options.currentBranch;
  if (options.ahead !== undefined) mockState.ahead = options.ahead;
  if (options.behind !== undefined) mockState.behind = options.behind;
}

// ===========================================
// Tests
// ===========================================

describe('GitRepositoryService', () => {
  const TEST_REPO_PATH = '/test/repo';
  let service: GitRepositoryService;

  beforeEach(() => {
    resetMockState();
    jest.clearAllMocks();
    mockCheckNetworkConnectivity.mockResolvedValue({ reachable: true });
    mockPerformHealthCheck.mockResolvedValue(undefined);
    service = new GitRepositoryService(TEST_REPO_PATH);
  });

  describe('Repository Status Operations', () => {
    describe('repositoryExists', () => {
      test('should return true when .git directory exists', async () => {
        fs.access.mockResolvedValue(undefined);
        const result = await service.repositoryExists();
        expect(result).toBe(true);
      });

      test('should return false when .git directory does not exist', async () => {
        fs.access.mockRejectedValue(new Error('ENOENT'));
        const result = await service.repositoryExists();
        expect(result).toBe(false);
      });
    });

    describe('getStatus', () => {
      test('should return status for clean repository', async () => {
        initializeRepo();
        const status = await service.getStatus();
        expect(status.current).toBe('main');
        expect(status.isClean()).toBe(true);
      });

      test('should return status with modified files', async () => {
        initializeRepo();
        mockState.modifiedFiles.add('file1.json');
        mockState.modifiedFiles.add('file2.json');
        const status = await service.getStatus();
        expect(status.isClean()).toBe(false);
        expect(status.modified).toContain('file1.json');
      });
    });

    describe('getRemoteUrl', () => {
      test('should return remote URL when configured', async () => {
        initializeRepo({ remoteUrl: 'https://github.com/org/repo.git' });
        const url = await service.getRemoteUrl();
        expect(url).toBe('https://github.com/org/repo.git');
      });

      test('should return null when no remote configured', async () => {
        initializeRepo({ remoteUrl: null });
        mockState.remoteUrl = null;
        const url = await service.getRemoteUrl();
        expect(url).toBeNull();
      });
    });

    describe('getCurrentBranch', () => {
      test('should return current branch name', async () => {
        initializeRepo({ currentBranch: 'feature/test' });
        const branch = await service.getCurrentBranch();
        expect(branch).toBe('feature/test');
      });
    });

    describe('isClean', () => {
      test('should return true for clean repository', async () => {
        initializeRepo();
        const isClean = await service.isClean();
        expect(isClean).toBe(true);
      });

      test('should return false when modified files exist', async () => {
        initializeRepo();
        mockState.modifiedFiles.add('file.json');
        const isClean = await service.isClean();
        expect(isClean).toBe(false);
      });
    });

    describe('listBranches', () => {
      test('should return all branches', async () => {
        initializeRepo({ branches: ['main', 'develop', 'feature/test'] });
        const branches = await service.listBranches();
        expect(branches).toContain('main');
        expect(branches).toContain('develop');
        expect(branches).toHaveLength(3);
      });
    });

    describe('getCommitsBehind', () => {
      test('should return correct count when behind', async () => {
        initializeRepo({ behind: 5 });
        const behind = await service.getCommitsBehind();
        expect(behind).toBe(5);
      });
    });

    describe('getCommitsAhead', () => {
      test('should return correct count when ahead', async () => {
        initializeRepo({ ahead: 3 });
        const ahead = await service.getCommitsAhead();
        expect(ahead).toBe(3);
      });
    });
  });

  describe('Clone Operations', () => {
    const testCredential = createTestCredential();

    describe('clone', () => {
      test('should clone repository successfully', async () => {
        await service.clone('https://github.com/org/repo.git', testCredential);
        // Clone operation completes without error - verify clone was called
        expect(mockGitInstance.clone).toHaveBeenCalled();
      });

      test('should handle network error', async () => {
        mockState.networkAvailable = false;
        mockPerformHealthCheck.mockRejectedValue(new Error('Network unreachable'));

        await expect(
          service.clone('https://github.com/org/repo.git', testCredential)
        ).rejects.toThrow();
      });
    });

    describe('initialize', () => {
      test('should clone when repository does not exist', async () => {
        fs.access.mockRejectedValue(new Error('ENOENT'));
        await service.initialize('https://github.com/org/repo.git', testCredential);
        // Verify clone was called when repo doesn't exist
        expect(mockGitInstance.clone).toHaveBeenCalled();
      });

      test('should checkout main when repository exists', async () => {
        fs.access.mockResolvedValue(undefined);
        initializeRepo({ branches: ['main', 'develop'], currentBranch: 'develop' });
        await service.initialize('https://github.com/org/repo.git', testCredential);
        expect(mockGitInstance.checkout).toHaveBeenCalledWith('main');
      });
    });
  });

  describe('Pull Operations', () => {
    beforeEach(() => {
      initializeRepo();
    });

    describe('pull', () => {
      test('should pull successfully with no conflicts', async () => {
        const result = await service.pull();
        expect(result.success).toBe(true);
        expect(result.conflicts).toHaveLength(0);
      });

      test('should return conflicts when pull has conflicts', async () => {
        mockState.conflictedFiles.add('conflict1.json');
        mockState.conflictedFiles.add('conflict2.json');
        const result = await service.pull();
        expect(result.success).toBe(false);
        expect(result.conflicts.length).toBeGreaterThan(0);
      });

      test('should handle network error during pull', async () => {
        mockCheckNetworkConnectivity.mockResolvedValue({ reachable: false, error: 'Network down' });
        await expect(service.pull()).rejects.toThrow();
      });
    });

    describe('getConflictedFiles', () => {
      test('should return empty array when no conflicts', async () => {
        const files = await service.getConflictedFiles();
        expect(files).toEqual([]);
      });

      test('should return conflicted file paths', async () => {
        mockState.conflictedFiles.add('file1.json');
        const files = await service.getConflictedFiles();
        expect(files).toContain('file1.json');
      });
    });
  });

  describe('Commit Operations', () => {
    const testAuthor = createTestAuthor();

    beforeEach(() => {
      initializeRepo();
    });

    describe('commit', () => {
      test('should commit changes with author attribution', async () => {
        mockState.modifiedFiles.add('file.json');
        const sha = await service.commit('Test commit message', testAuthor);
        expect(sha).toBeDefined();
        expect(sha.length).toBeGreaterThan(0);
      });

      test('should fail when nothing to commit', async () => {
        await expect(service.commit('Test message', testAuthor)).rejects.toThrow(/[Nn]o changes to commit/);
      });

      test('should increment ahead count after commit', async () => {
        mockState.modifiedFiles.add('file.json');
        const initialAhead = mockState.ahead;
        await service.commit('Test message', testAuthor);
        expect(mockState.ahead).toBe(initialAhead + 1);
      });
    });
  });

  describe('Push Operations', () => {
    const testCredential = createTestCredential();

    beforeEach(() => {
      initializeRepo();
    });

    describe('push', () => {
      test('should push successfully', async () => {
        mockState.ahead = 1;
        await service.push(testCredential);
        expect(mockState.ahead).toBe(0);
      });

      test('should fail when no remote URL configured', async () => {
        mockState.remoteUrl = null;
        await expect(service.push(testCredential)).rejects.toThrow(/remote/i);
      });

      test('should handle network error', async () => {
        mockState.networkAvailable = false;
        mockCheckNetworkConnectivity.mockResolvedValue({ reachable: false, error: 'Network down' });
        await expect(service.push(testCredential)).rejects.toThrow();
      });

      test('should handle push rejection', async () => {
        mockState.simulateError = {
          operation: 'push',
          error: new Error('error: failed to push some refs (non-fast-forward)'),
        };
        await expect(service.push(testCredential)).rejects.toThrow(/rejected|non-fast-forward/i);
      });
    });
  });

  describe('Branch Operations', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    describe('createBranch', () => {
      test('should create branch from current branch', async () => {
        await service.createBranch('feature/new');
        expect(mockState.branches).toContain('feature/new');
        expect(mockState.currentBranch).toBe('feature/new');
      });

      test('should create branch from specified base branch', async () => {
        await service.createBranch('feature/new', 'develop');
        expect(mockState.branches).toContain('feature/new');
      });

      test('should fail when branch already exists', async () => {
        await expect(service.createBranch('develop')).rejects.toThrow(/already exists/i);
      });

      test('should fail when base branch does not exist', async () => {
        await expect(service.createBranch('feature/new', 'nonexistent')).rejects.toThrow(/does not exist/i);
      });
    });

    describe('checkoutBranch', () => {
      test('should checkout existing branch', async () => {
        await service.checkoutBranch('develop');
        expect(mockState.currentBranch).toBe('develop');
      });

      test('should fail when branch does not exist', async () => {
        await expect(service.checkoutBranch('nonexistent')).rejects.toThrow(/does not exist/i);
      });

      test('should fail when working directory is dirty', async () => {
        mockState.modifiedFiles.add('file.json');
        await expect(service.checkoutBranch('develop')).rejects.toThrow(/uncommitted changes/i);
      });
    });

    describe('deleteBranch', () => {
      test('should delete existing branch', async () => {
        await service.deleteBranch('develop');
        expect(mockState.branches).not.toContain('develop');
      });

      test('should fail when branch does not exist', async () => {
        await expect(service.deleteBranch('nonexistent')).rejects.toThrow(/not found/i);
      });

      test('should fail when deleting current branch', async () => {
        await expect(service.deleteBranch('main')).rejects.toThrow(/checked out/i);
      });
    });

    describe('mergeBranch', () => {
      test('should merge branch successfully', async () => {
        const result = await service.mergeBranch('develop');
        expect(result.success).toBe(true);
        expect(result.conflicts).toHaveLength(0);
      });

      test('should return conflicts when merge has conflicts', async () => {
        // Simulate a merge conflict by having the merge throw CONFLICT error
        // The service will catch this and check status() for conflicted files
        mockState.simulateError = {
          operation: 'merge',
          error: new Error('CONFLICT (content): Merge conflict in file.json'),
        };
        // After merge fails, status() will return the conflicted files
        const originalStatus = mockGitInstance.status.getMockImplementation();
        let mergeAttempted = false;
        mockGitInstance.merge.mockImplementation(async () => {
          mergeAttempted = true;
          // Add conflict to state so subsequent status() calls return it
          mockState.conflictedFiles.add('conflict.json');
          throw new Error('CONFLICT (content): Merge conflict in file.json');
        });

        const result = await service.mergeBranch('develop');
        expect(result.success).toBe(false);
        expect(result.conflicts).toContain('conflict.json');
      });

      test('should fail when branch does not exist', async () => {
        await expect(service.mergeBranch('nonexistent')).rejects.toThrow(/does not exist/i);
      });

      test('should fail when working directory is dirty', async () => {
        mockState.modifiedFiles.add('file.json');
        await expect(service.mergeBranch('develop')).rejects.toThrow(/uncommitted changes/i);
      });
    });
  });

  describe('History Operations', () => {
    beforeEach(() => {
      initializeRepo();
      mockState.commits = [
        { hash: 'abc123', date: '2024-01-15', message: 'First commit', author_name: 'User', author_email: 'u@e.com' },
        { hash: 'def456', date: '2024-01-14', message: 'Initial', author_name: 'User', author_email: 'u@e.com' },
      ];
    });

    describe('getHistory', () => {
      test('should return commit history', async () => {
        const history = await service.getHistory();
        expect(history.length).toBeGreaterThan(0);
        expect(history[0]).toHaveProperty('hash');
        expect(history[0]).toHaveProperty('message');
      });

      test('should limit results with maxCount', async () => {
        const history = await service.getHistory({ maxCount: 1 });
        expect(history.length).toBe(1);
      });
    });

    describe('getDiff', () => {
      test('should return diff between branches', async () => {
        const diff = await service.getDiff('main', 'feature');
        expect(diff).toBeDefined();
        expect(typeof diff).toBe('string');
      });
    });
  });

  describe('Error Categorization', () => {
    const testCredential = createTestCredential();

    test('should categorize authentication errors', async () => {
      mockState.simulateError = {
        operation: 'clone',
        error: new Error('fatal: Authentication failed for repository'),
      };
      await expect(
        service.clone('https://github.com/org/repo.git', testCredential)
      ).rejects.toThrow(/[Aa]uthentication/);
    });

    test('should categorize network errors', async () => {
      mockPerformHealthCheck.mockRejectedValue(new Error('fatal: unable to access remote'));
      await expect(
        service.clone('https://github.com/org/repo.git', testCredential)
      ).rejects.toThrow(/unable to access/);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in commit message', async () => {
      initializeRepo();
      mockState.modifiedFiles.add('file.json');
      const message = 'Fix: "quotes" and \'apostrophes\' & special <chars>';
      const sha = await service.commit(message, createTestAuthor());
      expect(sha).toBeDefined();
    });

    test('should handle unicode in author name', async () => {
      initializeRepo();
      mockState.modifiedFiles.add('file.json');
      const author = { name: '日本語ユーザー', email: 'jp@example.com' };
      const sha = await service.commit('Test', author);
      expect(sha).toBeDefined();
    });

    test('should handle empty repository history', async () => {
      initializeRepo();
      mockState.commits = [];
      const history = await service.getHistory();
      expect(history).toEqual([]);
    });

    test('should handle very long commit messages', async () => {
      initializeRepo();
      mockState.modifiedFiles.add('file.json');
      const longMessage = 'A'.repeat(1000);
      const sha = await service.commit(longMessage, createTestAuthor());
      expect(sha).toBeDefined();
    });

    test('should handle emoji in commit message', async () => {
      initializeRepo();
      mockState.modifiedFiles.add('file.json');
      const message = '🚀 feat: add new feature with 🎉 celebration';
      const sha = await service.commit(message, createTestAuthor());
      expect(sha).toBeDefined();
    });

    test('should handle newlines in commit message', async () => {
      initializeRepo();
      mockState.modifiedFiles.add('file.json');
      const message = 'First line\n\nSecond paragraph\n- bullet point';
      const sha = await service.commit(message, createTestAuthor());
      expect(sha).toBeDefined();
    });
  });

  describe('Status Edge Cases', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle multiple modified files', async () => {
      for (let i = 0; i < 100; i++) {
        mockState.modifiedFiles.add(`file${i}.json`);
      }
      const status = await service.getStatus();
      expect(status.modified).toHaveLength(100);
      expect(status.isClean()).toBe(false);
    });

    test('should handle deeply nested file paths', async () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/file.json';
      mockState.modifiedFiles.add(deepPath);
      const status = await service.getStatus();
      expect(status.modified).toContain(deepPath);
    });

    test('should handle files with spaces in names', async () => {
      mockState.modifiedFiles.add('file with spaces.json');
      const status = await service.getStatus();
      expect(status.modified).toContain('file with spaces.json');
    });

    test('should report correct ahead/behind counts', async () => {
      mockState.ahead = 5;
      mockState.behind = 3;
      const status = await service.getStatus();
      expect(status.ahead).toBe(5);
      expect(status.behind).toBe(3);
    });

    test('should handle mixed file states', async () => {
      mockState.modifiedFiles.add('modified.json');
      mockState.stagedFiles.add('staged.json');
      mockState.untrackedFiles.add('untracked.json');
      const status = await service.getStatus();
      expect(status.isClean()).toBe(false);
      expect(status.modified).toContain('modified.json');
      expect(status.staged).toContain('staged.json');
      expect(status.not_added).toContain('untracked.json');
    });
  });

  describe('Branch Edge Cases', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop', 'feature/test'] });
    });

    test('should handle branch names with slashes', async () => {
      await service.createBranch('feature/deep/nested/branch');
      expect(mockState.branches).toContain('feature/deep/nested/branch');
    });

    test('should handle branch names with numbers', async () => {
      await service.createBranch('release/v1.2.3');
      expect(mockState.branches).toContain('release/v1.2.3');
    });

    test('should switch between multiple branches', async () => {
      await service.checkoutBranch('develop');
      expect(mockState.currentBranch).toBe('develop');
      await service.checkoutBranch('feature/test');
      expect(mockState.currentBranch).toBe('feature/test');
      await service.checkoutBranch('main');
      expect(mockState.currentBranch).toBe('main');
    });

    test('should list all branches correctly', async () => {
      const branches = await service.listBranches();
      expect(branches).toHaveLength(3);
      expect(branches).toEqual(expect.arrayContaining(['main', 'develop', 'feature/test']));
    });

    test('should handle creating branch from non-default base', async () => {
      await service.createBranch('hotfix/urgent', 'develop');
      expect(mockState.branches).toContain('hotfix/urgent');
      expect(mockState.currentBranch).toBe('hotfix/urgent');
    });

    test('should handle deleting multiple branches', async () => {
      mockState.currentBranch = 'main';
      await service.deleteBranch('develop');
      await service.deleteBranch('feature/test');
      expect(mockState.branches).not.toContain('develop');
      expect(mockState.branches).not.toContain('feature/test');
      expect(mockState.branches).toContain('main');
    });
  });

  describe('Commit Edge Cases', () => {
    const testAuthor = createTestAuthor();

    beforeEach(() => {
      initializeRepo();
    });

    test('should stage and commit modified files', async () => {
      mockState.modifiedFiles.add('file1.json');
      mockState.modifiedFiles.add('file2.json');
      await service.commit('Commit multiple files', testAuthor);
      expect(mockState.modifiedFiles.size).toBe(0);
      expect(mockState.stagedFiles.size).toBe(0);
    });

    test('should increment ahead count correctly', async () => {
      expect(mockState.ahead).toBe(0);
      mockState.modifiedFiles.add('file.json');
      await service.commit('First commit', testAuthor);
      expect(mockState.ahead).toBe(1);
      mockState.modifiedFiles.add('another.json');
      await service.commit('Second commit', testAuthor);
      expect(mockState.ahead).toBe(2);
    });

    test('should handle author with special email format', async () => {
      mockState.modifiedFiles.add('file.json');
      const author = { name: 'Bot', email: 'bot+automation@example.com' };
      const sha = await service.commit('Bot commit', author);
      expect(sha).toBeDefined();
    });

    test('should store commit in history', async () => {
      mockState.modifiedFiles.add('file.json');
      const sha = await service.commit('Test commit', testAuthor);
      expect(mockState.commits[0].hash).toBe(sha);
      expect(mockState.commits[0].message).toBe('Test commit');
    });
  });

  describe('Pull Edge Cases', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should reset behind count after successful pull', async () => {
      mockState.behind = 5;
      await service.pull();
      expect(mockState.behind).toBe(0);
    });

    test('should handle pull with specific branch', async () => {
      const result = await service.pull('develop');
      expect(result.success).toBe(true);
    });

    test('should handle multiple conflict files', async () => {
      mockState.conflictedFiles.add('file1.json');
      mockState.conflictedFiles.add('file2.json');
      mockState.conflictedFiles.add('file3.json');
      const result = await service.pull();
      expect(result.success).toBe(false);
      expect(result.conflicts.length).toBe(3);
    });
  });

  describe('Push Edge Cases', () => {
    const testCredential = createTestCredential();

    beforeEach(() => {
      initializeRepo();
    });

    test('should reset ahead count after successful push', async () => {
      mockState.ahead = 3;
      await service.push(testCredential);
      expect(mockState.ahead).toBe(0);
    });

    test('should handle push to specific branch', async () => {
      mockState.ahead = 1;
      await service.push(testCredential, 'develop');
      expect(mockState.ahead).toBe(0);
    });

    test('should handle permission error', async () => {
      mockState.simulateError = {
        operation: 'push',
        error: new Error('remote: Permission denied (protected branch)'),
      };
      await expect(service.push(testCredential)).rejects.toThrow(/[Pp]ermission/);
    });
  });

  describe('Remote URL Operations', () => {
    test('should handle HTTPS URLs', async () => {
      initializeRepo({ remoteUrl: 'https://github.com/org/repo.git' });
      const url = await service.getRemoteUrl();
      expect(url).toBe('https://github.com/org/repo.git');
    });

    test('should handle URLs without .git suffix', async () => {
      initializeRepo({ remoteUrl: 'https://github.com/org/repo' });
      const url = await service.getRemoteUrl();
      expect(url).toBe('https://github.com/org/repo');
    });

    test('should handle enterprise GitHub URLs', async () => {
      initializeRepo({ remoteUrl: 'https://github.enterprise.com/org/repo.git' });
      const url = await service.getRemoteUrl();
      expect(url).toBe('https://github.enterprise.com/org/repo.git');
    });
  });

  describe('History Operations Extended', () => {
    beforeEach(() => {
      initializeRepo();
      mockState.commits = [
        { hash: 'aaa111', date: '2024-01-15', message: 'Latest', author_name: 'User', author_email: 'u@e.com' },
        { hash: 'bbb222', date: '2024-01-14', message: 'Middle', author_name: 'User', author_email: 'u@e.com' },
        { hash: 'ccc333', date: '2024-01-13', message: 'Oldest', author_name: 'User', author_email: 'u@e.com' },
      ];
    });

    test('should return commits in order', async () => {
      const history = await service.getHistory();
      expect(history[0].message).toBe('Latest');
      expect(history[2].message).toBe('Oldest');
    });

    test('should limit history with maxCount', async () => {
      const history = await service.getHistory({ maxCount: 2 });
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Latest');
    });

    test('should include all commit properties', async () => {
      const history = await service.getHistory();
      const commit = history[0];
      expect(commit).toHaveProperty('hash');
      expect(commit).toHaveProperty('date');
      expect(commit).toHaveProperty('message');
      expect(commit).toHaveProperty('author_name');
      expect(commit).toHaveProperty('author_email');
    });
  });

  describe('Error Recovery', () => {
    const testCredential = createTestCredential();

    beforeEach(() => {
      initializeRepo();
    });

    test('should recover after transient network error', async () => {
      // First attempt fails
      mockPerformHealthCheck.mockRejectedValueOnce(new Error('Network timeout'));
      await expect(service.clone('https://github.com/org/repo.git', testCredential)).rejects.toThrow();

      // Second attempt succeeds
      mockPerformHealthCheck.mockResolvedValue(undefined);
      await service.clone('https://github.com/org/repo.git', testCredential);
      expect(mockGitInstance.clone).toHaveBeenCalled();
    });

    test('should handle status operation after error', async () => {
      mockState.simulateError = {
        operation: 'status',
        error: new Error('Temporary error'),
      };
      await expect(service.getStatus()).rejects.toThrow('Temporary error');

      // Clear error and try again
      delete mockState.simulateError;
      const status = await service.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('Concurrent State', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle rapid status checks', async () => {
      mockState.modifiedFiles.add('file.json');
      const promises = Array(10).fill(null).map(() => service.getStatus());
      const results = await Promise.all(promises);
      results.forEach(status => {
        expect(status.modified).toContain('file.json');
      });
    });

    test('should maintain branch state during parallel operations', async () => {
      mockState.branches = ['main', 'develop'];
      const listPromises = Array(5).fill(null).map(() => service.listBranches());
      const results = await Promise.all(listPromises);
      results.forEach(branches => {
        expect(branches).toContain('main');
        expect(branches).toContain('develop');
      });
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle empty author name gracefully', async () => {
      mockState.modifiedFiles.add('file.json');
      const author = { name: '', email: 'test@example.com' };
      const sha = await service.commit('Test', author);
      expect(sha).toBeDefined();
    });

    test('should handle empty commit message', async () => {
      mockState.modifiedFiles.add('file.json');
      const sha = await service.commit('', createTestAuthor());
      expect(sha).toBeDefined();
    });
  });

  describe('File Path Edge Cases', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle files with dots in name', async () => {
      mockState.modifiedFiles.add('file.test.config.json');
      const status = await service.getStatus();
      expect(status.modified).toContain('file.test.config.json');
    });

    test('should handle hidden files', async () => {
      mockState.modifiedFiles.add('.gitignore');
      mockState.modifiedFiles.add('.env.local');
      const status = await service.getStatus();
      expect(status.modified).toContain('.gitignore');
      expect(status.modified).toContain('.env.local');
    });

    test('should handle files with unicode names', async () => {
      mockState.modifiedFiles.add('文件.json');
      const status = await service.getStatus();
      expect(status.modified).toContain('文件.json');
    });
  });

  describe('Merge Edge Cases', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop', 'feature/a', 'feature/b'] });
      // Reset merge mock to default implementation
      mockGitInstance.merge.mockImplementation(async (options: string | string[]) => {
        const branchToMerge = Array.isArray(options) ? options[0] : options;
        if (!mockState.branches.includes(branchToMerge)) {
          throw new Error(`merge: ${branchToMerge} - not something we can merge`);
        }
        if (mockState.conflictedFiles.size > 0) {
          throw new Error(`CONFLICT (content): Merge conflict`);
        }
        return { files: [], conflicts: [], result: 'success' };
      });
    });

    test('should merge into current branch', async () => {
      mockState.currentBranch = 'main';
      const result = await service.mergeBranch('develop');
      expect(result.success).toBe(true);
    });

    test('should handle merging same branch twice', async () => {
      const result1 = await service.mergeBranch('develop');
      expect(result1.success).toBe(true);
      const result2 = await service.mergeBranch('develop');
      expect(result2.success).toBe(true);
    });

    test('should preserve branch after merge', async () => {
      const currentBefore = mockState.currentBranch;
      await service.mergeBranch('develop');
      expect(mockState.currentBranch).toBe(currentBefore);
    });
  });

  describe('Diff Operations', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    test('should return diff string', async () => {
      const diff = await service.getDiff('main', 'develop');
      expect(typeof diff).toBe('string');
      expect(diff.length).toBeGreaterThan(0);
    });

    test('should handle diff between same branch', async () => {
      const diff = await service.getDiff('main', 'main');
      expect(diff).toBeDefined();
    });
  });

  describe('Repository Initialization', () => {
    test('should handle initialization of existing repo', async () => {
      const testCredential = createTestCredential();
      fs.access.mockResolvedValue(undefined);
      initializeRepo();
      await service.initialize('https://github.com/org/repo.git', testCredential);
      expect(mockGitInstance.checkout).toHaveBeenCalledWith('main');
    });

    test('should handle initialization of new repo', async () => {
      const testCredential = createTestCredential();
      fs.access.mockRejectedValue(new Error('ENOENT'));
      await service.initialize('https://github.com/org/repo.git', testCredential);
      expect(mockGitInstance.clone).toHaveBeenCalled();
    });
  });

  describe('Network Connectivity', () => {
    const testCredential = createTestCredential();

    test('should check network before pull', async () => {
      initializeRepo();
      mockCheckNetworkConnectivity.mockResolvedValue({ reachable: true });
      await service.pull();
      expect(mockCheckNetworkConnectivity).toHaveBeenCalled();
    });

    test('should check network before push', async () => {
      initializeRepo();
      mockCheckNetworkConnectivity.mockResolvedValue({ reachable: true });
      await service.push(testCredential);
      expect(mockCheckNetworkConnectivity).toHaveBeenCalled();
    });

    test('should fail pull when network unreachable', async () => {
      initializeRepo();
      mockCheckNetworkConnectivity.mockResolvedValue({ reachable: false, error: 'Timeout' });
      await expect(service.pull()).rejects.toThrow();
    });

    test('should fail push when network unreachable', async () => {
      initializeRepo();
      mockCheckNetworkConnectivity.mockResolvedValue({ reachable: false, error: 'Timeout' });
      await expect(service.push(testCredential)).rejects.toThrow();
    });
  });

  describe('Health Check Integration', () => {
    const testCredential = createTestCredential();

    test('should perform health check before clone', async () => {
      await service.clone('https://github.com/org/repo.git', testCredential);
      expect(mockPerformHealthCheck).toHaveBeenCalled();
    });

    test('should fail clone if health check fails', async () => {
      mockPerformHealthCheck.mockRejectedValue(new Error('Disk space low'));
      await expect(
        service.clone('https://github.com/org/repo.git', testCredential)
      ).rejects.toThrow(/[Dd]isk/);
    });
  });

  describe('Error Message Parsing', () => {
    const testCredential = createTestCredential();

    beforeEach(() => {
      initializeRepo();
    });

    test('should handle "repository not found" error', async () => {
      mockState.simulateError = {
        operation: 'clone',
        error: new Error('fatal: repository not found'),
      };
      await expect(
        service.clone('https://github.com/org/nonexistent.git', testCredential)
      ).rejects.toThrow(/not found/);
    });

    test('should handle "permission denied" error', async () => {
      mockState.simulateError = {
        operation: 'push',
        error: new Error('remote: Permission denied'),
      };
      await expect(service.push(testCredential)).rejects.toThrow(/[Pp]ermission/);
    });

    test('should handle "timeout" error', async () => {
      mockPerformHealthCheck.mockRejectedValue(new Error('Connection timed out'));
      await expect(
        service.clone('https://github.com/org/repo.git', testCredential)
      ).rejects.toThrow(/timed out/);
    });

    test('should handle "rate limit" error', async () => {
      mockState.simulateError = {
        operation: 'pull',
        error: new Error('API rate limit exceeded'),
      };
      await expect(service.pull()).rejects.toThrow(/rate limit/);
    });

    test('should handle "SSL certificate" error', async () => {
      mockPerformHealthCheck.mockRejectedValue(new Error('SSL certificate problem'));
      await expect(
        service.clone('https://github.com/org/repo.git', testCredential)
      ).rejects.toThrow(/SSL/);
    });
  });

  describe('Credential Handling', () => {
    test('should work with GitHub personal access token', async () => {
      const credential = {
        userId: 'user',
        provider: 'github-enterprise' as const,
        credentialType: 'personal-access-token' as const,
        token: 'ghp_xxxxxxxxxxxxxxxxxxxx',
        repositoryUrl: 'https://github.com/org/repo.git',
        createdAt: new Date(),
      };
      await service.clone('https://github.com/org/repo.git', credential);
      expect(mockGitInstance.clone).toHaveBeenCalled();
    });

    test('should work with long tokens', async () => {
      const credential = {
        userId: 'user',
        provider: 'github-enterprise' as const,
        credentialType: 'personal-access-token' as const,
        token: 'A'.repeat(100),
        repositoryUrl: 'https://github.com/org/repo.git',
        createdAt: new Date(),
      };
      await service.clone('https://github.com/org/repo.git', credential);
      expect(mockGitInstance.clone).toHaveBeenCalled();
    });
  });

  describe('Branch Naming Conventions', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main'] });
    });

    test('should create feature branch', async () => {
      await service.createBranch('feature/add-login');
      expect(mockState.branches).toContain('feature/add-login');
    });

    test('should create bugfix branch', async () => {
      await service.createBranch('bugfix/fix-auth-error');
      expect(mockState.branches).toContain('bugfix/fix-auth-error');
    });

    test('should create hotfix branch', async () => {
      await service.createBranch('hotfix/security-patch');
      expect(mockState.branches).toContain('hotfix/security-patch');
    });

    test('should create release branch', async () => {
      await service.createBranch('release/v2.0.0');
      expect(mockState.branches).toContain('release/v2.0.0');
    });

    test('should handle branch with issue number', async () => {
      await service.createBranch('feature/123-add-feature');
      expect(mockState.branches).toContain('feature/123-add-feature');
    });

    test('should handle branch with hyphens', async () => {
      await service.createBranch('feature/my-long-branch-name');
      expect(mockState.branches).toContain('feature/my-long-branch-name');
    });

    test('should handle branch with underscores', async () => {
      await service.createBranch('feature/my_branch_name');
      expect(mockState.branches).toContain('feature/my_branch_name');
    });
  });

  describe('Commit Message Conventions', () => {
    const testAuthor = createTestAuthor();

    beforeEach(() => {
      initializeRepo();
    });

    test('should handle conventional commit format', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'feat: add new capability planning feature';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });

    test('should handle commit with scope', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'fix(auth): resolve login timeout issue';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });

    test('should handle breaking change marker', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'feat!: change API response format';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });

    test('should handle commit with body', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'feat: add feature\n\nThis is the commit body with more details.';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });

    test('should handle commit with footer', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'fix: resolve issue\n\nCloses #123';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });

    test('should handle co-authored commits', async () => {
      mockState.modifiedFiles.add('file.json');
      const message = 'feat: pair programming feature\n\nCo-authored-by: Partner <partner@example.com>';
      const sha = await service.commit(message, testAuthor);
      expect(sha).toBeDefined();
    });
  });

  describe('State Transitions', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    test('should track state after multiple commits', async () => {
      const author = createTestAuthor();
      expect(mockState.ahead).toBe(0);

      mockState.modifiedFiles.add('file1.json');
      await service.commit('First', author);
      expect(mockState.ahead).toBe(1);

      mockState.modifiedFiles.add('file2.json');
      await service.commit('Second', author);
      expect(mockState.ahead).toBe(2);

      mockState.modifiedFiles.add('file3.json');
      await service.commit('Third', author);
      expect(mockState.ahead).toBe(3);
    });

    test('should reset ahead after push', async () => {
      const credential = createTestCredential();
      const author = createTestAuthor();

      mockState.modifiedFiles.add('file.json');
      await service.commit('Commit', author);
      expect(mockState.ahead).toBe(1);

      await service.push(credential);
      expect(mockState.ahead).toBe(0);
    });

    test('should track branch switches', async () => {
      expect(mockState.currentBranch).toBe('main');
      await service.checkoutBranch('develop');
      expect(mockState.currentBranch).toBe('develop');
      await service.checkoutBranch('main');
      expect(mockState.currentBranch).toBe('main');
    });

    test('should maintain file state across operations', async () => {
      mockState.modifiedFiles.add('persistent.json');
      await service.getStatus();
      expect(mockState.modifiedFiles.has('persistent.json')).toBe(true);
      await service.listBranches();
      expect(mockState.modifiedFiles.has('persistent.json')).toBe(true);
    });
  });

  describe('Large Repository Scenarios', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle repository with many branches', async () => {
      for (let i = 0; i < 50; i++) {
        mockState.branches.push(`feature/branch-${i}`);
      }
      const branches = await service.listBranches();
      expect(branches).toHaveLength(51); // 50 + main
    });

    test('should handle repository with many commits', async () => {
      for (let i = 0; i < 100; i++) {
        mockState.commits.push({
          hash: `hash${i}`,
          date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
          message: `Commit ${i}`,
          author_name: 'Author',
          author_email: 'author@example.com',
        });
      }
      const history = await service.getHistory({ maxCount: 50 });
      expect(history).toHaveLength(50);
    });

    test('should handle large number of modified files', async () => {
      for (let i = 0; i < 500; i++) {
        mockState.modifiedFiles.add(`file${i}.json`);
      }
      const status = await service.getStatus();
      expect(status.modified).toHaveLength(500);
    });
  });

  describe('URL Variations', () => {
    test('should handle URL with port', async () => {
      initializeRepo({ remoteUrl: 'https://github.example.com:8443/org/repo.git' });
      const url = await service.getRemoteUrl();
      expect(url).toBe('https://github.example.com:8443/org/repo.git');
    });

    test('should handle URL with organization', async () => {
      initializeRepo({ remoteUrl: 'https://github.com/my-organization/my-repo.git' });
      const url = await service.getRemoteUrl();
      expect(url).toContain('my-organization');
    });

    test('should handle URL with subdomain', async () => {
      initializeRepo({ remoteUrl: 'https://git.internal.company.com/team/project.git' });
      const url = await service.getRemoteUrl();
      expect(url).toContain('internal.company.com');
    });
  });

  describe('Commit History Filtering', () => {
    beforeEach(() => {
      initializeRepo();
      mockState.commits = [];
      for (let i = 0; i < 30; i++) {
        mockState.commits.push({
          hash: `hash${i}`,
          date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
          message: `Commit message ${i}`,
          author_name: i % 2 === 0 ? 'Alice' : 'Bob',
          author_email: i % 2 === 0 ? 'alice@example.com' : 'bob@example.com',
        });
      }
    });

    test('should return all commits by default', async () => {
      const history = await service.getHistory();
      expect(history).toHaveLength(30);
    });

    test('should limit commits with maxCount', async () => {
      const history = await service.getHistory({ maxCount: 10 });
      expect(history).toHaveLength(10);
    });

    test('should return commits with proper structure', async () => {
      const history = await service.getHistory({ maxCount: 1 });
      expect(history[0]).toEqual(
        expect.objectContaining({
          hash: expect.any(String),
          date: expect.any(String),
          message: expect.any(String),
          author_name: expect.any(String),
          author_email: expect.any(String),
        })
      );
    });
  });

  describe('Conflict Detection', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    test('should detect single conflict', async () => {
      mockState.conflictedFiles.add('conflict.json');
      const files = await service.getConflictedFiles();
      expect(files).toHaveLength(1);
      expect(files).toContain('conflict.json');
    });

    test('should detect multiple conflicts', async () => {
      mockState.conflictedFiles.add('file1.json');
      mockState.conflictedFiles.add('file2.json');
      mockState.conflictedFiles.add('file3.json');
      const files = await service.getConflictedFiles();
      expect(files).toHaveLength(3);
    });

    test('should clear conflicts after resolution', async () => {
      mockState.conflictedFiles.add('conflict.json');
      expect((await service.getConflictedFiles()).length).toBe(1);
      mockState.conflictedFiles.clear();
      expect((await service.getConflictedFiles()).length).toBe(0);
    });
  });

  describe('Branch Lifecycle', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main'] });
    });

    test('should complete full branch lifecycle', async () => {
      // Create branch
      await service.createBranch('feature/test');
      expect(mockState.branches).toContain('feature/test');
      expect(mockState.currentBranch).toBe('feature/test');

      // Make changes and commit
      mockState.modifiedFiles.add('new-feature.json');
      await service.commit('Add feature', createTestAuthor());

      // Switch back to main
      await service.checkoutBranch('main');
      expect(mockState.currentBranch).toBe('main');

      // Merge feature branch
      const result = await service.mergeBranch('feature/test');
      expect(result.success).toBe(true);

      // Delete feature branch
      await service.deleteBranch('feature/test');
      expect(mockState.branches).not.toContain('feature/test');
    });
  });

  describe('Repository Path Handling', () => {
    test('should use provided repository path', () => {
      const customService = new GitRepositoryService('/custom/path/to/repo');
      expect(customService).toBeDefined();
    });

    test('should handle paths with spaces', () => {
      const customService = new GitRepositoryService('/path/with spaces/repo');
      expect(customService).toBeDefined();
    });

    test('should handle Windows-style paths', () => {
      const customService = new GitRepositoryService('C:\\Users\\name\\repo');
      expect(customService).toBeDefined();
    });
  });

  describe('Multiple Author Scenarios', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle different authors in sequence', async () => {
      const author1 = { name: 'Alice', email: 'alice@example.com' };
      const author2 = { name: 'Bob', email: 'bob@example.com' };

      mockState.modifiedFiles.add('file1.json');
      await service.commit('Alice commit', author1);

      mockState.modifiedFiles.add('file2.json');
      await service.commit('Bob commit', author2);

      expect(mockState.commits).toHaveLength(2);
    });

    test('should preserve author in commit history', async () => {
      const author = { name: 'Test Author', email: 'test@example.com' };
      mockState.modifiedFiles.add('file.json');
      await service.commit('Test commit', author);

      expect(mockState.commits[0].author_name).toBe('Test Author');
      expect(mockState.commits[0].author_email).toBe('test@example.com');
    });
  });

  describe('Detached HEAD State', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should report current branch normally', async () => {
      const branch = await service.getCurrentBranch();
      expect(branch).toBe('main');
    });

    test('should handle missing current branch', async () => {
      mockState.currentBranch = '';
      const branch = await service.getCurrentBranch();
      expect(branch).toBe('main'); // Fallback to main
    });
  });

  describe('Staging Operations', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should stage modified files before commit', async () => {
      mockState.modifiedFiles.add('file.json');
      expect(mockState.stagedFiles.size).toBe(0);

      await service.commit('Commit', createTestAuthor());

      expect(mockState.modifiedFiles.size).toBe(0);
      expect(mockState.stagedFiles.size).toBe(0); // Cleared after commit
    });

    test('should handle mix of staged and modified files', async () => {
      mockState.modifiedFiles.add('modified.json');
      mockState.stagedFiles.add('staged.json');

      const status = await service.getStatus();
      expect(status.modified).toContain('modified.json');
      expect(status.staged).toContain('staged.json');
    });
  });

  describe('Remote Operations Extended', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should track remote origin', async () => {
      const url = await service.getRemoteUrl();
      expect(url).toBe('https://github.com/org/repo.git');
    });

    test('should handle missing remote gracefully', async () => {
      mockState.remoteUrl = null;
      const url = await service.getRemoteUrl();
      expect(url).toBeNull();
    });
  });

  describe('Clean vs Dirty State', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should identify clean state', async () => {
      const isClean = await service.isClean();
      expect(isClean).toBe(true);
    });

    test('should identify dirty state with modified files', async () => {
      mockState.modifiedFiles.add('file.json');
      const isClean = await service.isClean();
      expect(isClean).toBe(false);
    });

    test('should identify dirty state with staged files', async () => {
      mockState.stagedFiles.add('file.json');
      const isClean = await service.isClean();
      expect(isClean).toBe(false);
    });

    test('should identify dirty state with untracked files', async () => {
      mockState.untrackedFiles.add('new-file.json');
      const isClean = await service.isClean();
      expect(isClean).toBe(false);
    });

    test('should identify dirty state with conflicted files', async () => {
      mockState.conflictedFiles.add('conflict.json');
      const isClean = await service.isClean();
      expect(isClean).toBe(false);
    });
  });

  describe('Branch Count and Limits', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle single branch', async () => {
      const branches = await service.listBranches();
      expect(branches).toHaveLength(1);
      expect(branches).toContain('main');
    });

    test('should handle two branches', async () => {
      mockState.branches.push('develop');
      const branches = await service.listBranches();
      expect(branches).toHaveLength(2);
    });

    test('should handle many branches', async () => {
      for (let i = 0; i < 100; i++) {
        mockState.branches.push(`branch-${i}`);
      }
      const branches = await service.listBranches();
      expect(branches).toHaveLength(101);
    });
  });

  describe('Ahead/Behind Tracking', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should start with zero ahead', async () => {
      const ahead = await service.getCommitsAhead();
      expect(ahead).toBe(0);
    });

    test('should start with zero behind', async () => {
      const behind = await service.getCommitsBehind();
      expect(behind).toBe(0);
    });

    test('should track ahead after commit', async () => {
      mockState.modifiedFiles.add('file.json');
      await service.commit('Commit', createTestAuthor());
      const ahead = await service.getCommitsAhead();
      expect(ahead).toBe(1);
    });

    test('should handle being behind', async () => {
      mockState.behind = 10;
      const behind = await service.getCommitsBehind();
      expect(behind).toBe(10);
    });

    test('should handle being both ahead and behind', async () => {
      mockState.ahead = 3;
      mockState.behind = 5;
      const ahead = await service.getCommitsAhead();
      const behind = await service.getCommitsBehind();
      expect(ahead).toBe(3);
      expect(behind).toBe(5);
    });
  });

  describe('Error State Reset', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should continue after status error', async () => {
      mockState.simulateError = { operation: 'status', error: new Error('Temp') };
      await expect(service.getStatus()).rejects.toThrow();

      delete mockState.simulateError;
      const status = await service.getStatus();
      expect(status).toBeDefined();
    });

    test('should continue after branch error', async () => {
      mockState.simulateError = { operation: 'branch', error: new Error('Temp') };
      await expect(service.listBranches()).rejects.toThrow();

      delete mockState.simulateError;
      const branches = await service.listBranches();
      expect(branches).toBeDefined();
    });
  });

  describe('File Type Handling', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle JSON files', async () => {
      mockState.modifiedFiles.add('data.json');
      const status = await service.getStatus();
      expect(status.modified).toContain('data.json');
    });

    test('should handle TypeScript files', async () => {
      mockState.modifiedFiles.add('component.tsx');
      const status = await service.getStatus();
      expect(status.modified).toContain('component.tsx');
    });

    test('should handle configuration files', async () => {
      mockState.modifiedFiles.add('tsconfig.json');
      mockState.modifiedFiles.add('package.json');
      const status = await service.getStatus();
      expect(status.modified).toContain('tsconfig.json');
      expect(status.modified).toContain('package.json');
    });

    test('should handle binary-like extensions', async () => {
      mockState.modifiedFiles.add('image.png');
      mockState.modifiedFiles.add('document.pdf');
      const status = await service.getStatus();
      expect(status.modified).toContain('image.png');
      expect(status.modified).toContain('document.pdf');
    });
  });

  describe('Sequential Operations', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    test('should handle create-commit-push sequence', async () => {
      const credential = createTestCredential();
      const author = createTestAuthor();

      await service.createBranch('feature/new');
      mockState.modifiedFiles.add('feature.json');
      await service.commit('Add feature', author);
      await service.push(credential);

      expect(mockState.currentBranch).toBe('feature/new');
      expect(mockState.ahead).toBe(0);
    });

    test('should handle checkout-modify-commit sequence', async () => {
      const author = createTestAuthor();

      await service.checkoutBranch('develop');
      mockState.modifiedFiles.add('update.json');
      await service.commit('Update develop', author);

      expect(mockState.currentBranch).toBe('develop');
      expect(mockState.commits[0].message).toBe('Update develop');
    });
  });

  describe('Boundary Conditions', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle zero commits in history', async () => {
      mockState.commits = [];
      const history = await service.getHistory();
      expect(history).toEqual([]);
    });

    test('should handle maxCount of one', async () => {
      mockState.commits = [
        { hash: 'a', date: '2024-01-01', message: 'First', author_name: 'a', author_email: 'a@e.com' },
        { hash: 'b', date: '2024-01-02', message: 'Second', author_name: 'a', author_email: 'a@e.com' },
      ];
      const history = await service.getHistory({ maxCount: 1 });
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('First');
    });

    test('should handle maxCount greater than commits', async () => {
      mockState.commits = [
        { hash: 'a', date: '2024-01-01', message: 'msg', author_name: 'a', author_email: 'a@e.com' },
      ];
      const history = await service.getHistory({ maxCount: 100 });
      expect(history).toHaveLength(1);
    });
  });

  describe('Concurrency Safety', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should handle parallel getStatus calls', async () => {
      mockState.modifiedFiles.add('file.json');
      const results = await Promise.all([
        service.getStatus(),
        service.getStatus(),
        service.getStatus(),
      ]);
      results.forEach((status) => {
        expect(status.modified).toContain('file.json');
      });
    });

    test('should handle parallel getCurrentBranch calls', async () => {
      const results = await Promise.all([
        service.getCurrentBranch(),
        service.getCurrentBranch(),
        service.getCurrentBranch(),
      ]);
      results.forEach((branch) => {
        expect(branch).toBe('main');
      });
    });

    test('should handle parallel isClean calls', async () => {
      const results = await Promise.all([
        service.isClean(),
        service.isClean(),
        service.isClean(),
      ]);
      results.forEach((isClean) => {
        expect(isClean).toBe(true);
      });
    });
  });

  describe('Special Branch Names', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should create branch with dots', async () => {
      await service.createBranch('release/1.0.0');
      expect(mockState.branches).toContain('release/1.0.0');
    });

    test('should create branch with @ symbol', async () => {
      await service.createBranch('user@feature');
      expect(mockState.branches).toContain('user@feature');
    });

    test('should create branch with plus sign', async () => {
      await service.createBranch('feature+enhancement');
      expect(mockState.branches).toContain('feature+enhancement');
    });

    test('should create branch starting with number', async () => {
      await service.createBranch('123-fix-issue');
      expect(mockState.branches).toContain('123-fix-issue');
    });
  });

  describe('Commit SHA Handling', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should return SHA after commit', async () => {
      mockState.modifiedFiles.add('file.json');
      const sha = await service.commit('Test', createTestAuthor());
      expect(sha).toMatch(/^[a-f0-9]+$/);
    });

    test('should return unique SHA for each commit', async () => {
      mockState.modifiedFiles.add('file1.json');
      const sha1 = await service.commit('First', createTestAuthor());

      mockState.modifiedFiles.add('file2.json');
      const sha2 = await service.commit('Second', createTestAuthor());

      expect(sha1).not.toBe(sha2);
    });

    test('should store SHA in commit history', async () => {
      mockState.modifiedFiles.add('file.json');
      const sha = await service.commit('Test', createTestAuthor());
      expect(mockState.commits[0].hash).toBe(sha);
    });
  });

  describe('Pull Result Structure', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should return proper structure on success', async () => {
      const result = await service.pull();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('filesChanged');
      expect(result).toHaveProperty('conflicts');
      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    test('should return proper structure on conflict', async () => {
      mockState.conflictedFiles.add('conflict.json');
      const result = await service.pull();
      expect(result).toHaveProperty('success', false);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Merge Result Structure', () => {
    beforeEach(() => {
      initializeRepo({ branches: ['main', 'develop'] });
    });

    test('should return proper structure on success', async () => {
      const result = await service.mergeBranch('develop');
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('conflicts');
      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });

  describe('Status Result Structure', () => {
    beforeEach(() => {
      initializeRepo();
    });

    test('should have isClean method', async () => {
      const status = await service.getStatus();
      expect(typeof status.isClean).toBe('function');
    });

    test('should have current branch', async () => {
      const status = await service.getStatus();
      expect(status.current).toBe('main');
    });

    test('should have tracking information', async () => {
      const status = await service.getStatus();
      expect(status.tracking).toBeDefined();
    });

    test('should have ahead/behind counts', async () => {
      mockState.ahead = 2;
      mockState.behind = 1;
      const status = await service.getStatus();
      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle full workflow: init, modify, commit, push', async () => {
      const credential = createTestCredential();
      const author = createTestAuthor();

      // Initialize
      fs.access.mockRejectedValue(new Error('ENOENT'));
      await service.initialize('https://github.com/org/repo.git', credential);

      // Modify and commit
      mockState.modifiedFiles.add('feature.json');
      const sha = await service.commit('Add feature', author);
      expect(sha).toBeDefined();

      // Push
      initializeRepo(); // Re-init for push to work with remote URL
      await service.push(credential);
      expect(mockState.ahead).toBe(0);
    });

    test('should handle branch workflow: create, modify, merge', async () => {
      initializeRepo({ branches: ['main'] });
      const author = createTestAuthor();

      // Create feature branch
      await service.createBranch('feature/new');
      expect(mockState.currentBranch).toBe('feature/new');

      // Commit on feature branch
      mockState.modifiedFiles.add('feature.json');
      await service.commit('Implement feature', author);

      // Switch to main and merge
      await service.checkoutBranch('main');
      const result = await service.mergeBranch('feature/new');
      expect(result.success).toBe(true);
    });
  });
});

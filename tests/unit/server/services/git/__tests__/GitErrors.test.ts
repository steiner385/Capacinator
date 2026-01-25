/**
 * GitErrors Unit Tests
 * Feature: 001-git-sync-integration
 * Issue: #106 - Git Sync Unit Tests - Tier 2 Validation & Safety
 *
 * Tests for GitErrors covering:
 * - Error class properties (code, userMessage, recoverable)
 * - Error categorization (categorizeGitError)
 * - User-friendly message generation
 *
 * Coverage target: 100% statements, 100% branches
 */

import { describe, test, expect } from '@jest/globals';
import {
  GitError,
  GitNetworkError,
  GitAuthenticationError,
  GitPermissionError,
  GitConflictError,
  GitRepositoryStateError,
  GitDiskSpaceError,
  GitBranchError,
  GitCloneError,
  GitPushError,
  categorizeGitError,
} from '../../../../../../src/server/services/git/GitErrors.js';

// ===========================================
// Error Class Tests
// ===========================================

describe('GitErrors', () => {
  describe('GitError (Base Class)', () => {
    test('has code, userMessage, recoverable properties', () => {
      const error = new GitError(
        'Internal error message',
        'TEST_CODE',
        'User-friendly message',
        true
      );

      expect(error.code).toBe('TEST_CODE');
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.recoverable).toBe(true);
      expect(error.message).toBe('Internal error message');
      expect(error.name).toBe('GitError');
    });

    test('defaults recoverable to true', () => {
      const error = new GitError(
        'Internal error message',
        'TEST_CODE',
        'User-friendly message'
      );

      expect(error.recoverable).toBe(true);
    });
  });

  describe('GitNetworkError', () => {
    test('sets correct code, userMessage, recoverable=true', () => {
      const originalError = new Error('Connection failed');
      const error = new GitNetworkError('Network error occurred', originalError);

      expect(error.code).toBe('GIT_NETWORK_ERROR');
      expect(error.userMessage).toContain('Cannot connect to GitHub Enterprise');
      expect(error.recoverable).toBe(true);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('GitNetworkError');
    });

    test('works without originalError', () => {
      const error = new GitNetworkError('Network error occurred');

      expect(error.code).toBe('GIT_NETWORK_ERROR');
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('GitAuthenticationError', () => {
    test('sets correct code, userMessage, recoverable=true', () => {
      const originalError = new Error('401 Unauthorized');
      const error = new GitAuthenticationError('Auth failed', originalError);

      expect(error.code).toBe('GIT_AUTH_ERROR');
      expect(error.userMessage).toContain('Authentication failed');
      expect(error.userMessage).toContain('token');
      expect(error.recoverable).toBe(true);
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('GitAuthenticationError');
    });
  });

  describe('GitPermissionError', () => {
    test('sets correct code, userMessage, recoverable=false', () => {
      const error = new GitPermissionError('Permission denied', 'push to main');

      expect(error.code).toBe('GIT_PERMISSION_ERROR');
      expect(error.userMessage).toContain("don't have permission");
      expect(error.userMessage).toContain('push to main');
      expect(error.recoverable).toBe(false);
      expect(error.operation).toBe('push to main');
      expect(error.name).toBe('GitPermissionError');
    });
  });

  describe('GitConflictError', () => {
    test('includes conflictedFiles and operation', () => {
      const conflictedFiles = ['file1.json', 'file2.json'];
      const error = new GitConflictError('Merge conflict', conflictedFiles, 'pull');

      expect(error.code).toBe('GIT_CONFLICT_ERROR');
      expect(error.userMessage).toContain('Pull');
      expect(error.userMessage).toContain('2 conflicts');
      expect(error.conflictedFiles).toEqual(conflictedFiles);
      expect(error.operation).toBe('pull');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('GitConflictError');
    });

    test('handles single conflict file', () => {
      const error = new GitConflictError('Merge conflict', ['single.json'], 'merge');

      expect(error.userMessage).toContain('Merge');
      expect(error.userMessage).toContain('1 conflict');
      // The message uses "1 conflict" (singular count) but may say "resolve the conflicts"
      expect(error.userMessage).toMatch(/1 conflict[^s]/); // "1 conflict" not "1 conflicts"
    });

    test('handles empty conflictedFiles', () => {
      const error = new GitConflictError('Merge conflict', [], 'pull');

      expect(error.userMessage).toContain('0 conflicts');
    });
  });

  describe('GitRepositoryStateError', () => {
    test('includes state', () => {
      const error = new GitRepositoryStateError('Invalid state', 'detached HEAD');

      expect(error.code).toBe('GIT_REPO_STATE_ERROR');
      expect(error.userMessage).toContain('invalid state');
      expect(error.userMessage).toContain('detached HEAD');
      expect(error.state).toBe('detached HEAD');
      expect(error.recoverable).toBe(false);
      expect(error.name).toBe('GitRepositoryStateError');
    });
  });

  describe('GitDiskSpaceError', () => {
    test('includes requiredMB and availableMB', () => {
      const error = new GitDiskSpaceError('Not enough space', 500, 100);

      expect(error.code).toBe('GIT_DISK_SPACE_ERROR');
      expect(error.userMessage).toContain('Insufficient disk space');
      expect(error.userMessage).toContain('500MB');
      expect(error.userMessage).toContain('100MB');
      expect(error.requiredMB).toBe(500);
      expect(error.availableMB).toBe(100);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('GitDiskSpaceError');
    });
  });

  describe('GitBranchError', () => {
    test('includes branchName and reason', () => {
      const error = new GitBranchError('Branch error', 'feature/test', 'already exists');

      expect(error.code).toBe('GIT_BRANCH_ERROR');
      expect(error.userMessage).toContain('feature/test');
      expect(error.userMessage).toContain('already exists');
      expect(error.branchName).toBe('feature/test');
      expect(error.reason).toBe('already exists');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('GitBranchError');
    });
  });

  describe('GitCloneError', () => {
    test('includes repositoryUrl', () => {
      const originalError = new Error('Clone failed');
      const error = new GitCloneError('Clone error', 'https://github.com/org/repo.git', originalError);

      expect(error.code).toBe('GIT_CLONE_ERROR');
      expect(error.userMessage).toContain('Failed to clone');
      expect(error.repositoryUrl).toBe('https://github.com/org/repo.git');
      expect(error.originalError).toBe(originalError);
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('GitCloneError');
    });
  });

  describe('GitPushError', () => {
    test('includes reason', () => {
      const error = new GitPushError('Push failed', 'Remote has new commits');

      expect(error.code).toBe('GIT_PUSH_ERROR');
      expect(error.userMessage).toContain('Push failed');
      expect(error.userMessage).toContain('Remote has new commits');
      expect(error.reason).toBe('Remote has new commits');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('GitPushError');
    });
  });

  // ===========================================
  // categorizeGitError Tests
  // ===========================================

  describe('categorizeGitError', () => {
    describe('Network Errors', () => {
      test('identifies ENOTFOUND as GitNetworkError', () => {
        const error = new Error('getaddrinfo ENOTFOUND github.com');
        const result = categorizeGitError(error, 'clone');

        expect(result).toBeInstanceOf(GitNetworkError);
        expect(result.code).toBe('GIT_NETWORK_ERROR');
      });

      test('identifies ECONNREFUSED as GitNetworkError', () => {
        const error = new Error('connect ECONNREFUSED 192.168.1.1:443');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitNetworkError);
      });

      test('identifies ETIMEDOUT as GitNetworkError', () => {
        const error = new Error('connect ETIMEDOUT 10.0.0.1:22');
        const result = categorizeGitError(error, 'fetch');

        expect(result).toBeInstanceOf(GitNetworkError);
      });

      test('identifies getaddrinfo as GitNetworkError', () => {
        const error = new Error('getaddrinfo failed for hostname');
        const result = categorizeGitError(error, 'clone');

        expect(result).toBeInstanceOf(GitNetworkError);
      });

      test('identifies "could not resolve host" as GitNetworkError', () => {
        const error = new Error('fatal: could not resolve host: github.example.com');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitNetworkError);
      });
    });

    describe('Authentication Errors', () => {
      test('identifies "authentication failed" as GitAuthenticationError', () => {
        const error = new Error('fatal: Authentication failed for repo');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitAuthenticationError);
        expect(result.code).toBe('GIT_AUTH_ERROR');
      });

      test('identifies "invalid credentials" as GitAuthenticationError', () => {
        const error = new Error('remote: Invalid credentials');
        const result = categorizeGitError(error, 'fetch');

        expect(result).toBeInstanceOf(GitAuthenticationError);
      });

      test('identifies "could not read username" as GitAuthenticationError', () => {
        const error = new Error('fatal: could not read Username for origin');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitAuthenticationError);
      });

      test('identifies "401" as GitAuthenticationError', () => {
        const error = new Error('The requested URL returned error: 401');
        const result = categorizeGitError(error, 'clone');

        expect(result).toBeInstanceOf(GitAuthenticationError);
      });

      test('identifies "403 forbidden" as GitAuthenticationError', () => {
        const error = new Error('Server returned 403 Forbidden');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitAuthenticationError);
      });

      test('identifies "bad credentials" as GitAuthenticationError', () => {
        const error = new Error('remote: Bad credentials');
        const result = categorizeGitError(error, 'fetch');

        expect(result).toBeInstanceOf(GitAuthenticationError);
      });
    });

    describe('Permission Errors', () => {
      test('identifies "permission denied" as GitPermissionError', () => {
        const error = new Error('fatal: Permission denied (publickey)');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPermissionError);
        expect(result.code).toBe('GIT_PERMISSION_ERROR');
      });

      test('identifies "insufficient permission" as GitPermissionError', () => {
        const error = new Error('remote: Insufficient permission for adding');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPermissionError);
      });

      test('identifies "protected branch" as GitPermissionError', () => {
        const error = new Error('remote: Protected branch hook declined push');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPermissionError);
      });

      test('identifies "you are not allowed" as GitPermissionError', () => {
        const error = new Error('remote: You are not allowed to push');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPermissionError);
      });
    });

    describe('Conflict Errors', () => {
      test('identifies "conflict" as GitConflictError', () => {
        const error = new Error('CONFLICT (content): Merge conflict in file.json');
        const result = categorizeGitError(error, 'merge');

        expect(result).toBeInstanceOf(GitConflictError);
        expect(result.code).toBe('GIT_CONFLICT_ERROR');
      });
    });

    describe('Branch Errors', () => {
      test('identifies "branch already exists" as GitBranchError', () => {
        const error = new Error("fatal: A branch named 'feature' already exists");
        const result = categorizeGitError(error, 'checkout');

        expect(result).toBeInstanceOf(GitBranchError);
        expect(result.code).toBe('GIT_BRANCH_ERROR');
      });

      test('identifies "branch not found" as GitBranchError', () => {
        const error = new Error("error: pathspec 'branch' did not match, branch not found");
        const result = categorizeGitError(error, 'checkout');

        expect(result).toBeInstanceOf(GitBranchError);
      });

      test('identifies "branch does not exist" as GitBranchError', () => {
        const error = new Error("error: branch 'feature' does not exist");
        const result = categorizeGitError(error, 'delete');

        expect(result).toBeInstanceOf(GitBranchError);
      });
    });

    describe('Push Errors', () => {
      test('identifies "non-fast-forward" as GitPushError', () => {
        const error = new Error('! [rejected] main -> main (non-fast-forward)');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPushError);
        expect(result.code).toBe('GIT_PUSH_ERROR');
      });

      test('identifies "rejected" as GitPushError', () => {
        const error = new Error('! [rejected] feature -> feature (fetch first)');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitPushError);
      });
    });

    describe('Clone Errors', () => {
      test('identifies "repository not found" as GitCloneError', () => {
        const error = new Error('remote: Repository not found');
        const result = categorizeGitError(error, 'clone');

        expect(result).toBeInstanceOf(GitCloneError);
        expect(result.code).toBe('GIT_CLONE_ERROR');
      });

      test('identifies "clone" keyword as GitCloneError', () => {
        const error = new Error('fatal: clone of repository failed');
        const result = categorizeGitError(error, 'clone');

        expect(result).toBeInstanceOf(GitCloneError);
      });
    });

    describe('Fallback and Edge Cases', () => {
      test('returns generic GitError for unknown error patterns', () => {
        const error = new Error('Some unknown git error');
        const result = categorizeGitError(error, 'unknown-operation');

        expect(result).toBeInstanceOf(GitError);
        expect(result.code).toBe('GIT_UNKNOWN_ERROR');
        expect(result.recoverable).toBe(true);
      });

      test('is case-insensitive (ENOTFOUND vs enotfound)', () => {
        const errorUpper = new Error('ENOTFOUND');
        const errorLower = new Error('enotfound');

        const resultUpper = categorizeGitError(errorUpper, 'clone');
        const resultLower = categorizeGitError(errorLower, 'clone');

        expect(resultUpper).toBeInstanceOf(GitNetworkError);
        expect(resultLower).toBeInstanceOf(GitNetworkError);
      });

      test('handles empty error message', () => {
        const error = new Error('');
        const result = categorizeGitError(error, 'push');

        expect(result).toBeInstanceOf(GitError);
        expect(result.code).toBe('GIT_UNKNOWN_ERROR');
      });

      test('preserves original error message', () => {
        const originalMessage = 'getaddrinfo ENOTFOUND github.com github.com:443';
        const error = new Error(originalMessage);
        const result = categorizeGitError(error, 'clone');

        expect(result.message).toBe(originalMessage);
      });

      test('includes operation in error context', () => {
        const error = new Error('Some unknown error');
        const result = categorizeGitError(error, 'fetch');

        expect(result.userMessage).toContain('fetch');
      });
    });

    describe('User Message Quality', () => {
      test('user messages are human-readable (no technical jargon)', () => {
        const networkError = new GitNetworkError('ENOTFOUND error');
        const authError = new GitAuthenticationError('401 Unauthorized');
        const permError = new GitPermissionError('Permission denied', 'push');
        const diskError = new GitDiskSpaceError('No space', 500, 100);

        // Should contain helpful guidance, not just technical details
        expect(networkError.userMessage).toContain('check your internet connection');
        expect(authError.userMessage).toContain('update your credentials');
        expect(permError.userMessage).toContain('contact');
        expect(diskError.userMessage).toContain('free up disk space');

        // Should NOT contain raw technical codes in user messages
        expect(networkError.userMessage).not.toMatch(/ENOTFOUND|ECONNREFUSED|ETIMEDOUT/);
      });

      test('network error message suggests retry', () => {
        const error = new GitNetworkError('Connection failed');
        expect(error.userMessage).toContain('try again');
      });

      test('auth error message mentions credentials or token', () => {
        const error = new GitAuthenticationError('Auth failed');
        expect(error.userMessage.toLowerCase()).toMatch(/token|credentials/);
      });

      test('permission error message mentions administrator', () => {
        const error = new GitPermissionError('Access denied', 'write');
        expect(error.userMessage).toContain('administrator');
      });
    });
  });
});

/**
 * Custom Jest matchers for Git sync testing
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides domain-specific matchers for more readable Git sync tests.
 */

import type { Conflict, SyncOperation, PullResult } from '../../shared/types/git-entities.js';
import type { MockGitState } from '../__mocks__/simple-git.js';

/**
 * Type declarations for custom matchers
 * eslint-disable-next-line @typescript-eslint/no-namespace - Jest matcher augmentation requires namespace
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      // Repository state matchers
      toBeInSync(): R;
      toBeBehindRemote(commits?: number): R;
      toBeAheadOfRemote(commits?: number): R;
      toHaveUncommittedChanges(): R;
      toBeOnBranch(branchName: string): R;
      toHaveBranch(branchName: string): R;
      toBeClean(): R;

      // Conflict matchers
      toHaveConflict(): R;
      toHaveConflictOnField(field: string): R;
      toHaveConflictsCount(count: number): R;
      toBeResolvedConflict(): R;
      toBePendingConflict(): R;

      // Sync operation matchers
      toBeSuccessfulSync(): R;
      toBeFailedSync(): R;
      toBeConflictSync(): R;
      toHaveSyncError(errorPattern?: string | RegExp): R;

      // Pull result matchers
      toBeSuccessfulPull(): R;
      toHaveFilesChanged(count?: number): R;

      // Data validation matchers
      toBeValidScenarioExport(): R;
      toHaveValidSchemaVersion(): R;
      toContainEntity(entityType: string, entityId: string): R;
    }
  }
}

/**
 * Repository state matchers
 */
const repositoryMatchers = {
  /**
   * Check if repository is in sync (not ahead or behind)
   */
  toBeInSync(received: MockGitState) {
    const pass = received.ahead === 0 && received.behind === 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected repository not to be in sync, but it is (ahead: ${received.ahead}, behind: ${received.behind})`
          : `Expected repository to be in sync, but it is ahead by ${received.ahead} and behind by ${received.behind}`,
    };
  },

  /**
   * Check if repository is behind remote
   */
  toBeBehindRemote(received: MockGitState, commits?: number) {
    const isBehind = received.behind > 0;
    const matchesCount = commits === undefined || received.behind === commits;
    const pass = isBehind && matchesCount;

    return {
      pass,
      message: () => {
        if (!isBehind) {
          return `Expected repository to be behind remote, but it is not (behind: ${received.behind})`;
        }
        if (!matchesCount) {
          return `Expected repository to be ${commits} commits behind, but it is ${received.behind} commits behind`;
        }
        return `Expected repository not to be behind remote, but it is ${received.behind} commits behind`;
      },
    };
  },

  /**
   * Check if repository is ahead of remote
   */
  toBeAheadOfRemote(received: MockGitState, commits?: number) {
    const isAhead = received.ahead > 0;
    const matchesCount = commits === undefined || received.ahead === commits;
    const pass = isAhead && matchesCount;

    return {
      pass,
      message: () => {
        if (!isAhead) {
          return `Expected repository to be ahead of remote, but it is not (ahead: ${received.ahead})`;
        }
        if (!matchesCount) {
          return `Expected repository to be ${commits} commits ahead, but it is ${received.ahead} commits ahead`;
        }
        return `Expected repository not to be ahead of remote, but it is ${received.ahead} commits ahead`;
      },
    };
  },

  /**
   * Check if repository has uncommitted changes
   */
  toHaveUncommittedChanges(received: MockGitState) {
    const hasChanges =
      received.modifiedFiles.size > 0 ||
      received.stagedFiles.size > 0 ||
      received.untrackedFiles.size > 0;

    return {
      pass: hasChanges,
      message: () =>
        hasChanges
          ? `Expected repository to have no uncommitted changes, but found: modified(${received.modifiedFiles.size}), staged(${received.stagedFiles.size}), untracked(${received.untrackedFiles.size})`
          : `Expected repository to have uncommitted changes, but it is clean`,
    };
  },

  /**
   * Check current branch
   */
  toBeOnBranch(received: MockGitState, branchName: string) {
    const pass = received.currentBranch === branchName;
    return {
      pass,
      message: () =>
        pass
          ? `Expected repository not to be on branch "${branchName}"`
          : `Expected repository to be on branch "${branchName}", but it is on "${received.currentBranch}"`,
    };
  },

  /**
   * Check if branch exists
   */
  toHaveBranch(received: MockGitState, branchName: string) {
    const pass = received.branches.includes(branchName);
    return {
      pass,
      message: () =>
        pass
          ? `Expected repository not to have branch "${branchName}"`
          : `Expected repository to have branch "${branchName}", but branches are: ${received.branches.join(', ')}`,
    };
  },

  /**
   * Check if repository is clean
   */
  toBeClean(received: MockGitState) {
    const isClean =
      received.modifiedFiles.size === 0 &&
      received.stagedFiles.size === 0 &&
      received.untrackedFiles.size === 0 &&
      received.conflictedFiles.size === 0;

    return {
      pass: isClean,
      message: () =>
        isClean
          ? `Expected repository not to be clean`
          : `Expected repository to be clean, but has: modified(${received.modifiedFiles.size}), staged(${received.stagedFiles.size}), untracked(${received.untrackedFiles.size}), conflicted(${received.conflictedFiles.size})`,
    };
  },
};

/**
 * Conflict matchers
 */
const conflictMatchers = {
  /**
   * Check if state has conflicts
   */
  toHaveConflict(received: MockGitState | Conflict[] | PullResult) {
    let hasConflict: boolean;
    let conflictInfo: string;

    if (Array.isArray(received)) {
      hasConflict = received.length > 0;
      conflictInfo = `${received.length} conflicts`;
    } else if ('conflictedFiles' in received) {
      // MockGitState
      hasConflict = received.conflictedFiles.size > 0;
      conflictInfo = `files: ${Array.from(received.conflictedFiles).join(', ')}`;
    } else {
      // PullResult
      hasConflict = received.conflicts && received.conflicts.length > 0;
      conflictInfo = `${received.conflicts?.length || 0} conflicts`;
    }

    return {
      pass: hasConflict,
      message: () =>
        hasConflict
          ? `Expected no conflicts, but found: ${conflictInfo}`
          : `Expected conflicts, but none found`,
    };
  },

  /**
   * Check if conflict is on specific field
   */
  toHaveConflictOnField(received: Conflict | Conflict[], field: string) {
    const conflicts = Array.isArray(received) ? received : [received];
    const hasFieldConflict = conflicts.some((c) => c.field === field);

    return {
      pass: hasFieldConflict,
      message: () =>
        hasFieldConflict
          ? `Expected no conflict on field "${field}"`
          : `Expected conflict on field "${field}", but conflicts are on: ${conflicts.map((c) => c.field).join(', ')}`,
    };
  },

  /**
   * Check conflict count
   */
  toHaveConflictsCount(received: Conflict[] | MockGitState | PullResult, count: number) {
    let actualCount: number;

    if (Array.isArray(received)) {
      actualCount = received.length;
    } else if ('conflictedFiles' in received) {
      actualCount = received.conflictedFiles.size;
    } else {
      actualCount = received.conflicts?.length || 0;
    }

    const pass = actualCount === count;
    return {
      pass,
      message: () =>
        pass
          ? `Expected not to have ${count} conflicts`
          : `Expected ${count} conflicts, but found ${actualCount}`,
    };
  },

  /**
   * Check if conflict is resolved
   */
  toBeResolvedConflict(received: Conflict) {
    const pass = received.resolutionStatus === 'resolved';
    return {
      pass,
      message: () =>
        pass
          ? `Expected conflict not to be resolved`
          : `Expected conflict to be resolved, but status is "${received.resolutionStatus}"`,
    };
  },

  /**
   * Check if conflict is pending
   */
  toBePendingConflict(received: Conflict) {
    const pass = received.resolutionStatus === 'pending';
    return {
      pass,
      message: () =>
        pass
          ? `Expected conflict not to be pending`
          : `Expected conflict to be pending, but status is "${received.resolutionStatus}"`,
    };
  },
};

/**
 * Sync operation matchers
 */
const syncOperationMatchers = {
  /**
   * Check if sync was successful
   */
  toBeSuccessfulSync(received: SyncOperation) {
    const pass = received.status === 'completed';
    return {
      pass,
      message: () =>
        pass
          ? `Expected sync not to be successful`
          : `Expected sync to be successful, but status is "${received.status}"${received.errorMessage ? `: ${received.errorMessage}` : ''}`,
    };
  },

  /**
   * Check if sync failed
   */
  toBeFailedSync(received: SyncOperation) {
    const pass = received.status === 'failed';
    return {
      pass,
      message: () =>
        pass
          ? `Expected sync not to have failed`
          : `Expected sync to have failed, but status is "${received.status}"`,
    };
  },

  /**
   * Check if sync has conflicts
   */
  toBeConflictSync(received: SyncOperation) {
    const pass = received.status === 'conflict';
    return {
      pass,
      message: () =>
        pass
          ? `Expected sync not to have conflicts`
          : `Expected sync to have conflicts, but status is "${received.status}"`,
    };
  },

  /**
   * Check sync error message
   */
  toHaveSyncError(received: SyncOperation, errorPattern?: string | RegExp) {
    const hasError = !!received.errorMessage;

    if (!errorPattern) {
      return {
        pass: hasError,
        message: () =>
          hasError
            ? `Expected sync not to have error, but found: "${received.errorMessage}"`
            : `Expected sync to have error, but no error message found`,
      };
    }

    const matchesPattern =
      errorPattern instanceof RegExp
        ? errorPattern.test(received.errorMessage || '')
        : (received.errorMessage || '').includes(errorPattern);

    const pass = hasError && matchesPattern;
    return {
      pass,
      message: () =>
        pass
          ? `Expected sync error not to match "${errorPattern}"`
          : `Expected sync error to match "${errorPattern}", but got: "${received.errorMessage}"`,
    };
  },
};

/**
 * Pull result matchers
 */
const pullResultMatchers = {
  /**
   * Check if pull was successful
   */
  toBeSuccessfulPull(received: PullResult) {
    const pass = received.success === true;
    return {
      pass,
      message: () =>
        pass
          ? `Expected pull not to be successful`
          : `Expected pull to be successful, but it failed with ${received.conflicts?.length || 0} conflicts`,
    };
  },

  /**
   * Check files changed count
   */
  toHaveFilesChanged(received: PullResult, count?: number) {
    const hasFilesChanged = received.filesChanged > 0;

    if (count === undefined) {
      return {
        pass: hasFilesChanged,
        message: () =>
          hasFilesChanged
            ? `Expected no files to be changed, but ${received.filesChanged} were changed`
            : `Expected files to be changed, but none were`,
      };
    }

    const pass = received.filesChanged === count;
    return {
      pass,
      message: () =>
        pass
          ? `Expected not ${count} files changed`
          : `Expected ${count} files changed, but ${received.filesChanged} were changed`,
    };
  },
};

/**
 * Data validation matchers
 */
const dataValidationMatchers = {
  /**
   * Check if data is valid scenario export
   */
  toBeValidScenarioExport(received: any) {
    const errors: string[] = [];

    if (!received) {
      errors.push('Data is null or undefined');
    } else {
      if (!received.schemaVersion) errors.push('Missing schemaVersion');
      if (!received.exportedAt) errors.push('Missing exportedAt');
      if (!received.scenarioId) errors.push('Missing scenarioId');
      if (!received.data) errors.push('Missing data');
      else if (typeof received.data !== 'object') errors.push('data is not an object');
    }

    const pass = errors.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected data not to be valid scenario export`
          : `Expected valid scenario export, but found errors: ${errors.join(', ')}`,
    };
  },

  /**
   * Check schema version format
   */
  toHaveValidSchemaVersion(received: any) {
    const schemaVersion = received?.schemaVersion;
    const versionPattern = /^\d+\.\d+\.\d+$/;
    const pass = versionPattern.test(schemaVersion);

    return {
      pass,
      message: () =>
        pass
          ? `Expected invalid schema version`
          : `Expected valid schema version (x.y.z format), but got: "${schemaVersion}"`,
    };
  },

  /**
   * Check if export contains specific entity
   */
  toContainEntity(received: any, entityType: string, entityId: string) {
    const entities = received?.data?.[entityType + 's'] || received?.data?.[entityType];
    const found = Array.isArray(entities) && entities.some((e: any) => e.id === entityId);

    return {
      pass: found,
      message: () =>
        found
          ? `Expected data not to contain ${entityType} with id "${entityId}"`
          : `Expected data to contain ${entityType} with id "${entityId}", but it was not found`,
    };
  },
};

/**
 * All custom matchers combined
 */
export const gitMatchers = {
  ...repositoryMatchers,
  ...conflictMatchers,
  ...syncOperationMatchers,
  ...pullResultMatchers,
  ...dataValidationMatchers,
};

/**
 * Setup function to add matchers to Jest
 * Call this in setupFilesAfterEnv or at the beginning of test files
 */
export function setupGitMatchers(): void {
  expect.extend(gitMatchers);
}

// Auto-setup if running in Jest environment
if (typeof expect !== 'undefined' && typeof expect.extend === 'function') {
  expect.extend(gitMatchers);
}

/**
 * Stateful mock for simple-git library
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Simulates Git repository operations with configurable state
 * for testing GitRepositoryService and related components.
 */

import type {
  SimpleGit,
  StatusResult,
  BranchSummary,
  PullResult,
  CommitResult,
  LogResult,
  RemoteWithRefs,
  MergeResult,
} from 'simple-git';

/**
 * Internal state for a mock Git repository
 */
export interface MockGitState {
  // Repository configuration
  initialized: boolean;
  repoPath: string;
  remoteUrl: string | null;

  // Branch state
  currentBranch: string;
  branches: string[];
  tracking: Map<string, string>; // local branch -> remote branch

  // Working directory state
  files: Map<string, string>; // path -> content
  stagedFiles: Set<string>;
  modifiedFiles: Set<string>;
  untrackedFiles: Set<string>;
  conflictedFiles: Set<string>;

  // Commit history
  commits: MockCommit[];
  ahead: number;
  behind: number;

  // Error simulation
  simulateError?: {
    operation: string;
    error: Error;
    count?: number; // Number of times to throw (default: infinite)
  };

  // Network simulation
  networkAvailable: boolean;
}

export interface MockCommit {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
  branch: string;
}

/**
 * Creates default mock state for a new repository
 */
export function createDefaultMockState(repoPath: string = '/mock/repo'): MockGitState {
  return {
    initialized: false,
    repoPath,
    remoteUrl: null,
    currentBranch: 'main',
    branches: ['main'],
    tracking: new Map([['main', 'origin/main']]),
    files: new Map(),
    stagedFiles: new Set(),
    modifiedFiles: new Set(),
    untrackedFiles: new Set(),
    conflictedFiles: new Set(),
    commits: [],
    ahead: 0,
    behind: 0,
    networkAvailable: true,
  };
}

/**
 * Global state storage for mock repositories
 * Allows tests to configure state before operations
 */
const mockRepositories = new Map<string, MockGitState>();
let defaultState = createDefaultMockState();

/**
 * Reset all mock state - call in beforeEach
 */
export function resetMockGitState(): void {
  mockRepositories.clear();
  defaultState = createDefaultMockState();
}

/**
 * Get or create state for a repository path
 */
export function getMockGitState(repoPath: string): MockGitState {
  if (!mockRepositories.has(repoPath)) {
    mockRepositories.set(repoPath, createDefaultMockState(repoPath));
  }
  return mockRepositories.get(repoPath)!;
}

/**
 * Configure mock state for testing
 */
export function configureMockGitState(
  repoPath: string,
  config: Partial<MockGitState>
): MockGitState {
  const state = getMockGitState(repoPath);
  Object.assign(state, config);
  return state;
}

/**
 * Simulate a specific error for an operation
 */
export function simulateGitError(
  repoPath: string,
  operation: string,
  error: Error,
  count?: number
): void {
  const state = getMockGitState(repoPath);
  state.simulateError = { operation, error, count };
}

/**
 * Clear error simulation
 */
export function clearGitError(repoPath: string): void {
  const state = getMockGitState(repoPath);
  delete state.simulateError;
}

/**
 * Helper to check and throw simulated errors
 */
function checkSimulatedError(state: MockGitState, operation: string): void {
  if (state.simulateError && state.simulateError.operation === operation) {
    const { error, count } = state.simulateError;

    if (count !== undefined) {
      state.simulateError.count = count - 1;
      if (state.simulateError.count! <= 0) {
        delete state.simulateError;
      }
    }

    throw error;
  }
}

/**
 * Generate a random-ish commit hash
 */
function generateCommitHash(): string {
  return Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 10) +
    Math.random().toString(16).substring(2, 4);
}

/**
 * Create a mock StatusResult
 */
function createStatusResult(state: MockGitState): StatusResult {
  return {
    current: state.currentBranch,
    tracking: state.tracking.get(state.currentBranch) || null,
    detached: false,
    ahead: state.ahead,
    behind: state.behind,
    not_added: Array.from(state.untrackedFiles),
    conflicted: Array.from(state.conflictedFiles),
    created: [],
    deleted: [],
    ignored: [],
    modified: Array.from(state.modifiedFiles),
    renamed: [],
    staged: Array.from(state.stagedFiles),
    files: [
      ...Array.from(state.modifiedFiles).map((path) => ({
        path,
        index: ' ',
        working_dir: 'M',
      })),
      ...Array.from(state.stagedFiles).map((path) => ({
        path,
        index: 'A',
        working_dir: ' ',
      })),
      ...Array.from(state.conflictedFiles).map((path) => ({
        path,
        index: 'U',
        working_dir: 'U',
      })),
    ],
    isClean: () =>
      state.stagedFiles.size === 0 &&
      state.modifiedFiles.size === 0 &&
      state.untrackedFiles.size === 0 &&
      state.conflictedFiles.size === 0,
  } as StatusResult;
}

/**
 * Create a mock SimpleGit instance
 */
function createMockSimpleGit(repoPath: string): SimpleGit {
  const state = getMockGitState(repoPath);

  const mockGit: Partial<SimpleGit> = {
    // Status operations
    async status(): Promise<StatusResult> {
      checkSimulatedError(state, 'status');
      return createStatusResult(state);
    },

    // Remote operations
    async getRemotes(verbose?: boolean): Promise<RemoteWithRefs[]> {
      checkSimulatedError(state, 'getRemotes');
      if (!state.remoteUrl) return [];
      return [
        {
          name: 'origin',
          refs: {
            fetch: state.remoteUrl,
            push: state.remoteUrl,
          },
        },
      ];
    },

    // Branch operations
    async branch(options?: any): Promise<BranchSummary> {
      checkSimulatedError(state, 'branch');
      const branches: Record<string, any> = {};
      for (const name of state.branches) {
        branches[name] = {
          current: name === state.currentBranch,
          linkedWorkTree: false,
          name,
          commit: state.commits.length > 0 ? state.commits[0].hash : 'abc123',
          label: name,
        };
      }
      return {
        all: state.branches,
        branches,
        current: state.currentBranch,
        detached: false,
      } as BranchSummary;
    },

    async checkout(branch: string | string[]): Promise<string> {
      checkSimulatedError(state, 'checkout');
      const branchName = Array.isArray(branch) ? branch[0] : branch;
      if (!state.branches.includes(branchName)) {
        throw new Error(`error: pathspec '${branchName}' did not match any file(s) known to git`);
      }
      state.currentBranch = branchName;
      return '';
    },

    async checkoutBranch(branchName: string, startPoint: string): Promise<void> {
      checkSimulatedError(state, 'checkoutBranch');
      if (!state.branches.includes(startPoint)) {
        throw new Error(`fatal: invalid reference: ${startPoint}`);
      }
      if (state.branches.includes(branchName)) {
        throw new Error(`fatal: A branch named '${branchName}' already exists`);
      }
      state.branches.push(branchName);
      state.currentBranch = branchName;
    },

    async checkoutLocalBranch(branchName: string): Promise<void> {
      checkSimulatedError(state, 'checkoutLocalBranch');
      if (state.branches.includes(branchName)) {
        throw new Error(`fatal: A branch named '${branchName}' already exists`);
      }
      state.branches.push(branchName);
      state.currentBranch = branchName;
    },

    async deleteLocalBranch(branchName: string, forceDelete?: boolean): Promise<any> {
      checkSimulatedError(state, 'deleteLocalBranch');
      const index = state.branches.indexOf(branchName);
      if (index === -1) {
        throw new Error(`error: branch '${branchName}' not found`);
      }
      if (state.currentBranch === branchName) {
        throw new Error(`error: Cannot delete branch '${branchName}' checked out`);
      }
      state.branches.splice(index, 1);
      return { branch: branchName, hash: 'deleted', success: true };
    },

    // Pull operations
    async pull(
      remote?: string,
      branch?: string,
      options?: any
    ): Promise<PullResult> {
      checkSimulatedError(state, 'pull');

      if (!state.networkAvailable) {
        throw new Error('fatal: unable to access remote repository');
      }

      // Simulate conflicts if configured
      if (state.conflictedFiles.size > 0) {
        return {
          files: Array.from(state.conflictedFiles),
          insertions: {},
          deletions: {},
          summary: {
            changes: 0,
            insertions: 0,
            deletions: 0,
            conflicts: state.conflictedFiles.size,
          },
          created: [],
          deleted: [],
          remoteMessages: { all: [] },
        } as unknown as PullResult;
      }

      // Successful pull
      state.behind = 0;
      return {
        files: [],
        insertions: {},
        deletions: {},
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
          conflicts: 0,
        },
        created: [],
        deleted: [],
        remoteMessages: { all: [] },
      } as unknown as PullResult;
    },

    // Add operations
    async add(files: string | string[]): Promise<string> {
      checkSimulatedError(state, 'add');
      const filesToAdd = Array.isArray(files) ? files : [files];

      for (const file of filesToAdd) {
        if (file === './*' || file === '.') {
          // Add all modified and untracked files
          for (const f of state.modifiedFiles) {
            state.stagedFiles.add(f);
          }
          state.modifiedFiles.clear();
          for (const f of state.untrackedFiles) {
            state.stagedFiles.add(f);
          }
          state.untrackedFiles.clear();
        } else {
          if (state.modifiedFiles.has(file)) {
            state.modifiedFiles.delete(file);
            state.stagedFiles.add(file);
          }
          if (state.untrackedFiles.has(file)) {
            state.untrackedFiles.delete(file);
            state.stagedFiles.add(file);
          }
        }
      }
      return '';
    },

    // Commit operations
    async commit(
      message: string | string[],
      files?: string | string[],
      options?: any
    ): Promise<CommitResult> {
      checkSimulatedError(state, 'commit');

      if (state.stagedFiles.size === 0 && state.modifiedFiles.size === 0) {
        throw new Error('nothing to commit, working tree clean');
      }

      const commitHash = generateCommitHash();
      const authorMatch = options?.['--author']?.match(/^(.+) <(.+)>$/);

      const commit: MockCommit = {
        hash: commitHash,
        date: new Date().toISOString(),
        message: Array.isArray(message) ? message.join('\n') : message,
        author_name: authorMatch?.[1] || 'Test User',
        author_email: authorMatch?.[2] || 'test@example.com',
        branch: state.currentBranch,
      };

      state.commits.unshift(commit);
      state.stagedFiles.clear();
      state.ahead++;

      return {
        author: null,
        branch: state.currentBranch,
        commit: commitHash,
        root: false,
        summary: {
          changes: 1,
          insertions: 10,
          deletions: 0,
        },
      } as CommitResult;
    },

    // Push operations
    async push(
      remote?: string,
      branch?: string,
      options?: any
    ): Promise<any> {
      checkSimulatedError(state, 'push');

      if (!state.networkAvailable) {
        throw new Error('fatal: unable to access remote repository');
      }

      state.ahead = 0;
      return {
        pushed: [],
        remoteMessages: { all: [] },
        update: null,
        ref: null,
      };
    },

    // Merge operations
    async merge(options: string | string[]): Promise<MergeResult> {
      checkSimulatedError(state, 'merge');
      const branchToMerge = Array.isArray(options) ? options[0] : options;

      if (!state.branches.includes(branchToMerge)) {
        throw new Error(`merge: ${branchToMerge} - not something we can merge`);
      }

      // Check for simulated conflicts
      if (state.conflictedFiles.size > 0) {
        throw new Error(`CONFLICT (content): Merge conflict in ${Array.from(state.conflictedFiles)[0]}`);
      }

      return {
        files: [],
        insertions: {},
        deletions: {},
        summary: {
          changes: 0,
          insertions: 0,
          deletions: 0,
        },
        failed: false,
        conflicts: [],
        merges: [],
        result: 'success',
      } as unknown as MergeResult;
    },

    // Log operations
    async log(options?: any): Promise<LogResult> {
      checkSimulatedError(state, 'log');
      const maxCount = options?.maxCount || 50;
      const commits = state.commits.slice(0, maxCount);

      return {
        all: commits.map((c) => ({
          hash: c.hash,
          date: c.date,
          message: c.message,
          refs: '',
          body: '',
          author_name: c.author_name,
          author_email: c.author_email,
        })),
        total: commits.length,
        latest: commits[0] || null,
      } as LogResult;
    },

    // Diff operations
    async diff(options?: string[]): Promise<string> {
      checkSimulatedError(state, 'diff');
      // Return a simple diff representation
      return `diff --git a/file.json b/file.json
--- a/file.json
+++ b/file.json
@@ -1,3 +1,3 @@
 {
-  "old": "value"
+  "new": "value"
 }`;
    },

    // Clone operation (called statically, not on instance)
    clone: jest.fn().mockImplementation(async (url: string, path: string, options?: any) => {
      const targetState = getMockGitState(path);
      checkSimulatedError(targetState, 'clone');

      if (!targetState.networkAvailable) {
        throw new Error('fatal: unable to access remote repository');
      }

      targetState.initialized = true;
      targetState.remoteUrl = url.replace(/\/\/[^@]+@/, '//'); // Strip credentials
      targetState.currentBranch = options?.['--branch'] || 'main';
      targetState.branches = [targetState.currentBranch];

      return path;
    }),
  };

  // Add jest mock functions for tracking calls
  return mockGit as SimpleGit;
}

/**
 * Mock simple-git module
 * Usage: jest.mock('simple-git', () => require('../__mocks__/simple-git'))
 */
function simpleGit(repoPath?: string): SimpleGit {
  const path = repoPath || process.cwd();
  const state = getMockGitState(path);

  // Mark as initialized if path is provided (implies existing repo)
  if (repoPath) {
    state.initialized = true;
    state.repoPath = repoPath;
  }

  return createMockSimpleGit(path);
}

// Static clone method
simpleGit.clone = async (url: string, path: string, options?: any): Promise<string> => {
  const targetState = getMockGitState(path);
  checkSimulatedError(targetState, 'clone');

  if (!targetState.networkAvailable) {
    throw new Error('fatal: unable to access remote repository');
  }

  targetState.initialized = true;
  targetState.remoteUrl = url.replace(/\/\/[^@]+@/, '//');
  targetState.currentBranch = options?.['--branch'] || 'main';
  targetState.branches = [targetState.currentBranch];

  return path;
};

// Export for ES module compatibility
export default simpleGit;
export { simpleGit };

// Re-export types that tests might need
export type { SimpleGit, StatusResult, BranchSummary, PullResult, CommitResult, LogResult };

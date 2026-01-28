/**
 * Git test helper functions and utilities
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides common test setup, teardown, and utility functions.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  resetMockGitState,
  configureMockGitState,
  getMockGitState,
  simulateGitError,
  clearGitError,
  type MockGitState,
} from '../__mocks__/simple-git.js';
import { gitTestData, GitTestDataGenerator } from './git-test-data-generator.js';
import { setupGitMatchers } from './git-matchers.js';

/**
 * Test context for Git sync tests
 */
export interface GitTestContext {
  repoPath: string;
  state: MockGitState;
  generator: GitTestDataGenerator;
  cleanup: () => Promise<void>;
}

/**
 * Create a test context with isolated mock state
 */
export async function createGitTestContext(
  testName: string = 'test'
): Promise<GitTestContext> {
  // Create unique repo path for this test
  const repoPath = path.join(os.tmpdir(), `git-test-${testName}-${Date.now()}`);

  // Reset global mock state
  resetMockGitState();

  // Create isolated generator
  const generator = new GitTestDataGenerator();

  // Get mock state for this path
  const state = getMockGitState(repoPath);

  // Cleanup function
  const cleanup = async () => {
    resetMockGitState();
    generator.resetCounter();
    // Clean up any temp files if needed
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return {
    repoPath,
    state,
    generator,
    cleanup,
  };
}

/**
 * Setup function for Git sync test suites
 * Call in beforeEach/afterEach
 */
export function setupGitTestSuite() {
  let context: GitTestContext;

  beforeEach(async () => {
    context = await createGitTestContext();
    setupGitMatchers();
  });

  afterEach(async () => {
    if (context) {
      await context.cleanup();
    }
  });

  return () => context;
}

/**
 * Create a mock initialized repository
 */
export function createInitializedRepo(
  repoPath: string,
  options: {
    remoteUrl?: string;
    branches?: string[];
    currentBranch?: string;
  } = {}
): MockGitState {
  return configureMockGitState(repoPath, {
    initialized: true,
    remoteUrl: options.remoteUrl || 'https://github.example.com/org/repo.git',
    branches: options.branches || ['main'],
    currentBranch: options.currentBranch || 'main',
    tracking: new Map([[options.currentBranch || 'main', 'origin/main']]),
  });
}

/**
 * Simulate a repository with pending changes
 */
export function simulatePendingChanges(
  repoPath: string,
  files: {
    modified?: string[];
    staged?: string[];
    untracked?: string[];
  }
): MockGitState {
  const state = getMockGitState(repoPath);

  if (files.modified) {
    files.modified.forEach((f) => state.modifiedFiles.add(f));
  }
  if (files.staged) {
    files.staged.forEach((f) => state.stagedFiles.add(f));
  }
  if (files.untracked) {
    files.untracked.forEach((f) => state.untrackedFiles.add(f));
  }

  return state;
}

/**
 * Simulate merge conflicts
 */
export function simulateConflicts(
  repoPath: string,
  conflictedFiles: string[]
): MockGitState {
  const state = getMockGitState(repoPath);
  conflictedFiles.forEach((f) => state.conflictedFiles.add(f));
  return state;
}

/**
 * Simulate commits ahead/behind remote
 */
export function simulateSyncStatus(
  repoPath: string,
  ahead: number = 0,
  behind: number = 0
): MockGitState {
  const state = getMockGitState(repoPath);
  state.ahead = ahead;
  state.behind = behind;
  return state;
}

/**
 * Simulate network failure
 */
export function simulateNetworkFailure(repoPath: string): void {
  const state = getMockGitState(repoPath);
  state.networkAvailable = false;
}

/**
 * Restore network
 */
export function restoreNetwork(repoPath: string): void {
  const state = getMockGitState(repoPath);
  state.networkAvailable = true;
}

/**
 * Simulate a specific Git error for an operation
 */
export { simulateGitError, clearGitError };

/**
 * Common Git error scenarios
 */
export const GitErrors = {
  authentication: () => new Error('fatal: Authentication failed for repository'),
  networkUnreachable: () => new Error('fatal: unable to access remote repository'),
  conflictOnPull: () => new Error('CONFLICT (content): Merge conflict in file.json'),
  pushRejected: () => new Error('error: failed to push some refs (non-fast-forward)'),
  branchNotFound: (branch: string) => new Error(`error: pathspec '${branch}' did not match any file(s)`),
  notAGitRepo: () => new Error('fatal: not a git repository'),
  permissionDenied: () => new Error('error: permission denied'),
  diskFull: () => new Error('error: no space left on device'),
  lockFailed: () => new Error('fatal: Unable to create lock file'),
  corruptedRepo: () => new Error('fatal: bad object HEAD'),
};

/**
 * Create test scenario data file
 */
export async function createTestScenarioFile(
  dirPath: string,
  filename: string,
  data: any
): Promise<string> {
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

/**
 * Read test scenario data file
 */
export async function readTestScenarioFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Assert repository state matches expectations
 */
export function assertRepoState(
  state: MockGitState,
  expected: Partial<{
    initialized: boolean;
    currentBranch: string;
    branches: string[];
    ahead: number;
    behind: number;
    isClean: boolean;
    hasConflicts: boolean;
    networkAvailable: boolean;
  }>
): void {
  if (expected.initialized !== undefined) {
    expect(state.initialized).toBe(expected.initialized);
  }
  if (expected.currentBranch !== undefined) {
    expect(state.currentBranch).toBe(expected.currentBranch);
  }
  if (expected.branches !== undefined) {
    expect(state.branches).toEqual(expect.arrayContaining(expected.branches));
  }
  if (expected.ahead !== undefined) {
    expect(state.ahead).toBe(expected.ahead);
  }
  if (expected.behind !== undefined) {
    expect(state.behind).toBe(expected.behind);
  }
  if (expected.isClean !== undefined) {
    const isClean =
      state.modifiedFiles.size === 0 &&
      state.stagedFiles.size === 0 &&
      state.untrackedFiles.size === 0 &&
      state.conflictedFiles.size === 0;
    expect(isClean).toBe(expected.isClean);
  }
  if (expected.hasConflicts !== undefined) {
    expect(state.conflictedFiles.size > 0).toBe(expected.hasConflicts);
  }
  if (expected.networkAvailable !== undefined) {
    expect(state.networkAvailable).toBe(expected.networkAvailable);
  }
}

/**
 * Wait for async operations with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Create multiple scenarios for parameterized testing
 */
export function generateTestScenarios<T>(
  generator: (index: number) => T,
  count: number
): T[] {
  return Array.from({ length: count }, (_, i) => generator(i));
}

/**
 * Diff two scenario exports to find changes
 */
export function diffScenarioExports(
  base: any,
  updated: any
): {
  added: any[];
  removed: any[];
  modified: any[];
} {
  const result = {
    added: [] as any[],
    removed: [] as any[],
    modified: [] as any[],
  };

  // Compare each entity type
  for (const entityType of ['projects', 'people', 'assignments']) {
    const baseEntities = base?.data?.[entityType] || [];
    const updatedEntities = updated?.data?.[entityType] || [];

    const baseIds = new Set(baseEntities.map((e: any) => e.id));
    const updatedIds = new Set(updatedEntities.map((e: any) => e.id));

    // Find added
    for (const entity of updatedEntities) {
      if (!baseIds.has(entity.id)) {
        result.added.push({ type: entityType, entity });
      }
    }

    // Find removed
    for (const entity of baseEntities) {
      if (!updatedIds.has(entity.id)) {
        result.removed.push({ type: entityType, entity });
      }
    }

    // Find modified
    for (const updatedEntity of updatedEntities) {
      const baseEntity = baseEntities.find((e: any) => e.id === updatedEntity.id);
      if (baseEntity && JSON.stringify(baseEntity) !== JSON.stringify(updatedEntity)) {
        result.modified.push({
          type: entityType,
          base: baseEntity,
          updated: updatedEntity,
        });
      }
    }
  }

  return result;
}

/**
 * Export convenience access to test data generator
 */
export { gitTestData };

/**
 * Re-export commonly used types
 */
export type { MockGitState };

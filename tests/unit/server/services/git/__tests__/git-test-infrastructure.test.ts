/**
 * Git Test Infrastructure - Validation Tests
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * These tests validate that the Git test infrastructure works correctly.
 */

import {
  resetMockGitState,
  getMockGitState,
  configureMockGitState,
  simulateGitError,
  clearGitError,
} from '../../../../../__mocks__/simple-git.js';
import {
  gitTestData,
  GitTestDataGenerator,
} from '../../../../../utils/git-test-data-generator.js';
import { setupGitMatchers } from '../../../../../utils/git-matchers.js';
import {
  createInitializedRepo,
  simulatePendingChanges,
  simulateConflicts,
  simulateSyncStatus,
  GitErrors,
} from '../../../../../utils/git-test-helpers.js';
import {
  fullScenario,
  minimalScenario,
  simpleFieldConflict,
  malformedJson,
} from '../../../../../fixtures/git/index.js';

// Setup custom matchers
setupGitMatchers();

describe('Git Test Infrastructure', () => {
  beforeEach(() => {
    resetMockGitState();
    gitTestData.resetCounter();
  });

  describe('Mock simple-git', () => {
    it('should create default mock state', () => {
      const state = getMockGitState('/test/repo');

      expect(state.initialized).toBe(false);
      expect(state.currentBranch).toBe('main');
      expect(state.branches).toContain('main');
      expect(state.networkAvailable).toBe(true);
    });

    it('should configure mock state', () => {
      const state = configureMockGitState('/test/repo', {
        initialized: true,
        currentBranch: 'feature/test',
        branches: ['main', 'feature/test'],
        ahead: 2,
        behind: 1,
      });

      expect(state.initialized).toBe(true);
      expect(state.currentBranch).toBe('feature/test');
      expect(state.branches).toContain('feature/test');
      expect(state.ahead).toBe(2);
      expect(state.behind).toBe(1);
    });

    it('should simulate errors', () => {
      const state = getMockGitState('/test/repo');
      const testError = new Error('Test error');

      simulateGitError('/test/repo', 'push', testError);
      expect(state.simulateError).toBeDefined();
      expect(state.simulateError?.operation).toBe('push');
      expect(state.simulateError?.error).toBe(testError);

      clearGitError('/test/repo');
      expect(state.simulateError).toBeUndefined();
    });

    it('should reset all state', () => {
      configureMockGitState('/repo1', { initialized: true });
      configureMockGitState('/repo2', { initialized: true });

      resetMockGitState();

      // After reset, states should be default
      const state1 = getMockGitState('/repo1');
      const state2 = getMockGitState('/repo2');

      expect(state1.initialized).toBe(false);
      expect(state2.initialized).toBe(false);
    });
  });

  describe('GitTestDataGenerator', () => {
    it('should generate unique IDs', () => {
      const id1 = gitTestData.generateId('test');
      const id2 = gitTestData.generateId('test');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-\d+-[a-f0-9]+$/);
    });

    it('should generate Git credentials', () => {
      const credential = gitTestData.createCredential({
        repositoryUrl: 'https://github.com/org/repo.git',
      });

      expect(credential.provider).toBe('github-enterprise');
      expect(credential.credentialType).toBe('personal-access-token');
      expect(credential.token).toMatch(/^ghp_[a-z0-9]+$/);
      expect(credential.repositoryUrl).toBe('https://github.com/org/repo.git');
    });

    it('should generate expired credentials', () => {
      const credential = gitTestData.createExpiredCredential();

      expect(credential.expiresAt).toBeDefined();
      expect(credential.expiresAt!.getTime()).toBeLessThan(Date.now());
    });

    it('should generate Git authors', () => {
      const authors = gitTestData.createAuthors(3);

      expect(authors).toHaveLength(3);
      authors.forEach((author) => {
        expect(author.name).toMatch(/^Test User \d+$/);
        expect(author.email).toMatch(/^testuser\d+@example\.com$/);
      });
    });

    it('should generate sync operations', () => {
      const failedSync = gitTestData.createFailedSyncOperation('Network error');
      const conflictSync = gitTestData.createConflictSyncOperation(3);

      expect(failedSync.status).toBe('failed');
      expect(failedSync.errorMessage).toBe('Network error');
      expect(conflictSync.status).toBe('conflict');
      expect(conflictSync.conflictCount).toBe(3);
    });

    it('should generate conflicts', () => {
      const syncOp = gitTestData.createSyncOperation();
      const conflicts = gitTestData.createConflicts(syncOp.id, 2);

      expect(conflicts).toHaveLength(2);
      conflicts.forEach((conflict) => {
        expect(conflict.syncOperationId).toBe(syncOp.id);
        expect(conflict.resolutionStatus).toBe('pending');
      });
    });

    it('should generate scenario export data', () => {
      const data = gitTestData.createScenarioExportData({
        projectCount: 3,
        peopleCount: 5,
        assignmentCount: 8,
        includeRoles: true,
        includeLocations: true,
      });

      expect(data.schemaVersion).toBe('1.0.0');
      expect(data.data.projects).toHaveLength(3);
      expect(data.data.people).toHaveLength(5);
      expect(data.data.assignments).toHaveLength(8);
      expect(data.data.roles).toBeDefined();
      expect(data.data.locations).toBeDefined();
    });
  });

  describe('Test Helpers', () => {
    it('should create initialized repository', () => {
      const state = createInitializedRepo('/test/repo', {
        branches: ['main', 'develop'],
        currentBranch: 'develop',
      });

      expect(state.initialized).toBe(true);
      expect(state.currentBranch).toBe('develop');
      expect(state.branches).toContain('develop');
    });

    it('should simulate pending changes', () => {
      const state = simulatePendingChanges('/test/repo', {
        modified: ['file1.json', 'file2.json'],
        staged: ['file3.json'],
        untracked: ['new-file.json'],
      });

      expect(state.modifiedFiles.size).toBe(2);
      expect(state.stagedFiles.size).toBe(1);
      expect(state.untrackedFiles.size).toBe(1);
    });

    it('should simulate conflicts', () => {
      const state = simulateConflicts('/test/repo', ['conflict1.json', 'conflict2.json']);

      expect(state.conflictedFiles.size).toBe(2);
      expect(state.conflictedFiles.has('conflict1.json')).toBe(true);
    });

    it('should simulate sync status', () => {
      const state = simulateSyncStatus('/test/repo', 3, 2);

      expect(state.ahead).toBe(3);
      expect(state.behind).toBe(2);
    });

    it('should provide common Git errors', () => {
      expect(GitErrors.authentication()).toBeInstanceOf(Error);
      expect(GitErrors.networkUnreachable().message).toContain('unable to access');
      expect(GitErrors.branchNotFound('feature').message).toContain('feature');
    });
  });

  describe('Custom Jest Matchers', () => {
    it('should check repository sync status', () => {
      const syncedState = configureMockGitState('/synced', {
        ahead: 0,
        behind: 0,
      });
      expect(syncedState).toBeInSync();

      const behindState = configureMockGitState('/behind', {
        ahead: 0,
        behind: 2,
      });
      expect(behindState).toBeBehindRemote(2);
      expect(behindState).not.toBeInSync();

      const aheadState = configureMockGitState('/ahead', {
        ahead: 3,
        behind: 0,
      });
      expect(aheadState).toBeAheadOfRemote(3);
    });

    it('should check branch status', () => {
      const state = configureMockGitState('/test', {
        currentBranch: 'feature/test',
        branches: ['main', 'feature/test', 'develop'],
      });

      expect(state).toBeOnBranch('feature/test');
      expect(state).toHaveBranch('develop');
      expect(state).not.toBeOnBranch('main');
    });

    it('should check clean status', () => {
      const cleanState = getMockGitState('/clean');
      expect(cleanState).toBeClean();

      const dirtyState = getMockGitState('/dirty');
      dirtyState.modifiedFiles.add('file.json');
      expect(dirtyState).not.toBeClean();
      expect(dirtyState).toHaveUncommittedChanges();
    });

    it('should check conflicts', () => {
      const conflictState = getMockGitState('/conflict');
      conflictState.conflictedFiles.add('conflict.json');

      expect(conflictState).toHaveConflict();
      expect(conflictState).toHaveConflictsCount(1);
    });

    it('should validate scenario exports', () => {
      expect(fullScenario).toBeValidScenarioExport();
      expect(fullScenario).toHaveValidSchemaVersion();
      expect(minimalScenario).toBeValidScenarioExport();
    });
  });

  describe('Test Fixtures', () => {
    it('should provide valid scenario fixtures', () => {
      expect(minimalScenario.schemaVersion).toBe('1.0.0');
      expect(minimalScenario.scenarioId).toBeDefined();

      expect(fullScenario.data.projects.length).toBeGreaterThan(0);
      expect(fullScenario.data.people.length).toBeGreaterThan(0);
      expect(fullScenario.data.assignments.length).toBeGreaterThan(0);
    });

    it('should provide conflict fixtures', () => {
      expect(simpleFieldConflict.base).toBeDefined();
      expect(simpleFieldConflict.local).toBeDefined();
      expect(simpleFieldConflict.remote).toBeDefined();
      expect(simpleFieldConflict.base.name).not.toBe(simpleFieldConflict.local.name);
      expect(simpleFieldConflict.local.name).not.toBe(simpleFieldConflict.remote.name);
    });

    it('should provide corrupted data fixtures', () => {
      expect(malformedJson.unclosedObject).not.toContain('}');
      expect(malformedJson.trailingComma).toContain(',}');
      expect(malformedJson.emptyFile).toBe('');
    });
  });
});

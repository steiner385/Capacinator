/**
 * Git Test Data Generator
 * Feature: 001-git-sync-integration
 * Issue: #104 - Git Sync Test Infrastructure
 *
 * Provides builder-pattern APIs for generating test data
 * for Git sync testing scenarios.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GitCredential,
  GitAuthor,
  SyncOperation,
  Conflict,
  ChangeHistoryEntry,
  BranchMetadata,
  ScenarioExportData,
} from '../../shared/types/git-entities.js';
import {
  configureMockGitState,
  getMockGitState,
  type MockGitState,
  type MockCommit,
} from '../__mocks__/simple-git.js';

/**
 * Options for generating Git credentials
 */
interface CredentialOptions {
  userId?: string;
  token?: string;
  repositoryUrl?: string;
  expiresAt?: Date;
}

/**
 * Options for generating Git authors
 */
interface AuthorOptions {
  name?: string;
  email?: string;
}

/**
 * Options for generating sync operations
 */
interface SyncOperationOptions {
  type?: 'clone' | 'pull' | 'push' | 'merge';
  status?: 'pending' | 'in-progress' | 'completed' | 'failed' | 'conflict';
  conflictCount?: number;
  errorMessage?: string;
}

/**
 * Options for generating conflicts
 */
interface ConflictOptions {
  entityType?: 'project' | 'person' | 'assignment' | 'project_phase';
  field?: string;
  resolutionStatus?: 'pending' | 'resolved' | 'deferred';
}

/**
 * Options for generating scenario export data
 */
interface ScenarioExportOptions {
  projectCount?: number;
  peopleCount?: number;
  assignmentCount?: number;
  includeRoles?: boolean;
  includeLocations?: boolean;
}

/**
 * GitTestDataGenerator - Builder-pattern API for test data generation
 */
export class GitTestDataGenerator {
  private counter = 0;

  /**
   * Generate a unique ID
   */
  generateId(prefix: string = 'test'): string {
    return `${prefix}-${++this.counter}-${uuidv4().substring(0, 8)}`;
  }

  /**
   * Reset the counter for deterministic test runs
   */
  resetCounter(): void {
    this.counter = 0;
  }

  // ============================================
  // Git Credentials
  // ============================================

  /**
   * Generate a Git credential
   */
  createCredential(options: CredentialOptions = {}): GitCredential {
    return {
      userId: options.userId || this.generateId('user'),
      provider: 'github-enterprise',
      credentialType: 'personal-access-token',
      token: options.token || `ghp_${this.generateRandomString(36)}`,
      repositoryUrl: options.repositoryUrl || 'https://github.example.com/org/repo.git',
      expiresAt: options.expiresAt,
      createdAt: new Date(),
      lastUsedAt: undefined,
    };
  }

  /**
   * Generate an expired credential
   */
  createExpiredCredential(): GitCredential {
    const credential = this.createCredential();
    credential.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    return credential;
  }

  /**
   * Generate credentials expiring soon
   */
  createExpiringCredential(hoursUntilExpiry: number = 1): GitCredential {
    const credential = this.createCredential();
    credential.expiresAt = new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000);
    return credential;
  }

  // ============================================
  // Git Authors
  // ============================================

  /**
   * Generate a Git author
   */
  createAuthor(options: AuthorOptions = {}): GitAuthor {
    const id = this.counter + 1;
    return {
      name: options.name || `Test User ${id}`,
      email: options.email || `testuser${id}@example.com`,
    };
  }

  /**
   * Generate multiple authors
   */
  createAuthors(count: number): GitAuthor[] {
    return Array.from({ length: count }, () => this.createAuthor());
  }

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Generate a sync operation
   */
  createSyncOperation(options: SyncOperationOptions = {}): SyncOperation {
    return {
      id: this.generateId('sync'),
      type: options.type || 'pull',
      status: options.status || 'completed',
      startedAt: new Date(),
      completedAt: options.status === 'in-progress' ? undefined : new Date(),
      conflictCount: options.conflictCount || 0,
      errorMessage: options.errorMessage,
      userId: this.generateId('user'),
    };
  }

  /**
   * Generate a failed sync operation
   */
  createFailedSyncOperation(errorMessage: string): SyncOperation {
    return this.createSyncOperation({
      status: 'failed',
      errorMessage,
    });
  }

  /**
   * Generate a sync operation with conflicts
   */
  createConflictSyncOperation(conflictCount: number): SyncOperation {
    return this.createSyncOperation({
      status: 'conflict',
      conflictCount,
    });
  }

  // ============================================
  // Conflicts
  // ============================================

  /**
   * Generate a conflict
   */
  createConflict(
    syncOperationId: string,
    options: ConflictOptions = {}
  ): Conflict {
    const entityType = options.entityType || 'project';
    const entityId = this.generateId(entityType);

    return {
      id: this.generateId('conflict'),
      syncOperationId,
      entityType,
      entityId,
      entityName: `Test ${entityType} ${this.counter}`,
      field: options.field || 'name',
      baseValue: 'Original value',
      localValue: 'Local value',
      remoteValue: 'Remote value',
      resolutionStatus: options.resolutionStatus || 'pending',
      resolvedValue: undefined,
      resolvedAt: undefined,
      resolvedBy: undefined,
    };
  }

  /**
   * Generate multiple conflicts for a sync operation
   */
  createConflicts(
    syncOperationId: string,
    count: number,
    options: ConflictOptions = {}
  ): Conflict[] {
    return Array.from({ length: count }, () =>
      this.createConflict(syncOperationId, options)
    );
  }

  /**
   * Generate a resolved conflict
   */
  createResolvedConflict(
    syncOperationId: string,
    resolution: 'accept_local' | 'accept_remote' | 'custom',
    customValue?: any
  ): Conflict {
    const conflict = this.createConflict(syncOperationId);
    conflict.resolutionStatus = 'resolved';
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = this.generateId('user');

    switch (resolution) {
      case 'accept_local':
        conflict.resolvedValue = conflict.localValue;
        break;
      case 'accept_remote':
        conflict.resolvedValue = conflict.remoteValue;
        break;
      case 'custom':
        conflict.resolvedValue = customValue ?? 'Custom resolved value';
        break;
    }

    return conflict;
  }

  // ============================================
  // Change History
  // ============================================

  /**
   * Generate a change history entry
   */
  createChangeHistoryEntry(options: {
    message?: string;
    filesChanged?: string[];
    author?: GitAuthor;
  } = {}): ChangeHistoryEntry {
    const author = options.author || this.createAuthor();

    return {
      commitSha: this.generateRandomString(40),
      author: author.email,
      authorName: author.name,
      timestamp: new Date(),
      message: options.message || `Test commit ${this.counter}`,
      filesChanged: options.filesChanged || ['scenarios/working/projects.json'],
      entitiesAffected: [
        {
          entityType: 'project',
          entityId: this.generateId('proj'),
          action: 'updated',
        },
      ],
      diffSummary: {
        added: Math.floor(Math.random() * 50),
        removed: Math.floor(Math.random() * 20),
      },
    };
  }

  /**
   * Generate a commit history
   */
  createCommitHistory(count: number): ChangeHistoryEntry[] {
    return Array.from({ length: count }, (_, i) =>
      this.createChangeHistoryEntry({
        message: `Commit ${count - i}`,
      })
    );
  }

  // ============================================
  // Branch Metadata
  // ============================================

  /**
   * Generate branch metadata
   */
  createBranchMetadata(options: {
    branchName?: string;
    parentBranch?: string;
    mergeStatus?: 'unmerged' | 'merged' | 'abandoned';
  } = {}): BranchMetadata {
    return {
      branchName: options.branchName || `feature/${this.generateId('branch')}`,
      createdAt: new Date(),
      createdBy: `testuser${this.counter}@example.com`,
      parentBranch: options.parentBranch || 'main',
      mergeStatus: options.mergeStatus || 'unmerged',
      description: `Test branch ${this.counter}`,
      lastSyncedAt: new Date(),
    };
  }

  // ============================================
  // Scenario Export Data
  // ============================================

  /**
   * Generate scenario export data
   */
  createScenarioExportData(options: ScenarioExportOptions = {}): ScenarioExportData {
    const projectCount = options.projectCount ?? 2;
    const peopleCount = options.peopleCount ?? 3;
    const assignmentCount = options.assignmentCount ?? 4;

    const projects = Array.from({ length: projectCount }, (_, i) => ({
      id: this.generateId('proj'),
      name: `Project ${i + 1}`,
      description: `Description for project ${i + 1}`,
      priority: (i % 3) + 1,
      aspiration_start: '2024-01-01',
      aspiration_finish: '2024-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const people = Array.from({ length: peopleCount }, (_, i) => ({
      id: this.generateId('person'),
      name: `Person ${i + 1}`,
      email: `person${i + 1}@example.com`,
      availability_percentage: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const assignments = Array.from({ length: assignmentCount }, (_, i) => ({
      id: this.generateId('assign'),
      person_id: people[i % peopleCount].id,
      project_id: projects[i % projectCount].id,
      allocation_percentage: Math.floor(100 / Math.max(1, Math.ceil(assignmentCount / peopleCount))),
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const data: any = {
      projects,
      people,
      assignments,
    };

    if (options.includeRoles) {
      data.roles = [
        { id: this.generateId('role'), name: 'Developer' },
        { id: this.generateId('role'), name: 'Designer' },
      ];
    }

    if (options.includeLocations) {
      data.locations = [
        { id: this.generateId('loc'), name: 'Headquarters', timezone: 'America/New_York' },
      ];
    }

    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'test@example.com',
      scenarioId: this.generateId('scenario'),
      data,
    };
  }

  // ============================================
  // Mock Repository State
  // ============================================

  /**
   * Configure a mock repository with initial state
   */
  configureMockRepository(
    repoPath: string,
    options: {
      branches?: string[];
      currentBranch?: string;
      remoteUrl?: string;
      isClean?: boolean;
      ahead?: number;
      behind?: number;
      commits?: MockCommit[];
    } = {}
  ): MockGitState {
    const config: Partial<MockGitState> = {
      initialized: true,
      branches: options.branches || ['main'],
      currentBranch: options.currentBranch || 'main',
      remoteUrl: options.remoteUrl || 'https://github.example.com/org/repo.git',
      ahead: options.ahead || 0,
      behind: options.behind || 0,
    };

    if (options.isClean === false) {
      config.modifiedFiles = new Set(['modified-file.json']);
    }

    if (options.commits) {
      config.commits = options.commits;
    }

    return configureMockGitState(repoPath, config);
  }

  /**
   * Configure a repository with uncommitted changes
   */
  configureDirtyRepository(repoPath: string, files: string[]): MockGitState {
    const state = getMockGitState(repoPath);
    state.initialized = true;
    files.forEach((f) => state.modifiedFiles.add(f));
    return state;
  }

  /**
   * Configure a repository with merge conflicts
   */
  configureConflictRepository(repoPath: string, conflictedFiles: string[]): MockGitState {
    const state = getMockGitState(repoPath);
    state.initialized = true;
    conflictedFiles.forEach((f) => state.conflictedFiles.add(f));
    return state;
  }

  /**
   * Configure a repository behind remote
   */
  configureBehindRepository(repoPath: string, commitsBehind: number): MockGitState {
    return this.configureMockRepository(repoPath, {
      behind: commitsBehind,
    });
  }

  /**
   * Configure a repository ahead of remote
   */
  configureAheadRepository(repoPath: string, commitsAhead: number): MockGitState {
    return this.configureMockRepository(repoPath, {
      ahead: commitsAhead,
    });
  }

  /**
   * Configure network unavailable
   */
  configureOfflineRepository(repoPath: string): MockGitState {
    const state = getMockGitState(repoPath);
    state.networkAvailable = false;
    return state;
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Generate a random string
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }
}

// Export singleton instance for convenience
export const gitTestData = new GitTestDataGenerator();

// Export class for creating isolated instances
export { GitTestDataGenerator as GitTestDataGeneratorClass };

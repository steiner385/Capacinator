/**
 * Git-based multi-user collaboration entities
 * Feature: 001-git-sync-integration
 */

/**
 * Represents a sync operation (clone, pull, push, merge)
 */
export interface SyncOperation {
  id: string;
  type: 'clone' | 'pull' | 'push' | 'merge';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'conflict';
  startedAt: Date;
  completedAt?: Date;
  conflictCount: number;
  errorMessage?: string;
  userId: string; // Person who initiated sync
}

/**
 * Represents a merge conflict requiring user resolution
 */
export interface Conflict {
  id: string;
  syncOperationId: string;
  entityType: 'project' | 'person' | 'assignment' | 'project_phase';
  entityId: string;
  entityName: string; // Human-readable entity name (e.g., project title, person name)
  field: string; // Conflicting field name
  baseValue: any; // Common ancestor value
  localValue: any; // User's current value
  remoteValue: any; // Remote repository value
  resolutionStatus: 'pending' | 'resolved' | 'deferred';
  resolvedValue?: any; // User's chosen resolution
  resolvedAt?: Date;
  resolvedBy?: string; // User who resolved
}

/**
 * Resolution options for a conflict
 */
export type ConflictResolution = 'accept_local' | 'accept_remote' | 'custom';

/**
 * Change history entry from Git commit log
 */
export interface ChangeHistoryEntry {
  commitSha: string;
  author: string; // Git author email
  authorName: string; // Git author name
  timestamp: Date;
  message: string;
  filesChanged: string[]; // List of JSON files modified
  entitiesAffected: {
    entityType: string;
    entityId: string;
    action: 'created' | 'updated' | 'deleted';
  }[];
  diffSummary: {
    added: number; // Lines added
    removed: number; // Lines removed
  };
}

/**
 * Git credentials for GitHub Enterprise authentication
 */
export interface GitCredential {
  userId: string; // Person ID (FK to people table)
  provider: 'github-enterprise';
  credentialType: 'personal-access-token' | 'oauth';
  token: string; // Encrypted via electron-store
  repositoryUrl: string;
  expiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * Scenario branch metadata for experimental "what-if" planning
 */
export interface BranchMetadata {
  branchName: string;
  createdAt: Date;
  createdBy: string; // User email
  parentBranch: string;
  mergeStatus: 'unmerged' | 'merged' | 'abandoned';
  description: string;
  lastSyncedAt: Date;
}

/**
 * Sync status displayed in UI
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'offline';

/**
 * Pull operation result
 */
export interface PullResult {
  success: boolean;
  filesChanged: number;
  conflicts: Conflict[];
}

/**
 * Push operation result
 */
export interface PushResult {
  success: boolean;
  commitSha: string;
  filesChanged: number;
  commitMessage: string;
}

/**
 * Git author information for commits
 */
export interface GitAuthor {
  name: string;
  email: string;
}

/**
 * Scenario data exported to JSON
 */
export interface ScenarioExportData {
  schemaVersion: string;
  exportedAt: string; // ISO timestamp
  exportedBy?: string; // User email
  scenarioId: string;
  data: any[]; // Array of entities (projects, people, assignments, etc.)
}

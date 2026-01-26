/**
 * Git Audit Integration Service
 * Feature: 001-git-sync-integration
 * Task: T100
 *
 * Integrates Git sync operations with the existing AuditService
 * to supplement Git commit history with detailed field-level changes
 */

import type { Knex } from 'knex';
import type { AuditService } from '../audit/AuditService.js';
import type { SyncOperation, Conflict } from '../../../../shared/types/git-entities.js';
import { gitLogger } from './GitLogger.js';

/**
 * Configuration for Git audit integration
 */
export interface GitAuditConfig {
  /** Whether to log sync operations to the audit table */
  enableSyncOperationLogging: boolean;
  /** Whether to log conflict resolutions to the audit table */
  enableConflictLogging: boolean;
  /** Whether to log Git commit history entries */
  enableCommitHistoryLogging: boolean;
  /** Custom table name for Git sync audit logs (defaults to 'git_sync_audit') */
  tableName?: string;
}

/**
 * Default configuration
 */
export const defaultGitAuditConfig: GitAuditConfig = {
  enableSyncOperationLogging: true,
  enableConflictLogging: true,
  enableCommitHistoryLogging: false, // Git already tracks this, so default to false
  tableName: 'git_sync_audit',
};

/**
 * Git sync audit entry for detailed logging
 */
export interface GitSyncAuditEntry {
  id: string;
  operationType: 'clone' | 'pull' | 'push' | 'conflict_resolution' | 'branch_switch' | 'branch_merge';
  operationStatus: 'started' | 'completed' | 'failed';
  userId?: string;
  branchName?: string;
  commitSha?: string;
  entitiesAffected?: number;
  conflictsDetected?: number;
  conflictsResolved?: number;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Service for integrating Git operations with the audit system
 */
export class GitAuditIntegration {
  private config: GitAuditConfig;
  private auditService?: AuditService;
  private db?: Knex;

  constructor(config: Partial<GitAuditConfig> = {}, auditService?: AuditService, db?: Knex) {
    this.config = { ...defaultGitAuditConfig, ...config };
    this.auditService = auditService;
    this.db = db;
  }

  /**
   * Log a sync operation start
   */
  async logSyncStart(
    operation: SyncOperation,
    userId?: string,
    branchName?: string
  ): Promise<void> {
    if (!this.config.enableSyncOperationLogging) return;

    gitLogger.info('audit', `Sync operation started: ${operation.type}`, {
      operationId: operation.id,
      userId,
      branchName,
    });

    if (this.db) {
      try {
        await this.insertAuditEntry({
          id: operation.id,
          operationType: operation.type,
          operationStatus: 'started',
          userId,
          branchName,
          createdAt: new Date(),
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log sync start to database', { error });
      }
    }
  }

  /**
   * Log a sync operation completion
   */
  async logSyncComplete(
    operation: SyncOperation,
    result: {
      commitSha?: string;
      entitiesAffected?: number;
      conflictsDetected?: number;
      duration?: number;
    }
  ): Promise<void> {
    if (!this.config.enableSyncOperationLogging) return;

    gitLogger.info('audit', `Sync operation completed: ${operation.type}`, {
      operationId: operation.id,
      commitSha: result.commitSha,
      entitiesAffected: result.entitiesAffected,
      conflictsDetected: result.conflictsDetected,
      duration: result.duration,
    });

    if (this.db) {
      try {
        await this.updateAuditEntry(operation.id, {
          operationStatus: 'completed',
          commitSha: result.commitSha,
          entitiesAffected: result.entitiesAffected,
          conflictsDetected: result.conflictsDetected,
          duration: result.duration,
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log sync completion to database', { error });
      }
    }
  }

  /**
   * Log a sync operation failure
   */
  async logSyncFailure(operation: SyncOperation, error: Error, duration?: number): Promise<void> {
    if (!this.config.enableSyncOperationLogging) return;

    gitLogger.error('audit', `Sync operation failed: ${operation.type}`, {
      operationId: operation.id,
      error: error.message,
      duration,
    });

    if (this.db) {
      try {
        await this.updateAuditEntry(operation.id, {
          operationStatus: 'failed',
          errorMessage: error.message,
          duration,
        });
      } catch (dbError) {
        gitLogger.warn('audit', 'Failed to log sync failure to database', { error: dbError });
      }
    }
  }

  /**
   * Log a conflict resolution
   */
  async logConflictResolution(
    conflict: Conflict,
    resolution: 'accept_local' | 'accept_remote' | 'custom',
    resolvedBy: string,
    customValue?: any
  ): Promise<void> {
    if (!this.config.enableConflictLogging) return;

    const metadata = {
      conflictId: conflict.id,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      field: conflict.field,
      resolution,
      baseValue: conflict.baseValue,
      localValue: conflict.localValue,
      remoteValue: conflict.remoteValue,
      resolvedValue: customValue || (resolution === 'accept_local' ? conflict.localValue : conflict.remoteValue),
    };

    gitLogger.info('audit', `Conflict resolved: ${conflict.entityType}/${conflict.entityId}/${conflict.field}`, {
      resolution,
      resolvedBy,
    });

    // Also log to the main AuditService if available
    if (this.auditService) {
      try {
        await this.auditService.logChange({
          tableName: conflict.entityType === 'person' ? 'people' : `${conflict.entityType}s`,
          recordId: conflict.entityId,
          action: 'UPDATE',
          changedBy: resolvedBy,
          oldValues: { [conflict.field]: conflict.localValue },
          newValues: { [conflict.field]: metadata.resolvedValue },
          comment: `Git conflict resolution (${resolution}): ${conflict.field}`,
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log conflict resolution to AuditService', { error });
      }
    }

    if (this.db) {
      try {
        const { v4: uuidv4 } = await import('uuid');
        await this.insertAuditEntry({
          id: uuidv4(),
          operationType: 'conflict_resolution',
          operationStatus: 'completed',
          userId: resolvedBy,
          conflictsResolved: 1,
          metadata,
          createdAt: new Date(),
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log conflict resolution to database', { error });
      }
    }
  }

  /**
   * Log a branch switch operation
   */
  async logBranchSwitch(
    fromBranch: string,
    toBranch: string,
    userId: string
  ): Promise<void> {
    if (!this.config.enableSyncOperationLogging) return;

    gitLogger.info('audit', `Branch switched: ${fromBranch} → ${toBranch}`, { userId });

    if (this.db) {
      try {
        const { v4: uuidv4 } = await import('uuid');
        await this.insertAuditEntry({
          id: uuidv4(),
          operationType: 'branch_switch',
          operationStatus: 'completed',
          userId,
          branchName: toBranch,
          metadata: { fromBranch, toBranch },
          createdAt: new Date(),
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log branch switch to database', { error });
      }
    }
  }

  /**
   * Log a branch merge operation
   */
  async logBranchMerge(
    sourceBranch: string,
    targetBranch: string,
    userId: string,
    result: { success: boolean; conflictsDetected: number; commitSha?: string }
  ): Promise<void> {
    if (!this.config.enableSyncOperationLogging) return;

    gitLogger.info('audit', `Branch merged: ${sourceBranch} → ${targetBranch}`, {
      userId,
      success: result.success,
      conflictsDetected: result.conflictsDetected,
    });

    if (this.db) {
      try {
        const { v4: uuidv4 } = await import('uuid');
        await this.insertAuditEntry({
          id: uuidv4(),
          operationType: 'branch_merge',
          operationStatus: result.success ? 'completed' : 'failed',
          userId,
          branchName: targetBranch,
          commitSha: result.commitSha,
          conflictsDetected: result.conflictsDetected,
          metadata: { sourceBranch, targetBranch },
          createdAt: new Date(),
        });
      } catch (error) {
        gitLogger.warn('audit', 'Failed to log branch merge to database', { error });
      }
    }
  }

  /**
   * Get sync operation audit history
   */
  async getSyncHistory(options?: {
    userId?: string;
    operationType?: GitSyncAuditEntry['operationType'];
    limit?: number;
    offset?: number;
  }): Promise<GitSyncAuditEntry[]> {
    if (!this.db) return [];

    try {
      let query = this.db(this.config.tableName!).orderBy('created_at', 'desc');

      if (options?.userId) {
        query = query.where('user_id', options.userId);
      }

      if (options?.operationType) {
        query = query.where('operation_type', options.operationType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;
      return results.map(this.parseAuditEntry);
    } catch (error) {
      gitLogger.error('audit', 'Failed to fetch sync history', { error });
      return [];
    }
  }

  /**
   * Insert audit entry into database
   */
  private async insertAuditEntry(entry: GitSyncAuditEntry): Promise<void> {
    if (!this.db) return;

    await this.db(this.config.tableName!).insert({
      id: entry.id,
      operation_type: entry.operationType,
      operation_status: entry.operationStatus,
      user_id: entry.userId,
      branch_name: entry.branchName,
      commit_sha: entry.commitSha,
      entities_affected: entry.entitiesAffected,
      conflicts_detected: entry.conflictsDetected,
      conflicts_resolved: entry.conflictsResolved,
      duration: entry.duration,
      error_message: entry.errorMessage,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      created_at: entry.createdAt,
    });
  }

  /**
   * Update existing audit entry
   */
  private async updateAuditEntry(
    id: string,
    updates: Partial<GitSyncAuditEntry>
  ): Promise<void> {
    if (!this.db) return;

    const dbUpdates: Record<string, any> = {};

    if (updates.operationStatus) dbUpdates.operation_status = updates.operationStatus;
    if (updates.commitSha) dbUpdates.commit_sha = updates.commitSha;
    if (updates.entitiesAffected !== undefined) dbUpdates.entities_affected = updates.entitiesAffected;
    if (updates.conflictsDetected !== undefined) dbUpdates.conflicts_detected = updates.conflictsDetected;
    if (updates.conflictsResolved !== undefined) dbUpdates.conflicts_resolved = updates.conflictsResolved;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.errorMessage) dbUpdates.error_message = updates.errorMessage;
    if (updates.metadata) dbUpdates.metadata = JSON.stringify(updates.metadata);

    await this.db(this.config.tableName!).where('id', id).update(dbUpdates);
  }

  /**
   * Parse database row into GitSyncAuditEntry
   */
  private parseAuditEntry(row: any): GitSyncAuditEntry {
    return {
      id: row.id,
      operationType: row.operation_type,
      operationStatus: row.operation_status,
      userId: row.user_id,
      branchName: row.branch_name,
      commitSha: row.commit_sha,
      entitiesAffected: row.entities_affected,
      conflictsDetected: row.conflicts_detected,
      conflictsResolved: row.conflicts_resolved,
      duration: row.duration,
      errorMessage: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

/**
 * Create migration SQL for git_sync_audit table
 * This can be used in a Knex migration file
 */
export const gitSyncAuditTableSQL = `
CREATE TABLE IF NOT EXISTS git_sync_audit (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('clone', 'pull', 'push', 'conflict_resolution', 'branch_switch', 'branch_merge')),
  operation_status TEXT NOT NULL CHECK (operation_status IN ('started', 'completed', 'failed')),
  user_id TEXT,
  branch_name TEXT,
  commit_sha TEXT,
  entities_affected INTEGER,
  conflicts_detected INTEGER,
  conflicts_resolved INTEGER,
  duration INTEGER,
  error_message TEXT,
  metadata TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_git_sync_audit_user ON git_sync_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_git_sync_audit_type ON git_sync_audit(operation_type);
CREATE INDEX IF NOT EXISTS idx_git_sync_audit_created ON git_sync_audit(created_at);
`;

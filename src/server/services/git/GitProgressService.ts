/**
 * Git Progress Service
 * Feature: 001-git-sync-integration
 * Task: T095
 *
 * Provides progress indicators for long-running Git operations
 */

import type { GitProgressUpdate, GitProgressCallback } from '../../../../shared/types/git-entities.js';
import { gitLogger } from './GitLogger.js';

/**
 * Progress tracker for a single Git operation
 */
export class GitOperationProgress {
  private callback: GitProgressCallback | null;
  private operation: GitProgressUpdate['operation'];
  private startTime: number;

  constructor(operation: GitProgressUpdate['operation'], callback?: GitProgressCallback) {
    this.operation = operation;
    this.callback = callback || null;
    this.startTime = Date.now();
  }

  /**
   * Report progress update
   */
  report(
    phase: GitProgressUpdate['phase'],
    message: string,
    progress?: { current?: number; total?: number }
  ): void {
    const update: GitProgressUpdate = {
      operation: this.operation,
      phase,
      message,
      current: progress?.current,
      total: progress?.total,
      percentComplete:
        progress?.current !== undefined && progress?.total !== undefined && progress.total > 0
          ? Math.round((progress.current / progress.total) * 100)
          : undefined,
    };

    // Log progress for debugging
    gitLogger.debug(this.operation, `[Progress] ${phase}: ${message}`, {
      current: progress?.current,
      total: progress?.total,
      percentComplete: update.percentComplete,
    });

    // Invoke callback if provided
    if (this.callback) {
      try {
        this.callback(update);
      } catch (error) {
        gitLogger.warn(this.operation, 'Progress callback error', { error });
      }
    }
  }

  /**
   * Mark operation as starting
   */
  start(message: string = 'Starting operation...'): void {
    this.report('starting', message);
  }

  /**
   * Mark operation as transferring data
   */
  transferring(message: string, current?: number, total?: number): void {
    this.report('transferring', message, { current, total });
  }

  /**
   * Mark operation as processing
   */
  processing(message: string, current?: number, total?: number): void {
    this.report('processing', message, { current, total });
  }

  /**
   * Mark operation as completing
   */
  completing(message: string = 'Finishing up...'): void {
    this.report('completing', message);
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Service for managing Git operation progress
 */
export class GitProgressService {
  private activeOperations: Map<string, GitOperationProgress> = new Map();

  /**
   * Start tracking a new operation
   *
   * @param operationId - Unique operation identifier
   * @param operation - Type of Git operation
   * @param callback - Optional callback for progress updates
   * @returns Progress tracker
   */
  startOperation(
    operationId: string,
    operation: GitProgressUpdate['operation'],
    callback?: GitProgressCallback
  ): GitOperationProgress {
    const progress = new GitOperationProgress(operation, callback);
    this.activeOperations.set(operationId, progress);
    return progress;
  }

  /**
   * Get an existing operation progress tracker
   *
   * @param operationId - Operation identifier
   * @returns Progress tracker or undefined
   */
  getOperation(operationId: string): GitOperationProgress | undefined {
    return this.activeOperations.get(operationId);
  }

  /**
   * Complete and remove an operation
   *
   * @param operationId - Operation identifier
   * @returns Elapsed time in ms or undefined if not found
   */
  completeOperation(operationId: string): number | undefined {
    const progress = this.activeOperations.get(operationId);
    if (progress) {
      const elapsed = progress.getElapsedTime();
      this.activeOperations.delete(operationId);
      return elapsed;
    }
    return undefined;
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }

  /**
   * Create progress update messages for common operations
   */
  static readonly Messages = {
    clone: {
      starting: 'Connecting to GitHub Enterprise...',
      transferring: (bytes: number) =>
        `Downloading repository... (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
      processing: 'Setting up local repository...',
      completing: 'Clone complete!',
    },
    pull: {
      starting: 'Checking for updates...',
      transferring: (files: number) => `Downloading ${files} file${files !== 1 ? 's' : ''}...`,
      processing: 'Applying changes...',
      completing: 'Pull complete!',
    },
    push: {
      starting: 'Preparing changes for upload...',
      transferring: (files: number) => `Uploading ${files} file${files !== 1 ? 's' : ''}...`,
      processing: 'Verifying push...',
      completing: 'Push complete!',
    },
    import: {
      starting: 'Reading JSON files...',
      processing: (entity: string, current: number, total: number) =>
        `Importing ${entity}... (${current}/${total})`,
      completing: 'Import complete!',
    },
    export: {
      starting: 'Reading database...',
      processing: (entity: string, current: number, total: number) =>
        `Exporting ${entity}... (${current}/${total})`,
      completing: 'Export complete!',
    },
  } as const;
}

// Export singleton instance
export const gitProgressService = new GitProgressService();

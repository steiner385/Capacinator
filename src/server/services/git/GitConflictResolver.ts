/**
 * Git Conflict Resolver Service
 * Feature: 001-git-sync-integration
 * Task: T045, T046, T047
 *
 * Implements 3-way merge algorithm for detecting and resolving conflicts
 */

import { diffWords } from 'diff';
import type { Conflict } from '../../../shared/types/git-entities.js';

interface MergeInput {
  base: any;
  local: any;
  remote: any;
}

interface MergeResult {
  hasConflict: boolean;
  resolvedValue?: any;
  conflict?: Conflict;
}

interface EntityConflictContext {
  entityType: 'project' | 'person' | 'assignment' | 'project_phase';
  entityId: string;
  entityName: string;
  syncOperationId: string;
}

export class GitConflictResolver {
  /**
   * Detect conflicts between BASE, LOCAL, and REMOTE versions
   * Task: T046
   *
   * 3-Way Merge Algorithm:
   * - BASE == LOCAL && BASE != REMOTE → Accept REMOTE (remote changed, we didn't)
   * - BASE != LOCAL && BASE == REMOTE → Accept LOCAL (we changed, remote didn't)
   * - LOCAL == REMOTE → Accept either (both made same change)
   * - BASE != LOCAL && BASE != REMOTE && LOCAL != REMOTE → CONFLICT
   */
  detectConflicts(
    baseEntity: Record<string, any>,
    localEntity: Record<string, any>,
    remoteEntity: Record<string, any>,
    context: EntityConflictContext
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Get all fields from all versions
    const allFields = new Set([
      ...Object.keys(baseEntity || {}),
      ...Object.keys(localEntity || {}),
      ...Object.keys(remoteEntity || {}),
    ]);

    for (const field of allFields) {
      // Skip system fields that shouldn't conflict
      if (['id', 'createdAt', 'updatedAt'].includes(field)) {
        continue;
      }

      const baseValue = baseEntity?.[field];
      const localValue = localEntity?.[field];
      const remoteValue = remoteEntity?.[field];

      const mergeResult = this.mergeField(
        { base: baseValue, local: localValue, remote: remoteValue },
        field,
        context
      );

      if (mergeResult.hasConflict && mergeResult.conflict) {
        conflicts.push(mergeResult.conflict);
      }
    }

    return conflicts;
  }

  /**
   * Merge a single field using 3-way merge algorithm
   * Task: T046
   */
  private mergeField(
    input: MergeInput,
    fieldName: string,
    context: EntityConflictContext
  ): MergeResult {
    const { base, local, remote } = input;

    // Case 1: All three are equal - no conflict
    if (this.isEqual(base, local) && this.isEqual(base, remote)) {
      return { hasConflict: false, resolvedValue: local };
    }

    // Case 2: Local and remote are equal (both made same change)
    if (this.isEqual(local, remote)) {
      return { hasConflict: false, resolvedValue: local };
    }

    // Case 3: Base == Local, but Remote changed (accept remote)
    if (this.isEqual(base, local) && !this.isEqual(base, remote)) {
      return { hasConflict: false, resolvedValue: remote };
    }

    // Case 4: Base == Remote, but Local changed (accept local)
    if (this.isEqual(base, remote) && !this.isEqual(base, local)) {
      return { hasConflict: false, resolvedValue: local };
    }

    // Case 5: All three are different - CONFLICT
    return {
      hasConflict: true,
      conflict: {
        id: this.generateConflictId(),
        syncOperationId: context.syncOperationId,
        entityType: context.entityType,
        entityId: context.entityId,
        entityName: context.entityName,
        field: fieldName,
        baseValue: this.serializeValue(base),
        localValue: this.serializeValue(local),
        remoteValue: this.serializeValue(remote),
        resolutionStatus: 'pending',
      },
    };
  }

  /**
   * Auto-merge non-conflicting changes
   * Task: T047
   *
   * Attempts to automatically merge changes where possible:
   * - Non-overlapping field changes
   * - Same field changed to same value
   * - Only one side changed
   */
  autoMerge(
    baseEntity: Record<string, any>,
    localEntity: Record<string, any>,
    remoteEntity: Record<string, any>
  ): {
    merged: Record<string, any>;
    conflicts: string[];
  } {
    const merged: Record<string, any> = { ...baseEntity };
    const conflictingFields: string[] = [];

    const allFields = new Set([
      ...Object.keys(baseEntity || {}),
      ...Object.keys(localEntity || {}),
      ...Object.keys(remoteEntity || {}),
    ]);

    for (const field of allFields) {
      if (['id', 'createdAt', 'updatedAt'].includes(field)) {
        merged[field] = localEntity?.[field] ?? baseEntity?.[field];
        continue;
      }

      const baseValue = baseEntity?.[field];
      const localValue = localEntity?.[field];
      const remoteValue = remoteEntity?.[field];

      // All equal - use any
      if (this.isEqual(baseValue, localValue) && this.isEqual(baseValue, remoteValue)) {
        merged[field] = localValue;
      }
      // Local and remote equal (same change)
      else if (this.isEqual(localValue, remoteValue)) {
        merged[field] = localValue;
      }
      // Only remote changed
      else if (this.isEqual(baseValue, localValue)) {
        merged[field] = remoteValue;
      }
      // Only local changed
      else if (this.isEqual(baseValue, remoteValue)) {
        merged[field] = localValue;
      }
      // Both changed to different values - conflict
      else {
        conflictingFields.push(field);
        // Keep local value for now (user must resolve)
        merged[field] = localValue;
      }
    }

    return {
      merged,
      conflicts: conflictingFields,
    };
  }

  /**
   * Apply conflict resolution
   */
  applyResolution(
    conflict: Conflict,
    resolution: 'accept_local' | 'accept_remote' | 'custom',
    customValue?: any
  ): any {
    switch (resolution) {
      case 'accept_local':
        return this.deserializeValue(conflict.localValue);
      case 'accept_remote':
        return this.deserializeValue(conflict.remoteValue);
      case 'custom':
        return customValue;
      default:
        throw new Error(`Invalid resolution type: ${resolution}`);
    }
  }

  /**
   * Deep equality check
   */
  private isEqual(a: any, b: any): boolean {
    // Handle null/undefined
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.isEqual(val, b[idx]));
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((key) => this.isEqual(a[key], b[key]));
    }

    // Primitive comparison
    return a === b;
  }

  /**
   * Serialize value for storage
   */
  private serializeValue(value: any): any {
    if (value === undefined || value === null) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Deserialize value from storage
   */
  private deserializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Try to parse as JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        // Try to parse as date
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        return value;
      }
    }

    return value;
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get textual diff between two values for display
   */
  getTextualDiff(value1: string, value2: string): string {
    const diff = diffWords(String(value1 || ''), String(value2 || ''));

    return diff
      .map((part) => {
        if (part.added) return `+${part.value}`;
        if (part.removed) return `-${part.value}`;
        return part.value;
      })
      .join('');
  }
}

/**
 * Change History Parser Service
 * Feature: 001-git-sync-integration
 * Task: T071
 *
 * Parses Git diffs into entity-level changes for display
 */

import type { Knex } from 'knex';

export interface EntityChange {
  entityType: 'project' | 'person' | 'assignment' | 'project_phase';
  entityId: string;
  entityName: string;
  changeType: 'created' | 'updated' | 'deleted';
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  author: string;
  commitHash: string;
  commitMessage: string;
}

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author_name: string;
  author_email: string;
}

export class ChangeHistoryParser {
  constructor(private db: Knex) {}

  /**
   * Parse commit history into entity changes
   *
   * @param commits - Array of commits from git log
   * @returns Array of entity changes
   */
  async parseCommitHistory(commits: CommitInfo[]): Promise<EntityChange[]> {
    const changes: EntityChange[] = [];

    for (const commit of commits) {
      // Extract entity changes from commit message
      // This is a simplified approach - in production, you'd parse actual diffs
      const entityChanges = this.parseCommitMessage(commit);
      changes.push(...entityChanges);
    }

    return changes;
  }

  /**
   * Parse commit message to extract entity changes
   * This is a heuristic approach based on commit message patterns
   */
  private parseCommitMessage(commit: CommitInfo): EntityChange[] {
    const changes: EntityChange[] = [];
    const message = commit.message.toLowerCase();

    // Simple pattern matching for common operations
    // In production, you'd parse actual JSON diffs from commit data

    // Match "Updated scenario data: X projects, Y people, Z assignments"
    const scenarioMatch = message.match(/(\d+)\s+(project|person|people|assignment|phase)/g);

    if (scenarioMatch) {
      for (const match of scenarioMatch) {
        const [count, type] = match.split(/\s+/);
        const entityType = this.normalizeEntityType(type);

        changes.push({
          entityType,
          entityId: 'bulk',
          entityName: `${count} ${type}`,
          changeType: 'updated',
          timestamp: commit.date,
          author: commit.author_name,
          commitHash: commit.hash,
          commitMessage: commit.message,
        });
      }
    }

    return changes;
  }

  /**
   * Get change history for a specific entity
   *
   * @param entityType - Type of entity
   * @param entityId - Entity ID
   * @param commits - Commits to search through
   * @returns Filtered entity changes
   */
  async getEntityHistory(
    entityType: 'project' | 'person' | 'assignment' | 'project_phase',
    entityId: string,
    commits: CommitInfo[]
  ): Promise<EntityChange[]> {
    // In a full implementation, this would:
    // 1. Get all commits that touched the entity's JSON file
    // 2. Parse the JSON diff for each commit
    // 3. Extract only changes to the specific entity ID

    const allChanges = await this.parseCommitHistory(commits);
    return allChanges.filter(
      (change) => change.entityType === entityType && change.entityId === entityId
    );
  }

  /**
   * Get detailed diff for a specific commit and entity
   *
   * @param commitHash - Commit hash
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Detailed field-level changes
   */
  async getCommitEntityDiff(
    commitHash: string,
    entityType: string,
    entityId: string
  ): Promise<EntityChange[]> {
    // In production, this would:
    // 1. Get the commit diff for the entity's JSON file
    // 2. Parse the JSON before and after
    // 3. Compare field by field
    // 4. Return detailed field-level changes

    return [];
  }

  /**
   * Normalize entity type string
   */
  private normalizeEntityType(type: string): 'project' | 'person' | 'assignment' | 'project_phase' {
    const normalized = type.toLowerCase();

    if (normalized.includes('project') && !normalized.includes('phase')) {
      return 'project';
    }
    if (normalized.includes('people') || normalized.includes('person')) {
      return 'person';
    }
    if (normalized.includes('assignment')) {
      return 'assignment';
    }
    if (normalized.includes('phase')) {
      return 'project_phase';
    }

    return 'project'; // Default
  }

  /**
   * Format change for display
   */
  formatChange(change: EntityChange): string {
    const { entityName, changeType, field, oldValue, newValue } = change;

    if (changeType === 'created') {
      return `Created ${entityName}`;
    }

    if (changeType === 'deleted') {
      return `Deleted ${entityName}`;
    }

    if (field) {
      return `Updated ${entityName}: ${field} changed from "${oldValue}" to "${newValue}"`;
    }

    return `Updated ${entityName}`;
  }

  /**
   * Group changes by entity
   */
  groupByEntity(changes: EntityChange[]): Map<string, EntityChange[]> {
    const grouped = new Map<string, EntityChange[]>();

    for (const change of changes) {
      const key = `${change.entityType}:${change.entityId}`;
      const existing = grouped.get(key) || [];
      existing.push(change);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * Get change summary statistics
   */
  getChangeSummary(changes: EntityChange[]): {
    created: number;
    updated: number;
    deleted: number;
    byType: Record<string, number>;
  } {
    const summary = {
      created: 0,
      updated: 0,
      deleted: 0,
      byType: {} as Record<string, number>,
    };

    for (const change of changes) {
      // Count by change type
      if (change.changeType === 'created') summary.created++;
      if (change.changeType === 'updated') summary.updated++;
      if (change.changeType === 'deleted') summary.deleted++;

      // Count by entity type
      const type = change.entityType;
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    }

    return summary;
  }
}

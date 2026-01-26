/**
 * Scenario Comparator Service
 * Feature: 001-git-sync-integration
 * Task: T072
 *
 * Compares scenarios across different branches
 */

import fs from 'fs/promises';
import path from 'path';

export interface ScenarioDifference {
  entityType: 'project' | 'person' | 'assignment' | 'project_phase';
  entityId: string;
  entityName: string;
  differenceType: 'added' | 'removed' | 'modified';
  baseValue?: any;
  targetValue?: any;
  modifiedFields?: string[];
}

export interface ComparisonResult {
  baseBranch: string;
  targetBranch: string;
  differences: ScenarioDifference[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    byType: Record<string, { added: number; removed: number; modified: number }>;
  };
}

export class ScenarioComparator {
  constructor(private repoPath: string) {}

  /**
   * Compare two branches/scenarios
   *
   * @param baseBranch - Base branch to compare from
   * @param targetBranch - Target branch to compare to
   * @returns Comparison result with differences
   */
  async compareBranches(baseBranch: string, targetBranch: string): Promise<ComparisonResult> {
    const differences: ScenarioDifference[] = [];

    // Get scenario directories for both branches
    const baseDir = path.join(this.repoPath, 'scenarios', baseBranch === 'main' ? 'working' : baseBranch);
    const targetDir = path.join(this.repoPath, 'scenarios', targetBranch === 'main' ? 'working' : targetBranch);

    // Compare each entity type
    const projectDiffs = await this.compareEntityFile(baseDir, targetDir, 'projects.json', 'project');
    const peopleDiffs = await this.compareEntityFile(baseDir, targetDir, 'people.json', 'person');
    const assignmentDiffs = await this.compareEntityFile(baseDir, targetDir, 'assignments.json', 'assignment');
    const phaseDiffs = await this.compareEntityFile(baseDir, targetDir, 'project_phases.json', 'project_phase');

    differences.push(...projectDiffs, ...peopleDiffs, ...assignmentDiffs, ...phaseDiffs);

    // Calculate summary
    const summary = this.calculateSummary(differences);

    return {
      baseBranch,
      targetBranch,
      differences,
      summary,
    };
  }

  /**
   * Compare a single entity file between branches
   */
  private async compareEntityFile(
    baseDir: string,
    targetDir: string,
    fileName: string,
    entityType: 'project' | 'person' | 'assignment' | 'project_phase'
  ): Promise<ScenarioDifference[]> {
    const differences: ScenarioDifference[] = [];

    try {
      // Read both files
      const baseData = await this.readJSONFile(path.join(baseDir, fileName));
      const targetData = await this.readJSONFile(path.join(targetDir, fileName));

      const baseEntities = baseData.data || [];
      const targetEntities = targetData.data || [];

      // Create maps for quick lookup
      const baseMap = new Map<string, any>(baseEntities.map((e: any) => [e.id as string, e]));
      const targetMap = new Map<string, any>(targetEntities.map((e: any) => [e.id as string, e]));

      // Find added entities (in target but not in base)
      for (const [id, entity] of targetMap) {
        if (!baseMap.has(id)) {
          differences.push({
            entityType,
            entityId: id,
            entityName: this.getEntityName(entity, entityType),
            differenceType: 'added',
            targetValue: entity,
          });
        }
      }

      // Find removed entities (in base but not in target)
      for (const [id, entity] of baseMap) {
        if (!targetMap.has(id)) {
          differences.push({
            entityType,
            entityId: id,
            entityName: this.getEntityName(entity, entityType),
            differenceType: 'removed',
            baseValue: entity,
          });
        }
      }

      // Find modified entities (in both but different)
      for (const [id, baseEntity] of baseMap) {
        const targetEntity = targetMap.get(id);
        if (targetEntity) {
          const modifiedFields = this.getModifiedFields(baseEntity, targetEntity);
          if (modifiedFields.length > 0) {
            differences.push({
              entityType,
              entityId: id,
              entityName: this.getEntityName(baseEntity, entityType),
              differenceType: 'modified',
              baseValue: baseEntity,
              targetValue: targetEntity,
              modifiedFields,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error comparing ${fileName}:`, error);
    }

    return differences;
  }

  /**
   * Read JSON file
   */
  private async readJSONFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { data: [] };
    }
  }

  /**
   * Get entity name for display
   */
  private getEntityName(entity: any, entityType: string): string {
    switch (entityType) {
      case 'project':
        return entity.name || 'Unknown Project';
      case 'person':
        return `${entity.first_name || ''} ${entity.last_name || ''}`.trim() || 'Unknown Person';
      case 'assignment':
        return `Assignment ${entity.id}`;
      case 'project_phase':
        return entity.name || 'Unknown Phase';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get list of modified fields between two entities
   */
  private getModifiedFields(baseEntity: any, targetEntity: any): string[] {
    const modifiedFields: string[] = [];
    const allFields = new Set([
      ...Object.keys(baseEntity || {}),
      ...Object.keys(targetEntity || {}),
    ]);

    for (const field of allFields) {
      // Skip system fields
      if (['id', 'createdAt', 'updatedAt'].includes(field)) {
        continue;
      }

      const baseValue = baseEntity[field];
      const targetValue = targetEntity[field];

      if (JSON.stringify(baseValue) !== JSON.stringify(targetValue)) {
        modifiedFields.push(field);
      }
    }

    return modifiedFields;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(differences: ScenarioDifference[]): ComparisonResult['summary'] {
    const summary = {
      added: 0,
      removed: 0,
      modified: 0,
      byType: {} as Record<string, { added: number; removed: number; modified: number }>,
    };

    for (const diff of differences) {
      // Count overall
      if (diff.differenceType === 'added') summary.added++;
      if (diff.differenceType === 'removed') summary.removed++;
      if (diff.differenceType === 'modified') summary.modified++;

      // Count by type
      if (!summary.byType[diff.entityType]) {
        summary.byType[diff.entityType] = { added: 0, removed: 0, modified: 0 };
      }
      if (diff.differenceType === 'added') summary.byType[diff.entityType].added++;
      if (diff.differenceType === 'removed') summary.byType[diff.entityType].removed++;
      if (diff.differenceType === 'modified') summary.byType[diff.entityType].modified++;
    }

    return summary;
  }

  /**
   * Get human-readable diff description
   */
  describeDifference(diff: ScenarioDifference): string {
    const { entityName, differenceType, modifiedFields } = diff;

    switch (differenceType) {
      case 'added':
        return `Added: ${entityName}`;
      case 'removed':
        return `Removed: ${entityName}`;
      case 'modified':
        return `Modified: ${entityName} (${modifiedFields?.join(', ')})`;
      default:
        return `Changed: ${entityName}`;
    }
  }
}

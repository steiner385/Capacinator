/**
 * Scenario data exporter/importer for Git sync
 * Feature: 001-git-sync-integration
 *
 * Handles SQLite ↔ JSON transformations for scenario data
 */

import type { Knex } from 'knex';
import fs from 'fs/promises';
import path from 'path';
import {
  ProjectJSONSchema,
  PersonJSONSchema,
  AssignmentJSONSchema,
  ProjectPhaseJSONSchema,
  SCHEMA_VERSION,
} from '../../../../shared/types/json-schemas.js';
import type { ScenarioExportData } from '../../../../shared/types/git-entities.js';

export class ScenarioExporter {
  constructor(private db: Knex, private repoPath: string) {}

  /**
   * Write JSON data to file
   *
   * @param filePath - Absolute file path
   * @param data - Data to write
   */
  private async writeJSON(filePath: string, data: any): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Read JSON file with corruption recovery
   * Task: T097
   *
   * @param filePath - Absolute file path
   * @returns Parsed JSON data
   * @throws Error if file is completely corrupted or missing
   */
  private async readJSON(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Attempt to parse JSON
      try {
        return JSON.parse(content);
      } catch (parseError) {
        // JSON is corrupted - attempt recovery
        console.error(`JSON parse error in ${filePath}:`, parseError);

        // Try to recover by cleaning common issues
        const recovered = this.attemptJSONRecovery(content, filePath);
        if (recovered) {
          console.warn(`Successfully recovered corrupted JSON from ${filePath}`);
          return recovered;
        }

        throw new Error(`Corrupted JSON file could not be recovered: ${filePath}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Attempt to recover corrupted JSON
   * Task: T097
   *
   * @param content - Raw file content
   * @param filePath - File path for logging
   * @returns Recovered JSON object or null
   */
  private attemptJSONRecovery(content: string, filePath: string): any | null {
    const recoveryAttempts = [
      // Attempt 1: Remove trailing commas
      () => {
        const fixed = content.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(fixed);
      },

      // Attempt 2: Fix truncated JSON (add closing brackets)
      () => {
        let fixed = content.trim();
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;

        // Add missing closing brackets
        fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
        fixed += '}'.repeat(Math.max(0, openBraces - closeBraces));

        return JSON.parse(fixed);
      },

      // Attempt 3: Extract valid JSON array from partial content
      () => {
        const match = content.match(/"data"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
        if (match) {
          const dataContent = match[1].trim();
          // Try to parse individual records
          const recovered = this.recoverJSONArray(dataContent);
          if (recovered.length > 0) {
            return {
              schemaVersion: SCHEMA_VERSION,
              exportedAt: new Date().toISOString(),
              exportedBy: 'recovery',
              scenarioId: 'recovered',
              data: recovered,
            };
          }
        }
        return null;
      },
    ];

    for (let i = 0; i < recoveryAttempts.length; i++) {
      try {
        const result = recoveryAttempts[i]();
        if (result) {
          console.warn(`Recovery attempt ${i + 1} succeeded for ${filePath}`);
          return result;
        }
      } catch {
        // Try next recovery attempt
        continue;
      }
    }

    return null;
  }

  /**
   * Recover individual records from a partially corrupted JSON array
   * Task: T097
   *
   * @param arrayContent - Content between [ and ]
   * @returns Array of recovered objects
   */
  private recoverJSONArray(arrayContent: string): any[] {
    const recovered: any[] = [];

    // Split by top-level commas (not inside objects)
    let depth = 0;
    let currentRecord = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < arrayContent.length; i++) {
      const char = arrayContent[i];

      if (escapeNext) {
        currentRecord += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentRecord += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;

        if (char === ',' && depth === 0) {
          // Found a top-level comma - try to parse current record
          const trimmed = currentRecord.trim();
          if (trimmed) {
            try {
              const parsed = JSON.parse(trimmed);
              recovered.push(parsed);
            } catch {
              console.warn('Failed to parse record, skipping:', trimmed.substring(0, 100));
            }
          }
          currentRecord = '';
          continue;
        }
      }

      currentRecord += char;
    }

    // Parse last record
    const trimmed = currentRecord.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        recovered.push(parsed);
      } catch {
        console.warn('Failed to parse last record, skipping:', trimmed.substring(0, 100));
      }
    }

    return recovered;
  }

  /**
   * Get current user email for export metadata
   *
   * @returns User email or undefined
   */
  private getCurrentUserEmail(): string | undefined {
    // TODO: Integrate with authentication context
    // For now, return undefined
    return undefined;
  }

  /**
   * Create export data wrapper
   *
   * @param scenarioId - Scenario identifier
   * @param data - Entity data array
   * @returns Export data object
   */
  private createExportData(scenarioId: string, data: any[]): ScenarioExportData {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: this.getCurrentUserEmail(),
      scenarioId,
      data,
    };
  }

  /**
   * Get scenario directory path
   *
   * @param scenarioId - Scenario identifier
   * @returns Absolute path to scenario directory
   */
  getScenarioDir(scenarioId: string): string {
    return path.join(this.repoPath, 'scenarios', scenarioId);
  }

  /**
   * Check if scenario directory exists
   *
   * @param scenarioId - Scenario identifier
   * @returns True if directory exists
   */
  async scenarioExists(scenarioId: string): Promise<boolean> {
    try {
      await fs.access(this.getScenarioDir(scenarioId));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export scenario data to JSON files
   * Task: T021
   *
   * @param scenarioId - Scenario identifier (e.g., "working", "committed")
   */
  async exportToJSON(scenarioId: string): Promise<void> {
    const scenarioDir = this.getScenarioDir(scenarioId);

    // Export projects
    const projects = await this.db('projects').select('*');
    await this.writeJSON(`${scenarioDir}/projects.json`, this.createExportData(scenarioId, projects));

    // Export people
    const people = await this.db('people').select('*');
    await this.writeJSON(`${scenarioDir}/people.json`, this.createExportData(scenarioId, people));

    // Export assignments
    const assignments = await this.db('project_assignments').select('*');
    await this.writeJSON(`${scenarioDir}/assignments.json`, this.createExportData(scenarioId, assignments));

    // Export project phases
    const phases = await this.db('project_phases').select('*');
    await this.writeJSON(`${scenarioDir}/project_phases.json`, this.createExportData(scenarioId, phases));
  }

  /**
   * Import scenario data from JSON files with Zod validation and partial recovery
   * Task: T022, T023, T097
   *
   * @param scenarioId - Scenario identifier
   * @returns Import result with counts and errors
   */
  async importFromJSON(scenarioId: string): Promise<{
    success: boolean;
    imported: { projects: number; people: number; assignments: number; phases: number };
    errors: Array<{ entity: string; error: string; recordsSkipped: number }>;
  }> {
    const scenarioDir = this.getScenarioDir(scenarioId);
    const errors: Array<{ entity: string; error: string; recordsSkipped: number }> = [];
    const imported = { projects: 0, people: 0, assignments: 0, phases: 0 };

    // Import projects with partial recovery
    try {
      const projectsData = await this.readJSON(`${scenarioDir}/projects.json`);
      const { valid, invalid } = this.validateWithPartialRecovery(
        projectsData.data || [],
        ProjectJSONSchema,
        'project'
      );

      if (invalid.length > 0) {
        errors.push({
          entity: 'projects',
          error: `${invalid.length} invalid record(s) skipped`,
          recordsSkipped: invalid.length,
        });
        console.warn(`Skipped ${invalid.length} invalid project records:`, invalid.slice(0, 5));
      }

      await this.importProjects(valid);
      imported.projects = valid.length;
    } catch (error) {
      errors.push({
        entity: 'projects',
        error: (error as Error).message,
        recordsSkipped: 0,
      });
    }

    // Import people with partial recovery
    try {
      const peopleData = await this.readJSON(`${scenarioDir}/people.json`);
      const { valid, invalid } = this.validateWithPartialRecovery(peopleData.data || [], PersonJSONSchema, 'person');

      if (invalid.length > 0) {
        errors.push({
          entity: 'people',
          error: `${invalid.length} invalid record(s) skipped`,
          recordsSkipped: invalid.length,
        });
        console.warn(`Skipped ${invalid.length} invalid people records:`, invalid.slice(0, 5));
      }

      await this.importPeople(valid);
      imported.people = valid.length;
    } catch (error) {
      errors.push({
        entity: 'people',
        error: (error as Error).message,
        recordsSkipped: 0,
      });
    }

    // Import assignments with partial recovery
    try {
      const assignmentsData = await this.readJSON(`${scenarioDir}/assignments.json`);
      const { valid, invalid } = this.validateWithPartialRecovery(
        assignmentsData.data || [],
        AssignmentJSONSchema,
        'assignment'
      );

      if (invalid.length > 0) {
        errors.push({
          entity: 'assignments',
          error: `${invalid.length} invalid record(s) skipped`,
          recordsSkipped: invalid.length,
        });
        console.warn(`Skipped ${invalid.length} invalid assignment records:`, invalid.slice(0, 5));
      }

      await this.importAssignments(valid);
      imported.assignments = valid.length;
    } catch (error) {
      errors.push({
        entity: 'assignments',
        error: (error as Error).message,
        recordsSkipped: 0,
      });
    }

    // Import project phases with partial recovery
    try {
      const phasesData = await this.readJSON(`${scenarioDir}/project_phases.json`);
      const { valid, invalid } = this.validateWithPartialRecovery(
        phasesData.data || [],
        ProjectPhaseJSONSchema,
        'project_phase'
      );

      if (invalid.length > 0) {
        errors.push({
          entity: 'project_phases',
          error: `${invalid.length} invalid record(s) skipped`,
          recordsSkipped: invalid.length,
        });
        console.warn(`Skipped ${invalid.length} invalid project phase records:`, invalid.slice(0, 5));
      }

      await this.importProjectPhases(valid);
      imported.phases = valid.length;
    } catch (error) {
      errors.push({
        entity: 'project_phases',
        error: (error as Error).message,
        recordsSkipped: 0,
      });
    }

    return {
      success: errors.length === 0 || errors.every((e) => e.recordsSkipped > 0),
      imported,
      errors,
    };
  }

  /**
   * Validate array of records with partial recovery
   * Task: T097
   *
   * @param records - Array of records to validate
   * @param schema - Zod schema for individual records
   * @param entityType - Entity type for logging
   * @returns Object with valid and invalid arrays
   */
  private validateWithPartialRecovery(
    records: any[],
    schema: any,
    entityType: string
  ): { valid: any[]; invalid: Array<{ record: any; error: string }> } {
    const valid: any[] = [];
    const invalid: Array<{ record: any; error: string }> = [];

    for (const record of records) {
      try {
        // Validate individual record (the schema validates the wrapper, so we need to validate just the record)
        schema.parse({
          schemaVersion: SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          exportedBy: 'import',
          scenarioId: 'import',
          data: [record],
        });

        valid.push(record);
      } catch (error) {
        invalid.push({
          record: record,
          error: error instanceof Error ? error.message : String(error),
        });
        console.warn(`Invalid ${entityType} record (ID: ${record?.id || 'unknown'}):`, error);
      }
    }

    return { valid, invalid };
  }

  /**
   * Import projects into database (bulk insert with transaction)
   */
  private async importProjects(projects: any[]): Promise<void> {
    await this.db.transaction(async (trx) => {
      // Clear existing
      await trx('projects').del();

      // Bulk insert with batch size 100
      if (projects.length > 0) {
        await trx.batchInsert('projects', projects, 100);
      }
    });
  }

  /**
   * Import people into database
   */
  private async importPeople(people: any[]): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx('people').del();
      if (people.length > 0) {
        await trx.batchInsert('people', people, 100);
      }
    });
  }

  /**
   * Import assignments into database
   */
  private async importAssignments(assignments: any[]): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx('project_assignments').del();
      if (assignments.length > 0) {
        await trx.batchInsert('project_assignments', assignments, 100);
      }
    });
  }

  /**
   * Import project phases into database
   */
  private async importProjectPhases(phases: any[]): Promise<void> {
    await this.db.transaction(async (trx) => {
      await trx('project_phases').del();
      if (phases.length > 0) {
        await trx.batchInsert('project_phases', phases, 100);
      }
    });
  }

  /**
   * Generate automatic commit message based on changed entities
   * Task: T024
   *
   * @param scenarioId - Scenario identifier
   * @returns Generated commit message
   */
  async generateCommitMessage(scenarioId: string): Promise<string> {
    const scenarioDir = this.getScenarioDir(scenarioId);

    try {
      // Read all entity files to count records
      const [projectsData, peopleData, assignmentsData, phasesData] = await Promise.all([
        this.readJSON(`${scenarioDir}/projects.json`).catch(() => ({ data: [] })),
        this.readJSON(`${scenarioDir}/people.json`).catch(() => ({ data: [] })),
        this.readJSON(`${scenarioDir}/assignments.json`).catch(() => ({ data: [] })),
        this.readJSON(`${scenarioDir}/project_phases.json`).catch(() => ({ data: [] })),
      ]);

      const projectCount = projectsData.data?.length || 0;
      const peopleCount = peopleData.data?.length || 0;
      const assignmentCount = assignmentsData.data?.length || 0;
      const phaseCount = phasesData.data?.length || 0;

      // Generate descriptive message
      const parts: string[] = [];
      if (projectCount > 0) parts.push(`${projectCount} project${projectCount !== 1 ? 's' : ''}`);
      if (peopleCount > 0) parts.push(`${peopleCount} ${peopleCount !== 1 ? 'people' : 'person'}`);
      if (assignmentCount > 0) parts.push(`${assignmentCount} assignment${assignmentCount !== 1 ? 's' : ''}`);
      if (phaseCount > 0) parts.push(`${phaseCount} phase${phaseCount !== 1 ? 's' : ''}`);

      const summary = parts.join(', ') || 'no data';
      const timestamp = new Date().toISOString();

      return `Updated scenario data: ${summary} (${timestamp})`;
    } catch {
      // Fallback message if unable to read files
      return `Updated scenario data (${new Date().toISOString()})`;
    }
  }

  /**
   * Detect conflicts between current database state and incoming JSON
   * Task: T048
   *
   * This is called after a Git pull to detect data-level conflicts
   * between the local database state and the pulled JSON files
   *
   * @param scenarioId - Scenario identifier
   * @param syncOperationId - Sync operation ID for conflict tracking
   * @returns Array of detected conflicts
   */
  async detectConflictsAfterPull(
    scenarioId: string,
    syncOperationId: string
  ): Promise<import('../../../../shared/types/git-entities.js').Conflict[]> {
    // Import GitConflictResolver
    const { GitConflictResolver } = await import('./GitConflictResolver.js');
    const resolver = new GitConflictResolver();

    const scenarioDir = this.getScenarioDir(scenarioId);
    const allConflicts: import('../../../../shared/types/git-entities.js').Conflict[] = [];

    try {
      // For now, we'll detect conflicts by comparing JSON to database
      // In a full implementation, we'd compare BASE/LOCAL/REMOTE versions

      // Read JSON files (REMOTE version after pull)
      const [projectsData, peopleData, assignmentsData] = await Promise.all([
        this.readJSON(`${scenarioDir}/projects.json`).catch(() => ({ data: [] })),
        this.readJSON(`${scenarioDir}/people.json`).catch(() => ({ data: [] })),
        this.readJSON(`${scenarioDir}/assignments.json`).catch(() => ({ data: [] })),
      ]);
      // phasesData available via: this.readJSON(`${scenarioDir}/project_phases.json`)

      // Get current database state (LOCAL version)
      const localProjects = await this.db('projects').select('*');
      const localPeople = await this.db('people').select('*');
      const localAssignments = await this.db('project_assignments').select('*');
      // localPhases available via this.db('project_phases').select('*') if needed

      // For simplicity, we'll use the JSON as BASE (since we don't have true git merge-base)
      // In production, you'd use git show merge-base:path to get true BASE

      // Detect project conflicts
      for (const remoteProject of projectsData.data || []) {
        const localProject = localProjects.find((p: any) => p.id === remoteProject.id);
        if (localProject) {
          const conflicts = resolver.detectConflicts(
            remoteProject, // Using remote as pseudo-BASE for now
            localProject,
            remoteProject,
            {
              entityType: 'project',
              entityId: remoteProject.id,
              entityName: remoteProject.name || 'Unknown Project',
              syncOperationId,
            }
          );
          allConflicts.push(...conflicts);
        }
      }

      // Detect people conflicts
      for (const remotePerson of peopleData.data || []) {
        const localPerson = localPeople.find((p: any) => p.id === remotePerson.id);
        if (localPerson) {
          const conflicts = resolver.detectConflicts(
            remotePerson,
            localPerson,
            remotePerson,
            {
              entityType: 'person',
              entityId: remotePerson.id,
              entityName: `${remotePerson.first_name} ${remotePerson.last_name}`,
              syncOperationId,
            }
          );
          allConflicts.push(...conflicts);
        }
      }

      // Detect assignment conflicts
      for (const remoteAssignment of assignmentsData.data || []) {
        const localAssignment = localAssignments.find((a: any) => a.id === remoteAssignment.id);
        if (localAssignment) {
          const conflicts = resolver.detectConflicts(
            remoteAssignment,
            localAssignment,
            remoteAssignment,
            {
              entityType: 'assignment',
              entityId: remoteAssignment.id,
              entityName: `Assignment ${remoteAssignment.id}`,
              syncOperationId,
            }
          );
          allConflicts.push(...conflicts);
        }
      }

      return allConflicts;
    } catch (error) {
      console.error('Conflict detection failed:', error);
      return [];
    }
  }
}

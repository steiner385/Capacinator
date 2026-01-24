/**
 * Conflict Validator Service
 * Feature: 001-git-sync-integration
 * Task: T049, T050
 *
 * Validates domain-specific constraints during conflict resolution
 * Detects over-allocation and other business rule violations
 */

import type { Knex } from 'knex';

interface OverAllocationWarning {
  personId: string;
  personName: string;
  timeframe: string;
  totalAllocation: number;
  affectedAssignments: Array<{
    assignmentId: string;
    projectName: string;
    allocation: number;
  }>;
}

interface ValidationResult {
  valid: boolean;
  warnings: OverAllocationWarning[];
  errors: string[];
}

export class ConflictValidator {
  constructor(private db: Knex) {}

  /**
   * Validate assignment conflict resolution
   * Task: T049, T050
   *
   * Checks for over-allocation when resolving assignment conflicts
   */
  async validateAssignmentResolution(
    assignmentId: string,
    proposedAllocation: number
  ): Promise<ValidationResult> {
    const warnings: OverAllocationWarning[] = [];
    const errors: string[] = [];

    // Get the assignment details
    const assignment = await this.db('project_assignments')
      .where('id', assignmentId)
      .first();

    if (!assignment) {
      errors.push(`Assignment ${assignmentId} not found`);
      return { valid: false, warnings, errors };
    }

    // Check for over-allocation in the same timeframe
    const overAllocationWarnings = await this.checkOverAllocation(
      assignment.person_id,
      assignment.start_date,
      assignment.end_date,
      proposedAllocation,
      assignmentId
    );

    warnings.push(...overAllocationWarnings);

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Check if person is over-allocated in a timeframe
   * Task: T050
   *
   * Calculates total allocation and warns if > 100%
   */
  async checkOverAllocation(
    personId: string,
    startDate: string,
    endDate: string,
    newAllocation: number,
    excludeAssignmentId?: string
  ): Promise<OverAllocationWarning[]> {
    const warnings: OverAllocationWarning[] = [];

    // Get person details
    const person = await this.db('people')
      .where('id', personId)
      .first();

    if (!person) {
      return warnings;
    }

    // Get all overlapping assignments for this person
    const overlappingAssignments = await this.db('project_assignments as pa')
      .join('projects as p', 'pa.project_id', 'p.id')
      .where('pa.person_id', personId)
      .where((builder) => {
        if (excludeAssignmentId) {
          builder.whereNot('pa.id', excludeAssignmentId);
        }
      })
      .where((builder) => {
        // Assignments that overlap with the given date range
        builder
          .where((b) => {
            // Assignment starts during our period
            b.whereBetween('pa.start_date', [startDate, endDate]);
          })
          .orWhere((b) => {
            // Assignment ends during our period
            b.whereBetween('pa.end_date', [startDate, endDate]);
          })
          .orWhere((b) => {
            // Assignment completely contains our period
            b.where('pa.start_date', '<=', startDate).where('pa.end_date', '>=', endDate);
          });
      })
      .select(
        'pa.id as assignmentId',
        'p.name as projectName',
        'pa.allocation_percent as allocation',
        'pa.start_date',
        'pa.end_date'
      );

    // Calculate total allocation including the new one
    const totalAllocation = overlappingAssignments.reduce(
      (sum, a) => sum + (a.allocation || 0),
      0
    ) + newAllocation;

    if (totalAllocation > 100) {
      warnings.push({
        personId,
        personName: `${person.first_name} ${person.last_name}`,
        timeframe: `${startDate} to ${endDate}`,
        totalAllocation,
        affectedAssignments: overlappingAssignments.map((a) => ({
          assignmentId: a.assignmentId,
          projectName: a.projectName,
          allocation: a.allocation,
        })),
      });
    }

    return warnings;
  }

  /**
   * Validate project conflict resolution
   * Ensures project dates are valid and phases are within project bounds
   */
  async validateProjectResolution(projectId: string): Promise<ValidationResult> {
    const warnings: OverAllocationWarning[] = [];
    const errors: string[] = [];

    const project = await this.db('projects')
      .where('id', projectId)
      .first();

    if (!project) {
      errors.push(`Project ${projectId} not found`);
      return { valid: false, warnings, errors };
    }

    // Check if project dates are valid
    if (project.start_date && project.end_date) {
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);

      if (endDate < startDate) {
        errors.push('Project end date cannot be before start date');
      }
    }

    // Check if phases are within project bounds
    if (project.start_date && project.end_date) {
      const phases = await this.db('project_phases')
        .where('project_id', projectId)
        .select('id', 'name', 'start_date', 'end_date');

      for (const phase of phases) {
        if (phase.start_date < project.start_date) {
          errors.push(
            `Phase "${phase.name}" starts before project start date`
          );
        }
        if (phase.end_date > project.end_date) {
          errors.push(
            `Phase "${phase.name}" ends after project end date`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Validate person conflict resolution
   * Ensures person data integrity
   */
  async validatePersonResolution(personId: string): Promise<ValidationResult> {
    const warnings: OverAllocationWarning[] = [];
    const errors: string[] = [];

    const person = await this.db('people')
      .where('id', personId)
      .first();

    if (!person) {
      errors.push(`Person ${personId} not found`);
      return { valid: false, warnings, errors };
    }

    // Check required fields
    if (!person.first_name || person.first_name.trim() === '') {
      errors.push('First name is required');
    }
    if (!person.last_name || person.last_name.trim() === '') {
      errors.push('Last name is required');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Get all over-allocations for a person
   * Useful for displaying warnings in UI
   */
  async getAllOverAllocations(personId: string): Promise<OverAllocationWarning[]> {
    const assignments = await this.db('project_assignments')
      .where('person_id', personId)
      .orderBy('start_date');

    const warnings: OverAllocationWarning[] = [];

    for (const assignment of assignments) {
      const warningsForAssignment = await this.checkOverAllocation(
        personId,
        assignment.start_date,
        assignment.end_date,
        assignment.allocation_percent,
        assignment.id
      );
      warnings.push(...warningsForAssignment);
    }

    return warnings;
  }
}

import { Knex } from 'knex';

export interface AssignmentRecalculationResult {
  updated_assignments: Array<{
    assignment_id: string;
    old_computed_start_date?: string;
    old_computed_end_date?: string;
    new_computed_start_date?: string;
    new_computed_end_date?: string;
    person_name: string;
    project_name: string;
    role_name: string;
  }>;
  conflicts: Array<{
    person_id: string;
    person_name: string;
    conflict_type: 'over_allocation' | 'availability_override';
    details: string;
  }>;
}

export class AssignmentRecalculationService {
  constructor(private db: Knex) {}

  /**
   * Recalculate assignments affected by phase timeline changes
   */
  async recalculateAssignmentsForPhaseChanges(
    projectId: string,
    affectedPhaseIds: string[]
  ): Promise<AssignmentRecalculationResult> {
    const updatedAssignments: AssignmentRecalculationResult['updated_assignments'] = [];
    const conflicts: AssignmentRecalculationResult['conflicts'] = [];

    // Find all phase-aligned assignments for affected phases
    const phaseAssignments = await this.db('project_assignments')
      .join('people', 'project_assignments.person_id', 'people.id')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .join('roles', 'project_assignments.role_id', 'roles.id')
      .where('project_assignments.project_id', projectId)
      .where('project_assignments.assignment_date_mode', 'phase')
      .whereIn('project_assignments.phase_id', affectedPhaseIds)
      .select(
        'project_assignments.*',
        'people.name as person_name',
        'projects.name as project_name',
        'roles.name as role_name'
      );

    const trx = await this.db.transaction();

    try {
      for (const assignment of phaseAssignments) {
        // Get the current computed dates
        const oldComputedStartDate = assignment.computed_start_date;
        const oldComputedEndDate = assignment.computed_end_date;

        // Recalculate dates based on updated phase timeline
        const newDates = await this.computePhaseAssignmentDates(
          assignment.project_id,
          assignment.phase_id
        );

        // Update the assignment if dates changed
        if (
          oldComputedStartDate !== newDates.computed_start_date ||
          oldComputedEndDate !== newDates.computed_end_date
        ) {
          await trx('project_assignments')
            .where('id', assignment.id)
            .update({
              computed_start_date: newDates.computed_start_date,
              computed_end_date: newDates.computed_end_date,
              updated_at: new Date().toISOString()
            });

          updatedAssignments.push({
            assignment_id: assignment.id,
            old_computed_start_date: oldComputedStartDate,
            old_computed_end_date: oldComputedEndDate,
            new_computed_start_date: newDates.computed_start_date,
            new_computed_end_date: newDates.computed_end_date,
            person_name: assignment.person_name,
            project_name: assignment.project_name,
            role_name: assignment.role_name
          });

          // Check for conflicts with the new dates
          const personConflicts = await this.checkAssignmentConflicts(
            assignment.person_id,
            newDates.computed_start_date!,
            newDates.computed_end_date!,
            assignment.allocation_percentage,
            assignment.id
          );

          conflicts.push(...personConflicts);
        }
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    return {
      updated_assignments: updatedAssignments,
      conflicts
    };
  }

  /**
   * Recalculate assignments affected by project date changes
   */
  async recalculateAssignmentsForProjectChanges(
    projectId: string
  ): Promise<AssignmentRecalculationResult> {
    const updatedAssignments: AssignmentRecalculationResult['updated_assignments'] = [];
    const conflicts: AssignmentRecalculationResult['conflicts'] = [];

    // Find all project-aligned assignments
    const projectAssignments = await this.db('project_assignments')
      .join('people', 'project_assignments.person_id', 'people.id')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .join('roles', 'project_assignments.role_id', 'roles.id')
      .where('project_assignments.project_id', projectId)
      .where('project_assignments.assignment_date_mode', 'project')
      .select(
        'project_assignments.*',
        'people.name as person_name',
        'projects.name as project_name',
        'roles.name as role_name',
        'projects.aspiration_start',
        'projects.aspiration_finish'
      );

    const trx = await this.db.transaction();

    try {
      for (const assignment of projectAssignments) {
        const oldComputedStartDate = assignment.computed_start_date;
        const oldComputedEndDate = assignment.computed_end_date;
        
        const newComputedStartDate = assignment.aspiration_start;
        const newComputedEndDate = assignment.aspiration_finish;

        // Update if dates changed
        if (
          oldComputedStartDate !== newComputedStartDate ||
          oldComputedEndDate !== newComputedEndDate
        ) {
          await trx('project_assignments')
            .where('id', assignment.id)
            .update({
              computed_start_date: newComputedStartDate,
              computed_end_date: newComputedEndDate,
              updated_at: new Date().toISOString()
            });

          updatedAssignments.push({
            assignment_id: assignment.id,
            old_computed_start_date: oldComputedStartDate,
            old_computed_end_date: oldComputedEndDate,
            new_computed_start_date: newComputedStartDate,
            new_computed_end_date: newComputedEndDate,
            person_name: assignment.person_name,
            project_name: assignment.project_name,
            role_name: assignment.role_name
          });

          // Check for conflicts
          if (newComputedStartDate && newComputedEndDate) {
            const personConflicts = await this.checkAssignmentConflicts(
              assignment.person_id,
              newComputedStartDate,
              newComputedEndDate,
              assignment.allocation_percentage,
              assignment.id
            );

            conflicts.push(...personConflicts);
          }
        }
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    return {
      updated_assignments: updatedAssignments,
      conflicts
    };
  }

  /**
   * Get computed dates for a phase-aligned assignment
   */
  private async computePhaseAssignmentDates(
    projectId: string,
    phaseId: string
  ): Promise<{
    computed_start_date?: string;
    computed_end_date?: string;
  }> {
    const phaseTimeline = await this.db('project_phases_timeline')
      .where('project_id', projectId)
      .where('phase_id', phaseId)
      .first();

    if (!phaseTimeline) {
      throw new Error(`No timeline found for phase ${phaseId} in project ${projectId}`);
    }

    return {
      computed_start_date: phaseTimeline.start_date,
      computed_end_date: phaseTimeline.end_date
    };
  }

  /**
   * Check for assignment conflicts for a person during specific dates
   */
  private async checkAssignmentConflicts(
    personId: string,
    startDate: string,
    endDate: string,
    allocationPercentage: number,
    excludeAssignmentId?: string
  ): Promise<Array<{
    person_id: string;
    person_name: string;
    conflict_type: 'over_allocation' | 'availability_override';
    details: string;
  }>> {
    const conflicts = [];

    // Get person's default availability
    const person = await this.db('people')
      .where('id', personId)
      .first();

    if (!person) return [];

    const defaultAvailability = person.default_availability_percentage || 100;

    // Check for overlapping assignments
    let query = this.db('project_assignments')
      .join('people', 'project_assignments.person_id', 'people.id')
      .where('project_assignments.person_id', personId)
      .where(function() {
        // Overlapping date logic using computed dates
        this.where(function() {
          this.where('project_assignments.computed_start_date', '<=', endDate)
            .where('project_assignments.computed_end_date', '>=', startDate);
        });
      });

    if (excludeAssignmentId) {
      query = query.where('project_assignments.id', '!=', excludeAssignmentId);
    }

    const overlappingAssignments = await query.select(
      'project_assignments.*',
      'people.name as person_name'
    );

    // Calculate total allocation during overlap period
    const totalAllocation = overlappingAssignments.reduce(
      (sum, assignment) => sum + assignment.allocation_percentage,
      allocationPercentage
    );

    // Check availability overrides during this period
    const availabilityOverrides = await this.db('person_availability_overrides')
      .where('person_id', personId)
      .where(function() {
        this.where('start_date', '<=', endDate)
          .where('end_date', '>=', startDate);
      });

    let effectiveAvailability = defaultAvailability;
    if (availabilityOverrides.length > 0) {
      // Use the most restrictive availability override in the period
      effectiveAvailability = Math.min(
        effectiveAvailability,
        ...availabilityOverrides.map(override => override.availability_percentage || 0)
      );
    }

    // Check for over-allocation
    if (totalAllocation > effectiveAvailability) {
      conflicts.push({
        person_id: personId,
        person_name: person.name,
        conflict_type: 'over_allocation',
        details: `Total allocation ${totalAllocation}% exceeds available capacity ${effectiveAvailability}% during ${startDate} to ${endDate}`
      });
    }

    // Check for availability overrides
    if (availabilityOverrides.length > 0) {
      conflicts.push({
        person_id: personId,
        person_name: person.name,
        conflict_type: 'availability_override',
        details: `Availability override active during ${startDate} to ${endDate}: ${availabilityOverrides.map(o => `${o.override_type} (${o.availability_percentage}%)`).join(', ')}`
      });
    }

    return conflicts;
  }

  /**
   * Bulk recalculate all assignments for a project
   */
  async recalculateAllProjectAssignments(projectId: string): Promise<AssignmentRecalculationResult> {
    const allAssignments = await this.db('project_assignments')
      .where('project_id', projectId)
      .whereIn('assignment_date_mode', ['phase', 'project'])
      .select('id', 'phase_id', 'assignment_date_mode');

    // Group by mode
    const phaseAssignments = allAssignments
      .filter(a => a.assignment_date_mode === 'phase')
      .map(a => a.phase_id)
      .filter((id, index, arr) => arr.indexOf(id) === index); // unique phase_ids

    const hasProjectAssignments = allAssignments.some(a => a.assignment_date_mode === 'project');

    // Recalculate phase assignments
    const phaseResults = phaseAssignments.length > 0 
      ? await this.recalculateAssignmentsForPhaseChanges(projectId, phaseAssignments)
      : { updated_assignments: [], conflicts: [] };

    // Recalculate project assignments
    const projectResults = hasProjectAssignments
      ? await this.recalculateAssignmentsForProjectChanges(projectId)
      : { updated_assignments: [], conflicts: [] };

    return {
      updated_assignments: [...phaseResults.updated_assignments, ...projectResults.updated_assignments],
      conflicts: [...phaseResults.conflicts, ...projectResults.conflicts]
    };
  }
}
import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { transformDates, transformDatesInArray, COMMON_DATE_FIELDS } from '../../utils/dateTransform.js';

interface AssignmentConflict {
  person_id: string;
  person_name: string;
  conflicting_projects: Array<{
    project_name: string;
    start_date: string;
    end_date: string;
    allocation_percentage: number;
  }>;
  total_allocation: number;
  available_capacity: number;
}

export class AssignmentsController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      project_id: req.query.project_id,
      person_id: req.query.person_id,
      role_id: req.query.role_id,
      status: req.query.status
    };

    const result = await this.executeQuery(async () => {
      let query = this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .join('people', 'project_assignments.person_id', 'people.id')
        .join('roles', 'project_assignments.role_id', 'roles.id')
        .select(
          'project_assignments.*',
          'projects.name as project_name',
          'people.name as person_name',
          'roles.name as role_name'
        );

      // Add date range filter
      if (req.query.start_date) {
        query = query.where('project_assignments.end_date', '>=', req.query.start_date);
      }
      if (req.query.end_date) {
        query = query.where('project_assignments.start_date', '<=', req.query.end_date);
      }

      query = this.buildFilters(query, filters);
      query = this.paginate(query, page, limit);
      query = query.orderBy('project_assignments.start_date', 'desc');

      const assignments = await query;
      const total = await this.db('project_assignments').count('* as count').first();

      // Transform date fields from timestamps to date strings
      const transformedAssignments = transformDatesInArray(assignments, COMMON_DATE_FIELDS);

      return {
        data: transformedAssignments,
        pagination: {
          page,
          limit,
          total: total?.count || 0,
          totalPages: Math.ceil((total?.count || 0) / limit)
        }
      };
    }, res, 'Failed to fetch assignments');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const assignmentData = req.body;

    const result = await this.executeQuery(async () => {
      // Check for conflicts before creating
      const conflicts = await this.checkConflicts(
        assignmentData.person_id,
        assignmentData.start_date,
        assignmentData.end_date,
        assignmentData.allocation_percentage
      );

      if (conflicts && conflicts.total_allocation > 100) {
        return res.status(400).json({
          error: 'Assignment would exceed person capacity',
          conflicts,
          message: `Person is already allocated ${conflicts.total_allocation - assignmentData.allocation_percentage}% during this period`
        });
      }

      const [assignment] = await this.db('project_assignments')
        .insert({
          ...assignmentData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return transformDates(assignment, COMMON_DATE_FIELDS);
    }, res, 'Failed to create assignment');

    if (result) {
      res.status(201).json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const assignment = await this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .join('people', 'project_assignments.person_id', 'people.id')
        .join('roles', 'project_assignments.role_id', 'roles.id')
        .select(
          'project_assignments.*',
          'projects.name as project_name',
          'people.name as person_name',
          'roles.name as role_name'
        )
        .where('project_assignments.id', id)
        .first();

      if (!assignment) {
        this.handleNotFound(res, 'Assignment');
        return null;
      }

      return transformDates(assignment, COMMON_DATE_FIELDS);
    }, res, 'Failed to fetch assignment');

    if (result) {
      res.json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      // Check if assignment exists
      const existing = await this.db('project_assignments').where('id', id).first();
      if (!existing) {
        this.handleNotFound(res, 'Assignment');
        return null;
      }

      // Check conflicts if dates or allocation changed
      if (updateData.start_date || updateData.end_date || updateData.allocation_percentage) {
        const conflict = await this.checkConflicts(
          updateData.person_id || existing.person_id,
          updateData.start_date || existing.start_date,
          updateData.end_date || existing.end_date,
          updateData.allocation_percentage || existing.allocation_percentage,
          id // Exclude current assignment
        );

        if (conflict && conflict.total_allocation > 100) {
          return res.status(400).json({
            error: 'Capacity exceeded',
            conflict
          });
        }
      }

      // Update assignment
      const [updated] = await this.db('project_assignments')
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      return transformDates(updated, COMMON_DATE_FIELDS);
    }, res, 'Failed to update assignment');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deleted = await this.db('project_assignments')
        .where('id', id)
        .del();

      if (deleted === 0) {
        this.handleNotFound(res, 'Assignment');
        return null;
      }

      return { message: 'Assignment deleted successfully' };
    }, res, 'Failed to delete assignment');

    if (result) {
      res.json(result);
    }
  }

  async bulkAssign(req: Request, res: Response) {
    const { project_id, assignments } = req.body;

    const result = await this.executeQuery(async () => {
      const results = {
        successful: [] as any[],
        failed: [] as any[],
        conflicts: [] as AssignmentConflict[]
      };

      // Process each assignment
      for (const assignment of assignments) {
        try {
          // Check conflicts
          const conflict = await this.checkConflicts(
            assignment.person_id,
            assignment.start_date,
            assignment.end_date,
            assignment.allocation_percentage,
            assignment.id // Exclude current assignment if updating
          );

          if (conflict && conflict.total_allocation > 100) {
            results.conflicts.push(conflict);
            results.failed.push({
              ...assignment,
              reason: 'Capacity exceeded',
              total_allocation: conflict.total_allocation
            });
            continue;
          }

          // Create assignment
          const [created] = await this.db('project_assignments')
            .insert({
              project_id,
              person_id: assignment.person_id,
              role_id: assignment.role_id,
              allocation_percentage: assignment.allocation_percentage,
              start_date: assignment.start_date,
              end_date: assignment.end_date,
              notes: assignment.notes,
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');

          results.successful.push(transformDates(created, COMMON_DATE_FIELDS));

        } catch (error) {
          results.failed.push({
            ...assignment,
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        summary: {
          total: assignments.length,
          successful: results.successful.length,
          failed: results.failed.length,
          conflicts: results.conflicts.length
        },
        results
      };
    }, res, 'Failed to create bulk assignments');

    if (result) {
      res.json(result);
    }
  }

  async checkConflicts(
    person_id: string,
    start_date: string,
    end_date: string,
    allocation_percentage: number,
    exclude_assignment_id?: string
  ): Promise<AssignmentConflict | null> {
    // Get person details
    const person = await this.db('people')
      .where('id', person_id)
      .first();

    if (!person) return null;

    // Get overlapping assignments
    let query = this.db('project_assignments')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .where('project_assignments.person_id', person_id)
      .where('project_assignments.start_date', '<=', end_date)
      .where('project_assignments.end_date', '>=', start_date);

    if (exclude_assignment_id) {
      query = query.where('project_assignments.id', '!=', exclude_assignment_id);
    }

    const overlapping = await query.select(
      'project_assignments.*',
      'projects.name as project_name'
    );

    const total_allocation = overlapping.reduce((sum, assignment) => 
      sum + assignment.allocation_percentage, allocation_percentage
    );

    // Get person's current availability
    const availability = await this.db('person_availability_view')
      .where('person_id', person_id)
      .first();

    const available_capacity = availability?.effective_availability_percentage || 100;

    if (total_allocation > available_capacity) {
      return {
        person_id,
        person_name: person.name,
        conflicting_projects: overlapping.map(a => ({
          project_name: a.project_name,
          start_date: a.start_date,
          end_date: a.end_date,
          allocation_percentage: a.allocation_percentage
        })),
        total_allocation,
        available_capacity
      };
    }

    return null;
  }

  async getConflicts(req: Request, res: Response) {
    const { person_id } = req.params;
    const { start_date, end_date } = req.query;

    const result = await this.executeQuery(async () => {
      let query = this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .where('project_assignments.person_id', person_id);

      if (start_date && end_date) {
        query = query
          .where('project_assignments.start_date', '<=', end_date)
          .where('project_assignments.end_date', '>=', start_date);
      }

      const assignments = await query.select(
        'project_assignments.*',
        'projects.name as project_name'
      );

      // Transform date fields
      const transformedAssignments = transformDatesInArray(assignments, COMMON_DATE_FIELDS);

      // Group by overlapping time periods
      const conflicts = this.groupOverlappingAssignments(transformedAssignments);

      return conflicts;
    }, res, 'Failed to check conflicts');

    if (result) {
      res.json(result);
    }
  }

  async getSuggestions(req: Request, res: Response) {
    const { role_id, start_date, end_date, required_allocation } = req.query;

    const result = await this.executeQuery(async () => {
      // Get all people with the required role
      const peopleWithRole = await this.db('person_roles')
        .join('people', 'person_roles.person_id', 'people.id')
        .where('person_roles.role_id', role_id)
        .select(
          'people.*',
          'person_roles.proficiency_level'
        );

      // Check availability for each person
      const suggestions = [];

      for (const person of peopleWithRole) {
        // Get current allocations in the date range
        const allocations = await this.db('project_assignments')
          .where('person_id', person.id)
          .where('start_date', '<=', end_date)
          .where('end_date', '>=', start_date)
          .sum('allocation_percentage as total_allocation')
          .first();

        const currentAllocation = allocations?.total_allocation || 0;

        // Get availability
        const availability = await this.db('person_availability_view')
          .where('person_id', person.id)
          .first();

        const availableCapacity = (availability?.effective_availability_percentage || 100) - currentAllocation;

        if (availableCapacity >= Number(required_allocation)) {
          suggestions.push({
            person_id: person.id,
            person_name: person.name,
            proficiency_level: person.proficiency_level,
            current_allocation: currentAllocation,
            available_capacity: availableCapacity,
            availability_status: availability?.availability_status,
            score: this.calculateSuggestionScore(person, availableCapacity)
          });
        }
      }

      // Sort by score (highest first)
      suggestions.sort((a, b) => b.score - a.score);

      return {
        role_id,
        start_date,
        end_date,
        required_allocation,
        suggestions: suggestions.slice(0, 10) // Top 10 suggestions
      };
    }, res, 'Failed to get assignment suggestions');

    if (result) {
      res.json(result);
    }
  }

  async getTimeline(req: Request, res: Response) {
    const { person_id } = req.params;
    const { start_date, end_date } = req.query;

    const result = await this.executeQuery(async () => {
      let query = this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .join('roles', 'project_assignments.role_id', 'roles.id')
        .where('project_assignments.person_id', person_id)
        .select(
          'project_assignments.*',
          'projects.name as project_name',
          'projects.priority as project_priority',
          'roles.name as role_name'
        );

      if (start_date) {
        query = query.where('project_assignments.end_date', '>=', start_date);
      }
      if (end_date) {
        query = query.where('project_assignments.start_date', '<=', end_date);
      }

      const assignments = await query.orderBy('project_assignments.start_date');

      // Get availability overrides in the same period
      let availabilityQuery = this.db('person_availability_overrides')
        .where('person_id', person_id);

      if (start_date) {
        availabilityQuery = availabilityQuery.where('end_date', '>=', start_date);
      }
      if (end_date) {
        availabilityQuery = availabilityQuery.where('start_date', '<=', end_date);
      }

      const availabilityOverrides = await availabilityQuery.orderBy('start_date');

      // Transform date fields
      const transformedAssignments = transformDatesInArray(assignments, COMMON_DATE_FIELDS);
      const transformedOverrides = transformDatesInArray(availabilityOverrides, COMMON_DATE_FIELDS);

      return {
        person_id,
        timeline: {
          assignments: transformedAssignments,
          availability_overrides: transformedOverrides,
          summary: this.calculateTimelineSummary(transformedAssignments, transformedOverrides)
        }
      };
    }, res, 'Failed to get assignment timeline');

    if (result) {
      res.json(result);
    }
  }

  private groupOverlappingAssignments(assignments: any[]) {
    // Group assignments that overlap in time
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < assignments.length; i++) {
      if (processed.has(i)) continue;

      const group = {
        period: {
          start: assignments[i].start_date,
          end: assignments[i].end_date
        },
        assignments: [assignments[i]],
        total_allocation: assignments[i].allocation_percentage
      };

      processed.add(i);

      // Find all overlapping assignments
      for (let j = i + 1; j < assignments.length; j++) {
        if (processed.has(j)) continue;

        if (this.datesOverlap(
          assignments[i].start_date,
          assignments[i].end_date,
          assignments[j].start_date,
          assignments[j].end_date
        )) {
          group.assignments.push(assignments[j]);
          group.total_allocation += assignments[j].allocation_percentage;
          group.period.start = this.minDate(group.period.start, assignments[j].start_date);
          group.period.end = this.maxDate(group.period.end, assignments[j].end_date);
          processed.add(j);
        }
      }

      if (group.total_allocation > 100) {
        groups.push({
          ...group,
          is_overallocated: true,
          overallocation_amount: group.total_allocation - 100
        });
      }
    }

    return groups;
  }

  private datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 <= end2 && end1 >= start2;
  }

  private minDate(date1: string, date2: string): string {
    return date1 < date2 ? date1 : date2;
  }

  private maxDate(date1: string, date2: string): string {
    return date1 > date2 ? date1 : date2;
  }

  private calculateSuggestionScore(person: any, availableCapacity: number): number {
    let score = 0;

    // Higher score for more available capacity
    score += availableCapacity * 0.5;

    // Higher score for higher proficiency
    const proficiencyScores: Record<string, number> = {
      'Expert': 40,
      'Senior': 30,
      'Intermediate': 20,
      'Junior': 10
    };
    score += proficiencyScores[person.proficiency_level] || 0;

    // Could add years of experience if it was in the schema
    // score += Math.min(person.years_experience * 2, 20);

    return score;
  }

  private calculateTimelineSummary(assignments: any[], availabilityOverrides: any[]) {
    const summary = {
      total_assignments: assignments.length,
      total_days_assigned: 0,
      average_allocation: 0,
      peak_allocation: 0,
      gaps: [] as any[]
    };

    if (assignments.length === 0) return summary;

    // Calculate metrics
    let totalAllocationDays = 0;
    assignments.forEach(assignment => {
      const days = this.daysBetween(assignment.start_date, assignment.end_date);
      summary.total_days_assigned += days;
      totalAllocationDays += days * assignment.allocation_percentage;
      summary.peak_allocation = Math.max(summary.peak_allocation, assignment.allocation_percentage);
    });

    summary.average_allocation = totalAllocationDays / summary.total_days_assigned;

    // Find gaps between assignments
    const sortedAssignments = [...assignments].sort((a, b) => 
      a.start_date.localeCompare(b.start_date)
    );

    for (let i = 0; i < sortedAssignments.length - 1; i++) {
      const gap = this.daysBetween(sortedAssignments[i].end_date, sortedAssignments[i + 1].start_date) - 1;
      if (gap > 0) {
        summary.gaps.push({
          start: sortedAssignments[i].end_date,
          end: sortedAssignments[i + 1].start_date,
          days: gap
        });
      }
    }

    return summary;
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
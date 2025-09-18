import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { randomUUID } from 'crypto';

export class ScenariosController extends BaseController {
  // Get all scenarios
  async getAll(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const scenarios = await this.db('scenarios')
        .leftJoin('people as creator', 'scenarios.created_by', 'creator.id')
        .leftJoin('scenarios as parent', 'scenarios.parent_scenario_id', 'parent.id')
        .select(
          'scenarios.*',
          'creator.name as created_by_name',
          'parent.name as parent_scenario_name'
        )
        .orderBy('scenarios.created_at', 'desc');

      return scenarios;
    }, res, 'Failed to fetch scenarios');

    if (result) {
      res.json(result);
    }
  }

  // Get a specific scenario
  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const scenario = await this.db('scenarios')
        .leftJoin('people as creator', 'scenarios.created_by', 'creator.id')
        .leftJoin('scenarios as parent', 'scenarios.parent_scenario_id', 'parent.id')
        .select(
          'scenarios.*',
          'creator.name as created_by_name',
          'parent.name as parent_scenario_name'
        )
        .where('scenarios.id', id)
        .first();

      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Get child scenarios
      const childScenarios = await this.db('scenarios')
        .leftJoin('people as creator', 'scenarios.created_by', 'creator.id')
        .select(
          'scenarios.*',
          'creator.name as created_by_name'
        )
        .where('scenarios.parent_scenario_id', id);

      scenario.child_scenarios = childScenarios;

      return scenario;
    }, res, 'Failed to fetch scenario');

    if (result) {
      res.json(result);
    }
  }

  // Create a new scenario (branch from existing)
  async create(req: Request, res: Response) {
    const { name, description, parent_scenario_id, created_by, scenario_type = 'branch' } = req.body;

    if (!name || !created_by) {
      return res.status(400).json({ error: 'Name and created_by are required' });
    }

    const result = await this.executeQuery(async () => {
      const scenarioId = randomUUID();
      const now = new Date();

      // Create the new scenario
      await this.db('scenarios').insert({
        id: scenarioId,
        name,
        description,
        parent_scenario_id,
        created_by,
        status: 'active',
        scenario_type,
        branch_point: parent_scenario_id ? now : null,
        created_at: now,
        updated_at: now
      });

      // If this is a branch, copy relevant data from parent
      if (parent_scenario_id && scenario_type === 'branch') {
        await this.branchFromParent(scenarioId, parent_scenario_id);
      }

      // Return the created scenario
      const newScenario = await this.db('scenarios')
        .leftJoin('people as creator', 'scenarios.created_by', 'creator.id')
        .leftJoin('scenarios as parent', 'scenarios.parent_scenario_id', 'parent.id')
        .select(
          'scenarios.*',
          'creator.name as created_by_name',
          'parent.name as parent_scenario_name'
        )
        .where('scenarios.id', scenarioId)
        .first();

      return newScenario;
    }, res, 'Failed to create scenario');

    if (result) {
      res.status(201).json(result);
    }
  }

  // Update a scenario
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const result = await this.executeQuery(async () => {
      const updateData: any = { updated_at: new Date() };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;

      await this.db('scenarios')
        .where('id', id)
        .update(updateData);

      // Return updated scenario
      const scenario = await this.db('scenarios')
        .leftJoin('people as creator', 'scenarios.created_by', 'creator.id')
        .leftJoin('scenarios as parent', 'scenarios.parent_scenario_id', 'parent.id')
        .select(
          'scenarios.*',
          'creator.name as created_by_name',
          'parent.name as parent_scenario_name'
        )
        .where('scenarios.id', id)
        .first();

      return scenario;
    }, res, 'Failed to update scenario');

    if (result) {
      res.json(result);
    }
  }

  // Delete a scenario
  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      // Check if scenario exists and get its type
      const scenario = await this.db('scenarios').where('id', id).first();
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Prevent deletion of baseline scenario
      if (scenario.scenario_type === 'baseline') {
        throw new Error('Cannot delete baseline scenario');
      }

      // Check if scenario has child scenarios
      const childCount = await this.db('scenarios')
        .where('parent_scenario_id', id)
        .count('* as count')
        .first();

      if (childCount && Number(childCount.count) > 0) {
        throw new Error('Cannot delete scenario with child scenarios');
      }

      await this.db('scenarios').where('id', id).del();
      return { success: true };
    }, res, 'Failed to delete scenario');

    if (result) {
      res.json(result);
    }
  }

  // Get scenario assignments
  async getAssignments(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const assignments = await this.db('scenario_project_assignments')
        .leftJoin('projects', 'scenario_project_assignments.project_id', 'projects.id')
        .leftJoin('people', 'scenario_project_assignments.person_id', 'people.id')
        .leftJoin('roles', 'scenario_project_assignments.role_id', 'roles.id')
        .leftJoin('project_phases', 'scenario_project_assignments.phase_id', 'project_phases.id')
        .where('scenario_project_assignments.scenario_id', id)
        .select(
          'scenario_project_assignments.*',
          'projects.name as project_name',
          'people.name as person_name',
          'roles.name as role_name',
          'project_phases.name as phase_name'
        )
        .orderBy(['projects.name', 'people.name']);

      return assignments;
    }, res, 'Failed to fetch scenario assignments');

    if (result) {
      res.json(result);
    }
  }

  // Add/update assignment in scenario
  async upsertAssignment(req: Request, res: Response) {
    const { id } = req.params;
    const {
      project_id,
      person_id,
      role_id,
      phase_id,
      allocation_percentage,
      assignment_date_mode = 'project',
      start_date,
      end_date,
      notes,
      change_type = 'added',
      base_assignment_id
    } = req.body;

    if (!project_id || !person_id || !role_id || allocation_percentage === undefined) {
      return res.status(400).json({ 
        error: 'project_id, person_id, role_id, and allocation_percentage are required' 
      });
    }

    // Validate allocation percentage
    if (allocation_percentage <= 0 || allocation_percentage > 100) {
      return res.status(400).json({ 
        error: 'allocation_percentage must be between 1 and 100' 
      });
    }

    const result = await this.executeQuery(async () => {
      const assignmentId = randomUUID();
      const now = new Date();

      // Check if assignment already exists for this combination
      const existing = await this.db('scenario_project_assignments')
        .where({
          scenario_id: id,
          project_id,
          person_id,
          role_id,
          phase_id: phase_id || null
        })
        .first();

      if (existing) {
        // Update existing assignment
        await this.db('scenario_project_assignments')
          .where('id', existing.id)
          .update({
            allocation_percentage,
            assignment_date_mode,
            start_date,
            end_date,
            notes,
            change_type,
            base_assignment_id,
            updated_at: now
          });

        return { ...existing, allocation_percentage, assignment_date_mode, start_date, end_date, notes };
      } else {
        // Create new assignment
        const assignmentData = {
          id: assignmentId,
          scenario_id: id,
          project_id,
          person_id,
          role_id,
          phase_id,
          allocation_percentage,
          assignment_date_mode,
          start_date,
          end_date,
          notes,
          change_type,
          base_assignment_id,
          created_at: now,
          updated_at: now
        };

        await this.db('scenario_project_assignments').insert(assignmentData);
        return assignmentData;
      }
    }, res, 'Failed to create/update scenario assignment');

    if (result) {
      res.json(result);
    }
  }

  // Remove assignment from scenario
  async removeAssignment(req: Request, res: Response) {
    const { id, assignmentId } = req.params;

    const result = await this.executeQuery(async () => {
      await this.db('scenario_project_assignments')
        .where('id', assignmentId)
        .where('scenario_id', id)
        .del();

      return { success: true };
    }, res, 'Failed to remove scenario assignment');

    if (result) {
      res.json(result);
    }
  }

  // Compare two scenarios
  async compare(req: Request, res: Response) {
    const { id } = req.params;
    const { compare_to } = req.query;

    if (!compare_to) {
      return res.status(400).json({ error: 'compare_to parameter is required' });
    }

    const result = await this.executeQuery(async () => {
      // Get both scenarios
      const [scenario1, scenario2] = await Promise.all([
        this.db('scenarios').where('id', id).first(),
        this.db('scenarios').where('id', compare_to).first()
      ]);

      if (!scenario1 || !scenario2) {
        throw new Error('One or both scenarios not found');
      }

      // Get assignments for both scenarios
      const [assignments1, assignments2] = await Promise.all([
        this.db('scenario_project_assignments')
          .leftJoin('projects', 'scenario_project_assignments.project_id', 'projects.id')
          .leftJoin('people', 'scenario_project_assignments.person_id', 'people.id')
          .leftJoin('roles', 'scenario_project_assignments.role_id', 'roles.id')
          .where('scenario_project_assignments.scenario_id', id)
          .select(
            'scenario_project_assignments.*',
            'projects.name as project_name',
            'people.name as person_name',
            'roles.name as role_name'
          ),
        this.db('scenario_project_assignments')
          .leftJoin('projects', 'scenario_project_assignments.project_id', 'projects.id')
          .leftJoin('people', 'scenario_project_assignments.person_id', 'people.id')
          .leftJoin('roles', 'scenario_project_assignments.role_id', 'roles.id')
          .where('scenario_project_assignments.scenario_id', compare_to)
          .select(
            'scenario_project_assignments.*',
            'projects.name as project_name',
            'people.name as person_name',
            'roles.name as role_name'
          )
      ]);

      // TODO: Implement detailed comparison logic
      const differences = {
        assignments: {
          added: [],
          modified: [],
          removed: []
        },
        phases: {
          added: [],
          modified: [],
          removed: []
        },
        projects: {
          added: [],
          modified: [],
          removed: []
        }
      };

      const metrics = {
        utilization_impact: {},
        capacity_impact: {},
        timeline_impact: {}
      };

      return {
        scenario1,
        scenario2,
        differences,
        metrics
      };
    }, res, 'Failed to compare scenarios');

    if (result) {
      res.json(result);
    }
  }

  // Merge scenario back to parent
  async merge(req: Request, res: Response) {
    const { id } = req.params;
    const { resolve_conflicts_as = 'manual' } = req.body;

    const result = await this.executeQuery(async () => {
      const scenario = await this.db('scenarios').where('id', id).first();
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      if (!scenario.parent_scenario_id) {
        throw new Error('Cannot merge scenario without parent');
      }

      if (scenario.scenario_type === 'baseline') {
        throw new Error('Cannot merge baseline scenario');
      }

      // Detect conflicts first
      const conflicts = await this.detectMergeConflicts(id, scenario.parent_scenario_id);

      if (conflicts.length > 0 && resolve_conflicts_as === 'manual') {
        // Save conflicts for manual resolution
        for (const conflict of conflicts) {
          await this.db('scenario_merge_conflicts').insert({
            id: randomUUID(),
            source_scenario_id: id,
            target_scenario_id: scenario.parent_scenario_id,
            conflict_type: conflict.type,
            entity_id: conflict.entity_id,
            source_data: JSON.stringify(conflict.source_data),
            target_data: JSON.stringify(conflict.target_data),
            resolution: 'pending',
            created_at: new Date()
          });
        }

        return {
          success: false,
          message: 'Merge conflicts detected. Manual resolution required.',
          conflicts: conflicts.length
        };
      }

      // Perform the merge
      await this.performMerge(id, scenario.parent_scenario_id, resolve_conflicts_as);

      // Mark scenario as merged
      await this.db('scenarios')
        .where('id', id)
        .update({ status: 'merged', updated_at: new Date() });

      return {
        success: true,
        message: 'Scenario merged successfully'
      };
    }, res, 'Failed to merge scenario');

    if (result) {
      res.json(result);
    }
  }

  // Private helper methods
  private async branchFromParent(scenarioId: string, parentScenarioId: string) {
    // For baseline, copy current assignments
    if (parentScenarioId === 'baseline-0000-0000-0000-000000000000') {
      // Copy current project assignments to scenario
      const assignments = await this.db('project_assignments')
        .select('*');

      for (const assignment of assignments) {
        await this.db('scenario_project_assignments').insert({
          id: randomUUID(),
          scenario_id: scenarioId,
          project_id: assignment.project_id,
          person_id: assignment.person_id,
          role_id: assignment.role_id,
          phase_id: assignment.phase_id,
          allocation_percentage: assignment.allocation_percentage,
          assignment_date_mode: assignment.assignment_date_mode,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
          notes: assignment.notes,
          change_type: 'added',
          base_assignment_id: assignment.id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Copy current project phases
      const phases = await this.db('project_phases_timeline')
        .select('*');

      for (const phase of phases) {
        await this.db('scenario_project_phases').insert({
          id: randomUUID(),
          scenario_id: scenarioId,
          project_id: phase.project_id,
          phase_id: phase.phase_id,
          start_date: phase.start_date,
          end_date: phase.end_date,
          notes: phase.notes,
          change_type: 'added',
          base_phase_timeline_id: phase.id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    } else {
      // Copy from parent scenario
      const parentAssignments = await this.db('scenario_project_assignments')
        .where('scenario_id', parentScenarioId);

      for (const assignment of parentAssignments) {
        const { id, scenario_id, created_at, updated_at, ...assignmentData } = assignment;
        await this.db('scenario_project_assignments').insert({
          ...assignmentData,
          id: randomUUID(),
          scenario_id: scenarioId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const parentPhases = await this.db('scenario_project_phases')
        .where('scenario_id', parentScenarioId);

      for (const phase of parentPhases) {
        const { id, scenario_id, created_at, updated_at, ...phaseData } = phase;
        await this.db('scenario_project_phases').insert({
          ...phaseData,
          id: randomUUID(),
          scenario_id: scenarioId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }

  private async detectMergeConflicts(sourceScenarioId: string, targetScenarioId: string) {
    const conflicts = [];

    // Get all changes from source scenario
    const sourceAssignments = await this.db('scenario_project_assignments')
      .where('scenario_id', sourceScenarioId);
    
    const sourcePhases = await this.db('scenario_project_phases')
      .where('scenario_id', sourceScenarioId);
    
    const sourceProjects = await this.db('scenario_projects')
      .where('scenario_id', sourceScenarioId);

    // Check for assignment conflicts
    for (const sourceAssignment of sourceAssignments) {
      // Check if target scenario has a conflicting assignment
      const targetAssignment = await this.db('scenario_project_assignments')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourceAssignment.project_id)
        .where('person_id', sourceAssignment.person_id)
        .where('role_id', sourceAssignment.role_id)
        .where('phase_id', sourceAssignment.phase_id || null)
        .first();

      if (targetAssignment) {
        // Check if assignments are different
        const fieldsToCompare = ['allocation_percentage', 'assignment_date_mode', 'start_date', 'end_date'];
        const hasConflict = fieldsToCompare.some(field => 
          sourceAssignment[field] !== targetAssignment[field]
        );

        if (hasConflict) {
          conflicts.push({
            type: 'assignment',
            entity_id: `${sourceAssignment.project_id}-${sourceAssignment.person_id}-${sourceAssignment.role_id}`,
            source_data: sourceAssignment,
            target_data: targetAssignment
          });
        }
      }
    }

    // Check for phase timeline conflicts
    for (const sourcePhase of sourcePhases) {
      const targetPhase = await this.db('scenario_project_phases')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourcePhase.project_id)
        .where('phase_id', sourcePhase.phase_id)
        .first();

      if (targetPhase) {
        // Check if phase timelines are different
        const hasConflict = sourcePhase.start_date !== targetPhase.start_date ||
                           sourcePhase.end_date !== targetPhase.end_date;

        if (hasConflict) {
          conflicts.push({
            type: 'phase_timeline',
            entity_id: `${sourcePhase.project_id}-${sourcePhase.phase_id}`,
            source_data: sourcePhase,
            target_data: targetPhase
          });
        }
      }
    }

    // Check for project detail conflicts
    for (const sourceProject of sourceProjects) {
      const targetProject = await this.db('scenario_projects')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourceProject.project_id)
        .first();

      if (targetProject) {
        // Check if project details are different
        const fieldsToCompare = ['name', 'priority', 'aspiration_start', 'aspiration_finish'];
        const hasConflict = fieldsToCompare.some(field => 
          sourceProject[field] !== targetProject[field]
        );

        if (hasConflict) {
          conflicts.push({
            type: 'project_details',
            entity_id: sourceProject.project_id,
            source_data: sourceProject,
            target_data: targetProject
          });
        }
      }
    }

    return conflicts;
  }

  private async performMerge(sourceScenarioId: string, targetScenarioId: string, conflictResolution: string = 'use_source') {
    // Start a transaction to ensure atomicity
    await this.db.transaction(async (trx) => {
      // Get all conflicts that need resolution
      const conflicts = await trx('scenario_merge_conflicts')
        .where('source_scenario_id', sourceScenarioId)
        .where('target_scenario_id', targetScenarioId)
        .where('resolution', '!=', 'pending');

      // Apply resolved conflicts first
      for (const conflict of conflicts) {
        const resolvedData = conflict.resolved_data ? 
          JSON.parse(conflict.resolved_data) : 
          (conflict.resolution === 'use_source' ? 
            JSON.parse(conflict.source_data) : 
            JSON.parse(conflict.target_data));

        if (conflict.conflict_type === 'assignment') {
          await this.mergeAssignment(trx, targetScenarioId, resolvedData);
        } else if (conflict.conflict_type === 'phase_timeline') {
          await this.mergePhaseTimeline(trx, targetScenarioId, resolvedData);
        } else if (conflict.conflict_type === 'project_details') {
          await this.mergeProjectDetails(trx, targetScenarioId, resolvedData);
        }
      }

      // Apply non-conflicting changes
      await this.mergeNonConflictingChanges(trx, sourceScenarioId, targetScenarioId);

      // Clean up resolved conflicts
      await trx('scenario_merge_conflicts')
        .where('source_scenario_id', sourceScenarioId)
        .where('target_scenario_id', targetScenarioId)
        .del();
    });
  }

  private async mergeAssignment(trx: any, targetScenarioId: string, assignmentData: any) {
    const existingAssignment = await trx('scenario_project_assignments')
      .where('scenario_id', targetScenarioId)
      .where('project_id', assignmentData.project_id)
      .where('person_id', assignmentData.person_id)
      .where('role_id', assignmentData.role_id)
      .where('phase_id', assignmentData.phase_id || null)
      .first();

    if (existingAssignment) {
      // Update existing assignment
      await trx('scenario_project_assignments')
        .where('id', existingAssignment.id)
        .update({
          allocation_percentage: assignmentData.allocation_percentage,
          assignment_date_mode: assignmentData.assignment_date_mode,
          start_date: assignmentData.start_date,
          end_date: assignmentData.end_date,
          notes: assignmentData.notes,
          change_type: 'modified',
          updated_at: new Date()
        });
    } else {
      // Create new assignment
      await trx('scenario_project_assignments').insert({
        id: randomUUID(),
        scenario_id: targetScenarioId,
        project_id: assignmentData.project_id,
        person_id: assignmentData.person_id,
        role_id: assignmentData.role_id,
        phase_id: assignmentData.phase_id,
        allocation_percentage: assignmentData.allocation_percentage,
        assignment_date_mode: assignmentData.assignment_date_mode,
        start_date: assignmentData.start_date,
        end_date: assignmentData.end_date,
        notes: assignmentData.notes,
        change_type: 'added',
        base_assignment_id: assignmentData.base_assignment_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  private async mergePhaseTimeline(trx: any, targetScenarioId: string, phaseData: any) {
    const existingPhase = await trx('scenario_project_phases')
      .where('scenario_id', targetScenarioId)
      .where('project_id', phaseData.project_id)
      .where('phase_id', phaseData.phase_id)
      .first();

    if (existingPhase) {
      // Update existing phase
      await trx('scenario_project_phases')
        .where('id', existingPhase.id)
        .update({
          start_date: phaseData.start_date,
          end_date: phaseData.end_date,
          notes: phaseData.notes,
          change_type: 'modified',
          updated_at: new Date()
        });
    } else {
      // Create new phase
      await trx('scenario_project_phases').insert({
        id: randomUUID(),
        scenario_id: targetScenarioId,
        project_id: phaseData.project_id,
        phase_id: phaseData.phase_id,
        start_date: phaseData.start_date,
        end_date: phaseData.end_date,
        notes: phaseData.notes,
        change_type: 'added',
        base_phase_timeline_id: phaseData.base_phase_timeline_id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  private async mergeProjectDetails(trx: any, targetScenarioId: string, projectData: any) {
    const existingProject = await trx('scenario_projects')
      .where('scenario_id', targetScenarioId)
      .where('project_id', projectData.project_id)
      .first();

    if (existingProject) {
      // Update existing project
      await trx('scenario_projects')
        .where('id', existingProject.id)
        .update({
          name: projectData.name,
          priority: projectData.priority,
          aspiration_start: projectData.aspiration_start,
          aspiration_finish: projectData.aspiration_finish,
          notes: projectData.notes,
          change_type: 'modified',
          updated_at: new Date()
        });
    } else {
      // Create new project modification
      await trx('scenario_projects').insert({
        id: randomUUID(),
        scenario_id: targetScenarioId,
        project_id: projectData.project_id,
        name: projectData.name,
        priority: projectData.priority,
        aspiration_start: projectData.aspiration_start,
        aspiration_finish: projectData.aspiration_finish,
        notes: projectData.notes,
        change_type: 'added',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  private async mergeNonConflictingChanges(trx: any, sourceScenarioId: string, targetScenarioId: string) {
    // Get all source assignments that don't have conflicts
    const sourceAssignments = await trx('scenario_project_assignments')
      .where('scenario_id', sourceScenarioId);

    for (const sourceAssignment of sourceAssignments) {
      const targetAssignment = await trx('scenario_project_assignments')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourceAssignment.project_id)
        .where('person_id', sourceAssignment.person_id)
        .where('role_id', sourceAssignment.role_id)
        .where('phase_id', sourceAssignment.phase_id || null)
        .first();

      if (!targetAssignment) {
        // No conflict, safe to add
        await this.mergeAssignment(trx, targetScenarioId, sourceAssignment);
      }
    }

    // Similar logic for phases and projects
    const sourcePhases = await trx('scenario_project_phases')
      .where('scenario_id', sourceScenarioId);

    for (const sourcePhase of sourcePhases) {
      const targetPhase = await trx('scenario_project_phases')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourcePhase.project_id)
        .where('phase_id', sourcePhase.phase_id)
        .first();

      if (!targetPhase) {
        await this.mergePhaseTimeline(trx, targetScenarioId, sourcePhase);
      }
    }

    const sourceProjects = await trx('scenario_projects')
      .where('scenario_id', sourceScenarioId);

    for (const sourceProject of sourceProjects) {
      const targetProject = await trx('scenario_projects')
        .where('scenario_id', targetScenarioId)
        .where('project_id', sourceProject.project_id)
        .first();

      if (!targetProject) {
        await this.mergeProjectDetails(trx, targetScenarioId, sourceProject);
      }
    }
  }
}
import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';
import { ProjectPhaseCascadeService } from '../../services/ProjectPhaseCascadeService.js';
import { AssignmentRecalculationService } from '../../services/AssignmentRecalculationService.js';

export class ProjectPhaseDependenciesController extends BaseController {
  // Get all dependencies for a project
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await this.executeQuery(async () => {
      let query = this.db('project_phase_dependencies as ppd')
        .join('project_phases_timeline as pred', 'ppd.predecessor_phase_timeline_id', 'pred.id')
        .join('project_phases_timeline as succ', 'ppd.successor_phase_timeline_id', 'succ.id')
        .join('project_phases as pred_phase', 'pred.phase_id', 'pred_phase.id')
        .join('project_phases as succ_phase', 'succ.phase_id', 'succ_phase.id')
        .select(
          'ppd.*',
          'pred.start_date as predecessor_start_date',
          'pred.end_date as predecessor_end_date',
          'pred_phase.name as predecessor_phase_name',
          'succ.start_date as successor_start_date',
          'succ.end_date as successor_end_date',
          'succ_phase.name as successor_phase_name'
        );

      // Filter by project_id if provided
      if (req.query.project_id) {
        query = query.where('ppd.project_id', req.query.project_id);
      }
      
      if (req.query.page || req.query.limit) {
        query = this.paginate(query, page, limit);
      } else {
        query = query.orderBy('pred.start_date');
      }

      const dependencies = await query;

      // Get total count if paginated
      let total = dependencies.length;
      if (req.query.page || req.query.limit) {
        let countQuery = this.db('project_phase_dependencies').count('* as count');
        
        if (req.query.project_id) {
          countQuery = countQuery.where('project_id', req.query.project_id);
        }
        
        const totalResult = await countQuery.first();
        total = Number(totalResult?.count) || 0;
      }

      return {
        data: dependencies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }, res, 'Failed to fetch project phase dependencies');

    if (result) {
      res.json(result);
    }
  }

  // Get a single dependency
  async getById(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const dependency = await this.db('project_phase_dependencies as ppd')
        .join('project_phases_timeline as pred', 'ppd.predecessor_phase_timeline_id', 'pred.id')
        .join('project_phases_timeline as succ', 'ppd.successor_phase_timeline_id', 'succ.id')
        .join('project_phases as pred_phase', 'pred.phase_id', 'pred_phase.id')
        .join('project_phases as succ_phase', 'succ.phase_id', 'succ_phase.id')
        .select(
          'ppd.*',
          'pred.start_date as predecessor_start_date',
          'pred.end_date as predecessor_end_date',
          'pred_phase.name as predecessor_phase_name',
          'succ.start_date as successor_start_date',
          'succ.end_date as successor_end_date',
          'succ_phase.name as successor_phase_name'
        )
        .where('ppd.id', req.params.id)
        .first();

      if (!dependency) {
        throw new Error('Dependency not found');
      }

      return { data: dependency };
    }, res, 'Failed to fetch dependency');

    if (result) {
      res.json(result);
    }
  }

  // Create a new dependency
  async create(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const {
        project_id,
        predecessor_phase_timeline_id,
        successor_phase_timeline_id,
        dependency_type = 'FS',
        lag_days = 0
      } = req.body;

      // Validate required fields
      if (!project_id || !predecessor_phase_timeline_id || !successor_phase_timeline_id) {
        throw new Error('project_id, predecessor_phase_timeline_id, and successor_phase_timeline_id are required');
      }

      // Prevent self-dependencies
      if (predecessor_phase_timeline_id === successor_phase_timeline_id) {
        throw new Error('A phase cannot depend on itself');
      }

      // Check if both phases belong to the same project
      const phases = await this.db('project_phases_timeline')
        .whereIn('id', [predecessor_phase_timeline_id, successor_phase_timeline_id])
        .where('project_id', project_id);

      if (phases.length !== 2) {
        throw new Error('Both phases must belong to the specified project');
      }

      // Check for circular dependencies (basic check)
      const existingDependency = await this.db('project_phase_dependencies')
        .where({
          predecessor_phase_timeline_id: successor_phase_timeline_id,
          successor_phase_timeline_id: predecessor_phase_timeline_id
        })
        .first();

      if (existingDependency) {
        throw new Error('This would create a circular dependency');
      }

      const id = uuidv4();
      const dependencyData = {
        id,
        project_id,
        predecessor_phase_timeline_id,
        successor_phase_timeline_id,
        dependency_type,
        lag_days,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.db('project_phase_dependencies').insert(dependencyData);

      // Return the created dependency with phase details
      const createdDependency = await this.db('project_phase_dependencies as ppd')
        .join('project_phases_timeline as pred', 'ppd.predecessor_phase_timeline_id', 'pred.id')
        .join('project_phases_timeline as succ', 'ppd.successor_phase_timeline_id', 'succ.id')
        .join('project_phases as pred_phase', 'pred.phase_id', 'pred_phase.id')
        .join('project_phases as succ_phase', 'succ.phase_id', 'succ_phase.id')
        .select(
          'ppd.*',
          'pred.start_date as predecessor_start_date',
          'pred.end_date as predecessor_end_date',
          'pred_phase.name as predecessor_phase_name',
          'succ.start_date as successor_start_date',
          'succ.end_date as successor_end_date',
          'succ_phase.name as successor_phase_name'
        )
        .where('ppd.id', id)
        .first();

      return { data: createdDependency };
    }, res, 'Failed to create dependency');

    if (result) {
      res.json(result);
    }
  }

  // Update a dependency
  async update(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const dependencyId = req.params.id;
      const { dependency_type, lag_days } = req.body;

      // Check if dependency exists
      const existingDependency = await this.db('project_phase_dependencies')
        .where('id', dependencyId)
        .first();

      if (!existingDependency) {
        throw new Error('Dependency not found');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (dependency_type !== undefined) updateData.dependency_type = dependency_type;
      if (lag_days !== undefined) updateData.lag_days = lag_days;

      await this.db('project_phase_dependencies')
        .where('id', dependencyId)
        .update(updateData);

      // Return the updated dependency with phase details
      const updatedDependency = await this.db('project_phase_dependencies as ppd')
        .join('project_phases_timeline as pred', 'ppd.predecessor_phase_timeline_id', 'pred.id')
        .join('project_phases_timeline as succ', 'ppd.successor_phase_timeline_id', 'succ.id')
        .join('project_phases as pred_phase', 'pred.phase_id', 'pred_phase.id')
        .join('project_phases as succ_phase', 'succ.phase_id', 'succ_phase.id')
        .select(
          'ppd.*',
          'pred.start_date as predecessor_start_date',
          'pred.end_date as predecessor_end_date',
          'pred_phase.name as predecessor_phase_name',
          'succ.start_date as successor_start_date',
          'succ.end_date as successor_end_date',
          'succ_phase.name as successor_phase_name'
        )
        .where('ppd.id', dependencyId)
        .first();

      return { data: updatedDependency };
    }, res, 'Failed to update dependency');

    if (result) {
      res.json(result);
    }
  }

  // Delete a dependency
  async delete(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const dependencyId = req.params.id;

      const deletedCount = await this.db('project_phase_dependencies')
        .where('id', dependencyId)
        .delete();

      if (deletedCount === 0) {
        throw new Error('Dependency not found');
      }

      return { message: 'Dependency deleted successfully' };
    }, res, 'Failed to delete dependency');

    if (result) {
      res.json(result);
    }
  }

  // Calculate cascade effects for a phase date change
  async calculateCascade(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const { project_id, phase_timeline_id, new_start_date, new_end_date } = req.body;

      if (!project_id || !phase_timeline_id || !new_start_date || !new_end_date) {
        throw new Error('project_id, phase_timeline_id, new_start_date, and new_end_date are required');
      }

      const cascadeService = new ProjectPhaseCascadeService(this.db);
      const cascadeResult = await cascadeService.calculateCascade(
        project_id,
        phase_timeline_id,
        new Date(new_start_date),
        new Date(new_end_date)
      );

      return { data: cascadeResult };
    }, res, 'Failed to calculate cascade effects');

    if (result) {
      res.json(result);
    }
  }

  // Apply cascade changes to the database
  async applyCascade(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const { project_id, cascade_data } = req.body;

      if (!project_id || !cascade_data) {
        throw new Error('project_id and cascade_data are required');
      }

      const cascadeService = new ProjectPhaseCascadeService(this.db);
      const assignmentService = new AssignmentRecalculationService(this.db);

      // Apply cascade changes to phases
      await cascadeService.applyCascade(project_id, cascade_data);

      // Recalculate assignments affected by phase changes
      const affectedPhaseIds = cascade_data.affected_phases?.map((phase: any) => phase.phase_timeline_id) || [];
      let assignmentResult = { updated_assignments: [], conflicts: [] };
      
      if (affectedPhaseIds.length > 0) {
        assignmentResult = await assignmentService.recalculateAssignmentsForPhaseChanges(
          project_id,
          affectedPhaseIds
        );
      }

      return { 
        message: 'Cascade changes applied successfully',
        assignment_updates: {
          updated_count: assignmentResult.updated_assignments.length,
          conflicts_count: assignmentResult.conflicts.length,
          updated_assignments: assignmentResult.updated_assignments,
          conflicts: assignmentResult.conflicts
        }
      };
    }, res, 'Failed to apply cascade changes');

    if (result) {
      res.json(result);
    }
  }
}
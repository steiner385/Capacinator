import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { notificationScheduler } from '../../services/NotificationScheduler.js';

export class ProjectsController extends BaseController {
  /**
   * Validates that a project has a mandatory project subtype.
   * Projects must be associated with active project sub-types.
   */
  private async validateProjectSubType(projectTypeId: string, projectSubTypeId: string): Promise<void> {
    // project_sub_type_id is now mandatory
    if (!projectSubTypeId) {
      throw new Error('Project sub-type is required for all projects');
    }

    // Check if project type exists
    const projectType = await this.db('project_types')
      .select('id', 'name')
      .where('id', projectTypeId)
      .first();

    if (!projectType) {
      throw new Error(`Project type with ID ${projectTypeId} not found`);
    }

    // Validate the project sub-type
    const projectSubType = await this.db('project_sub_types')
      .select('id', 'name', 'project_type_id', 'is_active')
      .where('id', projectSubTypeId)
      .first();

    if (!projectSubType) {
      throw new Error(`Project sub-type with ID ${projectSubTypeId} not found`);
    }

    if (projectSubType.project_type_id !== projectTypeId) {
      throw new Error(`Project sub-type "${projectSubType.name}" does not belong to project type "${projectType.name}"`);
    }

    if (!projectSubType.is_active) {
      throw new Error(`Project sub-type "${projectSubType.name}" is not active`);
    }
  }
  async debugQuery(req: Request, res: Response) {
    const testQuery = await this.db('projects')
      .select('id', 'name')
      .select(this.db.raw('(SELECT MIN(start_date) FROM project_phases_timeline WHERE project_id = projects.id) as start_date'))
      .select(this.db.raw('(SELECT MAX(end_date) FROM project_phases_timeline WHERE project_id = projects.id) as end_date'))
      .limit(3);
    
    res.json({ debug: testQuery });
  }

  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      location_id: req.query.location_id,
      project_type_id: req.query.project_type_id,
      priority: req.query.priority,
      include_in_demand: req.query.include_in_demand
    };

    const result = await this.executeQuery(async () => {
      let query = this.db('projects')
        .leftJoin('locations', 'projects.location_id', 'locations.id')
        .leftJoin('project_types', 'projects.project_type_id', 'project_types.id')
        .leftJoin('project_sub_types', 'projects.project_sub_type_id', 'project_sub_types.id')
        .leftJoin('people as owner', 'projects.owner_id', 'owner.id')
        .leftJoin('project_phases as current_phase', 'projects.current_phase_id', 'current_phase.id')
        .select(
          'projects.*',
          'locations.name as location_name',
          'project_types.name as project_type_name',
          this.db.raw('COALESCE(project_sub_types.color_code, project_types.color_code) as project_type_color_code'),
          'project_sub_types.name as project_sub_type_name',
          'owner.name as owner_name',
          'current_phase.name as current_phase_name',
          // Calculate start_date and end_date from project phases timeline
          this.db.raw(`(
            SELECT MIN(start_date) 
            FROM project_phases_timeline 
            WHERE project_id = projects.id
          ) as start_date`),
          this.db.raw(`(
            SELECT MAX(end_date) 
            FROM project_phases_timeline 
            WHERE project_id = projects.id
          ) as end_date`)
        );

      query = this.buildFilters(query, filters);
      query = this.paginate(query, page, limit);

      const projects = await query;
      
      // DEBUG: Test if raw SQL is working
      const testQuery = await this.db('projects')
        .select('id', 'name')
        .select(this.db.raw('(SELECT MIN(start_date) FROM project_phases_timeline WHERE project_id = projects.id) as start_date'))
        .limit(1);
      console.log('DEBUG - Test query result:', JSON.stringify(testQuery[0], null, 2));
      
      const total = await this.db('projects').count('* as count').first();

      return {
        data: projects,
        pagination: {
          page,
          limit,
          total: total?.count || 0,
          totalPages: Math.ceil((total?.count || 0) / limit)
        }
      };
    }, res, 'Failed to fetch projects');

    if (result) {
      res.json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const project = await this.db('projects')
        .leftJoin('locations', 'projects.location_id', 'locations.id')
        .leftJoin('project_types', 'projects.project_type_id', 'project_types.id')
        .leftJoin('project_sub_types', 'projects.project_sub_type_id', 'project_sub_types.id')
        .leftJoin('people as owner', 'projects.owner_id', 'owner.id')
        .leftJoin('project_phases as current_phase', 'projects.current_phase_id', 'current_phase.id')
        .select(
          'projects.*',
          'locations.name as location_name',
          'project_types.name as project_type_name',
          this.db.raw('COALESCE(project_sub_types.color_code, project_types.color_code) as project_type_color_code'),
          'project_sub_types.name as project_sub_type_name',
          'owner.name as owner_name',
          'current_phase.name as current_phase_name',
          // Calculate start_date and end_date from project phases timeline
          this.db.raw(`(
            SELECT MIN(start_date) 
            FROM project_phases_timeline 
            WHERE project_id = projects.id
          ) as start_date`),
          this.db.raw(`(
            SELECT MAX(end_date) 
            FROM project_phases_timeline 
            WHERE project_id = projects.id
          ) as end_date`)
        )
        .where('projects.id', id)
        .first();

      if (!project) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      // Get phases timeline
      const phases = await this.db('project_phases_timeline')
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'project_phases.name as phase_name',
          'project_phases.description as phase_description'
        )
        .where('project_phases_timeline.project_id', id)
        .orderBy('project_phases_timeline.start_date');

      // Get assignments
      const assignments = await this.db('project_assignments')
        .join('people', 'project_assignments.person_id', 'people.id')
        .join('roles', 'project_assignments.role_id', 'roles.id')
        .select(
          'project_assignments.*',
          'people.name as person_name',
          'roles.name as role_name'
        )
        .where('project_assignments.project_id', id)
        .orderBy('project_assignments.start_date');

      // Get planners
      const planners = await this.db('project_planners')
        .join('people', 'project_planners.person_id', 'people.id')
        .select(
          'project_planners.*',
          'people.name as person_name'
        )
        .where('project_planners.project_id', id)
        .orderBy('project_planners.is_primary_planner', 'desc');

      return {
        ...project,
        phases,
        assignments,
        planners
      };
    }, res, 'Failed to fetch project');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const projectData = req.body;

    const result = await this.executeQuery(async () => {
      // Validate project type and sub-type relationship
      await this.validateProjectSubType(projectData.project_type_id, projectData.project_sub_type_id);

      const [project] = await this.db('projects')
        .insert({
          ...projectData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return project;
    }, res, 'Failed to create project');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      // Get current project to track timeline changes
      const currentProject = await this.db('projects').where('id', id).first();
      
      // Validate project type and sub-type relationship
      if (updateData.project_type_id || updateData.project_sub_type_id) {
        const typeId = updateData.project_type_id || currentProject?.project_type_id;
        const subTypeId = updateData.project_sub_type_id || currentProject?.project_sub_type_id;
        
        await this.validateProjectSubType(typeId, subTypeId);
      }

      const [project] = await this.db('projects')
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      if (!project) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      // Send timeline change notifications if dates changed
      if (currentProject && (updateData.aspiration_start || updateData.aspiration_finish)) {
        try {
          const oldStart = currentProject.aspiration_start ? new Date(currentProject.aspiration_start) : null;
          const newStart = updateData.aspiration_start ? new Date(updateData.aspiration_start) : oldStart;
          const oldEnd = currentProject.aspiration_finish ? new Date(currentProject.aspiration_finish) : null;
          const newEnd = updateData.aspiration_finish ? new Date(updateData.aspiration_finish) : oldEnd;
          
          // Only send if dates actually changed
          if ((oldStart?.getTime() !== newStart?.getTime()) || (oldEnd?.getTime() !== newEnd?.getTime())) {
            await notificationScheduler.sendProjectTimelineNotification(
              id,
              oldStart,
              newStart,
              oldEnd,
              newEnd
            );
          }
        } catch (error) {
          console.error('Failed to send project timeline notification:', error);
        }
      }

      return project;
    }, res, 'Failed to update project');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('projects')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      return { message: 'Project deleted successfully' };
    }, res, 'Failed to delete project');

    if (result) {
      res.json(result);
    }
  }

  async getHealth(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const healthData = await this.db('project_health_view').select('*');
      return healthData;
    }, res, 'Failed to fetch project health data');

    if (result) {
      res.json(result);
    }
  }

  async getDemands(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const demands = await this.db('project_demands_view')
        .join('roles', 'project_demands_view.role_id', 'roles.id')
        .select(
          'project_demands_view.*',
          'roles.name as role_name'
        )
        .where('project_demands_view.project_id', id)
        .orderBy('project_demands_view.start_date');

      return demands;
    }, res, 'Failed to fetch project demands');

    if (result) {
      res.json(result);
    }
  }

  async deleteTestData(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Delete test projects (ones with "Test_" in name)
      const deleted = await this.db('projects')
        .where('name', 'like', 'Test_%')
        .del();

      return { message: `Deleted ${deleted} test projects` };
    }, res, 'Failed to delete test data');

    if (result) {
      res.json(result);
    }
  }
}
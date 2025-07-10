import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

export class ProjectsController extends BaseController {
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
        .leftJoin('people as owner', 'projects.owner_id', 'owner.id')
        .select(
          'projects.*',
          'locations.name as location_name',
          'project_types.name as project_type_name',
          'owner.name as owner_name'
        );

      query = this.buildFilters(query, filters);
      query = this.paginate(query, page, limit);

      const projects = await query;
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
        .leftJoin('people as owner', 'projects.owner_id', 'owner.id')
        .select(
          'projects.*',
          'locations.name as location_name',
          'project_types.name as project_type_name',
          'owner.name as owner_name'
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
}
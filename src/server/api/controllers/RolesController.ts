import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

export class RolesController extends BaseController {
  async getAll(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const roles = await this.db('roles')
        .select('*')
        .orderBy('name');

      return roles;
    }, res, 'Failed to fetch roles');

    if (result) {
      res.json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const role = await this.db('roles')
        .where('id', id)
        .first();

      if (!role) {
        this.handleNotFound(res, 'Role');
        return null;
      }

      // Get people with this role
      const people = await this.db('person_roles')
        .join('people', 'person_roles.person_id', 'people.id')
        .select(
          'person_roles.*',
          'people.name as person_name',
          'people.email as person_email'
        )
        .where('person_roles.role_id', id);

      // Get role planners
      const planners = await this.db('role_planners')
        .join('people', 'role_planners.person_id', 'people.id')
        .select(
          'role_planners.*',
          'people.name as person_name'
        )
        .where('role_planners.role_id', id)
        .orderBy('role_planners.is_primary', 'desc');

      // Get standard allocations
      const standardAllocations = await this.db('standard_allocations')
        .join('project_types', 'standard_allocations.project_type_id', 'project_types.id')
        .join('project_phases', 'standard_allocations.phase_id', 'project_phases.id')
        .select(
          'standard_allocations.*',
          'project_types.name as project_type_name',
          'project_phases.name as phase_name'
        )
        .where('standard_allocations.role_id', id);

      return {
        ...role,
        people,
        planners,
        standardAllocations
      };
    }, res, 'Failed to fetch role');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const roleData = req.body;

    const result = await this.executeQuery(async () => {
      const [role] = await this.db('roles')
        .insert({
          ...roleData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return role;
    }, res, 'Failed to create role');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      const [role] = await this.db('roles')
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      if (!role) {
        this.handleNotFound(res, 'Role');
        return null;
      }

      return role;
    }, res, 'Failed to update role');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('roles')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Role');
        return null;
      }

      return { message: 'Role deleted successfully' };
    }, res, 'Failed to delete role');

    if (result) {
      res.json(result);
    }
  }

  async addPlanner(req: Request, res: Response) {
    const { id } = req.params;
    const plannerData = req.body;

    const result = await this.executeQuery(async () => {
      const [rolePlanner] = await this.db('role_planners')
        .insert({
          role_id: id,
          ...plannerData,
          assigned_at: new Date()
        })
        .returning('*');

      return rolePlanner;
    }, res, 'Failed to add role planner');

    if (result) {
      res.status(201).json(result);
    }
  }

  async removePlanner(req: Request, res: Response) {
    const { id, plannerId } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('role_planners')
        .where('role_id', id)
        .where('person_id', plannerId)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Role planner assignment');
        return null;
      }

      return { message: 'Role planner removed successfully' };
    }, res, 'Failed to remove role planner');

    if (result) {
      res.json(result);
    }
  }

  async getCapacityGaps(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const gaps = await this.db('capacity_gaps_view')
        .select('*')
        .orderBy('gap_fte', 'desc');

      return gaps;
    }, res, 'Failed to fetch capacity gaps');

    if (result) {
      res.json(result);
    }
  }

  async getExpertiseLevels(req: Request, res: Response) {
    try {
      const expertiseLevels = [
        { level: 1, name: 'Novice', description: 'Learning the fundamentals, requires supervision' },
        { level: 2, name: 'Beginner', description: 'Some experience, occasional guidance needed' },
        { level: 3, name: 'Intermediate', description: 'Solid competency, works independently' },
        { level: 4, name: 'Advanced', description: 'Highly skilled, mentors others' },
        { level: 5, name: 'Expert', description: 'Domain expert, thought leader' }
      ];

      res.json({ data: expertiseLevels });
    } catch (error) {
      console.error('Error fetching expertise levels:', error);
      res.status(500).json({ error: 'Failed to fetch expertise levels' });
    }
  }
}
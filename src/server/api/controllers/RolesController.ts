import type { Request, Response } from 'express';
import { BaseController, RequestWithContext } from './BaseController.js';

// Alias for backward compatibility
type RequestWithLogging = RequestWithContext;

export class RolesController extends BaseController {
  constructor() {
    super({ enableLogging: true });
  }
  getAll = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const result = await this.executeQuery(async () => {
      const roles = await this.db('roles')
        .select(
          'roles.*',
          this.db.raw(`(
            SELECT COUNT(DISTINCT pr.person_id)
            FROM person_roles pr
            WHERE pr.role_id = roles.id AND pr.is_primary = 1
          ) as people_count`),
          this.db.raw(`(
            SELECT COUNT(*)
            FROM role_planners
            WHERE role_planners.role_id = roles.id
          ) as planners_count`),
          this.db.raw(`(
            SELECT COUNT(*)
            FROM resource_templates
            WHERE resource_templates.role_id = roles.id
          ) as standard_allocations_count`)
        )
        .orderBy('name');

      return roles;
    }, req, res, 'Failed to fetch roles');

    if (result) {
      this.sendSuccess(req, res, result, 'Roles fetched successfully');
    }
  })

  async getById(req: RequestWithLogging, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const role = await this.db('roles')
        .where('id', id)
        .first();

      if (!role) {
        this.handleNotFound(req, res, 'Role');
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

      // Get resource templates (renamed from standard_allocations)
      const resourceTemplates = await this.db('resource_templates')
        .join('project_types', 'resource_templates.project_type_id', 'project_types.id')
        .join('project_phases', 'resource_templates.phase_id', 'project_phases.id')
        .select(
          'resource_templates.*',
          'project_types.name as project_type_name',
          'project_phases.name as phase_name'
        )
        .where('resource_templates.role_id', id);

      return {
        ...role,
        people,
        planners,
        resourceTemplates
      };
    }, req, res, 'Failed to fetch role');

    if (result) {
      res.json(result);
    }
  }

  async create(req: RequestWithLogging, res: Response) {
    const roleData = req.body;

    const result = await this.executeQuery(async () => {
      const [role] = await this.db('roles')
        .insert({
          ...roleData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Log audit event for role creation
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'roles',
          role.id,
          'CREATE',
          null,
          role,
          `Role created: ${role.name}`
        );
      }

      return role;
    }, req, res, 'Failed to create role');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: RequestWithLogging, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      // Get existing role for audit trail
      const existingRole = await this.db('roles')
        .where('id', id)
        .first();

      if (!existingRole) {
        this.handleNotFound(req, res, 'Role');
        return null;
      }

      const [role] = await this.db('roles')
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      if (!role) {
        this.handleNotFound(req, res, 'Role');
        return null;
      }

      // Log audit event for role update
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'roles',
          id,
          'UPDATE',
          existingRole,
          role,
          `Role updated: ${role.name}`
        );
      }

      return role;
    }, req, res, 'Failed to update role');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: RequestWithLogging, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      // Get existing role for audit trail
      const existingRole = await this.db('roles')
        .where('id', id)
        .first();

      if (!existingRole) {
        this.handleNotFound(req, res, 'Role');
        return null;
      }

      const deletedCount = await this.db('roles')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(req, res, 'Role');
        return null;
      }

      // Log audit event for role deletion
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'roles',
          id,
          'DELETE',
          existingRole,
          null,
          `Role deleted: ${existingRole.name}`
        );
      }

      return { message: 'Role deleted successfully' };
    }, req, res, 'Failed to delete role');

    if (result) {
      res.json(result);
    }
  }

  async addPlanner(req: RequestWithLogging, res: Response) {
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

      // Log audit event for role planner addition
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'role_planners',
          `${id}-${rolePlanner.person_id}`,
          'CREATE',
          null,
          rolePlanner,
          `Role planner added to role ${id}`
        );
      }

      return rolePlanner;
    }, req, res, 'Failed to add role planner');

    if (result) {
      res.status(201).json(result);
    }
  }

  async removePlanner(req: RequestWithLogging, res: Response) {
    const { id, plannerId } = req.params;

    const result = await this.executeQuery(async () => {
      // Get existing role planner for audit trail
      const existingPlanner = await this.db('role_planners')
        .where('role_id', id)
        .where('person_id', plannerId)
        .first();

      if (!existingPlanner) {
        this.handleNotFound(req, res, 'Role planner assignment');
        return null;
      }

      const deletedCount = await this.db('role_planners')
        .where('role_id', id)
        .where('person_id', plannerId)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(req, res, 'Role planner assignment');
        return null;
      }

      // Log audit event for role planner removal
      if ((req as any).logAuditEvent) {
        await (req as any).logAuditEvent(
          'role_planners',
          `${id}-${plannerId}`,
          'DELETE',
          existingPlanner,
          null,
          `Role planner removed from role ${id}`
        );
      }

      return { message: 'Role planner removed successfully' };
    }, req, res, 'Failed to remove role planner');

    if (result) {
      res.json(result);
    }
  }

  async getCapacityGaps(req: RequestWithLogging, res: Response) {
    const result = await this.executeQuery(async () => {
      const gaps = await this.db('capacity_gaps_view')
        .select('*')
        .orderBy('gap_fte', 'desc');

      return gaps;
    }, req, res, 'Failed to fetch capacity gaps');

    if (result) {
      res.json(result);
    }
  }

  async getExpertiseLevels(req: RequestWithLogging, res: Response) {
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
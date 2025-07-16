import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { auditModelChanges } from '../../middleware/auditMiddleware.js';
import { isTableAudited } from '../../config/auditConfig.js';

export class PeopleController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      primary_role_id: req.query.primary_role_id,
      supervisor_id: req.query.supervisor_id,
      worker_type: req.query.worker_type
    };

    const result = await this.executeQuery(async () => {
      let query = this.db('people')
        .leftJoin('people as supervisor', 'people.supervisor_id', 'supervisor.id')
        .leftJoin('roles as primary_role', 'people.primary_role_id', 'primary_role.id')
        .select(
          'people.*',
          'supervisor.name as supervisor_name',
          'primary_role.name as primary_role_name'
        );

      query = this.buildFilters(query, filters);
      query = this.paginate(query, page, limit);

      const people = await query;
      const total = await this.db('people').count('* as count').first();

      return {
        data: people,
        pagination: {
          page,
          limit,
          total: total?.count || 0,
          totalPages: Math.ceil((total?.count || 0) / limit)
        }
      };
    }, res, 'Failed to fetch people');

    if (result) {
      res.json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const person = await this.db('people')
        .leftJoin('people as supervisor', 'people.supervisor_id', 'supervisor.id')
        .leftJoin('roles as primary_role', 'people.primary_role_id', 'primary_role.id')
        .select(
          'people.*',
          'supervisor.name as supervisor_name',
          'primary_role.name as primary_role_name'
        )
        .where('people.id', id)
        .first();

      if (!person) {
        this.handleNotFound(res, 'Person');
        return null;
      }

      // Get roles
      const roles = await this.db('person_roles')
        .join('roles', 'person_roles.role_id', 'roles.id')
        .select(
          'person_roles.*',
          'roles.name as role_name',
          'roles.description as role_description'
        )
        .where('person_roles.person_id', id);

      // Get current assignments
      const assignments = await this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .join('roles', 'project_assignments.role_id', 'roles.id')
        .select(
          'project_assignments.*',
          'projects.name as project_name',
          'roles.name as role_name'
        )
        .where('project_assignments.person_id', id)
        .where('project_assignments.end_date', '>=', new Date())
        .orderBy('project_assignments.start_date');

      // Get availability overrides
      const availabilityOverrides = await this.db('person_availability_overrides')
        .where('person_id', id)
        .orderBy('start_date', 'desc');

      return {
        ...person,
        roles,
        assignments,
        availabilityOverrides
      };
    }, res, 'Failed to fetch person');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const personData = req.body;

    // Filter out fields that don't exist in the people table (based on 001_complete_schema.ts)
    const validFields = [
      'name', 'email', 'primary_role_id', 'worker_type', 'supervisor_id',
      'default_availability_percentage', 'default_hours_per_day'
    ];
    
    const filteredData = Object.keys(personData)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = personData[key];
        return obj;
      }, {} as any);

    const result = await this.executeQuery(async () => {
      const [person] = await this.db('people')
        .insert({
          ...filteredData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      // Log audit entry for creation
      if (isTableAudited('people')) {
        await auditModelChanges(
          req,
          'people',
          person.id,
          'CREATE',
          undefined,
          person,
          `Created person: ${person.name}`
        );
      }

      return person;
    }, res, 'Failed to create person');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    // Filter out fields that don't exist in the people table (based on 001_complete_schema.ts)
    const validFields = [
      'name', 'email', 'primary_role_id', 'worker_type', 'supervisor_id',
      'default_availability_percentage', 'default_hours_per_day'
    ];
    
    const filteredData = Object.keys(updateData)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);

    const result = await this.executeQuery(async () => {
      const [person] = await this.db('people')
        .where('id', id)
        .update({
          ...filteredData,
          updated_at: new Date()
        })
        .returning('*');

      if (!person) {
        this.handleNotFound(res, 'Person');
        return null;
      }

      return person;
    }, res, 'Failed to update person');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('people')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Person');
        return null;
      }

      return { message: 'Person deleted successfully' };
    }, res, 'Failed to delete person');

    if (result) {
      res.json(result);
    }
  }

  async getUtilization(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const utilization = await this.db('person_utilization_view').select('*');
      return utilization;
    }, res, 'Failed to fetch person utilization data');

    if (result) {
      res.json(result);
    }
  }

  async getAvailability(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const availability = await this.db('person_availability_view').select('*');
      return availability;
    }, res, 'Failed to fetch person availability data');

    if (result) {
      res.json(result);
    }
  }

  async addRole(req: Request, res: Response) {
    const { id } = req.params;
    const { role_id, proficiency_level, years_experience, notes } = req.body;

    const result = await this.executeQuery(async () => {
      const [personRole] = await this.db('person_roles')
        .insert({
          person_id: id,
          role_id,
          proficiency_level,
          years_experience,
          notes,
          assigned_at: new Date()
        })
        .returning('*');

      return personRole;
    }, res, 'Failed to add role to person');

    if (result) {
      res.status(201).json(result);
    }
  }

  async removeRole(req: Request, res: Response) {
    const { id, roleId } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('person_roles')
        .where('person_id', id)
        .where('role_id', roleId)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Person role assignment');
        return null;
      }

      return { message: 'Role removed from person successfully' };
    }, res, 'Failed to remove role from person');

    if (result) {
      res.json(result);
    }
  }

  async deleteTestData(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Delete test people (ones with "Test_" in name)
      const deleted = await this.db('people')
        .where('name', 'like', 'Test_%')
        .del();

      return { message: `Deleted ${deleted} test people` };
    }, res, 'Failed to delete test data');

    if (result) {
      res.json(result);
    }
  }
}
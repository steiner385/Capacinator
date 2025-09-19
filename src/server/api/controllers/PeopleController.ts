import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { auditModelChanges } from '../../middleware/auditMiddleware.js';
import { isTableAudited } from '../../config/auditConfig.js';
import { v4 as uuidv4 } from 'uuid';

export class PeopleController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      primary_role_id: req.query.primary_role_id, // Still allow filtering by role_id for API compatibility
      supervisor_id: req.query.supervisor_id,
      worker_type: req.query.worker_type,
      location_id: req.query.location_id || req.query.location
    };

    const result = await this.executeQuery(async () => {
      let query = this.db('people')
        .leftJoin('people as supervisor', 'people.supervisor_id', 'supervisor.id')
        .leftJoin('person_roles as primary_person_role', 'people.primary_person_role_id', 'primary_person_role.id')
        .leftJoin('roles as primary_role', 'primary_person_role.role_id', 'primary_role.id')
        .leftJoin('locations', 'people.location_id', 'locations.id')
        .select(
          'people.*',
          'supervisor.name as supervisor_name',
          'primary_role.name as primary_role_name',
          'primary_person_role.proficiency_level as primary_role_proficiency_level',
          'locations.name as location_name'
        );

      // Apply filters manually to handle table prefixes correctly
      if (filters.primary_role_id) query = query.where('primary_role.id', filters.primary_role_id);
      if (filters.supervisor_id) query = query.where('people.supervisor_id', filters.supervisor_id);
      if (filters.worker_type) query = query.where('people.worker_type', filters.worker_type);
      if (filters.location_id) query = query.where('people.location_id', filters.location_id);
      query = this.paginate(query, page, limit);

      const people = await query;
      const total = await this.db('people').count('* as count').first();

      return {
        data: people,
        pagination: {
          page,
          limit,
          total: total?.count || 0,
          totalPages: Math.ceil((Number(total?.count) || 0) / limit)
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
        .leftJoin('person_roles as primary_person_role', 'people.primary_person_role_id', 'primary_person_role.id')
        .leftJoin('roles as primary_role', 'primary_person_role.role_id', 'primary_role.id')
        .leftJoin('locations', 'people.location_id', 'locations.id')
        .select(
          'people.*',
          'supervisor.name as supervisor_name',
          'primary_role.name as primary_role_name',
          'primary_person_role.proficiency_level as primary_role_proficiency_level',
          'locations.name as location_name'
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
        .leftJoin('project_phases', 'project_assignments.phase_id', 'project_phases.id')
        .select(
          'project_assignments.*',
          'projects.name as project_name',
          'roles.name as role_name',
          'project_phases.name as phase_name'
        )
        .where('project_assignments.person_id', id)
        .where(function() {
          // Use computed_end_date if available, otherwise use end_date
          this.where('project_assignments.computed_end_date', '>=', new Date())
            .orWhere(function() {
              this.whereNull('project_assignments.computed_end_date')
                .andWhere('project_assignments.end_date', '>=', new Date());
            });
        })
        .orderBy(this.db.raw('COALESCE(project_assignments.computed_start_date, project_assignments.start_date)'));

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

    // Filter out fields that don't exist in the people table (based on 002_fix_primary_role_foreign_key.ts)
    const validFields = [
      'name', 'email', 'primary_person_role_id', 'worker_type', 'supervisor_id',
      'default_availability_percentage', 'default_hours_per_day', 'location_id'
    ];
    
    const filteredData = Object.keys(personData)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = personData[key];
        return obj;
      }, {} as any);

    const result = await this.executeQuery(async () => {
      // Generate a UUID for the person
      const personId = uuidv4();
      
      // Insert with generated ID
      await this.db('people')
        .insert({
          id: personId,
          ...filteredData,
          created_at: new Date(),
          updated_at: new Date()
        });

      // Fetch the created person
      const [person] = await this.db('people')
        .where({ id: personId })
        .select('*');

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

    // Filter out fields that don't exist in the people table (based on 002_fix_primary_role_foreign_key.ts)
    const validFields = [
      'name', 'email', 'primary_person_role_id', 'worker_type', 'supervisor_id',
      'default_availability_percentage', 'default_hours_per_day', 'location_id'
    ];
    
    const filteredData = Object.keys(updateData)
      .filter(key => validFields.includes(key))
      .reduce((obj, key) => {
        let value = updateData[key];
        // Convert empty strings to null for foreign key fields to avoid constraint violations
        if ((key === 'supervisor_id' || key === 'primary_person_role_id' || key === 'location_id') && value === '') {
          value = null;
        }
        obj[key] = value;
        return obj;
      }, {} as any);

    const result = await this.executeQuery(async () => {
      // First update the record
      const updatedCount = await this.db('people')
        .where('id', id)
        .update({
          ...filteredData,
          updated_at: new Date()
        });

      if (updatedCount === 0) {
        this.handleNotFound(res, 'Person');
        return null;
      }

      // Then fetch the updated record
      const [person] = await this.db('people')
        .where({ id })
        .select('*');

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

  async getPersonUtilizationTimeline(req: Request, res: Response) {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      // Get person details
      const person = await this.db('people')
        .where('id', id)
        .select('name', 'default_availability_percentage', 'default_hours_per_day')
        .first();

      if (!person) {
        throw new Error('Person not found');
      }

      // Get project assignments for this person with date filtering
      let assignmentsQuery = this.db('project_assignments')
        .join('projects', 'project_assignments.project_id', 'projects.id')
        .where('project_assignments.person_id', id)
        .select(
          'project_assignments.allocation_percentage',
          'project_assignments.start_date',
          'project_assignments.end_date',
          'projects.name as project_name'
        );

      if (startDate) {
        assignmentsQuery = assignmentsQuery.where('project_assignments.end_date', '>=', startDate);
      }
      if (endDate) {
        assignmentsQuery = assignmentsQuery.where('project_assignments.start_date', '<=', endDate);
      }

      const assignments = await assignmentsQuery.orderBy('project_assignments.start_date');

      // Create timeline data by month
      const timelineStart = new Date(startDate as string || '2023-01-01');
      const timelineEnd = new Date(endDate as string || '2026-12-31');
      const timeline: Array<{
        month: string;
        availability: number;
        utilization: number;
        over_allocated: boolean;
      }> = [];

      // Generate monthly data points
      let currentDate = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
      
      while (currentDate <= timelineEnd) {
        const monthStart = new Date(currentDate);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Calculate utilization for this month
        let monthUtilization = 0;
        
        assignments.forEach(assignment => {
          const assignStart = new Date(assignment.start_date);
          const assignEnd = new Date(assignment.end_date);
          
          // Check if assignment overlaps with this month
          if (assignStart <= monthEnd && assignEnd >= monthStart) {
            monthUtilization += assignment.allocation_percentage;
          }
        });

        timeline.push({
          month: currentDate.toISOString().substring(0, 7), // YYYY-MM format
          availability: person.default_availability_percentage,
          utilization: monthUtilization,
          over_allocated: monthUtilization > person.default_availability_percentage
        });

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return {
        personName: person.name,
        defaultAvailability: person.default_availability_percentage,
        timeline: timeline.filter(item => item.utilization > 0 || 
          (timeline.some(t => t.utilization > 0) && 
           new Date(item.month) >= new Date(assignments[0]?.start_date || timelineStart) &&
           new Date(item.month) <= new Date(assignments[assignments.length - 1]?.end_date || timelineEnd)))
      };
    }, res, 'Failed to fetch person utilization timeline');

    if (result) {
      res.json(result);
    }
  }

  async addRole(req: Request, res: Response) {
    const { id } = req.params;
    const { role_id, proficiency_level = 3, is_primary = false } = req.body;

    // Validate proficiency level
    if (proficiency_level < 1 || proficiency_level > 5) {
      return res.status(400).json({ 
        error: 'Proficiency level must be between 1 (novice) and 5 (expert)' 
      });
    }

    const result = await this.executeQuery(async () => {
      return await this.db.transaction(async (trx) => {
        // Check if person already has this role
        const existingPersonRole = await trx('person_roles')
          .where('person_id', id)
          .where('role_id', role_id)
          .first();

        if (existingPersonRole) {
          throw new Error('Person already has this role. Use PUT to update expertise level.');
        }

        // If setting as primary, remove primary flag from other roles
        if (is_primary) {
          await trx('person_roles')
            .where('person_id', id)
            .update({ is_primary: false });

        }

        // Generate UUID for the person role
        const personRoleId = uuidv4();

        // Insert the new person role
        await trx('person_roles')
          .insert({
            id: personRoleId,
            person_id: id,
            role_id,
            proficiency_level,
            is_primary
          });

        // Fetch the inserted record
        const [insertedPersonRole] = await trx('person_roles')
          .where({ id: personRoleId })
          .select('*');

        // If this is the primary role, update the people table reference
        if (is_primary) {
          await trx('people')
            .where('id', id)
            .update({ primary_person_role_id: insertedPersonRole.id });
        }

        // Return the created person role with role details
        const personRole = await trx('person_roles as pr')
          .join('roles as r', 'pr.role_id', 'r.id')
          .where('pr.id', insertedPersonRole.id)
          .select(
            'pr.id',
            'pr.person_id',
            'pr.role_id',
            'pr.proficiency_level',
            'pr.is_primary',
            'r.name as role_name',
            'r.description as role_description'
          )
          .first();

        return personRole;
      });
    }, res, 'Failed to add role to person');

    if (result) {
      res.status(201).json(result);
    }
  }

  async getRoles(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const personRoles = await this.db('person_roles as pr')
        .join('roles as r', 'pr.role_id', 'r.id')
        .join('people as p', 'pr.person_id', 'p.id')
        .where('pr.person_id', id)
        .select(
          'pr.id',
          'pr.person_id',
          'pr.role_id',
          'pr.proficiency_level',
          'pr.is_primary',
          'r.name as role_name',
          'r.description as role_description',
          'p.name as person_name'
        )
        .orderBy('pr.is_primary', 'desc')
        .orderBy('pr.proficiency_level', 'desc');

      return personRoles;
    }, res, 'Failed to fetch person roles');

    if (result) {
      res.json({ data: result });
    }
  }

  async updateRole(req: Request, res: Response) {
    const { id, roleId } = req.params;
    const { proficiency_level, is_primary } = req.body;

    // Validate proficiency level if provided
    if (proficiency_level !== undefined && (proficiency_level < 1 || proficiency_level > 5)) {
      return res.status(400).json({ 
        error: 'Proficiency level must be between 1 (novice) and 5 (expert)' 
      });
    }

    const result = await this.executeQuery(async () => {
      // Check if person role exists
      const existingPersonRole = await this.db('person_roles')
        .where('person_id', id)
        .where('role_id', roleId)
        .first();

      if (!existingPersonRole) {
        throw new Error('Person role not found');
      }

      return await this.db.transaction(async (trx) => {
        // If setting as primary, remove primary flag from other roles
        if (is_primary) {
          await trx('person_roles')
            .where('person_id', id)
            .update({ is_primary: false });
        }

        // Update the person role
        const updateData: any = {};
        if (proficiency_level !== undefined) updateData.proficiency_level = proficiency_level;
        if (is_primary !== undefined) updateData.is_primary = is_primary;

        await trx('person_roles')
          .where('person_id', id)
          .where('role_id', roleId)
          .update(updateData);

        // If setting as primary, update the primary_person_role_id in people table
        if (is_primary) {
          await trx('people')
            .where('id', id)
            .update({ primary_person_role_id: existingPersonRole.id });
        }

        // Return the updated person role with role details
        const updatedPersonRole = await trx('person_roles as pr')
          .join('roles as r', 'pr.role_id', 'r.id')
          .where('pr.person_id', id)
          .where('pr.role_id', roleId)
          .select(
            'pr.id',
            'pr.person_id',
            'pr.role_id',
            'pr.proficiency_level',
            'pr.is_primary',
            'r.name as role_name',
            'r.description as role_description'
          )
          .first();

        return updatedPersonRole;
      });
    }, res, 'Failed to update person role');

    if (result) {
      res.json({ data: result });
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
import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';

export class PersonRolesController extends BaseController {
  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  /**
   * Get all roles for a specific person with expertise levels
   */
  async getPersonRoles(req: Request, res: Response) {
    try {
      const { personId } = req.params;
      
      const personRoles = await this.db('person_roles as pr')
        .join('roles as r', 'pr.role_id', 'r.id')
        .join('people as p', 'pr.person_id', 'p.id')
        .where('pr.person_id', personId)
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

      res.json({ data: personRoles });
    } catch (error) {
      console.error('Error fetching person roles:', error);
      res.status(500).json({ error: 'Failed to fetch person roles' });
    }
  }

  /**
   * Add a role to a person with expertise level
   */
  async addPersonRole(req: Request, res: Response) {
    try {
      const { personId } = req.params;
      const { role_id, proficiency_level = 3, is_primary = false } = req.body;

      // Validate proficiency level
      if (proficiency_level < 1 || proficiency_level > 5) {
        return res.status(400).json({ 
          error: 'Proficiency level must be between 1 (novice) and 5 (expert)' 
        });
      }

      // Check if person exists
      const person = await this.db('people').where('id', personId).first();
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }

      // Check if role exists  
      const role = await this.db('roles').where('id', role_id).first();
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if person already has this role
      const existingPersonRole = await this.db('person_roles')
        .where('person_id', personId)
        .where('role_id', role_id)
        .first();

      if (existingPersonRole) {
        return res.status(409).json({ 
          error: 'Person already has this role. Use PUT to update expertise level.' 
        });
      }

      // If setting as primary, remove primary flag from other roles
      if (is_primary) {
        await this.db('person_roles')
          .where('person_id', personId)
          .update({ is_primary: false });
      }

      // Create the person role
      const [insertedPersonRole] = await this.db('person_roles')
        .insert({
          person_id: personId,
          role_id,
          proficiency_level,
          is_primary
        })
        .returning('*');

      // If setting as primary, update the primary_person_role_id in people table
      if (is_primary) {
        await this.db('people')
          .where('id', personId)
          .update({ primary_person_role_id: insertedPersonRole.id });
      }

      // Return the created person role with role details
      const result = await this.db('person_roles as pr')
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

      res.status(201).json({ data: result });
    } catch (error) {
      console.error('Error adding person role:', error);
      res.status(500).json({ error: 'Failed to add person role' });
    }
  }

  /**
   * Update expertise level for a person's role
   */
  async updatePersonRole(req: Request, res: Response) {
    try {
      const { personId, roleId } = req.params;
      const { proficiency_level, is_primary } = req.body;

      // Validate proficiency level if provided
      if (proficiency_level !== undefined && (proficiency_level < 1 || proficiency_level > 5)) {
        return res.status(400).json({ 
          error: 'Proficiency level must be between 1 (novice) and 5 (expert)' 
        });
      }

      // Check if person role exists
      const existingPersonRole = await this.db('person_roles')
        .where('person_id', personId)
        .where('role_id', roleId)
        .first();

      if (!existingPersonRole) {
        return res.status(404).json({ error: 'Person role not found' });
      }

      // If setting as primary, remove primary flag from other roles
      if (is_primary) {
        await this.db('person_roles')
          .where('person_id', personId)
          .update({ is_primary: false });

        // Also update the primary_person_role_id in people table
        await this.db('people')
          .where('id', personId)
          .update({ primary_person_role_id: existingPersonRole.id });
      }

      // Update the person role
      const updateData: any = {};
      if (proficiency_level !== undefined) updateData.proficiency_level = proficiency_level;
      if (is_primary !== undefined) updateData.is_primary = is_primary;

      await this.db('person_roles')
        .where('person_id', personId)
        .where('role_id', roleId)
        .update(updateData);

      // Return the updated person role with role details
      const result = await this.db('person_roles as pr')
        .join('roles as r', 'pr.role_id', 'r.id')
        .where('pr.person_id', personId)
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

      res.json({ data: result });
    } catch (error) {
      console.error('Error updating person role:', error);
      res.status(500).json({ error: 'Failed to update person role' });
    }
  }

  /**
   * Remove a role from a person
   */
  async removePersonRole(req: Request, res: Response) {
    try {
      const { personId, roleId } = req.params;

      // Check if person role exists
      const existingPersonRole = await this.db('person_roles')
        .where('person_id', personId)
        .where('role_id', roleId)
        .first();

      if (!existingPersonRole) {
        return res.status(404).json({ error: 'Person role not found' });
      }

      // Check if this is the person's primary role
      if (existingPersonRole.is_primary) {
        // Check if person has other roles
        const otherRoles = await this.db('person_roles')
          .where('person_id', personId)
          .where('role_id', '!=', roleId)
          .orderBy('proficiency_level', 'desc');

        if (otherRoles.length > 0) {
          // Set the highest proficiency role as new primary
          const newPrimaryRole = otherRoles[0];
          await this.db('person_roles')
            .where('id', newPrimaryRole.id)
            .update({ is_primary: true });

          // Update primary_person_role_id in people table
          await this.db('people')
            .where('id', personId)
            .update({ primary_person_role_id: newPrimaryRole.id });
        } else {
          // No other roles, clear primary_person_role_id
          await this.db('people')
            .where('id', personId)
            .update({ primary_person_role_id: null });
        }
      }

      // Remove the person role
      await this.db('person_roles')
        .where('person_id', personId)
        .where('role_id', roleId)
        .del();

      res.status(204).send();
    } catch (error) {
      console.error('Error removing person role:', error);
      res.status(500).json({ error: 'Failed to remove person role' });
    }
  }

  /**
   * Get expertise level definitions
   */
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
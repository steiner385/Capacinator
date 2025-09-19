import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

export class ResourceTemplatesController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      project_type_id: req.query.project_type_id,
      phase_id: req.query.phase_id,
      role_id: req.query.role_id
    };

    // Generate a UUID for the resource templates


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('resource_templates')


      .insert({


        id: resultId,


        ...{
          ...allocationData,
          is_inherited: isInherited,
          parent_template_id: parentTemplateId,
          created_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('resource_templates')


      .where({ id: resultId })


      .select('*');

      // If this is a parent project type, propagate to children
      if (projectType.parent_id === null) {
        await this.propagateTemplateToChildren(allocation.project_type_id, allocation);
      }

      return allocation;
    }, res, 'Failed to create allocation');

    if (result) {
      res.status(201).json(result);
    }
  }

  async bulkUpdate(req: Request, res: Response) {
    const { project_type_id, allocations } = req.body;

    // Generate a UUID for the project types


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('project_types')


      .insert({


        id: resultId,


        ...{
                  project_type_id,
                  phase_id: allocation.phase_id,
                  role_id: allocation.role_id,
                  allocation_percentage: allocation.allocation_percentage,
                  is_inherited: false,
                  parent_template_id: null,
                  created_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('project_types')


      .where({ id: resultId })


      .select('*');
              
              results.created.push(created);
            }
          } catch (error) {
            results.failed.push({
              allocation,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });

      // If this is a parent project type, propagate changes to children
      if (projectType.parent_id === null) {
        for (const createdTemplate of results.created) {
          await this.propagateTemplateToChildren(project_type_id, createdTemplate);
        }
        for (const updatedTemplate of results.updated) {
          await this.propagateTemplateToChildren(project_type_id, updatedTemplate);
        }
      }

      return {
        summary: {
          total: allocations.length,
          created: results.created.length,
          updated: results.updated.length,
          failed: results.failed.length
        },
        results
      };
    }, res, 'Failed to bulk update allocations');

    if (result) {
      res.json(result);
    }
  }

  async copy(req: Request, res: Response) {
    const { source_project_type_id, target_project_type_id } = req.body;

    // Generate a UUID for the project types


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('project_types')


      .insert({


        id: resultId,


        ...newAllocations


      });



    // Fetch the created record


    const [result] = await this.db('project_types')


      .where({ id: resultId })


      .select('*');

      return {
        source: {
          id: source_project_type_id,
          name: sourceType.name,
          allocation_count: sourceAllocations.length
        },
        target: {
          id: target_project_type_id,
          name: targetType.name,
          allocation_count: inserted.length
        },
        copied_allocations: inserted.length
      };
    }, res, 'Failed to copy allocations');

    if (result) {
      res.json(result);
    }
  }

  async getTemplates(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Get project types with allocation counts
      const templates = await this.db('project_types')
        .leftJoin(
          this.db('resource_templates')
            .select('project_type_id')
            .count('* as allocation_count')
            .groupBy('project_type_id')
            .as('counts'),
          'project_types.id',
          'counts.project_type_id'
        )
        .select(
          'project_types.*',
          this.db.raw('COALESCE(counts.allocation_count, 0) as allocation_count')
        )
        .orderBy('project_types.name');

      // Get phase counts for each template
      for (const template of templates) {
        if (template.allocation_count > 0) {
          const phases = await this.db('resource_templates')
            .where('project_type_id', template.id)
            .countDistinct('phase_id as phase_count')
            .first();
          
          template.phase_count = phases?.phase_count || 0;
        } else {
          template.phase_count = 0;
        }
      }

      return {
        templates,
        summary: {
          total_templates: templates.length,
          templates_with_allocations: templates.filter(t => t.allocation_count > 0).length,
          empty_templates: templates.filter(t => t.allocation_count === 0).length
        }
      };
    }, res, 'Failed to fetch allocation templates');

    if (result) {
      res.json(result);
    }
  }

  async getSummary(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Get allocation statistics
      const stats = await this.db('resource_templates')
        .select(
          this.db.raw('COUNT(DISTINCT project_type_id) as project_types_count'),
          this.db.raw('COUNT(DISTINCT phase_id) as phases_count'),
          this.db.raw('COUNT(DISTINCT role_id) as roles_count'),
          this.db.raw('COUNT(*) as total_allocations'),
          this.db.raw('AVG(allocation_percentage) as avg_allocation'),
          this.db.raw('MAX(allocation_percentage) as max_allocation'),
          this.db.raw('MIN(allocation_percentage) as min_allocation')
        )
        .first();

      // Get allocations by project type
      const byProjectType = await this.db('resource_templates')
        .join('project_types', 'resource_templates.project_type_id', 'project_types.id')
        .select(
          'project_types.name as project_type',
          this.db.raw('COUNT(*) as allocation_count'),
          this.db.raw('SUM(allocation_percentage) as total_percentage')
        )
        .groupBy('project_types.id', 'project_types.name')
        .orderBy('allocation_count', 'desc');

      // Get allocations by role
      const byRole = await this.db('resource_templates')
        .join('roles', 'resource_templates.role_id', 'roles.id')
        .select(
          'roles.name as role',
          this.db.raw('COUNT(*) as allocation_count'),
          this.db.raw('AVG(allocation_percentage) as avg_percentage')
        )
        .groupBy('roles.id', 'roles.name')
        .orderBy('allocation_count', 'desc');

      // Get over-allocated phases (total > 100%)
      const overAllocated = await this.db('resource_templates')
        .join('project_types', 'resource_templates.project_type_id', 'project_types.id')
        .join('project_phases', 'resource_templates.phase_id', 'project_phases.id')
        .select(
          'project_types.name as project_type',
          'project_phases.name as phase',
          this.db.raw('SUM(allocation_percentage) as total_percentage')
        )
        .groupBy(
          'resource_templates.project_type_id',
          'resource_templates.phase_id',
          'project_types.name',
          'project_phases.name'
        )
        .having('total_percentage', '>', 100)
        .orderBy('total_percentage', 'desc');

      return {
        statistics: stats,
        by_project_type: byProjectType,
        by_role: byRole,
        over_allocated_phases: overAllocated,
        summary: {
          has_over_allocations: overAllocated.length > 0,
          over_allocation_count: overAllocated.length
        }
      };
    }, res, 'Failed to fetch allocation summary');

    if (result) {
      res.json(result);
    }
  }

  // Helper method to propagate template to children
  private async propagateTemplateToChildren(parentProjectTypeId: string, parentTemplate: any) {
    // Get all child project types
    const children = await this.db('project_types')
      .where('parent_id', parentProjectTypeId);

    for (const child of children) {
      // Check if child already has an override for this role/phase combination
      const existingOverride = await this.db('resource_templates')
        .where({
          project_type_id: child.id,
          phase_id: parentTemplate.phase_id,
          role_id: parentTemplate.role_id,
          is_inherited: false
        })
        .first();

      if (existingOverride) {
        // Child has an override, don't propagate
        continue;
      }

      // Check if child already has an inherited template for this role/phase
      const existingInherited = await this.db('resource_templates')
        .where({
          project_type_id: child.id,
          phase_id: parentTemplate.phase_id,
          role_id: parentTemplate.role_id,
          is_inherited: true
        })
        .first();

      if (existingInherited) {
        // Update existing inherited template
        await this.db('resource_templates')
          .where('id', existingInherited.id)
          .update({
            allocation_percentage: parentTemplate.allocation_percentage,
            parent_template_id: parentTemplate.id,
            updated_at: new Date()
          });
      } else {
        // Create new inherited template
        await this.db('resource_templates')
          .insert({
            project_type_id: child.id,
            phase_id: parentTemplate.phase_id,
            role_id: parentTemplate.role_id,
            allocation_percentage: parentTemplate.allocation_percentage,
            is_inherited: true,
            parent_template_id: parentTemplate.id,
            created_at: new Date(),
            updated_at: new Date()
          });
      }

      // Recursively propagate to grandchildren
      await this.propagateTemplateToChildren(child.id, parentTemplate);
    }
  }

  // Helper method to get effective allocations (inherited + overridden)
  async getEffectiveAllocations(projectTypeId: string) {
    try {
      // Get all templates for this project type
      const templates = await this.db('resource_templates')
        .join('project_phases', 'resource_templates.phase_id', 'project_phases.id')
        .join('roles', 'resource_templates.role_id', 'roles.id')
        .leftJoin('project_types as parent_types', 'resource_templates.parent_template_id', 'parent_types.id')
        .where('resource_templates.project_type_id', projectTypeId)
        .select(
          'resource_templates.*',
          'project_phases.name as phase_name',
          'project_phases.order_index as phase_order',
          'roles.name as role_name',
          'parent_types.name as parent_type_name'
        )
        .orderBy('project_phases.order_index', 'roles.name');

      return templates;
    } catch (error) {
      console.error('Error getting effective allocations:', error);
      return [];
    }
  }
}
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';

export class ProjectTypesController extends BaseController {
  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    // include_inactive is available via req.query.include_inactive === 'true' if needed

    const result = await this.executeQuery(async () => {
      let query = this.db('project_types')
        .select('*')
        .orderBy('name');

      query = this.paginate(query, page, limit);

      const projectTypes = await query;
      const total = await this.db('project_types').count('* as count').first();

      // Get sub-type counts for each project type
      const subTypeCounts = await this.db('project_sub_types')
        .select('project_type_id')
        .count('* as sub_type_count')
        .groupBy('project_type_id');

      const countMap = subTypeCounts.reduce((acc: any, item: any) => {
        acc[item.project_type_id] = parseInt(item.sub_type_count, 10);
        return acc;
      }, {});

      // Add sub-type counts to project types
      const enrichedProjectTypes = projectTypes.map((pt: any) => ({
        ...pt,
        sub_type_count: countMap[pt.id] || 0
      }));

      return {
        data: enrichedProjectTypes,
        pagination: {
          page,
          limit,
          total: Number(total?.count) || 0,
          totalPages: Math.ceil((Number(total?.count) || 0) / limit)
        }
      };
    }, res, 'Failed to fetch project types');

    if (result) {
      res.json(result);
    }
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      // First try to find in main project_types table
      let projectType = await this.db('project_types')
        .where('id', id)
        .first();

      // If not found, check in project_sub_types table
      if (!projectType) {
        const subType = await this.db('project_sub_types')
          .where('id', id)
          .first();
        
        if (subType) {
          // Get the parent project type info
          const parentType = await this.db('project_types')
            .where('id', subType.project_type_id)
            .first();
          
          // Create a project type response that looks like a child type
          projectType = {
            id: subType.id,
            name: subType.name,
            description: subType.description,
            color_code: subType.color_code,
            parent_id: subType.project_type_id,
            parent_name: parentType?.name,
            is_default: subType.is_default,
            is_active: subType.is_active,
            created_at: subType.created_at,
            updated_at: subType.updated_at,
            is_sub_type: true // Flag to indicate this is a sub-type
          };
        }
      }

      if (!projectType) {
        this.handleNotFound(res, 'Project type');
        return null;
      }

      // Get associated sub-types (only for parent types)
      const subTypes = projectType.is_sub_type ? [] : await this.db('project_sub_types')
        .where('project_type_id', id)
        .orderBy('name');

      // Get phases associated with this project type
      // For sub-types, get phases from the parent project type
      const phaseQueryId = projectType.is_sub_type ? projectType.parent_id : id;
      const phases = await this.db('project_type_phases')
        .join('project_phases', 'project_type_phases.phase_id', 'project_phases.id')
        .where('project_type_phases.project_type_id', phaseQueryId)
        .whereNull('project_type_phases.project_sub_type_id')
        .select(
          'project_phases.*',
          'project_type_phases.order_index',
          'project_type_phases.duration_weeks'
        )
        .orderBy('project_type_phases.order_index');

      return {
        ...projectType,
        sub_types: subTypes,
        phases
      };
    }, res, 'Failed to fetch project type');

    if (result) {
      res.json(result);
    }
  }

  async create(req: Request, res: Response) {
    const projectTypeData = req.body;

    const result = await this.executeQuery(async () => {
      const projectTypeId = randomUUID();
      
      // Create the project type
      await this.db('project_types')
        .insert({
          id: projectTypeId,
          ...projectTypeData,
          created_at: new Date(),
          updated_at: new Date()
        });

      // Fetch the created project type to ensure we have all data
      const projectType = await this.db('project_types')
        .where('id', projectTypeId)
        .first();

      // If this is a parent project type (no parent_id), create a default child
      if (!projectTypeData.parent_id) {
        await this.createDefaultChild(projectType);
      }

      return projectType;
    }, res, 'Failed to create project type');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    const result = await this.executeQuery(async () => {
      const [projectType] = await this.db('project_types')
        .where('id', id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning('*');

      if (!projectType) {
        this.handleNotFound(res, 'Project type');
        return null;
      }

      return projectType;
    }, res, 'Failed to update project type');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      // Check if this project type has children
      const children = await this.db('project_types')
        .where('parent_id', id)
        .select('id');

      if (children.length > 0) {
        throw new Error('Cannot delete project type that has child project types');
      }

      // Check if any projects are using this project type
      const projects = await this.db('projects')
        .where('project_type_id', id)
        .select('id');

      if (projects.length > 0) {
        throw new Error('Cannot delete project type that is being used by projects');
      }

      const deletedCount = await this.db('project_types')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Project type');
        return null;
      }

      return { message: 'Project type deleted successfully' };
    }, res, 'Failed to delete project type');

    if (result) {
      res.json(result);
    }
  }

  /**
   * Creates a default read-only child project type for a parent project type
   */
  private async createDefaultChild(parentProjectType: any): Promise<void> {
    const defaultChildId = randomUUID();
    
    // Create default child project type
    await this.db('project_types').insert({
      id: defaultChildId,
      name: `${parentProjectType.name} (Default)`,
      description: `Default configuration for ${parentProjectType.name} projects`,
      parent_id: parentProjectType.id,
      is_default: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Copy any existing resource templates from parent to default child
    const parentTemplates = await this.db('resource_templates')
      .where('project_type_id', parentProjectType.id)
      .select('*');

    for (const template of parentTemplates) {
      await this.db('resource_templates').insert({
        id: randomUUID(),
        project_type_id: defaultChildId,
        phase_id: template.phase_id,
        role_id: template.role_id,
        allocation_percentage: template.allocation_percentage,
        is_inherited: true,
        parent_template_id: template.id,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
}
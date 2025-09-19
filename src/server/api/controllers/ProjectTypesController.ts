import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

export class ProjectTypesController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const include_inactive = req.query.include_inactive === 'true';

    // Generate a UUID for the project types


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('project_types')


      .insert({


        id: resultId,


        ...{
          id: projectTypeId,
          ...projectTypeData,
          created_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('project_types')


      .where({ id: resultId })


      .select('*');

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
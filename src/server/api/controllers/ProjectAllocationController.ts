import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { randomUUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface ProjectAllocation {
  id: string;
  project_id: string;
  phase_id: string;
  role_id: string;
  allocation_percentage: number;
  is_inherited: boolean;
  template_id?: string;
  notes?: string;
}

export class ProjectAllocationController extends BaseController {

  // Get all effective allocations for a project (inherited + overridden)
  getProjectAllocations = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectId } = req.params;

      // Get project details to find project type
      // Generate a UUID for the projects

      const projectId = uuidv4();


      // Insert with generated ID

      await this.db('projects')

        .insert({

          id: projectId,

          ...inheritedAllocations

        });


      // Fetch the created record

      // Generate a UUID for the projects


      const projectId = uuidv4();



      // Insert with generated ID


      await this.db('projects')


        .insert({


          id: projectId,


          ...{


            id: createdAllocationId,


            ...newAllocation


          }


        });



      // Fetch the created record


      const [project] = await this.db('projects')


        .where({ id: projectId })


        .select('*');

      return res.json({
        success: true,
        data: resetAllocation,
        message: 'Allocation reset to inherited value successfully'
      });
    }, res);
  };

  // Delete a project allocation (removes override, falls back to inherited)
  deleteAllocation = async (req: Request, res: Response): Promise<void> => {
    await this.executeQuery(async () => {
      const { projectId, phaseId, roleId } = req.params;

      const deleted = await this.db('project_allocation_overrides')
        .where({ project_id: projectId, phase_id: phaseId, role_id: roleId })
        .delete();

      if (deleted === 0) {
        return res.status(404).json({ error: 'Allocation not found' });
      }

      return res.json({
        success: true,
        message: 'Allocation deleted successfully'
      });
    }, res);
  };

  // Helper method to get effective allocations for a project
  private async getEffectiveAllocations(projectId: string): Promise<any[]> {
    const project = await this.db('projects').where('id', projectId).first();
    if (!project) {
      throw new Error('Project not found');
    }

    // Get all project allocations (inherited + overridden)
    const projectAllocations = await this.db('project_allocation_overrides')
      .where('project_id', projectId)
      .join('project_phases', 'project_allocation_overrides.phase_id', 'project_phases.id')
      .join('roles', 'project_allocation_overrides.role_id', 'roles.id')
      .leftJoin('resource_templates', 'project_allocation_overrides.template_id', 'resource_templates.id')
      .select(
        'project_allocation_overrides.*',
        'project_phases.name as phase_name',
        'project_phases.order_index as phase_order',
        'roles.name as role_name',
        'resource_templates.allocation_percentage as original_percentage'
      )
      .orderBy('project_phases.order_index', 'roles.name');

    return projectAllocations;
  }
}

export default ProjectAllocationController;
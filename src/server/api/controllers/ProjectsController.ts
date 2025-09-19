import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { notificationScheduler } from '../../services/NotificationScheduler.js';
import { v4 as uuidv4 } from 'uuid';

export class ProjectsController extends BaseController {
  /**
   * Validates that a project has a mandatory project subtype.
   * Projects must be associated with active project sub-types.
   */
  private async validateProjectSubType(projectTypeId: string, projectSubTypeId: string): Promise<void> {
    // project_sub_type_id is now mandatory
    if (!projectSubTypeId) {
      throw new Error('Project sub-type is required for all projects');
    }

    // Check if project type exists
    // Generate a UUID for the project types

    const projectTypeId = uuidv4();


    // Insert with generated ID

    await this.db('project_types')

      .insert({

        id: projectTypeId,

        ...{
          id: projectId,
          ...projectData,
          created_at: new Date(

      });


    // Fetch the created record

    const [projectType] = await this.db('project_types')

      .where({ id: projectTypeId })

      .select('*');

      if (!project) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      // Send timeline change notifications if dates changed
      if (currentProject && (updateData.aspiration_start || updateData.aspiration_finish)) {
        try {
          const oldStart = currentProject.aspiration_start ? new Date(currentProject.aspiration_start) : null;
          const newStart = updateData.aspiration_start ? new Date(updateData.aspiration_start) : oldStart;
          const oldEnd = currentProject.aspiration_finish ? new Date(currentProject.aspiration_finish) : null;
          const newEnd = updateData.aspiration_finish ? new Date(updateData.aspiration_finish) : oldEnd;
          
          // Only send if dates actually changed
          if ((oldStart?.getTime() !== newStart?.getTime()) || (oldEnd?.getTime() !== newEnd?.getTime())) {
            await notificationScheduler.sendProjectTimelineNotification(
              id,
              oldStart,
              newStart,
              oldEnd,
              newEnd
            );
          }
        } catch (error) {
          console.error('Failed to send project timeline notification:', error);
        }
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

  async deleteTestData(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Delete test projects (ones with "Test_" in name)
      const deleted = await this.db('projects')
        .where('name', 'like', 'Test_%')
        .del();

      return { message: `Deleted ${deleted} test projects` };
    }, res, 'Failed to delete test data');

    if (result) {
      res.json(result);
    }
  }
}
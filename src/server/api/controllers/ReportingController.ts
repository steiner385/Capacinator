import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

export class ReportingController extends BaseController {
  async getDashboard(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Get summary stats
      const projectCount = await this.db('projects').count('* as count').first();
      const peopleCount = await this.db('people').count('* as count').first();
      const rolesCount = await this.db('roles').count('* as count').first();
      
      // Get project health overview
      const projectHealth = await this.db('project_health_view')
        .select('health_status')
        .count('* as count')
        .groupBy('health_status');

      // Get capacity gaps summary
      const capacityGaps = await this.db('capacity_gaps_view')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Get utilization overview
      const utilization = await this.db('person_utilization_view')
        .select('allocation_status')
        .count('* as count')
        .groupBy('allocation_status');

      // Get availability overview
      const availability = await this.db('person_availability_view')
        .select('availability_status')
        .count('* as count')
        .groupBy('availability_status');

      return {
        summary: {
          projects: projectCount?.count || 0,
          people: peopleCount?.count || 0,
          roles: rolesCount?.count || 0
        },
        projectHealth: projectHealth.reduce((acc, item) => {
          acc[item.health_status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        capacityGaps: capacityGaps.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        utilization: utilization.reduce((acc, item) => {
          acc[item.allocation_status] = item.count;
          return acc;
        }, {} as Record<string, number>),
        availability: availability.reduce((acc, item) => {
          acc[item.availability_status] = item.count;
          return acc;
        }, {} as Record<string, number>)
      };
    }, res, 'Failed to fetch dashboard data');

    if (result) {
      res.json(result);
    }
  }

  async getCapacityReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      // Get capacity gaps
      const capacityGaps = await this.db('capacity_gaps_view').select('*');

      // Get person utilization
      const personUtilization = await this.db('person_utilization_view').select('*');

      // Get project demands in date range
      let demandsQuery = this.db('project_demands_view')
        .join('projects', 'project_demands_view.project_id', 'projects.id')
        .join('roles', 'project_demands_view.role_id', 'roles.id')
        .select(
          'project_demands_view.*',
          'projects.name as project_name',
          'roles.name as role_name'
        );

      if (startDate) {
        demandsQuery = demandsQuery.where('project_demands_view.end_date', '>=', startDate);
      }
      if (endDate) {
        demandsQuery = demandsQuery.where('project_demands_view.start_date', '<=', endDate);
      }

      const projectDemands = await demandsQuery.orderBy('project_demands_view.start_date');

      return {
        capacityGaps,
        personUtilization,
        projectDemands,
        summary: {
          totalGaps: capacityGaps.filter(gap => gap.status === 'GAP').length,
          totalTight: capacityGaps.filter(gap => gap.status === 'TIGHT').length,
          overAllocated: personUtilization.filter(person => person.allocation_status === 'OVER_ALLOCATED').length,
          underAllocated: personUtilization.filter(person => person.allocation_status === 'UNDER_ALLOCATED').length
        }
      };
    }, res, 'Failed to fetch capacity report');

    if (result) {
      res.json(result);
    }
  }

  async getProjectReport(req: Request, res: Response) {
    const { status, priority, projectType, location } = req.query;

    const result = await this.executeQuery(async () => {
      let query = this.db('project_health_view').select('*');

      if (status) {
        query = query.where('health_status', status);
      }
      if (priority) {
        query = query.where('priority', priority);
      }
      if (projectType) {
        query = query.where('project_type_id', projectType);
      }
      if (location) {
        query = query.where('location_id', location);
      }

      const projects = await query.orderBy('priority', 'desc');

      // Get summary by status
      const statusSummary = await this.db('project_health_view')
        .select('health_status')
        .count('* as count')
        .groupBy('health_status');

      // Get summary by priority
      const prioritySummary = await this.db('project_health_view')
        .select('priority')
        .count('* as count')
        .groupBy('priority')
        .orderBy('priority', 'desc');

      return {
        projects,
        summary: {
          byStatus: statusSummary.reduce((acc, item) => {
            acc[item.health_status] = item.count;
            return acc;
          }, {} as Record<string, number>),
          byPriority: prioritySummary.reduce((acc, item) => {
            acc[item.priority] = item.count;
            return acc;
          }, {} as Record<string, number>)
        }
      };
    }, res, 'Failed to fetch project report');

    if (result) {
      res.json(result);
    }
  }

  async getTimelineReport(req: Request, res: Response) {
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      // Get projects timeline
      let projectsQuery = this.db('projects')
        .leftJoin('project_types', 'projects.project_type_id', 'project_types.id')
        .leftJoin('people as owner', 'projects.owner_id', 'owner.id')
        .select(
          'projects.id',
          'projects.name',
          'projects.aspiration_start',
          'projects.aspiration_finish',
          'projects.priority',
          'project_types.name as project_type',
          'owner.name as owner_name'
        )
        .whereNotNull('projects.aspiration_start')
        .whereNotNull('projects.aspiration_finish');

      if (startDate && endDate) {
        projectsQuery = projectsQuery
          .where('projects.aspiration_start', '<=', endDate)
          .where('projects.aspiration_finish', '>=', startDate);
      }

      const projects = await projectsQuery.orderBy('projects.aspiration_start');

      // Get phases timeline
      let phasesQuery = this.db('project_phases_timeline')
        .join('projects', 'project_phases_timeline.project_id', 'projects.id')
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'project_phases_timeline.*',
          'projects.name as project_name',
          'project_phases.name as phase_name'
        );

      if (startDate && endDate) {
        phasesQuery = phasesQuery
          .where('project_phases_timeline.start_date', '<=', endDate)
          .where('project_phases_timeline.end_date', '>=', startDate);
      }

      const phases = await phasesQuery.orderBy('project_phases_timeline.start_date');

      return {
        projects,
        phases
      };
    }, res, 'Failed to fetch timeline report');

    if (result) {
      res.json(result);
    }
  }
}
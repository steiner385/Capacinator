import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

export class ReportingController extends BaseController {
  async getDashboard(req: Request, res: Response) {
    console.log('📊 Dashboard endpoint called');
    const result = await this.executeQuery(async () => {
      console.log('📊 Starting database queries...');
      
      // Get current date for filtering projects that are in progress 
      // (start date in past, end date in future)
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get summary stats - count projects that have active phases
      console.log('📊 Getting current project count...');
      const projectCount = await this.db('projects')
        .join('project_phases_timeline', 'projects.id', 'project_phases_timeline.project_id')
        .where('project_phases_timeline.start_date', '<=', currentDate)
        .where('project_phases_timeline.end_date', '>=', currentDate)
        .where('projects.include_in_demand', true)
        .countDistinct('projects.id as count')
        .first();
      console.log('📊 Current project count result:', projectCount);
      
      console.log('📊 Getting people count...');
      const peopleCount = await this.db('people').count('* as count').first();
      console.log('📊 People count result:', peopleCount);
      
      console.log('📊 Getting roles count...');
      const rolesCount = await this.db('roles').count('* as count').first();
      console.log('📊 Roles count result:', rolesCount);
      
      // Get project health overview - focus on current projects only
      console.log('📊 Getting current project health status...');
      
      // Get current projects and their phase status
      const currentProjects = await this.db('projects')
        .join('project_phases_timeline', 'projects.id', 'project_phases_timeline.project_id')
        .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
        .select(
          'projects.id',
          'projects.name',
          'project_phases_timeline.start_date as phase_start',
          'project_phases_timeline.end_date as phase_end',
          'project_phases.name as phase_name'
        )
        .where('project_phases_timeline.start_date', '<=', currentDate)
        .where('project_phases_timeline.end_date', '>=', currentDate)
        .where('projects.include_in_demand', true)
        .orderBy(['projects.id', 'project_phases_timeline.start_date']);
      
      // Calculate project health status
      const projectHealthMap = new Map();
      currentProjects.forEach(project => {
        if (!projectHealthMap.has(project.id)) {
          // Determine health status based on current phase timing
          let healthStatus = 'ACTIVE';
          if (project.phase_end && project.phase_end < currentDate) {
            healthStatus = 'OVERDUE';
          } else if (project.phase_start && project.phase_start > currentDate) {
            healthStatus = 'PLANNING';
          }
          projectHealthMap.set(project.id, healthStatus);
        }
      });
      
      // Aggregate health statuses
      const projectHealth = Array.from(projectHealthMap.values()).reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 Project health result:', projectHealth);

      // Calculate capacity gaps - only for current projects
      console.log('📊 Calculating capacity gaps for current projects...');
      
      // Get assignments for current projects only
      const currentProjectIds = await this.db('projects')
        .join('project_phases_timeline', 'projects.id', 'project_phases_timeline.project_id')
        .select('projects.id')
        .where('project_phases_timeline.start_date', '<=', currentDate)
        .where('project_phases_timeline.end_date', '>=', currentDate)
        .where('projects.include_in_demand', true)
        .distinct();
      
      const currentProjectIdList = currentProjectIds.map(p => p.id);
      
      // Count roles with assignments in current projects
      const currentAssignmentRoles = await this.db('project_assignments')
        .whereIn('project_id', currentProjectIdList)
        .countDistinct('role_id as role_count')
        .first();
      
      // Count distinct roles needed for current projects (from resource templates)
      const currentDemandRoles = await this.db('resource_templates')
        .join('project_sub_types', 'resource_templates.project_sub_type_id', 'project_sub_types.id')
        .join('projects', 'project_sub_types.id', 'projects.project_sub_type_id')
        .whereIn('projects.id', currentProjectIdList)
        .countDistinct('resource_templates.role_id as role_count')
        .first();
      
      console.log('📊 Current project assignments roles:', currentAssignmentRoles?.role_count || 0);
      console.log('📊 Current project demand roles:', currentDemandRoles?.role_count || 0);
      
      const rolesWithCurrentDemands = currentDemandRoles?.role_count || 0;
      const rolesWithCurrentAssignments = currentAssignmentRoles?.role_count || 0;
      const gapRoles = Math.max(0, rolesWithCurrentDemands - rolesWithCurrentAssignments);
      
      const capacityGaps = { 
        GAP: gapRoles, 
        OK: rolesWithCurrentAssignments 
      };
      
      console.log('📊 Current project capacity gaps result:', capacityGaps);

      // Get utilization overview - focus on in-progress projects (default filter)
      console.log('📊 Calculating utilization for in-progress projects...');
      
      const currentProjectUtilization = await this.db('project_assignments')
        .select('person_id')
        .sum('allocation_percentage as total_allocation')
        .whereIn('project_id', currentProjectIdList)
        .groupBy('person_id');
      
      // Categorize utilization levels
      const utilizationStats = currentProjectUtilization.reduce((acc, person) => {
        const allocation = person.total_allocation || 0;
        if (allocation > 100) {
          acc.OVER_ALLOCATED = (acc.OVER_ALLOCATED || 0) + 1;
        } else if (allocation >= 80) {
          acc.FULLY_ALLOCATED = (acc.FULLY_ALLOCATED || 0) + 1;
        } else if (allocation > 0) {
          acc.UNDER_ALLOCATED = (acc.UNDER_ALLOCATED || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // If no assignments exist for in-progress projects, show availability instead
      const utilization = Object.keys(utilizationStats).length > 0 
        ? utilizationStats 
        : { 'NO_ASSIGNMENTS': 0 };
      
      console.log('📊 In-progress project utilization result:', utilization);

      // Get availability overview - people not in current projects are available
      console.log('📊 Calculating availability for current projects...');
      
      const totalPeople = peopleCount?.count || 0;
      const peopleInCurrentProjects = currentProjectUtilization.length;
      const availablePeople = totalPeople - peopleInCurrentProjects;
      
      const availability = { 
        AVAILABLE: availablePeople,
        ASSIGNED: peopleInCurrentProjects
      };
      
      console.log('📊 Current project availability result:', availability);

      return {
        summary: {
          projects: projectCount?.count || 0,
          people: peopleCount?.count || 0,
          roles: rolesCount?.count || 0
        },
        projectHealth: projectHealth,
        capacityGaps: capacityGaps,
        utilization: utilization,
        availability: availability
      };
    }, res, 'Failed to fetch dashboard data');

    if (result) {
      res.json(result);
    }
  }

  async getTest(req: Request, res: Response) {
    console.log('🧪 Test endpoint called');
    try {
      const projects = await this.db('projects').select('*').limit(1);
      console.log('🧪 Projects query successful:', projects);
      res.json({ status: 'ok', data: projects });
    } catch (error) {
      console.error('🧪 Test endpoint error:', error);
      res.status(500).json({ error: 'Test failed', details: error });
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
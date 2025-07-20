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

      // Calculate capacity gaps - use comprehensive capacity gaps view
      console.log('📊 Calculating capacity gaps from capacity_gaps_view...');
      
      const capacityGapsData = await this.db('capacity_gaps_view').select('*');
      
      // Categorize roles by capacity status
      let gapRoles = 0;
      let okRoles = 0;
      let tightRoles = 0;
      
      capacityGapsData.forEach(role => {
        const demandVsCapacity = role.total_demand_fte - role.total_capacity_fte;
        if (demandVsCapacity > 0.5) {
          gapRoles++;
        } else if (demandVsCapacity > 0) {
          tightRoles++;
        } else {
          okRoles++;
        }
      });
      
      const capacityGaps = { 
        GAP: gapRoles, 
        TIGHT: tightRoles,
        OK: okRoles 
      };
      
      console.log('📊 Capacity gaps from view:', capacityGaps);

      // Get utilization overview - use comprehensive person utilization view
      console.log('📊 Calculating utilization from person_utilization_view...');
      
      const personUtilizationData = await this.db('person_utilization_view').select('*');
      
      // Categorize utilization levels
      const utilizationStats = personUtilizationData.reduce((acc, person) => {
        const status = person.allocation_status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const utilization = Object.keys(utilizationStats).length > 0 
        ? utilizationStats 
        : { 'NO_DATA': 0 };
      
      console.log('📊 Person utilization from view:', utilization);

      // Get availability overview from person utilization view
      console.log('📊 Calculating availability from person_utilization_view...');
      
      const availablePeople = personUtilizationData.filter(person => person.allocation_status === 'AVAILABLE').length;
      const assignedPeople = personUtilizationData.filter(person => person.allocation_status !== 'AVAILABLE').length;
      
      const availability = { 
        AVAILABLE: availablePeople,
        ASSIGNED: assignedPeople
      };
      
      console.log('📊 Person availability from view:', availability);

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

      // Calculate status for each gap based on demand vs capacity
      const capacityGapsWithStatus = capacityGaps.map(role => {
        const demandVsCapacity = role.total_demand_fte - role.total_capacity_fte;
        let status;
        if (demandVsCapacity > 0.5) {
          status = 'GAP';
        } else if (demandVsCapacity > 0) {
          status = 'TIGHT';
        } else {
          status = 'OK';
        }
        return { ...role, status };
      });

      // Calculate timeline data for capacity over time
      const timeline = await this.calculateCapacityTimeline(startDate as string, endDate as string);

      return {
        capacityGaps: capacityGapsWithStatus,
        personUtilization,
        projectDemands,
        timeline,
        summary: {
          totalGaps: capacityGapsWithStatus.filter(gap => gap.status === 'GAP').length,
          totalTight: capacityGapsWithStatus.filter(gap => gap.status === 'TIGHT').length,
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

  async getDemandReport(req: Request, res: Response) {
    console.log('📊 Demand report endpoint called');
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      console.log('📊 Getting demand data from project_demands_view...');
      
      // Get demand data from the corrected view
      let demandQuery = this.db('project_demands_view')
        .select('*');
      
      if (startDate) {
        demandQuery = demandQuery.where('start_date', '>=', startDate);
      }
      if (endDate) {
        demandQuery = demandQuery.where('end_date', '<=', endDate);
      }
      
      const demandData = await demandQuery;
      console.log(`📊 Found ${demandData.length} demand records`);
      
      // Aggregate by project
      const projectDemands = await this.db('project_demands_view')
        .select('project_id', 'project_name')
        .sum('total_demand_percentage as total_demand')
        .groupBy('project_id', 'project_name')
        .orderBy('total_demand', 'desc');
      
      // Aggregate by role
      const roleDemands = await this.db('project_demands_view')
        .select('role_id', 'role_name')
        .sum('total_demand_percentage as total_demand')
        .groupBy('role_id', 'role_name')
        .orderBy('total_demand', 'desc');
      
      // Get summary metrics
      const totalDemand = await this.db('project_demands_view')
        .sum('total_demand_percentage as total')
        .first();
      
      const projectsWithDemand = await this.db('project_demands_view')
        .countDistinct('project_id as count')
        .first();
      
      const rolesWithDemand = await this.db('project_demands_view')
        .countDistinct('role_id as count')
        .first();
      
      return {
        demandData,
        projectDemands,
        roleDemands,
        summary: {
          totalDemand: totalDemand?.total || 0,
          projectsWithDemand: projectsWithDemand?.count || 0,
          rolesWithDemand: rolesWithDemand?.count || 0
        }
      };
    }, res, 'Failed to fetch demand report');

    if (result) {
      res.json(result);
    }
  }

  async getUtilizationReport(req: Request, res: Response) {
    console.log('📊 Utilization report endpoint called');

    const result = await this.executeQuery(async () => {
      console.log('📊 Getting utilization data from person_utilization_view...');
      
      // Get all people utilization data
      const utilizationData = await this.db('person_utilization_view')
        .select('*')
        .orderBy('total_allocation_percentage', 'desc');
      
      console.log(`📊 Found ${utilizationData.length} utilization records`);
      
      // Get people by utilization status
      const overutilized = utilizationData.filter(p => p.allocation_status === 'OVER_ALLOCATED');
      const underutilized = utilizationData.filter(p => p.allocation_status === 'UNDER_ALLOCATED' || p.allocation_status === 'AVAILABLE');
      
      // Calculate average utilization
      const avgUtilization = utilizationData.reduce((sum, p) => sum + (p.total_allocation_percentage || 0), 0) / utilizationData.length;
      
      // Find peak utilization
      const peakUtilization = Math.max(...utilizationData.map(p => p.total_allocation_percentage || 0));
      
      return {
        utilizationData,
        overutilized,
        underutilized,
        summary: {
          peopleOverutilized: overutilized.length,
          peopleUnderutilized: underutilized.length,
          averageUtilization: Math.round(avgUtilization * 100) / 100,
          peakUtilization
        }
      };
    }, res, 'Failed to fetch utilization report');

    if (result) {
      res.json(result);
    }
  }

  async getGapsAnalysis(req: Request, res: Response) {
    console.log('📊 Gaps analysis endpoint called');

    const result = await this.executeQuery(async () => {
      console.log('📊 Getting gaps data from capacity_gaps_view and project_health_view...');
      
      // Get capacity gaps data
      const capacityGapsRaw = await this.db('capacity_gaps_view')
        .select('*');
      
      console.log(`📊 Found ${capacityGapsRaw.length} capacity gap records`);
      
      // Calculate gap percentage and status for each role
      const capacityGaps = capacityGapsRaw.map(gap => {
        const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
        const gapPercentage = gap.total_capacity_fte > 0 
          ? (demandVsCapacity / gap.total_capacity_fte) * 100 
          : (gap.total_demand_fte > 0 ? 100 : 0);
        
        let status;
        if (demandVsCapacity > 0.5) {
          status = 'GAP';
        } else if (demandVsCapacity > 0) {
          status = 'TIGHT';
        } else {
          status = 'OK';
        }
        
        return {
          ...gap,
          gap_percentage: Math.round(gapPercentage * 100) / 100,
          demand_vs_capacity: Math.round(demandVsCapacity * 100) / 100,
          status
        };
      }).sort((a, b) => b.gap_percentage - a.gap_percentage);
      
      // Get project health data
      const projectHealth = await this.db('project_health_view')
        .select('*')
        .orderBy('total_allocation_percentage', 'asc');
      
      console.log(`📊 Found ${projectHealth.length} project health records`);
      
      // Identify critical gaps (>50% gap)
      const criticalRoleGaps = capacityGaps.filter(gap => gap.status === 'GAP' && gap.gap_percentage > 50);
      const criticalProjectGaps = projectHealth.filter(p => p.allocation_health === 'UNDER_ALLOCATED');
      
      // Calculate summary metrics
      const totalGapHours = capacityGaps.reduce((sum, gap) => {
        const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
        return sum + Math.max(0, demandVsCapacity) * 8 * 5; // Convert FTE to weekly hours
      }, 0);
      
      // Calculate unutilized hours (capacity that's not being used)
      const unutilizedHours = capacityGaps.reduce((sum, gap) => {
        const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
        return sum + Math.max(0, -demandVsCapacity) * 8 * 5; // Negative demand vs capacity means unused capacity
      }, 0);
      
      return {
        capacityGaps,
        projectHealth,
        criticalRoleGaps,
        criticalProjectGaps,
        summary: {
          totalGapHours: Math.round(totalGapHours * 100) / 100,
          projectsWithGaps: criticalProjectGaps.length,
          rolesWithGaps: criticalRoleGaps.length,
          unutilizedHours: Math.round(unutilizedHours * 100) / 100
        }
      };
    }, res, 'Failed to fetch gaps analysis');

    if (result) {
      res.json(result);
    }
  }

  private async calculateCapacityTimeline(startDate?: string, endDate?: string): Promise<any[]> {
    // Get all people with their default hours and availability
    const people = await this.db('people')
      .select(
        'id',
        'name',
        'default_hours_per_day',
        'default_availability_percentage'
      )
      .where('is_active', true);

    // Calculate monthly capacity over the time period
    const monthlyMap = new Map<string, number>();
    
    // Default date range if not provided
    const filterStart = startDate ? new Date(startDate) : new Date('2023-01-01');
    const filterEnd = endDate ? new Date(endDate) : new Date('2024-12-31');

    // Generate months between start and end dates
    let currentDate = new Date(filterStart);
    currentDate.setDate(1); // First day of month
    
    while (currentDate <= filterEnd) {
      const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
      
      // Calculate total capacity for this month
      let monthlyCapacity = 0;
      
      people.forEach(person => {
        // Assume ~22 working days per month
        const workingDaysPerMonth = 22;
        const dailyHours = person.default_hours_per_day || 8;
        const availabilityPercent = (person.default_availability_percentage || 100) / 100;
        
        const monthlyPersonCapacity = workingDaysPerMonth * dailyHours * availabilityPercent;
        monthlyCapacity += monthlyPersonCapacity;
      });

      monthlyMap.set(monthKey, monthlyCapacity);
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Convert to timeline format expected by frontend
    return Array.from(monthlyMap.entries()).map(([month, capacity]) => ({
      period: month,
      capacity: Math.round(capacity)
    }));
  }
}
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
      
      // Debug log the first person to see column names
      if (personUtilizationData.length > 0) {
        console.log('📊 Sample person data:', JSON.stringify(personUtilizationData[0]));
      }
      
      // Categorize utilization levels
      const utilizationStats = personUtilizationData.reduce((acc, person) => {
        const status = person.utilization_status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const utilization = Object.keys(utilizationStats).length > 0 
        ? utilizationStats 
        : { 'NO_DATA': 0 };
      
      console.log('📊 Person utilization from view:', utilization);

      // Get availability overview from person utilization view
      console.log('📊 Calculating availability from person_utilization_view...');
      
      const availablePeople = personUtilizationData.filter(person => person.utilization_status === 'Available').length;
      const assignedPeople = personUtilizationData.filter(person => person.utilization_status !== 'Available').length;
      
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

      // Get person utilization and transform it like the utilization report does
      const personUtilizationRaw = await this.db('person_utilization_view').select('*');
      
      // Transform the data to match what the frontend expects
      const utilizationData = personUtilizationRaw.map(person => {
        const totalAllocHours = person.total_allocation_percentage * person.default_hours_per_day / 100.0;
        
        return {
          ...person,
          // Add the expected field names
          default_availability_percentage: person.current_availability_percentage,
          total_allocated_hours: totalAllocHours,
          available_hours: person.default_hours_per_day,
          allocation_status: person.utilization_status === 'Over-allocated' ? 'OVER_ALLOCATED' :
                           person.utilization_status === 'Fully-allocated' ? 'FULLY_ALLOCATED' :
                           person.utilization_status === 'Partially-allocated' ? 'PARTIALLY_ALLOCATED' :
                           person.utilization_status === 'Available' ? 'AVAILABLE' :
                           person.utilization_status === 'Unavailable' ? 'UNAVAILABLE' : 'AVAILABLE',
          project_names: '' // This should come from joined data but leaving empty for now
        };
      });

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

      // Transform capacity gaps data to the format expected by frontend
      const byRole = capacityGapsWithStatus.map(gap => ({
        id: gap.role_id,
        role: gap.role_name,
        capacity: Math.round(gap.total_capacity_hours || 0),
        utilized: Math.round(gap.total_demand_hours || 0),
        available: Math.round((gap.total_capacity_hours || 0) - (gap.total_demand_hours || 0)),
        people_count: gap.people_count || 0,
        status: gap.status
      }));

      return {
        capacityGaps: capacityGapsWithStatus,
        byRole, // Add the transformed data for the frontend chart
        personUtilization: personUtilizationRaw, // Keep raw data for compatibility
        utilizationData, // Use transformed data for the table
        projectDemands,
        timeline,
        summary: {
          totalGaps: capacityGapsWithStatus.filter(gap => gap.status === 'GAP').length,
          totalTight: capacityGapsWithStatus.filter(gap => gap.status === 'TIGHT').length,
          overAllocated: utilizationData.filter(person => person.allocation_status === 'OVER_ALLOCATED').length,
          underAllocated: utilizationData.filter(person => person.allocation_status === 'UNDER_ALLOCATED').length
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

    // Get scenario from header
    const scenarioId = req.headers['x-scenario-id'] as string;
    const includeAllScenarios = req.query.includeAllScenarios === 'true';

    const result = await this.executeQuery(async () => {
      console.log('📊 Getting demand data from project_demands_view...');
      
      // Get demand data from the corrected view with proper date filtering
      let demandQuery = this.db('project_demands_view')
        .select('*');
      
      // Filter by scenario if provided and not including all scenarios
      if (scenarioId && !includeAllScenarios) {
        demandQuery = demandQuery.where('scenario_id', scenarioId);
      }

      // Fix date filtering to include projects that overlap with the date range
      if (startDate && endDate) {
        demandQuery = demandQuery.where(function() {
          this.where('start_date', '<=', endDate)
              .andWhere('end_date', '>=', startDate);
        });
      } else if (startDate) {
        demandQuery = demandQuery.where('end_date', '>=', startDate);
      } else if (endDate) {
        demandQuery = demandQuery.where('start_date', '<=', endDate);
      }
      
      const demandData = await demandQuery;
      console.log(`📊 Found ${demandData.length} demand records`);
      
      // Aggregate by project using the improved view with hour calculations
      let projectQuery = this.db('project_demands_view')
        .select('project_id', 'project_name')
        .sum('demand_hours as total_hours')
        .groupBy('project_id', 'project_name')
        .orderBy('total_hours', 'desc');
      
      // Apply scenario filter
      if (scenarioId && !includeAllScenarios) {
        projectQuery = projectQuery.where('scenario_id', scenarioId);
      }
      
      if (startDate && endDate) {
        projectQuery = projectQuery.where(function() {
          this.where('start_date', '<=', endDate)
              .andWhere('end_date', '>=', startDate);
        });
      } else if (startDate) {
        projectQuery = projectQuery.where('end_date', '>=', startDate);
      } else if (endDate) {
        projectQuery = projectQuery.where('start_date', '<=', endDate);
      }
      
      const projectDemands = await projectQuery;
      
      // Format for frontend
      const byProject = projectDemands.map((project: any) => ({
        id: project.project_id,
        name: project.project_name,
        demand: project.total_hours || 0
      }));
      
      // Aggregate by role using the improved view
      let roleQuery = this.db('project_demands_view')
        .select('role_id', 'role_name')
        .sum('demand_hours as total_hours')
        .groupBy('role_id', 'role_name')
        .orderBy('total_hours', 'desc');
        
      // Apply scenario filter
      if (scenarioId && !includeAllScenarios) {
        roleQuery = roleQuery.where('scenario_id', scenarioId);
      }
        
      if (startDate && endDate) {
        roleQuery = roleQuery.where(function() {
          this.where('start_date', '<=', endDate)
              .andWhere('end_date', '>=', startDate);
        });
      } else if (startDate) {
        roleQuery = roleQuery.where('end_date', '>=', startDate);
      } else if (endDate) {
        roleQuery = roleQuery.where('start_date', '<=', endDate);
      }
      
      const roleDemands = await roleQuery;
      
      // Format for frontend
      const by_role = roleDemands.map((role: any) => ({
        role_name: role.role_name,
        total_hours: role.total_hours || 0
      }));
      
      // Get project type aggregation using the improved view
      let projectTypeQuery = this.db('project_demands_view')
        .select('project_type_id', 'project_type_name')
        .sum('demand_hours as total_hours')
        .groupBy('project_type_id', 'project_type_name')
        .orderBy('total_hours', 'desc');
        
      // Apply scenario filter
      if (scenarioId && !includeAllScenarios) {
        projectTypeQuery = projectTypeQuery.where('scenario_id', scenarioId);
      }
        
      if (startDate && endDate) {
        projectTypeQuery = projectTypeQuery.where(function() {
          this.where('start_date', '<=', endDate)
              .andWhere('end_date', '>=', startDate);
        });
      } else if (startDate) {
        projectTypeQuery = projectTypeQuery.where('end_date', '>=', startDate);
      } else if (endDate) {
        projectTypeQuery = projectTypeQuery.where('start_date', '<=', endDate);
      }
      
      const projectTypeDemands = await projectTypeQuery;
      
      const by_project_type = projectTypeDemands.map((type: any) => ({
        project_type_name: type.project_type_name,
        total_hours: type.total_hours || 0
      }));
      
      // Generate timeline data - create monthly breakdown
      const timeline = [];
      
      if (startDate && endDate) {
        console.log(`📊 Timeline generation - startDate: ${startDate}, endDate: ${endDate}`);
        
        // Parse dates and calculate month difference
        const start = new Date(startDate as string + 'T00:00:00');
        const end = new Date(endDate as string + 'T00:00:00');
        
        // Calculate number of months between dates
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();
        
        const monthsDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
        console.log(`📊 Months difference: ${monthsDiff} months from ${startYear}-${startMonth + 1} to ${endYear}-${endMonth + 1}`);
        
        // Generate all months in range
        const months = [];
        for (let i = 0; i < monthsDiff; i++) {
          const currentYear = startYear + Math.floor((startMonth + i) / 12);
          const currentMonth = (startMonth + i) % 12;
          
          const monthData = {
            monthKey: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
            monthStart: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
            monthEnd: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
          };
          months.push(monthData);
          console.log(`📊 Added month: ${monthData.monthKey} (${monthData.monthStart} to ${monthData.monthEnd})`);
        }
        
        console.log(`📊 Total months to process: ${months.length}`);
        
        // Now query demand for each month
        for (const month of months) {
          let monthQuery = this.db('project_demands_view')
            .sum('demand_hours as total_hours')
            .where('start_date', '<=', month.monthEnd)
            .andWhere('end_date', '>=', month.monthStart);
            
          // Apply scenario filter
          if (scenarioId && !includeAllScenarios) {
            monthQuery = monthQuery.where('scenario_id', scenarioId);
          }
          
          const monthData = await monthQuery.first();
          
          timeline.push({
            month: month.monthKey,
            total_hours: Math.round(monthData?.total_hours || 0)
          });
        }
        
        console.log(`📊 Generated timeline with ${timeline.length} months:`, timeline);
      } else {
        // Fallback to the original query if no date range specified
        let timelineQuery = this.db('project_demands_view')
          .select(this.db.raw("strftime('%Y-%m', start_date) as month"))
          .sum('demand_hours as total_hours')
          .groupBy(this.db.raw("strftime('%Y-%m', start_date)"))
          .orderBy('month');
          
        // Apply scenario filter
        if (scenarioId && !includeAllScenarios) {
          timelineQuery = timelineQuery.where('scenario_id', scenarioId);
        }
        
        const timelineData = await timelineQuery;
          
        timeline.push(...timelineData.map((month: any) => ({
          month: month.month,
          total_hours: Math.round(month.total_hours || 0)
        })));
      }
      
      // Calculate total hours across all projects
      const totalHours = byProject.reduce((sum: number, project: any) => sum + project.demand, 0);
      
      // Count distinct projects and roles
      let projectCountQuery = this.db('project_demands_view')
        .countDistinct('project_id as count');
        
      let roleCountQuery = this.db('project_demands_view')
        .countDistinct('role_id as count');
        
      // Apply scenario filter
      if (scenarioId && !includeAllScenarios) {
        projectCountQuery = projectCountQuery.where('scenario_id', scenarioId);
        roleCountQuery = roleCountQuery.where('scenario_id', scenarioId);
      }
      
      const projectsWithDemand = await projectCountQuery.first();
      const rolesWithDemand = await roleCountQuery.first();
      
      return {
        demandData,
        byProject,
        by_role,
        by_project_type,
        timeline,
        summary: {
          total_hours: totalHours,
          total_projects: projectsWithDemand?.count || 0,
          roles_with_demand: rolesWithDemand?.count || 0
        }
      };
    }, res, 'Failed to fetch demand report');

    if (result) {
      res.json(result);
    }
  }

  async getUtilizationReport(req: Request, res: Response) {
    console.log('📊 Utilization report endpoint called');
    
    const { startDate, endDate } = req.query;
    console.log('📊 Date filters:', { startDate, endDate });

    const result = await this.executeQuery(async () => {
      console.log('📊 Calculating date-aware utilization data...');
      
      // Use current date as endDate if not provided
      const effectiveEndDate = endDate || (startDate ? 
        new Date(new Date(startDate as string).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0]);
      
      const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];
      
      console.log('📊 Using effective dates:', { effectiveStartDate, effectiveEndDate });
      
      // Get utilization data with proper date filtering
      const utilizationQuery = `
        WITH date_filtered_assignments AS (
          SELECT 
            pa.person_id,
            pa.project_id,
            p.name as project_name,
            pa.allocation_percentage,
            COALESCE(pa.start_date, p.aspiration_start) as computed_start_date,
            COALESCE(pa.end_date, p.aspiration_finish) as computed_end_date
          FROM project_assignments pa
          JOIN projects p ON pa.project_id = p.id
          WHERE 
            COALESCE(pa.start_date, p.aspiration_start) <= ?
            AND COALESCE(pa.end_date, p.aspiration_finish) >= ?
          
          UNION ALL
          
          SELECT 
            spa.person_id,
            spa.project_id,
            p.name as project_name,
            spa.allocation_percentage,
            COALESCE(spa.start_date, p.aspiration_start) as computed_start_date,
            COALESCE(spa.end_date, p.aspiration_finish) as computed_end_date
          FROM scenario_project_assignments spa
          JOIN projects p ON spa.project_id = p.id
          JOIN scenarios s ON spa.scenario_id = s.id
          WHERE 
            s.status = 'active'
            AND COALESCE(spa.start_date, p.aspiration_start) <= ?
            AND COALESCE(spa.end_date, p.aspiration_finish) >= ?
        )
        SELECT 
          p.id as person_id,
          p.name as person_name,
          p.email as person_email,
          p.worker_type,
          p.default_availability_percentage,
          p.default_hours_per_day,
          r.id as primary_role_id,
          r.name as primary_role_name,
          l.name as location_name,
          COALESCE(SUM(a.allocation_percentage), 0) as total_allocation_percentage,
          COUNT(DISTINCT a.project_id) as project_count,
          GROUP_CONCAT(DISTINCT a.project_name) as project_names
        FROM people p
        LEFT JOIN person_roles pr ON p.id = pr.person_id AND pr.is_primary = 1
        LEFT JOIN roles r ON pr.role_id = r.id
        LEFT JOIN locations l ON p.location_id = l.id
        LEFT JOIN date_filtered_assignments a ON p.id = a.person_id
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY total_allocation_percentage DESC
      `;
      
      const utilizationRaw = await this.db.raw(utilizationQuery, [
        effectiveEndDate, effectiveStartDate, effectiveEndDate, effectiveStartDate
      ]);
      
      const utilizationData = utilizationRaw.map(person => {
        const totalAllocHours = person.total_allocation_percentage * person.default_hours_per_day / 100.0;
        
        // Determine allocation warning level
        let allocationWarning = null;
        let displayAllocationPercentage = person.total_allocation_percentage;
        
        if (person.total_allocation_percentage > 300) {
          allocationWarning = 'extreme_overallocation';
          displayAllocationPercentage = 300; // Cap display at 300%
        } else if (person.total_allocation_percentage > 200) {
          allocationWarning = 'severe_overallocation';
        } else if (person.total_allocation_percentage > 150) {
          allocationWarning = 'high_overallocation';
        }
        
        return {
          ...person,
          total_allocated_hours: totalAllocHours,
          available_hours: person.default_hours_per_day,
          allocation_status: person.total_allocation_percentage > 100 ? 'OVER_ALLOCATED' :
                           person.total_allocation_percentage >= 90 ? 'FULLY_ALLOCATED' :
                           person.total_allocation_percentage >= 50 ? 'PARTIALLY_ALLOCATED' :
                           person.total_allocation_percentage > 0 ? 'UNDER_ALLOCATED' : 'AVAILABLE',
          project_names: person.project_names || '',
          allocation_warning: allocationWarning,
          display_allocation_percentage: displayAllocationPercentage
        };
      });
      
      console.log(`📊 Found ${utilizationData.length} people with date-filtered utilization`);
      if (utilizationData.length > 0) {
        console.log(`📊 Sample utilization - ${utilizationData[0].person_name}: ${utilizationData[0].total_allocation_percentage}% (${utilizationData[0].project_count} projects)`);
      }
      
      // Get people by utilization status
      const overutilized = utilizationData.filter(p => p.allocation_status === 'OVER_ALLOCATED');
      const underutilized = utilizationData.filter(p => p.allocation_status === 'UNDER_ALLOCATED' || p.allocation_status === 'AVAILABLE');
      
      // Calculate average utilization
      const avgUtilization = utilizationData.reduce((sum, p) => sum + (p.total_allocation_percentage || 0), 0) / utilizationData.length;
      
      // Find peak utilization
      const peakUtilization = Math.max(...utilizationData.map(p => p.total_allocation_percentage || 0));
      
      // Calculate health summary
      const healthSummary = {
        healthy: 0,      // 50-100% allocation
        warning: 0,      // 100-150% allocation
        critical: 0      // <50% or >150% allocation
      };
      
      utilizationData.forEach(person => {
        const alloc = person.total_allocation_percentage;
        if (alloc >= 50 && alloc <= 100) {
          healthSummary.healthy++;
        } else if (alloc > 100 && alloc <= 150) {
          healthSummary.warning++;
        } else {
          healthSummary.critical++;
        }
      });
      
      return {
        utilizationData,
        overutilized,
        underutilized,
        summary: {
          peopleOverutilized: overutilized.length,
          peopleUnderutilized: underutilized.length,
          averageUtilization: Math.round(avgUtilization * 100) / 100,
          peakUtilization
        },
        healthSummary
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
// Force reload 2

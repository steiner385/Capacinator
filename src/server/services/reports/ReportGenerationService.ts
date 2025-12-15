import type { Knex } from 'knex';
import { getAuditedDb } from '../../database/index.js';

/**
 * Dashboard summary data
 */
export interface DashboardData {
  summary: {
    projects: number;
    people: number;
    roles: number;
  };
  projectHealth: Record<string, number>;
  capacityGaps: {
    GAP: number;
    TIGHT: number;
    OK: number;
  };
  utilization: Record<string, number>;
  availability: {
    AVAILABLE: number;
    ASSIGNED: number;
  };
}

/**
 * Capacity report data
 */
export interface CapacityReportData {
  capacityGaps: any[];
  byRole: any[];
  personUtilization: any[];
  utilizationData: any[];
  projectDemands: any[];
  timeline: any[];
  summary: {
    totalGaps: number;
    totalTight: number;
    overAllocated: number;
    underAllocated: number;
  };
}

/**
 * Utilization report data
 */
export interface UtilizationReportData {
  utilizationData: any[];
  overutilized: any[];
  underutilized: any[];
  summary: {
    peopleOverutilized: number;
    peopleUnderutilized: number;
    averageUtilization: number;
    peakUtilization: number;
  };
  healthSummary: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

/**
 * Project report data
 */
export interface ProjectReportData {
  projects: any[];
  summary: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

/**
 * Timeline report data
 */
export interface TimelineReportData {
  projects: any[];
  phases: any[];
}

/**
 * Gaps analysis data
 */
export interface GapsAnalysisData {
  capacityGaps: any[];
  projectHealth: any[];
  criticalRoleGaps: any[];
  criticalProjectGaps: any[];
  summary: {
    totalGapHours: number;
    projectsWithGaps: number;
    rolesWithGaps: number;
    unutilizedHours: number;
  };
}

/**
 * Service for generating reports and analytics
 * Extracts business logic from ReportingController
 */
export class ReportGenerationService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getAuditedDb();
  }

  /**
   * Get dashboard summary data
   */
  async getDashboardData(): Promise<DashboardData> {
    const currentDate = new Date().toISOString().split('T')[0];

    // Get current project count (projects with active phases)
    const projectCount = await this.db('projects')
      .join('project_phases_timeline', 'projects.id', 'project_phases_timeline.project_id')
      .where('project_phases_timeline.start_date', '<=', currentDate)
      .where('project_phases_timeline.end_date', '>=', currentDate)
      .where('projects.include_in_demand', true)
      .countDistinct('projects.id as count')
      .first();

    const peopleCount = await this.db('people').count('* as count').first();
    const rolesCount = await this.db('roles').count('* as count').first();

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
    const projectHealthMap = new Map<string, string>();
    currentProjects.forEach((project: any) => {
      if (!projectHealthMap.has(project.id)) {
        let healthStatus = 'ACTIVE';
        if (project.phase_end && project.phase_end < currentDate) {
          healthStatus = 'OVERDUE';
        } else if (project.phase_start && project.phase_start > currentDate) {
          healthStatus = 'PLANNING';
        }
        projectHealthMap.set(project.id, healthStatus);
      }
    });

    const projectHealth = Array.from(projectHealthMap.values()).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate capacity gaps
    const capacityGapsData = await this.db('capacity_gaps_view').select('*');
    const capacityGaps = this.categorizeCapacityGaps(capacityGapsData);

    // Get utilization overview
    const personUtilizationData = await this.db('person_utilization_view').select('*');
    const utilizationStats = personUtilizationData.reduce((acc: Record<string, number>, person: any) => {
      const status = person.utilization_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const utilization = Object.keys(utilizationStats).length > 0
      ? utilizationStats
      : { 'NO_DATA': 0 };

    // Calculate availability
    const availablePeople = personUtilizationData.filter((person: any) => person.utilization_status === 'Available').length;
    const assignedPeople = personUtilizationData.filter((person: any) => person.utilization_status !== 'Available').length;

    return {
      summary: {
        projects: Number(projectCount?.count) || 0,
        people: Number(peopleCount?.count) || 0,
        roles: Number(rolesCount?.count) || 0
      },
      projectHealth,
      capacityGaps,
      utilization,
      availability: {
        AVAILABLE: availablePeople,
        ASSIGNED: assignedPeople
      }
    };
  }

  /**
   * Get capacity report data
   */
  async getCapacityReport(startDate?: string, endDate?: string): Promise<CapacityReportData> {
    const capacityGaps = await this.db('capacity_gaps_view').select('*');
    const personUtilizationRaw = await this.db('person_utilization_view').select('*');

    // Transform utilization data
    const utilizationData = personUtilizationRaw.map((person: any) => {
      const totalAllocHours = person.total_allocation_percentage * person.default_hours_per_day / 100.0;
      return {
        ...person,
        default_availability_percentage: person.current_availability_percentage,
        total_allocated_hours: totalAllocHours,
        available_hours: person.default_hours_per_day,
        allocation_status: this.mapUtilizationStatus(person.utilization_status),
        project_names: ''
      };
    });

    // Get project demands
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

    // Calculate status for each gap
    const capacityGapsWithStatus = capacityGaps.map((role: any) => {
      const demandVsCapacity = role.total_demand_fte - role.total_capacity_fte;
      let status: string;
      if (demandVsCapacity > 0.5) {
        status = 'GAP';
      } else if (demandVsCapacity > 0) {
        status = 'TIGHT';
      } else {
        status = 'OK';
      }
      return { ...role, status };
    });

    const timeline = await this.calculateCapacityTimeline(startDate, endDate);

    // Transform for frontend
    const byRole = capacityGapsWithStatus.map((gap: any) => ({
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
      byRole,
      personUtilization: personUtilizationRaw,
      utilizationData,
      projectDemands,
      timeline,
      summary: {
        totalGaps: capacityGapsWithStatus.filter((gap: any) => gap.status === 'GAP').length,
        totalTight: capacityGapsWithStatus.filter((gap: any) => gap.status === 'TIGHT').length,
        overAllocated: utilizationData.filter((person: any) => person.allocation_status === 'OVER_ALLOCATED').length,
        underAllocated: utilizationData.filter((person: any) => person.allocation_status === 'UNDER_ALLOCATED').length
      }
    };
  }

  /**
   * Get project report data
   */
  async getProjectReport(filters: {
    status?: string;
    priority?: string;
    projectType?: string;
    location?: string;
  }): Promise<ProjectReportData> {
    let query = this.db('project_health_view').select('*');

    if (filters.status) {
      query = query.where('health_status', filters.status);
    }
    if (filters.priority) {
      query = query.where('priority', filters.priority);
    }
    if (filters.projectType) {
      query = query.where('project_type_id', filters.projectType);
    }
    if (filters.location) {
      query = query.where('location_id', filters.location);
    }

    const projects = await query.orderBy('priority', 'desc');

    const statusSummary = await this.db('project_health_view')
      .select('health_status')
      .count('* as count')
      .groupBy('health_status');

    const prioritySummary = await this.db('project_health_view')
      .select('priority')
      .count('* as count')
      .groupBy('priority')
      .orderBy('priority', 'desc');

    return {
      projects,
      summary: {
        byStatus: statusSummary.reduce((acc: Record<string, number>, item: any) => {
          acc[item.health_status] = item.count;
          return acc;
        }, {}),
        byPriority: prioritySummary.reduce((acc: Record<string, number>, item: any) => {
          acc[item.priority] = item.count;
          return acc;
        }, {})
      }
    };
  }

  /**
   * Get timeline report data
   */
  async getTimelineReport(startDate?: string, endDate?: string): Promise<TimelineReportData> {
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

    return { projects, phases };
  }

  /**
   * Get utilization report with date filtering
   */
  async getUtilizationReport(startDate?: string, endDate?: string): Promise<UtilizationReportData> {
    const effectiveEndDate = endDate || (startDate
      ? new Date(new Date(startDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);

    const effectiveStartDate = startDate || new Date().toISOString().split('T')[0];

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

    const utilizationData = utilizationRaw.map((person: any) => {
      const totalAllocHours = person.total_allocation_percentage * person.default_hours_per_day / 100.0;
      let allocationWarning = null;
      let displayAllocationPercentage = person.total_allocation_percentage;

      if (person.total_allocation_percentage > 300) {
        allocationWarning = 'extreme_overallocation';
        displayAllocationPercentage = 300;
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

    const overutilized = utilizationData.filter((p: any) => p.allocation_status === 'OVER_ALLOCATED');
    const underutilized = utilizationData.filter((p: any) =>
      p.allocation_status === 'UNDER_ALLOCATED' || p.allocation_status === 'AVAILABLE'
    );

    const avgUtilization = utilizationData.reduce((sum: number, p: any) =>
      sum + (p.total_allocation_percentage || 0), 0) / utilizationData.length;

    const peakUtilization = Math.max(...utilizationData.map((p: any) => p.total_allocation_percentage || 0));

    // Calculate health summary
    const healthSummary = { healthy: 0, warning: 0, critical: 0 };
    utilizationData.forEach((person: any) => {
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
  }

  /**
   * Get gaps analysis data
   */
  async getGapsAnalysis(): Promise<GapsAnalysisData> {
    const capacityGapsRaw = await this.db('capacity_gaps_view').select('*');

    const capacityGaps = capacityGapsRaw.map((gap: any) => {
      const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
      const gapPercentage = gap.total_capacity_fte > 0
        ? (demandVsCapacity / gap.total_capacity_fte) * 100
        : (gap.total_demand_fte > 0 ? 100 : 0);

      let status: string;
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
    }).sort((a: any, b: any) => b.gap_percentage - a.gap_percentage);

    const projectHealth = await this.db('project_health_view')
      .select('*')
      .orderBy('total_allocation_percentage', 'asc');

    const projectDemands = await this.db('project_demands_view')
      .select('*')
      .where('time_status', '!=', 'PAST');

    const projectsWithUnmetDemands = this.calculateProjectsWithUnmetDemands(projectDemands, projectHealth);

    const criticalRoleGaps = capacityGaps.filter((gap: any) => gap.status === 'GAP' && gap.gap_percentage > 50);
    const criticalProjectGaps = projectsWithUnmetDemands;

    // Calculate summary metrics
    const totalGapHours = capacityGaps.reduce((sum: number, gap: any) => {
      const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
      return sum + Math.max(0, demandVsCapacity) * 8 * 5;
    }, 0);

    const unutilizedHours = capacityGaps.reduce((sum: number, gap: any) => {
      const demandVsCapacity = (gap.total_demand_fte || 0) - (gap.total_capacity_fte || 0);
      return sum + Math.max(0, -demandVsCapacity) * 8 * 5;
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
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private categorizeCapacityGaps(capacityGapsData: any[]): { GAP: number; TIGHT: number; OK: number } {
    let gapRoles = 0;
    let okRoles = 0;
    let tightRoles = 0;

    capacityGapsData.forEach((role: any) => {
      const demandVsCapacity = role.total_demand_fte - role.total_capacity_fte;
      if (demandVsCapacity > 0.5) {
        gapRoles++;
      } else if (demandVsCapacity > 0) {
        tightRoles++;
      } else {
        okRoles++;
      }
    });

    return { GAP: gapRoles, TIGHT: tightRoles, OK: okRoles };
  }

  private mapUtilizationStatus(status: string): string {
    switch (status) {
      case 'Over-allocated': return 'OVER_ALLOCATED';
      case 'Fully-allocated': return 'FULLY_ALLOCATED';
      case 'Partially-allocated': return 'PARTIALLY_ALLOCATED';
      case 'Available': return 'AVAILABLE';
      case 'Unavailable': return 'UNAVAILABLE';
      default: return 'AVAILABLE';
    }
  }

  private async calculateCapacityTimeline(startDate?: string, endDate?: string): Promise<any[]> {
    const people = await this.db('people')
      .select('id', 'name', 'default_hours_per_day', 'default_availability_percentage')
      .where('is_active', true);

    const monthlyMap = new Map<string, number>();
    const filterStart = startDate ? new Date(startDate) : new Date('2023-01-01');
    const filterEnd = endDate ? new Date(endDate) : new Date('2024-12-31');

    const currentDate = new Date(filterStart);
    currentDate.setDate(1);

    while (currentDate <= filterEnd) {
      const monthKey = currentDate.toISOString().slice(0, 7);
      let monthlyCapacity = 0;

      people.forEach((person: any) => {
        const workingDaysPerMonth = 22;
        const dailyHours = person.default_hours_per_day || 8;
        const availabilityPercent = (person.default_availability_percentage || 100) / 100;
        const monthlyPersonCapacity = workingDaysPerMonth * dailyHours * availabilityPercent;
        monthlyCapacity += monthlyPersonCapacity;
      });

      monthlyMap.set(monthKey, monthlyCapacity);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return Array.from(monthlyMap.entries()).map(([month, capacity]) => ({
      period: month,
      capacity: Math.round(capacity)
    }));
  }

  private calculateProjectsWithUnmetDemands(projectDemands: any[], projectHealth: any[]): any[] {
    const projectsWithGaps: any[] = [];

    const demandsByProject = projectDemands.reduce((acc: Record<string, any[]>, demand: any) => {
      if (!acc[demand.project_id]) {
        acc[demand.project_id] = [];
      }
      acc[demand.project_id].push(demand);
      return acc;
    }, {});

    Object.entries(demandsByProject).forEach(([projectId, demands]) => {
      const projectHealthRecord = projectHealth.find((p: any) => p.project_id === projectId);

      if (!projectHealthRecord || projectHealthRecord.allocation_health === 'UNASSIGNED') {
        const project = {
          project_id: projectId,
          project_name: demands[0]?.project_name || 'Unknown',
          gap_type: 'UNASSIGNED',
          unmet_demands: demands.length,
          total_demand_percentage: demands.reduce((sum: number, d: any) => sum + (d.allocation_percentage || 0), 0)
        };
        projectsWithGaps.push(project);
        return;
      }

      const totalDemandPercentage = demands.reduce((sum: number, d: any) => sum + (d.allocation_percentage || 0), 0);
      const actualAllocation = projectHealthRecord.total_allocation_percentage || 0;

      if (totalDemandPercentage > 0 && (actualAllocation / totalDemandPercentage) < 0.8) {
        const project = {
          project_id: projectId,
          project_name: demands[0]?.project_name || 'Unknown',
          gap_type: 'UNDER_COVERED',
          unmet_demands: demands.length,
          total_demand_percentage: totalDemandPercentage,
          actual_allocation_percentage: actualAllocation,
          coverage_ratio: actualAllocation / totalDemandPercentage
        };
        projectsWithGaps.push(project);
      }
    });

    return projectsWithGaps;
  }
}

import type { Knex } from 'knex';
import { getAuditedDb } from '../../database/index.js';

/**
 * Project demands with details
 */
export interface ProjectDemandsResult {
  project: any;
  phases: any[];
  demands: any[];
  summary: {
    total_phases: number;
    total_demands: number;
    total_hours: number;
    total_fte: number;
    override_count: number;
    roles_needed: number;
  };
}

/**
 * Demand summary by role and project type
 */
export interface DemandSummaryResult {
  filters: {
    start_date?: string;
    end_date?: string;
    location_id?: string;
    project_type_id?: string;
  };
  summary: {
    total_demands: number;
    total_projects: number;
    total_hours: number;
    total_fte: number;
  };
  by_role: any[];
  by_project_type: any[];
  timeline: any[];
}

/**
 * Demand forecast result
 */
export interface DemandForecastResult {
  forecast: any[];
  summary: {
    months: number;
    start_date: string;
    end_date: string;
    total_projects: number;
    peak_month: any;
    average_monthly_fte: number;
  };
}

/**
 * Demand gaps result
 */
export interface DemandGapsResult {
  gaps: any[];
  summary: {
    total_gaps: number;
    total_shortage_fte: number;
    critical_gaps: number;
  };
}

/**
 * Scenario calculation result
 */
export interface ScenarioResult {
  scenario: any;
  baseline: any;
  projected: any;
  impact: {
    total_fte_change: number;
    total_hours_change: number;
    roles_impacted: any[];
    new_gaps: any[];
  };
  recommendation: string;
}

/**
 * Service for demand calculations and forecasting
 * Extracts business logic from DemandController
 */
export class DemandCalculationService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getAuditedDb();
  }

  /**
   * Calculate working days between two dates
   */
  calculateWorkDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.round(diffDays * (5 / 7));
  }

  /**
   * Calculate FTE from hours and date range
   */
  calculateFte(hours: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workingDays = days * (5 / 7);
    const hoursPerDay = 8;
    const totalAvailableHours = workingDays * hoursPerDay;
    return hours / totalAvailableHours;
  }

  /**
   * Get demands for a specific project
   */
  async getProjectDemands(projectId: string): Promise<ProjectDemandsResult | null> {
    const project = await this.db('projects')
      .join('project_types', 'projects.project_type_id', 'project_types.id')
      .where('projects.id', projectId)
      .select('projects.*', 'project_types.name as project_type_name')
      .first();

    if (!project) {
      return null;
    }

    const demands = await this.db('project_demands_view')
      .join('project_phases', 'project_demands_view.phase_id', 'project_phases.id')
      .join('roles', 'project_demands_view.role_id', 'roles.id')
      .where('project_demands_view.project_id', projectId)
      .select(
        'project_demands_view.*',
        'project_phases.name as phase_name',
        'project_phases.order_index as phase_order',
        'roles.name as role_name'
      )
      .orderBy('project_demands_view.start_date', 'project_phases.order_index', 'roles.name');

    const demandsWithFte = demands.map((demand: any) => ({
      ...demand,
      demand_fte: this.calculateFte(demand.demand_hours, demand.start_date, demand.end_date)
    }));

    // Group by phase
    const phaseMap = new Map<string, any>();
    demandsWithFte.forEach((demand: any) => {
      if (!phaseMap.has(demand.phase_id)) {
        phaseMap.set(demand.phase_id, {
          phase_id: demand.phase_id,
          phase_name: demand.phase_name,
          phase_order: demand.phase_order,
          start_date: demand.start_date,
          end_date: demand.end_date,
          demands: [],
          total_hours: 0,
          total_fte: 0
        });
      }

      const phase = phaseMap.get(demand.phase_id)!;
      phase.demands.push(demand);
      phase.total_hours += demand.demand_hours;
      phase.total_fte += demand.demand_fte;
    });

    const phases = Array.from(phaseMap.values()).sort((a, b) => a.phase_order - b.phase_order);

    return {
      project,
      phases,
      demands: demandsWithFte,
      summary: {
        total_phases: phases.length,
        total_demands: demandsWithFte.length,
        total_hours: demandsWithFte.reduce((sum: number, d: any) => sum + d.demand_hours, 0),
        total_fte: demandsWithFte.reduce((sum: number, d: any) => sum + d.demand_fte, 0),
        override_count: demandsWithFte.filter((d: any) => d.is_override).length,
        roles_needed: new Set(demandsWithFte.map((d: any) => d.role_id)).size
      }
    };
  }

  /**
   * Get demand summary with aggregations
   */
  async getDemandSummary(filters: {
    start_date?: string;
    end_date?: string;
    location_id?: string;
    project_type_id?: string;
  }): Promise<DemandSummaryResult> {
    let baseQuery = this.db('project_assignments as pa')
      .join('projects as p', 'pa.project_id', 'p.id')
      .join('roles as r', 'pa.role_id', 'r.id')
      .where('p.include_in_demand', true);

    if (filters.start_date) {
      baseQuery = baseQuery.where('pa.end_date', '>=', filters.start_date);
    }
    if (filters.end_date) {
      baseQuery = baseQuery.where('pa.start_date', '<=', filters.end_date);
    }
    if (filters.location_id) {
      baseQuery = baseQuery.where('p.location_id', filters.location_id);
    }
    if (filters.project_type_id) {
      baseQuery = baseQuery.where('p.project_type_id', filters.project_type_id);
    }

    const demands = await baseQuery
      .leftJoin('project_types as pt', 'p.project_type_id', 'pt.id')
      .select(
        'pa.id',
        'pa.project_id',
        'pa.role_id',
        'pa.allocation_percentage',
        'pa.start_date',
        'pa.end_date',
        'p.name as project_name',
        'p.priority as project_priority',
        'p.project_type_id',
        'pt.name as project_type_name',
        'r.name as role_name'
      );

    // Calculate summary by role
    const roleMap = new Map<string, any>();
    const projectTypeMap = new Map<string, any>();

    demands.forEach((demand: any) => {
      if (!roleMap.has(demand.role_id)) {
        roleMap.set(demand.role_id, {
          role_id: demand.role_id,
          role_name: demand.role_name,
          total_hours: 0,
          total_fte: 0,
          project_count: new Set(),
          demands: []
        });
      }

      const durationDays = this.calculateWorkDays(demand.start_date, demand.end_date);
      const demandHours = (demand.allocation_percentage / 100) * durationDays * 8;

      const role = roleMap.get(demand.role_id)!;
      role.total_hours += demandHours;
      role.total_fte += demand.allocation_percentage / 100;
      role.project_count.add(demand.project_id);
      role.demands.push({ ...demand, demand_hours: demandHours });

      // Project type aggregation
      const projectTypeKey = demand.project_type_id || 'unknown';
      if (!projectTypeMap.has(projectTypeKey)) {
        projectTypeMap.set(projectTypeKey, {
          project_type_id: demand.project_type_id,
          project_type_name: demand.project_type_name || 'Unknown',
          total_hours: 0,
          total_fte: 0,
          project_count: new Set(),
          demands: []
        });
      }

      const projectType = projectTypeMap.get(projectTypeKey)!;
      projectType.total_hours += demandHours;
      projectType.total_fte += demand.allocation_percentage / 100;
      projectType.project_count.add(demand.project_id);
      projectType.demands.push({ ...demand, demand_hours: demandHours });
    });

    const rolesSummary = Array.from(roleMap.values()).map(role => ({
      ...role,
      project_count: role.project_count.size,
      demands: undefined
    })).sort((a, b) => b.total_fte - a.total_fte);

    const projectTypesSummary = Array.from(projectTypeMap.values()).map(pt => ({
      ...pt,
      project_count: pt.project_count.size,
      demands: undefined
    })).sort((a, b) => b.total_fte - a.total_fte);

    const timelineSummary = this.calculateTimelineFromDemands(demands, filters.start_date, filters.end_date);

    return {
      filters,
      summary: {
        total_demands: demands.length,
        total_projects: new Set(demands.map((d: any) => d.project_id)).size,
        total_hours: rolesSummary.reduce((sum, r) => sum + r.total_hours, 0),
        total_fte: rolesSummary.reduce((sum, r) => sum + r.total_fte, 0)
      },
      by_role: rolesSummary,
      by_project_type: projectTypesSummary,
      timeline: timelineSummary
    };
  }

  /**
   * Generate demand forecast
   */
  async getDemandForecast(months: number = 6): Promise<DemandForecastResult> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const projects = await this.db('projects')
      .where('include_in_demand', true)
      .where('aspiration_finish', '>=', startDate)
      .select('*');

    const demands = await this.db('project_demands_view')
      .join('projects', 'project_demands_view.project_id', 'projects.id')
      .join('roles', 'project_demands_view.role_id', 'roles.id')
      .where('projects.include_in_demand', true)
      .where('project_demands_view.end_date', '>=', startDate)
      .where('project_demands_view.start_date', '<=', endDate)
      .select(
        'project_demands_view.*',
        'projects.name as project_name',
        'projects.priority as project_priority',
        'roles.name as role_name'
      );

    const forecast = [];

    for (let month = 0; month < months; month++) {
      const monthStart = new Date(startDate);
      monthStart.setMonth(monthStart.getMonth() + month);
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthDemands = demands.filter((d: any) =>
        d.start_date <= monthEnd.toISOString().split('T')[0] &&
        d.end_date >= monthStart.toISOString().split('T')[0]
      );

      const monthData: {
        month: string;
        start_date: string;
        end_date: string;
        total_hours: number;
        total_fte: number;
        by_role: Record<string, { hours: number; fte: number }>;
        project_count: Set<string>;
      } = {
        month: monthStart.toISOString().slice(0, 7),
        start_date: monthStart.toISOString().split('T')[0],
        end_date: monthEnd.toISOString().split('T')[0],
        total_hours: 0,
        total_fte: 0,
        by_role: {},
        project_count: new Set()
      };

      monthDemands.forEach((demand: any) => {
        const demandStart = new Date(Math.max(new Date(demand.start_date).getTime(), monthStart.getTime()));
        const demandEnd = new Date(Math.min(new Date(demand.end_date).getTime(), monthEnd.getTime()));
        const daysInMonth = (demandEnd.getTime() - demandStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
        const totalDays = (new Date(demand.end_date).getTime() - new Date(demand.start_date).getTime()) / (1000 * 60 * 60 * 24) + 1;

        const monthHours = (demand.demand_hours * daysInMonth) / totalDays;
        const monthFte = this.calculateFte(monthHours, demandStart.toISOString().split('T')[0], demandEnd.toISOString().split('T')[0]);

        monthData.total_hours += monthHours;
        monthData.total_fte += monthFte;
        monthData.project_count.add(demand.project_id);

        if (!monthData.by_role[demand.role_name]) {
          monthData.by_role[demand.role_name] = { hours: 0, fte: 0 };
        }
        monthData.by_role[demand.role_name].hours += monthHours;
        monthData.by_role[demand.role_name].fte += monthFte;
      });

      forecast.push({
        ...monthData,
        project_count: monthData.project_count.size
      });
    }

    return {
      forecast,
      summary: {
        months,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        total_projects: projects.length,
        peak_month: forecast.reduce((max, month) =>
          month.total_fte > (max?.total_fte || 0) ? month : max, forecast[0]),
        average_monthly_fte: forecast.reduce((sum, m) => sum + m.total_fte, 0) / forecast.length
      }
    };
  }

  /**
   * Get demand gaps analysis
   */
  async getDemandGaps(): Promise<DemandGapsResult> {
    const gapsData = await this.db('capacity_gaps_view').select('*');

    const gaps = gapsData.map((role: any) => {
      const gapFte = role.total_demand_fte - role.total_capacity_fte;
      return {
        role_id: role.role_id,
        role_name: role.role_name,
        total_demand_fte: role.total_demand_fte || 0,
        total_capacity_fte: role.total_capacity_fte || 0,
        gap_fte: gapFte
      };
    }).filter((role: any) => role.gap_fte > 0);

    return {
      gaps,
      summary: {
        total_gaps: gaps.length,
        total_shortage_fte: gaps.reduce((sum: number, g: any) => sum + Math.abs(g.gap_fte), 0),
        critical_gaps: gaps.filter((g: any) => Math.abs(g.gap_fte / (g.total_capacity_fte || 1)) > 0.2).length
      }
    };
  }

  /**
   * Calculate what-if scenario
   */
  async calculateScenario(scenario: any): Promise<ScenarioResult> {
    const baselineDemands = await this.getBaselineDemands();
    let scenarioDemands = [...baselineDemands];

    // Apply scenario changes
    if (scenario.new_projects) {
      for (const newProject of scenario.new_projects) {
        const projectDemands = await this.calculateProjectDemandsFromAllocations(newProject);
        scenarioDemands.push(...projectDemands);
      }
    }

    if (scenario.remove_projects) {
      scenarioDemands = scenarioDemands.filter((d: any) =>
        !scenario.remove_projects.includes(d.project_id)
      );
    }

    if (scenario.delay_projects) {
      for (const delay of scenario.delay_projects) {
        scenarioDemands = scenarioDemands.map((d: any) => {
          if (d.project_id === delay.project_id) {
            const newStartDate = new Date(d.start_date);
            const newEndDate = new Date(d.end_date);
            newStartDate.setDate(newStartDate.getDate() + delay.delay_days);
            newEndDate.setDate(newEndDate.getDate() + delay.delay_days);
            return {
              ...d,
              start_date: newStartDate.toISOString().split('T')[0],
              end_date: newEndDate.toISOString().split('T')[0]
            };
          }
          return d;
        });
      }
    }

    const baselineSummary = this.summarizeDemands(baselineDemands);
    const scenarioSummary = this.summarizeDemands(scenarioDemands);

    const impact = {
      total_fte_change: scenarioSummary.total_fte - baselineSummary.total_fte,
      total_hours_change: scenarioSummary.total_hours - baselineSummary.total_hours,
      roles_impacted: this.compareRoleDemands(baselineSummary.by_role, scenarioSummary.by_role),
      new_gaps: this.identifyNewGaps(scenarioSummary)
    };

    return {
      scenario,
      baseline: baselineSummary,
      projected: scenarioSummary,
      impact,
      recommendation: this.generateScenarioRecommendation(impact)
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private calculateTimelineFromDemands(demands: any[], filterStartDate?: string, filterEndDate?: string): any[] {
    const monthlyMap = new Map<string, any>();
    const filterStart = filterStartDate ? new Date(filterStartDate) : null;
    const filterEnd = filterEndDate ? new Date(filterEndDate) : null;

    demands.forEach((demand: any) => {
      const startDate = new Date(demand.start_date);
      const endDate = new Date(demand.end_date);

      const durationDays = this.calculateWorkDays(demand.start_date, demand.end_date);
      const demandHours = (demand.allocation_percentage / 100) * durationDays * 8;

      const durationMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const hoursPerMonth = demandHours / durationMonths;

      const currentDate = new Date(startDate);
      currentDate.setDate(1);

      while (currentDate <= endDate) {
        const monthKey = currentDate.toISOString().slice(0, 7);
        const monthDate = new Date(monthKey + '-01');

        if (filterStart) {
          const filterStartMonth = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
          if (monthDate < filterStartMonth) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            continue;
          }
        }
        if (filterEnd) {
          const filterEndMonth = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
          if (monthDate > filterEndMonth) {
            break;
          }
        }

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            total_hours: 0,
            total_fte: 0,
            role_breakdown: {}
          });
        }

        const monthData = monthlyMap.get(monthKey)!;
        monthData.total_hours += hoursPerMonth;
        monthData.total_fte += hoursPerMonth / 160;

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  private async getBaselineDemands(): Promise<any[]> {
    return await this.db('project_demands_view')
      .join('projects', 'project_demands_view.project_id', 'projects.id')
      .where('projects.include_in_demand', true)
      .select('project_demands_view.*');
  }

  private async calculateProjectDemandsFromAllocations(project: any): Promise<any[]> {
    const allocations = await this.db('standard_allocations')
      .where('project_type_id', project.project_type_id)
      .select('*');

    return allocations.map((allocation: any) => ({
      project_id: project.id,
      role_id: allocation.role_id,
      phase_id: allocation.phase_id,
      demand_hours: allocation.allocation_percentage * 8 * 20,
      start_date: project.start_date,
      end_date: project.end_date
    }));
  }

  private summarizeDemands(demands: any[]): any {
    const summary = {
      total_hours: 0,
      total_fte: 0,
      by_role: {} as Record<string, any>
    };

    demands.forEach((demand: any) => {
      summary.total_hours += demand.demand_hours;
      summary.total_fte += this.calculateFte(demand.demand_hours, demand.start_date, demand.end_date);
    });

    return summary;
  }

  private compareRoleDemands(_baseline: any, _scenario: any): any[] {
    return [];
  }

  private identifyNewGaps(_scenarioSummary: any): any[] {
    return [];
  }

  private generateScenarioRecommendation(impact: any): string {
    if (impact.total_fte_change > 10) {
      return 'This scenario would require significant additional resources';
    } else if (impact.new_gaps.length > 0) {
      return 'This scenario would create capacity gaps that need to be addressed';
    } else {
      return 'This scenario appears feasible with current resources';
    }
  }
}

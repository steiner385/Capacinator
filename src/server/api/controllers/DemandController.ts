import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';
import { logger } from '../../services/logging/config.js';

interface DemandCalculation {
  project_id: string;
  project_name: string;
  phase_id: string;
  phase_name: string;
  role_id: string;
  role_name: string;
  start_date: string;
  end_date: string;
  demand_hours: number;
  demand_fte: number;
  is_override: boolean;
}

export class DemandController extends BaseController {
  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  private calculateWorkDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Rough estimate: 5 work days per 7 calendar days
    return Math.round(diffDays * (5/7));
  }
  async getProjectDemands(req: Request, res: Response) {
    const { project_id } = req.params;

    const result = await this.executeQuery(async () => {
      // Get project details
      const project = await this.db('projects')
        .join('project_types', 'projects.project_type_id', 'project_types.id')
        .where('projects.id', project_id)
        .select(
          'projects.*',
          'project_types.name as project_type_name'
        )
        .first();

      if (!project) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      // Get demands from view (includes standard allocations and overrides)
      const demands = await this.db('project_demands_view')
        .join('project_phases', 'project_demands_view.phase_id', 'project_phases.id')
        .join('roles', 'project_demands_view.role_id', 'roles.id')
        .where('project_demands_view.project_id', project_id)
        .select(
          'project_demands_view.*',
          'project_phases.name as phase_name',
          'project_phases.order_index as phase_order',
          'roles.name as role_name'
        )
        .orderBy('project_demands_view.start_date', 'project_phases.order_index', 'roles.name');

      // Calculate FTE for each demand
      const demandsWithFte = demands.map((demand: any) => ({
        ...demand,
        demand_fte: this.calculateFte(demand.demand_hours, demand.start_date, demand.end_date)
      }));

      // Group by phase
      const phaseMap = new Map();
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

        const phase = phaseMap.get(demand.phase_id);
        phase.demands.push(demand);
        phase.total_hours += demand.demand_hours;
        phase.total_fte += demand.demand_fte;
      });

      const phases = Array.from(phaseMap.values()).sort((a, b) => a.phase_order - b.phase_order);

      // Calculate summary
      const summary = {
        total_phases: phases.length,
        total_demands: demandsWithFte.length,
        total_hours: demandsWithFte.reduce((sum: number, d: any) => sum + d.demand_hours, 0),
        total_fte: demandsWithFte.reduce((sum: number, d: any) => sum + d.demand_fte, 0),
        override_count: demandsWithFte.filter((d: any) => d.is_override).length,
        roles_needed: new Set(demandsWithFte.map((d: any) => d.role_id)).size
      };

      return {
        project,
        phases,
        demands: demandsWithFte,
        summary
      };
    }, res, 'Failed to fetch project demands');

    if (result) {
      res.json(result);
    }
  }

  async getDemandSummary(req: Request, res: Response) {
    const { start_date, end_date, location_id, project_type_id } = req.query;
    logger.debug('getDemandSummary called with filters', { start_date, end_date, location_id, project_type_id });

    const result = await this.executeQuery(async () => {
      // Use direct query approach to calculate demand from project assignments
      let baseQuery = this.db('project_assignments as pa')
        .join('projects as p', 'pa.project_id', 'p.id')
        .join('roles as r', 'pa.role_id', 'r.id')
        .where('p.include_in_demand', true);

      // Apply filters
      if (start_date) {
        baseQuery = baseQuery.where('pa.end_date', '>=', start_date);
      }
      if (end_date) {
        baseQuery = baseQuery.where('pa.start_date', '<=', end_date);
      }
      if (location_id) {
        baseQuery = baseQuery.where('p.location_id', location_id);
      }
      if (project_type_id) {
        baseQuery = baseQuery.where('p.project_type_id', project_type_id);
      }

      // Get demands from actual assignments including project type
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

      logger.debug('Demand query results', { count: demands.length, sample: demands[0] || null });

      // Calculate summary by role
      const roleMap = new Map();
      
      // Calculate summary by project type 
      const projectTypeMap = new Map();
      
      demands.forEach(demand => {
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

        // Calculate hours from allocation percentage (assume 8 hours/day, 20 days/month)
        const durationDays = this.calculateWorkDays(demand.start_date, demand.end_date);
        const demandHours = (demand.allocation_percentage / 100) * durationDays * 8;
        
        const role = roleMap.get(demand.role_id);
        role.total_hours += demandHours;
        role.total_fte += demand.allocation_percentage / 100; // FTE is allocation percentage
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

        const projectType = projectTypeMap.get(projectTypeKey);
        projectType.total_hours += demandHours;
        projectType.total_fte += demand.allocation_percentage / 100;
        projectType.project_count.add(demand.project_id);
        projectType.demands.push({ ...demand, demand_hours: demandHours });
      });

      const rolesSummary = Array.from(roleMap.values()).map(role => ({
        ...role,
        project_count: role.project_count.size,
        demands: undefined // Remove detailed demands from summary
      })).sort((a, b) => b.total_fte - a.total_fte);

      const projectTypesSummary = Array.from(projectTypeMap.values()).map(projectType => ({
        ...projectType,
        project_count: projectType.project_count.size,
        demands: undefined // Remove detailed demands from summary
      })).sort((a, b) => b.total_fte - a.total_fte);

      // Calculate timeline summary (monthly) using processed demands with hours
      // We need to use the demand hours that were calculated earlier
      const timelineSummary = this.calculateTimelineFromDemands(demands, start_date as string, end_date as string);

      return {
        filters: { start_date, end_date, location_id, project_type_id },
        summary: {
          total_demands: demands.length,
          total_projects: new Set(demands.map(d => d.project_id)).size,
          total_hours: rolesSummary.reduce((sum, r) => sum + r.total_hours, 0),
          total_fte: rolesSummary.reduce((sum, r) => sum + r.total_fte, 0)
        },
        by_role: rolesSummary,
        by_project_type: projectTypesSummary,
        timeline: timelineSummary
      };
    }, res, 'Failed to fetch demand summary');

    if (result) {
      res.json(result);
    }
  }

  async createOverride(req: Request, res: Response) {
    const overrideData = req.body;

    const result = await this.executeQuery(async () => {
      // Validate project exists
      const project = await this.db('projects').where('id', overrideData.project_id).first();
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Create override
      const [override] = await this.db('demand_overrides')
        .insert({
          ...overrideData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return override;
    }, res, 'Failed to create demand override');

    if (result) {
      res.status(201).json(result);
    }
  }

  async deleteOverride(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const deleted = await this.db('demand_overrides')
        .where('id', id)
        .del();

      if (deleted === 0) {
        this.handleNotFound(res, 'Demand override');
        return null;
      }

      return { message: 'Demand override deleted successfully' };
    }, res, 'Failed to delete demand override');

    if (result) {
      res.json(result);
    }
  }

  async getDemandForecast(req: Request, res: Response) {
    const { months = 6 } = req.query;

    const result = await this.executeQuery(async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + Number(months));

      // Get all active projects
      const projects = await this.db('projects')
        .where('include_in_demand', true)
        .where('aspiration_finish', '>=', startDate)
        .select('*');

      // Get demands for forecast period
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

      // Calculate monthly forecast
      const forecast = [];
      
      for (let month = 0; month < Number(months); month++) {
        const monthStart = new Date(startDate);
        monthStart.setMonth(monthStart.getMonth() + month);
        monthStart.setDate(1);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);

        const monthDemands = demands.filter(d => 
          d.start_date <= monthEnd.toISOString().split('T')[0] &&
          d.end_date >= monthStart.toISOString().split('T')[0]
        );

        const monthData = {
          month: monthStart.toISOString().slice(0, 7),
          start_date: monthStart.toISOString().split('T')[0],
          end_date: monthEnd.toISOString().split('T')[0],
          total_hours: 0,
          total_fte: 0,
          by_role: {} as Record<string, { hours: number; fte: number }>,
          project_count: new Set<string>()
        };

        monthDemands.forEach(demand => {
          // Calculate portion of demand in this month
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
          months: Number(months),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_projects: projects.length,
          peak_month: forecast.reduce((max, month) => 
            month.total_fte > (max?.total_fte || 0) ? month : max
          , forecast[0]),
          average_monthly_fte: forecast.reduce((sum, m) => sum + m.total_fte, 0) / forecast.length
        }
      };
    }, res, 'Failed to generate demand forecast');

    if (result) {
      res.json(result);
    }
  }

  async getDemandGaps(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      // Get capacity gaps from view - calculate gaps based on demand vs capacity
      const gapsData = await this.db('capacity_gaps_view').select('*');
      
      // Filter for actual gaps where demand exceeds capacity and map to the expected format
      const gaps = gapsData.map(role => {
        const gapFte = role.total_demand_fte - role.total_capacity_fte;
        return {
          role_id: role.role_id,
          role_name: role.role_name,
          total_demand_fte: role.total_demand_fte || 0,
          total_capacity_fte: role.total_capacity_fte || 0,
          gap_fte: gapFte
        };
      }).filter(role => role.gap_fte > 0); // Only include roles with actual gaps

      return {
        gaps: gaps,
        summary: {
          total_gaps: gaps.length,
          total_shortage_fte: gaps.reduce((sum, g) => sum + Math.abs(g.gap_fte), 0),
          critical_gaps: gaps.filter(g => Math.abs(g.gap_fte / (g.total_capacity_fte || 1)) > 0.2).length
        }
      };
    }, res, 'Failed to fetch demand gaps');

    if (result) {
      res.json(result);
    }
  }

  async calculateScenario(req: Request, res: Response) {
    const { scenario } = req.body;

    const result = await this.executeQuery(async () => {
      // Scenario can include:
      // - new_projects: Array of projects to add
      // - remove_projects: Array of project IDs to remove
      // - delay_projects: Array of { project_id, delay_days }
      // - change_allocations: Array of { project_id, role_id, new_percentage }

      const baselineDemands = await this.getBaselineDemands();
      let scenarioDemands = [...baselineDemands];

      // Apply scenario changes
      if (scenario.new_projects) {
        for (const newProject of scenario.new_projects) {
          const projectDemands = await this.calculateProjectDemands(newProject);
          scenarioDemands.push(...projectDemands);
        }
      }

      if (scenario.remove_projects) {
        scenarioDemands = scenarioDemands.filter(d => 
          !scenario.remove_projects.includes(d.project_id)
        );
      }

      if (scenario.delay_projects) {
        for (const delay of scenario.delay_projects) {
          scenarioDemands = scenarioDemands.map(d => {
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

      // Calculate impact
      const baselineSummary = this.summarizeDemands(baselineDemands);
      const scenarioSummary = this.summarizeDemands(scenarioDemands);

      const impact = {
        total_fte_change: scenarioSummary.total_fte - baselineSummary.total_fte,
        total_hours_change: scenarioSummary.total_hours - baselineSummary.total_hours,
        roles_impacted: this.compareRoleDemands(baselineSummary.by_role, scenarioSummary.by_role),
        new_gaps: this.identifyNewGaps(scenarioSummary)
      };

      return {
        scenario: scenario,
        baseline: baselineSummary,
        projected: scenarioSummary,
        impact,
        recommendation: this.generateScenarioRecommendation(impact)
      };
    }, res, 'Failed to calculate scenario');

    if (result) {
      res.json(result);
    }
  }

  private calculateFte(hours: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workingDays = days * (5/7); // Approximate working days
    const hoursPerDay = 8;
    const totalAvailableHours = workingDays * hoursPerDay;
    
    return hours / totalAvailableHours;
  }

  private calculateTimelineFromDemands(demands: any[], filterStartDate?: string, filterEndDate?: string): any[] {
    const monthlyMap = new Map();

    // Define the filter range bounds
    const filterStart = filterStartDate ? new Date(filterStartDate) : null;
    const filterEnd = filterEndDate ? new Date(filterEndDate) : null;

    demands.forEach(demand => {
      const startDate = new Date(demand.start_date);
      const endDate = new Date(demand.end_date);
      
      // Calculate hours from allocation percentage 
      const durationDays = this.calculateWorkDays(demand.start_date, demand.end_date);
      const demandHours = (demand.allocation_percentage / 100) * durationDays * 8;
      
      // Calculate the duration in months
      const durationMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const hoursPerMonth = demandHours / durationMonths;
      
      let currentDate = new Date(startDate);
      currentDate.setDate(1); // Set to first day of month
      
      while (currentDate <= endDate) {
        const monthKey = currentDate.toISOString().slice(0, 7);
        const monthDate = new Date(monthKey + '-01');
        
        // Only include months that fall within the filter range
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

        const monthData = monthlyMap.get(monthKey);
        monthData.total_hours += hoursPerMonth;
        monthData.total_fte += hoursPerMonth / 160; // Assume 160 hours per month (8 hours * 20 days)

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateMonthlyDemand(demands: any[]): any[] {
    logger.debug('calculateMonthlyDemand called', { demandCount: demands.length });
    const monthlyMap = new Map();

    demands.forEach(demand => {
      const startDate = new Date(demand.start_date);
      const endDate = new Date(demand.end_date);
      const demandHours = demand.demand_hours || 0;
      
      // Calculate the duration in months
      const durationMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const hoursPerMonth = demandHours / durationMonths;
      
      let currentDate = new Date(startDate);
      currentDate.setDate(1); // Set to first day of month
      
      while (currentDate <= endDate) {
        const monthKey = currentDate.toISOString().slice(0, 7);
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            total_hours: 0,
            total_fte: 0,
            role_breakdown: {}
          });
        }

        const monthData = monthlyMap.get(monthKey);
        monthData.total_hours += hoursPerMonth;
        monthData.total_fte += hoursPerMonth / 160; // Assume 160 hours per month (8 hours * 20 days)

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

  private async calculateProjectDemands(project: any): Promise<any[]> {
    const allocations = await this.db('standard_allocations')
      .where('project_type_id', project.project_type_id)
      .select('*');

    // Simplified - would need to calculate based on project timeline
    return allocations.map(allocation => ({
      project_id: project.id,
      role_id: allocation.role_id,
      phase_id: allocation.phase_id,
      demand_hours: allocation.allocation_percentage * 8 * 20, // Simplified calculation
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

    demands.forEach(demand => {
      summary.total_hours += demand.demand_hours;
      summary.total_fte += this.calculateFte(demand.demand_hours, demand.start_date, demand.end_date);
    });

    return summary;
  }

  private compareRoleDemands(baseline: any, scenario: any): any[] {
    // Implementation would compare role demands
    return [];
  }

  private identifyNewGaps(scenarioSummary: any): any[] {
    // Implementation would identify capacity gaps
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
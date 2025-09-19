import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

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

    // Generate a UUID for the projects


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('projects')


      .insert({


        id: resultId,


        ...{
          ...overrideData,
          created_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('projects')


      .where({ id: resultId })


      .select('*');

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
    console.log('🗓️ calculateMonthlyDemand called with', demands.length, 'demands');
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
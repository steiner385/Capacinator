import type { Knex } from 'knex';
import ExcelJS from 'exceljs';
import { getAuditedDb } from '../../database/index.js';

/**
 * Export data for capacity reports
 */
export interface CapacityExportData {
  totalCapacity: number;
  utilizedCapacity: number;
  availableCapacity: number;
  byRole: Array<{
    role: string;
    capacity: number;
    utilized: number;
    gap_fte?: number;
  }>;
  capacityGaps: any[];
  personUtilization: any[];
}

/**
 * Export data for utilization reports
 */
export interface UtilizationExportData {
  peopleUtilization: Array<{
    id: string;
    name: string;
    role: string;
    utilization: number;
  }>;
  averageUtilization: number;
}

/**
 * Export data for demand reports
 */
export interface DemandExportData {
  totalDemand: number;
  byProjectType: Array<{
    type: string;
    demand: number;
  }>;
}

/**
 * Export data for gaps reports
 */
export interface GapsExportData {
  totalGap: number;
  gapsByRole: Array<{
    roleId: string;
    roleName: string;
    demand: number;
    capacity: number;
    gap: number;
  }>;
}

/**
 * Service for exporting reports in various formats
 * Extracts business logic from ExportController
 */
export class ReportExportService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getAuditedDb();
  }

  // ============================================
  // Excel Generation
  // ============================================

  /**
   * Generate capacity report Excel workbook
   */
  async generateCapacityExcel(workbook: ExcelJS.Workbook, filters: any): Promise<void> {
    const data = await this.getCapacityData(filters);
    const sheet = workbook.addWorksheet('Capacity Report');

    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Total Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Utilized (Hours)', key: 'utilized', width: 20 },
      { header: 'Available (Hours)', key: 'available', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 }
    ];

    this.styleHeaderRow(sheet);

    data.byRole?.forEach((role: any) => {
      sheet.addRow({
        role: role.role,
        capacity: role.capacity,
        utilized: role.utilized,
        available: role.capacity - role.utilized,
        utilization: Math.round((role.utilized / role.capacity) * 100)
      });
    });
  }

  /**
   * Generate utilization report Excel workbook
   */
  async generateUtilizationExcel(workbook: ExcelJS.Workbook, filters: any): Promise<void> {
    const data = await this.getUtilizationData(filters);
    const sheet = workbook.addWorksheet('Utilization Report');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    this.styleHeaderRow(sheet);

    data.peopleUtilization?.forEach((person: any) => {
      sheet.addRow({
        name: person.name,
        role: person.role,
        utilization: person.utilization,
        status: person.utilization > 100 ? 'Over-allocated' :
          person.utilization < 70 ? 'Under-utilized' : 'Optimal'
      });
    });
  }

  /**
   * Generate demand report Excel workbook
   */
  async generateDemandExcel(workbook: ExcelJS.Workbook, filters: any): Promise<void> {
    const data = await this.getDemandData(filters);
    const sheet = workbook.addWorksheet('Demand Report');

    sheet.columns = [
      { header: 'Project Type', key: 'type', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 }
    ];

    this.styleHeaderRow(sheet);

    data.byProjectType?.forEach((type: any) => {
      sheet.addRow({
        type: type.type,
        demand: type.demand
      });
    });
  }

  /**
   * Generate gaps report Excel workbook
   */
  async generateGapsExcel(workbook: ExcelJS.Workbook, filters: any): Promise<void> {
    const data = await this.getGapsData(filters);
    const sheet = workbook.addWorksheet('Capacity Gaps');

    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 },
      { header: 'Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Gap (Hours)', key: 'gap', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    this.styleHeaderRow(sheet);

    data.gapsByRole?.forEach((gap: any) => {
      sheet.addRow({
        role: gap.roleName,
        demand: gap.demand,
        capacity: gap.capacity,
        gap: gap.gap,
        status: gap.gap < 0 ? 'Gap' : 'Sufficient'
      });
    });
  }

  // ============================================
  // CSV Generation
  // ============================================

  /**
   * Generate capacity report CSV
   */
  generateCapacityCSV(data: CapacityExportData): string {
    const headers = ['Role', 'Total Capacity (Hours)', 'Utilized (Hours)', 'Available (Hours)', 'Utilization %'];
    const rows = data.byRole?.map((role: any) => [
      role.role,
      role.capacity,
      role.utilized,
      role.capacity - role.utilized,
      Math.round((role.utilized / role.capacity) * 100)
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate utilization report CSV
   */
  generateUtilizationCSV(data: UtilizationExportData): string {
    const headers = ['Name', 'Role', 'Utilization %', 'Status'];
    const rows = data.peopleUtilization?.map((person: any) => [
      person.name,
      person.role,
      person.utilization,
      person.utilization > 100 ? 'Over-allocated' :
        person.utilization < 70 ? 'Under-utilized' : 'Optimal'
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate demand report CSV
   */
  generateDemandCSV(data: DemandExportData): string {
    const headers = ['Project Type', 'Demand (Hours)'];
    const rows = data.byProjectType?.map((type: any) => [
      type.type,
      type.demand
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate gaps report CSV
   */
  generateGapsCSV(data: GapsExportData): string {
    const headers = ['Role', 'Demand (Hours)', 'Capacity (Hours)', 'Gap (Hours)', 'Status'];
    const rows = data.gapsByRole?.map((gap: any) => [
      gap.roleName,
      gap.demand,
      gap.capacity,
      gap.gap,
      gap.gap < 0 ? 'Gap' : 'Sufficient'
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  // ============================================
  // HTML Generation (for PDF)
  // ============================================

  /**
   * Generate capacity report HTML
   */
  generateCapacityHTML(data: CapacityExportData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Capacity Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Capacity Report</h1>
        <div class="summary">
          <div class="summary-card">
            <h3>Total Capacity</h3>
            <p>${data.totalCapacity || 0} hours</p>
          </div>
          <div class="summary-card">
            <h3>Utilized</h3>
            <p>${data.utilizedCapacity || 0} hours</p>
          </div>
          <div class="summary-card">
            <h3>Available</h3>
            <p>${data.availableCapacity || 0} hours</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Total Capacity</th>
              <th>Utilized</th>
              <th>Available</th>
              <th>Utilization %</th>
            </tr>
          </thead>
          <tbody>
            ${data.byRole?.map((role: any) => `
              <tr>
                <td>${role.role}</td>
                <td>${role.capacity} hours</td>
                <td>${role.utilized} hours</td>
                <td>${role.capacity - role.utilized} hours</td>
                <td>${Math.round((role.utilized / role.capacity) * 100)}%</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate utilization report HTML
   */
  generateUtilizationHTML(data: UtilizationExportData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Utilization Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .over-allocated { background-color: #ffebee; }
          .under-utilized { background-color: #fff3e0; }
          .optimal { background-color: #e8f5e8; }
        </style>
      </head>
      <body>
        <h1>Utilization Report</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Utilization %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.peopleUtilization?.map((person: any) => {
      const status = person.utilization > 100 ? 'Over-allocated' :
        person.utilization < 70 ? 'Under-utilized' : 'Optimal';
      const rowClass = person.utilization > 100 ? 'over-allocated' :
        person.utilization < 70 ? 'under-utilized' : 'optimal';
      return `
                <tr class="${rowClass}">
                  <td>${person.name}</td>
                  <td>${person.role}</td>
                  <td>${person.utilization}%</td>
                  <td>${status}</td>
                </tr>
              `;
    }).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate demand report HTML
   */
  generateDemandHTML(data: DemandExportData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demand Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Demand Report</h1>
        <table>
          <thead>
            <tr>
              <th>Project Type</th>
              <th>Demand (Hours)</th>
            </tr>
          </thead>
          <tbody>
            ${data.byProjectType?.map((type: any) => `
              <tr>
                <td>${type.type}</td>
                <td>${type.demand} hours</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate gaps report HTML
   */
  generateGapsHTML(data: GapsExportData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Capacity Gaps Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .gap { background-color: #ffebee; }
          .sufficient { background-color: #e8f5e8; }
        </style>
      </head>
      <body>
        <h1>Capacity Gaps Report</h1>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Demand (Hours)</th>
              <th>Capacity (Hours)</th>
              <th>Gap (Hours)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.gapsByRole?.map((gap: any) => {
      const rowClass = gap.gap < 0 ? 'gap' : 'sufficient';
      return `
                <tr class="${rowClass}">
                  <td>${gap.roleName}</td>
                  <td>${gap.demand} hours</td>
                  <td>${gap.capacity} hours</td>
                  <td>${gap.gap} hours</td>
                  <td>${gap.gap < 0 ? 'Gap' : 'Sufficient'}</td>
                </tr>
              `;
    }).join('') || ''}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  // ============================================
  // Data Fetching Methods
  // ============================================

  /**
   * Get capacity data for export
   */
  async getCapacityData(_filters: any): Promise<CapacityExportData> {
    const capacityGaps = await this.db('capacity_gaps_view').select('*');
    const personUtilization = await this.db('person_utilization_view').select('*');

    const byRole = capacityGaps.map((gap: any) => ({
      role: gap.role_name,
      capacity: Math.round(gap.total_capacity_fte * 160),
      utilized: Math.round((gap.total_capacity_fte - Math.abs(gap.gap_fte || 0)) * 160),
      gap_fte: gap.gap_fte
    }));

    const totalCapacity = byRole.reduce((sum: number, r: any) => sum + r.capacity, 0);
    const utilizedCapacity = byRole.reduce((sum: number, r: any) => sum + r.utilized, 0);

    return {
      totalCapacity,
      utilizedCapacity,
      availableCapacity: totalCapacity - utilizedCapacity,
      byRole,
      capacityGaps,
      personUtilization
    };
  }

  /**
   * Get utilization data for export
   */
  async getUtilizationData(filters: any): Promise<UtilizationExportData> {
    const capacityReport = await this.getCapacityData(filters);

    const peopleUtilization = capacityReport.personUtilization.map((person: any) => ({
      id: person.person_id,
      name: person.person_name,
      role: person.primary_role,
      utilization: Math.round(person.total_allocation || 0)
    }));

    return {
      peopleUtilization,
      averageUtilization: Math.round(
        peopleUtilization.reduce((sum: number, p: any) => sum + p.utilization, 0) /
        (peopleUtilization.length || 1)
      )
    };
  }

  /**
   * Get demand data for export
   */
  async getDemandData(filters: any): Promise<DemandExportData> {
    const { startDate, endDate, projectTypeId, locationId } = filters;

    let query = this.db('project_demands_view')
      .join('projects', 'project_demands_view.project_id', 'projects.id')
      .join('roles', 'project_demands_view.role_id', 'roles.id')
      .where('projects.include_in_demand', true);

    if (startDate) {
      query = query.where('project_demands_view.end_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('project_demands_view.start_date', '<=', endDate);
    }
    if (locationId) {
      query = query.where('projects.location_id', locationId);
    }
    if (projectTypeId) {
      query = query.where('projects.project_type_id', projectTypeId);
    }

    const demands = await query.select(
      'project_demands_view.*',
      'projects.name as project_name',
      'projects.priority as project_priority',
      'roles.name as role_name'
    );

    const roleMap = new Map<string, any>();
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

      const role = roleMap.get(demand.role_id)!;
      role.total_hours += demand.demand_hours;
      role.total_fte += this.calculateFte(demand.demand_hours, demand.start_date, demand.end_date);
      role.project_count.add(demand.project_id);
      role.demands.push(demand);
    });

    const byProjectType = Array.from(roleMap.values()).map(role => ({
      type: role.role_name,
      demand: role.total_hours
    }));

    return {
      totalDemand: demands.reduce((sum: number, d: any) => sum + d.demand_hours, 0),
      byProjectType
    };
  }

  /**
   * Get gaps data for export
   */
  async getGapsData(_filters: any): Promise<GapsExportData> {
    const gapsData = await this.db('capacity_gaps_view').select('*');

    const gaps = gapsData.map((role: any) => {
      const gapFte = role.total_demand_fte - role.total_capacity_fte;
      return {
        ...role,
        gap_fte: gapFte
      };
    }).filter((role: any) => role.gap_fte > 0);

    const detailedGaps = await Promise.all(gaps.map(async (gap: any) => {
      const currentDemand = await this.db('project_demands_view')
        .join('projects', 'project_demands_view.project_id', 'projects.id')
        .where('project_demands_view.role_id', gap.role_id)
        .where('project_demands_view.start_date', '<=', new Date())
        .where('project_demands_view.end_date', '>=', new Date())
        .where('projects.include_in_demand', true)
        .select(
          'projects.id as project_id',
          'projects.name as project_name',
          'projects.priority',
          'project_demands_view.demand_hours'
        );

      return {
        ...gap,
        current_demands: currentDemand,
        gap_details: {
          capacity_fte: gap.total_capacity_fte,
          demand_fte: gap.total_demand_fte,
          shortage_fte: gap.gap_fte,
          shortage_percentage: Math.abs((gap.gap_fte / gap.total_capacity_fte) * 100)
        }
      };
    }));

    detailedGaps.sort((a, b) => a.gap_fte - b.gap_fte);

    const gapsByRole = detailedGaps.map((gap: any) => ({
      roleId: gap.role_id,
      roleName: gap.role_name,
      demand: Math.round(gap.total_demand_fte * 160),
      capacity: Math.round(gap.total_capacity_fte * 160),
      gap: Math.round(gap.gap_fte * 160)
    }));

    return {
      totalGap: detailedGaps.reduce((sum: number, g: any) => sum + Math.abs(g.gap_fte), 0) * 160,
      gapsByRole
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  }

  private arrayToCSV(data: any[][]): string {
    return data.map(row =>
      row.map(cell =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')
    ).join('\n');
  }

  private calculateFte(hours: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysInPeriod = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    const workingDaysInPeriod = Math.ceil(daysInPeriod * (5 / 7));
    const hoursPerDay = 8;
    const totalWorkingHours = workingDaysInPeriod * hoursPerDay;

    return totalWorkingHours > 0 ? hours / totalWorkingHours : 0;
  }
}

import ExcelJS from 'exceljs';
import type {
  ReportType,
  CsvCellValue,
  ExportCapacityData,
  ExportUtilizationData,
  ExportDemandData,
  ExportGapsData,
  ExportRoleCapacity,
  ExportPersonUtilization,
  ExportProjectTypeDemand,
  ExportRoleGap,
} from './types.js';

/**
 * Service for formatting report data into various export formats.
 * Extracted from ExportController.
 */
export class ExportFormatterService {
  /**
   * Generate Excel workbook for a report type
   */
  async generateExcel(reportType: ReportType, data: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Capacinator';
    workbook.lastModifiedBy = 'Capacinator';
    workbook.created = new Date();
    workbook.modified = new Date();

    switch (reportType) {
      case 'capacity':
        this.generateCapacityExcel(workbook, data as ExportCapacityData);
        break;
      case 'utilization':
        this.generateUtilizationExcel(workbook, data as ExportUtilizationData);
        break;
      case 'demand':
        this.generateDemandExcel(workbook, data as ExportDemandData);
        break;
      case 'gaps':
        this.generateGapsExcel(workbook, data as ExportGapsData);
        break;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate CSV string for a report type
   */
  generateCSV(reportType: ReportType, data: unknown): string {
    switch (reportType) {
      case 'capacity':
        return this.generateCapacityCSV(data as ExportCapacityData);
      case 'utilization':
        return this.generateUtilizationCSV(data as ExportUtilizationData);
      case 'demand':
        return this.generateDemandCSV(data as ExportDemandData);
      case 'gaps':
        return this.generateGapsCSV(data as ExportGapsData);
      default:
        throw new Error(`Invalid report type: ${reportType}`);
    }
  }

  /**
   * Generate PDF buffer for a report type
   */
  async generatePDF(reportType: ReportType, data: unknown): Promise<Buffer> {
    const puppeteer = await import('puppeteer-core');

    let htmlContent: string;
    switch (reportType) {
      case 'capacity':
        htmlContent = this.generateCapacityHTML(data as ExportCapacityData);
        break;
      case 'utilization':
        htmlContent = this.generateUtilizationHTML(data as ExportUtilizationData);
        break;
      case 'demand':
        htmlContent = this.generateDemandHTML(data as ExportDemandData);
        break;
      case 'gaps':
        htmlContent = this.generateGapsHTML(data as ExportGapsData);
        break;
      default:
        throw new Error(`Invalid report type: ${reportType}`);
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Get filename for report type and format
   */
  getFilename(reportType: ReportType, format: 'xlsx' | 'csv' | 'pdf'): string {
    const baseName = {
      capacity: 'capacity-report',
      utilization: 'utilization-report',
      demand: 'demand-report',
      gaps: 'capacity-gaps-report',
    }[reportType];

    return `${baseName}.${format}`;
  }

  // ============================================================================
  // Excel Generators
  // ============================================================================

  private generateCapacityExcel(workbook: ExcelJS.Workbook, data: ExportCapacityData): void {
    const sheet = workbook.addWorksheet('Capacity Report');

    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Total Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Utilized (Hours)', key: 'utilized', width: 20 },
      { header: 'Available (Hours)', key: 'available', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
    ];

    this.styleHeader(sheet);

    data.byRole?.forEach((role: ExportRoleCapacity) => {
      sheet.addRow({
        role: role.role,
        capacity: role.capacity,
        utilized: role.utilized,
        available: role.capacity - role.utilized,
        utilization: Math.round((role.utilized / role.capacity) * 100),
      });
    });
  }

  private generateUtilizationExcel(workbook: ExcelJS.Workbook, data: ExportUtilizationData): void {
    const sheet = workbook.addWorksheet('Utilization Report');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    this.styleHeader(sheet);

    data.peopleUtilization?.forEach((person: ExportPersonUtilization) => {
      sheet.addRow({
        name: person.name,
        role: person.role,
        utilization: person.utilization,
        status: this.getUtilizationStatus(person.utilization),
      });
    });
  }

  private generateDemandExcel(workbook: ExcelJS.Workbook, data: ExportDemandData): void {
    const sheet = workbook.addWorksheet('Demand Report');

    sheet.columns = [
      { header: 'Project Type', key: 'type', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 },
    ];

    this.styleHeader(sheet);

    data.byProjectType?.forEach((type: ExportProjectTypeDemand) => {
      sheet.addRow({ type: type.type, demand: type.demand });
    });
  }

  private generateGapsExcel(workbook: ExcelJS.Workbook, data: ExportGapsData): void {
    const sheet = workbook.addWorksheet('Capacity Gaps');

    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 },
      { header: 'Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Gap (Hours)', key: 'gap', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    this.styleHeader(sheet);

    data.gapsByRole?.forEach((gap: ExportRoleGap) => {
      sheet.addRow({
        role: gap.roleName,
        demand: gap.demand,
        capacity: gap.capacity,
        gap: gap.gap,
        status: gap.gap < 0 ? 'Gap' : 'Sufficient',
      });
    });
  }

  private styleHeader(sheet: ExcelJS.Worksheet): void {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' },
    };
  }

  // ============================================================================
  // CSV Generators
  // ============================================================================

  private generateCapacityCSV(data: ExportCapacityData): string {
    const headers = ['Role', 'Total Capacity (Hours)', 'Utilized (Hours)', 'Available (Hours)', 'Utilization %'];
    const rows = data.byRole?.map((role: ExportRoleCapacity) => [
      role.role,
      role.capacity,
      role.utilized,
      role.capacity - role.utilized,
      Math.round((role.utilized / role.capacity) * 100),
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateUtilizationCSV(data: ExportUtilizationData): string {
    const headers = ['Name', 'Role', 'Utilization %', 'Status'];
    const rows = data.peopleUtilization?.map((person: ExportPersonUtilization) => [
      person.name,
      person.role,
      person.utilization,
      this.getUtilizationStatus(person.utilization),
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateDemandCSV(data: ExportDemandData): string {
    const headers = ['Project Type', 'Demand (Hours)'];
    const rows = data.byProjectType?.map((type: ExportProjectTypeDemand) => [
      type.type,
      type.demand,
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateGapsCSV(data: ExportGapsData): string {
    const headers = ['Role', 'Demand (Hours)', 'Capacity (Hours)', 'Gap (Hours)', 'Status'];
    const rows = data.gapsByRole?.map((gap: ExportRoleGap) => [
      gap.roleName,
      gap.demand,
      gap.capacity,
      gap.gap,
      gap.gap < 0 ? 'Gap' : 'Sufficient',
    ]) || [];

    return this.arrayToCSV([headers, ...rows]);
  }

  private arrayToCSV(data: CsvCellValue[][]): string {
    return data.map((row) =>
      row.map((cell) =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')
    ).join('\n');
  }

  // ============================================================================
  // HTML Generators (for PDF)
  // ============================================================================

  private generateCapacityHTML(data: ExportCapacityData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Capacity Report</title>
        ${this.getCommonStyles()}
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
            ${data.byRole?.map((role: ExportRoleCapacity) => `
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

  private generateUtilizationHTML(data: ExportUtilizationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Utilization Report</title>
        ${this.getCommonStyles()}
        <style>
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
            ${data.peopleUtilization?.map((person: ExportPersonUtilization) => {
              const status = this.getUtilizationStatus(person.utilization);
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

  private generateDemandHTML(data: ExportDemandData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demand Report</title>
        ${this.getCommonStyles()}
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
            ${data.byProjectType?.map((type: ExportProjectTypeDemand) => `
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

  private generateGapsHTML(data: ExportGapsData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Capacity Gaps Report</title>
        ${this.getCommonStyles()}
        <style>
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
            ${data.gapsByRole?.map((gap: ExportRoleGap) => {
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

  private getCommonStyles(): string {
    return `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
      </style>
    `;
  }

  private getUtilizationStatus(utilization: number): string {
    if (utilization > 100) return 'Over-allocated';
    if (utilization < 70) return 'Under-utilized';
    return 'Optimal';
  }
}

import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

export class ExportController extends BaseController {
  
  async exportReportAsExcel(req: Request, res: Response) {
    try {
      const { reportType, filters = {} } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }
      
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'Capacinator';
      workbook.lastModifiedBy = 'Capacinator';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      let filename = '';
      
      switch (reportType) {
        case 'capacity':
          await this.generateCapacityExcel(workbook, filters);
          filename = 'capacity-report.xlsx';
          break;
        case 'utilization':
          await this.generateUtilizationExcel(workbook, filters);
          filename = 'utilization-report.xlsx';
          break;
        case 'demand':
          await this.generateDemandExcel(workbook, filters);
          filename = 'demand-report.xlsx';
          break;
        case 'gaps':
          await this.generateGapsExcel(workbook, filters);
          filename = 'capacity-gaps-report.xlsx';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
      
      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Send the file
      res.send(buffer);
      
    } catch (error) {
      this.handleError(error, res, 'Export failed');
    }
  }
  
  async exportReportAsCSV(req: Request, res: Response) {
    try {
      const { reportType, filters = {} } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }
      
      let csvContent = '';
      let filename = '';
      
      switch (reportType) {
        case 'capacity':
          const capacityData = await this.getCapacityData(filters);
          csvContent = this.generateCapacityCSV(capacityData);
          filename = 'capacity-report.csv';
          break;
        case 'utilization':
          const utilizationData = await this.getUtilizationData(filters);
          csvContent = this.generateUtilizationCSV(utilizationData);
          filename = 'utilization-report.csv';
          break;
        case 'demand':
          const demandData = await this.getDemandData(filters);
          csvContent = this.generateDemandCSV(demandData);
          filename = 'demand-report.csv';
          break;
        case 'gaps':
          const gapsData = await this.getGapsData(filters);
          csvContent = this.generateGapsCSV(gapsData);
          filename = 'capacity-gaps-report.csv';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
      
      // Set response headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Send the CSV content
      res.send(csvContent);
      
    } catch (error) {
      this.handleError(error, res, 'CSV export failed');
    }
  }
  
  async exportReportAsPDF(req: Request, res: Response) {
    try {
      const { reportType, filters = {} } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }
      
      const puppeteer = require('puppeteer-core');
      
      // Generate HTML content for the report
      let htmlContent = '';
      let filename = '';
      
      switch (reportType) {
        case 'capacity':
          const capacityData = await this.getCapacityData(filters);
          htmlContent = this.generateCapacityHTML(capacityData);
          filename = 'capacity-report.pdf';
          break;
        case 'utilization':
          const utilizationData = await this.getUtilizationData(filters);
          htmlContent = this.generateUtilizationHTML(utilizationData);
          filename = 'utilization-report.pdf';
          break;
        case 'demand':
          const demandData = await this.getDemandData(filters);
          htmlContent = this.generateDemandHTML(demandData);
          filename = 'demand-report.pdf';
          break;
        case 'gaps':
          const gapsData = await this.getGapsData(filters);
          htmlContent = this.generateGapsHTML(gapsData);
          filename = 'capacity-gaps-report.pdf';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }
      
      // Launch browser and generate PDF
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        // Send the PDF
        res.send(pdfBuffer);
        
      } finally {
        await browser.close();
      }
      
    } catch (error) {
      this.handleError(error, res, 'PDF export failed');
    }
  }
  
  private async generateCapacityExcel(workbook: any, filters: any) {
    const data = await this.getCapacityData(filters);
    const sheet = workbook.addWorksheet('Capacity Report');
    
    // Add headers
    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Total Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Utilized (Hours)', key: 'utilized', width: 20 },
      { header: 'Available (Hours)', key: 'available', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data rows
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
  
  private async generateUtilizationExcel(workbook: any, filters: any) {
    const data = await this.getUtilizationData(filters);
    const sheet = workbook.addWorksheet('Utilization Report');
    
    // Add headers
    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data rows
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
  
  private async generateDemandExcel(workbook: any, filters: any) {
    const data = await this.getDemandData(filters);
    const sheet = workbook.addWorksheet('Demand Report');
    
    // Add headers
    sheet.columns = [
      { header: 'Project Type', key: 'type', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data rows
    data.byProjectType?.forEach((type: any) => {
      sheet.addRow({
        type: type.type,
        demand: type.demand
      });
    });
  }
  
  private async generateGapsExcel(workbook: any, filters: any) {
    const data = await this.getGapsData(filters);
    const sheet = workbook.addWorksheet('Capacity Gaps');
    
    // Add headers
    sheet.columns = [
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Demand (Hours)', key: 'demand', width: 20 },
      { header: 'Capacity (Hours)', key: 'capacity', width: 20 },
      { header: 'Gap (Hours)', key: 'gap', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];
    
    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    // Add data rows
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
  
  private generateCapacityCSV(data: any): string {
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
  
  private generateUtilizationCSV(data: any): string {
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
  
  private generateDemandCSV(data: any): string {
    const headers = ['Project Type', 'Demand (Hours)'];
    const rows = data.byProjectType?.map((type: any) => [
      type.type,
      type.demand
    ]) || [];
    
    return this.arrayToCSV([headers, ...rows]);
  }
  
  private generateGapsCSV(data: any): string {
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
  
  private arrayToCSV(data: any[][]): string {
    return data.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')
    ).join('\n');
  }
  
  private generateCapacityHTML(data: any): string {
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
  
  private generateUtilizationHTML(data: any): string {
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
  
  private generateDemandHTML(data: any): string {
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
  
  private generateGapsHTML(data: any): string {
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
  
  private async getCapacityData(filters: any) {
    // This would typically call the same logic as the reporting controller
    // For now, return mock data structure
    return {
      totalCapacity: 0,
      utilizedCapacity: 0,
      availableCapacity: 0,
      byRole: []
    };
  }
  
  private async getUtilizationData(filters: any) {
    return {
      averageUtilization: 0,
      peopleUtilization: []
    };
  }
  
  private async getDemandData(filters: any) {
    return {
      totalDemand: 0,
      byProjectType: []
    };
  }
  
  private async getGapsData(filters: any) {
    return {
      totalGap: 0,
      gapsByRole: []
    };
  }
}
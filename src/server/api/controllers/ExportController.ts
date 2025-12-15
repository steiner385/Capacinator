import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';
import { ReportExportService } from '../../services/export/ReportExportService.js';
import ExcelJS from 'exceljs';

/**
 * Controller for report export endpoints
 * Delegates business logic to ReportExportService
 */
export class ExportController extends BaseController {
  private _exportService: ReportExportService | null = null;

  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  /** Lazy initialization to support test mocking of this.db */
  private get exportService(): ReportExportService {
    if (!this._exportService) {
      this._exportService = new ReportExportService(this.db);
    }
    return this._exportService;
  }

  /**
   * POST /api/export/excel - Export report as Excel
   */
  async exportReportAsExcel(req: Request, res: Response) {
    try {
      const { reportType, filters = {} } = req.body;

      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Capacinator';
      workbook.lastModifiedBy = 'Capacinator';
      workbook.created = new Date();
      workbook.modified = new Date();

      let filename = '';

      switch (reportType) {
        case 'capacity':
          await this.exportService.generateCapacityExcel(workbook, filters);
          filename = 'capacity-report.xlsx';
          break;
        case 'utilization':
          await this.exportService.generateUtilizationExcel(workbook, filters);
          filename = 'utilization-report.xlsx';
          break;
        case 'demand':
          await this.exportService.generateDemandExcel(workbook, filters);
          filename = 'demand-report.xlsx';
          break;
        case 'gaps':
          await this.exportService.generateGapsExcel(workbook, filters);
          filename = 'capacity-gaps-report.xlsx';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      res.send(buffer);
    } catch (error) {
      this.handleError(error, res, 'Export failed');
    }
  }

  /**
   * POST /api/export/csv - Export report as CSV
   */
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
          const capacityData = await this.exportService.getCapacityData(filters);
          csvContent = this.exportService.generateCapacityCSV(capacityData);
          filename = 'capacity-report.csv';
          break;
        case 'utilization':
          const utilizationData = await this.exportService.getUtilizationData(filters);
          csvContent = this.exportService.generateUtilizationCSV(utilizationData);
          filename = 'utilization-report.csv';
          break;
        case 'demand':
          const demandData = await this.exportService.getDemandData(filters);
          csvContent = this.exportService.generateDemandCSV(demandData);
          filename = 'demand-report.csv';
          break;
        case 'gaps':
          const gapsData = await this.exportService.getGapsData(filters);
          csvContent = this.exportService.generateGapsCSV(gapsData);
          filename = 'capacity-gaps-report.csv';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      res.send(csvContent);
    } catch (error) {
      this.handleError(error, res, 'CSV export failed');
    }
  }

  /**
   * POST /api/export/pdf - Export report as PDF
   */
  async exportReportAsPDF(req: Request, res: Response) {
    try {
      const { reportType, filters = {} } = req.body;

      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }

      const puppeteer = await import('puppeteer-core');

      let htmlContent = '';
      let filename = '';

      switch (reportType) {
        case 'capacity':
          const capacityData = await this.exportService.getCapacityData(filters);
          htmlContent = this.exportService.generateCapacityHTML(capacityData);
          filename = 'capacity-report.pdf';
          break;
        case 'utilization':
          const utilizationData = await this.exportService.getUtilizationData(filters);
          htmlContent = this.exportService.generateUtilizationHTML(utilizationData);
          filename = 'utilization-report.pdf';
          break;
        case 'demand':
          const demandData = await this.exportService.getDemandData(filters);
          htmlContent = this.exportService.generateDemandHTML(demandData);
          filename = 'demand-report.pdf';
          break;
        case 'gaps':
          const gapsData = await this.exportService.getGapsData(filters);
          htmlContent = this.exportService.generateGapsHTML(gapsData);
          filename = 'capacity-gaps-report.pdf';
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        res.send(pdfBuffer);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.handleError(error, res, 'PDF export failed');
    }
  }
}

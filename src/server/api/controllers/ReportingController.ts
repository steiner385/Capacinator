import type { Response } from 'express';
import { BaseController, RequestWithContext } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';
import { ReportDataService } from '../../services/reports/ReportDataService.js';
import type { DemandReportFilters, ProjectReportFilters, DateRangeFilter } from '../../services/reports/types.js';

// Alias for backward compatibility
type RequestWithLogging = RequestWithContext;

export class ReportingController extends BaseController {
  private _reportDataService?: ReportDataService;

  constructor(container?: ServiceContainer) {
    super({ enableLogging: true }, { container });
  }

  // Lazy initialization to allow db mocking in tests
  private get reportDataService(): ReportDataService {
    if (!this._reportDataService) {
      this._reportDataService = new ReportDataService(this.db);
    }
    return this._reportDataService;
  }

  getDashboard = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Dashboard endpoint called');

    const result = await this.executeQuery(
      async () => this.reportDataService.getDashboardStats(),
      res,
      'Failed to fetch dashboard data'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getTest = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Test endpoint called');
    try {
      const projects = await this.db('projects').select('*').limit(1);
      req.logger.info('Projects query successful', { projects });
      this.sendSuccess(req, res, { status: 'ok', data: projects });
    } catch (error) {
      req.logger.error('Test endpoint error', error);
      this.handleError(error, req, res, 'Test failed');
    }
  });

  getCapacityReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const filters: DateRangeFilter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const result = await this.executeQuery(
      async () => this.reportDataService.getCapacityReport(filters),
      res,
      'Failed to fetch capacity report'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getProjectReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const filters: ProjectReportFilters = {
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      projectType: req.query.projectType as string | undefined,
      location: req.query.location as string | undefined,
    };

    const result = await this.executeQuery(
      async () => this.reportDataService.getProjectReport(filters),
      req,
      res,
      'Failed to fetch project report'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getTimelineReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const filters: DateRangeFilter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const result = await this.executeQuery(
      async () => this.reportDataService.getTimelineReport(filters),
      res,
      'Failed to fetch timeline report'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getDemandReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Demand report endpoint called');

    const filters: DemandReportFilters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      scenarioId: req.headers['x-scenario-id'] as string | undefined,
      includeAllScenarios: req.query.includeAllScenarios === 'true',
    };

    const result = await this.executeQuery(
      async () => this.reportDataService.getDemandReport(filters),
      res,
      'Failed to fetch demand report'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getUtilizationReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Utilization report endpoint called');

    const filters: DateRangeFilter = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    req.logger.info('Date filters:', filters);

    const result = await this.executeQuery(
      async () => this.reportDataService.getUtilizationReport(filters),
      res,
      'Failed to fetch utilization report'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  getGapsAnalysis = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Gaps analysis endpoint called');

    const result = await this.executeQuery(
      async () => this.reportDataService.getGapsAnalysis(),
      res,
      'Failed to fetch gaps analysis'
    );

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });
}

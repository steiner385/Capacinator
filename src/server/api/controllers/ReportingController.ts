import type { Request, Response } from 'express';
import { BaseController, RequestWithContext } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';
import { ReportGenerationService } from '../../services/reports/ReportGenerationService.js';
import { DemandCalculationService } from '../../services/demand/DemandCalculationService.js';

// Alias for backward compatibility
type RequestWithLogging = RequestWithContext;

/**
 * Controller for report generation endpoints
 * Delegates business logic to ReportGenerationService
 */
export class ReportingController extends BaseController {
  private _reportService: ReportGenerationService | null = null;
  private _demandService: DemandCalculationService | null = null;

  constructor(container?: ServiceContainer) {
    super({ enableLogging: true }, { container });
  }

  /** Lazy initialization to support test mocking of this.db */
  private get reportService(): ReportGenerationService {
    if (!this._reportService) {
      this._reportService = new ReportGenerationService(this.db);
    }
    return this._reportService;
  }

  /** Lazy initialization to support test mocking of this.db */
  private get demandService(): DemandCalculationService {
    if (!this._demandService) {
      this._demandService = new DemandCalculationService(this.db);
    }
    return this._demandService;
  }

  /**
   * GET /api/dashboard - Get dashboard summary data
   */
  getDashboard = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Dashboard endpoint called');

    const result = await this.executeQuery(async () => {
      req.logger.info('Starting dashboard data fetch...');
      const data = await this.reportService.getDashboardData();
      req.logger.info('Dashboard data fetched successfully');
      return data;
    }, res, 'Failed to fetch dashboard data');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/test - Simple test endpoint
   */
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

  /**
   * GET /api/reports/capacity - Get capacity report
   */
  getCapacityReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      return await this.reportService.getCapacityReport(
        startDate as string | undefined,
        endDate as string | undefined
      );
    }, res, 'Failed to fetch capacity report');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/reports/project - Get project report
   */
  getProjectReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const { status, priority, projectType, location } = req.query;

    const result = await this.executeQuery(async () => {
      return await this.reportService.getProjectReport({
        status: status as string | undefined,
        priority: priority as string | undefined,
        projectType: projectType as string | undefined,
        location: location as string | undefined
      });
    }, req, res, 'Failed to fetch project report');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/reports/timeline - Get timeline report
   */
  getTimelineReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    const { startDate, endDate } = req.query;

    const result = await this.executeQuery(async () => {
      return await this.reportService.getTimelineReport(
        startDate as string | undefined,
        endDate as string | undefined
      );
    }, res, 'Failed to fetch timeline report');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/reports/demand - Get demand report
   */
  getDemandReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Demand report endpoint called');
    const { startDate, endDate, includeAllScenarios } = req.query;
    const scenarioId = req.headers['x-scenario-id'] as string;

    const result = await this.executeQuery(async () => {
      req.logger.info('Getting demand data...', { startDate, endDate, scenarioId });

      // Get base demand data from service
      const demandResult = await this.demandService.getDemandSummary({
        start_date: startDate as string | undefined,
        end_date: endDate as string | undefined
      });

      // Apply scenario filtering if needed
      if (scenarioId && includeAllScenarios !== 'true') {
        const scenario = await this.db('scenarios').where('id', scenarioId).first();
        req.logger.info('Applied scenario filter', { scenarioId, type: scenario?.scenario_type });
      }

      req.logger.info(`Demand report generated with ${demandResult.summary.total_demands} records`);

      return {
        demandData: [],
        byProject: demandResult.by_role.map((r: any) => ({
          id: r.role_id,
          name: r.role_name,
          demand: r.total_hours
        })),
        by_role: demandResult.by_role,
        by_project_type: demandResult.by_project_type,
        timeline: demandResult.timeline,
        summary: {
          total_hours: demandResult.summary.total_hours,
          total_projects: demandResult.summary.total_projects,
          roles_with_demand: demandResult.by_role.length
        }
      };
    }, res, 'Failed to fetch demand report');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/reports/utilization - Get utilization report
   */
  getUtilizationReport = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Utilization report endpoint called');
    const { startDate, endDate } = req.query;
    req.logger.info('Date filters:', { startDate, endDate });

    const result = await this.executeQuery(async () => {
      req.logger.info('Calculating date-aware utilization data...');
      const data = await this.reportService.getUtilizationReport(
        startDate as string | undefined,
        endDate as string | undefined
      );
      req.logger.info(`Found ${data.utilizationData.length} people with utilization data`);
      return data;
    }, res, 'Failed to fetch utilization report');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });

  /**
   * GET /api/reports/gaps - Get gaps analysis
   */
  getGapsAnalysis = this.asyncHandler(async (req: RequestWithLogging, res: Response) => {
    req.logger.info('Gaps analysis endpoint called');

    const result = await this.executeQuery(async () => {
      req.logger.info('Getting gaps analysis data...');
      const data = await this.reportService.getGapsAnalysis();
      req.logger.info(`Found ${data.capacityGaps.length} capacity gap records`);
      return data;
    }, res, 'Failed to fetch gaps analysis');

    if (result) {
      this.sendSuccess(req, res, result);
    }
  });
}

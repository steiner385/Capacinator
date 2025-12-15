import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ServiceContainer } from '../../services/ServiceContainer.js';
import { DemandCalculationService } from '../../services/demand/DemandCalculationService.js';

/**
 * Controller for demand management endpoints
 * Delegates business logic to DemandCalculationService
 */
export class DemandController extends BaseController {
  private _demandService: DemandCalculationService | null = null;

  constructor(container?: ServiceContainer) {
    super({}, { container });
  }

  /** Lazy initialization to support test mocking of this.db */
  private get demandService(): DemandCalculationService {
    if (!this._demandService) {
      this._demandService = new DemandCalculationService(this.db);
    }
    return this._demandService;
  }

  /**
   * GET /api/demand/project/:project_id - Get demands for a specific project
   */
  async getProjectDemands(req: Request, res: Response) {
    const { project_id } = req.params;

    const result = await this.executeQuery(async () => {
      const data = await this.demandService.getProjectDemands(project_id);

      if (!data) {
        this.handleNotFound(res, 'Project');
        return null;
      }

      return data;
    }, res, 'Failed to fetch project demands');

    if (result) {
      res.json(result);
    }
  }

  /**
   * GET /api/demand/summary - Get demand summary with filters
   */
  async getDemandSummary(req: Request, res: Response) {
    const { start_date, end_date, location_id, project_type_id } = req.query;
    console.log('getDemandSummary called with filters:', { start_date, end_date, location_id, project_type_id });

    const result = await this.executeQuery(async () => {
      const data = await this.demandService.getDemandSummary({
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
        location_id: location_id as string | undefined,
        project_type_id: project_type_id as string | undefined
      });

      console.log('Demand summary results:', data.summary.total_demands, 'assignments found');
      return data;
    }, res, 'Failed to fetch demand summary');

    if (result) {
      res.json(result);
    }
  }

  /**
   * POST /api/demand/override - Create a demand override
   */
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

  /**
   * DELETE /api/demand/override/:id - Delete a demand override
   */
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

  /**
   * GET /api/demand/forecast - Get demand forecast
   */
  async getDemandForecast(req: Request, res: Response) {
    const { months = 6 } = req.query;

    const result = await this.executeQuery(async () => {
      return await this.demandService.getDemandForecast(Number(months));
    }, res, 'Failed to generate demand forecast');

    if (result) {
      res.json(result);
    }
  }

  /**
   * GET /api/demand/gaps - Get demand gaps analysis
   */
  async getDemandGaps(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      return await this.demandService.getDemandGaps();
    }, res, 'Failed to fetch demand gaps');

    if (result) {
      res.json(result);
    }
  }

  /**
   * POST /api/demand/scenario - Calculate what-if scenario
   */
  async calculateScenario(req: Request, res: Response) {
    const { scenario } = req.body;

    const result = await this.executeQuery(async () => {
      return await this.demandService.calculateScenario(scenario);
    }, res, 'Failed to calculate scenario');

    if (result) {
      res.json(result);
    }
  }
}

import { Router } from 'express';
import { DemandController } from '../controllers/DemandController.js';

const router = Router();
const controller = new DemandController();

// Demand calculations
router.get('/project/:project_id', (req, res) => controller.getProjectDemands(req, res));
router.get('/summary', (req, res) => controller.getDemandSummary(req, res));

// Demand overrides
router.post('/override', (req, res) => controller.createOverride(req, res));
router.delete('/override/:id', (req, res) => controller.deleteOverride(req, res));

// Demand analysis
router.get('/forecast', (req, res) => controller.getDemandForecast(req, res));
router.get('/gaps', (req, res) => controller.getDemandGaps(req, res));

// What-if scenarios
router.post('/scenario', (req, res) => controller.calculateScenario(req, res));

export default router;
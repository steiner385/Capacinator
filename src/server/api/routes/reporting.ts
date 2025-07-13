import { Router } from 'express';
import { ReportingController } from '../controllers/ReportingController.js';

const router = Router();
const controller = new ReportingController();

// Dashboard and reporting endpoints
router.get('/dashboard', (req, res) => controller.getDashboard(req, res));
router.get('/test', (req, res) => controller.getTest(req, res));
router.get('/capacity', (req, res) => controller.getCapacityReport(req, res));
router.get('/projects', (req, res) => controller.getProjectReport(req, res));
router.get('/timeline', (req, res) => controller.getTimelineReport(req, res));

export default router;
import { Router } from 'express';
import { ProjectsController } from '../controllers/ProjectsController.js';

const router = Router();
const controller = new ProjectsController();

// Test data cleanup (for e2e tests) - must come before /:id route
router.delete('/test-data', (req, res) => controller.deleteTestData(req, res));

// Debug endpoint - must come before /:id route
router.get('/debug', (req, res) => controller.debugQuery(req, res));

// Project CRUD operations
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Project-specific endpoints
router.get('/:id/demands', (req, res) => controller.getDemands(req, res));

// Dashboard/reporting endpoints
router.get('/dashboard/health', (req, res) => controller.getHealth(req, res));

export default router;
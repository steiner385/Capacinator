import { Router } from 'express';
import { ResourceTemplatesController } from '../controllers/ResourceTemplatesController.js';

const router = Router();
const controller = new ResourceTemplatesController();

// Allocation CRUD operations
router.get('/', (req, res) => controller.getAll(req, res));
router.post('/', (req, res) => controller.create(req, res));

// Bulk operations
router.post('/bulk', (req, res) => controller.bulkUpdate(req, res));
router.post('/copy', (req, res) => controller.copy(req, res));

// Analysis endpoints
router.get('/templates', (req, res) => controller.getTemplates(req, res));
router.get('/summary', (req, res) => controller.getSummary(req, res));
router.get('/project-type/:project_type_id', (req, res) => controller.getByProjectType(req, res));

export default router;
import { Router } from 'express';
import { ProjectPhasesController } from '../controllers/ProjectPhasesController.js';

const router = Router();
const controller = new ProjectPhasesController();

router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));
router.post('/bulk', (req, res) => controller.bulkUpdate(req, res));

// Custom phase management endpoints
router.post('/duplicate', (req, res) => controller.duplicatePhase(req, res));
router.post('/create-custom', (req, res) => controller.createCustomPhase(req, res));

export default router;
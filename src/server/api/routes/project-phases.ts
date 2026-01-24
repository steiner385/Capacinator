import { Router } from 'express';
import { ProjectPhasesController } from '../controllers/ProjectPhasesController.js';

const router = Router();
const controller = new ProjectPhasesController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/bulk', controller.bulkUpdate);

// Custom phase management endpoints
router.post('/duplicate', controller.duplicatePhase);
router.post('/create-custom', controller.createCustomPhase);

// Bulk corrections endpoint for Fix All functionality
// router.post('/bulk-corrections', (req, res) => controller.applyBulkCorrections(req, res));

export default router;
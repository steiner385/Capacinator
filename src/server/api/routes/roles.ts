import { Router } from 'express';
import { RolesController } from '../controllers/RolesController.js';

const router = Router();
const controller = new RolesController();

// Expertise levels endpoint
router.get('/expertise-levels', controller.getExpertiseLevels);

// Role CRUD operations
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Role planner management
router.post('/:id/planners', controller.addPlanner);
router.delete('/:id/planners/:plannerId', controller.removePlanner);

// Dashboard/reporting endpoints
router.get('/dashboard/capacity-gaps', controller.getCapacityGaps);

export default router;
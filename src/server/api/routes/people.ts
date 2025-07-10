import { Router } from 'express';
import { PeopleController } from '../controllers/PeopleController.js';

const router = Router();
const controller = new PeopleController();

// People CRUD operations
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Person role management
router.post('/:id/roles', (req, res) => controller.addRole(req, res));
router.delete('/:id/roles/:roleId', (req, res) => controller.removeRole(req, res));

// Dashboard/reporting endpoints
router.get('/dashboard/utilization', (req, res) => controller.getUtilization(req, res));
router.get('/dashboard/availability', (req, res) => controller.getAvailability(req, res));

export default router;
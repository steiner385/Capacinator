import { Router } from 'express';
import { PeopleController } from '../controllers/PeopleController.js';

const router = Router();
const controller = new PeopleController();

// Test data cleanup (for e2e tests) - must come before /:id route  
router.delete('/test-data', (req, res) => controller.deleteTestData(req, res));

// Dashboard/reporting endpoints - must come before /:id route
router.get('/dashboard/utilization', (req, res) => controller.getUtilization(req, res));
router.get('/dashboard/availability', (req, res) => controller.getAvailability(req, res));
router.get('/utilization', (req, res) => controller.getUtilization(req, res));

// People CRUD operations
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Person role management
router.get('/:id/roles', (req, res) => controller.getRoles(req, res));
router.post('/:id/roles', (req, res) => controller.addRole(req, res));
router.put('/:id/roles/:roleId', (req, res) => controller.updateRole(req, res));
router.delete('/:id/roles/:roleId', (req, res) => controller.removeRole(req, res));


export default router;
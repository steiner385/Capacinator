import { Router } from 'express';
import { AvailabilityController } from '../controllers/AvailabilityController.js';

const router = Router();
const controller = new AvailabilityController();

// Availability override CRUD
router.get('/', (req, res) => controller.getAll(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Bulk operations
router.post('/bulk', (req, res) => controller.bulkCreate(req, res));

// Approval workflow
router.post('/:id/approve', (req, res) => controller.approve(req, res));

// Calendar and forecasting
router.get('/calendar', (req, res) => controller.getCalendar(req, res));
router.get('/forecast', (req, res) => controller.getForecast(req, res));

export default router;
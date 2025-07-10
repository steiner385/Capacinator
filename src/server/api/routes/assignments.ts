import { Router } from 'express';
import { AssignmentsController } from '../controllers/AssignmentsController.js';

const router = Router();
const controller = new AssignmentsController();

// Assignment CRUD operations
router.get('/', (req, res) => controller.getAll(req, res));
router.get('/:id', (req, res) => controller.getById(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.put('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.delete(req, res));

// Bulk operations
router.post('/bulk', (req, res) => controller.bulkAssign(req, res));

// Conflict detection
router.get('/conflicts/:person_id', (req, res) => controller.getConflicts(req, res));

// Assignment suggestions
router.get('/suggestions', (req, res) => controller.getSuggestions(req, res));

// Person timeline
router.get('/timeline/:person_id', (req, res) => controller.getTimeline(req, res));

export default router;
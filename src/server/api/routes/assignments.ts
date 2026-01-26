import { Router } from 'express';
import { AssignmentsController } from '../controllers/AssignmentsController.js';

const router = Router();
const controller = new AssignmentsController();

// Test data cleanup (for e2e tests) - must come before /:id route
router.delete('/test-data', controller.deleteTestData);

// Assignment CRUD operations
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

// Bulk operations
router.post('/bulk', controller.bulkAssign);

// Conflict detection
router.get('/conflicts/:person_id', controller.getConflicts);

// Assignment suggestions
router.get('/suggestions', controller.getSuggestions);

// Person timeline
router.get('/timeline/:person_id', controller.getTimeline);

export default router;
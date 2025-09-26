import { Router } from 'express';
import { ProjectPhaseDependenciesController } from '../controllers/ProjectPhaseDependenciesController.js';

const router = Router();

// Get all dependencies (with optional project filter)
router.get('/', ProjectPhaseDependenciesController.getAll);

// Calculate cascade effects (before /:id routes)
router.post('/calculate-cascade', ProjectPhaseDependenciesController.calculateCascade);

// Apply cascade changes (before /:id routes)
router.post('/apply-cascade', ProjectPhaseDependenciesController.applyCascade);

// Get a specific dependency by ID
router.get('/:id', ProjectPhaseDependenciesController.getById);

// Create a new dependency
router.post('/', ProjectPhaseDependenciesController.create);

// Update a dependency
router.put('/:id', ProjectPhaseDependenciesController.update);

// Delete a dependency
router.delete('/:id', ProjectPhaseDependenciesController.delete);

export default router;
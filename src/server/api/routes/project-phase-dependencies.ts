import { Router } from 'express';
import { ProjectPhaseDependenciesController } from '../controllers/ProjectPhaseDependenciesController.js';

const router = Router();
const controller = new ProjectPhaseDependenciesController();

// Get all dependencies (with optional project filter)
router.get('/', (req, res) => controller.getAll(req, res));

// Calculate cascade effects (before /:id routes)
router.post('/calculate-cascade', (req, res) => controller.calculateCascade(req, res));

// Apply cascade changes (before /:id routes)
router.post('/apply-cascade', (req, res) => controller.applyCascade(req, res));

// Get a specific dependency by ID
router.get('/:id', (req, res) => controller.getById(req, res));

// Create a new dependency
router.post('/', (req, res) => controller.create(req, res));

// Update a dependency
router.put('/:id', (req, res) => controller.update(req, res));

// Delete a dependency
router.delete('/:id', (req, res) => controller.delete(req, res));

export default router;

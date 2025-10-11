import { Router } from 'express';
import { ProjectTypeHierarchyController } from '../controllers/ProjectTypeHierarchyController.js';

const router = Router();
const controller = new ProjectTypeHierarchyController();

// Get project type hierarchy
router.get('/hierarchy', controller.getHierarchy);

// Get phases for a specific project type (including inherited)
router.get('/:projectTypeId/phases', controller.getProjectTypePhases);

// Create child project type
router.post('/:parentId/children', controller.createChild);

// Add phase to project type
router.post('/:projectTypeId/phases', controller.addPhase);

// Update phase configuration for project type
router.put('/:projectTypeId/phases/:phaseId', controller.updatePhase);

// Remove phase from project type
router.delete('/:projectTypeId/phases/:phaseId', controller.removePhase);

// Update project type hierarchy (move, reorder)
router.put('/:projectTypeId/hierarchy', controller.updateHierarchy);

export default router;
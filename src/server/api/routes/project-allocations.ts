import { Router } from 'express';
import { ProjectAllocationController } from '../controllers/ProjectAllocationController.js';

const router = Router();
const controller = new ProjectAllocationController();

// Get all allocations for a project
router.get('/:projectId', controller.getProjectAllocations);

// Initialize project allocations from project type (called when project is created)
router.post('/:projectId/initialize', controller.initializeProjectAllocations);

// Override an allocation for a specific project
router.post('/:projectId/override', controller.overrideAllocation);

// Reset an allocation back to inherited value
router.post('/:projectId/reset/:phaseId/:roleId', controller.resetToInherited);

// Delete a project allocation
router.delete('/:projectId/:phaseId/:roleId', controller.deleteAllocation);

export default router;
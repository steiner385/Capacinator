import { Router } from 'express';
import { TestDataController } from '../controllers/TestDataController.js';

const router = Router();
const controller = new TestDataController();

// Test data cleanup endpoints for e2e tests
router.delete('/project-phases', (req, res) => controller.deleteProjectPhases(req, res));
router.delete('/allocations', (req, res) => controller.deleteAllocations(req, res));
router.delete('/availability-overrides', (req, res) => controller.deleteAvailabilityOverrides(req, res));
router.delete('/roles', (req, res) => controller.deleteRoles(req, res));
router.delete('/phases', (req, res) => controller.deletePhases(req, res));
router.delete('/project-types', (req, res) => controller.deleteProjectTypes(req, res));
router.delete('/locations', (req, res) => controller.deleteLocations(req, res));

export default router;
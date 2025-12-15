import { Router } from 'express';
import { TestContextController } from '../controllers/TestContextController.js';

const router = Router();
const controller = new TestContextController();

/**
 * Test Context Routes
 *
 * These endpoints provide per-test data isolation for E2E tests.
 * They are only available in test/e2e/development environments.
 *
 * Usage:
 * 1. Create a context at test start: POST /api/test-context/create
 * 2. Track created entities: POST /api/test-context/track
 * 3. Clean up at test end: POST /api/test-context/cleanup
 */

// Create a new test context
router.post('/create', (req, res) => controller.createContext(req, res));

// Track entities created in a context
router.post('/track', (req, res) => controller.trackEntities(req, res));

// Clean up a specific test context
router.post('/cleanup', (req, res) => controller.cleanupContext(req, res));

// Clean up orphaned test data (older than maxAgeMs)
router.post('/cleanup-orphaned', (req, res) => controller.cleanupOrphanedData(req, res));

// List all active test contexts (for debugging)
router.get('/list', (req, res) => controller.listContexts(req, res));

// Clean up by prefix pattern
router.delete('/by-prefix/:prefix', (req, res) => controller.cleanupByPrefix(req, res));

export default router;

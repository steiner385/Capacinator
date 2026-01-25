/**
 * Git Sync API Routes
 * Feature: 001-git-sync-integration
 *
 * Task: T029
 */

import { Router } from 'express';
import { GitSyncController } from '../controllers/GitSyncController.js';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requireGitAuth, checkGitSyncAvailable } from '../../middleware/gitAuth.js';
import { logger } from '../../services/logging/config.js';

const router = Router();

// Initialize controller with error handling for missing git repository
let controller: GitSyncController | null = null;
try {
  controller = new GitSyncController();
  logger.info('Git sync controller initialized successfully');
} catch (error) {
  logger.warn('Git sync controller failed to initialize (this is normal if Git sync is not configured):', error);
  // Controller will remain null, middleware will handle requests appropriately
}

// Middleware to check if controller is initialized
const ensureController = (req: any, res: any, next: any) => {
  if (!controller) {
    return res.status(503).json({
      success: false,
      error: 'Git sync feature is not available - controller failed to initialize'
    });
  }
  next();
};

// Status endpoint (no auth required to check if feature is available)
router.get('/status', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.getStatus(req, res));

// Sync operations (require both app auth and git credentials)
router.post('/pull', requireAuth(), requireGitAuth(), ensureController, (req, res) => controller!.pull(req, res));
router.post('/push', requireAuth(), requireGitAuth(), ensureController, (req, res) => controller!.push(req, res));

// Conflict management (Task: T051, T052)
router.get('/conflicts', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.getConflicts(req, res));
router.post('/conflicts/:id/resolve', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.resolveConflict(req, res));

// Branch management (Task: T073-T078)
router.post('/branches', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.createBranch(req, res));
router.get('/branches', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.listBranches(req, res));
router.post('/branches/:name/checkout', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.checkoutBranch(req, res));
router.post('/branches/:name/merge', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.mergeBranch(req, res));

// History and comparison (Task: T077, T078)
router.get('/history', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.getHistory(req, res));
router.get('/compare', requireAuth(), checkGitSyncAvailable(), ensureController, (req, res) => controller!.compareBranches(req, res));

export default router;

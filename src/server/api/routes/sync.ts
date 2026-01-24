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

const router = Router();
const controller = new GitSyncController();

// Status endpoint (no auth required to check if feature is available)
router.get('/status', requireAuth(), checkGitSyncAvailable(), controller.getStatus.bind(controller));

// Sync operations (require both app auth and git credentials)
router.post('/pull', requireAuth(), requireGitAuth(), controller.pull.bind(controller));
router.post('/push', requireAuth(), requireGitAuth(), controller.push.bind(controller));

// Conflict management (Task: T051, T052)
router.get('/conflicts', requireAuth(), checkGitSyncAvailable(), controller.getConflicts.bind(controller));
router.post('/conflicts/:id/resolve', requireAuth(), checkGitSyncAvailable(), controller.resolveConflict.bind(controller));

// Branch management (Task: T073-T078)
router.post('/branches', requireAuth(), checkGitSyncAvailable(), controller.createBranch.bind(controller));
router.get('/branches', requireAuth(), checkGitSyncAvailable(), controller.listBranches.bind(controller));
router.post('/branches/:name/checkout', requireAuth(), checkGitSyncAvailable(), controller.checkoutBranch.bind(controller));
router.post('/branches/:name/merge', requireAuth(), checkGitSyncAvailable(), controller.mergeBranch.bind(controller));

// History and comparison (Task: T077, T078)
router.get('/history', requireAuth(), checkGitSyncAvailable(), controller.getHistory.bind(controller));
router.get('/compare', requireAuth(), checkGitSyncAvailable(), controller.compareBranches.bind(controller));

export default router;

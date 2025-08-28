import { Router } from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { AuditService } from '../../services/audit/AuditService.js';
import { auditableController } from '../../middleware/auditMiddleware.js';

export function createAuditRoutes(auditService: AuditService): Router {
  const router = Router();
  const auditController = new AuditController(auditService);

  // Get audit history for a specific record
  router.get(
    '/history/:tableName/:recordId',
    auditableController(auditController.getAuditHistory)
  );

  // Get recent changes (optionally filtered by user)
  router.get(
    '/recent',
    auditableController(auditController.getRecentChanges)
  );

  // Search audit log with various filters
  router.get(
    '/search',
    auditableController(auditController.searchAuditLog)
  );

  // Undo last change for a specific record
  router.post(
    '/undo/:tableName/:recordId',
    auditableController(auditController.undoLastChange)
  );

  // Undo last N changes by a specific user
  router.post(
    '/undo-batch/:changedBy/:count',
    auditableController(auditController.undoLastNChanges)
  );

  // Get audit statistics
  router.get(
    '/stats',
    auditableController(auditController.getAuditStats)
  );

  // Cleanup expired audit entries (admin only)
  router.post(
    '/cleanup',
    auditableController(auditController.cleanupExpiredEntries)
  );

  return router;
}
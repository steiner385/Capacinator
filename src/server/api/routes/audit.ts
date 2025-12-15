import { Router } from 'express';
import { AuditController } from '../controllers/AuditController.js';
import { AuditService } from '../../services/audit/AuditService.js';
import { auditableController } from '../../middleware/enhancedAuditMiddleware.js';

export function createAuditRoutes(auditService: AuditService): Router {
  const router = Router();
  const auditController = new AuditController(auditService);

  // Static routes first (before parameterized routes)
  
  // Basic audit query route - matches /api/audit with query parameters
  router.get(
    '/',
    auditableController(auditController.searchAuditLog)
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

  // Get audit summary by table - NEW for E2E tests
  router.get(
    '/summary/by-table',
    auditableController(auditController.getAuditSummaryByTable)
  );

  // Get audit timeline - NEW for E2E tests
  router.get(
    '/timeline',
    auditableController(auditController.getAuditTimeline)
  );

  // Get user activity - NEW for E2E tests
  router.get(
    '/users/activity',
    auditableController(auditController.getUserActivity)
  );

  // Get audit statistics
  router.get(
    '/stats',
    auditableController(auditController.getAuditStats)
  );

  // POST routes
  
  // Cleanup expired audit entries (admin only)
  router.post(
    '/cleanup',
    auditableController(auditController.cleanupExpiredEntries)
  );

  // Undo last N changes by a specific user
  router.post(
    '/undo-batch/:changedBy/:count',
    auditableController(auditController.undoLastNChanges)
  );

  // Parameterized routes last
  
  // Get audit history for a specific record - matches /api/audit/:tableName/:recordId
  router.get(
    '/:tableName/:recordId',
    auditableController(auditController.getAuditHistory)
  );

  // Undo a specific audit entry - NEW for E2E tests
  router.post(
    '/:auditId/undo',
    auditableController(auditController.undoSpecificAuditEntry)
  );

  // Undo last change for a specific record
  router.post(
    '/undo/:tableName/:recordId',
    auditableController(auditController.undoLastChange)
  );

  return router;
}
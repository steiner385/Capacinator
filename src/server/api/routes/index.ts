import { Router } from 'express';
import projectRoutes from './projects.js';
import peopleRoutes from './people.js';
import rolesRoutes from './roles.js';
import locationsRoutes from './locations.js';
import projectTypesRoutes from './project-types.js';
import projectSubTypesRoutes from './project-sub-types.js';
import phasesRoutes from './phases.js';
import projectPhasesRoutes from './project-phases.js';
import projectPhaseDependenciesRoutes from './project-phase-dependencies.js';
import resourceTemplatesRoutes from './resource-templates.js';
import assignmentsRoutes from './assignments.js';
import availabilityRoutes from './availability.js';
import reportingRoutes from './reporting.js';
import importRoutes from './import.js';
import demandRoutes from './demands.js';
import exportRoutes from './export.js';
import testDataRoutes from './test-data.js';
import testContextRoutes from './test-context.js';
import projectTypeHierarchyRoutes from './project-type-hierarchy.js';
import projectAllocationRoutes from './project-allocations.js';
import scenariosRoutes from './scenarios.js';
import settingsRoutes from './settings.js';
import userPermissionsRoutes from './user-permissions.js';
import notificationsRoutes from './notifications.js';
import recommendationsRoutes from './recommendations.js';
import authRoutes from './auth.js';
import { createAuditRoutes } from './audit.js';
import { getAuditService } from '../../services/audit/index.js';
import { RequestWithLogging } from '../../middleware/requestLogger.js';

const router = Router();

// Auth routes (no auth required for login/refresh)
router.use('/auth', authRoutes);

// Mount all route modules
router.use('/projects', projectRoutes);
router.use('/people', peopleRoutes);
router.use('/roles', rolesRoutes);
router.use('/locations', locationsRoutes);
router.use('/project-types', projectTypesRoutes);
router.use('/project-sub-types', projectSubTypesRoutes);
router.use('/project-type-hierarchy', projectTypeHierarchyRoutes);
router.use('/project-allocations', projectAllocationRoutes);
router.use('/scenarios', scenariosRoutes);
router.use('/phases', phasesRoutes);
router.use('/project-phases', projectPhasesRoutes);
router.use('/project-phase-dependencies', projectPhaseDependenciesRoutes);
router.use('/resource-templates', resourceTemplatesRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/reporting', reportingRoutes);
router.use('/import', importRoutes);
router.use('/export', exportRoutes);
router.use('/demands', demandRoutes);
router.use('/settings', settingsRoutes);
router.use('/user-permissions', userPermissionsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/recommendations', recommendationsRoutes);

// Test data cleanup routes (for e2e tests)
router.use('/test-data', testDataRoutes);

// Test context routes (for per-test data isolation)
router.use('/test-context', testContextRoutes);

// CSP violation reporting endpoint
router.post('/csp-report', (req: RequestWithLogging, res) => {
  const report = req.body['csp-report'] || req.body;

  if (report) {
    req.logger.warn('CSP Violation Report', {
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      effectiveDirective: report['effective-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      columnNumber: report['column-number'],
      originalPolicy: report['original-policy'],
      disposition: report.disposition,
    });
  }

  // Return 204 No Content (standard for CSP reports)
  res.status(204).end();
});

// Client logging endpoint for remote logging
router.post('/client-logs', (req: RequestWithLogging, res) => {
  const { logs } = req.body;
  
  if (!Array.isArray(logs)) {
    return res.status(400).json({ error: 'Invalid logs format' });
  }

  // Log each client log entry with proper context
  logs.forEach((logEntry: any) => {
    const level = logEntry.level?.toLowerCase() || 'info';
    const message = `[CLIENT] ${logEntry.message}`;
    const metadata = {
      component: logEntry.component,
      sessionId: logEntry.sessionId,
      userId: logEntry.userId,
      clientTimestamp: logEntry.timestamp,
      ...logEntry.metadata
    };

    // Add error details if present
    if (logEntry.error) {
      metadata.clientError = logEntry.error;
    }

    switch (level) {
      case 'error':
        req.logger.error(message, undefined, metadata);
        break;
      case 'warn':
        req.logger.warn(message, metadata);
        break;
      case 'debug':
        req.logger.debug(message, metadata);
        break;
      default:
        req.logger.info(message, metadata);
    }
  });

  res.json({ 
    success: true, 
    processed: logs.length,
    requestId: req.requestId 
  });
});

// Audit routes will be mounted dynamically after service initialization

export default router;
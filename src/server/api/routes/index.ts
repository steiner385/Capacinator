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
import projectTypeHierarchyRoutes from './project-type-hierarchy.js';
import projectAllocationRoutes from './project-allocations.js';
import scenariosRoutes from './scenarios.js';
import settingsRoutes from './settings.js';
import userPermissionsRoutes from './user-permissions.js';
import notificationsRoutes from './notifications.js';
import recommendationsRoutes from './recommendations.js';
import { createAuditRoutes } from './audit.js';
import { getAuditService } from '../../services/audit/index.js';

const router = Router();

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

// Audit routes will be mounted dynamically after service initialization

export default router;
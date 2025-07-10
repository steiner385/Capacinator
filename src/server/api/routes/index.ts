import { Router } from 'express';
import projectRoutes from './projects.js';
import peopleRoutes from './people.js';
import rolesRoutes from './roles.js';
import locationsRoutes from './locations.js';
import projectTypesRoutes from './project-types.js';
import phasesRoutes from './phases.js';
import resourceTemplatesRoutes from './resource-templates.js';
import assignmentsRoutes from './assignments.js';
import availabilityRoutes from './availability.js';
import reportingRoutes from './reporting.js';
import importRoutes from './import.js';
import demandRoutes from './demands.js';

const router = Router();

// Mount all route modules
router.use('/projects', projectRoutes);
router.use('/people', peopleRoutes);
router.use('/roles', rolesRoutes);
router.use('/locations', locationsRoutes);
router.use('/project-types', projectTypesRoutes);
router.use('/phases', phasesRoutes);
router.use('/resource-templates', resourceTemplatesRoutes);
router.use('/assignments', assignmentsRoutes);
router.use('/availability', availabilityRoutes);
router.use('/reporting', reportingRoutes);
router.use('/import', importRoutes);
router.use('/demands', demandRoutes);

export default router;
/**
 * Controller Factory
 *
 * Provides factory functions for creating controllers with dependency injection.
 * This centralizes controller instantiation and makes it easy to swap implementations
 * for testing or different environments.
 *
 * Usage:
 * ```typescript
 * import { createControllers } from './ControllerFactory.js';
 *
 * // Create all controllers with shared container
 * const controllers = createControllers(container);
 *
 * // Use individual controllers
 * router.get('/', (req, res) => controllers.projects.getAll(req, res));
 * ```
 */

import { ServiceContainer } from '../../services/ServiceContainer.js';

// Import all controllers
import { ProjectsController } from './ProjectsController.js';
import { PeopleController } from './PeopleController.js';
import { RolesController } from './RolesController.js';
import { AssignmentsController } from './AssignmentsController.js';
import { AvailabilityController } from './AvailabilityController.js';
import { ReportingController } from './ReportingController.js';
import { ProjectPhasesController } from './ProjectPhasesController.js';
import { AuditController } from './AuditController.js';
import { SimpleController } from './SimpleController.js';
import { ProjectTypesController } from './ProjectTypesController.js';
import { ProjectSubTypesController } from './ProjectSubTypesController.js';
import { ProjectPhaseDependenciesController } from './ProjectPhaseDependenciesController.js';
import { ResourceTemplatesController } from './ResourceTemplatesController.js';
import { DemandController } from './DemandController.js';
import { ImportController } from './ImportController.js';
import { ExportController } from './ExportController.js';
import { ScenariosController } from './ScenariosController.js';
import { SettingsController } from './SettingsController.js';
import { UserPermissionsController } from './UserPermissionsController.js';
import { NotificationsController } from './NotificationsController.js';
import { RecommendationsController } from './RecommendationsController.js';
import { ProjectTypeHierarchyController } from './ProjectTypeHierarchyController.js';
import { ProjectAllocationController } from './ProjectAllocationController.js';
import { TestDataController } from './TestDataController.js';

/**
 * All available controllers with their instances
 */
export interface Controllers {
  projects: ProjectsController;
  people: PeopleController;
  roles: RolesController;
  assignments: AssignmentsController;
  availability: AvailabilityController;
  reporting: ReportingController;
  projectPhases: ProjectPhasesController;
  audit: AuditController;
  locations: SimpleController;
  projectTypes: ProjectTypesController;
  projectSubTypes: ProjectSubTypesController;
  phases: SimpleController;
  projectPhaseDependencies: ProjectPhaseDependenciesController;
  resourceTemplates: ResourceTemplatesController;
  demands: DemandController;
  import: ImportController;
  export: ExportController;
  scenarios: ScenariosController;
  settings: SettingsController;
  userPermissions: UserPermissionsController;
  notifications: NotificationsController;
  recommendations: RecommendationsController;
  projectTypeHierarchy: ProjectTypeHierarchyController;
  projectAllocations: ProjectAllocationController;
  testData: TestDataController;
}

/**
 * Create all controllers with dependency injection
 * @param container - ServiceContainer with all dependencies
 * @returns Object containing all controller instances
 */
export function createControllers(container: ServiceContainer): Controllers {
  const auditService = container.getAuditService();

  return {
    // Controllers with enhanced logging
    projects: new ProjectsController(container),
    assignments: new AssignmentsController(container),
    roles: new RolesController(container),
    reporting: new ReportingController(container),
    projectPhases: new ProjectPhasesController(container),

    // Controllers with audit support
    people: new PeopleController(container),
    availability: new AvailabilityController(container),

    // Audit controller with service injection
    audit: new AuditController(auditService!, container),

    // Simple controllers (using table name pattern)
    locations: new SimpleController('locations', container),
    phases: new SimpleController('project_phases', container),

    // Standard controllers
    projectTypes: new ProjectTypesController(container),
    projectSubTypes: new ProjectSubTypesController(container),
    projectPhaseDependencies: new ProjectPhaseDependenciesController(container),
    resourceTemplates: new ResourceTemplatesController(container),
    demands: new DemandController(container),
    import: new ImportController(container),
    export: new ExportController(container),
    scenarios: new ScenariosController(container),
    settings: new SettingsController(container),
    userPermissions: new UserPermissionsController(container),
    notifications: new NotificationsController(container),
    recommendations: new RecommendationsController(container),
    projectTypeHierarchy: new ProjectTypeHierarchyController(container),
    projectAllocations: new ProjectAllocationController(container),
    testData: new TestDataController(container),
  };
}

/**
 * Create a single controller with dependency injection
 * Useful when you only need one controller type
 */
export function createController<T>(
  ControllerClass: new (container: ServiceContainer) => T,
  container: ServiceContainer
): T {
  return new ControllerClass(container);
}

/**
 * Legacy factory - creates controllers without container (backward compatible)
 * @deprecated Use createControllers(container) instead
 */
export function createLegacyControllers(): Partial<Controllers> {
  console.warn('createLegacyControllers is deprecated. Use createControllers(container) instead.');
  return {
    projects: new ProjectsController(),
    people: new PeopleController(),
    roles: new RolesController(),
    assignments: new AssignmentsController(),
    availability: new AvailabilityController(),
    reporting: new ReportingController(),
    projectPhases: new ProjectPhasesController(),
    locations: new SimpleController('locations'),
    projectTypes: new ProjectTypesController(),
    projectSubTypes: new ProjectSubTypesController(),
    phases: new SimpleController('project_phases'),
    projectPhaseDependencies: new ProjectPhaseDependenciesController(),
    resourceTemplates: new ResourceTemplatesController(),
    demands: new DemandController(),
    import: new ImportController(),
    export: new ExportController(),
    scenarios: new ScenariosController(),
    settings: new SettingsController(),
    userPermissions: new UserPermissionsController(),
    notifications: new NotificationsController(),
    recommendations: new RecommendationsController(),
    projectTypeHierarchy: new ProjectTypeHierarchyController(),
    projectAllocations: new ProjectAllocationController(),
    testData: new TestDataController(),
  };
}

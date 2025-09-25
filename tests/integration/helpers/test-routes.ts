import { Router } from 'express';
import { Knex } from 'knex';
import { ProjectPhaseDependenciesController } from '../../../src/server/api/controllers/ProjectPhaseDependenciesController';
import { ProjectsController } from '../../../src/server/api/controllers/ProjectsController';
import { PeopleController } from '../../../src/server/api/controllers/PeopleController';
import { AssignmentsController } from '../../../src/server/api/controllers/AssignmentsController';

/**
 * Factory function to create project phase dependencies routes with injected database
 * This allows integration tests to use the test database instead of production database
 */
export function createProjectPhaseDependenciesRouter(db: Knex): Router {
  const router = Router();
  const controller = new ProjectPhaseDependenciesController(db);

  // Get all dependencies (with optional project filter)
  router.get('/', (req, res) => ProjectPhaseDependenciesController.getAll(req, res));

  // Get a specific dependency by ID
  router.get('/:id', (req, res) => ProjectPhaseDependenciesController.getById(req, res));

  // Create a new dependency
  router.post('/', (req, res) => ProjectPhaseDependenciesController.create(req, res));

  // Update a dependency
  router.put('/:id', (req, res) => ProjectPhaseDependenciesController.update(req, res));

  // Delete a dependency
  router.delete('/:id', (req, res) => ProjectPhaseDependenciesController.delete(req, res));

  return router;
}

/**
 * Factory function to create projects routes with injected database
 */
export function createProjectsRouter(db: Knex): Router {
  const router = Router();
  const controller = new ProjectsController(db);

  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}

/**
 * Factory function to create people routes with injected database
 */
export function createPeopleRouter(db: Knex): Router {
  const router = Router();
  const controller = new PeopleController(db);

  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}

/**
 * Factory function to create assignments routes with injected database
 */
export function createAssignmentsRouter(db: Knex): Router {
  const router = Router();
  const controller = new AssignmentsController(db);

  router.get('/', (req, res) => controller.getAll(req, res));
  router.get('/:id', (req, res) => controller.getById(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.put('/:id', (req, res) => controller.update(req, res));
  router.delete('/:id', (req, res) => controller.delete(req, res));

  return router;
}
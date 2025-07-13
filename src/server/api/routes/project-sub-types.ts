import { Router } from 'express';
import {
  getProjectSubTypes,
  getProjectSubType,
  createProjectSubType,
  updateProjectSubType,
  deleteProjectSubType
} from '../controllers/ProjectSubTypesController.js';

const router = Router();

// GET /api/project-sub-types - Get all project sub-types (optionally filtered by project_type_id)
router.get('/', getProjectSubTypes);

// GET /api/project-sub-types/:id - Get a specific project sub-type
router.get('/:id', getProjectSubType);

// POST /api/project-sub-types - Create a new project sub-type
router.post('/', createProjectSubType);

// PUT /api/project-sub-types/:id - Update a project sub-type
router.put('/:id', updateProjectSubType);

// DELETE /api/project-sub-types/:id - Delete a project sub-type
router.delete('/:id', deleteProjectSubType);

export default router;
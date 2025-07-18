import { Router } from 'express';
import { PersonRolesController } from '../controllers/PersonRolesController.js';

const router = Router();
const personRolesController = new PersonRolesController();

// Get expertise level definitions
router.get('/expertise-levels', (req, res) => personRolesController.getExpertiseLevels(req, res));

// Person role management routes
router.get('/people/:personId/roles', (req, res) => personRolesController.getPersonRoles(req, res));
router.post('/people/:personId/roles', (req, res) => personRolesController.addPersonRole(req, res));
router.put('/people/:personId/roles/:roleId', (req, res) => personRolesController.updatePersonRole(req, res));
router.delete('/people/:personId/roles/:roleId', (req, res) => personRolesController.removePersonRole(req, res));

export default router;
import { Router } from 'express';
import { GitHubConnectionController } from '../controllers/GitHubConnectionController.js';
import { validateOAuthState } from '../../middleware/github-oauth-state.js';
import { requireSystemAdmin } from '../../middleware/permissions.js';

const router = Router();
const controller = new GitHubConnectionController();

// OAuth endpoints
router.post('/oauth/authorize', controller.initiateOAuth);
router.get('/oauth/callback', validateOAuthState, controller.handleOAuthCallback);

// PAT connection endpoint
router.post('/pat', controller.connectWithPAT);

// Connection CRUD operations
router.get('/', controller.listConnections);
router.get('/:id', controller.getConnection);
router.patch('/:id', controller.updateConnection);
router.delete('/:id', controller.deleteConnection);

// Association management
router.get('/:id/associations', controller.getAssociations);
router.post('/:id/associations', requireSystemAdmin(), controller.createAssociation);
router.delete('/:id/associations/:person_id', requireSystemAdmin(), controller.deleteAssociation);

export default router;

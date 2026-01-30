import { Router, Request, Response, NextFunction } from 'express';
import { getGitHubConnectionController } from '../controllers/GitHubConnectionController.js';
import { validateOAuthState } from '../../middleware/github-oauth-state.js';
import { requireSystemAdmin } from '../../middleware/permissions.js';

const router = Router();

// Wrapper to lazily get controller on first request
// This allows dotenv to load environment variables before the controller is instantiated
const lazy = (
  method: keyof ReturnType<typeof getGitHubConnectionController>
) => (req: Request, res: Response, next: NextFunction) => {
  const controller = getGitHubConnectionController();
  const handler = controller[method] as (req: Request, res: Response, next: NextFunction) => void;
  return handler.call(controller, req, res, next);
};

// OAuth endpoints
router.post('/oauth/authorize', lazy('initiateOAuth'));
router.get('/oauth/callback', validateOAuthState, lazy('handleOAuthCallback'));

// PAT connection endpoint
router.post('/pat', lazy('connectWithPAT'));

// Connection CRUD operations
router.get('/', lazy('listConnections'));
router.get('/:id', lazy('getConnection'));
router.patch('/:id', lazy('updateConnection'));
router.delete('/:id', lazy('deleteConnection'));

// Association management
router.get('/:id/associations', lazy('getAssociations'));
router.post('/:id/associations', requireSystemAdmin(), lazy('createAssociation'));
router.delete('/:id/associations/:person_id', requireSystemAdmin(), lazy('deleteAssociation'));

export default router;

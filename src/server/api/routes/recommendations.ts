import express from 'express';
import { RecommendationsController } from '../controllers/RecommendationsController.js';

const router = express.Router();
const recommendationsController = new RecommendationsController();

// GET /api/recommendations - Get assignment recommendations
router.get('/', (req, res) => recommendationsController.getRecommendations(req, res));

// POST /api/recommendations/:recommendationId/execute - Execute a recommendation
router.post('/:recommendationId/execute', (req, res) => recommendationsController.executeRecommendation(req, res));

export default router;
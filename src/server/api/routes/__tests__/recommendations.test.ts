import request from 'supertest';
import express from 'express';

// Mock the database module to prevent heavy initialization during import
jest.mock('../../../database/index.js', () => ({
  db: jest.fn(),
  getDb: jest.fn(),
  getAuditedDb: jest.fn(),
  auditedDb: jest.fn(),
  initializeDatabase: jest.fn(),
  testConnection: jest.fn(),
  reinitializeDb: jest.fn()
}));

// Mock the RecommendationsController
jest.mock('../../controllers/RecommendationsController.js', () => {
  return {
    RecommendationsController: jest.fn().mockImplementation(() => ({
      getRecommendations: jest.fn((req, res) =>
        res.status(200).json([{ id: 1, type: 'assignment' }])
      ),
      executeRecommendation: jest.fn((req, res) =>
        res.status(200).json({ success: true, id: req.params.recommendationId })
      )
    }))
  };
});

// Import router after mocks are set up
import recommendationsRouter from '../recommendations.js';

describe('Recommendations Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/recommendations', recommendationsRouter);
  });

  it('should have GET / route', async () => {
    const response = await request(app).get('/api/recommendations');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should have POST /:recommendationId/execute route', async () => {
    const response = await request(app)
      .post('/api/recommendations/rec-123/execute')
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('rec-123');
  });
});

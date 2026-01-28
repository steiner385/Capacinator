import request from 'supertest';
import express from 'express';
import projectTypesRouter from '../project-types.js';

// Mock the ProjectTypesController
jest.mock('../../controllers/ProjectTypesController', () => {
  return {
    ProjectTypesController: jest.fn().mockImplementation(() => ({
      getAll: jest.fn((req, res) => res.status(200).json([{ id: 1, name: 'Type 1' }])),
      getById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
      create: jest.fn((req, res) => res.status(201).json({ id: 1, ...req.body })),
      update: jest.fn((req, res) => res.status(200).json({ id: req.params.id, ...req.body })),
      delete: jest.fn((req, res) => res.status(204).send())
    }))
  };
});

describe('Project Types Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/project-types', projectTypesRouter);
  });

  it('should have GET / route', async () => {
    const response = await request(app).get('/api/project-types');
    expect(response.status).toBe(200);
  });

  it('should have GET /:id route', async () => {
    const response = await request(app).get('/api/project-types/123');
    expect(response.status).toBe(200);
  });

  it('should have POST / route', async () => {
    const response = await request(app)
      .post('/api/project-types')
      .send({ name: 'New Type' });
    expect(response.status).toBe(201);
  });

  it('should have PUT /:id route', async () => {
    const response = await request(app)
      .put('/api/project-types/123')
      .send({ name: 'Updated Type' });
    expect(response.status).toBe(200);
  });

  it('should have DELETE /:id route', async () => {
    const response = await request(app).delete('/api/project-types/123');
    expect(response.status).toBe(204);
  });
});

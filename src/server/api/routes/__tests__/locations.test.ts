import request from 'supertest';
import express from 'express';
import locationsRouter from '../locations.js';

// Mock the SimpleController
jest.mock('../../controllers/SimpleController', () => {
  return {
    SimpleController: jest.fn().mockImplementation((tableName) => ({
      getAll: jest.fn((req, res) => res.status(200).json([{ id: 1, name: 'Location 1' }])),
      getById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
      create: jest.fn((req, res) => res.status(201).json({ id: 1, ...req.body })),
      update: jest.fn((req, res) => res.status(200).json({ id: req.params.id, ...req.body })),
      delete: jest.fn((req, res) => res.status(204).send())
    }))
  };
});

describe('Locations Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/locations', locationsRouter);
  });

  it('should have GET / route', async () => {
    const response = await request(app).get('/api/locations');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should have GET /:id route', async () => {
    const response = await request(app).get('/api/locations/123');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('123');
  });

  it('should have POST / route', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ name: 'New Location' });
    expect(response.status).toBe(201);
  });

  it('should have PUT /:id route', async () => {
    const response = await request(app)
      .put('/api/locations/123')
      .send({ name: 'Updated Location' });
    expect(response.status).toBe(200);
  });

  it('should have DELETE /:id route', async () => {
    const response = await request(app).delete('/api/locations/123');
    expect(response.status).toBe(204);
  });
});

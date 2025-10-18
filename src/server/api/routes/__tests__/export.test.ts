import request from 'supertest';
import express from 'express';
import exportRouter from '../export';

// Mock the ExportController
jest.mock('../../controllers/ExportController', () => {
  return {
    ExportController: jest.fn().mockImplementation(() => ({
      exportReportAsExcel: jest.fn((req, res) => res.status(200).json({ success: true })),
      exportReportAsCSV: jest.fn((req, res) => res.status(200).json({ success: true })),
      exportReportAsPDF: jest.fn((req, res) => res.status(200).json({ success: true }))
    }))
  };
});

describe('Export Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/export', exportRouter);
  });

  it('should have POST /reports/excel route', async () => {
    const response = await request(app)
      .post('/api/export/reports/excel')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should have POST /reports/csv route', async () => {
    const response = await request(app)
      .post('/api/export/reports/csv')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should have POST /reports/pdf route', async () => {
    const response = await request(app)
      .post('/api/export/reports/pdf')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return 404 for undefined routes', async () => {
    const response = await request(app)
      .post('/api/export/reports/unknown')
      .send({});

    expect(response.status).toBe(404);
  });
});

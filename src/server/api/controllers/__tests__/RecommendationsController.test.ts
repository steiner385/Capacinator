import { RecommendationsController } from '../RecommendationsController.js';
import type { Request, Response } from 'express';
import { logger } from '../../../services/logging/config.js';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RecommendationsController();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getRecommendations', () => {
    it('returns recommendation structure successfully', async () => {
      await controller.getRecommendations(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        underutilized: [],
        overutilized: [],
        skillMatches: []
      });
    });

    it('returns empty arrays for each recommendation type', async () => {
      await controller.getRecommendations(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];

      expect(response).toHaveProperty('underutilized');
      expect(response).toHaveProperty('overutilized');
      expect(response).toHaveProperty('skillMatches');
      expect(Array.isArray(response.underutilized)).toBe(true);
      expect(Array.isArray(response.overutilized)).toBe(true);
      expect(Array.isArray(response.skillMatches)).toBe(true);
    });

    it('handles errors gracefully', async () => {
      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation();

      // Mock res.json to track if error handler was called
      let errorHandlerCalled = false;

      // Make the first call to res.json throw, which will trigger the catch block
      (mockRes.json as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Test error');
        })
        .mockImplementation(() => {
          errorHandlerCalled = true;
          return mockRes;
        });

      await controller.getRecommendations(mockReq as Request, mockRes as Response);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error generating recommendations',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(errorHandlerCalled).toBe(true);

      loggerErrorSpy.mockRestore();
    });
  });
});

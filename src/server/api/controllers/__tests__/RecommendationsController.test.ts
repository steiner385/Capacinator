import { RecommendationsController } from '../RecommendationsController.js';
import type { Request, Response } from 'express';

describe('RecommendationsController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

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
      await RecommendationsController.getRecommendations(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        underutilized: [],
        overutilized: [],
        skillMatches: []
      });
    });

    it('returns empty arrays for each recommendation type', async () => {
      await RecommendationsController.getRecommendations(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as jest.Mock).mock.calls[0][0];

      expect(response).toHaveProperty('underutilized');
      expect(response).toHaveProperty('overutilized');
      expect(response).toHaveProperty('skillMatches');
      expect(Array.isArray(response.underutilized)).toBe(true);
      expect(Array.isArray(response.overutilized)).toBe(true);
      expect(Array.isArray(response.skillMatches)).toBe(true);
    });

    it('handles errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock res.json to track if error handler was called
      let errorHandlerCalled = false;

      // Make the first call to res.json throw, which will trigger the catch block
      (mockRes.json as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Test error');
        })
        .mockImplementation((...args) => {
          errorHandlerCalled = true;
          return mockRes;
        });

      await RecommendationsController.getRecommendations(mockReq as Request, mockRes as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error generating recommendations:',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(errorHandlerCalled).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });
});

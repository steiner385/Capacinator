import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { SettingsController } from '../../../../src/server/api/controllers/SettingsController';
import { Request, Response } from 'express';

// Mock database
const mockDb = {
  select: jest.fn(),
  where: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  onConflict: jest.fn(),
  merge: jest.fn(),
  fn: {
    now: jest.fn()
  }
};

// Create a mock that chains properly
const createMockQuery = () => {
  const query = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn() as jest.Mock,
    insert: jest.fn().mockReturnThis(),
    onConflict: jest.fn().mockReturnThis(),
    merge: jest.fn().mockResolvedValue(undefined),
  };
  return query;
};

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup controller with mocked database
    controller = new SettingsController();
    const mockDbFn = jest.fn(() => createMockQuery()) as any;
    mockDbFn.fn = { now: jest.fn().mockReturnValue(new Date()) };
    (controller as any).db = mockDbFn;
    
    // Mock executeQuery to directly call the callback
    (controller as any).executeQuery = jest.fn(async (callback: any, res: any) => {
      try {
        return await callback();
      } catch (error) {
        console.error('executeQuery error:', error);
        if ((controller as any).handleError) {
          (controller as any).handleError(error, res);
        } else {
          // Default error handling
          res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
        return undefined;
      }
    });

    // Setup request and response mocks
    mockReq = {
      body: {},
      params: {}
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    } as any;
  });

  describe('getSystemSettings', () => {
    it('should return system settings when they exist', async () => {
      const mockSettings = {
        settings: JSON.stringify({
          defaultWorkHoursPerWeek: 40,
          defaultVacationDaysPerYear: 15,
          fiscalYearStartMonth: 1,
          allowOverAllocation: true,
          maxAllocationPercentage: 120,
          requireApprovalForOverrides: true,
          autoArchiveCompletedProjects: false,
          archiveAfterDays: 90,
          enableEmailNotifications: true
        })
      };

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(mockSettings);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: JSON.parse(mockSettings.settings)
      });
    });

    it('should return 404 when system settings do not exist', async () => {
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(null);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'System settings not found'
      });
    });
  });

  describe('saveSystemSettings', () => {
    it('should save valid system settings', async () => {
      const validSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: true,
        maxAllocationPercentage: 120,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: false,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = validSettings;

      await controller.saveSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'System settings saved successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteSettings = {
        defaultWorkHoursPerWeek: 40
        // Missing other required fields
      };

      mockReq.body = incompleteSettings;

      await controller.saveSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required field: defaultVacationDaysPerYear'
      });
    });

    it('should return 400 for invalid work hours', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 100, // Invalid - too high
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: true,
        maxAllocationPercentage: 120,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: false,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'defaultWorkHoursPerWeek must be between 1 and 80'
      });
    });

    it('should return 400 for invalid fiscal year month', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 13, // Invalid - too high
        allowOverAllocation: true,
        maxAllocationPercentage: 120,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: false,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'fiscalYearStartMonth must be between 1 and 12'
      });
    });

    it('should return 400 for invalid max allocation percentage', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: true,
        maxAllocationPercentage: 50, // Invalid - too low
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: false,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'maxAllocationPercentage must be between 100 and 200'
      });
    });
  });

  describe('getImportSettings', () => {
    it('should return import settings when they exist', async () => {
      const mockSettings = {
        settings: JSON.stringify({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        })
      };

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(mockSettings);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: JSON.parse(mockSettings.settings)
      });
    });

    it('should return 404 when import settings do not exist', async () => {
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(null);
      (controller as any).db = jest.fn(() => mockQuery);

      await controller.getImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Import settings not found'
      });
    });
  });

  describe('saveImportSettings', () => {
    it('should save valid import settings', async () => {
      const validSettings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      };

      mockReq.body = validSettings;

      await controller.saveImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Import settings saved successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteSettings = {
        clearExistingData: false
        // Missing other required fields
      };

      mockReq.body = incompleteSettings;

      await controller.saveImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required field: validateDuplicates'
      });
    });

    it('should return 400 for invalid project priority', async () => {
      const invalidSettings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 5, // Invalid - too high
        dateFormat: 'MM/DD/YYYY'
      };

      mockReq.body = invalidSettings;

      await controller.saveImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'defaultProjectPriority must be between 1 and 3'
      });
    });

    it('should return 400 for invalid date format', async () => {
      const invalidSettings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'INVALID_FORMAT'
      };

      mockReq.body = invalidSettings;

      await controller.saveImportSettings(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'dateFormat must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD'
      });
    });
  });
});
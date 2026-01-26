import { SettingsController } from '../SettingsController.js';
import { createMockDb, flushPromises } from './helpers/mockDb.js';

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SettingsController();

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

    mockDb = createMockDb();
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  describe('getSystemSettings', () => {
    it('should return system settings when found', async () => {
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({
          defaultWorkHoursPerWeek: 40,
          defaultVacationDaysPerYear: 15,
          fiscalYearStartMonth: 1,
          allowOverAllocation: false,
          maxAllocationPercentage: 150,
          requireApprovalForOverrides: true,
          autoArchiveCompletedProjects: true,
          archiveAfterDays: 90,
          enableEmailNotifications: true
        })
      };

      mockDb._setFirstResult(mockSettings);

      await controller.getSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: JSON.parse(mockSettings.settings)
      });
    });

    it('should return 404 when settings not found', async () => {
      mockDb._setFirstResult(null);

      await controller.getSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'System settings not found'
      });
    });

    it('should return default settings when settings table does not exist', async () => {
      // Simulate SQLite error for missing table
      const sqliteError: any = new Error('no such table: settings');
      sqliteError.code = 'SQLITE_ERROR';

      mockDb.first = jest.fn().mockRejectedValue(sqliteError);

      await controller.getSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          audit_enabled: true,
          auto_backup: true,
          max_file_size: 52428800
        }
      });
    });

    it('should throw error for unexpected errors', async () => {
      // Simulate an unexpected error
      const unexpectedError = new Error('Database connection failed');
      mockDb.first = jest.fn().mockRejectedValue(unexpectedError);

      await controller.getSystemSettings(mockReq, mockRes);
      await flushPromises();

      // executeQuery should handle the error and return 500
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  describe('saveSystemSettings', () => {
    it('should save valid system settings', async () => {
      const validSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: false,
        maxAllocationPercentage: 150,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: true,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = validSettings;

      // Mock the onConflict chain
      const mockMerge = jest.fn().mockResolvedValue({});
      const mockOnConflict = jest.fn().mockReturnValue({ merge: mockMerge });
      mockDb.insert = jest.fn().mockReturnValue({
        onConflict: mockOnConflict,
        then: (resolve: any) => Promise.resolve({}).then(resolve)
      });
      mockDb.fn = { now: jest.fn() };

      await controller.saveSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'System settings saved successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        defaultWorkHoursPerWeek: 40,
        // Missing other required fields
      };

      await controller.saveSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Missing required field')
        })
      );
    });

    it('should return 400 for invalid defaultWorkHoursPerWeek', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 100, // Too high
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: false,
        maxAllocationPercentage: 150,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: true,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'defaultWorkHoursPerWeek must be between 1 and 80'
      });
    });

    it('should return 400 for invalid fiscalYearStartMonth', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 13, // Invalid month
        allowOverAllocation: false,
        maxAllocationPercentage: 150,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: true,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'fiscalYearStartMonth must be between 1 and 12'
      });
    });

    it('should return 400 for invalid maxAllocationPercentage', async () => {
      const invalidSettings = {
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: false,
        maxAllocationPercentage: 250, // Too high
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: true,
        archiveAfterDays: 90,
        enableEmailNotifications: true
      };

      mockReq.body = invalidSettings;

      await controller.saveSystemSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'maxAllocationPercentage must be between 100 and 200'
      });
    });
  });

  describe('getImportSettings', () => {
    it('should return import settings when found', async () => {
      const mockSettings = {
        category: 'import',
        settings: JSON.stringify({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: true,
          autoCreateMissingLocations: true,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        })
      };

      mockDb._setFirstResult(mockSettings);

      await controller.getImportSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: JSON.parse(mockSettings.settings)
      });
    });

    it('should return 404 when import settings not found', async () => {
      mockDb._setFirstResult(null);

      await controller.getImportSettings(mockReq, mockRes);
      await flushPromises();

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
        autoCreateMissingRoles: true,
        autoCreateMissingLocations: true,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      };

      mockReq.body = validSettings;

      const mockMerge = jest.fn().mockResolvedValue({});
      const mockOnConflict = jest.fn().mockReturnValue({ merge: mockMerge });
      mockDb.insert = jest.fn().mockReturnValue({
        onConflict: mockOnConflict,
        then: (resolve: any) => Promise.resolve({}).then(resolve)
      });
      mockDb.fn = { now: jest.fn() };

      await controller.saveImportSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Import settings saved successfully'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        clearExistingData: false,
        // Missing other required fields
      };

      await controller.saveImportSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Missing required field')
        })
      );
    });

    it('should return 400 for invalid defaultProjectPriority', async () => {
      const invalidSettings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: true,
        autoCreateMissingLocations: true,
        defaultProjectPriority: 5, // Too high
        dateFormat: 'MM/DD/YYYY'
      };

      mockReq.body = invalidSettings;

      await controller.saveImportSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'defaultProjectPriority must be between 1 and 3'
      });
    });

    it('should return 400 for invalid dateFormat', async () => {
      const invalidSettings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: true,
        autoCreateMissingLocations: true,
        defaultProjectPriority: 2,
        dateFormat: 'INVALID_FORMAT'
      };

      mockReq.body = invalidSettings;

      await controller.saveImportSettings(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'dateFormat must be one of: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD'
      });
    });
  });
});

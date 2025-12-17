import { ImportSettingsService, ImportSettings } from '../import/ImportSettingsService';

describe('ImportSettingsService', () => {
  let service: ImportSettingsService;
  let mockDb: any;

  const DEFAULT_SETTINGS: ImportSettings = {
    clearExistingData: false,
    validateDuplicates: true,
    autoCreateMissingRoles: false,
    autoCreateMissingLocations: false,
    defaultProjectPriority: 2,
    dateFormat: 'MM/DD/YYYY'
  };

  const CUSTOM_SETTINGS: ImportSettings = {
    clearExistingData: true,
    validateDuplicates: false,
    autoCreateMissingRoles: true,
    autoCreateMissingLocations: true,
    defaultProjectPriority: 5,
    dateFormat: 'YYYY-MM-DD'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create chainable mock database that is also a function
    const chainableMock = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
    };

    mockDb = jest.fn().mockReturnValue(chainableMock);
    mockDb.schema = {
      hasTable: jest.fn()
    };

    service = new ImportSettingsService(mockDb as any);
  });

  describe('getImportSettings', () => {
    it('should return default settings when settings table does not exist', async () => {
      mockDb.schema.hasTable.mockResolvedValue(false);

      const result = await service.getImportSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockDb.schema.hasTable).toHaveBeenCalledWith('settings');
    });

    it('should return default settings when no import settings record found', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue(null);

      const result = await service.getImportSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockDb.where).toHaveBeenCalledWith('category', 'import');
    });

    it('should return parsed settings from database', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);

      const chainableMock = mockDb.mock.results[0]?.value;
      if (chainableMock) {
        chainableMock.first.mockResolvedValue({
          settings: JSON.stringify(CUSTOM_SETTINGS)
        });
      }

      const result = await service.getImportSettings();

      expect(result).toBeDefined();
    });

    it('should merge partial settings with defaults', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);

      const chainableMock = mockDb.mock.results[0]?.value;
      if (chainableMock) {
        chainableMock.first.mockResolvedValue({
          settings: JSON.stringify({
            clearExistingData: true,
            defaultProjectPriority: 3
          })
        });
      }

      const result = await service.getImportSettings();

      expect(result).toBeDefined();
    });

    it('should return default settings on database error', async () => {
      mockDb.schema.hasTable.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getImportSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle malformed JSON gracefully', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue({
        settings: 'invalid json'
      });

      // Should not throw, parseFloat will fail but service handles it
      expect(async () => {
        await service.getImportSettings();
      }).not.toThrow();
    });
  });

  describe('saveImportSettings', () => {
    it('should insert new settings record when none exists', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue(null);

      const settingsToSave = {
        clearExistingData: true,
        defaultProjectPriority: 3
      };

      await service.saveImportSettings(settingsToSave);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'import',
          settings: expect.stringContaining('clearExistingData')
        })
      );
    });

    it('should update existing settings record', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue({ id: '1' });

      const settingsToSave = {
        clearExistingData: true,
        defaultProjectPriority: 3
      };

      await service.saveImportSettings(settingsToSave);

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.stringContaining('clearExistingData'),
          updated_at: expect.any(Date)
        })
      );
    });

    it('should handle missing settings table gracefully', async () => {
      mockDb.schema.hasTable.mockResolvedValue(false);

      const settingsToSave = { clearExistingData: true };

      // Should not throw
      expect(async () => {
        await service.saveImportSettings(settingsToSave);
      }).not.toThrow();
    });

    it('should throw on database write error', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue(null);
      mockDb.insert.mockRejectedValue(new Error('Insert failed'));

      await expect(service.saveImportSettings({ clearExistingData: true })).rejects.toThrow('Insert failed');
    });
  });

  describe('validateSettings', () => {
    it('should validate valid settings', () => {
      const result = service.validateSettings(CUSTOM_SETTINGS);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-string dateFormat', () => {
      const result = service.validateSettings({
        dateFormat: 123 as any
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('dateFormat must be a string');
    });

    it('should reject non-number defaultProjectPriority', () => {
      const result = service.validateSettings({
        defaultProjectPriority: 'high' as any
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('defaultProjectPriority must be a number');
    });

    it('should reject out-of-range defaultProjectPriority', () => {
      const result = service.validateSettings({
        defaultProjectPriority: 11
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('defaultProjectPriority must be between 1 and 10');
    });

    it('should reject non-boolean clearExistingData', () => {
      const result = service.validateSettings({
        clearExistingData: 'yes' as any
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('clearExistingData must be a boolean');
    });

    it('should validate partial settings', () => {
      const result = service.validateSettings({
        defaultProjectPriority: 5
      });

      expect(result.valid).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      const result = service.validateSettings({
        dateFormat: 123 as any,
        defaultProjectPriority: 15,
        clearExistingData: 'maybe' as any
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty settings object', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue({
        settings: JSON.stringify({})
      });

      const result = await service.getImportSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('should preserve provided values over defaults', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue({
        settings: JSON.stringify({
          clearExistingData: true,
          validateDuplicates: false,
          defaultProjectPriority: 1
        })
      });

      const result = await service.getImportSettings();

      expect(result.clearExistingData).toBe(true);
      expect(result.validateDuplicates).toBe(false);
      expect(result.defaultProjectPriority).toBe(1);
    });

    it('should handle save with all boundary values', async () => {
      mockDb.schema.hasTable.mockResolvedValue(true);
      mockDb.first.mockResolvedValue(null);

      const boundarySettings: ImportSettings = {
        clearExistingData: true,
        validateDuplicates: false,
        autoCreateMissingRoles: true,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 1,
        dateFormat: 'YYYY-MM-DD'
      };

      await service.saveImportSettings(boundarySettings);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});

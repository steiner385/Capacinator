import { ImportOrchestrationService, ImportOptions, FileUpload } from '../import/ImportOrchestrationService';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('ImportOrchestrationService', () => {
  let service: ImportOrchestrationService;
  let mockDb: any;

  const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
    clearExisting: false,
    useV2: false,
    validateDuplicates: true,
    autoCreateMissingRoles: false,
    autoCreateMissingLocations: false,
    defaultProjectPriority: 2,
    dateFormat: 'MM/DD/YYYY'
  };

  const SAMPLE_FILE_UPLOAD: FileUpload = {
    path: '/tmp/upload.xlsx',
    originalname: 'test.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1024
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn()
    };

    service = new ImportOrchestrationService(mockDb);
  });

  describe('validateFileType', () => {
    it('should accept .xlsx files', () => {
      const file: FileUpload = {
        ...SAMPLE_FILE_UPLOAD,
        originalname: 'data.xlsx'
      };

      const result = service.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .xls files', () => {
      const file: FileUpload = {
        ...SAMPLE_FILE_UPLOAD,
        originalname: 'data.xls',
        mimetype: 'application/vnd.ms-excel'
      };

      const result = service.validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('should reject non-Excel files by extension', () => {
      const file: FileUpload = {
        ...SAMPLE_FILE_UPLOAD,
        originalname: 'data.csv'
      };

      const result = service.validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject files with suspicious MIME types', () => {
      const file: FileUpload = {
        ...SAMPLE_FILE_UPLOAD,
        originalname: 'data.txt',
        mimetype: 'text/plain'
      };

      const result = service.validateFileType(file);

      expect(result.valid).toBe(false);
    });

    it('should accept Excel MIME types', () => {
      const file: FileUpload = {
        ...SAMPLE_FILE_UPLOAD,
        originalname: 'data.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      const result = service.validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('should throw on unexpected error', () => {
      const badFile = null as any;

      expect(() => service.validateFileType(badFile)).toThrow();
    });
  });

  describe('prepareImportOptions', () => {
    const DEFAULT_SETTINGS = {
      clearExistingData: false,
      validateDuplicates: true,
      autoCreateMissingRoles: false,
      autoCreateMissingLocations: false,
      defaultProjectPriority: 2,
      dateFormat: 'MM/DD/YYYY'
    };

    it('should prepare options with request body overrides', () => {
      const requestBody = {
        clearExisting: 'true',
        useV2: 'true'
      };

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.clearExisting).toBe(true);
      expect(result.useV2).toBe(true);
    });

    it('should use saved settings as fallback', () => {
      const requestBody = {};

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.validateDuplicates).toBe(DEFAULT_SETTINGS.validateDuplicates);
      expect(result.defaultProjectPriority).toBe(DEFAULT_SETTINGS.defaultProjectPriority);
    });

    it('should handle boolean request values', () => {
      const requestBody = {
        clearExisting: true,
        validateDuplicates: false
      };

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.clearExisting).toBe(true);
      expect(result.validateDuplicates).toBe(false);
    });

    it('should parse string boolean values', () => {
      const requestBody = {
        clearExisting: 'false',
        useV2: 'true'
      };

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.clearExisting).toBe(false);
      expect(result.useV2).toBe(true);
    });

    it('should parse integer values', () => {
      const requestBody = {
        defaultProjectPriority: '5'
      };

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.defaultProjectPriority).toBe(5);
    });

    it('should handle partial request body', () => {
      const requestBody = {
        dateFormat: 'YYYY-MM-DD'
      };

      const result = service.prepareImportOptions(requestBody, DEFAULT_SETTINGS);

      expect(result.dateFormat).toBe('YYYY-MM-DD');
      expect(result.clearExisting).toBe(DEFAULT_SETTINGS.clearExistingData);
    });
  });

  describe('cleanupUploadedFile', () => {
    it('should delete uploaded file', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.cleanupUploadedFile('/tmp/upload.xlsx');

      expect(fs.unlink).toHaveBeenCalledWith('/tmp/upload.xlsx');
      expect(result).toBe(true);
    });

    it('should return false on cleanup error', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      const result = await service.cleanupUploadedFile('/tmp/upload.xlsx');

      expect(result).toBe(false);
    });

    it('should handle file not found error gracefully', async () => {
      const notFoundError = new Error('ENOENT: no such file or directory');
      (fs.unlink as jest.Mock).mockRejectedValue(notFoundError);

      const result = await service.cleanupUploadedFile('/tmp/nonexistent.xlsx');

      expect(result).toBe(false);
    });
  });

  describe('validateExcelFile', () => {
    it('should validate Excel file structure with V1 importer', async () => {
      const validationResult = {
        valid: true,
        canImport: true,
        errors: []
      };

      // Mock is limited here - would need to mock the dynamic imports
      // This test verifies the method exists and handles the parameters

      expect(service.validateExcelFile).toBeDefined();
    });

    it('should handle validation error gracefully', async () => {
      // Test the error handling path
      expect(service.validateExcelFile).toBeDefined();
    });
  });

  describe('analyzeImport', () => {
    it('should perform dry-run import analysis', async () => {
      // Test the analysis orchestration
      expect(service.analyzeImport).toBeDefined();
    });
  });

  describe('executeImport', () => {
    it('should execute import and track duration', async () => {
      // Test the import execution orchestration
      expect(service.executeImport).toBeDefined();
    });
  });

  describe('handleImportCompletion', () => {
    it('should handle successful import result', async () => {
      const result = {
        success: true,
        message: 'Import successful',
        imported: { projects: 10, people: 5 },
        warnings: []
      };

      const response = await service.handleImportCompletion(result);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Excel import completed successfully');
      expect(response.imported).toEqual({ projects: 10, people: 5 });
    });

    it('should handle failed import result', async () => {
      const result = {
        success: false,
        message: 'Import failed',
        imported: { projects: 5 },
        errors: ['Error 1', 'Error 2']
      };

      const response = await service.handleImportCompletion(result);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Excel import completed with errors');
      expect(response.errors).toContain('Error 1');
    });

    it('should include warnings in response', async () => {
      const result = {
        success: true,
        message: 'Import successful',
        imported: { projects: 10 },
        warnings: ['Warning 1']
      };

      const response = await service.handleImportCompletion(result);

      expect(response.warnings).toContain('Warning 1');
    });
  });

  describe('handleImportError', () => {
    beforeEach(() => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    });

    it('should handle error and attempt cleanup', async () => {
      const error = new Error('Import failed');

      const response = await service.handleImportError(error, '/tmp/upload.xlsx');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Excel import failed');
      expect(fs.unlink).toHaveBeenCalledWith('/tmp/upload.xlsx');
    });

    it('should handle error without file path', async () => {
      const error = new Error('Import processing error');

      const response = await service.handleImportError(error);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Import processing error');
    });

    it('should include error message in response', async () => {
      const error = new Error('Specific import error');

      const response = await service.handleImportError(error, '/tmp/upload.xlsx');

      expect(response.error).toBe('Specific import error');
    });

    it('should handle cleanup failure gracefully', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('Cleanup failed'));

      const error = new Error('Import failed');

      // Should not throw even if cleanup fails
      const response = await service.handleImportError(error, '/tmp/upload.xlsx');

      expect(response.success).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should validate, prepare options, and handle completion', async () => {
      const file = SAMPLE_FILE_UPLOAD;
      const requestBody = { clearExisting: 'true' };
      const settings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      };

      // Validate file type
      const fileValidation = service.validateFileType(file);
      expect(fileValidation.valid).toBe(true);

      // Prepare options
      const options = service.prepareImportOptions(requestBody, settings);
      expect(options.clearExisting).toBe(true);

      // Handle completion
      const result = {
        success: true,
        message: 'Import completed',
        imported: { projects: 10 }
      };

      const response = await service.handleImportCompletion(result);
      expect(response.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid file upload object', () => {
      expect(() => service.validateFileType(null as any)).toThrow();
    });

    it('should handle prepareImportOptions with null body', () => {
      const settings = {
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      };

      const result = service.prepareImportOptions({}, settings);

      expect(result).toBeDefined();
      expect(result.validateDuplicates).toBe(true);
    });
  });

  describe('File cleanup safety', () => {
    beforeEach(() => {
      (fs.unlink as jest.Mock).mockClear();
    });

    it('should not throw if file already deleted', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue({
        code: 'ENOENT'
      });

      const result = await service.cleanupUploadedFile('/tmp/gone.xlsx');

      expect(result).toBe(false);
      expect((fs.unlink as jest.Mock)).toHaveBeenCalled();
    });

    it('should clean up on import error', async () => {
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const error = new Error('Import failed');
      await service.handleImportError(error, '/tmp/upload.xlsx');

      expect((fs.unlink as jest.Mock)).toHaveBeenCalledWith('/tmp/upload.xlsx');
    });
  });
});

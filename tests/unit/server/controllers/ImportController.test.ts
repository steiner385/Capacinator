import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ImportController } from '../../../../src/server/api/controllers/ImportController.js';
import { Request, Response } from 'express';
import fs from 'fs/promises';
import ExcelJS from 'exceljs';

jest.mock('../../../../src/server/database/index.js', () => {
  // Create mock functions using require('jest').fn() to avoid initialization issues
  const { jest } = require('@jest/globals');
  
  const mockFirst = jest.fn();
  const mockSelect = jest.fn().mockReturnThis();
  const mockWhere = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockReturning = jest.fn();
  const mockCount = jest.fn().mockReturnThis();
  const mockLeftJoin = jest.fn().mockReturnThis();
  const mockJoin = jest.fn().mockReturnThis();
  const mockOrderBy = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockOffset = jest.fn().mockReturnThis();

  // Create a mock query builder that can be chained
  const createMockQueryBuilder = () => ({
    select: mockSelect,
    where: mockWhere,
    first: mockFirst,
    insert: mockInsert,
    returning: mockReturning,
    count: mockCount,
    leftJoin: mockLeftJoin,
    join: mockJoin,
    orderBy: mockOrderBy,
    limit: mockLimit,
    offset: mockOffset,
  });

  // Mock database as a function that returns a query builder
  const mockDb = jest.fn((tableName?: string) => {
    if (tableName) {
      return createMockQueryBuilder();
    }
    return mockDb;
  });

  // Add database-level methods to the function
  Object.assign(mockDb, {
    select: mockSelect,
    where: mockWhere,
    first: mockFirst,
    insert: mockInsert,
    returning: mockReturning,
    raw: jest.fn(),
  });

  return {
    getAuditedDb: () => mockDb,
    db: mockDb,
    // Export mock functions for test configuration
    mockFirst,
    mockSelect,
  };
});

jest.mock('../../../../src/server/services/import/ExcelImporter.js');
jest.mock('../../../../src/server/services/import/ExcelImporterV2.js');

// Import the mocked database to access exported mock functions
const mockedDb = require('../../../../src/server/database/index.js');

describe.skip('ImportController', () => {
  let controller: ImportController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(() => {
    controller = new ImportController();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    sendMock = jest.fn();
    setHeaderMock = jest.fn();
    
    mockRes = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
      setHeader: setHeaderMock,
    };
    
    mockReq = {
      user: { name: 'Test User', email: 'test@example.com' },
      query: {},
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };

    jest.clearAllMocks();
    
    // Clear exposed mock functions
    if (mockedDb.mockFirst) mockedDb.mockFirst.mockClear();
    if (mockSelect) mockSelect.mockClear();
  });

  describe('exportScenarioData', () => {
    it('should export scenario data successfully', async () => {
      // Mock scenario data
      mockedDb.mockFirst.mockResolvedValue({
        id: 'scenario-1',
        name: 'Test Scenario',
        scenario_type: 'baseline',
        description: 'Test scenario for export'
      });

      mockSelect.mockResolvedValue([
        { id: '1', name: 'Project 1', project_type_name: 'Development' }
      ]);

      mockReq.query = {
        scenarioId: 'scenario-1',
        includeAssignments: 'true',
        includePhases: 'true'
      };

      await controller.exportScenarioData(mockReq as Request, mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=')
      );
      expect(sendMock).toHaveBeenCalled();
    });

    it('should use baseline scenario when no scenarioId provided', async () => {
      // Mock baseline scenario lookup
      mockDb.where.mockImplementation((field, value) => {
        if (field === 'scenario_type' && value === 'baseline') {
          return {
            first: () => Promise.resolve({
              id: 'baseline-1',
              name: 'Baseline',
              scenario_type: 'baseline'
            })
          };
        }
        return mockDb;
      });

      mockDb.first.mockResolvedValue({
        id: 'baseline-1',
        name: 'Baseline',
        scenario_type: 'baseline'
      });

      mockDb.select.mockResolvedValue([]);

      mockReq.query = {}; // No scenarioId

      await controller.exportScenarioData(mockReq as Request, mockRes as Response);

      expect(sendMock).toHaveBeenCalled();
    });

    it('should handle missing scenario error', async () => {
      mockDb.first.mockResolvedValue(null);

      mockReq.query = { scenarioId: 'non-existent' };

      await controller.exportScenarioData(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Scenario not found',
        message: 'The specified scenario does not exist'
      });
    });

    it('should handle export errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      mockReq.query = { scenarioId: 'test-scenario' };

      await controller.exportScenarioData(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed to export scenario data')
        })
      );
    });
  });

  describe('downloadTemplate', () => {
    it('should generate enhanced template with metadata', async () => {
      mockReq.query = {
        templateType: 'complete',
        includeAssignments: 'true',
        includePhases: 'true'
      };

      await controller.downloadTemplate(mockReq as Request, mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('capacinator_import_template_complete_')
      );
      expect(sendMock).toHaveBeenCalled();
    });

    it('should handle different template types', async () => {
      mockReq.query = { templateType: 'minimal' };

      await controller.downloadTemplate(mockReq as Request, mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('capacinator_import_template_minimal_')
      );
    });

    it('should use default options when not specified', async () => {
      mockReq.query = {};

      await controller.downloadTemplate(mockReq as Request, mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('capacinator_import_template_complete_')
      );
    });
  });

  describe('analyzeImport', () => {
    beforeEach(() => {
      mockReq.file = {
        path: '/tmp/test-file.xlsx',
        originalname: 'test.xlsx',
        size: 1024,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;
    });

    it('should analyze import file successfully', async () => {
      // Mock import settings
      mockDb.first.mockResolvedValue({
        value: JSON.stringify({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false
        })
      });

      // Mock ExcelImporter
      const mockAnalyzeImport = jest.fn().mockResolvedValue({
        summary: {
          totalChanges: 5,
          wouldCreate: { projects: 2, people: 3 },
          wouldUpdate: { projects: 0, people: 0 },
          wouldDelete: { projects: 0, people: 0 }
        },
        conflicts: [],
        warnings: [],
        errors: [],
        riskAssessment: { level: 'low', factors: [], recommendations: [] }
      });

      const { ExcelImporter } = require('../../../../src/server/services/import/ExcelImporter.js');
      ExcelImporter.mockImplementation(() => ({
        analyzeImport: mockAnalyzeImport
      }));

      await controller.analyzeImport(mockReq as Request, mockRes as Response);

      expect(mockAnalyzeImport).toHaveBeenCalledWith(
        '/tmp/test-file.xlsx',
        expect.objectContaining({
          dryRun: true
        })
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Import analysis completed successfully',
        analysis: expect.objectContaining({
          summary: expect.objectContaining({
            totalChanges: 5
          })
        }),
        options: expect.objectContaining({
          dryRun: true
        }),
        fileInfo: expect.objectContaining({
          name: 'test.xlsx',
          size: 1024
        })
      });
    });

    it('should handle missing file error', async () => {
      mockReq.file = undefined;

      await controller.analyzeImport(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No file uploaded',
        message: 'Please select an Excel file to analyze'
      });
    });

    it('should handle analysis errors', async () => {
      mockDb.first.mockResolvedValue(null); // No saved settings

      const mockAnalyzeImport = jest.fn().mockRejectedValue(new Error('Analysis failed'));
      
      const { ExcelImporter } = require('../../../../src/server/services/import/ExcelImporter.js');
      ExcelImporter.mockImplementation(() => ({
        analyzeImport: mockAnalyzeImport
      }));

      await controller.analyzeImport(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Analysis failed',
        message: 'Import analysis failed: Analysis failed',
        details: expect.any(Error)
      });
    });

    it('should use V2 importer when specified', async () => {
      mockReq.body = { useV2: 'true' };
      mockDb.first.mockResolvedValue(null);

      const mockAnalyzeImport = jest.fn().mockResolvedValue({
        summary: { totalChanges: 0 }
      });

      const { ExcelImporterV2 } = require('../../../../src/server/services/import/ExcelImporterV2.js');
      ExcelImporterV2.mockImplementation(() => ({
        analyzeImport: mockAnalyzeImport
      }));

      await controller.analyzeImport(mockReq as Request, mockRes as Response);

      expect(ExcelImporterV2).toHaveBeenCalled();
      expect(mockAnalyzeImport).toHaveBeenCalled();
    });
  });

  describe('getImportSettings', () => {
    it('should return saved settings from database', async () => {
      const savedSettings = {
        clearExistingData: true,
        validateDuplicates: false,
        autoCreateMissingRoles: true,
        defaultProjectPriority: 1
      };

      mockDb.first.mockResolvedValue({
        value: JSON.stringify(savedSettings)
      });

      await controller.getImportSettingsEndpoint(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: savedSettings
      });
    });

    it('should return default settings when none saved', async () => {
      mockDb.first.mockResolvedValue(null);

      await controller.getImportSettingsEndpoint(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          defaultProjectPriority: 2
        })
      });
    });
  });

  describe('validateFile', () => {
    beforeEach(() => {
      mockReq.file = {
        path: '/tmp/test-file.xlsx',
        originalname: 'test.xlsx',
        size: 1024,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;
    });

    it('should validate Excel file successfully', async () => {
      const mockValidateExcelStructure = jest.fn().mockResolvedValue({
        valid: true,
        canImport: true,
        worksheets: [],
        summary: { totalErrors: 0, totalWarnings: 0 }
      });

      const { ExcelImporter } = require('../../../../src/server/services/import/ExcelImporter.js');
      ExcelImporter.mockImplementation(() => ({
        validateExcelStructure: mockValidateExcelStructure
      }));

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        valid: true,
        canImport: true,
        worksheets: [],
        summary: { totalErrors: 0, totalWarnings: 0 },
        fileInfo: expect.objectContaining({
          name: 'test.xlsx',
          formatVersion: 'V1 (Standard)'
        })
      });
    });

    it('should reject non-Excel files', async () => {
      mockReq.file!.originalname = 'test.txt';

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        valid: false,
        canImport: false,
        errors: [{
          type: 'error',
          severity: 'critical',
          message: 'File must be an Excel file (.xlsx or .xls)',
          suggestion: 'Please select a valid Excel file'
        }]
      });
    });

    it('should handle validation errors', async () => {
      const mockValidateExcelStructure = jest.fn().mockRejectedValue(new Error('Validation error'));

      const { ExcelImporter } = require('../../../../src/server/services/import/ExcelImporter.js');
      ExcelImporter.mockImplementation(() => ({
        validateExcelStructure: mockValidateExcelStructure
      }));

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        valid: false,
        canImport: false,
        errors: [{
          type: 'error',
          severity: 'critical',
          message: 'Validation failed: Validation error',
          suggestion: 'Ensure the file is not corrupted and follows the expected format'
        }]
      });
    });
  });

  describe('getImportHistory', () => {
    it('should return paginated import history', async () => {
      const mockHistory = [
        {
          id: 1,
          file_name: 'test.xlsx',
          status: 'success',
          imported_counts: '{"projects": 5}',
          errors: null,
          started_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockDb.count.mockImplementation(() => ({
        first: () => Promise.resolve({ count: 1 })
      }));

      mockDb.select.mockResolvedValue(mockHistory);

      mockReq.query = { page: '1', limit: '50' };

      await controller.getImportHistory(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          imports: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              file_name: 'test.xlsx',
              imported_counts: { projects: 5 }
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 50,
            totalCount: 1
          })
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockDb.first.mockRejectedValue(new Error('Database connection failed'));

      await controller.getImportSettingsEndpoint(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed to get import settings')
        })
      );
    });

    it('should clean up files on error', async () => {
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue();
      
      mockReq.file = {
        path: '/tmp/test-file.xlsx',
        originalname: 'test.xlsx'
      } as Express.Multer.File;

      mockDb.first.mockRejectedValue(new Error('Test error'));

      await controller.analyzeImport(mockReq as Request, mockRes as Response);

      expect(unlinkSpy).toHaveBeenCalledWith('/tmp/test-file.xlsx');
      
      unlinkSpy.mockRestore();
    });
  });

  describe('Security and Validation', () => {
    it('should validate file size limits', async () => {
      mockReq.file = {
        path: '/tmp/large-file.xlsx',
        originalname: 'large.xlsx',
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as Express.Multer.File;

      // The multer middleware should handle this, but we test controller behavior
      await controller.validateFile(mockReq as Request, mockRes as Response);

      // Should still process if it gets through multer
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should sanitize file names in downloads', async () => {
      mockDb.first.mockResolvedValue({
        id: 'test-scenario',
        name: 'Test/Scenario<script>',
        scenario_type: 'baseline'
      });

      mockReq.query = { scenarioId: 'test-scenario' };

      await controller.exportScenarioData(mockReq as Request, mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/filename="Test_Scenario_script__export_[\d-]+\.xlsx"/)
      );
    });
  });
});
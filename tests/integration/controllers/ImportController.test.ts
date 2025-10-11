import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ImportController } from '../../../src/server/api/controllers/ImportController.js';
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

// Mock database and dependencies
const mockDb = {
  transaction: jest.fn(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  del: jest.fn(),
  count: jest.fn().mockReturnThis(),
  then: jest.fn()
};

// Mock transaction
const mockTrx = {
  ...mockDb,
  commit: jest.fn(),
  rollback: jest.fn()
};

// Mock getAuditedDb
jest.mock('../../../src/server/database/index.js', () => ({
  getAuditedDb: jest.fn(() => mockDb)
}));

// Mock multer file
interface MockFile {
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
}

// Helper to create test Excel files
const createTestExcelFile = async (fileName: string, worksheetData: any): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  
  Object.keys(worksheetData).forEach(sheetName => {
    const worksheet = workbook.addWorksheet(sheetName);
    const data = worksheetData[sheetName];
    
    if (data.length > 0) {
      // Add headers
      worksheet.addRow(Object.keys(data[0]));
      // Add data rows
      data.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
      });
    }
  });
  
  const tempDir = '/tmp';
  const filePath = path.join(tempDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

describe('ImportController Integration Tests', () => {
  let controller: ImportController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let testFilePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new ImportController();
    (controller as any).db = mockDb;
    
    // Mock transaction setup
    mockDb.transaction.mockResolvedValue(mockTrx);
    mockTrx.commit.mockResolvedValue(undefined);
    mockTrx.rollback.mockResolvedValue(undefined);
    
    // Setup request and response mocks
    mockReq = {
      body: {},
      file: undefined,
      user: { name: 'Test User', email: 'test@example.com' },
      headers: { 'x-request-id': 'test-request-id' },
      ip: '127.0.0.1',
      id: 'test-id'
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    } as any;
  });

  afterEach(async () => {
    if (testFilePath) {
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('uploadExcel', () => {
    beforeEach(() => {
      // Mock import settings
      mockDb.first.mockResolvedValue({
        value: JSON.stringify({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        })
      });
    });

    it('should handle successful Excel import', async () => {
      // Create test Excel file
      testFilePath = await createTestExcelFile('test-upload.xlsx', {
        'Projects': [
          {
            'Project Name': 'Integration Test Project',
            'Project Type': 'Development',
            'Location': 'Test Location',
            'Priority': '2'
          }
        ],
        'Rosters': [
          {
            'Name': 'Test Person',
            'Email': 'test@example.com',
            'Primary Role': 'Developer'
          }
        ]
      });

      // Mock file object
      const mockFile: MockFile = {
        originalname: 'test-upload.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;
      mockReq.body = {
        clearExisting: 'false',
        useV2: 'false',
        validateDuplicates: 'true'
      };

      // Mock successful database operations
      mockTrx.insert.mockResolvedValue([{ id: 'import-history-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });
      
      // Mock successful import result
      jest.spyOn(require('../../../src/server/services/import/ExcelImporter.js'), 'ExcelImporter')
        .mockImplementation(() => ({
          importFromFile: jest.fn().mockResolvedValue({
            success: true,
            imported: {
              locations: 1,
              projectTypes: 1,
              phases: 0,
              roles: 1,
              people: 1,
              projects: 1,
              standardAllocations: 0,
              assignments: 0
            },
            errors: [],
            warnings: []
          })
        }));

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Excel import completed successfully',
        imported: expect.any(Object),
        warnings: expect.any(Array)
      });

      expect(mockTrx.insert).toHaveBeenCalledWith(expect.objectContaining({
        file_name: 'test-upload.xlsx',
        status: 'processing'
      }));
    });

    it('should handle missing file error', async () => {
      mockReq.file = undefined;

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No file uploaded',
        message: 'Please select an Excel file to upload'
      });
    });

    it('should handle import failure with rollback', async () => {
      testFilePath = await createTestExcelFile('test-failure.xlsx', {
        'Projects': [
          {
            'Project Name': 'Failing Project',
            'Project Type': 'Development',
            'Location': 'Test Location'
          }
        ]
      });

      const mockFile: MockFile = {
        originalname: 'test-failure.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;

      // Mock import history creation
      mockTrx.insert.mockResolvedValue([{ id: 'import-history-id' }]);
      
      // Mock failed import result
      jest.spyOn(require('../../../src/server/services/import/ExcelImporter.js'), 'ExcelImporter')
        .mockImplementation(() => ({
          importFromFile: jest.fn().mockResolvedValue({
            success: false,
            imported: {
              locations: 0,
              projectTypes: 0,
              phases: 0,
              roles: 0,
              people: 0,
              projects: 0,
              standardAllocations: 0,
              assignments: 0
            },
            errors: ['Test import error'],
            warnings: []
          })
        }));

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Excel import completed with errors',
        imported: expect.any(Object),
        errors: expect.arrayContaining(['Test import error']),
        warnings: expect.any(Array)
      });

      // Should update history record with failure
      expect(mockTrx.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed'
      }));
    });

    it('should use V2 importer when specified', async () => {
      testFilePath = await createTestExcelFile('test-v2.xlsx', {
        'Project Types': [{ 'Type Name': 'Development' }],
        'Project Phases': [{ 'Phase Name': 'Planning' }],
        'Roles': [{ 'Role Name': 'Developer' }],
        'Roster': [{ 'Name': 'Test Person', 'Role': 'Developer' }],
        'Projects': [{ 'Project/Site': 'Test Project @ Test Site' }]
      });

      const mockFile: MockFile = {
        originalname: 'test-v2.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;
      mockReq.body = { useV2: 'true' };

      mockTrx.insert.mockResolvedValue([{ id: 'import-history-id' }]);
      
      // Mock V2 importer
      jest.spyOn(require('../../../src/server/services/import/ExcelImporterV2.js'), 'ExcelImporterV2')
        .mockImplementation(() => ({
          importFromFile: jest.fn().mockResolvedValue({
            success: true,
            imported: {
              locations: 1,
              projectTypes: 1,
              phases: 1,
              roles: 1,
              people: 1,
              projects: 1,
              standardAllocations: 0,
              assignments: 0,
              phaseTimelines: 0,
              demands: 0,
              availabilityOverrides: 0
            },
            errors: [],
            warnings: []
          })
        }));

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Excel import completed successfully'
      }));

      expect(mockTrx.insert).toHaveBeenCalledWith(expect.objectContaining({
        import_type: 'v2'
      }));
    });

    it('should track import history correctly', async () => {
      testFilePath = await createTestExcelFile('test-history.xlsx', {
        'Projects': [
          {
            'Project Name': 'History Test Project',
            'Project Type': 'Development',
            'Location': 'Test Location'
          }
        ]
      });

      const mockFile: MockFile = {
        originalname: 'test-history.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 2048
      };

      mockReq.file = mockFile as any;
      mockReq.body = {
        clearExisting: 'true',
        validateDuplicates: 'false',
        autoCreateMissingRoles: 'true'
      };

      mockTrx.insert.mockResolvedValue([{ id: 'history-id-123' }]);
      
      jest.spyOn(require('../../../src/server/services/import/ExcelImporter.js'), 'ExcelImporter')
        .mockImplementation(() => ({
          importFromFile: jest.fn().mockResolvedValue({
            success: true,
            imported: { projects: 1, people: 0 },
            errors: [],
            warnings: []
          })
        }));

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      // Check history record creation
      expect(mockTrx.insert).toHaveBeenCalledWith(expect.objectContaining({
        file_name: 'test-history.xlsx',
        file_size: '2048',
        file_mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        import_type: 'v1',
        clear_existing: true,
        validate_duplicates: false,
        auto_create_missing_roles: true,
        imported_by: 'Test User',
        status: 'processing',
        request_id: 'test-request-id',
        ip_address: '127.0.0.1'
      }));

      // Check history record update
      expect(mockTrx.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        imported_counts: expect.any(String),
        duration_ms: expect.any(Number),
        completed_at: expect.any(Date)
      }));
    });

    it('should handle import exception and update history', async () => {
      testFilePath = await createTestExcelFile('test-exception.xlsx', {
        'Projects': [{ 'Project Name': 'Exception Project' }]
      });

      const mockFile: MockFile = {
        originalname: 'test-exception.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;
      mockTrx.insert.mockResolvedValue([{ id: 'history-id' }]);
      
      // Mock import exception
      jest.spyOn(require('../../../src/server/services/import/ExcelImporter.js'), 'ExcelImporter')
        .mockImplementation(() => ({
          importFromFile: jest.fn().mockRejectedValue(new Error('Simulated import error'))
        }));

      await controller.uploadExcel(mockReq as Request, mockRes as Response);

      // Should update history with failure
      expect(mockTrx.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        errors: expect.stringContaining('Simulated import error'),
        duration_ms: expect.any(Number),
        completed_at: expect.any(Date)
      }));
    });
  });

  describe('validateFile', () => {
    it('should validate correct file structure', async () => {
      testFilePath = await createTestExcelFile('test-validate.xlsx', {
        'Projects': [
          {
            'Project Name': 'Valid Project',
            'Project Type': 'Development',
            'Location': 'Test Location',
            'Priority': '2'
          }
        ],
        'People': [
          {
            'Name': 'Valid Person',
            'Role': 'Developer'
          }
        ],
        'Standard Allocations': [
          {
            'Role': 'Developer',
            'Project Type': 'Development',
            'Allocation': '25'
          }
        ]
      });

      const mockFile: MockFile = {
        originalname: 'test-validate.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;
      mockReq.body = { useV2: 'false' };

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        valid: true,
        canImport: true,
        fileInfo: expect.objectContaining({
          name: 'test-validate.xlsx',
          formatVersion: 'V1 (Standard)'
        })
      }));
    });

    it('should detect invalid file format', async () => {
      const mockFile: MockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        path: '/tmp/test.txt',
        size: 100
      };

      mockReq.file = mockFile as any;

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        valid: false,
        canImport: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: 'File must be an Excel file (.xlsx or .xls)'
          })
        ])
      }));
    });

    it('should handle missing file in validation', async () => {
      mockReq.file = undefined;

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No file uploaded',
        message: 'Please select an Excel file to validate'
      });
    });

    it('should validate V2 format when specified', async () => {
      testFilePath = await createTestExcelFile('test-validate-v2.xlsx', {
        'Project Types': [{ 'Type Name': 'Development' }],
        'Project Phases': [{ 'Phase Name': 'Planning' }],
        'Roles': [{ 'Role Name': 'Developer' }],
        'Roster': [{ 'Name': 'Test Person' }],
        'Projects': [{ 'Project/Site': 'Test @ Site' }]
      });

      const mockFile: MockFile = {
        originalname: 'test-validate-v2.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: testFilePath,
        size: 1024
      };

      mockReq.file = mockFile as any;
      mockReq.body = { useV2: 'true' };

      await controller.validateFile(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        fileInfo: expect.objectContaining({
          formatVersion: 'V2 (Fiscal Weeks)'
        })
      }));
    });
  });

  describe('getImportHistory', () => {
    it('should return paginated import history', async () => {
      const mockHistory = [
        {
          id: 1,
          file_name: 'test1.xlsx',
          status: 'success',
          imported_counts: '{"projects": 5}',
          errors: null,
          warnings: null,
          started_at: new Date(),
          completed_at: new Date()
        },
        {
          id: 2,
          file_name: 'test2.xlsx',
          status: 'failed',
          imported_counts: null,
          errors: '["Error message"]',
          warnings: null,
          started_at: new Date(),
          completed_at: new Date()
        }
      ];

      mockDb.count.mockResolvedValue({ count: '10' });
      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue(mockHistory)
          })
        })
      });

      mockReq.query = { page: '1', limit: '2' };

      await controller.getImportHistory(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          imports: expect.arrayContaining([
            expect.objectContaining({
              file_name: 'test1.xlsx',
              status: 'success',
              imported_counts: { projects: 5 }
            }),
            expect.objectContaining({
              file_name: 'test2.xlsx',
              status: 'failed',
              errors: ['Error message']
            })
          ]),
          pagination: {
            page: 1,
            limit: 2,
            totalCount: 10,
            totalPages: 5,
            hasNextPage: true,
            hasPrevPage: false
          }
        }
      });
    });

    it('should handle pagination parameters correctly', async () => {
      mockDb.count.mockResolvedValue({ count: '50' });
      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue([])
          })
        })
      });

      mockReq.query = { page: '3', limit: '10' };

      await controller.getImportHistory(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          pagination: expect.objectContaining({
            page: 3,
            limit: 10,
            totalCount: 50,
            totalPages: 5,
            hasNextPage: true,
            hasPrevPage: true
          })
        })
      }));
    });
  });

  describe('downloadTemplate', () => {
    it('should generate Excel template file', async () => {
      await controller.downloadTemplate(mockReq as Request, mockRes as Response);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=capacinator-import-template.xlsx');
      expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('getImportSettingsEndpoint', () => {
    it('should return import settings', async () => {
      const mockSettings = {
        value: JSON.stringify({
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        })
      };

      mockDb.first.mockResolvedValue(mockSettings);

      await controller.getImportSettingsEndpoint(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        }
      });
    });

    it('should return default settings when none exist', async () => {
      mockDb.first.mockResolvedValue(null);

      await controller.getImportSettingsEndpoint(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY'
        }
      });
    });
  });
});
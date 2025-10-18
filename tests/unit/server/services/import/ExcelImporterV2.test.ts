import { describe, test, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock dependencies before imports
const mockGetAuditedDb = jest.fn();
jest.mock('../../../../../src/server/database/index.js', () => ({
  getAuditedDb: mockGetAuditedDb
}));

// Mock fiscal week utilities
const mockFiscalWeekToDate = jest.fn();
const mockExtractFiscalWeekColumns = jest.fn();
const mockParseProjectSite = jest.fn();
const PHASE_ABBREVIATIONS = {
  'INIT': 'Initiation',
  'PLAN': 'Planning',
  'EXEC': 'Execution',
  'CLOSE': 'Closure'
};

jest.mock('../../../../../src/server/utils/fiscalWeek.js', () => ({
  fiscalWeekToDate: mockFiscalWeekToDate,
  extractFiscalWeekColumns: mockExtractFiscalWeekColumns,
  parseProjectSite: mockParseProjectSite,
  getPhaseFullName: jest.fn(),
  PHASE_ABBREVIATIONS
}));

// Mock ExcelJS
const mockWorkbookRead = jest.fn();
const mockGetWorksheet = jest.fn();
const mockWorkbook = {
  xlsx: {
    readFile: mockWorkbookRead
  },
  getWorksheet: mockGetWorksheet
};

// Mock ExcelJS module - it should export an object with Workbook constructor
const mockWorkbookConstructor = jest.fn(() => mockWorkbook);
const mockExcelJS = {
  Workbook: mockWorkbookConstructor
};

// Support both named and default exports for ES modules
mockExcelJS.default = mockExcelJS;

// Mock the dynamic import
jest.mock('exceljs', () => mockExcelJS);

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

// Mock ImportError (we'll test this separately or use actual implementation)
jest.mock('../../../../../src/server/services/import/ImportError.js', () => ({
  ImportError: class MockImportError {},
  ImportErrorCollector: class MockImportErrorCollector {
    constructor() {
      this.errors = [];
      this.warnings = [];
    }
    addError(error: any) { this.errors.push(error); }
    addCriticalError(worksheet: string, message: string, suggestion: string) {
      this.errors.push({ worksheet, message, suggestion, severity: 'critical' });
    }
    addDataError(...args: any[]) { this.errors.push({ type: 'data', args }); }
    hasErrors() { return this.errors.length > 0; }
    toJSON() {
      return {
        errors: this.errors.map(e => ({ ...e, detailedMessage: e.message })),
        warnings: this.warnings.map(w => ({ ...w, detailedMessage: w.message }))
      };
    }
  },
  ImportErrorUtils: {}
}));

import { ExcelImporterV2 } from '../../../../../src/server/services/import/ExcelImporterV2.js';

describe('ExcelImporterV2', () => {
  let importer: ExcelImporterV2;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear ExcelJS mocks
    mockWorkbookRead.mockClear();
    mockGetWorksheet.mockClear();
    mockWorkbookConstructor.mockClear();

    // Setup database mock
    mockDb = jest.fn(() => ({
      del: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockResolvedValue([]),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockReturnThis()
    }));

    mockDb.transaction = jest.fn();

    mockGetAuditedDb.mockReturnValue(mockDb);

    importer = new ExcelImporterV2();
  });

  describe('constructor', () => {
    it('should initialize with audited database', () => {
      expect(mockGetAuditedDb).toHaveBeenCalled();
    });
  });

  describe('getColumnLetter', () => {
    it('should convert index 0 to A', () => {
      const result = (importer as any).getColumnLetter(0);
      expect(result).toBe('A');
    });

    it('should convert index 25 to Z', () => {
      const result = (importer as any).getColumnLetter(25);
      expect(result).toBe('Z');
    });

    it('should convert index 26 to AA', () => {
      const result = (importer as any).getColumnLetter(26);
      expect(result).toBe('AA');
    });

    it('should convert index 27 to AB', () => {
      const result = (importer as any).getColumnLetter(27);
      expect(result).toBe('AB');
    });

    it('should convert index 51 to AZ', () => {
      const result = (importer as any).getColumnLetter(51);
      expect(result).toBe('AZ');
    });

    it('should convert index 52 to BA', () => {
      const result = (importer as any).getColumnLetter(52);
      expect(result).toBe('BA');
    });

    it('should handle negative index', () => {
      const result = (importer as any).getColumnLetter(-1);
      expect(result).toBe('Unknown');
    });

    it('should handle large index (701 = ZZ)', () => {
      const result = (importer as any).getColumnLetter(701);
      expect(result).toBe('ZZ');
    });
  });

  describe('validateExcelStructure', () => {
    it('should return error when Excel file cannot be read', async () => {
      mockWorkbookRead.mockRejectedValue(new Error('File not found'));

      const result = await importer.validateExcelStructure('/path/to/nonexistent.xlsx');

      expect(result.valid).toBe(false);
      expect(result.canImport).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        type: 'error',
        severity: 'critical',
        message: expect.stringContaining('Failed to read Excel file')
      });
    });

    it('should report missing required worksheets', async () => {
      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockReturnValue(null); // No worksheets found

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      // Debug: log the result to see what's happening
      if (result.worksheets.length === 0) {
        console.log('DEBUG: result.errors =', JSON.stringify(result.errors, null, 2));
        console.log('DEBUG: result.valid =', result.valid);
        console.log('DEBUG: result.canImport =', result.canImport);
      }

      expect(result.valid).toBe(false);
      expect(result.canImport).toBe(false);
      expect(result.worksheets.length).toBeGreaterThan(0);

      // Should have errors for all missing worksheets
      const missingWorksheets = result.worksheets.filter(ws => !ws.exists);
      expect(missingWorksheets.length).toBeGreaterThan(0);
      expect(missingWorksheets[0].errors[0]).toMatchObject({
        type: 'error',
        severity: 'critical'
      });
    });

    it('should detect missing required columns', async () => {
      const mockWorksheet = {
        rowCount: 10,
        getRow: jest.fn((rowNum) => ({
          values: rowNum === 1 ? ['', 'Type'] : [] // Missing 'Description' column
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Project Types' ? mockWorksheet : null;
      });

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      const projectTypesSheet = result.worksheets.find(ws => ws.name === 'Project Types');
      expect(projectTypesSheet).toBeDefined();
      expect(projectTypesSheet!.missingColumns).toContain('Description');
      expect(projectTypesSheet!.errors).toContainEqual(
        expect.objectContaining({
          column: 'Description',
          message: expect.stringContaining('Required column')
        })
      );
    });

    it('should validate data rows and detect empty required fields', async () => {
      const mockWorksheet = {
        rowCount: 5,
        getRow: jest.fn((rowNum) => {
          if (rowNum === 1) {
            return { values: ['', 'Project', 'Type', 'Location', 'Priority'] };
          }
          // Row 2: valid, Row 3: missing project name
          return {
            values: rowNum === 2
              ? ['', 'Project A', 'Type1', 'Location1', '1']
              : ['', null, 'Type1', 'Location1', '1'] // Missing project name
          };
        })
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Projects' ? mockWorksheet : null;
      });

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      const projectsSheet = result.worksheets.find(ws => ws.name === 'Projects');
      expect(projectsSheet).toBeDefined();

      // Should have validation errors for rows with missing required fields
      const dataErrors = projectsSheet!.errors.filter(e => e.row);
      expect(dataErrors.length).toBeGreaterThan(0);
    });

    it('should warn about missing fiscal week columns for Project Roadmap', async () => {
      const mockWorksheet = {
        rowCount: 2,
        getRow: jest.fn((rowNum) => ({
          values: rowNum === 1 ? ['', 'Project'] : []
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Project Roadmap' ? mockWorksheet : null;
      });

      mockExtractFiscalWeekColumns.mockReturnValue([]); // No fiscal weeks

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      const roadmapSheet = result.worksheets.find(ws => ws.name === 'Project Roadmap');
      expect(roadmapSheet).toBeDefined();

      const fiscalWeekWarning = roadmapSheet!.errors.find(e =>
        e.message?.includes('fiscal week')
      );
      expect(fiscalWeekWarning).toBeDefined();
      expect(fiscalWeekWarning!.type).toBe('warning');
    });

    it('should calculate estimated import duration', async () => {
      const mockWorksheet = {
        rowCount: 100, // 99 data rows
        getRow: jest.fn((rowNum) => ({
          values: rowNum === 1 ? ['', 'Project', 'Type', 'Location', 'Priority'] : ['', 'P1', 'T1', 'L1', '1']
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Projects' ? mockWorksheet : null;
      });

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      expect(result.summary.estimatedDuration).toBeDefined();
      expect(result.summary.totalRows).toBeGreaterThan(0);
    });

    it('should aggregate errors and warnings correctly', async () => {
      const mockWorksheet1 = {
        rowCount: 2,
        getRow: jest.fn(() => ({ values: ['', 'Type'] })) // Missing Description column
      };

      const mockWorksheet2 = {
        rowCount: 2,
        getRow: jest.fn((rowNum) => ({
          values: rowNum === 1 ? ['', 'Project'] : []
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        if (name === 'Project Types') return mockWorksheet1;
        if (name === 'Project Roadmap') return mockWorksheet2;
        return null;
      });

      mockExtractFiscalWeekColumns.mockReturnValue([]);

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      expect(result.summary.totalErrors).toBeGreaterThan(0);
      expect(result.summary.totalWarnings).toBeGreaterThan(0);
      expect(result.errors.length).toBe(result.summary.totalErrors);
      expect(result.warnings.length).toBe(result.summary.totalWarnings);
    });

    it('should set canImport to false when critical errors exist', async () => {
      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockReturnValue(null); // All worksheets missing

      const result = await importer.validateExcelStructure('/path/to/test.xlsx');

      const criticalErrors = result.errors.filter(e => e.severity === 'critical');
      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(result.canImport).toBe(false);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDuplicates', () => {
    beforeEach(() => {
      // Reset database mock for each test
      const mockDbInstance = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
      mockDb.mockReturnValue(mockDbInstance);

      // Configure parseProjectSite mock to extract project name
      mockParseProjectSite.mockImplementation((value: string) => {
        if (!value) return { project: '', site: '' };
        // For simple names without separator, return as project name
        return { project: value, site: '' };
      });
    });

    it('should detect duplicate projects in Excel file', async () => {
      const mockWorksheet = {
        rowCount: 4,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn((col) => ({
            value: {
              toString: () => rowNum === 2 ? 'Project A' : rowNum === 3 ? 'Project B' : rowNum === 4 ? 'Project A' : null
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Projects' ? mockWorksheet : null;
      });

      // Mock database returning no existing projects
      const mockDbInstance = {
        select: jest.fn().mockResolvedValue([])
      };
      mockDb.mockReturnValue(mockDbInstance);

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound.projects).toContain('Project A');
      expect(result.duplicatesFound.projects.length).toBe(1);
    });

    it('should detect duplicates against existing database records', async () => {
      const mockWorksheet = {
        rowCount: 3,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn(() => ({
            value: {
              toString: () => rowNum === 2 ? 'Project A' : 'Project B'
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Projects' ? mockWorksheet : null;
      });

      // Mock database returning existing project with same name
      const mockDbInstance = {
        select: jest.fn().mockResolvedValue([{ name: 'Project A' }])
      };
      mockDb.mockReturnValue(mockDbInstance);

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound.projects).toContain('Project A');
    });

    it('should check duplicates for people in Roster sheet', async () => {
      const mockWorksheet = {
        rowCount: 4,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn(() => ({
            value: {
              toString: () => rowNum === 2 ? 'John Doe' : rowNum === 3 ? 'Jane Smith' : rowNum === 4 ? 'John Doe' : null
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Roster' ? mockWorksheet : null;
      });

      // Mock database returning no existing people
      const selectChain = {
        then: (resolve: any) => Promise.resolve([]).then(resolve)
      };
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnValue(selectChain)
      });

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound.people).toContain('John Doe');
    });

    it('should check duplicates for roles', async () => {
      const mockWorksheet = {
        rowCount: 4,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn(() => ({
            value: {
              toString: () => rowNum === 2 ? 'Developer' : rowNum === 3 ? 'Designer' : rowNum === 4 ? 'Developer' : null
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Roles' ? mockWorksheet : null;
      });

      // Mock database returning no existing roles
      const selectChain = {
        then: (resolve: any) => Promise.resolve([]).then(resolve)
      };
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnValue(selectChain)
      });

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound.roles).toContain('Developer');
    });

    it('should return empty duplicates when no duplicates exist', async () => {
      const mockWorksheet = {
        rowCount: 3,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn(() => ({
            value: {
              toString: () => rowNum === 2 ? 'Unique A' : 'Unique B'
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        if (name === 'Projects') return mockWorksheet;
        if (name === 'Roster') return mockWorksheet;
        if (name === 'Roles') return mockWorksheet;
        if (name === 'Project Types') return mockWorksheet;
        return null;
      });

      // Mock database returning no existing records
      const selectChain = {
        then: (resolve: any) => Promise.resolve([]).then(resolve)
      };
      mockDb.mockReturnValue({
        select: jest.fn().mockReturnValue(selectChain)
      });

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound.projects).toEqual([]);
      expect(result.duplicatesFound.people).toEqual([]);
      expect(result.duplicatesFound.roles).toEqual([]);
      expect(result.duplicatesFound.locations).toEqual([]);
    });

    it('should handle errors gracefully and return empty duplicates', async () => {
      mockWorkbookRead.mockRejectedValue(new Error('File error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      expect(result.duplicatesFound).toEqual({
        projects: [],
        people: [],
        roles: [],
        locations: []
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const mockWorksheet = {
        rowCount: 4,
        getRow: jest.fn((rowNum) => ({
          getCell: jest.fn(() => ({
            value: {
              toString: () => rowNum === 2 ? 'Project A' : rowNum === 3 ? 'Project B' : rowNum === 4 ? 'project a' : null // Different case
            }
          }))
        }))
      };

      mockWorkbookRead.mockResolvedValue(undefined);
      mockGetWorksheet.mockImplementation((name) => {
        return name === 'Projects' ? mockWorksheet : null;
      });

      // Mock database returning no existing records
      const mockDbInstance = {
        select: jest.fn().mockResolvedValue([])
      };
      mockDb.mockReturnValue(mockDbInstance);

      const result = await (importer as any).validateDuplicates('/path/to/test.xlsx');

      // Should detect 'project a' as duplicate of 'Project A' (case-insensitive)
      expect(result.duplicatesFound.projects).toContain('project a');
    });
  });
});

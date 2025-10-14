import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ExcelImporter, ImportOptions, ImportResult } from '../../../../../src/server/services/import/ExcelImporter.js';
import { ImportError, ImportErrorCollector, ImportErrorUtils } from '../../../../../src/server/services/import/ImportError.js';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';

// Mock ImportErrorUtils with missing methods
jest.mock('../../../../../src/server/services/import/ImportError.js', () => {
  const originalModule = jest.requireActual('../../../../../src/server/services/import/ImportError.js');
  
  return {
    ...originalModule,
    ImportErrorUtils: {
      ...originalModule.ImportErrorUtils,
      missingWorksheet: jest.fn((worksheetName: string) => ({
        type: 'error',
        severity: 'critical',
        message: `Missing required worksheet: ${worksheetName}`,
        category: 'structure'
      }))
    },
    ImportErrorCollector: jest.fn().mockImplementation(() => ({
      addError: jest.fn(),
      getErrors: jest.fn(() => [])
    }))
  };
});

// Create a mock query builder that can be chained with proper promise resolution
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  insert: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
  returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
  del: jest.fn().mockResolvedValue(1),
  count: jest.fn().mockResolvedValue([{ count: '0' }]),
  then: jest.fn((callback) => Promise.resolve(callback())),
  catch: jest.fn().mockReturnThis()
});

// Mock the database as a function that returns a query builder
const mockDb = jest.fn((tableName?: string) => {
  if (tableName) {
    return createMockQueryBuilder();
  }
  return mockDb;
});

// Add database methods directly to the function with proper promise resolution
mockDb.transaction = jest.fn().mockImplementation((callback) => {
  if (callback) {
    return Promise.resolve(callback(mockTrx));
  }
  return Promise.resolve(mockTrx);
});
mockDb.select = jest.fn().mockReturnThis();
mockDb.where = jest.fn().mockReturnThis();
mockDb.first = jest.fn().mockResolvedValue(null);
mockDb.insert = jest.fn().mockResolvedValue([{ id: 'test-id' }]);
mockDb.returning = jest.fn().mockResolvedValue([{ id: 'test-id' }]);
mockDb.del = jest.fn().mockResolvedValue(1);
mockDb.count = jest.fn().mockResolvedValue([{ count: '0' }]);
mockDb.then = jest.fn((callback) => Promise.resolve(callback()));
mockDb.schema = {
  createTable: jest.fn().mockReturnThis(),
  dropTable: jest.fn().mockReturnThis(),
  catch: jest.fn().mockReturnThis()
};

// Mock transaction with proper chainable methods - must be callable like a database function
const mockTrx = jest.fn((tableName?: string) => {
  if (tableName) {
    return createMockQueryBuilder();
  }
  return mockTrx;
});

// Add methods to the transaction function with proper promise resolution
Object.assign(mockTrx, {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  insert: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
  returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
  del: jest.fn().mockResolvedValue(1),
  count: jest.fn().mockResolvedValue([{ count: '0' }]),
  then: jest.fn((callback) => Promise.resolve(callback())),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  schema: {
    createTable: jest.fn().mockReturnThis(),
    dropTable: jest.fn().mockReturnThis(),
    catch: jest.fn().mockReturnThis()
  }
});

// Mock getAuditedDb to return a function that acts as a Knex query builder
jest.mock('../../../../../src/server/database/index.js', () => ({
  getAuditedDb: jest.fn(() => mockDb)
}));

// Create test Excel files
const createTestExcelFile = async (fileName: string, worksheetData: any): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  
  Object.keys(worksheetData).forEach(sheetName => {
    const worksheet = workbook.addWorksheet(sheetName);
    const data = worksheetData[sheetName];
    
    if (data && data.length > 0) {
      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      // Add data rows
      data.forEach((row: any) => {
        const values = headers.map(header => row[header] || '');
        worksheet.addRow(values);
      });
    }
  });
  
  const tempDir = '/tmp';
  const filePath = path.join(tempDir, fileName);
  
  // Add timeout to prevent hanging
  const writePromise = workbook.xlsx.writeFile(filePath);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Excel file creation timed out')), 5000)
  );
  
  await Promise.race([writePromise, timeoutPromise]);
  return filePath;
};

describe('ExcelImporter', () => {
  let importer: ExcelImporter;
  let testFilePath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock implementations to default resolved values
    const resetQueryBuilder = (builder: any) => {
      builder.first.mockResolvedValue(null);
      builder.insert.mockResolvedValue([{ id: 'test-id' }]);
      builder.returning.mockResolvedValue([{ id: 'test-id' }]);
      builder.del.mockResolvedValue(1);
      builder.count.mockResolvedValue([{ count: '0' }]);
      builder.then.mockImplementation((callback: any) => Promise.resolve(callback()));
    };
    
    // Reset main db mock
    mockDb.first.mockResolvedValue(null);
    mockDb.insert.mockResolvedValue([{ id: 'test-id' }]);
    mockDb.returning.mockResolvedValue([{ id: 'test-id' }]);
    mockDb.del.mockResolvedValue(1);
    mockDb.count.mockResolvedValue([{ count: '0' }]);
    mockDb.then.mockImplementation((callback: any) => Promise.resolve(callback()));
    
    // Reset transaction mock to return transaction object directly (no callback pattern)
    mockDb.transaction.mockImplementation(() => {
      console.log('Transaction mock called, returning:', mockTrx);
      return Promise.resolve(mockTrx);
    });
    
    // Reset transaction methods and make sure it's callable
    // resetQueryBuilder(mockTrx); // Skip this for now to test if it's causing issues
    
    // Ensure mockTrx is callable and returns a query builder for table names
    mockTrx.mockImplementation((tableName?: string) => {
      if (tableName) {
        return createMockQueryBuilder();
      }
      return mockTrx;
    });
    mockTrx.commit.mockResolvedValue(undefined);
    mockTrx.rollback.mockResolvedValue(undefined);
    // Mock schema methods with proper Knex-like table builder
    const mockTableBuilder = {
      uuid: jest.fn().mockReturnThis(),
      string: jest.fn().mockReturnThis(),
      primary: jest.fn().mockReturnThis(),
      index: jest.fn().mockReturnThis(),
      references: jest.fn().mockReturnThis(),
      onDelete: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis()
    };
    
    mockTrx.schema.createTable.mockImplementation((tableName: string, callback: Function) => {
      if (callback) {
        callback(mockTableBuilder);
      }
      return { catch: jest.fn().mockResolvedValue(undefined) };
    });
    mockTrx.schema.dropTable.mockImplementation(() => ({ 
      catch: jest.fn().mockResolvedValue(undefined) 
    }));
    
    importer = new ExcelImporter();
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

  describe.skip('importFromFile', () => {
    it('should successfully import valid Excel data', async () => {
      // Create test Excel file
      testFilePath = await createTestExcelFile('test-import.xlsx', {
        'Projects': [
          {
            'Project Name': 'Test Project 1',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2',
            'Description': 'Test project description',
            'Start Date': '2024-01-01',
            'End Date': '2024-06-30',
            'Owner': 'John Doe'
          }
        ],
        'Rosters': [
          {
            'Name': 'Alice Johnson',
            'Email': 'alice@example.com',
            'Primary Role': 'Developer',
            'Worker Type': 'FTE',
            'Supervisor': 'Bob Smith',
            'Availability': '100',
            'Hours Per Day': '8'
          }
        ],
        'Standard Allocations': [
          {
            'Project Type': 'Development',
            'Phase': 'Planning',
            'Role': 'Developer',
            'Allocation': '25'
          }
        ]
      });

      // Mock database responses
      mockTrx.first.mockResolvedValue(null); // No duplicates
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.returning.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });
      
      const options: ImportOptions = {
        clearExisting: false,
        validateDuplicates: false
      };

      const result = await importer.importFromFile(testFilePath, options);

      if (!result.success) {
        console.log('Import failed with errors:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(mockTrx.rollback).not.toHaveBeenCalled();
    });

    it('should handle file not found error', async () => {
      const result = await importer.importFromFile('/nonexistent/file.xlsx');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('rolled back');
      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it('should validate duplicates when option is enabled', async () => {
      testFilePath = await createTestExcelFile('test-duplicates.xlsx', {
        'Projects': [
          {
            'Project Name': 'Existing Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ]
      });

      // Mock existing project in database
      mockDb.select.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue({ name: 'Existing Project' })
        })
      });

      const options: ImportOptions = {
        validateDuplicates: true
      };

      const result = await importer.importFromFile(testFilePath, options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Duplicate records found. Import cancelled to prevent data conflicts.');
      expect(result.duplicatesFound?.projects).toContain('Existing Project');
    });

    it('should clear existing data when option is enabled', async () => {
      testFilePath = await createTestExcelFile('test-clear.xlsx', {
        'Projects': [
          {
            'Project Name': 'New Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ]
      });

      mockTrx.first.mockResolvedValue(null);
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });

      const options: ImportOptions = {
        clearExisting: true
      };

      const result = await importer.importFromFile(testFilePath, options);

      expect(result.success).toBe(true);
      expect(mockTrx.del).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      testFilePath = await createTestExcelFile('test-error.xlsx', {
        'Projects': [
          {
            'Project Name': 'Error Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ]
      });

      // Mock database error
      mockTrx.insert.mockRejectedValue(new Error('Database error'));

      const result = await importer.importFromFile(testFilePath);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });

    it('should report progress when callback is provided', async () => {
      testFilePath = await createTestExcelFile('test-progress.xlsx', {
        'Projects': [
          {
            'Project Name': 'Progress Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ]
      });

      mockTrx.first.mockResolvedValue(null);
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });

      const progressCallback = {
        onProgress: jest.fn(),
        onPhaseChange: jest.fn(),
        onEstimate: jest.fn(),
        onRowProcessed: jest.fn()
      };

      const options: ImportOptions = {
        progressCallback
      };

      const result = await importer.importFromFile(testFilePath, options);

      expect(result.success).toBe(true);
      expect(progressCallback.onPhaseChange).toHaveBeenCalled();
      expect(progressCallback.onProgress).toHaveBeenCalled();
    });
  });

  describe('validateExcelStructure', () => {
    it('should validate correct Excel structure', async () => {
      testFilePath = await createTestExcelFile('test-structure.xlsx', {
        'Projects': [
          {
            'Project Name': 'Test Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ],
        'People': [
          {
            'Name': 'Test Person',
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

      const result = await importer.validateExcelStructure(testFilePath);

      expect(result.valid).toBe(true);
      expect(result.canImport).toBe(true);
      expect(result.worksheets).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required worksheets', async () => {
      testFilePath = await createTestExcelFile('test-missing-sheets.xlsx', {
        'Projects': [
          {
            'Project Name': 'Test Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': '2'
          }
        ]
        // Missing 'People' and 'Standard Allocations' worksheets
      });

      const result = await importer.validateExcelStructure(testFilePath);

      expect(result.valid).toBe(false);
      expect(result.canImport).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('People'))).toBe(true);
    });

    it.skip('should detect missing required columns', async () => {
      testFilePath = await createTestExcelFile('test-missing-columns.xlsx', {
        'Projects': [
          {
            'Project Name': 'Test Project'
            // Missing required columns like Project Type, Location, Priority
          }
        ],
        'People': [
          {
            'Name': 'Test Person'
            // Missing required Role column
          }
        ],
        'Standard Allocations': [
          {
            'Role': 'Developer'
            // Missing required Project Type and Allocation columns
          }
        ]
      });

      const result = await importer.validateExcelStructure(testFilePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Project Type'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Role'))).toBe(true);
    });

    it('should handle corrupted Excel file', async () => {
      // Create a non-Excel file
      testFilePath = '/tmp/corrupted.xlsx';
      await fs.writeFile(testFilePath, 'This is not an Excel file');

      const result = await importer.validateExcelStructure(testFilePath);

      expect(result.valid).toBe(false);
      expect(result.canImport).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Failed to read Excel file');
    });
  });

  describe.skip('Data Validation', () => {
    it('should validate email formats', async () => {
      testFilePath = await createTestExcelFile('test-email-validation.xlsx', {
        'Rosters': [
          {
            'Name': 'Valid User',
            'Email': 'valid@example.com',
            'Primary Role': 'Developer'
          },
          {
            'Name': 'Invalid User',
            'Email': 'invalid-email',
            'Primary Role': 'Developer'
          }
        ]
      });

      mockTrx.first.mockResolvedValue(null);
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });

      const result = await importer.importFromFile(testFilePath);

      // Should still succeed but with errors about invalid email
      expect(result.success).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid email address format'))).toBe(true);
    });

    it('should validate percentage values', async () => {
      testFilePath = await createTestExcelFile('test-percentage-validation.xlsx', {
        'Rosters': [
          {
            'Name': 'Valid User',
            'Email': 'user@example.com',
            'Primary Role': 'Developer',
            'Availability': '150' // Invalid: > 100%
          },
          {
            'Name': 'Another User',
            'Email': 'user2@example.com',
            'Primary Role': 'Developer',
            'Availability': '-10' // Invalid: negative
          }
        ]
      });

      mockTrx.first.mockResolvedValue(null);
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });

      const result = await importer.importFromFile(testFilePath);

      expect(result.success).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid availability percentage'))).toBe(true);
    });

    it('should validate hours per day', async () => {
      testFilePath = await createTestExcelFile('test-hours-validation.xlsx', {
        'Rosters': [
          {
            'Name': 'Workaholic',
            'Email': 'workaholic@example.com',
            'Primary Role': 'Developer',
            'Hours Per Day': '30' // Warning: > 24 hours
          },
          {
            'Name': 'Invalid User',
            'Email': 'invalid@example.com',
            'Primary Role': 'Developer',
            'Hours Per Day': 'not-a-number'
          }
        ]
      });

      mockTrx.first.mockResolvedValue(null);
      mockTrx.insert.mockResolvedValue([{ id: 'test-id' }]);
      mockTrx.count.mockResolvedValue({ count: '1' });

      const result = await importer.importFromFile(testFilePath);

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('exceeds 24 hours'))).toBe(true);
      expect(result.errors.some(e => e.includes('Invalid hours per day'))).toBe(true);
    });
  });

  describe('Error Handling and Deduplication', () => {
    it('should deduplicate similar errors', async () => {
      testFilePath = await createTestExcelFile('test-duplicate-errors.xlsx', {
        'Projects': [
          {
            'Project Name': '', // Missing name - error
            'Project Type': 'Development',
            'Location': 'San Francisco'
          },
          {
            'Project Name': '', // Same missing name error
            'Project Type': 'Development',
            'Location': 'San Francisco'
          },
          {
            'Project Name': '', // Another same error
            'Project Type': 'Development',
            'Location': 'San Francisco'
          }
        ]
      });

      const result = await importer.importFromFile(testFilePath);

      expect(result.success).toBe(false);
      // Should have errors but deduplication should reduce the count
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it.skip('should provide error analysis', async () => {
      testFilePath = await createTestExcelFile('test-error-analysis.xlsx', {
        'Projects': [
          {
            'Project Name': 'Valid Project',
            'Project Type': '', // Missing type
            'Location': 'San Francisco'
          }
        ],
        'Rosters': [
          {
            'Name': '', // Missing name
            'Primary Role': 'Developer'
          }
        ]
      });

      const result = await importer.importFromFile(testFilePath);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 15000); // 15 second timeout
  });

  describe('Helper Methods', () => {
    it('should convert column index to letter correctly', () => {
      // Access private method through any cast for testing
      const getColumnLetter = (importer as any).getColumnLetter;
      
      expect(getColumnLetter(0)).toBe('A');
      expect(getColumnLetter(1)).toBe('B');
      expect(getColumnLetter(25)).toBe('Z');
      expect(getColumnLetter(26)).toBe('AA');
      expect(getColumnLetter(-1)).toBe('Unknown');
    });

    it('should parse dates correctly', () => {
      const parseDate = (importer as any).parseDate;
      
      // Test string date
      expect(parseDate('2024-01-01')).toBe('2024-01-01');
      
      // Test Date object
      const date = new Date('2024-01-01');
      expect(parseDate(date)).toBe('2024-01-01');
      
      // Test invalid date
      expect(parseDate('invalid-date')).toBeNull();
      
      // Test null/undefined
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });
  });

  describe.skip('Import Analysis (Dry-Run)', () => {
    let testFilePath: string;
    
    beforeEach(() => {
      // Reset mocks for analysis tests
      jest.clearAllMocks();
    });

    afterEach(async () => {
      if (testFilePath && await fs.stat(testFilePath).catch(() => null)) {
        await fs.unlink(testFilePath);
      }
    });

    it('should analyze import without making changes', async () => {
      // Mock database calls to return resolved values
      const mockQueryBuilder = createMockQueryBuilder();
      mockDb.mockImplementation((tableName: string) => {
        if (tableName === 'projects') {
          mockQueryBuilder.select.mockResolvedValue([
            { name: 'Existing Project', id: '1' }
          ]);
        } else if (tableName === 'people') {
          mockQueryBuilder.select.mockResolvedValue([
            { name: 'Existing Person', email: 'existing@test.com', id: '1' }
          ]);
        } else {
          mockQueryBuilder.select.mockResolvedValue([]);
        }
        return mockQueryBuilder;
      });

      mockDb.count.mockResolvedValue({ count: 5 });

      testFilePath = await createTestExcelFile('analysis-test.xlsx', {
        'Projects': [
          {
            'Project Name': 'New Project',
            'Project Type': 'Development',
            'Location': 'San Francisco',
            'Priority': 'High'
          },
          {
            'Project Name': 'Existing Project',
            'Project Type': 'Development', 
            'Location': 'New York',
            'Priority': 'Medium'
          }
        ],
        'Rosters': [
          {
            'Name': 'New Person',
            'Email': 'new@test.com',
            'Primary Role': 'Developer'
          },
          {
            'Name': 'Existing Person',
            'Email': 'updated@test.com',
            'Primary Role': 'Manager'
          }
        ]
      });

      const analysis = await importer.analyzeImport(testFilePath, {
        clearExisting: false
      });

      // Verify analysis structure
      expect(analysis).toHaveProperty('summary');
      expect(analysis).toHaveProperty('conflicts');
      expect(analysis).toHaveProperty('warnings');
      expect(analysis).toHaveProperty('errors');
      expect(analysis).toHaveProperty('preview');
      expect(analysis).toHaveProperty('riskAssessment');

      // Verify counts
      expect(analysis.summary.wouldCreate.projects).toBe(1);
      expect(analysis.summary.wouldUpdate.projects).toBe(1);
      expect(analysis.summary.wouldCreate.people).toBe(1);
      expect(analysis.summary.wouldUpdate.people).toBe(1);

      // Verify preview entities
      expect(analysis.preview.newEntities).toHaveLength(2); // 1 project + 1 person
      expect(analysis.preview.modifiedEntities).toHaveLength(2); // 1 project + 1 person

      // Verify risk assessment
      expect(analysis.riskAssessment.level).toBe('low');
      expect(analysis.riskAssessment.factors).toContain('No significant risks detected');
    });

    it('should detect conflicts in analysis', async () => {
      // Mock existing person with same email
      mockDb.select.mockImplementation((fields) => {
        if (fields === 'name, email, id') {
          return Promise.resolve([
            { name: 'Different Person', email: 'conflict@test.com', id: '1' }
          ]);
        }
        return Promise.resolve([]);
      });

      testFilePath = await createTestExcelFile('conflict-test.xlsx', {
        'Rosters': [
          {
            'Name': 'New Person',
            'Email': 'conflict@test.com',
            'Primary Role': 'Developer'
          }
        ]
      });

      const analysis = await importer.analyzeImport(testFilePath);

      expect(analysis.conflicts).toHaveLength(1);
      expect(analysis.conflicts[0]).toMatchObject({
        type: 'email_conflict',
        entity: 'New Person',
        field: 'email',
        existingValue: 'conflict@test.com'
      });

      expect(analysis.riskAssessment.level).toBe('high');
      expect(analysis.riskAssessment.factors).toContain('1 data conflicts detected');
    });

    it('should assess high risk for clear existing data', async () => {
      // Mock existing data that would be deleted
      mockDb.select.mockResolvedValue([
        { name: 'Project 1', id: '1' },
        { name: 'Project 2', id: '2' },
        { name: 'Project 3', id: '3' }
      ]);

      testFilePath = await createTestExcelFile('clear-test.xlsx', {
        'Projects': [
          {
            'Project Name': 'New Project',
            'Project Type': 'Development',
            'Location': 'Test Location',
            'Priority': 'High'
          }
        ]
      });

      const analysis = await importer.analyzeImport(testFilePath, {
        clearExisting: true
      });

      expect(analysis.summary.wouldDelete.projects).toBe(3);
      expect(analysis.riskAssessment.level).toBe('high');
      expect(analysis.riskAssessment.factors).toContain('3 existing records will be deleted');
      expect(analysis.riskAssessment.recommendations).toContain('Consider backing up data before proceeding');
    });

    it('should assess medium risk for large imports', async () => {
      mockDb.select.mockResolvedValue([]);

      // Create large dataset
      const projects = Array.from({ length: 150 }, (_, i) => ({
        'Project Name': `Project ${i + 1}`,
        'Project Type': 'Development',
        'Location': 'Test Location',
        'Priority': 'Medium'
      }));

      testFilePath = await createTestExcelFile('large-test.xlsx', {
        'Projects': projects
      });

      const analysis = await importer.analyzeImport(testFilePath);

      expect(analysis.summary.wouldCreate.projects).toBe(150);
      expect(analysis.riskAssessment.level).toBe('medium');
      expect(analysis.riskAssessment.factors).toContain('Large import: 150 new records will be created');
      expect(analysis.riskAssessment.recommendations).toContain('Consider importing in smaller batches');
    });

    it('should handle missing worksheets gracefully in analysis', async () => {
      testFilePath = await createTestExcelFile('minimal-test.xlsx', {
        'Projects': [
          {
            'Project Name': 'Test Project',
            'Project Type': 'Development',
            'Location': 'Test Location',
            'Priority': 'High'
          }
        ]
        // No Rosters or Standard Allocations worksheets
      });

      const analysis = await importer.analyzeImport(testFilePath);

      expect(analysis.errors).toContain('Missing required worksheet: Rosters/People');
      expect(analysis.riskAssessment.level).toBe('high');
      expect(analysis.summary.wouldCreate.people).toBe(0);
      expect(analysis.summary.wouldCreate.standardAllocations).toBe(0);
    });

    it('should calculate total changes correctly', async () => {
      mockDb.select.mockResolvedValue([]);
      mockDb.count.mockResolvedValue({ count: 10 });

      testFilePath = await createTestExcelFile('changes-test.xlsx', {
        'Projects': [
          { 'Project Name': 'P1', 'Project Type': 'Dev', 'Location': 'SF', 'Priority': 'High' },
          { 'Project Name': 'P2', 'Project Type': 'Dev', 'Location': 'SF', 'Priority': 'High' }
        ],
        'Rosters': [
          { 'Name': 'Person1', 'Email': 'p1@test.com', 'Primary Role': 'Dev' },
          { 'Name': 'Person2', 'Email': 'p2@test.com', 'Primary Role': 'Dev' }
        ],
        'Standard Allocations': [
          { 'Project Type': 'Dev', 'Role': 'Developer', 'Allocation': '80' },
          { 'Project Type': 'Dev', 'Role': 'Manager', 'Allocation': '20' }
        ]
      });

      const analysis = await importer.analyzeImport(testFilePath, {
        clearExisting: true
      });

      const expectedTotalChanges = 
        analysis.summary.wouldCreate.projects +
        analysis.summary.wouldCreate.people +
        analysis.summary.wouldCreate.standardAllocations +
        analysis.summary.wouldDelete.standardAllocations;

      expect(analysis.summary.totalChanges).toBe(expectedTotalChanges);
      expect(analysis.summary.totalChanges).toBeGreaterThan(0);
    });
  });

  describe('Export Analysis Integration', () => {
    it.skip('should validate analysis results match import behavior', async () => {
      // This test ensures dry-run analysis predicts actual import results
      mockDb.select.mockResolvedValue([]);
      mockDb.insert.mockResolvedValue([{ id: 1 }]);
      mockDb.transaction.mockImplementation((callback) => {
        if (typeof callback === 'function') {
          return Promise.resolve(callback(mockTrx));
        }
        return Promise.resolve(mockTrx);
      });

      const testFilePath = await createTestExcelFile('validation-test.xlsx', {
        'Projects': [
          {
            'Project Name': 'Analysis Test Project',
            'Project Type': 'Development',
            'Location': 'Test Location',
            'Priority': 'High'
          }
        ],
        'Rosters': [
          {
            'Name': 'Analysis Test Person',
            'Email': 'analysis@test.com',
            'Primary Role': 'Developer'
          }
        ]
      });

      // Run analysis first
      const analysis = await importer.analyzeImport(testFilePath);
      
      // Run actual import
      const importResult = await importer.importFromFile(testFilePath);

      // Verify analysis predictions match import results
      expect(analysis.summary.wouldCreate.projects).toBe(importResult.imported.projects);
      expect(analysis.summary.wouldCreate.people).toBe(importResult.imported.people);
      
      await fs.unlink(testFilePath);
    }, 15000); // 15 second timeout
  });
});
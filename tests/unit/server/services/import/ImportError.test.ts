import { describe, test, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  ImportError, 
  ImportErrorCollector, 
  ImportErrorUtils, 
  ImportProgressTracker,
  ImportPhase,
  ProgressCallback,
  ImportErrorData 
} from '../../../../../src/server/services/import/ImportError.js';

describe('ImportError', () => {
  describe('ImportError class', () => {
    it('should create error with all properties', () => {
      const errorData: ImportErrorData = {
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        row: 5,
        column: 'A',
        field: 'Project Name',
        currentValue: '',
        expectedType: 'non-empty string',
        message: 'Project Name is required',
        suggestion: 'Enter a project name'
      };

      const error = new ImportError(errorData);

      expect(error.type).toBe('error');
      expect(error.severity).toBe('high');
      expect(error.category).toBe('data');
      expect(error.worksheet).toBe('Projects');
      expect(error.row).toBe(5);
      expect(error.column).toBe('A');
      expect(error.field).toBe('Project Name');
      expect(error.message).toBe('Project Name is required');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should generate location string correctly', () => {
      const error = new ImportError({
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        row: 5,
        column: 'A',
        field: 'Project Name',
        message: 'Test error'
      });

      expect(error.getLocation()).toBe('Sheet: Projects, Row: 5, Column: A, Field: Project Name');
    });

    it('should generate detailed message with context', () => {
      const error = new ImportError({
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Invalid format',
        currentValue: 'bad-email',
        expectedValue: 'valid email format',
        expectedType: 'email'
      });

      expect(error.getDetailedMessage()).toContain('Invalid format');
      expect(error.getDetailedMessage()).toContain('Current: "bad-email"');
      expect(error.getDetailedMessage()).toContain('Expected: valid email format');
      expect(error.getDetailedMessage()).toContain('Type: email');
    });

    it('should convert to JSON correctly', () => {
      const error = new ImportError({
        type: 'warning',
        severity: 'medium',
        category: 'validation',
        worksheet: 'People',
        row: 3,
        column: 'B',
        field: 'Email',
        message: 'Email format warning',
        suggestion: 'Check email format'
      });

      const json = error.toJSON();

      expect(json.type).toBe('warning');
      expect(json.severity).toBe('medium');
      expect(json.category).toBe('validation');
      expect(json.worksheet).toBe('People');
      expect(json.row).toBe(3);
      expect(json.column).toBe('B');
      expect(json.field).toBe('Email');
      expect(json.message).toBe('Email format warning');
      expect(json.suggestion).toBe('Check email format');
      expect(json.location).toContain('People');
      expect(json.detailedMessage).toContain('Email format warning');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('ImportErrorCollector', () => {
    let collector: ImportErrorCollector;

    beforeEach(() => {
      collector = new ImportErrorCollector();
    });

    it('should add errors to appropriate collections', () => {
      const errorData: ImportErrorData = {
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Test error'
      };

      const warningData: ImportErrorData = {
        type: 'warning',
        severity: 'medium',
        category: 'validation',
        message: 'Test warning'
      };

      const infoData: ImportErrorData = {
        type: 'info',
        severity: 'low',
        category: 'format',
        message: 'Test info'
      };

      collector.addError(errorData);
      collector.addError(warningData);
      collector.addError(infoData);

      expect(collector.getErrorCount()).toBe(1);
      expect(collector.getWarningCount()).toBe(1);
      expect(collector.hasErrors()).toBe(true);
    });

    it('should deduplicate identical errors', () => {
      const errorData: ImportErrorData = {
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        row: 5,
        column: 'A',
        field: 'Name',
        message: 'Name is required'
      };

      // Add the same error multiple times
      collector.addError(errorData);
      collector.addError(errorData);
      collector.addError(errorData);

      expect(collector.getErrorCount()).toBe(1); // Only one unique error
      const duplicateCounts = collector.getDuplicateCounts();
      expect(Array.from(duplicateCounts.values())).toContain(3); // But count is 3
    });

    it('should identify similar errors within proximity', () => {
      const baseError: ImportErrorData = {
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        row: 5,
        column: 'A',
        field: 'Name',
        message: 'Name is required'
      };

      const similarError: ImportErrorData = {
        ...baseError,
        row: 6 // Within ±2 rows
      };

      const distantError: ImportErrorData = {
        ...baseError,
        row: 10 // Outside ±2 rows
      };

      collector.addError(baseError);
      collector.addError(similarError);
      collector.addError(distantError);

      expect(collector.getErrorCount()).toBe(2); // Similar error not added, distant error added
    });

    it('should enforce maximum error limits', () => {
      const limitedCollector = new ImportErrorCollector(2, 2); // Max 2 errors, 2 warnings

      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        limitedCollector.addError({
          type: 'error',
          severity: 'high',
          category: 'data',
          message: `Error ${i}`,
          row: i // Different rows to avoid deduplication
        });
      }

      expect(limitedCollector.getErrorCount()).toBe(2); // Only 2 errors stored
    });

    it('should group errors by category', () => {
      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Data error 1'
      });

      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Data error 2'
      });

      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'structure',
        message: 'Structure error'
      });

      const grouped = collector.getErrorsByCategory();
      expect(grouped.data).toHaveLength(2);
      expect(grouped.structure).toHaveLength(1);
      expect(grouped.validation).toHaveLength(0);
    });

    it('should group errors by worksheet', () => {
      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        message: 'Project error'
      });

      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'People',
        message: 'People error'
      });

      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        worksheet: 'Projects',
        message: 'Another project error'
      });

      const grouped = collector.getErrorsByWorksheet();
      expect(grouped['Projects']).toHaveLength(2);
      expect(grouped['People']).toHaveLength(1);
    });

    it('should identify top errors by frequency', () => {
      // Add errors with different frequencies
      const errorA = {
        type: 'error' as const,
        severity: 'high' as const,
        category: 'data' as const,
        worksheet: 'Projects',
        row: 1,
        column: 'A',
        field: 'Name',
        message: 'Name required'
      };

      const errorB = {
        type: 'error' as const,
        severity: 'high' as const,
        category: 'data' as const,
        worksheet: 'Projects',
        row: 10,
        column: 'B',
        field: 'Type',
        message: 'Type required'
      };

      // Add errorA 3 times, errorB 1 time
      collector.addError(errorA);
      collector.addError(errorA);
      collector.addError(errorA);
      collector.addError(errorB);

      const topErrors = collector.getTopErrorsByFrequency(2);
      expect(topErrors).toHaveLength(2);
      expect(topErrors[0].count).toBe(3); // ErrorA should be first
      expect(topErrors[1].count).toBe(1); // ErrorB should be second
    });

    it('should provide comprehensive error analysis', () => {
      collector.addError({
        type: 'error',
        severity: 'critical',
        category: 'data',
        worksheet: 'Projects',
        message: 'Critical error'
      });

      collector.addError({
        type: 'warning',
        severity: 'medium',
        category: 'validation',
        worksheet: 'Projects',
        message: 'Warning'
      });

      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'structure',
        worksheet: 'People',
        message: 'Structure error'
      });

      const analysis = collector.getErrorAnalysis();

      expect(analysis.totalUniqueErrors).toBe(3);
      expect(analysis.totalDuplicates).toBe(0);
      expect(analysis.topErrors).toHaveLength(3);
      expect(analysis.clusterSummary.length).toBeGreaterThan(0);
      expect(analysis.worstWorksheet).toBe('Projects'); // Has 2 issues
    });

    it('should convert to JSON with analysis', () => {
      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Test error'
      });

      collector.addError({
        type: 'warning',
        severity: 'medium',
        category: 'validation',
        message: 'Test warning'
      });

      const json = collector.toJSON();

      expect(json.errors).toHaveLength(1);
      expect(json.warnings).toHaveLength(1);
      expect(json.summary).toBeDefined();
      expect(json.analysis).toBeDefined();
      expect(json.analysis.totalUniqueErrors).toBe(2);
    });

    it('should clear all errors', () => {
      collector.addError({
        type: 'error',
        severity: 'high',
        category: 'data',
        message: 'Test error'
      });

      expect(collector.getErrorCount()).toBe(1);

      collector.clear();

      expect(collector.getErrorCount()).toBe(0);
      expect(collector.getWarningCount()).toBe(0);
      expect(collector.hasErrors()).toBe(false);
    });

    it('should detect critical errors', () => {
      collector.addError({
        type: 'error',
        severity: 'critical',
        category: 'system',
        message: 'Critical system error'
      });

      expect(collector.hasCriticalErrors()).toBe(true);
    });

    it('should provide sampled errors for large datasets', () => {
      // Add many errors
      for (let i = 0; i < 100; i++) {
        collector.addError({
          type: 'error',
          severity: 'high',
          category: 'data',
          row: i, // Different rows to avoid deduplication
          message: `Error ${i}`
        });
      }

      const sampled = collector.getSampledErrors(10);
      expect(sampled).toHaveLength(10);
    });
  });

  describe('ImportErrorUtils', () => {
    describe('validation methods', () => {
      it('should validate email addresses correctly', () => {
        expect(ImportErrorUtils.validateEmail('valid@example.com')).toBe(true);
        expect(ImportErrorUtils.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
        expect(ImportErrorUtils.validateEmail('invalid-email')).toBe(false);
        expect(ImportErrorUtils.validateEmail('missing@')).toBe(false);
        expect(ImportErrorUtils.validateEmail('@missing.com')).toBe(false);
        expect(ImportErrorUtils.validateEmail('')).toBe(false);
      });

      it('should validate percentages correctly', () => {
        expect(ImportErrorUtils.validatePercentage(50).isValid).toBe(true);
        expect(ImportErrorUtils.validatePercentage('75%').isValid).toBe(true);
        expect(ImportErrorUtils.validatePercentage('100').isValid).toBe(true);
        expect(ImportErrorUtils.validatePercentage('0').isValid).toBe(true);
        
        expect(ImportErrorUtils.validatePercentage(150).isValid).toBe(false);
        expect(ImportErrorUtils.validatePercentage(-10).isValid).toBe(false);
        expect(ImportErrorUtils.validatePercentage('not-a-number').isValid).toBe(false);
        expect(ImportErrorUtils.validatePercentage(null).isValid).toBe(false);
        expect(ImportErrorUtils.validatePercentage('').isValid).toBe(false);

        const result = ImportErrorUtils.validatePercentage('75%');
        expect(result.numericValue).toBe(75);
      });

      it('should validate positive numbers correctly', () => {
        expect(ImportErrorUtils.validatePositiveNumber(5).isValid).toBe(true);
        expect(ImportErrorUtils.validatePositiveNumber('10.5').isValid).toBe(true);
        
        expect(ImportErrorUtils.validatePositiveNumber(0).isValid).toBe(false);
        expect(ImportErrorUtils.validatePositiveNumber(-5).isValid).toBe(false);
        expect(ImportErrorUtils.validatePositiveNumber('not-a-number').isValid).toBe(false);
        expect(ImportErrorUtils.validatePositiveNumber(null).isValid).toBe(false);

        const result = ImportErrorUtils.validatePositiveNumber('10.5');
        expect(result.numericValue).toBe(10.5);
      });

      it('should validate dates correctly', () => {
        expect(ImportErrorUtils.validateDate('2024-01-01').isValid).toBe(true);
        expect(ImportErrorUtils.validateDate('01/01/2024').isValid).toBe(true);
        expect(ImportErrorUtils.validateDate('01-01-2024').isValid).toBe(true);
        expect(ImportErrorUtils.validateDate(new Date('2024-01-01')).isValid).toBe(true);
        
        // Excel serial number (1 = 1900-01-01 + 1 day)
        expect(ImportErrorUtils.validateDate(44927).isValid).toBe(true); // Some Excel date number
        
        expect(ImportErrorUtils.validateDate('invalid-date').isValid).toBe(false);
        expect(ImportErrorUtils.validateDate('').isValid).toBe(false);
        expect(ImportErrorUtils.validateDate(null).isValid).toBe(false);

        const result = ImportErrorUtils.validateDate('2024-01-01');
        expect(result.parsedDate).toBeInstanceOf(Date);
        expect(result.format).toBe('YYYY-MM-DD');
      });

      it('should validate date ranges correctly', () => {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        const invalidEndDate = '2023-12-31';

        expect(ImportErrorUtils.validateDateRange(startDate, endDate).isValid).toBe(true);
        expect(ImportErrorUtils.validateDateRange(startDate, invalidEndDate).isValid).toBe(false);
        expect(ImportErrorUtils.validateDateRange(startDate, invalidEndDate).message).toContain('Start date must be before end date');
        
        expect(ImportErrorUtils.validateDateRange('invalid', endDate).isValid).toBe(false);
        expect(ImportErrorUtils.validateDateRange(startDate, 'invalid').isValid).toBe(false);
      });

      it('should validate required fields correctly', () => {
        expect(ImportErrorUtils.validateRequired('value')).toBe(true);
        expect(ImportErrorUtils.validateRequired('  value  ')).toBe(true); // Trims whitespace
        expect(ImportErrorUtils.validateRequired(0)).toBe(true); // Zero is valid
        expect(ImportErrorUtils.validateRequired(false)).toBe(true); // False is valid
        
        expect(ImportErrorUtils.validateRequired('')).toBe(false);
        expect(ImportErrorUtils.validateRequired('   ')).toBe(false); // Only whitespace
        expect(ImportErrorUtils.validateRequired(null)).toBe(false);
        expect(ImportErrorUtils.validateRequired(undefined)).toBe(false);
      });
    });

    describe('error creation methods', () => {
      it('should create missing required field error', () => {
        const error = ImportErrorUtils.missingRequiredField('Projects', 5, 'A', 'Project Name');
        
        expect(error.type).toBe('error');
        expect(error.severity).toBe('high');
        expect(error.category).toBe('data');
        expect(error.worksheet).toBe('Projects');
        expect(error.row).toBe(5);
        expect(error.column).toBe('A');
        expect(error.field).toBe('Project Name');
        expect(error.message).toContain('Project Name is required');
        expect(error.suggestion).toContain('Enter a value for Project Name');
      });

      it('should create invalid data type error', () => {
        const error = ImportErrorUtils.invalidDataType('People', 3, 'B', 'Age', 'not-a-number', 'number');
        
        expect(error.type).toBe('error');
        expect(error.severity).toBe('high');
        expect(error.category).toBe('data');
        expect(error.currentValue).toBe('not-a-number');
        expect(error.expectedType).toBe('number');
        expect(error.message).toContain('Invalid number format in Age');
      });

      it('should create invalid email error', () => {
        const error = ImportErrorUtils.invalidEmail('People', 2, 'C', 'bad-email');
        
        expect(error.type).toBe('error');
        expect(error.severity).toBe('medium');
        expect(error.category).toBe('format');
        expect(error.field).toBe('Email');
        expect(error.currentValue).toBe('bad-email');
        expect(error.message).toBe('Invalid email address format');
        expect(error.suggestion).toContain('valid email address');
      });

      it('should create invalid date error', () => {
        const error = ImportErrorUtils.invalidDate('Projects', 4, 'D', 'Start Date', 'bad-date', 'MM/DD/YYYY');
        
        expect(error.type).toBe('error');
        expect(error.severity).toBe('medium');
        expect(error.category).toBe('format');
        expect(error.field).toBe('Start Date');
        expect(error.currentValue).toBe('bad-date');
        expect(error.expectedValue).toBe('MM/DD/YYYY');
        expect(error.message).toContain('Invalid date format');
      });

      it('should create reference not found warning', () => {
        const error = ImportErrorUtils.referenceNotFound('Projects', 6, 'E', 'Owner', 'John Doe', 'Person');
        
        expect(error.type).toBe('warning');
        expect(error.severity).toBe('medium');
        expect(error.category).toBe('reference');
        expect(error.currentValue).toBe('John Doe');
        expect(error.message).toContain("Person 'John Doe' not found");
        expect(error.suggestion).toContain('exists or will be created');
      });
    });
  });

  describe('ImportProgressTracker', () => {
    let tracker: ImportProgressTracker;
    let mockCallback: ProgressCallback;

    beforeEach(() => {
      mockCallback = {
        onProgress: jest.fn(),
        onPhaseChange: jest.fn(),
        onEstimate: jest.fn(),
        onRowProcessed: jest.fn()
      };
      tracker = new ImportProgressTracker(mockCallback);
    });

    it('should track progress through phases', () => {
      tracker.setTotalOperations(10);
      tracker.startPhase(ImportPhase.PROJECTS, 'Importing projects');
      
      expect(mockCallback.onPhaseChange).toHaveBeenCalledWith(ImportPhase.PROJECTS, 'Importing projects');
      expect(mockCallback.onProgress).toHaveBeenCalled();
    });

    it('should update progress correctly', () => {
      tracker.setTotalOperations(10);
      tracker.completeOperation('Test operation');
      
      expect(mockCallback.onProgress).toHaveBeenCalledWith(10, 100, 'Test operation');
    });

    it('should track row processing', () => {
      // Set total operations so progress can be calculated
      tracker.setTotalOperations(10);
      tracker.updateRowProgress('Projects', 5, 10);
      
      expect(mockCallback.onRowProcessed).toHaveBeenCalledWith('Projects', 5, 10);
      expect(mockCallback.onProgress).toHaveBeenCalledWith(expect.any(Number), 100, 'Processing Projects (row 5/10)');
    });

    it('should calculate time estimates', () => {
      tracker.setTotalOperations(4);
      
      // Simulate some progress with operation names to trigger updateProgress
      tracker.completeOperation('First operation');
      tracker.completeOperation('Second operation');
      
      // Should have called onEstimate with remaining time
      expect(mockCallback.onEstimate).toHaveBeenCalled();
    });

    it('should provide accurate statistics', async () => {
      tracker.setTotalOperations(10);
      tracker.startPhase(ImportPhase.PROJECTS, 'Test phase');
      
      // Add a small delay to ensure elapsedMs > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      
      tracker.completeOperation();
      tracker.completeOperation();
      
      const stats = tracker.getStats();
      
      expect(stats.currentPhase).toBe(ImportPhase.PROJECTS);
      expect(stats.completedOperations).toBe(2);
      expect(stats.totalOperations).toBe(10);
      expect(stats.elapsedMs).toBeGreaterThan(0);
    });

    it('should handle completion correctly', () => {
      tracker.setTotalOperations(5);
      tracker.complete();
      
      const stats = tracker.getStats();
      expect(stats.completedOperations).toBe(stats.totalOperations);
      expect(mockCallback.onEstimate).toHaveBeenCalledWith(0, expect.any(Number));
    });

    it('should work without callback', () => {
      const trackerWithoutCallback = new ImportProgressTracker();
      
      // Should not throw errors
      expect(() => {
        trackerWithoutCallback.setTotalOperations(5);
        trackerWithoutCallback.startPhase(ImportPhase.VALIDATION, 'Test');
        trackerWithoutCallback.updateProgress('Test');
        trackerWithoutCallback.complete();
      }).not.toThrow();
    });
  });
});
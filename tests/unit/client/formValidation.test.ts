/**
 * Tests for form validation utilities
 */

import {
  validateEmail,
  validateDateRange,
  validatePercentage,
  validateAllocation,
  validateHoursPerDay,
  validateRequired,
  validateSelection,
  isValidDateFormat,
  combineErrors,
} from '../../../client/src/utils/formValidation';

describe('formValidation utilities', () => {
  describe('validateEmail', () => {
    it('should return error for empty email when required', () => {
      expect(validateEmail('', true)).toBe('Email is required');
      expect(validateEmail('   ', true)).toBe('Email is required');
      expect(validateEmail(null, true)).toBe('Email is required');
      expect(validateEmail(undefined, true)).toBe('Email is required');
    });

    it('should return undefined for empty email when not required', () => {
      expect(validateEmail('', false)).toBeUndefined();
      expect(validateEmail(null, false)).toBeUndefined();
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid')).toBe('Please enter a valid email address');
      expect(validateEmail('invalid@')).toBe('Please enter a valid email address');
      expect(validateEmail('@example.com')).toBe('Please enter a valid email address');
      expect(validateEmail('no spaces@example.com')).toBe('Please enter a valid email address');
    });

    it('should return undefined for valid email', () => {
      expect(validateEmail('user@example.com')).toBeUndefined();
      expect(validateEmail('user.name@example.com')).toBeUndefined();
      expect(validateEmail('user+tag@example.org')).toBeUndefined();
      expect(validateEmail('user@sub.example.com')).toBeUndefined();
    });
  });

  describe('validateDateRange', () => {
    it('should return errors for required dates when missing', () => {
      const result = validateDateRange('', '', {
        startRequired: true,
        endRequired: true,
      });
      expect(result.start_date).toBe('Start date is required');
      expect(result.end_date).toBe('End date is required');
    });

    it('should return empty object for optional dates when missing', () => {
      const result = validateDateRange('', '', {
        startRequired: false,
        endRequired: false,
      });
      expect(result).toEqual({});
    });

    it('should return error when end date is before start date', () => {
      const result = validateDateRange('2024-12-15', '2024-12-10', {
        startRequired: true,
        endRequired: true,
      });
      expect(result.end_date).toBe('End date must be after start date');
      expect(result.start_date).toBeUndefined();
    });

    it('should return no error when dates are equal', () => {
      const result = validateDateRange('2024-12-15', '2024-12-15', {
        startRequired: true,
        endRequired: true,
      });
      expect(result.end_date).toBeUndefined();
      expect(result.start_date).toBeUndefined();
    });

    it('should return no error when end date is after start date', () => {
      const result = validateDateRange('2024-12-10', '2024-12-15', {
        startRequired: true,
        endRequired: true,
      });
      expect(result.end_date).toBeUndefined();
      expect(result.start_date).toBeUndefined();
    });

    it('should use custom field labels', () => {
      const result = validateDateRange('2024-12-15', '2024-12-10', {
        startRequired: true,
        endRequired: true,
        startFieldLabel: 'Contract start',
        endFieldLabel: 'Contract end',
      });
      expect(result.end_date).toBe('Contract end must be after contract start');
    });

    it('should not validate range if only one date provided', () => {
      const resultStartOnly = validateDateRange('2024-12-15', '', {
        startRequired: false,
        endRequired: false,
      });
      expect(resultStartOnly).toEqual({});

      const resultEndOnly = validateDateRange('', '2024-12-10', {
        startRequired: false,
        endRequired: false,
      });
      expect(resultEndOnly).toEqual({});
    });
  });

  describe('validatePercentage', () => {
    it('should return error when required and empty', () => {
      expect(validatePercentage(null, { required: true, fieldLabel: 'Allocation' }))
        .toBe('Allocation is required');
      expect(validatePercentage(undefined, { required: true }))
        .toBe('Value is required');
    });

    it('should return undefined when not required and empty', () => {
      expect(validatePercentage(null, { required: false })).toBeUndefined();
      expect(validatePercentage('', { required: false })).toBeUndefined();
    });

    it('should return error for invalid number', () => {
      expect(validatePercentage('abc', { fieldLabel: 'Allocation' }))
        .toBe('Allocation must be a valid number');
    });

    it('should return error when below minimum', () => {
      expect(validatePercentage(-5, { min: 0, fieldLabel: 'Allocation' }))
        .toBe('Allocation must be at least 0');
    });

    it('should return error when above maximum', () => {
      expect(validatePercentage(150, { max: 100, fieldLabel: 'Allocation' }))
        .toBe('Allocation must be at most 100');
    });

    it('should return error when zero and allowZero is false', () => {
      expect(validatePercentage(0, { allowZero: false, fieldLabel: 'Allocation' }))
        .toBe('Allocation cannot be zero');
    });

    it('should return undefined when zero and allowZero is true', () => {
      expect(validatePercentage(0, { allowZero: true })).toBeUndefined();
    });

    it('should return undefined for valid percentage', () => {
      expect(validatePercentage(50)).toBeUndefined();
      expect(validatePercentage(0, { allowZero: true })).toBeUndefined();
      expect(validatePercentage(100)).toBeUndefined();
    });

    it('should handle string numbers', () => {
      expect(validatePercentage('50')).toBeUndefined();
      expect(validatePercentage('150', { max: 100, fieldLabel: 'Allocation' }))
        .toBe('Allocation must be at most 100');
    });
  });

  describe('validateAllocation', () => {
    it('should return error for zero allocation', () => {
      expect(validateAllocation(0)).toBe('Allocation cannot be zero');
    });

    it('should return error for allocation over 100', () => {
      expect(validateAllocation(150)).toBe('Allocation must be at most 100');
    });

    it('should return error for negative allocation', () => {
      expect(validateAllocation(-10)).toBe('Allocation must be at least 0');
    });

    it('should return undefined for valid allocation', () => {
      expect(validateAllocation(50)).toBeUndefined();
      expect(validateAllocation(1)).toBeUndefined();
      expect(validateAllocation(100)).toBeUndefined();
    });

    it('should handle required flag', () => {
      expect(validateAllocation(null, true)).toBe('Allocation is required');
      expect(validateAllocation(null, false)).toBeUndefined();
    });
  });

  describe('validateHoursPerDay', () => {
    it('should return error when required and empty', () => {
      expect(validateHoursPerDay(null, true)).toBe('Hours per day is required');
      expect(validateHoursPerDay(undefined, true)).toBe('Hours per day is required');
    });

    it('should return undefined when not required and empty', () => {
      expect(validateHoursPerDay(null, false)).toBeUndefined();
      expect(validateHoursPerDay('', false)).toBeUndefined();
    });

    it('should return error for invalid number', () => {
      expect(validateHoursPerDay('abc')).toBe('Hours per day must be a valid number');
    });

    it('should return error for negative hours', () => {
      expect(validateHoursPerDay(-1)).toBe('Hours per day cannot be negative');
    });

    it('should return error for hours over 24', () => {
      expect(validateHoursPerDay(25)).toBe('Hours per day cannot exceed 24');
    });

    it('should return undefined for valid hours', () => {
      expect(validateHoursPerDay(8)).toBeUndefined();
      expect(validateHoursPerDay(0)).toBeUndefined();
      expect(validateHoursPerDay(24)).toBeUndefined();
      expect(validateHoursPerDay(4.5)).toBeUndefined();
    });
  });

  describe('validateRequired', () => {
    it('should return error for null/undefined', () => {
      expect(validateRequired(null, 'Name')).toBe('Name is required');
      expect(validateRequired(undefined, 'Name')).toBe('Name is required');
    });

    it('should return error for empty string', () => {
      expect(validateRequired('', 'Name')).toBe('Name is required');
      expect(validateRequired('   ', 'Name')).toBe('Name is required');
    });

    it('should return undefined for valid values', () => {
      expect(validateRequired('John', 'Name')).toBeUndefined();
      expect(validateRequired(0, 'Count')).toBeUndefined();
      expect(validateRequired(123, 'ID')).toBeUndefined();
    });
  });

  describe('validateSelection', () => {
    it('should return error for empty selection', () => {
      expect(validateSelection('', 'Project')).toBe('Project is required');
      expect(validateSelection(null, 'Project')).toBe('Project is required');
      expect(validateSelection(undefined, 'Role')).toBe('Role is required');
      expect(validateSelection(0, 'ID')).toBe('ID is required');
    });

    it('should return undefined for valid selection', () => {
      expect(validateSelection('abc-123', 'Project')).toBeUndefined();
      expect(validateSelection(1, 'Role ID')).toBeUndefined();
    });
  });

  describe('isValidDateFormat', () => {
    it('should return false for empty/null values', () => {
      expect(isValidDateFormat('')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(isValidDateFormat('12-15-2024')).toBe(false);
      expect(isValidDateFormat('2024/12/15')).toBe(false);
      expect(isValidDateFormat('Dec 15, 2024')).toBe(false);
    });

    it('should return false for invalid date values', () => {
      expect(isValidDateFormat('2024-13-15')).toBe(false); // Invalid month
      expect(isValidDateFormat('2024-12-32')).toBe(false); // Invalid day
      expect(isValidDateFormat('2024-02-30')).toBe(false); // Invalid day for February
    });

    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateFormat('2024-12-15')).toBe(true);
      expect(isValidDateFormat('2024-01-01')).toBe(true);
      expect(isValidDateFormat('2024-02-29')).toBe(true); // 2024 is a leap year
    });
  });

  describe('combineErrors', () => {
    it('should filter out undefined values', () => {
      const result = combineErrors({
        name: 'Name is required',
        email: undefined,
        phone: undefined,
      });
      expect(result).toEqual({ name: 'Name is required' });
    });

    it('should return empty object when all values are undefined', () => {
      const result = combineErrors({
        name: undefined,
        email: undefined,
      });
      expect(result).toEqual({});
    });

    it('should preserve all defined errors', () => {
      const result = combineErrors({
        name: 'Name is required',
        email: 'Invalid email',
        date: 'Invalid date range',
      });
      expect(result).toEqual({
        name: 'Name is required',
        email: 'Invalid email',
        date: 'Invalid date range',
      });
    });
  });
});

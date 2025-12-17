/**
 * Cross-field Form Validation Utilities
 *
 * Provides reusable validation functions for form inputs including:
 * - Email validation with proper regex
 * - Date range validation (start before end)
 * - Percentage validation (0-100 range)
 * - Required field validation
 *
 * All date validation functions use timezone-safe comparisons
 */

import { isAfterSafe } from './date';

/**
 * Validate email format
 * @param email - Email address to validate
 * @param required - Whether the field is required (default: true)
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(
  email: string | null | undefined,
  required = true
): string | undefined {
  const trimmedEmail = (email ?? '').trim();

  if (!trimmedEmail) {
    return required ? 'Email is required' : undefined;
  }

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return 'Please enter a valid email address';
  }

  return undefined;
}

/**
 * Validate that a date range is valid (start date must be before or equal to end date)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param options - Configuration options
 * @returns Object with potential start_date and end_date errors
 */
export function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  options: {
    startRequired?: boolean;
    endRequired?: boolean;
    startFieldLabel?: string;
    endFieldLabel?: string;
  } = {}
): { start_date?: string; end_date?: string } {
  const {
    startRequired = false,
    endRequired = false,
    startFieldLabel = 'Start date',
    endFieldLabel = 'End date'
  } = options;

  const errors: { start_date?: string; end_date?: string } = {};

  // Check required fields
  if (startRequired && !startDate) {
    errors.start_date = `${startFieldLabel} is required`;
  }

  if (endRequired && !endDate) {
    errors.end_date = `${endFieldLabel} is required`;
  }

  // If both dates are provided, validate the range
  if (startDate && endDate) {
    try {
      if (isAfterSafe(startDate, endDate)) {
        errors.end_date = `${endFieldLabel} must be after ${startFieldLabel.toLowerCase()}`;
      }
    } catch {
      // If date parsing fails, the dates are invalid
      if (startDate && !isValidDateFormat(startDate)) {
        errors.start_date = `${startFieldLabel} has an invalid format`;
      }
      if (endDate && !isValidDateFormat(endDate)) {
        errors.end_date = `${endFieldLabel} has an invalid format`;
      }
    }
  }

  return errors;
}

/**
 * Validate a percentage value is within bounds
 * @param value - The percentage value to validate
 * @param options - Configuration options
 * @returns Error message if invalid, undefined if valid
 */
export function validatePercentage(
  value: number | string | null | undefined,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    fieldLabel?: string;
    allowZero?: boolean;
  } = {}
): string | undefined {
  const {
    min = 0,
    max = 100,
    required = false,
    fieldLabel = 'Value',
    allowZero = true
  } = options;

  // Handle null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return required ? `${fieldLabel} is required` : undefined;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return `${fieldLabel} must be a valid number`;
  }

  if (!allowZero && numValue === 0) {
    return `${fieldLabel} cannot be zero`;
  }

  if (numValue < min) {
    return `${fieldLabel} must be at least ${min}`;
  }

  if (numValue > max) {
    return `${fieldLabel} must be at most ${max}`;
  }

  return undefined;
}

/**
 * Validate allocation percentage (0-100, required for assignments)
 * @param allocation - The allocation percentage
 * @param required - Whether the field is required (default: true)
 * @returns Error message if invalid, undefined if valid
 */
export function validateAllocation(
  allocation: number | string | null | undefined,
  required = true
): string | undefined {
  return validatePercentage(allocation, {
    min: 0,
    max: 100,
    required,
    fieldLabel: 'Allocation',
    allowZero: false
  });
}

/**
 * Validate hours per day value
 * @param hours - The hours value
 * @param required - Whether the field is required (default: false)
 * @returns Error message if invalid, undefined if valid
 */
export function validateHoursPerDay(
  hours: number | string | null | undefined,
  required = false
): string | undefined {
  if (hours === null || hours === undefined || hours === '') {
    return required ? 'Hours per day is required' : undefined;
  }

  const numValue = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (isNaN(numValue)) {
    return 'Hours per day must be a valid number';
  }

  if (numValue < 0) {
    return 'Hours per day cannot be negative';
  }

  if (numValue > 24) {
    return 'Hours per day cannot exceed 24';
  }

  return undefined;
}

/**
 * Validate a required field is not empty
 * @param value - The field value
 * @param fieldLabel - Label for error message
 * @returns Error message if empty, undefined if valid
 */
export function validateRequired(
  value: string | number | null | undefined,
  fieldLabel: string
): string | undefined {
  if (value === null || value === undefined) {
    return `${fieldLabel} is required`;
  }

  if (typeof value === 'string' && !value.trim()) {
    return `${fieldLabel} is required`;
  }

  return undefined;
}

/**
 * Validate a select field has a selection
 * @param value - The selected value
 * @param fieldLabel - Label for error message
 * @returns Error message if no selection, undefined if valid
 */
export function validateSelection(
  value: string | number | null | undefined,
  fieldLabel: string
): string | undefined {
  if (value === null || value === undefined || value === '' || value === 0) {
    return `${fieldLabel} is required`;
  }

  return undefined;
}

/**
 * Check if a date string is in valid YYYY-MM-DD format
 * @param dateString - The date string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;

  // Check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  // Check if it's a valid date
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Combine multiple validation errors into a single errors object
 * Filters out undefined values
 * @param validations - Object of field names to validation results
 * @returns Object with only the fields that have errors
 */
export function combineErrors<T extends Record<string, string | undefined>>(
  validations: T
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const [key, value] of Object.entries(validations)) {
    if (value !== undefined) {
      errors[key as keyof T] = value;
    }
  }

  return errors;
}

/**
 * Server-Side Input Validation Utilities
 *
 * Provides safe parsing and validation functions for API inputs
 * to prevent bugs from improper type coercion and invalid data.
 */

/**
 * Safely parse an integer with proper radix and fallback handling.
 * Always uses radix 10 to avoid octal/hex interpretation issues.
 *
 * @param value - The value to parse (string, number, null, or undefined)
 * @param defaultValue - The fallback value if parsing fails
 * @returns The parsed integer or the default value
 */
export function parseIntSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.floor(value) : defaultValue;
  }

  const trimmed = String(value).trim();
  if (trimmed === '') {
    return defaultValue;
  }

  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a float with fallback handling.
 *
 * @param value - The value to parse
 * @param defaultValue - The fallback value if parsing fails
 * @returns The parsed float or the default value
 */
export function parseFloatSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : defaultValue;
  }

  const trimmed = String(value).trim();
  if (trimmed === '') {
    return defaultValue;
  }

  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse and clamp an integer within a range.
 *
 * @param value - The value to parse
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Fallback if parsing fails
 * @returns The parsed and clamped value
 */
export function parseIntInRange(
  value: string | number | null | undefined,
  min: number,
  max: number,
  defaultValue?: number
): number {
  const parsed = parseIntSafe(value, defaultValue ?? min);
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Parse pagination parameters from request query.
 *
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Parsed and validated pagination parameters
 */
export function parsePagination(
  page: string | number | null | undefined,
  limit: string | number | null | undefined
): { page: number; limit: number; offset: number } {
  const parsedPage = parseIntInRange(page, 1, Number.MAX_SAFE_INTEGER, 1);
  const parsedLimit = parseIntInRange(limit, 1, 1000, 50);
  const offset = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset,
  };
}

/**
 * Validate that a value is a valid positive integer.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validatePositiveInt(
  value: unknown,
  fieldName: string = 'Value'
): { isValid: boolean; value: number; error?: string } {
  const parsed = parseIntSafe(value as string | number | null | undefined, -1);

  if (parsed < 0) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must be a valid positive integer`,
    };
  }

  return { isValid: true, value: parsed };
}

/**
 * Validate a numeric range.
 *
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): { isValid: boolean; error?: string } {
  if (!Number.isFinite(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (value < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be at most ${max}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate a required string field.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string = 'Field'
): { isValid: boolean; value: string; error?: string } {
  if (typeof value !== 'string' || value.trim() === '') {
    return {
      isValid: false,
      value: '',
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true, value: value.trim() };
}

/**
 * Validate an optional string field with max length.
 *
 * @param value - The value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateOptionalString(
  value: unknown,
  maxLength: number = 1000,
  fieldName: string = 'Field'
): { isValid: boolean; value: string | null; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: true, value: null };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  return { isValid: true, value: trimmed || null };
}

/**
 * Validate an enum value.
 *
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateEnum<T extends string | number>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string = 'Value'
): { isValid: boolean; value: T | null; error?: string } {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} is required`,
    };
  }

  if (!allowedValues.includes(value as T)) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { isValid: true, value: value as T };
}

/**
 * Validate an ISO date string.
 *
 * @param value - The date string to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateISODate(
  value: unknown,
  fieldName: string = 'Date'
): { isValid: boolean; value: string | null; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: true, value: null };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  // Check ISO date format: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be in YYYY-MM-DD format`,
    };
  }

  // Validate the date is real
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} is not a valid date`,
    };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validate a UUID string.
 *
 * @param value - The UUID to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateUUID(
  value: unknown,
  fieldName: string = 'ID'
): { isValid: boolean; value: string | null; error?: string } {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} is required`,
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  // UUID v4 pattern (also accepts other versions)
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    )
  ) {
    // Also accept non-UUID IDs that are common in this app
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed) || trimmed.length > 100) {
      return {
        isValid: false,
        value: null,
        error: `${fieldName} must be a valid identifier`,
      };
    }
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validate an email address.
 *
 * @param value - The email to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateEmail(
  value: unknown,
  fieldName: string = 'Email'
): { isValid: boolean; value: string | null; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: true, value: null };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed === '') {
    return { isValid: true, value: null };
  }

  // Basic email pattern
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return {
      isValid: false,
      value: null,
      error: `${fieldName} must be a valid email address`,
    };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Common validation constants.
 */
export const VALIDATION_CONSTANTS = {
  // Allocation percentages
  MIN_ALLOCATION: 0,
  MAX_ALLOCATION: 100,
  DEFAULT_ALLOCATION: 50,

  // Work hours
  MIN_HOURS_PER_DAY: 0,
  MAX_HOURS_PER_DAY: 24,
  DEFAULT_HOURS_PER_DAY: 8,

  // Project priority
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 5,
  DEFAULT_PRIORITY: 3,

  // Pagination
  MIN_PAGE: 1,
  DEFAULT_PAGE: 1,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 50,

  // File size
  MAX_FILE_SIZE: 52428800, // 50MB

  // String lengths
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;

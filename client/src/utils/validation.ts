/**
 * Input Validation Utilities
 *
 * Provides safe parsing and validation functions for form inputs
 * to prevent bugs from improper type coercion and invalid data.
 */

/**
 * Safely parse an integer with proper radix and fallback handling.
 * Always uses radix 10 to avoid octal/hex interpretation issues.
 *
 * @param value - The value to parse (string, number, null, or undefined)
 * @param defaultValue - The fallback value if parsing fails
 * @returns The parsed integer or the default value
 *
 * @example
 * parseIntSafe('42') // 42
 * parseIntSafe('invalid') // 0
 * parseIntSafe('invalid', 10) // 10
 * parseIntSafe(null, 5) // 5
 * parseIntSafe('08') // 8 (not 0 as with octal)
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
 *
 * @example
 * parseFloatSafe('3.14') // 3.14
 * parseFloatSafe('invalid') // 0
 * parseFloatSafe('invalid', 1.5) // 1.5
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
 * Validate that a number is within a specified range.
 *
 * @param value - The value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns An object with isValid flag and the clamped value
 *
 * @example
 * validateNumericRange(50, 0, 100) // { isValid: true, value: 50 }
 * validateNumericRange(150, 0, 100) // { isValid: false, value: 100 }
 * validateNumericRange(-10, 0, 100) // { isValid: false, value: 0 }
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number
): { isValid: boolean; value: number; error?: string } {
  if (!Number.isFinite(value)) {
    return {
      isValid: false,
      value: min,
      error: 'Value must be a valid number',
    };
  }

  if (value < min) {
    return {
      isValid: false,
      value: min,
      error: `Value must be at least ${min}`,
    };
  }

  if (value > max) {
    return {
      isValid: false,
      value: max,
      error: `Value must be at most ${max}`,
    };
  }

  return { isValid: true, value };
}

/**
 * Parse and validate an integer within a range.
 * Combines parseIntSafe and validateNumericRange.
 *
 * @param value - The value to parse
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Fallback if parsing fails
 * @returns The parsed and clamped value
 *
 * @example
 * parseIntInRange('50', 0, 100) // 50
 * parseIntInRange('150', 0, 100) // 100
 * parseIntInRange('invalid', 0, 100, 50) // 50
 */
export function parseIntInRange(
  value: string | number | null | undefined,
  min: number,
  max: number,
  defaultValue?: number
): number {
  const parsed = parseIntSafe(value, defaultValue ?? min);
  const { value: clamped } = validateNumericRange(parsed, min, max);
  return clamped;
}

/**
 * Date format validation patterns.
 */
const DATE_PATTERNS = {
  // ISO 8601 date: YYYY-MM-DD
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
  // ISO 8601 datetime: YYYY-MM-DDTHH:mm:ss
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  // US date: MM/DD/YYYY
  US_DATE: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  // Fiscal week: YYFWNN (e.g., 24FW36)
  FISCAL_WEEK: /^\d{2}FW\d{2}$/,
};

/**
 * Validate a date string format.
 *
 * @param value - The date string to validate
 * @param format - The expected format (default: 'ISO_DATE')
 * @returns Validation result with parsed Date if valid
 *
 * @example
 * validateDateFormat('2024-12-15') // { isValid: true, date: Date, value: '2024-12-15' }
 * validateDateFormat('invalid') // { isValid: false, error: '...' }
 * validateDateFormat('12/15/2024', 'US_DATE') // { isValid: true, ... }
 */
export function validateDateFormat(
  value: string | null | undefined,
  format: keyof typeof DATE_PATTERNS = 'ISO_DATE'
): { isValid: boolean; date?: Date; value?: string; error?: string } {
  if (!value || typeof value !== 'string') {
    return {
      isValid: false,
      error: 'Date value is required',
    };
  }

  const trimmed = value.trim();
  const pattern = DATE_PATTERNS[format];

  if (!pattern.test(trimmed)) {
    return {
      isValid: false,
      error: `Invalid date format. Expected ${format} format.`,
    };
  }

  // Parse and validate the date is real (e.g., not 2024-02-30)
  let date: Date;
  let expectedYear: number;
  let expectedMonth: number;
  let expectedDay: number;

  switch (format) {
    case 'ISO_DATE':
    case 'ISO_DATETIME': {
      // Parse components for validation
      const parts = trimmed.split(/[-T]/);
      expectedYear = parseInt(parts[0], 10);
      expectedMonth = parseInt(parts[1], 10);
      expectedDay = parseInt(parts[2], 10);
      date = new Date(expectedYear, expectedMonth - 1, expectedDay);
      break;
    }
    case 'US_DATE': {
      const [month, day, year] = trimmed.split('/').map((n) => parseInt(n, 10));
      expectedYear = year;
      expectedMonth = month;
      expectedDay = day;
      date = new Date(year, month - 1, day);
      break;
    }
    case 'FISCAL_WEEK':
      // Fiscal week doesn't convert to a specific date easily
      return { isValid: true, value: trimmed };
    default:
      date = new Date(trimmed);
      expectedYear = date.getFullYear();
      expectedMonth = date.getMonth() + 1;
      expectedDay = date.getDate();
  }

  if (Number.isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date value',
    };
  }

  // Verify the date components match (catches invalid dates like Feb 30)
  if (
    date.getFullYear() !== expectedYear ||
    date.getMonth() + 1 !== expectedMonth ||
    date.getDate() !== expectedDay
  ) {
    return {
      isValid: false,
      error: 'Invalid date value (date does not exist)',
    };
  }

  return { isValid: true, date, value: trimmed };
}

/**
 * Validate a date range (start date before end date).
 *
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Validation result
 */
export function validateDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): { isValid: boolean; error?: string } {
  const startValidation = validateDateFormat(startDate);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Start date: ${startValidation.error}` };
  }

  const endValidation = validateDateFormat(endDate);
  if (!endValidation.isValid) {
    return { isValid: false, error: `End date: ${endValidation.error}` };
  }

  if (startValidation.date && endValidation.date) {
    if (startValidation.date > endValidation.date) {
      return {
        isValid: false,
        error: 'Start date must be before or equal to end date',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate an email address format.
 *
 * @param value - The email to validate
 * @returns Validation result
 */
export function validateEmail(
  value: string | null | undefined
): { isValid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = value.trim();
  // Basic email pattern - not overly strict
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Validate that a string is not empty after trimming.
 *
 * @param value - The string to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string = 'Field'
): { isValid: boolean; error?: string } {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Validate string length constraints.
 *
 * @param value - The string to validate
 * @param minLength - Minimum length (default: 0)
 * @param maxLength - Maximum length (default: Infinity)
 * @returns Validation result
 */
export function validateStringLength(
  value: string | null | undefined,
  minLength: number = 0,
  maxLength: number = Infinity
): { isValid: boolean; error?: string } {
  const length = (value || '').length;

  if (length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} characters`,
    };
  }

  if (length > maxLength) {
    return {
      isValid: false,
      error: `Must be at most ${maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate an enum value against allowed values.
 *
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateEnum<T extends string | number>(
  value: T | null | undefined,
  allowedValues: readonly T[],
  fieldName: string = 'Value'
): { isValid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Common validation constants for the application.
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

  // Proficiency level
  MIN_PROFICIENCY: 1,
  MAX_PROFICIENCY: 5,
  DEFAULT_PROFICIENCY: 3,

  // Pagination
  MIN_PAGE: 1,
  DEFAULT_PAGE: 1,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 50,

  // Lag days for dependencies
  MIN_LAG_DAYS: -365,
  MAX_LAG_DAYS: 365,
  DEFAULT_LAG_DAYS: 0,
} as const;

/**
 * Helper to parse allocation percentage with validation.
 */
export function parseAllocation(
  value: string | number | null | undefined
): number {
  return parseIntInRange(
    value,
    VALIDATION_CONSTANTS.MIN_ALLOCATION,
    VALIDATION_CONSTANTS.MAX_ALLOCATION,
    VALIDATION_CONSTANTS.DEFAULT_ALLOCATION
  );
}

/**
 * Helper to parse priority with validation.
 */
export function parsePriority(
  value: string | number | null | undefined
): number {
  return parseIntInRange(
    value,
    VALIDATION_CONSTANTS.MIN_PRIORITY,
    VALIDATION_CONSTANTS.MAX_PRIORITY,
    VALIDATION_CONSTANTS.DEFAULT_PRIORITY
  );
}

/**
 * Helper to parse hours per day with validation.
 */
export function parseHoursPerDay(
  value: string | number | null | undefined
): number {
  return parseIntInRange(
    value,
    VALIDATION_CONSTANTS.MIN_HOURS_PER_DAY,
    VALIDATION_CONSTANTS.MAX_HOURS_PER_DAY,
    VALIDATION_CONSTANTS.DEFAULT_HOURS_PER_DAY
  );
}

/**
 * Helper to parse pagination parameters.
 */
export function parsePagination(
  page: string | number | null | undefined,
  limit: string | number | null | undefined
): { page: number; limit: number } {
  return {
    page: parseIntInRange(
      page,
      VALIDATION_CONSTANTS.MIN_PAGE,
      Infinity,
      VALIDATION_CONSTANTS.DEFAULT_PAGE
    ),
    limit: parseIntInRange(
      limit,
      VALIDATION_CONSTANTS.MIN_PAGE_SIZE,
      VALIDATION_CONSTANTS.MAX_PAGE_SIZE,
      VALIDATION_CONSTANTS.DEFAULT_PAGE_SIZE
    ),
  };
}

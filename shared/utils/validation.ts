/**
 * Input Validation Utilities
 *
 * Provides safe parsing and validation functions for user input.
 * These utilities prevent common JavaScript pitfalls like:
 * - parseInt without radix parameter (can cause octal interpretation)
 * - Type coercion issues with form inputs
 * - Invalid numeric ranges
 *
 * @module shared/utils/validation
 */

/**
 * Result type for validation operations
 */
export interface ValidationResult<T> {
  valid: boolean;
  value: T;
  error?: string;
}

/**
 * Safely parse a string to an integer with explicit radix (base 10)
 *
 * @param value - The value to parse (string, number, null, or undefined)
 * @param defaultValue - The default value to return if parsing fails (default: 0)
 * @returns The parsed integer or the default value
 *
 * @example
 * parseIntSafe('42')        // 42
 * parseIntSafe('42.7')      // 42
 * parseIntSafe('abc', 0)    // 0
 * parseIntSafe(null, -1)    // -1
 * parseIntSafe('08')        // 8 (not octal!)
 */
export function parseIntSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'number') {
    // Use Math.trunc to truncate toward zero (not floor toward negative infinity)
    return Number.isNaN(value) ? defaultValue : Math.trunc(value);
  }

  const trimmed = String(value).trim();
  if (trimmed === '') {
    return defaultValue;
  }

  // Always use radix 10 to prevent octal interpretation
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a string to a float
 *
 * @param value - The value to parse (string, number, null, or undefined)
 * @param defaultValue - The default value to return if parsing fails (default: 0)
 * @returns The parsed float or the default value
 *
 * @example
 * parseFloatSafe('42.5')     // 42.5
 * parseFloatSafe('abc', 0)   // 0
 * parseFloatSafe(null, -1)   // -1
 */
export function parseFloatSafe(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? defaultValue : value;
  }

  const trimmed = String(value).trim();
  if (trimmed === '') {
    return defaultValue;
  }

  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate that a numeric value is within a specified range
 *
 * @param value - The value to validate
 * @param min - The minimum allowed value (inclusive)
 * @param max - The maximum allowed value (inclusive)
 * @returns ValidationResult with the clamped value and any error message
 *
 * @example
 * validateNumericRange(50, 0, 100)   // { valid: true, value: 50 }
 * validateNumericRange(-10, 0, 100)  // { valid: false, value: 0, error: '...' }
 * validateNumericRange(150, 0, 100)  // { valid: false, value: 100, error: '...' }
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number
): ValidationResult<number> {
  if (Number.isNaN(value)) {
    return {
      valid: false,
      value: min,
      error: 'Value must be a valid number',
    };
  }

  if (value < min) {
    return {
      valid: false,
      value: min,
      error: `Value must be at least ${min}`,
    };
  }

  if (value > max) {
    return {
      valid: false,
      value: max,
      error: `Value must be at most ${max}`,
    };
  }

  return {
    valid: true,
    value,
  };
}

/**
 * Validate and parse an integer within a range
 * Combines parseIntSafe and validateNumericRange for common use case
 *
 * @param value - The value to parse and validate
 * @param min - The minimum allowed value (inclusive)
 * @param max - The maximum allowed value (inclusive)
 * @param defaultValue - The default value if parsing fails (defaults to min)
 * @returns ValidationResult with the parsed and clamped value
 *
 * @example
 * validateIntInRange('50', 0, 100)    // { valid: true, value: 50 }
 * validateIntInRange('abc', 0, 100)   // { valid: false, value: 0, error: '...' }
 * validateIntInRange('150', 0, 100)   // { valid: false, value: 100, error: '...' }
 */
export function validateIntInRange(
  value: string | number | null | undefined,
  min: number,
  max: number,
  defaultValue?: number
): ValidationResult<number> {
  const parsed = parseIntSafe(value, defaultValue ?? min);

  // Check if the value was actually a valid number
  const originalStr = String(value ?? '').trim();
  const wasValidNumber =
    value !== null &&
    value !== undefined &&
    originalStr !== '' &&
    !Number.isNaN(parseInt(originalStr, 10));

  if (!wasValidNumber && value !== null && value !== undefined && originalStr !== '') {
    return {
      valid: false,
      value: defaultValue ?? min,
      error: 'Value must be a valid number',
    };
  }

  return validateNumericRange(parsed, min, max);
}

/**
 * Common date format regex patterns
 */
const DATE_PATTERNS = {
  // ISO 8601 date: YYYY-MM-DD
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
  // ISO 8601 datetime: YYYY-MM-DDTHH:mm:ss
  ISO_DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  // US format: MM/DD/YYYY
  US_DATE: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  // Fiscal week format: YYFWnn (e.g., 24FW36)
  FISCAL_WEEK: /^\d{2}FW\d{2}$/,
  // Fiscal week range: YYFWnn-YYFWnn (e.g., 24FW36-25FW11)
  FISCAL_WEEK_RANGE: /^\d{2}FW\d{2}-\d{2}FW\d{2}$/,
};

/**
 * Supported date format types
 */
export type DateFormatType =
  | 'ISO_DATE'
  | 'ISO_DATETIME'
  | 'US_DATE'
  | 'FISCAL_WEEK'
  | 'FISCAL_WEEK_RANGE';

/**
 * Validate that a string matches a specific date format
 *
 * @param value - The date string to validate
 * @param format - The expected date format (default: 'ISO_DATE')
 * @returns ValidationResult with the original string value
 *
 * @example
 * validateDateFormat('2024-01-15')            // { valid: true, value: '2024-01-15' }
 * validateDateFormat('24FW36', 'FISCAL_WEEK') // { valid: true, value: '24FW36' }
 * validateDateFormat('invalid')               // { valid: false, value: 'invalid', error: '...' }
 */
export function validateDateFormat(
  value: string | null | undefined,
  format: DateFormatType = 'ISO_DATE'
): ValidationResult<string> {
  if (value === null || value === undefined || value.trim() === '') {
    return {
      valid: false,
      value: '',
      error: 'Date value is required',
    };
  }

  const trimmed = value.trim();
  const pattern = DATE_PATTERNS[format];

  if (!pattern.test(trimmed)) {
    const formatExamples: Record<DateFormatType, string> = {
      ISO_DATE: 'YYYY-MM-DD (e.g., 2024-01-15)',
      ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss (e.g., 2024-01-15T10:30:00)',
      US_DATE: 'MM/DD/YYYY (e.g., 01/15/2024)',
      FISCAL_WEEK: 'YYFW## (e.g., 24FW36)',
      FISCAL_WEEK_RANGE: 'YYFW##-YYFW## (e.g., 24FW36-25FW11)',
    };

    return {
      valid: false,
      value: trimmed,
      error: `Invalid date format. Expected: ${formatExamples[format]}`,
    };
  }

  // Additional validation for actual date validity (ISO dates)
  if (format === 'ISO_DATE') {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return {
        valid: false,
        value: trimmed,
        error: 'Invalid date value',
      };
    }
  }

  return {
    valid: true,
    value: trimmed,
  };
}

/**
 * Validate that a string is not empty
 *
 * @param value - The string to validate
 * @param fieldName - The name of the field for error messages (default: 'Value')
 * @returns ValidationResult with the trimmed string value
 *
 * @example
 * validateRequired('hello')         // { valid: true, value: 'hello' }
 * validateRequired('  ')            // { valid: false, value: '', error: '...' }
 * validateRequired(null, 'Name')    // { valid: false, value: '', error: 'Name is required' }
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string = 'Value'
): ValidationResult<string> {
  if (value === null || value === undefined) {
    return {
      valid: false,
      value: '',
      error: `${fieldName} is required`,
    };
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return {
      valid: false,
      value: '',
      error: `${fieldName} is required`,
    };
  }

  return {
    valid: true,
    value: trimmed,
  };
}

/**
 * Validate string length
 *
 * @param value - The string to validate
 * @param minLength - Minimum length (default: 0)
 * @param maxLength - Maximum length (default: Infinity)
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult with the original string value
 *
 * @example
 * validateStringLength('hello', 1, 10)      // { valid: true, value: 'hello' }
 * validateStringLength('hi', 5, 10)         // { valid: false, value: 'hi', error: '...' }
 */
export function validateStringLength(
  value: string | null | undefined,
  minLength: number = 0,
  maxLength: number = Infinity,
  fieldName: string = 'Value'
): ValidationResult<string> {
  const str = value ?? '';

  if (str.length < minLength) {
    return {
      valid: false,
      value: str,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (str.length > maxLength) {
    return {
      valid: false,
      value: str,
      error: `${fieldName} must be at most ${maxLength} characters`,
    };
  }

  return {
    valid: true,
    value: str,
  };
}

/**
 * Validate email format
 *
 * @param value - The email string to validate
 * @returns ValidationResult with the trimmed email value
 *
 * @example
 * validateEmail('user@example.com')  // { valid: true, value: 'user@example.com' }
 * validateEmail('invalid-email')     // { valid: false, value: 'invalid-email', error: '...' }
 */
export function validateEmail(
  value: string | null | undefined
): ValidationResult<string> {
  if (value === null || value === undefined) {
    return {
      valid: false,
      value: '',
      error: 'Email is required',
    };
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return {
      valid: false,
      value: '',
      error: 'Email is required',
    };
  }

  // Basic email regex - not overly strict
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return {
      valid: false,
      value: trimmed,
      error: 'Invalid email format',
    };
  }

  return {
    valid: true,
    value: trimmed,
  };
}

/**
 * Validate allocation percentage (0-100)
 *
 * @param value - The allocation value to validate
 * @returns ValidationResult with the parsed and clamped percentage
 *
 * @example
 * validateAllocationPercentage('50')   // { valid: true, value: 50 }
 * validateAllocationPercentage('150')  // { valid: false, value: 100, error: '...' }
 * validateAllocationPercentage('-10')  // { valid: false, value: 0, error: '...' }
 */
export function validateAllocationPercentage(
  value: string | number | null | undefined
): ValidationResult<number> {
  return validateIntInRange(value, 0, 100);
}

/**
 * Validate priority value (typically 1-5 or 1-10)
 *
 * @param value - The priority value to validate
 * @param maxPriority - Maximum priority value (default: 5)
 * @returns ValidationResult with the parsed and clamped priority
 *
 * @example
 * validatePriority('3')       // { valid: true, value: 3 }
 * validatePriority('0')       // { valid: false, value: 1, error: '...' }
 * validatePriority('10', 5)   // { valid: false, value: 5, error: '...' }
 */
export function validatePriority(
  value: string | number | null | undefined,
  maxPriority: number = 5
): ValidationResult<number> {
  return validateIntInRange(value, 1, maxPriority);
}

/**
 * Coerce a value to boolean safely
 *
 * @param value - The value to coerce
 * @param defaultValue - Default value if input is null/undefined (default: false)
 * @returns The boolean value
 *
 * @example
 * toBooleanSafe(true)      // true
 * toBooleanSafe('true')    // true
 * toBooleanSafe('1')       // true
 * toBooleanSafe(1)         // true
 * toBooleanSafe('false')   // false
 * toBooleanSafe('0')       // false
 * toBooleanSafe(null)      // false
 */
export function toBooleanSafe(
  value: unknown,
  defaultValue: boolean = false
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }

  return Boolean(value);
}

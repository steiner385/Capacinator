/**
 * Form Validation Utilities
 *
 * Cross-field validation utilities for forms throughout the application.
 * These validators return either true (valid) or an error message string (invalid).
 */

/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid, error message if invalid
 */
export const validateEmail = (email: string): true | string => {
  if (!email) return 'Email is required';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }

  return true;
};

/**
 * Validates a date range (start < end)
 * @param startDate - Start date string (ISO format or empty)
 * @param endDate - End date string (ISO format or empty)
 * @param allowEmpty - Whether to allow both dates to be empty (default: true)
 * @returns true if valid, error message if invalid
 */
export const validateDateRange = (
  startDate: string,
  endDate: string,
  allowEmpty = true
): true | string => {
  // If both are empty and allowed, it's valid
  if (!startDate && !endDate && allowEmpty) {
    return true;
  }

  // If only one is provided, it's invalid
  if ((!startDate && endDate) || (startDate && !endDate)) {
    return 'Both start and end dates are required together';
  }

  // Parse and compare dates
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid date format';
    }

    if (start >= end) {
      return 'End date must be after start date';
    }
  }

  return true;
};

/**
 * Validates allocation percentage (0-100)
 * @param percentage - Allocation percentage value
 * @returns true if valid, error message if invalid
 */
export const validateAllocationPercentage = (
  percentage: number | string
): true | string => {
  const value = typeof percentage === 'string' ? parseFloat(percentage) : percentage;

  if (isNaN(value)) {
    return 'Allocation percentage must be a number';
  }

  if (value <= 0 || value > 100) {
    return 'Allocation percentage must be between 1 and 100';
  }

  return true;
};

/**
 * Validates hours per day (1-24)
 * @param hours - Hours per day value
 * @returns true if valid, error message if invalid
 */
export const validateHoursPerDay = (hours: number | string): true | string => {
  const value = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (isNaN(value)) {
    return 'Hours per day must be a number';
  }

  if (value <= 0 || value > 24) {
    return 'Hours per day must be between 0 and 24';
  }

  return true;
};

/**
 * Validates availability percentage (0-100)
 * @param percentage - Availability percentage value
 * @returns true if valid, error message if invalid
 */
export const validateAvailabilityPercentage = (
  percentage: number | string
): true | string => {
  const value = typeof percentage === 'string' ? parseFloat(percentage) : percentage;

  if (isNaN(value)) {
    return 'Availability percentage must be a number';
  }

  if (value < 0 || value > 100) {
    return 'Availability percentage must be between 0 and 100';
  }

  return true;
};

/**
 * Validates a name/text field (non-empty, not just whitespace)
 * @param name - Name/text to validate
 * @param fieldName - Display name of the field for error messages
 * @param maxLength - Maximum allowed length (optional)
 * @returns true if valid, error message if invalid
 */
export const validateName = (
  name: string,
  fieldName = 'Name',
  maxLength?: number
): true | string => {
  if (!name || !name.trim()) {
    return `${fieldName} is required`;
  }

  if (maxLength && name.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }

  return true;
};

/**
 * Validates project type name
 * @param name - Project type name
 * @returns true if valid, error message if invalid
 */
export const validateProjectTypeName = (name: string): true | string => {
  return validateName(name, 'Project type name', 100);
};

/**
 * Validates that a required field is selected
 * @param value - Selected value (should be non-empty)
 * @param fieldName - Display name of the field
 * @returns true if valid, error message if invalid
 */
export const validateRequired = (value: string, fieldName = 'Field'): true | string => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return true;
};

/**
 * Combined validator for date range fields in forms
 * Returns object with field-level errors
 */
export const validateDateRangeFields = (
  startDate: string,
  endDate: string,
  fieldNameStart = 'Start date',
  fieldNameEnd = 'End date'
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Check for partial completion
  if ((startDate && !endDate) || (!startDate && endDate)) {
    errors.start_date = `${fieldNameStart} and ${fieldNameEnd} must both be provided`;
    errors.end_date = `${fieldNameStart} and ${fieldNameEnd} must both be provided`;
    return errors;
  }

  // If both provided, check range
  if (startDate && endDate) {
    const rangeError = validateDateRange(startDate, endDate, false);
    if (rangeError !== true) {
      errors.end_date = rangeError;
    }
  }

  return errors;
};

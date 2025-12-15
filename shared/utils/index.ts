/**
 * Shared Utilities
 *
 * This module provides utility functions shared between frontend and backend.
 */

// Validation utilities
export {
  parseIntSafe,
  parseFloatSafe,
  validateNumericRange,
  validateIntInRange,
  validateDateFormat,
  validateRequired,
  validateStringLength,
  validateEmail,
  validateAllocationPercentage,
  validatePriority,
  toBooleanSafe,
  type ValidationResult,
  type DateFormatType,
} from './validation.js';

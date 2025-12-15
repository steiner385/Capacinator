import { describe, it, expect } from '@jest/globals';
import {
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
} from '../validation';

describe('Validation Utilities', () => {
  describe('parseIntSafe', () => {
    it('should parse valid integer strings', () => {
      expect(parseIntSafe('42')).toBe(42);
      expect(parseIntSafe('0')).toBe(0);
      expect(parseIntSafe('-10')).toBe(-10);
      expect(parseIntSafe('  123  ')).toBe(123);
    });

    it('should handle leading zeros without octal interpretation', () => {
      expect(parseIntSafe('08')).toBe(8);
      expect(parseIntSafe('09')).toBe(9);
      expect(parseIntSafe('010')).toBe(10);
    });

    it('should truncate float strings to integers', () => {
      expect(parseIntSafe('42.7')).toBe(42);
      expect(parseIntSafe('42.9')).toBe(42);
      expect(parseIntSafe('-42.9')).toBe(-42);
    });

    it('should handle numeric input', () => {
      expect(parseIntSafe(42)).toBe(42);
      expect(parseIntSafe(42.7)).toBe(42);
      // Math.trunc truncates toward zero
      expect(parseIntSafe(-42.7)).toBe(-42);
    });

    it('should return default value for invalid input', () => {
      expect(parseIntSafe('abc')).toBe(0);
      expect(parseIntSafe('abc', 99)).toBe(99);
      expect(parseIntSafe('')).toBe(0);
      expect(parseIntSafe('', -1)).toBe(-1);
    });

    it('should return default value for null/undefined', () => {
      expect(parseIntSafe(null)).toBe(0);
      expect(parseIntSafe(undefined)).toBe(0);
      expect(parseIntSafe(null, 99)).toBe(99);
      expect(parseIntSafe(undefined, -1)).toBe(-1);
    });

    it('should return default value for NaN', () => {
      expect(parseIntSafe(NaN)).toBe(0);
      expect(parseIntSafe(NaN, 99)).toBe(99);
    });
  });

  describe('parseFloatSafe', () => {
    it('should parse valid float strings', () => {
      expect(parseFloatSafe('42.5')).toBe(42.5);
      expect(parseFloatSafe('0.1')).toBe(0.1);
      expect(parseFloatSafe('-10.5')).toBe(-10.5);
      expect(parseFloatSafe('  3.14  ')).toBe(3.14);
    });

    it('should handle integer strings', () => {
      expect(parseFloatSafe('42')).toBe(42);
      expect(parseFloatSafe('0')).toBe(0);
    });

    it('should handle numeric input', () => {
      expect(parseFloatSafe(42.5)).toBe(42.5);
      expect(parseFloatSafe(42)).toBe(42);
    });

    it('should return default value for invalid input', () => {
      expect(parseFloatSafe('abc')).toBe(0);
      expect(parseFloatSafe('abc', 99)).toBe(99);
      expect(parseFloatSafe('')).toBe(0);
    });

    it('should return default value for null/undefined/NaN', () => {
      expect(parseFloatSafe(null)).toBe(0);
      expect(parseFloatSafe(undefined)).toBe(0);
      expect(parseFloatSafe(NaN, 99)).toBe(99);
    });
  });

  describe('validateNumericRange', () => {
    it('should validate values within range', () => {
      const result = validateNumericRange(50, 0, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(50);
      expect(result.error).toBeUndefined();
    });

    it('should validate boundary values', () => {
      expect(validateNumericRange(0, 0, 100).valid).toBe(true);
      expect(validateNumericRange(100, 0, 100).valid).toBe(true);
    });

    it('should clamp values below minimum', () => {
      const result = validateNumericRange(-10, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(0);
      expect(result.error).toContain('at least 0');
    });

    it('should clamp values above maximum', () => {
      const result = validateNumericRange(150, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(100);
      expect(result.error).toContain('at most 100');
    });

    it('should handle NaN', () => {
      const result = validateNumericRange(NaN, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(0);
      expect(result.error).toContain('valid number');
    });
  });

  describe('validateIntInRange', () => {
    it('should parse and validate valid integer strings', () => {
      const result = validateIntInRange('50', 0, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(50);
    });

    it('should handle invalid number strings', () => {
      const result = validateIntInRange('abc', 0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid number');
    });

    it('should clamp out-of-range values', () => {
      const belowMin = validateIntInRange('-10', 0, 100);
      expect(belowMin.valid).toBe(false);
      expect(belowMin.value).toBe(0);

      const aboveMax = validateIntInRange('150', 0, 100);
      expect(aboveMax.valid).toBe(false);
      expect(aboveMax.value).toBe(100);
    });

    it('should use custom default value', () => {
      const result = validateIntInRange(null, 0, 100, 50);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(50);
    });
  });

  describe('validateDateFormat', () => {
    it('should validate ISO date format', () => {
      const result = validateDateFormat('2024-01-15');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('2024-01-15');
    });

    it('should reject invalid ISO date format', () => {
      const result = validateDateFormat('2024/01/15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should validate fiscal week format', () => {
      const result = validateDateFormat('24FW36', 'FISCAL_WEEK');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('24FW36');
    });

    it('should validate fiscal week range format', () => {
      const result = validateDateFormat('24FW36-25FW11', 'FISCAL_WEEK_RANGE');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('24FW36-25FW11');
    });

    it('should reject empty/null values', () => {
      expect(validateDateFormat('').valid).toBe(false);
      expect(validateDateFormat(null).valid).toBe(false);
      expect(validateDateFormat(undefined).valid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateDateFormat('  2024-01-15  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('2024-01-15');
    });
  });

  describe('validateRequired', () => {
    it('should pass for non-empty strings', () => {
      const result = validateRequired('hello');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should fail for empty strings', () => {
      expect(validateRequired('').valid).toBe(false);
      expect(validateRequired('   ').valid).toBe(false);
    });

    it('should fail for null/undefined', () => {
      expect(validateRequired(null).valid).toBe(false);
      expect(validateRequired(undefined).valid).toBe(false);
    });

    it('should include field name in error message', () => {
      const result = validateRequired('', 'Username');
      expect(result.error).toBe('Username is required');
    });

    it('should trim whitespace from value', () => {
      const result = validateRequired('  hello  ');
      expect(result.value).toBe('hello');
    });
  });

  describe('validateStringLength', () => {
    it('should pass for valid length strings', () => {
      const result = validateStringLength('hello', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should fail for strings below minimum length', () => {
      const result = validateStringLength('hi', 5, 10, 'Name');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5 characters');
    });

    it('should fail for strings above maximum length', () => {
      const result = validateStringLength('this is too long', 1, 10, 'Name');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 10 characters');
    });

    it('should handle null/undefined as empty string', () => {
      const result = validateStringLength(null, 0, 10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should pass for valid email addresses', () => {
      expect(validateEmail('user@example.com').valid).toBe(true);
      expect(validateEmail('user.name@example.co.uk').valid).toBe(true);
      expect(validateEmail('user+tag@example.org').valid).toBe(true);
    });

    it('should fail for invalid email addresses', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('invalid@').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
    });

    it('should fail for empty/null values', () => {
      expect(validateEmail('').valid).toBe(false);
      expect(validateEmail(null).valid).toBe(false);
      expect(validateEmail(undefined).valid).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = validateEmail('  user@example.com  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });
  });

  describe('validateAllocationPercentage', () => {
    it('should validate percentages within 0-100', () => {
      expect(validateAllocationPercentage(50).valid).toBe(true);
      expect(validateAllocationPercentage(0).valid).toBe(true);
      expect(validateAllocationPercentage(100).valid).toBe(true);
    });

    it('should clamp invalid percentages', () => {
      const belowMin = validateAllocationPercentage(-10);
      expect(belowMin.valid).toBe(false);
      expect(belowMin.value).toBe(0);

      const aboveMax = validateAllocationPercentage(150);
      expect(aboveMax.valid).toBe(false);
      expect(aboveMax.value).toBe(100);
    });

    it('should parse string percentages', () => {
      expect(validateAllocationPercentage('50').valid).toBe(true);
      expect(validateAllocationPercentage('50').value).toBe(50);
    });
  });

  describe('validatePriority', () => {
    it('should validate priorities within 1-5 by default', () => {
      expect(validatePriority(1).valid).toBe(true);
      expect(validatePriority(3).valid).toBe(true);
      expect(validatePriority(5).valid).toBe(true);
    });

    it('should reject priorities outside range', () => {
      const belowMin = validatePriority(0);
      expect(belowMin.valid).toBe(false);
      expect(belowMin.value).toBe(1);

      const aboveMax = validatePriority(10);
      expect(aboveMax.valid).toBe(false);
      expect(aboveMax.value).toBe(5);
    });

    it('should support custom max priority', () => {
      const result = validatePriority(8, 10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(8);
    });
  });

  describe('toBooleanSafe', () => {
    it('should return boolean values as-is', () => {
      expect(toBooleanSafe(true)).toBe(true);
      expect(toBooleanSafe(false)).toBe(false);
    });

    it('should convert truthy string values', () => {
      expect(toBooleanSafe('true')).toBe(true);
      expect(toBooleanSafe('TRUE')).toBe(true);
      expect(toBooleanSafe('True')).toBe(true);
      expect(toBooleanSafe('1')).toBe(true);
      expect(toBooleanSafe('yes')).toBe(true);
      expect(toBooleanSafe('YES')).toBe(true);
    });

    it('should convert falsy string values', () => {
      expect(toBooleanSafe('false')).toBe(false);
      expect(toBooleanSafe('0')).toBe(false);
      expect(toBooleanSafe('no')).toBe(false);
      expect(toBooleanSafe('')).toBe(false);
    });

    it('should convert numeric values', () => {
      expect(toBooleanSafe(1)).toBe(true);
      expect(toBooleanSafe(42)).toBe(true);
      expect(toBooleanSafe(0)).toBe(false);
    });

    it('should return default for null/undefined', () => {
      expect(toBooleanSafe(null)).toBe(false);
      expect(toBooleanSafe(undefined)).toBe(false);
      expect(toBooleanSafe(null, true)).toBe(true);
      expect(toBooleanSafe(undefined, true)).toBe(true);
    });
  });
});

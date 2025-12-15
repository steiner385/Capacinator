/**
 * Numeric Boundary Edge Case Tests
 *
 * Tests for edge cases involving numeric handling:
 * - Allocation percentage = 0
 * - Allocation percentage > 100 (should reject or clamp)
 * - Negative durations
 * - Very large numbers (overflow)
 * - Floating point precision issues
 * - Integer overflow
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseIntSafe,
  parseFloatSafe,
  validateNumericRange,
  validateIntInRange,
  validateAllocationPercentage,
  validatePriority,
} from '../../../../shared/utils/validation';

describe('Numeric Boundary Edge Cases', () => {
  describe('Allocation Percentage Boundaries', () => {
    it('should accept allocation = 0%', () => {
      const result = validateAllocationPercentage(0);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should accept allocation = 100%', () => {
      const result = validateAllocationPercentage(100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(100);
    });

    it('should reject allocation > 100% with clamping', () => {
      const result = validateAllocationPercentage(150);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(100); // Clamped to max
      expect(result.error).toContain('at most 100');
    });

    it('should reject negative allocation with clamping', () => {
      const result = validateAllocationPercentage(-10);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(0); // Clamped to min
      expect(result.error).toContain('at least 0');
    });

    it('should reject extremely large allocation values', () => {
      const result = validateAllocationPercentage(1000000);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(100);
    });

    it('should handle floating point percentages by truncating', () => {
      // Input as string should truncate to integer
      const result = validateAllocationPercentage('50.7');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(50);
    });

    it('should handle NaN allocation', () => {
      const result = validateAllocationPercentage(NaN);
      expect(result.valid).toBe(false);
    });

    it('should handle Infinity allocation', () => {
      const result = validateAllocationPercentage(Infinity);
      expect(result.valid).toBe(false);
    });

    it('should handle negative Infinity allocation', () => {
      const result = validateAllocationPercentage(-Infinity);
      expect(result.valid).toBe(false);
    });
  });

  describe('Duration Edge Cases', () => {
    it('should handle zero duration', () => {
      const duration = parseIntSafe('0');
      expect(duration).toBe(0);
    });

    it('should reject negative duration input', () => {
      const result = validateIntInRange('-5', 0, 1000);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(0);
    });

    it('should handle very large duration', () => {
      // 10 years in hours = 87,600
      const result = validateIntInRange('87600', 0, 100000);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(87600);
    });

    it('should handle duration as decimal truncated to integer', () => {
      const result = parseIntSafe('8.5');
      expect(result).toBe(8);
    });
  });

  describe('Large Number Overflow', () => {
    it('should handle Number.MAX_SAFE_INTEGER', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      expect(maxSafe).toBe(9007199254740991);

      const result = parseIntSafe(maxSafe);
      expect(result).toBe(maxSafe);
    });

    it('should handle numbers beyond MAX_SAFE_INTEGER', () => {
      const beyondMaxSafe = Number.MAX_SAFE_INTEGER + 1;
      // Beyond MAX_SAFE_INTEGER, precision is lost
      expect(beyondMaxSafe).toBe(Number.MAX_SAFE_INTEGER + 1);

      // Addition loses precision
      const unsafeResult = Number.MAX_SAFE_INTEGER + 100;
      expect(unsafeResult - Number.MAX_SAFE_INTEGER).not.toBe(100);
    });

    it('should handle Number.MIN_SAFE_INTEGER', () => {
      const minSafe = Number.MIN_SAFE_INTEGER;
      expect(minSafe).toBe(-9007199254740991);

      const result = parseIntSafe(minSafe);
      expect(result).toBe(minSafe);
    });

    it('should handle Number.MAX_VALUE', () => {
      const maxValue = Number.MAX_VALUE;
      // parseIntSafe truncates, which won't work well for this
      expect(maxValue).toBeGreaterThan(1e308);
      expect(Number.isFinite(maxValue)).toBe(true);
    });

    it('should handle Number.MIN_VALUE (smallest positive)', () => {
      const minValue = Number.MIN_VALUE;
      expect(minValue).toBeGreaterThan(0);
      expect(minValue).toBeLessThan(1e-300);

      // parseInt truncates to 0
      expect(parseIntSafe(minValue)).toBe(0);
    });

    it('should detect overflow in multiplication', () => {
      const largeValue = 1e308;
      const result = largeValue * 10;
      expect(result).toBe(Infinity);
      expect(Number.isFinite(result)).toBe(false);
    });

    it('should detect underflow in division', () => {
      const tinyValue = 1e-308;
      const result = tinyValue / 1e10;
      // Very small but not necessarily zero
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1e-300);
    });
  });

  describe('Floating Point Precision Issues', () => {
    it('should handle classic 0.1 + 0.2 !== 0.3 issue', () => {
      const sum = 0.1 + 0.2;
      // Classic JavaScript floating point issue
      expect(sum).not.toBe(0.3);
      expect(Math.abs(sum - 0.3)).toBeLessThan(Number.EPSILON * 10);
    });

    it('should handle percentage calculations that lose precision', () => {
      // 33.33% of 100 = 33.33
      const percentage = 33.33;
      const total = 100;
      const result = (percentage / 100) * total;

      expect(result).toBeCloseTo(33.33, 10);
    });

    it('should handle very small percentages', () => {
      const tinyPercent = 0.0001;
      const result = validateAllocationPercentage(tinyPercent);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(0); // Truncated to integer
    });

    it('should handle repeating decimal percentages', () => {
      // 1/3 = 0.333...
      const oneThird = 1 / 3;
      const asPercent = oneThird * 100;

      // Should truncate properly
      const result = parseIntSafe(asPercent);
      expect(result).toBe(33);
    });

    it('should handle currency-like calculations', () => {
      // Common issue: $19.99 * 100 cents should = 1999 cents
      const price = 19.99;
      const cents = Math.round(price * 100);
      expect(cents).toBe(1999);
    });
  });

  describe('Priority Range Boundaries', () => {
    it('should accept priority = 1 (minimum)', () => {
      const result = validatePriority(1);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(1);
    });

    it('should accept priority = 5 (default maximum)', () => {
      const result = validatePriority(5);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should reject priority = 0 with clamping to 1', () => {
      const result = validatePriority(0);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(1);
    });

    it('should reject priority > max with clamping', () => {
      const result = validatePriority(10); // default max is 5
      expect(result.valid).toBe(false);
      expect(result.value).toBe(5);
    });

    it('should handle custom max priority of 10', () => {
      const result = validatePriority(10, 10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should reject priority beyond custom max', () => {
      const result = validatePriority(15, 10);
      expect(result.valid).toBe(false);
      expect(result.value).toBe(10);
    });
  });

  describe('Integer Parsing Edge Cases', () => {
    it('should handle leading zeros without octal interpretation', () => {
      expect(parseIntSafe('08')).toBe(8);
      expect(parseIntSafe('09')).toBe(9);
      expect(parseIntSafe('007')).toBe(7);
      expect(parseIntSafe('0100')).toBe(100);
    });

    it('should handle scientific notation strings', () => {
      expect(parseIntSafe('1e3')).toBe(1); // Only parses up to 'e'
      expect(parseFloatSafe('1e3')).toBe(1000);
      expect(parseFloatSafe('1.5e2')).toBe(150);
    });

    it('should handle hex string (should NOT parse as hex)', () => {
      // With radix 10, '0xff' should not be treated as hex
      expect(parseIntSafe('0xff')).toBe(0); // Parses only '0'
      expect(parseIntSafe('0xA')).toBe(0);
    });

    it('should handle binary-like string', () => {
      // Should NOT interpret as binary
      expect(parseIntSafe('0b101')).toBe(0); // Parses only '0'
    });

    it('should handle string with units', () => {
      // parseInt stops at first non-numeric character
      expect(parseIntSafe('100px')).toBe(100);
      expect(parseIntSafe('50%')).toBe(50);
      expect(parseIntSafe('10.5em')).toBe(10);
    });

    it('should handle empty and whitespace strings', () => {
      expect(parseIntSafe('')).toBe(0);
      expect(parseIntSafe('   ')).toBe(0);
      expect(parseIntSafe('\t\n')).toBe(0);
    });

    it('should handle special numeric values', () => {
      expect(parseIntSafe('NaN')).toBe(0);
      expect(parseIntSafe('Infinity')).toBe(0);
      expect(parseIntSafe('-Infinity')).toBe(0);
    });
  });

  describe('Validation Range Edge Cases', () => {
    it('should handle equal min and max', () => {
      const result = validateNumericRange(5, 5, 5);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(5);

      const belowResult = validateNumericRange(4, 5, 5);
      expect(belowResult.valid).toBe(false);

      const aboveResult = validateNumericRange(6, 5, 5);
      expect(aboveResult.valid).toBe(false);
    });

    it('should handle negative range', () => {
      const result = validateNumericRange(-5, -10, -1);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(-5);
    });

    it('should handle range spanning zero', () => {
      const result = validateNumericRange(0, -10, 10);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(0);
    });

    it('should handle very large range', () => {
      const result = validateNumericRange(
        1000000,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Arithmetic Overflow in Calculations', () => {
    it('should detect multiplication overflow', () => {
      const large = 1e200;
      const result = large * large;
      expect(result).toBe(Infinity);
    });

    it('should detect addition overflow', () => {
      const result = Number.MAX_VALUE + Number.MAX_VALUE;
      expect(result).toBe(Infinity);
    });

    it('should handle subtraction near zero', () => {
      const a = 0.1 + 0.2;
      const b = 0.3;
      const diff = Math.abs(a - b);
      expect(diff).toBeLessThan(1e-15);
    });

    it('should handle division by zero', () => {
      expect(1 / 0).toBe(Infinity);
      expect(-1 / 0).toBe(-Infinity);
      expect(0 / 0).toBeNaN();
    });

    it('should handle modulo with zero', () => {
      expect(10 % 0).toBeNaN();
    });
  });
});

import {
  parseIntSafe,
  parseFloatSafe,
  validateNumericRange,
  parseIntInRange,
  validateDateFormat,
  validateDateRange,
  validateEmail,
  validateRequired,
  validateStringLength,
  validateEnum,
  parseAllocation,
  parsePriority,
  parseHoursPerDay,
  parsePagination,
  VALIDATION_CONSTANTS,
} from '../validation';

describe('parseIntSafe', () => {
  it('should parse valid integer strings', () => {
    expect(parseIntSafe('42')).toBe(42);
    expect(parseIntSafe('0')).toBe(0);
    expect(parseIntSafe('-10')).toBe(-10);
    expect(parseIntSafe('  123  ')).toBe(123);
  });

  it('should use radix 10 (not octal)', () => {
    // Without radix, "08" could be parsed as 0 (octal)
    expect(parseIntSafe('08')).toBe(8);
    expect(parseIntSafe('09')).toBe(9);
    expect(parseIntSafe('010')).toBe(10);
  });

  it('should return default for invalid inputs', () => {
    expect(parseIntSafe('invalid')).toBe(0);
    expect(parseIntSafe('invalid', 5)).toBe(5);
    expect(parseIntSafe('')).toBe(0);
    expect(parseIntSafe('   ', 10)).toBe(10);
  });

  it('should handle null and undefined', () => {
    expect(parseIntSafe(null)).toBe(0);
    expect(parseIntSafe(undefined)).toBe(0);
    expect(parseIntSafe(null, 99)).toBe(99);
  });

  it('should handle number inputs', () => {
    expect(parseIntSafe(42)).toBe(42);
    expect(parseIntSafe(3.14)).toBe(3);
    expect(parseIntSafe(NaN, 5)).toBe(5);
    expect(parseIntSafe(Infinity, 5)).toBe(5);
  });

  it('should handle mixed inputs', () => {
    expect(parseIntSafe('3.14')).toBe(3);
    expect(parseIntSafe('123abc')).toBe(123);
  });
});

describe('parseFloatSafe', () => {
  it('should parse valid float strings', () => {
    expect(parseFloatSafe('3.14')).toBe(3.14);
    expect(parseFloatSafe('0.5')).toBe(0.5);
    expect(parseFloatSafe('-1.5')).toBe(-1.5);
  });

  it('should return default for invalid inputs', () => {
    expect(parseFloatSafe('invalid')).toBe(0);
    expect(parseFloatSafe('invalid', 1.5)).toBe(1.5);
    expect(parseFloatSafe('')).toBe(0);
  });

  it('should handle null and undefined', () => {
    expect(parseFloatSafe(null)).toBe(0);
    expect(parseFloatSafe(undefined, 2.5)).toBe(2.5);
  });

  it('should handle number inputs', () => {
    expect(parseFloatSafe(3.14)).toBe(3.14);
    expect(parseFloatSafe(NaN, 5)).toBe(5);
  });
});

describe('validateNumericRange', () => {
  it('should validate values within range', () => {
    const result = validateNumericRange(50, 0, 100);
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(50);
  });

  it('should clamp values below minimum', () => {
    const result = validateNumericRange(-10, 0, 100);
    expect(result.isValid).toBe(false);
    expect(result.value).toBe(0);
    expect(result.error).toContain('at least 0');
  });

  it('should clamp values above maximum', () => {
    const result = validateNumericRange(150, 0, 100);
    expect(result.isValid).toBe(false);
    expect(result.value).toBe(100);
    expect(result.error).toContain('at most 100');
  });

  it('should handle edge cases', () => {
    expect(validateNumericRange(0, 0, 100).isValid).toBe(true);
    expect(validateNumericRange(100, 0, 100).isValid).toBe(true);
    expect(validateNumericRange(NaN, 0, 100).isValid).toBe(false);
  });
});

describe('parseIntInRange', () => {
  it('should parse and clamp values', () => {
    expect(parseIntInRange('50', 0, 100)).toBe(50);
    expect(parseIntInRange('150', 0, 100)).toBe(100);
    expect(parseIntInRange('-10', 0, 100)).toBe(0);
  });

  it('should use default for invalid input', () => {
    expect(parseIntInRange('invalid', 0, 100, 50)).toBe(50);
    expect(parseIntInRange(null, 0, 100)).toBe(0);
  });
});

describe('validateDateFormat', () => {
  it('should validate ISO date format', () => {
    const result = validateDateFormat('2024-12-15');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('2024-12-15');
    expect(result.date).toBeInstanceOf(Date);
  });

  it('should reject invalid format', () => {
    const result = validateDateFormat('12/15/2024');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid date format');
  });

  it('should reject invalid dates', () => {
    const result = validateDateFormat('2024-02-30');
    expect(result.isValid).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(validateDateFormat(null).isValid).toBe(false);
    expect(validateDateFormat(undefined).isValid).toBe(false);
  });

  it('should validate US date format', () => {
    const result = validateDateFormat('12/15/2024', 'US_DATE');
    expect(result.isValid).toBe(true);
  });

  it('should validate fiscal week format', () => {
    const result = validateDateFormat('24FW36', 'FISCAL_WEEK');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('24FW36');
  });
});

describe('validateDateRange', () => {
  it('should validate valid date ranges', () => {
    const result = validateDateRange('2024-01-01', '2024-12-31');
    expect(result.isValid).toBe(true);
  });

  it('should validate same start and end date', () => {
    const result = validateDateRange('2024-06-15', '2024-06-15');
    expect(result.isValid).toBe(true);
  });

  it('should reject end before start', () => {
    const result = validateDateRange('2024-12-31', '2024-01-01');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('before or equal');
  });

  it('should reject invalid dates', () => {
    expect(validateDateRange('invalid', '2024-01-01').isValid).toBe(false);
    expect(validateDateRange('2024-01-01', 'invalid').isValid).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should validate valid emails', () => {
    expect(validateEmail('test@example.com').isValid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').isValid).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid').isValid).toBe(false);
    expect(validateEmail('test@').isValid).toBe(false);
    expect(validateEmail('@example.com').isValid).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(validateEmail(null).isValid).toBe(false);
    expect(validateEmail(undefined).isValid).toBe(false);
  });
});

describe('validateRequired', () => {
  it('should validate non-empty strings', () => {
    expect(validateRequired('test').isValid).toBe(true);
    expect(validateRequired('  valid  ').isValid).toBe(true);
  });

  it('should reject empty strings', () => {
    expect(validateRequired('').isValid).toBe(false);
    expect(validateRequired('   ').isValid).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(validateRequired(null).isValid).toBe(false);
    expect(validateRequired(undefined).isValid).toBe(false);
  });

  it('should include field name in error', () => {
    const result = validateRequired('', 'Username');
    expect(result.error).toContain('Username');
  });
});

describe('validateStringLength', () => {
  it('should validate within length constraints', () => {
    expect(validateStringLength('test', 1, 10).isValid).toBe(true);
  });

  it('should reject too short strings', () => {
    const result = validateStringLength('ab', 3, 10);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least 3');
  });

  it('should reject too long strings', () => {
    const result = validateStringLength('this is too long', 1, 5);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at most 5');
  });
});

describe('validateEnum', () => {
  const allowedValues = ['active', 'inactive', 'pending'] as const;

  it('should validate allowed values', () => {
    expect(validateEnum('active', allowedValues).isValid).toBe(true);
    expect(validateEnum('inactive', allowedValues).isValid).toBe(true);
  });

  it('should reject invalid values', () => {
    const result = validateEnum('unknown', allowedValues);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be one of');
  });

  it('should handle null and undefined', () => {
    expect(validateEnum(null, allowedValues).isValid).toBe(false);
    expect(validateEnum(undefined, allowedValues).isValid).toBe(false);
  });
});

describe('Helper functions', () => {
  describe('parseAllocation', () => {
    it('should parse and clamp allocation', () => {
      expect(parseAllocation('50')).toBe(50);
      expect(parseAllocation('150')).toBe(100);
      expect(parseAllocation('-10')).toBe(0);
      expect(parseAllocation('invalid')).toBe(50); // default
    });
  });

  describe('parsePriority', () => {
    it('should parse and clamp priority', () => {
      expect(parsePriority('3')).toBe(3);
      expect(parsePriority('10')).toBe(5);
      expect(parsePriority('0')).toBe(1);
      expect(parsePriority('invalid')).toBe(3); // default
    });
  });

  describe('parseHoursPerDay', () => {
    it('should parse and clamp hours', () => {
      expect(parseHoursPerDay('8')).toBe(8);
      expect(parseHoursPerDay('30')).toBe(24);
      expect(parseHoursPerDay('-1')).toBe(0);
      expect(parseHoursPerDay('invalid')).toBe(8); // default
    });
  });

  describe('parsePagination', () => {
    it('should parse pagination parameters', () => {
      const result = parsePagination('2', '25');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('should use defaults for invalid input', () => {
      const result = parsePagination(null, null);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should clamp values', () => {
      const result = parsePagination('0', '5000');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1000);
    });
  });
});

describe('VALIDATION_CONSTANTS', () => {
  it('should have expected allocation values', () => {
    expect(VALIDATION_CONSTANTS.MIN_ALLOCATION).toBe(0);
    expect(VALIDATION_CONSTANTS.MAX_ALLOCATION).toBe(100);
    expect(VALIDATION_CONSTANTS.DEFAULT_ALLOCATION).toBe(50);
  });

  it('should have expected priority values', () => {
    expect(VALIDATION_CONSTANTS.MIN_PRIORITY).toBe(1);
    expect(VALIDATION_CONSTANTS.MAX_PRIORITY).toBe(5);
    expect(VALIDATION_CONSTANTS.DEFAULT_PRIORITY).toBe(3);
  });

  it('should have expected pagination values', () => {
    expect(VALIDATION_CONSTANTS.DEFAULT_PAGE).toBe(1);
    expect(VALIDATION_CONSTANTS.DEFAULT_PAGE_SIZE).toBe(50);
    expect(VALIDATION_CONSTANTS.MAX_PAGE_SIZE).toBe(1000);
  });
});

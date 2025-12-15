/**
 * String Boundary Edge Case Tests
 *
 * Tests for edge cases involving string handling:
 * - Empty strings
 * - Very long strings (255+, 1000+, 10000+ chars)
 * - Special characters in names
 * - Unicode and emoji handling
 * - SQL injection patterns (for safety)
 * - HTML/XSS patterns (for safety)
 * - Whitespace edge cases
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateRequired,
  validateStringLength,
  validateEmail,
} from '../../../../shared/utils/validation';

describe('String Boundary Edge Cases', () => {
  describe('Empty String Handling', () => {
    it('should reject empty string for required fields', () => {
      const result = validateRequired('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject whitespace-only string for required fields', () => {
      const result = validateRequired('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject null for required fields', () => {
      const result = validateRequired(null);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined for required fields', () => {
      const result = validateRequired(undefined);
      expect(result.valid).toBe(false);
    });

    it('should handle empty string for optional length validation', () => {
      const result = validateStringLength('', 0, 100);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('');
    });

    it('should fail empty string when minimum length > 0', () => {
      const result = validateStringLength('', 1, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1');
    });
  });

  describe('Very Long Strings (255+ chars)', () => {
    const string255 = 'a'.repeat(255);
    const string256 = 'a'.repeat(256);
    const string1000 = 'a'.repeat(1000);
    const string10000 = 'a'.repeat(10000);

    it('should accept 255 character string within limit', () => {
      const result = validateStringLength(string255, 0, 255);
      expect(result.valid).toBe(true);
      expect(result.value.length).toBe(255);
    });

    it('should reject 256 character string when max is 255', () => {
      const result = validateStringLength(string256, 0, 255);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 255');
    });

    it('should accept 1000 character string within limit', () => {
      const result = validateStringLength(string1000, 0, 1000);
      expect(result.valid).toBe(true);
      expect(result.value.length).toBe(1000);
    });

    it('should reject 1001 character string when max is 1000', () => {
      const string1001 = 'a'.repeat(1001);
      const result = validateStringLength(string1001, 0, 1000);
      expect(result.valid).toBe(false);
    });

    it('should handle 10000 character string', () => {
      const result = validateStringLength(string10000, 0, 10000);
      expect(result.valid).toBe(true);
      expect(result.value.length).toBe(10000);
    });

    it('should handle exact boundary (length == max)', () => {
      const exactString = 'x'.repeat(100);
      const result = validateStringLength(exactString, 0, 100);
      expect(result.valid).toBe(true);
    });

    it('should handle exact boundary (length == min)', () => {
      const exactString = 'x'.repeat(10);
      const result = validateStringLength(exactString, 10, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('Special Characters in Names', () => {
    it('should accept names with apostrophes', () => {
      const name = "O'Connor";
      const result = validateRequired(name);
      expect(result.valid).toBe(true);
      expect(result.value).toBe("O'Connor");
    });

    it('should accept names with hyphens', () => {
      const name = 'Mary-Jane';
      const result = validateRequired(name);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Mary-Jane');
    });

    it('should accept names with periods', () => {
      const name = 'Dr. Smith Jr.';
      const result = validateRequired(name);
      expect(result.valid).toBe(true);
    });

    it('should accept names with accented characters', () => {
      const names = ['José', 'François', 'Müller', 'Björk', 'Søren'];
      names.forEach((name) => {
        const result = validateRequired(name);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(name);
      });
    });

    it('should accept names with Asian characters', () => {
      const names = ['田中', '김철수', '山田太郎'];
      names.forEach((name) => {
        const result = validateRequired(name);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept names with Cyrillic characters', () => {
      const name = 'Иванов';
      const result = validateRequired(name);
      expect(result.valid).toBe(true);
    });

    it('should accept names with Arabic characters', () => {
      const name = 'محمد';
      const result = validateRequired(name);
      expect(result.valid).toBe(true);
    });
  });

  describe('Unicode and Emoji Handling', () => {
    it('should count emoji as characters (may be multiple code units)', () => {
      const emoji = '😀';
      // Emoji are typically 2 code units in JavaScript (surrogate pairs)
      expect(emoji.length).toBe(2);

      const result = validateStringLength(emoji, 0, 10);
      expect(result.valid).toBe(true);
    });

    it('should handle string with mixed emoji and text', () => {
      const mixed = 'Hello 👋 World 🌍';
      const result = validateRequired(mixed);
      expect(result.valid).toBe(true);
    });

    it('should handle combined emoji (family, skin tones)', () => {
      // Combined emoji can be many code units
      const familyEmoji = '👨‍👩‍👧‍👦';
      expect(familyEmoji.length).toBeGreaterThan(1);

      const result = validateStringLength(familyEmoji, 0, 50);
      expect(result.valid).toBe(true);
    });

    it('should handle zero-width characters', () => {
      const zeroWidth = 'a\u200Bb'; // Zero-width space
      expect(zeroWidth.length).toBe(3);

      const result = validateRequired(zeroWidth);
      expect(result.valid).toBe(true);
    });

    it('should handle right-to-left text markers', () => {
      const rtlText = '\u200Fמזל טוב'; // RTL mark + Hebrew
      const result = validateRequired(rtlText);
      expect(result.valid).toBe(true);
    });

    it('should handle mathematical symbols', () => {
      const math = '∑∏∫√∞≠≈';
      const result = validateRequired(math);
      expect(result.valid).toBe(true);
    });
  });

  describe('SQL Injection Pattern Safety', () => {
    // These tests verify that dangerous patterns are handled
    // (not that validation prevents SQL injection - that's parameterized queries)

    it('should handle strings with SQL keywords', () => {
      const sqlString = "SELECT * FROM users; DROP TABLE users;--";
      const result = validateRequired(sqlString);
      // Validation should pass - SQL injection prevention is at DB layer
      expect(result.valid).toBe(true);
      expect(result.value).toBe(sqlString);
    });

    it('should handle strings with single quotes', () => {
      const quoted = "Robert'); DROP TABLE Students;--";
      const result = validateRequired(quoted);
      expect(result.valid).toBe(true);
    });

    it('should handle strings with escaped quotes', () => {
      const escaped = "O\\'Brien";
      const result = validateRequired(escaped);
      expect(result.valid).toBe(true);
    });

    it('should handle UNION-based injection patterns', () => {
      const union = "' UNION SELECT username, password FROM users--";
      const result = validateRequired(union);
      expect(result.valid).toBe(true);
    });
  });

  describe('HTML/XSS Pattern Safety', () => {
    it('should handle strings with HTML tags', () => {
      const html = '<script>alert("XSS")</script>';
      const result = validateRequired(html);
      expect(result.valid).toBe(true);
      // The value should be preserved - XSS prevention is at rendering layer
      expect(result.value).toBe(html);
    });

    it('should handle strings with event handlers', () => {
      const eventHandler = '<img src="x" onerror="alert(1)">';
      const result = validateRequired(eventHandler);
      expect(result.valid).toBe(true);
    });

    it('should handle strings with HTML entities', () => {
      const entities = '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;';
      const result = validateRequired(entities);
      expect(result.valid).toBe(true);
    });

    it('should handle strings with javascript: protocol', () => {
      const jsProtocol = 'javascript:alert(1)';
      const result = validateRequired(jsProtocol);
      expect(result.valid).toBe(true);
    });
  });

  describe('Whitespace Edge Cases', () => {
    it('should trim leading whitespace', () => {
      const result = validateRequired('   hello');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should trim trailing whitespace', () => {
      const result = validateRequired('hello   ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should preserve internal whitespace', () => {
      const result = validateRequired('hello   world');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello   world');
    });

    it('should handle tab characters', () => {
      const result = validateRequired('\thello\tworld\t');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello\tworld');
    });

    it('should handle newline characters', () => {
      const result = validateRequired('\nhello\nworld\n');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello\nworld');
    });

    it('should handle carriage return', () => {
      const result = validateRequired('\r\nhello\r\n');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should handle mixed whitespace', () => {
      const result = validateRequired(' \t\n\r hello \t\n\r ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should count length after trimming for required validation', () => {
      const result = validateRequired('     '); // Only spaces
      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation Edge Cases', () => {
    it('should accept standard email format', () => {
      expect(validateEmail('user@example.com').valid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      expect(validateEmail('user+tag@example.com').valid).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(validateEmail('user@mail.example.com').valid).toBe(true);
    });

    it('should accept email with numbers', () => {
      expect(validateEmail('user123@example123.com').valid).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      expect(validateEmail('first.last@example.com').valid).toBe(true);
    });

    it('should reject email without @', () => {
      expect(validateEmail('userexample.com').valid).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('user@').valid).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(validateEmail('@example.com').valid).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(validateEmail('user @example.com').valid).toBe(false);
      expect(validateEmail('user@ example.com').valid).toBe(false);
    });

    it('should reject double @ symbol', () => {
      expect(validateEmail('user@@example.com').valid).toBe(false);
    });

    it('should handle very long email addresses', () => {
      const longLocal = 'a'.repeat(64);
      const longDomain = 'b'.repeat(63) + '.com';
      const longEmail = `${longLocal}@${longDomain}`;
      // This tests if the validation handles long emails without crashing
      const result = validateEmail(longEmail);
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('Control Characters', () => {
    it('should handle null character in string', () => {
      const nullChar = 'hello\x00world';
      const result = validateRequired(nullChar);
      expect(result.valid).toBe(true);
      // String with null char should be preserved
      expect(result.value).toContain('\x00');
    });

    it('should handle backspace character', () => {
      const backspace = 'hello\x08world';
      const result = validateRequired(backspace);
      expect(result.valid).toBe(true);
    });

    it('should handle form feed character', () => {
      const formFeed = 'hello\fworld';
      const result = validateRequired(formFeed);
      expect(result.valid).toBe(true);
    });

    it('should handle escape character', () => {
      const escape = 'hello\x1Bworld';
      const result = validateRequired(escape);
      expect(result.valid).toBe(true);
    });

    it('should handle bell character', () => {
      const bell = 'hello\x07world';
      const result = validateRequired(bell);
      expect(result.valid).toBe(true);
    });
  });

  describe('String Length Edge Cases', () => {
    it('should handle length validation with min = 0 and max = 0', () => {
      const result = validateStringLength('', 0, 0);
      expect(result.valid).toBe(true);

      const nonEmpty = validateStringLength('a', 0, 0);
      expect(nonEmpty.valid).toBe(false);
    });

    it('should handle length validation with min = max', () => {
      const exact = validateStringLength('hello', 5, 5);
      expect(exact.valid).toBe(true);

      const shorter = validateStringLength('hi', 5, 5);
      expect(shorter.valid).toBe(false);

      const longer = validateStringLength('hello world', 5, 5);
      expect(longer.valid).toBe(false);
    });

    it('should handle very large max length', () => {
      const result = validateStringLength('hello', 0, Number.MAX_SAFE_INTEGER);
      expect(result.valid).toBe(true);
    });

    it('should handle Infinity as max length', () => {
      const result = validateStringLength('hello', 0, Infinity);
      expect(result.valid).toBe(true);
    });

    it('should handle multi-byte characters in length', () => {
      // Chinese characters are single code units in JS
      const chinese = '你好世界';
      expect(chinese.length).toBe(4);

      const result = validateStringLength(chinese, 0, 4);
      expect(result.valid).toBe(true);

      const tooLong = validateStringLength(chinese, 0, 3);
      expect(tooLong.valid).toBe(false);
    });
  });

  describe('Path Traversal Pattern Safety', () => {
    it('should handle path traversal patterns', () => {
      const traversal = '../../../etc/passwd';
      const result = validateRequired(traversal);
      // Validation passes - path traversal prevention is at file handling layer
      expect(result.valid).toBe(true);
    });

    it('should handle Windows path traversal', () => {
      const windowsPath = '..\\..\\..\\windows\\system32';
      const result = validateRequired(windowsPath);
      expect(result.valid).toBe(true);
    });

    it('should handle URL-encoded traversal', () => {
      const encoded = '%2e%2e%2f%2e%2e%2f';
      const result = validateRequired(encoded);
      expect(result.valid).toBe(true);
    });
  });

  describe('JSON String Patterns', () => {
    it('should handle JSON-like strings', () => {
      const json = '{"key": "value", "number": 123}';
      const result = validateRequired(json);
      expect(result.valid).toBe(true);
    });

    it('should handle nested JSON', () => {
      const nested = '{"outer": {"inner": {"deep": "value"}}}';
      const result = validateRequired(nested);
      expect(result.valid).toBe(true);
    });

    it('should handle JSON with escaped characters', () => {
      const escaped = '{"message": "Hello\\nWorld\\t!"}';
      const result = validateRequired(escaped);
      expect(result.valid).toBe(true);
    });

    it('should handle malformed JSON strings', () => {
      const malformed = '{"key": "missing quote}';
      const result = validateRequired(malformed);
      // Validation just checks if non-empty, not JSON validity
      expect(result.valid).toBe(true);
    });
  });
});

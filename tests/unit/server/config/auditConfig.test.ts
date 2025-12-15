import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { getAuditConfig, isAuditEnabled, isTableAudited } from '../../../../src/server/config/auditConfig';
import { resetEnv } from '../../../../src/server/config/index';

describe('Audit Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset the cached config before each test
    resetEnv();
    // Reset process.env to original values
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetEnv();
  });

  describe('getAuditConfig', () => {
    test('should return default configuration when env vars not set', () => {
      delete process.env.AUDIT_MAX_HISTORY_ENTRIES;
      delete process.env.AUDIT_RETENTION_DAYS;
      delete process.env.AUDIT_SENSITIVE_FIELDS;
      delete process.env.AUDIT_ENABLED_TABLES;
      resetEnv();

      const config = getAuditConfig();

      expect(config).toEqual({
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password', 'token', 'secret', 'key', 'hash'],
        enabledTables: ['people', 'projects', 'roles', 'assignments', 'availability']
      });
    });

    test('should parse environment variables correctly', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '500';
      process.env.AUDIT_RETENTION_DAYS = '30';
      process.env.AUDIT_SENSITIVE_FIELDS = 'password,secret,apiKey';
      process.env.AUDIT_ENABLED_TABLES = 'users,orders,products';
      resetEnv();

      const config = getAuditConfig();

      expect(config).toEqual({
        maxHistoryEntries: 500,
        retentionDays: 30,
        sensitiveFields: ['password', 'secret', 'apiKey'],
        enabledTables: ['users', 'orders', 'products']
      });
    });

    test('should handle whitespace in comma-separated values', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = ' password , token , secret ';
      process.env.AUDIT_ENABLED_TABLES = ' people , projects , roles ';
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['password', 'token', 'secret']);
      expect(config.enabledTables).toEqual(['people', 'projects', 'roles']);
    });

    test('should handle empty comma-separated values by filtering them out', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'password,,token,';
      process.env.AUDIT_ENABLED_TABLES = ',people,,projects,';
      resetEnv();

      const config = getAuditConfig();

      // The new implementation filters out empty strings
      expect(config.sensitiveFields).toEqual(['password', 'token']);
      expect(config.enabledTables).toEqual(['people', 'projects']);
    });

    test('should throw error for invalid maxHistoryEntries', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '0';
      resetEnv();

      expect(() => getAuditConfig()).toThrow('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
    });

    test('should throw error for negative maxHistoryEntries', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '-5';
      resetEnv();

      expect(() => getAuditConfig()).toThrow('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
    });

    test('should throw error for invalid retentionDays', () => {
      process.env.AUDIT_RETENTION_DAYS = '0';
      resetEnv();

      expect(() => getAuditConfig()).toThrow('AUDIT_RETENTION_DAYS must be at least 1');
    });

    test('should throw error for negative retentionDays', () => {
      process.env.AUDIT_RETENTION_DAYS = '-10';
      resetEnv();

      expect(() => getAuditConfig()).toThrow('AUDIT_RETENTION_DAYS must be at least 1');
    });

    test('should use defaults when enabledTables is empty', () => {
      process.env.AUDIT_ENABLED_TABLES = '';
      resetEnv();

      const config = getAuditConfig();
      // Empty string triggers using defaults
      expect(config.enabledTables).toEqual(['people', 'projects', 'roles', 'assignments', 'availability']);
    });

    test('should use defaults for non-numeric environment variables', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = 'invalid';
      process.env.AUDIT_RETENTION_DAYS = 'also-invalid';
      resetEnv();

      const config = getAuditConfig();

      // The new implementation uses defaults for invalid values
      expect(config.maxHistoryEntries).toBe(1000);
      expect(config.retentionDays).toBe(365);
    });

    test('should handle very large numeric values', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '999999999';
      process.env.AUDIT_RETENTION_DAYS = '999999999';
      resetEnv();

      const config = getAuditConfig();

      expect(config.maxHistoryEntries).toBe(999999999);
      expect(config.retentionDays).toBe(999999999);
    });

    test('should truncate floating point numbers to integers', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '100.5';
      process.env.AUDIT_RETENTION_DAYS = '30.7';
      resetEnv();

      const config = getAuditConfig();

      // parseInt truncates to integer
      expect(config.maxHistoryEntries).toBe(100);
      expect(config.retentionDays).toBe(30);
    });

    test('should handle special characters in field names', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'password,user-token,api_key,oauth.secret';
      process.env.AUDIT_ENABLED_TABLES = 'user-profiles,project_data,role.permissions';
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['password', 'user-token', 'api_key', 'oauth.secret']);
      expect(config.enabledTables).toEqual(['user-profiles', 'project_data', 'role.permissions']);
    });
  });

  describe('isAuditEnabled', () => {
    test('should return true when AUDIT_ENABLED is "true"', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      resetEnv();
      expect(isAuditEnabled()).toBe(true);
    });

    test('should return false when AUDIT_ENABLED is "false"', () => {
      process.env.AUDIT_ENABLED = 'false';
      process.env.NODE_ENV = 'development';
      resetEnv();
      expect(isAuditEnabled()).toBe(false);
    });

    test('should return false when AUDIT_ENABLED is not set', () => {
      delete process.env.AUDIT_ENABLED;
      process.env.NODE_ENV = 'development';
      resetEnv();
      expect(isAuditEnabled()).toBe(false);
    });

    test('should return true when NODE_ENV is e2e regardless of AUDIT_ENABLED', () => {
      process.env.AUDIT_ENABLED = 'false';
      process.env.NODE_ENV = 'e2e';
      resetEnv();
      expect(isAuditEnabled()).toBe(true);
    });

    test('should handle various AUDIT_ENABLED values', () => {
      // The centralized config uses toLowerCase() so TRUE/True work as expected
      const testCases = [
        { value: 'TRUE', expected: true }, // Lowercase comparison
        { value: 'True', expected: true }, // Lowercase comparison
        { value: 'yes', expected: false },
        { value: '1', expected: false },
        { value: 'true', expected: true },
      ];

      for (const { value, expected } of testCases) {
        process.env.AUDIT_ENABLED = value;
        process.env.NODE_ENV = 'development';
        resetEnv();
        expect(isAuditEnabled()).toBe(expected);
      }
    });
  });

  describe('isTableAudited', () => {
    test('should return false when audit is disabled', () => {
      process.env.AUDIT_ENABLED = 'false';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';
      resetEnv();

      expect(isTableAudited('people')).toBe(false);
      expect(isTableAudited('projects')).toBe(false);
    });

    test('should return true for tables in enabled list when audit is enabled', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects,roles';
      resetEnv();

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('projects')).toBe(true);
      expect(isTableAudited('roles')).toBe(true);
    });

    test('should return false for tables not in enabled list', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';
      resetEnv();

      expect(isTableAudited('roles')).toBe(false);
      expect(isTableAudited('unknown_table')).toBe(false);
    });

    test('should be case sensitive for table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'people,Projects';
      resetEnv();

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('PEOPLE')).toBe(false);
      expect(isTableAudited('Projects')).toBe(true);
      expect(isTableAudited('projects')).toBe(false);
    });

    test('should handle whitespace in table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = ' people , projects ';
      resetEnv();

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('projects')).toBe(true);
      expect(isTableAudited(' people ')).toBe(false); // Exact match required
    });

    test('should handle empty string table name', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';
      resetEnv();

      expect(isTableAudited('')).toBe(false);
    });

    test('should handle special characters in table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      process.env.AUDIT_ENABLED_TABLES = 'user-profiles,project_data,role.permissions';
      resetEnv();

      expect(isTableAudited('user-profiles')).toBe(true);
      expect(isTableAudited('project_data')).toBe(true);
      expect(isTableAudited('role.permissions')).toBe(true);
    });
  });

  describe('Configuration Security', () => {
    test('should not expose sensitive configuration through errors', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'super_secret_field,admin_password';
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '0'; // This will cause an error
      resetEnv();

      try {
        getAuditConfig();
        fail('Expected error to be thrown');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain('super_secret_field');
        expect(errorMessage).not.toContain('admin_password');
      }
    });

    test('should handle potentially malicious input in environment variables', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = '<script>alert("xss")</script>';
      process.env.AUDIT_ENABLED_TABLES = '"; DROP TABLE users; --';
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['<script>alert("xss")</script>']);
      expect(config.enabledTables).toEqual(['"; DROP TABLE users; --']);
    });

    test('should handle extremely long configuration values', () => {
      const longValue = 'a'.repeat(10000);
      process.env.AUDIT_SENSITIVE_FIELDS = longValue;
      process.env.AUDIT_ENABLED_TABLES = longValue;
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual([longValue]);
      expect(config.enabledTables).toEqual([longValue]);
    });

    test('should handle unicode characters in configuration', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'пароль,密码,パスワード,🔑';
      process.env.AUDIT_ENABLED_TABLES = 'пользователи,用户,ユーザー,👥';
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['пароль', '密码', 'パスワード', '🔑']);
      expect(config.enabledTables).toEqual(['пользователи', '用户', 'ユーザー', '👥']);
    });
  });

  describe('Edge Cases', () => {
    test('should use cached configuration for multiple calls', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '100';
      resetEnv();
      const config1 = getAuditConfig();

      // Change env without resetting - should return cached value
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '200';
      const config2 = getAuditConfig();

      // Both should have the same value since config is cached
      expect(config1.maxHistoryEntries).toBe(100);
      expect(config2.maxHistoryEntries).toBe(100);
    });

    test('should handle configuration refresh with resetEnv', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '100';
      resetEnv();
      const config1 = getAuditConfig();

      process.env.AUDIT_MAX_HISTORY_ENTRIES = '200';
      resetEnv();
      const config2 = getAuditConfig();

      // After resetEnv, should reflect new environment variables
      expect(config1.maxHistoryEntries).toBe(100);
      expect(config2.maxHistoryEntries).toBe(200);
    });

    test('should handle extremely large comma-separated lists', () => {
      const largeSensitiveFields = Array.from({ length: 1000 }, (_, i) => `field${i}`).join(',');
      const largeEnabledTables = Array.from({ length: 1000 }, (_, i) => `table${i}`).join(',');

      process.env.AUDIT_SENSITIVE_FIELDS = largeSensitiveFields;
      process.env.AUDIT_ENABLED_TABLES = largeEnabledTables;
      resetEnv();

      const config = getAuditConfig();

      expect(config.sensitiveFields.length).toBe(1000);
      expect(config.enabledTables.length).toBe(1000);
      expect(config.sensitiveFields[0]).toBe('field0');
      expect(config.sensitiveFields[999]).toBe('field999');
    });
  });
});

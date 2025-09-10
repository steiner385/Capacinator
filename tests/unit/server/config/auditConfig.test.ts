import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

import { getAuditConfig, isAuditEnabled, isTableAudited } from '../../../../src/server/config/auditConfig';

describe('Audit Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAuditConfig', () => {
    test('should return default configuration when env vars not set', () => {
      delete process.env.AUDIT_MAX_HISTORY_ENTRIES;
      delete process.env.AUDIT_RETENTION_DAYS;
      delete process.env.AUDIT_SENSITIVE_FIELDS;
      delete process.env.AUDIT_ENABLED_TABLES;

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

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['password', 'token', 'secret']);
      expect(config.enabledTables).toEqual(['people', 'projects', 'roles']);
    });

    test('should handle empty comma-separated values', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'password,,token,';
      process.env.AUDIT_ENABLED_TABLES = ',people,,projects,';

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['password', '', 'token', '']);
      expect(config.enabledTables).toEqual(['', 'people', '', 'projects', '']);
    });

    test('should throw error for invalid maxHistoryEntries', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '0';

      expect(() => getAuditConfig()).toThrow('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
    });

    test('should throw error for negative maxHistoryEntries', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '-5';

      expect(() => getAuditConfig()).toThrow('AUDIT_MAX_HISTORY_ENTRIES must be at least 1');
    });

    test('should throw error for invalid retentionDays', () => {
      process.env.AUDIT_RETENTION_DAYS = '0';

      expect(() => getAuditConfig()).toThrow('AUDIT_RETENTION_DAYS must be at least 1');
    });

    test('should throw error for negative retentionDays', () => {
      process.env.AUDIT_RETENTION_DAYS = '-10';

      expect(() => getAuditConfig()).toThrow('AUDIT_RETENTION_DAYS must be at least 1');
    });

    test('should throw error for empty enabledTables', () => {
      process.env.AUDIT_ENABLED_TABLES = '';

      expect(() => getAuditConfig()).toThrow('AUDIT_ENABLED_TABLES must include at least one table');
    });

    test('should handle non-numeric environment variables', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = 'invalid';
      process.env.AUDIT_RETENTION_DAYS = 'also-invalid';

      const config = getAuditConfig();

      expect(config.maxHistoryEntries).toBeNaN();
      expect(config.retentionDays).toBeNaN();
      
      // NaN < 1 is false, so validation should pass
      // This might be unexpected behavior that should be handled
    });

    test('should handle very large numeric values', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '999999999';
      process.env.AUDIT_RETENTION_DAYS = '999999999';

      const config = getAuditConfig();

      expect(config.maxHistoryEntries).toBe(999999999);
      expect(config.retentionDays).toBe(999999999);
    });

    test('should handle floating point numbers', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '100.5';
      process.env.AUDIT_RETENTION_DAYS = '30.7';

      const config = getAuditConfig();

      expect(config.maxHistoryEntries).toBe(100.5);
      expect(config.retentionDays).toBe(30.7);
    });

    test('should handle special characters in field names', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'password,user-token,api_key,oauth.secret';
      process.env.AUDIT_ENABLED_TABLES = 'user-profiles,project_data,role.permissions';

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['password', 'user-token', 'api_key', 'oauth.secret']);
      expect(config.enabledTables).toEqual(['user-profiles', 'project_data', 'role.permissions']);
    });
  });

  describe('isAuditEnabled', () => {
    test('should return true when AUDIT_ENABLED is "true"', () => {
      process.env.AUDIT_ENABLED = 'true';
      expect(isAuditEnabled()).toBe(true);
    });

    test('should return false when AUDIT_ENABLED is "false"', () => {
      process.env.AUDIT_ENABLED = 'false';
      expect(isAuditEnabled()).toBe(false);
    });

    test('should return false when AUDIT_ENABLED is not set', () => {
      delete process.env.AUDIT_ENABLED;
      expect(isAuditEnabled()).toBe(false);
    });

    test('should be case insensitive', () => {
      process.env.AUDIT_ENABLED = 'TRUE';
      expect(isAuditEnabled()).toBe(true);

      process.env.AUDIT_ENABLED = 'True';
      expect(isAuditEnabled()).toBe(true);

      process.env.AUDIT_ENABLED = 'FALSE';
      expect(isAuditEnabled()).toBe(false);

      process.env.AUDIT_ENABLED = 'False';
      expect(isAuditEnabled()).toBe(false);
    });

    test('should return false for any value other than "true"', () => {
      const falseValues = ['yes', '1', 'on', 'enabled', 'TRUE1', 'true '];
      
      falseValues.forEach(value => {
        process.env.AUDIT_ENABLED = value;
        expect(isAuditEnabled()).toBe(false);
      });
    });

    test('should handle whitespace', () => {
      process.env.AUDIT_ENABLED = ' true ';
      expect(isAuditEnabled()).toBe(false); // Should not trim whitespace
    });
  });

  describe('isTableAudited', () => {
    test('should return false when audit is disabled', () => {
      process.env.AUDIT_ENABLED = 'false';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';

      expect(isTableAudited('people')).toBe(false);
      expect(isTableAudited('projects')).toBe(false);
    });

    test('should return true for tables in enabled list when audit is enabled', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects,roles';

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('projects')).toBe(true);
      expect(isTableAudited('roles')).toBe(true);
    });

    test('should return false for tables not in enabled list', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';

      expect(isTableAudited('roles')).toBe(false);
      expect(isTableAudited('unknown_table')).toBe(false);
    });

    test('should be case sensitive for table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = 'people,Projects';

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('PEOPLE')).toBe(false);
      expect(isTableAudited('Projects')).toBe(true);
      expect(isTableAudited('projects')).toBe(false);
    });

    test('should handle whitespace in table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = ' people , projects ';

      expect(isTableAudited('people')).toBe(true);
      expect(isTableAudited('projects')).toBe(true);
      expect(isTableAudited(' people ')).toBe(false); // Exact match required
    });

    test('should handle empty string table name', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = 'people,projects';

      expect(isTableAudited('')).toBe(false);
    });

    test('should handle special characters in table names', () => {
      process.env.AUDIT_ENABLED = 'true';
      process.env.AUDIT_ENABLED_TABLES = 'user-profiles,project_data,role.permissions';

      expect(isTableAudited('user-profiles')).toBe(true);
      expect(isTableAudited('project_data')).toBe(true);
      expect(isTableAudited('role.permissions')).toBe(true);
    });
  });

  describe('Configuration Security', () => {
    test('should not expose sensitive configuration through errors', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'super_secret_field,admin_password';
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '0'; // This will cause an error

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

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['<script>alert("xss")</script>']);
      expect(config.enabledTables).toEqual(['"; DROP TABLE users; --']);
    });

    test('should handle extremely long configuration values', () => {
      const longValue = 'a'.repeat(10000);
      process.env.AUDIT_SENSITIVE_FIELDS = longValue;
      process.env.AUDIT_ENABLED_TABLES = longValue;

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual([longValue]);
      expect(config.enabledTables).toEqual([longValue]);
    });

    test('should handle unicode characters in configuration', () => {
      process.env.AUDIT_SENSITIVE_FIELDS = 'пароль,密码,パスワード,🔑';
      process.env.AUDIT_ENABLED_TABLES = 'пользователи,用户,ユーザー,👥';

      const config = getAuditConfig();

      expect(config.sensitiveFields).toEqual(['пароль', '密码', 'パスワード', '🔑']);
      expect(config.enabledTables).toEqual(['пользователи', '用户', 'ユーザー', '👥']);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing process.env', () => {
      const originalEnv = process.env;
      
      try {
        // Simulate missing process.env (should not happen in normal Node.js)
        delete (global as any).process.env;
        (global as any).process = { env: undefined };

        expect(() => getAuditConfig()).toThrow();
      } finally {
        (global as any).process.env = originalEnv;
      }
    });

    test('should handle configuration caching behavior', () => {
      process.env.AUDIT_MAX_HISTORY_ENTRIES = '100';
      const config1 = getAuditConfig();

      process.env.AUDIT_MAX_HISTORY_ENTRIES = '200';
      const config2 = getAuditConfig();

      // Configuration should reflect current environment variables
      expect(config1.maxHistoryEntries).toBe(100);
      expect(config2.maxHistoryEntries).toBe(200);
    });

    test('should handle null and undefined environment values', () => {
      (process.env as any).AUDIT_MAX_HISTORY_ENTRIES = null;
      (process.env as any).AUDIT_RETENTION_DAYS = undefined;

      const config = getAuditConfig();

      // parseInt(null) returns NaN, parseInt(undefined) returns NaN
      expect(config.maxHistoryEntries).toBeNaN();
      expect(config.retentionDays).toBeNaN();
    });

    test('should handle extremely large comma-separated lists', () => {
      const largeSensitiveFields = Array.from({ length: 1000 }, (_, i) => `field${i}`).join(',');
      const largeEnabledTables = Array.from({ length: 1000 }, (_, i) => `table${i}`).join(',');

      process.env.AUDIT_SENSITIVE_FIELDS = largeSensitiveFields;
      process.env.AUDIT_ENABLED_TABLES = largeEnabledTables;

      const config = getAuditConfig();

      expect(config.sensitiveFields.length).toBe(1000);
      expect(config.enabledTables.length).toBe(1000);
      expect(config.sensitiveFields[0]).toBe('field0');
      expect(config.sensitiveFields[999]).toBe('field999');
    });
  });
});
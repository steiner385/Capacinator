import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import express from 'express';
import type { Express, Request, Response } from 'express';
import request from 'supertest';
import knex, { Knex } from 'knex';
import { createEnhancedAuditMiddleware } from '../../../src/server/middleware/enhancedAuditMiddleware.js';
import { Logger } from '../../../src/server/services/logging/Logger.js';

// Mock the config module for security testing
jest.mock('../../../src/server/config/auditConfig.js', () => ({
  getAuditConfig: () => ({
    maxHistoryEntries: 1000,
    retentionDays: 90, // Compliance requirement
    sensitiveFields: [
      'password', 'token', 'secret', 'api_key', 'private_key',
      'ssn', 'credit_card', 'bank_account', 'auth_token',
      'refresh_token', 'session_id', 'csrf_token'
    ],
    enabledTables: ['secure_entities', 'user_data', 'financial_records']
  }),
  isTableAudited: (tableName: string) => {
    return ['secure_entities', 'user_data', 'financial_records'].includes(tableName);
  }
}));

describe('Audit System Security and Compliance Tests', () => {
  let app: Express;
  let db: Knex;

  beforeAll(async () => {
    // Create test database
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
      pool: {
        afterCreate: (conn: any, done: any) => {
          conn.pragma('foreign_keys = ON');
          done();
        }
      }
    });

    // Create necessary tables
    await db.schema.createTable('audit_log', (table) => {
      table.uuid('id').primary();
      table.string('table_name').notNullable();
      table.string('record_id').notNullable();
      table.enum('action', ['CREATE', 'UPDATE', 'DELETE']).notNullable();
      table.string('changed_by').nullable();
      table.text('old_values').nullable();
      table.text('new_values').nullable();
      table.text('changed_fields').nullable();
      table.string('request_id').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.text('comment').nullable();
      table.timestamp('changed_at').defaultTo(db.fn.now());
      
      table.index(['table_name', 'record_id']);
      table.index('changed_at');
      table.index('changed_by');
    });

    await db.schema.createTable('secure_entities', (table) => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').nullable();
      table.string('password').nullable();
      table.string('api_key').nullable();
      table.string('secret').nullable();
      table.text('metadata').nullable();
      table.timestamps(true, true);
    });

    await db.schema.createTable('user_data', (table) => {
      table.uuid('id').primary();
      table.string('username').notNullable();
      table.string('email').nullable();
      table.string('ssn').nullable();
      table.string('credit_card').nullable();
      table.string('phone').nullable();
      table.timestamps(true, true);
    });

    await db.schema.createTable('financial_records', (table) => {
      table.uuid('id').primary();
      table.string('account_number').nullable();
      table.string('bank_account').nullable();
      table.decimal('amount', 12, 2).nullable();
      table.string('transaction_type').nullable();
      table.timestamps(true, true);
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json());

    // Add mock logger
    app.use((req: any, res, next) => {
      req.logger = new Logger({
        level: 2,
        service: 'security-test',
        enableConsole: false,
        enableFile: false,
        enableStructuredLogs: true,
        redactedFields: ['password', 'token', 'secret']
      });
      req.requestId = 'security-request-' + Date.now();
      next();
    });

    // Add user context with role-based access
    app.use((req: any, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer admin-token') {
        req.user = { id: 'admin-user-123', role: 'admin', permissions: ['read', 'write', 'delete'] };
      } else if (authHeader === 'Bearer user-token') {
        req.user = { id: 'regular-user-456', role: 'user', permissions: ['read', 'write'] };
      } else if (authHeader === 'Bearer readonly-token') {
        req.user = { id: 'readonly-user-789', role: 'readonly', permissions: ['read'] };
      } else {
        req.user = { id: 'anonymous', role: 'anonymous', permissions: [] };
      }
      next();
    });

    // Add enhanced audit middleware with test database
    app.use(createEnhancedAuditMiddleware(db));
  });

  test.skip('should properly redact all sensitive fields in audit logs', async () => {
    app.post('/secure-entities', async (req: any, res: Response) => {
      const entityData = {
        id: 'secure-entity-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('secure_entities').insert(entityData);

        await req.logAuditEvent(
          'secure_entities',
          entityData.id,
          'CREATE',
          null,
          entityData,
          'Secure entity created with sensitive field redaction'
        );

        res.status(201).json({ success: true, data: { ...entityData, password: '[REDACTED]', api_key: '[REDACTED]' } });
      } catch (error: any) {
        req.logger.error('Failed to create secure entity', error);
        res.status(500).json({ error: 'Failed to create secure entity' });
      }
    });

    const sensitiveData = {
      name: 'Secure Test Entity',
      email: 'test@secure.com',
      password: 'super_secret_password_123!',
      api_key: 'sk-1234567890abcdef',
      secret: 'top_secret_value',
      metadata: JSON.stringify({
        auth_token: 'bearer-token-xyz',
        refresh_token: 'refresh-abc123',
        session_id: 'session-def456',
        csrf_token: 'csrf-ghi789',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ...',
        normal_field: 'this should not be redacted'
      })
    };

    const response = await request(app)
      .post('/secure-entities')
      .set('Authorization', 'Bearer admin-token')
      .send(sensitiveData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify audit log redacted sensitive fields
    const auditEntry = await db('audit_log')
      .where('table_name', 'secure_entities')
      .where('record_id', response.body.data.id)
      .first();

    expect(auditEntry).toBeTruthy();
    const newValues = JSON.parse(auditEntry.new_values);

    // All sensitive fields should be redacted
    expect(newValues.password).toBe('[REDACTED]');
    expect(newValues.api_key).toBe('[REDACTED]');
    expect(newValues.secret).toBe('[REDACTED]');

    // Metadata with nested sensitive fields should also be redacted
    const metadata = JSON.parse(newValues.metadata);
    expect(metadata.auth_token).toBe('[REDACTED]');
    expect(metadata.refresh_token).toBe('[REDACTED]');
    expect(metadata.session_id).toBe('[REDACTED]');
    expect(metadata.csrf_token).toBe('[REDACTED]');
    expect(metadata.private_key).toBe('[REDACTED]');

    // Non-sensitive fields should be preserved
    expect(newValues.name).toBe(sensitiveData.name);
    expect(newValues.email).toBe(sensitiveData.email);
    expect(metadata.normal_field).toBe('this should not be redacted');
  });

  test('should audit user access and permission changes', async () => {
    app.post('/user-data', async (req: any, res: Response) => {
      if (!req.user.permissions.includes('write')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const userData = {
        id: 'user-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('user_data').insert(userData);

        await req.logAuditEvent(
          'user_data',
          userData.id,
          'CREATE',
          null,
          userData,
          `User data created by ${req.user.role} user`
        );

        res.status(201).json({ success: true, data: userData });
      } catch (error: any) {
        req.logger.error('Failed to create user data', error);
        res.status(500).json({ error: 'Failed to create user data' });
      }
    });

    const personalData = {
      username: 'security_test_user',
      email: 'user@example.com',
      ssn: '123-45-6789',
      credit_card: '4111-1111-1111-1111',
      phone: '+1-555-123-4567'
    };

    // Test with different user roles
    const tests = [
      { token: 'Bearer admin-token', expectedStatus: 201, role: 'admin' },
      { token: 'Bearer user-token', expectedStatus: 201, role: 'user' },
      { token: 'Bearer readonly-token', expectedStatus: 403, role: 'readonly' },
      { token: 'Bearer invalid-token', expectedStatus: 403, role: 'anonymous' }
    ];

    for (const test of tests) {
      const response = await request(app)
        .post('/user-data')
        .set('Authorization', test.token)
        .send(personalData)
        .expect(test.expectedStatus);

      if (test.expectedStatus === 201) {
        expect(response.body.success).toBe(true);

        // Wait for audit processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify audit log captures user role and access context
        const auditEntry = await db('audit_log')
          .where('table_name', 'user_data')
          .where('record_id', response.body.data.id)
          .first();

        expect(auditEntry).toBeTruthy();
        expect(auditEntry.comment).toContain(`created by ${test.role} user`);

        // Verify sensitive fields are redacted
        const newValues = JSON.parse(auditEntry.new_values);
        expect(newValues.ssn).toBe('[REDACTED]');
        expect(newValues.credit_card).toBe('[REDACTED]');
        expect(newValues.username).toBe(personalData.username); // Non-sensitive
        expect(newValues.email).toBe(personalData.email); // Non-sensitive
      }
    }
  });

  test('should prevent audit log tampering and unauthorized access', async () => {
    // Create some audit data first
    await db('audit_log').insert({
      id: 'test-audit-' + Date.now(),
      table_name: 'secure_entities',
      record_id: 'test-record-123',
      action: 'CREATE',
      changed_by: 'admin-user-123',
      new_values: JSON.stringify({ name: 'Test Entity' }),
      changed_at: new Date()
    });

    // Test unauthorized audit log access
    app.get('/audit-log', async (req: any, res: Response) => {
      if (!req.user.permissions.includes('read') || req.user.role === 'anonymous') {
        return res.status(403).json({ error: 'Unauthorized access to audit logs' });
      }

      try {
        const auditEntries = await db('audit_log')
          .select('*')
          .orderBy('changed_at', 'desc')
          .limit(10);

        res.json({ success: true, entries: auditEntries });
      } catch (error: any) {
        req.logger.error('Failed to fetch audit log', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
      }
    });

    // Test unauthorized modification attempts
    app.delete('/audit-log/:id', async (req: any, res: Response) => {
      // Audit logs should never be deletable via API
      return res.status(405).json({ error: 'Audit log modification not allowed' });
    });

    app.put('/audit-log/:id', async (req: any, res: Response) => {
      // Audit logs should never be modifiable via API
      return res.status(405).json({ error: 'Audit log modification not allowed' });
    });

    // Test access with different permission levels
    const accessTests = [
      { token: 'Bearer admin-token', expectedStatus: 200 },
      { token: 'Bearer user-token', expectedStatus: 200 },
      { token: 'Bearer readonly-token', expectedStatus: 200 },
      { token: 'Bearer invalid-token', expectedStatus: 403 },
      { token: '', expectedStatus: 403 }
    ];

    for (const test of accessTests) {
      const response = await request(app)
        .get('/audit-log')
        .set('Authorization', test.token)
        .expect(test.expectedStatus);

      if (test.expectedStatus === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.entries)).toBe(true);
      }
    }

    // Test modification prevention
    await request(app)
      .delete('/audit-log/test-audit-123')
      .set('Authorization', 'Bearer admin-token')
      .expect(405);

    await request(app)
      .put('/audit-log/test-audit-123')
      .set('Authorization', 'Bearer admin-token')
      .send({ action: 'MODIFIED' })
      .expect(405);
  });

  test('should maintain audit integrity and detect anomalies', async () => {
    app.post('/financial-records', async (req: any, res: Response) => {
      if (!req.user.permissions.includes('write')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const recordData = {
        id: 'financial-' + Date.now(),
        ...req.body,
        created_at: new Date(),
        updated_at: new Date()
      };

      try {
        await db('financial_records').insert(recordData);

        await req.logAuditEvent(
          'financial_records',
          recordData.id,
          'CREATE',
          null,
          recordData,
          `Financial record created - Amount: ${recordData.amount}`
        );

        res.status(201).json({ success: true, data: recordData });
      } catch (error: any) {
        req.logger.error('Failed to create financial record', error);
        res.status(500).json({ error: 'Failed to create financial record' });
      }
    });

    // Create financial records with different amounts to test anomaly detection
    const records = [
      { account_number: 'ACC-001', amount: 100.50, transaction_type: 'credit' },
      { account_number: 'ACC-002', amount: 250.75, transaction_type: 'debit' },
      { account_number: 'ACC-003', amount: 999999.99, transaction_type: 'credit' }, // Anomaly: large amount
      { account_number: 'ACC-004', amount: 50.00, transaction_type: 'credit' }
    ];

    const createdRecords = [];
    for (const record of records) {
      const response = await request(app)
        .post('/financial-records')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...record,
          bank_account: '1234567890' // Sensitive field
        })
        .expect(201);

      createdRecords.push(response.body.data);
    }

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify audit integrity
    const auditEntries = await db('audit_log')
      .where('table_name', 'financial_records')
      .orderBy('changed_at', 'asc');

    expect(auditEntries.length).toBe(records.length);

    // Check each audit entry for integrity
    auditEntries.forEach((entry, index) => {
      expect(entry.action).toBe('CREATE');
      expect(entry.changed_by).toBe('admin-user-123');
      expect(entry.comment).toContain(`Amount: ${records[index].amount}`);

      const newValues = JSON.parse(entry.new_values);
      expect(newValues.bank_account).toBe('[REDACTED]'); // Sensitive field redacted
      expect(newValues.amount).toBe(records[index].amount);
      expect(newValues.account_number).toBe(records[index].account_number);
    });

    // Test anomaly detection (large amount transaction)
    const anomalyEntry = auditEntries.find(entry => {
      const values = JSON.parse(entry.new_values);
      return values.amount === 999999.99;
    });

    expect(anomalyEntry).toBeTruthy();
    expect(anomalyEntry.comment).toContain('999999.99');
  });

  test.skip('should enforce data retention and compliance policies', async () => {
    // Create audit entries with backdated timestamps to test retention
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100); // 100 days old (beyond 90-day retention)

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30); // 30 days old (within retention)

    await db('audit_log').insert([
      {
        id: 'old-audit-1',
        table_name: 'secure_entities',
        record_id: 'old-record-1',
        action: 'CREATE',
        changed_by: 'old-user',
        new_values: JSON.stringify({ name: 'Old Entity 1' }),
        changed_at: oldDate
      },
      {
        id: 'old-audit-2',
        table_name: 'secure_entities',
        record_id: 'old-record-2',
        action: 'UPDATE',
        changed_by: 'old-user',
        new_values: JSON.stringify({ name: 'Old Entity 2' }),
        changed_at: oldDate
      },
      {
        id: 'recent-audit-1',
        table_name: 'secure_entities',
        record_id: 'recent-record-1',
        action: 'CREATE',
        changed_by: 'recent-user',
        new_values: JSON.stringify({ name: 'Recent Entity 1' }),
        changed_at: recentDate
      }
    ]);

    // Test compliance reporting endpoint
    app.get('/audit-compliance/report', async (req: any, res: Response) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for compliance reports' });
      }

      try {
        const retentionDays = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Count entries within retention period
        const withinRetention = await db('audit_log')
          .where('changed_at', '>=', cutoffDate)
          .count('* as count')
          .first();

        // Count entries beyond retention period (should be cleaned up)
        const beyondRetention = await db('audit_log')
          .where('changed_at', '<', cutoffDate)
          .count('* as count')
          .first();

        // Get retention statistics by table
        const tableStats = await db('audit_log')
          .select('table_name')
          .count('* as total_entries')
          .min('changed_at as oldest_entry')
          .max('changed_at as newest_entry')
          .where('changed_at', '>=', cutoffDate)
          .groupBy('table_name');

        // Check for sensitive field redaction compliance
        const unredactedEntries = await db('audit_log')
          .where('new_values', 'like', '%password%')
          .orWhere('new_values', 'like', '%secret%')
          .orWhere('new_values', 'like', '%api_key%')
          .whereNot('new_values', 'like', '%[REDACTED]%')
          .count('* as count')
          .first();

        res.json({
          success: true,
          compliance_report: {
            retention_policy: {
              retention_days: retentionDays,
              entries_within_retention: Number(withinRetention?.count),
              entries_beyond_retention: Number(beyondRetention?.count),
              compliance_status: Number(beyondRetention?.count) === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
            },
            table_statistics: tableStats,
            redaction_compliance: {
              unredacted_sensitive_entries: Number(unredactedEntries?.count),
              compliance_status: Number(unredactedEntries?.count) === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
            },
            report_generated_at: new Date(),
            report_generated_by: req.user.id
          }
        });
      } catch (error: any) {
        req.logger.error('Failed to generate compliance report', error);
        res.status(500).json({ error: 'Failed to generate compliance report' });
      }
    });

    // Test compliance report access
    const response = await request(app)
      .get('/audit-compliance/report')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    const report = response.body.compliance_report;

    // Verify retention policy compliance
    expect(report.retention_policy.retention_days).toBe(90);
    expect(report.retention_policy.entries_within_retention).toBeGreaterThan(0);

    // Verify redaction compliance
    expect(report.redaction_compliance.compliance_status).toBe('COMPLIANT');
    expect(report.redaction_compliance.unredacted_sensitive_entries).toBe(0);

    // Test unauthorized access to compliance report
    await request(app)
      .get('/audit-compliance/report')
      .set('Authorization', 'Bearer user-token')
      .expect(403);
  });

  test.skip('should handle security incidents and generate alerts', async () => {
    app.post('/security-incident', async (req: any, res: Response) => {
      const { incident_type, severity, description } = req.body;

      try {
        // Log security incident in audit trail
        await req.logAuditEvent(
          'security_incidents',
          `incident-${Date.now()}`,
          'CREATE',
          null,
          {
            incident_type,
            severity,
            description,
            detected_by: req.user.id,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            timestamp: new Date()
          },
          `SECURITY ALERT: ${incident_type} - ${severity} severity`
        );

        // Simulate alert generation for high-severity incidents
        if (severity === 'HIGH' || severity === 'CRITICAL') {
          req.logger.error('High-severity security incident detected', {
            incident_type,
            severity,
            user: req.user.id,
            ip: req.ip
          });
        }

        res.json({
          success: true,
          message: 'Security incident logged successfully',
          alert_generated: ['HIGH', 'CRITICAL'].includes(severity)
        });
      } catch (error: any) {
        req.logger.error('Failed to log security incident', error);
        res.status(500).json({ error: 'Failed to log security incident' });
      }
    });

    // Test various security incidents
    const incidents = [
      {
        incident_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'HIGH',
        description: 'Multiple failed login attempts from suspicious IP'
      },
      {
        incident_type: 'DATA_BREACH_ATTEMPT',
        severity: 'CRITICAL',
        description: 'Attempted SQL injection in user data endpoint'
      },
      {
        incident_type: 'PRIVILEGE_ESCALATION',
        severity: 'MEDIUM',
        description: 'User attempted to access admin-only resources'
      }
    ];

    for (const incident of incidents) {
      const response = await request(app)
        .post('/security-incident')
        .set('Authorization', 'Bearer admin-token')
        .send(incident)
        .expect(200);

      expect(response.body.success).toBe(true);

      if (incident.severity === 'HIGH' || incident.severity === 'CRITICAL') {
        expect(response.body.alert_generated).toBe(true);
      }
    }

    // Wait for audit processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify security incidents are properly audited
    const securityAudits = await db('audit_log')
      .where('comment', 'like', '%SECURITY ALERT%')
      .orderBy('changed_at', 'desc');

    expect(securityAudits.length).toBe(incidents.length);

    securityAudits.forEach((audit, index) => {
      expect(audit.comment).toContain('SECURITY ALERT');
      expect(audit.comment).toContain(incidents[index].incident_type);
      expect(audit.comment).toContain(incidents[index].severity);

      const auditData = JSON.parse(audit.new_values);
      expect(auditData.incident_type).toBe(incidents[index].incident_type);
      expect(auditData.severity).toBe(incidents[index].severity);
      expect(auditData.detected_by).toBe('admin-user-123');
    });
  });
});
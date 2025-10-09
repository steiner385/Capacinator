import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { enhancedAuditMiddleware, autoAuditMiddleware } from '../../../../src/server/middleware/enhancedAuditMiddleware.js';
import { AuditService } from '../../../../src/server/services/audit/AuditService.js';
import { getAuditConfig, isTableAudited } from '../../../../src/server/config/auditConfig.js';
import { db } from '../../../../src/server/database/index.js';

// Mock dependencies
jest.mock('../../../../src/server/config/auditConfig.js');
jest.mock('../../../../src/server/database/index.js');

describe('Enhanced Audit Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    };

    mockReq = {
      logger: mockLogger,
      requestId: 'test-request-123',
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      user: { id: 'user-123' },
      url: undefined
    };

    mockRes = {} as Response;
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('enhancedAuditMiddleware', () => {
    test('should initialize audit service and add helper functions to request', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects', 'people']
      };

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.auditService).toBeInstanceOf(AuditService);
      expect(mockReq.auditContext).toEqual({});
      expect(typeof mockReq.logAuditEvent).toBe('function');
      expect(typeof mockReq.logBulkAuditEvents).toBe('function');
      expect(typeof mockReq.trackEntityChange).toBe('function');
      expect(mockNext).toHaveBeenCalled();
    });

    test('logAuditEvent should skip non-audited tables', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects']
      };

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);
      (isTableAudited as jest.Mock).mockReturnValue(false);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);

      await mockReq.logAuditEvent('non_audited_table', '123', 'CREATE', {}, { name: 'Test' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Table not audited, skipping audit log',
        { tableName: 'non_audited_table' }
      );
    });

    test('logAuditEvent should log changes for audited tables', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects']
      };

      const mockLogChange = jest.fn().mockResolvedValue('audit-123');

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);
      (isTableAudited as jest.Mock).mockReturnValue(true);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);
      mockReq.auditService.logChange = mockLogChange;

      const oldValues = { name: 'Old Project' };
      const newValues = { name: 'New Project' };

      const auditId = await mockReq.logAuditEvent(
        'projects',
        'proj-123',
        'UPDATE',
        oldValues,
        newValues,
        'Updated project name'
      );

      expect(mockLogChange).toHaveBeenCalledWith({
        tableName: 'projects',
        recordId: 'proj-123',
        action: 'UPDATE',
        changedBy: 'user-123',
        oldValues,
        newValues,
        requestId: 'test-request-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        comment: 'Updated project name'
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Audit event logged', {
        auditId: 'audit-123',
        tableName: 'projects',
        recordId: 'proj-123',
        action: 'UPDATE',
        userId: 'user-123'
      });

      expect(auditId).toBe('audit-123');
    });

    test('logAuditEvent should handle errors gracefully', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects']
      };

      const mockError = new Error('Database error');
      const mockLogChange = jest.fn().mockRejectedValue(mockError);

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);
      (isTableAudited as jest.Mock).mockReturnValue(true);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);
      mockReq.auditService.logChange = mockLogChange;

      await expect(
        mockReq.logAuditEvent('projects', 'proj-123', 'CREATE', undefined, { name: 'Test' })
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit event',
        mockError,
        {
          tableName: 'projects',
          recordId: 'proj-123',
          action: 'CREATE'
        }
      );
    });

    test('logBulkAuditEvents should process multiple events', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects', 'people']
      };

      const mockLogChange = jest.fn()
        .mockResolvedValueOnce('audit-1')
        .mockResolvedValueOnce('audit-2')
        .mockRejectedValueOnce(new Error('Failed'));

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);
      (isTableAudited as jest.Mock).mockReturnValue(true);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);
      mockReq.auditService.logChange = mockLogChange;

      const events = [
        {
          tableName: 'projects',
          recordId: 'proj-1',
          action: 'CREATE' as const,
          newValues: { name: 'Project 1' }
        },
        {
          tableName: 'people',
          recordId: 'person-1',
          action: 'UPDATE' as const,
          oldValues: { name: 'John' },
          newValues: { name: 'Jane' }
        },
        {
          tableName: 'projects',
          recordId: 'proj-2',
          action: 'DELETE' as const,
          oldValues: { name: 'Project 2' }
        }
      ];

      const auditIds = await mockReq.logBulkAuditEvents(events);

      expect(auditIds).toEqual(['audit-1', 'audit-2']);
      expect(mockLogChange).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Bulk audit events logged', {
        count: 2,
        totalRequested: 3
      });
    });

    test('trackEntityChange should update audit context', async () => {
      const mockAuditConfig = {
        maxHistoryEntries: 1000,
        retentionDays: 365,
        sensitiveFields: ['password'],
        enabledTables: ['projects']
      };

      (getAuditConfig as jest.Mock).mockReturnValue(mockAuditConfig);

      await enhancedAuditMiddleware(mockReq, mockRes, mockNext);

      const oldValues = { name: 'Old Name', status: 'active' };
      const newValues = { name: 'New Name', status: 'inactive' };

      mockReq.trackEntityChange('projects', 'proj-123', oldValues, newValues);

      expect(mockReq.auditContext).toEqual({
        tableName: 'projects',
        recordId: 'proj-123',
        oldValues,
        newValues
      });
    });
  });

  describe('autoAuditMiddleware', () => {
    let originalSend: any;
    let mockSend: jest.Mock;

    beforeEach(() => {
      mockSend = jest.fn(function(this: any, body: any) {
        return this;
      });
      originalSend = mockRes.send;
    });

    test('should skip non-audited tables', () => {
      (isTableAudited as jest.Mock).mockReturnValue(false);

      const middleware = autoAuditMiddleware('non_audited_table');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.send).toBeUndefined(); // Not overridden
    });

    test('should auto-log CREATE operations', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.params = {};
      mockReq.body = { name: 'New Project', status: 'active' };
      mockReq.logAuditEvent = jest.fn().mockResolvedValue('audit-123');

      mockRes.statusCode = 201;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simulate successful response
      const responseBody = JSON.stringify({ id: 'proj-123', name: 'New Project' });
      mockRes.send(responseBody);

      // Wait for async audit logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'projects',
        'proj-123',
        'CREATE',
        undefined,
        { name: 'New Project', status: 'active' },
        'Auto-audit: POST undefined'
      );
    });

    test('should auto-log UPDATE operations', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'PUT';
      mockReq.params = { id: 'proj-123' };
      mockReq.body = { name: 'Updated Project' };
      mockReq.auditContext = {
        oldValues: { name: 'Original Project' }
      };
      mockReq.logAuditEvent = jest.fn().mockResolvedValue('audit-456');

      mockRes.statusCode = 200;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      const responseBody = JSON.stringify({ id: 'proj-123', name: 'Updated Project' });
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'projects',
        'proj-123',
        'UPDATE',
        { name: 'Original Project' },
        { name: 'Updated Project' },
        'Auto-audit: PUT undefined'
      );
    });

    test('should auto-log DELETE operations', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'DELETE';
      mockReq.params = { id: 'proj-123' };
      mockReq.auditContext = {
        oldValues: { name: 'Deleted Project', status: 'active' }
      };
      mockReq.logAuditEvent = jest.fn().mockResolvedValue('audit-789');

      mockRes.statusCode = 200;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      const responseBody = JSON.stringify({ message: 'Deleted successfully' });
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'projects',
        'proj-123',
        'DELETE',
        { name: 'Deleted Project', status: 'active' },
        undefined,
        'Auto-audit: DELETE undefined'
      );
    });

    test('should not log for failed responses', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.params = {};
      mockReq.body = { name: 'New Project' };
      mockReq.logAuditEvent = jest.fn();

      mockRes.statusCode = 400; // Bad request
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      const responseBody = JSON.stringify({ error: 'Validation failed' });
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).not.toHaveBeenCalled();
    });

    test('should handle audit logging errors gracefully', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.params = {};
      mockReq.body = { name: 'New Project' };
      mockReq.logAuditEvent = jest.fn().mockRejectedValue(new Error('Audit failed'));
      mockReq.logger = mockLogger;

      mockRes.statusCode = 201;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      const responseBody = JSON.stringify({ id: 'proj-123' });
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auto-audit failed',
        expect.any(Error)
      );
    });

    test('should skip GET requests', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'GET';
      mockReq.params = { id: 'proj-123' };
      mockReq.logAuditEvent = jest.fn();

      mockRes.statusCode = 200;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('projects');
      middleware(mockReq, mockRes, mockNext);

      const responseBody = JSON.stringify({ id: 'proj-123', name: 'Project' });
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).not.toHaveBeenCalled();
    });

    test('should extract record ID from different response formats', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.params = {};
      mockReq.body = { name: 'New Item' };
      mockReq.logAuditEvent = jest.fn();

      mockRes.statusCode = 201;
      mockRes.send = mockSend;

      const middleware = autoAuditMiddleware('items');
      middleware(mockReq, mockRes, mockNext);

      // Test nested data format
      const responseBody = { data: { id: 'item-123', name: 'New Item' } };
      mockRes.send(responseBody);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'items',
        'item-123',
        'CREATE',
        undefined,
        { name: 'New Item' },
        expect.any(String)
      );
    });
  });
});
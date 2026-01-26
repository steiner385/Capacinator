import { createAutoAuditMiddleware, createEnhancedAuditMiddleware } from '../enhancedAuditMiddleware.js';
import { AuditService } from '../../services/audit/AuditService.js';
import { getAuditConfig, isTableAudited } from '../../config/auditConfig.js';
import type { Knex } from 'knex';

// Mock dependencies
jest.mock('../../services/audit/AuditService');
jest.mock('../../config/auditConfig');

describe('enhancedAuditMiddleware', () => {
  let mockDb: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let mockAuditService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {} as Knex;

    mockReq = {
      method: 'POST',
      params: { id: 'test-id' },
      body: { name: 'Test' },
      url: '/test/endpoint',
      requestId: 'req-123',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
      user: { id: 'user-123' },
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
      },
      auditContext: {}
    };

    mockRes = {
      send: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    mockNext = jest.fn();

    mockAuditService = {
      logChange: jest.fn().mockResolvedValue('audit-id-123')
    };

    (AuditService as jest.Mock).mockImplementation(() => mockAuditService);
    (getAuditConfig as jest.Mock).mockReturnValue({});
  });

  describe('createAutoAuditMiddleware', () => {
    it('should skip audit for non-audited tables', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(false);

      const middleware = createAutoAuditMiddleware(mockDb, 'non_audited_table');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(AuditService).not.toHaveBeenCalled();
    });

    it('should create audit service when not available', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      delete mockReq.auditService;

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      expect(AuditService).toHaveBeenCalledWith(mockDb, {});
      expect(mockReq.auditService).toBeDefined();
    });

    it('should set up logAuditEvent function when not available', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      delete mockReq.logAuditEvent;

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockReq.logAuditEvent).toBeDefined();
      expect(typeof mockReq.logAuditEvent).toBe('function');
    });

    it('should log CREATE action for POST requests', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn();

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      // Trigger the send method
      const enhancedSend = mockRes.send;
      await enhancedSend({ data: { id: 'new-id' } });

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logAuditEvent).toHaveBeenCalled();
    });

    it('should log UPDATE action for PUT requests', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'PUT';
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn();

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      const enhancedSend = mockRes.send;
      await enhancedSend({ data: { id: 'test-id' } });

      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logAuditEvent).toHaveBeenCalled();
    });

    it('should log DELETE action for DELETE requests', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'DELETE';
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn();

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      const enhancedSend = mockRes.send;
      await enhancedSend({ data: { id: 'test-id' } });

      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logAuditEvent).toHaveBeenCalled();
    });

    it('should not audit GET requests', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'GET';
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn();

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      const enhancedSend = mockRes.send;
      await enhancedSend({ data: { id: 'test-id' } });

      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logAuditEvent).not.toHaveBeenCalled();
    });

    it('should handle audit errors gracefully', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn().mockRejectedValue(new Error('Audit failed'));

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      const enhancedSend = mockRes.send;
      await enhancedSend({ data: { id: 'test-id' } });

      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logger.error).toHaveBeenCalledWith('Auto-audit failed', expect.any(Error));
    });

    it('should only audit successful responses', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockReq.method = 'POST';
      mockRes.statusCode = 500; // Error response
      mockReq.auditService = mockAuditService;
      mockReq.logAuditEvent = jest.fn();

      const middleware = createAutoAuditMiddleware(mockDb, 'test_table');
      await middleware(mockReq, mockRes, mockNext);

      const enhancedSend = mockRes.send;
      await enhancedSend({ error: 'Server error' });

      await new Promise(resolve => setImmediate(resolve));

      expect(mockReq.logAuditEvent).not.toHaveBeenCalled();
    });
  });

  describe('createEnhancedAuditMiddleware', () => {
    it('should initialize audit service', () => {
      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      expect(AuditService).toHaveBeenCalledWith(mockDb, {});
      expect(mockReq.auditService).toBeDefined();
    });

    it('should add logAuditEvent helper', () => {
      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.logAuditEvent).toBeDefined();
      expect(typeof mockReq.logAuditEvent).toBe('function');
    });

    it('should add logBulkAuditEvents helper', () => {
      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.logBulkAuditEvents).toBeDefined();
      expect(typeof mockReq.logBulkAuditEvents).toBe('function');
    });

    it('should add trackEntityChange helper', () => {
      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.trackEntityChange).toBeDefined();
      expect(typeof mockReq.trackEntityChange).toBe('function');
    });

    it('should log audit event successfully', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);

      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      const auditId = await mockReq.logAuditEvent(
        'test_table',
        'record-123',
        'CREATE',
        null,
        { name: 'Test' },
        'Test comment'
      );

      expect(auditId).toBe('audit-id-123');
      expect(mockAuditService.logChange).toHaveBeenCalledWith({
        tableName: 'test_table',
        recordId: 'record-123',
        action: 'CREATE',
        changedBy: 'user-123',
        oldValues: null,
        newValues: { name: 'Test' },
        requestId: 'req-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        comment: 'Test comment'
      });
    });

    it('should skip audit for non-audited tables', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(false);

      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      await mockReq.logAuditEvent('non_audited_table', 'record-123', 'CREATE');

      expect(mockAuditService.logChange).not.toHaveBeenCalled();
      expect(mockReq.logger.debug).toHaveBeenCalledWith(
        'Table not audited, skipping audit log',
        { tableName: 'non_audited_table' }
      );
    });

    it('should handle audit logging errors', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockAuditService.logChange.mockRejectedValue(new Error('Audit error'));

      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      await expect(
        mockReq.logAuditEvent('test_table', 'record-123', 'CREATE')
      ).rejects.toThrow('Audit error');

      expect(mockReq.logger.error).toHaveBeenCalledWith(
        'Failed to log audit event',
        expect.any(Error),
        expect.objectContaining({
          tableName: 'test_table',
          recordId: 'record-123',
          action: 'CREATE'
        })
      );
    });

    it('should log bulk audit events successfully', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);

      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      const events = [
        {
          tableName: 'test_table',
          recordId: 'record-1',
          action: 'CREATE' as const,
          newValues: { name: 'Test 1' }
        },
        {
          tableName: 'test_table',
          recordId: 'record-2',
          action: 'CREATE' as const,
          newValues: { name: 'Test 2' }
        }
      ];

      const auditIds = await mockReq.logBulkAuditEvents(events);

      expect(auditIds).toHaveLength(2);
      expect(mockAuditService.logChange).toHaveBeenCalledTimes(2);
    });

    it('should continue bulk logging even if one event fails', async () => {
      (isTableAudited as jest.Mock).mockReturnValue(true);
      mockAuditService.logChange
        .mockRejectedValueOnce(new Error('First event failed'))
        .mockResolvedValueOnce('audit-id-2');

      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      const events = [
        {
          tableName: 'test_table',
          recordId: 'record-1',
          action: 'CREATE' as const
        },
        {
          tableName: 'test_table',
          recordId: 'record-2',
          action: 'CREATE' as const
        }
      ];

      const auditIds = await mockReq.logBulkAuditEvents(events);

      expect(auditIds).toHaveLength(1);
      expect(mockReq.logger.error).toHaveBeenCalledWith(
        'Failed to log bulk audit event',
        expect.any(Error),
        expect.objectContaining({ recordId: 'record-1' })
      );
    });

    it('should track entity changes', () => {
      const middleware = createEnhancedAuditMiddleware(mockDb);
      middleware(mockReq, mockRes, mockNext);

      mockReq.trackEntityChange(
        'test_table',
        'record-123',
        { name: 'Old Name' },
        { name: 'New Name' }
      );

      expect(mockReq.auditContext).toEqual({
        tableName: 'test_table',
        recordId: 'record-123',
        oldValues: { name: 'Old Name' },
        newValues: { name: 'New Name' }
      });
    });
  });
});

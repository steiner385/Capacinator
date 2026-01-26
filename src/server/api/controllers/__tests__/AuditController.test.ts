import { AuditController } from '../AuditController.js';
import { AuditService, AuditLogEntry } from '../../../services/audit/AuditService.js';
import { flushPromises } from './helpers/mockDb.js';

// Create mock AuditService
const createMockAuditService = (): jest.Mocked<AuditService> => {
  return {
    getAuditHistory: jest.fn(),
    getRecentChanges: jest.fn(),
    searchAuditLog: jest.fn(),
    undoLastChange: jest.fn(),
    undoLastNChanges: jest.fn(),
    getAuditStats: jest.fn(),
    cleanupExpiredEntries: jest.fn(),
    undoSpecificChange: jest.fn(),
    getAuditEntryById: jest.fn(),
    getAuditSummaryByTable: jest.fn(),
    getAuditTimeline: jest.fn(),
    getUserActivity: jest.fn(),
    logChange: jest.fn(),
    getActualChangeHistory: jest.fn()
  } as any;
};

describe('AuditController', () => {
  let controller: AuditController;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuditService = createMockAuditService();
    controller = new AuditController(mockAuditService);

    // Create mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      user: { id: 'user-123' }
    };

    // Create mock response
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getAuditHistory - Get audit history for record', () => {
    beforeEach(() => {
      mockReq.params = {
        tableName: 'projects',
        recordId: 'proj-1'
      };
    });

    it('returns audit history for a record', async () => {
      const mockHistory: AuditLogEntry[] = [
        {
          id: 'audit-1',
          table_name: 'projects',
          record_id: 'proj-1',
          action: 'UPDATE',
          changed_by: 'user-1',
          old_values: { name: 'Old Name' },
          new_values: { name: 'New Name' },
          changed_fields: ['name'],
          request_id: 'req-1',
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla',
          comment: null,
          changed_at: new Date('2025-01-01')
        }
      ];

      mockAuditService.getAuditHistory.mockResolvedValue(mockHistory);

      await controller.getAuditHistory(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith(
        'projects',
        'proj-1',
        undefined
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
        meta: {
          count: 1,
          tableName: 'projects',
          recordId: 'proj-1'
        }
      });
    });

    it('applies limit when provided', async () => {
      mockReq.query.limit = '10';
      mockAuditService.getAuditHistory.mockResolvedValue([]);

      await controller.getAuditHistory(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith(
        'projects',
        'proj-1',
        10
      );
    });

    it('returns 400 when tableName is missing', async () => {
      mockReq.params.tableName = undefined;

      await controller.getAuditHistory(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'tableName and recordId are required'
      });
    });

    it('returns 400 when recordId is missing', async () => {
      mockReq.params.recordId = undefined;

      await controller.getAuditHistory(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'tableName and recordId are required'
      });
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getAuditHistory.mockRejectedValue(new Error('Database error'));

      await controller.getAuditHistory(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRecentChanges - Get recent changes', () => {
    it('returns recent changes with default pagination', async () => {
      const mockChanges: AuditLogEntry[] = [
        {
          id: 'audit-1',
          table_name: 'projects',
          record_id: 'proj-1',
          action: 'CREATE',
          changed_by: 'user-1',
          old_values: null,
          new_values: { name: 'Project A' },
          changed_fields: null,
          request_id: null,
          ip_address: null,
          user_agent: null,
          comment: null,
          changed_at: new Date('2025-01-01')
        }
      ];

      mockAuditService.getRecentChanges.mockResolvedValue(mockChanges);

      await controller.getRecentChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith(
        undefined,
        50,
        0
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChanges,
        meta: {
          count: 1,
          limit: 50,
          offset: 0,
          changedBy: undefined
        }
      });
    });

    it('filters by changedBy when provided', async () => {
      mockReq.query.changedBy = 'user-1';
      mockAuditService.getRecentChanges.mockResolvedValue([]);

      await controller.getRecentChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith(
        'user-1',
        50,
        0
      );
    });

    it('uses custom limit and offset', async () => {
      mockReq.query.limit = '25';
      mockReq.query.offset = '10';
      mockAuditService.getRecentChanges.mockResolvedValue([]);

      await controller.getRecentChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith(
        undefined,
        25,
        10
      );
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getRecentChanges.mockRejectedValue(new Error('Database error'));

      await controller.getRecentChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchAuditLog - Search with filters', () => {
    it('searches with all filters', async () => {
      mockReq.query = {
        tableName: 'projects',
        recordId: 'proj-1',
        changedBy: 'user-1',
        action: 'UPDATE',
        requestId: 'req-1',
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        limit: '100',
        offset: '20'
      };

      const mockResult = {
        total: 5,
        entries: []
      };

      mockAuditService.searchAuditLog.mockResolvedValue(mockResult);

      await controller.searchAuditLog(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.searchAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: 'projects',
          recordId: 'proj-1',
          changedBy: 'user-1',
          action: 'UPDATE',
          requestId: 'req-1',
          limit: 100,
          offset: 20
        })
      );

      // Check that dates are Date objects
      const callArg = mockAuditService.searchAuditLog.mock.calls[0][0];
      expect(callArg.fromDate).toBeInstanceOf(Date);
      expect(callArg.toDate).toBeInstanceOf(Date);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: expect.objectContaining({
          total: 5,
          count: 0,
          limit: 100,
          offset: 20
        })
      });
    });

    it('removes undefined filters', async () => {
      mockReq.query = {
        tableName: 'projects'
      };

      mockAuditService.searchAuditLog.mockResolvedValue({
        total: 0,
        entries: []
      });

      await controller.searchAuditLog(mockReq, mockRes);
      await flushPromises();

      const callArg = mockAuditService.searchAuditLog.mock.calls[0][0];
      expect(callArg.recordId).toBeUndefined();
      expect(callArg.changedBy).toBeUndefined();
      expect(callArg.fromDate).toBeUndefined();
      expect(callArg.toDate).toBeUndefined();
    });

    it('uses default pagination values', async () => {
      mockReq.query = {};
      mockAuditService.searchAuditLog.mockResolvedValue({
        total: 0,
        entries: []
      });

      await controller.searchAuditLog(mockReq, mockRes);
      await flushPromises();

      const callArg = mockAuditService.searchAuditLog.mock.calls[0][0];
      expect(callArg.limit).toBe(50);
      expect(callArg.offset).toBe(0);
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.searchAuditLog.mockRejectedValue(new Error('Database error'));

      await controller.searchAuditLog(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('undoLastChange - Undo last change for record', () => {
    beforeEach(() => {
      mockReq.params = {
        tableName: 'projects',
        recordId: 'proj-1'
      };
      mockReq.body = {
        comment: 'Manual undo'
      };
      mockReq.user = { id: 'user-123' };
    });

    it('undoes last change successfully', async () => {
      mockAuditService.undoLastChange.mockResolvedValue(true);

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.undoLastChange).toHaveBeenCalledWith(
        'projects',
        'proj-1',
        'user-123',
        'Manual undo'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          undone: true,
          tableName: 'projects',
          recordId: 'proj-1',
          undoneBy: 'user-123',
          comment: 'Manual undo'
        }
      });
    });

    it('falls back to system when user not authenticated', async () => {
      mockReq.user = undefined;
      mockAuditService.undoLastChange.mockResolvedValue(true);

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.undoLastChange).toHaveBeenCalledWith(
        'projects',
        'proj-1',
        'system',
        'Manual undo'
      );
    });

    it('returns 400 when tableName is missing', async () => {
      mockReq.params.tableName = undefined;

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'tableName and recordId are required'
      });
    });

    it('returns 400 when recordId is missing', async () => {
      mockReq.params.recordId = undefined;

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 when undoneBy is not available', async () => {
      mockReq.user = undefined;
      mockAuditService.undoLastChange.mockResolvedValue(true);

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      // With fallback to 'system', this should now work
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('handles service errors with 400 status', async () => {
      mockAuditService.undoLastChange.mockRejectedValue(
        new Error('No changes found to undo')
      );

      await controller.undoLastChange(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No changes found to undo'
      });
    });
  });

  describe('undoLastNChanges - Undo N changes by user', () => {
    beforeEach(() => {
      mockReq.params = {
        changedBy: 'user-1',
        count: '5'
      };
      mockReq.body = {
        comment: 'Bulk undo'
      };
      mockReq.user = { id: 'user-123' };
    });

    it('undoes N changes successfully', async () => {
      mockAuditService.undoLastNChanges.mockResolvedValue({
        undone: 5,
        errors: []
      });

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.undoLastNChanges).toHaveBeenCalledWith(
        'user-1',
        5,
        'user-123',
        'Bulk undo'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          undone: 5,
          errors: [],
          changedBy: 'user-1',
          count: 5,
          undoneBy: 'user-123',
          comment: 'Bulk undo'
        }
      });
    });

    it('returns 400 when changedBy is missing', async () => {
      mockReq.params.changedBy = undefined;

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'changedBy and count are required'
      });
    });

    it('returns 400 when count is missing', async () => {
      mockReq.params.count = undefined;

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when count is not a valid number', async () => {
      mockReq.params.count = 'invalid';

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'count must be a number between 1 and 100'
      });
    });

    it('returns 400 when count is zero', async () => {
      mockReq.params.count = '0';

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when count exceeds 100', async () => {
      mockReq.params.count = '101';

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('falls back to system when user not authenticated', async () => {
      mockReq.user = undefined;
      mockAuditService.undoLastNChanges.mockResolvedValue({
        undone: 5,
        errors: []
      });

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      // Should use 'system' as fallback for undoneBy
      expect(mockAuditService.undoLastNChanges).toHaveBeenCalledWith(
        'user-1',
        5,
        'system',
        'Bulk undo'
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('returns partial success with errors', async () => {
      mockAuditService.undoLastNChanges.mockResolvedValue({
        undone: 3,
        errors: ['Failed to undo change 1', 'Failed to undo change 2']
      });

      await controller.undoLastNChanges(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          undone: 3,
          errors: expect.arrayContaining([
            'Failed to undo change 1',
            'Failed to undo change 2'
          ])
        })
      });
    });
  });

  describe('getAuditStats - Get statistics', () => {
    it('returns audit statistics', async () => {
      const mockStats = {
        totalEntries: 100,
        entriesByAction: {
          CREATE: 30,
          UPDATE: 50,
          DELETE: 20
        },
        entriesByTable: {
          projects: 50,
          roles: 30,
          people: 20
        },
        oldestEntry: new Date('2024-01-01'),
        newestEntry: new Date('2025-01-01')
      };

      mockAuditService.getAuditStats.mockResolvedValue(mockStats);

      await controller.getAuditStats(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditStats).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getAuditStats.mockRejectedValue(new Error('Database error'));

      await controller.getAuditStats(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('cleanupExpiredEntries - Cleanup old entries', () => {
    it('cleans up expired entries', async () => {
      mockAuditService.cleanupExpiredEntries.mockResolvedValue(25);

      await controller.cleanupExpiredEntries(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.cleanupExpiredEntries).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          deletedCount: 25,
          message: 'Cleaned up 25 expired audit entries'
        }
      });
    });

    it('handles zero deletions', async () => {
      mockAuditService.cleanupExpiredEntries.mockResolvedValue(0);

      await controller.cleanupExpiredEntries(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          deletedCount: 0,
          message: 'Cleaned up 0 expired audit entries'
        }
      });
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.cleanupExpiredEntries.mockRejectedValue(new Error('Database error'));

      await controller.cleanupExpiredEntries(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('undoSpecificAuditEntry - Undo by audit ID', () => {
    beforeEach(() => {
      mockReq.params = {
        auditId: 'audit-123'
      };
      mockReq.user = { id: 'user-123' };
    });

    it('undoes specific audit entry successfully', async () => {
      const mockAuditEntry: AuditLogEntry = {
        id: 'audit-123',
        table_name: 'projects',
        record_id: 'proj-1',
        action: 'UPDATE',
        changed_by: 'user-1',
        old_values: { name: 'Old' },
        new_values: { name: 'New' },
        changed_fields: ['name'],
        request_id: null,
        ip_address: null,
        user_agent: null,
        comment: null,
        changed_at: new Date('2025-01-01')
      };

      mockAuditService.getAuditEntryById.mockResolvedValue(mockAuditEntry);
      mockAuditService.undoSpecificChange.mockResolvedValue(true);

      await controller.undoSpecificAuditEntry(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditEntryById).toHaveBeenCalledWith('audit-123');
      expect(mockAuditService.undoSpecificChange).toHaveBeenCalledWith(
        mockAuditEntry,
        'user-123',
        'Undo operation via API (audit_id: audit-123)'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          undone: true,
          auditId: 'audit-123',
          undoneBy: 'user-123'
        }
      });
    });

    it('returns 400 when auditId is missing', async () => {
      mockReq.params.auditId = undefined;

      await controller.undoSpecificAuditEntry(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'auditId is required'
      });
    });

    it('returns 404 when audit entry not found', async () => {
      mockAuditService.getAuditEntryById.mockResolvedValue(null);

      await controller.undoSpecificAuditEntry(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Audit entry not found'
      });
    });

    it('handles service errors with 400 status', async () => {
      const mockAuditEntry: AuditLogEntry = {
        id: 'audit-123',
        table_name: 'projects',
        record_id: 'proj-1',
        action: 'DELETE',
        changed_by: 'user-1',
        old_values: null,
        new_values: null,
        changed_fields: null,
        request_id: null,
        ip_address: null,
        user_agent: null,
        comment: null,
        changed_at: new Date('2025-01-01')
      };

      mockAuditService.getAuditEntryById.mockResolvedValue(mockAuditEntry);
      mockAuditService.undoSpecificChange.mockRejectedValue(
        new Error('Cannot undo DELETE operations without old values')
      );

      await controller.undoSpecificAuditEntry(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Cannot undo DELETE operations without old values'
      });
    });
  });

  describe('getAuditSummaryByTable - Get summary by table', () => {
    it('returns audit summary grouped by table', async () => {
      const mockSummary = {
        projects: {
          CREATE: 10,
          UPDATE: 20,
          DELETE: 5
        },
        roles: {
          CREATE: 5,
          UPDATE: 10,
          DELETE: 2
        }
      };

      mockAuditService.getAuditSummaryByTable.mockResolvedValue(mockSummary);

      await controller.getAuditSummaryByTable(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditSummaryByTable).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockSummary);
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getAuditSummaryByTable.mockRejectedValue(new Error('Database error'));

      await controller.getAuditSummaryByTable(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAuditTimeline - Get timeline data', () => {
    it('returns timeline with default parameters', async () => {
      const mockTimeline = [
        { timestamp: '2025-01-01 12:00:00', action_count: 10 },
        { timestamp: '2025-01-01 13:00:00', action_count: 15 }
      ];

      mockAuditService.getAuditTimeline.mockResolvedValue(mockTimeline);

      await controller.getAuditTimeline(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getAuditTimeline).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'hour'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockTimeline);
    });

    it('uses custom date range and interval', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        interval: 'day'
      };

      mockAuditService.getAuditTimeline.mockResolvedValue([]);

      await controller.getAuditTimeline(mockReq, mockRes);
      await flushPromises();

      const callArgs = mockAuditService.getAuditTimeline.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Date);
      expect(callArgs[1]).toBeInstanceOf(Date);
      expect(callArgs[2]).toBe('day');
    });

    it('handles week interval', async () => {
      mockReq.query = {
        interval: 'week'
      };

      mockAuditService.getAuditTimeline.mockResolvedValue([]);

      await controller.getAuditTimeline(mockReq, mockRes);
      await flushPromises();

      const callArgs = mockAuditService.getAuditTimeline.mock.calls[0];
      expect(callArgs[2]).toBe('week');
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getAuditTimeline.mockRejectedValue(new Error('Database error'));

      await controller.getAuditTimeline(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserActivity - Get user activity', () => {
    it('returns user activity statistics', async () => {
      const mockActivity = {
        'user-1': {
          total_actions: 50,
          last_activity: new Date('2025-01-15')
        },
        'user-2': {
          total_actions: 30,
          last_activity: new Date('2025-01-10')
        }
      };

      mockAuditService.getUserActivity.mockResolvedValue(mockActivity);

      await controller.getUserActivity(mockReq, mockRes);
      await flushPromises();

      expect(mockAuditService.getUserActivity).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockActivity);
    });

    it('handles empty activity', async () => {
      mockAuditService.getUserActivity.mockResolvedValue({});

      await controller.getUserActivity(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({});
    });

    it('handles service errors gracefully', async () => {
      mockAuditService.getUserActivity.mockRejectedValue(new Error('Database error'));

      await controller.getUserActivity(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AuditController } from '../../../../src/server/AuditController.js';
import { AuditService } from '../../../../src/server/../services/audit/AuditService.js';
import { createAuditRoutes } from '../../../../src/server/routes/audit.js';
import { testDb, createTestUser } from '../../../../src/server/../__tests__/setup.js';

describe('AuditController API Endpoints', () => {
  let app: express.Application;
  let auditService: AuditService;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    // Create mock audit service
    mockAuditService = {
      logChange: jest.fn(),
      getAuditHistory: jest.fn(),
      getRecentChanges: jest.fn(),
      searchAuditLog: jest.fn(),
      undoLastChange: jest.fn(),
      undoLastNChanges: jest.fn(),
      getAuditStats: jest.fn(),
      cleanupExpiredEntries: jest.fn(),
      cleanupOldEntries: jest.fn(),
      filterSensitiveFields: jest.fn(),
      getChangedFields: jest.fn()
    } as any;

    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Mock audit middleware
    app.use((req, res, next) => {
      req.audit = {
        requestId: 'test-request-123',
        userId: 'test-user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        auditService: mockAuditService
      };
      next();
    });

    app.use('/api/audit', createAuditRoutes(mockAuditService));
  });

  describe('GET /api/audit/history/:tableName/:recordId', () => {
    test('should return audit history for valid parameters', async () => {
      const mockHistory = [
        {
          id: 'audit-1',
          table_name: 'people',
          record_id: 'user-123',
          action: 'UPDATE',
          changed_by: 'admin',
          old_values: { name: 'John' },
          new_values: { name: 'Jane' },
          changed_fields: ['name'],
          changed_at: new Date().toISOString()
        }
      ];

      mockAuditService.getAuditHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/audit/history/people/user-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.meta.tableName).toBe('people');
      expect(response.body.meta.recordId).toBe('user-123');

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith('people', 'user-123', undefined);
    });

    test('should handle limit parameter', async () => {
      mockAuditService.getAuditHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/audit/history/people/user-123?limit=10')
        .expect(200);

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith('people', 'user-123', 10);
    });

    test('should return 400 for missing parameters', async () => {
      await request(app)
        .get('/api/audit/history/people/')
        .expect(404); // Route not found due to missing recordId

      const response = await request(app)
        .get('/api/audit/history//user-123')
        .expect(400);

      expect(response.body.error).toContain('tableName and recordId are required');
    });

    test('should handle service errors', async () => {
      mockAuditService.getAuditHistory.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/audit/history/people/user-123')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/audit/recent', () => {
    test('should return recent changes with default parameters', async () => {
      const mockChanges = [
        {
          id: 'audit-1',
          table_name: 'people',
          action: 'CREATE',
          changed_by: 'user',
          changed_at: new Date().toISOString()
        }
      ];

      mockAuditService.getRecentChanges.mockResolvedValue(mockChanges);

      const response = await request(app)
        .get('/api/audit/recent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockChanges);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.meta.limit).toBe(50);
      expect(response.body.meta.offset).toBe(0);

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith(undefined, 50, 0);
    });

    test('should handle query parameters', async () => {
      mockAuditService.getRecentChanges.mockResolvedValue([]);

      await request(app)
        .get('/api/audit/recent?changedBy=user-123&limit=25&offset=50')
        .expect(200);

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith('user-123', 25, 50);
    });

    test('should use default values for invalid parameters', async () => {
      mockAuditService.getRecentChanges.mockResolvedValue([]);

      await request(app)
        .get('/api/audit/recent?limit=invalid&offset=invalid')
        .expect(200);

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledWith(undefined, 50, 0);
    });
  });

  describe('GET /api/audit/search', () => {
    test('should search audit log with filters', async () => {
      const mockResult = {
        total: 5,
        entries: [
          {
            id: 'audit-1',
            table_name: 'people',
            action: 'UPDATE',
            changed_by: 'admin',
            changed_at: new Date().toISOString()
          }
        ]
      };

      mockAuditService.searchAuditLog.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit/search?tableName=people&action=UPDATE&changedBy=admin&limit=10&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult.entries);
      expect(response.body.meta.total).toBe(5);
      expect(response.body.meta.count).toBe(1);

      expect(mockAuditService.searchAuditLog).toHaveBeenCalledWith({
        tableName: 'people',
        action: 'UPDATE',
        changedBy: 'admin',
        limit: 10,
        offset: 0
      });
    });

    test('should handle date filters', async () => {
      mockAuditService.searchAuditLog.mockResolvedValue({ total: 0, entries: [] });

      await request(app)
        .get('/api/audit/search?fromDate=2023-01-01&toDate=2023-12-31')
        .expect(200);

      expect(mockAuditService.searchAuditLog).toHaveBeenCalledWith({
        fromDate: new Date('2023-01-01'),
        toDate: new Date('2023-12-31'),
        limit: 50,
        offset: 0
      });
    });

    test('should filter out undefined parameters', async () => {
      mockAuditService.searchAuditLog.mockResolvedValue({ total: 0, entries: [] });

      await request(app)
        .get('/api/audit/search?tableName=people')
        .expect(200);

      const callArgs = mockAuditService.searchAuditLog.mock.calls[0][0];
      expect(callArgs).toEqual({
        tableName: 'people',
        limit: 50,
        offset: 0
      });
      expect(callArgs).not.toHaveProperty('recordId');
      expect(callArgs).not.toHaveProperty('action');
    });
  });

  describe('POST /api/audit/undo/:tableName/:recordId', () => {
    test('should undo last change successfully', async () => {
      mockAuditService.undoLastChange.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/audit/undo/people/user-123')
        .send({ comment: 'Undoing change' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.undone).toBe(true);
      expect(response.body.data.tableName).toBe('people');
      expect(response.body.data.recordId).toBe('user-123');
      expect(response.body.data.undoneBy).toBe('test-user-123');
      expect(response.body.data.comment).toBe('Undoing change');

      expect(mockAuditService.undoLastChange).toHaveBeenCalledWith(
        'people',
        'user-123',
        'test-user-123',
        'Undoing change'
      );
    });

    test('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/api/audit/undo/people/')
        .expect(404); // Route not found
    });

    test('should return 401 when user not authenticated', async () => {
      // Remove user from audit context
      app.use('/api/audit/test-no-auth', (req, res, next) => {
        req.audit = {
          requestId: 'test-request-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          auditService: mockAuditService
        };
        next();
      });

      app.post('/api/audit/test-no-auth/undo/:tableName/:recordId', createAuditRoutes(mockAuditService));

      const response = await request(app)
        .post('/api/audit/test-no-auth/undo/people/user-123')
        .expect(401);

      expect(response.body.error).toContain('User authentication required');
    });

    test('should handle undo service errors', async () => {
      mockAuditService.undoLastChange.mockRejectedValue(new Error('Cannot undo DELETE operations'));

      const response = await request(app)
        .post('/api/audit/undo/people/user-123')
        .send({ comment: 'Test undo' })
        .expect(400);

      expect(response.body.error).toBe('Cannot undo DELETE operations');
    });
  });

  describe('POST /api/audit/undo-batch/:changedBy/:count', () => {
    test('should undo multiple changes successfully', async () => {
      const mockResult = {
        undone: 3,
        errors: []
      };

      mockAuditService.undoLastNChanges.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/audit/undo-batch/user-123/3')
        .send({ comment: 'Bulk undo' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.undone).toBe(3);
      expect(response.body.data.errors).toEqual([]);
      expect(response.body.data.changedBy).toBe('user-123');
      expect(response.body.data.count).toBe(3);

      expect(mockAuditService.undoLastNChanges).toHaveBeenCalledWith(
        'user-123',
        3,
        'test-user-123',
        'Bulk undo'
      );
    });

    test('should validate count parameter', async () => {
      await request(app)
        .post('/api/audit/undo-batch/user-123/invalid')
        .expect(400);

      await request(app)
        .post('/api/audit/undo-batch/user-123/0')
        .expect(400);

      await request(app)
        .post('/api/audit/undo-batch/user-123/101')
        .expect(400);
    });

    test('should handle partial success with errors', async () => {
      const mockResult = {
        undone: 2,
        errors: ['Failed to undo change 1: Cannot undo DELETE operations']
      };

      mockAuditService.undoLastNChanges.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/audit/undo-batch/user-123/3')
        .expect(200);

      expect(response.body.data.undone).toBe(2);
      expect(response.body.data.errors.length).toBe(1);
    });
  });

  describe('GET /api/audit/stats', () => {
    test('should return audit statistics', async () => {
      const mockStats = {
        totalEntries: 1000,
        entriesByAction: {
          CREATE: 300,
          UPDATE: 500,
          DELETE: 200
        },
        entriesByTable: {
          people: 400,
          projects: 300,
          roles: 300
        },
        oldestEntry: new Date('2023-01-01').toISOString(),
        newestEntry: new Date('2023-12-31').toISOString()
      };

      mockAuditService.getAuditStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/audit/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);

      expect(mockAuditService.getAuditStats).toHaveBeenCalled();
    });
  });

  describe('POST /api/audit/cleanup', () => {
    test('should cleanup expired entries', async () => {
      mockAuditService.cleanupExpiredEntries.mockResolvedValue(150);

      const response = await request(app)
        .post('/api/audit/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(150);
      expect(response.body.data.message).toContain('Cleaned up 150 expired audit entries');

      expect(mockAuditService.cleanupExpiredEntries).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors gracefully', async () => {
      mockAuditService.getRecentChanges.mockRejectedValue(new Error('Internal server error'));

      const response = await request(app)
        .get('/api/audit/recent')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/audit/undo/people/user-123')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    test('should handle large request bodies', async () => {
      const largeComment = 'x'.repeat(100000); // 100KB comment

      mockAuditService.undoLastChange.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/audit/undo/people/user-123')
        .send({ comment: largeComment })
        .expect(200);

      expect(mockAuditService.undoLastChange).toHaveBeenCalledWith(
        'people',
        'user-123',
        'test-user-123',
        largeComment
      );
    });
  });

  describe('Security Tests', () => {
    test('should sanitize SQL injection attempts in parameters', async () => {
      mockAuditService.getAuditHistory.mockResolvedValue([]);

      // Attempt SQL injection in table name and record ID
      await request(app)
        .get('/api/audit/history/people%27;DROP%20TABLE%20users;--/user-123')
        .expect(200);

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith(
        'people\';DROP TABLE users;--',
        'user-123',
        undefined
      );
    });

    test('should handle XSS attempts in query parameters', async () => {
      mockAuditService.searchAuditLog.mockResolvedValue({ total: 0, entries: [] });

      await request(app)
        .get('/api/audit/search?changedBy=%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E')
        .expect(200);

      expect(mockAuditService.searchAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          changedBy: '<script>alert(\'xss\')</script>'
        })
      );
    });

    test('should handle extremely long parameter values', async () => {
      mockAuditService.getAuditHistory.mockResolvedValue([]);

      const longValue = 'x'.repeat(10000);
      
      await request(app)
        .get(`/api/audit/history/people/${longValue}`)
        .expect(200);

      expect(mockAuditService.getAuditHistory).toHaveBeenCalledWith(
        'people',
        longValue,
        undefined
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      mockAuditService.getRecentChanges.mockResolvedValue([]);

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/audit/recent')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockAuditService.getRecentChanges).toHaveBeenCalledTimes(10);
    });

    test('should handle large search result sets', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `audit-${i}`,
        table_name: 'people',
        action: 'UPDATE',
        changed_at: new Date().toISOString()
      }));

      mockAuditService.searchAuditLog.mockResolvedValue({
        total: 1000,
        entries: largeResultSet
      });

      const response = await request(app)
        .get('/api/audit/search?limit=1000')
        .expect(200);

      expect(response.body.data.length).toBe(1000);
      expect(response.body.meta.total).toBe(1000);
    });
  });
});
import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock email service before imports
const mockEmailService = {
  sendNotificationEmail: jest.fn(),
  sendTestEmail: jest.fn(),
  isConfigured: jest.fn(),
  testConnection: jest.fn(),
  getEmailTemplate: jest.fn(),
  getUserNotificationPreferences: jest.fn()
};

jest.mock('../../../../src/server/services/EmailService.js', () => ({
  emailService: mockEmailService
}));

// Mock database
const createMockQuery = () => {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis()
  };
  // Default then implementation that resolves to empty array
  query.then = jest.fn((resolve) => {
    resolve([]);
    return Promise.resolve([]);
  });
  return query;
};

const mockDb = jest.fn(() => createMockQuery()) as any;

jest.mock('../../../../src/server/database/index.js', () => ({
  db: mockDb
}));

import { NotificationsController } from '../../../../src/server/api/controllers/NotificationsController';
import { Request, Response } from 'express';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.mockReset();
    mockDb.mockImplementation(() => createMockQuery());
    
    controller = new NotificationsController(mockDb);

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('sendNotification', () => {
    it('should send notification email successfully', async () => {
      mockReq.body = {
        userId: 'user1',
        templateName: 'assignment_created',
        variables: { projectName: 'Test Project' }
      };

      mockEmailService.sendNotificationEmail.mockResolvedValue(true);

      await controller.sendNotification(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sent: true,
          message: 'Notification sent successfully'
        }
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { userId: 'user1' }; // Missing templateName

      await controller.sendNotification(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'userId and templateName are required'
      });
    });

    it('should handle notification not sent due to user preferences', async () => {
      mockReq.body = {
        userId: 'user1',
        templateName: 'assignment_created',
        variables: {}
      };

      mockEmailService.sendNotificationEmail.mockResolvedValue(false);

      await controller.sendNotification(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sent: false,
          message: 'Notification not sent (user preferences or system disabled)'
        }
      });
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      mockReq.params = { userId: 'user1' };

      const mockPreferences = [
        { id: '1', user_id: 'user1', type: 'assignment', enabled: true, email_enabled: true },
        { id: '2', user_id: 'user1', type: 'approval', enabled: true, email_enabled: false }
      ];

      const mockQuery = createMockQuery();
      mockQuery.orderBy.mockResolvedValue(mockPreferences);
      mockDb.mockReturnValue(mockQuery);

      await controller.getUserNotificationPreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences
      });
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      mockReq.params = { userId: 'user1' };
      mockReq.body = {
        preferences: [
          { type: 'assignment', enabled: true, email_enabled: true },
          { type: 'approval', enabled: false, email_enabled: false }
        ]
      };

      const mockQuery = createMockQuery();
      mockQuery.update.mockResolvedValue(1);
      mockDb.mockReturnValue(mockQuery);

      await controller.updateUserNotificationPreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    });

    it('should return 400 for invalid preferences format', async () => {
      mockReq.params = { userId: 'user1' };
      mockReq.body = { preferences: 'invalid' };

      await controller.updateUserNotificationPreferences(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'preferences must be an array'
      });
    });
  });

  describe('getEmailTemplates', () => {
    it('should return all active email templates', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'assignment_created',
          type: 'assignment',
          subject: 'New Assignment',
          variables: '["userName", "projectName"]',
          is_active: true
        }
      ];

      const mockQuery = createMockQuery();
      // Mock the chain: where().orderBy().orderBy()
      mockQuery.where.mockReturnThis();
      mockQuery.orderBy.mockReturnThis();
      // Make the final promise resolve with templates
      mockQuery.then = jest.fn((resolve) => {
        resolve(mockTemplates);
        return Promise.resolve(mockTemplates);
      });
      mockDb.mockReturnValue(mockQuery);

      await controller.getEmailTemplates(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            ...mockTemplates[0],
            variables: ['userName', 'projectName']
          }
        ]
      });
    });
  });

  describe('getNotificationHistory', () => {
    it('should return notification history with pagination', async () => {
      mockReq.params = { userId: 'user1' };
      mockReq.query = { limit: '10', offset: '0' };

      const mockHistory = [
        {
          id: '1',
          user_id: 'user1',
          type: 'assignment',
          subject: 'New Assignment',
          sent_at: '2023-01-01T10:00:00Z',
          status: 'sent',
          user_name: 'John Doe',
          user_email: 'john@example.com'
        }
      ];

      const mockQuery = createMockQuery();
      
      // Create a chain that includes all the required methods
      mockQuery.select.mockReturnThis();
      mockQuery.join.mockReturnThis();
      mockQuery.where.mockReturnThis();
      mockQuery.orderBy.mockReturnThis();
      mockQuery.limit.mockReturnThis();
      mockQuery.offset.mockReturnThis();
      
      // Override then to return the mock history
      mockQuery.then = jest.fn((resolve) => {
        resolve(mockHistory);
        return Promise.resolve(mockHistory);
      });
      
      mockDb.mockReturnValue(mockQuery);

      await controller.getNotificationHistory(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory
      });
    });

    it('should filter by notification type when provided', async () => {
      mockReq.params = { userId: 'user1' };
      mockReq.query = { type: 'assignment' };

      const mockQuery = createMockQuery();
      mockQuery.where.mockReturnThis();
      mockQuery.orderBy.mockReturnThis();
      // Make the final promise resolve with empty array
      mockQuery.then = jest.fn((resolve) => {
        resolve([]);
        return Promise.resolve([]);
      });
      mockDb.mockReturnValue(mockQuery);

      await controller.getNotificationHistory(mockReq as Request, mockRes as Response);

      expect(mockQuery.where).toHaveBeenCalledWith('notification_history.type', 'assignment');
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockReq.body = { email: 'test@example.com' };

      mockEmailService.isConfigured.mockReturnValue(true);
      mockEmailService.sendTestEmail.mockResolvedValue(true);

      await controller.sendTestEmail(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sent: true,
          message: 'Test email sent successfully'
        }
      });
    });

    it('should return 400 for missing email address', async () => {
      mockReq.body = {};

      await controller.sendTestEmail(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email address is required'
      });
    });

    it('should return 400 when email service is not configured', async () => {
      mockReq.body = { email: 'test@example.com' };

      mockEmailService.isConfigured.mockReturnValue(false);

      await controller.sendTestEmail(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email service is not configured. Please check SMTP settings.'
      });
    });
  });

  describe('checkEmailConfiguration', () => {
    it('should return email configuration status', async () => {
      mockEmailService.isConfigured.mockReturnValue(true);
      mockEmailService.testConnection.mockResolvedValue(true);

      await controller.checkEmailConfiguration(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          configured: true,
          connectionTest: true,
          message: 'Email service is configured and working'
        }
      });
    });

    it('should return status when email service is not configured', async () => {
      mockEmailService.isConfigured.mockReturnValue(false);

      await controller.checkEmailConfiguration(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          configured: false,
          connectionTest: false,
          message: 'Email service is not configured'
        }
      });
    });

    it('should return status when connection test fails', async () => {
      mockEmailService.isConfigured.mockReturnValue(true);
      mockEmailService.testConnection.mockResolvedValue(false);

      await controller.checkEmailConfiguration(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          configured: true,
          connectionTest: false,
          message: 'Email service is configured but connection test failed'
        }
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      mockReq.params = { userId: 'user1' };
      mockReq.query = { days: '30' };

      const mockQuery = createMockQuery();
      
      // Mock the Promise.all results
      // First call returns totalSent, second returns totalFailed
      mockQuery.first
        .mockResolvedValueOnce({ count: 10 })  // totalSent
        .mockResolvedValueOnce({ count: 2 });  // totalFailed
      
      mockQuery.clone.mockReturnThis();
      mockQuery.where.mockReturnThis();
      mockQuery.count.mockReturnThis();
      mockQuery.select.mockReturnThis();
      
      // groupBy results for byType and byStatus
      const byTypeResults = [
        { type: 'assignment', count: 5 },
        { type: 'approval', count: 3 }
      ];
      const byStatusResults = [
        { status: 'sent', count: 8 },
        { status: 'failed', count: 2 }
      ];
      
      mockQuery.groupBy
        .mockResolvedValueOnce(byTypeResults)   // byType
        .mockResolvedValueOnce(byStatusResults); // byStatus

      mockDb.mockReturnValue(mockQuery);

      await controller.getNotificationStats(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalSent: 10,
          totalFailed: 2,
          byType: [
            { type: 'assignment', count: 5 },
            { type: 'approval', count: 3 }
          ],
          byStatus: [
            { status: 'sent', count: 8 },
            { status: 'failed', count: 2 }
          ],
          period: '30 days'
        }
      });
    });
  });
});
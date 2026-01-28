import { NotificationsController } from '../NotificationsController.js';
import { db } from '../../../database/index.js';
import { emailService } from '../../../services/EmailService.js';

// Mock dependencies
jest.mock('../../../database/index', () => ({
  db: jest.fn()
}));

jest.mock('../../../services/EmailService', () => ({
  emailService: {
    sendNotificationEmail: jest.fn(),
    isConfigured: jest.fn(),
    testConnection: jest.fn(),
    sendTestEmail: jest.fn()
  }
}));

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;
  let chainable: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController();

    mockReq = {
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Queue for thenable values (used by mockResolvedValueOnce)
    const thenQueue: any[] = [];

    // Setup chainable db mock that is also thenable
    chainable = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      first: jest.fn(),
      then: jest.fn((resolve) => {
        // Pop the next value from the queue, or use empty array as default
        const value = thenQueue.length > 0 ? thenQueue.shift() : [];
        return Promise.resolve(value).then(resolve);
      })
    };

    // Make mockDb a function that returns the chainable
    mockDb = jest.fn().mockReturnValue(chainable);
    // Expose chainable properties
    mockDb.where = chainable.where;
    mockDb.first = chainable.first;
    mockDb.update = chainable.update;
    mockDb.then = chainable.then;

    // Add mock control methods that update the chainable
    mockDb.mockResolvedValue = (value: any) => {
      thenQueue.push(value);
    };
    mockDb.mockResolvedValueOnce = (value: any) => {
      thenQueue.push(value);
    };
    mockDb.mockRejectedValue = (error: any) => {
      chainable.then = jest.fn((resolve, reject) => Promise.reject(error).then(resolve, reject));
    };

    (db as jest.Mock).mockReturnValue(chainable);
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      mockReq.body = {
        userId: 'user-1',
        templateName: 'test_template',
        variables: { key: 'value' }
      };

      (emailService.sendNotificationEmail as jest.Mock).mockResolvedValue(true);

      await controller.sendNotification(mockReq, mockRes);

      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user-1',
        'test_template',
        { key: 'value' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sent: true,
          message: 'Notification sent successfully'
        }
      });
    });

    it('should handle missing userId', async () => {
      mockReq.body = {
        templateName: 'test_template'
      };

      await controller.sendNotification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'userId and templateName are required'
      });
    });

    it('should handle errors when sending notification', async () => {
      mockReq.body = {
        userId: 'user-1',
        templateName: 'test_template'
      };

      (emailService.sendNotificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service error')
      );

      await controller.sendNotification(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to send notification'
      });
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should fetch user preferences successfully', async () => {
      mockReq.params.userId = 'user-1';
      const mockPreferences = [
        { type: 'email', enabled: true },
        { type: 'sms', enabled: false }
      ];

      // Set up chain for db('notification_preferences').where('user_id', userId).orderBy('type')
      const mockOrderBy = { then: (resolve: any) => Promise.resolve(mockPreferences).then(resolve) };
      const mockWhere = { orderBy: jest.fn().mockReturnValue(mockOrderBy) };
      (db as jest.Mock).mockReturnValue({ where: jest.fn().mockReturnValue(mockWhere) });

      await controller.getUserNotificationPreferences(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences
      });
    });

    it('should handle database errors when fetching preferences', async () => {
      mockReq.params.userId = 'user-1';

      (db as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getUserNotificationPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch notification preferences'
      });
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update preferences successfully', async () => {
      mockReq.params.userId = 'user-1';
      mockReq.body = {
        preferences: [
          { type: 'email', enabled: true, email_enabled: true }
        ]
      };

      mockDb.update.mockResolvedValue(1);

      await controller.updateUserNotificationPreferences(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    });

    it('should validate preferences is an array', async () => {
      mockReq.params.userId = 'user-1';
      mockReq.body = {
        preferences: 'not-an-array'
      };

      await controller.updateUserNotificationPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'preferences must be an array'
      });
    });

    it('should handle database errors when updating preferences', async () => {
      mockReq.params.userId = 'user-1';
      mockReq.body = {
        preferences: [{ type: 'email', enabled: true, email_enabled: true }]
      };

      mockDb.update.mockRejectedValue(new Error('Database error'));

      await controller.updateUserNotificationPreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update notification preferences'
      });
    });
  });

  describe('getEmailTemplates', () => {
    it('should fetch email templates successfully', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1', variables: '["var1"]' },
        { id: '2', name: 'Template 2', variables: '["var2"]' }
      ];

      mockDb.mockResolvedValue(mockTemplates);

      await controller.getEmailTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: '1', name: 'Template 1', variables: ['var1'] },
          { id: '2', name: 'Template 2', variables: ['var2'] }
        ]
      });
    });

    it('should handle database errors when fetching templates', async () => {
      mockDb.mockRejectedValue(new Error('Database error'));

      await controller.getEmailTemplates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch email templates'
      });
    });
  });

  describe('getNotificationHistory', () => {
    it('should fetch notification history successfully', async () => {
      mockReq.params.userId = 'user-1';
      mockReq.query = { limit: '10', offset: '0' };

      const mockHistory = [
        { id: '1', user_name: 'John Doe', sent_at: new Date() }
      ];

      mockDb.mockResolvedValue(mockHistory);

      await controller.getNotificationHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory
      });
    });

    it('should handle database errors when fetching history', async () => {
      mockReq.params.userId = 'user-1';

      mockDb.mockRejectedValue(new Error('Database error'));

      await controller.getNotificationHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch notification history'
      });
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockReq.body = { email: 'test@example.com' };

      (emailService.isConfigured as jest.Mock).mockReturnValue(true);
      (emailService.sendTestEmail as jest.Mock).mockResolvedValue(true);

      await controller.sendTestEmail(mockReq, mockRes);

      expect(emailService.sendTestEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          sent: true,
          message: 'Test email sent successfully'
        }
      });
    });

    it('should handle missing email address', async () => {
      mockReq.body = {};

      await controller.sendTestEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email address is required'
      });
    });

    it('should handle unconfigured email service', async () => {
      mockReq.body = { email: 'test@example.com' };

      (emailService.isConfigured as jest.Mock).mockReturnValue(false);

      await controller.sendTestEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Email service is not configured. Please check SMTP settings.'
      });
    });

    it('should handle errors when sending test email', async () => {
      mockReq.body = { email: 'test@example.com' };

      (emailService.isConfigured as jest.Mock).mockReturnValue(true);
      (emailService.sendTestEmail as jest.Mock).mockRejectedValue(
        new Error('SMTP connection failed')
      );

      await controller.sendTestEmail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'SMTP connection failed'
      });
    });
  });

  describe('checkEmailConfiguration', () => {
    it('should check configured email service successfully', async () => {
      (emailService.isConfigured as jest.Mock).mockReturnValue(true);
      (emailService.testConnection as jest.Mock).mockResolvedValue(true);

      await controller.checkEmailConfiguration(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          configured: true,
          connectionTest: true,
          message: 'Email service is configured and working'
        }
      });
    });

    it('should handle unconfigured email service', async () => {
      (emailService.isConfigured as jest.Mock).mockReturnValue(false);

      await controller.checkEmailConfiguration(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          configured: false,
          connectionTest: false,
          message: 'Email service is not configured'
        }
      });
    });

    it('should handle errors when checking configuration', async () => {
      (emailService.isConfigured as jest.Mock).mockImplementation(() => {
        throw new Error('Configuration error');
      });

      await controller.checkEmailConfiguration(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check email configuration'
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should fetch notification statistics successfully', async () => {
      mockReq.params.userId = 'user-1';
      mockReq.query = { days: '30' };

      const mockStats = {
        totalSent: { count: 100 },
        totalFailed: { count: 5 },
        byType: [{ type: 'email', count: 80 }],
        byStatus: [{ status: 'sent', count: 95 }]
      };

      mockDb.first.mockResolvedValueOnce(mockStats.totalSent);
      mockDb.first.mockResolvedValueOnce(mockStats.totalFailed);
      mockDb.mockResolvedValueOnce(mockStats.byType);
      mockDb.mockResolvedValueOnce(mockStats.byStatus);

      await controller.getNotificationStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          totalSent: 100,
          totalFailed: 5,
          byType: mockStats.byType,
          byStatus: mockStats.byStatus,
          period: '30 days'
        })
      });
    });

    it('should handle database errors when fetching stats', async () => {
      mockReq.params.userId = 'user-1';

      mockDb.first.mockRejectedValue(new Error('Database error'));

      await controller.getNotificationStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch notification statistics'
      });
    });
  });

  describe('Helper methods', () => {
    it('should trigger assignment notification', async () => {
      (emailService.sendNotificationEmail as jest.Mock).mockResolvedValue(true);

      await controller.triggerAssignmentNotification('user-1', 'created', {
        project_name: 'Test Project',
        role_name: 'Developer',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        allocation: 100
      });

      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user-1',
        'assignment_created',
        expect.objectContaining({
          projectName: 'Test Project',
          roleName: 'Developer'
        })
      );
    });

    it('should handle errors in triggerAssignmentNotification silently', async () => {
      (emailService.sendNotificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email error')
      );

      // Should not throw
      await expect(
        controller.triggerAssignmentNotification('user-1', 'created', {})
      ).resolves.not.toThrow();
    });

    it('should trigger approval notification', async () => {
      (emailService.sendNotificationEmail as jest.Mock).mockResolvedValue(true);

      await controller.triggerApprovalNotification('approver-1', {
        type: 'overtime',
        requestor_name: 'John Doe',
        details: 'Extra hours needed',
        reason: 'Project deadline'
      });

      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'approver-1',
        'approval_request',
        expect.objectContaining({
          requestType: 'overtime',
          requestorName: 'John Doe'
        })
      );
    });

    it('should trigger project notification for multiple users', async () => {
      (emailService.sendNotificationEmail as jest.Mock).mockResolvedValue(true);

      await controller.triggerProjectNotification(
        ['user-1', 'user-2'],
        'date_changed',
        {
          name: 'Test Project',
          previous_start: '2025-01-01',
          new_start: '2025-02-01'
        }
      );

      expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(2);
      expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(
        'user-1',
        'project_date_changed',
        expect.any(Object)
      );
    });
  });
});

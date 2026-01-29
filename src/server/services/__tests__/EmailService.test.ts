// Mock logging first to prevent getConfig from being called during module load
jest.mock('../logging/config.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock config module with mutable state
const mockEmailConfig = {
  host: 'smtp.test.com',
  port: 587,
  secure: false,
  user: 'test@test.com',
  pass: 'testpass',
  from: 'noreply@test.com',
  appUrl: 'http://localhost:3000'
};

jest.mock('../../config/index.js', () => ({
  getConfig: () => ({
    env: 'test',
    isProduction: false,
    isDevelopment: false,
    isTest: true,
    isE2E: false,
    email: mockEmailConfig,
    logging: { level: 'error', serviceName: 'test', enableTestLogs: false },
    audit: {
      enabled: true,
      maxHistoryEntries: 1000,
      retentionDays: 365,
      sensitiveFields: ['password', 'token', 'secret'],
      enabledTables: ['projects', 'people']
    }
  }),
  resetConfig: () => {}
}));

import { EmailService } from '../EmailService.js';
import { getAuditedDb } from '../../database/index.js';
import nodemailer from 'nodemailer';

// Mock dependencies
jest.mock('../../database/index', () => ({
  getAuditedDb: jest.fn()
}));

jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockDb: any;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chainable db mock that is also thenable
    const chainable = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      then: jest.fn((resolve) => Promise.resolve([]).then(resolve))
    };

    // mockDb is a function that returns the chainable object
    mockDb = jest.fn().mockReturnValue(chainable);
    // Also expose the chainable methods for easy access in tests
    mockDb.where = chainable.where;
    mockDb.first = chainable.first;
    mockDb.insert = chainable.insert;
    mockDb.then = chainable.then;

    (getAuditedDb as jest.Mock).mockReturnValue(mockDb);

    // Setup nodemailer mock
    mockTransporter = {
      verify: jest.fn(),
      sendMail: jest.fn()
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Reset mock email config to default values
    mockEmailConfig.host = 'smtp.test.com';
    mockEmailConfig.port = 587;
    mockEmailConfig.secure = false;
    mockEmailConfig.user = 'test@test.com';
    mockEmailConfig.pass = 'testpass';
    mockEmailConfig.from = 'noreply@test.com';
    mockEmailConfig.appUrl = 'http://localhost:3000';
  });

  afterEach(() => {
    // Clean up mock state if needed
    jest.clearAllMocks();
  });

  describe('getEmailTemplate', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should fetch email template successfully', async () => {
      const mockTemplate = {
        id: '1',
        name: 'test_template',
        type: 'notification',
        subject: 'Test Subject',
        body_html: '<p>Test</p>',
        body_text: 'Test',
        variables: '["var1", "var2"]',
        is_active: true
      };

      mockDb.first.mockResolvedValue(mockTemplate);

      const result = await emailService.getEmailTemplate('test_template');

      expect(result).toEqual({
        ...mockTemplate,
        variables: ['var1', 'var2']
      });
    });

    it('should return null when template not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await emailService.getEmailTemplate('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const result = await emailService.getEmailTemplate('test_template');

      expect(result).toBeNull();
    });
  });

  describe('getUserNotificationPreferences', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should fetch user preferences successfully', async () => {
      const mockPreferences = [
        { user_id: 'user-1', type: 'email', enabled: true, email_enabled: true }
      ];

      // Mock the chainable to resolve to mockPreferences
      mockDb.then.mockImplementation((resolve: any) => Promise.resolve(mockPreferences).then(resolve));

      const result = await emailService.getUserNotificationPreferences('user-1');

      expect(result).toEqual(mockPreferences);
    });

    it('should return empty array on database error', async () => {
      // Mock the chainable to reject
      mockDb.then.mockImplementation((resolve: any, reject: any) => {
        Promise.reject(new Error('Database error')).then(resolve, reject);
      });

      const result = await emailService.getUserNotificationPreferences('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('shouldSendNotification', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should return false when system email notifications are disabled', async () => {
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: false })
      };

      mockDb.first.mockResolvedValueOnce(mockSettings);

      const result = await emailService.shouldSendNotification('user-1', 'test');

      expect(result).toBe(false);
    });

    it('should check user preferences when system notifications enabled', async () => {
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: true })
      };

      const mockPreference = {
        user_id: 'user-1',
        type: 'test',
        enabled: true,
        email_enabled: true
      };

      mockDb.first.mockResolvedValueOnce(mockSettings);
      mockDb.first.mockResolvedValueOnce(mockPreference);

      const result = await emailService.shouldSendNotification('user-1', 'test');

      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const result = await emailService.shouldSendNotification('user-1', 'test');

      expect(result).toBe(false);
    });
  });

  describe('renderTemplate', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should render simple template variables', () => {
      const template = 'Hello {{userName}}, welcome to {{appName}}!';
      const variables = { userName: 'John', appName: 'Capacinator' };

      const result = emailService.renderTemplate(template, variables);

      expect(result).toBe('Hello John, welcome to Capacinator!');
    });

    it('should handle array variables with handlebars-style loops', () => {
      const template = '{{#items}}<li>{{name}}</li>{{/items}}';
      const variables = {
        items: [
          { name: 'Item 1' },
          { name: 'Item 2' }
        ]
      };

      const result = emailService.renderTemplate(template, variables);

      expect(result).toBe('<li>Item 1</li><li>Item 2</li>');
    });

    it('should return empty string for non-array values in loops', () => {
      const template = '{{#items}}<li>{{name}}</li>{{/items}}';
      const variables = { items: 'not-an-array' };

      const result = emailService.renderTemplate(template, variables);

      expect(result).toBe('');
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send email successfully when user preferences allow', async () => {
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: true })
      };

      const mockPreference = {
        enabled: true,
        email_enabled: true
      };

      mockDb.first.mockResolvedValueOnce(mockSettings);
      mockDb.first.mockResolvedValueOnce(mockPreference);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });
      mockDb.insert.mockResolvedValue([]);

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        type: 'test',
        userId: 'user-1'
      });

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should handle email send errors and log failure', async () => {
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: true })
      };

      const mockPreference = {
        enabled: true,
        email_enabled: true
      };

      mockDb.first.mockResolvedValueOnce(mockSettings);
      mockDb.first.mockResolvedValueOnce(mockPreference);
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));
      mockDb.insert.mockResolvedValue([]);

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        type: 'test',
        userId: 'user-1'
      });

      expect(result).toBe(false);
      // Should log the failure to history
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'SMTP error'
        })
      );
    });
  });

  describe('logEmailToHistory', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should handle database errors when logging to history', async () => {
      // This is a private method, but we can trigger it through sendEmail
      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: true })
      };

      const mockPreference = {
        enabled: true,
        email_enabled: true
      };

      mockDb.first.mockResolvedValueOnce(mockSettings);
      mockDb.first.mockResolvedValueOnce(mockPreference);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });
      mockDb.insert.mockRejectedValue(new Error('Database error'));

      // Should not throw even if logging fails
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        type: 'test',
        userId: 'user-1'
      });

      expect(result).toBe(true);
    });
  });

  describe('sendNotificationEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send notification email successfully', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const mockTemplate = {
        id: '1',
        name: 'test_template',
        type: 'notification',
        subject: 'Hello {{userName}}',
        body_html: '<p>Hello {{userName}}</p>',
        body_text: 'Hello {{userName}}',
        variables: '[]'  // JSON string, not array
      };

      const mockSettings = {
        category: 'system',
        settings: JSON.stringify({ enableEmailNotifications: true })
      };

      const mockPreference = {
        enabled: true,
        email_enabled: true
      };

      mockDb.first.mockResolvedValueOnce(mockUser);
      mockDb.first.mockResolvedValueOnce(mockTemplate);
      mockDb.first.mockResolvedValueOnce(mockSettings);
      mockDb.first.mockResolvedValueOnce(mockPreference);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });
      mockDb.insert.mockResolvedValue([]);

      const result = await emailService.sendNotificationEmail('user-1', 'test_template', {});

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await emailService.sendNotificationEmail('user-1', 'test_template', {});

      expect(result).toBe(false);
    });

    it('should return false when template not found', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockDb.first.mockResolvedValueOnce(mockUser);
      mockDb.first.mockResolvedValueOnce(null);

      const result = await emailService.sendNotificationEmail('user-1', 'test_template', {});

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const result = await emailService.sendNotificationEmail('user-1', 'test_template', {});

      expect(result).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send test email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Capacinator Email Test'
        })
      );
    });

    it('should throw error when email service not configured', async () => {
      // Temporarily set empty credentials to simulate unconfigured state
      const originalUser = mockEmailConfig.user;
      const originalPass = mockEmailConfig.pass;
      mockEmailConfig.user = '';
      mockEmailConfig.pass = '';

      const unconfiguredService = new EmailService();

      await expect(
        unconfiguredService.sendTestEmail('test@example.com')
      ).rejects.toThrow('Email service not configured');

      // Restore
      mockEmailConfig.user = originalUser;
      mockEmailConfig.pass = originalPass;
    });

    it('should throw error when sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        emailService.sendTestEmail('test@example.com')
      ).rejects.toThrow('SMTP error');
    });
  });

  describe('isConfigured', () => {
    it('should return true when SMTP is configured', () => {
      const service = new EmailService();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when SMTP is not configured', () => {
      // Temporarily set empty credentials
      const originalUser = mockEmailConfig.user;
      const originalPass = mockEmailConfig.pass;
      mockEmailConfig.user = '';
      mockEmailConfig.pass = '';

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);

      // Restore
      mockEmailConfig.user = originalUser;
      mockEmailConfig.pass = originalPass;
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const service = new EmailService();
      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const service = new EmailService();
      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when transporter not configured', async () => {
      // Temporarily set empty credentials
      const originalUser = mockEmailConfig.user;
      const originalPass = mockEmailConfig.pass;
      mockEmailConfig.user = '';
      mockEmailConfig.pass = '';

      const service = new EmailService();
      const result = await service.testConnection();

      expect(result).toBe(false);

      // Restore
      mockEmailConfig.user = originalUser;
      mockEmailConfig.pass = originalPass;
    });
  });
});

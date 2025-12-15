import { getAuditedDb } from '../../database/index';
import nodemailer from 'nodemailer';

// Mock dependencies
jest.mock('../../database/index', () => ({
  getAuditedDb: jest.fn()
}));

jest.mock('nodemailer');

// Mock env config - mutable for tests
const mockEnv = {
  email: {
    smtp: {
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      user: 'test@test.com',
      pass: 'testpass',
      from: 'noreply@test.com'
    },
    appUrl: 'http://localhost:3120'
  }
};

jest.mock('../../config/index', () => ({
  env: mockEnv,
  resetEnv: jest.fn()
}));

// Import EmailService AFTER mocks are set up
import { EmailService } from '../EmailService';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockDb: any;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock env to default values
    mockEnv.email.smtp.user = 'test@test.com';
    mockEnv.email.smtp.pass = 'testpass';

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
  });

  describe('getEmailTemplate', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should fetch email template successfully', async () => {
      const mockTemplate = {
        id: '1',
        template_key: 'test_template',
        subject: 'Test Subject',
        body: 'Test Body'
      };

      mockDb.first.mockResolvedValue(mockTemplate);

      const result = await emailService.getEmailTemplate('test_template');

      expect(result).toEqual(mockTemplate);
      expect(mockDb).toHaveBeenCalledWith('email_templates');
      expect(mockDb.where).toHaveBeenCalledWith('template_key', 'test_template');
    });

    it('should return null for non-existent template', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await emailService.getEmailTemplate('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockDb.first.mockRejectedValue(new Error('Database error'));

      const result = await emailService.getEmailTemplate('test_template');

      expect(result).toBeNull();
    });
  });

  describe('createEmailFromTemplate', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should replace variables in subject and body', () => {
      const template = {
        subject: 'Hello {{name}}!',
        body: 'Welcome to {{company}}, {{name}}!'
      };

      const result = emailService.createEmailFromTemplate(template, {
        name: 'John',
        company: 'Acme'
      });

      expect(result.subject).toBe('Hello John!');
      expect(result.body).toBe('Welcome to Acme, John!');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = {
        subject: '{{name}} - {{name}}',
        body: 'Hi {{name}}'
      };

      const result = emailService.createEmailFromTemplate(template, {
        name: 'Test'
      });

      expect(result.subject).toBe('Test - Test');
    });

    it('should leave unreplaced variables as-is', () => {
      const template = {
        subject: 'Hello {{name}}!',
        body: 'Your code: {{code}}'
      };

      const result = emailService.createEmailFromTemplate(template, {
        name: 'John'
      });

      expect(result.body).toBe('Your code: {{code}}');
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body'
      );

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: 'Test Body'
      });
    });

    it('should return false on send failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await emailService.sendEmail(
        'test@example.com',
        'Test',
        'Test'
      );

      expect(result).toBe(false);
    });

    it('should return false when transporter not configured', async () => {
      // Create service without SMTP user/pass
      mockEnv.email.smtp.user = '';
      mockEnv.email.smtp.pass = '';

      const service = new EmailService();
      const result = await service.sendEmail('test@example.com', 'Test', 'Test');

      expect(result).toBe(false);

      // Reset mock
      mockEnv.email.smtp.user = 'test@test.com';
      mockEnv.email.smtp.pass = 'testpass';
    });
  });

  describe('logEmailSent', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should log email in database', async () => {
      mockDb.insert.mockResolvedValue([]);

      await emailService.logEmailSent('user-1', 'test@example.com', 'Test', 'success');

      expect(mockDb).toHaveBeenCalledWith('email_logs');
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          recipient: 'test@example.com',
          subject: 'Test',
          status: 'success'
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      mockDb.insert.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        emailService.logEmailSent('user-1', 'test@example.com', 'Test', 'success')
      ).resolves.toBeUndefined();
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
        template_key: 'test_template',
        subject: 'Hello {{userName}}!',
        body: 'Welcome!'
      };

      const mockSettings = {
        email_enabled: true
      };

      const mockPreference = {
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
          subject: expect.stringContaining('Test')
        })
      );
    });

    it('should throw error when email service not configured', async () => {
      // Create service without SMTP user/pass
      mockEnv.email.smtp.user = '';
      mockEnv.email.smtp.pass = '';

      const unconfiguredService = new EmailService();

      await expect(
        unconfiguredService.sendTestEmail('test@example.com')
      ).rejects.toThrow('Email service not configured');

      // Reset mock
      mockEnv.email.smtp.user = 'test@test.com';
      mockEnv.email.smtp.pass = 'testpass';
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
      // Create service without SMTP user/pass
      mockEnv.email.smtp.user = '';
      mockEnv.email.smtp.pass = '';

      const service = new EmailService();
      expect(service.isConfigured()).toBe(false);

      // Reset mock
      mockEnv.email.smtp.user = 'test@test.com';
      mockEnv.email.smtp.pass = 'testpass';
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
      // Create service without SMTP user/pass
      mockEnv.email.smtp.user = '';
      mockEnv.email.smtp.pass = '';

      const service = new EmailService();
      const result = await service.testConnection();

      expect(result).toBe(false);

      // Reset mock
      mockEnv.email.smtp.user = 'test@test.com';
      mockEnv.email.smtp.pass = 'testpass';
    });
  });
});

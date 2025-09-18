import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock database
const createMockQuery = () => {
  const query: any = {
    where: jest.fn(),
    whereNotNull: jest.fn(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([]),
    join: jest.fn(),
    select: jest.fn(),
    returning: jest.fn()
  };
  
  // Make all methods chainable
  Object.keys(query).forEach(key => {
    if (typeof query[key] === 'function' && key !== 'first' && key !== 'insert') {
      const originalFn = query[key];
      query[key] = jest.fn((...args) => {
        // Call original function if needed
        originalFn(...args);
        return query;
      });
    }
  });
  
  // Handle async resolution - make it thenable
  query.then = jest.fn((resolve: any) => {
    resolve([]);
    return Promise.resolve([]);
  });
  
  return query;
};

const mockDb = jest.fn(() => createMockQuery()) as any;
mockDb.fn = { now: jest.fn() };

jest.mock('../../../../src/server/database/index.js', () => ({
  db: mockDb
}));

// Mock nodemailer before importing EmailService
const mockTransporter = {
  verify: jest.fn() as any,
  sendMail: jest.fn() as any
};

const mockNodemailer = {
  createTransport: jest.fn().mockReturnValue(mockTransporter)
};

jest.mock('nodemailer', () => mockNodemailer);

import { EmailService } from '../../../../src/server/services/EmailService.js';

describe('EmailService', () => {
  let emailService: EmailService;
  let originalEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment variables
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'password',
      SMTP_FROM: 'noreply@test.com',
      APP_URL: 'http://localhost:3120'
    };

    // Create new EmailService instance
    emailService = new EmailService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor and initialization', () => {
    it('should initialize with SMTP configuration from environment', () => {
      expect((emailService as any).config).toEqual({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password'
        },
        from: 'noreply@test.com'
      });
    });

    it('should create transporter when SMTP credentials are provided', () => {
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password'
        }
      });
    });

    it('should not create transporter when SMTP credentials are missing', () => {
      process.env.SMTP_USER = '';
      process.env.SMTP_PASS = '';
      
      const serviceWithoutCreds = new EmailService();
      expect(serviceWithoutCreds.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return true when transporter is configured', () => {
      expect(emailService.isConfigured()).toBe(true);
    });

    it('should return false when transporter is not configured', () => {
      (emailService as any).transporter = null;
      expect(emailService.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection test passes', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      
      const result = await emailService.testConnection();
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when connection test fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));
      
      const result = await emailService.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when transporter is not configured', async () => {
      (emailService as any).transporter = null;
      
      const result = await emailService.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('getEmailTemplate', () => {
    it('should return email template when found', async () => {
      const mockTemplate = {
        id: '1',
        name: 'assignment_created',
        type: 'assignment',
        subject: 'New Assignment',
        body_html: '<p>Hello {{userName}}</p>',
        body_text: 'Hello {{userName}}',
        variables: '["userName", "projectName"]',
        is_active: true
      };

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(mockTemplate);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.getEmailTemplate('assignment_created');

      expect(result).toEqual({
        ...mockTemplate,
        variables: ['userName', 'projectName']
      });
    });

    it('should return null when template not found', async () => {
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(null);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.getEmailTemplate('nonexistent');
      expect(result).toBe(null);
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = [
        { id: '1', user_id: 'user1', type: 'assignment', enabled: true, email_enabled: true }
      ];

      const mockQuery = createMockQuery();
      // Override the then method to return the preferences
      mockQuery.then = jest.fn((resolve: any) => {
        resolve(mockPreferences);
        return Promise.resolve(mockPreferences);
      });
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.getUserNotificationPreferences('user1');
      expect(result).toEqual(mockPreferences);
    });

    it('should return empty array on error', async () => {
      // Mock the database to throw an error
      mockDb.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await emailService.getUserNotificationPreferences('user1');
      expect(result).toEqual([]);
    });
  });

  describe('shouldSendNotification', () => {
    it('should return true when system and user settings allow', async () => {
      const mockSystemSettings = {
        settings: JSON.stringify({ enableEmailNotifications: true })
      };
      const mockUserPreference = {
        enabled: true,
        email_enabled: true
      };

      const mockQuery = createMockQuery();
      mockQuery.first
        .mockResolvedValueOnce(mockSystemSettings)
        .mockResolvedValueOnce(mockUserPreference);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.shouldSendNotification('user1', 'assignment');
      expect(result).toBe(true);
    });

    it('should return false when system notifications are disabled', async () => {
      const mockSystemSettings = {
        settings: JSON.stringify({ enableEmailNotifications: false })
      };

      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValueOnce(mockSystemSettings);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.shouldSendNotification('user1', 'assignment');
      expect(result).toBe(false);
    });

    it('should return false when user preference is disabled', async () => {
      const mockSystemSettings = {
        settings: JSON.stringify({ enableEmailNotifications: true })
      };
      const mockUserPreference = {
        enabled: false,
        email_enabled: false
      };

      const mockQuery = createMockQuery();
      mockQuery.first
        .mockResolvedValueOnce(mockSystemSettings)
        .mockResolvedValueOnce(mockUserPreference);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.shouldSendNotification('user1', 'assignment');
      expect(result).toBe(false);
    });
  });

  describe('renderTemplate', () => {
    it('should render simple variables', () => {
      const template = 'Hello {{userName}}, welcome to {{appName}}!';
      const variables = { userName: 'John', appName: 'Capacinator' };

      const result = emailService.renderTemplate(template, variables);
      expect(result).toBe('Hello John, welcome to Capacinator!');
    });

    it('should render array loops', () => {
      const template = 'Projects: {{#projects}}{{name}}, {{/projects}}';
      const variables = {
        projects: [
          { name: 'Project A' },
          { name: 'Project B' }
        ]
      };

      const result = emailService.renderTemplate(template, variables);
      expect(result).toBe('Projects: Project A, Project B, ');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{userName}}, your score is {{score}}';
      const variables = { userName: 'John' };

      const result = emailService.renderTemplate(template, variables);
      // The implementation replaces with empty string for missing variables
      expect(result).toBe('Hello John, your score is {{score}}');
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully when all conditions are met', async () => {
      // Mock shouldSendNotification to return true
      jest.spyOn(emailService, 'shouldSendNotification').mockResolvedValue(true);
      
      // Mock transporter.sendMail
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      // Mock database insert for logging
      const mockQuery = createMockQuery();
      mockDb.mockReturnValue(mockQuery);

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
        type: 'test',
        userId: 'user1'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content'
      });
    });

    it('should not send email when user preferences block it', async () => {
      jest.spyOn(emailService, 'shouldSendNotification').mockResolvedValue(false);

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
        type: 'test',
        userId: 'user1'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(false);
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should return false when transporter is not configured', async () => {
      (emailService as any).transporter = null;

      const emailOptions = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
        type: 'test',
        userId: 'user1'
      };

      const result = await emailService.sendEmail(emailOptions);

      expect(result).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await emailService.sendTestEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'test@example.com',
        subject: 'Capacinator Email Test',
        html: expect.stringContaining('Email Test Successful'),
        text: expect.stringContaining('Email Test Successful')
      });
    });

    it('should throw error when transporter is not configured', async () => {
      (emailService as any).transporter = null;

      await expect(emailService.sendTestEmail('test@example.com'))
        .rejects.toThrow('Email service not configured');
    });

    it('should handle send mail errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(emailService.sendTestEmail('test@example.com'))
        .rejects.toThrow('SMTP Error');
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send notification email with template', async () => {
      const mockUser = { id: 'user1', name: 'John Doe', email: 'john@example.com' };
      const mockTemplate = {
        id: '1',
        name: 'assignment_created',
        type: 'assignment',
        subject: 'New Assignment: {{projectName}}',
        body_html: '<p>Hello {{userName}}, you have a new assignment: {{projectName}}</p>',
        body_text: 'Hello {{userName}}, you have a new assignment: {{projectName}}',
        variables: ['userName', 'projectName'],
        is_active: true
      };

      // Mock database queries
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValueOnce(mockUser);
      mockDb.mockReturnValue(mockQuery);

      // Mock getEmailTemplate
      jest.spyOn(emailService, 'getEmailTemplate').mockResolvedValue(mockTemplate);
      
      // Mock sendEmail
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(true);

      const result = await emailService.sendNotificationEmail(
        'user1',
        'assignment_created',
        { projectName: 'Test Project' }
      );

      expect(result).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: 'New Assignment: Test Project',
        html: '<p>Hello John Doe, you have a new assignment: Test Project</p>',
        text: 'Hello John Doe, you have a new assignment: Test Project',
        type: 'assignment',
        userId: 'user1'
      });
    });

    it('should return false when user not found', async () => {
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(null);
      mockDb.mockReturnValue(mockQuery);

      const result = await emailService.sendNotificationEmail(
        'nonexistent',
        'assignment_created',
        {}
      );

      expect(result).toBe(false);
    });

    it('should return false when template not found', async () => {
      const mockUser = { id: 'user1', name: 'John Doe', email: 'john@example.com' };
      
      const mockQuery = createMockQuery();
      mockQuery.first.mockResolvedValue(mockUser);
      mockDb.mockReturnValue(mockQuery);

      jest.spyOn(emailService, 'getEmailTemplate').mockResolvedValue(null);

      const result = await emailService.sendNotificationEmail(
        'user1',
        'nonexistent_template',
        {}
      );

      expect(result).toBe(false);
    });
  });
});
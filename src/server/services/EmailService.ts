import nodemailer from 'nodemailer';
import { getAuditedDb } from '../database/index.js';
import { logger } from './logging/config.js';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  type: string;
  enabled: boolean;
  email_enabled: boolean;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
  userId: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private db: any;

  constructor() {
    this.db = getAuditedDb();
    this.initializeConfig();
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private initializeConfig(): void {
    // Load email configuration from environment variables
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@capacinator.com'
    };

    // Only create transporter if SMTP is configured
    if (this.config.auth.user && this.config.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });
    }
  }

  public isConfigured(): boolean {
    return this.transporter !== null;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection test failed', error as Error);
      return false;
    }
  }

  public async getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
    try {
      const template = await this.db('email_templates')
        .where('name', templateName)
        .where('is_active', true)
        .first();

      if (!template) {
        return null;
      }

      return {
        ...template,
        variables: JSON.parse(template.variables || '[]')
      };
    } catch (error) {
      logger.error('Error fetching email template', error as Error);
      return null;
    }
  }

  public async getUserNotificationPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      return await this.db('notification_preferences')
        .where('user_id', userId)
        .where('enabled', true);
    } catch (error) {
      logger.error('Error fetching notification preferences', error as Error);
      return [];
    }
  }

  public async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      // Check if email notifications are enabled in system settings
      const systemSettings = await this.db('settings')
        .where('category', 'system')
        .first();

      if (systemSettings) {
        const settings = JSON.parse(systemSettings.settings || '{}');
        if (!settings.enableEmailNotifications) {
          return false;
        }
      }

      // Check user's notification preferences
      const preference = await this.db('notification_preferences')
        .where('user_id', userId)
        .where('type', notificationType)
        .first();

      return preference ? preference.enabled && preference.email_enabled : false;
    } catch (error) {
      logger.error('Error checking notification preferences', error as Error);
      return false;
    }
  }

  public renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    // Simple template rendering - replace {{variable}} with values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    // Handle arrays for handlebars-style loops (simplified)
    const arrayRegex = /{{#(\w+)}}(.*?){{\/\1}}/gs;
    rendered = rendered.replace(arrayRegex, (match, arrayName, content) => {
      const arrayValue = variables[arrayName];
      if (Array.isArray(arrayValue)) {
        return arrayValue.map(item => {
          let itemContent = content;
          if (typeof item === 'object') {
            for (const [itemKey, itemValue] of Object.entries(item)) {
              const itemRegex = new RegExp(`{{${itemKey}}}`, 'g');
              itemContent = itemContent.replace(itemRegex, String(itemValue || ''));
            }
          }
          return itemContent;
        }).join('');
      }
      return '';
    });

    return rendered;
  }

  public async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      logger.warn('Email service not configured - skipping email send');
      return false;
    }

    try {
      // Check if user wants to receive this type of notification
      const shouldSend = await this.shouldSendNotification(options.userId, options.type);
      if (!shouldSend) {
        logger.debug(`Email notification skipped for user - notifications disabled`, { userId: options.userId });
        return false;
      }

      // Send the email
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      // Log the email to notification history
      await this.logEmailToHistory({
        userId: options.userId,
        type: options.type,
        subject: options.subject,
        body: options.html,
        emailTo: options.to,
        emailFrom: this.config.from,
        status: 'sent',
        errorMessage: null
      });

      logger.info('Email sent successfully', { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send email', error as Error);
      
      // Log the failed email to notification history
      await this.logEmailToHistory({
        userId: options.userId,
        type: options.type,
        subject: options.subject,
        body: options.html,
        emailTo: options.to,
        emailFrom: this.config?.from || 'unknown',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  private async logEmailToHistory(logData: {
    userId: string;
    type: string;
    subject: string;
    body: string;
    emailTo: string;
    emailFrom: string;
    status: 'sent' | 'failed';
    errorMessage: string | null;
  }): Promise<void> {
    try {
      await this.db('notification_history').insert({
        id: this.generateUUID(),
        user_id: logData.userId,
        type: logData.type,
        subject: logData.subject,
        body: logData.body,
        email_to: logData.emailTo,
        email_from: logData.emailFrom,
        sent_at: new Date(),
        status: logData.status,
        error_message: logData.errorMessage,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to log email to history', error as Error);
    }
  }

  public async sendNotificationEmail(
    userId: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get the user's email
      const user = await this.db('people').where('id', userId).first();
      if (!user || !user.email) {
        logger.warn(`User not found or has no email address`, { userId });
        return false;
      }

      // Get the email template
      const template = await this.getEmailTemplate(templateName);
      if (!template) {
        logger.warn(`Email template not found`, { templateName });
        return false;
      }

      // Add common variables
      const templateVariables = {
        ...variables,
        userName: user.name,
        appUrl: process.env.APP_URL || 'http://localhost:3120'
      };

      // Render the template
      const subject = this.renderTemplate(template.subject, templateVariables);
      const html = this.renderTemplate(template.body_html, templateVariables);
      const text = this.renderTemplate(template.body_text, templateVariables);

      // Send the email
      return await this.sendEmail({
        to: user.email,
        subject,
        html,
        text,
        type: template.type,
        userId
      });
    } catch (error) {
      logger.error('Error sending notification email', error as Error, { userId, templateName });
      return false;
    }
  }

  public async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      throw new Error('Email service not configured');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject: 'Capacinator Email Test',
        html: `
          <h2>Email Test Successful</h2>
          <p>This is a test email from Capacinator to verify email configuration.</p>
          <p>If you received this email, your email notifications are working correctly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
        text: `
          Email Test Successful
          
          This is a test email from Capacinator to verify email configuration.
          
          If you received this email, your email notifications are working correctly.
          
          Sent at: ${new Date().toLocaleString()}
        `
      });

      logger.info('Test email sent successfully', { messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send test email', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
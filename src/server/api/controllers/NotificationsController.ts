import { Request, Response } from 'express';
import { db } from '../../database/index.js';
import { emailService } from '../../services/EmailService.js';

export class NotificationsController {
  // Send immediate notification
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, templateName, variables } = req.body;

      if (!userId || !templateName) {
        res.status(400).json({
          success: false,
          error: 'userId and templateName are required'
        });
        return;
      }

      const result = await emailService.sendNotificationEmail(
        userId,
        templateName,
        variables || {}
      );

      res.json({
        success: true,
        data: {
          sent: result,
          message: result ? 'Notification sent successfully' : 'Notification not sent (user preferences or system disabled)'
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send notification'
      });
    }
  }

  // Get user notification preferences
  async getUserNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const preferences = await db('notification_preferences')
        .where('user_id', userId)
        .orderBy('type');

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification preferences'
      });
    }
  }

  // Update user notification preferences
  async updateUserNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { preferences } = req.body;

      if (!Array.isArray(preferences)) {
        res.status(400).json({
          success: false,
          error: 'preferences must be an array'
        });
        return;
      }

      // Update each preference
      for (const pref of preferences) {
        await db('notification_preferences')
          .where('user_id', userId)
          .where('type', pref.type)
          .update({
            enabled: pref.enabled,
            email_enabled: pref.email_enabled,
            updated_at: new Date()
          });
      }

      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences'
      });
    }
  }

  // Get available email templates
  async getEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await db('email_templates')
        .where('is_active', true)
        .orderBy('type')
        .orderBy('name');

      const templatesWithParsedVariables = templates.map(template => ({
        ...template,
        variables: JSON.parse(template.variables || '[]')
      }));

      res.json({
        success: true,
        data: templatesWithParsedVariables
      });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch email templates'
      });
    }
  }

  // Get notification history
  async getNotificationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0, type } = req.query;

      let query = db('notification_history')
        .select(
          'notification_history.*',
          'people.name as user_name',
          'people.email as user_email'
        )
        .join('people', 'notification_history.user_id', 'people.id')
        .orderBy('notification_history.sent_at', 'desc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      if (userId) {
        query = query.where('notification_history.user_id', userId);
      }

      if (type) {
        query = query.where('notification_history.type', type);
      }

      const history = await query;

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching notification history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification history'
      });
    }
  }

  // Send test email
  async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
        return;
      }

      if (!emailService.isConfigured()) {
        res.status(400).json({
          success: false,
          error: 'Email service is not configured. Please check SMTP settings.'
        });
        return;
      }

      const result = await emailService.sendTestEmail(email);

      res.json({
        success: true,
        data: {
          sent: result,
          message: 'Test email sent successfully'
        }
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email'
      });
    }
  }

  // Check email service configuration
  async checkEmailConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const isConfigured = emailService.isConfigured();
      let connectionTest = false;

      if (isConfigured) {
        connectionTest = await emailService.testConnection();
      }

      res.json({
        success: true,
        data: {
          configured: isConfigured,
          connectionTest: connectionTest,
          message: isConfigured 
            ? (connectionTest ? 'Email service is configured and working' : 'Email service is configured but connection test failed')
            : 'Email service is not configured'
        }
      });
    } catch (error) {
      console.error('Error checking email configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check email configuration'
      });
    }
  }

  // Get notification statistics
  async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      let baseQuery = db('notification_history')
        .where('sent_at', '>=', startDate);

      if (userId) {
        baseQuery = baseQuery.where('user_id', userId);
      }

      const [totalSent, totalFailed, byType, byStatus] = await Promise.all([
        baseQuery.clone().count('id as count').first(),
        baseQuery.clone().where('status', 'failed').count('id as count').first(),
        baseQuery.clone().select('type').count('id as count').groupBy('type'),
        baseQuery.clone().select('status').count('id as count').groupBy('status')
      ]);

      res.json({
        success: true,
        data: {
          totalSent: totalSent?.count || 0,
          totalFailed: totalFailed?.count || 0,
          byType: byType || [],
          byStatus: byStatus || [],
          period: `${days} days`
        }
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification statistics'
      });
    }
  }

  // Helper method to trigger assignment notifications
  async triggerAssignmentNotification(
    userId: string,
    action: 'created' | 'updated' | 'removed',
    assignmentData: any
  ): Promise<void> {
    try {
      const templateName = action === 'created' ? 'assignment_created' : 'assignment_updated';
      
      const variables = {
        projectName: assignmentData.project_name,
        roleName: assignmentData.role_name,
        startDate: assignmentData.start_date,
        endDate: assignmentData.end_date,
        allocation: assignmentData.allocation,
        changes: assignmentData.changes || 'Assignment details updated'
      };

      await emailService.sendNotificationEmail(userId, templateName, variables);
    } catch (error) {
      console.error('Error triggering assignment notification:', error);
    }
  }

  // Helper method to trigger approval notifications
  async triggerApprovalNotification(
    approverUserId: string,
    requestData: any
  ): Promise<void> {
    try {
      const variables = {
        requestType: requestData.type,
        requestorName: requestData.requestor_name,
        details: requestData.details,
        reason: requestData.reason
      };

      await emailService.sendNotificationEmail(approverUserId, 'approval_request', variables);
    } catch (error) {
      console.error('Error triggering approval notification:', error);
    }
  }

  // Helper method to trigger project notifications
  async triggerProjectNotification(
    userIds: string[],
    notificationType: string,
    projectData: any
  ): Promise<void> {
    try {
      const templateName = `project_${notificationType}`;
      
      const variables = {
        projectName: projectData.name,
        previousStart: projectData.previous_start,
        newStart: projectData.new_start,
        previousEnd: projectData.previous_end,
        newEnd: projectData.new_end
      };

      for (const userId of userIds) {
        await emailService.sendNotificationEmail(userId, templateName, variables);
      }
    } catch (error) {
      console.error('Error triggering project notification:', error);
    }
  }
}
import * as cron from 'node-cron';
import { db } from '../database/index.js';
import { emailService } from './EmailService.js';

export class NotificationScheduler {
  private weeklyEmailTask: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    // Schedule weekly summary emails for Monday 9 AM
    this.weeklyEmailTask = cron.schedule('0 9 * * 1', async () => {
      await this.sendWeeklySummaryEmails();
    }, {
      scheduled: false,
      timezone: 'America/New_York'
    });

    console.log('📧 Notification scheduler initialized');
  }

  public start(): void {
    if (this.weeklyEmailTask) {
      this.weeklyEmailTask.start();
      console.log('📧 Weekly summary email scheduler started');
    }
  }

  public stop(): void {
    if (this.weeklyEmailTask) {
      this.weeklyEmailTask.stop();
      console.log('📧 Weekly summary email scheduler stopped');
    }
  }

  private async sendWeeklySummaryEmails(): Promise<void> {
    try {
      console.log('📧 Sending weekly summary emails...');

      // Get all users who have weekly summary notifications enabled
      const users = await db('people')
        .select('people.*')
        .join('notification_preferences', 'people.id', 'notification_preferences.user_id')
        .where('notification_preferences.type', 'summary')
        .where('notification_preferences.enabled', true)
        .where('notification_preferences.email_enabled', true)
        .where('people.email', '!=', '')
        .whereNotNull('people.email');

      console.log(`📧 Found ${users.length} users for weekly summary emails`);

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const endOfWeek = new Date();

      for (const user of users) {
        try {
          const summaryData = await this.generateWeeklySummaryData(user.id, startOfWeek, endOfWeek);
          
          const variables = {
            weekOf: startOfWeek.toDateString(),
            assignments: summaryData.assignments,
            totalAllocation: summaryData.totalAllocation,
            availableCapacity: summaryData.availableCapacity,
            upcomingDeadlines: summaryData.upcomingDeadlines
          };

          await emailService.sendNotificationEmail(user.id, 'weekly_summary', variables);
          console.log(`📧 Weekly summary sent to ${user.email}`);
        } catch (error) {
          console.error(`📧 Failed to send weekly summary to ${user.email}:`, error);
        }
      }

      console.log('📧 Weekly summary emails completed');
    } catch (error) {
      console.error('📧 Error in weekly summary email job:', error);
    }
  }

  private async generateWeeklySummaryData(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get user's assignments for the week
      const assignments = await db('assignments')
        .select(
          'assignments.*',
          'projects.name as project_name',
          'roles.name as role_name'
        )
        .join('projects', 'assignments.project_id', 'projects.id')
        .join('roles', 'assignments.role_id', 'roles.id')
        .where('assignments.person_id', userId)
        .where('assignments.start_date', '<=', endDate)
        .where('assignments.end_date', '>=', startDate)
        .orderBy('assignments.start_date');

      // Calculate total allocation
      const totalAllocation = assignments.reduce((sum, assignment) => {
        return sum + (assignment.allocation || 0);
      }, 0);

      // Calculate available capacity
      const availableCapacity = Math.max(0, 100 - totalAllocation);

      // Get upcoming deadlines (next 14 days)
      const upcomingDeadlineDate = new Date();
      upcomingDeadlineDate.setDate(upcomingDeadlineDate.getDate() + 14);

      const upcomingDeadlines = await db('assignments')
        .select(
          'assignments.end_date',
          'projects.name as project_name',
          'roles.name as role_name'
        )
        .join('projects', 'assignments.project_id', 'projects.id')
        .join('roles', 'assignments.role_id', 'roles.id')
        .where('assignments.person_id', userId)
        .where('assignments.end_date', '>=', new Date())
        .where('assignments.end_date', '<=', upcomingDeadlineDate)
        .orderBy('assignments.end_date');

      return {
        assignments: assignments.map(assignment => ({
          projectName: assignment.project_name,
          roleName: assignment.role_name,
          allocation: assignment.allocation
        })),
        totalAllocation,
        availableCapacity,
        upcomingDeadlines: upcomingDeadlines.length > 0 
          ? upcomingDeadlines.map(deadline => `${deadline.project_name} (${deadline.role_name}) - ${new Date(deadline.end_date).toLocaleDateString()}`).join(', ')
          : 'None'
      };
    } catch (error) {
      console.error('Error generating weekly summary data:', error);
      return {
        assignments: [],
        totalAllocation: 0,
        availableCapacity: 100,
        upcomingDeadlines: 'Error loading data'
      };
    }
  }

  // Helper method to send assignment notification
  public async sendAssignmentNotification(
    userId: string,
    action: 'created' | 'updated' | 'removed',
    assignmentData: any
  ): Promise<void> {
    try {
      const user = await db('people').where('id', userId).first();
      if (!user) {
        console.warn(`User ${userId} not found for assignment notification`);
        return;
      }

      const project = await db('projects').where('id', assignmentData.project_id).first();
      const role = await db('roles').where('id', assignmentData.role_id).first();

      if (!project || !role) {
        console.warn(`Project or role not found for assignment notification`);
        return;
      }

      const templateName = action === 'created' ? 'assignment_created' : 'assignment_updated';
      
      const variables = {
        projectName: project.name,
        roleName: role.name,
        startDate: assignmentData.start_date ? new Date(assignmentData.start_date).toLocaleDateString() : 'TBD',
        endDate: assignmentData.end_date ? new Date(assignmentData.end_date).toLocaleDateString() : 'TBD',
        allocation: assignmentData.allocation || 0,
        changes: assignmentData.changes || 'Assignment details updated'
      };

      await emailService.sendNotificationEmail(userId, templateName, variables);
      console.log(`📧 Assignment ${action} notification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending assignment notification:', error);
    }
  }

  // Helper method to send approval notification
  public async sendApprovalNotification(
    approverUserId: string,
    requestData: any
  ): Promise<void> {
    try {
      const approver = await db('people').where('id', approverUserId).first();
      const requestor = await db('people').where('id', requestData.requestor_id).first();

      if (!approver || !requestor) {
        console.warn(`Approver or requestor not found for approval notification`);
        return;
      }

      const variables = {
        requestType: requestData.type || 'Unknown',
        requestorName: requestor.name,
        details: requestData.details || 'No details provided',
        reason: requestData.reason || 'No reason provided'
      };

      await emailService.sendNotificationEmail(approverUserId, 'approval_request', variables);
      console.log(`📧 Approval notification sent to ${approver.email}`);
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  // Helper method to send project timeline notification
  public async sendProjectTimelineNotification(
    projectId: string,
    oldStartDate: Date | null,
    newStartDate: Date | null,
    oldEndDate: Date | null,
    newEndDate: Date | null
  ): Promise<void> {
    try {
      const project = await db('projects').where('id', projectId).first();
      if (!project) {
        console.warn(`Project ${projectId} not found for timeline notification`);
        return;
      }

      // Get all users assigned to this project
      const assignedUsers = await db('assignments')
        .select('people.id', 'people.email', 'people.name')
        .join('people', 'assignments.person_id', 'people.id')
        .where('assignments.project_id', projectId)
        .whereNotNull('people.email')
        .where('people.email', '!=', '')
        .groupBy('people.id');

      if (assignedUsers.length === 0) {
        console.log(`No users assigned to project ${project.name} for timeline notification`);
        return;
      }

      const variables = {
        projectName: project.name,
        previousStart: oldStartDate ? oldStartDate.toLocaleDateString() : 'Not set',
        newStart: newStartDate ? newStartDate.toLocaleDateString() : 'Not set',
        previousEnd: oldEndDate ? oldEndDate.toLocaleDateString() : 'Not set',
        newEnd: newEndDate ? newEndDate.toLocaleDateString() : 'Not set'
      };

      for (const user of assignedUsers) {
        await emailService.sendNotificationEmail(user.id, 'project_timeline_changed', variables);
        console.log(`📧 Project timeline notification sent to ${user.email}`);
      }
    } catch (error) {
      console.error('Error sending project timeline notification:', error);
    }
  }

  // Helper method to send system maintenance notification
  public async sendSystemMaintenanceNotification(
    title: string,
    message: string,
    scheduledTime: Date,
    duration: string,
    impact: string
  ): Promise<void> {
    try {
      // Get all users with system notifications enabled
      const users = await db('people')
        .select('people.*')
        .join('notification_preferences', 'people.id', 'notification_preferences.user_id')
        .where('notification_preferences.type', 'system')
        .where('notification_preferences.enabled', true)
        .where('notification_preferences.email_enabled', true)
        .where('people.email', '!=', '')
        .whereNotNull('people.email');

      if (users.length === 0) {
        console.log('No users to notify for system maintenance');
        return;
      }

      const variables = {
        title,
        message,
        scheduledTime: scheduledTime.toLocaleString(),
        duration,
        impact
      };

      for (const user of users) {
        await emailService.sendNotificationEmail(user.id, 'system_maintenance', variables);
        console.log(`📧 System maintenance notification sent to ${user.email}`);
      }
    } catch (error) {
      console.error('Error sending system maintenance notification:', error);
    }
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();
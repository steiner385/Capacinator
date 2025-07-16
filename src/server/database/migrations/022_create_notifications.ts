import { Knex } from 'knex';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function up(knex: Knex): Promise<void> {
  // Create notification_preferences table
  await knex.schema.createTable('notification_preferences', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).references('id').inTable('people').onDelete('CASCADE');
    table.string('type', 50).notNullable(); // assignment, approval, project, system, summary
    table.boolean('enabled').defaultTo(true);
    table.boolean('email_enabled').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['user_id', 'type']);
    table.index(['user_id']);
    table.index(['type']);
  });

  // Create notification_history table
  await knex.schema.createTable('notification_history', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).references('id').inTable('people').onDelete('CASCADE');
    table.string('type', 50).notNullable(); // assignment, approval, project, system, summary
    table.string('subject', 255).notNullable();
    table.text('body').notNullable();
    table.string('email_to', 255).notNullable();
    table.string('email_from', 255).notNullable();
    table.datetime('sent_at').notNullable();
    table.string('status', 20).notNullable(); // sent, failed, pending
    table.text('error_message').nullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['type']);
    table.index(['status']);
    table.index(['sent_at']);
  });

  // Create email_templates table
  await knex.schema.createTable('email_templates', (table) => {
    table.string('id', 36).primary();
    table.string('name', 100).notNullable().unique();
    table.string('type', 50).notNullable(); // assignment, approval, project, system, summary
    table.string('subject', 255).notNullable();
    table.text('body_html').notNullable();
    table.text('body_text').notNullable();
    table.json('variables').nullable(); // JSON array of variable names used in template
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['type']);
    table.index(['is_active']);
  });

  // Insert default notification preferences for existing users
  const users = await knex('people').select('id');
  const notificationTypes = ['assignment', 'approval', 'project', 'system', 'summary'];
  
  for (const user of users) {
    for (const type of notificationTypes) {
      await knex('notification_preferences').insert({
        id: generateUUID(),
        user_id: user.id,
        type: type,
        enabled: true,
        email_enabled: type !== 'summary', // Disable weekly summaries by default
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  // Insert default email templates
  const templates = [
    {
      name: 'assignment_created',
      type: 'assignment',
      subject: 'New Assignment: {{projectName}}',
      body_html: `
        <h2>New Assignment</h2>
        <p>Hello {{userName}},</p>
        <p>You have been assigned to a new project:</p>
        <ul>
          <li><strong>Project:</strong> {{projectName}}</li>
          <li><strong>Role:</strong> {{roleName}}</li>
          <li><strong>Start Date:</strong> {{startDate}}</li>
          <li><strong>End Date:</strong> {{endDate}}</li>
          <li><strong>Allocation:</strong> {{allocation}}%</li>
        </ul>
        <p>Please log in to <a href="{{appUrl}}">Capacinator</a> to view more details.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        New Assignment
        
        Hello {{userName}},
        
        You have been assigned to a new project:
        
        Project: {{projectName}}
        Role: {{roleName}}
        Start Date: {{startDate}}
        End Date: {{endDate}}
        Allocation: {{allocation}}%
        
        Please log in to Capacinator ({{appUrl}}) to view more details.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['userName', 'projectName', 'roleName', 'startDate', 'endDate', 'allocation', 'appUrl']
    },
    {
      name: 'assignment_updated',
      type: 'assignment',
      subject: 'Assignment Updated: {{projectName}}',
      body_html: `
        <h2>Assignment Updated</h2>
        <p>Hello {{userName}},</p>
        <p>Your assignment has been updated:</p>
        <ul>
          <li><strong>Project:</strong> {{projectName}}</li>
          <li><strong>Role:</strong> {{roleName}}</li>
          <li><strong>Changes:</strong> {{changes}}</li>
        </ul>
        <p>Please log in to <a href="{{appUrl}}">Capacinator</a> to view the updated details.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        Assignment Updated
        
        Hello {{userName}},
        
        Your assignment has been updated:
        
        Project: {{projectName}}
        Role: {{roleName}}
        Changes: {{changes}}
        
        Please log in to Capacinator ({{appUrl}}) to view the updated details.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['userName', 'projectName', 'roleName', 'changes', 'appUrl']
    },
    {
      name: 'approval_request',
      type: 'approval',
      subject: 'Approval Required: {{requestType}}',
      body_html: `
        <h2>Approval Required</h2>
        <p>Hello {{approverName}},</p>
        <p>An approval request requires your attention:</p>
        <ul>
          <li><strong>Request Type:</strong> {{requestType}}</li>
          <li><strong>Requestor:</strong> {{requestorName}}</li>
          <li><strong>Details:</strong> {{details}}</li>
          <li><strong>Reason:</strong> {{reason}}</li>
        </ul>
        <p>Please log in to <a href="{{appUrl}}">Capacinator</a> to approve or deny this request.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        Approval Required
        
        Hello {{approverName}},
        
        An approval request requires your attention:
        
        Request Type: {{requestType}}
        Requestor: {{requestorName}}
        Details: {{details}}
        Reason: {{reason}}
        
        Please log in to Capacinator ({{appUrl}}) to approve or deny this request.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['approverName', 'requestType', 'requestorName', 'details', 'reason', 'appUrl']
    },
    {
      name: 'project_timeline_changed',
      type: 'project',
      subject: 'Project Timeline Updated: {{projectName}}',
      body_html: `
        <h2>Project Timeline Updated</h2>
        <p>Hello {{userName}},</p>
        <p>The timeline for project <strong>{{projectName}}</strong> has been updated:</p>
        <ul>
          <li><strong>Previous Start:</strong> {{previousStart}}</li>
          <li><strong>New Start:</strong> {{newStart}}</li>
          <li><strong>Previous End:</strong> {{previousEnd}}</li>
          <li><strong>New End:</strong> {{newEnd}}</li>
        </ul>
        <p>This may affect your assignments. Please log in to <a href="{{appUrl}}">Capacinator</a> to review.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        Project Timeline Updated
        
        Hello {{userName}},
        
        The timeline for project {{projectName}} has been updated:
        
        Previous Start: {{previousStart}}
        New Start: {{newStart}}
        Previous End: {{previousEnd}}
        New End: {{newEnd}}
        
        This may affect your assignments. Please log in to Capacinator ({{appUrl}}) to review.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['userName', 'projectName', 'previousStart', 'newStart', 'previousEnd', 'newEnd', 'appUrl']
    },
    {
      name: 'system_maintenance',
      type: 'system',
      subject: 'System Maintenance: {{title}}',
      body_html: `
        <h2>System Maintenance Notice</h2>
        <p>Hello {{userName}},</p>
        <p><strong>{{title}}</strong></p>
        <p>{{message}}</p>
        <ul>
          <li><strong>Scheduled Time:</strong> {{scheduledTime}}</li>
          <li><strong>Expected Duration:</strong> {{duration}}</li>
          <li><strong>Impact:</strong> {{impact}}</li>
        </ul>
        <p>We apologize for any inconvenience.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        System Maintenance Notice
        
        Hello {{userName}},
        
        {{title}}
        
        {{message}}
        
        Scheduled Time: {{scheduledTime}}
        Expected Duration: {{duration}}
        Impact: {{impact}}
        
        We apologize for any inconvenience.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['userName', 'title', 'message', 'scheduledTime', 'duration', 'impact']
    },
    {
      name: 'weekly_summary',
      type: 'summary',
      subject: 'Weekly Summary - {{weekOf}}',
      body_html: `
        <h2>Weekly Summary</h2>
        <p>Hello {{userName}},</p>
        <p>Here's your weekly capacity summary for the week of {{weekOf}}:</p>
        
        <h3>Your Assignments</h3>
        <ul>
          {{#assignments}}
          <li><strong>{{projectName}}</strong> - {{roleName}} ({{allocation}}%)</li>
          {{/assignments}}
        </ul>
        
        <h3>Capacity Overview</h3>
        <ul>
          <li><strong>Total Allocation:</strong> {{totalAllocation}}%</li>
          <li><strong>Available Capacity:</strong> {{availableCapacity}}%</li>
          <li><strong>Upcoming Deadlines:</strong> {{upcomingDeadlines}}</li>
        </ul>
        
        <p>Please log in to <a href="{{appUrl}}">Capacinator</a> for detailed planning.</p>
        <p>Best regards,<br>Capacinator Team</p>
      `,
      body_text: `
        Weekly Summary
        
        Hello {{userName}},
        
        Here's your weekly capacity summary for the week of {{weekOf}}:
        
        Your Assignments:
        {{#assignments}}
        - {{projectName}} - {{roleName}} ({{allocation}}%)
        {{/assignments}}
        
        Capacity Overview:
        - Total Allocation: {{totalAllocation}}%
        - Available Capacity: {{availableCapacity}}%
        - Upcoming Deadlines: {{upcomingDeadlines}}
        
        Please log in to Capacinator ({{appUrl}}) for detailed planning.
        
        Best regards,
        Capacinator Team
      `,
      variables: ['userName', 'weekOf', 'assignments', 'totalAllocation', 'availableCapacity', 'upcomingDeadlines', 'appUrl']
    }
  ];

  for (const template of templates) {
    await knex('email_templates').insert({
      id: generateUUID(),
      name: template.name,
      type: template.type,
      subject: template.subject,
      body_html: template.body_html.trim(),
      body_text: template.body_text.trim(),
      variables: JSON.stringify(template.variables),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  console.log('✅ Notifications system database schema created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_history');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('email_templates');
  
  console.log('✅ Notifications system database schema rolled back');
}
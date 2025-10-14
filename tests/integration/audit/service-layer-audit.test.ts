import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../setup.js';
import { createAuditedDatabase } from '../../../src/server/database/AuditedDatabase.js';
import { AuditService } from '../../../src/server/services/audit/AuditService.js';
import { getAuditConfig } from '../../../src/server/config/auditConfig.js';
import { AssignmentRecalculationService } from '../../../src/server/services/AssignmentRecalculationService.js';
import { ProjectPhaseCascadeService } from '../../../src/server/services/ProjectPhaseCascadeService.js';
import { EmailService } from '../../../src/server/services/EmailService.js';
import { NotificationScheduler } from '../../../src/server/services/NotificationScheduler.js';

/**
 * Service Layer Audit Integration Tests
 * 
 * These tests verify that all service layer operations that modify the database
 * are properly audited through the AuditedDatabase wrapper.
 */

describe.skip('Service Layer Audit Integration Tests', () => {
  let auditedDb: any;
  let auditService: any;

  beforeAll(async () => {
    // Create audit service using test database
    auditService = new AuditService(db, getAuditConfig());
    
    // Create audited database wrapper using test database
    auditedDb = createAuditedDatabase(db, auditService);

    // Ensure required tables exist
    const tables = ['people', 'projects', 'roles', 'project_assignments', 'scenarios', 'audit_log'];
    for (const table of tables) {
      const hasTable = await db.schema.hasTable(table);
      if (!hasTable) {
        console.warn(`Table ${table} does not exist - some tests may fail`);
      }
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db('audit_log').where('changed_by', 'service-test').del();
      await db('project_assignments').where('notes', 'like', '%service-test%').del();
      await db('people').where('email', 'like', '%service-test%').del();
      await db('projects').where('name', 'like', '%Service Test%').del();
    } catch (error) {
      console.warn('Service test cleanup failed:', error);
    }
  });

  describe('Assignment Recalculation Service', () => {
    
    test('should audit all assignment modifications during recalculation', async () => {
      // Create test data
      const testPerson = {
        id: 'service-test-person-1',
        name: 'Service Test Person 1',
        email: 'service-test-1@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      const testProject = {
        id: 'service-test-project-1',
        name: 'Service Test Project 1',
        description: 'Test project for service audit',
        status: 'active',
        aspiration_start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        aspiration_finish: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days from now
        created_at: new Date(),
        updated_at: new Date()
      };

      const testRole = {
        id: 'service-test-role-1',
        name: 'Service Test Role 1',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert test data using audited database
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-req-1',
        ipAddress: '127.0.0.1',
        comment: 'Service layer test setup'
      });

      await auditedDb('people').insert(testPerson);
      await auditedDb('projects').insert(testProject);
      await auditedDb('roles').insert(testRole);

      // Create initial assignment with assignment_date_mode 'project' to trigger recalculation
      const initialAssignment = {
        id: 'service-test-assignment-1',
        project_id: testProject.id,
        person_id: testPerson.id,
        role_id: testRole.id,
        allocation_percentage: 50,
        assignment_date_mode: 'project',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        computed_start_date: new Date(),
        computed_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'service-test initial assignment',
        created_at: new Date(),
        updated_at: new Date()
      };

      await auditedDb('project_assignments').insert(initialAssignment);

      // Initialize the service with audited database
      const recalcService = new AssignmentRecalculationService(auditedDb);

      // Perform recalculation operation
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-req-2',
        ipAddress: '127.0.0.1',
        comment: 'Assignment recalculation service operation'
      });

      await recalcService.recalculateAssignments(testProject.id);

      // Verify audit entries were created for service operations
      const allAuditEntries = await db('audit_log')
        .where('changed_by', 'service-test');
        
      console.log('All audit entries by service-test:', allAuditEntries.length);
      allAuditEntries.forEach(entry => {
        console.log('- ', entry.table_name, entry.action, entry.comment);
      });

      const serviceAuditEntries = await db('audit_log')
        .where('changed_by', 'service-test')
        .where('comment', 'like', '%recalculation%')
        .orWhere('comment', 'like', '%Assignment recalculation%');

      expect(serviceAuditEntries.length).toBeGreaterThan(0);
      
      // Verify that service operations include proper context
      const recentAudit = serviceAuditEntries[0];
      expect(recentAudit.request_id).toBe('service-test-req-2');
      expect(recentAudit.changed_by).toBe('service-test');
    });
  });

  describe('Project Phase Cascade Service', () => {
    
    test('should audit cascading changes to assignments when phases change', async () => {
      // Create test project with phases
      const testProject = {
        id: 'service-test-project-2',
        name: 'Service Test Project 2',
        description: 'Test project for cascade service audit',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-cascade-1',
        ipAddress: '127.0.0.1',
        comment: 'Phase cascade service test setup'
      });

      await auditedDb('projects').insert(testProject);

      // Initialize cascade service with audited database
      const cascadeService = new ProjectPhaseCascadeService(auditedDb);

      // Perform phase update that should cascade to assignments
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-cascade-2',
        ipAddress: '127.0.0.1',
        comment: 'Phase cascade operation'
      });

      await cascadeService.updateProjectPhases(testProject.id, [
        {
          phase_id: 'test-phase-1',
          start_date: new Date(),
          end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
        }
      ]);

      // Verify cascade operations were audited
      const cascadeAuditEntries = await db('audit_log')
        .where('changed_by', 'service-test')
        .where('comment', 'like', '%cascade%');

      expect(cascadeAuditEntries.length).toBeGreaterThan(0);

      // Verify audit context is preserved through cascade operations
      for (const entry of cascadeAuditEntries) {
        expect(entry.request_id).toBe('service-test-cascade-2');
        expect(entry.changed_by).toBe('service-test');
      }
    });
  });

  describe('Email Service Database Operations', () => {
    
    test('should audit email log and notification database changes', async () => {
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-email-1',
        ipAddress: '127.0.0.1',
        comment: 'Email service audit test'
      });

      // Initialize email service with audited database
      const emailService = new EmailService(auditedDb);

      // Simulate email operations that modify database
      const emailLogEntry = {
        id: 'service-test-email-log-1',
        to_email: 'service-test@example.com',
        subject: 'Service Test Email',
        body: 'Test email body',
        status: 'sent',
        sent_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Check if email_log table exists, if not skip this test
      const hasEmailLogTable = await db.schema.hasTable('email_log');
      if (hasEmailLogTable) {
        await auditedDb('email_log').insert(emailLogEntry);

        // Verify email log operations are audited
        const emailAuditEntries = await db('audit_log')
          .where('table_name', 'email_log')
          .where('changed_by', 'service-test');

        expect(emailAuditEntries.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Notification Scheduler Service', () => {
    
    test('should audit notification database operations', async () => {
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-notification-1',
        ipAddress: '127.0.0.1',
        comment: 'Notification scheduler audit test'
      });

      // Initialize notification scheduler with audited database
      const notificationScheduler = new NotificationScheduler(auditedDb);

      // Simulate notification scheduling operations
      const notificationEntry = {
        id: 'service-test-notification-1',
        type: 'assignment_reminder',
        recipient_id: 'service-test-person-1',
        title: 'Service Test Notification',
        message: 'Test notification message',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Check if notifications table exists
      const hasNotificationsTable = await db.schema.hasTable('notifications');
      if (hasNotificationsTable) {
        await auditedDb('notifications').insert(notificationEntry);

        // Verify notification operations are audited
        const notificationAuditEntries = await db('audit_log')
          .where('table_name', 'notifications')
          .where('changed_by', 'service-test');

        expect(notificationAuditEntries.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Service Layer Integration Patterns', () => {
    
    test('should maintain audit context across service method calls', async () => {
      // Test that audit context is properly maintained when services call each other
      
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-integration-1',
        ipAddress: '127.0.0.1',
        comment: 'Service integration test'
      });

      // Create cascading operations that involve multiple services
      const testProject = {
        id: 'service-test-project-3',
        name: 'Service Test Integration Project',
        description: 'Test project for service integration',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      await auditedDb('projects').insert(testProject);

      // Simulate operation that triggers multiple service calls
      // (This would typically happen in a controller or complex business operation)
      
      // Update project
      await auditedDb('projects')
        .where('id', testProject.id)
        .update({ 
          status: 'completed',
          updated_at: new Date()
        });

      // Verify all operations maintain the same audit context
      const integrationAuditEntries = await db('audit_log')
        .where('request_id', 'service-test-integration-1')
        .where('changed_by', 'service-test');

      expect(integrationAuditEntries.length).toBeGreaterThanOrEqual(2); // INSERT + UPDATE

      // All entries should have the same request context
      for (const entry of integrationAuditEntries) {
        expect(entry.request_id).toBe('service-test-integration-1');
        expect(entry.changed_by).toBe('service-test');
        expect(entry.ip_address).toBe('127.0.0.1');
      }
    });

    test('should handle service errors without leaving partial audit trails', async () => {
      auditedDb.setDefaultContext({
        userId: 'service-test',
        requestId: 'service-test-error-1',
        ipAddress: '127.0.0.1',
        comment: 'Service error handling test'
      });

      // Simulate a service operation that fails partway through
      try {
        await auditedDb.transaction(async (trx: any) => {
          // This operation should succeed and be audited
          await trx('people').insert({
            id: 'service-test-error-person',
            name: 'Service Error Test Person',
            email: 'service-error-test@example.com',
            created_at: new Date(),
            updated_at: new Date()
          });

          // This operation will fail (invalid foreign key)
          await trx('project_assignments').insert({
            id: 'service-test-error-assignment',
            project_id: 'non-existent-project-id',
            person_id: 'service-test-error-person',
            role_id: 'non-existent-role-id',
            allocation_percentage: 100,
            start_date: new Date(),
            end_date: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify that failed transaction didn't leave audit entries
      const errorAuditEntries = await db('audit_log')
        .where('request_id', 'service-test-error-1');

      expect(errorAuditEntries.length).toBe(0);

      // Verify that the person record was not created either
      const personExists = await db('people')
        .where('id', 'service-test-error-person')
        .first();

      expect(personExists).toBeUndefined();
    });

    test('should handle concurrent service operations safely', async () => {
      // Test that concurrent service operations don't interfere with each other's audit context
      
      const promises = Array.from({ length: 5 }, async (_, i) => {
        const auditContext = {
          userId: 'service-test',
          requestId: `service-test-concurrent-${i}`,
          ipAddress: '127.0.0.1',
          comment: `Concurrent operation ${i}`
        };

        auditedDb.setDefaultContext(auditContext);

        const testPerson = {
          id: `service-test-concurrent-person-${i}`,
          name: `Concurrent Test Person ${i}`,
          email: `concurrent-${i}@example.com`,
          created_at: new Date(),
          updated_at: new Date()
        };

        await auditedDb('people').insert(testPerson);
        
        return auditContext.requestId;
      });

      const requestIds = await Promise.all(promises);

      // Verify each operation has its own distinct audit trail
      for (const requestId of requestIds) {
        const auditEntries = await db('audit_log')
          .where('request_id', requestId);

        expect(auditEntries.length).toBe(1);
        expect(auditEntries[0].request_id).toBe(requestId);
      }
    });
  });
});
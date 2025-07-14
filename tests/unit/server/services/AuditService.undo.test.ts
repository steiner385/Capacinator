import { describe, test, expect, beforeEach } from '@jest/globals';
import { AuditService, AuditConfig } from '../../../../src/server/AuditService.js';
import { testDb, createTestUser, createTestRole, createTestProject } from '../../../../src/server/../__tests__/setup.js';

describe('AuditService - Undo Functionality', () => {
  let auditService: AuditService;
  let testConfig: AuditConfig;

  beforeEach(() => {
    testConfig = {
      maxHistoryEntries: 10,
      retentionDays: 30,
      sensitiveFields: ['password', 'token'],
      enabledTables: ['people', 'projects', 'roles']
    };
    auditService = new AuditService(testDb, testConfig);
  });

  describe('undoLastChange', () => {
    test('should undo CREATE operation by deleting the record', async () => {
      const testUser = await createTestUser({ id: 'user-to-delete' });
      
      // Log the creation
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'CREATE',
        changedBy: 'admin',
        newValues: testUser
      });

      // Verify user exists
      const userBefore = await testDb('people').where('id', testUser.id).first();
      expect(userBefore).toBeDefined();

      // Undo the creation
      const success = await auditService.undoLastChange('people', testUser.id, 'admin', 'Undoing user creation');

      expect(success).toBe(true);

      // Verify user is deleted
      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter).toBeUndefined();

      // Verify undo operation is logged
      const auditEntries = await testDb('audit_log')
        .where('table_name', 'people')
        .where('record_id', testUser.id)
        .orderBy('changed_at', 'desc');

      expect(auditEntries.length).toBe(2);
      expect(auditEntries[0].action).toBe('DELETE');
      expect(auditEntries[0].changed_by).toBe('admin');
      expect(auditEntries[0].comment).toContain('Undo CREATE operation');
    });

    test('should undo UPDATE operation by restoring old values', async () => {
      const testUser = await createTestUser({ name: 'Original Name', email: 'original@example.com' });
      
      const oldValues = { name: 'Original Name', email: 'original@example.com' };
      const newValues = { name: 'Updated Name', email: 'updated@example.com' };

      // Update the user in database
      await testDb('people').where('id', testUser.id).update(newValues);

      // Log the update
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues,
        newValues
      });

      // Verify current state
      const userBefore = await testDb('people').where('id', testUser.id).first();
      expect(userBefore.name).toBe('Updated Name');
      expect(userBefore.email).toBe('updated@example.com');

      // Undo the update
      const success = await auditService.undoLastChange('people', testUser.id, 'admin');

      expect(success).toBe(true);

      // Verify values are restored
      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter.name).toBe('Original Name');
      expect(userAfter.email).toBe('original@example.com');

      // Verify undo operation is logged
      const auditEntries = await testDb('audit_log')
        .where('table_name', 'people')
        .where('record_id', testUser.id)
        .orderBy('changed_at', 'desc');

      expect(auditEntries.length).toBe(2);
      expect(auditEntries[0].action).toBe('UPDATE');
      expect(auditEntries[0].changed_by).toBe('admin');
      expect(JSON.parse(auditEntries[0].old_values)).toEqual(newValues);
      expect(JSON.parse(auditEntries[0].new_values)).toEqual(oldValues);
    });

    test('should refuse to undo DELETE operation', async () => {
      const testUser = await createTestUser();
      
      // Log a delete operation
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'DELETE',
        changedBy: 'admin',
        oldValues: { name: 'John Doe', email: 'john@example.com' }
      });

      // Attempt to undo DELETE
      await expect(auditService.undoLastChange('people', testUser.id, 'admin'))
        .rejects.toThrow('Cannot undo DELETE operations');
    });

    test('should throw error when no changes exist to undo', async () => {
      await expect(auditService.undoLastChange('people', 'non-existent-record', 'admin'))
        .rejects.toThrow('No changes found to undo');
    });

    test('should undo the most recent change when multiple changes exist', async () => {
      const testUser = await createTestUser({ name: 'Original' });
      
      // First update
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues: { name: 'Original' },
        newValues: { name: 'First Update' }
      });

      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      // Second update
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues: { name: 'First Update' },
        newValues: { name: 'Second Update' }
      });

      // Update the actual record to match the audit log
      await testDb('people').where('id', testUser.id).update({ name: 'Second Update' });

      // Undo should revert to "First Update", not "Original"
      await auditService.undoLastChange('people', testUser.id, 'admin');

      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter.name).toBe('First Update');
    });

    test('should handle partial field updates correctly', async () => {
      const testUser = await createTestUser({ 
        name: 'John Doe', 
        email: 'john@example.com',
        status: 'active'
      });
      
      // Update only some fields
      const oldValues = { name: 'John Doe', status: 'active' };
      const newValues = { name: 'Jane Doe', status: 'inactive' };

      // Update database
      await testDb('people').where('id', testUser.id).update(newValues);

      // Log partial update
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        oldValues,
        newValues
      });

      // Undo the change
      await auditService.undoLastChange('people', testUser.id, 'admin');

      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter.name).toBe('John Doe');
      expect(userAfter.status).toBe('active');
      expect(userAfter.email).toBe('john@example.com'); // Should remain unchanged
    });
  });

  describe('undoLastNChanges', () => {
    test('should undo multiple changes by the same user', async () => {
      const user1 = await createTestUser({ id: 'user-1', name: 'User 1' });
      const user2 = await createTestUser({ id: 'user-2', name: 'User 2' });
      
      // User makes multiple changes
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'UPDATE',
        changedBy: 'editor',
        oldValues: { name: 'User 1' },
        newValues: { name: 'Updated User 1' }
      });

      await auditService.logChange({
        tableName: 'people',
        recordId: user2.id,
        action: 'UPDATE',
        changedBy: 'editor',
        oldValues: { name: 'User 2' },
        newValues: { name: 'Updated User 2' }
      });

      // Admin makes a change (should not be undone)
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'UPDATE',
        changedBy: 'admin',
        oldValues: { name: 'Updated User 1' },
        newValues: { name: 'Admin Updated User 1' }
      });

      // Update actual records
      await testDb('people').where('id', user1.id).update({ name: 'Admin Updated User 1' });
      await testDb('people').where('id', user2.id).update({ name: 'Updated User 2' });

      // Undo last 2 changes by editor
      const result = await auditService.undoLastNChanges('editor', 2, 'admin', 'Bulk undo');

      expect(result.undone).toBe(2);
      expect(result.errors.length).toBe(0);

      // Verify changes are reverted
      const user1After = await testDb('people').where('id', user1.id).first();
      const user2After = await testDb('people').where('id', user2.id).first();

      expect(user1After.name).toBe('Admin Updated User 1'); // Admin change should remain
      expect(user2After.name).toBe('User 2'); // Should be reverted
    });

    test('should handle errors gracefully and continue processing', async () => {
      const user1 = await createTestUser({ id: 'user-1' });
      const user2 = await createTestUser({ id: 'user-2' });
      
      // Create changes
      await auditService.logChange({
        tableName: 'people',
        recordId: user1.id,
        action: 'DELETE', // This will cause an error when undoing
        changedBy: 'user',
        oldValues: { name: 'User 1' }
      });

      await auditService.logChange({
        tableName: 'people',
        recordId: user2.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'User 2' },
        newValues: { name: 'Updated User 2' }
      });

      // Update user2 in database
      await testDb('people').where('id', user2.id).update({ name: 'Updated User 2' });

      const result = await auditService.undoLastNChanges('user', 2, 'admin');

      expect(result.undone).toBe(1); // Only user2 update should be undone
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Cannot undo DELETE operations');

      // Verify user2 is reverted
      const user2After = await testDb('people').where('id', user2.id).first();
      expect(user2After.name).toBe('User 2');
    });

    test('should process changes in reverse chronological order', async () => {
      const testUser = await createTestUser({ name: 'Original' });
      
      // Create a sequence of changes
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Original' },
        newValues: { name: 'Change 1' }
      });

      await new Promise(resolve => setTimeout(resolve, 1));

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Change 1' },
        newValues: { name: 'Change 2' }
      });

      await new Promise(resolve => setTimeout(resolve, 1));

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Change 2' },
        newValues: { name: 'Change 3' }
      });

      // Update database to final state
      await testDb('people').where('id', testUser.id).update({ name: 'Change 3' });

      // Undo last 2 changes
      const result = await auditService.undoLastNChanges('user', 2, 'admin');

      expect(result.undone).toBe(2);

      // Should end up at "Change 1" (oldest change not undone)
      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter.name).toBe('Change 1');
    });

    test('should not exceed available changes', async () => {
      const testUser = await createTestUser();
      
      // Create only 2 changes
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Original' },
        newValues: { name: 'Change 1' }
      });

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Change 1' },
        newValues: { name: 'Change 2' }
      });

      // Try to undo 5 changes (more than available)
      const result = await auditService.undoLastNChanges('user', 5, 'admin');

      expect(result.undone).toBe(2); // Only 2 changes were available
      expect(result.errors.length).toBe(0);
    });

    test('should handle complex multi-table scenario', async () => {
      const testUser = await createTestUser({ id: 'user-1' });
      const testRole = await createTestRole({ id: 'role-1' });
      const testProject = await createTestProject({ id: 'project-1' });
      
      // User makes changes across multiple tables
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'editor',
        oldValues: { name: 'User' },
        newValues: { name: 'Updated User' }
      });

      await auditService.logChange({
        tableName: 'roles',
        recordId: testRole.id,
        action: 'UPDATE',
        changedBy: 'editor',
        oldValues: { name: 'Role' },
        newValues: { name: 'Updated Role' }
      });

      await auditService.logChange({
        tableName: 'projects',
        recordId: testProject.id,
        action: 'UPDATE',
        changedBy: 'editor',
        oldValues: { name: 'Project' },
        newValues: { name: 'Updated Project' }
      });

      // Update actual records
      await testDb('people').where('id', testUser.id).update({ name: 'Updated User' });
      await testDb('roles').where('id', testRole.id).update({ name: 'Updated Role' });
      await testDb('projects').where('id', testProject.id).update({ name: 'Updated Project' });

      // Undo all changes by editor
      const result = await auditService.undoLastNChanges('editor', 3, 'admin');

      expect(result.undone).toBe(3);
      expect(result.errors.length).toBe(0);

      // Verify all changes are reverted
      const userAfter = await testDb('people').where('id', testUser.id).first();
      const roleAfter = await testDb('roles').where('id', testRole.id).first();
      const projectAfter = await testDb('projects').where('id', testProject.id).first();

      expect(userAfter.name).toBe('User');
      expect(roleAfter.name).toBe('Role');
      expect(projectAfter.name).toBe('Project');
    });
  });

  describe('Complex Undo Scenarios', () => {
    test('should handle cascading updates correctly', async () => {
      const testUser = await createTestUser({ 
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      });
      
      // Simulate a series of related updates
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { email: 'john@example.com' },
        newValues: { email: 'john.doe@company.com' }
      });

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { status: 'active' },
        newValues: { status: 'verified' }
      });

      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'John Doe' },
        newValues: { name: 'John Smith' }
      });

      // Update database to final state
      await testDb('people').where('id', testUser.id).update({
        name: 'John Smith',
        email: 'john.doe@company.com',
        status: 'verified'
      });

      // Undo each change individually and verify state
      await auditService.undoLastChange('people', testUser.id, 'admin');
      let user = await testDb('people').where('id', testUser.id).first();
      expect(user.name).toBe('John Doe'); // Name reverted
      expect(user.email).toBe('john.doe@company.com'); // Email unchanged
      expect(user.status).toBe('verified'); // Status unchanged

      await auditService.undoLastChange('people', testUser.id, 'admin');
      user = await testDb('people').where('id', testUser.id).first();
      expect(user.status).toBe('active'); // Status reverted

      await auditService.undoLastChange('people', testUser.id, 'admin');
      user = await testDb('people').where('id', testUser.id).first();
      expect(user.email).toBe('john@example.com'); // Email reverted
    });

    test('should handle undo of record recreation scenario', async () => {
      const recordId = 'test-record-123';
      
      // Create record
      await testDb('people').insert({
        id: recordId,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      });

      const originalData = await testDb('people').where('id', recordId).first();

      // Log creation
      await auditService.logChange({
        tableName: 'people',
        recordId: recordId,
        action: 'CREATE',
        changedBy: 'user',
        newValues: originalData
      });

      // Delete the record (simulating user deletion)
      await testDb('people').where('id', recordId).del();

      // Log deletion
      await auditService.logChange({
        tableName: 'people',
        recordId: recordId,
        action: 'DELETE',
        changedBy: 'user',
        oldValues: originalData
      });

      // Recreate the record with different data
      await testDb('people').insert({
        id: recordId,
        name: 'Recreated User',
        email: 'recreated@example.com',
        created_at: new Date(),
        updated_at: new Date()
      });

      const recreatedData = await testDb('people').where('id', recordId).first();

      // Log recreation
      await auditService.logChange({
        tableName: 'people',
        recordId: recordId,
        action: 'CREATE',
        changedBy: 'user',
        newValues: recreatedData
      });

      // Undo the recreation (should delete the record)
      await auditService.undoLastChange('people', recordId, 'admin');

      const userAfterUndo = await testDb('people').where('id', recordId).first();
      expect(userAfterUndo).toBeUndefined();

      // Verify the undo operation was logged as DELETE
      const auditEntries = await testDb('audit_log')
        .where('table_name', 'people')
        .where('record_id', recordId)
        .orderBy('changed_at', 'desc');

      expect(auditEntries[0].action).toBe('DELETE');
      expect(auditEntries[0].comment).toContain('Undo CREATE operation');
    });

    test('should handle undo when record has been modified after audit log', async () => {
      const testUser = await createTestUser({ name: 'Original', email: 'original@example.com' });
      
      // Log an update
      await auditService.logChange({
        tableName: 'people',
        recordId: testUser.id,
        action: 'UPDATE',
        changedBy: 'user',
        oldValues: { name: 'Original', email: 'original@example.com' },
        newValues: { name: 'Updated', email: 'updated@example.com' }
      });

      // Someone else modifies the record after the audit log
      await testDb('people').where('id', testUser.id).update({
        name: 'Modified by someone else',
        email: 'modified@example.com',
        additional_field: 'new data'
      });

      // Undo should still work, restoring only the audited fields
      const success = await auditService.undoLastChange('people', testUser.id, 'admin');
      expect(success).toBe(true);

      const userAfter = await testDb('people').where('id', testUser.id).first();
      expect(userAfter.name).toBe('Original');
      expect(userAfter.email).toBe('original@example.com');
      // Additional field should remain unchanged
      expect(userAfter.additional_field).toBe('new data');
    });
  });
});
import { Knex } from 'knex';
import { withMigrationAudit } from '../MigrationAuditWrapper.js';

export async function up(knex: Knex): Promise<void> {
  console.log('Running example audited migration...');
  
  // Use the migration audit wrapper for any data modifications
  await withMigrationAudit(knex, '036_example_audited_migration', async (auditDb) => {
    // Schema changes typically don't need auditing
    // But if you're inserting/updating/deleting data, use auditDb instead of knex
    
    // Example: If this migration added default roles
    // await auditDb.insert('roles', {
    //   id: 'default-role-id',
    //   name: 'Default Role',
    //   description: 'Added by migration',
    //   created_at: new Date(),
    //   updated_at: new Date()
    // });
    
    console.log('✅ Example audited migration completed');
  });
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back example audited migration...');
  
  // Rollbacks can also be audited if they modify data
  await withMigrationAudit(knex, '036_example_audited_migration_rollback', async (auditDb) => {
    // Example rollback operations would go here
    console.log('✅ Example audited migration rolled back');
  });
}
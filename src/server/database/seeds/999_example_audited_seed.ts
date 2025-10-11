import { Knex } from 'knex';
import { withSeedAudit } from '../MigrationAuditWrapper.js';

export async function seed(knex: Knex): Promise<void> {
  console.log('Running example audited seed...');
  
  // Use the seed audit wrapper for all data operations
  await withSeedAudit(knex, '999_example_audited_seed', async (auditDb) => {
    // Instead of using knex directly, use auditDb for audit-aware operations
    
    // Example: Clear existing data (audited)
    // await auditDb.delete('roles', {}); // This would audit each deletion
    
    // Example: Insert new data (audited)
    // await auditDb.insert('roles', [
    //   {
    //     id: 'seed-role-1',
    //     name: 'Seeded Role 1',
    //     description: 'Added by seed',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
    //   {
    //     id: 'seed-role-2', 
    //     name: 'Seeded Role 2',
    //     description: 'Added by seed',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   }
    // ]);
    
    // For read operations or schema operations, you can still use the raw db
    // const existingRoles = await auditDb.table('roles').select('*');
    // console.log(`Found ${existingRoles.length} existing roles`);
    
    console.log('✅ Example audited seed completed');
  });
}
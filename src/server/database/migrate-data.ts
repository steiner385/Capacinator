import { db } from './index.js';
import type { Knex } from 'knex';

interface ProjectType {
  id: string;
  name: string;
  description: string;
  color_code: string;
  created_at: string;
  updated_at: string;
  // New hierarchy fields
  parent_id?: string;
  is_parent?: boolean;
  level?: number;
  sort_order?: number;
}

async function migrateProjectTypeData() {
  
  try {
    console.log('🔄 Starting project type data migration...');
    
    // Check if hierarchy columns exist
    const hasHierarchyColumns = await db.schema.hasColumn('project_types', 'parent_id');
    if (!hasHierarchyColumns) {
      console.log('❌ Hierarchy columns not found. Please run database migrations first.');
      return;
    }
    
    // Get all existing project types
    const existingProjectTypes = await db('project_types').select('*');
    console.log(`📊 Found ${existingProjectTypes.length} existing project types`);
    
    // Check if any project types already have hierarchy data
    const hierarchyDataExists = existingProjectTypes.some(pt => 
      pt.parent_id !== null || pt.is_parent !== null || pt.level !== null
    );
    
    if (hierarchyDataExists) {
      console.log('✅ Project types already have hierarchy data. Skipping migration.');
      return;
    }
    
    // Update all existing project types as root-level items
    const updates = existingProjectTypes.map((pt, index) => ({
      id: pt.id,
      parent_id: null,
      is_parent: false,
      level: 0,
      sort_order: index + 1
    }));
    
    // Apply updates in a transaction
    await db.transaction(async (trx) => {
      for (const update of updates) {
        await trx('project_types')
          .where('id', update.id)
          .update({
            parent_id: update.parent_id,
            is_parent: update.is_parent,
            level: update.level,
            sort_order: update.sort_order
          });
      }
    });
    
    console.log(`✅ Successfully migrated ${updates.length} project types to hierarchy structure`);
    console.log('📋 All existing project types are now set as root-level items');
    console.log('💡 You can now create child project types through the UI');
    
  } catch (error) {
    console.error('❌ Error during data migration:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateProjectTypeData()
    .then(() => {
      console.log('🎉 Data migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Data migration failed:', error);
      process.exit(1);
    });
}

export { migrateProjectTypeData };
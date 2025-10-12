import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Ensuring resource_templates table has correct schema...');

  // Check if resource_templates table already exists
  const hasResourceTemplates = await knex.schema.hasTable('resource_templates');
  
  if (!hasResourceTemplates) {
    // Create the resource_templates table if it doesn't exist
    await knex.schema.createTable('resource_templates', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36).notNullable();
    table.string('project_sub_type_id', 36).nullable();
    table.string('phase_id', 36).notNullable();
    table.string('role_id', 36).notNullable();
    table.float('allocation_percentage').nullable(); // Percentage-based allocation (0-100)
    table.float('allocation_hours').nullable(); // Hour-based allocation
    table.text('notes').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    
    // Unique constraint to prevent duplicate allocations
    table.unique(['project_type_id', 'project_sub_type_id', 'phase_id', 'role_id'], 'unique_resource_template');
    
    // Indexes for performance
    table.index(['project_type_id'], 'idx_resource_templates_project_type');
    table.index(['phase_id'], 'idx_resource_templates_phase');
    table.index(['role_id'], 'idx_resource_templates_role');
    table.index(['project_type_id', 'phase_id'], 'idx_resource_templates_type_phase');
    });
    console.log('✅ resource_templates table created');
  } else {
    console.log('ℹ️  resource_templates table already exists');
    
    // Check if the table has allocation_hours column, add it if missing
    const hasAllocationHours = await knex.schema.hasColumn('resource_templates', 'allocation_hours');
    if (!hasAllocationHours) {
      console.log('Adding allocation_hours column to resource_templates table...');
      await knex.schema.alterTable('resource_templates', (table) => {
        table.float('allocation_hours').nullable();
      });
      console.log('✅ allocation_hours column added');
    }
  }

  // Check if standard_allocations table exists and has data
  const hasStandardAllocations = await knex.schema.hasTable('standard_allocations');
  
  if (hasStandardAllocations) {
    console.log('Migrating data from standard_allocations to resource_templates...');
    
    // Copy data from standard_allocations to resource_templates
    // Also populate allocation_percentage based on allocation_hours (assuming 40 hours = 100%)
    const standardAllocationsData = await knex('standard_allocations').select('*');
    
    if (standardAllocationsData.length > 0) {
      const resourceTemplatesData = standardAllocationsData.map(allocation => ({
        ...allocation,
        // Calculate percentage from hours (assuming 40 hours per week = 100%)
        allocation_percentage: allocation.allocation_hours ? Math.round((allocation.allocation_hours / 40) * 100) : null
      }));
      
      await knex('resource_templates').insert(resourceTemplatesData);
      console.log(`✅ Migrated ${resourceTemplatesData.length} records from standard_allocations to resource_templates`);
    }
    
    // Drop the old table
    await knex.schema.dropTable('standard_allocations');
    console.log('✅ Dropped old standard_allocations table');
  } else {
    console.log('ℹ️  No standard_allocations table found, skipping data migration');
  }

  console.log('✅ resource_templates table created successfully');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Reverting resource_templates table back to standard_allocations...');
  
  // Recreate standard_allocations table
  await knex.schema.createTable('standard_allocations', (table) => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    table.string('project_type_id', 36).notNullable();
    table.string('project_sub_type_id', 36).nullable();
    table.string('phase_id', 36).notNullable();
    table.string('role_id', 36).notNullable();
    table.float('allocation_percentage').nullable();
    table.float('allocation_hours').nullable();
    table.text('notes').nullable();
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Foreign key constraints
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('project_sub_type_id').references('id').inTable('project_sub_types').onDelete('CASCADE');
    table.foreign('phase_id').references('id').inTable('project_phases').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    
    // Unique constraint
    table.unique(['project_type_id', 'project_sub_type_id', 'phase_id', 'role_id'], 'unique_standard_allocation');
    
    // Indexes
    table.index(['project_type_id'], 'idx_standard_allocations_project_type');
    table.index(['phase_id'], 'idx_standard_allocations_phase');
    table.index(['role_id'], 'idx_standard_allocations_role');
    table.index(['project_type_id', 'phase_id'], 'idx_standard_allocations_type_phase');
  });
  
  // Migrate data back
  const hasResourceTemplates = await knex.schema.hasTable('resource_templates');
  if (hasResourceTemplates) {
    const resourceTemplatesData = await knex('resource_templates').select('*');
    if (resourceTemplatesData.length > 0) {
      await knex('standard_allocations').insert(resourceTemplatesData);
      console.log(`✅ Migrated ${resourceTemplatesData.length} records back to standard_allocations`);
    }
  }
  
  // Drop resource_templates table
  await knex.schema.dropTableIfExists('resource_templates');
  console.log('✅ Reverted to standard_allocations table');
}
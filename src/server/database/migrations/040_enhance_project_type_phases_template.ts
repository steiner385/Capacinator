import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to project_type_phases table for enhanced template management
  await knex.schema.alterTable('project_type_phases', table => {
    // Mark phases as mandatory (cannot be deleted from projects)
    table.boolean('is_mandatory').defaultTo(false).notNullable();
    
    // Duration constraints in days (more granular than weeks)
    table.integer('min_duration_days').nullable();
    table.integer('max_duration_days').nullable();
    table.integer('default_duration_days').nullable();
    
    // Phase ordering constraints
    table.boolean('is_locked_order').defaultTo(false).notNullable();
    
    // Template metadata
    table.text('template_description').nullable();
    table.json('template_metadata').nullable(); // For future extensibility
  });

  // Create indexes for better query performance
  await knex.schema.raw('CREATE INDEX project_type_phases_is_mandatory_index ON project_type_phases (is_mandatory)');
  await knex.schema.raw('CREATE INDEX project_type_phases_is_locked_order_index ON project_type_phases (is_locked_order)');

  // Convert existing duration_weeks to default_duration_days for consistency
  await knex.raw(`
    UPDATE project_type_phases 
    SET default_duration_days = duration_weeks * 7 
    WHERE duration_weeks IS NOT NULL
  `);

  // Mark all existing phases as mandatory by default to maintain current behavior
  await knex.raw(`
    UPDATE project_type_phases 
    SET is_mandatory = true, is_locked_order = true
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove the added columns
  await knex.schema.alterTable('project_type_phases', table => {
    table.dropColumn('is_mandatory');
    table.dropColumn('min_duration_days');
    table.dropColumn('max_duration_days');
    table.dropColumn('default_duration_days');
    table.dropColumn('is_locked_order');
    table.dropColumn('template_description');
    table.dropColumn('template_metadata');
  });

  // Drop the indexes
  await knex.schema.raw('DROP INDEX IF EXISTS project_type_phases_is_mandatory_index');
  await knex.schema.raw('DROP INDEX IF EXISTS project_type_phases_is_locked_order_index');
}
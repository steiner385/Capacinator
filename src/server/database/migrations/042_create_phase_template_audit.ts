import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create phase template audit table for tracking changes to project type phase templates
  await knex.schema.createTable('phase_template_audit', table => {
    table.string('id', 36).primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    
    // What was changed
    table.string('project_type_id', 36).notNullable();
    table.string('project_type_phase_id', 36).nullable(); // null for template-level changes
    table.enum('change_type', ['template_created', 'template_updated', 'template_deleted', 'phase_added', 'phase_updated', 'phase_removed']).notNullable();
    
    // Change details
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.text('change_description').nullable();
    
    // Impact tracking
    table.integer('affected_projects_count').defaultTo(0);
    table.json('affected_project_ids').nullable(); // Array of project IDs
    table.boolean('requires_project_updates').defaultTo(false);
    
    // Change metadata
    table.string('changed_by', 255).nullable();
    table.string('change_reason', 500).nullable();
    table.boolean('is_rollback').defaultTo(false);
    table.string('rollback_from_audit_id', 36).nullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('applied_at').nullable(); // When changes were applied to projects
    table.timestamp('rolled_back_at').nullable();
    
    // Foreign keys
    table.foreign('project_type_id').references('id').inTable('project_types').onDelete('CASCADE');
    table.foreign('project_type_phase_id').references('id').inTable('project_type_phases').onDelete('SET NULL');
    table.foreign('rollback_from_audit_id').references('id').inTable('phase_template_audit').onDelete('SET NULL');
  });

  // Create indexes for better query performance
  await knex.schema.raw('CREATE INDEX phase_template_audit_project_type_id_index ON phase_template_audit (project_type_id)');
  await knex.schema.raw('CREATE INDEX phase_template_audit_change_type_index ON phase_template_audit (change_type)');
  await knex.schema.raw('CREATE INDEX phase_template_audit_created_at_index ON phase_template_audit (created_at)');
  await knex.schema.raw('CREATE INDEX phase_template_audit_requires_updates_index ON phase_template_audit (requires_project_updates)');

  // Create a view for easy change history lookup
  await knex.schema.raw(`
    CREATE VIEW phase_template_change_history AS
    SELECT 
      pta.*,
      pt.name as project_type_name,
      ptp.order_index as phase_order,
      pp.name as phase_name
    FROM phase_template_audit pta
    LEFT JOIN project_types pt ON pta.project_type_id = pt.id
    LEFT JOIN project_type_phases ptp ON pta.project_type_phase_id = ptp.id
    LEFT JOIN project_phases pp ON ptp.phase_id = pp.id
    ORDER BY pta.created_at DESC
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the view first
  await knex.schema.raw('DROP VIEW IF EXISTS phase_template_change_history');
  
  // Drop the table
  await knex.schema.dropTableIfExists('phase_template_audit');
}
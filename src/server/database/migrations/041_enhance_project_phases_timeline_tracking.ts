import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to project_phases_timeline table for phase source tracking
  // Using raw SQL to avoid issues with SQLite view dependencies
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN phase_source TEXT DEFAULT "template" NOT NULL CHECK (phase_source IN ("template", "custom"))');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN template_phase_id TEXT NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN is_deletable INTEGER DEFAULT 1 NOT NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN original_duration_days INTEGER NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN template_min_duration_days INTEGER NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN template_max_duration_days INTEGER NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN is_duration_customized INTEGER DEFAULT 0 NOT NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN is_name_customized INTEGER DEFAULT 0 NOT NULL');
  await knex.raw('ALTER TABLE project_phases_timeline ADD COLUMN template_compliance_data TEXT NULL');

  // Create indexes for better query performance
  await knex.schema.raw('CREATE INDEX project_phases_timeline_phase_source_index ON project_phases_timeline (phase_source)');
  await knex.schema.raw('CREATE INDEX project_phases_timeline_template_phase_id_index ON project_phases_timeline (template_phase_id)');
  await knex.schema.raw('CREATE INDEX project_phases_timeline_is_deletable_index ON project_phases_timeline (is_deletable)');
  await knex.schema.raw('CREATE INDEX project_phases_timeline_is_duration_customized_index ON project_phases_timeline (is_duration_customized)');

  // Update existing timeline entries to mark them as template-sourced and non-deletable
  // This maintains backward compatibility while enabling the new system
  await knex.raw(`
    UPDATE project_phases_timeline 
    SET 
      phase_source = 'template',
      is_deletable = false,
      is_duration_customized = false,
      is_name_customized = false
  `);

  // Try to link existing timeline entries to their template phases
  await knex.raw(`
    UPDATE project_phases_timeline 
    SET template_phase_id = (
      SELECT ptp.id 
      FROM project_type_phases ptp
      INNER JOIN projects p ON p.project_type_id = ptp.project_type_id
      WHERE p.id = project_phases_timeline.project_id 
        AND ptp.phase_id = project_phases_timeline.phase_id
      LIMIT 1
    )
    WHERE phase_source = 'template'
  `);

  // Update original duration from template data
  await knex.raw(`
    UPDATE project_phases_timeline 
    SET 
      original_duration_days = (
        SELECT ptp.default_duration_days
        FROM project_type_phases ptp
        WHERE ptp.id = project_phases_timeline.template_phase_id
      ),
      template_min_duration_days = (
        SELECT ptp.min_duration_days
        FROM project_type_phases ptp
        WHERE ptp.id = project_phases_timeline.template_phase_id
      ),
      template_max_duration_days = (
        SELECT ptp.max_duration_days
        FROM project_type_phases ptp
        WHERE ptp.id = project_phases_timeline.template_phase_id
      )
    WHERE template_phase_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the indexes first
  await knex.schema.raw('DROP INDEX IF EXISTS project_phases_timeline_phase_source_index');
  await knex.schema.raw('DROP INDEX IF EXISTS project_phases_timeline_template_phase_id_index');
  await knex.schema.raw('DROP INDEX IF EXISTS project_phases_timeline_is_deletable_index');
  await knex.schema.raw('DROP INDEX IF EXISTS project_phases_timeline_is_duration_customized_index');
  
  // Note: SQLite doesn't support dropping columns easily, so we'll leave them
  // In production, you'd need to recreate the table without these columns
  console.log('Note: SQLite columns cannot be easily dropped. Columns will remain but be unused.');
}
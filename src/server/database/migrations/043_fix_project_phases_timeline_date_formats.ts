import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('Starting project_phases_timeline date format standardization...');
  
  // First, let's check the current state of date formats
  const mixedFormatCheck = await knex.raw(`
    SELECT 
      COUNT(CASE WHEN start_date LIKE '20%' THEN 1 END) as proper_dates,
      COUNT(CASE WHEN start_date NOT LIKE '20%' THEN 1 END) as timestamp_dates
    FROM project_phases_timeline
  `);
  
  console.log('Current date format distribution:', mixedFormatCheck[0]);
  
  // Backup the current data before conversion (create a temporary backup table)
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS project_phases_timeline_backup_043 AS 
    SELECT * FROM project_phases_timeline
  `);
  
  console.log('Created backup table: project_phases_timeline_backup_043');
  
  // Convert timestamp dates to proper DATE format
  // We need to handle both start_date and end_date
  await knex.raw(`
    UPDATE project_phases_timeline 
    SET 
      start_date = date(CAST(start_date AS INTEGER) / 1000, 'unixepoch'),
      end_date = date(CAST(end_date AS INTEGER) / 1000, 'unixepoch'),
      updated_at = CURRENT_TIMESTAMP
    WHERE start_date NOT LIKE '20%' 
      AND CAST(start_date AS INTEGER) > 1000000000
  `);
  
  // Verify the conversion worked
  const postConversionCheck = await knex.raw(`
    SELECT 
      COUNT(CASE WHEN start_date LIKE '20%' THEN 1 END) as proper_dates_after,
      COUNT(CASE WHEN start_date NOT LIKE '20%' THEN 1 END) as timestamp_dates_after,
      MIN(start_date) as min_date,
      MAX(start_date) as max_date
    FROM project_phases_timeline
  `);
  
  console.log('Post-conversion date format distribution:', postConversionCheck[0]);
  
  // Note: SQLite doesn't support adding CHECK constraints to existing tables easily,
  // but future table creations should include:
  // CHECK (start_date LIKE '____-__-__' AND end_date LIKE '____-__-__')
  
  console.log('Date format standardization completed successfully!');
}

export async function down(knex: Knex): Promise<void> {
  console.log('Rolling back project_phases_timeline date format changes...');
  
  // Restore from backup if it exists
  const backupExists = await knex.schema.hasTable('project_phases_timeline_backup_043');
  
  if (backupExists) {
    // Clear current data and restore from backup
    await knex.raw('DELETE FROM project_phases_timeline');
    await knex.raw(`
      INSERT INTO project_phases_timeline 
      SELECT * FROM project_phases_timeline_backup_043
    `);
    
    // Drop the backup table
    await knex.schema.dropTable('project_phases_timeline_backup_043');
    
    console.log('Successfully restored data from backup');
  } else {
    console.log('Warning: No backup table found. Cannot restore original data.');
  }
}
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('category').notNullable().comment('Category of settings: system, import, etc.');
    table.json('settings').notNullable().comment('JSON object containing the settings');
    table.timestamps(true, true);
    
    // Add unique constraint on category to ensure single record per category
    table.unique(['category']);
    
    // Add index for faster lookups
    table.index(['category']);
  });

  // Insert default settings
  await knex('settings').insert([
    {
      category: 'system',
      settings: JSON.stringify({
        defaultWorkHoursPerWeek: 40,
        defaultVacationDaysPerYear: 15,
        fiscalYearStartMonth: 1,
        allowOverAllocation: true,
        maxAllocationPercentage: 120,
        requireApprovalForOverrides: true,
        autoArchiveCompletedProjects: false,
        archiveAfterDays: 90,
        enableEmailNotifications: false
      })
    },
    {
      category: 'import',
      settings: JSON.stringify({
        clearExistingData: false,
        validateDuplicates: true,
        autoCreateMissingRoles: false,
        autoCreateMissingLocations: false,
        defaultProjectPriority: 2,
        dateFormat: 'MM/DD/YYYY'
      })
    }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('settings');
}
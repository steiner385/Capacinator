import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to project_assignments table for flexible dating
  await knex.schema.alterTable('project_assignments', (table) => {
    // Assignment date mode: how the start/end dates are determined
    table.enum('assignment_date_mode', ['fixed', 'phase', 'project']).defaultTo('fixed');
    
    // For fixed mode: use existing start_date and end_date columns
    // For phase mode: use phase_id to compute dates from project_phases_timeline
    // For project mode: use project_id to compute dates from project aspiration dates
    
    // Make start_date and end_date nullable since they'll be computed for phase/project modes
    table.date('computed_start_date').nullable();
    table.date('computed_end_date').nullable();
    
    // Add index for assignment_date_mode for efficient queries
    table.index(['assignment_date_mode']);
  });

  // Update existing assignments to use 'fixed' mode
  await knex('project_assignments').update({ assignment_date_mode: 'fixed' });

  console.log('✅ Added flexible assignment date columns');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('project_assignments', (table) => {
    table.dropColumn('assignment_date_mode');
    table.dropColumn('computed_start_date');
    table.dropColumn('computed_end_date');
  });

  console.log('✅ Removed flexible assignment date columns');
}
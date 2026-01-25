import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Fixing missing IDs in database records...');

  // Fix missing IDs in project_assignments
  const assignmentsWithoutId = await knex('project_assignments')
    .select(knex.raw('rowid'))
    .whereNull('id')
    .orWhere('id', '') as unknown as Array<{ rowid: number }>;

  console.log(`Found ${assignmentsWithoutId.length} assignments without IDs`);

  for (const assignment of assignmentsWithoutId) {
    // Generate a new UUID for records missing IDs
    await knex.raw(`
      UPDATE project_assignments
      SET id = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
               substr(lower(hex(randomblob(2))),2) || '-' ||
               substr('89ab',abs(random()) % 4 + 1, 1) ||
               substr(lower(hex(randomblob(2))),2) || '-' ||
               lower(hex(randomblob(6)))
      WHERE rowid = ?
    `, [assignment.rowid]);
  }

  // Fix missing IDs in person_availability_overrides
  const overridesWithoutId = await knex('person_availability_overrides')
    .select(knex.raw('rowid'))
    .whereNull('id')
    .orWhere('id', '') as unknown as Array<{ rowid: number }>;

  console.log(`Found ${overridesWithoutId.length} availability overrides without IDs`);

  for (const override of overridesWithoutId) {
    await knex.raw(`
      UPDATE person_availability_overrides
      SET id = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
               substr(lower(hex(randomblob(2))),2) || '-' ||
               substr('89ab',abs(random()) % 4 + 1, 1) ||
               substr(lower(hex(randomblob(2))),2) || '-' ||
               lower(hex(randomblob(6)))
      WHERE rowid = ?
    `, [override.rowid]);
  }

  console.log('✅ Fixed missing IDs');
}

export async function down(_knex: Knex): Promise<void> {
  // This migration cannot be reversed as we can't remove generated IDs
  console.log('⚠️  This migration cannot be reversed');
}
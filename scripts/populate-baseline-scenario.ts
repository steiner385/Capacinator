import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../src/server/database/index.js';

const knex = getDb();

async function populateBaselineScenario() {
  console.log('🔄 Populating baseline scenario with inherited assignments...');

  try {
    // Get the baseline scenario
    const baselineScenario = await knex('scenarios')
      .where('scenario_type', 'baseline')
      .where('name', 'Current State Baseline')
      .first();

    if (!baselineScenario) {
      console.error('❌ No baseline scenario found!');
      process.exit(1);
    }

    console.log(`✅ Found baseline scenario: ${baselineScenario.name} (${baselineScenario.id})`);

    // Check if baseline scenario already has assignments
    const existingAssignments = await knex('scenario_project_assignments')
      .where('scenario_id', baselineScenario.id)
      .count('* as count')
      .first();

    console.log(`📊 Baseline scenario currently has ${existingAssignments?.count || 0} assignments`);

    // Get all base project_assignments
    const baseAssignments = await knex('project_assignments')
      .select('*');

    console.log(`📋 Found ${baseAssignments.length} base project_assignments to inherit`);

    if (baseAssignments.length === 0) {
      console.log('⚠️  No base project_assignments found to inherit');
      return;
    }

    // If baseline already has some assignments, clear them first to avoid duplicates
    if (existingAssignments?.count > 0) {
      console.log('🧹 Clearing existing baseline scenario assignments...');
      await knex('scenario_project_assignments')
        .where('scenario_id', baselineScenario.id)
        .del();
    }

    // Create scenario_project_assignments for each base assignment
    const inheritedAssignments = baseAssignments.map(assignment => ({
      id: uuidv4(),
      scenario_id: baselineScenario.id,
      project_id: assignment.project_id,
      person_id: assignment.person_id,
      role_id: assignment.role_id,
      phase_id: assignment.phase_id,
      allocation_percentage: assignment.allocation_percentage,
      assignment_date_mode: assignment.assignment_date_mode,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      computed_start_date: assignment.computed_start_date,
      computed_end_date: assignment.computed_end_date,
      notes: assignment.notes ? `${assignment.notes} (Inherited from base)` : 'Inherited from base assignment',
      change_type: 'added',
      base_assignment_id: assignment.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`💾 Inserting ${inheritedAssignments.length} inherited assignments...`);

    // Insert inherited assignments in batches to avoid SQL limits
    const batchSize = 100;
    for (let i = 0; i < inheritedAssignments.length; i += batchSize) {
      const batch = inheritedAssignments.slice(i, i + batchSize);
      await knex('scenario_project_assignments').insert(batch);
      console.log(`   ✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(inheritedAssignments.length / batchSize)} (${batch.length} assignments)`);
    }

    // Verify the results
    const finalCount = await knex('scenario_project_assignments')
      .where('scenario_id', baselineScenario.id)
      .count('* as count')
      .first();

    console.log(`✅ Successfully populated baseline scenario with ${finalCount?.count || 0} inherited assignments`);

    // Test the new effective assignments view
    console.log('🔍 Testing effective assignments view...');
    const effectiveAssignments = await knex('effective_project_assignments')
      .where('scenario_id', baselineScenario.id)
      .orWhereNull('scenario_id')
      .count('* as count')
      .first();

    console.log(`📊 Effective assignments view shows ${effectiveAssignments?.count || 0} total assignments (base + baseline scenario)`);

    // Test project demands view with baseline scenario
    const demandData = await knex('project_demands_view')
      .where(function() {
        this.whereNull('scenario_id').orWhere('scenario_id', baselineScenario.id);
      })
      .count('* as count')
      .first();

    console.log(`📈 Project demands view shows ${demandData?.count || 0} demand records for baseline scenario`);

    console.log('🎉 Baseline scenario population completed successfully!');

  } catch (error) {
    console.error('❌ Error populating baseline scenario:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

// Run the script
populateBaselineScenario();
#!/usr/bin/env tsx
import { db } from '../src/server/database/index.js';

async function resetCustomerPortalPhases() {
  const knex = db;
  console.log('🔄 Resetting Customer Portal Redesign project phases...\n');

  try {
    // Find the Customer Portal Redesign project
    const project = await knex('projects')
      .where('name', 'LIKE', '%Customer Portal%')
      .first();

    if (!project) {
      console.error('❌ Customer Portal Redesign project not found');
      process.exit(1);
    }

    console.log(`📋 Found project: ${project.name} (ID: ${project.id})`);

    // Get all current phases for this project
    const currentPhases = await knex('project_phases_timeline')
      .where('project_id', project.id)
      .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
      .select('project_phases_timeline.*', 'project_phases.name as phase_name');

    console.log(`\n📊 Current phases: ${currentPhases.length}`);
    
    // Delete all phases with test-like names
    const testPhasePatterns = [
      '%Test Phase%',
      '%Duplicated Phase%',
      '%No Adjust Phase%',
      '%After Phase%',
      '%Custom Date Phase%',
      '%Phase at Beginning%',
      '%New Phase After%',
      '%(Copy)%'
    ];

    let deletedCount = 0;
    let customPhasesDeleted = 0;
    
    for (const pattern of testPhasePatterns) {
      const result = await knex('project_phases_timeline')
        .where('project_id', project.id)
        .whereIn('phase_id', function() {
          this.select('id')
            .from('project_phases')
            .where('name', 'LIKE', pattern);
        })
        .delete();
      
      if (result > 0) {
        console.log(`  ✅ Deleted ${result} phases matching pattern: ${pattern}`);
        deletedCount += result;
      }
    }

    // Also delete the custom phases themselves from project_phases table
    console.log('\n🧹 Cleaning up custom phase definitions...');
    try {
      // First get all custom phases
      const customPhases = await knex('project_phases')
        .where('name', 'LIKE', '%(Project: Customer Portal Redesign)%')
        .select('id', 'name');
      
      if (customPhases.length > 0) {
        // Delete any remaining timeline entries for these phases
        for (const phase of customPhases) {
          await knex('project_phases_timeline')
            .where('phase_id', phase.id)
            .delete();
        }
        
        // Now delete the custom phases
        customPhasesDeleted = await knex('project_phases')
          .where('name', 'LIKE', '%(Project: Customer Portal Redesign)%')
          .delete();
        
        console.log(`  ✅ Deleted ${customPhasesDeleted} custom phase definitions`);
      }
    } catch (error) {
      console.log('  ⚠️  Some custom phases may still exist due to references');
    }

    // Now let's set up clean, standard phases for the project
    console.log('\n📅 Setting up clean project phases...');

    // First, delete any remaining phases to start completely fresh
    await knex('project_phases_timeline')
      .where('project_id', project.id)
      .delete();

    // Get standard phases
    const standardPhases = await knex('project_phases')
      .whereNotIn('name', [
        'Planning', 'Requirements', 'Design', 'Development', 
        'Testing', 'Deployment', 'Maintenance'
      ])
      .whereNot('name', 'LIKE', '%(Project:%')
      .orderBy('order_index');

    // Define a clean phase timeline for Customer Portal Redesign
    const phaseTimeline = [
      { phaseName: 'Business Planning', startDate: '2024-01-01', endDate: '2024-02-29' },
      { phaseName: 'Development', startDate: '2024-03-01', endDate: '2024-06-30' },
      { phaseName: 'System Integration Testing', startDate: '2024-07-01', endDate: '2024-07-31' },
      { phaseName: 'User Acceptance Testing', startDate: '2024-08-01', endDate: '2024-08-31' },
      { phaseName: 'Cutover', startDate: '2024-09-01', endDate: '2024-09-15' },
      { phaseName: 'Validation', startDate: '2024-09-16', endDate: '2024-09-30' },
      { phaseName: 'Hypercare', startDate: '2024-10-01', endDate: '2024-10-31' }
    ];

    let insertedCount = 0;
    
    for (const { phaseName, startDate, endDate } of phaseTimeline) {
      const phase = await knex('project_phases')
        .where('name', phaseName)
        .first();
      
      if (phase) {
        await knex('project_phases_timeline').insert({
          id: crypto.randomUUID(),
          project_id: project.id,
          phase_id: phase.id,
          start_date: startDate,
          end_date: endDate,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        console.log(`  ✅ Added ${phaseName}: ${startDate} to ${endDate}`);
        insertedCount++;
      } else {
        console.log(`  ⚠️  Phase not found: ${phaseName}`);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  - Deleted ${deletedCount} test/artifact phases`);
    console.log(`  - Deleted ${customPhasesDeleted} custom phase definitions`);
    console.log(`  - Added ${insertedCount} clean phases`);

    // Show final state
    const finalPhases = await knex('project_phases_timeline')
      .where('project_id', project.id)
      .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
      .select('project_phases.name', 'project_phases_timeline.start_date', 'project_phases_timeline.end_date')
      .orderBy('project_phases_timeline.start_date');

    console.log('\n📅 Final phase timeline:');
    finalPhases.forEach(phase => {
      const start = new Date(phase.start_date).toLocaleDateString();
      const end = new Date(phase.end_date).toLocaleDateString();
      console.log(`  - ${phase.name}: ${start} to ${end}`);
    });

    console.log('\n✨ Customer Portal Redesign project has been reset successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting project:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

// Run the reset
resetCustomerPortalPhases();
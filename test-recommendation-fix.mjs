#!/usr/bin/env node

import knex from 'knex';
import path from 'path';

// Use a test database copy
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(process.cwd(), 'data', 'capacinator-test-debug.db')
  },
  useNullAsDefault: true
});

async function testRecommendationFix() {
  try {
    console.log('=== TESTING RECOMMENDATION FIX ===\n');

    // Get date range
    const currentDate = new Date();
    const startDate = currentDate.toISOString().split('T')[0];
    const endDate = new Date(currentDate.getTime() + (3 * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log(`Date range: ${startDate} to ${endDate}\n`);

    // Test the CORRECTED utilization query that uses COALESCE for dates
    console.log('1. CORRECTED utilization query (using COALESCE for dates):');
    const correctedUtilizationData = await db.raw(`
      SELECT 
        p.id as person_id,
        p.name as person_name,
        COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
        p.default_availability_percentage as capacity,
        COUNT(pa.id) as assignment_count,
        pr.role_id as primary_role_id,
        r.name as primary_role_name
      FROM people p
      LEFT JOIN project_assignments pa ON p.id = pa.person_id 
        AND COALESCE(pa.computed_start_date, pa.start_date) <= '${endDate}' 
        AND COALESCE(pa.computed_end_date, pa.end_date) >= '${startDate}'
      LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
      LEFT JOIN roles r ON pr.role_id = r.id
      WHERE p.is_active = 1
        AND p.name = 'Alice Johnson'
      GROUP BY p.id, p.name, p.default_availability_percentage, pr.role_id, r.name
    `);
    
    if (correctedUtilizationData.length > 0) {
      const alice = correctedUtilizationData[0];
      console.log('   Alice data with CORRECTED query:');
      console.log(`   - Total allocation: ${alice.total_allocation}%`);
      console.log(`   - Capacity: ${alice.capacity}%`);
      console.log(`   - Assignment count: ${alice.assignment_count}`);
      console.log(`   - Primary role: ${alice.primary_role_name}`);
      console.log(`   - Is overallocated: ${alice.total_allocation > (alice.capacity || 100)}`);
      console.log(`   - Is underutilized: ${alice.total_allocation < 70 && alice.total_allocation > 0}`);
      console.log(`   - Is available: ${alice.total_allocation === 0}`);
    }
    console.log();

    // Show the difference in assignment counts
    console.log('2. Assignment count comparison:');
    
    // Original query (only uses start_date/end_date)
    const originalCount = await db('project_assignments')
      .where('person_id', '123e4567-e89b-12d3-a456-426614174000')
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate)
      .count('* as count')
      .first();
    
    // Corrected query using COALESCE
    const correctedCount = await db('project_assignments')
      .where('person_id', '123e4567-e89b-12d3-a456-426614174000')
      .whereRaw(`COALESCE(computed_start_date, start_date) <= ?`, [endDate])
      .whereRaw(`COALESCE(computed_end_date, end_date) >= ?`, [startDate])
      .count('* as count')
      .first();
    
    console.log(`   Original query (start_date/end_date only): ${originalCount.count} assignments`);
    console.log(`   Corrected query (COALESCE): ${correctedCount.count} assignments`);
    console.log();

    // Show underutilized people who would get recommendations
    console.log('3. Underutilized people (50-70% allocation) with corrected query:');
    const underutilized = await db.raw(`
      SELECT 
        p.name as person_name,
        COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
        p.default_availability_percentage as capacity
      FROM people p
      LEFT JOIN project_assignments pa ON p.id = pa.person_id 
        AND COALESCE(pa.computed_start_date, pa.start_date) <= '${endDate}' 
        AND COALESCE(pa.computed_end_date, pa.end_date) >= '${startDate}'
      WHERE p.is_active = 1
      GROUP BY p.id, p.name, p.default_availability_percentage
      HAVING total_allocation > 0 AND total_allocation < 70
      ORDER BY total_allocation DESC
      LIMIT 5
    `);
    
    underutilized.forEach(person => {
      console.log(`   - ${person.person_name}: ${person.total_allocation}% allocated`);
    });
    console.log();

    // Show what needs to be fixed
    console.log('4. FIXES NEEDED:');
    console.log('   a) In RecommendationsController.getCurrentSystemState():');
    console.log('      Replace lines 175-176:');
    console.log('        AND pa.start_date <= \'${effectiveEndDate}\'');
    console.log('        AND pa.end_date >= \'${effectiveStartDate}\'');
    console.log('      With:');
    console.log('        AND COALESCE(pa.computed_start_date, pa.start_date) <= \'${effectiveEndDate}\'');
    console.log('        AND COALESCE(pa.computed_end_date, pa.end_date) >= \'${effectiveStartDate}\'');
    console.log();
    console.log('   b) In RecommendationsController.getPersonAssignments():');
    console.log('      Replace lines 509-510:');
    console.log('        .where(\'project_assignments.start_date\', \'<=\', effectiveEndDate)');
    console.log('        .where(\'project_assignments.end_date\', \'>=\', effectiveStartDate);');
    console.log('      With:');
    console.log('        .whereRaw(\'COALESCE(project_assignments.computed_start_date, project_assignments.start_date) <= ?\', [effectiveEndDate])');
    console.log('        .whereRaw(\'COALESCE(project_assignments.computed_end_date, project_assignments.end_date) >= ?\', [effectiveStartDate]);');
    console.log();
    console.log('   c) In RecommendationsController.generateSimpleRecommendations():');
    console.log('      Add recommendation logic for underutilized people (not just available people)');
    console.log('      Currently it only handles people with 0% allocation');

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await db.destroy();
  }
}

testRecommendationFix();
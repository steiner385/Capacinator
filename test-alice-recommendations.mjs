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

async function testAliceRecommendations() {
  try {
    console.log('=== TESTING ALICE RECOMMENDATION LOGIC ===\n');

    // Get date range
    const currentDate = new Date();
    const startDate = currentDate.toISOString().split('T')[0];
    const endDate = new Date(currentDate.getTime() + (3 * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 3 months ahead
    
    console.log(`Date range: ${startDate} to ${endDate}\n`);

    // 1. Check what the utilization query returns for Alice
    console.log('1. Testing utilization query for Alice:');
    try {
      const utilizationData = await db.raw(`
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
          AND pa.start_date <= '${endDate}' 
          AND pa.end_date >= '${startDate}'
        LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
        LEFT JOIN roles r ON pr.role_id = r.id
        WHERE p.is_active = 1
          AND p.name = 'Alice Johnson'
        GROUP BY p.id, p.name, p.default_availability_percentage, pr.role_id, r.name
      `);
      
      if (utilizationData.length > 0) {
        const alice = utilizationData[0];
        console.log('   Alice data from utilization query:');
        console.log(`   - Total allocation: ${alice.total_allocation}%`);
        console.log(`   - Capacity: ${alice.capacity}%`);
        console.log(`   - Assignment count: ${alice.assignment_count}`);
        console.log(`   - Primary role: ${alice.primary_role_name}`);
        console.log(`   - Is overallocated: ${alice.total_allocation > (alice.capacity || 100)}`);
        console.log(`   - Is underutilized: ${alice.total_allocation < 70 && alice.total_allocation > 0}`);
        console.log(`   - Is available: ${alice.total_allocation === 0}`);
      } else {
        console.log('   ERROR: Alice not found in utilization query!');
      }
    } catch (error) {
      console.log('   ERROR in utilization query:', error.message);
    }
    console.log();

    // 2. Check if Alice would be considered for recommendations
    console.log('2. Would Alice get recommendations?');
    
    // Check available people (0% allocation)
    const availablePeople = await db.raw(`
      SELECT 
        p.id as person_id,
        p.name as person_name,
        COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation
      FROM people p
      LEFT JOIN project_assignments pa ON p.id = pa.person_id 
        AND pa.start_date <= '${endDate}' 
        AND pa.end_date >= '${startDate}'
      WHERE p.is_active = 1
      GROUP BY p.id, p.name
      HAVING total_allocation = 0
    `);
    
    console.log(`   Available people (0% allocation): ${availablePeople.length}`);
    console.log('   Names:', availablePeople.slice(0, 5).map(p => p.person_name).join(', '));
    console.log();

    // 3. Check assignment date issues
    console.log('3. Alice\'s assignments with date filtering:');
    
    // Without date filter
    const allAssignments = await db('project_assignments')
      .where('person_id', '123e4567-e89b-12d3-a456-426614174000')
      .count('* as count')
      .first();
    console.log(`   Total assignments (no date filter): ${allAssignments.count}`);
    
    // With date filter
    const filteredAssignments = await db('project_assignments')
      .where('person_id', '123e4567-e89b-12d3-a456-426614174000')
      .where('start_date', '<=', endDate)
      .where('end_date', '>=', startDate)
      .count('* as count')
      .first();
    console.log(`   Assignments with date filter: ${filteredAssignments.count}`);
    
    // Check assignment dates
    const sampleDates = await db('project_assignments')
      .where('person_id', '123e4567-e89b-12d3-a456-426614174000')
      .select('start_date', 'end_date', 'computed_start_date', 'computed_end_date', 'assignment_date_mode')
      .limit(5);
    
    console.log('\n   Sample assignment dates:');
    sampleDates.forEach((a, idx) => {
      console.log(`   Assignment ${idx + 1}:`);
      console.log(`   - start_date: ${a.start_date}`);
      console.log(`   - end_date: ${a.end_date}`);
      console.log(`   - computed_start_date: ${a.computed_start_date}`);
      console.log(`   - computed_end_date: ${a.computed_end_date}`);
      console.log(`   - assignment_date_mode: ${a.assignment_date_mode}`);
    });
    console.log();

    // 4. Test with computed dates instead
    console.log('4. Testing with computed dates:');
    const computedDateQuery = await db.raw(`
      SELECT 
        p.id as person_id,
        p.name as person_name,
        COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
        COUNT(pa.id) as assignment_count
      FROM people p
      LEFT JOIN project_assignments pa ON p.id = pa.person_id 
        AND (
          (pa.computed_start_date IS NOT NULL AND pa.computed_start_date <= '${endDate}' AND pa.computed_end_date >= '${startDate}')
          OR 
          (pa.computed_start_date IS NULL AND pa.start_date <= '${endDate}' AND pa.end_date >= '${startDate}')
        )
      WHERE p.is_active = 1
        AND p.name = 'Alice Johnson'
      GROUP BY p.id, p.name
    `);
    
    if (computedDateQuery.length > 0) {
      const alice = computedDateQuery[0];
      console.log(`   Total allocation with computed dates: ${alice.total_allocation}%`);
      console.log(`   Assignment count: ${alice.assignment_count}`);
    }
    
    // 5. Check unassigned projects
    console.log('\n5. Unassigned projects:');
    const unassignedProjects = await db.raw(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM projects p
      LEFT JOIN project_assignments pa ON p.id = pa.project_id 
        AND pa.start_date <= '${endDate}' 
        AND pa.end_date >= '${startDate}'
      WHERE pa.id IS NULL AND p.include_in_demand = 1
      AND (p.aspiration_start IS NULL OR p.aspiration_start <= '${endDate}')
      AND (p.aspiration_finish IS NULL OR p.aspiration_finish >= '${startDate}')
    `);
    console.log(`   Count: ${unassignedProjects[0].count}`);

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await db.destroy();
  }
}

testAliceRecommendations();
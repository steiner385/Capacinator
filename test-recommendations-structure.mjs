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

async function debugDatabaseStructure() {
  try {
    console.log('=== DATABASE STRUCTURE DEBUG ===\n');

    // 1. List all tables
    console.log('1. All tables in database:');
    const tables = await db.raw(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    tables.forEach(table => console.log(`   - ${table.name}`));
    console.log();

    // 2. Check for role-related tables
    console.log('2. Role-related tables:');
    const roleTables = tables.filter(t => t.name.toLowerCase().includes('role'));
    roleTables.forEach(table => console.log(`   - ${table.name}`));
    console.log();

    // 3. Check project_assignments with dates
    console.log('3. Sample project_assignments with dates:');
    const assignments = await db('project_assignments')
      .select('*')
      .limit(5);
    
    assignments.forEach((a, idx) => {
      console.log(`   Assignment ${idx + 1}:`);
      console.log(`   - start_date: ${a.start_date}`);
      console.log(`   - end_date: ${a.end_date}`);
      console.log(`   - computed_start_date: ${a.computed_start_date}`);
      console.log(`   - computed_end_date: ${a.computed_end_date}`);
      console.log(`   - assignment_date_mode: ${a.assignment_date_mode}`);
      console.log();
    });

    // 4. Check how role requirements might be stored
    console.log('4. Looking for role requirement patterns:');
    
    // Check if there's a project_phases table
    const hasProjectPhases = tables.some(t => t.name === 'project_phases');
    if (hasProjectPhases) {
      console.log('   Found project_phases table');
      const phaseColumns = await db.raw(`PRAGMA table_info(project_phases)`);
      console.log('   Columns:', phaseColumns.map(c => c.name).join(', '));
      
      // Check for role-related columns
      const roleColumns = phaseColumns.filter(c => c.name.toLowerCase().includes('role'));
      if (roleColumns.length > 0) {
        console.log('   Role-related columns:', roleColumns.map(c => c.name).join(', '));
      }
    }
    console.log();

    // 5. Check project_phase_roles if it exists
    const hasProjectPhaseRoles = tables.some(t => t.name === 'project_phase_roles');
    if (hasProjectPhaseRoles) {
      console.log('5. Found project_phase_roles table:');
      const columns = await db.raw(`PRAGMA table_info(project_phase_roles)`);
      console.log('   Columns:', columns.map(c => c.name).join(', '));
      
      // Get sample data
      const sampleRoles = await db('project_phase_roles')
        .join('roles', 'project_phase_roles.role_id', 'roles.id')
        .select('project_phase_roles.*', 'roles.name as role_name')
        .limit(5);
      
      console.log('   Sample entries:');
      sampleRoles.forEach(r => {
        console.log(`   - Phase ${r.phase_id}: ${r.role_name} (${r.allocation_percentage}%)`);
      });
    }
    console.log();

    // 6. Check if recommendations might be phase-based
    console.log('6. Checking if assignments are phase-based:');
    const phaseAssignments = await db('project_assignments')
      .whereNotNull('phase_id')
      .count('* as count')
      .first();
    console.log(`   Assignments with phase_id: ${phaseAssignments.count}`);
    
    const totalAssignments = await db('project_assignments')
      .count('* as count')
      .first();
    console.log(`   Total assignments: ${totalAssignments.count}`);
    console.log();

    // 7. Look at the actual recommendation query endpoint
    console.log('7. Potential recommendation sources:');
    console.log('   Based on the structure, recommendations might come from:');
    console.log('   - project_phase_roles table (if exists)');
    console.log('   - Matching person roles with phase role requirements');
    console.log('   - Filtering by computed dates and availability');

  } catch (error) {
    console.error('Error during structure debugging:', error);
  } finally {
    await db.destroy();
  }
}

debugDatabaseStructure();
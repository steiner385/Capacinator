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

async function debugRecommendations() {
  try {
    console.log('=== DEBUGGING RECOMMENDATIONS FOR ALICE ===\n');

    // First check the people table schema
    const peopleSchema = await db.raw(`PRAGMA table_info(people)`);
    console.log('0. People table columns:', peopleSchema.map(c => c.name).join(', '));
    console.log();
    
    // 1. Get Alice's information and roles
    const alice = await db('people')
      .where('name', 'Alice Johnson')
      .first();
    
    console.log('1. Alice\'s basic info:');
    console.log('   ID:', alice.id);
    console.log('   Name:', alice.name);
    console.log('   Default Availability:', alice.default_availability_percentage || 'NOT FOUND');
    console.log('   All fields:', Object.keys(alice).join(', '));
    console.log();

    // First check the schema of person_roles
    const personRolesSchema = await db.raw(`PRAGMA table_info(person_roles)`);
    console.log('   person_roles columns:', personRolesSchema.map(c => c.name).join(', '));
    
    // Get Alice's roles
    const aliceRoles = await db('person_roles')
      .join('roles', 'person_roles.role_id', 'roles.id')
      .where('person_roles.person_id', alice.id)
      .select('roles.name', 'roles.id');
    
    console.log('2. Alice\'s roles:');
    aliceRoles.forEach(role => {
      console.log(`   - ${role.name}`);
    });
    console.log();

    // 3. Check project_assignments table structure
    console.log('3. Checking project_assignments table structure:');
    const columns = await db.raw(`PRAGMA table_info(project_assignments)`);
    console.log('   Columns:', columns.map(c => c.name).join(', '));
    console.log();

    // 4. Get Alice's existing assignments
    const aliceAssignments = await db('project_assignments')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .where('project_assignments.person_id', alice.id)
      .select(
        'projects.name as project_name',
        'project_assignments.role_id',
        'project_assignments.allocation_percentage',
        'project_assignments.start_date',
        'project_assignments.end_date'
      );
    
    console.log('4. Alice\'s existing assignments:');
    if (aliceAssignments.length === 0) {
      console.log('   No existing assignments found');
    } else {
      aliceAssignments.forEach(assignment => {
        console.log(`   - Project: ${assignment.project_name}`);
        console.log(`     Allocation: ${assignment.allocation_percentage}%`);
        console.log(`     Period: ${assignment.start_date} to ${assignment.end_date}`);
      });
    }
    console.log();

    // 5. Check projects table structure for required_roles
    console.log('5. Checking projects table for required_roles field:');
    const projectColumns = await db.raw(`PRAGMA table_info(projects)`);
    const roleColumns = projectColumns.filter(col => col.name.toLowerCase().includes('role'));
    
    if (roleColumns.length === 0) {
      console.log('   No role-related columns found in projects table');
      console.log('   All project columns:', projectColumns.map(c => c.name).join(', '));
    } else {
      roleColumns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });
    }
    console.log();

    // 6. Get first few projects with their data
    console.log('6. First 5 projects (checking for role requirements):');
    const projects = await db('projects')
      .select('*')
      .limit(5);
    
    for (const project of projects) {
      console.log(`   Project: ${project.name}`);
      console.log(`   - ID: ${project.id}`);
      console.log(`   - Status: ${project.status}`);
      console.log(`   - Budget: ${project.budget}`);
      
      // Check if there's a required_roles field
      if (project.required_roles) {
        console.log(`   - Required roles: ${JSON.stringify(project.required_roles)}`);
      } else {
        console.log('   - Required roles: NOT FOUND IN PROJECT');
      }
      
      // Check project_roles table for this project
      const projectRoles = await db('project_roles')
        .join('roles', 'project_roles.role_id', 'roles.id')
        .where('project_roles.project_id', project.id)
        .select('roles.name', 'project_roles.required_level', 'project_roles.allocation_percentage');
      
      if (projectRoles.length > 0) {
        console.log('   - Roles from project_roles table:');
        projectRoles.forEach(pr => {
          console.log(`     * ${pr.name} (Level: ${pr.required_level}, Allocation: ${pr.allocation_percentage}%)`);
        });
      } else {
        console.log('   - No roles found in project_roles table');
      }
      console.log();
    }

    // 7. Test the recommendation query logic
    console.log('7. Testing recommendation query logic:');
    
    // First, let's see what the actual recommendation query might look like
    const potentialProjects = await db('projects as p')
      .join('project_roles as pr', 'p.id', 'pr.project_id')
      .join('roles as r', 'pr.role_id', 'r.id')
      .whereIn('r.name', aliceRoles.map(r => r.name))
      .where('p.status', 'active')
      .select(
        'p.id',
        'p.name',
        'p.status',
        'r.name as role_name',
        'pr.required_level',
        'pr.allocation_percentage'
      )
      .limit(10);
    
    console.log('   Potential projects based on Alice\'s roles:');
    if (potentialProjects.length === 0) {
      console.log('   No matching projects found!');
    } else {
      potentialProjects.forEach(p => {
        console.log(`   - ${p.name} (Role: ${p.role_name}, Required Level: ${p.required_level})`);
      });
    }
    console.log();

    // 8. Check for the is_active issue in assignments
    console.log('8. Checking for is_active column issue:');
    try {
      const testQuery = await db('project_assignments')
        .where('is_active', true)
        .limit(1);
      console.log('   is_active column exists and query succeeded');
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('is_active')) {
        console.log('   ERROR: is_active column does not exist in project_assignments!');
        console.log('   This is likely causing the recommendation query to fail.');
      } else {
        console.log('   Unexpected error:', error.message);
      }
    }

    // 9. Check project_roles table structure
    console.log('\n9. Checking project_roles table structure:');
    try {
      const projectRolesInfo = await db.raw(`PRAGMA table_info(project_roles)`);
      console.log('   Columns:', projectRolesInfo.map(c => c.name).join(', '));
      
      // Count entries
      const count = await db('project_roles').count('* as count').first();
      console.log(`   Total entries: ${count.count}`);
    } catch (error) {
      console.log('   ERROR: project_roles table may not exist:', error.message);
    }
    
    // 10. Check actual availability calculation
    console.log('\n10. Alice\'s availability calculation:');
    const currentDate = new Date().toISOString().split('T')[0];
    
    const activeAssignments = await db('project_assignments')
      .where('person_id', alice.id)
      .where('start_date', '<=', currentDate)
      .where('end_date', '>=', currentDate)
      .select('allocation_percentage');
    
    const totalAllocation = activeAssignments.reduce((sum, a) => sum + a.allocation_percentage, 0);
    const baseAvailability = alice.default_availability_percentage || 100; // Default to 100% if not found
    const availableCapacity = baseAvailability - totalAllocation;
    
    console.log(`   Base availability: ${baseAvailability}%`);
    console.log(`   Current allocations: ${totalAllocation}%`);
    console.log(`   Available capacity: ${availableCapacity}%`);

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    await db.destroy();
  }
}

debugRecommendations();
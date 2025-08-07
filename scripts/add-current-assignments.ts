#!/usr/bin/env tsx

import { db as knex } from '../src/server/database/index.js';
import { v4 as uuidv4 } from 'uuid';

async function addCurrentAssignments() {
  console.log('🚀 Adding current assignment data for realistic utilization...');

  try {
    // Get current projects that overlap with 2025-08-07 to 2025-11-07 timeframe
    const currentProjects = await knex('projects')
      .join('project_phases_timeline', 'projects.id', 'project_phases_timeline.project_id')
      .select(
        'projects.id as project_id',
        'projects.name as project_name',
        'project_phases_timeline.phase_id',
        'project_phases_timeline.start_date',
        'project_phases_timeline.end_date'
      )
      .where('project_phases_timeline.start_date', '<=', '2025-11-07')
      .where('project_phases_timeline.end_date', '>=', '2025-08-07')
      .orderBy('projects.name');

    console.log(`📊 Found ${currentProjects.length} project phases in current timeframe`);

    // Get all active people
    const people = await knex('people')
      .join('person_roles', 'people.primary_person_role_id', 'person_roles.id')
      .join('roles', 'person_roles.role_id', 'roles.id')
      .select(
        'people.id as person_id',
        'people.name as person_name',
        'roles.id as role_id',
        'roles.name as role_name'
      )
      .where('people.is_active', true);

    console.log(`👥 Found ${people.length} active people`);

    // Clear existing project_assignments to avoid duplicates
    await knex('project_assignments').del();
    console.log('🧹 Cleared existing assignments');

    const assignments = [];
    let assignmentCount = 0;

    // Create realistic assignments for current projects
    for (let i = 0; i < currentProjects.length && i < 15; i++) { // Limit to first 15 phases
      const project = currentProjects[i];
      
      // Assign 2-4 people per project phase
      const numAssignments = Math.min(2 + Math.floor(Math.random() * 3), people.length);
      const assignedPeople = [];
      
      for (let j = 0; j < numAssignments; j++) {
        // Pick a person not already assigned to this project
        let person;
        let attempts = 0;
        do {
          person = people[Math.floor(Math.random() * people.length)];
          attempts++;
        } while (assignedPeople.find(p => p.person_id === person.person_id) && attempts < 10);
        
        if (attempts >= 10) continue; // Skip if can't find unique person
        
        assignedPeople.push(person);

        // Calculate realistic allocation based on role and project phase
        let allocation = 30 + Math.floor(Math.random() * 40); // 30-70%
        
        // Adjust allocation based on role
        if (person.role_name === 'Project Manager') {
          allocation = 50 + Math.floor(Math.random() * 30); // 50-80% for PMs
        } else if (person.role_name.includes('Senior') || person.role_name.includes('Lead')) {
          allocation = 40 + Math.floor(Math.random() * 35); // 40-75% for seniors
        } else if (person.role_name === 'DevOps Engineer' || person.role_name === 'Data Scientist') {
          allocation = 60 + Math.floor(Math.random() * 25); // 60-85% for specialists
        }

        // Ensure we don't over-allocate (keep some buffer)
        const maxAllocation = Math.min(allocation, 85);

        assignments.push({
          id: uuidv4(),
          project_id: project.project_id,
          person_id: person.person_id,
          role_id: person.role_id,
          phase_id: project.phase_id,
          start_date: project.start_date,
          end_date: project.end_date,
          allocation_percentage: maxAllocation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        assignmentCount++;
      }
    }

    // Insert assignments in batches
    if (assignments.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        await knex('project_assignments').insert(batch);
      }
    }

    console.log('✅ Current assignment data added successfully!');
    console.log(`   👥 Created ${assignmentCount} assignments`);
    console.log(`   📅 Date range: 2025-08-07 to 2025-11-07`);
    console.log(`   🎯 Projects with assignments: ${new Set(assignments.map(a => a.project_id)).size}`);
    console.log(`   👨‍💼 People with assignments: ${new Set(assignments.map(a => a.person_id)).size}`);

    // Show sample assignments for verification
    console.log('\n📋 Sample assignments created:');
    const sampleAssignments = await knex('project_assignments')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .join('people', 'project_assignments.person_id', 'people.id')
      .join('roles', 'project_assignments.role_id', 'roles.id')
      .select(
        'projects.name as project_name',
        'people.name as person_name',
        'roles.name as role_name',
        'project_assignments.allocation_percentage',
        'project_assignments.start_date',
        'project_assignments.end_date'
      )
      .limit(10);

    sampleAssignments.forEach(assignment => {
      console.log(`   • ${assignment.person_name} (${assignment.role_name}) → ${assignment.project_name} (${assignment.allocation_percentage}%) [${assignment.start_date} to ${assignment.end_date}]`);
    });

    console.log('\n🎉 Utilization reports should now show meaningful data!');

  } catch (error) {
    console.error('❌ Error adding current assignments:', error);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

// Run the script
addCurrentAssignments();
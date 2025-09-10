#!/usr/bin/env tsx
import { db } from '../src/server/database/index.js';

async function initializeAllProjectAllocations() {
  console.log('🔄 Initializing allocations for all projects...\n');

  try {
    // Get all projects
    const projects = await db('projects').select('id', 'name');
    console.log(`Found ${projects.length} projects to initialize\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        // Check if project already has allocations
        const existingAllocations = await db('project_allocation_overrides')
          .where('project_id', project.id)
          .count('* as count')
          .first();

        if (existingAllocations && existingAllocations.count > 0) {
          console.log(`✅ ${project.name} - Already has ${existingAllocations.count} allocations`);
          successCount++;
          continue;
        }

        // Initialize allocations by calling the API endpoint
        const response = await fetch(`http://localhost:3120/api/project-allocations/${project.id}/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${project.name} - Created ${data.data.created_count} allocations`);
          successCount++;
        } else {
          console.error(`❌ ${project.name} - Failed with status ${response.status}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ ${project.name} - Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n✨ Initialization complete!`);
    console.log(`✅ Successfully initialized: ${successCount} projects`);
    console.log(`❌ Failed: ${errorCount} projects`);

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeAllProjectAllocations();
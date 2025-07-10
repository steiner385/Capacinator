import knex from 'knex';
import { faker } from '@faker-js/faker';
import path from 'path';

// Database connection
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, '../../data/capacitizer.db')
  },
  useNullAsDefault: true
});

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data in order
    console.log('🧹 Clearing existing data...');
    await db('project_planning_audit').del();
    await db('role_planning_audit').del();
    await db('availability_audit').del();
    await db('project_assignments').del();
    await db('person_availability_overrides').del();
    await db('standard_allocations').del();
    await db('project_phases_timeline').del();
    await db('projects').del();
    await db('person_roles').del();
    await db('people').del();
    await db('roles').del();
    await db('project_phases').del();
    await db('project_types').del();
    await db('locations').del();
    
    // 1. Locations
    console.log('📍 Creating locations...');
    const locations = [
      { id: faker.string.uuid(), name: 'New York', description: 'NYC Office' },
      { id: faker.string.uuid(), name: 'San Francisco', description: 'SF Office' },
      { id: faker.string.uuid(), name: 'London', description: 'UK Office' },
      { id: faker.string.uuid(), name: 'Remote', description: 'Work from anywhere' }
    ];
    await db('locations').insert(locations);
    
    // 2. Project Types
    console.log('📋 Creating project types...');
    const projectTypes = [
      { id: faker.string.uuid(), name: 'Web Application', description: 'Web-based applications' },
      { id: faker.string.uuid(), name: 'Mobile App', description: 'iOS/Android applications' },
      { id: faker.string.uuid(), name: 'Data Migration', description: 'Data migration projects' },
      { id: faker.string.uuid(), name: 'Infrastructure', description: 'Infrastructure and DevOps' }
    ];
    await db('project_types').insert(projectTypes);
    
    // 3. Phases
    console.log('🔄 Creating phases...');
    const phases = [
      { id: faker.string.uuid(), name: 'Planning', description: 'Initial planning', order_index: 1 },
      { id: faker.string.uuid(), name: 'Development', description: 'Development phase', order_index: 2 },
      { id: faker.string.uuid(), name: 'Testing', description: 'Testing phase', order_index: 3 },
      { id: faker.string.uuid(), name: 'Deployment', description: 'Deployment phase', order_index: 4 }
    ];
    await db('project_phases').insert(phases);
    
    // 4. Roles
    console.log('👥 Creating roles...');
    const roles = [
      { id: faker.string.uuid(), name: 'Project Manager', description: 'Manages projects' },
      { id: faker.string.uuid(), name: 'Developer', description: 'Software developer' },
      { id: faker.string.uuid(), name: 'QA Engineer', description: 'Quality assurance' },
      { id: faker.string.uuid(), name: 'Business Analyst', description: 'Business analysis' }
    ];
    await db('roles').insert(roles);
    
    // 5. People
    console.log('👤 Creating people...');
    const people = [];
    const names = [
      'John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams',
      'David Brown', 'Lisa Davis', 'Tom Wilson', 'Amy Taylor',
      'Chris Anderson', 'Emily Thomas', 'James Martin', 'Jessica White'
    ];
    
    for (let i = 0; i < names.length; i++) {
      const [firstName, lastName] = names[i].split(' ');
      people.push({
        id: faker.string.uuid(),
        name: names[i],
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        primary_role_id: faker.helpers.arrayElement(roles).id,
        worker_type: faker.helpers.arrayElement(['FTE', 'Contractor']),
        supervisor_id: null,
        default_availability_percentage: 100,
        default_hours_per_day: 8
      });
    }
    
    // Set some supervisors
    for (let i = 4; i < people.length; i++) {
      people[i].supervisor_id = faker.helpers.arrayElement(people.slice(0, 4)).id;
    }
    
    await db('people').insert(people);
    
    // 6. Person Roles
    console.log('🔗 Assigning additional roles...');
    const personRoles = [];
    const assignedRoles = new Set(); // Track to avoid duplicates
    
    // Give some people secondary roles
    for (let i = 0; i < 5; i++) {
      const person = faker.helpers.arrayElement(people);
      const availableRoles = roles.filter(r => r.id !== person.primary_role_id);
      if (availableRoles.length > 0) {
        const role = faker.helpers.arrayElement(availableRoles);
        const key = `${person.id}-${role.id}`;
        
        if (!assignedRoles.has(key)) {
          assignedRoles.add(key);
          personRoles.push({
            id: faker.string.uuid(),
            person_id: person.id,
            role_id: role.id,
            is_primary: false
          });
        }
      }
    }
    if (personRoles.length > 0) {
      await db('person_roles').insert(personRoles);
    }
    
    // 7. Projects
    console.log('🚀 Creating projects...');
    const projects = [];
    const projectNames = [
      'Customer Portal Redesign',
      'Mobile Banking App',
      'Data Warehouse Migration',
      'Cloud Infrastructure Setup',
      'E-commerce Platform',
      'Analytics Dashboard'
    ];
    
    for (let i = 0; i < projectNames.length; i++) {
      const startDate = faker.date.between({ 
        from: new Date('2025-01-01'), 
        to: new Date('2025-06-01') 
      });
      
      projects.push({
        id: faker.string.uuid(),
        name: projectNames[i],
        project_type_id: faker.helpers.arrayElement(projectTypes).id,
        location_id: faker.helpers.arrayElement(locations).id,
        owner_id: faker.helpers.arrayElement(people).id,
        priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
        description: faker.lorem.paragraph(),
        data_restrictions: null,
        include_in_demand: true,
        aspiration_start: startDate,
        aspiration_finish: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
        external_id: `PRJ-${1000 + i}`
      });
    }
    await db('projects').insert(projects);
    
    // 8. Project Phases Timeline
    console.log('📅 Creating project phase timelines...');
    const phaseTimelines = [];
    for (const project of projects) {
      let currentDate = new Date(project.aspiration_start);
      
      for (const phase of phases) {
        const duration = faker.number.int({ min: 14, max: 21 }); // 2-3 weeks
        const endDate = new Date(currentDate.getTime() + duration * 24 * 60 * 60 * 1000);
        
        phaseTimelines.push({
          id: faker.string.uuid(),
          project_id: project.id,
          phase_id: phase.id,
          start_date: currentDate,
          end_date: endDate
        });
        
        currentDate = endDate;
      }
    }
    await db('project_phases_timeline').insert(phaseTimelines);
    
    // 9. Standard Allocations
    console.log('📊 Creating standard allocations...');
    const allocations = [];
    for (const projectType of projectTypes) {
      for (const phase of phases) {
        for (const role of roles) {
          if (Math.random() > 0.4) { // 60% chance
            allocations.push({
              id: faker.string.uuid(),
              project_type_id: projectType.id,
              phase_id: phase.id,
              role_id: role.id,
              allocation_percentage: faker.number.int({ min: 50, max: 100 })
            });
          }
        }
      }
    }
    await db('standard_allocations').insert(allocations);
    
    // 10. Project Assignments
    console.log('🤝 Creating project assignments...');
    const assignments = [];
    for (const project of projects) {
      // Assign 3-5 people per project
      const teamSize = faker.number.int({ min: 3, max: 5 });
      const team = faker.helpers.arrayElements(people, teamSize);
      
      for (const person of team) {
        // Get a random phase or null
        const phase = Math.random() > 0.5 ? faker.helpers.arrayElement(phases) : null;
        
        assignments.push({
          id: faker.string.uuid(),
          project_id: project.id,
          person_id: person.id,
          role_id: person.primary_role_id,
          phase_id: phase ? phase.id : null,
          start_date: project.aspiration_start,
          end_date: project.aspiration_finish,
          allocation_percentage: faker.helpers.arrayElement([50, 75, 100])
        });
      }
    }
    await db('project_assignments').insert(assignments);
    
    // 11. Availability Overrides
    console.log('🏖️ Creating availability overrides...');
    const overrides = [];
    const samplePeople = faker.helpers.arrayElements(people, 4);
    
    for (const person of samplePeople) {
      const startDate = faker.date.between({
        from: new Date('2025-02-01'),
        to: new Date('2025-04-01')
      });
      const duration = faker.number.int({ min: 3, max: 10 });
      
      overrides.push({
        id: faker.string.uuid(),
        person_id: person.id,
        start_date: startDate,
        end_date: new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000),
        availability_percentage: 0,
        hours_per_day: 0,
        override_type: faker.helpers.arrayElement(['VACATION', 'TRAINING', 'SICK_LEAVE']),
        reason: faker.helpers.arrayElement(['Vacation', 'Training', 'Medical leave']),
        is_approved: true,
        approved_by: faker.helpers.arrayElement(people).id,
        approved_at: new Date(),
        created_by: faker.helpers.arrayElement(people).id
      });
    }
    await db('person_availability_overrides').insert(overrides);
    
    // Summary
    console.log('\n✅ Database seeded successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - Locations: ${locations.length}`);
    console.log(`  - Project Types: ${projectTypes.length}`);
    console.log(`  - Phases: ${phases.length}`);
    console.log(`  - Roles: ${roles.length}`);
    console.log(`  - People: ${people.length}`);
    console.log(`  - Projects: ${projects.length}`);
    console.log(`  - Assignments: ${assignments.length}`);
    console.log(`  - Phase Timelines: ${phaseTimelines.length}`);
    console.log(`  - Allocations: ${allocations.length}`);
    console.log(`  - Availability Overrides: ${overrides.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run seeding
seedDatabase().catch(console.error);
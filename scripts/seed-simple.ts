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
    console.log('🌱 Starting simple database seeding...');
    
    // Clear existing data
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
    await db('role_planners').del();
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
      { id: faker.string.uuid(), name: 'Remote', description: 'Work from anywhere' },
      { id: faker.string.uuid(), name: 'Toronto', description: 'Canada Office' }
    ];
    await db('locations').insert(locations);
    
    // 2. Project Types
    console.log('📋 Creating project types...');
    const projectTypes = [
      { id: faker.string.uuid(), name: 'Web Application', description: 'Web-based applications' },
      { id: faker.string.uuid(), name: 'Mobile App', description: 'iOS/Android applications' },
      { id: faker.string.uuid(), name: 'Data Migration', description: 'Data migration projects' },
      { id: faker.string.uuid(), name: 'Infrastructure', description: 'Infrastructure and DevOps' },
      { id: faker.string.uuid(), name: 'AI/ML Project', description: 'Machine learning initiatives' }
    ];
    await db('project_types').insert(projectTypes);
    
    // 3. Phases
    console.log('🔄 Creating phases...');
    const phases = [
      { id: faker.string.uuid(), name: 'Planning', description: 'Initial planning', order_index: 1 },
      { id: faker.string.uuid(), name: 'Design', description: 'Design phase', order_index: 2 },
      { id: faker.string.uuid(), name: 'Development', description: 'Development phase', order_index: 3 },
      { id: faker.string.uuid(), name: 'Testing', description: 'Testing phase', order_index: 4 },
      { id: faker.string.uuid(), name: 'Deployment', description: 'Deployment phase', order_index: 5 },
      { id: faker.string.uuid(), name: 'Support', description: 'Post-launch support', order_index: 6 }
    ];
    await db('project_phases').insert(phases);
    
    // 4. Roles
    console.log('👥 Creating roles...');
    const roles = [
      { 
        id: faker.string.uuid(), 
        name: 'Project Manager', 
        description: 'Manages projects',
        external_id: 'PM'
      },
      { 
        id: faker.string.uuid(), 
        name: 'Senior Developer', 
        description: 'Senior software developer',
        external_id: 'SD'
      },
      { 
        id: faker.string.uuid(), 
        name: 'Developer', 
        description: 'Software developer',
        external_id: 'DEV'
      },
      { 
        id: faker.string.uuid(), 
        name: 'QA Engineer', 
        description: 'Quality assurance engineer',
        external_id: 'QA'
      },
      { 
        id: faker.string.uuid(), 
        name: 'Business Analyst', 
        description: 'Business analyst',
        external_id: 'BA'
      }
    ];
    await db('roles').insert(roles);
    
    // 5. People
    console.log('👤 Creating people...');
    const people = [];
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Amy', 'Chris', 'Emily'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    for (let i = 0; i < 20; i++) {
      const firstName = faker.helpers.arrayElement(firstNames);
      const lastName = faker.helpers.arrayElement(lastNames);
      people.push({
        id: faker.string.uuid(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
        first_name: firstName,
        last_name: lastName,
        employee_id: `EMP${1000 + i}`,
        location_id: faker.helpers.arrayElement(locations).id,
        is_active: true
      });
    }
    await db('people').insert(people);
    
    // 6. Person Roles
    console.log('🔗 Assigning roles to people...');
    const personRoles = [];
    for (const person of people) {
      personRoles.push({
        id: faker.string.uuid(),
        person_id: person.id,
        role_id: faker.helpers.arrayElement(roles).id,
        is_primary: true
      });
    }
    await db('person_roles').insert(personRoles);
    
    // 7. Projects
    console.log('🚀 Creating projects...');
    const projects = [];
    const projectNames = [
      'Customer Portal Redesign',
      'Mobile Banking App',
      'Data Warehouse Migration',
      'Cloud Infrastructure Setup',
      'AI Recommendation Engine',
      'E-commerce Platform',
      'HR Management System',
      'Supply Chain Optimization',
      'Analytics Dashboard',
      'Security Audit Tool'
    ];
    
    for (let i = 0; i < 10; i++) {
      const startDate = faker.date.between({ 
        from: new Date('2025-01-01'), 
        to: new Date('2025-12-31') 
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
        aspiration_finish: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days later
        external_id: `PRJ-${2025}${String(i + 1).padStart(3, '0')}`
      });
    }
    await db('projects').insert(projects);
    
    // 8. Project Phases Timeline
    console.log('📅 Creating project phase timelines...');
    const phaseTimelines = [];
    for (const project of projects) { // Include all projects
      let currentDate = new Date(project.start_date);
      
      for (const phase of phases.slice(0, 4)) { // First 4 phases for active projects
        const duration = faker.number.int({ min: 14, max: 30 }); // 2-4 weeks
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
          if (Math.random() > 0.3) { // 70% chance of allocation
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
    for (const project of projects) { // Include all projects
      // Assign 3-5 people per project
      const teamSize = faker.number.int({ min: 3, max: 5 });
      const team = faker.helpers.arrayElements(people, teamSize);
      
      for (const person of team) {
        const personRole = personRoles.find(pr => pr.person_id === person.id);
        
        assignments.push({
          id: faker.string.uuid(),
          project_id: project.id,
          person_id: person.id,
          role_id: personRole.role_id,
          phase_id: null, // Can be null according to schema
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
    const samplePeople = faker.helpers.arrayElements(people, 5);
    
    for (const person of samplePeople) {
      const startDate = faker.date.future();
      const duration = faker.number.int({ min: 1, max: 14 });
      
      overrides.push({
        id: faker.string.uuid(),
        person_id: person.id,
        start_date: startDate,
        end_date: new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000),
        availability_percentage: 0,
        hours_per_day: 0,
        override_type: faker.helpers.arrayElement(['PTO', 'TRAINING', 'SICK']),
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
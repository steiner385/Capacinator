import knex from 'knex';
import { faker } from '@faker-js/faker';
import path from 'path';

// Create a database connection for production/dev deployment
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, '../../data/capacitizer.db')
  },
  useNullAsDefault: true
});

// Fiscal week helpers
function getFiscalWeek(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  const fiscalYear = date.getFullYear() % 100;
  return `${fiscalYear}FW${weekNumber.toString().padStart(2, '0')}`;
}

function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
}

// Sample data generators
const locations = [
  'New York', 'San Francisco', 'London', 'Tokyo', 'Singapore', 
  'Toronto', 'Sydney', 'Berlin', 'Mumbai', 'São Paulo',
  'Remote', 'Hybrid-NYC', 'Hybrid-SF', 'Hybrid-London'
];

const projectTypes = [
  { name: 'Web Application', code: 'WEB', complexity: 'medium' },
  { name: 'Mobile App', code: 'MOB', complexity: 'high' },
  { name: 'Data Pipeline', code: 'DATA', complexity: 'high' },
  { name: 'Infrastructure', code: 'INFRA', complexity: 'medium' },
  { name: 'AI/ML Project', code: 'AI', complexity: 'very_high' },
  { name: 'Integration', code: 'INT', complexity: 'medium' },
  { name: 'Migration', code: 'MIG', complexity: 'high' },
  { name: 'Security Audit', code: 'SEC', complexity: 'medium' },
  { name: 'POC/Prototype', code: 'POC', complexity: 'low' },
  { name: 'Support & Maintenance', code: 'SUP', complexity: 'low' }
];

const phases = [
  { name: 'Pending', code: 'PEND', order_index: 1 },
  { name: 'Business Planning', code: 'BP', order_index: 2 },
  { name: 'Development', code: 'DEV', order_index: 3 },
  { name: 'System Integration Testing', code: 'SIT', order_index: 4 },
  { name: 'Validation', code: 'VAL', order_index: 5 },
  { name: 'User Acceptance Testing', code: 'UAT', order_index: 6 },
  { name: 'Cutover', code: 'CUT', order_index: 7 },
  { name: 'Hypercare', code: 'HC', order_index: 8 },
  { name: 'Support', code: 'SUP', order_index: 9 }
];

const roles = [
  { name: 'Project Manager', code: 'PM', is_resource_role: true },
  { name: 'Tech Lead', code: 'TL', is_resource_role: true },
  { name: 'Senior Developer', code: 'SD', is_resource_role: true },
  { name: 'Developer', code: 'DEV', is_resource_role: true },
  { name: 'Junior Developer', code: 'JD', is_resource_role: true },
  { name: 'Business Analyst', code: 'BA', is_resource_role: true },
  { name: 'QA Engineer', code: 'QA', is_resource_role: true },
  { name: 'DevOps Engineer', code: 'DO', is_resource_role: true },
  { name: 'Data Engineer', code: 'DE', is_resource_role: true },
  { name: 'UI/UX Designer', code: 'UX', is_resource_role: true },
  { name: 'Scrum Master', code: 'SM', is_resource_role: true },
  { name: 'Product Owner', code: 'PO', is_resource_role: true },
  { name: 'Director', code: 'DIR', is_resource_role: false },
  { name: 'VP Engineering', code: 'VP', is_resource_role: false }
];

const skills = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 
  'AWS', 'Azure', 'Docker', 'Kubernetes', 'SQL', 'NoSQL', 
  'Agile', 'Scrum', 'CI/CD', 'Git', 'REST API', 'GraphQL',
  'Machine Learning', 'Data Analysis', 'Security', 'Testing'
];

const clients = [
  'Acme Corp', 'Global Finance Inc', 'Tech Innovations Ltd', 
  'Healthcare Solutions', 'Retail Giant Co', 'Energy Systems',
  'Education Platform', 'Media Entertainment', 'Logistics Pro',
  'Banking Services'
];

async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in reverse order of dependencies
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
  
  console.log('✅ Existing data cleared');
}

async function seedLocations() {
  console.log('📍 Creating locations...');
  
  const locationData = locations.map(name => ({
    id: faker.string.uuid(),
    name,
    description: name === 'Remote' ? 'Work from anywhere' : `Office location in ${name}`
  }));
  
  await db('locations').insert(locationData);
  console.log(`✅ Created ${locationData.length} locations`);
  return locationData;
}

async function seedProjectTypes() {
  console.log('📋 Creating project types...');
  
  const projectTypeData = projectTypes.map(pt => ({
    id: faker.string.uuid(),
    name: pt.name,
    description: faker.lorem.sentence()
  }));
  
  await db('project_types').insert(projectTypeData);
  console.log(`✅ Created ${projectTypeData.length} project types`);
  return projectTypeData;
}

async function seedPhases() {
  console.log('🔄 Creating phases...');
  
  const phaseData = phases.map(phase => ({
    id: faker.string.uuid(),
    name: phase.name,
    code: phase.code,
    description: faker.lorem.sentence(),
    order_index: phase.order_index
  }));
  
  await db('project_phases').insert(phaseData);
  console.log(`✅ Created ${phaseData.length} phases`);
  return phaseData;
}

async function seedRoles() {
  console.log('👥 Creating roles...');
  
  const roleData = roles.map(role => ({
    id: faker.string.uuid(),
    name: role.name,
    code: role.code,
    description: faker.lorem.sentence(),
    is_assignable: role.is_resource_role,
    default_allocation_percentage: role.is_resource_role ? 100 : 0,
    is_plan_owner: role.code === 'DIR' || role.code === 'VP',
    has_cw_access: role.is_resource_role,
    has_data_access: true
  }));
  
  await db('roles').insert(roleData);
  
  // Add role planners for manager roles
  const managerRoles = roleData.filter(r => ['PM', 'TL', 'DIR', 'VP'].includes(r.code));
  const plannerData = [];
  
  for (const role of managerRoles) {
    // Each manager can plan for 2-3 other roles
    const plannableRoles = faker.helpers.arrayElements(
      roleData.filter(r => r.is_resource_role && r.id !== role.id),
      faker.number.int({ min: 2, max: 3 })
    );
    
    for (const plannableRole of plannableRoles) {
      plannerData.push({
        id: faker.string.uuid(),
        role_id: role.id,
        can_plan_for_role_id: plannableRole.id
      });
    }
  }
  
  if (plannerData.length > 0) {
    await db('role_planners').insert(plannerData);
  }
  
  console.log(`✅ Created ${roleData.length} roles and ${plannerData.length} role planner relationships`);
  return roleData;
}

async function seedPeople(locationData: any[], roleData: any[]) {
  console.log('👤 Creating people...');
  
  const peopleData = [];
  const personRolesData = [];
  
  // Create 50-80 people
  const peopleCount = faker.number.int({ min: 50, max: 80 });
  
  for (let i = 0; i < peopleCount; i++) {
    const person = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      employee_id: `EMP${faker.number.int({ min: 1000, max: 9999 })}`,
      location_id: faker.helpers.arrayElement(locationData).id,
      is_active: faker.datatype.boolean({ probability: 0.95 })
    };
    
    peopleData.push(person);
    
    // Assign 1-2 roles to each person
    const personRoles = faker.helpers.arrayElements(
      roleData.filter(r => r.is_assignable),
      faker.number.int({ min: 1, max: 2 })
    );
    
    for (let j = 0; j < personRoles.length; j++) {
      personRolesData.push({
        id: faker.string.uuid(),
        person_id: person.id,
        role_id: personRoles[j].id,
        is_primary: j === 0
      });
    }
  }
  
  // Add some managers
  const managerRoles = roleData.filter(r => ['DIR', 'VP'].includes(r.code));
  for (const role of managerRoles) {
    const manager = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      employee_id: `MGR${faker.number.int({ min: 100, max: 999 })}`,
      location_id: faker.helpers.arrayElement(locationData).id,
      is_active: true
    };
    
    peopleData.push(manager);
    
    personRolesData.push({
      id: faker.string.uuid(),
      person_id: manager.id,
      role_id: role.id,
      is_primary: true
    });
  }
  
  await db('people').insert(peopleData);
  await db('person_roles').insert(personRolesData);
  
  console.log(`✅ Created ${peopleData.length} people with ${personRolesData.length} role assignments`);
  return { peopleData, personRolesData };
}

async function seedProjects(locationData: any[], projectTypeData: any[], phaseData: any[], peopleData: any[]) {
  console.log('🚀 Creating projects...');
  
  const projectData = [];
  const phaseTimelineData = [];
  
  // Create 15-25 projects
  const projectCount = faker.number.int({ min: 15, max: 25 });
  const currentDate = new Date();
  
  for (let i = 0; i < projectCount; i++) {
    const projectType = faker.helpers.arrayElement(projectTypeData);
    const startDate = faker.date.between({ 
      from: addWeeks(currentDate, -12), 
      to: addWeeks(currentDate, 12) 
    });
    
    const project = {
      id: faker.string.uuid(),
      name: `${faker.company.catchPhrase()} - ${projectType.name}`,
      code: `PRJ-${faker.number.int({ min: 1000, max: 9999 })}`,
      project_type_id: projectType.id,
      location_id: faker.helpers.arrayElement(locationData).id,
      owner_id: faker.helpers.arrayElement(peopleData).id,
      client_name: faker.helpers.arrayElement(clients),
      status: faker.helpers.arrayElement(['draft', 'active', 'completed', 'on_hold', 'cancelled']),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      start_date: startDate,
      target_end_date: addWeeks(startDate, faker.number.int({ min: 8, max: 52 })),
      actual_end_date: null,
      description: faker.lorem.paragraph(),
      notes: faker.lorem.sentence()
    };
    
    projectData.push(project);
    
    // Create phase timelines for active projects
    if (['active'].includes(project.status)) {
      let phaseStartDate = new Date(project.start_date);
      const phasesToUse = faker.helpers.arrayElements(phaseData, faker.number.int({ min: 3, max: 7 }));
      
      // Sort phases by order_index
      phasesToUse.sort((a, b) => a.order_index - b.order_index);
      
      for (const phase of phasesToUse) {
        const phaseDuration = faker.number.int({ min: 2, max: 8 });
        const phaseEndDate = addWeeks(phaseStartDate, phaseDuration);
        
        phaseTimelineData.push({
          id: faker.string.uuid(),
          project_id: project.id,
          phase_id: phase.id,
          start_date: phaseStartDate,
          end_date: phaseEndDate,
          actual_start_date: phaseStartDate < currentDate ? phaseStartDate : null,
          actual_end_date: phaseEndDate < currentDate ? phaseEndDate : null
        });
        
        phaseStartDate = phaseEndDate;
      }
    }
  }
  
  await db('projects').insert(projectData);
  if (phaseTimelineData.length > 0) {
    await db('project_phases_timeline').insert(phaseTimelineData);
  }
  
  console.log(`✅ Created ${projectData.length} projects with ${phaseTimelineData.length} phase timelines`);
  return { projectData, phaseTimelineData };
}

async function seedStandardAllocations(projectTypeData: any[], phaseData: any[], roleData: any[]) {
  console.log('📊 Creating standard allocations...');
  
  const standardAllocationData = [];
  const resourceRoles = roleData.filter(r => r.is_assignable);
  
  for (const projectType of projectTypeData) {
    for (const phase of phaseData) {
      // Different project types need different roles
      const rolesNeeded = faker.number.int({ min: 3, max: 6 });
      const selectedRoles = faker.helpers.arrayElements(resourceRoles, rolesNeeded);
      
      for (const role of selectedRoles) {
        // Allocation varies by phase
        let allocationHours = 0;
        
        if (phase.code === 'BP') {
          allocationHours = ['PM', 'BA'].includes(role.code) ? 
            faker.number.int({ min: 20, max: 40 }) : 
            faker.number.int({ min: 5, max: 15 });
        } else if (['DEV', 'SIT'].includes(phase.code)) {
          allocationHours = ['DEV', 'SD', 'TL'].includes(role.code) ? 
            faker.number.int({ min: 30, max: 40 }) : 
            faker.number.int({ min: 10, max: 25 });
        } else if (['UAT', 'VAL'].includes(phase.code)) {
          allocationHours = ['QA', 'BA'].includes(role.code) ? 
            faker.number.int({ min: 25, max: 40 }) : 
            faker.number.int({ min: 10, max: 20 });
        } else {
          allocationHours = faker.number.int({ min: 5, max: 20 });
        }
        
        standardAllocationData.push({
          id: faker.string.uuid(),
          project_type_id: projectType.id,
          phase_id: phase.id,
          role_id: role.id,
          allocation_hours: allocationHours,
          notes: faker.lorem.sentence()
        });
      }
    }
  }
  
  await db('standard_allocations').insert(standardAllocationData);
  console.log(`✅ Created ${standardAllocationData.length} standard allocations`);
  return standardAllocationData;
}

async function seedAssignments(projectData: any[], peopleData: any[], personRolesData: any[], phaseTimelineData: any[]) {
  console.log('📅 Creating assignments...');
  
  const assignmentData = [];
  const activeProjects = projectData.filter((p: any) => ['active'].includes(p.status));
  
  for (const project of activeProjects) {
    // Get project phases
    const projectPhases = phaseTimelineData.filter((pt: any) => pt.project_id === project.id);
    
    // Assign 3-10 people per project
    const teamSize = faker.number.int({ min: 3, max: 10 });
    const availablePeople = peopleData.filter((p: any) => p.is_active);
    const team = faker.helpers.arrayElements(availablePeople, teamSize);
    
    for (const person of team) {
      // Get person's role
      const personRole = personRolesData.find((pr: any) => pr.person_id === person.id && pr.is_primary);
      if (!personRole) continue;
      
      // Determine assignment period (might not cover entire project)
      const assignmentStart = faker.date.between({
        from: project.start_date,
        to: addWeeks(new Date(project.start_date), 4)
      });
      
      const assignmentEnd = faker.date.between({
        from: addWeeks(assignmentStart, 4),
        to: project.end_date
      });
      
      assignmentData.push({
        id: faker.string.uuid(),
        project_id: project.id,
        person_id: person.id,
        role_id: personRole.role_id,
        start_date: assignmentStart,
        end_date: assignmentEnd,
        allocation_percentage: faker.helpers.arrayElement([25, 50, 75, 100]),
        is_billable: faker.datatype.boolean({ probability: 0.8 }),
        notes: faker.lorem.sentence(),
        created_by: faker.helpers.arrayElement(peopleData.filter((p: any) => p.is_active)).id,
        created_at: faker.date.recent({ days: 30 })
      });
    }
  }
  
  await db('project_assignments').insert(assignmentData);
  console.log(`✅ Created ${assignmentData.length} assignments`);
  return assignmentData;
}

async function seedAvailabilityOverrides(peopleData: any[]) {
  console.log('🏖️ Creating availability overrides...');
  
  const availabilityData = [];
  const currentDate = new Date();
  
  // Create PTO/leave for 20-30% of people
  const peopleWithOverrides = faker.helpers.arrayElements(
    peopleData.filter((p: any) => p.is_active),
    Math.floor(peopleData.length * 0.25)
  );
  
  for (const person of peopleWithOverrides) {
    // Each person might have 1-3 overrides in the next 6 months
    const overrideCount = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < overrideCount; i++) {
      const startDate = faker.date.between({
        from: currentDate,
        to: addWeeks(currentDate, 26)
      });
      
      const duration = faker.number.int({ min: 1, max: 14 }); // 1-14 days
      const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
      
      availabilityData.push({
        id: faker.string.uuid(),
        person_id: person.id,
        start_date: startDate,
        end_date: endDate,
        override_type: faker.helpers.arrayElement(['PTO', 'TRAINING', 'SICK', 'OTHER']),
        availability_hours: faker.helpers.arrayElement([0, 0, 0, 20]), // Mostly 0, sometimes 20h/week
        notes: faker.helpers.arrayElement([
          'Vacation',
          'Personal Time Off',
          'Training - AWS Certification',
          'Conference - React Summit',
          'Medical Leave',
          'Parental Leave',
          'Company Holiday'
        ]),
        approved_by: faker.helpers.arrayElement(peopleData).id,
        approved_date: faker.date.recent({ days: 30 })
      });
    }
  }
  
  await db('person_availability_overrides').insert(availabilityData);
  console.log(`✅ Created ${availabilityData.length} availability overrides`);
  return availabilityData;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log('================================');
    
    // Clear existing data
    await clearExistingData();
    
    // Seed master data
    const locationData = await seedLocations();
    const projectTypeData = await seedProjectTypes();
    const phaseData = await seedPhases();
    const roleData = await seedRoles();
    
    // Seed people
    const { peopleData, personRolesData } = await seedPeople(locationData, roleData);
    
    // Seed projects and related data
    const { projectData, phaseTimelineData } = await seedProjects(locationData, projectTypeData, phaseData, peopleData);
    await seedStandardAllocations(projectTypeData, phaseData, roleData);
    
    // Seed assignments and availability
    await seedAssignments(projectData, peopleData, personRolesData, phaseTimelineData);
    await seedAvailabilityOverrides(peopleData);
    
    console.log('================================');
    console.log('✅ Database seeding completed successfully!');
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`  - Locations: ${locationData.length}`);
    console.log(`  - Project Types: ${projectTypeData.length}`);
    console.log(`  - Phases: ${phaseData.length}`);
    console.log(`  - Roles: ${roleData.length}`);
    console.log(`  - People: ${peopleData.length}`);
    console.log(`  - Projects: ${projectData.length}`);
    console.log(`  - Assignments: ${(await db('project_assignments').count('* as count'))[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the seeding
seedDatabase().catch(console.error);
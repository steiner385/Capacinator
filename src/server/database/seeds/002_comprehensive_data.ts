import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

// Resource template allocation matrix (same as the standalone script)
const allocationMatrix = {
  // AI/ML Platform
  "AI/ML Platform": {
    "Pending": { "Project Manager": 10, "Senior Architect": 5, "Data Scientist": 15, "Product Manager": 10 },
    "Business Planning": { "Project Manager": 45, "Business Analyst": 60, "Data Scientist": 25, "Product Manager": 40, "Senior Architect": 20 },
    "Development": { "Project Manager": 40, "Senior Developer": 85, "Data Scientist": 90, "Backend Developer": 80, "DevOps Engineer": 30, "QA Engineer": 25 },
    "System Integration Testing": { "Project Manager": 35, "QA Engineer": 85, "Senior Developer": 40, "Data Scientist": 20, "DevOps Engineer": 45 },
    "User Acceptance Testing": { "Project Manager": 50, "QA Engineer": 70, "Business Analyst": 45, "Data Scientist": 15, "Product Manager": 30 },
    "Cutover": { "Project Manager": 80, "DevOps Engineer": 85, "Senior Developer": 35, "Data Scientist": 20 },
    "Hypercare": { "Project Manager": 25, "DevOps Engineer": 40, "Senior Developer": 15, "Data Scientist": 30 },
    "Support": { "Project Manager": 15, "DevOps Engineer": 25, "Senior Developer": 10, "Data Scientist": 20 }
  },

  // Cloud Migration
  "Cloud Migration": {
    "Pending": { "Project Manager": 10, "Senior Architect": 15, "DevOps Engineer": 20 },
    "Business Planning": { "Project Manager": 45, "Business Analyst": 50, "Senior Architect": 40, "DevOps Engineer": 30 },
    "Development": { "Project Manager": 40, "DevOps Engineer": 90, "Senior Developer": 70, "Backend Developer": 60, "Security Specialist": 35 },
    "System Integration Testing": { "Project Manager": 35, "QA Engineer": 75, "DevOps Engineer": 60, "Security Specialist": 50 },
    "User Acceptance Testing": { "Project Manager": 50, "QA Engineer": 65, "Business Analyst": 40, "DevOps Engineer": 25 },
    "Cutover": { "Project Manager": 85, "DevOps Engineer": 95, "Senior Developer": 40, "Security Specialist": 60 },
    "Hypercare": { "Project Manager": 30, "DevOps Engineer": 50, "Senior Developer": 20 },
    "Support": { "Project Manager": 20, "DevOps Engineer": 35, "Senior Developer": 15 }
  },

  // Data Analytics
  "Data Analytics": {
    "Pending": { "Project Manager": 10, "Data Scientist": 20, "Data Analyst": 15 },
    "Business Planning": { "Project Manager": 40, "Business Analyst": 70, "Data Scientist": 35, "Data Analyst": 50 },
    "Development": { "Project Manager": 40, "Data Scientist": 85, "Data Analyst": 90, "Backend Developer": 60, "QA Engineer": 25 },
    "System Integration Testing": { "Project Manager": 35, "QA Engineer": 70, "Data Scientist": 30, "Data Analyst": 40 },
    "User Acceptance Testing": { "Project Manager": 50, "QA Engineer": 60, "Business Analyst": 55, "Data Analyst": 45 },
    "Cutover": { "Project Manager": 70, "Data Scientist": 40, "Data Analyst": 30, "DevOps Engineer": 50 },
    "Support": { "Project Manager": 15, "Data Scientist": 25, "Data Analyst": 20, "DevOps Engineer": 20 }
  },

  // Infrastructure
  "Infrastructure": {
    "Pending": { "Project Manager": 10, "Senior Architect": 15, "DevOps Engineer": 25 },
    "Business Planning": { "Project Manager": 50, "Business Analyst": 40, "Senior Architect": 45, "DevOps Engineer": 35 },
    "Development": { "Project Manager": 40, "DevOps Engineer": 85, "Senior Developer": 60, "Backend Developer": 50, "Security Specialist": 40 },
    "System Integration Testing": { "Project Manager": 35, "QA Engineer": 70, "DevOps Engineer": 65, "Security Specialist": 55 },
    "User Acceptance Testing": { "Project Manager": 45, "QA Engineer": 60, "Business Analyst": 35, "DevOps Engineer": 30 },
    "Cutover": { "Project Manager": 80, "DevOps Engineer": 90, "Senior Developer": 45, "Security Specialist": 65 },
    "Hypercare": { "Project Manager": 25, "DevOps Engineer": 45, "Senior Developer": 20 },
    "Support": { "Project Manager": 20, "DevOps Engineer": 40, "Senior Developer": 15 }
  },

  // Integration
  "Integration": {
    "Pending": { "Project Manager": 10, "Senior Architect": 10, "Business Analyst": 15 },
    "Business Planning": { "Project Manager": 45, "Business Analyst": 60, "Senior Architect": 35, "Senior Developer": 20 },
    "Development": { "Project Manager": 45, "Senior Developer": 85, "Backend Developer": 80, "DevOps Engineer": 35, "QA Engineer": 30 },
    "System Integration Testing": { "Project Manager": 50, "QA Engineer": 90, "Senior Developer": 60, "DevOps Engineer": 45 },
    "User Acceptance Testing": { "Project Manager": 60, "QA Engineer": 70, "Business Analyst": 40, "Senior Developer": 25 },
    "Cutover": { "Project Manager": 75, "DevOps Engineer": 60, "Senior Developer": 40, "Business Analyst": 25 },
    "Support": { "Project Manager": 25, "DevOps Engineer": 25, "Senior Developer": 20, "Business Analyst": 15 }
  },

  // Mobile Application
  "Mobile Application": {
    "Pending": { "Project Manager": 10, "UX Designer": 15, "Product Manager": 10 },
    "Business Planning": { "Project Manager": 45, "Business Analyst": 60, "UX Designer": 70, "Product Manager": 50 },
    "Development": { "Project Manager": 50, "Frontend Developer": 90, "Backend Developer": 70, "UX Designer": 40, "QA Engineer": 30 },
    "System Integration Testing": { "Project Manager": 40, "QA Engineer": 85, "Frontend Developer": 50, "Backend Developer": 35 },
    "Validation": { "Project Manager": 35, "QA Engineer": 80, "UX Designer": 45, "Product Manager": 40 },
    "User Acceptance Testing": { "Project Manager": 60, "QA Engineer": 75, "Business Analyst": 45, "UX Designer": 25 },
    "Cutover": { "Project Manager": 80, "Frontend Developer": 30, "Backend Developer": 40, "DevOps Engineer": 50 },
    "Hypercare": { "Project Manager": 20, "QA Engineer": 15, "DevOps Engineer": 30 },
    "Support": { "Project Manager": 15, "QA Engineer": 10, "DevOps Engineer": 20 }
  },

  // Web Application
  "Web Application": {
    "Pending": { "Project Manager": 10, "UX Designer": 15, "Product Manager": 10 },
    "Business Planning": { "Project Manager": 45, "Business Analyst": 65, "UX Designer": 60, "Product Manager": 45 },
    "Development": { "Project Manager": 50, "Frontend Developer": 85, "Backend Developer": 80, "UX Designer": 35, "QA Engineer": 25 },
    "System Integration Testing": { "Project Manager": 40, "QA Engineer": 80, "Frontend Developer": 45, "Backend Developer": 40 },
    "User Acceptance Testing": { "Project Manager": 60, "QA Engineer": 70, "Business Analyst": 50, "UX Designer": 30 },
    "Cutover": { "Project Manager": 75, "Frontend Developer": 35, "Backend Developer": 45, "DevOps Engineer": 55 },
    "Hypercare": { "Project Manager": 25, "QA Engineer": 15, "DevOps Engineer": 35 },
    "Support": { "Project Manager": 20, "QA Engineer": 10, "DevOps Engineer": 25 }
  },

  // Security
  "Security": {
    "Pending": { "Project Manager": 10, "Senior Architect": 15, "Security Specialist": 25 },
    "Business Planning": { "Project Manager": 40, "Business Analyst": 45, "Senior Architect": 35, "Security Specialist": 60 },
    "Development": { "Project Manager": 35, "Security Specialist": 85, "Senior Developer": 60, "Backend Developer": 50, "QA Engineer": 30 },
    "System Integration Testing": { "Project Manager": 40, "QA Engineer": 75, "Security Specialist": 70, "Senior Developer": 35 },
    "User Acceptance Testing": { "Project Manager": 55, "QA Engineer": 65, "Business Analyst": 40, "Security Specialist": 50 },
    "Cutover": { "Project Manager": 70, "Security Specialist": 80, "DevOps Engineer": 60, "Senior Developer": 30 },
    "Support": { "Project Manager": 20, "Security Specialist": 40, "DevOps Engineer": 25 }
  },

  // Product Development
  "Product Development": {
    "Pending": { "Project Manager": 10, "Product Manager": 20, "UX Designer": 15 },
    "Business Planning": { "Project Manager": 40, "Product Manager": 70, "Business Analyst": 55, "UX Designer": 50 },
    "Development": { "Project Manager": 45, "Product Manager": 35, "Frontend Developer": 80, "Backend Developer": 85, "UX Designer": 30, "QA Engineer": 25 },
    "System Integration Testing": { "Project Manager": 35, "QA Engineer": 75, "Frontend Developer": 40, "Backend Developer": 45 },
    "User Acceptance Testing": { "Project Manager": 50, "Product Manager": 60, "QA Engineer": 65, "Business Analyst": 40 },
    "Cutover": { "Project Manager": 70, "Product Manager": 40, "DevOps Engineer": 55, "Frontend Developer": 25 },
    "Hypercare": { "Project Manager": 25, "Product Manager": 30, "QA Engineer": 15 },
    "Support": { "Project Manager": 20, "Product Manager": 25, "DevOps Engineer": 20 }
  },

  // Research & Development
  "Research & Development": {
    "Pending": { "Project Manager": 15, "Senior Architect": 20, "Data Scientist": 25 },
    "Business Planning": { "Project Manager": 35, "Senior Architect": 40, "Data Scientist": 50, "Business Analyst": 45 },
    "Development": { "Project Manager": 40, "Senior Developer": 85, "Data Scientist": 90, "Backend Developer": 70, "QA Engineer": 25 },
    "System Integration Testing": { "Project Manager": 30, "QA Engineer": 70, "Senior Developer": 45, "Data Scientist": 35 },
    "User Acceptance Testing": { "Project Manager": 45, "QA Engineer": 60, "Business Analyst": 50, "Data Scientist": 25 },
    "Support": { "Project Manager": 25, "Senior Developer": 20, "Data Scientist": 30 }
  }
};

// Default allocations for project types not specifically defined
const defaultAllocations = {
  "Pending": { "Project Manager": 10, "Senior Architect": 10, "Business Analyst": 15 },
  "Business Planning": { "Project Manager": 45, "Business Analyst": 60, "Senior Architect": 30, "Product Manager": 40 },
  "Development": { "Project Manager": 40, "Senior Developer": 80, "Backend Developer": 75, "Frontend Developer": 75, "QA Engineer": 25, "DevOps Engineer": 30 },
  "System Integration Testing": { "Project Manager": 35, "QA Engineer": 80, "Senior Developer": 45, "DevOps Engineer": 40 },
  "User Acceptance Testing": { "Project Manager": 50, "QA Engineer": 70, "Business Analyst": 45 },
  "Cutover": { "Project Manager": 75, "DevOps Engineer": 60, "Senior Developer": 35 },
  "Hypercare": { "Project Manager": 25, "DevOps Engineer": 35, "QA Engineer": 15 },
  "Support": { "Project Manager": 20, "DevOps Engineer": 25, "Senior Developer": 15 }
};

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding comprehensive data...');
  
  // Clear existing data (in reverse dependency order)
  await knex('project_assignments').del();
  await knex('demand_overrides').del();
  await knex('project_phases_timeline').del();
  await knex('resource_templates').del(); // Updated table name
  await knex('project_planners').del();
  await knex('role_planners').del();
  await knex('projects').del();
  await knex('person_roles').del();
  await knex('people').del();
  await knex('roles').del();
  await knex('project_phases').del();
  await knex('project_types').del();
  await knex('locations').del();

  // Seed locations
  const locationIds = {
    nyc: '550e8400-e29b-41d4-a716-446655440001',
    sf: '550e8400-e29b-41d4-a716-446655440002',
    london: '550e8400-e29b-41d4-a716-446655440003',
    remote: '550e8400-e29b-41d4-a716-446655440004'
  };

  await knex('locations').insert([
    {
      id: locationIds.nyc,
      name: 'New York City',
      description: 'NYC headquarters and main development center'
    },
    {
      id: locationIds.sf,
      name: 'San Francisco',
      description: 'West coast engineering hub'
    },
    {
      id: locationIds.london,
      name: 'London',
      description: 'European operations center'
    },
    {
      id: locationIds.remote,
      name: 'Remote',
      description: 'Distributed team members'
    }
  ]);

  // Seed project types
  const projectTypeIds = {
    aiml: '0fa42dcf-6408-48a4-ba86-733a1c48729a',
    cloudMigration: '1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
    dataAnalytics: '2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
    infrastructure: 'a1d1a82e-81df-4689-8cad-0a235d43fbc4',
    integration: '1c5453ca-47e7-4ded-ab6d-0f22f1be4607',
    mobileApp: 'a7e2e4f6-6a96-4422-bdc6-76831d38accd',
    webApp: '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
    security: '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
    productDev: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
    rnd: '45c0bb7f-a140-4317-b390-d824038f8861'
  };

  await knex('project_types').insert([
    { id: projectTypeIds.aiml, name: 'AI/ML Platform', description: 'AI and machine learning platform projects', color_code: '#8B5CF6' },
    { id: projectTypeIds.cloudMigration, name: 'Cloud Migration', description: 'Cloud infrastructure migration projects', color_code: '#06B6D4' },
    { id: projectTypeIds.dataAnalytics, name: 'Data Analytics', description: 'Data analysis and reporting projects', color_code: '#10B981' },
    { id: projectTypeIds.infrastructure, name: 'Infrastructure', description: 'System infrastructure and platform projects', color_code: '#F59E0B' },
    { id: projectTypeIds.integration, name: 'Integration', description: 'System integration and API projects', color_code: '#EF4444' },
    { id: projectTypeIds.mobileApp, name: 'Mobile Application', description: 'Mobile app development projects', color_code: '#3B82F6' },
    { id: projectTypeIds.webApp, name: 'Web Application', description: 'Web application development projects', color_code: '#6366F1' },
    { id: projectTypeIds.security, name: 'Security', description: 'Security and compliance projects', color_code: '#DC2626' },
    { id: projectTypeIds.productDev, name: 'Product Development', description: 'New product development projects', color_code: '#7C3AED' },
    { id: projectTypeIds.rnd, name: 'Research & Development', description: 'Research and experimental projects', color_code: '#059669' }
  ]);

  // Seed project phases
  const phaseIds = {
    pending: '78623f65-f5cb-4941-ac8a-97b19cc7ae41',
    planning: 'eae4519d-91e5-4f31-8221-180b8a4c3be1',
    development: 'e010a54c-d955-45cc-8ee0-dfc0ac07e47e',
    testing: 'e4a3bfe1-b3f4-4761-b57b-8948f524d2c2',
    uat: 'f0816a18-b644-4d9c-8184-3a7658044626',
    cutover: '80fb752b-4f01-4b63-b3bf-f6bd6db35d49',
    hypercare: '183564f5-b374-4524-9a42-a5c8eec18d28',
    support: '422c49d8-7a0e-4ae6-9686-119742d816aa',
    validation: 'a49df470-ee2b-47f2-9e06-88426ef15697'
  };

  await knex('project_phases').insert([
    { id: phaseIds.pending, name: 'Pending', description: 'Project pending approval', order_index: 1 },
    { id: phaseIds.planning, name: 'Business Planning', description: 'Business planning and requirements gathering', order_index: 2 },
    { id: phaseIds.development, name: 'Development', description: 'Development and implementation', order_index: 3 },
    { id: phaseIds.testing, name: 'System Integration Testing', description: 'System integration and testing', order_index: 4 },
    { id: phaseIds.uat, name: 'User Acceptance Testing', description: 'User acceptance testing', order_index: 5 },
    { id: phaseIds.validation, name: 'Validation', description: 'Validation and verification', order_index: 6 },
    { id: phaseIds.cutover, name: 'Cutover', description: 'Production deployment and cutover', order_index: 7 },
    { id: phaseIds.hypercare, name: 'Hypercare', description: 'Post-deployment support and monitoring', order_index: 8 },
    { id: phaseIds.support, name: 'Support', description: 'Ongoing support and maintenance', order_index: 9 }
  ]);

  // Seed roles
  const roleIds = {
    projectManager: '69dc7737-845a-43f0-9006-8e24c59a6e9b',
    businessAnalyst: '0d548dff-10b7-492b-925f-af93dc720f34',
    seniorDeveloper: '95ea5efc-8213-4343-a40d-e05b1baaa233',
    qaEngineer: '9ee4de86-874e-4d36-a42f-54aa579d0e26',
    devopsEngineer: 'b3957646-fe7d-4b59-bbf8-af7f7e8aa942',
    uxDesigner: '2e6c7510-c4b3-4bd2-8056-213d0535f198',
    dataScientist: '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d',
    securitySpecialist: '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e',
    productManager: '8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f',
    seniorArchitect: '9d0e1f2a-3b4c-5d6e-7f8a-9b0c1d2e3f4a',
    backendDeveloper: 'ae1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b',
    frontendDeveloper: 'bf2a3b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
    dataAnalyst: 'cg3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d'
  };

  await knex('roles').insert([
    { id: roleIds.projectManager, name: 'Project Manager', description: 'Manages project timeline and resources' },
    { id: roleIds.businessAnalyst, name: 'Business Analyst', description: 'Analyzes business requirements and processes' },
    { id: roleIds.seniorDeveloper, name: 'Senior Developer', description: 'Senior software developer and technical lead' },
    { id: roleIds.qaEngineer, name: 'QA Engineer', description: 'Quality assurance and testing specialist' },
    { id: roleIds.devopsEngineer, name: 'DevOps Engineer', description: 'DevOps and infrastructure specialist' },
    { id: roleIds.uxDesigner, name: 'UX Designer', description: 'User experience and interface designer' },
    { id: roleIds.dataScientist, name: 'Data Scientist', description: 'Data science and machine learning specialist' },
    { id: roleIds.securitySpecialist, name: 'Security Specialist', description: 'Security and compliance specialist' },
    { id: roleIds.productManager, name: 'Product Manager', description: 'Product strategy and roadmap manager' },
    { id: roleIds.seniorArchitect, name: 'Senior Architect', description: 'Senior technical architect and system designer' },
    { id: roleIds.backendDeveloper, name: 'Backend Developer', description: 'Backend software developer' },
    { id: roleIds.frontendDeveloper, name: 'Frontend Developer', description: 'Frontend software developer' },
    { id: roleIds.dataAnalyst, name: 'Data Analyst', description: 'Data analysis and reporting specialist' }
  ]);

  // Seed people
  const peopleIds = {
    alice: '123e4567-e89b-12d3-a456-426614174000',
    bob: '123e4567-e89b-12d3-a456-426614174001',
    charlie: '123e4567-e89b-12d3-a456-426614174002',
    diana: '123e4567-e89b-12d3-a456-426614174003',
    eve: '123e4567-e89b-12d3-a456-426614174004',
    frank: '123e4567-e89b-12d3-a456-426614174005',
    grace: '123e4567-e89b-12d3-a456-426614174006',
    henry: '123e4567-e89b-12d3-a456-426614174007'
  };

  await knex('people').insert([
    {
      id: peopleIds.alice,
      name: 'Alice Johnson',
      email: 'alice@company.com',
      primary_role_id: roleIds.projectManager,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.bob,
      name: 'Bob Smith',
      email: 'bob@company.com',
      primary_role_id: roleIds.seniorDeveloper,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.charlie,
      name: 'Charlie Brown',
      email: 'charlie@company.com',
      primary_role_id: roleIds.businessAnalyst,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.diana,
      name: 'Diana Prince',
      email: 'diana@company.com',
      primary_role_id: roleIds.qaEngineer,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.eve,
      name: 'Eve Davis',
      email: 'eve@company.com',
      primary_role_id: roleIds.devopsEngineer,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.frank,
      name: 'Frank Miller',
      email: 'frank@company.com',
      primary_role_id: roleIds.uxDesigner,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.grace,
      name: 'Grace Hopper',
      email: 'grace@company.com',
      primary_role_id: roleIds.productManager,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.henry,
      name: 'Henry Ford',
      email: 'henry@company.com',
      primary_role_id: roleIds.dataScientist,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    }
  ]);

  // Seed person roles (additional roles for people)
  await knex('person_roles').insert([
    { person_id: peopleIds.alice, role_id: roleIds.businessAnalyst },
    { person_id: peopleIds.bob, role_id: roleIds.devopsEngineer },
    { person_id: peopleIds.charlie, role_id: roleIds.projectManager },
    { person_id: peopleIds.diana, role_id: roleIds.businessAnalyst },
    { person_id: peopleIds.eve, role_id: roleIds.seniorDeveloper },
    { person_id: peopleIds.frank, role_id: roleIds.frontendDeveloper },
    { person_id: peopleIds.grace, role_id: roleIds.businessAnalyst },
    { person_id: peopleIds.henry, role_id: roleIds.dataAnalyst }
  ]);

  // Create a sample project
  const sampleProjectId = '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1';
  await knex('projects').insert([
    {
      id: sampleProjectId,
      name: 'Customer Portal Redesign',
      description: 'Modernize the customer portal with new UI/UX and improved functionality',
      project_type_id: projectTypeIds.webApp,
      location_id: locationIds.nyc,
      priority: 2,
      owner_id: peopleIds.grace,
      data_restrictions: 'Customer data must be handled according to GDPR requirements',
      include_in_demand: true,
      external_id: 'CUST-2024-001'
    }
  ]);

  // Add project planners
  await knex('project_planners').insert([
    {
      project_id: sampleProjectId,
      person_id: peopleIds.grace,
      permission_level: 'OWNER',
      can_modify_type: true,
      can_modify_roadmap: true,
      can_add_overrides: true,
      can_assign_resources: true,
      is_primary_planner: true
    },
    {
      project_id: sampleProjectId,
      person_id: peopleIds.alice,
      permission_level: 'PLANNER',
      can_modify_type: false,
      can_modify_roadmap: true,
      can_add_overrides: true,
      can_assign_resources: true,
      is_primary_planner: false
    }
  ]);

  // Add project phase timeline
  await knex('project_phases_timeline').insert([
    { project_id: sampleProjectId, phase_id: phaseIds.planning, start_date: '2024-02-01', end_date: '2024-02-14' },
    { project_id: sampleProjectId, phase_id: phaseIds.development, start_date: '2024-02-15', end_date: '2024-04-30' },
    { project_id: sampleProjectId, phase_id: phaseIds.testing, start_date: '2024-05-01', end_date: '2024-05-15' },
    { project_id: sampleProjectId, phase_id: phaseIds.uat, start_date: '2024-05-16', end_date: '2024-05-31' },
    { project_id: sampleProjectId, phase_id: phaseIds.cutover, start_date: '2024-06-01', end_date: '2024-06-07' }
  ]);

  // Now seed resource templates
  console.log('🌱 Seeding resource templates...');
  
  // Get all project types, phases, and roles that we just created
  const projectTypes = await knex('project_types').select('*');
  const phases = await knex('project_phases').select('*');
  const roles = await knex('roles').select('*');
  
  const resourceTemplates = [];
  let templateCount = 0;
  
  // Generate resource templates for each combination
  for (const projectType of projectTypes) {
    const projectTypeAllocations = allocationMatrix[projectType.name] || defaultAllocations;
    
    for (const phase of phases) {
      const phaseAllocations = projectTypeAllocations[phase.name] || {};
      
      for (const role of roles) {
        const allocationPercentage = phaseAllocations[role.name];
        
        if (allocationPercentage && allocationPercentage > 0) {
          resourceTemplates.push({
            id: uuidv4(),
            project_type_id: projectType.id,
            phase_id: phase.id,
            role_id: role.id,
            allocation_percentage: allocationPercentage,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          templateCount++;
        }
      }
    }
  }
  
  // Insert all resource templates in batches
  const batchSize = 100;
  for (let i = 0; i < resourceTemplates.length; i += batchSize) {
    const batch = resourceTemplates.slice(i, i + batchSize);
    await knex('resource_templates').insert(batch);
  }

  console.log('✅ Comprehensive data seeding completed!');
  console.log(`   📍 Locations: 4`);
  console.log(`   📋 Project types: ${projectTypes.length}`);
  console.log(`   📈 Phases: ${phases.length}`);
  console.log(`   👥 Roles: ${roles.length}`);
  console.log(`   🧑‍💼 People: 8`);
  console.log(`   📊 Projects: 1 (Customer Portal Redesign)`);
  console.log(`   🔧 Resource templates: ${templateCount}`);
  console.log(`\n🎉 Database is ready for use!`);
}
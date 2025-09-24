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
  await knex('project_type_phases').del(); // Clear project type-phase assignments
  await knex('project_phases').del();
  await knex('project_sub_types').del(); // Delete sub-types first due to foreign key
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

  // Seed project types (parent types)
  const projectTypeIds = {
    // Parent project types
    aiml: '0fa42dcf-6408-48a4-ba86-733a1c48729a',
    cloudMigration: '1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e',
    dataAnalytics: '2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
    infrastructure: 'a1d1a82e-81df-4689-8cad-0a235d43fbc4',
    integration: '1c5453ca-47e7-4ded-ab6d-0f22f1be4607',
    mobileApp: 'a7e2e4f6-6a96-4422-bdc6-76831d38accd',
    webApp: '3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a',
    security: '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
    productDev: '5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c',
    rnd: '45c0bb7f-a140-4317-b390-d824038f8861',
    
    // Child project types - AI/ML Platform
    computerVision: 'cv101010-2020-3030-4040-506070809010',
    nlpPlatform: 'nlp20202-3030-4040-5050-607080901020',
    mlOps: 'mlops303-4040-5050-6060-708090102030',
    
    // Child project types - Cloud Migration
    awsMigration: 'aws40404-5050-6060-7070-809010203040',
    azureMigration: 'azure505-6060-7070-8080-901020304050',
    gcpMigration: 'gcp60606-7070-8080-9090-102030405060',
    
    // Child project types - Mobile Application
    iosApp: 'ios70707-8080-9090-1010-203040506070',
    androidApp: 'andr8080-9090-1010-2020-304050607080',
    reactNative: 'rn909090-1010-2020-3030-405060708090',
    
    // Child project types - Web Application
    reactApp: 'react101-2020-3030-4040-506070809101',
    vueApp: 'vue11111-2020-3030-4040-506070809111',
    angularApp: 'ang12121-3030-4040-5050-607080910121',
    
    // Child project types - Security
    penTesting: 'pen13131-4040-5050-6060-708091013131',
    compliance: 'comp1414-5050-6060-7070-809101314141',
    encryption: 'enc15151-6060-7070-8080-910131415151',
    
    // Child project types - Data Analytics
    dataWarehouse: 'dw161616-7070-8080-9090-101316161616',
    businessIntel: 'bi171717-8080-9090-1010-201417171717',
    realtimeAnalytics: 'rt181818-9090-1010-2020-301518181818',
    
    // Child project types - Infrastructure
    cloudInfra: 'ci191919-1010-2020-3030-401619191919',
    onPremInfra: 'op202020-2020-3030-4040-502020202020',
    hybridInfra: 'hi212121-3030-4040-5050-602121212121',
    
    // Child project types - Integration
    apiIntegration: 'api22222-4040-5050-6060-702222222222',
    dataIntegration: 'di232323-5050-6060-7070-802323232323',
    systemIntegration: 'si242424-6060-7070-8080-902424242424',
    
    // Child project types - Product Development
    mvpDevelopment: 'mvp25252-7070-8080-9090-102525252525',
    featureRollout: 'fr262626-8080-9090-1010-202626262626',
    productLaunch: 'pl272727-9090-1010-2020-302727272727',
    
    // Child project types - Research & Development
    prototypeRnD: 'pr282828-1010-2020-3030-402828282828',
    techResearch: 'tr292929-2020-3030-4040-502929292929',
    experimentalRnD: 'ex303030-3030-4040-5050-603030303030'
  };

  // Insert project types (parent level)
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

  // Insert project sub-types (child level)
  await knex('project_sub_types').insert([
    // AI/ML Platform sub-types
    { id: projectTypeIds.computerVision, project_type_id: projectTypeIds.aiml, name: 'Computer Vision Platform', description: 'Computer vision and image recognition systems', color_code: '#9333EA' },
    { id: projectTypeIds.nlpPlatform, project_type_id: projectTypeIds.aiml, name: 'NLP Platform', description: 'Natural language processing and text analysis', color_code: '#7C3AED' },
    { id: projectTypeIds.mlOps, project_type_id: projectTypeIds.aiml, name: 'MLOps Platform', description: 'Machine learning operations and deployment', color_code: '#6D28D9' },
    
    // Cloud Migration sub-types
    { id: projectTypeIds.awsMigration, project_type_id: projectTypeIds.cloudMigration, name: 'AWS Migration', description: 'Migration to Amazon Web Services', color_code: '#0891B2' },
    { id: projectTypeIds.azureMigration, project_type_id: projectTypeIds.cloudMigration, name: 'Azure Migration', description: 'Migration to Microsoft Azure', color_code: '#0E7490' },
    { id: projectTypeIds.gcpMigration, project_type_id: projectTypeIds.cloudMigration, name: 'GCP Migration', description: 'Migration to Google Cloud Platform', color_code: '#155E75' },
    
    // Mobile Application sub-types
    { id: projectTypeIds.iosApp, project_type_id: projectTypeIds.mobileApp, name: 'iOS Application', description: 'Native iOS mobile applications', color_code: '#2563EB' },
    { id: projectTypeIds.androidApp, project_type_id: projectTypeIds.mobileApp, name: 'Android Application', description: 'Native Android mobile applications', color_code: '#1D4ED8' },
    { id: projectTypeIds.reactNative, project_type_id: projectTypeIds.mobileApp, name: 'React Native App', description: 'Cross-platform React Native applications', color_code: '#1E40AF' },
    
    // Web Application sub-types
    { id: projectTypeIds.reactApp, project_type_id: projectTypeIds.webApp, name: 'React Application', description: 'React-based web applications', color_code: '#4F46E5' },
    { id: projectTypeIds.vueApp, project_type_id: projectTypeIds.webApp, name: 'Vue Application', description: 'Vue.js-based web applications', color_code: '#4338CA' },
    { id: projectTypeIds.angularApp, project_type_id: projectTypeIds.webApp, name: 'Angular Application', description: 'Angular-based web applications', color_code: '#3730A3' },
    
    // Security sub-types
    { id: projectTypeIds.penTesting, project_type_id: projectTypeIds.security, name: 'Penetration Testing', description: 'Security penetration testing and vulnerability assessment', color_code: '#B91C1C' },
    { id: projectTypeIds.compliance, project_type_id: projectTypeIds.security, name: 'Compliance & Audit', description: 'Security compliance and audit projects', color_code: '#991B1B' },
    { id: projectTypeIds.encryption, project_type_id: projectTypeIds.security, name: 'Encryption & PKI', description: 'Encryption and public key infrastructure projects', color_code: '#7F1D1D' },
    
    // Data Analytics sub-types
    { id: projectTypeIds.dataWarehouse, project_type_id: projectTypeIds.dataAnalytics, name: 'Data Warehouse', description: 'Enterprise data warehouse and ETL systems', color_code: '#059669', is_default: true },
    { id: projectTypeIds.businessIntel, project_type_id: projectTypeIds.dataAnalytics, name: 'Business Intelligence', description: 'BI dashboards and reporting solutions', color_code: '#047857' },
    { id: projectTypeIds.realtimeAnalytics, project_type_id: projectTypeIds.dataAnalytics, name: 'Real-time Analytics', description: 'Streaming analytics and real-time data processing', color_code: '#065F46' },
    
    // Infrastructure sub-types
    { id: projectTypeIds.cloudInfra, project_type_id: projectTypeIds.infrastructure, name: 'Cloud Infrastructure', description: 'Cloud-based infrastructure and platform services', color_code: '#D97706', is_default: true },
    { id: projectTypeIds.onPremInfra, project_type_id: projectTypeIds.infrastructure, name: 'On-Premise Infrastructure', description: 'On-premise hardware and network infrastructure', color_code: '#B45309' },
    { id: projectTypeIds.hybridInfra, project_type_id: projectTypeIds.infrastructure, name: 'Hybrid Infrastructure', description: 'Hybrid cloud and on-premise infrastructure', color_code: '#92400E' },
    
    // Integration sub-types
    { id: projectTypeIds.apiIntegration, project_type_id: projectTypeIds.integration, name: 'API Integration', description: 'REST and GraphQL API integration projects', color_code: '#DC2626', is_default: true },
    { id: projectTypeIds.dataIntegration, project_type_id: projectTypeIds.integration, name: 'Data Integration', description: 'ETL and data pipeline integration', color_code: '#B91C1C' },
    { id: projectTypeIds.systemIntegration, project_type_id: projectTypeIds.integration, name: 'System Integration', description: 'Enterprise system and service integration', color_code: '#991B1B' },
    
    // Product Development sub-types
    { id: projectTypeIds.mvpDevelopment, project_type_id: projectTypeIds.productDev, name: 'MVP Development', description: 'Minimum viable product development', color_code: '#7C3AED', is_default: true },
    { id: projectTypeIds.featureRollout, project_type_id: projectTypeIds.productDev, name: 'Feature Rollout', description: 'New feature development and rollout', color_code: '#6D28D9' },
    { id: projectTypeIds.productLaunch, project_type_id: projectTypeIds.productDev, name: 'Product Launch', description: 'Full product launch and go-to-market', color_code: '#5B21B6' },
    
    // Research & Development sub-types
    { id: projectTypeIds.prototypeRnD, project_type_id: projectTypeIds.rnd, name: 'Prototype R&D', description: 'Prototype development and proof-of-concept', color_code: '#059669', is_default: true },
    { id: projectTypeIds.techResearch, project_type_id: projectTypeIds.rnd, name: 'Technology Research', description: 'Technology evaluation and research', color_code: '#047857' },
    { id: projectTypeIds.experimentalRnD, project_type_id: projectTypeIds.rnd, name: 'Experimental R&D', description: 'Experimental research and innovation projects', color_code: '#065F46' }
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

  // Add project type-specific phases
  console.log('🌱 Adding project type-specific phases...');
  
  const allProjectTypes = await knex('project_types').select('*');
  const allPhases = await knex('project_phases').select('*');
  
  // Default phases for all project types (parent types only)
  const defaultPhaseAssignments = [];
  
  // Assign default phases to all project types
  for (const projectType of allProjectTypes) {
    for (const phase of allPhases) {
      defaultPhaseAssignments.push({
        id: uuidv4(),
        project_type_id: projectType.id,
        phase_id: phase.id,
        is_inherited: false,
        order_index: phase.order_index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  // Insert default phase assignments
  await knex('project_type_phases').insert(defaultPhaseAssignments);
  
  // Add custom duration for specific project types
  
  // Mobile App specific phases - longer validation phase for app store review
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.mobileApp)
    .where('phase_id', phaseIds.validation)
    .update({
      duration_weeks: 2, // Mobile validation takes longer due to app store review
      updated_at: new Date().toISOString()
    });
  
  // AI/ML specific phases - longer development phase
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.aiml)
    .where('phase_id', phaseIds.development)
    .update({
      duration_weeks: 16, // AI/ML development takes longer
      updated_at: new Date().toISOString()
    });
  
  // Security projects - longer validation phase
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.security)
    .where('phase_id', phaseIds.validation)
    .update({
      duration_weeks: 3, // Security validation takes longer
      updated_at: new Date().toISOString()
    });
  
  // Data Analytics projects - longer development phase
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.dataAnalytics)
    .where('phase_id', phaseIds.development)
    .update({
      duration_weeks: 12, // Data analytics development takes longer
      updated_at: new Date().toISOString()
    });
  
  // Infrastructure projects - longer cutover phase
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.infrastructure)
    .where('phase_id', phaseIds.cutover)
    .update({
      duration_weeks: 2, // Infrastructure cutover takes longer
      updated_at: new Date().toISOString()
    });
  
  // Cloud Migration projects - longer testing and cutover phases
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.cloudMigration)
    .where('phase_id', phaseIds.testing)
    .update({
      duration_weeks: 4, // Cloud migration testing takes longer
      updated_at: new Date().toISOString()
    });
    
  await knex('project_type_phases')
    .where('project_type_id', projectTypeIds.cloudMigration)
    .where('phase_id', phaseIds.cutover)
    .update({
      duration_weeks: 3, // Cloud migration cutover takes longer
      updated_at: new Date().toISOString()
    });
  
  console.log(`✅ Added ${defaultPhaseAssignments.length} project type-phase assignments with custom durations`);

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

  // First, create people without primary role reference
  await knex('people').insert([
    {
      id: peopleIds.alice,
      name: 'Alice Johnson',
      email: 'alice@company.com',
      location_id: locationIds.nyc,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.bob,
      name: 'Bob Smith',
      email: 'bob@company.com',
      location_id: locationIds.sf,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.charlie,
      name: 'Charlie Brown',
      email: 'charlie@company.com',
      location_id: locationIds.nyc,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.diana,
      name: 'Diana Prince',
      email: 'diana@company.com',
      location_id: locationIds.london,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.eve,
      name: 'Eve Davis',
      email: 'eve@company.com',
      location_id: locationIds.remote,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.frank,
      name: 'Frank Miller',
      email: 'frank@company.com',
      location_id: locationIds.sf,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.grace,
      name: 'Grace Hopper',
      email: 'grace@company.com',
      location_id: locationIds.nyc,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: peopleIds.henry,
      name: 'Henry Ford',
      email: 'henry@company.com',
      location_id: locationIds.sf,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    }
  ]);

  // Create primary person_roles with specific IDs so we can reference them
  const primaryPersonRoleIds = {
    aliceProjectManager: uuidv4(),
    bobSeniorDeveloper: uuidv4(),
    charlieBusinessAnalyst: uuidv4(),
    dianaQaEngineer: uuidv4(),
    eveDevopsEngineer: uuidv4(),
    frankUxDesigner: uuidv4(),
    graceProductManager: uuidv4(),
    henryDataScientist: uuidv4()
  };

  await knex('person_roles').insert([
    // Primary roles
    { id: primaryPersonRoleIds.aliceProjectManager, person_id: peopleIds.alice, role_id: roleIds.projectManager, proficiency_level: 4, is_primary: true },
    { id: primaryPersonRoleIds.bobSeniorDeveloper, person_id: peopleIds.bob, role_id: roleIds.seniorDeveloper, proficiency_level: 5, is_primary: true },
    { id: primaryPersonRoleIds.charlieBusinessAnalyst, person_id: peopleIds.charlie, role_id: roleIds.businessAnalyst, proficiency_level: 4, is_primary: true },
    { id: primaryPersonRoleIds.dianaQaEngineer, person_id: peopleIds.diana, role_id: roleIds.qaEngineer, proficiency_level: 4, is_primary: true },
    { id: primaryPersonRoleIds.eveDevopsEngineer, person_id: peopleIds.eve, role_id: roleIds.devopsEngineer, proficiency_level: 5, is_primary: true },
    { id: primaryPersonRoleIds.frankUxDesigner, person_id: peopleIds.frank, role_id: roleIds.uxDesigner, proficiency_level: 4, is_primary: true },
    { id: primaryPersonRoleIds.graceProductManager, person_id: peopleIds.grace, role_id: roleIds.productManager, proficiency_level: 4, is_primary: true },
    { id: primaryPersonRoleIds.henryDataScientist, person_id: peopleIds.henry, role_id: roleIds.dataScientist, proficiency_level: 4, is_primary: true },
    // Secondary roles
    { person_id: peopleIds.alice, role_id: roleIds.businessAnalyst, proficiency_level: 3, is_primary: false },
    { person_id: peopleIds.bob, role_id: roleIds.devopsEngineer, proficiency_level: 3, is_primary: false },
    { person_id: peopleIds.charlie, role_id: roleIds.projectManager, proficiency_level: 2, is_primary: false },
    { person_id: peopleIds.diana, role_id: roleIds.businessAnalyst, proficiency_level: 3, is_primary: false },
    { person_id: peopleIds.eve, role_id: roleIds.seniorDeveloper, proficiency_level: 3, is_primary: false },
    { person_id: peopleIds.frank, role_id: roleIds.frontendDeveloper, proficiency_level: 4, is_primary: false },
    { person_id: peopleIds.grace, role_id: roleIds.businessAnalyst, proficiency_level: 3, is_primary: false },
    { person_id: peopleIds.henry, role_id: roleIds.dataAnalyst, proficiency_level: 4, is_primary: false }
  ]);

  // Now update people with their primary_person_role_id
  await knex('people').where('id', peopleIds.alice).update({ primary_person_role_id: primaryPersonRoleIds.aliceProjectManager });
  await knex('people').where('id', peopleIds.bob).update({ primary_person_role_id: primaryPersonRoleIds.bobSeniorDeveloper });
  await knex('people').where('id', peopleIds.charlie).update({ primary_person_role_id: primaryPersonRoleIds.charlieBusinessAnalyst });
  await knex('people').where('id', peopleIds.diana).update({ primary_person_role_id: primaryPersonRoleIds.dianaQaEngineer });
  await knex('people').where('id', peopleIds.eve).update({ primary_person_role_id: primaryPersonRoleIds.eveDevopsEngineer });
  await knex('people').where('id', peopleIds.frank).update({ primary_person_role_id: primaryPersonRoleIds.frankUxDesigner });
  await knex('people').where('id', peopleIds.grace).update({ primary_person_role_id: primaryPersonRoleIds.graceProductManager });
  await knex('people').where('id', peopleIds.henry).update({ primary_person_role_id: primaryPersonRoleIds.henryDataScientist });

  // Create multiple sample projects
  const projectIds = {
    customerPortal: '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1',
    aiChatbot: 'proj2222-51a2-4b3c-d4e5-f6a7b8c9d0e2',
    mobileApp: 'proj3333-51a2-4b3c-d4e5-f6a7b8c9d0e3',
    cloudMigration: 'proj4444-51a2-4b3c-d4e5-f6a7b8c9d0e4',
    securityAudit: 'proj5555-51a2-4b3c-d4e5-f6a7b8c9d0e5',
    dataWarehouse: 'proj6666-51a2-4b3c-d4e5-f6a7b8c9d0e6',
    iosApp: 'proj7777-51a2-4b3c-d4e5-f6a7b8c9d0e7',
    mlPlatform: 'proj8888-51a2-4b3c-d4e5-f6a7b8c9d0e8',
    complianceProject: 'proj9999-51a2-4b3c-d4e5-f6a7b8c9d0e9',
    ecommerce: 'proj1010-51a2-4b3c-d4e5-f6a7b8c9d010'
  };

  await knex('projects').insert([
    {
      id: projectIds.customerPortal,
      name: 'Customer Portal Redesign',
      description: 'Modernize the customer portal with new UI/UX and improved functionality',
      project_type_id: projectTypeIds.webApp,
      project_sub_type_id: projectTypeIds.reactApp,
      location_id: locationIds.nyc,
      priority: 2,
      owner_id: peopleIds.grace,
      data_restrictions: 'Customer data must be handled according to GDPR requirements',
      include_in_demand: true,
      external_id: 'CUST-2025-001',
    },
    {
      id: projectIds.aiChatbot,
      name: 'AI Customer Support Chatbot',
      description: 'Implement an AI-powered chatbot for customer support using NLP',
      project_type_id: projectTypeIds.aiml,
      project_sub_type_id: projectTypeIds.nlpPlatform,
      location_id: locationIds.sf,
      priority: 1,
      owner_id: peopleIds.henry,
      data_restrictions: 'Customer conversation data privacy requirements',
      include_in_demand: true,
      external_id: 'AI-2025-002',
    },
    {
      id: projectIds.mobileApp,
      name: 'Mobile Banking App',
      description: 'Native iOS mobile application for banking services',
      project_type_id: projectTypeIds.mobileApp,
      project_sub_type_id: projectTypeIds.iosApp,
      location_id: locationIds.nyc,
      priority: 1,
      owner_id: peopleIds.frank,
      data_restrictions: 'Financial data security requirements, PCI DSS compliance',
      include_in_demand: true,
      external_id: 'MOB-2025-003',
    },
    {
      id: projectIds.cloudMigration,
      name: 'Legacy System AWS Migration',
      description: 'Migrate legacy monolithic application to AWS microservices',
      project_type_id: projectTypeIds.cloudMigration,
      project_sub_type_id: projectTypeIds.awsMigration,
      location_id: locationIds.remote,
      priority: 2,
      owner_id: peopleIds.eve,
      data_restrictions: 'Enterprise data migration security protocols',
      include_in_demand: true,
      external_id: 'AWS-2025-004',
    },
    {
      id: projectIds.securityAudit,
      name: 'Security Penetration Testing',
      description: 'Comprehensive security audit and penetration testing of all systems',
      project_type_id: projectTypeIds.security,
      project_sub_type_id: projectTypeIds.penTesting,
      location_id: locationIds.london,
      priority: 1,
      owner_id: peopleIds.alice,
      data_restrictions: 'Confidential security findings, limited access',
      include_in_demand: true,
      external_id: 'SEC-2025-005',
    },
    {
      id: projectIds.dataWarehouse,
      name: 'Enterprise Data Analytics Platform',
      description: 'Build comprehensive data warehouse and analytics platform',
      project_type_id: projectTypeIds.dataAnalytics,
      project_sub_type_id: projectTypeIds.dataWarehouse,
      location_id: locationIds.sf,
      priority: 2,
      owner_id: peopleIds.henry,
      data_restrictions: 'Sensitive business intelligence data',
      include_in_demand: true,
      external_id: 'DATA-2025-006',
    },
    {
      id: projectIds.iosApp,
      name: 'Fitness Tracking iOS App',
      description: 'Native iOS fitness and health tracking application',
      project_type_id: projectTypeIds.mobileApp,
      project_sub_type_id: projectTypeIds.iosApp,
      location_id: locationIds.sf,
      priority: 3,
      owner_id: peopleIds.frank,
      data_restrictions: 'Health data privacy (HIPAA considerations)',
      include_in_demand: true,
      external_id: 'FIT-2025-007',
    },
    {
      id: projectIds.mlPlatform,
      name: 'Computer Vision Platform',
      description: 'Machine learning platform for image recognition and analysis',
      project_type_id: projectTypeIds.aiml,
      project_sub_type_id: projectTypeIds.computerVision,
      location_id: locationIds.sf,
      priority: 1,
      owner_id: peopleIds.henry,
      data_restrictions: 'Proprietary ML models and training data',
      include_in_demand: true,
      external_id: 'CV-2025-008',
    },
    {
      id: projectIds.complianceProject,
      name: 'SOX Compliance Automation',
      description: 'Automate Sarbanes-Oxley compliance reporting and controls',
      project_type_id: projectTypeIds.security,
      project_sub_type_id: projectTypeIds.compliance,
      location_id: locationIds.nyc,
      priority: 1,
      owner_id: peopleIds.alice,
      data_restrictions: 'Financial audit data, SOX compliance requirements',
      include_in_demand: true,
      external_id: 'SOX-2025-009',
    },
    {
      id: projectIds.ecommerce,
      name: 'E-commerce Platform Modernization',
      description: 'Modernize e-commerce platform with Vue.js and microservices',
      project_type_id: projectTypeIds.webApp,
      project_sub_type_id: projectTypeIds.vueApp,
      location_id: locationIds.london,
      priority: 2,
      owner_id: peopleIds.grace,
      data_restrictions: 'Customer payment data, PCI DSS compliance',
      include_in_demand: true,
      external_id: 'ECOM-2025-010',
    }
  ]);

  // Add project planners for all projects
  const projectPlanners = [];
  Object.values(projectIds).forEach(projectId => {
    // Add owner as primary planner based on the project's owner_id
    const project = [
      { id: projectIds.customerPortal, owner: peopleIds.grace },
      { id: projectIds.aiChatbot, owner: peopleIds.henry },
      { id: projectIds.mobileApp, owner: peopleIds.frank },
      { id: projectIds.cloudMigration, owner: peopleIds.eve },
      { id: projectIds.securityAudit, owner: peopleIds.alice },
      { id: projectIds.dataWarehouse, owner: peopleIds.henry },
      { id: projectIds.iosApp, owner: peopleIds.frank },
      { id: projectIds.mlPlatform, owner: peopleIds.henry },
      { id: projectIds.complianceProject, owner: peopleIds.alice },
      { id: projectIds.ecommerce, owner: peopleIds.grace }
    ].find(p => p.id === projectId);

    if (project) {
      projectPlanners.push({
        project_id: projectId,
        person_id: project.owner,
        permission_level: 'OWNER',
        can_modify_type: true,
        can_modify_roadmap: true,
        can_add_overrides: true,
        can_assign_resources: true,
        is_primary_planner: true
      });

      // Add Alice as a secondary planner for most projects
      if (project.owner !== peopleIds.alice) {
        projectPlanners.push({
          project_id: projectId,
          person_id: peopleIds.alice,
          permission_level: 'PLANNER',
          can_modify_type: false,
          can_modify_roadmap: true,
          can_add_overrides: true,
          can_assign_resources: true,
          is_primary_planner: false
        });
      }
    }
  });

  await knex('project_planners').insert(projectPlanners);

  // Add project phase timelines for all projects
  const projectPhaseTimelines = [
    // Customer Portal Redesign (2023-10-01 to 2023-12-31)
    { project_id: projectIds.customerPortal, phase_id: phaseIds.planning, start_date: '2023-10-01', end_date: '2023-10-15' },
    { project_id: projectIds.customerPortal, phase_id: phaseIds.development, start_date: '2023-10-16', end_date: '2023-11-30' },
    { project_id: projectIds.customerPortal, phase_id: phaseIds.testing, start_date: '2023-12-01', end_date: '2023-12-15' },
    { project_id: projectIds.customerPortal, phase_id: phaseIds.uat, start_date: '2023-12-16', end_date: '2023-12-25' },
    { project_id: projectIds.customerPortal, phase_id: phaseIds.cutover, start_date: '2023-12-26', end_date: '2023-12-31' },

    // AI Customer Support Chatbot (2023-08-01 to 2023-11-30)
    { project_id: projectIds.aiChatbot, phase_id: phaseIds.planning, start_date: '2023-08-01', end_date: '2023-08-15' },
    { project_id: projectIds.aiChatbot, phase_id: phaseIds.development, start_date: '2023-08-16', end_date: '2023-10-15' },
    { project_id: projectIds.aiChatbot, phase_id: phaseIds.testing, start_date: '2023-10-16', end_date: '2023-11-01' },
    { project_id: projectIds.aiChatbot, phase_id: phaseIds.uat, start_date: '2023-11-02', end_date: '2023-11-15' },
    { project_id: projectIds.aiChatbot, phase_id: phaseIds.cutover, start_date: '2023-11-16', end_date: '2023-11-30' },

    // Mobile Banking App (2023-05-01 to 2023-09-15)
    { project_id: projectIds.mobileApp, phase_id: phaseIds.planning, start_date: '2023-05-01', end_date: '2023-05-15' },
    { project_id: projectIds.mobileApp, phase_id: phaseIds.development, start_date: '2023-05-16', end_date: '2023-07-31' },
    { project_id: projectIds.mobileApp, phase_id: phaseIds.testing, start_date: '2023-08-01', end_date: '2023-08-15' },
    { project_id: projectIds.mobileApp, phase_id: phaseIds.uat, start_date: '2023-08-16', end_date: '2023-09-01' },
    { project_id: projectIds.mobileApp, phase_id: phaseIds.cutover, start_date: '2023-09-02', end_date: '2023-09-15' },

    // Legacy System AWS Migration (2024-03-01 to 2024-10-31)
    { project_id: projectIds.cloudMigration, phase_id: phaseIds.planning, start_date: '2024-03-01', end_date: '2024-03-31' },
    { project_id: projectIds.cloudMigration, phase_id: phaseIds.development, start_date: '2024-04-01', end_date: '2024-07-31' },
    { project_id: projectIds.cloudMigration, phase_id: phaseIds.testing, start_date: '2024-08-01', end_date: '2024-09-15' },
    { project_id: projectIds.cloudMigration, phase_id: phaseIds.uat, start_date: '2024-09-16', end_date: '2024-10-15' },
    { project_id: projectIds.cloudMigration, phase_id: phaseIds.cutover, start_date: '2024-10-16', end_date: '2024-10-31' },

    // Security Penetration Testing (2024-06-01 to 2024-12-15)
    { project_id: projectIds.securityAudit, phase_id: phaseIds.planning, start_date: '2024-06-01', end_date: '2024-06-30' },
    { project_id: projectIds.securityAudit, phase_id: phaseIds.development, start_date: '2024-07-01', end_date: '2024-10-31' },
    { project_id: projectIds.securityAudit, phase_id: phaseIds.testing, start_date: '2024-11-01', end_date: '2024-11-30' },
    { project_id: projectIds.securityAudit, phase_id: phaseIds.uat, start_date: '2024-12-01', end_date: '2024-12-15' },

    // Enterprise Data Analytics Platform (2024-09-01 to 2025-03-31)
    { project_id: projectIds.dataWarehouse, phase_id: phaseIds.planning, start_date: '2024-09-01', end_date: '2024-09-30' },
    { project_id: projectIds.dataWarehouse, phase_id: phaseIds.development, start_date: '2024-10-01', end_date: '2025-01-31' },
    { project_id: projectIds.dataWarehouse, phase_id: phaseIds.testing, start_date: '2025-02-01', end_date: '2025-02-28' },
    { project_id: projectIds.dataWarehouse, phase_id: phaseIds.uat, start_date: '2025-03-01', end_date: '2025-03-15' },
    { project_id: projectIds.dataWarehouse, phase_id: phaseIds.cutover, start_date: '2025-03-16', end_date: '2025-03-31' },

    // Fitness Tracking iOS App (2025-02-01 to 2025-07-31)
    { project_id: projectIds.iosApp, phase_id: phaseIds.planning, start_date: '2025-02-01', end_date: '2025-02-28' },
    { project_id: projectIds.iosApp, phase_id: phaseIds.development, start_date: '2025-03-01', end_date: '2025-05-31' },
    { project_id: projectIds.iosApp, phase_id: phaseIds.testing, start_date: '2025-06-01', end_date: '2025-06-30' },
    { project_id: projectIds.iosApp, phase_id: phaseIds.uat, start_date: '2025-07-01', end_date: '2025-07-15' },
    { project_id: projectIds.iosApp, phase_id: phaseIds.cutover, start_date: '2025-07-16', end_date: '2025-07-31' },

    // Computer Vision Platform (2025-04-01 to 2025-10-30)
    { project_id: projectIds.mlPlatform, phase_id: phaseIds.planning, start_date: '2025-04-01', end_date: '2025-04-30' },
    { project_id: projectIds.mlPlatform, phase_id: phaseIds.development, start_date: '2025-05-01', end_date: '2025-08-31' },
    { project_id: projectIds.mlPlatform, phase_id: phaseIds.testing, start_date: '2025-09-01', end_date: '2025-09-30' },
    { project_id: projectIds.mlPlatform, phase_id: phaseIds.uat, start_date: '2025-10-01', end_date: '2025-10-15' },
    { project_id: projectIds.mlPlatform, phase_id: phaseIds.cutover, start_date: '2025-10-16', end_date: '2025-10-30' },

    // SOX Compliance Automation (2025-06-01 to 2025-11-15)
    { project_id: projectIds.complianceProject, phase_id: phaseIds.planning, start_date: '2025-06-01', end_date: '2025-06-30' },
    { project_id: projectIds.complianceProject, phase_id: phaseIds.development, start_date: '2025-07-01', end_date: '2025-09-30' },
    { project_id: projectIds.complianceProject, phase_id: phaseIds.testing, start_date: '2025-10-01', end_date: '2025-10-31' },
    { project_id: projectIds.complianceProject, phase_id: phaseIds.uat, start_date: '2025-11-01', end_date: '2025-11-15' },

    // E-commerce Platform Modernization (2025-08-01 to 2026-01-30)
    { project_id: projectIds.ecommerce, phase_id: phaseIds.planning, start_date: '2025-08-01', end_date: '2025-08-31' },
    { project_id: projectIds.ecommerce, phase_id: phaseIds.development, start_date: '2025-09-01', end_date: '2025-12-15' },
    { project_id: projectIds.ecommerce, phase_id: phaseIds.testing, start_date: '2025-12-16', end_date: '2026-01-15' },
    { project_id: projectIds.ecommerce, phase_id: phaseIds.uat, start_date: '2026-01-16', end_date: '2026-01-30' }
  ];

  await knex('project_phases_timeline').insert(projectPhaseTimelines);

  // Now seed resource templates
  console.log('🌱 Seeding resource templates...');
  
  // Get all project types, phases, and roles that we just created
  const projectTypes = await knex('project_types').select('*');
  const phases = await knex('project_phases').select('*');
  const roles = await knex('roles').select('*');
  
  const resourceTemplates = [];
  let templateCount = 0;
  
  // Get all project sub-types that we just created
  const projectSubTypes = await knex('project_sub_types').select('*');
  
  // Generate resource templates ONLY for parent project types
  // The inheritance system will auto-create child templates
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
            is_inherited: false,
            parent_template_id: null,
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

  // Insert meaningful project assignments
  console.log('🔧 Creating project assignments...');
  const projectAssignments = [];
  let assignmentCount = 0;
  
  // Get created projects and people for assignments
  const createdProjects = await knex('projects').select('*');
  const createdPeople = await knex('people').select('*');
  const createdRoles = await knex('roles').select('*');
  const createdPhases = await knex('project_phases').select('*');
  
  // Create realistic assignments to avoid over-allocation
  // Strategy: Assign people to different projects with non-overlapping or compatible allocations
  
  const activeProjects = createdProjects.slice(0, 4); // Reduce to 4 projects to avoid over-allocation
  const pmRole = createdRoles.find(r => r.name === 'Project Manager');
  const devRole = createdRoles.find(r => r.name === 'Senior Developer');
  const qaRole = createdRoles.find(r => r.name === 'QA Engineer');
  const baRole = createdRoles.find(r => r.name === 'Business Analyst');
  
  // Assign each person to 1-2 projects max with appropriate allocations
  for (let i = 0; i < activeProjects.length; i++) {
    const project = activeProjects[i];
    
    // Get project phase timeline entries for this project
    const projectPhases = await knex('project_phases_timeline')
      .where('project_id', project.id)
      .orderBy('start_date')
      .select('*');
    
    // Assign different people to different projects to avoid over-allocation
    const personIndex = i % createdPeople.length; // Rotate through people
    const assignedPerson = createdPeople[personIndex];
    
    // Assign to just the main development phase (not all phases)
    const developmentPhase = projectPhases.find(p => {
      const phaseName = createdPhases.find(ph => ph.id === p.phase_id)?.name;
      return phaseName === 'Development';
    }) || projectPhases[1]; // fallback to second phase if no Development phase
    
    if (developmentPhase && assignedPerson) {
      // Assign PM role to this person for this project
      if (pmRole) {
        projectAssignments.push({
          id: uuidv4(),
          project_id: project.id,
          person_id: assignedPerson.id,
          role_id: pmRole.id,
          phase_id: developmentPhase.phase_id,
          assignment_date_mode: 'phase', // Use phase-based dates
          start_date: null, // Will be computed from phase
          end_date: null, // Will be computed from phase
          computed_start_date: developmentPhase.start_date, // Set computed dates
          computed_end_date: developmentPhase.end_date, // Set computed dates
          allocation_percentage: 40, // Reduced to 40% to allow for multiple assignments
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        assignmentCount++;
      }
    }
    
    // Add some cross-project assignments with lower allocations
    if (i < 2) { // Only for first 2 projects
      const qaPhase = projectPhases.find(p => {
        const phaseName = createdPhases.find(ph => ph.id === p.phase_id)?.name;
        return phaseName === 'System Integration Testing';
      }) || projectPhases[2];
      
      if (qaPhase && qaRole && createdPeople[2]) {
        projectAssignments.push({
          id: uuidv4(),
          project_id: project.id,
          person_id: createdPeople[2].id, // Third person as QA
          role_id: qaRole.id,
          phase_id: qaPhase.phase_id,
          assignment_date_mode: 'phase', // Use phase-based dates
          start_date: null, // Will be computed from phase
          end_date: null, // Will be computed from phase
          computed_start_date: qaPhase.start_date, // Set computed dates
          computed_end_date: qaPhase.end_date, // Set computed dates
          allocation_percentage: 30, // Low allocation for QA testing
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        assignmentCount++;
      }
    }
  }
  
  // Insert assignments in batches
  if (projectAssignments.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < projectAssignments.length; i += batchSize) {
      const batch = projectAssignments.slice(i, i + batchSize);
      await knex('project_assignments').insert(batch);
    }
  }

  console.log('✅ Comprehensive data seeding completed!');
  console.log(`   📍 Locations: 4`);
  console.log(`   📋 Project types: ${projectTypes.length}`);
  console.log(`   📋 Project sub-types: ${projectSubTypes.length}`);
  console.log(`   📈 Phases: ${phases.length}`);
  console.log(`   👥 Roles: ${roles.length}`);
  console.log(`   🧑‍💼 People: 8`);
  console.log(`   📊 Projects: 10 (including AI/ML, cloud migration, mobile apps, etc.)`);
  console.log(`   📅 Project phases: ${projectPhaseTimelines.length} timeline entries`);
  console.log(`   🔧 Resource templates: ${templateCount}`);
  console.log(`   👥 Project assignments: ${assignmentCount}`);
  console.log(`\n🎉 Database is ready for use with comprehensive project portfolio!`);
}
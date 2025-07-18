import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding enhanced diversity data...');
  
  // Get existing IDs to build upon
  const existingLocations = await knex('locations').select('*');
  const existingRoles = await knex('roles').select('*');
  const existingProjectTypes = await knex('project_types').select('*');
  const existingProjectSubTypes = await knex('project_sub_types').select('*');
  const existingPhases = await knex('project_phases').select('*');
  
  if (existingLocations.length === 0) {
    throw new Error('Please run 002_comprehensive_data seed first');
  }

  // Create additional people with diverse worker types
  const newPeopleIds = {
    isabella: '456e7890-e89b-12d3-a456-426614174008',
    jack: '456e7890-e89b-12d3-a456-426614174009',
    kate: '456e7890-e89b-12d3-a456-426614174010',
    liam: '456e7890-e89b-12d3-a456-426614174011',
    maya: '456e7890-e89b-12d3-a456-426614174012',
    noah: '456e7890-e89b-12d3-a456-426614174013',
    olivia: '456e7890-e89b-12d3-a456-426614174014',
    paul: '456e7890-e89b-12d3-a456-426614174015'
  };

  await knex('people').insert([
    {
      id: newPeopleIds.isabella,
      name: 'Isabella Chen',
      email: 'isabella.contractor@external.com',
      primary_role_id: existingRoles.find(r => r.name === 'Senior Developer')?.id,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id,
      worker_type: 'Contractor',
      default_availability_percentage: 80, // Part-time contractor
      default_hours_per_day: 6
    },
    {
      id: newPeopleIds.jack,
      name: 'Jack Thompson',
      email: 'jack.consultant@consulting.com',
      primary_role_id: existingRoles.find(r => r.name === 'Senior Architect')?.id,
      location_id: existingLocations.find(l => l.name === 'New York City')?.id,
      worker_type: 'Consultant',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: newPeopleIds.kate,
      name: 'Kate Williams',
      email: 'kate@company.com',
      primary_role_id: existingRoles.find(r => r.name === 'Backend Developer')?.id,
      location_id: existingLocations.find(l => l.name === 'Remote')?.id,
      worker_type: 'FTE',
      default_availability_percentage: 60, // Part-time FTE
      default_hours_per_day: 5
    },
    {
      id: newPeopleIds.liam,
      name: 'Liam O\'Connor',
      email: 'liam.contractor@external.com',
      primary_role_id: existingRoles.find(r => r.name === 'Security Specialist')?.id,
      location_id: existingLocations.find(l => l.name === 'London')?.id,
      worker_type: 'Contractor',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: newPeopleIds.maya,
      name: 'Maya Patel',
      email: 'maya@company.com',
      primary_role_id: existingRoles.find(r => r.name === 'Data Analyst')?.id,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: newPeopleIds.noah,
      name: 'Noah Garcia',
      email: 'noah.consultant@consulting.com',
      primary_role_id: existingRoles.find(r => r.name === 'Frontend Developer')?.id,
      location_id: existingLocations.find(l => l.name === 'Remote')?.id,
      worker_type: 'Consultant',
      default_availability_percentage: 75, // 3/4 time consultant
      default_hours_per_day: 6
    },
    {
      id: newPeopleIds.olivia,
      name: 'Olivia Rodriguez',
      email: 'olivia@company.com',
      primary_role_id: existingRoles.find(r => r.name === 'UX Designer')?.id,
      location_id: existingLocations.find(l => l.name === 'New York City')?.id,
      worker_type: 'FTE',
      default_availability_percentage: 100,
      default_hours_per_day: 8
    },
    {
      id: newPeopleIds.paul,
      name: 'Paul Kim',
      email: 'paul.contractor@external.com',
      primary_role_id: existingRoles.find(r => r.name === 'DevOps Engineer')?.id,
      location_id: existingLocations.find(l => l.name === 'London')?.id,
      worker_type: 'Contractor',
      default_availability_percentage: 90,
      default_hours_per_day: 7
    }
  ]);

  // Add additional person roles for cross-training
  await knex('person_roles').insert([
    { person_id: newPeopleIds.isabella, role_id: existingRoles.find(r => r.name === 'Frontend Developer')?.id },
    { person_id: newPeopleIds.jack, role_id: existingRoles.find(r => r.name === 'Project Manager')?.id },
    { person_id: newPeopleIds.kate, role_id: existingRoles.find(r => r.name === 'DevOps Engineer')?.id },
    { person_id: newPeopleIds.liam, role_id: existingRoles.find(r => r.name === 'Senior Architect')?.id },
    { person_id: newPeopleIds.maya, role_id: existingRoles.find(r => r.name === 'Data Scientist')?.id },
    { person_id: newPeopleIds.noah, role_id: existingRoles.find(r => r.name === 'UX Designer')?.id },
    { person_id: newPeopleIds.olivia, role_id: existingRoles.find(r => r.name === 'Product Manager')?.id },
    { person_id: newPeopleIds.paul, role_id: existingRoles.find(r => r.name === 'Security Specialist')?.id }
  ]);

  // Create projects using the unused sub-types
  const newProjectIds = {
    azureProject: 'proj-azure-2024-001',
    gcpProject: 'proj-gcp-2024-002',
    androidProject: 'proj-android-2025-003',
    reactNativeProject: 'proj-rn-2025-004',
    angularProject: 'proj-angular-2025-005',
    encryptionProject: 'proj-encrypt-2024-006',
    biProject: 'proj-bi-2024-007',
    realtimeProject: 'proj-realtime-2025-008',
    onPremProject: 'proj-onprem-2024-009',
    hybridProject: 'proj-hybrid-2025-010',
    dataIntegProject: 'proj-dataints-2024-011',
    systemIntegProject: 'proj-sysinteg-2025-012',
    mvpProject: 'proj-mvp-2025-013',
    featureProject: 'proj-feature-2025-014',
    launchProject: 'proj-launch-2026-015',
    prototypeProject: 'proj-proto-2024-016',
    techResearchProject: 'proj-research-2025-017',
    experimentalProject: 'proj-experiment-2025-018'
  };

  await knex('projects').insert([
    // Azure Migration
    {
      id: newProjectIds.azureProject,
      name: 'Legacy ERP Azure Migration',
      description: 'Migrate legacy ERP system to Microsoft Azure',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Cloud Migration')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Azure Migration')?.id,
      location_id: existingLocations.find(l => l.name === 'London')?.id,
      priority: 1,
      owner_id: newPeopleIds.jack,
      data_restrictions: 'Enterprise financial data, GDPR compliance required',
      include_in_demand: true,
      external_id: 'AZURE-2024-001',
    },
    // GCP Migration
    {
      id: newProjectIds.gcpProject,
      name: 'Analytics Platform GCP Migration',
      description: 'Migrate analytics infrastructure to Google Cloud Platform',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Cloud Migration')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'GCP Migration')?.id,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id,
      priority: 2,
      owner_id: newPeopleIds.maya,
      data_restrictions: 'Analytics data, privacy regulations',
      include_in_demand: true,
      external_id: 'GCP-2024-002',
    },
    // Android App
    {
      id: newProjectIds.androidProject,
      name: 'Corporate Android App',
      description: 'Native Android app for corporate communications',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Android Application')?.id,
      location_id: existingLocations.find(l => l.name === 'Remote')?.id,
      priority: 3,
      owner_id: newPeopleIds.olivia,
      data_restrictions: 'Corporate communications, confidential data',
      include_in_demand: true,
      external_id: 'AND-2025-003',
    },
    // React Native App
    {
      id: newProjectIds.reactNativeProject,
      name: 'Cross-Platform Delivery App',
      description: 'React Native delivery tracking application',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'React Native App')?.id,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id,
      priority: 2,
      owner_id: newPeopleIds.noah,
      data_restrictions: 'Location tracking data, PII protection',
      include_in_demand: false, // Cancelled project
      external_id: 'RN-2025-004',
    },
    // Angular Application
    {
      id: newProjectIds.angularProject,
      name: 'Enterprise Dashboard Modernization',
      description: 'Modernize enterprise dashboard using Angular',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Web Application')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Angular Application')?.id,
      location_id: existingLocations.find(l => l.name === 'New York City')?.id,
      priority: 2,
      owner_id: newPeopleIds.isabella,
      data_restrictions: 'Enterprise operational data',
      include_in_demand: true,
      external_id: 'ANG-2025-005',
    },
    // Encryption Project
    {
      id: newProjectIds.encryptionProject,
      name: 'Data Encryption Infrastructure',
      description: 'Implement end-to-end encryption and PKI infrastructure',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Security')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Encryption & PKI')?.id,
      location_id: existingLocations.find(l => l.name === 'London')?.id,
      priority: 1,
      owner_id: newPeopleIds.liam,
      data_restrictions: 'Highly confidential security protocols',
      include_in_demand: true,
      external_id: 'ENC-2024-006',
    },
    // Business Intelligence
    {
      id: newProjectIds.biProject,
      name: 'Executive BI Dashboard',
      description: 'Executive business intelligence and reporting platform',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Business Intelligence')?.id,
      location_id: existingLocations.find(l => l.name === 'New York City')?.id,
      priority: 1,
      owner_id: newPeopleIds.maya,
      data_restrictions: 'Executive financial data, board confidential',
      include_in_demand: true,
      external_id: 'BI-2024-007',
    },
    // Real-time Analytics (paused project)
    {
      id: newProjectIds.realtimeProject,
      name: 'Real-time Customer Analytics',
      description: 'Streaming analytics for real-time customer behavior',
      project_type_id: existingProjectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: existingProjectSubTypes.find(pst => pst.name === 'Real-time Analytics')?.id,
      location_id: existingLocations.find(l => l.name === 'San Francisco')?.id,
      priority: 4, // Lower priority - paused
      owner_id: newPeopleIds.maya,
      data_restrictions: 'Customer behavioral data, privacy sensitive',
      include_in_demand: false, // Paused project
      external_id: 'RT-2025-008',
    }
  ]);

  // Add project phase timelines for new projects with various statuses
  const newProjectPhaseTimelines = [
    // Azure Migration (In Progress)
    { project_id: newProjectIds.azureProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2024-01-01', end_date: '2024-01-31' },
    { project_id: newProjectIds.azureProject, phase_id: existingPhases.find(p => p.name === 'Development')?.id, start_date: '2024-02-01', end_date: '2024-07-31' },
    { project_id: newProjectIds.azureProject, phase_id: existingPhases.find(p => p.name === 'System Integration Testing')?.id, start_date: '2024-08-01', end_date: '2024-10-31' },
    
    // GCP Migration (Future)
    { project_id: newProjectIds.gcpProject, phase_id: existingPhases.find(p => p.name === 'Pending')?.id, start_date: '2025-09-01', end_date: '2025-09-15' },
    { project_id: newProjectIds.gcpProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2025-09-16', end_date: '2025-10-15' },
    { project_id: newProjectIds.gcpProject, phase_id: existingPhases.find(p => p.name === 'Development')?.id, start_date: '2025-10-16', end_date: '2026-02-28' },
    
    // Android App (Future)
    { project_id: newProjectIds.androidProject, phase_id: existingPhases.find(p => p.name === 'Pending')?.id, start_date: '2025-12-01', end_date: '2025-12-15' },
    { project_id: newProjectIds.androidProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2025-12-16', end_date: '2026-01-15' },
    
    // React Native (Cancelled - past dates)
    { project_id: newProjectIds.reactNativeProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2024-05-01', end_date: '2024-05-31' },
    
    // Angular (Current)
    { project_id: newProjectIds.angularProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2025-06-01', end_date: '2025-06-30' },
    { project_id: newProjectIds.angularProject, phase_id: existingPhases.find(p => p.name === 'Development')?.id, start_date: '2025-07-01', end_date: '2025-10-31' },
    
    // Encryption (Current - High Priority)
    { project_id: newProjectIds.encryptionProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2024-11-01', end_date: '2024-11-30' },
    { project_id: newProjectIds.encryptionProject, phase_id: existingPhases.find(p => p.name === 'Development')?.id, start_date: '2024-12-01', end_date: '2025-05-31' },
    
    // BI Project (Current)
    { project_id: newProjectIds.biProject, phase_id: existingPhases.find(p => p.name === 'Development')?.id, start_date: '2024-08-01', end_date: '2025-01-31' },
    { project_id: newProjectIds.biProject, phase_id: existingPhases.find(p => p.name === 'System Integration Testing')?.id, start_date: '2025-02-01', end_date: '2025-03-15' },
    
    // Real-time Analytics (Paused - no end dates)
    { project_id: newProjectIds.realtimeProject, phase_id: existingPhases.find(p => p.name === 'Business Planning')?.id, start_date: '2025-03-01', end_date: '2025-03-31' }
  ];

  await knex('project_phases_timeline').insert(newProjectPhaseTimelines);

  // Add person availability records for realistic scenarios
  console.log('🌱 Adding person availability variations...');
  
  const availabilityRecords = [];
  const currentDate = new Date();
  const existingPeople = await knex('people').select('*');
  
  // Add sabbatical for Grace (past)
  availabilityRecords.push({
    id: uuidv4(),
    person_id: existingPeople.find(p => p.name === 'Grace Hopper')?.id,
    start_date: '2024-06-01',
    end_date: '2024-08-31',
    availability_percentage: 0,
    override_type: 'PERSONAL_LEAVE',
    reason: 'Sabbatical - Research Fellowship',
    hours_per_day: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add maternity leave for Kate (current/future)
  availabilityRecords.push({
    id: uuidv4(),
    person_id: newPeopleIds.kate,
    start_date: '2025-08-01',
    end_date: '2025-11-30',
    availability_percentage: 0,
    override_type: 'PERSONAL_LEAVE',
    reason: 'Maternity Leave',
    hours_per_day: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add reduced hours for Bob (current)
  availabilityRecords.push({
    id: uuidv4(),
    person_id: existingPeople.find(p => p.name === 'Bob Smith')?.id,
    start_date: '2025-07-01',
    end_date: '2025-09-30',
    availability_percentage: 60,
    override_type: 'REDUCED_HOURS',
    reason: 'Reduced Hours - Family Care',
    hours_per_day: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add training period for Noah (future)
  availabilityRecords.push({
    id: uuidv4(),
    person_id: newPeopleIds.noah,
    start_date: '2025-09-01',
    end_date: '2025-09-30',
    availability_percentage: 25,
    override_type: 'TRAINING',
    reason: 'Training - Advanced React Certification',
    hours_per_day: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add vacation for Diana (past)
  availabilityRecords.push({
    id: uuidv4(),
    person_id: existingPeople.find(p => p.name === 'Diana Prince')?.id,
    start_date: '2024-12-20',
    end_date: '2025-01-05',
    availability_percentage: 0,
    override_type: 'VACATION',
    reason: 'Annual Leave - Holiday Break',
    hours_per_day: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Add contractor extension for Isabella
  availabilityRecords.push({
    id: uuidv4(),
    person_id: newPeopleIds.isabella,
    start_date: '2025-10-01',
    end_date: '2025-12-31',
    availability_percentage: 100,
    override_type: 'INCREASED_HOURS',
    reason: 'Contract Extension - Full Time',
    hours_per_day: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  await knex('person_availability_overrides').insert(availabilityRecords);

  console.log('✅ Enhanced diversity data seeding completed!');
  console.log(`   👥 Additional people: 8 (3 contractors, 2 consultants, 3 FTE)`);
  console.log(`   📊 New projects: 8 (covering 18 previously unused sub-types)`);
  console.log(`   📅 Project status variety: Active, Paused, Cancelled projects`);
  console.log(`   ⏰ Availability records: 6 (sabbatical, maternity, reduced hours, training, vacation, contract extension)`);
  console.log(`   🎯 Worker types: FTE, Contractor, Consultant with varied availability`);
  console.log(`   📈 Temporal distribution: Projects from 2024-2026 with realistic status progression`);
  console.log(`\n🎉 Seed data now provides comprehensive use case coverage!`);
}
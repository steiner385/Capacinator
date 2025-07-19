import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🚀 Seeding expanded portfolio data...');

  // First, let's get the existing IDs we'll need
  const existingData = await Promise.all([
    knex('locations').select('*'),
    knex('project_types').select('*'),
    knex('project_sub_types').select('*'),
    knex('people').select('*'),
    knex('roles').select('*'),
    knex('project_phases').select('*')
  ]);

  const [locations, projectTypes, projectSubTypes, people, roles, phases] = existingData;

  // Create expanded projects spanning 2022-2026
  const expandedProjects = [
    // 2022 Historical Projects
    {
      id: uuidv4(),
      external_id: 'LEGACY-2022-001',
      name: 'ERP System Modernization',
      description: 'Complete overhaul of legacy ERP system with cloud-native solution',
      project_type_id: projectTypes.find(pt => pt.name === 'Infrastructure')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Cloud Infrastructure')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 1,
      aspiration_start: '2022-01-15',
      aspiration_finish: '2022-08-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'DATA-2022-002',
      name: 'Customer 360 Data Lake',
      description: 'Unified customer data platform with real-time analytics',
      project_type_id: projectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Data Warehouse')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2022-03-01',
      aspiration_finish: '2022-10-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'SEC-2022-003',
      name: 'Zero Trust Network Implementation',
      description: 'Enterprise-wide zero trust security architecture',
      project_type_id: projectTypes.find(pt => pt.name === 'Security')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Encryption & PKI')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 1,
      aspiration_start: '2022-06-01',
      aspiration_finish: '2022-12-31',
      include_in_demand: true
    },

    // 2023 Historical Projects (more diverse)
    {
      id: uuidv4(),
      external_id: 'ML-2023-001',
      name: 'Fraud Detection ML Platform',
      description: 'Real-time fraud detection using machine learning',
      project_type_id: projectTypes.find(pt => pt.name === 'AI/ML Platform')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'MLOps Platform')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2023-02-01',
      aspiration_finish: '2023-07-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'ANDROID-2023-002',
      name: 'Android Banking App',
      description: 'Next-generation Android banking application',
      project_type_id: projectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Android Application')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 2,
      aspiration_start: '2023-04-01',
      aspiration_finish: '2023-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'API-2023-003',
      name: 'Microservices API Gateway',
      description: 'Enterprise API gateway for microservices architecture',
      project_type_id: projectTypes.find(pt => pt.name === 'Integration')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'API Integration')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 2,
      aspiration_start: '2023-05-15',
      aspiration_finish: '2023-11-30',
      include_in_demand: true
    },

    // 2024 Current/Recent Projects
    {
      id: uuidv4(),
      external_id: 'AZURE-2024-001',
      name: 'Azure Cloud Migration Phase 2',
      description: 'Migration of remaining workloads to Azure',
      project_type_id: projectTypes.find(pt => pt.name === 'Cloud Migration')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Azure Migration')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 1,
      aspiration_start: '2024-01-15',
      aspiration_finish: '2024-08-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'BI-2024-002',
      name: 'Executive Dashboard BI Platform',
      description: 'Real-time business intelligence platform for executives',
      project_type_id: projectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Business Intelligence')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 2,
      aspiration_start: '2024-03-01',
      aspiration_finish: '2024-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'RN-2024-003',
      name: 'React Native Marketplace App',
      description: 'Cross-platform marketplace application',
      project_type_id: projectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'React Native App')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 2,
      aspiration_start: '2024-04-01',
      aspiration_finish: '2024-10-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'ANGULAR-2024-004',
      name: 'Angular Admin Portal',
      description: 'Modern Angular-based administration portal',
      project_type_id: projectTypes.find(pt => pt.name === 'Web Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Angular Application')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 3,
      aspiration_start: '2024-06-01',
      aspiration_finish: '2024-12-31',
      include_in_demand: true
    },

    // 2025 Future Projects
    {
      id: uuidv4(),
      external_id: 'GCP-2025-001',
      name: 'GCP Multi-Cloud Strategy',
      description: 'Google Cloud Platform integration for multi-cloud architecture',
      project_type_id: projectTypes.find(pt => pt.name === 'Cloud Migration')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'GCP Migration')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2025-01-15',
      aspiration_finish: '2025-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'MVP-2025-002',
      name: 'AI-Powered Analytics MVP',
      description: 'Minimum viable product for AI analytics platform',
      project_type_id: projectTypes.find(pt => pt.name === 'Product Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'MVP Development')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 2,
      aspiration_start: '2025-03-01',
      aspiration_finish: '2025-06-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'STREAM-2025-003',
      name: 'Real-time Data Streaming Platform',
      description: 'High-throughput real-time data processing platform',
      project_type_id: projectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Real-time Analytics')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 1,
      aspiration_start: '2025-05-01',
      aspiration_finish: '2025-12-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'PROTO-2025-004',
      name: 'Quantum Computing Research Prototype',
      description: 'Experimental quantum computing algorithms prototype',
      project_type_id: projectTypes.find(pt => pt.name === 'Research & Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Prototype R&D')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 3,
      aspiration_start: '2025-07-01',
      aspiration_finish: '2025-11-30',
      include_in_demand: true
    },

    // 2026 Long-term Projects
    {
      id: uuidv4(),
      external_id: 'LAUNCH-2026-001',
      name: 'AI Platform Product Launch',
      description: 'Full product launch of AI analytics platform',
      project_type_id: projectTypes.find(pt => pt.name === 'Product Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Product Launch')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 1,
      aspiration_start: '2026-01-01',
      aspiration_finish: '2026-06-30',
      include_in_demand: true
    }
  ];

  // Insert projects
  console.log(`💼 Inserting ${expandedProjects.length} expanded projects...`);
  await knex('projects').insert(expandedProjects);

  // Create project phases for each new project
  const projectPhases = [];
  const phaseNames = phases.map(p => p.name);
  
  for (const project of expandedProjects) {
    const projectStart = new Date(project.aspiration_start);
    const projectEnd = new Date(project.aspiration_finish);
    const projectDuration = (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Distribute phases across project timeline
    const phaseDuration = Math.floor(projectDuration / phaseNames.length);
    
    phaseNames.forEach((phaseName, index) => {
      const phaseStart = new Date(projectStart);
      phaseStart.setDate(phaseStart.getDate() + (index * phaseDuration));
      
      const phaseEnd = new Date(phaseStart);
      phaseEnd.setDate(phaseEnd.getDate() + phaseDuration - 1);
      
      // Don't exceed project end date
      if (phaseEnd > projectEnd) {
        phaseEnd.setTime(projectEnd.getTime());
      }
      
      projectPhases.push({
        id: uuidv4(),
        project_id: project.id,
        phase_id: phases.find(p => p.name === phaseName)?.id,
        start_date: phaseStart.toISOString().split('T')[0],
        end_date: phaseEnd.toISOString().split('T')[0]
      });
    });
  }

  console.log(`📅 Inserting ${projectPhases.length} project phases...`);
  await knex('project_phases_timeline').insert(projectPhases);

  // Create diverse project assignments with varying allocations
  const projectAssignments = [];
  const roleIds = roles.map(r => r.id);
  const peopleIds = people.map(p => p.id);

  for (const project of expandedProjects) {
    // Get project phases for this project
    const projectPhasesList = projectPhases.filter(pp => pp.project_id === project.id);
    
    // Create 3-8 assignments per project with realistic allocation patterns
    const numAssignments = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < numAssignments; i++) {
      const randomPhase = projectPhasesList[Math.floor(Math.random() * projectPhasesList.length)];
      const randomPerson = peopleIds[Math.floor(Math.random() * peopleIds.length)];
      const randomRole = roleIds[Math.floor(Math.random() * roleIds.length)];
      
      // Realistic allocation percentages (not just round numbers)
      const allocations = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 85, 90, 100];
      const allocation = allocations[Math.floor(Math.random() * allocations.length)];
      
      projectAssignments.push({
        id: uuidv4(),
        project_id: project.id,
        person_id: randomPerson,
        role_id: randomRole,
        allocation_percentage: allocation,
        start_date: randomPhase.start_date,
        end_date: randomPhase.end_date
      });
    }
  }

  console.log(`👥 Inserting ${projectAssignments.length} project assignments...`);
  await knex('project_assignments').insert(projectAssignments);

  // Create availability overrides for various scenarios
  const availabilityOverrides = [];
  const overrideScenarios = [
    { reason: 'Vacation', percentage: 0, duration: 7 },
    { reason: 'Sick Leave', percentage: 0, duration: 3 },
    { reason: 'Training', percentage: 50, duration: 5 },
    { reason: 'Conference', percentage: 25, duration: 4 },
    { reason: 'Part-time Work', percentage: 50, duration: 30 },
    { reason: 'Maternity Leave', percentage: 0, duration: 90 },
    { reason: 'Sabbatical', percentage: 0, duration: 60 },
    { reason: 'Reduced Hours', percentage: 75, duration: 14 }
  ];

  // Create 20-30 availability overrides across different time periods
  for (let i = 0; i < 25; i++) {
    const randomPerson = peopleIds[Math.floor(Math.random() * peopleIds.length)];
    const scenario = overrideScenarios[Math.floor(Math.random() * overrideScenarios.length)];
    
    // Random start date between 2022 and 2025
    const startYear = 2022 + Math.floor(Math.random() * 4);
    const startMonth = Math.floor(Math.random() * 12) + 1;
    const startDay = Math.floor(Math.random() * 28) + 1;
    const startDate = new Date(startYear, startMonth - 1, startDay);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + scenario.duration);
    
    availabilityOverrides.push({
      id: uuidv4(),
      person_id: randomPerson,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      availability_percentage: scenario.percentage,
      reason: scenario.reason,
      notes: `${scenario.reason} override for ${scenario.duration} days`
    });
  }

  console.log(`📊 Inserting ${availabilityOverrides.length} availability overrides...`);
  await knex('person_availability_overrides').insert(availabilityOverrides);

  // Create demand overrides for special resource requirements
  const demandOverrides = [];
  
  // Create 10-15 demand overrides for various scenarios
  for (let i = 0; i < 12; i++) {
    const randomProject = expandedProjects[Math.floor(Math.random() * expandedProjects.length)];
    const randomRole = roleIds[Math.floor(Math.random() * roleIds.length)];
    const randomPhase = phases[Math.floor(Math.random() * phases.length)];
    
    const projectStart = new Date(randomProject.aspiration_start);
    const projectEnd = new Date(randomProject.aspiration_finish);
    
    // Random period within project timeline
    const overrideStart = new Date(projectStart.getTime() + Math.random() * (projectEnd.getTime() - projectStart.getTime()));
    const overrideEnd = new Date(overrideStart);
    overrideEnd.setDate(overrideEnd.getDate() + Math.floor(Math.random() * 30) + 7); // 1-5 weeks
    
    if (overrideEnd > projectEnd) {
      overrideEnd.setTime(projectEnd.getTime());
    }
    
    // Various override scenarios
    const overrideTypes = [
      { type: 'ADDITIONAL', multiplier: 1.5, reason: 'Critical delivery phase requiring additional resources' },
      { type: 'REDUCED', multiplier: 0.5, reason: 'Budget constraints - reduced allocation' },
      { type: 'SURGE', multiplier: 2.0, reason: 'Emergency bug fixes requiring surge capacity' },
      { type: 'SPECIALIZED', multiplier: 1.2, reason: 'Specialized expertise required' },
      { type: 'OFFSHORE', multiplier: 0.7, reason: 'Offshore team ramping up' }
    ];
    
    const override = overrideTypes[Math.floor(Math.random() * overrideTypes.length)];
    
    demandOverrides.push({
      id: uuidv4(),
      project_id: randomProject.id,
      phase_id: randomPhase.id,
      role_id: randomRole,
      start_date: overrideStart.toISOString().split('T')[0],
      end_date: overrideEnd.toISOString().split('T')[0],
      demand_hours: Math.round((Math.random() * 160 + 40) * override.multiplier), // 40-480 hours based on multiplier
      reason: `${override.type} override: ${override.reason}`
    });
  }

  console.log(`🎯 Inserting ${demandOverrides.length} demand overrides...`);
  await knex('demand_overrides').insert(demandOverrides);

  console.log('✅ Expanded portfolio data seeding completed!');
  console.log(`📈 Summary:`);
  console.log(`   - ${expandedProjects.length} projects (2022-2026)`);
  console.log(`   - ${projectPhases.length} project phases`);
  console.log(`   - ${projectAssignments.length} project assignments`);
  console.log(`   - ${availabilityOverrides.length} availability overrides`);
  console.log(`   - ${demandOverrides.length} demand overrides`);
}

export async function undo(knex: Knex): Promise<void> {
  console.log('🗑️ Removing expanded portfolio data...');
  
  // Remove in reverse order to respect foreign key constraints
  await knex('demand_overrides').where('notes', 'like', '%override:%').del();
  await knex('person_availability_overrides').where('reason', 'in', [
    'Vacation', 'Sick Leave', 'Training', 'Conference', 'Part-time Work', 
    'Maternity Leave', 'Sabbatical', 'Reduced Hours'
  ]).del();
  await knex('project_assignments').where('project_id', 'in', 
    knex.select('id').from('projects').where('external_id', 'like', '%-2022-%')
      .orWhere('external_id', 'like', 'LEGACY-%')
      .orWhere('external_id', 'like', 'DATA-2022-%')
      .orWhere('external_id', 'like', 'SEC-2022-%')
      .orWhere('external_id', 'like', 'ML-2023-%')
      .orWhere('external_id', 'like', 'ANDROID-2023-%')
      .orWhere('external_id', 'like', 'API-2023-%')
      .orWhere('external_id', 'like', 'AZURE-2024-%')
      .orWhere('external_id', 'like', 'BI-2024-%')
      .orWhere('external_id', 'like', 'RN-2024-%')
      .orWhere('external_id', 'like', 'ANGULAR-2024-%')
      .orWhere('external_id', 'like', 'GCP-2025-%')
      .orWhere('external_id', 'like', 'MVP-2025-%')
      .orWhere('external_id', 'like', 'STREAM-2025-%')
      .orWhere('external_id', 'like', 'PROTO-2025-%')
      .orWhere('external_id', 'like', 'LAUNCH-2026-%')
  ).del();
  await knex('project_phases').where('project_id', 'in',
    knex.select('id').from('projects').where('external_id', 'like', '%-2022-%')
      .orWhere('external_id', 'like', 'LEGACY-%')
      .orWhere('external_id', 'like', 'DATA-2022-%')
      .orWhere('external_id', 'like', 'SEC-2022-%')
      .orWhere('external_id', 'like', 'ML-2023-%')
      .orWhere('external_id', 'like', 'ANDROID-2023-%')
      .orWhere('external_id', 'like', 'API-2023-%')
      .orWhere('external_id', 'like', 'AZURE-2024-%')
      .orWhere('external_id', 'like', 'BI-2024-%')
      .orWhere('external_id', 'like', 'RN-2024-%')
      .orWhere('external_id', 'like', 'ANGULAR-2024-%')
      .orWhere('external_id', 'like', 'GCP-2025-%')
      .orWhere('external_id', 'like', 'MVP-2025-%')
      .orWhere('external_id', 'like', 'STREAM-2025-%')
      .orWhere('external_id', 'like', 'PROTO-2025-%')
      .orWhere('external_id', 'like', 'LAUNCH-2026-%')
  ).del();
  await knex('projects').where('external_id', 'like', '%-2022-%')
    .orWhere('external_id', 'like', 'LEGACY-%')
    .orWhere('external_id', 'like', 'DATA-2022-%')
    .orWhere('external_id', 'like', 'SEC-2022-%')
    .orWhere('external_id', 'like', 'ML-2023-%')
    .orWhere('external_id', 'like', 'ANDROID-2023-%')
    .orWhere('external_id', 'like', 'API-2023-%')
    .orWhere('external_id', 'like', 'AZURE-2024-%')
    .orWhere('external_id', 'like', 'BI-2024-%')
    .orWhere('external_id', 'like', 'RN-2024-%')
    .orWhere('external_id', 'like', 'ANGULAR-2024-%')
    .orWhere('external_id', 'like', 'GCP-2025-%')
    .orWhere('external_id', 'like', 'MVP-2025-%')
    .orWhere('external_id', 'like', 'STREAM-2025-%')
    .orWhere('external_id', 'like', 'PROTO-2025-%')
    .orWhere('external_id', 'like', 'LAUNCH-2026-%')
    .del();
  
  console.log('✅ Expanded portfolio data removal completed!');
}
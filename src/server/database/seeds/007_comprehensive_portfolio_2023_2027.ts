import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🚀 Seeding comprehensive portfolio data (2023-2027)...');

  // Get existing reference data
  const existingData = await Promise.all([
    knex('locations').select('*'),
    knex('project_types').select('*'),
    knex('project_sub_types').select('*'),
    knex('people').select('*'),
    knex('roles').select('*'),
    knex('project_phases').select('*')
  ]);

  const [locations, projectTypes, projectSubTypes, people, roles, phases] = existingData;

  // Helper to get random items from array
  const getRandomItems = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Note: generateDateRange helper available for future date calculations

  // Create comprehensive project portfolio spanning 2023-2027
  const comprehensiveProjects = [
    // 2023 Projects
    {
      id: uuidv4(),
      external_id: 'CLOUD-2023-001',
      name: 'Multi-Region Cloud Migration Phase 1',
      description: 'Migrate critical workloads to AWS with disaster recovery',
      project_type_id: projectTypes.find(pt => pt.name === 'Infrastructure')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Cloud Infrastructure')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 1,
      aspiration_start: '2023-01-15',
      aspiration_finish: '2023-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'ML-2023-002',
      name: 'Predictive Maintenance AI Platform',
      description: 'Machine learning platform for equipment failure prediction',
      project_type_id: projectTypes.find(pt => pt.name === 'AI/ML Platform')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'MLOps Platform')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2023-02-01',
      aspiration_finish: '2023-11-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'MOBILE-2023-003',
      name: 'Digital Banking App v3.0',
      description: 'Complete redesign with biometric authentication and crypto features',
      project_type_id: projectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'iOS Application')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 2,
      aspiration_start: '2023-03-15',
      aspiration_finish: '2023-12-20',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'SEC-2023-004',
      name: 'Zero Trust Security Implementation',
      description: 'Enterprise-wide zero trust architecture rollout',
      project_type_id: projectTypes.find(pt => pt.name === 'Security')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Compliance & Audit')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 1,
      aspiration_start: '2023-04-01',
      aspiration_finish: '2023-10-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'DATA-2023-005',
      name: 'Real-time Analytics Dashboard',
      description: 'Executive dashboard with real-time KPI monitoring',
      project_type_id: projectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Business Intelligence')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 2,
      aspiration_start: '2023-05-15',
      aspiration_finish: '2023-08-31',
      include_in_demand: true
    },

    // 2024 Projects
    {
      id: uuidv4(),
      external_id: 'INTG-2024-001',
      name: 'Supply Chain Integration Platform',
      description: 'End-to-end supply chain integration with real-time tracking',
      project_type_id: projectTypes.find(pt => pt.name === 'Integration')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'System Integration')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 2,
      aspiration_start: '2024-01-10',
      aspiration_finish: '2024-07-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'AI-2024-002',
      name: 'Conversational AI Customer Service',
      description: 'Natural language processing chatbot with sentiment analysis',
      project_type_id: projectTypes.find(pt => pt.name === 'AI/ML Platform')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'NLP Platform')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2024-02-15',
      aspiration_finish: '2024-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'CLOUD-2024-003',
      name: 'Kubernetes Platform Modernization',
      description: 'Migrate to managed Kubernetes with GitOps deployment',
      project_type_id: projectTypes.find(pt => pt.name === 'Infrastructure')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Cloud Infrastructure')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 1,
      aspiration_start: '2024-03-01',
      aspiration_finish: '2024-11-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'PROD-2024-004',
      name: 'Smart Building Management System',
      description: 'Integrated building management with energy optimization',
      project_type_id: projectTypes.find(pt => pt.name === 'Product Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'MVP Development')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 3,
      aspiration_start: '2024-04-15',
      aspiration_finish: '2024-12-20',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'WEB-2024-005',
      name: 'E-commerce Platform Revamp',
      description: 'Headless commerce with micro-frontends architecture',
      project_type_id: projectTypes.find(pt => pt.name === 'Web Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'React Application')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 1,
      aspiration_start: '2024-05-01',
      aspiration_finish: '2024-10-31',
      include_in_demand: true
    },

    // 2025 Projects
    {
      id: uuidv4(),
      external_id: 'RND-2025-001',
      name: 'Advanced Analytics Research Lab',
      description: 'Next-gen analytics algorithms for real-time insights',
      project_type_id: projectTypes.find(pt => pt.name === 'Research & Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.project_type_id === projectTypes.find(pt => pt.name === 'Research & Development')?.id)?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 3,
      aspiration_start: '2025-01-15',
      aspiration_finish: '2025-12-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'MOBILE-2025-002',
      name: 'Augmented Reality Training Platform',
      description: 'AR-based employee training and simulation system',
      project_type_id: projectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'React Native App')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 2,
      aspiration_start: '2025-02-01',
      aspiration_finish: '2025-08-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'EDGE-2025-003',
      name: 'Edge Computing Infrastructure',
      description: 'Deploy edge computing nodes for low-latency processing',
      project_type_id: projectTypes.find(pt => pt.name === 'Infrastructure')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Hybrid Infrastructure')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 1,
      aspiration_start: '2025-03-15',
      aspiration_finish: '2025-11-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'ML-2025-004',
      name: 'Autonomous Decision Engine',
      description: 'Self-learning system for automated business decisions',
      project_type_id: projectTypes.find(pt => pt.name === 'AI/ML Platform')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'MLOps Platform')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 1,
      aspiration_start: '2025-04-01',
      aspiration_finish: '2025-12-20',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'API-2025-005',
      name: 'Open Banking API Platform',
      description: 'Secure API platform for financial services integration',
      project_type_id: projectTypes.find(pt => pt.name === 'Integration')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'API Integration')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 2,
      aspiration_start: '2025-05-15',
      aspiration_finish: '2025-10-31',
      include_in_demand: true
    },

    // 2026 Projects
    {
      id: uuidv4(),
      external_id: 'VR-2026-001',
      name: 'Metaverse Collaboration Space',
      description: 'Virtual reality workspace for remote teams',
      project_type_id: projectTypes.find(pt => pt.name === 'Mobile Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'React Native App')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 3,
      aspiration_start: '2026-01-10',
      aspiration_finish: '2026-09-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'CV-2026-002',
      name: 'Computer Vision Quality Control',
      description: 'AI-powered visual inspection system for manufacturing',
      project_type_id: projectTypes.find(pt => pt.name === 'AI/ML Platform')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Computer Vision Platform')?.id,
      location_id: locations.find(l => l.name === 'San Francisco')?.id,
      priority: 3,
      aspiration_start: '2026-02-15',
      aspiration_finish: '2026-12-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'GREEN-2026-003',
      name: 'Carbon Neutral Data Centers',
      description: 'Sustainable infrastructure with renewable energy integration',
      project_type_id: projectTypes.find(pt => pt.name === 'Infrastructure')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'On-Premise Infrastructure')?.id,
      location_id: locations.find(l => l.name === 'London')?.id,
      priority: 1,
      aspiration_start: '2026-03-01',
      aspiration_finish: '2026-11-30',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'PROD-2026-004',
      name: 'Robotic Process Automation Suite',
      description: 'End-to-end RPA platform with AI-driven process discovery',
      project_type_id: projectTypes.find(pt => pt.name === 'Product Development')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Feature Rollout')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 2,
      aspiration_start: '2026-04-15',
      aspiration_finish: '2026-10-31',
      include_in_demand: true
    },
    {
      id: uuidv4(),
      external_id: 'SPACE-2026-005',
      name: 'Satellite Data Processing Platform',
      description: 'Real-time processing of satellite imagery for climate analysis',
      project_type_id: projectTypes.find(pt => pt.name === 'Data Analytics')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'Real-time Analytics')?.id,
      location_id: locations.find(l => l.name === 'Remote')?.id,
      priority: 2,
      aspiration_start: '2026-05-01',
      aspiration_finish: '2026-12-20',
      include_in_demand: true
    },

    // 2027 Projects
    {
      id: uuidv4(),
      external_id: 'HEALTH-2027-001',
      name: 'Biometric Health Monitoring Platform',
      description: 'Continuous health monitoring with predictive analytics',
      project_type_id: projectTypes.find(pt => pt.name === 'Web Application')?.id,
      project_sub_type_id: projectSubTypes.find(pst => pst.name === 'React Application')?.id,
      location_id: locations.find(l => l.name === 'New York')?.id,
      priority: 1,
      aspiration_start: '2027-01-15',
      aspiration_finish: '2027-08-31',
      include_in_demand: true
    }
  ];

  // Insert projects
  console.log(`💼 Inserting ${comprehensiveProjects.length} comprehensive projects...`);
  await knex('projects').insert(comprehensiveProjects);

  // Generate project phases for each project
  interface ProjectPhase {
    id: string;
    project_id: string;
    phase_id: string;
    start_date: string;
    end_date: string;
  }
  const projectPhases: ProjectPhase[] = [];
  for (const project of comprehensiveProjects) {
    const relevantPhases = getRandomItems(phases, Math.floor(Math.random() * 4) + 3); // 3-6 phases per project
    let currentDate = new Date(project.aspiration_start);
    const endDate = new Date(project.aspiration_finish);
    const totalDays = Math.floor((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPerPhase = Math.floor(totalDays / relevantPhases.length);

    relevantPhases.forEach((phase, index) => {
      const phaseStart = new Date(currentDate);
      const phaseEnd = new Date(currentDate);
      phaseEnd.setDate(phaseEnd.getDate() + daysPerPhase);
      
      if (index === relevantPhases.length - 1) {
        // Last phase ends with project
        phaseEnd.setTime(endDate.getTime());
      }

      projectPhases.push({
        id: uuidv4(),
        project_id: project.id,
        phase_id: phase.id,
        start_date: phaseStart.toISOString().split('T')[0],
        end_date: phaseEnd.toISOString().split('T')[0]
      });

      currentDate = new Date(phaseEnd);
      currentDate.setDate(currentDate.getDate() + 1);
    });
  }

  console.log(`📅 Inserting ${projectPhases.length} project phases...`);
  if (projectPhases.length > 0) {
    await knex('project_phases_timeline').insert(projectPhases);
  }

  // Generate comprehensive project assignments
  interface Assignment {
    id: string;
    project_id: string;
    person_id: string;
    role_id: string;
    phase_id: string;
    start_date: null;
    end_date: null;
    computed_start_date: string;
    computed_end_date: string;
    allocation_percentage: number;
    assignment_date_mode: string;
  }
  const assignments: Assignment[] = [];
  const assignmentMap = new Map(); // Track assignments to avoid conflicts

  for (const project of comprehensiveProjects) {
    // Get project phases for this project
    const projectPhasesList = projectPhases.filter(pp => pp.project_id === project.id);
    
    // Determine number of team members based on project priority and duration
    const teamSize = project.priority === 1 ? 
      Math.floor(Math.random() * 3) + 3 : // 3-5 for priority 1
      Math.floor(Math.random() * 2) + 2;  // 2-3 for others

    const selectedPeople = getRandomItems(people, teamSize);
    const requiredRoles = getRandomItems(roles, Math.min(teamSize, roles.length));

    selectedPeople.forEach((person, index) => {
      const role = requiredRoles[index % requiredRoles.length];
      
      // Vary allocation based on project priority and person's involvement
      const baseAllocation = project.priority === 1 ? 60 : 40;
      const allocation = baseAllocation + Math.floor(Math.random() * 40); // 40-100% for P1, 20-80% for others
      
      // Assign to random phases (not all phases)
      const assignedPhases = getRandomItems(projectPhasesList, Math.max(1, Math.floor(projectPhasesList.length * 0.6)));
      
      assignedPhases.forEach(phase => {
        // Check for conflicts using phase dates
        const personKey = `${person.id}-${phase.start_date}`;
        if (!assignmentMap.has(personKey) || assignmentMap.get(personKey) < 100) {
          const currentAllocation = assignmentMap.get(personKey) || 0;
          const finalAllocation = Math.min(allocation, 100 - currentAllocation);
          
          if (finalAllocation > 0) {
            assignments.push({
              id: uuidv4(),
              project_id: project.id,
              person_id: person.id,
              role_id: role.id,
              phase_id: phase.phase_id,
              start_date: null, // Phase-based assignment
              end_date: null, // Phase-based assignment
              computed_start_date: phase.start_date, // Set computed dates
              computed_end_date: phase.end_date, // Set computed dates
              allocation_percentage: finalAllocation,
              assignment_date_mode: 'phase' // Use phase-based mode
            });
            
            assignmentMap.set(personKey, currentAllocation + finalAllocation);
          }
        }
      });
    });
  }

  // Create baseline scenario if it doesn't exist
  const baselineScenario = await knex('scenarios')
    .where('id', 'baseline-0000-0000-0000-000000000000')
    .first();
    
  if (!baselineScenario) {
    await knex('scenarios').insert({
      id: 'baseline-0000-0000-0000-000000000000',
      name: 'Baseline',
      description: 'Current state baseline scenario',
      parent_scenario_id: null,
      created_by: people[0]?.id || uuidv4(),
      status: 'active',
      scenario_type: 'baseline',
      branch_point: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // Convert assignments to scenario_project_assignments
  const scenarioAssignments = assignments.map(assignment => ({
    ...assignment,
    scenario_id: 'baseline-0000-0000-0000-000000000000'
  }));

  console.log(`👥 Inserting ${scenarioAssignments.length} scenario project assignments...`);
  if (scenarioAssignments.length > 0) {
    await knex('scenario_project_assignments').insert(scenarioAssignments);
  }

  // Generate availability overrides (vacations, training, etc.)
  const availabilityOverrides = [];
  const reasonTypeMapping = {
    'vacation': 'VACATION',
    'training': 'TRAINING',
    'conference': 'CONFERENCE',
    'personal': 'OTHER',
    'medical': 'SICK_LEAVE',
    'parental_leave': 'PARENTAL_LEAVE'
  };
  const reasons = Object.keys(reasonTypeMapping);
  
  for (const person of people) {
    // Each person gets 2-5 availability overrides across the years
    const numOverrides = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numOverrides; i++) {
      const year = 2023 + Math.floor(Math.random() * 5); // 2023-2027
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const startDate = new Date(year, month - 1, day);
      
      // Duration varies by reason
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      let duration = 1;
      switch (reason) {
        case 'vacation': duration = Math.floor(Math.random() * 10) + 5; break; // 5-14 days
        case 'training': duration = Math.floor(Math.random() * 3) + 2; break; // 2-4 days
        case 'conference': duration = Math.floor(Math.random() * 3) + 2; break; // 2-4 days
        case 'personal': duration = Math.floor(Math.random() * 3) + 1; break; // 1-3 days
        case 'medical': duration = Math.floor(Math.random() * 7) + 3; break; // 3-9 days
        case 'parental_leave': duration = Math.floor(Math.random() * 60) + 30; break; // 30-90 days
      }
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      
      availabilityOverrides.push({
        id: uuidv4(),
        person_id: person.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        availability_percentage: 0, // Not available
        hours_per_day: 0,
        override_type: (reasonTypeMapping as Record<string, string>)[reason],
        reason: reason,
        notes: `${reason.charAt(0).toUpperCase() + reason.slice(1).replace('_', ' ')} - ${year}`,
        is_approved: true
      });
    }
  }

  console.log(`📊 Inserting ${availabilityOverrides.length} availability overrides...`);
  if (availabilityOverrides.length > 0) {
    await knex('person_availability_overrides').insert(availabilityOverrides);
  }

  // Generate demand overrides for specific projects
  const demandOverrides = [];
  const criticalProjects = comprehensiveProjects.filter(p => p.priority === 1);
  
  for (const project of criticalProjects) {
    // Some critical projects need surge capacity
    if (Math.random() > 0.6) { // 40% chance of surge
      const surgeRoles = getRandomItems(roles, Math.floor(Math.random() * 2) + 1); // 1-2 roles
      
      for (const role of surgeRoles) {
        const projectStart = new Date(project.aspiration_start);
        const projectEnd = new Date(project.aspiration_finish);
        const projectDuration = Math.floor((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
        
        // Surge happens in the middle third of the project
        const surgeStart = new Date(projectStart);
        surgeStart.setDate(surgeStart.getDate() + Math.floor(projectDuration * 0.33));
        
        const surgeEnd = new Date(projectStart);
        surgeEnd.setDate(surgeEnd.getDate() + Math.floor(projectDuration * 0.66));
        
        demandOverrides.push({
          id: uuidv4(),
          project_id: project.id,
          role_id: role.id,
          start_date: surgeStart.toISOString().split('T')[0],
          end_date: surgeEnd.toISOString().split('T')[0],
          demand_hours: (Math.floor(Math.random() * 2) + 1) * 40, // 1-2 additional people * 40 hours
          reason: `Critical phase surge for ${project.name}`
        });
      }
    }
  }

  console.log(`🎯 Inserting ${demandOverrides.length} demand overrides...`);
  if (demandOverrides.length > 0) {
    await knex('demand_overrides').insert(demandOverrides);
  }

  console.log('✅ Comprehensive portfolio data seeding completed!');
  console.log(`📈 Summary:
   - ${comprehensiveProjects.length} projects (2023-2027)
   - ${projectPhases.length} project phases
   - ${assignments.length} project assignments
   - ${availabilityOverrides.length} availability overrides
   - ${demandOverrides.length} demand overrides`);
}
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Adding custom project phases to some projects...');

  // Custom phase IDs
  const customPhaseIds = {
    prototyping: uuidv4(),
    alphaRelease: uuidv4(),
    betaRelease: uuidv4(),
    marketAnalysis: uuidv4(),
    regulatoryApproval: uuidv4(),
    pilotProgram: uuidv4(),
    dataCollection: uuidv4(),
    modelTraining: uuidv4(),
    performanceTuning: uuidv4(),
    securityAudit: uuidv4(),
    loadTesting: uuidv4(),
    disasterRecovery: uuidv4()
  };

  // Insert custom phases (these are project-specific phases not tied to any project type)
  await knex('project_phases').insert([
    { 
      id: customPhaseIds.prototyping, 
      name: 'Prototyping', 
      description: 'Rapid prototype development and iteration', 
      order_index: 2.5  // Between planning and development
    },
    { 
      id: customPhaseIds.alphaRelease, 
      name: 'Alpha Release', 
      description: 'Internal alpha testing and feedback', 
      order_index: 4.5  // Between development and testing
    },
    { 
      id: customPhaseIds.betaRelease, 
      name: 'Beta Release', 
      description: 'External beta testing with selected users', 
      order_index: 5.5  // Between testing and UAT
    },
    { 
      id: customPhaseIds.marketAnalysis, 
      name: 'Market Analysis', 
      description: 'Market research and competitive analysis', 
      order_index: 1.5  // Early phase
    },
    { 
      id: customPhaseIds.regulatoryApproval, 
      name: 'Regulatory Approval', 
      description: 'Compliance and regulatory approval process', 
      order_index: 6.5  // Before deployment
    },
    { 
      id: customPhaseIds.pilotProgram, 
      name: 'Pilot Program', 
      description: 'Limited rollout pilot program', 
      order_index: 6.8  // Before full deployment
    },
    { 
      id: customPhaseIds.dataCollection, 
      name: 'Data Collection', 
      description: 'Gathering and preparing training data', 
      order_index: 2.2  // Early in ML projects
    },
    { 
      id: customPhaseIds.modelTraining, 
      name: 'Model Training', 
      description: 'ML model training and optimization', 
      order_index: 3.5  // During development
    },
    { 
      id: customPhaseIds.performanceTuning, 
      name: 'Performance Tuning', 
      description: 'System optimization and performance tuning', 
      order_index: 5.8  // Before deployment
    },
    { 
      id: customPhaseIds.securityAudit, 
      name: 'Security Audit', 
      description: 'Comprehensive security audit and penetration testing', 
      order_index: 5.9  // Before deployment
    },
    { 
      id: customPhaseIds.loadTesting, 
      name: 'Load Testing', 
      description: 'High-volume load and stress testing', 
      order_index: 5.7  // During testing
    },
    { 
      id: customPhaseIds.disasterRecovery, 
      name: 'Disaster Recovery Setup', 
      description: 'Disaster recovery and backup configuration', 
      order_index: 7.5  // After deployment
    }
  ]);

  // Get some existing projects to add custom phases to
  const aiProjects = await knex('projects')
    .join('project_types', 'projects.project_type_id', 'project_types.id')
    .where('project_types.name', 'AI/ML Platform')
    .select('projects.id', 'projects.name')
    .limit(3);

  const securityProjects = await knex('projects')
    .join('project_types', 'projects.project_type_id', 'project_types.id')
    .where('project_types.name', 'Security')
    .select('projects.id', 'projects.name')
    .limit(2);

  const productDevProjects = await knex('projects')
    .join('project_types', 'projects.project_type_id', 'project_types.id')
    .where('project_types.name', 'Product Development')
    .select('projects.id', 'projects.name')
    .limit(2);

  const cloudProjects = await knex('projects')
    .join('project_types', 'projects.project_type_id', 'project_types.id')
    .where('project_types.name', 'Cloud Migration')
    .select('projects.id', 'projects.name')
    .limit(2);

  // Add custom phases to AI/ML projects
  const customPhaseTimelines = [];
  
  for (const project of aiProjects) {
    // Add data collection and model training phases
    customPhaseTimelines.push(
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.dataCollection,
        start_date: '2025-02-01',
        end_date: '2025-03-15',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.modelTraining,
        start_date: '2025-03-16',
        end_date: '2025-05-30',
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    console.log(`✅ Added custom ML phases to project: ${project.name}`);
  }

  // Add custom phases to security projects
  for (const project of securityProjects) {
    customPhaseTimelines.push(
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.securityAudit,
        start_date: '2025-04-01',
        end_date: '2025-05-15',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.regulatoryApproval,
        start_date: '2025-05-16',
        end_date: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    console.log(`✅ Added custom security phases to project: ${project.name}`);
  }

  // Add custom phases to product development projects
  for (const project of productDevProjects) {
    customPhaseTimelines.push(
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.marketAnalysis,
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.prototyping,
        start_date: '2025-02-01',
        end_date: '2025-03-15',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.alphaRelease,
        start_date: '2025-06-01',
        end_date: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.betaRelease,
        start_date: '2025-07-01',
        end_date: '2025-08-15',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.pilotProgram,
        start_date: '2025-08-16',
        end_date: '2025-09-30',
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    console.log(`✅ Added custom product development phases to project: ${project.name}`);
  }

  // Add custom phases to cloud migration projects
  for (const project of cloudProjects) {
    customPhaseTimelines.push(
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.loadTesting,
        start_date: '2025-05-01',
        end_date: '2025-05-31',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.performanceTuning,
        start_date: '2025-06-01',
        end_date: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        project_id: project.id,
        phase_id: customPhaseIds.disasterRecovery,
        start_date: '2025-10-01',
        end_date: '2025-10-31',
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    console.log(`✅ Added custom cloud migration phases to project: ${project.name}`);
  }

  // Insert all custom phase timelines
  if (customPhaseTimelines.length > 0) {
    await knex('project_phases_timeline').insert(customPhaseTimelines);
    console.log(`✨ Added ${customPhaseTimelines.length} custom phase timeline entries`);
  }

  // Also add resource templates for these custom phases
  const roles = await knex('roles').select('*');
  const pmRole = roles.find(r => r.name === 'Project Manager');
  const devRole = roles.find(r => r.name === 'Backend Developer');
  const qaRole = roles.find(r => r.name === 'QA Engineer');
  const baRole = roles.find(r => r.name === 'Business Analyst');
  const mlRole = roles.find(r => r.name === 'ML Engineer');
  const securityRole = roles.find(r => r.name === 'Security Engineer');
  const devOpsRole = roles.find(r => r.name === 'DevOps Engineer');

  const customAllocations = [];

  // Add some allocations for custom phases to specific projects that have them
  for (const project of [...aiProjects, ...securityProjects, ...productDevProjects, ...cloudProjects]) {
    // Get the project's custom phases
    const projectCustomPhases = await knex('project_phases_timeline')
      .where('project_id', project.id)
      .whereIn('phase_id', Object.values(customPhaseIds))
      .select('phase_id');

    for (const phaseEntry of projectCustomPhases) {
      // Add project-specific allocations (not inherited)
      if (phaseEntry.phase_id === customPhaseIds.dataCollection && mlRole) {
        customAllocations.push({
          id: uuidv4(),
          project_id: project.id,
          phase_id: phaseEntry.phase_id,
          role_id: mlRole.id,
          allocation_percentage: 80,
          is_inherited: false,
          notes: 'Custom allocation for data collection phase',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      if (phaseEntry.phase_id === customPhaseIds.modelTraining && mlRole) {
        customAllocations.push({
          id: uuidv4(),
          project_id: project.id,
          phase_id: phaseEntry.phase_id,
          role_id: mlRole.id,
          allocation_percentage: 100,
          is_inherited: false,
          notes: 'Custom allocation for model training phase',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      if (phaseEntry.phase_id === customPhaseIds.securityAudit && securityRole) {
        customAllocations.push({
          id: uuidv4(),
          project_id: project.id,
          phase_id: phaseEntry.phase_id,
          role_id: securityRole.id,
          allocation_percentage: 90,
          is_inherited: false,
          notes: 'Custom allocation for security audit phase',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      if (phaseEntry.phase_id === customPhaseIds.marketAnalysis && baRole) {
        customAllocations.push({
          id: uuidv4(),
          project_id: project.id,
          phase_id: phaseEntry.phase_id,
          role_id: baRole.id,
          allocation_percentage: 75,
          is_inherited: false,
          notes: 'Custom allocation for market analysis phase',
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Add PM allocation for all custom phases
      if (pmRole) {
        customAllocations.push({
          id: uuidv4(),
          project_id: project.id,
          phase_id: phaseEntry.phase_id,
          role_id: pmRole.id,
          allocation_percentage: 30,
          is_inherited: false,
          notes: 'Custom PM allocation for project-specific phase',
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  }

  // Insert custom allocations
  if (customAllocations.length > 0) {
    await knex('project_allocation_overrides').insert(customAllocations);
    console.log(`✨ Added ${customAllocations.length} custom allocations for project-specific phases`);
  }

  console.log('✅ Custom project phases seed completed successfully!');
  
  // Initialize allocations for all projects that don't have them
  console.log('🔄 Initializing missing project allocations...');
  const projectsWithoutAllocations = await knex('projects')
    .leftJoin('project_allocation_overrides', 'projects.id', 'project_allocation_overrides.project_id')
    .whereNull('project_allocation_overrides.id')
    .select('projects.id', 'projects.name', 'projects.project_type_id')
    .groupBy('projects.id', 'projects.name', 'projects.project_type_id');

  for (const project of projectsWithoutAllocations) {
    // Get resource templates for this project's type
    const templates = await knex('resource_templates')
      .where('project_type_id', project.project_type_id)
      .join('project_phases', 'resource_templates.phase_id', 'project_phases.id')
      .join('roles', 'resource_templates.role_id', 'roles.id')
      .select(
        'resource_templates.*',
        'project_phases.name as phase_name',
        'roles.name as role_name'
      );

    const allocations = templates.map(template => ({
      id: uuidv4(),
      project_id: project.id,
      phase_id: template.phase_id,
      role_id: template.role_id,
      allocation_percentage: template.allocation_percentage,
      is_inherited: true,
      template_id: template.id,
      notes: `Inherited from project type: ${template.phase_name} - ${template.role_name}`,
      created_at: new Date(),
      updated_at: new Date()
    }));

    if (allocations.length > 0) {
      await knex('project_allocation_overrides').insert(allocations);
      console.log(`✅ Initialized ${allocations.length} allocations for project: ${project.name}`);
    }
  }
}

export default { seed };
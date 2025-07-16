import { faker } from '@faker-js/faker';
import { APIRequestContext } from '@playwright/test';

export interface TestEmployee {
  id?: string;
  name: string;
  email?: string;
  primary_role_id: string;
  supervisor_id?: string;
  worker_type: 'FTE' | 'Contractor' | 'Consultant';
  default_availability_percentage: number;
  default_hours_per_day: number;
}

export interface TestProject {
  id?: string;
  name: string;
  project_type_id: string;
  project_sub_type_id: string;
  location_id: string;
  priority: number;
  description: string;
  include_in_demand: boolean;
  aspiration_start: string;
  aspiration_finish: string;
  owner_id: string;
}

export interface TestProjectPhase {
  id?: string;
  project_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
}

export interface TestAssignment {
  id?: string;
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id?: string;
  start_date: string;
  end_date: string;
  allocation_percentage: number;
}

export interface TestAvailabilityOverride {
  id?: string;
  person_id: string;
  start_date: string;
  end_date: string;
  availability_percentage: number;
  hours_per_day?: number;
  reason: string;
  override_type: 'VACATION' | 'SICK' | 'TRAINING' | 'CONFERENCE' | 'PERSONAL';
}

export interface TestScenarioData {
  locations: any[];
  projectTypes: any[];
  phases: any[];
  roles: any[];
  employees: TestEmployee[];
  projects: TestProject[];
  projectPhases: TestProjectPhase[];
  assignments: TestAssignment[];
  availabilityOverrides: TestAvailabilityOverride[];
  allocations: any[];
}

export class TestDataGenerator {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL: string = 'http://localhost:3111') {
    this.request = request;
    this.baseURL = baseURL;
  }

  /**
   * Generate test data specifically for search functionality testing
   */
  async generateSearchTestData(): Promise<TestScenarioData> {
    const timestamp = Date.now().toString().slice(-6);
    
    // Create locations
    const locations = await this.createLocations([
      { name: 'San Francisco', code: 'SF' },
      { name: 'New York', code: 'NYC' }
    ]);

    // Create project types with varied names for search testing
    const projectTypes = await this.createProjectTypes([
      { name: `Mobile Application ${timestamp}`, color: '#3B82F6' },
      { name: `E-commerce Platform ${timestamp}`, color: '#10B981' },
      { name: `AI/ML Platform ${timestamp}`, color: '#F59E0B' },
      { name: `Legacy System ${timestamp}`, color: '#EF4444' },
      { name: `Customer Portal ${timestamp}`, color: '#8B5CF6' }
    ]);

    // Create phases
    const phases = await this.createPhases([
      { name: 'Planning', description: 'Project planning phase', order_index: 1 },
      { name: 'Development', description: 'Development phase', order_index: 2 },
      { name: 'Testing', description: 'Testing phase', order_index: 3 }
    ]);

    // Create roles
    const roles = await this.createRoles([
      { name: 'Project Manager', description: 'Project management' },
      { name: 'Developer', description: 'Software development' }
    ]);

    // Create employees
    const employees = await this.createEmployees([
      {
        name: 'Search Test Owner',
        email: `search.owner.${timestamp}@test.com`,
        primary_role_id: roles[0].id,
        worker_type: 'FTE',
        default_availability_percentage: 100,
        default_hours_per_day: 8
      }
    ]);

    // Create projects with diverse names for search testing
    const projects = await this.createProjects([
      {
        name: 'Mobile Banking App',
        project_type_id: projectTypes[0].id,
        location_id: locations[0].id,
        priority: 1,
        description: 'Mobile banking application for customers',
        include_in_demand: true,
        aspiration_start: '2024-01-01',
        aspiration_finish: '2024-12-31',
        owner_id: employees[0].id
      },
      {
        name: 'E-commerce Platform Modernization',
        project_type_id: projectTypes[1].id,
        location_id: locations[1].id,
        priority: 2,
        description: 'Modernizing the e-commerce platform',
        include_in_demand: true,
        aspiration_start: '2024-02-01',
        aspiration_finish: '2024-11-30',
        owner_id: employees[0].id
      },
      {
        name: 'AI Customer Support Platform',
        project_type_id: projectTypes[2].id,
        location_id: locations[0].id,
        priority: 3,
        description: 'AI-powered customer support system',
        include_in_demand: true,
        aspiration_start: '2024-03-01',
        aspiration_finish: '2024-10-31',
        owner_id: employees[0].id
      },
      {
        name: 'Legacy System Migration',
        project_type_id: projectTypes[3].id,
        location_id: locations[1].id,
        priority: 4,
        description: 'Migrating legacy systems to cloud',
        include_in_demand: true,
        aspiration_start: '2024-04-01',
        aspiration_finish: '2024-09-30',
        owner_id: employees[0].id
      },
      {
        name: 'Customer Portal v2.0',
        project_type_id: projectTypes[4].id,
        location_id: locations[0].id,
        priority: 5,
        description: 'Next generation customer portal',
        include_in_demand: true,
        aspiration_start: '2024-05-01',
        aspiration_finish: '2024-08-31',
        owner_id: employees[0].id
      }
    ]);

    // Create some project phases for the projects
    const projectPhases = [];
    if (projects.length > 0 && phases.length > 0) {
      for (let i = 0; i < Math.min(3, projects.length); i++) {
        const project = projects[i];
        for (let j = 0; j < Math.min(2, phases.length); j++) {
          const phase = phases[j];
          const startDate = new Date(2024, i * 2, 1); // Spread across different months
          const endDate = new Date(2024, i * 2 + 1, 28);
          
          projectPhases.push({
            project_id: project.id,
            phase_id: phase.id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          });
        }
      }
    }

    const createdProjectPhases = await this.createProjectPhases(projectPhases);

    return {
      locations,
      projectTypes,
      phases,
      roles,
      employees,
      projects,
      projectPhases: createdProjectPhases,
      assignments: [],
      availabilityOverrides: [],
      allocations: []
    };
  }

  /**
   * Generate comprehensive test data for enterprise expansion scenario
   */
  async generateEnterpriseExpansionData(): Promise<TestScenarioData> {
    const locations = await this.createLocations([
      { name: 'San Francisco', code: 'SF' },
      { name: 'New York', code: 'NYC' },
      { name: 'London', code: 'LON' },
      { name: 'Berlin', code: 'BER' }
    ]);

    // Clean up any existing test data first
    console.log('🧹 Starting cleanup of existing test data...');
    await this.cleanupTestData();
    console.log('✅ Cleanup completed');
    
    const projectTypes = await this.createProjectTypes([
      { name: 'AI/ML Platform', color: '#3B82F6' },
      { name: 'Cloud Migration', color: '#10B981' },
      { name: 'Mobile Enhancement', color: '#F59E0B' },
      { name: 'Advanced Analytics', color: '#EF4444' },
      { name: 'Security Upgrade', color: '#8B5CF6' }
    ]);

    const phases = await this.createPhases([
      { name: 'Discovery', description: 'Initial research and planning' },
      { name: 'Design', description: 'Solution architecture and design' },
      { name: 'Development', description: 'Implementation and coding' },
      { name: 'Testing', description: 'Quality assurance and testing' },
      { name: 'Deployment', description: 'Production deployment' },
      { name: 'Support', description: 'Post-launch support and maintenance' }
    ]);

    const roles = await this.createRoles([
      { name: 'Senior Architect', description: 'Technical architecture lead' },
      { name: 'Lead Developer', description: 'Development team lead' },
      { name: 'DevOps Engineer', description: 'Infrastructure and deployment' },
      { name: 'Data Scientist', description: 'AI/ML and analytics expert' },
      { name: 'UX Designer', description: 'User experience design' },
      { name: 'Product Manager', description: 'Product strategy and roadmap' },
      { name: 'Security Specialist', description: 'Security and compliance' },
      { name: 'QA Engineer', description: 'Quality assurance and testing' }
    ]);

    // Create child project types for specialization
    const childProjectTypes = await this.createChildProjectTypes(projectTypes, [
      { parentName: 'AI/ML Platform', name: 'Computer Vision Platform', color: '#1E40AF', description: 'Specialized AI platform for computer vision applications' },
      { parentName: 'AI/ML Platform', name: 'NLP Processing Platform', color: '#3730A3', description: 'Natural language processing and text analysis platform' },
      { parentName: 'Cloud Migration', name: 'AWS Migration', color: '#047857', description: 'Migration to Amazon Web Services' },
      { parentName: 'Cloud Migration', name: 'Azure Migration', color: '#065F46', description: 'Migration to Microsoft Azure' },
      { parentName: 'Mobile Enhancement', name: 'iOS Performance', color: '#D97706', description: 'iOS-specific performance improvements' },
      { parentName: 'Mobile Enhancement', name: 'Android Performance', color: '#B45309', description: 'Android-specific performance improvements' }
    ]);

    // Create custom role allocations for parent project types
    for (const projectType of projectTypes) {
      if (projectType.name === 'AI/ML Platform') {
        await this.createRoleAllocations(projectType.id, phases, roles, [
          { phaseName: 'Discovery', roleName: 'Data Scientist', percentage: 40 },
          { phaseName: 'Discovery', roleName: 'Senior Architect', percentage: 30 },
          { phaseName: 'Discovery', roleName: 'Product Manager', percentage: 20 },
          { phaseName: 'Design', roleName: 'Senior Architect', percentage: 50 },
          { phaseName: 'Design', roleName: 'Data Scientist', percentage: 30 },
          { phaseName: 'Design', roleName: 'UX Designer', percentage: 20 },
          { phaseName: 'Development', roleName: 'Lead Developer', percentage: 40 },
          { phaseName: 'Development', roleName: 'Data Scientist', percentage: 35 },
          { phaseName: 'Development', roleName: 'DevOps Engineer', percentage: 15 },
          { phaseName: 'Testing', roleName: 'QA Engineer', percentage: 40 },
          { phaseName: 'Testing', roleName: 'Data Scientist', percentage: 30 },
          { phaseName: 'Testing', roleName: 'Lead Developer', percentage: 20 }
        ]);
      } else if (projectType.name === 'Cloud Migration') {
        await this.createRoleAllocations(projectType.id, phases, roles, [
          { phaseName: 'Discovery', roleName: 'Senior Architect', percentage: 50 },
          { phaseName: 'Discovery', roleName: 'Security Specialist', percentage: 30 },
          { phaseName: 'Discovery', roleName: 'Product Manager', percentage: 20 },
          { phaseName: 'Design', roleName: 'Senior Architect', percentage: 60 },
          { phaseName: 'Design', roleName: 'DevOps Engineer', percentage: 25 },
          { phaseName: 'Design', roleName: 'Security Specialist', percentage: 15 },
          { phaseName: 'Development', roleName: 'DevOps Engineer', percentage: 50 },
          { phaseName: 'Development', roleName: 'Lead Developer', percentage: 30 },
          { phaseName: 'Development', roleName: 'Security Specialist', percentage: 20 }
        ]);
      }
    }

    // Create custom allocations for some child project types to test overrides
    for (const childType of childProjectTypes) {
      if (childType.name === 'Computer Vision Platform') {
        await this.createRoleAllocations(childType.id, phases, roles, [
          { phaseName: 'Development', roleName: 'Data Scientist', percentage: 60 }, // Override: higher data scientist allocation
          { phaseName: 'Development', roleName: 'Lead Developer', percentage: 30 },
          { phaseName: 'Testing', roleName: 'Data Scientist', percentage: 50 }, // Override: higher testing involvement
          { phaseName: 'Testing', roleName: 'QA Engineer', percentage: 35 }
        ]);
      }
    }

    // All project types for projects creation (includes both parent and child)
    const allProjectTypes = [...projectTypes, ...childProjectTypes];

    // Generate employees with realistic hierarchy
    const employees = this.generateEmployees(locations, roles, 50);
    
    // Generate projects with complex requirements - use child project types only
    const projects = this.generateProjects(childProjectTypes, locations, employees, 8);
    
    // Generate project phases with overlapping timelines
    const projectPhases = this.generateProjectPhases(projects, phases);
    
    // Generate assignments with realistic conflicts
    const assignments = this.generateAssignments(projects, employees, roles, projectPhases);
    
    // Generate availability overrides (vacations, training, etc.)
    const availabilityOverrides = this.generateAvailabilityOverrides(employees);
    
    // Generate standard allocations (simplified for now)
    const allocations: any[] = [];

    return {
      locations,
      projectTypes: allProjectTypes, // Include both parent and child types
      phases,
      roles,
      employees,
      projects,
      projectPhases,
      assignments,
      availabilityOverrides,
      allocations
    };
  }

  /**
   * Generate agile product development scenario data
   */
  async generateAgileProductData(): Promise<TestScenarioData> {
    const locations = await this.createLocations([
      { name: 'Austin', code: 'AUS' },
      { name: 'Remote', code: 'REM' }
    ]);

    const projectTypes = await this.createProjectTypes([
      { name: 'Product Development', color: '#3B82F6' },
      { name: 'Platform Engineering', color: '#10B981' },
      { name: 'Technical Debt', color: '#F59E0B' }
    ]);

    const phases = await this.createPhases([
      { name: 'Sprint Planning', description: 'Sprint planning and estimation' },
      { name: 'Development', description: 'Feature development and coding' },
      { name: 'Code Review', description: 'Peer review and testing' },
      { name: 'QA Testing', description: 'Quality assurance testing' },
      { name: 'Deployment', description: 'Release and deployment' },
      { name: 'Retrospective', description: 'Sprint retrospective and planning' }
    ]);

    const roles = await this.createRoles([
      { name: 'Scrum Master', description: 'Agile process facilitator' },
      { name: 'Product Owner', description: 'Product requirements and priorities' },
      { name: 'Senior Developer', description: 'Senior software engineer' },
      { name: 'Frontend Developer', description: 'Frontend development specialist' },
      { name: 'Backend Developer', description: 'Backend development specialist' },
      { name: 'DevOps Engineer', description: 'CI/CD and infrastructure' },
      { name: 'QA Engineer', description: 'Quality assurance and testing' }
    ]);

    const employees = this.generateAgileTeamMembers(locations, roles, 30);
    const projects = this.generateAgileProjects(projectTypes, locations, employees, 8);
    const projectPhases = this.generateSprintPhases(projects, phases);
    const assignments = this.generateAgileAssignments(projects, employees, roles, projectPhases);
    const availabilityOverrides = this.generateSprintAvailability(employees);
    const allocations = this.generateAgileAllocations(projectTypes, phases, roles);

    return {
      locations,
      projectTypes,
      phases,
      roles,
      employees,
      projects,
      projectPhases,
      assignments,
      availabilityOverrides,
      allocations
    };
  }

  /**
   * Generate consulting services scenario data
   */
  async generateConsultingServicesData(): Promise<TestScenarioData> {
    const locations = await this.createLocations([
      { name: 'Chicago', code: 'CHI' },
      { name: 'Dallas', code: 'DAL' },
      { name: 'Client Sites', code: 'CLI' }
    ]);

    const projectTypes = await this.createProjectTypes([
      { name: 'Strategy Consulting', color: '#3B82F6' },
      { name: 'Technology Implementation', color: '#10B981' },
      { name: 'Process Optimization', color: '#F59E0B' },
      { name: 'Change Management', color: '#EF4444' }
    ]);

    const phases = await this.createPhases([
      { name: 'Proposal', description: 'Proposal development and presentation' },
      { name: 'Discovery', description: 'Current state assessment' },
      { name: 'Analysis', description: 'Gap analysis and recommendations' },
      { name: 'Design', description: 'Solution design and planning' },
      { name: 'Implementation', description: 'Solution implementation' },
      { name: 'Knowledge Transfer', description: 'Training and handover' }
    ]);

    const roles = await this.createRoles([
      { name: 'Partner', description: 'Senior partner and relationship owner' },
      { name: 'Principal', description: 'Principal consultant and project lead' },
      { name: 'Senior Manager', description: 'Senior manager and team lead' },
      { name: 'Manager', description: 'Manager and workstream lead' },
      { name: 'Senior Consultant', description: 'Senior consultant and analyst' },
      { name: 'Consultant', description: 'Consultant and analyst' },
      { name: 'Business Analyst', description: 'Business analyst and researcher' }
    ]);

    const employees = this.generateConsultingTeam(locations, roles, 40);
    const projects = this.generateConsultingProjects(projectTypes, locations, employees, 12);
    const projectPhases = this.generateConsultingPhases(projects, phases);
    const assignments = this.generateConsultingAssignments(projects, employees, roles, projectPhases);
    const availabilityOverrides = this.generateConsultingAvailability(employees);
    const allocations = this.generateConsultingAllocations(projectTypes, phases, roles);

    return {
      locations,
      projectTypes,
      phases,
      roles,
      employees,
      projects,
      projectPhases,
      assignments,
      availabilityOverrides,
      allocations
    };
  }

  // Helper methods for creating basic entities
  private async createLocations(locations: { name: string; code: string }[]): Promise<any[]> {
    const created = [];
    for (const location of locations) {
      const response = await this.request.post(`${this.baseURL}/api/locations`, {
        data: {
          name: location.name,
          description: `${location.name} office location`
        }
      });
      created.push(await response.json());
    }
    return created;
  }

  private async createProjectTypes(types: { name: string; color: string }[]): Promise<any[]> {
    const created = [];
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    
    for (const type of types) {
      try {
        // Generate unique name by adding timestamp suffix
        const uniqueName = `${type.name} ${timestamp}`;
        
        const response = await this.request.post(`${this.baseURL}/api/project-types`, {
          data: {
            name: uniqueName,
            color_code: type.color,
            description: `${type.name} project type`
          }
        });
        const result = await response.json();
        
        if (result.error) {
          console.error(`❌ Failed to create project type ${uniqueName}: ${result.error}`);
          throw new Error(`Failed to create project type ${uniqueName}: ${result.error}`);
        }
        
        created.push(result);
        console.log(`✅ Created project type: ${uniqueName} (id: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create project type ${type.name}:`, error);
        throw error;
      }
    }
    return created;
  }

  /**
   * Create child project types for existing parent types
   */
  private async createChildProjectTypes(parentTypes: any[], childConfigs: { parentName: string; name: string; color: string; description?: string }[]): Promise<any[]> {
    const created = [];
    const timestamp = Date.now().toString().slice(-6); // Same timestamp for consistency
    
    console.log(`📋 Available parent project types: ${parentTypes.map(p => `${p.name} (id: ${p.id})`).join(', ')}`);
    
    for (const config of childConfigs) {
      // Find parent by checking if the name starts with the expected parent name (to handle timestamp suffixes)
      const parent = parentTypes.find(p => p.name.startsWith(config.parentName));
      if (!parent) {
        console.warn(`❌ Parent project type "${config.parentName}" not found`);
        continue;
      }

      try {
        // Generate unique name by adding timestamp suffix
        const uniqueName = `${config.name} ${timestamp}`;
        
        const response = await this.request.post(`${this.baseURL}/api/project-types`, {
          data: {
            name: uniqueName,
            color_code: config.color,
            description: config.description || `${config.name} - specialized variant of ${parent.name}`,
            parent_id: parent.id
          }
        });
        const result = await response.json();
        
        if (result.error) {
          console.error(`❌ Failed to create child project type ${uniqueName}: ${result.error}`);
          throw new Error(`Failed to create child project type ${uniqueName}: ${result.error}`);
        }
        
        created.push(result);
        console.log(`✅ Created child project type: ${uniqueName} (parent: ${parent.name}) (id: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create child project type ${config.name}:`, error);
        throw error;
      }
    }
    
    return created;
  }

  /**
   * Create custom role allocations for project types
   */
  private async createRoleAllocations(projectTypeId: string, phases: any[], roles: any[], allocations: { phaseName: string; roleName: string; percentage: number }[]): Promise<any[]> {
    const created = [];
    
    for (const allocation of allocations) {
      const phase = phases.find(p => p.name === allocation.phaseName);
      const role = roles.find(r => r.name === allocation.roleName);
      
      if (!phase || !role) {
        console.warn(`Phase "${allocation.phaseName}" or role "${allocation.roleName}" not found`);
        continue;
      }

      const response = await this.request.post(`${this.baseURL}/api/resource-templates`, {
        data: {
          project_type_id: projectTypeId,
          phase_id: phase.id,
          role_id: role.id,
          allocation_percentage: allocation.percentage
        }
      });
      
      if (response.ok()) {
        created.push(await response.json());
      }
    }
    
    return created;
  }

  private async createPhases(phases: { name: string; description: string }[]): Promise<any[]> {
    const created = [];
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const response = await this.request.post(`${this.baseURL}/api/phases`, {
        data: {
          name: phase.name,
          description: phase.description,
          order_index: i + 1
        }
      });
      created.push(await response.json());
    }
    return created;
  }

  private async createRoles(roles: { name: string; description: string }[]): Promise<any[]> {
    const created = [];
    for (const role of roles) {
      const response = await this.request.post(`${this.baseURL}/api/roles`, {
        data: {
          name: role.name,
          description: role.description
        }
      });
      created.push(await response.json());
    }
    return created;
  }

  // Employee generation methods
  private generateEmployees(locations: any[], roles: any[], count: number): TestEmployee[] {
    const employees: TestEmployee[] = [];
    
    for (let i = 0; i < count; i++) {
      const role = faker.helpers.arrayElement(roles);
      
      employees.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        primary_role_id: role.id,
        worker_type: this.generateWorkerType(),
        default_availability_percentage: this.generateAvailability(),
        default_hours_per_day: faker.helpers.arrayElement([6, 7, 8])
      });
    }
    
    // Add supervisor relationships
    this.addSupervisorRelationships(employees);
    
    return employees;
  }

  private generateAgileTeamMembers(locations: any[], roles: any[], count: number): TestEmployee[] {
    const employees: TestEmployee[] = [];
    
    for (let i = 0; i < count; i++) {
      const role = faker.helpers.arrayElement(roles);
      
      employees.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        primary_role_id: role.id,
        worker_type: faker.helpers.arrayElement(['FTE', 'Contractor'] as const),
        default_availability_percentage: faker.number.int({ min: 85, max: 100 }),
        default_hours_per_day: 8
      });
    }
    
    return employees;
  }

  private generateConsultingTeam(locations: any[], roles: any[], count: number): TestEmployee[] {
    const employees: TestEmployee[] = [];
    const practices = ['Strategy', 'Technology', 'Operations', 'Change Management'];
    
    for (let i = 0; i < count; i++) {
      const location = faker.helpers.arrayElement(locations);
      const role = faker.helpers.arrayElement(roles);
      const practice = faker.helpers.arrayElement(practices);
      
      employees.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        title: `${role.name} - ${practice}`,
        department: practice,
        location_id: location.id,
        primary_role_id: role.id,
        worker_type: faker.helpers.arrayElement(['FTE', 'CONTRACT']),
        default_availability_percentage: this.generateConsultingAvailabilityPercentage(role.name || 'Consultant'),
        default_hours_per_day: faker.helpers.arrayElement([7, 8, 9]),
        start_date: faker.date.between({ from: '2023-01-01', to: '2024-06-01' }).toISOString().split('T')[0],
        utilization_target: this.generateConsultingUtilizationTarget(role.name || 'Consultant')
      });
    }
    
    return employees;
  }

  // Project generation methods
  private generateProjects(projectTypes: any[], locations: any[], employees: TestEmployee[], count: number): TestProject[] {
    const projects: TestProject[] = [];
    const projectNames = [
      'AI-Powered Analytics Platform',
      'Cloud Infrastructure Modernization',
      'Mobile App Performance Enhancement',
      'Data Lake Implementation',
      'Security Compliance Upgrade'
    ];
    
    if (projectTypes.length === 0) {
      console.warn('❌ No project types available for generating projects');
      return [];
    }

    for (let i = 0; i < count; i++) {
      const projectType = faker.helpers.arrayElement(projectTypes);
      const location = faker.helpers.arrayElement(locations);
      const owner = faker.helpers.arrayElement(employees);
      
      const startDate = faker.date.between({ from: '2025-01-01', to: '2025-06-01' });
      const endDate = faker.date.between({ from: startDate, to: '2026-12-31' });
      
      projects.push({
        name: projectNames[i] || faker.company.name() + ' Project',
        project_type_id: projectType.id,
        location_id: location.id,
        priority: faker.number.int({ min: 1, max: 4 }),
        description: faker.lorem.paragraph(),
        include_in_demand: faker.datatype.boolean(),
        aspiration_start: startDate.toISOString().split('T')[0],
        aspiration_finish: endDate.toISOString().split('T')[0],
        owner_id: owner.id || faker.string.uuid()
      });
    }
    
    return projects;
  }

  private generateAgileProjects(projectTypes: any[], locations: any[], employees: TestEmployee[], count: number): TestProject[] {
    const projects: TestProject[] = [];
    const features = [
      'User Authentication System',
      'Payment Processing Module',
      'Real-time Chat Feature',
      'Advanced Search Functionality',
      'Mobile Responsive Design',
      'API Gateway Enhancement',
      'Data Visualization Dashboard',
      'Performance Monitoring'
    ];
    
    if (projectTypes.length === 0) {
      console.warn('❌ No project types available for generating projects');
      return [];
    }

    for (let i = 0; i < count; i++) {
      const projectType = faker.helpers.arrayElement(projectTypes);
      const location = faker.helpers.arrayElement(locations);
      const owner = faker.helpers.arrayElement(employees);
      
      const startDate = faker.date.between({ from: '2025-01-01', to: '2025-03-01' });
      const endDate = faker.date.between({ from: startDate, to: '2025-08-31' });
      
      projects.push({
        name: features[i] || faker.hacker.phrase(),
        project_type_id: projectType.id,
        location_id: location.id,
        priority: faker.number.int({ min: 1, max: 3 }),
        description: faker.lorem.sentence(),
        include_in_demand: true,
        aspiration_start: startDate.toISOString().split('T')[0],
        aspiration_finish: endDate.toISOString().split('T')[0],
        owner_id: owner.id || faker.string.uuid()
      });
    }
    
    return projects;
  }

  private generateConsultingProjects(projectTypes: any[], locations: any[], employees: TestEmployee[], count: number): TestProject[] {
    const projects: TestProject[] = [];
    const clientProjects = [
      'Digital Transformation Strategy',
      'ERP Implementation',
      'Process Optimization Initiative',
      'Organizational Change Management',
      'Technology Roadmap Development',
      'Operational Excellence Program',
      'Customer Experience Enhancement',
      'Data Analytics Platform',
      'Supply Chain Optimization',
      'Merger Integration Support',
      'Regulatory Compliance Assessment',
      'IT Strategy and Governance'
    ];
    
    for (let i = 0; i < count; i++) {
      const projectType = faker.helpers.arrayElement(projectTypes);
      const location = faker.helpers.arrayElement(locations);
      const seniorEmployees = employees.filter(e => e.title?.includes('Partner') || e.title?.includes('Principal'));
      const owner = seniorEmployees.length > 0 
        ? faker.helpers.arrayElement(seniorEmployees)
        : faker.helpers.arrayElement(employees);
      
      const startDate = faker.date.between({ from: '2025-01-01', to: '2025-04-01' });
      const duration = faker.number.int({ min: 2, max: 18 }); // 2-18 months
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
      
      projects.push({
        name: clientProjects[i] || faker.company.name() + ' Engagement',
        project_type_id: projectType.id,
        location_id: location.id,
        priority: faker.number.int({ min: 1, max: 3 }),
        description: faker.lorem.paragraph(),
        include_in_demand: true,
        aspiration_start: startDate.toISOString().split('T')[0],
        aspiration_finish: endDate.toISOString().split('T')[0],
        owner_id: owner?.id || faker.string.uuid()
      });
    }
    
    return projects;
  }

  // Helper methods for specific data generation
  private generateTitle(roleName: string, isSenior: boolean): string {
    const seniority = isSenior ? 'Senior ' : '';
    return `${seniority}${roleName}`;
  }

  private generateWorkerType(): 'FTE' | 'Contractor' | 'Consultant' {
    return faker.helpers.weightedArrayElement([
      { weight: 70, value: 'FTE' },
      { weight: 25, value: 'Contractor' },
      { weight: 5, value: 'Consultant' }
    ]);
  }

  private generateAvailability(): number {
    return faker.helpers.weightedArrayElement([
      { weight: 60, value: 100 },
      { weight: 20, value: 80 },
      { weight: 15, value: 90 },
      { weight: 5, value: 50 }
    ]);
  }

  private generateConsultingAvailabilityPercentage(roleName: string): number {
    // Senior roles have more non-billable time
    if (roleName && (roleName.includes('Partner') || roleName.includes('Principal'))) {
      return faker.number.int({ min: 60, max: 75 });
    }
    return faker.number.int({ min: 80, max: 95 });
  }

  private generateConsultingUtilizationTarget(roleName: string): number {
    // Higher utilization targets for junior roles
    if (roleName && (roleName.includes('Analyst') || roleName.includes('Consultant'))) {
      return faker.number.int({ min: 85, max: 95 });
    }
    return faker.number.int({ min: 70, max: 85 });
  }

  private addSupervisorRelationships(employees: TestEmployee[]): void {
    // Simple hierarchy: first 20% are managers, rest report to them
    const managerCount = Math.floor(employees.length * 0.2);
    const managers = employees.slice(0, managerCount);
    const reports = employees.slice(managerCount);
    
    reports.forEach(employee => {
      employee.supervisor_id = faker.helpers.arrayElement(managers).id;
    });
  }

  // Phase generation methods
  private generateProjectPhases(projects: TestProject[], phases: any[]): TestProjectPhase[] {
    const projectPhases: TestProjectPhase[] = [];
    
    projects.forEach(project => {
      const startDate = new Date(project.aspiration_start);
      const endDate = new Date(project.aspiration_finish);
      const totalDuration = endDate.getTime() - startDate.getTime();
      
      // Use 4-6 phases per project
      const selectedPhases = faker.helpers.arrayElements(phases, faker.number.int({ min: 4, max: 6 }));
      const phaseDuration = totalDuration / selectedPhases.length;
      
      selectedPhases.forEach((phase, index) => {
        const phaseStart = new Date(startDate.getTime() + (index * phaseDuration));
        const phaseEnd = new Date(startDate.getTime() + ((index + 1) * phaseDuration));
        
        projectPhases.push({
          project_id: project.id!,
          phase_id: phase.id,
          start_date: phaseStart.toISOString().split('T')[0],
          end_date: phaseEnd.toISOString().split('T')[0]
        });
      });
    });
    
    return projectPhases;
  }

  private generateSprintPhases(projects: TestProject[], phases: any[]): TestProjectPhase[] {
    const projectPhases: TestProjectPhase[] = [];
    
    projects.forEach(project => {
      const startDate = new Date(project.aspiration_start);
      const endDate = new Date(project.aspiration_finish);
      const sprintLength = 14; // 2 weeks
      
      let currentDate = startDate;
      let sprintNumber = 1;
      
      while (currentDate < endDate) {
        const sprintEnd = new Date(currentDate);
        sprintEnd.setDate(sprintEnd.getDate() + sprintLength);
        
        if (sprintEnd > endDate) {
          sprintEnd.setTime(endDate.getTime());
        }
        
        // Each sprint has development and testing phases
        const devPhase = phases.find(p => p.name === 'Development');
        const testPhase = phases.find(p => p.name === 'QA Testing');
        
        if (devPhase) {
          projectPhases.push({
            project_id: project.id!,
            phase_id: devPhase.id,
            start_date: currentDate.toISOString().split('T')[0],
            end_date: sprintEnd.toISOString().split('T')[0]
          });
        }
        
        if (testPhase) {
          const testStart = new Date(currentDate);
          testStart.setDate(testStart.getDate() + 10); // Testing starts 10 days into sprint
          
          projectPhases.push({
            project_id: project.id!,
            phase_id: testPhase.id,
            start_date: testStart.toISOString().split('T')[0],
            end_date: sprintEnd.toISOString().split('T')[0]
          });
        }
        
        currentDate = new Date(sprintEnd);
        currentDate.setDate(currentDate.getDate() + 1);
        sprintNumber++;
      }
    });
    
    return projectPhases;
  }

  private generateConsultingPhases(projects: TestProject[], phases: any[]): TestProjectPhase[] {
    const projectPhases: TestProjectPhase[] = [];
    
    projects.forEach(project => {
      const startDate = new Date(project.aspiration_start);
      const endDate = new Date(project.aspiration_finish);
      const totalDuration = endDate.getTime() - startDate.getTime();
      
      // Consulting projects typically follow a structured approach
      const consultingPhases = phases.filter(p => 
        ['Proposal', 'Discovery', 'Analysis', 'Design', 'Implementation', 'Knowledge Transfer'].includes(p.name)
      );
      
      const phaseWeights = [0.1, 0.2, 0.25, 0.2, 0.15, 0.1]; // Percentage of total duration
      let currentStart = startDate;
      
      consultingPhases.forEach((phase, index) => {
        const phaseDuration = totalDuration * phaseWeights[index];
        const phaseEnd = new Date(currentStart.getTime() + phaseDuration);
        
        projectPhases.push({
          project_id: project.id!,
          phase_id: phase.id,
          start_date: currentStart.toISOString().split('T')[0],
          end_date: phaseEnd.toISOString().split('T')[0]
        });
        
        currentStart = new Date(phaseEnd);
      });
    });
    
    return projectPhases;
  }

  // Assignment generation methods
  private generateAssignments(
    projects: TestProject[], 
    employees: TestEmployee[], 
    roles: any[], 
    projectPhases: TestProjectPhase[]
  ): TestAssignment[] {
    const assignments: TestAssignment[] = [];
    
    projects.forEach(project => {
      const projectPhases_filtered = projectPhases.filter(pp => pp.project_id === project.id);
      
      projectPhases_filtered.forEach(projectPhase => {
        const rolesNeeded = faker.helpers.arrayElements(roles, faker.number.int({ min: 2, max: 4 }));
        
        rolesNeeded.forEach(role => {
          const availableEmployees = employees.filter(e => e.primary_role_id === role.id);
          if (availableEmployees.length > 0) {
            const employee = faker.helpers.arrayElement(availableEmployees);
            
            assignments.push({
              project_id: project.id!,
              person_id: employee.id!,
              role_id: role.id,
              phase_id: projectPhase.phase_id,
              start_date: projectPhase.start_date,
              end_date: projectPhase.end_date,
              allocation_percentage: this.generateAllocationPercentage(role.name)
            });
          }
        });
      });
    });
    
    return assignments;
  }

  private generateAgileAssignments(
    projects: TestProject[], 
    employees: TestEmployee[], 
    roles: any[], 
    projectPhases: TestProjectPhase[]
  ): TestAssignment[] {
    const assignments: TestAssignment[] = [];
    
    projects.forEach(project => {
      const projectPhases_filtered = projectPhases.filter(pp => pp.project_id === project.id);
      
      // Agile teams are more consistent across sprints
      const teamRoles = ['Product Owner', 'Scrum Master', 'Senior Developer', 'Frontend Developer', 'Backend Developer', 'QA Engineer'];
      const teamMembers = new Map<string, TestEmployee>();
      
      // Assign consistent team members
      teamRoles.forEach(roleName => {
        const role = roles.find(r => r.name === roleName);
        if (role) {
          const availableEmployees = employees.filter(e => e.primary_role_id === role.id);
          if (availableEmployees.length > 0) {
            teamMembers.set(roleName, faker.helpers.arrayElement(availableEmployees));
          }
        }
      });
      
      projectPhases_filtered.forEach(projectPhase => {
        teamMembers.forEach((employee, roleName) => {
          const role = roles.find(r => r.name === roleName);
          if (role) {
            assignments.push({
              project_id: project.id!,
              person_id: employee.id!,
              role_id: role.id,
              phase_id: projectPhase.phase_id,
              start_date: projectPhase.start_date,
              end_date: projectPhase.end_date,
              allocation_percentage: this.generateAgileAllocationPercentage(roleName)
            });
          }
        });
      });
    });
    
    return assignments;
  }

  private generateConsultingAssignments(
    projects: TestProject[], 
    employees: TestEmployee[], 
    roles: any[], 
    projectPhases: TestProjectPhase[]
  ): TestAssignment[] {
    const assignments: TestAssignment[] = [];
    
    projects.forEach(project => {
      const projectPhases_filtered = projectPhases.filter(pp => pp.project_id === project.id);
      
      // Consulting engagements have different staffing by phase
      projectPhases_filtered.forEach(projectPhase => {
        const phase = projectPhase.phase_id;
        const rolesForPhase = this.getConsultingRolesForPhase(phase, roles);
        
        rolesForPhase.forEach(({ role, allocation }) => {
          const availableEmployees = employees.filter(e => e.primary_role_id === role.id);
          if (availableEmployees.length > 0) {
            const employee = faker.helpers.arrayElement(availableEmployees);
            
            assignments.push({
              project_id: project.id!,
              person_id: employee.id!,
              role_id: role.id,
              phase_id: projectPhase.phase_id,
              start_date: projectPhase.start_date,
              end_date: projectPhase.end_date,
              allocation_percentage: allocation
            });
          }
        });
      });
    });
    
    return assignments;
  }

  // Availability override generation
  private generateAvailabilityOverrides(employees: TestEmployee[]): TestAvailabilityOverride[] {
    const overrides: TestAvailabilityOverride[] = [];
    
    employees.forEach(employee => {
      // Generate 1-3 availability overrides per employee
      const overrideCount = faker.number.int({ min: 1, max: 3 });
      
      for (let i = 0; i < overrideCount; i++) {
        const startDate = faker.date.between({ from: '2025-01-01', to: '2025-10-01' });
        const duration = faker.number.int({ min: 1, max: 14 }); // 1-14 days
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        
        const overrideType = faker.helpers.arrayElement(['VACATION', 'SICK', 'TRAINING', 'CONFERENCE', 'PERSONAL']);
        
        overrides.push({
          person_id: employee.id!,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          availability_percentage: this.getAvailabilityPercentageForType(overrideType),
          hours_per_day: overrideType === 'TRAINING' ? 6 : undefined,
          reason: this.getReasonForOverrideType(overrideType),
          override_type: overrideType
        });
      }
    });
    
    return overrides;
  }

  private generateSprintAvailability(employees: TestEmployee[]): TestAvailabilityOverride[] {
    const overrides: TestAvailabilityOverride[] = [];
    
    employees.forEach(employee => {
      // Sprint ceremonies and training
      const ceremonyDate = faker.date.between({ from: '2025-01-01', to: '2025-06-01' });
      const trainingDate = faker.date.between({ from: '2025-03-01', to: '2025-08-01' });
      
      // Sprint ceremony time (planning, review, retrospective)
      overrides.push({
        person_id: employee.id!,
        start_date: ceremonyDate.toISOString().split('T')[0],
        end_date: ceremonyDate.toISOString().split('T')[0],
        availability_percentage: 50,
        hours_per_day: 4,
        reason: 'Sprint ceremonies and planning',
        override_type: 'TRAINING'
      });
      
      // Technical training
      const trainingEnd = new Date(trainingDate);
      trainingEnd.setDate(trainingEnd.getDate() + 2);
      
      overrides.push({
        person_id: employee.id!,
        start_date: trainingDate.toISOString().split('T')[0],
        end_date: trainingEnd.toISOString().split('T')[0],
        availability_percentage: 70,
        hours_per_day: 6,
        reason: 'Technical training and upskilling',
        override_type: 'TRAINING'
      });
    });
    
    return overrides;
  }

  private generateConsultingAvailability(employees: TestEmployee[]): TestAvailabilityOverride[] {
    const overrides: TestAvailabilityOverride[] = [];
    
    employees.forEach(employee => {
      // Consulting-specific availability patterns
      const proposalDate = faker.date.between({ from: '2025-01-01', to: '2025-11-01' });
      const conferenceDate = faker.date.between({ from: '2025-04-01', to: '2025-09-01' });
      
      // Proposal development (non-billable time)
      overrides.push({
        person_id: employee.id!,
        start_date: proposalDate.toISOString().split('T')[0],
        end_date: proposalDate.toISOString().split('T')[0],
        availability_percentage: 50,
        hours_per_day: 4,
        reason: 'Proposal development and client meetings',
        override_type: 'PERSONAL'
      });
      
      // Industry conference
      const conferenceEnd = new Date(conferenceDate);
      conferenceEnd.setDate(conferenceEnd.getDate() + 3);
      
      overrides.push({
        person_id: employee.id!,
        start_date: conferenceDate.toISOString().split('T')[0],
        end_date: conferenceEnd.toISOString().split('T')[0],
        availability_percentage: 0,
        reason: 'Industry conference and networking',
        override_type: 'CONFERENCE'
      });
    });
    
    return overrides;
  }

  // Standard allocation generation
  private generateStandardAllocations(projectTypes: any[], phases: any[], roles: any[]): any[] {
    const allocations: any[] = [];
    
    projectTypes.forEach(projectType => {
      phases.forEach(phase => {
        roles.forEach(role => {
          const allocation = this.getStandardAllocation(projectType.name, phase.name, role.name);
          if (allocation > 0) {
            allocations.push({
              project_type_id: projectType.id,
              phase_id: phase.id,
              role_id: role.id,
              allocation_percentage: allocation
            });
          }
        });
      });
    });
    
    return allocations;
  }

  private generateAgileAllocations(projectTypes: any[], phases: any[], roles: any[]): any[] {
    const allocations: any[] = [];
    
    const agileAllocations = {
      'Sprint Planning': {
        'Scrum Master': 80,
        'Product Owner': 60,
        'Senior Developer': 20,
        'Frontend Developer': 20,
        'Backend Developer': 20,
        'QA Engineer': 10
      },
      'Development': {
        'Scrum Master': 20,
        'Product Owner': 30,
        'Senior Developer': 90,
        'Frontend Developer': 100,
        'Backend Developer': 100,
        'QA Engineer': 40
      },
      'QA Testing': {
        'QA Engineer': 100,
        'Senior Developer': 30,
        'Frontend Developer': 20,
        'Backend Developer': 20
      }
    };
    
    projectTypes.forEach(projectType => {
      phases.forEach(phase => {
        roles.forEach(role => {
          const phaseAllocations = agileAllocations[phase.name as keyof typeof agileAllocations];
          if (phaseAllocations) {
            const allocation = phaseAllocations[role.name as keyof typeof phaseAllocations];
            if (allocation) {
              allocations.push({
                project_type_id: projectType.id,
                phase_id: phase.id,
                role_id: role.id,
                allocation_percentage: allocation
              });
            }
          }
        });
      });
    });
    
    return allocations;
  }

  private generateConsultingAllocations(projectTypes: any[], phases: any[], roles: any[]): any[] {
    const allocations: any[] = [];
    
    const consultingAllocations = {
      'Proposal': {
        'Partner': 30,
        'Principal': 60,
        'Senior Manager': 40,
        'Manager': 20
      },
      'Discovery': {
        'Principal': 50,
        'Senior Manager': 80,
        'Manager': 90,
        'Senior Consultant': 100,
        'Consultant': 80
      },
      'Analysis': {
        'Principal': 40,
        'Senior Manager': 70,
        'Manager': 80,
        'Senior Consultant': 100,
        'Consultant': 100,
        'Business Analyst': 100
      },
      'Implementation': {
        'Principal': 30,
        'Senior Manager': 60,
        'Manager': 90,
        'Senior Consultant': 100,
        'Consultant': 100
      },
      'Knowledge Transfer': {
        'Principal': 20,
        'Senior Manager': 40,
        'Manager': 70,
        'Senior Consultant': 80,
        'Consultant': 60
      }
    };
    
    projectTypes.forEach(projectType => {
      phases.forEach(phase => {
        roles.forEach(role => {
          const phaseAllocations = consultingAllocations[phase.name as keyof typeof consultingAllocations];
          if (phaseAllocations) {
            const allocation = phaseAllocations[role.name as keyof typeof phaseAllocations];
            if (allocation) {
              allocations.push({
                project_type_id: projectType.id,
                phase_id: phase.id,
                role_id: role.id,
                allocation_percentage: allocation
              });
            }
          }
        });
      });
    });
    
    return allocations;
  }

  // Helper methods for allocation and availability
  private generateAllocationPercentage(roleName: string): number {
    const roleAllocations = {
      'Senior Architect': () => faker.number.int({ min: 40, max: 80 }),
      'Lead Developer': () => faker.number.int({ min: 60, max: 100 }),
      'DevOps Engineer': () => faker.number.int({ min: 30, max: 70 }),
      'Data Scientist': () => faker.number.int({ min: 50, max: 90 }),
      'UX Designer': () => faker.number.int({ min: 40, max: 80 }),
      'Product Manager': () => faker.number.int({ min: 30, max: 60 }),
      'Security Specialist': () => faker.number.int({ min: 20, max: 50 }),
      'QA Engineer': () => faker.number.int({ min: 50, max: 100 })
    };
    
    const generator = roleAllocations[roleName as keyof typeof roleAllocations];
    return generator ? generator() : faker.number.int({ min: 40, max: 80 });
  }

  private generateAgileAllocationPercentage(roleName: string): number {
    const agileAllocations = {
      'Product Owner': () => faker.number.int({ min: 40, max: 60 }),
      'Scrum Master': () => faker.number.int({ min: 30, max: 50 }),
      'Senior Developer': () => faker.number.int({ min: 70, max: 100 }),
      'Frontend Developer': () => faker.number.int({ min: 80, max: 100 }),
      'Backend Developer': () => faker.number.int({ min: 80, max: 100 }),
      'DevOps Engineer': () => faker.number.int({ min: 40, max: 70 }),
      'QA Engineer': () => faker.number.int({ min: 60, max: 90 })
    };
    
    const generator = agileAllocations[roleName as keyof typeof agileAllocations];
    return generator ? generator() : faker.number.int({ min: 50, max: 80 });
  }

  private getConsultingRolesForPhase(phaseId: string, roles: any[]): { role: any; allocation: number }[] {
    // This would need to be implemented based on the actual phase IDs
    // For now, return a default set
    return roles.map(role => ({
      role,
      allocation: faker.number.int({ min: 30, max: 90 })
    }));
  }

  private getStandardAllocation(projectType: string, phase: string, role: string): number {
    // Default allocation matrix - this would be customized based on actual business rules
    const baseAllocation = faker.number.int({ min: 20, max: 80 });
    
    // Adjust based on project type
    let multiplier = 1;
    if (projectType && role) {
      if (projectType.includes('AI/ML') && role.includes('Data')) multiplier = 1.5;
      if (projectType.includes('Mobile') && role.includes('UX')) multiplier = 1.3;
      if (projectType.includes('Security') && role.includes('Security')) multiplier = 1.4;
    }
    
    return Math.min(100, Math.round(baseAllocation * multiplier));
  }

  private getAvailabilityPercentageForType(type: string): number {
    const availabilityMap = {
      'VACATION': 0,
      'SICK': 0,
      'TRAINING': 50,
      'CONFERENCE': 0,
      'PERSONAL': 30
    };
    
    return availabilityMap[type as keyof typeof availabilityMap] || 0;
  }

  private getReasonForOverrideType(type: string): string {
    const reasonMap = {
      'VACATION': 'Annual leave',
      'SICK': 'Sick leave',
      'TRAINING': 'Professional development training',
      'CONFERENCE': 'Industry conference attendance',
      'PERSONAL': 'Personal time off'
    };
    
    return reasonMap[type as keyof typeof reasonMap] || 'Time off';
  }

  /**
   * Generate simple test data for project roadmap testing
   */
  async generateProjectRoadmapData(): Promise<TestScenarioData> {
    // Clean up any existing test data first
    console.log('🧹 Starting cleanup of existing test data...');
    await this.cleanupTestData();
    console.log('✅ Cleanup completed');
    
    // Create minimal data structures to test the roadmap UI
    const locations = await this.createLocations([
      { name: 'Seattle', code: 'SEA' }
    ]);

    // Create parent project type first
    const parentProjectTypes = await this.createProjectTypes([
      { name: 'Web Platform', color: '#3B82F6' }
    ]);
    
    // Create child project type (required for projects)
    const projectTypes = await this.createChildProjectTypes(parentProjectTypes, [
      { 
        parentName: 'Web Platform', 
        name: 'Frontend Development', 
        color: '#1E40AF', 
        description: 'Frontend web application development' 
      }
    ]);

    const phases = await this.createPhases([
      { name: 'Planning', description: 'Project planning and requirements' },
      { name: 'Development', description: 'Active development work' }
    ]);

    const roles = await this.createRoles([
      { name: 'Developer', description: 'Software development' }
    ]);

    // Create a simple employee for project ownership
    const simpleEmployee = {
      name: 'Test Owner',
      email: 'test@example.com',
      primary_role_id: roles[0].id,
      worker_type: 'FTE' as const,
      default_availability_percentage: 100,
      default_hours_per_day: 8
    };

    const employees = await this.createEmployees([simpleEmployee]);
    
    // Create a simple project
    if (employees.length > 0) {
      const simpleProject = {
        name: 'Test Roadmap Project',
        project_type_id: parentProjectTypes[0].id,
        project_sub_type_id: projectTypes[0].id,
        location_id: locations[0].id,
        priority: 1,
        description: 'Test project for roadmap',
        include_in_demand: true,
        aspiration_start: '2025-01-01',
        aspiration_finish: '2025-06-30',
        owner_id: employees[0].id
      };

      const projects = await this.createProjects([simpleProject]);
      
      // Create simple project phases
      if (projects.length > 0) {
        const simplePhases = [
          {
            project_id: projects[0].id,
            phase_id: phases[0].id,
            start_date: '2025-01-01',
            end_date: '2025-03-31'
          },
          {
            project_id: projects[0].id,
            phase_id: phases[1].id,
            start_date: '2025-04-01',
            end_date: '2025-06-30'
          }
        ];
        
        const projectPhases = await this.createProjectPhases(simplePhases);
        
        return {
          locations,
          projectTypes,
          phases,
          roles,
          employees,
          projects,
          projectPhases,
          assignments: [],
          availabilityOverrides: [],
          allocations: []
        };
      }
    }

    // Return minimal structure if creation fails
    return {
      locations,
      projectTypes,
      phases,
      roles,
      employees: [],
      projects: [],
      projectPhases: [],
      assignments: [],
      availabilityOverrides: [],
      allocations: []
    };
  }

  /**
   * Generate projects with roadmap-friendly timelines
   */
  private generateRoadmapProjects(projectTypes: any[], locations: any[], employees: TestEmployee[], count: number): TestProject[] {
    const projects: TestProject[] = [];
    const projectNames = [
      'Customer Portal Redesign',
      'Mobile Performance Optimization',
      'Analytics Dashboard',
      'API Gateway Migration',
      'Real-time Notifications'
    ];
    
    if (projectTypes.length === 0) {
      console.warn('❌ No project types available for generating roadmap projects');
      return [];
    }

    for (let i = 0; i < count; i++) {
      const projectType = faker.helpers.arrayElement(projectTypes);
      const location = faker.helpers.arrayElement(locations);
      const owner = faker.helpers.arrayElement(employees);
      
      // Create projects with staggered start dates across 2025
      const monthOffset = i * 2; // Projects start 2 months apart
      const startDate = new Date(2025, monthOffset, 1);
      const duration = faker.number.int({ min: 3, max: 8 }); // 3-8 months
      const endDate = new Date(2025, monthOffset + duration, 0); // End of month
      
      projects.push({
        name: projectNames[i] || faker.company.buzzPhrase(),
        project_type_id: projectType.id,
        location_id: location.id,
        priority: faker.number.int({ min: 1, max: 3 }),
        description: faker.lorem.sentence(),
        include_in_demand: true,
        aspiration_start: startDate.toISOString().split('T')[0],
        aspiration_finish: endDate.toISOString().split('T')[0],
        owner_id: owner.id || faker.string.uuid()
      });
    }
    
    return projects;
  }

  /**
   * Generate project phases with roadmap-friendly timelines
   */
  private generateRoadmapPhases(projects: TestProject[], phases: any[]): TestProjectPhase[] {
    const projectPhases: TestProjectPhase[] = [];
    
    projects.forEach(project => {
      const startDate = new Date(project.aspiration_start);
      const endDate = new Date(project.aspiration_finish);
      const totalDuration = endDate.getTime() - startDate.getTime();
      
      // Use all 4 phases in sequence
      const phaseDuration = totalDuration / phases.length;
      
      phases.forEach((phase, index) => {
        const phaseStart = new Date(startDate.getTime() + (index * phaseDuration));
        const phaseEnd = new Date(startDate.getTime() + ((index + 1) * phaseDuration));
        
        projectPhases.push({
          project_id: project.id!,
          phase_id: phase.id,
          start_date: phaseStart.toISOString().split('T')[0],
          end_date: phaseEnd.toISOString().split('T')[0]
        });
      });
    });
    
    return projectPhases;
  }

  // API creation methods for roadmap data
  private async createEmployees(employees: TestEmployee[]): Promise<TestEmployee[]> {
    const created = [];
    for (const employee of employees) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/people`, {
          data: employee
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create employee ${employee.name}: ${result.error}`);
          continue;
        }
        created.push(result);
        console.log(`✅ Created employee: ${employee.name} (id: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create employee ${employee.name}:`, error);
      }
    }
    return created;
  }

  private async createProjects(projects: TestProject[]): Promise<TestProject[]> {
    const created = [];
    for (const project of projects) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/projects`, {
          data: project
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create project ${project.name}: ${result.error}`);
          continue;
        }
        created.push(result);
        console.log(`✅ Created project: ${project.name} (id: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create project ${project.name}:`, error);
      }
    }
    return created;
  }

  private async createProjectPhases(projectPhases: TestProjectPhase[]): Promise<TestProjectPhase[]> {
    const created = [];
    for (const projectPhase of projectPhases) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/project-phases`, {
          data: projectPhase
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create project phase: ${result.error}`);
          continue;
        }
        created.push(result);
        console.log(`✅ Created project phase for project ${projectPhase.project_id}`);
      } catch (error) {
        console.error(`❌ Failed to create project phase:`, error);
      }
    }
    return created;
  }

  private async createAssignments(assignments: TestAssignment[]): Promise<TestAssignment[]> {
    const created = [];
    for (const assignment of assignments) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/assignments`, {
          data: assignment
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create assignment: ${result.error}`);
          continue;
        }
        created.push(result);
      } catch (error) {
        console.error(`❌ Failed to create assignment:`, error);
      }
    }
    return created;
  }

  private async createAvailabilityOverrides(overrides: TestAvailabilityOverride[]): Promise<TestAvailabilityOverride[]> {
    const created = [];
    for (const override of overrides) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/availability-overrides`, {
          data: override
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create availability override: ${result.error}`);
          continue;
        }
        created.push(result);
      } catch (error) {
        console.error(`❌ Failed to create availability override:`, error);
      }
    }
    return created;
  }

  private async createAllocations(allocations: any[]): Promise<any[]> {
    const created = [];
    for (const allocation of allocations) {
      try {
        const response = await this.request.post(`${this.baseURL}/api/allocations`, {
          data: allocation
        });
        const result = await response.json();
        if (result.error) {
          console.error(`❌ Failed to create allocation: ${result.error}`);
          continue;
        }
        created.push(result);
      } catch (error) {
        console.error(`❌ Failed to create allocation:`, error);
      }
    }
    return created;
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData(): Promise<void> {
    // Delete in reverse order of dependencies
    const entities = [
      'assignments',
      'project-phases',
      'allocations',
      'availability-overrides',
      'projects',
      'people',
      'roles',
      'phases',
      'project-types',
      'locations'
    ];
    
    for (const entity of entities) {
      try {
        console.log(`🧹 Cleaning up ${entity}...`);
        let response;
        
        // Some entities have test-data endpoints on their controllers
        if (['assignments', 'people', 'projects'].includes(entity)) {
          response = await this.request.delete(`${this.baseURL}/api/${entity}/test-data`);
        } else {
          // Other entities use the centralized test-data cleanup endpoints
          response = await this.request.delete(`${this.baseURL}/api/test-data/${entity}`);
        }
        
        if (response.ok()) {
          const result = await response.json();
          console.log(`✅ ${entity}: ${result.message}`);
        } else {
          console.warn(`⚠️  ${entity}: ${response.status()} - ${response.statusText()}`);
        }
      } catch (error) {
        console.warn(`❌ Failed to cleanup ${entity}:`, error);
      }
    }
  }

  /**
   * Alias for cleanupTestData for backward compatibility
   */
  async cleanup(): Promise<void> {
    await this.cleanupTestData();
  }

  /**
   * Reset test data - wrapper for backwards compatibility
   */
  async resetTestData(): Promise<void> {
    await this.cleanupTestData();
  }

  /**
   * Create a simple test project with basic requirements
   */
  async createTestProject(config: {
    name: string;
    projectType: string;
    location: string;
    priority?: number;
  }): Promise<{ id: string; name: string }> {
    // First get available project types and locations
    const projectTypesResponse = await this.request.get(`${this.baseURL}/api/project-types`);
    const projectTypes = await projectTypesResponse.json();
    
    const locationsResponse = await this.request.get(`${this.baseURL}/api/locations`);
    const locations = await locationsResponse.json();
    
    // Find matching project type
    const projectType = projectTypes.data?.find((pt: any) => pt.name.includes(config.projectType)) || 
                       projectTypes.find((pt: any) => pt.name.includes(config.projectType));
    
    if (!projectType) {
      throw new Error(`Project type containing "${config.projectType}" not found`);
    }

    // Find matching location
    const location = locations.data?.find((loc: any) => loc.name === config.location) || 
                     locations.find((loc: any) => loc.name === config.location);
    
    if (!location) {
      throw new Error(`Location "${config.location}" not found`);
    }

    // Get or create a test user for owner
    const peopleResponse = await this.request.get(`${this.baseURL}/api/people`);
    const people = await peopleResponse.json();
    let owner = people.data?.[0] || people[0];
    
    if (!owner) {
      // Create a test owner if none exist
      const ownerResponse = await this.request.post(`${this.baseURL}/api/people`, {
        data: {
          name: 'Test Project Owner',
          email: 'test.owner@example.com',
          worker_type: 'FTE',
          default_availability_percentage: 100,
          default_hours_per_day: 8
        }
      });
      owner = await ownerResponse.json();
    }

    // Get first sub-type for the project type
    const subType = projectType.sub_types?.[0] || { id: projectType.id };

    const projectData = {
      name: config.name,
      project_type_id: projectType.id,
      project_sub_type_id: subType.id,
      location_id: location.id,
      priority: config.priority || 3,
      description: `Test project for e2e testing: ${config.name}`,
      include_in_demand: true,
      owner_id: owner.id || owner.data?.id
    };

    const response = await this.request.post(`${this.baseURL}/api/projects`, {
      data: projectData
    });

    const project = await response.json();
    return { 
      id: project.id || project.data?.id, 
      name: project.name || project.data?.name 
    };
  }

  /**
   * Add project phases to a specific project
   */
  async addProjectPhases(projectId: string, phases: Array<{
    phaseName: string;
    startDate: string;
    endDate: string;
  }>): Promise<void> {
    // Get available phases
    const phasesResponse = await this.request.get(`${this.baseURL}/api/phases`);
    const availablePhases = await phasesResponse.json();
    const phasesList = availablePhases.data || availablePhases;

    for (const phaseConfig of phases) {
      // Find matching phase
      const phase = phasesList.find((p: any) => p.name === phaseConfig.phaseName);
      
      if (!phase) {
        throw new Error(`Phase "${phaseConfig.phaseName}" not found`);
      }

      // Add the phase to the project
      await this.request.post(`${this.baseURL}/api/project-phases`, {
        data: {
          project_id: projectId,
          phase_id: phase.id,
          start_date: phaseConfig.startDate,
          end_date: phaseConfig.endDate
        }
      });
    }
  }
}

/**
 * Global functions for easy test setup
 */
export async function generateTestData(): Promise<any> {
  // Create basic test data without API context
  return {
    users: [
      { id: 'test-user-1', name: 'Test User 1' },
      { id: 'test-user-2', name: 'Test User 2' }
    ],
    projects: [
      { id: 'test-project-1', name: 'Test Project 1' },
      { id: 'test-project-2', name: 'Test Project 2' }
    ],
    people: [
      { id: 'test-person-1', name: 'Test Person 1' },
      { id: 'test-person-2', name: 'Test Person 2' }
    ],
    roles: [
      { id: 'test-role-1', name: 'Test Role 1' },
      { id: 'test-role-2', name: 'Test Role 2' }
    ]
  };
}

export async function cleanupTestData(): Promise<void> {
  console.log('Cleanup test data called');
}
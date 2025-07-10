import { faker } from '@faker-js/faker';
import { APIRequestContext } from '@playwright/test';

export interface TestEmployee {
  id?: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location_id: string;
  primary_role_id: string;
  supervisor_id?: string;
  worker_type: 'FTE' | 'CONTRACT' | 'INTERN';
  default_availability_percentage: number;
  default_hours_per_day: number;
  start_date: string;
  end_date?: string;
  utilization_target: number;
}

export interface TestProject {
  id?: string;
  name: string;
  project_type_id: string;
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

  constructor(request: APIRequestContext, baseURL: string = 'http://localhost:3456') {
    this.request = request;
    this.baseURL = baseURL;
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

    const projectTypes = await this.createProjectTypes([
      { name: 'AI/ML Platform', color: '#3B82F6' },
      { name: 'Cloud Migration', color: '#10B981' },
      { name: 'Mobile Enhancement', color: '#F59E0B' },
      { name: 'Data Analytics', color: '#EF4444' },
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

    // Generate employees with realistic hierarchy
    const employees = this.generateEmployees(locations, roles, 50);
    
    // Generate projects with complex requirements
    const projects = this.generateProjects(projectTypes, locations, employees, 5);
    
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
          code: location.code,
          description: `${location.name} office location`
        }
      });
      created.push(await response.json());
    }
    return created;
  }

  private async createProjectTypes(types: { name: string; color: string }[]): Promise<any[]> {
    const created = [];
    for (const type of types) {
      const response = await this.request.post(`${this.baseURL}/api/project-types`, {
        data: {
          name: type.name,
          color_code: type.color,
          description: `${type.name} project type`
        }
      });
      created.push(await response.json());
    }
    return created;
  }

  private async createPhases(phases: { name: string; description: string }[]): Promise<any[]> {
    const created = [];
    for (const phase of phases) {
      const response = await this.request.post(`${this.baseURL}/api/phases`, {
        data: {
          name: phase.name,
          description: phase.description
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
    const departments = ['Engineering', 'Product', 'Design', 'Data', 'DevOps', 'QA', 'Management'];
    
    for (let i = 0; i < count; i++) {
      const location = faker.helpers.arrayElement(locations);
      const role = faker.helpers.arrayElement(roles);
      const department = faker.helpers.arrayElement(departments);
      
      employees.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        title: this.generateTitle(role.name, i < 10), // First 10 are senior
        department,
        location_id: location.id,
        primary_role_id: role.id,
        worker_type: this.generateWorkerType(),
        default_availability_percentage: this.generateAvailability(),
        default_hours_per_day: faker.helpers.arrayElement([6, 7, 8]),
        start_date: faker.date.between({ from: '2024-01-01', to: '2025-01-01' }).toISOString().split('T')[0],
        utilization_target: faker.number.int({ min: 70, max: 95 })
      });
    }
    
    // Add supervisor relationships
    this.addSupervisorRelationships(employees);
    
    return employees;
  }

  private generateAgileTeamMembers(locations: any[], roles: any[], count: number): TestEmployee[] {
    const employees: TestEmployee[] = [];
    const teams = ['Platform', 'Mobile', 'Web', 'API'];
    
    for (let i = 0; i < count; i++) {
      const location = faker.helpers.arrayElement(locations);
      const role = faker.helpers.arrayElement(roles);
      const team = faker.helpers.arrayElement(teams);
      
      employees.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        title: `${role.name} - ${team} Team`,
        department: team,
        location_id: location.id,
        primary_role_id: role.id,
        worker_type: faker.helpers.arrayElement(['FTE', 'CONTRACT']),
        default_availability_percentage: faker.number.int({ min: 85, max: 100 }),
        default_hours_per_day: 8,
        start_date: faker.date.between({ from: '2024-01-01', to: '2025-01-01' }).toISOString().split('T')[0],
        utilization_target: faker.number.int({ min: 75, max: 90 })
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
        default_availability_percentage: this.generateConsultingAvailabilityPercentage(role.name),
        default_hours_per_day: faker.helpers.arrayElement([7, 8, 9]),
        start_date: faker.date.between({ from: '2023-01-01', to: '2024-06-01' }).toISOString().split('T')[0],
        utilization_target: this.generateConsultingUtilizationTarget(role.name)
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
      const owner = faker.helpers.arrayElement(employees.filter(e => e.title?.includes('Partner') || e.title?.includes('Principal')));
      
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

  private generateWorkerType(): 'FTE' | 'CONTRACT' | 'INTERN' {
    return faker.helpers.weightedArrayElement([
      { weight: 70, value: 'FTE' },
      { weight: 25, value: 'CONTRACT' },
      { weight: 5, value: 'INTERN' }
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
    if (roleName.includes('Partner') || roleName.includes('Principal')) {
      return faker.number.int({ min: 60, max: 75 });
    }
    return faker.number.int({ min: 80, max: 95 });
  }

  private generateConsultingUtilizationTarget(roleName: string): number {
    // Higher utilization targets for junior roles
    if (roleName.includes('Analyst') || roleName.includes('Consultant')) {
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
        await this.request.delete(`${this.baseURL}/api/${entity}/test-data`);
      } catch (error) {
        console.warn(`Failed to cleanup ${entity}:`, error);
      }
    }
  }

  /**
   * Alias for cleanupTestData for backward compatibility
   */
  async cleanup(): Promise<void> {
    await this.cleanupTestData();
  }
}
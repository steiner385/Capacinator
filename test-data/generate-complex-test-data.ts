import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the exact fiscal weeks from the original template
const FISCAL_WEEKS = [
  '24FW36', '24FW37', '24FW38', '24FW39', '24FW40', '24FW41', '24FW42',
  '24FW43', '24FW44', '24FW45', '24FW46', '24FW47', '24FW48', '24FW49',
  '24FW50', '24FW51', '24FW52', '25FW01', '25FW02', '25FW03', '25FW04',
  '25FW05', '25FW06', '25FW07', '25FW08', '25FW09', '25FW10', '25FW11'
];

// Define the exact phases from the original
const PHASES = ['PEND', 'BP', 'DEV', 'SIT', 'VAL', 'UAT', 'CUT', 'HC', 'SUP', 'IDLE', 'BLKOUT', 'GL'];

async function generateComplexTestData() {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Projects sheet - Complex scenarios
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Type', key: 'type', width: 30 },
    { header: 'Inc. in Demand', key: 'includeInDemand', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  
  projectsSheet.addRows([
    // Normal projects
    { projects: 'Enterprise Data Migration / New York', type: 'Infrastructure', includeInDemand: 'Y', priority: 1 },
    { projects: 'Mobile Banking App / San Francisco', type: 'Mobile Application', includeInDemand: 'Y', priority: 2 },
    
    // Edge cases
    { projects: 'Project with Very Long Name That Exceeds Normal Length Expectations And Tests Field Limits / Chicago', type: 'Web Application', includeInDemand: 'Y', priority: 1 },
    { projects: 'Unicode Project 项目 プロジェクト проект / Tokyo', type: 'Research & Development', includeInDemand: 'Y', priority: 999 },
    { projects: 'Special Characters!@#$%^&*() / London', type: 'Security', includeInDemand: 'N', priority: -5 },
    { projects: '   Whitespace Project   /   Berlin   ', type: '   Integration   ', includeInDemand: 'Y', priority: 3 },
    
    // Duplicate names
    { projects: 'Duplicate Project Name / Mumbai', type: 'Data Analytics', includeInDemand: 'Y', priority: 1 },
    { projects: 'Duplicate Project Name / Sydney', type: 'Mobile Application', includeInDemand: 'N', priority: 2 },
    
    // Missing/empty data
    { projects: 'Project With Missing Data / Paris', type: '', includeInDemand: '', priority: '' },
    { projects: ' / Austin', type: 'Web Application', includeInDemand: 'Y', priority: 1 } // Empty project name
  ]);

  // 2. Project Roadmap sheet - Complex phase transitions
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  const roadmapColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  roadmapSheet.columns = roadmapColumns;
  
  roadmapSheet.addRows([
    // Normal roadmap
    {
      projects: 'Enterprise Data Migration / New York',
      '24FW36': 'PEND', '24FW37': 'PEND', '24FW38': 'BP', '24FW39': 'BP', '24FW40': 'DEV',
      '24FW41': 'DEV', '24FW42': 'DEV', '24FW43': 'SIT', '24FW44': 'VAL', '24FW45': 'UAT',
      '24FW46': 'CUT', '24FW47': 'HC', '24FW48': 'SUP', '24FW49': 'SUP', '24FW50': 'IDLE'
    },
    
    // Phase gaps and jumps
    {
      projects: 'Mobile Banking App / San Francisco',
      '24FW36': 'BP', '24FW37': '', '24FW38': 'DEV', '24FW39': 'DEV', '24FW40': '',
      '24FW41': 'SIT', '24FW42': 'UAT', '24FW43': '', '24FW44': 'CUT', '24FW45': 'GL'
    },
    
    // All phases used
    {
      projects: 'Project with Very Long Name That Exceeds Normal Length Expectations And Tests Field Limits / Chicago',
      '24FW36': 'PEND', '24FW37': 'BP', '24FW38': 'DEV', '24FW39': 'SIT', '24FW40': 'VAL',
      '24FW41': 'UAT', '24FW42': 'CUT', '24FW43': 'HC', '24FW44': 'SUP', '24FW45': 'IDLE',
      '24FW46': 'BLKOUT', '24FW47': 'GL', '24FW48': 'SUP', '24FW49': 'IDLE', '24FW50': 'GL'
    },
    
    // Backwards timeline (should be handled as warning)
    {
      projects: 'Special Characters!@#$%^&*() / London',
      '24FW36': 'CUT', '24FW37': 'UAT', '24FW38': 'SIT', '24FW39': 'DEV', '24FW40': 'BP'
    }
  ]);

  // 3. Project Demand sheet - Complex demand patterns
  const demandSheet = workbook.addWorksheet('Project Demand');
  const demandColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  demandSheet.columns = demandColumns;
  
  demandSheet.addRows([
    // Normal demand
    {
      projects: 'Enterprise Data Migration / New York',
      planOwner: 'Alice Johnson',
      role: 'Project Manager',
      '24FW36': 0.5, '24FW37': 0.5, '24FW38': 0.8, '24FW39': 0.8, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 0.8, '24FW44': 0.6, '24FW45': 0.9,
      '24FW46': 1.2, '24FW47': 0.3, '24FW48': 0.2, '24FW49': 0.2, '24FW50': 0.1
    },
    
    // Over-allocation scenarios
    {
      projects: 'Mobile Banking App / San Francisco',
      planOwner: 'Bob Smith',
      role: 'Developer',
      '24FW36': 1.5, '24FW37': 2, '24FW38': 1.8, '24FW39': 1.2, '24FW40': 1,
      '24FW41': 1.3, '24FW42': 1.1, '24FW43': 0.8, '24FW44': 0.5, '24FW45': 0.2
    },
    
    // Fractional and decimal demands
    {
      projects: 'Unicode Project 项目 プロジェクト проект / Tokyo',
      planOwner: 'Carol White',
      role: 'QA Engineer',
      '24FW36': 0.125, '24FW37': 0.25, '24FW38': 0.333, '24FW39': 0.666, '24FW40': 0.75,
      '24FW41': 0.875, '24FW42': 1.111, '24FW43': 1.333, '24FW44': 0.555, '24FW45': 0.222
    },
    
    // Zero and negative values
    {
      projects: 'Special Characters!@#$%^&*() / London',
      planOwner: 'David Brown',
      role: 'Business Analyst',
      '24FW36': 0, '24FW37': -0.5, '24FW38': 0, '24FW39': 0.1, '24FW40': 0,
      '24FW41': -1, '24FW42': 0, '24FW43': 0.01, '24FW44': 99.9, '24FW45': 0
    },
    
    // Missing plan owner and role data
    {
      projects: 'Project With Missing Data / Paris',
      planOwner: '',
      role: '',
      '24FW36': 1, '24FW37': 1, '24FW38': 1
    }
  ]);

  // 4. Project Capacity Gaps sheet (leave mostly empty for calculated data)
  const gapsSheet = workbook.addWorksheet('Project Capacity Gaps');
  const gapsColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  gapsSheet.columns = gapsColumns;

  // 5. Project Assignments sheet - Complex assignment patterns
  const assignmentsSheet = workbook.addWorksheet('Project Assignments');
  const assignmentsColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Person', key: 'person', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  assignmentsSheet.columns = assignmentsColumns;
  
  assignmentsSheet.addRows([
    // Normal assignments
    {
      projects: 'Enterprise Data Migration / New York',
      person: 'Alice Johnson',
      role: 'Project Manager',
      '24FW36': 0.5, '24FW37': 0.5, '24FW38': 0.8, '24FW39': 0.8, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 0.8, '24FW44': 0.6, '24FW45': 0.9
    },
    
    // Over-allocated person
    {
      projects: 'Mobile Banking App / San Francisco',
      person: 'Alice Johnson', // Same person on multiple projects
      role: 'Project Manager',
      '24FW36': 0.8, '24FW37': 0.8, '24FW38': 0.5, '24FW39': 0.5, '24FW40': 0.3
    },
    
    // Person with multiple roles
    {
      projects: 'Unicode Project 项目 プロジェクト проект / Tokyo',
      person: 'Bob Smith',
      role: 'Developer',
      '24FW36': 0.6, '24FW37': 0.6, '24FW38': 0.8, '24FW39': 0.8, '24FW40': 1
    },
    {
      projects: 'Special Characters!@#$%^&*() / London',
      person: 'Bob Smith', // Same person, different role
      role: 'Technical Lead',
      '24FW41': 0.5, '24FW42': 0.5, '24FW43': 0.7, '24FW44': 0.7, '24FW45': 0.4
    },
    
    // Assignments with gaps
    {
      projects: 'Project with Very Long Name That Exceeds Normal Length Expectations And Tests Field Limits / Chicago',
      person: 'Carol White',
      role: 'QA Engineer',
      '24FW36': 0.3, '24FW37': '', '24FW38': 0.5, '24FW39': '', '24FW40': 0.8,
      '24FW41': 0.8, '24FW42': '', '24FW43': 1, '24FW44': 1, '24FW45': ''
    },
    
    // Invalid assignments (missing person/role)
    {
      projects: 'Project With Missing Data / Paris',
      person: '',
      role: 'Mystery Role',
      '24FW36': 1, '24FW37': 1
    }
  ]);

  // 6. Standard Allocations sheet - Complex allocation patterns
  const standardAllocSheet = workbook.addWorksheet('Standard Allocations');
  const standardAllocColumns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'ProjType', key: 'projType', width: 30 },
    ...PHASES.map(phase => ({ header: phase, key: phase, width: 8 }))
  ];
  standardAllocSheet.columns = standardAllocColumns;
  
  standardAllocSheet.addRows([
    // Standard allocations for different project types
    {
      role: 'Project Manager',
      projType: 'Infrastructure',
      'PEND': 0.2, 'BP': 0.8, 'DEV': 0.5, 'SIT': 0.6, 'VAL': 0.7, 'UAT': 0.8,
      'CUT': 1, 'HC': 0.8, 'SUP': 0.3, 'IDLE': 0.1, 'BLKOUT': '', 'GL': 0.5
    },
    {
      role: 'Developer',
      projType: 'Infrastructure',
      'PEND': '', 'BP': 0.1, 'DEV': 1, 'SIT': 0.8, 'VAL': 0.5, 'UAT': 0.3,
      'CUT': 0.5, 'HC': 0.2, 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    
    // Over-allocation scenarios
    {
      role: 'QA Engineer',
      projType: 'Mobile Application',
      'PEND': '', 'BP': 0.2, 'DEV': 0.8, 'SIT': 1.5, 'VAL': 1.2, 'UAT': 1.8,
      'CUT': 1, 'HC': 0.5, 'SUP': 0.2, 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    
    // Fractional allocations
    {
      role: 'Business Analyst',
      projType: 'Web Application',
      'PEND': 0.333, 'BP': 0.666, 'DEV': 0.125, 'SIT': 0.25, 'VAL': 0.125, 'UAT': 0.5,
      'CUT': 0.75, 'HC': 0.125, 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    
    // All phases used with varying allocations
    {
      role: 'Technical Lead',
      projType: 'Security',
      'PEND': 0.1, 'BP': 0.3, 'DEV': 0.8, 'SIT': 0.6, 'VAL': 0.9, 'UAT': 0.7,
      'CUT': 1, 'HC': 0.8, 'SUP': 0.4, 'IDLE': 0.2, 'BLKOUT': 0, 'GL': 0.6
    },
    
    // Missing data scenarios
    {
      role: '',
      projType: 'Research & Development',
      'PEND': 0.5, 'BP': 0.5, 'DEV': 0.5
    }
  ]);

  // 7. Roles sheet - Complex role scenarios
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'CW Option', key: 'cwOption', width: 15 },
    { header: 'Reqd Data Access', key: 'dataAccess', width: 40 }
  ];
  
  rolesSheet.addRows([
    // Standard roles
    { role: 'Project Manager', planOwner: 'Alice Johnson', cwOption: 'Y', dataAccess: 'Full project access' },
    { role: 'Developer', planOwner: 'Bob Smith', cwOption: 'Y', dataAccess: 'Code repository and dev environments' },
    { role: 'QA Engineer', planOwner: 'Carol White', cwOption: 'Y', dataAccess: 'Test environments and bug tracking' },
    { role: 'Business Analyst', planOwner: 'David Brown', cwOption: 'N', dataAccess: 'Requirements and documentation' },
    { role: 'Technical Lead', planOwner: 'Bob Smith', cwOption: 'Y', dataAccess: 'Full technical access' },
    
    // Edge cases
    { role: 'Role with Very Long Name That Tests Field Length Limits and Database Constraints', planOwner: 'Alice Johnson', cwOption: 'Y', dataAccess: 'Extensive access requirements that span multiple systems and platforms' },
    { role: 'Unicode Role 角色 роль', planOwner: 'Carol White', cwOption: 'N', dataAccess: 'Unicode data access 访问 доступ' },
    { role: 'Special!@#$%^&*()Role', planOwner: 'David Brown', cwOption: 'Y', dataAccess: 'Special characters in access!' },
    { role: '   Whitespace Role   ', planOwner: '   Alice Johnson   ', cwOption: 'Y', dataAccess: '   Whitespace access   ' },
    
    // Missing data
    { role: '', planOwner: 'Bob Smith', cwOption: '', dataAccess: '' },
    { role: 'Orphan Role', planOwner: 'Non-existent Person', cwOption: 'Y', dataAccess: 'Standard access' }
  ]);

  // 8. Roster sheet - Complex people scenarios
  const rosterSheet = workbook.addWorksheet('Roster');
  const rosterColumns = [
    { header: 'Person', key: 'person', width: 30 },
    { header: 'Primary Role', key: 'primaryRole', width: 30 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Contractor', key: 'contractor', width: 12 },
    { header: 'Leave', key: 'leave', width: 8 },
    { header: 'Bubble', key: 'bubble', width: 8 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Description', key: 'description', width: 40 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  rosterSheet.columns = rosterColumns;
  
  rosterSheet.addRows([
    // Standard people
    {
      person: 'Alice Johnson',
      primaryRole: 'Project Manager',
      location: 'New York',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Senior PM with 10+ years experience',
      description: 'Leads enterprise projects',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 0.8, // Vacation week
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1,
      '24FW46': 1, '24FW47': 1, '24FW48': 0.5, '24FW49': 0.5, '24FW50': 1 // Holiday period
    },
    
    // Contractor with variable availability
    {
      person: 'Bob Smith',
      primaryRole: 'Developer',
      location: 'San Francisco',
      contractor: 'Y',
      leave: 'N',
      bubble: 'N',
      notes: 'Contract developer, flexible schedule',
      description: 'Full stack development specialist',
      '24FW36': 0.8, '24FW37': 0.8, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 0.6, '24FW42': 0.6, '24FW43': 1, '24FW44': 1, '24FW45': 0.4,
      '24FW46': 0.4, '24FW47': 0.8, '24FW48': 0.8, '24FW49': 1, '24FW50': 1
    },
    
    // Person with extended leave
    {
      person: 'Carol White',
      primaryRole: 'QA Engineer',
      location: 'Chicago',
      contractor: 'N',
      leave: 'Y',
      bubble: 'N',
      notes: 'Extended medical leave from week 42',
      description: 'Test automation expert',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 0, '24FW43': 0, '24FW44': 0, '24FW45': 0,
      '24FW46': 0, '24FW47': 0, '24FW48': 0.5, '24FW49': 0.8, '24FW50': 1 // Returning gradually
    },
    
    // Bubble resource
    {
      person: 'David Brown',
      primaryRole: 'Business Analyst',
      location: 'London',
      contractor: 'N',
      leave: 'N',
      bubble: 'Y',
      notes: 'Bubble resource for urgent requirements',
      description: 'Senior BA available for quick assignments',
      '24FW36': 0.2, '24FW37': 0.2, '24FW38': 0.8, '24FW39': 0.8, '24FW40': 0.3,
      '24FW41': 0.3, '24FW42': 1, '24FW43': 1, '24FW44': 0.1, '24FW45': 0.1,
      '24FW46': 0.6, '24FW47': 0.6, '24FW48': 0.4, '24FW49': 0.4, '24FW50': 0.2
    },
    
    // Edge case names and data
    {
      person: 'Person with Very Long Name That Tests Database Field Limits and Application Handling',
      primaryRole: 'Technical Lead',
      location: 'Tokyo',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Person with extremely long name for testing purposes and edge case handling',
      description: 'Technical leadership role with extensive experience across multiple domains',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1
    },
    
    // Unicode names
    {
      person: 'Li Wei 李伟',
      primaryRole: 'Developer',
      location: 'Singapore',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Unicode name testing 测试',
      description: 'International developer 国际开发者',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1
    },
    
    // Special characters
    {
      person: 'O\'Connor-Smith, Jr.',
      primaryRole: 'Project Manager',
      location: 'Dublin',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Name with special characters: apostrophe, hyphen, comma',
      description: 'Tests special character handling',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1
    },
    
    // Whitespace issues
    {
      person: '   Emma Wilson   ',
      primaryRole: '   Data Analyst   ',
      location: '   Berlin   ',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: '   Leading and trailing whitespace   ',
      description: '   Tests whitespace handling   ',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1
    },
    
    // Missing/empty data
    {
      person: '',
      primaryRole: 'QA Engineer',
      location: 'Austin',
      contractor: '',
      leave: '',
      bubble: '',
      notes: '',
      description: '',
      '24FW36': 1, '24FW37': 1
    },
    
    // Extreme availability values
    {
      person: 'Test Person Extreme Values',
      primaryRole: 'Developer',
      location: 'Test City',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Testing extreme availability values',
      description: 'Edge case testing',
      '24FW36': 0, '24FW37': 0.01, '24FW38': 10, '24FW39': 999, '24FW40': -5,
      '24FW41': 1.999, '24FW42': 0.001, '24FW43': 100, '24FW44': -0.5, '24FW45': 1.5
    }
  ]);

  // 9. Project Types sheet - Including edge cases
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [{ header: 'Type', key: 'type', width: 30 }];
  projectTypesSheet.addRows([
    { type: 'Infrastructure' },
    { type: 'Mobile Application' },
    { type: 'Web Application' },
    { type: 'Data Analytics' },
    { type: 'Security' },
    { type: 'Research & Development' },
    { type: 'Integration' },
    { type: 'Type with Very Long Name That Tests Field Length Limits' },
    { type: 'Unicode Type 类型 тип' },
    { type: 'Special!@#$%^&*()Type' },
    { type: '   Whitespace Type   ' },
    { type: '' } // Empty type
  ]);

  // 10. Project Phases sheet
  const projectPhasesSheet = workbook.addWorksheet('Project Phases');
  projectPhasesSheet.columns = [{ header: 'Phase', key: 'phase', width: 30 }];
  PHASES.forEach(phase => {
    projectPhasesSheet.addRow({ phase });
  });

  // Save the workbook
  const outputPath = path.join(__dirname, 'complex-test-data.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Complex test data generated at: ${outputPath}`);
}

generateComplexTestData().catch(console.error);
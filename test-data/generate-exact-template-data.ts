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

async function generateExactTemplateData() {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Projects sheet (exact column order)
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Type', key: 'type', width: 30 },
    { header: 'Inc. in Demand', key: 'includeInDemand', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  
  projectsSheet.addRows([
    { projects: 'Mobile Banking App / New York', type: 'Mobile Application', includeInDemand: 'Y', priority: 1 },
    { projects: 'Customer Portal / San Francisco', type: 'Web Application', includeInDemand: 'Y', priority: 2 },
    { projects: 'Data Warehouse Migration / Chicago', type: 'Infrastructure', includeInDemand: 'Y', priority: 1 },
    { projects: 'Analytics Dashboard / London', type: 'Data Analytics', includeInDemand: 'Y', priority: 3 },
    { projects: 'Security Audit Tool / Berlin', type: 'Security', includeInDemand: 'Y', priority: 1 },
    { projects: 'HR Portal Upgrade / Tokyo', type: 'Web Application', includeInDemand: 'N', priority: 2 }
  ]);

  // 2. Project Roadmap sheet (exact column order with all fiscal weeks)
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  const roadmapColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  roadmapSheet.columns = roadmapColumns;
  
  // Add project roadmap data with phase assignments across weeks
  roadmapSheet.addRows([
    {
      projects: 'Mobile Banking App / New York',
      '24FW36': 'BP', '24FW37': 'BP', '24FW38': 'BP', '24FW39': 'DEV', '24FW40': 'DEV',
      '24FW41': 'DEV', '24FW42': 'DEV', '24FW43': 'SIT', '24FW44': 'SIT', '24FW45': 'UAT',
      '24FW46': 'UAT', '24FW47': 'CUT', '24FW48': 'SUP', '24FW49': 'SUP', '24FW50': 'SUP'
    },
    {
      projects: 'Customer Portal / San Francisco',
      '24FW36': 'PEND', '24FW37': 'PEND', '24FW38': 'BP', '24FW39': 'BP', '24FW40': 'BP',
      '24FW41': 'DEV', '24FW42': 'DEV', '24FW43': 'DEV', '24FW44': 'DEV', '24FW45': 'DEV',
      '24FW46': 'SIT', '24FW47': 'SIT', '24FW48': 'UAT', '24FW49': 'UAT', '24FW50': 'CUT'
    },
    {
      projects: 'Data Warehouse Migration / Chicago',
      '24FW36': 'DEV', '24FW37': 'DEV', '24FW38': 'DEV', '24FW39': 'DEV', '24FW40': 'SIT',
      '24FW41': 'SIT', '24FW42': 'VAL', '24FW43': 'VAL', '24FW44': 'UAT', '24FW45': 'UAT',
      '24FW46': 'CUT', '24FW47': 'SUP', '24FW48': 'SUP', '24FW49': 'SUP', '24FW50': 'HC'
    }
  ]);

  // 3. Project Demand sheet (exact column order)
  const demandSheet = workbook.addWorksheet('Project Demand');
  const demandColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  demandSheet.columns = demandColumns;
  
  demandSheet.addRows([
    {
      projects: 'Mobile Banking App / New York',
      planOwner: 'Alice Johnson',
      role: 'Project Manager',
      '24FW36': 0.3, '24FW37': 0.3, '24FW38': 0.3, '24FW39': 0.5, '24FW40': 0.5,
      '24FW41': 0.5, '24FW42': 0.5, '24FW43': 0.4, '24FW44': 0.4, '24FW45': 0.6,
      '24FW46': 0.6, '24FW47': 0.8, '24FW48': 0.2, '24FW49': 0.2, '24FW50': 0.2
    },
    {
      projects: 'Mobile Banking App / New York',
      planOwner: 'Bob Smith',
      role: 'Developer',
      '24FW36': '', '24FW37': '', '24FW38': 0.2, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 0.5, '24FW44': 0.5, '24FW45': 0.3,
      '24FW46': 0.3, '24FW47': 0.2, '24FW48': '', '24FW49': '', '24FW50': ''
    },
    {
      projects: 'Mobile Banking App / New York',
      planOwner: 'Carol White',
      role: 'QA Engineer',
      '24FW36': '', '24FW37': '', '24FW38': 0.1, '24FW39': 0.3, '24FW40': 0.3,
      '24FW41': 0.3, '24FW42': 0.5, '24FW43': 1, '24FW44': 1, '24FW45': 0.8,
      '24FW46': 0.8, '24FW47': 0.4, '24FW48': 0.1, '24FW49': 0.1, '24FW50': ''
    }
  ]);

  // 4. Project Capacity Gaps sheet (exact column order)
  const gapsSheet = workbook.addWorksheet('Project Capacity Gaps');
  const gapsColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  gapsSheet.columns = gapsColumns;
  // This sheet is typically calculated, so we'll leave it empty or with minimal data

  // 5. Project Assignments sheet (exact column order)
  const assignmentsSheet = workbook.addWorksheet('Project Assignments');
  const assignmentsColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Person', key: 'person', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  assignmentsSheet.columns = assignmentsColumns;
  
  assignmentsSheet.addRows([
    {
      projects: 'Mobile Banking App / New York',
      person: 'Alice Johnson',
      role: 'Project Manager',
      '24FW36': 0.3, '24FW37': 0.3, '24FW38': 0.3, '24FW39': 0.5, '24FW40': 0.5,
      '24FW41': 0.5, '24FW42': 0.5, '24FW43': 0.4, '24FW44': 0.4, '24FW45': 0.6,
      '24FW46': 0.6, '24FW47': 0.8, '24FW48': 0.2, '24FW49': 0.2, '24FW50': 0.2
    },
    {
      projects: 'Mobile Banking App / New York',
      person: 'Bob Smith',
      role: 'Developer',
      '24FW36': '', '24FW37': '', '24FW38': 0.2, '24FW39': 0.8, '24FW40': 0.8,
      '24FW41': 0.8, '24FW42': 0.8, '24FW43': 0.5, '24FW44': 0.5, '24FW45': 0.3,
      '24FW46': 0.3, '24FW47': 0.2, '24FW48': '', '24FW49': '', '24FW50': ''
    },
    {
      projects: 'Customer Portal / San Francisco',
      person: 'David Brown',
      role: 'UX Designer',
      '24FW36': '', '24FW37': '', '24FW38': 0.8, '24FW39': 0.8, '24FW40': 0.8,
      '24FW41': 0.4, '24FW42': 0.4, '24FW43': 0.2, '24FW44': 0.2, '24FW45': '',
      '24FW46': '', '24FW47': '', '24FW48': 0.2, '24FW49': 0.2, '24FW50': ''
    }
  ]);

  // 6. Standard Allocations sheet (exact column order with all phases)
  const standardAllocSheet = workbook.addWorksheet('Standard Allocations');
  const standardAllocColumns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'ProjType', key: 'projType', width: 30 },
    ...PHASES.map(phase => ({ header: phase, key: phase, width: 8 }))
  ];
  standardAllocSheet.columns = standardAllocColumns;
  
  standardAllocSheet.addRows([
    {
      role: 'Project Manager',
      projType: 'Mobile Application',
      'PEND': 0.1, 'BP': 0.3, 'DEV': 0.5, 'SIT': 0.4, 'VAL': 0.3, 'UAT': 0.6,
      'CUT': 0.8, 'HC': 0.2, 'SUP': 0.2, 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    {
      role: 'Developer',
      projType: 'Mobile Application',
      'PEND': '', 'BP': '', 'DEV': 1, 'SIT': 0.5, 'VAL': 0.3, 'UAT': 0.3,
      'CUT': 0.2, 'HC': '', 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    {
      role: 'QA Engineer',
      projType: 'Mobile Application',
      'PEND': '', 'BP': 0.1, 'DEV': 0.3, 'SIT': 1, 'VAL': 0.8, 'UAT': 0.8,
      'CUT': 0.4, 'HC': 0.1, 'SUP': 0.1, 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    {
      role: 'Business Analyst',
      projType: 'Mobile Application',
      'PEND': 0.2, 'BP': 0.8, 'DEV': 0.2, 'SIT': 0.1, 'VAL': 0.1, 'UAT': 0.2,
      'CUT': 0.1, 'HC': '', 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    {
      role: 'UX Designer',
      projType: 'Mobile Application',
      'PEND': 0.1, 'BP': 0.8, 'DEV': 0.4, 'SIT': 0.1, 'VAL': '', 'UAT': 0.2,
      'CUT': '', 'HC': '', 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    }
  ]);

  // 7. Roles sheet (exact column order)
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'CW Option', key: 'cwOption', width: 15 },
    { header: 'Reqd Data Access', key: 'dataAccess', width: 40 }
  ];
  
  rolesSheet.addRows([
    { role: 'Project Manager', planOwner: 'Alice Johnson', cwOption: 'Y', dataAccess: 'Full project access' },
    { role: 'Developer', planOwner: 'Bob Smith', cwOption: 'Y', dataAccess: 'Code repository' },
    { role: 'QA Engineer', planOwner: 'Carol White', cwOption: 'Y', dataAccess: 'Test environments' },
    { role: 'Business Analyst', planOwner: 'Alice Johnson', cwOption: 'N', dataAccess: 'Requirements docs' },
    { role: 'UX Designer', planOwner: 'David Brown', cwOption: 'N', dataAccess: 'Design tools' },
    { role: 'DevOps Engineer', planOwner: 'Bob Smith', cwOption: 'Y', dataAccess: 'Infrastructure' },
    { role: 'Data Analyst', planOwner: 'Emma Wilson', cwOption: 'N', dataAccess: 'Analytics platforms' }
  ]);

  // 8. Roster sheet (exact column order with all fiscal weeks)
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
    {
      person: 'Alice Johnson',
      primaryRole: 'Project Manager',
      location: 'New York',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Senior PM with 10 years experience',
      description: 'Leads mobile and web projects',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 0.8,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1,
      '24FW46': 1, '24FW47': 1, '24FW48': 0.5, '24FW49': 0.5, '24FW50': 1
    },
    {
      person: 'Bob Smith',
      primaryRole: 'Developer',
      location: 'San Francisco',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Full stack developer',
      description: 'Specializes in React and Node.js',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 0.8,
      '24FW46': 0.8, '24FW47': 1, '24FW48': 1, '24FW49': 1, '24FW50': 1
    },
    {
      person: 'Carol White',
      primaryRole: 'QA Engineer',
      location: 'Chicago',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Test automation expert',
      description: 'Leads QA initiatives',
      '24FW36': 0.8, '24FW37': 0.8, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1,
      '24FW46': 1, '24FW47': 0.6, '24FW48': 0.6, '24FW49': 1, '24FW50': 1
    },
    {
      person: 'David Brown',
      primaryRole: 'UX Designer',
      location: 'London',
      contractor: 'Y',
      leave: 'N',
      bubble: 'N',
      notes: 'Contract UX specialist',
      description: 'Mobile and web design',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 0.6,
      '24FW41': 0.6, '24FW42': 0.6, '24FW43': 0.4, '24FW44': 0.4, '24FW45': 0.4,
      '24FW46': 0.4, '24FW47': 0.8, '24FW48': 0.8, '24FW49': 1, '24FW50': 1
    },
    {
      person: 'Emma Wilson',
      primaryRole: 'Data Analyst',
      location: 'Berlin',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Analytics and reporting',
      description: 'Business intelligence expert',
      '24FW36': 1, '24FW37': 1, '24FW38': 0.8, '24FW39': 0.8, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1,
      '24FW46': 0.6, '24FW47': 0.6, '24FW48': 1, '24FW49': 1, '24FW50': 1
    }
  ]);

  // 9. Project Types sheet (simple list)
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [
    { header: 'Type', key: 'type', width: 30 }
  ];
  
  projectTypesSheet.addRows([
    { type: 'Infrastructure' },
    { type: 'Mobile Application' },
    { type: 'Web Application' },
    { type: 'Data Analytics' },
    { type: 'Security' },
    { type: 'Research & Development' },
    { type: 'Integration' }
  ]);

  // 10. Project Phases sheet (simple list)
  const projectPhasesSheet = workbook.addWorksheet('Project Phases');
  projectPhasesSheet.columns = [
    { header: 'Phase', key: 'phase', width: 30 }
  ];
  
  // Add all phases in order
  PHASES.forEach(phase => {
    projectPhasesSheet.addRow({ phase });
  });

  // Save the workbook
  const outputPath = path.join(__dirname, 'exact-template-data.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Exact template data generated at: ${outputPath}`);
}

generateExactTemplateData().catch(console.error);
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

async function generateSimpleTestData() {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Projects sheet
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Type', key: 'type', width: 30 },
    { header: 'Inc. in Demand', key: 'includeInDemand', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  
  projectsSheet.addRows([
    { projects: 'Simple Web App / New York', type: 'Web Application', includeInDemand: 'Y', priority: 1 },
    { projects: 'Mobile App / London', type: 'Mobile Application', includeInDemand: 'Y', priority: 2 }
  ]);

  // 2. Project Roadmap sheet
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  const roadmapColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  roadmapSheet.columns = roadmapColumns;
  
  roadmapSheet.addRows([
    {
      projects: 'Simple Web App / New York',
      '24FW36': 'BP', '24FW37': 'BP', '24FW38': 'DEV', '24FW39': 'DEV', '24FW40': 'DEV',
      '24FW41': 'SIT', '24FW42': 'UAT', '24FW43': 'CUT'
    },
    {
      projects: 'Mobile App / London',
      '24FW38': 'BP', '24FW39': 'BP', '24FW40': 'DEV', '24FW41': 'DEV', '24FW42': 'DEV',
      '24FW43': 'SIT', '24FW44': 'UAT', '24FW45': 'CUT'
    }
  ]);

  // 3. Project Demand sheet
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
      projects: 'Simple Web App / New York',
      planOwner: 'John Smith',
      role: 'Project Manager',
      '24FW36': 0.5, '24FW37': 0.5, '24FW38': 0.3, '24FW39': 0.3, '24FW40': 0.3,
      '24FW41': 0.4, '24FW42': 0.6, '24FW43': 0.8
    },
    {
      projects: 'Simple Web App / New York',
      planOwner: 'Jane Doe',
      role: 'Developer',
      '24FW38': 1, '24FW39': 1, '24FW40': 1, '24FW41': 0.5, '24FW42': 0.2
    }
  ]);

  // 4. Project Capacity Gaps sheet (empty for calculated data)
  const gapsSheet = workbook.addWorksheet('Project Capacity Gaps');
  const gapsColumns = [
    { header: 'Projects', key: 'projects', width: 50 },
    { header: 'Role', key: 'role', width: 30 },
    ...FISCAL_WEEKS.map(fw => ({ header: fw, key: fw, width: 8 }))
  ];
  gapsSheet.columns = gapsColumns;

  // 5. Project Assignments sheet
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
      projects: 'Simple Web App / New York',
      person: 'John Smith',
      role: 'Project Manager',
      '24FW36': 0.5, '24FW37': 0.5, '24FW38': 0.3, '24FW39': 0.3, '24FW40': 0.3,
      '24FW41': 0.4, '24FW42': 0.6, '24FW43': 0.8
    },
    {
      projects: 'Simple Web App / New York',
      person: 'Jane Doe',
      role: 'Developer',
      '24FW38': 0.8, '24FW39': 0.8, '24FW40': 0.8, '24FW41': 0.5, '24FW42': 0.2
    }
  ]);

  // 6. Standard Allocations sheet
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
      projType: 'Web Application',
      'PEND': '', 'BP': 0.5, 'DEV': 0.3, 'SIT': 0.4, 'VAL': '', 'UAT': 0.6,
      'CUT': 0.8, 'HC': 0.2, 'SUP': 0.1, 'IDLE': '', 'BLKOUT': '', 'GL': ''
    },
    {
      role: 'Developer',
      projType: 'Web Application',
      'PEND': '', 'BP': '', 'DEV': 1, 'SIT': 0.5, 'VAL': '', 'UAT': 0.2,
      'CUT': 0.1, 'HC': '', 'SUP': '', 'IDLE': '', 'BLKOUT': '', 'GL': ''
    }
  ]);

  // 7. Roles sheet
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'CW Option', key: 'cwOption', width: 15 },
    { header: 'Reqd Data Access', key: 'dataAccess', width: 40 }
  ];
  
  rolesSheet.addRows([
    { role: 'Project Manager', planOwner: 'John Smith', cwOption: 'Y', dataAccess: 'Full access' },
    { role: 'Developer', planOwner: 'Jane Doe', cwOption: 'Y', dataAccess: 'Code repository' }
  ]);

  // 8. Roster sheet
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
      person: 'John Smith',
      primaryRole: 'Project Manager',
      location: 'New York',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Senior project manager',
      description: 'Experienced PM',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1
    },
    {
      person: 'Jane Doe',
      primaryRole: 'Developer',
      location: 'New York',
      contractor: 'N',
      leave: 'N',
      bubble: 'N',
      notes: 'Full stack developer',
      description: 'React and Node.js expert',
      '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 1,
      '24FW41': 1, '24FW42': 1, '24FW43': 1, '24FW44': 1, '24FW45': 1
    }
  ]);

  // 9. Project Types sheet
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [{ header: 'Type', key: 'type', width: 30 }];
  projectTypesSheet.addRows([
    { type: 'Web Application' },
    { type: 'Mobile Application' }
  ]);

  // 10. Project Phases sheet
  const projectPhasesSheet = workbook.addWorksheet('Project Phases');
  projectPhasesSheet.columns = [{ header: 'Phase', key: 'phase', width: 30 }];
  PHASES.forEach(phase => {
    projectPhasesSheet.addRow({ phase });
  });

  // Save the workbook
  const outputPath = path.join(__dirname, 'simple-test-data.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Simple test data generated at: ${outputPath}`);
}

generateSimpleTestData().catch(console.error);
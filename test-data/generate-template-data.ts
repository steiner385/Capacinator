import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTemplateData() {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Project Types sheet
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [{ header: 'Project Type', key: 'type', width: 30 }];
  projectTypesSheet.addRows([
    { type: 'Infrastructure' },
    { type: 'Mobile Application' },
    { type: 'Web Application' },
    { type: 'Data Analytics' },
    { type: 'Research & Development' }
  ]);

  // 2. Project Phases sheet
  const phasesSheet = workbook.addWorksheet('Project Phases');
  phasesSheet.columns = [{ header: 'Phase', key: 'phase', width: 30 }];
  // This is optional as phases will be created from abbreviations

  // 3. Roles sheet
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'CW Option', key: 'cwOption', width: 20 },
    { header: 'Required Data Access', key: 'dataAccess', width: 40 }
  ];
  rolesSheet.addRows([
    { role: 'Project Manager', planOwner: 'Alice Johnson', cwOption: 'Y', dataAccess: 'Full project access' },
    { role: 'Developer', planOwner: 'Bob Smith', cwOption: 'Y', dataAccess: 'Code repository' },
    { role: 'QA Engineer', planOwner: 'Carol White', cwOption: 'Y', dataAccess: 'Test environments' },
    { role: 'Business Analyst', planOwner: 'Alice Johnson', cwOption: 'N', dataAccess: 'Requirements docs' },
    { role: 'UX Designer', planOwner: 'David Brown', cwOption: 'N', dataAccess: 'Design tools' }
  ]);

  // 4. Roster sheet
  const rosterSheet = workbook.addWorksheet('Roster');
  const fiscalWeeks = ['24FW36', '24FW37', '24FW38', '24FW39', '24FW40', '24FW41', '24FW42'];
  rosterSheet.columns = [
    { header: 'Person', key: 'person', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...fiscalWeeks.map(fw => ({ header: fw, key: fw, width: 10 }))
  ];
  rosterSheet.addRows([
    { person: 'Alice Johnson', role: 'Project Manager', '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 1, '24FW40': 0.8, '24FW41': 1, '24FW42': 1 },
    { person: 'Bob Smith', role: 'Developer', '24FW36': 1, '24FW37': 1, '24FW38': 0.6, '24FW39': 0.6, '24FW40': 1, '24FW41': 1, '24FW42': 1 },
    { person: 'Carol White', role: 'QA Engineer', '24FW36': 0.8, '24FW37': 0.8, '24FW38': 1, '24FW39': 1, '24FW40': 1, '24FW41': 0.5, '24FW42': 0.5 },
    { person: 'David Brown', role: 'UX Designer', '24FW36': 1, '24FW37': 1, '24FW38': 1, '24FW39': 0.4, '24FW40': 0.4, '24FW41': 1, '24FW42': 1 },
    { person: 'Eve Davis', role: 'Business Analyst', '24FW36': 1, '24FW37': 0.8, '24FW38': 0.8, '24FW39': 1, '24FW40': 1, '24FW41': 1, '24FW42': 0.6 }
  ]);

  // 5. Projects sheet
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project/Site', key: 'projectSite', width: 50 },
    { header: 'Project Type', key: 'type', width: 30 },
    { header: 'Inc. in Demand', key: 'includeInDemand', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  projectsSheet.addRows([
    { projectSite: 'Mobile Banking App / New York', type: 'Mobile Application', includeInDemand: 'Y', priority: 1 },
    { projectSite: 'Customer Portal / San Francisco', type: 'Web Application', includeInDemand: 'Y', priority: 2 },
    { projectSite: 'Data Warehouse Migration / Chicago', type: 'Infrastructure', includeInDemand: 'Y', priority: 1 },
    { projectSite: 'Analytics Dashboard / London', type: 'Data Analytics', includeInDemand: 'Y', priority: 3 }
  ]);

  // 6. Project Roadmap sheet
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  roadmapSheet.columns = [
    { header: 'Project/Site', key: 'projectSite', width: 50 },
    ...fiscalWeeks.map(fw => ({ header: fw, key: fw, width: 10 }))
  ];
  roadmapSheet.addRows([
    { projectSite: 'Mobile Banking App / New York', '24FW36': 'BP', '24FW37': 'REQ', '24FW38': 'REQ', '24FW39': 'DEV', '24FW40': 'DEV', '24FW41': 'SIT', '24FW42': 'UAT' },
    { projectSite: 'Customer Portal / San Francisco', '24FW36': 'PEND', '24FW37': 'BP', '24FW38': 'BP', '24FW39': 'REQ', '24FW40': 'DEV', '24FW41': 'DEV', '24FW42': 'DEV' },
    { projectSite: 'Data Warehouse Migration / Chicago', '24FW36': 'REQ', '24FW37': 'REQ', '24FW38': 'DEV', '24FW39': 'DEV', '24FW40': 'DEV', '24FW41': 'SIT', '24FW42': 'SIT' },
    { projectSite: 'Analytics Dashboard / London', '24FW36': 'BP', '24FW37': 'BP', '24FW38': 'REQ', '24FW39': 'REQ', '24FW40': 'REQ', '24FW41': 'DEV', '24FW42': 'DEV' }
  ]);

  // 7. Standard Allocations sheet
  const standardAllocSheet = workbook.addWorksheet('Standard Allocations');
  const phases = ['PEND', 'BP', 'REQ', 'DEV', 'SIT', 'UAT', 'PROD'];
  standardAllocSheet.columns = [
    { header: 'Role', key: 'role', width: 30 },
    { header: 'Project Type', key: 'type', width: 30 },
    ...phases.map(p => ({ header: p, key: p, width: 10 }))
  ];
  standardAllocSheet.addRows([
    { role: 'Project Manager', type: 'Mobile Application', PEND: 0.1, BP: 0.3, REQ: 0.3, DEV: 0.2, SIT: 0.2, UAT: 0.3, PROD: 0.1 },
    { role: 'Developer', type: 'Mobile Application', PEND: 0, BP: 0, REQ: 0.2, DEV: 1, SIT: 0.5, UAT: 0.2, PROD: 0 },
    { role: 'QA Engineer', type: 'Mobile Application', PEND: 0, BP: 0, REQ: 0.1, DEV: 0.3, SIT: 1, UAT: 0.8, PROD: 0 },
    { role: 'Business Analyst', type: 'Mobile Application', PEND: 0.2, BP: 0.8, REQ: 1, DEV: 0.2, SIT: 0.1, UAT: 0.2, PROD: 0 },
    { role: 'UX Designer', type: 'Mobile Application', PEND: 0, BP: 0.5, REQ: 0.8, DEV: 0.3, SIT: 0, UAT: 0.1, PROD: 0 }
  ]);

  // 8. Project Demand sheet
  const demandSheet = workbook.addWorksheet('Project Demand');
  demandSheet.columns = [
    { header: 'Project/Site', key: 'projectSite', width: 50 },
    { header: 'Plan Owner', key: 'planOwner', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...fiscalWeeks.map(fw => ({ header: fw, key: fw, width: 10 }))
  ];
  demandSheet.addRows([
    { projectSite: 'Mobile Banking App / New York', planOwner: 'Alice Johnson', role: 'Project Manager', '24FW36': 0.3, '24FW37': 0.3, '24FW38': 0.3, '24FW39': 0.2, '24FW40': 0.2, '24FW41': 0.2, '24FW42': 0.3 },
    { projectSite: 'Mobile Banking App / New York', planOwner: 'Bob Smith', role: 'Developer', '24FW36': 0, '24FW37': 0.2, '24FW38': 0.2, '24FW39': 1, '24FW40': 1, '24FW41': 0.5, '24FW42': 0.2 },
    { projectSite: 'Mobile Banking App / New York', planOwner: 'Carol White', role: 'QA Engineer', '24FW36': 0, '24FW37': 0.1, '24FW38': 0.1, '24FW39': 0.3, '24FW40': 0.3, '24FW41': 1, '24FW42': 0.8 }
  ]);

  // 9. Project Capacity Gaps sheet
  const gapsSheet = workbook.addWorksheet('Project Capacity Gaps');
  gapsSheet.columns = [
    { header: 'Project/Site', key: 'projectSite', width: 50 },
    { header: 'Role', key: 'role', width: 30 },
    ...fiscalWeeks.map(fw => ({ header: fw, key: fw, width: 10 }))
  ];
  // This will be calculated, so leave empty

  // 10. Project Assignments sheet
  const assignmentsSheet = workbook.addWorksheet('Project Assignments');
  assignmentsSheet.columns = [
    { header: 'Project/Site', key: 'projectSite', width: 50 },
    { header: 'Person', key: 'person', width: 30 },
    { header: 'Role', key: 'role', width: 30 },
    ...fiscalWeeks.map(fw => ({ header: fw, key: fw, width: 10 }))
  ];
  assignmentsSheet.addRows([
    { projectSite: 'Mobile Banking App / New York', person: 'Alice Johnson', role: 'Project Manager', '24FW36': 0.3, '24FW37': 0.3, '24FW38': 0.3, '24FW39': 0.2, '24FW40': 0.2, '24FW41': 0.2, '24FW42': 0.3 },
    { projectSite: 'Mobile Banking App / New York', person: 'Bob Smith', role: 'Developer', '24FW36': 0, '24FW37': 0.2, '24FW38': 0.2, '24FW39': 0.8, '24FW40': 0.8, '24FW41': 0.5, '24FW42': 0.2 }
  ]);

  // Save the workbook
  const outputPath = path.join(__dirname, 'sample-data-template.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Sample template data generated at: ${outputPath}`);
}

generateTemplateData().catch(console.error);
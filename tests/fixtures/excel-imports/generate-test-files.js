/**
 * Script to generate test Excel files for integration testing
 * Uses real ExcelJS library to create properly formatted test files
 */

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate a valid import file with complete data
 */
async function generateValidImportFile() {
  const workbook = new ExcelJS.Workbook();

  // 1. Project Types
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Default Phase', key: 'default_phase', width: 15 }
  ];
  projectTypesSheet.addRows([
    { type: 'Web Development', description: 'Web application projects', location: 'HQ', default_phase: 'PLAN' },
    { type: 'Mobile App', description: 'Mobile application projects', location: 'Remote', default_phase: 'PLAN' },
    { type: 'Infrastructure', description: 'Infrastructure and DevOps', location: 'HQ', default_phase: 'EXEC' }
  ]);

  // 2. Roles
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 },
    { header: 'CW Option', key: 'cw_option', width: 15 },
    { header: 'Data Access', key: 'data_access', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Department', key: 'department', width: 20 }
  ];
  rolesSheet.addRows([
    { role: 'Software Engineer', plan_owner: 'John Smith', cw_option: 'SWE', data_access: 'Full', description: 'Software development', department: 'Engineering' },
    { role: 'Project Manager', plan_owner: 'Jane Doe', cw_option: 'PM', data_access: 'Full', description: 'Project management', department: 'Management' },
    { role: 'UI Designer', plan_owner: 'Bob Wilson', cw_option: 'UX', data_access: 'Limited', description: 'UI/UX design', department: 'Design' }
  ]);

  // 3. Roster (People)
  const rosterSheet = workbook.addWorksheet('Roster');
  rosterSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Supervisor', key: 'supervisor', width: 20 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 }
  ];
  rosterSheet.addRows([
    { name: 'John Smith', role: 'Software Engineer', email: 'john@example.com', location: 'HQ', supervisor: 'Jane Doe', plan_owner: 'Yes' },
    { name: 'Jane Doe', role: 'Project Manager', email: 'jane@example.com', location: 'HQ', supervisor: '', plan_owner: 'Yes' },
    { name: 'Bob Wilson', role: 'UI Designer', email: 'bob@example.com', location: 'Remote', supervisor: 'Jane Doe', plan_owner: 'Yes' },
    { name: 'Alice Johnson', role: 'Software Engineer', email: 'alice@example.com', location: 'HQ', supervisor: 'John Smith', plan_owner: 'No' }
  ]);

  // 4. Projects
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 }
  ];
  projectsSheet.addRows([
    { project: 'Customer Portal @ HQ', type: 'Web Development', location: 'HQ', priority: 1, description: 'Customer-facing web portal', plan_owner: 'Jane Doe' },
    { project: 'Mobile App @ Remote', type: 'Mobile App', location: 'Remote', priority: 2, description: 'iOS and Android app', plan_owner: 'John Smith' },
    { project: 'Cloud Migration @ HQ', type: 'Infrastructure', location: 'HQ', priority: 1, description: 'Migrate to cloud infrastructure', plan_owner: 'Jane Doe' }
  ]);

  // 5. Project Roadmap
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  roadmapSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Phase', key: 'phase', width: 15 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'FY24W01', key: 'FY24W01', width: 10 },
    { header: 'FY24W02', key: 'FY24W02', width: 10 },
    { header: 'FY24W03', key: 'FY24W03', width: 10 },
    { header: 'FY24W04', key: 'FY24W04', width: 10 }
  ];
  roadmapSheet.addRows([
    { project: 'Customer Portal @ HQ', phase: '', location: 'HQ', FY24W01: 'PLAN', FY24W02: 'PLAN', FY24W03: 'EXEC', FY24W04: 'EXEC' },
    { project: 'Mobile App @ Remote', phase: '', location: 'Remote', FY24W01: 'INIT', FY24W02: 'PLAN', FY24W03: 'PLAN', FY24W04: 'EXEC' }
  ]);

  // 6. Resource Templates (Standard Allocations)
  const resourceTemplatesSheet = workbook.addWorksheet('Resource Templates');
  resourceTemplatesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Phase', key: 'phase', width: 15 },
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Allocation', key: 'allocation', width: 15 },
    { header: 'Description', key: 'description', width: 30 }
  ];
  resourceTemplatesSheet.addRows([
    { type: 'Web Development', phase: 'PLAN', role: 'Software Engineer', allocation: 0.5, description: 'Planning phase allocation' },
    { type: 'Web Development', phase: 'EXEC', role: 'Software Engineer', allocation: 1.0, description: 'Execution phase allocation' },
    { type: 'Mobile App', phase: 'PLAN', role: 'UI Designer', allocation: 0.75, description: 'Design planning' }
  ]);

  const filePath = join(__dirname, 'test-valid-import.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Created:', filePath);
}

/**
 * Generate a file with missing required columns
 */
async function generateMissingColumnsFile() {
  const workbook = new ExcelJS.Workbook();

  // Project Types with missing 'Description' column
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 }
    // Missing 'Description' column
  ];
  projectTypesSheet.addRows([
    { type: 'Web Development' },
    { type: 'Mobile App' }
  ]);

  // Roles sheet (complete)
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 },
    { header: 'CW Option', key: 'cw_option', width: 15 },
    { header: 'Data Access', key: 'data_access', width: 20 }
  ];
  rolesSheet.addRows([
    { role: 'Software Engineer', plan_owner: 'John Smith', cw_option: 'SWE', data_access: 'Full' }
  ]);

  // Roster (missing required 'Role' column)
  const rosterSheet = workbook.addWorksheet('Roster');
  rosterSheet.columns = [
    { header: 'Name', key: 'name', width: 20 }
    // Missing 'Role' column
  ];
  rosterSheet.addRows([
    { name: 'John Smith' }
  ]);

  // Projects (complete)
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  projectsSheet.addRows([
    { project: 'Test Project @ HQ', type: 'Web Development', location: 'HQ', priority: 1 }
  ]);

  // Project Roadmap (complete)
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  roadmapSheet.columns = [
    { header: 'Project', key: 'project', width: 30 }
  ];

  // Resource Templates (complete)
  const resourceTemplatesSheet = workbook.addWorksheet('Resource Templates');
  resourceTemplatesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Phase', key: 'phase', width: 15 },
    { header: 'Role', key: 'role', width: 20 }
  ];

  const filePath = join(__dirname, 'test-missing-columns.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Created:', filePath);
}

/**
 * Generate a file with duplicate entries
 */
async function generateDuplicatesFile() {
  const workbook = new ExcelJS.Workbook();

  // Project Types
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Description', key: 'description', width: 30 }
  ];
  projectTypesSheet.addRows([
    { type: 'Web Development', description: 'First entry' },
    { type: 'Mobile App', description: 'Unique entry' },
    { type: 'Web Development', description: 'Duplicate entry' } // Duplicate!
  ]);

  // Roles
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 },
    { header: 'CW Option', key: 'cw_option', width: 15 },
    { header: 'Data Access', key: 'data_access', width: 20 }
  ];
  rolesSheet.addRows([
    { role: 'Software Engineer', plan_owner: 'John Smith', cw_option: 'SWE', data_access: 'Full' },
    { role: 'Project Manager', plan_owner: 'Jane Doe', cw_option: 'PM', data_access: 'Full' },
    { role: 'software engineer', plan_owner: 'Bob Wilson', cw_option: 'SE2', data_access: 'Limited' } // Case-insensitive duplicate!
  ]);

  // Roster
  const rosterSheet = workbook.addWorksheet('Roster');
  rosterSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Role', key: 'role', width: 20 }
  ];
  rosterSheet.addRows([
    { name: 'John Smith', role: 'Software Engineer' },
    { name: 'Jane Doe', role: 'Project Manager' },
    { name: 'John Smith', role: 'Project Manager' } // Duplicate!
  ]);

  // Projects
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  projectsSheet.addRows([
    { project: 'Customer Portal @ HQ', type: 'Web Development', location: 'HQ', priority: 1 },
    { project: 'Mobile App @ Remote', type: 'Mobile App', location: 'Remote', priority: 2 },
    { project: 'Customer Portal @ HQ', type: 'Web Development', location: 'HQ', priority: 1 } // Duplicate!
  ]);

  // Project Roadmap
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  roadmapSheet.columns = [
    { header: 'Project', key: 'project', width: 30 }
  ];

  // Resource Templates
  const resourceTemplatesSheet = workbook.addWorksheet('Resource Templates');
  resourceTemplatesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Phase', key: 'phase', width: 15 },
    { header: 'Role', key: 'role', width: 20 }
  ];

  const filePath = join(__dirname, 'test-duplicates.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Created:', filePath);
}

/**
 * Generate a file with missing required worksheets
 */
async function generateMissingWorksheetsFile() {
  const workbook = new ExcelJS.Workbook();

  // Only include Projects sheet, missing all others
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  projectsSheet.addRows([
    { project: 'Test Project @ HQ', type: 'Web Development', location: 'HQ', priority: 1 }
  ]);

  const filePath = join(__dirname, 'test-missing-worksheets.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Created:', filePath);
}

/**
 * Generate a minimal valid file for quick tests
 */
async function generateMinimalValidFile() {
  const workbook = new ExcelJS.Workbook();

  // Project Types
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  projectTypesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Description', key: 'description', width: 30 }
  ];
  projectTypesSheet.addRows([
    { type: 'Test Type', description: 'Test description' }
  ]);

  // Roles
  const rolesSheet = workbook.addWorksheet('Roles');
  rolesSheet.columns = [
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Plan Owner', key: 'plan_owner', width: 20 },
    { header: 'CW Option', key: 'cw_option', width: 15 },
    { header: 'Data Access', key: 'data_access', width: 20 }
  ];
  rolesSheet.addRows([
    { role: 'Test Role', plan_owner: 'Test Person', cw_option: 'TR', data_access: 'Full' }
  ]);

  // Roster
  const rosterSheet = workbook.addWorksheet('Roster');
  rosterSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Role', key: 'role', width: 20 }
  ];
  rosterSheet.addRows([
    { name: 'Test Person', role: 'Test Role' }
  ]);

  // Projects
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Priority', key: 'priority', width: 10 }
  ];
  projectsSheet.addRows([
    { project: 'Test Project @ TestLoc', type: 'Test Type', location: 'TestLoc', priority: 1 }
  ]);

  // Project Roadmap
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  roadmapSheet.columns = [
    { header: 'Project', key: 'project', width: 30 }
  ];

  // Resource Templates
  const resourceTemplatesSheet = workbook.addWorksheet('Resource Templates');
  resourceTemplatesSheet.columns = [
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Phase', key: 'phase', width: 15 },
    { header: 'Role', key: 'role', width: 20 }
  ];

  const filePath = join(__dirname, 'test-minimal-valid.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log('✅ Created:', filePath);
}

// Generate all test files
async function generateAllTestFiles() {
  console.log('Generating test Excel files...\n');

  try {
    await generateValidImportFile();
    await generateMissingColumnsFile();
    await generateDuplicatesFile();
    await generateMissingWorksheetsFile();
    await generateMinimalValidFile();

    console.log('\n✅ All test files generated successfully!');
    console.log('\nTest files created:');
    console.log('  - test-valid-import.xlsx       (Complete valid import)');
    console.log('  - test-missing-columns.xlsx    (Missing required columns)');
    console.log('  - test-duplicates.xlsx         (Duplicate entries)');
    console.log('  - test-missing-worksheets.xlsx (Missing required sheets)');
    console.log('  - test-minimal-valid.xlsx      (Minimal valid structure)');
  } catch (error) {
    console.error('❌ Error generating test files:', error);
    process.exit(1);
  }
}

generateAllTestFiles();

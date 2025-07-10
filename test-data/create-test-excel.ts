import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  
  // Projects worksheet with various edge cases
  const projectsSheet = workbook.addWorksheet('Projects');
  projectsSheet.columns = [
    { header: 'Project Name', key: 'name', width: 30 },
    { header: 'Project Type', key: 'type', width: 20 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'End Date', key: 'endDate', width: 15 },
    { header: 'Owner', key: 'owner', width: 20 }
  ];

  // Add test projects with edge cases
  projectsSheet.addRows([
    // Normal valid projects
    {
      name: 'Enterprise Data Migration',
      type: 'Infrastructure',
      location: 'New York',
      priority: 1,
      description: 'Migrate legacy systems to cloud infrastructure',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-09-30'),
      owner: 'John Smith'
    },
    {
      name: 'Mobile App Development',
      type: 'Mobile Application',
      location: 'San Francisco',
      priority: 2,
      description: 'Native iOS and Android apps for customer engagement',
      startDate: new Date('2024-04-15'),
      endDate: new Date('2024-10-15'),
      owner: 'Sarah Johnson'
    },
    
    // Edge cases
    {
      name: 'Project with Special Characters!@#$%^&*()',
      type: 'Web Application',
      location: 'London',
      priority: 3,
      description: 'Testing special chars: <script>alert("test")</script>',
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-08-01'),
      owner: 'Alice Brown'
    },
    {
      name: 'Very Long Project Name That Exceeds Normal Length Expectations And Tests Database Field Limits With Even More Text Added Here',
      type: 'Research & Development',
      location: 'Tokyo',
      priority: 1,
      description: null, // Missing description
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-06-01'),
      owner: 'Missing Person' // Non-existent owner
    },
    {
      name: 'Project with Invalid Dates',
      type: 'Infrastructure',
      location: 'Berlin',
      priority: 'High', // Invalid priority (not a number)
      description: 'Testing date validation',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-06-01'), // End date before start date
      owner: 'Bob Wilson'
    },
    {
      name: 'Unicode Project 项目 プロジェクト проект',
      type: 'New Type That Does Not Exist',
      location: 'New Location Not In System',
      priority: 999, // Extremely high priority
      description: 'Testing unicode characters and emojis 🚀 🎯 📊',
      startDate: 'Invalid Date String',
      endDate: null, // Missing end date
      owner: null // Missing owner
    },
    {
      name: '', // Empty project name
      type: 'Web Application',
      location: 'Paris',
      priority: 2,
      description: 'Project with no name',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-09-01'),
      owner: 'Charlie Davis'
    },
    {
      name: 'Duplicate Project Name', // Duplicate name (appears twice)
      type: 'Mobile Application',
      location: 'Sydney',
      priority: 0, // Zero priority
      description: 'First instance of duplicate',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-11-01'),
      owner: 'David Lee'
    },
    {
      name: 'Duplicate Project Name', // Duplicate name (second instance)
      type: 'Infrastructure',
      location: 'Mumbai',
      priority: -5, // Negative priority
      description: 'Second instance of duplicate',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-01'),
      owner: 'Emma Wilson'
    },
    {
      name: '   Whitespace Project Name   ', // Leading/trailing whitespace
      type: '   Web Application   ',
      location: '   Boston   ',
      priority: 3.14159, // Decimal priority
      description: '   Description with whitespace   ',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-01-01'),
      owner: '   Frank Miller   '
    }
  ]);

  // Rosters worksheet with edge cases
  const rostersSheet = workbook.addWorksheet('Rosters');
  rostersSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Primary Role', key: 'role', width: 20 },
    { header: 'Worker Type', key: 'workerType', width: 15 },
    { header: 'Supervisor', key: 'supervisor', width: 25 },
    { header: 'Availability %', key: 'availability', width: 15 },
    { header: 'Hours Per Day', key: 'hoursPerDay', width: 15 }
  ];

  rostersSheet.addRows([
    // Normal valid people
    {
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'Project Manager',
      workerType: 'FTE',
      supervisor: 'CEO',
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Senior Developer',
      workerType: 'FTE',
      supervisor: 'John Smith',
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: 'Alice Brown',
      email: 'alice.brown@company.com',
      role: 'UX Designer',
      workerType: 'FTE',
      supervisor: 'John Smith',
      availability: 80,
      hoursPerDay: 8
    },
    
    // Edge cases
    {
      name: 'Bob Wilson',
      email: 'duplicate@email.com', // Duplicate email (appears twice)
      role: 'DevOps Engineer',
      workerType: 'Contractor',
      supervisor: 'Sarah Johnson',
      availability: 50,
      hoursPerDay: 4
    },
    {
      name: 'Charlie Davis',
      email: 'duplicate@email.com', // Duplicate email
      role: 'QA Engineer',
      workerType: 'Consultant',
      supervisor: 'Non-Existent Supervisor',
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: 'David Lee',
      email: 'invalid-email-format', // Invalid email format
      role: 'Role That Does Not Exist',
      workerType: 'Invalid Type',
      supervisor: 'Self', // Self-supervising
      availability: 200, // Over 100%
      hoursPerDay: 25 // More than 24 hours
    },
    {
      name: 'Emma Wilson',
      email: null, // Missing email
      role: null, // Missing role
      workerType: null, // Missing worker type
      supervisor: null, // Missing supervisor
      availability: null, // Missing availability
      hoursPerDay: null // Missing hours
    },
    {
      name: '', // Empty name
      email: 'noname@company.com',
      role: 'Data Analyst',
      workerType: 'FTE',
      supervisor: 'John Smith',
      availability: 75,
      hoursPerDay: 6
    },
    {
      name: 'Frank Miller',
      email: 'frank@company.com',
      role: 'Business Analyst',
      workerType: 'FTE',
      supervisor: 'Circular Reference 1', // Circular supervision
      availability: -50, // Negative availability
      hoursPerDay: -8 // Negative hours
    },
    {
      name: 'Circular Reference 1',
      email: 'circular1@company.com',
      role: 'Team Lead',
      workerType: 'FTE',
      supervisor: 'Circular Reference 2',
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: 'Circular Reference 2',
      email: 'circular2@company.com',
      role: 'Team Lead',
      workerType: 'FTE',
      supervisor: 'Frank Miller', // Completes circular reference
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: 'Unicode Person 李明 山田太郎',
      email: 'unicode@company.com',
      role: 'Full Stack Developer',
      workerType: 'FTE',
      supervisor: 'John Smith',
      availability: 'Full Time', // String instead of number
      hoursPerDay: 'Eight' // String instead of number
    },
    {
      name: 'Grace Wilson',
      email: 'grace.wilson@company.com',
      role: 'Product Manager',
      workerType: 'FTE',
      supervisor: null,
      availability: 100,
      hoursPerDay: 8
    },
    {
      name: '   Whitespace Person   ',
      email: '   whitespace@company.com   ',
      role: '   Developer   ',
      workerType: '   FTE   ',
      supervisor: '   John Smith   ',
      availability: 100.5, // Decimal availability
      hoursPerDay: 7.5 // Decimal hours
    },
    {
      name: 'Very Long Name That Exceeds Normal Database Field Limits And Tests The System Robustness With Even More Characters Added Here',
      email: 'verylongemailaddressthatexceedsnormallimitsandteststhesystemrobustness@verylongdomainnamethatalsotestslimits.com',
      role: 'Very Long Role Name That Tests Database Limits',
      workerType: 'FTE',
      supervisor: 'John Smith',
      availability: 100,
      hoursPerDay: 8
    }
  ]);

  // Standard Allocations worksheet with edge cases
  const allocationsSheet = workbook.addWorksheet('Standard Allocations');
  allocationsSheet.columns = [
    { header: 'Project Type', key: 'projectType', width: 20 },
    { header: 'Phase', key: 'phase', width: 20 },
    { header: 'Role', key: 'role', width: 20 },
    { header: 'Allocation %', key: 'allocation', width: 15 }
  ];

  allocationsSheet.addRows([
    // Normal valid allocations
    {
      projectType: 'Web Application',
      phase: 'Planning',
      role: 'Project Manager',
      allocation: 25
    },
    {
      projectType: 'Web Application',
      phase: 'Planning',
      role: 'Business Analyst',
      allocation: 50
    },
    {
      projectType: 'Web Application',
      phase: 'Design',
      role: 'UX Designer',
      allocation: 100
    },
    {
      projectType: 'Web Application',
      phase: 'Development',
      role: 'Senior Developer',
      allocation: 100
    },
    {
      projectType: 'Web Application',
      phase: 'Development',
      role: 'DevOps Engineer',
      allocation: 25
    },
    
    // Edge cases
    {
      projectType: 'Mobile Application',
      phase: 'Development',
      role: 'Senior Developer',
      allocation: 150 // Over 100%
    },
    {
      projectType: 'Infrastructure',
      phase: 'Implementation',
      role: 'DevOps Engineer',
      allocation: -25 // Negative allocation
    },
    {
      projectType: '', // Empty project type
      phase: 'Testing',
      role: 'QA Engineer',
      allocation: 50
    },
    {
      projectType: 'Web Application',
      phase: '', // Empty phase
      role: 'Project Manager',
      allocation: 20
    },
    {
      projectType: 'Mobile Application',
      phase: 'Design',
      role: '', // Empty role
      allocation: 75
    },
    {
      projectType: 'New Type Not In Projects',
      phase: 'New Phase Not In System',
      role: 'New Role Not In People',
      allocation: 100
    },
    {
      projectType: 'Infrastructure',
      phase: 'Planning',
      role: 'Project Manager',
      allocation: null // Missing allocation
    },
    {
      projectType: 'Research & Development',
      phase: 'Research',
      role: 'Data Analyst',
      allocation: 'Full Time' // String instead of number
    },
    {
      projectType: '   Whitespace Type   ',
      phase: '   Whitespace Phase   ',
      role: '   Whitespace Role   ',
      allocation: 33.333 // Decimal allocation
    },
    {
      projectType: 'Web Application',
      phase: 'Development',
      role: 'Senior Developer',
      allocation: 100 // Duplicate allocation (same type/phase/role)
    },
    {
      projectType: 'Special Chars!@#$',
      phase: 'Phase & Testing',
      role: 'Role (Senior)',
      allocation: 50
    },
    {
      projectType: 'Unicode 项目类型',
      phase: 'フェーズ',
      role: 'Роль',
      allocation: 75
    },
    {
      projectType: null, // All nulls
      phase: null,
      role: null,
      allocation: null
    },
    {
      projectType: 'Web Application',
      phase: 'Deployment',
      role: 'DevOps Engineer',
      allocation: 0 // Zero allocation
    },
    {
      projectType: 'Very Long Project Type Name That Tests Database Field Limits',
      phase: 'Very Long Phase Name That Tests Database Field Limits',
      role: 'Very Long Role Name That Tests Database Field Limits',
      allocation: 999999 // Extremely high allocation
    }
  ]);

  // Add an extra worksheet with unexpected name to test handling
  const extraSheet = workbook.addWorksheet('Unexpected Sheet');
  extraSheet.columns = [
    { header: 'Random Column 1', key: 'col1', width: 20 },
    { header: 'Random Column 2', key: 'col2', width: 20 }
  ];
  extraSheet.addRows([
    { col1: 'This sheet', col2: 'should be ignored' },
    { col1: 'by the import', col2: 'process' }
  ]);

  // Add formatting to make it look more realistic
  [projectsSheet, rostersSheet, allocationsSheet].forEach(sheet => {
    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add borders
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  });

  // Save the workbook
  const filePath = path.join(__dirname, 'test-import-data.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`Test Excel file created at: ${filePath}`);
  
  // Also create a minimal valid file for comparison
  const minimalWorkbook = new ExcelJS.Workbook();
  
  const minimalProjects = minimalWorkbook.addWorksheet('Projects');
  minimalProjects.columns = projectsSheet.columns;
  minimalProjects.addRow({
    name: 'Simple Project',
    type: 'Web Application',
    location: 'New York',
    priority: 1,
    description: 'A simple valid project',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    owner: 'John Doe'
  });

  const minimalRosters = minimalWorkbook.addWorksheet('Rosters');
  minimalRosters.columns = rostersSheet.columns;
  minimalRosters.addRow({
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'Developer',
    workerType: 'FTE',
    supervisor: null,
    availability: 100,
    hoursPerDay: 8
  });

  const minimalAllocations = minimalWorkbook.addWorksheet('Standard Allocations');
  minimalAllocations.columns = allocationsSheet.columns;
  minimalAllocations.addRow({
    projectType: 'Web Application',
    phase: 'Development',
    role: 'Developer',
    allocation: 100
  });

  const minimalFilePath = path.join(__dirname, 'minimal-valid-import.xlsx');
  await minimalWorkbook.xlsx.writeFile(minimalFilePath);
  console.log(`Minimal valid Excel file created at: ${minimalFilePath}`);
}

// Run the script
createTestExcel().catch(console.error);
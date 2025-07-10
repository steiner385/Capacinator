import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate fiscal week columns from 24FW36 through 25FW11
function generateFiscalWeekColumns(): string[] {
  const columns: string[] = [];
  
  // FY24: FW36 through FW52
  for (let week = 36; week <= 52; week++) {
    columns.push(`24FW${week}`);
  }
  
  // FY25: FW1 through FW11
  for (let week = 1; week <= 11; week++) {
    columns.push(`25FW${week.toString().padStart(2, '0')}`);
  }
  
  return columns;
}

async function createOriginalExcel() {
  const workbook = new ExcelJS.Workbook();
  const fiscalWeeks = generateFiscalWeekColumns();
  
  // Projects worksheet
  const projectsSheet = workbook.addWorksheet('Projects');
  const projectsColumns = ['Projects', 'Inc. in Demand', 'Priority', 'ProjType', 'Location', 'Data Restrictions', 'Description', 'In Demand', 'In Gaps', 'In Assignments', 'Asp. Start', 'Asp. Finish'];
  projectsSheet.columns = projectsColumns.map(col => ({ header: col, key: col, width: 20 }));
  
  // Project Roadmap worksheet
  const roadmapSheet = workbook.addWorksheet('Project Roadmap');
  const roadmapColumns = ['Project/Site', ...fiscalWeeks];
  roadmapSheet.columns = roadmapColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Project Demand worksheet
  const demandSheet = workbook.addWorksheet('Project Demand');
  const demandColumns = ['Project/Site', 'Priority', 'ProjType', 'Role', 'Plan Owner', 'Has Demand', ...fiscalWeeks];
  demandSheet.columns = demandColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Project Capacity Gaps worksheet
  const capacityGapsSheet = workbook.addWorksheet('Project Capacity Gaps');
  const capacityGapsColumns = ['Project/Site', 'Priority', 'ProjType', 'Role', 'Plan Owner', 'Over Capacity', 'Under Capacity', ...fiscalWeeks];
  capacityGapsSheet.columns = capacityGapsColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Project Assignments worksheet
  const assignmentsSheet = workbook.addWorksheet('Project Assignments');
  const assignmentsColumns = ['Project/Site', 'Priority', 'Person', 'Role', 'Plan Owner', ...fiscalWeeks];
  assignmentsSheet.columns = assignmentsColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Standard Allocations worksheet
  const standardAllocationsSheet = workbook.addWorksheet('Standard Allocations');
  const standardAllocationsColumns = ['Role', 'ProjType', 'Plan Owner', 'Missing Dmd Rows', 'Missing Cpcty Rows', 'PEND', 'BP', 'DEV', 'SIT', 'VAL', 'UAT', 'CUT', 'HC', 'SUP', 'IDLE', 'BLKOUT', 'GL'];
  standardAllocationsSheet.columns = standardAllocationsColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Roles worksheet
  const rolesSheet = workbook.addWorksheet('Roles');
  const rolesColumns = ['Role', 'Plan Owner', 'Description', 'CW Option', 'Req. Data Access', 'Current Primary Count', 'Current Gap', 'Min Demand', 'Max Demand', 'Avg Demand', ...fiscalWeeks];
  rolesSheet.columns = rolesColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Roster worksheet
  const rosterSheet = workbook.addWorksheet('Roster');
  const rosterColumns = ['Person', 'Primary Role', 'Plan Owner', 'Worker Type', ...fiscalWeeks];
  rosterSheet.columns = rosterColumns.map(col => ({ header: col, key: col, width: 15 }));
  
  // Project Types worksheet
  const projectTypesSheet = workbook.addWorksheet('Project Types');
  const projectTypesColumns = ['Type', 'Description'];
  projectTypesSheet.columns = projectTypesColumns.map(col => ({ header: col, key: col, width: 30 }));
  
  // Project Phases worksheet
  const phasesSheet = workbook.addWorksheet('Project Phases');
  const phasesColumns = ['Phase', 'Description'];
  phasesSheet.columns = phasesColumns.map(col => ({ header: col, key: col, width: 30 }));
  
  // Add formatting to all sheets
  workbook.worksheets.forEach(sheet => {
    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add borders to header row
    sheet.getRow(1).eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Save the workbook
  const filePath = path.join(__dirname, 'original-template.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`Original Excel template created at: ${filePath}`);
}

// Run the script
createOriginalExcel().catch(console.error);
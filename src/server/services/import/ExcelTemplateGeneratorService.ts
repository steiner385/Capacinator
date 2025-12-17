import type { Knex } from 'knex';
import { logger } from '../logging/config.js';

export interface TemplateOptions {
  templateType: string;
  includeAssignments: boolean;
  includePhases: boolean;
  generatedAt: string;
}

export interface ExportOptions {
  includeAssignments: boolean;
  includePhases: boolean;
  exportedBy: string;
  exportedAt: string;
}

/**
 * ExcelTemplateGeneratorService
 * Handles Excel template and data export sheet generation with consistent formatting
 */
export class ExcelTemplateGeneratorService {
  constructor(private db: Knex) {}

  /**
   * Add template information sheet with configuration details
   */
  async addTemplateInfoSheet(workbook: any, templateOptions: TemplateOptions): Promise<void> {
    try {
      const infoSheet = workbook.addWorksheet('Template Info');

      // Define columns for template info
      infoSheet.columns = [
        { header: 'Property', key: 'property', width: 30 },
        { header: 'Value', key: 'value', width: 50 }
      ];

      // Style the header row
      this.styleHeaderRow(infoSheet);

      // Add template information
      const templateInfo = [
        { property: 'Template Type', value: 'Capacinator Data Import Template' },
        { property: 'Template Version', value: 'V1.0 - Enhanced' },
        { property: 'Compatible Import Format', value: 'V1 (Standard) and V2 (Fiscal Weeks)' },
        { property: 'Generated At', value: templateOptions.generatedAt },
        { property: 'Template Configuration', value: templateOptions.templateType },
        { property: 'Include Assignments Sheet', value: templateOptions.includeAssignments ? 'Yes' : 'No' },
        { property: 'Include Phase Timelines Sheet', value: templateOptions.includePhases ? 'Yes' : 'No' },
        { property: 'Capacinator Version', value: 'v1.0.0' }
      ];

      templateInfo.forEach(item => {
        infoSheet.addRow(item);
      });

      // Add usage instructions
      infoSheet.addRow({});
      infoSheet.addRow({ property: 'USAGE INSTRUCTIONS', value: '' });
      infoSheet.addRow({ property: '1. Fill in Data', value: 'Complete the data in each worksheet tab' });
      infoSheet.addRow({ property: '2. Follow Format', value: 'Follow the exact column headers and data formats shown' });
      infoSheet.addRow({ property: '3. Remove Sample Data', value: 'Delete any sample/example rows before importing' });
      infoSheet.addRow({ property: '4. Validate Data', value: 'Use the Import page to validate before final import' });
      infoSheet.addRow({ property: '5. Review Instructions', value: 'Check the Instructions tab for detailed requirements' });
    } catch (error) {
      logger.error('Error adding template info sheet', error as Error, { templateOptions });
      throw error;
    }
  }

  /**
   * Add projects template sheet with sample data
   */
  async addProjectsTemplateSheet(workbook: any): Promise<void> {
    try {
      const projectsSheet = workbook.addWorksheet('Projects');

      // Define columns with enhanced format
      projectsSheet.columns = [
        { header: 'Project Name *', key: 'name', width: 30 },
        { header: 'Project Type *', key: 'project_type', width: 20 },
        { header: 'Project Sub Type', key: 'project_sub_type', width: 20 },
        { header: 'Location *', key: 'location', width: 20 },
        { header: 'Priority', key: 'priority', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Owner', key: 'owner', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Aspiration Start', key: 'aspiration_start', width: 15 },
        { header: 'Aspiration Finish', key: 'aspiration_finish', width: 15 },
        { header: 'External ID', key: 'external_id', width: 20 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(projectsSheet);

      // Add data validation and sample data
      projectsSheet.addRow({
        name: 'Example: Digital Transformation Initiative',
        project_type: 'Development',
        project_sub_type: 'Web Application',
        location: 'San Francisco',
        priority: 2,
        description: 'Complete modernization of legacy systems with cloud migration',
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        owner: 'Jane Smith',
        status: 'planned',
        aspiration_start: '2024-01-01',
        aspiration_finish: '2024-11-30',
        external_id: 'PROJ-2024-001'
      });

      // Add data format notes
      this.addFormatNotesToSheet(projectsSheet, [
        'Required fields marked with *',
        'Dates should be in YYYY-MM-DD format',
        'Priority: 1=Low, 2=Medium, 3=High',
        'Status values: planned, active, on-hold, completed',
        'Delete this sample row before importing'
      ]);
    } catch (error) {
      logger.error('Error adding projects template sheet', error as Error);
      throw error;
    }
  }

  /**
   * Add people/rosters template sheet with sample data
   */
  async addPeopleTemplateSheet(workbook: any): Promise<void> {
    try {
      const rostersSheet = workbook.addWorksheet('Rosters');

      // Define columns with enhanced format
      rostersSheet.columns = [
        { header: 'Name *', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Primary Role', key: 'primary_role', width: 20 },
        { header: 'Worker Type *', key: 'worker_type', width: 15 },
        { header: 'Supervisor', key: 'supervisor', width: 25 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Availability % *', key: 'availability', width: 15 },
        { header: 'Hours Per Day *', key: 'hours_per_day', width: 15 },
        { header: 'Is Bubble', key: 'is_bubble', width: 12 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(rostersSheet);

      // Add sample data with realistic examples
      rostersSheet.addRow({
        name: 'Alice Johnson',
        email: 'alice.johnson@company.com',
        primary_role: 'Senior Developer',
        worker_type: 'FTE',
        supervisor: 'Bob Smith',
        location: 'San Francisco',
        availability: 100,
        hours_per_day: 8,
        is_bubble: 'No'
      });

      rostersSheet.addRow({
        name: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@company.com',
        primary_role: 'UI/UX Designer',
        worker_type: 'Contractor',
        supervisor: 'Alice Johnson',
        location: 'Remote',
        availability: 75,
        hours_per_day: 6,
        is_bubble: 'Yes'
      });

      // Add data format notes
      this.addFormatNotesToSheet(rostersSheet, [
        'Required fields marked with *',
        'Worker Type: FTE, Contractor, or Consultant',
        'Availability: percentage (0-100)',
        'Hours Per Day: decimal numbers allowed (e.g., 7.5)',
        'Is Bubble: Yes or No (indicates temporary/flexible resource)',
        'Delete sample rows before importing'
      ]);
    } catch (error) {
      logger.error('Error adding people template sheet', error as Error);
      throw error;
    }
  }

  /**
   * Add standard allocations template sheet
   */
  async addStandardAllocationsTemplateSheet(workbook: any): Promise<void> {
    try {
      const allocationsSheet = workbook.addWorksheet('Standard Allocations');

      // Define columns with enhanced format
      allocationsSheet.columns = [
        { header: 'Project Type *', key: 'project_type', width: 20 },
        { header: 'Project Sub Type', key: 'project_sub_type', width: 20 },
        { header: 'Phase *', key: 'phase', width: 20 },
        { header: 'Role *', key: 'role', width: 20 },
        { header: 'Allocation % *', key: 'allocation', width: 15 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(allocationsSheet);

      // Add comprehensive sample data
      allocationsSheet.addRow({
        project_type: 'Development',
        project_sub_type: 'Web Application',
        phase: 'Planning',
        role: 'Project Manager',
        allocation: 25
      });

      allocationsSheet.addRow({
        project_type: 'Development',
        project_sub_type: 'Web Application',
        phase: 'Development',
        role: 'Senior Developer',
        allocation: 80
      });

      allocationsSheet.addRow({
        project_type: 'Development',
        project_sub_type: 'Mobile Application',
        phase: 'Testing',
        role: 'QA Engineer',
        allocation: 100
      });

      // Add data format notes
      this.addFormatNotesToSheet(allocationsSheet, [
        'Required fields marked with *',
        'Allocation: percentage of time (0-100)',
        'Project Sub Type is optional - leave blank for general type allocations',
        'These define default allocations for project planning',
        'Delete sample rows before importing'
      ]);
    } catch (error) {
      logger.error('Error adding standard allocations template sheet', error as Error);
      throw error;
    }
  }

  /**
   * Add project assignments template sheet
   */
  async addAssignmentsTemplateSheet(workbook: any): Promise<void> {
    try {
      const assignmentsSheet = workbook.addWorksheet('Project Assignments');

      // Define columns for assignments
      assignmentsSheet.columns = [
        { header: 'Project Name *', key: 'project_name', width: 30 },
        { header: 'Person Name *', key: 'person_name', width: 25 },
        { header: 'Role *', key: 'role_name', width: 20 },
        { header: 'Phase', key: 'phase_name', width: 20 },
        { header: 'Allocation % *', key: 'allocation_percentage', width: 15 },
        { header: 'Assignment Mode *', key: 'assignment_date_mode', width: 15 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'End Date', key: 'end_date', width: 15 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(assignmentsSheet);

      // Add sample assignment data
      assignmentsSheet.addRow({
        project_name: 'Digital Transformation Initiative',
        person_name: 'Alice Johnson',
        role_name: 'Senior Developer',
        phase_name: 'Development',
        allocation_percentage: 75,
        assignment_date_mode: 'phase',
        start_date: '',
        end_date: '',
        notes: 'Lead developer for backend services'
      });

      assignmentsSheet.addRow({
        project_name: 'Digital Transformation Initiative',
        person_name: 'Carlos Rodriguez',
        role_name: 'UI/UX Designer',
        phase_name: 'Design',
        allocation_percentage: 50,
        assignment_date_mode: 'fixed',
        start_date: '2024-02-01',
        end_date: '2024-04-30',
        notes: 'Responsible for user interface design'
      });

      // Add data format notes
      this.addFormatNotesToSheet(assignmentsSheet, [
        'Required fields marked with *',
        'Assignment Mode: fixed, phase, or project',
        'For fixed mode: provide Start Date and End Date',
        'For phase/project mode: dates calculated automatically',
        'Allocation: percentage of person\'s time (0-100)',
        'Delete sample rows before importing'
      ]);
    } catch (error) {
      logger.error('Error adding assignments template sheet', error as Error);
      throw error;
    }
  }

  /**
   * Add project phase timelines template sheet
   */
  async addPhaseTimelinesTemplateSheet(workbook: any): Promise<void> {
    try {
      const phasesSheet = workbook.addWorksheet('Project Phase Timelines');

      // Define columns for phase timelines
      phasesSheet.columns = [
        { header: 'Project Name *', key: 'project_name', width: 30 },
        { header: 'Phase Name *', key: 'phase_name', width: 25 },
        { header: 'Start Date *', key: 'start_date', width: 15 },
        { header: 'End Date *', key: 'end_date', width: 15 },
        { header: 'Notes', key: 'notes', width: 40 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(phasesSheet);

      // Add sample phase timeline data
      phasesSheet.addRow({
        project_name: 'Digital Transformation Initiative',
        phase_name: 'Planning',
        start_date: '2024-01-15',
        end_date: '2024-02-15',
        notes: 'Requirements gathering and architecture design'
      });

      phasesSheet.addRow({
        project_name: 'Digital Transformation Initiative',
        phase_name: 'Development',
        start_date: '2024-02-16',
        end_date: '2024-08-31',
        notes: 'Core development phase with iterative releases'
      });

      phasesSheet.addRow({
        project_name: 'Digital Transformation Initiative',
        phase_name: 'Testing',
        start_date: '2024-09-01',
        end_date: '2024-10-31',
        notes: 'UAT, performance testing, and bug fixes'
      });

      // Add data format notes
      this.addFormatNotesToSheet(phasesSheet, [
        'Required fields marked with *',
        'Dates should be in YYYY-MM-DD format',
        'Phases should be sequential and non-overlapping',
        'Phase names must match existing system phases',
        'Delete sample rows before importing'
      ]);
    } catch (error) {
      logger.error('Error adding phase timelines template sheet', error as Error);
      throw error;
    }
  }

  /**
   * Add instructions sheet with comprehensive usage guidelines
   */
  async addInstructionsSheet(workbook: any, templateOptions: TemplateOptions): Promise<void> {
    try {
      const instructionsSheet = workbook.addWorksheet('Instructions');

      // Define columns for instructions
      instructionsSheet.columns = [
        { header: 'Section', key: 'section', width: 25 },
        { header: 'Instructions', key: 'instructions', width: 80 }
      ];

      // Enhanced header styling
      this.styleHeaderRow(instructionsSheet);

      // Add comprehensive instructions
      const instructions = [
        { section: 'OVERVIEW', instructions: 'This template allows you to import data into Capacinator. Complete each worksheet tab with your data following the format requirements.' },
        { section: '', instructions: '' },
        { section: 'GENERAL RULES', instructions: '' },
        { section: 'Required Fields', instructions: 'Fields marked with * are required and must have values' },
        { section: 'Data Types', instructions: 'Follow exact data types: text, numbers, dates (YYYY-MM-DD), percentages (0-100)' },
        { section: 'Sample Data', instructions: 'Delete all sample/example rows before importing - they are for reference only' },
        { section: 'Validation', instructions: 'Use the Import page validation feature before final import to check for errors' },
        { section: '', instructions: '' },
        { section: 'WORKSHEET DETAILS', instructions: '' },
        { section: 'Projects', instructions: 'Define projects with types, locations, priorities, and timelines' },
        { section: 'Rosters', instructions: 'Define people/resources with roles, availability, and supervisor relationships' },
        { section: 'Standard Allocations', instructions: 'Define default time allocations for role-phase combinations' }
      ];

      if (templateOptions.includeAssignments) {
        instructions.push({ section: 'Project Assignments', instructions: 'Assign specific people to projects with allocation percentages and date modes' });
      }

      if (templateOptions.includePhases) {
        instructions.push({ section: 'Phase Timelines', instructions: 'Define project phases with start/end dates and dependencies' });
      }

      instructions.push(
        { section: '', instructions: '' },
        { section: 'IMPORT PROCESS', instructions: '' },
        { section: '1. Prepare Data', instructions: 'Complete all worksheets, remove sample data, verify data formats' },
        { section: '2. Validate File', instructions: 'Use Import page validation to check for errors and compatibility' },
        { section: '3. Choose Import Mode', instructions: 'Select appropriate import options (clear existing, create missing entities, etc.)' },
        { section: '4. Review Results', instructions: 'Check import results and resolve any warnings or errors' },
        { section: '', instructions: '' },
        { section: 'SUPPORT', instructions: '' },
        { section: 'Data Relationships', instructions: 'Ensure referenced entities (people, roles, locations) exist or will be created during import' },
        { section: 'Date Formats', instructions: 'Always use YYYY-MM-DD format for dates (e.g., 2024-03-15)' },
        { section: 'Percentages', instructions: 'Enter percentages as numbers 0-100 (e.g., 75 for 75%)' },
        { section: 'Text Fields', instructions: 'Use consistent naming for entities that need to match (case-sensitive)' }
      );

      instructions.forEach(item => {
        instructionsSheet.addRow(item);
      });
    } catch (error) {
      logger.error('Error adding instructions sheet', error as Error, { templateOptions });
      throw error;
    }
  }

  /**
   * Add metadata sheet for exported data with scenario information
   */
  async addMetadataToWorkbook(workbook: any, scenario: any, exportOptions: ExportOptions): Promise<void> {
    try {
      const metadataSheet = workbook.addWorksheet('Export Metadata');

      // Define columns for metadata
      metadataSheet.columns = [
        { header: 'Property', key: 'property', width: 30 },
        { header: 'Value', key: 'value', width: 50 }
      ];

      // Style the header row
      this.styleHeaderRow(metadataSheet);

      // Add metadata rows
      const metadata = [
        { property: 'Export Type', value: 'Capacinator Scenario Export' },
        { property: 'Scenario Name', value: scenario.name },
        { property: 'Scenario Type', value: scenario.scenario_type },
        { property: 'Scenario ID', value: scenario.id },
        { property: 'Scenario Description', value: scenario.description || 'N/A' },
        { property: 'Parent Scenario ID', value: scenario.parent_scenario_id || 'N/A' },
        { property: 'Created By', value: scenario.created_by_name || 'Unknown' },
        { property: 'Scenario Created', value: scenario.created_at ? new Date(scenario.created_at).toISOString() : 'Unknown' },
        { property: 'Exported By', value: exportOptions.exportedBy },
        { property: 'Exported At', value: exportOptions.exportedAt },
        { property: 'Include Assignments', value: exportOptions.includeAssignments ? 'Yes' : 'No' },
        { property: 'Include Phase Timelines', value: exportOptions.includePhases ? 'Yes' : 'No' },
        { property: 'Export Format Version', value: 'V1 (Compatible with Import)' },
        { property: 'Capacinator Version', value: 'v1.0.0' }
      ];

      metadata.forEach(item => {
        metadataSheet.addRow(item);
      });

      // Add warning about re-import
      metadataSheet.addRow({});
      metadataSheet.addRow({ property: 'IMPORTANT NOTES', value: '' });
      metadataSheet.addRow({ property: 'Re-import Compatibility', value: 'This export is compatible with Capacinator import functionality' });
      metadataSheet.addRow({ property: 'Scenario Context', value: 'When re-importing, consider target scenario (baseline vs branch)' });
      metadataSheet.addRow({ property: 'Data Integrity', value: 'Verify all relationships exist in target environment before import' });
    } catch (error) {
      logger.error('Error adding metadata sheet', error as Error, { scenarioId: scenario?.id });
      throw error;
    }
  }

  /**
   * Helper: Add format notes section to sheet
   */
  private addFormatNotesToSheet(worksheet: any, notes: string[]): void {
    // Add spacing
    worksheet.addRow({});

    // Add notes header
    const notesHeaderRow = worksheet.addRow({ [worksheet.columns[0].key]: 'FORMAT NOTES:' });
    notesHeaderRow.font = { bold: true, color: { argb: 'FF0066CC' } };

    // Add each note
    notes.forEach(note => {
      const noteRow = worksheet.addRow({ [worksheet.columns[0].key]: `• ${note}` });
      noteRow.font = { italic: true, color: { argb: 'FF666666' } };
    });
  }

  /**
   * Helper: Style header row with formatting
   */
  private styleHeaderRow(worksheet: any): void {
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    worksheet.getRow(1).border = {
      bottom: { style: 'thin' }
    };
  }
}

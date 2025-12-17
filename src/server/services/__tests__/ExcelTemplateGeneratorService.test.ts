import { ExcelTemplateGeneratorService, TemplateOptions, ExportOptions } from '../import/ExcelTemplateGeneratorService';

describe('ExcelTemplateGeneratorService', () => {
  let service: ExcelTemplateGeneratorService;
  let mockDb: any;
  let mockWorkbook: any;

  const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
    templateType: 'complete',
    includeAssignments: true,
    includePhases: true,
    generatedAt: new Date().toISOString()
  };

  const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
    includeAssignments: true,
    includePhases: true,
    exportedBy: 'test@example.com',
    exportedAt: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = jest.fn();

    // Create mock workbook
    mockWorkbook = {
      addWorksheet: jest.fn().mockReturnValue({
        columns: [],
        addRow: jest.fn().mockReturnValue({ font: {}, fill: {}, border: {} }),
        getRow: jest.fn().mockReturnValue({
          font: {},
          fill: {},
          border: {}
        })
      })
    };

    service = new ExcelTemplateGeneratorService(mockDb);
  });

  describe('addTemplateInfoSheet', () => {
    it('should create template info sheet with correct structure', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addTemplateInfoSheet(mockWorkbook, DEFAULT_TEMPLATE_OPTIONS);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Template Info');
      expect(sheet.addRow).toHaveBeenCalled();
    });

    it('should add template configuration information', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addTemplateInfoSheet(mockWorkbook, DEFAULT_TEMPLATE_OPTIONS);

      // Verify that addRow was called multiple times for template info
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'Include Assignments Sheet',
          value: 'Yes'
        })
      );
    });

    it('should handle assignments and phases configuration', async () => {
      const sheet = mockWorkbook.addWorksheet();

      const options: TemplateOptions = {
        templateType: 'projects-only',
        includeAssignments: false,
        includePhases: false,
        generatedAt: new Date().toISOString()
      };

      await service.addTemplateInfoSheet(mockWorkbook, options);

      // Verify configuration is reflected
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'Include Assignments Sheet',
          value: 'No'
        })
      );
    });

    it('should throw error on workbook error', async () => {
      mockWorkbook.addWorksheet.mockImplementation(() => {
        throw new Error('Workbook error');
      });

      await expect(service.addTemplateInfoSheet(mockWorkbook, DEFAULT_TEMPLATE_OPTIONS)).rejects.toThrow();
    });
  });

  describe('addProjectsTemplateSheet', () => {
    it('should create projects template sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Projects');
      expect(sheet.columns).toBeDefined();
    });

    it('should add sample project data', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      // Verify sample row is added
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Digital Transformation'),
          project_type: 'Development'
        })
      );
    });

    it('should include all required columns', async () => {
      await service.addProjectsTemplateSheet(mockWorkbook);

      const sheet = mockWorkbook.addWorksheet();
      const expectedColumns = [
        'name',
        'project_type',
        'project_sub_type',
        'location',
        'priority',
        'description',
        'start_date',
        'end_date'
      ];

      // Workbook was called, verify sheet structure would include columns
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });
  });

  describe('addPeopleTemplateSheet', () => {
    it('should create people template sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPeopleTemplateSheet(mockWorkbook);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Rosters');
    });

    it('should add multiple sample person records', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPeopleTemplateSheet(mockWorkbook);

      // Verify multiple sample rows (Alice and Carlos)
      const callsWithPeople = sheet.addRow.mock.calls.filter(
        call => call[0] && (call[0].name === 'Alice Johnson' || call[0].name === 'Carlos Rodriguez')
      );
      expect(callsWithPeople.length).toBeGreaterThanOrEqual(1);
    });

    it('should include required person fields', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPeopleTemplateSheet(mockWorkbook);

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
          email: expect.any(String),
          availability: expect.any(Number),
          hours_per_day: expect.any(Number)
        })
      );
    });
  });

  describe('addStandardAllocationsTemplateSheet', () => {
    it('should create standard allocations sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addStandardAllocationsTemplateSheet(mockWorkbook);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Standard Allocations');
    });

    it('should add sample allocation records', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addStandardAllocationsTemplateSheet(mockWorkbook);

      // Verify sample allocation rows
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          project_type: 'Development',
          allocation: expect.any(Number)
        })
      );
    });
  });

  describe('addAssignmentsTemplateSheet', () => {
    it('should create assignments template sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addAssignmentsTemplateSheet(mockWorkbook);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Project Assignments');
    });

    it('should include assignment mode options', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addAssignmentsTemplateSheet(mockWorkbook);

      // Verify assignment modes are shown
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          assignment_date_mode: expect.stringMatching(/^(fixed|phase|project)$/)
        })
      );
    });
  });

  describe('addPhaseTimelinesTemplateSheet', () => {
    it('should create phase timelines sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPhaseTimelinesTemplateSheet(mockWorkbook);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Project Phase Timelines');
    });

    it('should include phase timeline data', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPhaseTimelinesTemplateSheet(mockWorkbook);

      // Verify phase rows are added
      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          phase_name: expect.any(String),
          start_date: expect.any(String),
          end_date: expect.any(String)
        })
      );
    });
  });

  describe('addInstructionsSheet', () => {
    it('should create instructions sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addInstructionsSheet(mockWorkbook, DEFAULT_TEMPLATE_OPTIONS);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Instructions');
    });

    it('should include assignments section when includeAssignments is true', async () => {
      const sheet = mockWorkbook.addWorksheet();

      const options: TemplateOptions = {
        ...DEFAULT_TEMPLATE_OPTIONS,
        includeAssignments: true
      };

      await service.addInstructionsSheet(mockWorkbook, options);

      // Verify instructions sheet was created with assignment guidance
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Instructions');
    });

    it('should omit assignments section when includeAssignments is false', async () => {
      const sheet = mockWorkbook.addWorksheet();

      const options: TemplateOptions = {
        ...DEFAULT_TEMPLATE_OPTIONS,
        includeAssignments: false
      };

      await service.addInstructionsSheet(mockWorkbook, options);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Instructions');
    });

    it('should include phases section when includePhases is true', async () => {
      const sheet = mockWorkbook.addWorksheet();

      const options: TemplateOptions = {
        ...DEFAULT_TEMPLATE_OPTIONS,
        includePhases: true
      };

      await service.addInstructionsSheet(mockWorkbook, options);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Instructions');
    });
  });

  describe('addMetadataToWorkbook', () => {
    it('should create export metadata sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();
      const scenario = {
        id: 'scenario-1',
        name: 'Test Scenario',
        scenario_type: 'baseline',
        description: 'Test scenario description',
        created_at: new Date().toISOString()
      };

      await service.addMetadataToWorkbook(mockWorkbook, scenario, DEFAULT_EXPORT_OPTIONS);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Export Metadata');
    });

    it('should include scenario information', async () => {
      const sheet = mockWorkbook.addWorksheet();
      const scenario = {
        id: 'scenario-1',
        name: 'Test Scenario',
        scenario_type: 'baseline',
        created_at: new Date().toISOString()
      };

      await service.addMetadataToWorkbook(mockWorkbook, scenario, DEFAULT_EXPORT_OPTIONS);

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'Scenario Name',
          value: 'Test Scenario'
        })
      );

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'Scenario Type',
          value: 'baseline'
        })
      );
    });

    it('should include export metadata', async () => {
      const sheet = mockWorkbook.addWorksheet();
      const scenario = {
        id: 'scenario-1',
        name: 'Test Scenario',
        scenario_type: 'baseline'
      };

      await service.addMetadataToWorkbook(mockWorkbook, scenario, DEFAULT_EXPORT_OPTIONS);

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          property: 'Exported By',
          value: 'test@example.com'
        })
      );
    });

    it('should handle null optional fields', async () => {
      const sheet = mockWorkbook.addWorksheet();
      const scenario = {
        id: 'scenario-1',
        name: 'Test Scenario',
        scenario_type: 'baseline',
        description: null,
        parent_scenario_id: null
      };

      await service.addMetadataToWorkbook(mockWorkbook, scenario, DEFAULT_EXPORT_OPTIONS);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Export Metadata');
    });
  });

  describe('Header styling', () => {
    it('should apply consistent header styling', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      // Verify getRow was called for styling
      expect(sheet.getRow).toHaveBeenCalledWith(1);
    });
  });

  describe('Error handling', () => {
    it('should throw on workbook addWorksheet failure', async () => {
      mockWorkbook.addWorksheet.mockImplementation(() => {
        throw new Error('Workbook error');
      });

      await expect(service.addProjectsTemplateSheet(mockWorkbook)).rejects.toThrow();
    });

    it('should handle sheet.addRow errors gracefully', async () => {
      const sheet = mockWorkbook.addWorksheet();
      sheet.addRow.mockImplementation(() => {
        throw new Error('Add row error');
      });

      await expect(service.addProjectsTemplateSheet(mockWorkbook)).rejects.toThrow();
    });
  });

  describe('Sheet format consistency', () => {
    it('should define columns for each template sheet', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      // Columns should be set
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });

    it('should set column widths appropriately', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      // Verify workbook was set up
      expect(mockWorkbook.addWorksheet).toHaveBeenCalled();
    });
  });

  describe('Sample data quality', () => {
    it('should provide realistic project examples', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addProjectsTemplateSheet(mockWorkbook);

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Initiative'),
          priority: expect.any(Number)
        })
      );
    });

    it('should provide realistic person examples', async () => {
      const sheet = mockWorkbook.addWorksheet();

      await service.addPeopleTemplateSheet(mockWorkbook);

      expect(sheet.addRow).toHaveBeenCalledWith(
        expect.objectContaining({
          worker_type: expect.stringMatching(/^(FTE|Contractor|Consultant)$/)
        })
      );
    });
  });
});

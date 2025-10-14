import { describe, test, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Import from '../../../../client/src/pages/Import';
import { ScenarioProvider, useScenario } from '../../../../client/src/contexts/ScenarioContext';
import { api } from '../../../../client/src/lib/api-client';

// Mock API client
jest.mock('../../../../client/src/lib/api-client', () => ({
  api: {
    import: {
      uploadExcel: jest.fn(),
      validateFile: jest.fn(),
      analyzeImport: jest.fn(),
      exportScenario: jest.fn(),
      exportTemplate: jest.fn(),
      getSettings: jest.fn(),
      getHistory: jest.fn(),
    },
    scenarios: {
      list: jest.fn(),
    },
  },
}));

// Mock global URL methods
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

// Mock scenario context
const mockScenarios = [
  {
    id: 'baseline-1',
    name: 'Baseline Scenario',
    scenario_type: 'baseline',
    description: 'Main baseline scenario',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'branch-1',
    name: 'Test Branch',
    scenario_type: 'branch',
    description: 'Test branch scenario',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

// Mock the useScenario hook directly
jest.mock('../../../../client/src/contexts/ScenarioContext', () => ({
  ScenarioProvider: ({ children }: any) => children,
  useScenario: jest.fn(),
}));

const renderWithProviders = async (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  let renderResult;
  await act(async () => {
    renderResult = render(
      <QueryClientProvider client={queryClient}>
        <ScenarioProvider>
          {component}
        </ScenarioProvider>
      </QueryClientProvider>
    );
  });
  
  return renderResult;
};

describe('Import Page', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockUseScenario = useScenario as jest.Mock;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Configure ScenarioContext mock
    mockUseScenario.mockReturnValue({
      currentScenario: mockScenarios[0], // Baseline scenario
      scenarios: mockScenarios,
      setCurrentScenario: jest.fn(),
      isLoading: false,
      error: null,
    });

    // Mock scenarios API
    (api.scenarios.list as jest.Mock).mockResolvedValue({
      data: mockScenarios,
    });

    // Mock import settings
    (api.import.getSettings as jest.Mock).mockResolvedValue({
      data: {
        data: {
          clearExistingData: false,
          validateDuplicates: true,
          autoCreateMissingRoles: false,
          autoCreateMissingLocations: false,
          defaultProjectPriority: 2,
          dateFormat: 'MM/DD/YYYY',
        },
      },
    });

    mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url');
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockUseScenario.mockReset();
  });

  describe('Page Rendering', () => {
    it('should render import and export sections', async () => {
      await renderWithProviders(<Import />);

      expect(screen.getByText('Import & Export Data')).toBeInTheDocument();
      expect(screen.getByText('Import Excel files or export current scenario data')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
      expect(screen.getByText('Export scenario data or download blank templates')).toBeInTheDocument();
    });

    it('should show file upload area', async () => {
      await renderWithProviders(<Import />);

      expect(screen.getByText('Drop Excel file here')).toBeInTheDocument();
      expect(screen.getByText('or click to browse')).toBeInTheDocument();
      expect(screen.getByText('Supports .xlsx and .xls files')).toBeInTheDocument();
    });

    it('should display import settings when loaded', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByText('Import Configuration')).toBeInTheDocument();
      });

      expect(screen.getByText('Validate duplicates: Yes')).toBeInTheDocument();
      expect(screen.getByText('Default project priority: Medium')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should render export scenario section', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Export Scenario Data' })).toBeInTheDocument();
      });

      expect(screen.getByText(/Export current scenario data in re-importable Excel format/)).toBeInTheDocument();
      expect(screen.getByLabelText('Choose Scenario to Export:')).toBeInTheDocument();
      
      // Click the "Show export options" button to reveal additional options
      const showOptionsButton = screen.getByRole('button', { name: /Show export options/ });
      await user.click(showOptionsButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Include Project Assignments')).toBeInTheDocument();
        expect(screen.getByLabelText('Include Phase Timelines')).toBeInTheDocument();
      });
    });

    it('should populate scenario selector with available scenarios', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        const select = screen.getByLabelText('Choose Scenario to Export:');
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByLabelText('Choose Scenario to Export:');
      const options = within(select).getAllByRole('option');
      
      expect(options).toHaveLength(3); // Current + 2 scenarios
      expect(within(select).getByText('Current: Baseline Scenario (baseline)')).toBeInTheDocument();
      expect(within(select).getByText('Test Branch (branch)')).toBeInTheDocument();
    });

    it('should export scenario data when button clicked', async () => {
      const mockBlob = new Blob(['mock excel data'], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      (api.import.exportScenario as jest.Mock).mockResolvedValue({
        data: mockBlob,
        headers: {
          'content-disposition': 'attachment; filename="baseline_export_2024-01-01.xlsx"'
        },
      });

      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Export Scenario Data' })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      await user.click(exportButton);

      await waitFor(() => {
        expect(api.import.exportScenario).toHaveBeenCalledWith(
          'baseline-1', // Should use baseline scenario by default
          expect.objectContaining({
            includeAssignments: true,
            includePhases: true,
          })
        );
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle export scenario options', async () => {
      await renderWithProviders(<Import />);

      // First click to show export options
      const showOptionsButton = screen.getByRole('button', { name: /Show export options/ });
      await user.click(showOptionsButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Include Project Assignments')).toBeInTheDocument();
      });

      // Uncheck options
      await user.click(screen.getByLabelText('Include Project Assignments'));
      await user.click(screen.getByLabelText('Include Phase Timelines'));

      // Mock export response
      (api.import.exportScenario as jest.Mock).mockResolvedValue({
        data: new Blob(['mock data']),
        headers: {},
      });

      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      await user.click(exportButton);

      await waitFor(() => {
        expect(api.import.exportScenario).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            includeAssignments: false,
            includePhases: false,
          })
        );
      });
    });

    it('should export template when template button clicked', async () => {
      const mockBlob = new Blob(['mock template data']);
      
      (api.import.exportTemplate as jest.Mock).mockResolvedValue({
        data: mockBlob,
        headers: {
          'content-disposition': 'attachment; filename="capacinator_template_complete_2024-01-01.xlsx"'
        },
      });

      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByText('Download Blank Template')).toBeInTheDocument();
      });

      const templateButton = screen.getByRole('button', { name: /Download blank Excel template/ });
      await user.click(templateButton);

      await waitFor(() => {
        expect(api.import.exportTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            templateType: 'complete',
            includeAssignments: true,
            includePhases: true,
          })
        );
      });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should handle different template types', async () => {
      await renderWithProviders(<Import />);

      // Click to show template options first
      const showTemplateOptionsButton = screen.getByRole('button', { name: /Show template customization options/ });
      await user.click(showTemplateOptionsButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Template Type:')).toBeInTheDocument();
      });

      // Change template type
      await user.selectOptions(screen.getByLabelText('Template Type:'), 'minimal');

      // Mock export response
      (api.import.exportTemplate as jest.Mock).mockResolvedValue({
        data: new Blob(['mock data']),
        headers: {},
      });

      const templateButton = screen.getByRole('button', { name: /Download blank Excel template/ });
      await user.click(templateButton);

      await waitFor(() => {
        expect(api.import.exportTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            templateType: 'minimal',
          })
        );
      });
    });

    it('should show loading states during export', async () => {
      // Mock delayed response
      (api.import.exportScenario as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: new Blob([]), headers: {} }), 100))
      );

      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export selected scenario data as Excel file/ })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      await user.click(exportButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /Exporting.../ })).toBeInTheDocument();
      expect(exportButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export selected scenario data as Excel file/ })).toBeInTheDocument();
      });
    });

    it('should handle export errors gracefully', async () => {
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      (api.import.exportScenario as jest.Mock).mockRejectedValue(
        new Error('Export failed')
      );

      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export selected scenario data as Excel file/ })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Export failed: Export failed');
      });

      mockAlert.mockRestore();
    });
  });

  describe('Import Functionality', () => {
    it('should handle file selection', async () => {
      await renderWithProviders(<Import />);

      const file = new File(['mock excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileInput = screen.getByText('Drop Excel file here');
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByText('test.xlsx')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Upload and Import/ })).toBeInTheDocument();
    });

    it('should validate file types', async () => {
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      await renderWithProviders(<Import />);

      const file = new File(['mock content'], 'test.txt', { type: 'text/plain' });
      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      expect(mockAlert).toHaveBeenCalledWith('Please select a valid Excel file (.xlsx or .xls)');
      
      mockAlert.mockRestore();
    });

    it('should perform import when upload button clicked', async () => {
      (api.import.uploadExcel as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          message: 'Import completed successfully',
          imported: {
            projects: 5,
            people: 10,
            locations: 2,
          },
        },
      });

      await renderWithProviders(<Import />);

      // Add a file
      const file = new File(['mock excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(hiddenInput);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upload and Import/ })).toBeInTheDocument();
      });

      // Click upload
      const uploadButton = screen.getByRole('button', { name: /Upload and Import/ });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(api.import.uploadExcel).toHaveBeenCalledWith(
          file,
          expect.objectContaining({
            clearExisting: false,
            useV2: true,
          })
        );
      });

      // Should show success result
      expect(screen.getByText('Import completed successfully')).toBeInTheDocument();
      expect(screen.getByText('projects:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should toggle import options', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByLabelText('Clear existing data before import')).toBeInTheDocument();
      });

      // Toggle clear existing data
      const clearExistingCheckbox = screen.getByLabelText('Clear existing data before import');
      await user.click(clearExistingCheckbox);

      expect(clearExistingCheckbox).toBeChecked();

      // Toggle V2 format
      const useV2Checkbox = screen.getByLabelText('Use new template format (fiscal weeks)');
      await user.click(useV2Checkbox);

      expect(useV2Checkbox).not.toBeChecked();
    });

    it('should show advanced settings when toggled', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Advanced Settings/ })).toBeInTheDocument();
      });

      const advancedButton = screen.getByRole('button', { name: /Advanced Settings/ });
      await user.click(advancedButton);

      expect(screen.getByText('Override Settings for This Import')).toBeInTheDocument();
      expect(screen.getByLabelText('Auto-create missing roles')).toBeInTheDocument();
      expect(screen.getByText('Default Project Priority:')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByLabelText('Choose Scenario to Export:')).toBeInTheDocument();
      });

      // Click to show template options
      const showTemplateOptionsButton = screen.getByRole('button', { name: /Show template customization options/ });
      await user.click(showTemplateOptionsButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Template Type:')).toBeInTheDocument();
      });

      // Click to show export options  
      const showExportOptionsButton = screen.getByRole('button', { name: /Show export options/ });
      await user.click(showExportOptionsButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Include Project Assignments')).toBeInTheDocument();
        expect(screen.getByLabelText('Include Phase Timelines')).toBeInTheDocument();
      });
    });

    it('should have proper button states', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
        expect(exportButton).toBeInTheDocument();
      });

      // Buttons should be enabled when scenarios are loaded
      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      const templateButton = screen.getByRole('button', { name: /Download blank Excel template/ });

      expect(exportButton).not.toBeDisabled();
      expect(templateButton).not.toBeDisabled();
    });

    it('should provide meaningful error messages', async () => {
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      (api.import.exportScenario as jest.Mock).mockRejectedValue({
        response: { data: { message: 'Scenario not found' } }
      });

      await renderWithProviders(<Import />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Export selected scenario data as Excel file/ })).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /Export selected scenario data as Excel file/ });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Export failed: Scenario not found');
      });

      mockAlert.mockRestore();
    });
  });

  describe('Integration with Context', () => {
    it('should use current scenario from context', async () => {
      await renderWithProviders(<Import />);

      await waitFor(() => {
        const select = screen.getByLabelText('Choose Scenario to Export:');
        expect(select).toBeInTheDocument();
      });

      // Should show current scenario in dropdown
      const select = screen.getByLabelText('Choose Scenario to Export:');
      expect(within(select).getByText(/Current: Baseline Scenario/)).toBeInTheDocument();
    });

    it('should handle scenario loading states', async () => {
      // Override mock to show loading state
      mockUseScenario.mockReturnValue({
        currentScenario: null,
        scenarios: [],
        setCurrentScenario: jest.fn(),
        isLoading: true,
        error: null,
      });

      await renderWithProviders(<Import />);

      // Should show loading text initially
      await waitFor(() => {
        const select = screen.getByLabelText('Choose Scenario to Export:');
        expect(within(select).getByText('Loading scenarios...')).toBeInTheDocument();
      });

      // This test is sufficient - it verifies the loading state is displayed correctly
      // Testing the transition from loading to loaded would require more complex state management
    });
  });
});
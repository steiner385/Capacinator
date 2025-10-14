import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import ProjectTypeDetails from '../ProjectTypeDetails';
import { api } from '../../lib/api-client';

// Mock the API client
jest.mock('../../lib/api-client', () => ({
  api: {
    projectTypes: {
      get: jest.fn(),
      getHierarchy: jest.fn(),
      getPhases: jest.fn(),
      update: jest.fn(),
      createChild: jest.fn(),
      delete: jest.fn(),
    },
    phases: {
      list: jest.fn(),
    },
    roles: {
      list: jest.fn(),
    },
    resourceTemplates: {
      list: jest.fn(),
    },
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe.skip('ProjectTypeDetails Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = (projectTypeId = 'test-type-id') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/project-types/${projectTypeId}`]}>
          <Routes>
            <Route path="/project-types/:id" element={<ProjectTypeDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Project Phases Table', () => {
    const mockProjectType = {
      id: 'test-type-id',
      name: 'Test Project Type',
      description: 'Test description',
      parent_id: null, // Parent type to show phases
      color_code: '#3B82F6',
      is_active: true,
    };

    const mockProjectPhases = [
      {
        id: 'phase-1',
        name: 'Planning',
        description: 'Initial planning phase',
        duration_weeks: 4,
        order_index: 1,
      },
      {
        id: 'phase-2',
        name: 'Development',
        description: 'Development and implementation',
        duration_weeks: 12,
        order_index: 2,
      },
      {
        id: 'phase-3',
        name: 'Testing',
        description: 'Quality assurance and testing',
        duration_weeks: 3,
        order_index: 3,
      },
      {
        id: 'phase-4',
        name: 'Deployment',
        description: null, // Test null description
        duration_weeks: 2,
        order_index: 4,
      },
    ];

    beforeEach(() => {
      (api.projectTypes.get as jest.Mock).mockResolvedValue({ data: mockProjectType });
      (api.projectTypes.getPhases as jest.Mock).mockResolvedValue({ data: { data: mockProjectPhases } });
      (api.projectTypes.getHierarchy as jest.Mock).mockResolvedValue({ data: { data: [] } });
      (api.phases.list as jest.Mock).mockResolvedValue({ 
        data: mockProjectPhases // Return the phases for the resource template section
      });
      (api.roles.list as jest.Mock).mockResolvedValue({ 
        data: [
          { id: 'role-1', name: 'Developer', description: 'Software developer' },
          { id: 'role-2', name: 'Designer', description: 'UI/UX designer' },
        ]
      });
      (api.resourceTemplates.list as jest.Mock).mockResolvedValue({ data: [] });
    });

    test('renders phases section for parent project types', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      expect(screen.getByText('Define the phases for this project type. These phases will be inherited by all child project types.')).toBeInTheDocument();
    });

    test('renders phases in a table format', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      // Wait for the table to be rendered
      await waitFor(() => {
        const planningElements = screen.getAllByText('Planning');
        expect(planningElements.length).toBeGreaterThan(0);
      });

      // Check table headers - get the phases table specifically
      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      const headers = within(phasesTable).getAllByRole('columnheader');
      expect(headers).toHaveLength(4);
      expect(headers[0]).toHaveTextContent('Phase Name');
      expect(headers[1]).toHaveTextContent('Description');
      expect(headers[2]).toHaveTextContent('Duration');
      expect(headers[3]).toHaveTextContent('Order');
    });

    test('displays all phase data correctly in table rows', async () => {
      renderComponent();

      await waitFor(() => {
        const planningElements = screen.getAllByText('Planning');
        expect(planningElements.length).toBeGreaterThan(0);
      });

      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      const rows = within(phasesTable).getAllByRole('row');
      
      // Should have header row + 4 data rows
      expect(rows).toHaveLength(5);

      // Check first phase row
      const firstDataRow = rows[1];
      expect(within(firstDataRow).getByText('Planning')).toBeInTheDocument();
      expect(within(firstDataRow).getByText('Initial planning phase')).toBeInTheDocument();
      expect(within(firstDataRow).getByText('4 weeks')).toBeInTheDocument();
      expect(within(firstDataRow).getByText('1')).toBeInTheDocument();

      // Check second phase row
      const secondDataRow = rows[2];
      expect(within(secondDataRow).getByText('Development')).toBeInTheDocument();
      expect(within(secondDataRow).getByText('Development and implementation')).toBeInTheDocument();
      expect(within(secondDataRow).getByText('12 weeks')).toBeInTheDocument();
      expect(within(secondDataRow).getByText('2')).toBeInTheDocument();
    });

    test('handles null/empty description gracefully', async () => {
      renderComponent();

      await waitFor(() => {
        const deploymentElements = screen.getAllByText('Deployment');
        expect(deploymentElements.length).toBeGreaterThan(0);
      });

      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      const rows = within(phasesTable).getAllByRole('row');
      const deploymentRow = rows[4]; // Last row
      
      expect(within(deploymentRow).getByText('-')).toBeInTheDocument(); // Should show dash for null description
    });

    test('displays empty state when no phases exist', async () => {
      (api.projectTypes.getPhases as jest.Mock).mockResolvedValue({ data: { data: [] } });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No phases defined for this project type')).toBeInTheDocument();
      });

      expect(screen.getByText('Add phases to define the workflow structure')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    test('does not show phases section for sub-types', async () => {
      const subType = { ...mockProjectType, parent_id: 'parent-type-id' };
      (api.projectTypes.get as jest.Mock).mockResolvedValue({ data: subType });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Project Type')).toBeInTheDocument();
      });

      // Phases section should not be visible for sub-types
      expect(screen.queryByText('Project Phases')).not.toBeInTheDocument();
    });

    test('maintains correct table structure with tbody', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      await waitFor(() => {
        const planningElements = screen.getAllByText('Planning');
        expect(planningElements.length).toBeGreaterThan(0);
      });

      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      
      // Check for proper table structure
      const rowgroups = within(phasesTable).getAllByRole('rowgroup');
      expect(rowgroups).toHaveLength(2); // thead and tbody
      
      const tbody = rowgroups[1]; // tbody
      expect(tbody).toBeInTheDocument();
      
      // All data rows should be in tbody
      const dataRows = within(tbody).getAllByRole('row');
      expect(dataRows).toHaveLength(4); // 4 phases
    });

    test('phases are displayed in correct order', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      await waitFor(() => {
        const planningElements = screen.getAllByText('Planning');
        expect(planningElements.length).toBeGreaterThan(0);
      });

      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      const tbody = within(phasesTable).getAllByRole('rowgroup')[1];
      const rows = within(tbody).getAllByRole('row');

      // Check order
      expect(within(rows[0]).getByText('Planning')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Development')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Testing')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Deployment')).toBeInTheDocument();
    });

    test('handles API errors gracefully', async () => {
      (api.projectTypes.getPhases as jest.Mock).mockRejectedValue(new Error('Failed to load phases'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      // Should still show the section but might show loading or error state
      // The actual error handling depends on the component implementation
    });

    test('table has correct CSS classes applied', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Phases')).toBeInTheDocument();
      });

      await waitFor(() => {
        const planningElements = screen.getAllByText('Planning');
        expect(planningElements.length).toBeGreaterThan(0);
      });

      const tables = screen.getAllByRole('table');
      const phasesTable = tables[0]; // First table is the phases table
      const tableContainer = phasesTable.parentElement;
      expect(tableContainer).toHaveClass('table-container');
      
      expect(phasesTable).toHaveClass('table');
    });

    test('duration is formatted correctly with "weeks" suffix', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('4 weeks')).toBeInTheDocument();
      });

      // Check all duration values
      expect(screen.getByText('4 weeks')).toBeInTheDocument();
      expect(screen.getByText('12 weeks')).toBeInTheDocument();
      expect(screen.getByText('3 weeks')).toBeInTheDocument();
      expect(screen.getByText('2 weeks')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading state while fetching data', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (api.projectTypes.get as jest.Mock).mockReturnValue(promise);

      renderComponent();

      expect(screen.getByText('Loading project type details...')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({ data: { id: 'test', name: 'Test', parent_id: null } });
    });

    test('shows error message when project type not found', async () => {
      (api.projectTypes.get as jest.Mock).mockRejectedValue(new Error('Not found'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Project Type Not Found')).toBeInTheDocument();
      });
      
      expect(screen.getByText("The project type you're looking for doesn't exist or couldn't be loaded.")).toBeInTheDocument();
    });
  });
});
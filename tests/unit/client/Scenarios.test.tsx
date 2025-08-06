import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Scenarios } from '@client/pages/Scenarios';

// Mock the API client
jest.mock('@client/lib/api-client', () => ({
  api: {
    scenarios: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      branch: jest.fn(),
      merge: jest.fn(),
      compare: jest.fn(),
    },
  },
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock useUser context
jest.mock('@client/contexts/UserContext', () => ({
  useUser: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  GitBranch: ({ size, className }: any) => <div data-testid="git-branch-icon" />,
  Plus: ({ size }: any) => <div data-testid="plus-icon" />,
  Edit3: ({ size }: any) => <div data-testid="edit-icon" />,
  Trash2: ({ size }: any) => <div data-testid="trash-icon" />,
  Merge: ({ size }: any) => <div data-testid="merge-icon" />,
  ArrowRightLeft: ({ size }: any) => <div data-testid="compare-icon" />,
  Users: ({ size }: any) => <div data-testid="users-icon" />,
  Calendar: ({ size }: any) => <div data-testid="calendar-icon" />,
  AlertTriangle: ({ size }: any) => <div data-testid="alert-icon" />,
  List: ({ size }: any) => <div data-testid="list-icon" />,
  Search: ({ size, className }: any) => <div data-testid="search-icon" />,
  Filter: ({ size }: any) => <div data-testid="filter-icon" />,
  X: ({ size }: any) => <div data-testid="x-icon" />,
  ChevronDown: ({ size }: any) => <div data-testid="chevron-down-icon" />,
  ArrowRight: ({ size }: any) => <div data-testid="arrow-right-icon" />,
}));

const mockScenarios = [
  {
    id: '1',
    name: 'Baseline Scenario',
    description: 'Main baseline scenario',
    scenario_type: 'baseline',
    status: 'active',
    created_by: 'user-1',
    created_by_name: 'John Doe',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    parent_scenario_id: null,
    parent_scenario_name: null,
    branch_point: null,
  },
  {
    id: '2',
    name: 'Branch Scenario',
    description: 'Branched from baseline',
    scenario_type: 'branch',
    status: 'active',
    created_by: 'user-2',
    created_by_name: 'Jane Smith',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    parent_scenario_id: '1',
    parent_scenario_name: 'Baseline Scenario',
    branch_point: '2024-01-02T10:00:00Z',
  },
  {
    id: '3',
    name: 'Sandbox Scenario',
    description: 'Experimental sandbox',
    scenario_type: 'sandbox',
    status: 'archived',
    created_by: 'user-3',
    created_by_name: 'Bob Wilson',
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z',
    parent_scenario_id: null,
    parent_scenario_name: null,
    branch_point: null,
  },
];

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Scenarios Component', () => {
  const { api } = require('@client/lib/api-client');

  beforeEach(() => {
    jest.clearAllMocks();
    api.scenarios.list.mockResolvedValue({ data: mockScenarios });
  });

  describe('Component Rendering', () => {
    it('renders the scenarios page with header', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Scenario Planning')).toBeInTheDocument();
        expect(screen.getByText(/Create and manage resource planning scenarios/)).toBeInTheDocument();
        expect(screen.getByText('New Scenario')).toBeInTheDocument();
      });
    });

    it('displays loading state initially', () => {
      renderWithProviders(<Scenarios />);
      
      expect(screen.getByText('Loading scenarios...')).toBeInTheDocument();
    });

    it('displays scenarios after loading', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
        expect(screen.getByText('Branch Scenario')).toBeInTheDocument();
        expect(screen.getByText('Sandbox Scenario')).toBeInTheDocument();
      });
    });
  });

  describe('List View', () => {
    it('displays list view label', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('List View')).toBeInTheDocument();
      });
    });

    it('displays scenarios in hierarchical structure', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Check for scenario names
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
        expect(screen.getByText('Branch Scenario')).toBeInTheDocument();
        
        // Check for scenario metadata
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows correct status badges', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const activeStatuses = screen.getAllByText('active');
        expect(activeStatuses).toHaveLength(2);
        expect(screen.getByText('archived')).toBeInTheDocument();
      });
    });

    it('shows correct scenario type badges', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('baseline')).toBeInTheDocument();
        expect(screen.getByText('branch')).toBeInTheDocument();
        expect(screen.getByText('sandbox')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    it('displays search input', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search scenarios...')).toBeInTheDocument();
      });
    });

    it('filters scenarios based on search term', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search scenarios...');
      fireEvent.change(searchInput, { target: { value: 'Branch' } });

      await waitFor(() => {
        expect(screen.queryByText('Baseline Scenario')).not.toBeInTheDocument();
        expect(screen.getByText('Branch Scenario')).toBeInTheDocument();
        expect(screen.queryByText('Sandbox Scenario')).not.toBeInTheDocument();
      });
    });

    it('displays filter button', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Filters')).toBeInTheDocument();
      });
    });

    it('toggles hide merged scenarios', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const hideMergedButton = screen.getByText('🚫 Hide Merged');
        expect(hideMergedButton).toBeInTheDocument();
        
        fireEvent.click(hideMergedButton);
        expect(screen.getByText('👁️ Show Merged')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    it('opens create modal when New Scenario button is clicked', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const newScenarioButton = screen.getByText('New Scenario');
        fireEvent.click(newScenarioButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
      });
    });

    it('shows action buttons for each scenario', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Each scenario should have action buttons
        const editButtons = screen.getAllByTestId('edit-icon');
        const deleteButtons = screen.getAllByTestId('trash-icon');
        
        expect(editButtons.length).toBeGreaterThan(0);
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows branch button for baseline scenarios', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const branchButtons = screen.getAllByTestId('git-branch-icon');
        expect(branchButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      api.scenarios.list.mockRejectedValue(new Error('Failed to load scenarios'));
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load scenarios/)).toBeInTheDocument();
      });
    });

    it('handles empty scenarios list gracefully', async () => {
      api.scenarios.list.mockResolvedValue({ data: [] });
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('No scenarios found')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Styling', () => {
    it('applies correct CSS classes for scenario types', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const baselineType = screen.getByText('baseline');
        expect(baselineType).toHaveClass('scenario-type', 'baseline');
        
        const branchType = screen.getByText('branch');
        expect(branchType).toHaveClass('scenario-type', 'branch');
        
        const sandboxType = screen.getByText('sandbox');
        expect(sandboxType).toHaveClass('scenario-type', 'sandbox');
      });
    });

    it('applies correct status styling', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const activeStatuses = screen.getAllByText('active');
        activeStatuses.forEach(status => {
          expect(status).toHaveClass('scenario-status', 'active');
        });
        
        const archivedStatus = screen.getByText('archived');
        expect(archivedStatus).toHaveClass('scenario-status', 'archived');
      });
    });
  });
});
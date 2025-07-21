import { describe, it, expect, jest, beforeEach } from '@jest/globals';
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
      compare: jest.fn(),
    },
  },
  apiClient: {
    scenarios: {
      list: jest.fn(),
      create: jest.fn(),
      compare: jest.fn(),
    },
  },
}));

// Mock contexts
vi.mock('@client/contexts/UserContext', () => ({
  useUser: () => ({
    currentUser: { id: '1', name: 'Test User' },
  }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  GitBranch: () => <div data-testid="git-branch-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Merge: () => <div data-testid="merge-icon" />,
  ArrowRightLeft: () => <div data-testid="compare-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  LayoutGrid: () => <div data-testid="layout-grid-icon" />,
  List: () => <div data-testid="list-icon" />,
  Network: () => <div data-testid="network-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
}));

const mockScenarios = [
  {
    id: '1',
    name: 'Baseline Scenario',
    description: 'Main baseline scenario',
    scenario_type: 'baseline',
    status: 'active',
    created_by_name: 'John Doe',
    created_at: '2024-01-01T10:00:00Z',
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
    created_by_name: 'Jane Smith',
    created_at: '2024-01-02T10:00:00Z',
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
    created_by_name: 'Bob Wilson',
    created_at: '2024-01-03T10:00:00Z',
    parent_scenario_id: null,
    parent_scenario_name: null,
    branch_point: null,
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Scenarios Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful API response
    const { api } = await import('@client/lib/api-client');
    vi.mocked(api.scenarios.list).mockResolvedValue({ data: mockScenarios });
  });

  describe('Component Rendering', () => {
    it('renders the scenarios page with header', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Scenario Planning')).toBeInTheDocument();
        expect(screen.getByText('Create and manage resource planning scenarios to explore different allocation strategies')).toBeInTheDocument();
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

  describe('View Mode Toggle', () => {
    it('renders all view mode toggle buttons', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
        expect(screen.getByText('List')).toBeInTheDocument();
        expect(screen.getByText('Graphical')).toBeInTheDocument();
      });
    });

    it('shows cards view by default', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Cards').closest('button')).toHaveClass('btn-primary');
        expect(screen.getByText('List').closest('button')).toHaveClass('btn-secondary');
        expect(screen.getByText('Graphical').closest('button')).toHaveClass('btn-secondary');
      });
    });

    it('switches to list view when clicked', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('List'));
      });

      await waitFor(() => {
        expect(screen.getByText('List').closest('button')).toHaveClass('btn-primary');
        expect(screen.getByText('Cards').closest('button')).toHaveClass('btn-secondary');
        expect(screen.getByText('Scenario Hierarchy')).toBeInTheDocument();
      });
    });

    it('switches to graphical view when clicked', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Graphical'));
      });

      await waitFor(() => {
        expect(screen.getByText('Graphical').closest('button')).toHaveClass('btn-primary');
        expect(screen.getByText('Cards').closest('button')).toHaveClass('btn-secondary');
        expect(screen.getByText('Scenario Commit Graph')).toBeInTheDocument();
      });
    });
  });

  describe('Cards View', () => {
    it('displays scenario cards with correct information', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Check baseline scenario card
        const baselineCard = screen.getByText('Baseline Scenario').closest('.scenario-card');
        expect(baselineCard).toHaveClass('baseline');
        expect(baselineCard).toHaveTextContent('Main baseline scenario');
        expect(baselineCard).toHaveTextContent('John Doe');
        expect(baselineCard).toHaveTextContent('baseline');
        expect(baselineCard).toHaveTextContent('active');
      });
    });

    it('shows correct action buttons for each scenario type', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const cards = screen.getAllByTestId('git-branch-icon');
        expect(cards.length).toBeGreaterThan(0);
        
        // Branch button should be present for all scenarios
        expect(screen.getAllByTitle('Create Branch')).toHaveLength(3);
        
        // Compare button should be present for all scenarios
        expect(screen.getAllByTitle('Compare Scenarios')).toHaveLength(3);
        
        // Delete button should only be present for non-baseline scenarios
        expect(screen.getAllByTitle('Delete Scenario')).toHaveLength(2);
      });
    });

    it('displays merge button only for active branch scenarios', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Only the active branch scenario should have a merge button
        expect(screen.getAllByTitle('Merge to Parent')).toHaveLength(1);
      });
    });
  });

  describe('List View (Hierarchical)', () => {
    it('displays hierarchical structure correctly', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('List'));
      });

      await waitFor(() => {
        expect(screen.getByText('Scenario Hierarchy')).toBeInTheDocument();
        
        // Check legend
        expect(screen.getByText('Baseline')).toBeInTheDocument();
        expect(screen.getByText('Branch')).toBeInTheDocument();
        expect(screen.getByText('Sandbox')).toBeInTheDocument();
        
        // All scenarios should be visible
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
        expect(screen.getByText('Branch Scenario')).toBeInTheDocument();
        expect(screen.getByText('Sandbox Scenario')).toBeInTheDocument();
      });
    });

    it('shows connecting lines for parent-child relationships', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('List'));
      });

      await waitFor(() => {
        // Check for hierarchy structure elements
        expect(document.querySelector('.hierarchy-lines')).toBeInTheDocument();
        expect(document.querySelector('.connector-dot')).toBeInTheDocument();
      });
    });
  });

  describe('Graphical View (Commit Graph)', () => {
    it('displays commit graph structure correctly', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Graphical'));
      });

      await waitFor(() => {
        expect(screen.getByText('Scenario Commit Graph')).toBeInTheDocument();
        
        // Check for graph elements
        expect(document.querySelector('.graph-lanes')).toBeInTheDocument();
        expect(document.querySelector('.branch-line')).toBeInTheDocument();
        expect(document.querySelector('.commit-dot')).toBeInTheDocument();
        expect(document.querySelector('.commit-info-panel')).toBeInTheDocument();
      });
    });

    it('positions commits chronologically', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Graphical'));
      });

      await waitFor(() => {
        const commitRows = document.querySelectorAll('.commit-row');
        expect(commitRows.length).toBe(3);
        
        // Check that commits are positioned with proper spacing
        commitRows.forEach((row, index) => {
          const style = window.getComputedStyle(row);
          expect(style.top).toBe(`${index * 60}px`);
        });
      });
    });

    it('assigns different colors to different branches', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Graphical'));
      });

      await waitFor(() => {
        // Select only commit dots in the graph content, not the legend
        const commitDots = document.querySelectorAll('.graph-lanes .commit-dot');
        expect(commitDots.length).toBe(3);
        
        // Each dot should have a background color
        commitDots.forEach(dot => {
          const style = window.getComputedStyle(dot);
          expect(style.backgroundColor).not.toBe('');
        });
      });
    });
  });

  describe('Interactive Features', () => {
    it('opens create modal when New Scenario button is clicked', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('New Scenario'));
      });

      expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
    });

    it('handles scenario actions correctly', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const branchButtons = screen.getAllByTitle('Create Branch');
        expect(branchButtons.length).toBeGreaterThan(0);
        
        // Clicking branch button should work (currently logs to console)
        fireEvent.click(branchButtons[0]);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      const { api } = await import('@client/lib/api-client');
      vi.mocked(api.scenarios.list).mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load scenarios')).toBeInTheDocument();
        expect(screen.getByText('Please try refreshing the page')).toBeInTheDocument();
      });
    });

    it('handles empty scenarios list gracefully', async () => {
      const { api } = await import('@client/lib/api-client');
      vi.mocked(api.scenarios.list).mockResolvedValue({ data: [] });
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('List'));
      });

      await waitFor(() => {
        expect(screen.getByText('No scenarios found')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Styling', () => {
    it('applies correct CSS classes for scenario types', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const baselineCard = screen.getByText('Baseline Scenario').closest('.scenario-card');
        const branchCard = screen.getByText('Branch Scenario').closest('.scenario-card');
        const sandboxCard = screen.getByText('Sandbox Scenario').closest('.scenario-card');
        
        expect(baselineCard).toHaveClass('baseline');
        expect(branchCard).toHaveClass('branch');
        expect(sandboxCard).toHaveClass('sandbox');
      });
    });

    it('applies correct status styling', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const activeStatus = screen.getAllByText('active');
        const archivedStatus = screen.getByText('archived');
        
        activeStatus.forEach(status => {
          expect(status).toHaveClass('active');
        });
        expect(archivedStatus).toHaveClass('archived');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('handles view mode changes without errors', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Rapidly switch between views
        fireEvent.click(screen.getByText('List'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Graphical'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cards'));
      });

      // Should not throw errors and should show cards view
      expect(screen.getByText('Cards').closest('button')).toHaveClass('btn-primary');
    });
  });
});
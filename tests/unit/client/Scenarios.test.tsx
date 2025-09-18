import React from 'react';

// Mock the API client
jest.mock('../../../client/src/lib/api-client', () => ({
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

// Note: Context mocks are now provided by the setup file

// Mock ScenarioModal components
jest.mock('../../../client/src/components/modals/ScenarioModal', () => ({
  CreateScenarioModal: ({ isOpen }: any) => isOpen ? <div data-testid="create-scenario-modal">Mock Create Modal</div> : null,
  EditScenarioModal: ({ isOpen }: any) => isOpen ? <div data-testid="edit-scenario-modal">Mock Edit Modal</div> : null,
  DeleteConfirmationModal: ({ isOpen }: any) => isOpen ? <div data-testid="delete-confirmation-modal">Mock Delete Modal</div> : null,
}));

// Mock UI components
jest.mock('../../../client/src/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <>{children}</>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../../client/src/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('../../../client/src/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('../../../client/src/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('../../../client/src/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('../../../client/src/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, ...props }: any) => <option {...props}>{children}</option>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => null,
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

// Now import everything else
import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import '@testing-library/jest-dom';
import { Scenarios } from '../../../client/src/pages/Scenarios';

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
    name: 'Growth Scenario',
    description: 'Growth variant',
    scenario_type: 'branch',
    status: 'active',
    created_by: 'user-1',
    created_by_name: 'John Doe',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
    parent_scenario_id: '1',
    parent_scenario_name: 'Baseline Scenario',
    branch_point: '2024-01-02T10:00:00Z',
  },
  {
    id: '3',
    name: 'Archived Scenario',
    description: 'Old scenario',
    scenario_type: 'branch',
    status: 'merged',
    created_by: 'user-2',
    created_by_name: 'Jane Smith',
    created_at: '2023-12-01T10:00:00Z',
    updated_at: '2023-12-15T10:00:00Z',
    parent_scenario_id: '1',
    parent_scenario_name: 'Baseline Scenario',
    branch_point: '2023-12-01T10:00:00Z',
  },
];

describe('Scenarios Component', () => {
  const { api } = require('../../../client/src/lib/api-client');

  beforeEach(() => {
    jest.clearAllMocks();
    api.scenarios.list.mockResolvedValue({ data: mockScenarios });
  });

  describe('Component Rendering', () => {
    test('renders the scenarios page with header', async () => {
      renderWithProviders(<Scenarios />);
      
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByText('Scenario Planning')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Create and manage resource planning scenarios to explore different allocation strategies')).toBeInTheDocument();
      expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
    });

    test('displays loading state initially', async () => {
      api.scenarios.list.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithProviders(<Scenarios />);
      
      // The component shows 'Loading scenarios...' message
      expect(screen.getByText('Loading scenarios...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(api.scenarios.list).toHaveBeenCalled();
      });
    });

    test('displays scenarios after loading', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
      });
      
      // The Growth Scenario is a child and should also be visible
      expect(screen.getByText('Growth Scenario')).toBeInTheDocument();
    });
  });

  describe('List View', () => {
    test('displays list view label', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Look for the List View label in the view controls
        const listIcon = screen.getByTestId('list-icon');
        expect(listIcon).toBeInTheDocument();
        expect(screen.getByText('List View')).toBeInTheDocument();
      });
    });

    test('displays scenarios in hierarchical structure', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Wait for data to load
        expect(screen.getByText('Scenario Hierarchy')).toBeInTheDocument();
      });
      
      // Parent scenario
      expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
      // Child scenario should be visible
      expect(screen.getByText('Growth Scenario')).toBeInTheDocument();
    });

    test('shows correct status badges', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Status badges appear with the correct text
        const activeStatuses = screen.getAllByText('active');
        expect(activeStatuses.length).toBeGreaterThan(0);
        const mergedStatus = screen.getByText('merged');
        expect(mergedStatus).toBeInTheDocument();
      });
    });

    test('shows correct scenario type badges', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // The mock data has 'baseline' and 'branch' types
        expect(screen.getByText('baseline')).toBeInTheDocument();
        expect(screen.getAllByText('branch').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search and Filter', () => {
    test('displays search input', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search scenarios...');
      expect(searchInput).toBeInTheDocument();
    });

    test('filters scenarios based on search term', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Baseline Scenario')).toBeInTheDocument();
        expect(screen.getByText('Growth Scenario')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search scenarios...');
      fireEvent.change(searchInput, { target: { value: 'Archived' } });

      // When filtering for 'Archived', we should only see the Archived Scenario
      expect(screen.getByText('Archived Scenario')).toBeInTheDocument();
      expect(screen.queryByText('Growth Scenario')).not.toBeInTheDocument();
    });

    test('displays filter button', async () => {
      renderWithProviders(<Scenarios />);
      
      // Look for the filter button by its content
      await waitFor(() => {
        const filterIcon = screen.getByTestId('filter-icon');
        expect(filterIcon).toBeInTheDocument();
      });
    });

    test('toggles hide merged scenarios', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Archived Scenario')).toBeInTheDocument();
      });

      // Click the hide merged button directly (it's not in the filter dropdown)
      const hideMergedButton = screen.getByText('🚫 Hide Merged');
      fireEvent.click(hideMergedButton);

      await waitFor(() => {
        expect(screen.queryByText('Archived Scenario')).not.toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    test('opens create modal when New Scenario button is clicked', async () => {
      renderWithProviders(<Scenarios />);
      
      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Scenario Planning')).toBeInTheDocument();
      });
      
      const newButton = screen.getByText('New Scenario');
      fireEvent.click(newButton);

      // The create modal should open (mocked)
      await waitFor(() => {
        expect(screen.getByTestId('create-scenario-modal')).toBeInTheDocument();
      });
    });

    test('shows action buttons for each scenario', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const editButtons = screen.getAllByTestId('edit-icon');
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    test('shows branch button for baseline scenarios', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        // Should have a branch button for baseline scenario
        const branchButtons = screen.getAllByTestId('git-branch-icon');
        expect(branchButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when API fails', async () => {
      const errorMessage = 'Failed to load scenarios';
      api.scenarios.list.mockRejectedValue(new Error(errorMessage));
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load scenarios')).toBeInTheDocument();
      });
    });

    test('handles empty scenarios list gracefully', async () => {
      api.scenarios.list.mockResolvedValue({ data: [] });
      
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        expect(screen.getByText('No scenarios found')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Styling', () => {
    test('applies correct CSS classes for scenario types', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const baselineBadge = screen.getByText('baseline');
        expect(baselineBadge.className).toContain('scenario-type');
        expect(baselineBadge.className).toContain('baseline');
      });
    });

    test('applies correct status styling', async () => {
      renderWithProviders(<Scenarios />);
      
      await waitFor(() => {
        const activeBadge = screen.getAllByText('active')[0];
        expect(activeBadge.className).toContain('scenario-status');
        expect(activeBadge.className).toContain('active');
      });
    });
  });
});
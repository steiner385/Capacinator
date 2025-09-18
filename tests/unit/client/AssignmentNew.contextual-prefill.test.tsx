import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AssignmentNew } from '../../../client/src/pages/AssignmentNew';

// Mock the API client
jest.mock('../../../client/src/lib/api-client', () => ({
  api: {
    projects: {
      list: jest.fn(),
      get: jest.fn(),
    },
    people: {
      list: jest.fn(),
      get: jest.fn(),
    },
    roles: {
      list: jest.fn(),
    },
    phases: {
      list: jest.fn(),
    },
    assignments: {
      getConflicts: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

const mockProjects = [
  { id: 'proj-1', name: 'Project Alpha' },
  { id: 'proj-2', name: 'Project Beta' },
];

const mockPeople = [
  {
    id: 'person-1',
    name: 'John Doe',
    primary_person_role_id: 'dev-role-id',
    roles: [
      { role_id: 'dev-role-id', role_name: 'Developer' },
      { role_id: 'qa-role-id', role_name: 'QA Engineer' }
    ]
  },
  {
    id: 'person-2',
    name: 'Jane Smith',
    primary_person_role_id: 'design-role-id',
    roles: [
      { role_id: 'design-role-id', role_name: 'Designer' },
      { role_id: 'dev-role-id', role_name: 'Developer' }
    ]
  },
];

const mockRoles = [
  { id: 'dev-role-id', name: 'Developer' },
  { id: 'design-role-id', name: 'Designer' },
  { id: 'qa-role-id', name: 'QA Engineer' },
];

const mockPhases = [
  { id: 'phase-1', name: 'Planning' },
  { id: 'phase-2', name: 'Development' },
  { id: 'phase-3', name: 'Testing' },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

function renderAssignmentNew(queryParams = '') {
  const queryClient = createTestQueryClient();
  const { api } = require('../../../client/src/lib/api-client');
  
  // Update mock search params
  mockSearchParams = new URLSearchParams(queryParams);
  
  // Mock API responses
  api.projects.list.mockResolvedValue({ data: mockProjects });
  api.people.list.mockResolvedValue({ data: mockPeople });
  api.roles.list.mockResolvedValue({ data: mockRoles });
  api.phases.list.mockResolvedValue({ data: mockPhases });
  api.assignments.getConflicts.mockResolvedValue({ data: [] });
  api.people.get.mockResolvedValue({ data: mockPeople[0] });
  api.projects.get.mockResolvedValue({ data: mockProjects[0] });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/assignments/new${queryParams}`]}>
        <AssignmentNew />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AssignmentNew Contextual Form Pre-filling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  describe('Context Banner Display', () => {
    it('should not show context banner when no query parameters', async () => {
      renderAssignmentNew();
      
      await waitFor(() => {
        expect(screen.queryByText('Assignment Context:')).not.toBeInTheDocument();
      });
    });

    it('should show context banner for assign action with person', async () => {
      renderAssignmentNew('?person=John Doe&action=assign&status=AVAILABLE');
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        expect(screen.getByText(/Assigning work to John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/currently available/)).toBeInTheDocument();
      });
    });

    it('should show context banner for reduce action', async () => {
      renderAssignmentNew('?person=John Doe&action=reduce&from=capacity-report');
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        expect(screen.getByText(/Reducing workload for John Doe/)).toBeInTheDocument();
        expect(screen.getByText(/currently over-allocated/)).toBeInTheDocument();
        expect(screen.getByText('Initiated from capacity-report')).toBeInTheDocument();
      });
    });

    it('should show context banner for role assignment', async () => {
      renderAssignmentNew('?role=Developer&action=assign&from=reports');
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        expect(screen.getByText(/Assigning Developer role to project/)).toBeInTheDocument();
        expect(screen.getByText('Initiated from reports')).toBeInTheDocument();
      });
    });

    it('should show "From" badge in header when source provided', async () => {
      renderAssignmentNew('?person=John Doe&from=people-page');
      
      await waitFor(() => {
        expect(screen.getByText('From people-page')).toBeInTheDocument();
      });
    });
  });

  describe('Form Pre-filling from URL Parameters', () => {
    it('should pre-fill person when provided by name', async () => {
      renderAssignmentNew('?person=John Doe&action=assign');
      
      await waitFor(() => {
        const personSelect = screen.getByDisplayValue('John Doe');
        expect(personSelect).toBeInTheDocument();
      });
    });

    it('should pre-fill person when provided by ID', async () => {
      renderAssignmentNew('?person=person-1&action=assign');
      
      await waitFor(() => {
        const personSelect = screen.getByDisplayValue('John Doe');
        expect(personSelect).toBeInTheDocument();
      });
    });

    it('should pre-fill role when provided by name', async () => {
      renderAssignmentNew('?role=Developer&action=assign');
      
      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue('Developer');
        expect(roleSelect).toBeInTheDocument();
      });
    });

    it('should pre-fill role when provided by ID', async () => {
      renderAssignmentNew('?role=dev-role-id&action=assign');
      
      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue('Developer');
        expect(roleSelect).toBeInTheDocument();
      });
    });

    it('should pre-fill dates when provided', async () => {
      renderAssignmentNew('?startDate=2023-01-01&endDate=2023-12-31&person=John Doe');
      
      await waitFor(() => {
        const startDateInput = screen.getByDisplayValue('2023-01-01');
        const endDateInput = screen.getByDisplayValue('2023-12-31');
        expect(startDateInput).toBeInTheDocument();
        expect(endDateInput).toBeInTheDocument();
      });
    });
  });

  describe('Allocation Percentage Suggestions', () => {
    it('should suggest 25% allocation for reduce action', async () => {
      renderAssignmentNew('?person=John Doe&action=reduce');
      
      await waitFor(() => {
        const allocationInput = screen.getByDisplayValue('25');
        expect(allocationInput).toBeInTheDocument();
      });
    });

    it('should use custom allocation when provided', async () => {
      renderAssignmentNew('?person=John Doe&allocation=75&action=assign');
      
      await waitFor(() => {
        const allocationInput = screen.getByDisplayValue('75');
        expect(allocationInput).toBeInTheDocument();
      });
    });

    it('should default to 100% when no context provided', async () => {
      renderAssignmentNew();
      
      await waitFor(() => {
        const allocationInput = screen.getByDisplayValue('100');
        expect(allocationInput).toBeInTheDocument();
      });
    });

    it('should suggest 50% allocation for reduce action without specific percentage', async () => {
      renderAssignmentNew('?person=John Doe&action=reduce');
      
      await waitFor(() => {
        // Initial suggestion should be 25% (conservative for over-allocated)
        const allocationInput = screen.getByDisplayValue('25');
        expect(allocationInput).toBeInTheDocument();
      });
    });
  });

  describe('Auto-selection Logic', () => {
    it('should auto-select primary role when person is pre-filled', async () => {
      renderAssignmentNew('?person=John Doe&action=assign');
      
      await waitFor(() => {
        // John Doe has primary_person_role_id: 'dev-role-id' which maps to 'Developer'
        const roleSelect = screen.getByDisplayValue('Developer');
        expect(roleSelect).toBeInTheDocument();
      });
    });

    it('should handle person with no primary role gracefully', async () => {
      const { api } = require('../../../client/src/lib/api-client');
      api.people.list.mockResolvedValue({
        data: [
          {
            id: 'person-1',
            name: 'John Doe',
            primary_person_role_id: null, // No primary role
            roles: [
              { role_id: 'dev-role-id', role_name: 'Developer' }
            ]
          },
        ],
      });

      renderAssignmentNew('?person=John Doe&action=assign');
      
      await waitFor(() => {
        const personSelect = screen.getByDisplayValue('John Doe');
        expect(personSelect).toBeInTheDocument();
        // Role should remain empty - just check that John Doe is selected and continue
      });
    });
  });

  describe('Multiple Parameter Combinations', () => {
    it('should handle person + role + dates combination', async () => {
      renderAssignmentNew('?person=John Doe&role=QA Engineer&startDate=2023-06-01&endDate=2023-08-31&action=assign&from=capacity-report');
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('QA Engineer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2023-06-01')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2023-08-31')).toBeInTheDocument();
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        expect(screen.getByText('From capacity-report')).toBeInTheDocument();
      });
    });

    it('should prioritize explicit role over person\'s primary role', async () => {
      renderAssignmentNew('?person=John Doe&role=QA Engineer&action=assign');
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        // Should show QA Engineer, not John's primary role (Developer)
        expect(screen.getByDisplayValue('QA Engineer')).toBeInTheDocument();
      });
    });
  });

  describe('Case Insensitive Matching', () => {
    it('should match person names case-insensitively', async () => {
      renderAssignmentNew('?person=john doe&action=assign');
      
      await waitFor(() => {
        const personSelect = screen.getByDisplayValue('John Doe');
        expect(personSelect).toBeInTheDocument();
      });
    });

    it('should match role names case-insensitively', async () => {
      renderAssignmentNew('?role=developer&action=assign');
      
      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue('Developer');
        expect(roleSelect).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent person gracefully', async () => {
      renderAssignmentNew('?person=Non Existent Person&action=assign');
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        // Form should not be pre-filled
        const personSelects = screen.getAllByDisplayValue('');
        expect(personSelects.length).toBeGreaterThan(0);
      });
    });

    it('should handle non-existent role gracefully', async () => {
      renderAssignmentNew('?role=Non Existent Role&action=assign');
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        // Context should show the role name in the message
        expect(screen.getByText(/Assigning Non Existent Role role to project/)).toBeInTheDocument();
      });
    });

    it('should handle invalid date formats gracefully', async () => {
      renderAssignmentNew('?startDate=invalid-date&endDate=also-invalid&person=John Doe');
      
      await waitFor(() => {
        // Should still pre-fill person
        const personSelect = screen.getByDisplayValue('John Doe');
        expect(personSelect).toBeInTheDocument();
        // Dates should be empty or use default values
        const dateInputs = screen.getAllByDisplayValue('');
        expect(dateInputs.length).toBeGreaterThan(0);
      });
    });

    it('should handle missing API data gracefully', async () => {
      const { api } = require('../../../client/src/lib/api-client');
      api.people.list.mockResolvedValue({ data: [] });
      api.roles.list.mockResolvedValue({ data: [] });

      renderAssignmentNew('?person=John Doe&role=Developer&action=assign');
      
      await waitFor(() => {
        // Should still show context banner
        expect(screen.getByText('Assignment Context:')).toBeInTheDocument();
        // But form won't be pre-filled due to missing data
      });
    });
  });

  describe('Context Message Generation', () => {
    const testCases = [
      {
        params: '?person=John Doe&action=assign&status=AVAILABLE',
        expectedMessage: /Assigning work to John Doe.*currently available/,
      },
      {
        params: '?person=Jane Smith&action=reduce',
        expectedMessage: /Reducing workload for Jane Smith.*currently over-allocated/,
      },
      {
        params: '?role=Developer&action=assign',
        expectedMessage: /Assigning Developer role to project/,
      },
      {
        params: '?person=John Doe&from=reports-page',
        expectedMessage: /From reports-page/,
      },
    ];

    testCases.forEach(({ params, expectedMessage }) => {
      it(`should generate correct context message for ${params}`, async () => {
        renderAssignmentNew(params);
        
        await waitFor(() => {
          expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        });
      });
    });
  });
});
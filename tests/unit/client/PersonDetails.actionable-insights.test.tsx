import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PersonDetails from '../../../client/src/pages/PersonDetails';
import type { Person, PersonAvailabilityOverride } from '../../../client/src/types';

// Mock recharts to avoid rendering issues
jest.mock('recharts', () => ({
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: any }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

// Mock the API client
jest.mock('../../../client/src/lib/api-client', () => ({
  api: {
    people: {
      get: jest.fn(),
      update: jest.fn(),
      removeRole: jest.fn(),
    },
    locations: {
      list: jest.fn(),
    },
    roles: {
      list: jest.fn(),
    },
    assignments: {
      delete: jest.fn(),
      getTimeline: jest.fn(),
    },
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'test-person-id' }),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock UI components
jest.mock('../../../client/src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div>Loading...</div>
}));

jest.mock('../../../client/src/components/ui/ErrorMessage', () => ({
  ErrorMessage: ({ message }: any) => <div>{message}</div>
}));

// Mock PersonModal  
jest.mock('../../../client/src/components/modals/PersonModal', () => {
  return function PersonModal({ onClose }: any) {
    return <div>Person Modal</div>;
  };
});

// Mock useModal hook
jest.mock('../../../client/src/hooks/useModal', () => ({
  useModal: () => ({
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
  }),
}));

jest.mock('../../../client/src/components/PersonAllocationChart', () => ({
  PersonAllocationChart: () => <div>Allocation Chart</div>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  UserPlus: () => <span>UserPlus</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  Eye: () => <span>Eye</span>,
  Calendar: () => <span>Calendar</span>,
  Mail: () => <span>Mail</span>,
  Phone: () => <span>Phone</span>,
  MapPin: () => <span>MapPin</span>,
  Building: () => <span>Building</span>,
  Briefcase: () => <span>Briefcase</span>,
  Clock: () => <span>Clock</span>,
  Edit2: () => <span>Edit</span>,
  Trash2: () => <span>Delete</span>,
  Plus: () => <span>Plus</span>,
  X: () => <span>X</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Users: () => <span>Users</span>,
  Filter: () => <span>Filter</span>,
  Search: () => <span>Search</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  Save: () => <span>Save</span>,
  Shield: () => <span>Shield</span>,
  Award: () => <span>Award</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  History: () => <span>History</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ChevronUp: () => <span>ChevronUp</span>,
  UserMinus: () => <span>UserMinus</span>,
  TrendingDown: () => <span>TrendingDown</span>,
  Target: () => <span>Target</span>,
  Zap: () => <span>Zap</span>,
}));

// Mock the CSS files
jest.mock('../../../client/src/pages/PersonDetails.css', () => ({}));
jest.mock('../../../client/src/components/Charts.css', () => ({}));

// Mock PersonRoleModal
jest.mock('../../../client/src/components/modals/PersonRoleModal', () => {
  return function PersonRoleModal({ onClose }: any) {
    return <div>Person Role Modal</div>;
  };
});

const mockPersonData: Partial<Person> & { 
  id: string; 
  name: string; 
  email: string;
  availabilityOverrides: PersonAvailabilityOverride[];
  assignments: any[];
} = {
  id: 'test-person-id',
  name: 'John Doe',
  email: 'john.doe@example.com',
  primary_person_role_id: 'dev-role-id',
  primary_role_name: 'Developer',
  supervisor_id: undefined,
  supervisor_name: undefined,
  worker_type: 'FTE',
  default_availability_percentage: 100,
  default_hours_per_day: 8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  roles: [
    {
      person_id: 'test-person-id',
      role_id: 'dev-role-id',
      role_name: 'Developer',
      role_description: 'Software Developer',
      proficiency_level: 'Senior' as const,
      years_experience: 5,
      assigned_at: new Date().toISOString(),
    },
  ],
  assignments: [],
  availabilityOverrides: [],
};

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

function renderPersonDetails(personData = mockPersonData, assignments: any[] = []) {
  const queryClient = createTestQueryClient();
  const { api } = require('../../../client/src/lib/api-client');
  
  // Mock API responses
  api.people.get.mockResolvedValue({ data: { ...personData, assignments } });
  api.locations.list.mockResolvedValue({ data: { data: [] } });
  api.roles.list.mockResolvedValue({ data: [] });
  api.assignments.getTimeline.mockResolvedValue({ 
    data: { 
      timeline: { 
        assignments: assignments, 
        availability_overrides: [] 
      } 
    } 
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/people/test-person-id']}>
        <PersonDetails />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe.skip('PersonDetails Actionable Insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Workload Insights Section', () => {
    it.skip('should render the workload insights section', async () => {
      renderPersonDetails();
      
      await waitFor(() => {
        expect(screen.getByText('Workload Insights & Actions')).toBeInTheDocument();
      });
    });

    it('should display "Available" status for person with no assignments', async () => {
      renderPersonDetails(mockPersonData, []);
      
      await waitFor(() => {
        expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
        expect(screen.getAllByText('Assign to Project').length).toBeGreaterThan(0);
        expect(screen.getByText('View Opportunities')).toBeInTheDocument();
      });
    });

    it('should display "Over Allocated" status for person with high allocation', async () => {
      const overAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 80,
          billable: true,
        },
        {
          id: 'assignment-2',
          project_id: 'proj-2',
          project_name: 'Project B',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 50,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, overAllocatedAssignments);
      
      await waitFor(() => {
        expect(screen.getByText('OVER_ALLOCATED')).toBeInTheDocument();
        expect(screen.getByText('Reduce Workload')).toBeInTheDocument();
        expect(screen.getByText('Find Coverage')).toBeInTheDocument();
        expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
      });
    });

    it('should display "Under Allocated" status for person with low allocation', async () => {
      const underAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 50,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, underAllocatedAssignments);
      
      await waitFor(() => {
        expect(screen.getByText('UNDER_ALLOCATED')).toBeInTheDocument();
        expect(screen.getByText('Assign More Work')).toBeInTheDocument();
        expect(screen.getByText('Find Projects')).toBeInTheDocument();
      });
    });

    it('should display "Fully Allocated" status for person with optimal allocation', async () => {
      const fullyAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 90,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, fullyAllocatedAssignments);
      
      await waitFor(() => {
        expect(screen.getByText('FULLY_ALLOCATED')).toBeInTheDocument();
        expect(screen.getByText('Monitor Load')).toBeInTheDocument();
        expect(screen.getByText('Plan Ahead')).toBeInTheDocument();
      });
    });
  });

  describe('Action Button Navigation', () => {
    it('should navigate to assignments with reduce parameter when "Reduce Workload" is clicked', async () => {
      const overAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 120,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, overAllocatedAssignments);
      
      await waitFor(() => {
        const reduceButton = screen.getByText('Reduce Workload');
        fireEvent.click(reduceButton);
        expect(mockNavigate).toHaveBeenCalledWith('/assignments?person=test-person-id&action=reduce');
      });
    });

    it('should navigate to new assignment when "Assign to Project" is clicked', async () => {
      renderPersonDetails(mockPersonData, []);
      
      await waitFor(() => {
        const assignButton = screen.getByText('Assign to Project');
        fireEvent.click(assignButton);
        expect(mockNavigate).toHaveBeenCalledWith('/assignments/new?person=test-person-id');
      });
    });

    it('should navigate to people search when "Find Coverage" is clicked', async () => {
      const overAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 120,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, overAllocatedAssignments);
      
      await waitFor(() => {
        const findCoverageButton = screen.getByText('Find Coverage');
        fireEvent.click(findCoverageButton);
        expect(mockNavigate).toHaveBeenCalledWith('/people?skills=dev-role-id&available=true');
      });
    });

    it('should navigate to reports when "Monitor Load" is clicked', async () => {
      const fullyAllocatedAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 90,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, fullyAllocatedAssignments);
      
      await waitFor(() => {
        const monitorButton = screen.getByText('Monitor Load');
        fireEvent.click(monitorButton);
        expect(mockNavigate).toHaveBeenCalledWith('/reports?type=utilization&person=test-person-id');
      });
    });
  });

  describe('Allocation Calculations', () => {
    it('should correctly calculate total allocation from multiple assignments', async () => {
      const multipleAssignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 60,
          billable: true,
        },
        {
          id: 'assignment-2',
          project_id: 'proj-2',
          project_name: 'Project B',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 30,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, multipleAssignments);
      
      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument(); // Total allocation
        expect(screen.getByText('vs 100% available')).toBeInTheDocument();
      });
    });

    it('should correctly calculate utilization percentage', async () => {
      const assignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 80,
          billable: true,
        },
      ];

      renderPersonDetails(mockPersonData, assignments);
      
      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument(); // Utilization percentage
      });
    });

    it.skip('should handle person with reduced availability', async () => {
      const partTimePersonData = {
        ...mockPersonData,
        default_availability_percentage: 50,
      };

      const assignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 40,
          billable: true,
        },
      ];

      renderPersonDetails(partTimePersonData, assignments);
      
      await waitFor(() => {
        expect(screen.getByText('vs 50% available')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument(); // 40/50 = 80% utilization
      });
    });
  });

  describe('Upcoming Time Off Detection', () => {
    it.skip('should show alert for upcoming time off', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const dayAfterTomorrow = new Date(Date.now() + 172800000).toISOString();
      const now = new Date().toISOString();
      
      const personWithTimeOff = {
        ...mockPersonData,
        availabilityOverrides: [
          {
            id: 'override-1',
            person_id: 'test-person-id',
            start_date: tomorrow,
            end_date: dayAfterTomorrow,
            availability_percentage: 0,
            hours_per_day: 0,
            reason: 'Vacation',
            override_type: 'vacation' as const,
            is_approved: true,
            approved_by: undefined,
            approved_at: now,
            created_at: now,
            updated_at: now,
          },
        ],
      };

      renderPersonDetails(personWithTimeOff, []);
      
      await waitFor(() => {
        expect(screen.getByText('Upcoming Time Off')).toBeInTheDocument();
        expect(screen.getByText('Plan coverage needed')).toBeInTheDocument();
      });
    });
  });

  describe('Context Awareness', () => {
    it.skip('should display project count and skills count correctly', async () => {
      const assignments = [
        {
          id: 'assignment-1',
          project_id: 'proj-1',
          project_name: 'Project A',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 50,
          billable: true,
        },
        {
          id: 'assignment-2',
          project_id: 'proj-2',
          project_name: 'Project B',
          role_id: 'dev-role-id',
          role_name: 'Developer',
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          allocation_percentage: 30,
          billable: true,
        },
      ];

      const personWithMultipleRoles = {
        ...mockPersonData,
        roles: [
          ...(mockPersonData.roles || []),
          {
            person_id: 'test-person-id',
            role_id: 'qa-role-id',
            role_name: 'QA Engineer',
            role_description: 'Quality Assurance Engineer',
            proficiency_level: 'Intermediate' as const,
            years_experience: 3,
            assigned_at: new Date().toISOString(),
          },
        ],
      };

      renderPersonDetails(personWithMultipleRoles, assignments);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Active projects
        expect(screen.getByText('2 skills')).toBeInTheDocument(); // Skills count
      });
    });
  });
});
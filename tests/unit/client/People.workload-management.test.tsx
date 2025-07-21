import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import People from '../../../client/src/pages/People';

// Mock the API client
jest.mock('../../../client/src/lib/api-client', () => ({
  api: {
    people: {
      list: jest.fn(),
      delete: jest.fn(),
      getUtilization: jest.fn(),
    },
    roles: {
      list: jest.fn(),
    },
    locations: {
      list: jest.fn(),
    },
  },
}));

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
}));

const mockPeopleData = [
  {
    id: 'person-1',
    name: 'John Doe',
    email: 'john@example.com',
    primary_role_name: 'Developer',
    worker_type: 'FTE',
    location_name: 'New York',
    default_availability_percentage: 100,
    default_hours_per_day: 8,
  },
  {
    id: 'person-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    primary_role_name: 'Designer',
    worker_type: 'FTE',
    location_name: 'San Francisco',
    default_availability_percentage: 100,
    default_hours_per_day: 8,
  },
  {
    id: 'person-3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    primary_role_name: 'QA Engineer',
    worker_type: 'Contractor',
    location_name: 'Remote',
    default_availability_percentage: 80,
    default_hours_per_day: 6,
  },
];

const mockUtilizationData = {
  personUtilization: [
    {
      person_id: 'person-1',
      person_name: 'John Doe',
      total_allocation: 120,
      current_availability_percentage: 100,
      allocation_status: 'OVER_ALLOCATED',
    },
    {
      person_id: 'person-2',
      person_name: 'Jane Smith',
      total_allocation: 30,
      current_availability_percentage: 100,
      allocation_status: 'UNDER_ALLOCATED',
    },
    {
      person_id: 'person-3',
      person_name: 'Bob Wilson',
      total_allocation: 60,
      current_availability_percentage: 80,
      allocation_status: 'FULLY_ALLOCATED',
    },
  ],
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

function renderPeople(utilizationData = mockUtilizationData) {
  const queryClient = createTestQueryClient();
  const { api } = require('../../../client/src/lib/api-client');
  
  // Mock API responses
  api.people.list.mockResolvedValue({ data: { data: mockPeopleData } });
  api.people.getUtilization.mockResolvedValue({ data: utilizationData });
  api.roles.list.mockResolvedValue({ data: [] });
  api.locations.list.mockResolvedValue({ data: { data: [] } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/people']}>
        <People />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('People Workload Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Team Insights Summary', () => {
    it('should display team insights summary at page level', async () => {
      renderPeople();
      
      await waitFor(() => {
        expect(screen.getByText('1 over-allocated')).toBeInTheDocument();
        expect(screen.getByText('1 available')).toBeInTheDocument();
        expect(screen.getByText('3 total people')).toBeInTheDocument();
      });
    });

    it('should show correct counts when no over-allocated people', async () => {
      const allAvailableData = {
        personUtilization: [
          {
            person_id: 'person-1',
            person_name: 'John Doe',
            total_allocation: 20,
            current_availability_percentage: 100,
            allocation_status: 'UNDER_ALLOCATED',
          },
          {
            person_id: 'person-2',
            person_name: 'Jane Smith',
            total_allocation: 30,
            current_availability_percentage: 100,
            allocation_status: 'UNDER_ALLOCATED',
          },
        ],
      };

      renderPeople(allAvailableData);
      
      await waitFor(() => {
        expect(screen.getByText('0 over-allocated')).toBeInTheDocument();
        expect(screen.getByText('2 available')).toBeInTheDocument();
      });
    });
  });

  describe('Workload Status Column', () => {
    it('should display workload status for each person', async () => {
      renderPeople();
      
      await waitFor(() => {
        // Check for status indicators
        expect(screen.getByText('120%')).toBeInTheDocument(); // John's over-allocation
        expect(screen.getByText('over allocated')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument(); // Bob's utilization (60/80)
        expect(screen.getByText('fully allocated')).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument(); // Jane's utilization
        expect(screen.getByText('under allocated')).toBeInTheDocument();
      });
    });

    it('should handle missing utilization data gracefully', async () => {
      const noUtilizationData = { personUtilization: [] };
      renderPeople(noUtilizationData);
      
      await waitFor(() => {
        // Should still show people table
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Action Buttons', () => {
    it('should show "Reduce Load" action for over-allocated people', async () => {
      renderPeople();
      
      await waitFor(() => {
        const reduceLoadButtons = screen.getAllByText('Reduce Load');
        expect(reduceLoadButtons).toHaveLength(1); // Only for John Doe
        
        fireEvent.click(reduceLoadButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/assignments?person=person-1&action=reduce');
      });
    });

    it('should show "Assign More" action for under-allocated people', async () => {
      renderPeople();
      
      await waitFor(() => {
        const assignMoreButtons = screen.getAllByText('Assign More');
        expect(assignMoreButtons).toHaveLength(1); // Only for Jane Smith
        
        fireEvent.click(assignMoreButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/assignments/new?person=person-2');
      });
    });

    it('should show "Monitor" action for fully allocated people', async () => {
      renderPeople();
      
      await waitFor(() => {
        const monitorButtons = screen.getAllByText('Monitor');
        expect(monitorButtons).toHaveLength(1); // Only for Bob Wilson
        
        fireEvent.click(monitorButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/reports?type=utilization&person=person-3');
      });
    });

    it('should show "Assign Project" action for available people', async () => {
      const availablePersonData = {
        personUtilization: [
          {
            person_id: 'person-1',
            person_name: 'John Doe',
            total_allocation: 10,
            current_availability_percentage: 100,
            allocation_status: 'UNDER_ALLOCATED',
          },
        ],
      };

      renderPeople(availablePersonData);
      
      await waitFor(() => {
        const assignProjectButtons = screen.getAllByText('Assign Project');
        expect(assignProjectButtons).toHaveLength(1);
        
        fireEvent.click(assignProjectButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/assignments/new?person=person-1');
      });
    });
  });

  describe('Status Color Coding', () => {
    it('should apply correct CSS classes for different statuses', async () => {
      renderPeople();
      
      await waitFor(() => {
        // Check for danger status (over-allocated)
        const overAllocatedElement = screen.getByText('120%').parentElement;
        expect(overAllocatedElement).toHaveClass('status-danger');

        // Check for warning status (fully allocated)
        const fullyAllocatedElement = screen.getByText('75%').parentElement;
        expect(fullyAllocatedElement).toHaveClass('status-warning');

        // Check for info status (under-allocated)
        const underAllocatedElement = screen.getByText('30%').parentElement;
        expect(underAllocatedElement).toHaveClass('status-info');
      });
    });
  });

  describe('Button Styling and Variants', () => {
    it('should apply correct button variants for different actions', async () => {
      renderPeople();
      
      await waitFor(() => {
        // Reduce Load button should be danger variant
        const reduceLoadButton = screen.getByText('Reduce Load');
        expect(reduceLoadButton).toHaveClass('btn-danger');

        // Assign More button should be info variant
        const assignMoreButton = screen.getByText('Assign More');
        expect(assignMoreButton).toHaveClass('btn-info');

        // Monitor button should be warning variant
        const monitorButton = screen.getByText('Monitor');
        expect(monitorButton).toHaveClass('btn-warning');
      });
    });
  });

  describe('Integration with Person Status', () => {
    it('should correctly calculate utilization percentages', async () => {
      const customUtilizationData = {
        personUtilization: [
          {
            person_id: 'person-1',
            person_name: 'John Doe',
            total_allocation: 50,
            current_availability_percentage: 80,
            allocation_status: 'UNDER_ALLOCATED',
          },
        ],
      };

      renderPeople(customUtilizationData);
      
      await waitFor(() => {
        // Should show 63% utilization (50/80 = 62.5% rounded to 63%)
        expect(screen.getByText('63%')).toBeInTheDocument();
      });
    });

    it('should handle edge case of zero availability', async () => {
      const zeroAvailabilityData = {
        personUtilization: [
          {
            person_id: 'person-1',
            person_name: 'John Doe',
            total_allocation: 50,
            current_availability_percentage: 0,
            allocation_status: 'UNDER_ALLOCATED',
          },
        ],
      };

      renderPeople(zeroAvailabilityData);
      
      await waitFor(() => {
        // Should show 0% utilization when availability is 0
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Interactions', () => {
    it('should handle edit button clicks without interfering with quick actions', async () => {
      renderPeople();
      
      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
        
        // Edit button should not trigger navigation to assignments
        fireEvent.click(editButtons[0]);
        expect(mockNavigate).not.toHaveBeenCalledWith(
          expect.stringContaining('/assignments')
        );
      });
    });

    it('should show proper tooltips and titles for action buttons', async () => {
      renderPeople();
      
      await waitFor(() => {
        const reduceLoadButton = screen.getByText('Reduce Load');
        expect(reduceLoadButton).toHaveAttribute('title', 'Reduce Load');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const queryClient = createTestQueryClient();
      const { api } = require('../../../client/src/lib/api-client');
      
      // Mock API to reject
      api.people.list.mockRejectedValue(new Error('API Error'));
      api.people.getUtilization.mockRejectedValue(new Error('Utilization Error'));
      
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/people']}>
            <People />
          </MemoryRouter>
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        // Should show error message instead of crashing
        expect(screen.getByText('Failed to load people')).toBeInTheDocument();
      });
    });
  });
});
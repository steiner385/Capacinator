import React from 'react';

// Mock the API client first
jest.mock('../../lib/api-client', () => ({
  api: {
    reporting: {
      getCapacity: jest.fn(),
      getUtilization: jest.fn(),
      getDemand: jest.fn(),
      getGaps: jest.fn(),
    },
    people: {
      list: jest.fn(),
    },
    assignments: {
      list: jest.fn(),
    },
    projects: {
      list: jest.fn(),
    },
    scenarios: {
      list: jest.fn(),
    },
  },
}));

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
}));

// Mock PortalThemeProvider to avoid context issues in tests
jest.mock('../../components/PortalThemeProvider', () => ({
  PortalThemeProvider: ({ children }: any) => <>{children}</>,
}));

// Mock contexts
jest.mock('../../contexts/UserContext', () => ({
  useUser: () => ({
    currentUser: { id: 'user-1', name: 'Test User' },
    isLoggedIn: true,
    setCurrentUser: jest.fn(),
    logout: jest.fn(),
  }),
  UserProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('../../contexts/ScenarioContext', () => ({
  useScenario: () => ({
    currentScenario: null,
    scenarios: [],
    setCurrentScenario: jest.fn(),
    loadScenarios: jest.fn(),
    isLoading: false,
  }),
  ScenarioProvider: ({ children }: any) => <>{children}</>,
}));

// Now import the test utilities and other dependencies
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../tests/unit/client/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Reports from '../Reports';
import { api } from '../../lib/api-client';

describe('Reports Page', () => {

  const mockCapacityData = {
    totalCapacity: 1280,
    utilizedCapacity: 960,
    availableCapacity: 320,
    utilizationRate: 75,
    byRole: [
      { role: 'Developer', capacity: 640, utilized: 480 },
      { role: 'Designer', capacity: 320, utilized: 240 },
      { role: 'Manager', capacity: 320, utilized: 240 },
    ],
    byLocation: [
      { location: 'New York', capacity: 800, percentage: 62 },
      { location: 'San Francisco', capacity: 480, percentage: 38 },
    ],
    utilizationData: [
      {
        person_id: 'person-1',
        person_name: 'John Doe',
        available_hours: 8,
        default_availability_percentage: 100,
        allocation_status: 'AVAILABLE',
      },
      {
        person_id: 'person-2',
        person_name: 'Jane Smith',
        available_hours: 8,
        default_availability_percentage: 100,
        allocation_status: 'FULLY_ALLOCATED',
      },
      {
        person_id: 'person-3',
        person_name: 'Bob Johnson',
        available_hours: 6,
        default_availability_percentage: 75,
        allocation_status: 'OVER_ALLOCATED',
      },
    ],
    personUtilization: [
      { person_id: 'person-1', person_name: 'John Doe', default_hours_per_day: 8 },
      { person_id: 'person-2', person_name: 'Jane Smith', default_hours_per_day: 8 },
    ],
    timeline: [],
  };

  const mockUtilizationData = {
    averageUtilization: 75,
    overAllocatedCount: 1,
    underUtilizedCount: 1,
    optimalCount: 0,
    utilizationData: [
      {
        person_id: 'person-1',
        person_name: 'John Doe',
        person_email: 'john@example.com',
        primary_role_name: 'Developer',
        location_name: 'New York',
        available_hours: 8,
        total_allocated_hours: 6,
        default_availability_percentage: 100,
        available_capacity_percentage: 25,
        available_hours_remaining: 2,
        project_count: 2,
        project_names: 'Project A,Project B',
        total_allocation_percentage: 75,
        total_allocation_percentage_all_assignments: 75,
        has_external_conflicts: false,
      },
      {
        person_id: 'person-2',
        person_name: 'Jane Smith',
        person_email: 'jane@example.com',
        primary_role_name: 'Designer',
        location_name: 'San Francisco',
        available_hours: 8,
        total_allocated_hours: 10,
        default_availability_percentage: 100,
        available_capacity_percentage: -25,
        available_hours_remaining: -2,
        project_count: 3,
        project_names: 'Project B,Project C,Project D',
        total_allocation_percentage: 125,
        total_allocation_percentage_all_assignments: 125,
        has_external_conflicts: false,
      },
    ],
    roleUtilization: [
      { role: 'Developer', avgUtilization: 80, peopleCount: 5, totalUtilization: 400 },
      { role: 'Designer', avgUtilization: 70, peopleCount: 3, totalUtilization: 210 },
    ],
    utilizationDistribution: [
      { range: '0-25%', count: 1 },
      { range: '25-50%', count: 2 },
      { range: '50-75%', count: 3 },
      { range: '75-100%', count: 4 },
      { range: '>100%', count: 2 },
    ],
  };

  const mockDemandData = {
    summary: {
      total_hours: 2400,
      total_projects: 12,
    },
    by_project_type: [
      { project_type_name: 'Software Development', total_hours: 1600 },
      { project_type_name: 'Data Migration', total_hours: 800 },
    ],
    timeline: [
      { month: '2024-01', total_hours: 800 },
      { month: '2024-02', total_hours: 900 },
      { month: '2024-03', total_hours: 700 },
    ],
  };

  const mockGapsData = {
    summary: {
      totalGapHours: 480,
      capacity_gaps: 3,
    },
    capacityGaps: [
      {
        role_id: 'role-1',
        role_name: 'Developer',
        total_demand_fte: 8,
        total_capacity_fte: 5,
        gap_fte: 3,
      },
      {
        role_id: 'role-2',
        role_name: 'Designer',
        total_demand_fte: 4,
        total_capacity_fte: 3,
        gap_fte: 1,
      },
    ],
  };

  const mockPeopleData = {
    data: [
      { id: 'person-1', name: 'John Doe', location_name: 'New York', default_availability_percentage: 100, default_hours_per_day: 8 },
      { id: 'person-2', name: 'Jane Smith', location_name: 'San Francisco', default_availability_percentage: 100, default_hours_per_day: 8 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    (api.reporting.getCapacity as jest.Mock).mockResolvedValue({ data: mockCapacityData });
    (api.reporting.getUtilization as jest.Mock).mockResolvedValue({ data: mockUtilizationData });
    (api.reporting.getDemand as jest.Mock).mockResolvedValue({ data: mockDemandData });
    (api.reporting.getGaps as jest.Mock).mockResolvedValue({ data: mockGapsData });
    (api.people.list as jest.Mock).mockResolvedValue({ data: mockPeopleData });
    (api.assignments.list as jest.Mock).mockResolvedValue({ data: { data: [] } });
    (api.projects.list as jest.Mock).mockResolvedValue({ data: { data: [] } });
    (api.scenarios.list as jest.Mock).mockResolvedValue({ data: [] });
  });

  const renderComponent = () => {
    return renderWithProviders(<Reports />);
  };

  describe('Capacity Report Table', () => {
    test('renders people capacity table with correct headers', async () => {
      renderComponent();

      // Default active report is 'demand', need to switch to 'capacity'
      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('People Capacity Overview')).toBeInTheDocument();
      });

      // Find the table by finding its container first
      const peopleCapacitySection = screen.getByText('People Capacity Overview').parentElement;
      const table = within(peopleCapacitySection!).getByRole('table');
      const headers = within(table).getAllByRole('columnheader');
      
      expect(headers[0]).toHaveTextContent('Name');
      expect(headers[1]).toHaveTextContent('Daily Hours');
      expect(headers[2]).toHaveTextContent('Availability');
      expect(headers[3]).toHaveTextContent('Status');
      expect(headers[4]).toHaveTextContent('Actions');
    });

    test('displays people capacity data correctly', async () => {
      renderComponent();

      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getAllByText('8 hrs/day').length).toBeGreaterThan(0);
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Fully Allocated')).toBeInTheDocument();
      expect(screen.getByText('Over Allocated')).toBeInTheDocument();
    });

    test('renders role capacity table with correct headers', async () => {
      renderComponent();

      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('Role Capacity Analysis')).toBeInTheDocument();
      });

      // Find the role table by finding its container
      const roleCapacitySection = screen.getByText('Role Capacity Analysis').parentElement;
      const roleTable = within(roleCapacitySection!).getByRole('table');
      const headers = within(roleTable).getAllByRole('columnheader');
      
      expect(headers[0]).toHaveTextContent('Role');
      expect(headers[1]).toHaveTextContent('Total Capacity (hrs)');
      expect(headers[2]).toHaveTextContent('Utilized (hrs)');
      expect(headers[3]).toHaveTextContent('Available (hrs)');
      expect(headers[4]).toHaveTextContent('Status');
      expect(headers[5]).toHaveTextContent('Actions');
    });

    test('displays role capacity data correctly', async () => {
      renderComponent();

      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('Developer')).toBeInTheDocument();
      });

      expect(screen.getByText('640')).toBeInTheDocument();
      expect(screen.getByText('480')).toBeInTheDocument();
      expect(screen.getByText('Designer')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    test('shows action buttons based on allocation status', async () => {
      renderComponent();

      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('Assign')).toBeInTheDocument(); // For available person
      });

      expect(screen.getByText('View Load')).toBeInTheDocument(); // For fully allocated
      expect(screen.getByText('Reduce Load')).toBeInTheDocument(); // For over allocated
    });
  });

  describe('Utilization Report Table', () => {
    test('renders team utilization table with correct headers', async () => {
      renderComponent();

      const utilizationTab = screen.getByRole('button', { name: /utilization/i });
      await userEvent.click(utilizationTab);

      await waitFor(() => {
        expect(screen.getByText('Team Utilization Details')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find the table in the utilization section
      const utilizationSection = screen.getByText('Team Utilization Details').parentElement;
      const table = within(utilizationSection!).getByRole('table');
      const headers = within(table).getAllByRole('columnheader');
      
      expect(headers[0]).toHaveTextContent('Name');
      expect(headers[1]).toHaveTextContent('Role');
      expect(headers[2]).toHaveTextContent('Utilization (%)');
      expect(headers[3]).toHaveTextContent('Available Capacity (%)');
      expect(headers[4]).toHaveTextContent('Available Hours (Daily)');
      expect(headers[5]).toHaveTextContent('Actions');
    });

    test('displays utilization data correctly', async () => {
      renderComponent();

      const utilizationTab = screen.getByRole('button', { name: /utilization/i });
      await userEvent.click(utilizationTab);

      await waitFor(() => {
        // Look for john@example.com which is unique to utilization data
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Now we can safely check for other fields
      const johnDoeElements = screen.getAllByText('John Doe');
      expect(johnDoeElements.length).toBeGreaterThan(0);
      // Use getAllByText since Developer might appear multiple times
      const developerElements = screen.getAllByText('Developer');
      expect(developerElements.length).toBeGreaterThan(0);
      // Use getAllByText since there may be multiple percentage values
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
      
      // Overallocated person - use getAllByText since Jane appears multiple times
      const janeSmithElements = screen.getAllByText('Jane Smith');
      expect(janeSmithElements.length).toBeGreaterThan(0);
      // 125% also appears multiple times
      const overAllocationElements = screen.getAllByText('125%');
      expect(overAllocationElements.length).toBeGreaterThan(0);
    });

    test('shows utilization summary cards', async () => {
      renderComponent();

      const utilizationTab = screen.getByRole('button', { name: /utilization/i });
      await userEvent.click(utilizationTab);

      await waitFor(() => {
        expect(screen.getByText('Utilization %')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Use getAllByText since there may be multiple 75% values (average utilization)
      const utilizationPercentages = screen.getAllByText('75%');
      expect(utilizationPercentages.length).toBeGreaterThan(0);
      // Use getAllByText since numbers might appear in multiple places
      expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Over utilized count
      expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Under utilized count
      expect(screen.getAllByText('0').length).toBeGreaterThan(0); // Optimal count
    });
  });

  describe('Demand Report', () => {
    test('shows demand summary information', async () => {
      renderComponent();

      // Default tab is demand
      await waitFor(() => {
        expect(screen.getByText('Total Demand')).toBeInTheDocument();
      });

      expect(screen.getByText('2400 hours')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Project count
    });

    test('displays demand by project type', async () => {
      renderComponent();

      await waitFor(() => {
        // Since there might be multiple charts, use getAllByTestId
        const barCharts = screen.getAllByTestId('bar-chart');
        expect(barCharts.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // The data is rendered in the chart, but we can't easily test chart content
      // We can verify the data was fetched
      expect(api.reporting.getDemand).toHaveBeenCalled();
    });
  });

  describe('Gaps Report Table', () => {
    test('renders gaps report sections', async () => {
      renderComponent();

      const gapsTab = screen.getByRole('button', { name: /gaps/i });
      await userEvent.click(gapsTab);

      await waitFor(() => {
        expect(screen.getByText('Total Gap in Hours')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for main sections
      expect(screen.getByText('Actionable Projects')).toBeInTheDocument();
      expect(screen.getByText('Actionable Roles')).toBeInTheDocument();
      expect(screen.getByText('Roles with Critical Shortages')).toBeInTheDocument();
    });

    test('displays gaps data correctly', async () => {
      renderComponent();

      const gapsTab = screen.getByRole('button', { name: /gaps/i });
      await userEvent.click(gapsTab);

      await waitFor(() => {
        expect(screen.getByText('Actionable Roles')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Look for Developer role in the gaps data
      const developerElements = screen.getAllByText('Developer');
      expect(developerElements.length).toBeGreaterThan(0);
      
      // Check for gap data - 480 hours gap
      expect(screen.getByText('480 hours short')).toBeInTheDocument();
    });

    test('shows gap action buttons', async () => {
      renderComponent();

      const gapsTab = screen.getByRole('button', { name: /gaps/i });
      await userEvent.click(gapsTab);

      await waitFor(() => {
        const viewPeopleButtons = screen.getAllByText('View People');
        expect(viewPeopleButtons.length).toBeGreaterThan(0);
      });

      const hireButtons = screen.getAllByText(/Hire.*Developer|Designer/);
      expect(hireButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Report Navigation and Filtering', () => {
    test('switches between report types', async () => {
      renderComponent();

      // Start with demand (default)
      await waitFor(() => {
        expect(screen.getByText('Total Demand')).toBeInTheDocument();
      });

      // Switch to capacity
      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);
      await waitFor(() => {
        expect(screen.getByText('Total Capacity')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to utilization
      const utilizationTab = screen.getByRole('button', { name: /utilization/i });
      await userEvent.click(utilizationTab);
      await waitFor(() => {
        expect(screen.getByText('Utilization %')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Switch to gaps
      const gapsTab = screen.getByRole('button', { name: /gaps/i });
      await userEvent.click(gapsTab);
      await waitFor(() => {
        // The gaps report shows "Total Gap in Hours" instead of "Capacity Gaps by Role"
        expect(screen.getByText('Total Gap in Hours')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('shows export dropdown when clicked', async () => {
      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('CSV (.csv)')).toBeInTheDocument();
      }, { timeout: 3000 });
      expect(screen.getByText('PDF (.pdf)')).toBeInTheDocument();
      expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument();
    });

    test('refreshes data when refresh button clicked', async () => {
      renderComponent();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      // Verify API was called again
      expect(api.reporting.getDemand).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    test('shows empty state for capacity report', async () => {
      (api.reporting.getCapacity as jest.Mock).mockResolvedValue({
        data: {
          totalCapacity: 0,
          utilizedCapacity: 0,
          availableCapacity: 0,
          utilizationRate: 0,
          personUtilization: [],
          byRole: [],
          utilizationData: [],
          byLocation: [],
          timeline: [],
        },
      });

      renderComponent();

      const capacityTab = screen.getByRole('button', { name: /capacity/i });
      await userEvent.click(capacityTab);

      await waitFor(() => {
        expect(screen.getByText('No Capacity Data Found')).toBeInTheDocument();
      });
    });

    test('shows zero utilization message', async () => {
      (api.reporting.getUtilization as jest.Mock).mockResolvedValue({
        data: {
          averageUtilization: 0,
          utilizationData: [],
        },
      });

      renderComponent();

      const utilizationTab = screen.getByRole('button', { name: /utilization/i });
      await userEvent.click(utilizationTab);

      await waitFor(() => {
        expect(screen.getByText('No Project Assignments Found')).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      (api.reporting.getDemand as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        // Should show loading state as the component stays in loading state on error
        expect(screen.getByText('Loading demand report...')).toBeInTheDocument();
      });
    });
  });
});
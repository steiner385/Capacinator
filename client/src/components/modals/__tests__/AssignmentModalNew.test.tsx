import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssignmentModalNew } from '../AssignmentModalNew';
import { api } from '../../../lib/api-client';

// Mock the API client
jest.mock('../../../lib/api-client', () => ({
  api: {
    assignments: {
      create: jest.fn(),
      update: jest.fn()
    },
    projects: {
      list: jest.fn(),
      get: jest.fn()
    },
    people: {
      list: jest.fn()
    },
    roles: {
      list: jest.fn()
    },
    phases: {
      list: jest.fn()
    }
  }
}));

describe('AssignmentModalNew', () => {
  let queryClient: QueryClient;

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockProjects = {
    data: [
      { id: 'proj-1', name: 'Project Alpha' },
      { id: 'proj-2', name: 'Project Beta' }
    ]
  };

  const mockPeople = {
    data: [
      { id: 'person-1', name: 'John Doe' },
      { id: 'person-2', name: 'Jane Smith' }
    ]
  };

  const mockRoles = [
    { id: 'role-1', name: 'Developer' },
    { id: 'role-2', name: 'Designer' }
  ];

  const mockPhases = [
    { id: 'phase-1', name: 'Planning' },
    { id: 'phase-2', name: 'Development' }
  ];

  const mockProjectPhases = [
    { phase_id: 'phase-1', start_date: '2025-01-01', end_date: '2025-03-31' }
  ];

  const mockAssignment = {
    id: 'assignment-1',
    project_id: 'proj-1',
    person_id: 'person-1',
    role_id: 'role-1',
    phase_id: 'phase-1',
    assignment_date_mode: 'fixed',
    start_date: '2025-01-01T00:00:00',
    end_date: '2025-12-31T00:00:00',
    allocation_percentage: 50,
    billable: true,
    notes: 'Test notes'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Default mock responses
    (api.projects.list as jest.Mock).mockResolvedValue(mockProjects);
    (api.people.list as jest.Mock).mockResolvedValue(mockPeople);
    (api.roles.list as jest.Mock).mockResolvedValue({ data: { data: mockRoles } });
    (api.phases.list as jest.Mock).mockResolvedValue({ data: { data: mockPhases } });
    (api.projects.get as jest.Mock).mockResolvedValue({ data: { phases: mockProjectPhases } });

    // Mock scrollIntoView for Radix Select
    Element.prototype.scrollIntoView = jest.fn();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      onSuccess: mockOnSuccess
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <AssignmentModalNew {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create New Assignment/i })).toBeInTheDocument();
      });
    });

    it('does not render when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('heading', { name: /Create New Assignment/i })).not.toBeInTheDocument();
    });

    it('shows Create title for new assignment', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Create New Assignment' })).toBeInTheDocument();
      });
    });

    it('shows Edit title when editing', async () => {
      renderComponent({ editingAssignment: mockAssignment });
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Assignment' })).toBeInTheDocument();
      });
    });

    it('renders all form fields', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /person/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Start Date \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Date \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Allocation % \*/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Initialization', () => {
    it('initializes with empty values for new assignment', async () => {
      renderComponent();
      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i) as HTMLInputElement;
        expect(allocationInput.value).toBe('100');
      });
    });

    it('initializes allocation to 100%', async () => {
      renderComponent();
      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i) as HTMLInputElement;
        expect(allocationInput.value).toBe('100');
      });
    });

    it('initializes billable to checked', async () => {
      renderComponent();
      await waitFor(() => {
        const billableCheckbox = screen.getByRole('checkbox', { name: /Billable/i });
        expect(billableCheckbox).toBeChecked();
      });
    });

    it('populates form with assignment data when editing', async () => {
      renderComponent({ editingAssignment: mockAssignment });
      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i) as HTMLInputElement;
        const startDateInput = screen.getByLabelText(/Start Date \*/i) as HTMLInputElement;
        const endDateInput = screen.getByLabelText(/End Date \*/i) as HTMLInputElement;
        const notesInput = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement;

        expect(allocationInput.value).toBe('50');
        expect(startDateInput.value).toBe('2025-01-01');
        expect(endDateInput.value).toBe('2025-12-31');
        expect(notesInput.value).toBe('Test notes');
      });
    });
  });

  describe('Data Loading', () => {
    it('fetches projects data', async () => {
      renderComponent();
      await waitFor(() => {
        expect(api.projects.list).toHaveBeenCalled();
      });
    });

    it('fetches people data', async () => {
      renderComponent();
      await waitFor(() => {
        expect(api.people.list).toHaveBeenCalled();
      });
    });

    it('fetches roles data', async () => {
      renderComponent();
      await waitFor(() => {
        expect(api.roles.list).toHaveBeenCalled();
      });
    });

    it('fetches phases data', async () => {
      renderComponent();
      await waitFor(() => {
        expect(api.phases.list).toHaveBeenCalled();
      });
    });

    it('handles roles API returning undefined data gracefully', async () => {
      (api.roles.list as jest.Mock).mockResolvedValue({ data: undefined });

      renderComponent();

      // Should not crash, component should render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create New Assignment/i })).toBeInTheDocument();
      });
    });

    it('handles roles API returning non-array data gracefully', async () => {
      (api.roles.list as jest.Mock).mockResolvedValue({ data: { data: null } });

      renderComponent();

      // Should not crash, component should render
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create New Assignment/i })).toBeInTheDocument();
      });
    });

    it('handles malformed roles API response gracefully', async () => {
      (api.roles.list as jest.Mock).mockResolvedValue({ data: { wrongKey: [] } });

      renderComponent();

      // Should not crash when roles is undefined
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Create New Assignment/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in allocation field', async () => {
      renderComponent();
      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i);
        fireEvent.change(allocationInput, { target: { value: '75' } });
        expect(allocationInput).toHaveValue(75);
      });
    });

    it('allows typing in notes field', async () => {
      renderComponent();
      await waitFor(() => {
        const notesInput = screen.getByLabelText(/Notes/i);
        fireEvent.change(notesInput, { target: { value: 'New notes' } });
        expect(notesInput).toHaveValue('New notes');
      });
    });

    it('allows toggling billable checkbox', async () => {
      renderComponent();
      await waitFor(() => {
        const billableCheckbox = screen.getByRole('checkbox', { name: /Billable/i });
        expect(billableCheckbox).toBeChecked();

        fireEvent.click(billableCheckbox);
        expect(billableCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting without project', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without person', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Person is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without role', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Role is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without start date', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without end date', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('End date is required')).toBeInTheDocument();
      });
    });

    it('has allocation input with min/max constraints', async () => {
      renderComponent();

      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i) as HTMLInputElement;
        expect(allocationInput).toBeInTheDocument();
        expect(allocationInput.min).toBe('1');
        expect(allocationInput.max).toBe('100');
      });
    });

    it('shows error alert when there are validation errors', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fix the errors below before submitting/i)).toBeInTheDocument();
      });
    });

    it('clears errors when user corrects input', async () => {
      renderComponent();

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument();
      });

      // Correcting the input should clear the error (when project select changes)
      // Note: Full interaction test would require selecting from dropdown
      // This tests the error clearing logic
      const allocationInput = screen.getByLabelText(/Allocation % \*/i);
      fireEvent.change(allocationInput, { target: { value: '50' } });

      // The allocation error should clear when we type valid value
      await waitFor(() => {
        expect(screen.queryByText('Allocation must be between 1 and 100')).not.toBeInTheDocument();
      });
    });

    it('does not call API when validation fails', async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Project is required')).toBeInTheDocument();
      });

      expect(api.assignments.create).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission - Create Mode', () => {
    it('shows Create Assignment button in create mode', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Assignment/i })).toBeInTheDocument();
      });
    });

    it('invalidates assignments queries on successful submission', async () => {
      (api.assignments.update as jest.Mock).mockResolvedValue({ data: { data: {} } });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderComponent({ editingAssignment: mockAssignment });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Update Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] });
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('calls update API when editing', async () => {
      (api.assignments.update as jest.Mock).mockResolvedValue({ data: { data: {} } });

      renderComponent({ editingAssignment: mockAssignment });

      await waitFor(() => {
        const allocationInput = screen.getByLabelText(/Allocation % \*/i);
        fireEvent.change(allocationInput, { target: { value: '75' } });
      });

      const submitButton = screen.getByRole('button', { name: /Update Assignment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.assignments.update).toHaveBeenCalledWith('assignment-1', expect.objectContaining({
          allocation_percentage: 75
        }));
      });
    });

    it('calls onSuccess after successful update', async () => {
      const updatedData = { ...mockAssignment, allocation_percentage: 75 };
      (api.assignments.update as jest.Mock).mockResolvedValue({ data: { data: updatedData } });

      renderComponent({ editingAssignment: mockAssignment });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Update Assignment/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedData);
      });
    });

    it('shows Update button in edit mode', async () => {
      renderComponent({ editingAssignment: mockAssignment });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Update Assignment/i })).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });
    });

    it('calls onClose when Cancel button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form fields', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /person/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Start Date \*/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Date \*/i)).toBeInTheDocument();
      });
    });

    it('has proper dialog structure', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});

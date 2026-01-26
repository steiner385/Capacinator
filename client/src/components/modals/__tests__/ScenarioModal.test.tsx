import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateScenarioModal, EditScenarioModal, DeleteConfirmationModal } from '../ScenarioModal';
import { api } from '../../../lib/api-client';
import { UserProvider } from '../../../contexts/UserContext';

// Mock the API client
jest.mock('../../../lib/api-client', () => ({
  api: {
    scenarios: {
      create: jest.fn(),
      update: jest.fn()
    },
    auth: {
      me: jest.fn(),
      login: jest.fn(),
      logout: jest.fn()
    }
  },
  isAuthenticated: jest.fn(() => false),
  saveAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn()
}));

// Mock UserContext
jest.mock('../../../contexts/UserContext', () => ({
  ...jest.requireActual('../../../contexts/UserContext'),
  useUser: () => ({
    currentUser: { id: 'user-1', username: 'testuser' }
  })
}));

describe('CreateScenarioModal', () => {
  let queryClient: QueryClient;

  const mockOnClose = jest.fn();

  const mockParentScenario = {
    id: 'parent-1',
    name: 'Q4 2025 Plan',
    description: 'Fourth quarter planning'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <CreateScenarioModal {...defaultProps} {...props} />
        </UserProvider>
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /Create New Scenario/i })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('heading', { name: /Create New Scenario/i })).not.toBeInTheDocument();
    });

    it('renders form fields', () => {
      renderComponent();
      expect(screen.getByLabelText(/Scenario Name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Scenario Type/i)).toBeInTheDocument();
    });

    it('shows parent scenario info when branching', () => {
      renderComponent({ parentScenario: mockParentScenario });
      expect(screen.getByText(/Branching from:/i)).toBeInTheDocument();
      expect(screen.getByText('Q4 2025 Plan')).toBeInTheDocument();
    });

    it('does not show parent info when creating standalone', () => {
      renderComponent();
      expect(screen.queryByText(/Branching from:/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('initializes with empty values', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Scenario Name \*/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    it('defaults to branch scenario type', () => {
      renderComponent();
      const typeSelect = screen.getByRole('combobox');
      expect(typeSelect).toHaveTextContent(/Branch/i);
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in name field', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Scenario Name \*/i);

      fireEvent.change(nameInput, { target: { value: 'New Scenario' } });
      expect(nameInput).toHaveValue('New Scenario');
    });

    it('allows typing in description field', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
      expect(descriptionInput).toHaveValue('Test description');
    });

    it('allows changing scenario type', async () => {
      renderComponent();
      const typeSelect = screen.getByRole('combobox');

      fireEvent.click(typeSelect);

      await waitFor(() => {
        const sandboxOption = screen.getByRole('option', { name: /Sandbox/i });
        fireEvent.click(sandboxOption);
      });

      expect(typeSelect).toHaveTextContent(/Sandbox/i);
    });

    it('has name field marked as required', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Scenario Name \*/i);
      expect(nameInput).toBeRequired();
    });
  });

  describe('Scenario Type Options', () => {
    beforeEach(() => {
      // Mock scrollIntoView for Radix Select
      Element.prototype.scrollIntoView = jest.fn();
    });

    it('shows both branch and sandbox options', async () => {
      renderComponent();
      const typeSelect = screen.getByRole('combobox');

      fireEvent.click(typeSelect);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /Branch/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Sandbox/i })).toBeInTheDocument();
      });
    });

    it('branch option has descriptive text', async () => {
      renderComponent();
      const typeSelect = screen.getByRole('combobox');

      fireEvent.click(typeSelect);

      await waitFor(() => {
        // Text appears in multiple places (select trigger, option, etc)
        expect(screen.getAllByText(/Copy from parent scenario/i).length).toBeGreaterThan(0);
      });
    });

    it('sandbox option has descriptive text', async () => {
      renderComponent();
      const typeSelect = screen.getByRole('combobox');

      fireEvent.click(typeSelect);

      await waitFor(() => {
        // Text appears in multiple places
        expect(screen.getAllByText(/Start fresh/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Submission', () => {
    it('calls create API with correct data', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Q1 2026 Plan' }
      });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'First quarter planning' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.create).toHaveBeenCalledWith({
          name: 'Q1 2026 Plan',
          description: 'First quarter planning',
          parent_scenario_id: undefined,
          created_by: 'user-1',
          scenario_type: 'branch'
        });
      });
    });

    it('includes parent scenario id when branching', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent({ parentScenario: mockParentScenario });

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Q1 2026 Branch' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.create).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_scenario_id: 'parent-1'
          })
        );
      });
    });

    it('trims whitespace from inputs', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: '  Test  ' }
      });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: '  Description  ' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test',
            description: 'Description'
          })
        );
      });
    });

    it('clears form after successful creation', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      const nameInput = screen.getByLabelText(/Scenario Name \*/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.change(descriptionInput, { target: { value: 'Description' } });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.create).toHaveBeenCalled();
      });

      // Form should be cleared
      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    it('calls onClose after successful creation', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Scenario/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });

    it('disables submit button when name is empty', () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit button when name is whitespace only', () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: '   ' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when name is valid', () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Valid Name' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Scenario/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('shows loading state during submission', async () => {
      (api.scenarios.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Scenario/i }));

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    it('invalidates scenarios queries after creation', async () => {
      (api.scenarios.create as jest.Mock).mockResolvedValue({ data: {} });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Scenario/i }));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scenarios'] });
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', async () => {
      renderComponent();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });
});

describe('EditScenarioModal', () => {
  let queryClient: QueryClient;

  const mockOnClose = jest.fn();

  const mockScenario = {
    id: 'scenario-1',
    name: 'Current Plan',
    description: 'Current planning scenario'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      scenario: mockScenario
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <EditScenarioModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /Edit Scenario/i })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('heading', { name: /Edit Scenario/i })).not.toBeInTheDocument();
    });

    it('renders form fields', () => {
      renderComponent();
      expect(screen.getByLabelText(/Scenario Name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('populates form with scenario data', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Scenario Name \*/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Current Plan');
      expect(descriptionInput.value).toBe('Current planning scenario');
    });

    it('handles scenario with empty description', () => {
      const scenarioWithoutDesc = { ...mockScenario, description: '' };
      renderComponent({ scenario: scenarioWithoutDesc });

      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('allows editing name field', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Scenario Name \*/i);

      fireEvent.change(nameInput, { target: { value: 'Updated Plan' } });
      expect(nameInput).toHaveValue('Updated Plan');
    });

    it('allows editing description field', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
      expect(descriptionInput).toHaveValue('Updated description');
    });
  });

  describe('Form Submission', () => {
    it('calls update API with correct data', async () => {
      (api.scenarios.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Updated Name' }
      });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'Updated description' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.update).toHaveBeenCalledWith('scenario-1', {
          name: 'Updated Name',
          description: 'Updated description'
        });
      });
    });

    it('trims whitespace from inputs', async () => {
      (api.scenarios.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: '  Updated  ' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.scenarios.update).toHaveBeenCalledWith(
          'scenario-1',
          expect.objectContaining({
            name: 'Updated'
          })
        );
      });
    });

    it('calls onClose after successful update', async () => {
      (api.scenarios.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });

    it('disables submit button when name is empty', () => {
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: '' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows loading state during submission', async () => {
      (api.scenarios.update as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('invalidates scenarios queries after update', async () => {
      (api.scenarios.update as jest.Mock).mockResolvedValue({ data: {} });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Scenario Name \*/i), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['scenarios'] });
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', async () => {
      renderComponent();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });
});

describe('DeleteConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockScenario = {
    id: 'scenario-1',
    name: 'Scenario to Delete'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      onConfirm: mockOnConfirm,
      scenario: mockScenario
    };

    return render(<DeleteConfirmationModal {...defaultProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /Delete Scenario/i })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('heading', { name: /Delete Scenario/i })).not.toBeInTheDocument();
    });

    it('displays scenario name in warning message', () => {
      renderComponent();
      // The scenario name appears in multiple places, just verify it's present
      expect(screen.getAllByText(/Scenario to Delete/)[0]).toBeInTheDocument();
    });

    it('shows warning about permanent deletion', () => {
      renderComponent();
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });

    it('renders confirmation input field', () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);
      expect(confirmInput).toBeInTheDocument();
    });
  });

  describe('Confirmation Logic', () => {
    it('disables delete button initially', () => {
      renderComponent();
      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      expect(deleteButton).toBeDisabled();
    });

    it('enables delete button when exact name is typed', () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: 'Scenario to Delete' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('keeps button disabled with partial match', () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: 'Scenario' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      expect(deleteButton).toBeDisabled();
    });

    it('keeps button disabled with different case', () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: 'scenario to delete' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      expect(deleteButton).toBeDisabled();
    });

    it('keeps button disabled with extra whitespace', () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: ' Scenario to Delete ' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Delete Action', () => {
    it('calls onConfirm when delete button is clicked with correct name', async () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: 'Scenario to Delete' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    it('calls onClose after confirming delete', async () => {
      renderComponent();
      const confirmInput = screen.getByPlaceholderText(/Enter scenario name/i);

      fireEvent.change(confirmInput, { target: { value: 'Scenario to Delete' } });

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });

    it('does not call onConfirm if button is disabled', () => {
      renderComponent();

      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      fireEvent.click(deleteButton);

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows destructive Delete button', () => {
      renderComponent();
      const deleteButton = screen.getByRole('button', { name: /Delete Scenario/i });
      // Verify it has variant="destructive" applied (has destructive-related classes)
      expect(deleteButton.className).toMatch(/destructive|red/i);
    });

    it('calls onClose when Cancel button is clicked', async () => {
      renderComponent();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('Warning Display', () => {
    it('shows warning styling for destructive action', () => {
      renderComponent();
      const warningBox = screen.getByText(/This action cannot be undone/i).closest('div');
      expect(warningBox).toHaveClass('bg-red-50');
    });

    it('shows confirmation instructions', () => {
      renderComponent();
      expect(screen.getByText(/Type.*to confirm deletion/i)).toBeInTheDocument();
    });
  });
});

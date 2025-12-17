import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectTypeModal } from '../ProjectTypeModal';
import { api } from '../../../lib/api-client';

// Mock the API client
jest.mock('../../../lib/api-client', () => ({
  api: {
    projectTypes: {
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));

describe('ProjectTypeModal', () => {
  let queryClient: QueryClient;

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockProjectType = {
    id: 'project-type-1',
    name: 'Product Development',
    description: 'Software product development projects',
    color_code: '#4f46e5'
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess
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
    return render(
      <QueryClientProvider client={queryClient}>
        <ProjectTypeModal {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /Create Project Type/i })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('heading', { name: /Create Project Type/i })).not.toBeInTheDocument();
    });

    it('shows Create title for new project type', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: 'Create Project Type' })).toBeInTheDocument();
    });

    it('shows Edit title when editing', () => {
      renderComponent({ editingProjectType: mockProjectType });
      expect(screen.getByRole('heading', { name: 'Edit Project Type' })).toBeInTheDocument();
    });

    it('renders form fields', () => {
      renderComponent();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
    });

    it('shows descriptive text for create mode', () => {
      renderComponent();
      expect(screen.getByText(/Fill in the information to create a new project type/i)).toBeInTheDocument();
    });

    it('shows descriptive text for edit mode', () => {
      renderComponent({ editingProjectType: mockProjectType });
      expect(screen.getByText(/Update the project type details below/i)).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('initializes with empty values for new project type', () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i }) as HTMLInputElement;
      const descriptionInput = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    it('initializes with default color', () => {
      renderComponent();
      const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
      expect(colorInput.value).toBe('#4f46e5'); // Default indigo color
    });

    it('populates form with project type data when editing', () => {
      renderComponent({ editingProjectType: mockProjectType });
      const nameInput = screen.getByRole('textbox', { name: /name/i }) as HTMLInputElement;
      const descriptionInput = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;
      const colorInput = screen.getByLabelText('Color') as HTMLInputElement;

      expect(nameInput.value).toBe('Product Development');
      expect(descriptionInput.value).toBe('Software product development projects');
      expect(colorInput.value).toBe('#4f46e5');
    });

    it('handles project type with empty description', () => {
      const projectTypeWithoutDesc = { ...mockProjectType, description: '' };
      renderComponent({ editingProjectType: projectTypeWithoutDesc });

      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in name field', () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i });

      fireEvent.change(nameInput, { target: { value: 'Consulting' } });
      expect(nameInput).toHaveValue('Consulting');
    });

    it('allows typing in description field', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(descriptionInput, { target: { value: 'Client consulting projects' } });
      expect(descriptionInput).toHaveValue('Client consulting projects');
    });

    it('allows selecting color from color input', () => {
      renderComponent();
      const colorInput = screen.getByLabelText('Color');

      fireEvent.change(colorInput, { target: { value: '#10b981' } });
      expect(colorInput).toHaveValue('#10b981');
    });

    it('displays selected color code as text', () => {
      renderComponent();
      const colorInput = screen.getByLabelText('Color');

      fireEvent.change(colorInput, { target: { value: '#ef4444' } });
      expect(screen.getByText('#ef4444')).toBeInTheDocument();
    });

    it('enforces 100 character limit on name', () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i }) as HTMLInputElement;

      expect(nameInput.maxLength).toBe(100);
    });
  });

  describe('Color Preset Selection', () => {
    it('renders all preset color buttons', () => {
      renderComponent();
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-label')?.includes('Select color #')
      );
      expect(colorButtons.length).toBe(10); // DEFAULT_COLORS has 10 colors
    });

    it('highlights selected preset color', () => {
      renderComponent();
      const firstColorButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('aria-label') === 'Select color #4f46e5'
      );
      expect(firstColorButton).toHaveClass('border-primary');
    });

    it('changes color when preset button is clicked', () => {
      renderComponent();
      const emeraldButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('aria-label') === 'Select color #10b981'
      );

      fireEvent.click(emeraldButton!);
      expect(screen.getByText('#10b981')).toBeInTheDocument();
    });

    it('updates color input when preset button is clicked', () => {
      renderComponent();
      const colorInput = screen.getByLabelText('Color') as HTMLInputElement;
      const amberButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('aria-label') === 'Select color #f59e0b'
      );

      fireEvent.click(amberButton!);
      expect(colorInput.value).toBe('#f59e0b');
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting with empty name', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project type name is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting with whitespace-only name', async () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project type name is required')).toBeInTheDocument();
      });
    });

    it('shows error alert when there are validation errors', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please fix the errors below before submitting/i)).toBeInTheDocument();
      });
    });

    it('clears errors when user starts typing', async () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      // Trigger validation error
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project type name is required')).toBeInTheDocument();
      });

      // Start typing
      fireEvent.change(nameInput, { target: { value: 'New Type' } });

      // Error should be cleared
      expect(screen.queryByText('Project type name is required')).not.toBeInTheDocument();
    });

    it('does not call API when validation fails', async () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project type name is required')).toBeInTheDocument();
      });

      expect(api.projectTypes.create).not.toHaveBeenCalled();
    });

    it('accepts form with only name filled', async () => {
      (api.projectTypes.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });

      fireEvent.change(nameInput, { target: { value: 'Consulting' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.projectTypes.create).toHaveBeenCalledWith({
          name: 'Consulting',
          description: '',
          color_code: '#4f46e5'
        });
      });
    });
  });

  describe('Form Submission - Create Mode', () => {
    it('calls create API with correct data', async () => {
      (api.projectTypes.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Research & Development' }
      });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'R&D projects' }
      });
      fireEvent.change(screen.getByLabelText('Color'), {
        target: { value: '#8b5cf6' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.projectTypes.create).toHaveBeenCalledWith({
          name: 'Research & Development',
          description: 'R&D projects',
          color_code: '#8b5cf6'
        });
      });
    });

    it('calls onSuccess after successful creation', async () => {
      const createdData = { id: 'new-id', name: 'New Type' };
      (api.projectTypes.create as jest.Mock).mockResolvedValue({ data: createdData });

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'New Type' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Project Type/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(createdData);
      });
    });

    it('calls onClose after successful creation', async () => {
      (api.projectTypes.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'New Type' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Project Type/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('disables submit button during save', async () => {
      (api.projectTypes.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Test Type' }
      });

      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('shows loading spinner during save', async () => {
      (api.projectTypes.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Test Type' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Project Type/i }));

      // Button should show loading state
      const submitButton = screen.getByRole('button', { name: /Create Project Type/i });
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('invalidates projectTypes queries after creation', async () => {
      (api.projectTypes.create as jest.Mock).mockResolvedValue({ data: {} });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderComponent();

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'New Type' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Project Type/i }));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['project-types'] });
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('calls update API with correct data', async () => {
      (api.projectTypes.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent({ editingProjectType: mockProjectType });

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Updated Name' }
      });

      const submitButton = screen.getByRole('button', { name: /Update Project Type/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.projectTypes.update).toHaveBeenCalledWith('project-type-1', {
          name: 'Updated Name',
          description: 'Software product development projects',
          color_code: '#4f46e5'
        });
      });
    });

    it('calls onSuccess after successful update', async () => {
      const updatedData = { ...mockProjectType, name: 'Updated' };
      (api.projectTypes.update as jest.Mock).mockResolvedValue({ data: updatedData });

      renderComponent({ editingProjectType: mockProjectType });

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Update Project Type/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updatedData);
      });
    });

    it('calls onClose after successful update', async () => {
      (api.projectTypes.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent({ editingProjectType: mockProjectType });

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Update Project Type/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('invalidates specific project type query after update', async () => {
      (api.projectTypes.update as jest.Mock).mockResolvedValue({ data: {} });
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      renderComponent({ editingProjectType: mockProjectType });

      fireEvent.change(screen.getByRole('textbox', { name: /name/i }), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Update Project Type/i }));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['project-types', 'detail', 'project-type-1'] });
      });

      invalidateSpy.mockRestore();
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows Create button in create mode', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Create Project Type/i })).toBeInTheDocument();
    });

    it('shows Update button in edit mode', () => {
      renderComponent({ editingProjectType: mockProjectType });
      expect(screen.getByRole('button', { name: /Update Project Type/i })).toBeInTheDocument();
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

  describe('Form Reset', () => {
    it('clears form when switching from edit to create', () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ProjectTypeModal {...defaultProps} editingProjectType={mockProjectType} />
        </QueryClientProvider>
      );

      // Verify it's populated
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('Product Development');

      // Switch to create mode
      rerender(
        <QueryClientProvider client={queryClient}>
          <ProjectTypeModal {...defaultProps} editingProjectType={undefined} />
        </QueryClientProvider>
      );

      // Verify form is cleared
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('');
    });

    it('clears errors when switching between modes', async () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ProjectTypeModal {...defaultProps} />
        </QueryClientProvider>
      );

      // Trigger validation error
      fireEvent.click(screen.getByRole('button', { name: /Create Project Type/i }));

      await waitFor(() => {
        expect(screen.getByText('Project type name is required')).toBeInTheDocument();
      });

      // Switch to edit mode
      rerender(
        <QueryClientProvider client={queryClient}>
          <ProjectTypeModal {...defaultProps} editingProjectType={mockProjectType} />
        </QueryClientProvider>
      );

      // Error should be cleared
      expect(screen.queryByText('Project type name is required')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form fields', () => {
      renderComponent();
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Color')).toBeInTheDocument();
    });

    it('shows asterisk for required field', () => {
      renderComponent();
      // The asterisk is now hidden from screen readers with aria-hidden
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('has proper dialog structure', () => {
      renderComponent();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('color preset buttons have descriptive aria-labels', () => {
      renderComponent();
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-label')?.includes('Select color #')
      );

      colorButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toMatch(/Select color #[0-9a-f]{6}/i);
      });
    });

    it('has aria-required on required fields', () => {
      renderComponent();
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('has color selection group with proper aria-label', () => {
      renderComponent();
      expect(screen.getByRole('group', { name: /Color selection/i })).toBeInTheDocument();
    });

    it('has aria-pressed state on color buttons', () => {
      renderComponent();
      const selectedButton = screen.getByRole('button', { name: /Select color #4f46e5/i });
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');

      const unselectedButton = screen.getByRole('button', { name: /Select color #10b981/i });
      expect(unselectedButton).toHaveAttribute('aria-pressed', 'false');
    });
  });
});

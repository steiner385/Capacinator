import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LocationModal } from '../LocationModal';
import { api } from '../../../lib/api-client';

// Mock the API client
jest.mock('../../../lib/api-client', () => ({
  api: {
    locations: {
      create: jest.fn(),
      update: jest.fn()
    }
  },
  isAuthenticated: jest.fn(() => true),
  clearAuthTokens: jest.fn(),
  saveAuthTokens: jest.fn(),
  getAccessToken: jest.fn(() => 'mock-token')
}));

describe('LocationModal', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const mockLocation = {
    id: 'location-1',
    name: 'New York City',
    description: 'NYC Office',
    created_at: '2025-01-01',
    updated_at: '2025-01-02'
  };

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(<LocationModal {...defaultProps} {...props} />);
  };

  describe('Basic Rendering', () => {
    it('renders when opened', () => {
      renderComponent();
      expect(screen.getByText('Add Location')).toBeInTheDocument();
    });

    it('shows Add Location title for new location', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: 'Add Location' })).toBeInTheDocument();
    });

    it('shows Edit Location title when editing', () => {
      renderComponent({ location: mockLocation });
      expect(screen.getByRole('heading', { name: 'Edit Location' })).toBeInTheDocument();
    });

    it('renders form fields', () => {
      renderComponent();
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });
  });

  describe('Form Initialization', () => {
    it('initializes with empty values for new location', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    it('populates form with location data when editing', () => {
      renderComponent({ location: mockLocation });
      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameInput.value).toBe('New York City');
      expect(descriptionInput.value).toBe('NYC Office');
    });

    it('handles location with empty description', () => {
      const locationWithoutDesc = { ...mockLocation, description: '' };
      renderComponent({ location: locationWithoutDesc });

      const descriptionInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('');
    });
  });

  describe('Form Interactions', () => {
    it('allows typing in name field', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);

      fireEvent.change(nameInput, { target: { value: 'London' } });
      expect(nameInput).toHaveValue('London');
    });

    it('allows typing in description field', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);

      fireEvent.change(descriptionInput, { target: { value: 'UK Office' } });
      expect(descriptionInput).toHaveValue('UK Office');
    });

    it('has name field marked as required', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      expect(nameInput).toBeRequired();
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting with whitespace-only name', async () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      const submitButton = screen.getByRole('button', { name: /Save Location/i });

      // Input whitespace-only name
      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('does not call API when validation fails', async () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      const submitButton = screen.getByRole('button', { name: /Save Location/i });

      // Input whitespace-only name
      fireEvent.change(nameInput, { target: { value: '  ' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      expect(api.locations.create).not.toHaveBeenCalled();
    });

    it('accepts form with only name filled', async () => {
      (api.locations.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      const submitButton = screen.getByRole('button', { name: /Save Location/i });

      fireEvent.change(nameInput, { target: { value: 'Remote' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.locations.create).toHaveBeenCalledWith({
          name: 'Remote',
          description: ''
        });
      });
    });
  });

  describe('Form Submission - Create Mode', () => {
    it('calls create API with correct data', async () => {
      (api.locations.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Tokyo' }
      });
      fireEvent.change(screen.getByLabelText(/Description/i), {
        target: { value: 'Japan Office' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Location/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.locations.create).toHaveBeenCalledWith({
          name: 'Tokyo',
          description: 'Japan Office'
        });
      });
    });

    it('calls onSave after successful creation', async () => {
      (api.locations.create as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Paris' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('shows saving state during submission', async () => {
      (api.locations.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Berlin' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('disables submit button during save', async () => {
      (api.locations.create as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Sydney' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Location/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Form Submission - Edit Mode', () => {
    it('calls update API with correct data', async () => {
      (api.locations.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent({ location: mockLocation });

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'New York Updated' }
      });

      const submitButton = screen.getByRole('button', { name: /Save Location/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.locations.update).toHaveBeenCalledWith('location-1', {
          name: 'New York Updated',
          description: 'NYC Office'
        });
      });
    });

    it('calls onSave after successful update', async () => {
      (api.locations.update as jest.Mock).mockResolvedValue({ data: {} });

      renderComponent({ location: mockLocation });

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'NYC' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message on API failure', async () => {
      (api.locations.create as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderComponent();

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to save location')).toBeInTheDocument();
      });
    });

    it('does not call onSave on error', async () => {
      (api.locations.create as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      // Recreate component with fresh mock to avoid race conditions
      const freshOnSave = jest.fn();
      render(<LocationModal onSave={freshOnSave} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByLabelText(/Name/i), {
        target: { value: 'Test' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save Location/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to save location')).toBeInTheDocument();
      });

      // Wait a bit to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(freshOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interactions', () => {
    it('shows Cancel button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('shows Save Location button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Save Location/i })).toBeInTheDocument();
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      renderComponent();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalled();
      }, { timeout: 300 });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form fields', () => {
      renderComponent();
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
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
  });
});

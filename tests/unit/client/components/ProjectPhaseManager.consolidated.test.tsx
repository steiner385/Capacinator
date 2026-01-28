import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectPhaseManager } from '@/components/ProjectPhaseManager';
import { api } from '@/lib/api-client';

// Mock the API
jest.mock('@/lib/api-client', () => ({
  api: {
    projectPhases: {
      list: jest.fn(),
      create: jest.fn(),
      createCustomPhase: jest.fn(),
      duplicate: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      bulkUpdate: jest.fn(),
    },
    phases: {
      list: jest.fn(),
    },
  },
  isAuthenticated: jest.fn(() => true),
  clearAuthTokens: jest.fn(),
  saveAuthTokens: jest.fn(),
  getAccessToken: jest.fn(() => 'mock-token')
}));

// Mock data
const mockPhases = [
  { id: '1', name: 'Planning', description: 'Planning phase', order_index: 1 },
  { id: '2', name: 'Design', description: 'Design phase', order_index: 2 },
  { id: '3', name: 'Development', description: 'Development phase', order_index: 3 },
  { id: '4', name: 'Testing', description: 'Testing phase', order_index: 4 },
];

const mockProjectPhases = [
  {
    id: 'pp1',
    project_id: 'proj1',
    phase_id: '1',
    phase_name: 'Planning',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    is_custom_phase: 0,
  },
  {
    id: 'pp2',
    project_id: 'proj1',
    phase_id: '2',
    phase_name: 'Design',
    start_date: '2024-02-01',
    end_date: '2024-02-29',
    is_custom_phase: 0,
  },
];

describe('ProjectPhaseManager - Consolidated Add Phase UI', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default mock implementations
    (api.projectPhases.list as jest.Mock).mockResolvedValue({
      data: { data: mockProjectPhases },
    });
    (api.phases.list as jest.Mock).mockResolvedValue({
      data: { data: mockPhases },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProjectPhaseManager projectId="proj1" projectName="Test Project" {...props} />
      </QueryClientProvider>
    );
  };

  const waitForComponentToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading project phases...')).not.toBeInTheDocument();
    });
  };

  describe('Add Phase Button', () => {
    it('should render Add Phase button instead of separate buttons', async () => {
      renderComponent();
      await waitForComponentToLoad();
      await waitForComponentToLoad();
      
      await waitFor(() => {
        // Should have Add Phase button
        const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
        expect(addPhaseButton).toBeInTheDocument();
        
        // Should NOT have old buttons
        expect(screen.queryByRole('button', { name: /create custom phase/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /duplicate phase/i })).not.toBeInTheDocument();
      });
    });

    it('should open modal when Add Phase button is clicked', async () => {
      renderComponent();
      await waitForComponentToLoad();
      await waitForComponentToLoad();
      
      await waitFor(() => {
        const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
        expect(addPhaseButton).toBeInTheDocument();
      });
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Add Phase' })).toBeInTheDocument();
    });
  });

  describe('Add Phase Modal - Options', () => {
    it('should show three options in the modal', async () => {
      renderComponent();
      await waitForComponentToLoad();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Should have three options
      expect(screen.getByText('Add Missing Phase')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Existing Phase')).toBeInTheDocument();
      expect(screen.getByText('Create Custom Phase')).toBeInTheDocument();
    });

    it('should have "Add Missing Phase" selected by default', async () => {
      renderComponent();
      await waitForComponentToLoad();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Check the selection card has data-selected="true"
      const addMissingCard = screen.getByText('Add Missing Phase').closest('.selection-card');
      expect(addMissingCard).not.toBeNull();
      expect(addMissingCard!).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Add Missing Phase Mode', () => {
    it('should show phase selector for missing phases', async () => {
      renderComponent();
      await waitForComponentToLoad();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Should show phase selector
      expect(screen.getByLabelText('Select Phase *')).toBeInTheDocument();
      
      // Should filter out already added phases
      const phaseSelect = screen.getByLabelText('Select Phase *');
      const options = within(phaseSelect).getAllByRole('option');
      
      // mockPhases has 4 phases, mockProjectPhases has 2, so should show 2 missing + placeholder
      expect(options).toHaveLength(3); // placeholder + 2 missing phases
    });

    it('should show date fields when phase is selected', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      const phaseSelect = screen.getByLabelText('Select Phase *');
      await user.selectOptions(phaseSelect, '3'); // Development
      
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
  });

  describe('Duplicate Existing Phase Mode', () => {
    it('should show duplicate phase form when selected', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select duplicate mode
      const duplicateCard = screen.getByText('Duplicate Existing Phase').closest('.selection-card');
      expect(duplicateCard).not.toBeNull();
      await user.click(duplicateCard!);
      
      // Should show source phase selector
      expect(screen.getByLabelText('Select Phase to Duplicate *')).toBeInTheDocument();
      expect(screen.getByText('Select a phase to duplicate')).toBeInTheDocument();
    });

    it('should show placement options when source phase is selected', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select duplicate mode
      const duplicateCard = screen.getByText('Duplicate Existing Phase').closest('.selection-card');
      expect(duplicateCard).not.toBeNull();
      await user.click(duplicateCard!);
      
      // Select a phase to duplicate
      const sourcePhaseSelect = screen.getByLabelText('Select Phase to Duplicate *');
      await user.selectOptions(sourcePhaseSelect, '1'); // phase_id, not project_phase id
      
      // Should show placement options
      expect(screen.getByText('Placement')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('should show name field with default copy name when phase selected', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select duplicate mode
      const duplicateCard = screen.getByText('Duplicate Existing Phase').closest('.selection-card');
      expect(duplicateCard).not.toBeNull();
      await user.click(duplicateCard!);
      
      // Select a phase to duplicate
      const sourcePhaseSelect = screen.getByLabelText('Select Phase to Duplicate *');
      await user.selectOptions(sourcePhaseSelect, '1');
      
      // Should show name field with default copy name
      await waitFor(() => {
        const nameField = screen.getByDisplayValue('Planning (Copy)');
        expect(nameField).toBeInTheDocument();
      });
    });
  });

  describe('Create Custom Phase Mode', () => {
    it('should show custom phase form when selected', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      const customCard = screen.getByText('Create Custom Phase').closest('.selection-card');
      expect(customCard).not.toBeNull();
      await user.click(customCard!);
      
      // Should show custom phase fields
      expect(screen.getByLabelText('Phase Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date *')).toBeInTheDocument();
      expect(screen.getByLabelText('End Date *')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should create missing phase correctly', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select a missing phase
      const phaseSelect = screen.getByLabelText('Select Phase *');
      await user.selectOptions(phaseSelect, '3'); // Development
      
      // Fill dates
      const startDate = screen.getByLabelText(/start date/i);
      const endDate = screen.getByLabelText(/end date/i);
      await user.type(startDate, '2024-03-01');
      await user.type(endDate, '2024-03-31');
      
      // Submit
      (api.projectPhases.create as jest.Mock).mockResolvedValue({ data: { success: true } });
      
      // Submit button is in the modal footer
      const modalFooter = screen.getByRole('dialog').querySelector('.modal-footer') as HTMLElement;
      const submitButton = within(modalFooter).getByRole('button', { name: /add phase/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(api.projectPhases.create).toHaveBeenCalledWith({
          project_id: 'proj1',
          phase_id: '3',
          start_date: '2024-03-01',
          end_date: '2024-03-31',
        });
      });
    });

    it('should duplicate phase correctly', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select duplicate mode
      const duplicateCard = screen.getByText('Duplicate Existing Phase').closest('.selection-card');
      expect(duplicateCard).not.toBeNull();
      await user.click(duplicateCard!);
      
      // Select source phase
      const sourcePhaseSelect = screen.getByLabelText('Select Phase to Duplicate *');
      await user.selectOptions(sourcePhaseSelect, '1');
      
      // Update name
      const nameField = screen.getByDisplayValue('Planning (Copy)');
      await user.clear(nameField);
      await user.type(nameField, 'Planning - Sprint 2');
      
      // Select custom dates placement
      const customDatesCard = screen.getByText('Custom dates').closest('.selection-card-inline');
      expect(customDatesCard).not.toBeNull();
      await user.click(customDatesCard!);
      
      // Fill dates (use name attribute since label might not be properly associated)
      const startDate = screen.getByRole('dialog').querySelector('input[name="start_date"]') as HTMLInputElement;
      const endDate = screen.getByRole('dialog').querySelector('input[name="end_date"]') as HTMLInputElement;
      await user.type(startDate, '2024-03-01');
      await user.type(endDate, '2024-03-31');
      
      // Submit
      (api.projectPhases.createCustomPhase as jest.Mock).mockResolvedValue({ data: { success: true } });
      
      // Submit button is in the modal footer
      const modalFooter = screen.getByRole('dialog').querySelector('.modal-footer') as HTMLElement;
      const submitButton = within(modalFooter).getByRole('button', { name: /duplicate phase/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(api.projectPhases.createCustomPhase).toHaveBeenCalledWith({
          project_id: 'proj1',
          phase_name: 'Planning - Sprint 2',
          description: 'Duplicated from Planning',
          start_date: '2024-03-01',
          end_date: '2024-03-31',
          order_index: 99
        });
      });
    });

    it('should create custom phase correctly', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Select custom mode
      const customCard = screen.getByText('Create Custom Phase').closest('.selection-card');
      expect(customCard).not.toBeNull();
      await user.click(customCard!);
      
      // Fill form
      const phaseName = screen.getByPlaceholderText('e.g., Additional Testing Round');
      await user.type(phaseName, 'Custom Sprint');
      
      const startDate = screen.getByLabelText(/start date/i);
      const endDate = screen.getByLabelText(/end date/i);
      await user.type(startDate, '2024-04-01');
      await user.type(endDate, '2024-04-30');
      
      // Submit
      (api.projectPhases.createCustomPhase as jest.Mock).mockResolvedValue({ data: { success: true } });
      
      const submitButton = screen.getByText('Create Phase');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(api.projectPhases.createCustomPhase).toHaveBeenCalledWith({
          project_id: 'proj1',
          phase_name: 'Custom Sprint',
          description: '',
          start_date: '2024-04-01',
          end_date: '2024-04-30',
          order_index: expect.any(Number)
        });
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when canceled', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Modal should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should reset to default mode when reopened', async () => {
      renderComponent();
      await waitForComponentToLoad();
      
      const addPhaseButton = screen.getByRole('button', { name: /add phase/i });
      await user.click(addPhaseButton);
      
      // Change to custom mode
      const customCard = screen.getByText('Create Custom Phase').closest('.selection-card');
      expect(customCard).not.toBeNull();
      await user.click(customCard!);
      expect(customCard!).toHaveAttribute('data-selected', 'true');
      
      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Reopen modal
      await user.click(addPhaseButton);
      
      // Should be back to default mode
      const addMissingCard = screen.getByText('Add Missing Phase').closest('.selection-card');
      expect(addMissingCard).not.toBeNull();
      expect(addMissingCard!).toHaveAttribute('data-selected', 'true');
    });
  });
});
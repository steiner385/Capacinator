import { describe, test, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VisualPhaseManager from '../../../../client/src/components/VisualPhaseManager';
import { api } from '../../../../client/src/lib/api-client';

// Mock the API client
jest.mock('../../../../client/src/lib/api-client', () => ({
  api: {
    projectPhases: {
      list: jest.fn(),
      update: jest.fn(),
    },
    projectPhaseDependencies: {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      calculateCascade: jest.fn(),
    },
    phases: {
      list: jest.fn(),
    },
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Mock InteractiveTimeline component
jest.mock('../../../../client/src/components/InteractiveTimeline', () => {
  return function MockInteractiveTimeline({ items, onItemMove, onItemResize }: any) {
    return (
      <div data-testid="interactive-timeline">
        {items.map((item: any) => (
          <div key={item.id} data-testid={`timeline-item-${item.id}`}>
            <span>{item.name}</span>
            <button
              onClick={() => onItemMove(item.id, new Date('2024-02-01'), new Date('2024-02-28'))}
              data-testid={`move-${item.id}`}
            >
              Move
            </button>
            <button
              onClick={() => onItemResize(item.id, new Date('2024-01-01'), new Date('2024-03-01'))}
              data-testid={`resize-${item.id}`}
            >
              Resize
            </button>
          </div>
        ))}
      </div>
    );
  };
});

describe('VisualPhaseManager - Dependencies', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <VisualPhaseManager projectId="test-project-1" projectName="Test Project" {...props} />
      </QueryClientProvider>
    );
  };

  const mockProjectPhases = [
    {
      id: 'phase-timeline-1',
      project_id: 'test-project-1',
      phase_id: 'phase-1',
      phase_name: 'Analysis',
      start_date: new Date('2024-01-01').getTime(),
      end_date: new Date('2024-01-31').getTime(),
    },
    {
      id: 'phase-timeline-2',
      project_id: 'test-project-1',
      phase_id: 'phase-2',
      phase_name: 'Development',
      start_date: new Date('2024-02-01').getTime(),
      end_date: new Date('2024-03-31').getTime(),
    },
  ];

  const mockDependencies = [
    {
      id: 'dep-1',
      project_id: 'test-project-1',
      predecessor_phase_timeline_id: 'phase-timeline-1',
      successor_phase_timeline_id: 'phase-timeline-2',
      dependency_type: 'FS',
      lag_days: 0,
      predecessor_phase_name: 'Analysis',
      successor_phase_name: 'Development',
    },
  ];

  describe('dependency loading and display', () => {
    it('should load and display project phases with dependencies', async () => {
      mockApi.projectPhases.list.mockResolvedValue({
        data: { data: mockProjectPhases },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: mockDependencies },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('interactive-timeline')).toBeInTheDocument();
      });

      expect(mockApi.projectPhases.list).toHaveBeenCalledWith({
        project_id: 'test-project-1',
      });
      expect(mockApi.projectPhaseDependencies.list).toHaveBeenCalledWith({
        project_id: 'test-project-1',
      });
    });

    it('should display dependency information in timeline', async () => {
      mockApi.projectPhases.list.mockResolvedValue({
        data: { data: mockProjectPhases },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: mockDependencies },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Analysis')).toBeInTheDocument();
        expect(screen.getByText('Development')).toBeInTheDocument();
      });
    });
  });

  describe('cascade calculation', () => {
    beforeEach(() => {
      mockApi.projectPhases.list.mockResolvedValue({
        data: { data: mockProjectPhases },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: mockDependencies },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
    });

    it('should calculate cascade when moving a phase', async () => {
      const cascadeResult = {
        affectedPhases: [
          {
            phaseId: 'phase-timeline-2',
            newStartDate: new Date('2024-03-01'),
            newEndDate: new Date('2024-04-30'),
          },
        ],
        conflicts: [],
      };

      mockApi.projectPhaseDependencies.calculateCascade.mockResolvedValue({
        data: { data: cascadeResult },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhases.update.mockResolvedValue({
        data: { data: mockProjectPhases[0] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('move-phase-timeline-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-phase-timeline-1'));

      await waitFor(() => {
        expect(mockApi.projectPhaseDependencies.calculateCascade).toHaveBeenCalledWith({
          project_id: 'test-project-1',
          phase_timeline_id: 'phase-timeline-1',
          new_start_date: '2024-02-01T00:00:00.000Z',
          new_end_date: '2024-02-28T00:00:00.000Z',
        });
      });
    });

    it('should handle cascade conflicts', async () => {
      const cascadeResult = {
        affectedPhases: [
          {
            phaseId: 'phase-timeline-2',
            newStartDate: new Date('2024-03-01'),
            newEndDate: new Date('2024-04-30'),
          },
        ],
        conflicts: [
          {
            type: 'resource_conflict',
            phaseId: 'phase-timeline-2',
            message: 'Resource not available during new dates',
          },
        ],
      };

      mockApi.projectPhaseDependencies.calculateCascade.mockResolvedValue({
        data: { data: cascadeResult },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('move-phase-timeline-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-phase-timeline-1'));

      await waitFor(() => {
        // Should show conflict warning or dialog
        expect(screen.getByText(/conflict/i)).toBeInTheDocument();
      });
    });

    it('should apply cascade changes when confirmed', async () => {
      const cascadeResult = {
        affectedPhases: [
          {
            phaseId: 'phase-timeline-2',
            newStartDate: new Date('2024-03-01'),
            newEndDate: new Date('2024-04-30'),
          },
        ],
        conflicts: [],
      };

      mockApi.projectPhaseDependencies.calculateCascade.mockResolvedValue({
        data: { data: cascadeResult },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhases.update.mockResolvedValue({
        data: { data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('move-phase-timeline-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-phase-timeline-1'));

      await waitFor(() => {
        // Should apply cascade changes
        expect(mockApi.projectPhases.update).toHaveBeenCalledWith(
          'phase-timeline-2',
          {
            start_date: new Date('2024-03-01').getTime(),
            end_date: new Date('2024-04-30').getTime(),
          }
        );
      });
    });
  });

  describe('dependency management', () => {
    beforeEach(() => {
      mockApi.projectPhases.list.mockResolvedValue({
        data: { data: mockProjectPhases },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: mockDependencies },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
    });

    it('should create new dependency', async () => {
      mockApi.projectPhaseDependencies.create.mockResolvedValue({
        data: { data: { id: 'new-dep' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('interactive-timeline')).toBeInTheDocument();
      });

      // Simulate creating a dependency through UI
      const createDependencyButton = screen.getByTestId('create-dependency');
      fireEvent.click(createDependencyButton);

      await waitFor(() => {
        expect(mockApi.projectPhaseDependencies.create).toHaveBeenCalledWith({
          project_id: 'test-project-1',
          predecessor_phase_timeline_id: expect.any(String),
          successor_phase_timeline_id: expect.any(String),
          dependency_type: 'FS',
          lag_days: 0,
        });
      });
    });

    it('should update existing dependency', async () => {
      mockApi.projectPhaseDependencies.update.mockResolvedValue({
        data: { data: { ...mockDependencies[0], dependency_type: 'SS' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('interactive-timeline')).toBeInTheDocument();
      });

      // Simulate updating a dependency
      const updateDependencyButton = screen.getByTestId('update-dependency-dep-1');
      fireEvent.click(updateDependencyButton);

      await waitFor(() => {
        expect(mockApi.projectPhaseDependencies.update).toHaveBeenCalledWith(
          'dep-1',
          expect.objectContaining({
            dependency_type: 'SS',
          })
        );
      });
    });

    it('should delete dependency', async () => {
      mockApi.projectPhaseDependencies.delete.mockResolvedValue({
        data: { message: 'Dependency deleted successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('interactive-timeline')).toBeInTheDocument();
      });

      // Simulate deleting a dependency
      const deleteDependencyButton = screen.getByTestId('delete-dependency-dep-1');
      fireEvent.click(deleteDependencyButton);

      await waitFor(() => {
        expect(mockApi.projectPhaseDependencies.delete).toHaveBeenCalledWith('dep-1');
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.projectPhases.list.mockRejectedValue(new Error('API Error'));
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should handle cascade calculation errors', async () => {
      mockApi.projectPhases.list.mockResolvedValue({
        data: { data: mockProjectPhases },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.list.mockResolvedValue({
        data: { data: mockDependencies },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.phases.list.mockResolvedValue({
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      } as any);
      mockApi.projectPhaseDependencies.calculateCascade.mockRejectedValue(
        new Error('Cascade calculation failed')
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('move-phase-timeline-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('move-phase-timeline-1'));

      await waitFor(() => {
        expect(screen.getByText(/calculation failed/i)).toBeInTheDocument();
      });
    });
  });
});
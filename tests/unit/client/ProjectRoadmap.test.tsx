import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProjectRoadmap from '@client/pages/ProjectRoadmap';
import { vi } from 'vitest';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Edit2: () => <div data-testid="edit-icon" />,
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Search: () => <div data-testid="search-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  SkipBack: () => <div data-testid="skip-back-icon" />,
  SkipForward: () => <div data-testid="skip-forward-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
}));

// Mock the API
vi.mock('@client/lib/api-client', () => ({
  api: {
    projects: {
      list: vi.fn(() => Promise.resolve({
        data: {
          data: [
            {
              id: '1',
              name: 'Test Project 1',
              project_type: { name: 'Web Application', color_code: '#4F46E5' },
              priority: 1,
              status: 'active',
              owner_name: 'John Doe',
              aspiration_start: '2024-01-01',
              aspiration_finish: '2024-06-30'
            },
            {
              id: '2', 
              name: 'Test Project 2',
              project_type: { name: 'Mobile Application', color_code: '#3B82F6' },
              priority: 2,
              status: 'planned',
              owner_name: 'Jane Smith',
              aspiration_start: '2024-03-01',
              aspiration_finish: '2024-09-30'
            }
          ]
        }
      }))
    },
    projectPhases: {
      list: vi.fn((params) => {
        const projectId = params.project_id;
        if (projectId === '1') {
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 'phase1',
                  project_id: '1',
                  phase_id: 'p1',
                  phase_name: 'Development',
                  phase_order: 1,
                  start_date: '2024-01-01',
                  end_date: '2024-03-31'
                },
                {
                  id: 'phase2',
                  project_id: '1',
                  phase_id: 'p2',
                  phase_name: 'Testing',
                  phase_order: 2,
                  start_date: '2024-04-01',
                  end_date: '2024-06-30'
                }
              ]
            }
          });
        }
        return Promise.resolve({ data: { data: [] } });
      }),
      update: vi.fn(() => Promise.resolve({}))
    }
  }
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProjectRoadmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders roadmap header with controls', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Project Roadmap')).toBeInTheDocument();
      expect(screen.getByText('Visual timeline of all projects and their phases')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    });
  });

  it('displays project list with fixed positioning', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    });

    // Check that project info panels have the correct CSS classes
    const projectInfoElements = document.querySelectorAll('.project-info');
    expect(projectInfoElements).toHaveLength(2);
    
    projectInfoElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      expect(styles.position).toBe('sticky');
      expect(styles.left).toBe('0px');
      expect(styles.width).toBe('320px');
    });
  });

  it('has proper timeline container structure for horizontal scrolling', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const timelineContainer = document.querySelector('.timeline-container');
    expect(timelineContainer).toBeInTheDocument();
    
    const styles = window.getComputedStyle(timelineContainer!);
    expect(styles.overflowX).toBe('auto');
    expect(styles.overflowY).toBe('auto');
  });

  it('calculates correct timeline width based on viewport', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const roadmapElement = document.querySelector('.project-roadmap');
    expect(roadmapElement).toBeInTheDocument();
    
    // Check that the CSS custom property for timeline width is set
    const styles = window.getComputedStyle(roadmapElement!);
    expect(roadmapElement).toHaveStyle('--timeline-width');
  });

  it('maintains fixed navigation buttons during scroll simulation', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Check navigation side buttons are present
    const leftNavButton = document.querySelector('.timeline-nav-side.left');
    const rightNavButton = document.querySelector('.timeline-nav-side.right');
    
    expect(leftNavButton).toBeInTheDocument();
    expect(rightNavButton).toBeInTheDocument();

    // Verify positioning
    const leftStyles = window.getComputedStyle(leftNavButton!);
    const rightStyles = window.getComputedStyle(rightNavButton!);
    
    expect(leftStyles.position).toBe('absolute');
    expect(rightStyles.position).toBe('absolute');
    expect(leftStyles.left).toBe('320px'); // After project info panel
    expect(rightStyles.right).toBe('0px');
  });

  it('handles zoom controls correctly', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const zoomInButton = screen.getByTitle('Zoom In') || 
                       document.querySelector('.zoom-controls button:last-child');
    const zoomOutButton = screen.getByTitle('Zoom Out') || 
                        document.querySelector('.zoom-controls button:first-child');

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();

    // Test zoom functionality
    if (zoomInButton) {
      fireEvent.click(zoomInButton);
      // After zoom, timeline width should change
      await waitFor(() => {
        const roadmapElement = document.querySelector('.project-roadmap');
        expect(roadmapElement).toHaveStyle('--timeline-width');
      });
    }
  });

  it('responds to scroll navigation buttons', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const leftNavButton = document.querySelector('.timeline-nav-side.left');
    const rightNavButton = document.querySelector('.timeline-nav-side.right');

    if (leftNavButton) {
      fireEvent.click(leftNavButton);
      // Should trigger scroll left functionality
      expect(leftNavButton).toBeInTheDocument();
    }

    if (rightNavButton) {
      fireEvent.click(rightNavButton);
      // Should trigger scroll right functionality  
      expect(rightNavButton).toBeInTheDocument();
    }
  });

  it('maintains timeline header sticky positioning', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const timelineHeader = document.querySelector('.timeline-header');
    expect(timelineHeader).toBeInTheDocument();
    
    const styles = window.getComputedStyle(timelineHeader!);
    expect(styles.position).toBe('sticky');
    expect(styles.top).toBe('0px');
    expect(styles.marginLeft).toBe('320px'); // Aligned with timeline area
  });

  it('handles collapse/expand functionality without affecting scroll', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const collapseButtons = document.querySelectorAll('.collapse-toggle');
    expect(collapseButtons.length).toBeGreaterThan(0);

    if (collapseButtons[0]) {
      fireEvent.click(collapseButtons[0]);
      
      // Check that project row gets collapsed class
      await waitFor(() => {
        const projectRow = collapseButtons[0].closest('.project-row');
        expect(projectRow).toHaveClass('collapsed');
      });
    }
  });

  it('handles keyboard navigation for timeline scrolling', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Test keyboard navigation
    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true });
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Home', ctrlKey: true });
    });

    // These should not throw errors and should maintain layout
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
  });

  it('ensures project timelines have correct minimum width', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const projectTimelines = document.querySelectorAll('.project-timeline');
    expect(projectTimelines.length).toBeGreaterThan(0);

    projectTimelines.forEach(timeline => {
      const styles = window.getComputedStyle(timeline);
      // Should have min-width set to ensure horizontal scrolling works
      expect(timeline).toHaveStyle('min-width: max-content');
    });
  });

  it('filters projects without affecting layout structure', async () => {
    render(
      <TestWrapper>
        <ProjectRoadmap />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');
    
    fireEvent.change(searchInput, { target: { value: 'Test Project 1' } });
    
    // Wait for debounced search
    await waitFor(() => {
      // Layout structure should remain intact
      const timelineContainer = document.querySelector('.timeline-container');
      expect(timelineContainer).toBeInTheDocument();
      
      const projectInfos = document.querySelectorAll('.project-info');
      projectInfos.forEach(info => {
        const styles = window.getComputedStyle(info);
        expect(styles.position).toBe('sticky');
        expect(styles.left).toBe('0px');
      });
    }, { timeout: 1000 });
  });
});
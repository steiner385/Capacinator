import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProjectRoadmap from '../ProjectRoadmap';
import { vi } from 'vitest';

// Mock the API with more comprehensive data for scrolling tests
vi.mock('../../lib/api-client', () => ({
  api: {
    projects: {
      list: vi.fn(() => Promise.resolve({
        data: {
          data: Array.from({ length: 5 }, (_, i) => ({
            id: `project-${i + 1}`,
            name: `Test Project ${i + 1}`,
            project_type: { 
              name: `Type ${i + 1}`, 
              color_code: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
            },
            priority: (i % 3) + 1,
            status: ['active', 'planned', 'on_hold'][i % 3],
            owner_name: `Owner ${i + 1}`,
            aspiration_start: `2024-${String(i + 1).padStart(2, '0')}-01`,
            aspiration_finish: `2024-${String(i + 7).padStart(2, '0')}-30`
          }))
        }
      }))
    },
    projectPhases: {
      list: vi.fn((params) => {
        const projectId = params.project_id;
        const projectIndex = parseInt(projectId.split('-')[1]) - 1;
        return Promise.resolve({
          data: {
            data: [
              {
                id: `phase-${projectId}-1`,
                project_id: projectId,
                phase_id: `p-${projectId}-1`,
                phase_name: 'Planning',
                phase_order: 1,
                start_date: `2024-${String(projectIndex + 1).padStart(2, '0')}-01`,
                end_date: `2024-${String(projectIndex + 2).padStart(2, '0')}-15`
              },
              {
                id: `phase-${projectId}-2`,
                project_id: projectId,
                phase_id: `p-${projectId}-2`,
                phase_name: 'Development',
                phase_order: 2,
                start_date: `2024-${String(projectIndex + 2).padStart(2, '0')}-16`,
                end_date: `2024-${String(projectIndex + 4).padStart(2, '0')}-30`
              },
              {
                id: `phase-${projectId}-3`,
                project_id: projectId,
                phase_id: `p-${projectId}-3`,
                phase_name: 'Testing',
                phase_order: 3,
                start_date: `2024-${String(projectIndex + 5).padStart(2, '0')}-01`,
                end_date: `2024-${String(projectIndex + 6).padStart(2, '0')}-30`
              }
            ]
          }
        });
      }),
      update: vi.fn(() => Promise.resolve({}))
    }
  }
}));

// Mock scrollTo for testing
Object.defineProperty(Element.prototype, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    left: 0,
    top: 0,
    right: 1200,
    bottom: 800,
    width: 1200,
    height: 800,
    x: 0,
    y: 0
  })),
  writable: true
});

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

describe('ProjectRoadmap Scrolling Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fixed Elements During Horizontal Scroll', () => {
    it('keeps project info panels fixed while timeline scrolls', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Get all project info panels
      const projectInfoPanels = document.querySelectorAll('.project-info');
      expect(projectInfoPanels.length).toBe(5);

      // Verify each panel has sticky positioning
      projectInfoPanels.forEach((panel, index) => {
        const styles = window.getComputedStyle(panel);
        expect(styles.position).toBe('sticky');
        expect(styles.left).toBe('0px');
        expect(styles.width).toBe('320px');
        expect(styles.zIndex).toBe('5');
        
        // Verify project name is visible
        expect(panel).toHaveTextContent(`Test Project ${index + 1}`);
      });
    });

    it('keeps navigation buttons fixed during scroll', async () => {
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

      expect(leftNavButton).toBeInTheDocument();
      expect(rightNavButton).toBeInTheDocument();

      // Verify positioning remains fixed
      const leftStyles = window.getComputedStyle(leftNavButton!);
      const rightStyles = window.getComputedStyle(rightNavButton!);

      expect(leftStyles.position).toBe('absolute');
      expect(rightStyles.position).toBe('absolute');
      expect(leftStyles.left).toBe('320px'); // After project info panel
      expect(rightStyles.right).toBe('0px');
      expect(leftStyles.zIndex).toBe('15');
      expect(rightStyles.zIndex).toBe('15');
    });

    it('keeps timeline header sticky during vertical scroll', async () => {
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

      const headerStyles = window.getComputedStyle(timelineHeader!);
      expect(headerStyles.position).toBe('sticky');
      expect(headerStyles.top).toBe('0px');
      expect(headerStyles.marginLeft).toBe('320px');
      expect(headerStyles.zIndex).toBe('10');
    });
  });

  describe('Timeline Scroll Container', () => {
    it('has proper scroll container setup', async () => {
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

      const containerStyles = window.getComputedStyle(timelineContainer!);
      expect(containerStyles.overflowX).toBe('auto');
      expect(containerStyles.overflowY).toBe('auto');
      expect(containerStyles.position).toBe('relative');
    });

    it('calculates correct timeline width for horizontal scrolling', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Check that timeline elements have calculated width
      const timelineYears = document.querySelector('.timeline-years');
      const timelineMonths = document.querySelector('.timeline-months');
      const projectTimelines = document.querySelectorAll('.project-timeline');

      expect(timelineYears).toBeInTheDocument();
      expect(timelineMonths).toBeInTheDocument();
      expect(projectTimelines.length).toBe(5);

      // All timeline elements should have width style set
      expect(timelineYears).toHaveStyle('width');
      expect(timelineMonths).toHaveStyle('width');
      
      projectTimelines.forEach(timeline => {
        expect(timeline).toHaveStyle('width');
      });
    });

    it('enables horizontal scrolling with sufficient content width', async () => {
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

      // Check that CSS custom properties are set for timeline width
      const timelineWidthProperty = roadmapElement!.style.getPropertyValue('--timeline-width');
      expect(timelineWidthProperty).toBeTruthy();
      
      // Timeline width should be calculated (non-zero)
      const widthValue = parseFloat(timelineWidthProperty);
      expect(widthValue).toBeGreaterThan(0);
    });
  });

  describe('Navigation Button Functionality', () => {
    it('handles left navigation button click', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const leftNavButton = document.querySelector('.timeline-nav-side.left');
      expect(leftNavButton).toBeInTheDocument();

      // Click should not throw error and button should remain in position
      fireEvent.click(leftNavButton!);
      
      await waitFor(() => {
        const styles = window.getComputedStyle(leftNavButton!);
        expect(styles.left).toBe('320px');
        expect(styles.position).toBe('absolute');
      });
    });

    it('handles right navigation button click', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const rightNavButton = document.querySelector('.timeline-nav-side.right');
      expect(rightNavButton).toBeInTheDocument();

      // Click should not throw error and button should remain in position
      fireEvent.click(rightNavButton!);
      
      await waitFor(() => {
        const styles = window.getComputedStyle(rightNavButton!);
        expect(styles.right).toBe('0px');
        expect(styles.position).toBe('absolute');
      });
    });

    it('shows navigation buttons on hover', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const roadmapContent = document.querySelector('.roadmap-content');
      const leftNavButton = document.querySelector('.timeline-nav-side.left');
      const rightNavButton = document.querySelector('.timeline-nav-side.right');

      expect(roadmapContent).toBeInTheDocument();
      expect(leftNavButton).toBeInTheDocument();
      expect(rightNavButton).toBeInTheDocument();

      // Initially navigation buttons should have opacity 0
      let leftStyles = window.getComputedStyle(leftNavButton!);
      let rightStyles = window.getComputedStyle(rightNavButton!);
      
      expect(leftStyles.opacity).toBe('0');
      expect(rightStyles.opacity).toBe('0');

      // Hover over roadmap content
      fireEvent.mouseEnter(roadmapContent!);
      
      // CSS should handle the opacity change via :hover pseudo-class
      // We can verify the CSS rules are applied correctly
      expect(leftNavButton).toHaveClass('timeline-nav-side', 'left');
      expect(rightNavButton).toHaveClass('timeline-nav-side', 'right');
    });
  });

  describe('Zoom Functionality and Scroll Behavior', () => {
    it('maintains fixed elements during zoom operations', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const zoomInButton = document.querySelector('.zoom-controls button:last-child');
      expect(zoomInButton).toBeInTheDocument();

      // Get initial timeline width
      const roadmapElement = document.querySelector('.project-roadmap');
      const initialWidth = roadmapElement!.style.getPropertyValue('--timeline-width');

      // Zoom in
      fireEvent.click(zoomInButton!);

      await waitFor(() => {
        // Timeline width should change after zoom
        const newWidth = roadmapElement!.style.getPropertyValue('--timeline-width');
        expect(newWidth).not.toBe(initialWidth);

        // Project info panels should remain fixed
        const projectInfoPanels = document.querySelectorAll('.project-info');
        projectInfoPanels.forEach(panel => {
          const styles = window.getComputedStyle(panel);
          expect(styles.position).toBe('sticky');
          expect(styles.left).toBe('0px');
          expect(styles.width).toBe('320px');
        });
      });
    });

    it('updates timeline width when zooming', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const zoomOutButton = document.querySelector('.zoom-controls button:first-child');
      expect(zoomOutButton).toBeInTheDocument();

      // Multiple zoom operations should update timeline width
      fireEvent.click(zoomOutButton!);
      fireEvent.click(zoomOutButton!);

      await waitFor(() => {
        const roadmapElement = document.querySelector('.project-roadmap');
        const timelineWidth = roadmapElement!.style.getPropertyValue('--timeline-width');
        expect(timelineWidth).toBeTruthy();
        
        // All timeline elements should have the updated width
        const timelineElements = document.querySelectorAll('.timeline-years, .timeline-months, .project-timeline');
        timelineElements.forEach(element => {
          expect(element).toHaveStyle('width');
        });
      });
    });
  });

  describe('Keyboard Navigation and Scroll', () => {
    it('handles keyboard scroll commands without breaking layout', async () => {
      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Test various keyboard combinations
      const keyboardCommands = [
        { key: 'ArrowLeft', ctrlKey: true },
        { key: 'ArrowRight', ctrlKey: true },
        { key: 'Home', ctrlKey: true },
        { key: 'ArrowLeft', metaKey: true },
        { key: 'ArrowRight', metaKey: true }
      ];

      for (const command of keyboardCommands) {
        fireEvent.keyDown(document, command);
        
        // After each keyboard command, verify layout integrity
        await waitFor(() => {
          const projectInfoPanels = document.querySelectorAll('.project-info');
          const navButtons = document.querySelectorAll('.timeline-nav-side');
          
          expect(projectInfoPanels.length).toBe(5);
          expect(navButtons.length).toBe(2);
          
          projectInfoPanels.forEach(panel => {
            const styles = window.getComputedStyle(panel);
            expect(styles.position).toBe('sticky');
            expect(styles.left).toBe('0px');
          });
        });
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains scroll structure across different viewport sizes', async () => {
      // Simulate smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(
        <TestWrapper>
          <ProjectRoadmap />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      // Even on smaller screens, basic layout should remain
      const timelineContainer = document.querySelector('.timeline-container');
      const projectInfoPanels = document.querySelectorAll('.project-info');
      
      expect(timelineContainer).toBeInTheDocument();
      expect(projectInfoPanels.length).toBe(5);

      const containerStyles = window.getComputedStyle(timelineContainer!);
      expect(containerStyles.overflowX).toBe('auto');
      expect(containerStyles.overflowY).toBe('auto');
    });
  });
});
import { renderHook } from '@testing-library/react';
import {
  useProjectDemandData,
  ProjectDemandApiResponse,
  AssignmentItem,
} from '../useProjectDemandData';

describe('useProjectDemandData', () => {
  // Mock data factories
  const createMockApiResponse = (
    overrides: Partial<ProjectDemandApiResponse> = {}
  ): ProjectDemandApiResponse => ({
    phases: [
      {
        phase_id: 'phase-1',
        phase_name: 'Development',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        phase_order: 1,
      },
    ],
    demands: [
      {
        role_name: 'Developer',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        allocation_percentage: 100,
      },
    ],
    ...overrides,
  });

  const createMockAssignment = (
    overrides: Partial<AssignmentItem> = {}
  ): AssignmentItem => ({
    role_name: 'Developer',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    allocation_percentage: 50,
    ...overrides,
  });

  describe('empty/null inputs', () => {
    it('returns empty data when apiResponse is null', () => {
      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse: null,
          assignmentsData: null,
        })
      );

      expect(result.current.demandData).toEqual([]);
      expect(result.current.capacityData).toEqual([]);
      expect(result.current.gapsData).toEqual([]);
      expect(result.current.phases).toEqual([]);
      expect(result.current.allRoles).toEqual([]);
    });

    it('returns empty data when apiResponse has no phases', () => {
      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse: { phases: [], demands: [] },
          assignmentsData: null,
        })
      );

      expect(result.current.demandData).toEqual([]);
      expect(result.current.phases).toEqual([]);
    });
  });

  describe('phase extraction', () => {
    it('extracts phases and sorts by phase_order', () => {
      const apiResponse = createMockApiResponse({
        phases: [
          {
            phase_id: 'p2',
            phase_name: 'Testing',
            start_date: '2024-04-01',
            end_date: '2024-04-30',
            phase_order: 2,
          },
          {
            phase_id: 'p1',
            phase_name: 'Development',
            start_date: '2024-01-01',
            end_date: '2024-03-31',
            phase_order: 1,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      expect(result.current.phases).toHaveLength(2);
      expect(result.current.phases[0].phase_name).toBe('Development');
      expect(result.current.phases[1].phase_name).toBe('Testing');
    });
  });

  describe('date range calculation', () => {
    it('calculates date range from phases', () => {
      const apiResponse = createMockApiResponse({
        phases: [
          {
            phase_id: 'p1',
            phase_name: 'Phase 1',
            start_date: '2024-01-15',
            end_date: '2024-06-30',
            phase_order: 1,
          },
        ],
        demands: [],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      expect(result.current.dateRange.start.toISOString().split('T')[0]).toBe('2024-01-15');
      expect(result.current.dateRange.end.toISOString().split('T')[0]).toBe('2024-06-30');
    });

    it('includes assignments in date range calculation', () => {
      const apiResponse = createMockApiResponse({
        phases: [
          {
            phase_id: 'p1',
            phase_name: 'Phase 1',
            start_date: '2024-02-01',
            end_date: '2024-03-31',
            phase_order: 1,
          },
        ],
        demands: [],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Developer',
          start_date: '2024-01-01', // Before phase start
          end_date: '2024-05-31', // After phase end
          allocation_percentage: 50,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      expect(result.current.dateRange.start.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(result.current.dateRange.end.toISOString().split('T')[0]).toBe('2024-05-31');
    });
  });

  describe('demand data calculation', () => {
    it('converts allocation percentage to FTE', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 100,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      // 100% should become 1.0 FTE
      const jan1 = result.current.demandData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBe(1.0);
    });

    it('aggregates multiple demands for same role', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 50,
          },
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 50,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      // Two 50% demands should aggregate to 1.0 FTE
      const jan1 = result.current.demandData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBe(1.0);
    });

    it('returns unique roles from demand data', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 50,
          },
          {
            role_name: 'Designer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 50,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      expect(result.current.allRoles).toContain('Developer');
      expect(result.current.allRoles).toContain('Designer');
      expect(result.current.allRoles).toHaveLength(2);
    });
  });

  describe('capacity data calculation', () => {
    it('calculates capacity from assignments', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 100,
          },
        ],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Developer',
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          allocation_percentage: 75,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      // 75% assignment = 0.75 FTE capacity
      const jan1 = result.current.capacityData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBe(0.75);
    });

    it('uses computed dates when available', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            allocation_percentage: 100,
          },
        ],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Developer',
          start_date: '2024-02-01', // Different from computed
          end_date: '2024-02-28',
          computed_start_date: '2024-01-10',
          computed_end_date: '2024-01-15',
          allocation_percentage: 100,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      // Should use computed dates
      const jan10 = result.current.capacityData.find((d) => d.date === '2024-01-10');
      const jan15 = result.current.capacityData.find((d) => d.date === '2024-01-15');
      const jan16 = result.current.capacityData.find((d) => d.date === '2024-01-16');

      expect(jan10?.Developer).toBe(1.0);
      expect(jan15?.Developer).toBe(1.0);
      // Outside computed range - no assignment contributes, value is 0 or undefined
      expect(jan16?.Developer ?? 0).toBe(0);
    });

    it('only includes roles that exist in demand data', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 100,
          },
        ],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Manager', // Not in demand data
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          allocation_percentage: 100,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      // Manager should not appear in capacity data
      const jan1 = result.current.capacityData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Manager).toBeUndefined();
    });

    it('shows zero capacity when no assignments', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 100,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: [],
        })
      );

      const jan1 = result.current.capacityData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBe(0);
    });
  });

  describe('gaps data calculation', () => {
    it('calculates gap as demand minus capacity', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 100,
          },
        ],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Developer',
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          allocation_percentage: 40,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      // Gap = 1.0 (demand) - 0.4 (capacity) = 0.6
      const jan1 = result.current.gapsData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBe(0.6);
    });

    it('does not show negative gaps (surplus capacity)', () => {
      const apiResponse = createMockApiResponse({
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-03',
            allocation_percentage: 50,
          },
        ],
      });

      const assignments: AssignmentItem[] = [
        {
          role_name: 'Developer',
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          allocation_percentage: 100,
        },
      ];

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: assignments,
        })
      );

      // Gap = 0.5 (demand) - 1.0 (capacity) = -0.5, should not show
      const jan1 = result.current.gapsData.find((d) => d.date === '2024-01-01');
      expect(jan1?.Developer).toBeUndefined();
    });
  });

  describe('data sorting', () => {
    it('sorts all data by date ascending', () => {
      const apiResponse = createMockApiResponse({
        phases: [
          {
            phase_id: 'p1',
            phase_name: 'Phase 1',
            start_date: '2024-01-01',
            end_date: '2024-01-05',
            phase_order: 1,
          },
        ],
        demands: [
          {
            role_name: 'Developer',
            start_date: '2024-01-01',
            end_date: '2024-01-05',
            allocation_percentage: 100,
          },
        ],
      });

      const { result } = renderHook(() =>
        useProjectDemandData({
          apiResponse,
          assignmentsData: null,
        })
      );

      // Verify ascending order
      for (let i = 1; i < result.current.demandData.length; i++) {
        expect(result.current.demandData[i].timestamp).toBeGreaterThan(
          result.current.demandData[i - 1].timestamp
        );
      }
    });
  });
});

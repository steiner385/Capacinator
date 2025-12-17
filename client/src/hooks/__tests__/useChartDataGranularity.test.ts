import { renderHook } from '@testing-library/react';
import {
  useChartDataGranularity,
  useFilteredChartData,
  getGranularity,
  generateDatePoints,
  ChartGranularity,
} from '../useChartDataGranularity';
import { ChartDataPoint } from '../useProjectDemandData';

describe('useChartDataGranularity', () => {
  // Helper to create mock daily data
  const createDailyData = (
    startDate: string,
    days: number,
    roles: string[] = ['Developer']
  ): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const start = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      const dateStr = current.toISOString().split('T')[0];

      const point: ChartDataPoint = {
        date: dateStr,
        timestamp: current.getTime(),
      };

      roles.forEach((role) => {
        point[role] = Math.random() * 2; // Random FTE value
      });

      data.push(point);
    }

    return data;
  };

  describe('getGranularity', () => {
    it('returns daily for 3 months or less', () => {
      expect(getGranularity('2024-01', '2024-01')).toBe('daily');
      expect(getGranularity('2024-01', '2024-02')).toBe('daily');
      expect(getGranularity('2024-01', '2024-03')).toBe('daily');
    });

    it('returns weekly for 4-12 months', () => {
      expect(getGranularity('2024-01', '2024-04')).toBe('weekly');
      expect(getGranularity('2024-01', '2024-06')).toBe('weekly');
      expect(getGranularity('2024-01', '2024-12')).toBe('weekly');
    });

    it('returns monthly for 13-24 months', () => {
      expect(getGranularity('2024-01', '2025-01')).toBe('monthly');
      expect(getGranularity('2024-01', '2025-06')).toBe('monthly');
      expect(getGranularity('2024-01', '2025-12')).toBe('monthly');
    });

    it('returns quarterly for more than 24 months', () => {
      expect(getGranularity('2024-01', '2026-02')).toBe('quarterly');
      expect(getGranularity('2024-01', '2027-01')).toBe('quarterly');
    });
  });

  describe('generateDatePoints', () => {
    it('generates daily points', () => {
      const points = generateDatePoints(
        new Date('2024-01-01'),
        new Date('2024-01-05'),
        'daily'
      );

      expect(points).toHaveLength(5);
      expect(points[0]).toBe('2024-01-01');
      expect(points[4]).toBe('2024-01-05');
    });

    it('generates weekly points', () => {
      const points = generateDatePoints(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'weekly'
      );

      // Should have multiple weeks
      expect(points.length).toBeGreaterThan(1);
      expect(points.length).toBeLessThanOrEqual(6);
    });

    it('generates monthly points', () => {
      const points = generateDatePoints(
        new Date('2024-01-15'),
        new Date('2024-06-15'),
        'monthly'
      );

      // Should include points for each month in the range
      expect(points.length).toBeGreaterThanOrEqual(5);
      // First point should be January
      expect(points[0]).toMatch(/2024-0[12]-01/);
    });

    it('generates quarterly points', () => {
      const points = generateDatePoints(
        new Date('2024-01-15'),
        new Date('2024-12-15'),
        'quarterly'
      );

      // Should have 4 quarters
      expect(points.length).toBeGreaterThanOrEqual(4);
      // First point should be Q1
      expect(points[0]).toMatch(/2024-0[14]-01/);
    });
  });

  describe('useChartDataGranularity hook', () => {
    it('returns empty data for empty input', () => {
      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData: [],
          allRoles: ['Developer'],
        })
      );

      expect(result.current.processedData).toEqual([]);
      expect(result.current.granularity).toBe('daily');
    });

    it('preserves daily data with granularity marker for short ranges', () => {
      const dailyData = createDailyData('2024-01-01', 30, ['Developer']);

      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData,
          allRoles: ['Developer'],
        })
      );

      expect(result.current.granularity).toBe('daily');
      expect(result.current.processedData).toHaveLength(30);
      expect(result.current.processedData[0].granularity).toBe('daily');
    });

    it('aggregates to weekly for longer ranges', () => {
      const dailyData = createDailyData('2024-01-01', 180, ['Developer']); // 6 months

      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData,
          allRoles: ['Developer'],
        })
      );

      expect(result.current.granularity).toBe('weekly');
      expect(result.current.processedData.length).toBeLessThan(180);
      expect(result.current.processedData[0].granularity).toBe('weekly');
    });

    it('respects forceGranularity parameter', () => {
      const dailyData = createDailyData('2024-01-01', 30, ['Developer']);

      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData,
          allRoles: ['Developer'],
          forceGranularity: 'weekly',
        })
      );

      expect(result.current.granularity).toBe('weekly');
    });

    it('calculates average values for aggregated periods', () => {
      // Create daily data with known values
      const dailyData: ChartDataPoint[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        dailyData.push({
          date: date.toISOString().split('T')[0],
          timestamp: date.getTime(),
          Developer: i + 1, // 1, 2, 3, 4, 5, 6, 7
        });
      }

      // Create longer range to force weekly
      const longData = createDailyData('2024-01-01', 180, ['Developer']);
      // Override first week with known values
      for (let i = 0; i < 7 && i < longData.length; i++) {
        longData[i].Developer = i + 1;
      }

      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData: longData,
          allRoles: ['Developer'],
        })
      );

      // First week average should be (1+2+3+4+5+6+7)/7 = 4
      expect(result.current.processedData[0].Developer).toBeCloseTo(4, 0);
    });
  });

  describe('useFilteredChartData hook', () => {
    it('returns full data when brush is uninitialized', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 0,
          brushEnd: 0,
        })
      );

      // Should return data with appropriate granularity for full range
      expect(result.current.processedData.length).toBeGreaterThan(0);
    });

    it('filters data based on brush selection', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 10,
          brushEnd: 30,
        })
      );

      // Filtered range should have fewer points
      expect(result.current.processedData.length).toBeLessThanOrEqual(21);
    });

    it('handles reversed brush indices', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 30,
          brushEnd: 10, // Reversed
        })
      );

      // Should still work (min/max handled internally)
      expect(result.current.processedData.length).toBeGreaterThan(0);
    });

    it('returns daily granularity for short filtered ranges', () => {
      const dailyData = createDailyData('2024-01-01', 365, ['Developer']); // Full year

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 0,
          brushEnd: 30, // Only 30 days selected
        })
      );

      // 30 days should be daily
      expect(result.current.granularity).toBe('daily');
    });

    it('adjusts granularity based on filtered range', () => {
      const dailyData = createDailyData('2024-01-01', 365, ['Developer']); // Full year

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 0,
          brushEnd: 200, // ~7 months selected
        })
      );

      // 7 months should be weekly
      expect(result.current.granularity).toBe('weekly');
    });

    it('handles empty daily data', () => {
      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData: [],
          allRoles: ['Developer'],
          brushStart: 10,
          brushEnd: 30,
        })
      );

      expect(result.current.processedData).toEqual([]);
      expect(result.current.granularity).toBe('daily');
    });

    it('preserves all roles in processed data', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer', 'Designer', 'Manager']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer', 'Designer', 'Manager'],
          brushStart: 0,
          brushEnd: 30,
        })
      );

      const firstPoint = result.current.processedData[0];
      expect(firstPoint).toHaveProperty('Developer');
      expect(firstPoint).toHaveProperty('Designer');
      expect(firstPoint).toHaveProperty('Manager');
    });
  });

  describe('edge cases', () => {
    it('handles single day data', () => {
      const dailyData = createDailyData('2024-01-01', 1, ['Developer']);

      const { result } = renderHook(() =>
        useChartDataGranularity({
          dailyData,
          allRoles: ['Developer'],
        })
      );

      expect(result.current.processedData).toHaveLength(1);
      expect(result.current.granularity).toBe('daily');
    });

    it('handles brush selection at array boundaries', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 0,
          brushEnd: 89, // Exactly at end
        })
      );

      expect(result.current.processedData.length).toBeGreaterThan(0);
    });

    it('handles brush selection beyond array length', () => {
      const dailyData = createDailyData('2024-01-01', 90, ['Developer']);

      const { result } = renderHook(() =>
        useFilteredChartData({
          dailyData,
          allRoles: ['Developer'],
          brushStart: 0,
          brushEnd: 200, // Beyond array length
        })
      );

      // Should clamp to array length
      expect(result.current.processedData.length).toBeGreaterThan(0);
    });
  });
});

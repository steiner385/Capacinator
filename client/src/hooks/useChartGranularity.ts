import { useMemo, useCallback } from 'react';
import { ChartDataPoint } from './useProjectDemandData';

export type GranularityLevel = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ChartView = 'demand' | 'capacity' | 'gaps';

/**
 * Props for useChartGranularity hook
 */
export interface UseChartGranularityProps {
  demandData: ChartDataPoint[];
  capacityData: ChartDataPoint[];
  gapsData: ChartDataPoint[];
  currentView: ChartView;
  allRoles: string[];
}

/**
 * Result from useChartGranularity hook
 */
export interface ChartGranularityResult {
  processedData: ChartDataPoint[];
  granularity: GranularityLevel;
  getGranularity: (startMonth: string, endMonth: string) => GranularityLevel;
  generateDatePointsWithActualEnd: (actualStartDate: Date, actualEndDate: Date, granularity: GranularityLevel) => string[];
}

/**
 * Determines the appropriate granularity based on the date range
 */
export function getGranularity(startMonth: string, endMonth: string): GranularityLevel {
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

  if (monthsDiff <= 3) return 'daily';     // 3 months or less: daily
  if (monthsDiff <= 12) return 'weekly';   // 4-12 months: weekly
  if (monthsDiff <= 24) return 'monthly';  // 13-24 months: monthly
  return 'quarterly';                      // > 24 months: quarterly
}

/**
 * Generates date points based on granularity, respecting actual start and end dates
 */
export function generateDatePointsWithActualEnd(
  actualStartDate: Date,
  actualEndDate: Date,
  granularity: GranularityLevel
): string[] {
  const start = new Date(actualStartDate);
  const end = new Date(actualEndDate);

  const points: string[] = [];
  const current = new Date(start);

  if (granularity === 'weekly') {
    // Start from the beginning of the week containing the start date, but don't go before actual data start
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - current.getDay()); // Go to Sunday

    // Don't start before the actual data start date
    if (startOfWeek < start) {
      current.setTime(start.getTime());
    } else {
      current.setTime(startOfWeek.getTime());
    }

    while (current <= end) {
      points.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 7); // Add 7 days for weekly
    }

    // Check if we need to add a partial week at the end
    const lastWeekStart = new Date(current);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7); // Go back to the last added week
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6); // End of that week

    // If the target end date is beyond the last complete week, add a partial week point
    if (end > lastWeekEnd && points.length > 0) {
      const partialWeekStart = new Date(lastWeekEnd);
      partialWeekStart.setDate(partialWeekStart.getDate() + 1); // Day after last complete week
      points.push(partialWeekStart.toISOString().split('T')[0]);
    }
  } else if (granularity === 'daily') {
    while (current <= end) {
      points.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  } else { // monthly or quarterly
    while (current <= end) {
      const year = current.getFullYear();
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      points.push(`${year}-${month}-01`);

      if (granularity === 'quarterly') {
        current.setMonth(current.getMonth() + 3);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
  }

  return points.sort();
}

/**
 * Aggregates daily data into the specified granularity
 */
function aggregateDataByGranularity(
  baseData: ChartDataPoint[],
  allRoles: string[],
  granularity: GranularityLevel
): ChartDataPoint[] {
  if (baseData.length === 0) return [];

  // If already daily and that's appropriate, return as-is
  if (granularity === 'daily') {
    return baseData.map(d => ({ ...d, granularity }));
  }

  const startDate = new Date(baseData[0].date);
  const endDate = new Date(baseData[baseData.length - 1].date);
  const datePoints = generateDatePointsWithActualEnd(startDate, endDate, granularity);

  return datePoints.map(datePoint => {
    let periodStart: Date;
    let periodEnd: Date;
    let displayDate: string;

    if (granularity === 'weekly') {
      const pointDate = new Date(datePoint);
      periodStart = new Date(pointDate);
      periodEnd = new Date(pointDate);
      periodEnd.setDate(periodEnd.getDate() + 6);

      // For partial weeks at the end, don't exceed the actual data end date
      const actualEndDate = new Date(baseData[baseData.length - 1].date);
      if (periodEnd > actualEndDate) {
        periodEnd = new Date(actualEndDate);
        displayDate = periodEnd.toISOString().split('T')[0];
      } else {
        displayDate = datePoint;
      }
    } else if (granularity === 'monthly') {
      const [year, monthNum] = datePoint.split('-').map(Number);
      periodStart = new Date(year, monthNum - 1, 1);
      periodEnd = new Date(year, monthNum, 0); // Last day of month
      displayDate = datePoint;
    } else { // quarterly
      const [year, monthNum] = datePoint.split('-').map(Number);
      periodStart = new Date(year, monthNum - 1, 1);
      periodEnd = new Date(year, monthNum - 1 + 3, 0); // Last day of quarter
      displayDate = datePoint;
    }

    // Aggregate data for this period by averaging daily values
    const periodData: ChartDataPoint = {
      date: displayDate,
      timestamp: periodStart.getTime(),
      granularity
    };

    // For each role, calculate average value over the period
    allRoles.forEach(role => {
      const relevantDays = baseData.filter(d => {
        const dayDate = new Date(d.date);
        return dayDate >= periodStart && dayDate <= periodEnd;
      });

      if (relevantDays.length > 0) {
        const totalValue = relevantDays.reduce((sum, day) => sum + ((day[role] as number) || 0), 0);
        periodData[role] = totalValue / relevantDays.length; // Average over the period
      } else {
        periodData[role] = 0;
      }
    });

    return periodData;
  });
}

/**
 * Hook to process chart data with appropriate granularity based on date range.
 * Handles:
 * - Automatic granularity selection (daily/weekly/monthly/quarterly)
 * - Data aggregation for non-daily granularities
 * - View-specific data selection
 */
export function useChartGranularity({
  demandData,
  capacityData,
  gapsData,
  currentView,
  allRoles
}: UseChartGranularityProps): ChartGranularityResult {
  // Memoize the getGranularity function
  const getGranularityFn = useCallback((startMonth: string, endMonth: string) => {
    return getGranularity(startMonth, endMonth);
  }, []);

  // Memoize the generateDatePointsWithActualEnd function
  const generateDatePointsFn = useCallback((actualStartDate: Date, actualEndDate: Date, granularity: GranularityLevel) => {
    return generateDatePointsWithActualEnd(actualStartDate, actualEndDate, granularity);
  }, []);

  // Process data with variable granularity
  const { processedData, granularity } = useMemo(() => {
    const baseData = (() => {
      switch (currentView) {
        case 'demand': return demandData;
        case 'capacity': return capacityData;
        case 'gaps': return gapsData;
        default: return demandData;
      }
    })();

    if (baseData.length === 0) {
      return { processedData: [], granularity: 'daily' as GranularityLevel };
    }

    // Determine appropriate granularity based on date range
    const startDate = new Date(baseData[0].date);
    const endDate = new Date(baseData[baseData.length - 1].date);
    const startMonth = startDate.getFullYear() + '-' + (startDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = endDate.getFullYear() + '-' + (endDate.getMonth() + 1).toString().padStart(2, '0');
    const calculatedGranularity = getGranularity(startMonth, endMonth);

    const processed = aggregateDataByGranularity(baseData, allRoles, calculatedGranularity);

    return { processedData: processed, granularity: calculatedGranularity };
  }, [demandData, capacityData, gapsData, currentView, allRoles]);

  return {
    processedData,
    granularity,
    getGranularity: getGranularityFn,
    generateDatePointsWithActualEnd: generateDatePointsFn
  };
}

export default useChartGranularity;

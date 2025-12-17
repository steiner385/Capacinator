/**
 * useChartDataGranularity Hook
 *
 * Processes daily chart data into appropriate time granularity
 * (daily, weekly, monthly, quarterly) based on date range.
 */

import { useMemo } from 'react';
import { ChartDataPoint } from './useProjectDemandData';

/**
 * Granularity levels for chart data
 */
export type ChartGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Options for useChartDataGranularity hook
 */
export interface UseChartDataGranularityOptions {
  /** Daily chart data to process */
  dailyData: ChartDataPoint[];
  /** All roles to include in processed data */
  allRoles: string[];
  /** Optional override for granularity calculation */
  forceGranularity?: ChartGranularity;
}

/**
 * Return type for useChartDataGranularity hook
 */
export interface UseChartDataGranularityReturn {
  /** Processed data with appropriate granularity */
  processedData: ChartDataPoint[];
  /** The calculated granularity level */
  granularity: ChartGranularity;
}

/**
 * Determines appropriate granularity based on date range
 */
export function getGranularity(startMonth: string, endMonth: string): ChartGranularity {
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

  if (monthsDiff <= 3) return 'daily'; // 3 months or less: daily
  if (monthsDiff <= 12) return 'weekly'; // 4-12 months: weekly
  if (monthsDiff <= 24) return 'monthly'; // 13-24 months: monthly
  return 'quarterly'; // > 24 months: quarterly
}

/**
 * Generates date points based on granularity using actual start and end dates
 */
export function generateDatePoints(
  actualStartDate: Date,
  actualEndDate: Date,
  granularity: ChartGranularity
): string[] {
  const start = new Date(actualStartDate);
  const end = new Date(actualEndDate);
  const points: string[] = [];
  const current = new Date(start);

  if (granularity === 'weekly') {
    // Start from the beginning of the week containing the start date
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
      current.setDate(current.getDate() + 7);
    }

    // Check if we need to add a partial week at the end
    const lastWeekStart = new Date(current);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

    if (end > lastWeekEnd && points.length > 0) {
      const partialWeekStart = new Date(lastWeekEnd);
      partialWeekStart.setDate(partialWeekStart.getDate() + 1);
      points.push(partialWeekStart.toISOString().split('T')[0]);
    }
  } else if (granularity === 'daily') {
    while (current <= end) {
      points.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  } else {
    // monthly or quarterly
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
 * Aggregates daily data into period data based on granularity
 */
function aggregateDataForPeriod(
  datePoint: string,
  granularity: ChartGranularity,
  dailyData: ChartDataPoint[],
  allRoles: string[],
  actualEndDate: Date
): ChartDataPoint {
  let periodStart: Date;
  let periodEnd: Date;
  let displayDate: string;

  if (granularity === 'weekly') {
    const pointDate = new Date(datePoint);
    periodStart = new Date(pointDate);
    periodEnd = new Date(pointDate);
    periodEnd.setDate(periodEnd.getDate() + 6);

    // For partial weeks at the end, don't exceed the actual data end date
    if (periodEnd > actualEndDate) {
      periodEnd = new Date(actualEndDate);
      displayDate = periodEnd.toISOString().split('T')[0];
    } else {
      displayDate = datePoint;
    }
  } else if (granularity === 'monthly') {
    const parts = datePoint.split('-').map(Number);
    const year = parts[0];
    const monthNum = parts[1];
    periodStart = new Date(year, monthNum - 1, 1);
    periodEnd = new Date(year, monthNum, 0); // Last day of month
    displayDate = datePoint;
  } else if (granularity === 'quarterly') {
    const parts = datePoint.split('-').map(Number);
    const year = parts[0];
    const monthNum = parts[1];
    periodStart = new Date(year, monthNum - 1, 1);
    periodEnd = new Date(year, monthNum - 1 + 3, 0); // Last day of quarter
    displayDate = datePoint;
  } else {
    // daily
    const pointDate = new Date(datePoint);
    periodStart = pointDate;
    periodEnd = pointDate;
    displayDate = datePoint;
  }

  const periodData: ChartDataPoint = {
    date: displayDate,
    timestamp: periodStart.getTime(),
    granularity,
  };

  // For each role, calculate average value over the period
  allRoles.forEach((role) => {
    const relevantDays = dailyData.filter((d) => {
      const dayDate = new Date(d.date);
      return dayDate >= periodStart && dayDate <= periodEnd;
    });

    if (relevantDays.length > 0) {
      const totalValue = relevantDays.reduce(
        (sum, day) => sum + ((day[role] as number) || 0),
        0
      );
      periodData[role] = totalValue / relevantDays.length; // Average over the period
    } else {
      periodData[role] = 0;
    }
  });

  return periodData;
}

/**
 * useChartDataGranularity - Processes daily chart data into appropriate time granularity.
 *
 * This hook extracts the granularity processing logic from ProjectDemandChart to provide:
 * - Automatic granularity selection based on date range
 * - Data aggregation (averaging) for non-daily granularities
 * - Proper handling of partial periods at range boundaries
 *
 * @example
 * ```tsx
 * const { processedData, granularity } = useChartDataGranularity({
 *   dailyData: demandData,
 *   allRoles
 * });
 * ```
 */
export function useChartDataGranularity({
  dailyData,
  allRoles,
  forceGranularity,
}: UseChartDataGranularityOptions): UseChartDataGranularityReturn {
  return useMemo(() => {
    if (dailyData.length === 0) {
      return { processedData: [], granularity: 'daily' as ChartGranularity };
    }

    // Determine appropriate granularity based on date range
    const startDate = new Date(dailyData[0].date);
    const endDate = new Date(dailyData[dailyData.length - 1].date);
    const startMonth =
      startDate.getFullYear() + '-' + (startDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth =
      endDate.getFullYear() + '-' + (endDate.getMonth() + 1).toString().padStart(2, '0');
    const granularity = forceGranularity || getGranularity(startMonth, endMonth);

    // If already daily and that's appropriate, return as-is with granularity marker
    if (granularity === 'daily') {
      return {
        processedData: dailyData.map((d) => ({ ...d, granularity })),
        granularity,
      };
    }

    // Aggregate data based on granularity
    const datePoints = generateDatePoints(startDate, endDate, granularity);

    const processedData = datePoints.map((datePoint) =>
      aggregateDataForPeriod(datePoint, granularity, dailyData, allRoles, endDate)
    );

    return { processedData, granularity };
  }, [dailyData, allRoles, forceGranularity]);
}

/**
 * Filters and re-processes data for a specific brush/zoom range
 */
export function useFilteredChartData({
  dailyData,
  allRoles,
  brushStart,
  brushEnd,
}: {
  dailyData: ChartDataPoint[];
  allRoles: string[];
  brushStart: number;
  brushEnd: number;
}): UseChartDataGranularityReturn {
  return useMemo(() => {
    if (dailyData.length === 0) {
      return { processedData: [], granularity: 'daily' as ChartGranularity };
    }

    // If brush is uninitialized (both at 0), return full data with appropriate granularity
    if (brushStart === 0 && brushEnd === 0) {
      const startDate = new Date(dailyData[0].date);
      const endDate = new Date(dailyData[dailyData.length - 1].date);
      const startMonth =
        startDate.getFullYear() + '-' + (startDate.getMonth() + 1).toString().padStart(2, '0');
      const endMonth =
        endDate.getFullYear() + '-' + (endDate.getMonth() + 1).toString().padStart(2, '0');
      const granularity = getGranularity(startMonth, endMonth);

      if (granularity === 'daily') {
        return {
          processedData: dailyData.map((d) => ({ ...d, granularity })),
          granularity,
        };
      }

      const datePoints = generateDatePoints(startDate, endDate, granularity);
      const processedData = datePoints.map((datePoint) =>
        aggregateDataForPeriod(datePoint, granularity, dailyData, allRoles, endDate)
      );
      return { processedData, granularity };
    }

    // Filter daily data based on brush selection
    const dailyStart = Math.max(0, Math.min(brushStart, brushEnd));
    const dailyEnd = Math.min(dailyData.length - 1, Math.max(brushStart, brushEnd));
    const filteredDailyData = dailyData.slice(dailyStart, dailyEnd + 1);

    if (filteredDailyData.length === 0) {
      return { processedData: [], granularity: 'daily' as ChartGranularity };
    }

    // Calculate appropriate granularity for the filtered range
    const rangeStartDate = new Date(filteredDailyData[0].date);
    const rangeEndDate = new Date(filteredDailyData[filteredDailyData.length - 1].date);
    const startMonth =
      rangeStartDate.getFullYear() +
      '-' +
      (rangeStartDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth =
      rangeEndDate.getFullYear() +
      '-' +
      (rangeEndDate.getMonth() + 1).toString().padStart(2, '0');
    const appropriateGranularity = getGranularity(startMonth, endMonth);

    // If daily is appropriate, return filtered daily data
    if (appropriateGranularity === 'daily') {
      return {
        processedData: filteredDailyData.map((d) => ({ ...d, granularity: 'daily' })),
        granularity: 'daily' as ChartGranularity,
      };
    }

    // Aggregate the filtered daily data with the appropriate granularity
    const datePoints = generateDatePoints(rangeStartDate, rangeEndDate, appropriateGranularity);

    const processedFiltered = datePoints.map((datePoint) =>
      aggregateDataForPeriod(
        datePoint,
        appropriateGranularity,
        filteredDailyData,
        allRoles,
        rangeEndDate
      )
    );

    return { processedData: processedFiltered, granularity: appropriateGranularity };
  }, [dailyData, allRoles, brushStart, brushEnd]);
}

export default useChartDataGranularity;

import { useMemo } from 'react';
import { ChartDataPoint } from './useProjectDemandData';
import { ChartView, getGranularity, generateDatePointsWithActualEnd } from './useChartGranularity';

/**
 * Props for useChartDisplayData hook
 */
export interface UseChartDisplayDataProps {
  processedDataWithGranularity: ChartDataPoint[];
  demandData: ChartDataPoint[];
  capacityData: ChartDataPoint[];
  gapsData: ChartDataPoint[];
  currentView: ChartView;
  allRoles: string[];
  brushStart: number;
  brushEnd: number;
}

/**
 * Result from useChartDisplayData hook
 */
export interface ChartDisplayDataResult {
  displayData: ChartDataPoint[];
}

/**
 * Hook to filter and re-process chart data based on brush selection.
 * Handles:
 * - Re-calculating granularity for the selected brush range
 * - Filtering daily data to the brush selection
 * - Re-aggregating data if granularity changes
 */
export function useChartDisplayData({
  processedDataWithGranularity,
  demandData,
  capacityData,
  gapsData,
  currentView,
  allRoles,
  brushStart,
  brushEnd
}: UseChartDisplayDataProps): ChartDisplayDataResult {
  const displayData = useMemo(() => {
    if (processedDataWithGranularity.length === 0) return processedDataWithGranularity;

    // Get the current daily data to check if brush is showing full range
    const currentDailyData = (() => {
      switch (currentView) {
        case 'demand': return demandData;
        case 'capacity': return capacityData;
        case 'gaps': return gapsData;
        default: return demandData;
      }
    })();

    // If brush is uninitialized (both at 0), return unfiltered data
    if (brushStart === 0 && brushEnd === 0) {
      return processedDataWithGranularity;
    }

    if (currentDailyData.length === 0) return processedDataWithGranularity;

    // Re-process the daily data with the appropriate granularity for the SELECTED range
    const dailyStart = Math.max(0, Math.min(brushStart, brushEnd));
    const dailyEnd = Math.min(currentDailyData.length - 1, Math.max(brushStart, brushEnd));

    // Get the filtered daily data first
    const filteredDailyData = currentDailyData.slice(dailyStart, dailyEnd + 1);

    if (filteredDailyData.length === 0) return [];

    // Calculate appropriate granularity for the FILTERED range
    const rangeStartDate = new Date(filteredDailyData[0].date);
    const rangeEndDate = new Date(filteredDailyData[filteredDailyData.length - 1].date);
    const startMonth = rangeStartDate.getFullYear() + '-' + (rangeStartDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = rangeEndDate.getFullYear() + '-' + (rangeEndDate.getMonth() + 1).toString().padStart(2, '0');
    const appropriateGranularity = getGranularity(startMonth, endMonth);

    // If daily is appropriate, return filtered daily data
    if (appropriateGranularity === 'daily') {
      return filteredDailyData.map(d => ({ ...d, granularity: 'daily' }));
    }

    // Otherwise, aggregate the filtered daily data with the appropriate granularity
    const datePoints = generateDatePointsWithActualEnd(rangeStartDate, rangeEndDate, appropriateGranularity);

    const processedFiltered = datePoints.map(datePoint => {
      let periodStart: Date;
      let periodEnd: Date;
      let displayDate: string;

      if (appropriateGranularity === 'weekly') {
        const pointDate = new Date(datePoint);
        periodStart = new Date(pointDate);
        periodEnd = new Date(pointDate);
        periodEnd.setDate(periodEnd.getDate() + 6);

        if (periodEnd > rangeEndDate) {
          periodEnd = new Date(rangeEndDate);
          displayDate = periodEnd.toISOString().split('T')[0];
        } else {
          displayDate = datePoint;
        }
      } else if (appropriateGranularity === 'monthly') {
        const [year, monthNum] = datePoint.split('-').map(Number);
        periodStart = new Date(year, monthNum - 1, 1);
        periodEnd = new Date(year, monthNum, 0);
        displayDate = datePoint;
      } else { // quarterly
        const [year, monthNum] = datePoint.split('-').map(Number);
        periodStart = new Date(year, monthNum - 1, 1);
        periodEnd = new Date(year, monthNum - 1 + 3, 0);
        displayDate = datePoint;
      }

      const periodData: ChartDataPoint = {
        date: displayDate,
        timestamp: periodStart.getTime(),
        granularity: appropriateGranularity
      };

      allRoles.forEach(role => {
        const relevantDays = filteredDailyData.filter(d => {
          const dayDate = new Date(d.date);
          return dayDate >= periodStart && dayDate <= periodEnd;
        });

        if (relevantDays.length > 0) {
          const totalValue = relevantDays.reduce((sum, day) => sum + ((day[role] as number) || 0), 0);
          periodData[role] = totalValue / relevantDays.length;
        } else {
          periodData[role] = 0;
        }
      });

      return periodData;
    });

    return processedFiltered;
  }, [processedDataWithGranularity, brushStart, brushEnd, currentView, demandData, capacityData, gapsData, allRoles]);

  return { displayData };
}

export default useChartDisplayData;

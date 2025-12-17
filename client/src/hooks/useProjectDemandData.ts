/**
 * useProjectDemandData Hook
 *
 * Processes project demand API data into chart-ready format.
 * Calculates demand by role over time from project allocation data.
 */

import { useMemo } from 'react';

/**
 * Chart data point with date and role values
 */
export interface ChartDataPoint {
  date: string;
  timestamp: number;
  granularity?: string;
  [roleName: string]: string | number | undefined;
}

/**
 * Phase information for roadmap overlay
 */
export interface PhaseInfo {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_order: number;
}

/**
 * Date range for the project timeline
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Demand item from API response
 */
export interface DemandItem {
  role_name: string;
  start_date: string;
  end_date: string;
  allocation_percentage: number;
}

/**
 * Phase item from API response
 */
export interface PhaseItem {
  phase_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_order: number;
}

/**
 * Assignment item from API response
 */
export interface AssignmentItem {
  role_name: string;
  start_date: string;
  end_date: string;
  computed_start_date?: string;
  computed_end_date?: string;
  allocation_percentage: number;
}

/**
 * API response structure for project demands
 */
export interface ProjectDemandApiResponse {
  phases: PhaseItem[];
  demands: DemandItem[];
}

/**
 * Options for useProjectDemandData hook
 */
export interface UseProjectDemandDataOptions {
  /** API response with demand data */
  apiResponse: ProjectDemandApiResponse | null | undefined;
  /** Assignments response for capacity calculation */
  assignmentsData: AssignmentItem[] | null | undefined;
}

/**
 * Return type for useProjectDemandData hook
 */
export interface UseProjectDemandDataReturn {
  /** Demand data points by role over time */
  demandData: ChartDataPoint[];
  /** Capacity data points by role over time */
  capacityData: ChartDataPoint[];
  /** Gap data points (demand - capacity) by role over time */
  gapsData: ChartDataPoint[];
  /** Extracted phase information */
  phases: PhaseInfo[];
  /** Overall date range for the project */
  dateRange: DateRange;
  /** All unique roles across demand data */
  allRoles: string[];
}

/**
 * Creates an empty timeline object with daily data points
 */
function createEmptyTimeline(minDate: Date, maxDate: Date): { [dateKey: string]: ChartDataPoint } {
  const timeline: { [dateKey: string]: ChartDataPoint } = {};
  const currentDate = new Date(minDate);
  const maxDatePlusOne = new Date(maxDate);
  maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);

  while (currentDate < maxDatePlusOne) {
    const dateKey = currentDate.toISOString().split('T')[0];
    timeline[dateKey] = {
      date: dateKey,
      timestamp: currentDate.getTime(),
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return timeline;
}

/**
 * useProjectDemandData - Processes project demand API data into chart-ready format.
 *
 * This hook extracts the data processing logic from ProjectDemandChart to provide:
 * - Demand data calculation (allocation percentages to FTE)
 * - Capacity data calculation from assignments
 * - Gap data calculation (demand - capacity)
 * - Phase extraction and date range computation
 *
 * @example
 * ```tsx
 * const { demandData, capacityData, gapsData, phases, dateRange, allRoles } = useProjectDemandData({
 *   apiResponse,
 *   assignmentsData: assignmentsResponse?.data
 * });
 * ```
 */
export function useProjectDemandData({
  apiResponse,
  assignmentsData,
}: UseProjectDemandDataOptions): UseProjectDemandDataReturn {
  return useMemo(() => {
    // Default empty return
    const emptyResult: UseProjectDemandDataReturn = {
      demandData: [],
      capacityData: [],
      gapsData: [],
      phases: [],
      dateRange: { start: new Date(), end: new Date() },
      allRoles: [],
    };

    if (!apiResponse || !apiResponse.phases || !Array.isArray(apiResponse.phases)) {
      return emptyResult;
    }

    // Extract phase information for the roadmap overlay
    const phases: PhaseInfo[] = apiResponse.phases
      .map((phase) => ({
        id: phase.phase_id,
        phase_name: phase.phase_name,
        start_date: phase.start_date,
        end_date: phase.end_date,
        phase_order: phase.phase_order,
      }))
      .sort((a, b) => a.phase_order - b.phase_order);

    // Find the overall date range - consider phases, demands, and assignments
    const phaseDates = phases.flatMap((p) => [new Date(p.start_date), new Date(p.end_date)]);
    const demandDates = apiResponse.demands.flatMap((d) => [
      new Date(d.start_date),
      new Date(d.end_date),
    ]);
    const assignmentDates = assignmentsData
      ? assignmentsData.flatMap((a) => [
          new Date(a.computed_start_date || a.start_date),
          new Date(a.computed_end_date || a.end_date),
        ])
      : [];

    const allProjectDates = [...phaseDates, ...demandDates, ...assignmentDates];

    // Guard against empty date arrays
    if (allProjectDates.length === 0) {
      return emptyResult;
    }

    const minDate = new Date(Math.min(...allProjectDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allProjectDates.map((d) => d.getTime())));

    // Get unique roles from demand data
    const uniqueRoles = [...new Set(apiResponse.demands.map((d) => d.role_name))];

    // 1. DEMAND DATA - convert allocation percentages to FTE
    const demandTimeline = createEmptyTimeline(minDate, maxDate);
    apiResponse.demands.forEach((demand) => {
      const phaseStart = new Date(demand.start_date);
      const phaseEnd = new Date(demand.end_date);
      const roleName = demand.role_name;
      const allocation = demand.allocation_percentage || 0;

      const currentDay = new Date(phaseStart);
      while (currentDay <= phaseEnd) {
        const dayKey = currentDay.toISOString().split('T')[0];
        if (demandTimeline[dayKey]) {
          if (!demandTimeline[dayKey][roleName]) {
            demandTimeline[dayKey][roleName] = 0;
          }
          (demandTimeline[dayKey][roleName] as number) += allocation / 100; // Convert percentage to FTE
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    // 2. CAPACITY DATA - calculate from project assignments
    const capacityTimeline = createEmptyTimeline(minDate, maxDate);

    if (assignmentsData && assignmentsData.length > 0) {
      assignmentsData.forEach((assignment) => {
        const assignmentStart = new Date(assignment.computed_start_date || assignment.start_date);
        const assignmentEnd = new Date(assignment.computed_end_date || assignment.end_date);
        const roleName = assignment.role_name;
        const allocationPercentage = assignment.allocation_percentage || 0;

        // Only include if role is relevant to demand data
        if (roleName && uniqueRoles.includes(roleName)) {
          const currentDay = new Date(assignmentStart);
          while (currentDay <= assignmentEnd) {
            const dayKey = currentDay.toISOString().split('T')[0];
            if (capacityTimeline[dayKey]) {
              if (!capacityTimeline[dayKey][roleName]) {
                capacityTimeline[dayKey][roleName] = 0;
              }
              (capacityTimeline[dayKey][roleName] as number) += allocationPercentage / 100; // Convert to FTE
            }
            currentDay.setDate(currentDay.getDate() + 1);
          }
        }
      });
    } else {
      // No assignments found - show zero capacity for all roles
      Object.keys(capacityTimeline).forEach((dateKey) => {
        uniqueRoles.forEach((roleName) => {
          capacityTimeline[dateKey][roleName] = 0;
        });
      });
    }

    // 3. GAPS DATA - demand minus capacity (shortfalls)
    const gapsTimeline = createEmptyTimeline(minDate, maxDate);
    Object.keys(gapsTimeline).forEach((dateKey) => {
      const demandDay = demandTimeline[dateKey];
      const capacityDay = capacityTimeline[dateKey];

      uniqueRoles.forEach((roleName) => {
        const demand = (demandDay[roleName] as number) || 0;
        const capacity = (capacityDay[roleName] as number) || 0;
        const gap = demand - capacity;

        // Only show shortfalls (positive gaps) where demand exceeds capacity
        if (gap > 0) {
          gapsTimeline[dateKey][roleName] = gap;
        }
      });
    });

    // Convert timelines to sorted arrays
    const demandData = Object.values(demandTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const capacityData = Object.values(capacityTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const gapsData = Object.values(gapsTimeline).sort((a, b) => a.timestamp - b.timestamp);

    return {
      demandData,
      capacityData,
      gapsData,
      phases,
      dateRange: { start: minDate, end: maxDate },
      allRoles: uniqueRoles,
    };
  }, [apiResponse, assignmentsData]);
}

export default useProjectDemandData;

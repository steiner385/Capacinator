/**
 * Phase Duration Utilities
 *
 * Calculates default durations for different phase types based on naming conventions.
 * Extracted from SmartAssignmentModal to improve testability.
 */

/**
 * Calculates the recommended duration in weeks for a given phase
 * based on its name/type.
 *
 * @param phaseName - The name of the phase (case-insensitive)
 * @returns Duration in weeks
 *
 * @example
 * calculatePhaseDurationWeeks("Planning Phase") // returns 2
 * calculatePhaseDurationWeeks("Development") // returns 8
 * calculatePhaseDurationWeeks("Testing") // returns 3
 */
export function calculatePhaseDurationWeeks(phaseName: string): number {
  const normalizedName = (phaseName || '').toLowerCase();

  if (normalizedName.includes('planning') || normalizedName.includes('pending')) {
    return 2;
  }

  if (normalizedName.includes('development')) {
    return 8;
  }

  if (normalizedName.includes('testing')) {
    return 3;
  }

  if (normalizedName.includes('cutover') || normalizedName.includes('hypercare')) {
    return 2;
  }

  // Default duration for unrecognized phase types
  return 4;
}

/**
 * Calculates start and end dates for a phase assignment starting today.
 *
 * @param phaseName - The name of the phase to calculate duration for
 * @param startDate - Optional custom start date (defaults to today)
 * @returns Object containing startDate and endDate as ISO strings (YYYY-MM-DD)
 *
 * @example
 * calculatePhaseDates("Development Phase")
 * // returns { startDate: "2025-10-17", endDate: "2025-12-12" } (8 weeks from today)
 */
export function calculatePhaseDates(
  phaseName: string,
  startDate?: Date
): { startDate: string; endDate: string } {
  const start = startDate || new Date();

  // Use UTC methods throughout to avoid timezone-dependent calculation bugs
  // Extract UTC components from the input date
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const startDay = start.getUTCDate();

  // Create dates in UTC for consistent calculation across timezones
  const startUTC = new Date(Date.UTC(startYear, startMonth, startDay));
  const endUTC = new Date(Date.UTC(startYear, startMonth, startDay));

  const durationWeeks = calculatePhaseDurationWeeks(phaseName);
  endUTC.setUTCDate(endUTC.getUTCDate() + (durationWeeks * 7));

  // Format as YYYY-MM-DD using UTC values
  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(startUTC),
    endDate: formatDate(endUTC)
  };
}

import { addWeeks, startOfWeek, format, parse } from 'date-fns';

/**
 * Convert fiscal week notation (e.g., "24FW36") to a date
 * Format: YYFW## where YY is year and ## is week number
 */
export function fiscalWeekToDate(fiscalWeek: string): Date | null {
  if (!fiscalWeek) return null;
  
  // Extract year and week from format like "24FW36"
  const match = fiscalWeek.match(/^(\d{2})FW(\d{2})$/);
  if (!match) return null;
  
  const year = parseInt('20' + match[1]);
  const week = parseInt(match[2]);
  
  // Calculate the date for the first day of the fiscal week
  // Assuming fiscal week starts on Monday
  const startOfYear = new Date(year, 0, 1);
  const firstMonday = startOfWeek(startOfYear, { weekStartsOn: 1 });
  
  // Add weeks to get to the target week
  return addWeeks(firstMonday, week - 1);
}

/**
 * Convert a date to fiscal week notation
 */
export function dateToFiscalWeek(date: Date): string {
  const year = date.getFullYear().toString().slice(-2);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const firstMonday = startOfWeek(startOfYear, { weekStartsOn: 1 });
  
  // Calculate week number
  const weeksDiff = Math.floor((date.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const weekNumber = (weeksDiff + 1).toString().padStart(2, '0');
  
  return `${year}FW${weekNumber}`;
}

/**
 * Get all fiscal weeks between two dates
 */
export function getFiscalWeekRange(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  let currentDate = startOfWeek(startDate, { weekStartsOn: 1 });
  
  while (currentDate <= endDate) {
    weeks.push(dateToFiscalWeek(currentDate));
    currentDate = addWeeks(currentDate, 1);
  }
  
  return weeks;
}

/**
 * Parse fiscal week columns from Excel headers
 * Returns an array of fiscal week strings found in headers
 */
export function extractFiscalWeekColumns(headers: any[]): string[] {
  return headers
    .filter(header => typeof header === 'string' && /^\d{2}FW\d{2}$/.test(header))
    .map(header => header.toString());
}

/**
 * Map phase abbreviations to full names
 */
export const PHASE_ABBREVIATIONS: Record<string, string> = {
  'PEND': 'Pending',
  'BP': 'Business Planning',
  'DEV': 'Development',
  'SIT': 'System Integration Testing',
  'VAL': 'Validation',
  'UAT': 'User Acceptance Testing',
  'CUT': 'Cutover',
  'HC': 'Hypercare',
  'SUP': 'Support',
  'IDLE': 'Idle',
  'BLKOUT': 'Blackout',
  'GL': 'Go Live'
};

/**
 * Get full phase name from abbreviation
 */
export function getPhaseFullName(abbreviation: string): string {
  return PHASE_ABBREVIATIONS[abbreviation] || abbreviation;
}

/**
 * Parse project/site combined field
 * Format: "Project Name / Location"
 */
export function parseProjectSite(value: string): { project: string; site: string } {
  if (!value) return { project: '', site: '' };
  
  const parts = value.split('/').map(part => part.trim());
  return {
    project: parts[0] || '',
    site: parts[1] || ''
  };
}
/**
 * Utility functions for handling date transformations between database and API
 */

/**
 * Convert Unix timestamp (milliseconds) to ISO date string (YYYY-MM-DD)
 */
export function timestampToDateString(timestamp: number | string | null): string | null {
  if (!timestamp) return null;
  
  // If it's already a string in date format, return as-is
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(timestamp)) {
    return timestamp.split('T')[0];
  }
  
  // Convert timestamp to date string
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) return null;
  
  return date.toISOString().split('T')[0];
}

/**
 * Transform date fields in an object from timestamps to date strings
 */
export function transformDates<T extends Record<string, any>>(
  obj: T,
  dateFields: string[]
): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const transformed = { ...obj } as any;
  
  dateFields.forEach(field => {
    if (field in transformed) {
      transformed[field] = timestampToDateString(transformed[field]);
    }
  });
  
  return transformed;
}

/**
 * Transform date fields in an array of objects
 */
export function transformDatesInArray<T extends Record<string, any>>(
  array: T[],
  dateFields: string[]
): T[] {
  return array.map(item => transformDates(item, dateFields));
}

/**
 * Common date fields that need transformation
 */
export const COMMON_DATE_FIELDS = [
  'start_date',
  'end_date',
  'created_at',
  'updated_at',
  'aspiration_start',
  'aspiration_finish',
  'actual_start',
  'actual_finish',
  'date'
];
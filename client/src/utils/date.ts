export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid date';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'Invalid date';
  
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDaysBetween(start: string | Date, end: string | Date): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function addDays(date: string | Date, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function isDateInPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

export function isDateInFuture(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

export function getMonthYear(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
}

export function getWeekNumber(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Get the default date range for reports: today to 3 months from now
 * This focuses on actionable future periods rather than historical data
 */
export function getDefaultReportDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(today.getMonth() + 3);
  
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: threeMonthsFromNow.toISOString().split('T')[0]
  };
}
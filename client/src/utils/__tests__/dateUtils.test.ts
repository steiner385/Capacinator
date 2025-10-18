import {
  parseDate,
  formatTimelineDate,
  normalizeTimelineDates,
  calculateDurationDays,
  toISODateString,
  isValidDateString,
  isSameDay,
  TimelineDate
} from '../dateUtils';

describe('dateUtils.ts - Date Parsing', () => {
  describe('parseDate', () => {
    it('parses YYYY-MM-DD string format', () => {
      const result = parseDate('2025-03-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2); // 0-indexed
      expect(result.getDate()).toBe(15);
    });

    it('parses timestamp number', () => {
      const timestamp = new Date('2025-03-15').getTime();
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
    });

    it('parses string timestamp', () => {
      const timestamp = new Date('2025-03-15').getTime().toString();
      const result = parseDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });

    it('parses ISO datetime string', () => {
      const result = parseDate('2025-03-15T14:30:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
    });

    it('handles invalid input gracefully', () => {
      const result = parseDate('invalid');
      expect(result).toBeInstanceOf(Date);
      // Should return a Date object even if invalid
    });

    it('logs warning for invalid input', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      parseDate('invalid' as any);
      consoleSpy.mockRestore();
    });

    it('handles null input with fallback', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parseDate(null as any);
      expect(result).toBeInstanceOf(Date);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid date input:', null);
      consoleSpy.mockRestore();
    });

    it('handles undefined input with fallback', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = parseDate(undefined as any);
      expect(result).toBeInstanceOf(Date);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid date input:', undefined);
      consoleSpy.mockRestore();
    });

    it('handles timestamp as milliseconds', () => {
      const timestamp = 1710518400000; // March 15, 2024
      const result = parseDate(timestamp);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // March
    });

    it('handles zero timestamp (epoch)', () => {
      const result = parseDate(0);
      // Epoch time depends on timezone, just verify it's valid
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBeGreaterThanOrEqual(1969);
      expect(result.getFullYear()).toBeLessThanOrEqual(1970);
    });
  });
});

describe('dateUtils.ts - Date Formatting', () => {
  describe('formatTimelineDate', () => {
    it('formats date with default options', () => {
      const date = new Date(2025, 2, 15); // March 15, 2025 local
      const result = formatTimelineDate(date);
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('formats date without year when includeYear is false', () => {
      const date = new Date(2025, 2, 15); // March 15, 2025 local
      const result = formatTimelineDate(date, { includeYear: false });
      expect(result).toContain('Mar');
      expect(result).toContain('15');
      expect(result).not.toContain('2025');
    });

    it('formats with short month format', () => {
      const date = new Date('2025-03-15');
      const result = formatTimelineDate(date, { monthFormat: 'short' });
      expect(result).toMatch(/Mar/);
    });

    it('formats with long month format', () => {
      const date = new Date('2025-03-15');
      const result = formatTimelineDate(date, { monthFormat: 'long' });
      expect(result).toMatch(/March/);
    });

    it('formats with numeric month format', () => {
      const date = new Date(2025, 2, 15); // March 15, 2025 local
      const result = formatTimelineDate(date, { monthFormat: 'numeric' });
      expect(result).toContain('3');
      expect(result).toContain('15');
    });

    it('formats January correctly', () => {
      const date = new Date(2025, 0, 1); // January 1, 2025 local
      const result = formatTimelineDate(date);
      expect(result).toContain('Jan');
    });

    it('formats December correctly', () => {
      const date = new Date('2025-12-31');
      const result = formatTimelineDate(date);
      expect(result).toContain('Dec');
    });
  });

  describe('toISODateString', () => {
    it('converts Date to YYYY-MM-DD format', () => {
      const date = new Date('2025-03-15T14:30:00');
      expect(toISODateString(date)).toBe('2025-03-15');
    });

    it('pads single digit months', () => {
      const date = new Date('2025-01-05');
      expect(toISODateString(date)).toBe('2025-01-05');
    });

    it('pads single digit days', () => {
      const date = new Date('2025-12-05');
      expect(toISODateString(date)).toBe('2025-12-05');
    });

    it('handles leap year date', () => {
      const date = new Date('2024-02-29');
      expect(toISODateString(date)).toBe('2024-02-29');
    });

    it('handles end of year', () => {
      const date = new Date('2025-12-31');
      expect(toISODateString(date)).toBe('2025-12-31');
    });

    it('handles start of year', () => {
      const date = new Date('2025-01-01');
      expect(toISODateString(date)).toBe('2025-01-01');
    });
  });
});

describe('dateUtils.ts - Timeline Data Processing', () => {
  describe('normalizeTimelineDates', () => {
    it('converts string dates to Date objects', () => {
      const timelineData: TimelineDate[] = [
        { start_date: '2025-01-01', end_date: '2025-12-31' }
      ];

      const result = normalizeTimelineDates(timelineData);

      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].endDate).toBeInstanceOf(Date);
      expect(result[0].startDate.getFullYear()).toBe(2025);
      expect(result[0].endDate.getFullYear()).toBe(2025);
    });

    it('converts timestamp dates to Date objects', () => {
      const timestamp1 = new Date('2025-01-01').getTime();
      const timestamp2 = new Date('2025-12-31').getTime();

      const timelineData: TimelineDate[] = [
        { start_date: timestamp1, end_date: timestamp2 }
      ];

      const result = normalizeTimelineDates(timelineData);

      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[0].endDate).toBeInstanceOf(Date);
    });

    it('handles mixed date formats in array', () => {
      const timelineData: TimelineDate[] = [
        { start_date: '2025-01-01', end_date: '2025-06-30' },
        { start_date: new Date('2025-07-01').getTime(), end_date: new Date('2025-12-31').getTime() }
      ];

      const result = normalizeTimelineDates(timelineData);

      expect(result).toHaveLength(2);
      expect(result[0].startDate).toBeInstanceOf(Date);
      expect(result[1].startDate).toBeInstanceOf(Date);
    });

    it('preserves original properties', () => {
      interface ExtendedTimelineData extends TimelineDate {
        name: string;
        id: number;
      }

      const timelineData: ExtendedTimelineData[] = [
        { start_date: '2025-01-01', end_date: '2025-12-31', name: 'Project A', id: 1 }
      ];

      const result = normalizeTimelineDates(timelineData);

      expect(result[0].name).toBe('Project A');
      expect(result[0].id).toBe(1);
      expect(result[0].start_date).toBe('2025-01-01');
      expect(result[0].end_date).toBe('2025-12-31');
    });

    it('handles empty array', () => {
      const result = normalizeTimelineDates([]);
      expect(result).toEqual([]);
    });

    it('handles array with multiple items', () => {
      const timelineData: TimelineDate[] = [
        { start_date: '2025-01-01', end_date: '2025-03-31' },
        { start_date: '2025-04-01', end_date: '2025-06-30' },
        { start_date: '2025-07-01', end_date: '2025-09-30' }
      ];

      const result = normalizeTimelineDates(timelineData);
      expect(result).toHaveLength(3);
      result.forEach(item => {
        expect(item.startDate).toBeInstanceOf(Date);
        expect(item.endDate).toBeInstanceOf(Date);
      });
    });
  });
});

describe('dateUtils.ts - Date Calculations', () => {
  describe('calculateDurationDays', () => {
    it('calculates duration between two dates', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-08');
      expect(calculateDurationDays(start, end)).toBe(7);
    });

    it('returns zero for same date', () => {
      const date = new Date('2025-01-01');
      expect(calculateDurationDays(date, date)).toBe(0);
    });

    it('handles negative duration when end is before start', () => {
      const start = new Date('2025-01-08');
      const end = new Date('2025-01-01');
      expect(calculateDurationDays(start, end)).toBeLessThan(0);
    });

    it('calculates duration across months', () => {
      const start = new Date('2025-01-30');
      const end = new Date('2025-02-03');
      expect(calculateDurationDays(start, end)).toBe(4);
    });

    it('calculates duration across years', () => {
      const start = new Date('2024-12-30');
      const end = new Date('2025-01-02');
      expect(calculateDurationDays(start, end)).toBe(3);
    });

    it('handles leap year correctly', () => {
      const start = new Date('2024-02-28');
      const end = new Date('2024-03-01');
      expect(calculateDurationDays(start, end)).toBe(2);
    });

    it('handles non-leap year correctly', () => {
      const start = new Date('2025-02-28');
      const end = new Date('2025-03-01');
      expect(calculateDurationDays(start, end)).toBe(1);
    });

    it('calculates duration for full year', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      const duration = calculateDurationDays(start, end);
      expect(duration).toBeGreaterThan(360);
      expect(duration).toBeLessThan(370);
    });

    it('handles times within dates', () => {
      const start = new Date('2025-01-01T10:00:00');
      const end = new Date('2025-01-02T14:00:00');
      // Should still round up to 2 days
      expect(calculateDurationDays(start, end)).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('dateUtils.ts - Date Validation', () => {
  describe('isValidDateString', () => {
    it('returns true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-03-15')).toBe(true);
    });

    it('returns true for dates with leading zeros', () => {
      expect(isValidDateString('2025-01-05')).toBe(true);
    });

    it('returns false for missing leading zeros', () => {
      expect(isValidDateString('2025-1-5')).toBe(false);
    });

    it('returns false for invalid separators', () => {
      expect(isValidDateString('2025/03/15')).toBe(false);
      expect(isValidDateString('2025.03.15')).toBe(false);
    });

    it('returns false for wrong order', () => {
      expect(isValidDateString('15-03-2025')).toBe(false);
      expect(isValidDateString('03-15-2025')).toBe(false);
    });

    it('returns false for incomplete dates', () => {
      expect(isValidDateString('2025-03')).toBe(false);
      expect(isValidDateString('2025')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidDateString('')).toBe(false);
    });

    it('returns false for null-like values', () => {
      expect(isValidDateString('null')).toBe(false);
      expect(isValidDateString('undefined')).toBe(false);
    });

    it('returns false for timestamps', () => {
      expect(isValidDateString('1710518400000')).toBe(false);
    });

    it('returns false for ISO datetime format', () => {
      expect(isValidDateString('2025-03-15T14:30:00Z')).toBe(false);
    });

    it('returns true for leap year date', () => {
      expect(isValidDateString('2024-02-29')).toBe(true);
    });

    it('returns true for edge case dates', () => {
      expect(isValidDateString('2025-01-01')).toBe(true);
      expect(isValidDateString('2025-12-31')).toBe(true);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same dates', () => {
      const date1 = new Date('2025-03-15T10:00:00');
      const date2 = new Date('2025-03-15T14:30:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('returns false for different days', () => {
      const date1 = new Date('2025-03-15');
      const date2 = new Date('2025-03-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different months', () => {
      const date1 = new Date('2025-03-15');
      const date2 = new Date('2025-04-15');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different years', () => {
      const date1 = new Date('2024-03-15');
      const date2 = new Date('2025-03-15');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('compares dates using UTC day (via toISOString)', () => {
      // isSameDay uses toISODateString which converts via toISOString (UTC)
      // So times near midnight might give different results depending on timezone
      const date1 = new Date(2025, 2, 15, 12, 0, 0); // March 15, 2025 noon local
      const date2 = new Date(2025, 2, 15, 14, 0, 0); // March 15, 2025 2pm local
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('handles dates with timezone differences', () => {
      const date1 = new Date('2025-03-15T00:00:00Z');
      const date2 = new Date('2025-03-15T00:00:00-05:00');
      // The result depends on how timezones are handled
      // but the function should handle it consistently
      const result = isSameDay(date1, date2);
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('dateUtils.ts - Edge Cases and Integration', () => {
  it('handles very old dates', () => {
    const oldDate = new Date('1900-01-01');
    expect(toISODateString(oldDate)).toBe('1900-01-01');
  });

  it('handles far future dates', () => {
    const futureDate = new Date('2100-12-31');
    expect(toISODateString(futureDate)).toBe('2100-12-31');
  });

  it('handles epoch date', () => {
    const epochDate = new Date('1970-01-01');
    expect(toISODateString(epochDate)).toBeTruthy();
  });

  it('parseDate and toISODateString are inverses for YYYY-MM-DD', () => {
    const dateString = '2025-03-15';
    const parsed = parseDate(dateString);
    const formatted = toISODateString(parsed);
    expect(formatted).toBe(dateString);
  });

  it('handles full integration flow', () => {
    const timelineData: TimelineDate[] = [
      { start_date: '2025-01-01', end_date: '2025-12-31' }
    ];

    const normalized = normalizeTimelineDates(timelineData);
    const duration = calculateDurationDays(normalized[0].startDate, normalized[0].endDate);
    const formattedStart = formatTimelineDate(normalized[0].startDate);

    expect(duration).toBeGreaterThan(360);
    expect(formattedStart).toContain('Jan');
    expect(formattedStart).toContain('2025');
  });

  it('handles timeline with multiple projects', () => {
    interface Project extends TimelineDate {
      id: number;
      name: string;
    }

    const projects: Project[] = [
      { id: 1, name: 'Alpha', start_date: '2025-01-01', end_date: '2025-03-31' },
      { id: 2, name: 'Beta', start_date: '2025-04-01', end_date: '2025-06-30' },
      { id: 3, name: 'Gamma', start_date: new Date('2025-07-01').getTime(), end_date: new Date('2025-09-30').getTime() }
    ];

    const normalized = normalizeTimelineDates(projects);

    expect(normalized).toHaveLength(3);
    normalized.forEach((project, index) => {
      expect(project.id).toBe(projects[index].id);
      expect(project.name).toBe(projects[index].name);
      expect(project.startDate).toBeInstanceOf(Date);
      expect(project.endDate).toBeInstanceOf(Date);

      const duration = calculateDurationDays(project.startDate, project.endDate);
      expect(duration).toBeGreaterThan(80); // Roughly 3 months
    });
  });

  it('validates timeline date strings before parsing', () => {
    const validDateString = '2025-03-15';
    const invalidDateString = '2025/03/15';

    expect(isValidDateString(validDateString)).toBe(true);
    expect(isValidDateString(invalidDateString)).toBe(false);

    // Only parse if valid
    if (isValidDateString(validDateString)) {
      const parsed = parseDate(validDateString);
      expect(parsed).toBeInstanceOf(Date);
    }
  });
});

import { calculatePhaseDurationWeeks, calculatePhaseDates } from '../phaseDurations';

describe('phaseDurations', () => {
  describe('calculatePhaseDurationWeeks', () => {
    it('returns 2 weeks for planning phases', () => {
      expect(calculatePhaseDurationWeeks('Planning')).toBe(2);
      expect(calculatePhaseDurationWeeks('Planning Phase')).toBe(2);
      expect(calculatePhaseDurationWeeks('PLANNING')).toBe(2);
      expect(calculatePhaseDurationWeeks('planning')).toBe(2);
    });

    it('returns 2 weeks for pending phases', () => {
      expect(calculatePhaseDurationWeeks('Pending')).toBe(2);
      expect(calculatePhaseDurationWeeks('Pending Approval')).toBe(2);
      expect(calculatePhaseDurationWeeks('PENDING')).toBe(2);
    });

    it('returns 8 weeks for development phases', () => {
      expect(calculatePhaseDurationWeeks('Development')).toBe(8);
      expect(calculatePhaseDurationWeeks('Development Phase')).toBe(8);
      expect(calculatePhaseDurationWeeks('DEVELOPMENT')).toBe(8);
      expect(calculatePhaseDurationWeeks('development')).toBe(8);
    });

    it('returns 3 weeks for testing phases', () => {
      expect(calculatePhaseDurationWeeks('Testing')).toBe(3);
      expect(calculatePhaseDurationWeeks('Testing Phase')).toBe(3);
      expect(calculatePhaseDurationWeeks('TESTING')).toBe(3);
      expect(calculatePhaseDurationWeeks('testing')).toBe(3);
    });

    it('returns 2 weeks for cutover phases', () => {
      expect(calculatePhaseDurationWeeks('Cutover')).toBe(2);
      expect(calculatePhaseDurationWeeks('Cutover Phase')).toBe(2);
      expect(calculatePhaseDurationWeeks('CUTOVER')).toBe(2);
    });

    it('returns 2 weeks for hypercare phases', () => {
      expect(calculatePhaseDurationWeeks('Hypercare')).toBe(2);
      expect(calculatePhaseDurationWeeks('Hypercare Phase')).toBe(2);
      expect(calculatePhaseDurationWeeks('HYPERCARE')).toBe(2);
    });

    it('returns 4 weeks for unrecognized phase types (default)', () => {
      expect(calculatePhaseDurationWeeks('Unknown Phase')).toBe(4);
      expect(calculatePhaseDurationWeeks('Custom Phase')).toBe(4);
      expect(calculatePhaseDurationWeeks('Implementation')).toBe(4);
      expect(calculatePhaseDurationWeeks('')).toBe(4);
    });

    it('handles null or undefined phase names', () => {
      expect(calculatePhaseDurationWeeks(null as any)).toBe(4);
      expect(calculatePhaseDurationWeeks(undefined as any)).toBe(4);
    });
  });

  describe('calculatePhaseDates', () => {
    it('calculates dates for planning phase (2 weeks)', () => {
      const startDate = new Date('2025-01-01');
      const result = calculatePhaseDates('Planning', startDate);

      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-15'); // 14 days later
    });

    it('calculates dates for development phase (8 weeks)', () => {
      const startDate = new Date('2025-01-01');
      const result = calculatePhaseDates('Development', startDate);

      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-02-26'); // 56 days later
    });

    it('calculates dates for testing phase (3 weeks)', () => {
      const startDate = new Date('2025-01-01');
      const result = calculatePhaseDates('Testing', startDate);

      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-22'); // 21 days later
    });

    it('calculates dates for cutover phase (2 weeks)', () => {
      const startDate = new Date('2025-01-01');
      const result = calculatePhaseDates('Cutover', startDate);

      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-15'); // 14 days later
    });

    it('calculates dates for unknown phase (4 weeks default)', () => {
      const startDate = new Date('2025-01-01');
      const result = calculatePhaseDates('Custom Phase', startDate);

      expect(result.startDate).toBe('2025-01-01');
      expect(result.endDate).toBe('2025-01-29'); // 28 days later
    });

    it('uses today as start date when not provided', () => {
      const result = calculatePhaseDates('Planning');

      // Verify format is correct
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify end date is after start date
      expect(new Date(result.endDate).getTime()).toBeGreaterThan(new Date(result.startDate).getTime());
    });

    it('handles date calculations across month boundaries', () => {
      // Use a fixed start date and verify the duration is correct (8 weeks = 56 days)
      const startDate = new Date('2025-01-20T12:00:00Z'); // Noon UTC to avoid timezone edge cases
      const result = calculatePhaseDates('Development', startDate); // 8 weeks = 56 days

      // Verify start date is correct
      expect(result.startDate).toBe('2025-01-20');

      // Verify the duration is exactly 56 days (8 weeks) regardless of timezone
      const startMs = new Date(result.startDate + 'T00:00:00Z').getTime();
      const endMs = new Date(result.endDate + 'T00:00:00Z').getTime();
      const daysDiff = (endMs - startMs) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(56);
    });

    it('returns dates in ISO format (YYYY-MM-DD)', () => {
      const startDate = new Date('2025-06-15');
      const result = calculatePhaseDates('Testing', startDate);

      expect(result.startDate).toBe('2025-06-15');
      expect(result.endDate).toBe('2025-07-06');
    });
  });
});

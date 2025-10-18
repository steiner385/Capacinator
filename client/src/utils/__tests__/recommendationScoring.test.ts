import {
  calculateRoleBasedScore,
  calculatePriorityBasedScore,
  calculateSuggestedAllocation,
  type FitLevel
} from '../recommendationScoring';

describe('recommendationScoring', () => {
  describe('calculateRoleBasedScore', () => {
    describe('excellent fit (≥80% match)', () => {
      it('scores 100% match as excellent fit', () => {
        const result = calculateRoleBasedScore(2, 2, 'Software Engineer');

        expect(result.score).toBe(1.0);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Perfect match as Software Engineer');
      });

      it('scores 80% match as excellent fit', () => {
        const result = calculateRoleBasedScore(4, 5, 'Developer');

        expect(result.score).toBe(0.8);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Perfect match as Developer');
      });

      it('scores 90% match as excellent fit', () => {
        const result = calculateRoleBasedScore(9, 10, 'Product Manager');

        expect(result.score).toBe(0.9);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Perfect match as Product Manager');
      });
    });

    describe('good fit (50-79% match)', () => {
      it('scores 50% match as good fit', () => {
        const result = calculateRoleBasedScore(1, 2, 'QA Engineer');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Good fit as QA Engineer');
      });

      it('scores 60% match as good fit', () => {
        const result = calculateRoleBasedScore(3, 5, 'Designer');

        expect(result.score).toBeCloseTo(0.6);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Good fit as Designer');
      });

      it('scores 75% match as good fit', () => {
        const result = calculateRoleBasedScore(3, 4, 'Architect');

        expect(result.score).toBe(0.75);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Good fit as Architect');
      });
    });

    describe('partial fit (<50% match with roles)', () => {
      it('scores 25% match as partial fit', () => {
        const result = calculateRoleBasedScore(1, 4, 'DevOps Engineer');

        expect(result.score).toBe(0.25);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Can contribute as DevOps Engineer');
      });

      it('scores 33% match as partial fit', () => {
        const result = calculateRoleBasedScore(1, 3, 'Analyst');

        expect(result.score).toBeCloseTo(0.33, 2);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Can contribute as Analyst');
      });
    });

    describe('no matching roles', () => {
      it('scores 0% match as partial fit with "Available" message', () => {
        const result = calculateRoleBasedScore(0, 3, 'Developer');

        expect(result.score).toBe(0);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Available as Developer');
      });
    });

    describe('edge cases', () => {
      it('handles missing role name', () => {
        const result = calculateRoleBasedScore(2, 2, '');

        expect(result.score).toBe(1.0);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Perfect match as team member');
      });

      it('handles undefined role name', () => {
        const result = calculateRoleBasedScore(1, 2, undefined as any);

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Good fit as team member');
      });

      it('handles zero total project roles (prevents division by zero)', () => {
        const result = calculateRoleBasedScore(1, 0, 'Developer');

        expect(result.score).toBe(1.0); // 1 / max(0, 1) = 1 / 1 = 1
        expect(result.fitLevel).toBe('excellent');
      });
    });
  });

  describe('calculatePriorityBasedScore', () => {
    describe('high priority (priority 1)', () => {
      it('scores priority 1 as excellent fit', () => {
        const result = calculatePriorityBasedScore(1, 'Senior Developer');

        expect(result.score).toBe(0.9);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Available for high priority project as Senior Developer');
      });
    });

    describe('medium priority (priority 2)', () => {
      it('scores priority 2 as good fit', () => {
        const result = calculatePriorityBasedScore(2, 'Developer');

        expect(result.score).toBe(0.7);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Available for medium priority project as Developer');
      });
    });

    describe('standard priority (priority 3+)', () => {
      it('scores priority 3 as partial fit', () => {
        const result = calculatePriorityBasedScore(3, 'Junior Developer');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Available for standard project as Junior Developer');
      });

      it('scores priority 4 as partial fit', () => {
        const result = calculatePriorityBasedScore(4, 'Intern');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Available for standard project as Intern');
      });

      it('scores priority 10 as partial fit', () => {
        const result = calculatePriorityBasedScore(10, 'Contractor');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('partial');
        expect(result.reason).toBe('Available for standard project as Contractor');
      });
    });

    describe('edge cases', () => {
      it('handles missing role name', () => {
        const result = calculatePriorityBasedScore(1, '');

        expect(result.score).toBe(0.9);
        expect(result.fitLevel).toBe('excellent');
        expect(result.reason).toBe('Available for high priority project as team member');
      });

      it('handles undefined role name', () => {
        const result = calculatePriorityBasedScore(2, undefined as any);

        expect(result.score).toBe(0.7);
        expect(result.fitLevel).toBe('good');
        expect(result.reason).toBe('Available for medium priority project as team member');
      });

      it('handles zero priority as standard', () => {
        const result = calculatePriorityBasedScore(0, 'Developer');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('partial');
      });

      it('handles negative priority as standard', () => {
        const result = calculatePriorityBasedScore(-1, 'Developer');

        expect(result.score).toBe(0.5);
        expect(result.fitLevel).toBe('partial');
      });
    });
  });

  describe('calculateSuggestedAllocation', () => {
    describe('high priority projects (priority 1 → 60%)', () => {
      it('suggests 60% for high priority when capacity is sufficient', () => {
        expect(calculateSuggestedAllocation(100, 1)).toBe(60);
        expect(calculateSuggestedAllocation(80, 1)).toBe(60);
        expect(calculateSuggestedAllocation(60, 1)).toBe(60);
      });

      it('caps at remaining capacity when less than 60%', () => {
        expect(calculateSuggestedAllocation(50, 1)).toBe(50);
        expect(calculateSuggestedAllocation(30, 1)).toBe(30);
        expect(calculateSuggestedAllocation(10, 1)).toBe(10);
        expect(calculateSuggestedAllocation(0, 1)).toBe(0);
      });
    });

    describe('medium priority projects (priority 2 → 40%)', () => {
      it('suggests 40% for medium priority when capacity is sufficient', () => {
        expect(calculateSuggestedAllocation(100, 2)).toBe(40);
        expect(calculateSuggestedAllocation(60, 2)).toBe(40);
        expect(calculateSuggestedAllocation(40, 2)).toBe(40);
      });

      it('caps at remaining capacity when less than 40%', () => {
        expect(calculateSuggestedAllocation(30, 2)).toBe(30);
        expect(calculateSuggestedAllocation(20, 2)).toBe(20);
        expect(calculateSuggestedAllocation(5, 2)).toBe(5);
      });
    });

    describe('standard priority projects (priority 3+ → 20%)', () => {
      it('suggests 20% for standard priority when capacity is sufficient', () => {
        expect(calculateSuggestedAllocation(100, 3)).toBe(20);
        expect(calculateSuggestedAllocation(50, 3)).toBe(20);
        expect(calculateSuggestedAllocation(20, 3)).toBe(20);
      });

      it('caps at remaining capacity when less than 20%', () => {
        expect(calculateSuggestedAllocation(15, 3)).toBe(15);
        expect(calculateSuggestedAllocation(10, 4)).toBe(10);
        expect(calculateSuggestedAllocation(5, 10)).toBe(5);
      });
    });

    describe('edge cases', () => {
      it('handles 0% remaining capacity', () => {
        expect(calculateSuggestedAllocation(0, 1)).toBe(0);
        expect(calculateSuggestedAllocation(0, 2)).toBe(0);
        expect(calculateSuggestedAllocation(0, 3)).toBe(0);
      });

      it('handles negative capacity (unusual but defensive)', () => {
        expect(calculateSuggestedAllocation(-10, 1)).toBe(-10); // Math.min will cap to capacity
        expect(calculateSuggestedAllocation(-5, 2)).toBe(-5);
      });

      it('handles priorities beyond expected range', () => {
        expect(calculateSuggestedAllocation(100, 0)).toBe(20); // Treated as standard
        expect(calculateSuggestedAllocation(100, 100)).toBe(20); // Treated as standard
      });
    });

    describe('real-world scenarios', () => {
      it('high priority project with person at 80% utilization', () => {
        const remainingCapacity = 20;
        expect(calculateSuggestedAllocation(remainingCapacity, 1)).toBe(20);
        // Would like to assign 60%, but only 20% available
      });

      it('medium priority project with person at 50% utilization', () => {
        const remainingCapacity = 50;
        expect(calculateSuggestedAllocation(remainingCapacity, 2)).toBe(40);
        // Assign 40% as suggested for medium priority
      });

      it('standard project with fully available person', () => {
        const remainingCapacity = 100;
        expect(calculateSuggestedAllocation(remainingCapacity, 3)).toBe(20);
        // Conservative 20% allocation for standard priority
      });

      it('high priority project with overallocated person', () => {
        const remainingCapacity = -10; // Over-allocated
        expect(calculateSuggestedAllocation(remainingCapacity, 1)).toBe(-10);
        // Still suggests allocation (negative), UI can handle warning
      });
    });
  });
});

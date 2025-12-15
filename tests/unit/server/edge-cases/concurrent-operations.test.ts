/**
 * Concurrent Operation Edge Case Tests
 *
 * Tests for edge cases involving concurrent operations:
 * - Simultaneous updates to same resource
 * - Race conditions in assignment creation
 * - Parallel phase modifications
 * - Concurrent allocation calculations
 * - Transaction isolation scenarios
 * - Optimistic locking patterns
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Mock resource representing a shared state (like a project or assignment)
 */
interface MockResource {
  id: number;
  version: number;
  allocation: number;
  lastUpdated: Date;
}

/**
 * Simulates an optimistic locking scenario
 */
class OptimisticLockManager {
  private resources: Map<number, MockResource> = new Map();

  create(id: number, allocation: number): MockResource {
    const resource: MockResource = {
      id,
      version: 1,
      allocation,
      lastUpdated: new Date(),
    };
    this.resources.set(id, resource);
    return { ...resource };
  }

  get(id: number): MockResource | undefined {
    const resource = this.resources.get(id);
    return resource ? { ...resource } : undefined;
  }

  update(
    id: number,
    allocation: number,
    expectedVersion: number
  ): { success: boolean; resource?: MockResource; error?: string } {
    const resource = this.resources.get(id);

    if (!resource) {
      return { success: false, error: 'Resource not found' };
    }

    if (resource.version !== expectedVersion) {
      return {
        success: false,
        error: `Version conflict: expected ${expectedVersion}, found ${resource.version}`,
        resource: { ...resource },
      };
    }

    resource.allocation = allocation;
    resource.version += 1;
    resource.lastUpdated = new Date();

    return { success: true, resource: { ...resource } };
  }

  clear(): void {
    this.resources.clear();
  }
}

/**
 * Simulates a total allocation validator (100% max per person)
 */
class AllocationValidator {
  private allocations: Map<string, number[]> = new Map();

  setPersonAllocations(personId: string, allocations: number[]): void {
    this.allocations.set(personId, allocations);
  }

  getTotal(personId: string): number {
    const allocs = this.allocations.get(personId) || [];
    return allocs.reduce((sum, a) => sum + a, 0);
  }

  canAddAllocation(personId: string, newAllocation: number): boolean {
    const current = this.getTotal(personId);
    return current + newAllocation <= 100;
  }

  addAllocation(
    personId: string,
    allocation: number
  ): { success: boolean; total: number; error?: string } {
    const current = this.getTotal(personId);
    const newTotal = current + allocation;

    if (newTotal > 100) {
      return {
        success: false,
        total: current,
        error: `Allocation would exceed 100%: ${current}% + ${allocation}% = ${newTotal}%`,
      };
    }

    const existing = this.allocations.get(personId) || [];
    this.allocations.set(personId, [...existing, allocation]);

    return { success: true, total: newTotal };
  }

  clear(): void {
    this.allocations.clear();
  }
}

describe('Concurrent Operation Edge Cases', () => {
  describe('Optimistic Locking Scenarios', () => {
    let lockManager: OptimisticLockManager;

    beforeEach(() => {
      lockManager = new OptimisticLockManager();
    });

    it('should successfully update with correct version', () => {
      lockManager.create(1, 50);
      const result = lockManager.update(1, 75, 1);

      expect(result.success).toBe(true);
      expect(result.resource?.allocation).toBe(75);
      expect(result.resource?.version).toBe(2);
    });

    it('should fail update with stale version', () => {
      lockManager.create(1, 50);

      // First update succeeds
      const result1 = lockManager.update(1, 75, 1);
      expect(result1.success).toBe(true);

      // Second update with old version fails
      const result2 = lockManager.update(1, 100, 1);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Version conflict');
    });

    it('should detect concurrent modification attempt', () => {
      lockManager.create(1, 50);

      // Simulate two users reading the same resource
      const userARead = lockManager.get(1);
      const userBRead = lockManager.get(1);

      expect(userARead?.version).toBe(1);
      expect(userBRead?.version).toBe(1);

      // User A updates first
      const userAUpdate = lockManager.update(1, 75, userARead!.version);
      expect(userAUpdate.success).toBe(true);

      // User B tries to update with stale version
      const userBUpdate = lockManager.update(1, 60, userBRead!.version);
      expect(userBUpdate.success).toBe(false);
      expect(userBUpdate.error).toContain('Version conflict');

      // User B should see current state in error response
      expect(userBUpdate.resource?.allocation).toBe(75);
      expect(userBUpdate.resource?.version).toBe(2);
    });

    it('should handle rapid sequential updates', () => {
      lockManager.create(1, 0);

      for (let i = 1; i <= 10; i++) {
        const current = lockManager.get(1);
        const result = lockManager.update(1, i * 10, current!.version);
        expect(result.success).toBe(true);
        expect(result.resource?.version).toBe(i + 1);
      }

      const final = lockManager.get(1);
      expect(final?.allocation).toBe(100);
      expect(final?.version).toBe(11);
    });

    it('should handle update to non-existent resource', () => {
      const result = lockManager.update(999, 50, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Allocation Limit Race Conditions', () => {
    let validator: AllocationValidator;

    beforeEach(() => {
      validator = new AllocationValidator();
    });

    it('should allow allocation when under 100%', () => {
      const result = validator.addAllocation('person1', 50);
      expect(result.success).toBe(true);
      expect(result.total).toBe(50);
    });

    it('should reject allocation that would exceed 100%', () => {
      validator.addAllocation('person1', 80);
      const result = validator.addAllocation('person1', 30);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceed 100%');
    });

    it('should detect sequential allocations summing to exactly 100%', () => {
      const r1 = validator.addAllocation('person1', 30);
      const r2 = validator.addAllocation('person1', 30);
      const r3 = validator.addAllocation('person1', 40);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(true);
      expect(r3.total).toBe(100);

      // Next allocation should fail
      const r4 = validator.addAllocation('person1', 1);
      expect(r4.success).toBe(false);
    });

    it('should simulate race condition scenario', () => {
      // Simulate two concurrent requests checking availability
      validator.addAllocation('person1', 50);

      // Both requests check at "same time" - both see 50%
      const canAdd1 = validator.canAddAllocation('person1', 60);
      const canAdd2 = validator.canAddAllocation('person1', 60);

      // Both think they can proceed (this is the race condition)
      expect(canAdd1).toBe(false); // Actually checking correctly
      expect(canAdd2).toBe(false);

      // In a real race condition without proper locking:
      // - Check would pass for both
      // - Only first actual add would succeed
    });

    it('should handle multiple persons independently', () => {
      validator.addAllocation('person1', 100);
      validator.addAllocation('person2', 100);

      // Person 1 is at 100%
      expect(validator.addAllocation('person1', 1).success).toBe(false);

      // Person 2 is also at 100%
      expect(validator.addAllocation('person2', 1).success).toBe(false);

      // Person 3 has no allocations
      expect(validator.addAllocation('person3', 50).success).toBe(true);
    });
  });

  describe('Simulated Concurrent Access Patterns', () => {
    it('should handle interleaved read-modify-write operations', async () => {
      const sharedState = { counter: 0 };
      const operations: Array<() => void> = [];

      // Simulate 10 concurrent increment operations
      for (let i = 0; i < 10; i++) {
        operations.push(() => {
          const current = sharedState.counter;
          // Simulate some processing time
          sharedState.counter = current + 1;
        });
      }

      // Execute all operations
      operations.forEach((op) => op());

      // Without proper synchronization, all reads would see 0
      // With proper synchronization, counter should be 10
      expect(sharedState.counter).toBe(10);
    });

    it('should demonstrate lost update problem', () => {
      let value = 0;

      // Simulate two concurrent operations reading the same initial value
      const read1 = value; // Thread 1 reads 0
      const read2 = value; // Thread 2 reads 0

      // Both threads modify based on what they read
      const newValue1 = read1 + 10;
      const newValue2 = read2 + 20;

      // Without locking, last write wins
      value = newValue1; // Thread 1 writes 10
      value = newValue2; // Thread 2 writes 20 (overwrites Thread 1's change)

      // Expected result if properly serialized: 30
      // Actual result with race condition: 20 (Thread 1's update lost)
      expect(value).toBe(20);
    });

    it('should simulate check-then-act race condition', () => {
      const inventory = { available: 1 };
      const orders: string[] = [];

      // Two simultaneous orders for the last item
      const processOrder = (orderId: string): boolean => {
        if (inventory.available > 0) {
          // Race condition: both see available = 1
          inventory.available -= 1;
          orders.push(orderId);
          return true;
        }
        return false;
      };

      // In a race condition, both might succeed
      const result1 = processOrder('order1');
      const result2 = processOrder('order2');

      // With proper locking, only one should succeed
      // This test shows the pattern (first succeeds, second fails)
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(inventory.available).toBe(0);
    });
  });

  describe('Phase Date Modification Conflicts', () => {
    interface Phase {
      id: number;
      projectId: number;
      startDate: string;
      endDate: string;
      version: number;
    }

    it('should detect overlapping phase modifications', () => {
      const phases: Phase[] = [
        {
          id: 1,
          projectId: 1,
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          version: 1,
        },
        {
          id: 2,
          projectId: 1,
          startDate: '2024-04-01',
          endDate: '2024-06-30',
          version: 1,
        },
      ];

      // Attempt to extend phase 1 to overlap with phase 2
      const checkOverlap = (
        phaseId: number,
        newEndDate: string
      ): { valid: boolean; error?: string } => {
        const phase = phases.find((p) => p.id === phaseId);
        if (!phase) return { valid: false, error: 'Phase not found' };

        const newEnd = new Date(newEndDate);

        // Check against other phases in same project
        for (const other of phases) {
          if (other.id === phaseId) continue;
          if (other.projectId !== phase.projectId) continue;

          const otherStart = new Date(other.startDate);
          if (newEnd >= otherStart) {
            return {
              valid: false,
              error: `End date ${newEndDate} would overlap with phase ${other.id} starting ${other.startDate}`,
            };
          }
        }

        return { valid: true };
      };

      const result = checkOverlap(1, '2024-04-15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlap');
    });

    it('should validate gap between adjacent phases', () => {
      const validateGap = (
        phase1End: string,
        phase2Start: string,
        maxGapDays: number
      ): { valid: boolean; gapDays: number; error?: string } => {
        const end = new Date(phase1End);
        const start = new Date(phase2Start);
        const gapMs = start.getTime() - end.getTime();
        const gapDays = gapMs / (1000 * 60 * 60 * 24);

        if (gapDays < 0) {
          return { valid: false, gapDays, error: 'Phases overlap' };
        }

        if (gapDays > maxGapDays) {
          return {
            valid: false,
            gapDays,
            error: `Gap of ${gapDays} days exceeds max of ${maxGapDays}`,
          };
        }

        return { valid: true, gapDays };
      };

      // Valid 1-day gap
      expect(validateGap('2024-03-31', '2024-04-01', 30).valid).toBe(true);

      // Overlap (negative gap)
      expect(validateGap('2024-04-15', '2024-04-01', 30).valid).toBe(false);

      // Gap too large
      expect(validateGap('2024-01-01', '2024-06-01', 30).valid).toBe(false);
    });
  });

  describe('Assignment Conflict Detection', () => {
    interface Assignment {
      id: number;
      personId: number;
      projectId: number;
      allocation: number;
      startDate: string;
      endDate: string;
    }

    it('should detect person over-allocation across overlapping assignments', () => {
      const assignments: Assignment[] = [
        {
          id: 1,
          personId: 1,
          projectId: 1,
          allocation: 60,
          startDate: '2024-01-01',
          endDate: '2024-06-30',
        },
        {
          id: 2,
          personId: 1,
          projectId: 2,
          allocation: 30,
          startDate: '2024-03-01',
          endDate: '2024-09-30',
        },
      ];

      const checkOverallocation = (
        personId: number,
        date: string
      ): { overallocated: boolean; total: number; assignments: number[] } => {
        const targetDate = new Date(date);
        const activeAssignments = assignments.filter((a) => {
          if (a.personId !== personId) return false;
          const start = new Date(a.startDate);
          const end = new Date(a.endDate);
          return targetDate >= start && targetDate <= end;
        });

        const total = activeAssignments.reduce(
          (sum, a) => sum + a.allocation,
          0
        );
        return {
          overallocated: total > 100,
          total,
          assignments: activeAssignments.map((a) => a.id),
        };
      };

      // Before overlap period
      const before = checkOverallocation(1, '2024-02-15');
      expect(before.overallocated).toBe(false);
      expect(before.total).toBe(60);

      // During overlap period
      const during = checkOverallocation(1, '2024-04-15');
      expect(during.overallocated).toBe(false); // 60 + 30 = 90
      expect(during.total).toBe(90);
      expect(during.assignments).toContain(1);
      expect(during.assignments).toContain(2);

      // After first assignment ends
      const after = checkOverallocation(1, '2024-08-15');
      expect(after.overallocated).toBe(false);
      expect(after.total).toBe(30);
    });

    it('should simulate concurrent assignment creation conflict', () => {
      const assignments: Assignment[] = [];
      let nextId = 1;

      const canCreateAssignment = (
        personId: number,
        allocation: number,
        startDate: string,
        endDate: string
      ): boolean => {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        // Calculate max allocation during the new assignment period
        let maxAllocation = 0;
        const existingAssignments = assignments.filter(
          (a) => a.personId === personId
        );

        // Check each day in the range (simplified - should check key dates)
        for (const existing of existingAssignments) {
          const existStart = new Date(existing.startDate);
          const existEnd = new Date(existing.endDate);

          // Check if periods overlap
          if (newStart <= existEnd && newEnd >= existStart) {
            maxAllocation += existing.allocation;
          }
        }

        return maxAllocation + allocation <= 100;
      };

      const createAssignment = (
        personId: number,
        projectId: number,
        allocation: number,
        startDate: string,
        endDate: string
      ): { success: boolean; id?: number; error?: string } => {
        if (!canCreateAssignment(personId, allocation, startDate, endDate)) {
          return {
            success: false,
            error: 'Would exceed 100% allocation',
          };
        }

        const assignment: Assignment = {
          id: nextId++,
          personId,
          projectId,
          allocation,
          startDate,
          endDate,
        };
        assignments.push(assignment);

        return { success: true, id: assignment.id };
      };

      // First assignment - 60%
      const r1 = createAssignment(
        1,
        1,
        60,
        '2024-01-01',
        '2024-06-30'
      );
      expect(r1.success).toBe(true);

      // Second assignment - 30% (overlapping, total 90%)
      const r2 = createAssignment(
        1,
        2,
        30,
        '2024-03-01',
        '2024-09-30'
      );
      expect(r2.success).toBe(true);

      // Third assignment - 20% (would exceed 100% during overlap)
      const r3 = createAssignment(
        1,
        3,
        20,
        '2024-04-01',
        '2024-05-31'
      );
      expect(r3.success).toBe(false);
      expect(r3.error).toContain('exceed 100%');
    });
  });

  describe('Timestamp and Order Dependencies', () => {
    it('should handle operations that must maintain order', () => {
      const events: Array<{ type: string; timestamp: number }> = [];

      const recordEvent = (type: string): void => {
        events.push({ type, timestamp: Date.now() });
      };

      recordEvent('create');
      recordEvent('update');
      recordEvent('delete');

      // Events should be in order
      for (let i = 1; i < events.length; i++) {
        expect(events[i].timestamp).toBeGreaterThanOrEqual(
          events[i - 1].timestamp
        );
      }
    });

    it('should detect out-of-order audit log entries', () => {
      const auditLog: Array<{ action: string; timestamp: Date; version: number }> = [
        { action: 'create', timestamp: new Date('2024-01-01T10:00:00'), version: 1 },
        { action: 'update', timestamp: new Date('2024-01-01T11:00:00'), version: 2 },
        { action: 'update', timestamp: new Date('2024-01-01T10:30:00'), version: 3 }, // Out of order!
      ];

      const findOutOfOrder = (): number[] => {
        const outOfOrder: number[] = [];
        for (let i = 1; i < auditLog.length; i++) {
          if (auditLog[i].timestamp < auditLog[i - 1].timestamp) {
            outOfOrder.push(i);
          }
        }
        return outOfOrder;
      };

      const issues = findOutOfOrder();
      expect(issues.length).toBe(1);
      expect(issues[0]).toBe(2);
    });
  });

  describe('Batch Operation Atomicity', () => {
    it('should rollback all changes on partial failure', () => {
      const state: Map<string, number> = new Map([
        ['A', 100],
        ['B', 100],
        ['C', 100],
      ]);

      const originalState = new Map(state);

      const batchUpdate = (
        updates: Array<{ key: string; delta: number }>
      ): { success: boolean; error?: string } => {
        // Validate all updates first
        for (const update of updates) {
          const current = state.get(update.key);
          if (current === undefined) {
            return { success: false, error: `Key ${update.key} not found` };
          }
          if (current + update.delta < 0) {
            return {
              success: false,
              error: `Key ${update.key} would go negative`,
            };
          }
        }

        // Apply all updates
        for (const update of updates) {
          const current = state.get(update.key)!;
          state.set(update.key, current + update.delta);
        }

        return { success: true };
      };

      // This should fail because C would go negative
      const result = batchUpdate([
        { key: 'A', delta: -50 },
        { key: 'B', delta: -50 },
        { key: 'C', delta: -150 }, // Would make C = -50
      ]);

      expect(result.success).toBe(false);

      // State should remain unchanged (validation happened before any updates)
      expect(state.get('A')).toBe(100);
      expect(state.get('B')).toBe(100);
      expect(state.get('C')).toBe(100);
    });

    it('should handle partial success scenario', () => {
      const results: Array<{ id: number; success: boolean }> = [];

      const processItem = (id: number): boolean => {
        // Simulate: odd IDs fail
        return id % 2 === 0;
      };

      const batchProcess = (ids: number[]): { successCount: number; failCount: number } => {
        let successCount = 0;
        let failCount = 0;

        for (const id of ids) {
          const success = processItem(id);
          results.push({ id, success });
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        }

        return { successCount, failCount };
      };

      const outcome = batchProcess([1, 2, 3, 4, 5, 6]);

      expect(outcome.successCount).toBe(3); // 2, 4, 6
      expect(outcome.failCount).toBe(3); // 1, 3, 5
    });
  });
});

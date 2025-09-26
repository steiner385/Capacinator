# E2E Tests Implementation Plan

## Executive Summary

This document outlines the implementation plan for enabling skipped E2E tests in the Capacinator codebase. The plan addresses conditional test skips, missing UI implementations, and test data requirements.

## Current State Analysis

### Skipped E2E Tests Summary
- **Total Files with Skipped Tests**: 12
- **Main Categories**: 
  1. Conditional skips (data-dependent)
  2. Missing UI features
  3. Performance tests
  4. Visual regression tests

### Test Categories Breakdown

#### 1. **Conditional Skips - Test Data Dependent** (Most common)
These tests skip when specific test data conditions aren't met:

**Utilization Modal Tests** (4 files)
- `utilization-modals-comprehensive.spec.ts`
- `utilization-modals-enhanced.spec.ts`
- `utilization-modals-focused.spec.ts`
- `utilization-modals-flexible.spec.ts`

Common skip conditions:
- No over-utilized person found (>100% allocation)
- No under-utilized person found (<100% allocation)
- No person with available capacity
- No person with removable assignments
- No assignable projects available

**Resolution**: Enhance test data setup to ensure these conditions are always met.

#### 2. **Missing UI Features**
Tests skip when expected UI elements aren't found:

**Assignment Inline Editing** (`assignment-inline-editing.spec.ts`)
- Skips when inline editable fields not found
- Tests expect `[data-editable="true"]` inputs
- Allocation percentage and notes fields need inline editing

**Location Filter** (`utilization-modals-flexible.spec.ts`)
- Location filter component not implemented
- Tests expect select/dropdown for location filtering

**Phase UI Features** (`duplication-ui.spec.ts`)
- Two tests permanently skipped:
  - "should handle after phase placement with dropdown"
  - "keyboard navigation"
- UI implementation incomplete for these features

#### 3. **Environment-Dependent Skips**
- **Visual Regression**: Skips when `VISUAL_REGRESSION` env var not set
- **Performance Tests**: Skip when `RUN_PERFORMANCE_TESTS` not set
- **Scenario Draft Tests**: Skip when no draft scenarios exist

## Implementation Plan

### Phase 1: Test Data Factory Enhancement (Week 1)
**Priority: HIGH**
**Effort: 2-3 days**

#### 1.1 Create Comprehensive E2E Test Data Builder

```typescript
// tests/e2e/helpers/e2e-test-data-builder.ts
export class E2ETestDataBuilder {
  async createUtilizationTestScenario() {
    // Create people with specific utilization levels
    const overUtilized = await this.createPerson({
      name: 'Over Utilized Person',
      assignments: [
        { allocation: 60, project: 'Project A' },
        { allocation: 50, project: 'Project B' }
      ]
    });
    
    const underUtilized = await this.createPerson({
      name: 'Under Utilized Person',
      assignments: [
        { allocation: 30, project: 'Project C' }
      ]
    });
    
    const available = await this.createPerson({
      name: 'Available Person',
      assignments: []
    });
    
    return {
      overUtilized,
      underUtilized,
      available,
      projects: await this.createUnassignedProjects(3)
    };
  }
  
  async createAssignmentTestScenario() {
    // Ensure people have various assignment states
    const people = [];
    
    // Person with removable assignments
    people.push(await this.createPerson({
      name: 'Person With Assignments',
      assignments: [
        { allocation: 40, canRemove: true },
        { allocation: 30, canRemove: true }
      ]
    }));
    
    // Person with capacity for new assignments
    people.push(await this.createPerson({
      name: 'Person With Capacity',
      assignments: [{ allocation: 20 }]
    }));
    
    return { people };
  }
  
  async createScenarioWithDrafts() {
    return this.createScenario({
      name: 'Draft Test Scenario',
      status: 'draft',
      projects: 2,
      assignments: 4
    });
  }
}
```

#### 1.2 Update Test Setup Hooks

```typescript
// tests/e2e/fixtures/index.ts
test.beforeEach(async ({ testDataHelpers }) => {
  // Always create standard test data scenarios
  const utilData = await new E2ETestDataBuilder().createUtilizationTestScenario();
  const assignData = await new E2ETestDataBuilder().createAssignmentTestScenario();
  
  // Store in context for tests
  test.info().annotations.push({
    type: 'testData',
    description: JSON.stringify({ utilData, assignData })
  });
});
```

### Phase 2: UI Component Implementation (Week 2)
**Priority: HIGH**
**Effort: 3-4 days**

#### 2.1 Implement Inline Editing for Assignments Table

```typescript
// client/src/components/assignments/EditableAllocationCell.tsx
export function EditableAllocationCell({ 
  value, 
  assignmentId,
  onUpdate 
}: EditableAllocationCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  return isEditing ? (
    <input
      type="number"
      min="0"
      max="100"
      value={editValue}
      data-editable="true"
      className="inline-edit-input"
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={async () => {
        await onUpdate(assignmentId, editValue);
        setIsEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setEditValue(value);
          setIsEditing(false);
        }
      }}
      autoFocus
    />
  ) : (
    <div 
      onClick={() => setIsEditing(true)}
      className="editable-cell"
      data-testid="editable-allocation"
    >
      {value}%
    </div>
  );
}
```

#### 2.2 Implement Location Filter Component

```typescript
// client/src/components/filters/LocationFilter.tsx
export function LocationFilter({ 
  locations,
  selectedLocation,
  onLocationChange 
}: LocationFilterProps) {
  return (
    <select
      data-testid="location-filter"
      value={selectedLocation || 'all'}
      onChange={(e) => onLocationChange(e.target.value)}
      className="location-filter"
    >
      <option value="all">All Locations</option>
      {locations.map(loc => (
        <option key={loc.id} value={loc.id}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}
```

### Phase 3: Complete Phase Duplication UI (Week 2)
**Priority: MEDIUM**
**Effort: 2 days**

#### 3.1 Fix After Phase Dropdown Functionality

```typescript
// Update phase duplication modal to properly handle after phase selection
const handlePlacementChange = (placement: 'after' | 'beginning' | 'custom') => {
  setPlacement(placement);
  if (placement === 'after') {
    // Ensure after_phase_id dropdown is populated
    setShowAfterPhaseDropdown(true);
  }
};
```

#### 3.2 Implement Keyboard Navigation

```typescript
// Add keyboard event handlers to modal
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Phase 4: Test Infrastructure Updates (Week 3)
**Priority: MEDIUM**
**Effort: 2 days**

#### 4.1 Update Test Helpers

```typescript
// tests/e2e/utils/test-helpers.ts
export async function waitForInlineEdit(page: Page) {
  await page.waitForSelector('[data-editable="true"]', { 
    state: 'attached',
    timeout: 5000 
  });
}

export async function ensureTestDataConditions(page: Page) {
  // Check if required test data exists
  const hasOverUtilized = await page.locator('text=/1[0-9]{2}%/').count() > 0;
  const hasUnderUtilized = await page.locator('text=/[0-8][0-9]%/').count() > 0;
  
  if (!hasOverUtilized || !hasUnderUtilized) {
    // Create missing test data on the fly
    await new E2ETestDataBuilder().createUtilizationTestScenario();
    await page.reload();
  }
}
```

#### 4.2 Update Conditional Skip Logic

```typescript
// Instead of:
if (!overUtilizedRow) {
  test.skip('No over-utilized person found');
  return;
}

// Use:
if (!overUtilizedRow) {
  // Create the required test data
  await testDataHelpers.createOverUtilizedPerson();
  await page.reload();
  overUtilizedRow = await findOverUtilizedRow(page);
}
```

### Phase 5: Environment Configuration (Week 3)
**Priority: LOW**
**Effort: 1 day**

#### 5.1 Create Test Environment Templates

```bash
# .env.e2e.visual
VISUAL_REGRESSION=true
PERCY_TOKEN=<token>

# .env.e2e.performance
RUN_PERFORMANCE_TESTS=true
TEST_TIMEOUT=300000
```

#### 5.2 Update Test Scripts

```json
// package.json
{
  "scripts": {
    "test:e2e:visual": "VISUAL_REGRESSION=true playwright test",
    "test:e2e:performance": "RUN_PERFORMANCE_TESTS=true playwright test --grep @performance",
    "test:e2e:all": "VISUAL_REGRESSION=true RUN_PERFORMANCE_TESTS=true playwright test"
  }
}
```

## Success Metrics

1. **Test Reliability**
   - 0 conditional skips due to missing test data
   - All UI-dependent tests pass consistently
   - < 1% flaky test rate

2. **Test Coverage**
   - All inline editing features tested
   - Location filtering fully tested
   - Phase duplication UI 100% covered

3. **Performance**
   - Test data setup < 5s per test
   - No test timeouts due to data issues
   - Parallel execution maintained

## Implementation Order

1. **Week 1**: Test Data Factory (Phase 1)
   - Implement E2ETestDataBuilder
   - Update test setup hooks
   - Remove conditional skips

2. **Week 2**: UI Components (Phase 2-3)
   - Implement inline editing
   - Add location filter
   - Complete phase duplication UI

3. **Week 3**: Infrastructure (Phase 4-5)
   - Update test helpers
   - Configure environments
   - Final cleanup

## Risk Mitigation

1. **Test Data Conflicts**
   - Use unique prefixes for all test data
   - Implement proper cleanup in afterEach hooks
   - Add data isolation between test runs

2. **UI Implementation Delays**
   - Start with minimal viable implementations
   - Add features incrementally
   - Keep existing functionality intact

3. **Performance Impact**
   - Optimize test data creation
   - Use database transactions
   - Implement data caching where appropriate

## Next Steps

1. Start with Phase 1 - Test Data Factory implementation
2. Create feature branches for each UI component
3. Update tests incrementally as features are added
4. Monitor test execution times and reliability
5. Document any new test patterns or helpers

## Conclusion

This plan focuses on eliminating conditional test skips and implementing missing UI features. By ensuring consistent test data and completing UI implementations, we can achieve 100% test execution without skips.
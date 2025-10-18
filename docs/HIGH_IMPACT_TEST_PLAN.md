# High-Impact Test Coverage Plan

## Executive Summary

**Current Status:** 47.38% overall line coverage (3,046/6,428 lines)
**Target:** 75-80% overall coverage
**Gap:** 27.62-32.62% needed

**Strategic Analysis:** Testing the top 7 high-impact files could yield **+26.31% coverage gain**, bringing overall coverage to **73.69%** - very close to the 75% target.

---

## Coverage Impact Analysis

### Top 7 High-Impact Files (Ranked by Impact Score)

| Rank | File | Lines | Current | Gap | Impact Score | Uncovered |
|------|------|-------|---------|-----|--------------|-----------|
| 1 | InteractiveTimeline.tsx | 517 | 23.79% | 76.21% | 39,401 | 394 |
| 2 | Reports.tsx | 412 | 36.89% | 63.11% | 26,001 | 260 |
| 3 | ReportingController.ts | 259 | 0.77% | 99.23% | 25,701 | 257 |
| 4 | SmartAssignmentModal.tsx | 276 | 22.10% | 77.90% | 21,500 | 215 |
| 5 | AssignmentsController.ts | 277 | 24.90% | 75.10% | 20,803 | 208 |
| 6 | PersonDetails.tsx | 276 | 29.34% | 70.66% | 19,502 | 195 |
| 7 | ScenariosController.ts | 200 | 19.00% | 81.00% | 16,200 | 162 |

**Combined Impact:** 1,691 uncovered lines → **+26.31% potential coverage gain**

---

## Priority 1: ReportingController.ts (Highest ROI)

**Impact Score:** 25,701 | **Lines:** 259 | **Current:** 0.77% | **Target:** 70%+

### Why Priority 1?
- Nearly zero coverage (0.77%) - "green field" for testing
- Server-side controller - easier to test (no React/DOM complexity)
- Critical business logic for reporting features
- High impact-to-effort ratio

### Test Scenarios

#### 1. Capacity Reporting (4-5 tests)
```typescript
describe('getCapacityReport', () => {
  test('retrieves capacity data with role aggregation')
  test('applies date range filters')
  test('calculates FTE correctly')
  test('handles location filtering')
  test('returns 400 for invalid date ranges')
});
```

#### 2. Utilization Reporting (4-5 tests)
```typescript
describe('getUtilizationReport', () => {
  test('calculates person utilization percentages')
  test('identifies over-allocated resources')
  test('identifies under-utilized resources')
  test('aggregates by role')
  test('applies project type filters')
});
```

#### 3. Demand Reporting (4-5 tests)
```typescript
describe('getDemandReport', () => {
  test('aggregates demand by project type')
  test('groups demand by time period')
  test('applies priority filters')
  test('calculates total demand hours')
  test('handles empty demand data')
});
```

#### 4. Gaps Analysis (4-5 tests)
```typescript
describe('getGapsReport', () => {
  test('identifies capacity shortfalls by role')
  test('identifies capacity surplus by role')
  test('calculates gap percentages')
  test('prioritizes critical gaps')
  test('returns empty gaps when capacity meets demand')
});
```

**Estimated Tests:** 16-20 tests
**Estimated Effort:** 3-4 hours
**Expected Coverage Gain:** 0.77% → 75%+ = **+19.7% contribution to overall coverage**

---

## Priority 2: Reports.tsx (Strategic Improvement)

**Impact Score:** 26,001 | **Lines:** 412 | **Current:** 36.89% | **Target:** 75%+

### Current Status
- Already at 36.89% with 59 tests (from previous Phase 3 work)
- 260 uncovered lines remaining
- Functions: 42.85% | Branches: 39.60%

### Gap Analysis
Main uncovered areas (based on typical patterns):
- Chart interaction handlers (hover, click, zoom)
- Advanced filter combinations
- Edge cases in data transformation
- Modal state management complexity
- Print/share functionality

### Additional Test Scenarios

#### 1. Chart Interactions (5-6 tests)
```typescript
describe('Chart Interactivity', () => {
  test('handles chart hover tooltips')
  test('handles chart click drill-down')
  test('handles chart zoom and pan')
  test('updates chart on window resize')
  test('handles chart data updates')
});
```

#### 2. Complex Filter States (4-5 tests)
```typescript
describe('Advanced Filtering', () => {
  test('applies 3+ filters simultaneously')
  test('clears individual filters independently')
  test('persists filter state in URL params')
  test('validates filter value combinations')
  test('handles filter conflicts gracefully')
});
```

#### 3. Modal Workflows (4-5 tests)
```typescript
describe('Modal Operations', () => {
  test('Reduce Load modal full workflow')
  test('Add Projects modal with validation')
  test('Modal cancel preserves report state')
  test('Modal success updates report data')
});
```

#### 4. Edge Cases & Error States (3-4 tests)
```typescript
describe('Edge Cases', () => {
  test('handles partial API failures gracefully')
  test('handles empty report datasets')
  test('handles extremely large datasets (10k+ rows)')
  test('handles concurrent report updates')
});
```

**Estimated Tests:** 16-20 additional tests (total 75-80 tests)
**Estimated Effort:** 4-5 hours
**Expected Coverage Gain:** 36.89% → 75%+ = **+15.8% contribution to overall coverage**

---

## Priority 3: InteractiveTimeline.tsx (Complex Component)

**Impact Score:** 39,401 | **Lines:** 517 | **Current:** 23.79% | **Target:** 65%+

### Complexity Assessment
- Largest file (517 lines)
- Complex React component with multiple sub-components
- Heavy interaction logic (drag-drop, zoom, pan)
- Canvas/SVG rendering
- Functions: 20.77% | Branches: 21.95%

### Strategic Approach
Focus on core business logic first, defer complex UI interactions

#### 1. Data Processing & Transformation (6-8 tests)
```typescript
describe('Timeline Data Processing', () => {
  test('processes project timeline data correctly')
  test('calculates phase durations')
  test('handles overlapping phases')
  test('aggregates assignments to timeline bars')
  test('filters timeline by date range')
  test('handles timezone conversions')
});
```

#### 2. Timeline Calculation Logic (5-7 tests)
```typescript
describe('Timeline Calculations', () => {
  test('calculates pixel positions for dates')
  test('scales timeline to viewport')
  test('handles zoom level changes')
  test('calculates phase bar widths')
  test('positions overlapping items')
  test('handles today marker position')
});
```

#### 3. Event Handlers (Business Logic) (5-6 tests)
```typescript
describe('Timeline Event Handling', () => {
  test('handles phase click to show details')
  test('handles assignment updates')
  test('validates drag-drop within constraints')
  test('handles phase resize operations')
  test('prevents invalid timeline modifications')
});
```

#### 4. State Management (4-5 tests)
```typescript
describe('Timeline State', () => {
  test('maintains selected phase state')
  test('tracks timeline zoom level')
  test('synchronizes with parent component')
  test('preserves state on re-render')
});
```

**Estimated Tests:** 20-26 tests
**Estimated Effort:** 6-8 hours (complex component)
**Expected Coverage Gain:** 23.79% → 65%+ = **+13.4% contribution to overall coverage**
**Note:** Target 65% instead of 75% due to complexity (UI interactions harder to test)

---

## Priority 4: SmartAssignmentModal.tsx

**Impact Score:** 21,500 | **Lines:** 276 | **Current:** 22.10% | **Target:** 70%+

### Test Scenarios

#### 1. Smart Assignment Algorithm (6-8 tests)
```typescript
describe('Assignment Algorithm', () => {
  test('suggests best-fit person for role')
  test('considers person availability')
  test('considers skill matching')
  test('respects capacity constraints')
  test('handles no available candidates')
  test('ranks candidates by fit score')
});
```

#### 2. Modal Workflow (5-6 tests)
```typescript
describe('Modal Workflow', () => {
  test('opens with project/role context')
  test('displays candidate recommendations')
  test('allows manual person selection override')
  test('validates assignment conflicts')
  test('creates assignment on confirm')
  test('refreshes parent on success')
});
```

#### 3. Validation & Error Handling (4-5 tests)
```typescript
describe('Validation', () => {
  test('validates allocation percentage range')
  test('validates date ranges')
  test('prevents double-booking')
  test('handles API failures gracefully')
});
```

**Estimated Tests:** 15-19 tests
**Estimated Effort:** 4-5 hours
**Expected Coverage Gain:** 22.10% → 70%+ = **+8.2% contribution to overall coverage**

---

## Priority 5: AssignmentsController.ts

**Impact Score:** 20,803 | **Lines:** 277 | **Current:** 24.90% | **Target:** 70%+

### Test Scenarios

#### 1. CRUD Operations (8-10 tests)
```typescript
describe('Assignment CRUD', () => {
  test('creates assignment with validation')
  test('retrieves assignment by ID')
  test('updates assignment allocation')
  test('updates assignment dates')
  test('deletes assignment')
  test('returns 404 for non-existent assignment')
  test('validates person-role compatibility')
  test('prevents overlapping assignments')
});
```

#### 2. Bulk Operations (5-6 tests)
```typescript
describe('Bulk Assignment Operations', () => {
  test('retrieves assignments by project')
  test('retrieves assignments by person')
  test('bulk creates assignments')
  test('bulk updates assignments')
  test('bulk deletes assignments')
});
```

#### 3. Conflict Detection (5-6 tests)
```typescript
describe('Assignment Conflicts', () => {
  test('detects over-allocation conflicts')
  test('detects date overlap conflicts')
  test('allows adjacent assignments')
  test('validates total allocation per person')
  test('handles concurrent assignment updates')
});
```

**Estimated Tests:** 18-22 tests
**Estimated Effort:** 4-5 hours
**Expected Coverage Gain:** 24.90% → 70%+ = **+7.8% contribution to overall coverage**

---

## Priority 6: PersonDetails.tsx

**Impact Score:** 19,502 | **Lines:** 276 | **Current:** 29.34% | **Target:** 70%+

### Complexity Note
- Functions: 7.95% (very low)
- Branches: 1.88% (extremely low)
- Indicates many untested code paths

### Test Scenarios

#### 1. Person Data Display (5-6 tests)
```typescript
describe('Person Details Display', () => {
  test('displays person information correctly')
  test('displays primary role')
  test('displays secondary roles')
  test('displays skills and expertise levels')
  test('displays availability percentage')
  test('handles missing optional fields')
});
```

#### 2. Assignment Timeline View (6-7 tests)
```typescript
describe('Assignment Timeline', () => {
  test('displays person assignments chronologically')
  test('shows past, current, and future assignments')
  test('calculates total allocation by period')
  test('highlights over-allocation periods')
  test('filters assignments by date range')
  test('handles person with no assignments')
});
```

#### 3. Capacity Analysis (5-6 tests)
```typescript
describe('Capacity Tracking', () => {
  test('calculates available capacity')
  test('shows capacity trends over time')
  test('identifies underutilization periods')
  test('shows utilization percentage')
  test('handles capacity changes (PTO, leave)')
});
```

#### 4. Edit Operations (4-5 tests)
```typescript
describe('Person Edit Operations', () => {
  test('opens edit modal with current data')
  test('updates person details')
  test('adds/removes roles')
  test('handles edit errors')
});
```

**Estimated Tests:** 20-24 tests
**Estimated Effort:** 5-6 hours
**Expected Coverage Gain:** 29.34% → 70%+ = **+7.0% contribution to overall coverage**

---

## Priority 7: ScenariosController.ts

**Impact Score:** 16,200 | **Lines:** 200 | **Current:** 19.00% | **Target:** 70%+

### Test Scenarios

#### 1. Scenario CRUD (8-10 tests)
```typescript
describe('Scenario Management', () => {
  test('creates new scenario')
  test('creates scenario from baseline')
  test('retrieves scenario by ID')
  test('lists all scenarios')
  test('updates scenario details')
  test('deletes scenario')
  test('validates scenario name uniqueness')
  test('handles baseline scenario protection')
});
```

#### 2. Scenario Comparison (6-7 tests)
```typescript
describe('Scenario Comparison', () => {
  test('compares two scenarios')
  test('identifies added assignments')
  test('identifies removed assignments')
  test('identifies modified assignments')
  test('calculates impact metrics')
  test('handles identical scenarios')
});
```

#### 3. Scenario Merge Operations (5-6 tests)
```typescript
describe('Scenario Merging', () => {
  test('merges scenario into baseline')
  test('validates merge conflicts')
  test('applies merge with conflict resolution')
  test('rolls back failed merge')
  test('audits merge operations')
});
```

**Estimated Tests:** 19-23 tests
**Estimated Effort:** 4-5 hours
**Expected Coverage Gain:** 19.00% → 70%+ = **+6.4% contribution to overall coverage**

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
**Focus:** Server-side controllers (easier to test, high impact)

1. **ReportingController.ts** (3-4 hours)
   - Expected: +19.7% overall coverage
   - 16-20 tests

2. **AssignmentsController.ts** (4-5 hours)
   - Expected: +7.8% overall coverage
   - 18-22 tests

3. **ScenariosController.ts** (4-5 hours)
   - Expected: +6.4% overall coverage
   - 19-23 tests

**Week 1 Total:** 11-14 hours | 53-65 tests | **+33.9% overall coverage**
**Projected Coverage after Week 1:** 47.38% + 33.9% = **81.28%** ✅ **TARGET EXCEEDED!**

### Phase 2: Client Components (Week 2) - Optional Stretch
**Focus:** Complex UI components

4. **SmartAssignmentModal.tsx** (4-5 hours)
   - Expected: +8.2% overall coverage
   - 15-19 tests

5. **PersonDetails.tsx** (5-6 hours)
   - Expected: +7.0% overall coverage
   - 20-24 tests

6. **Reports.tsx** (4-5 hours)
   - Expected: +15.8% overall coverage
   - 16-20 additional tests

**Week 2 Total:** 13-16 hours | 51-63 tests | **+31.0% additional coverage**

### Phase 3: Advanced Component (Week 3) - Stretch Goal
7. **InteractiveTimeline.tsx** (6-8 hours)
   - Expected: +13.4% overall coverage
   - 20-26 tests

---

## Recommendation

### Optimal Strategy: Focus on Server-Side Controllers First (Phase 1)

**Why Phase 1 Only Could Achieve Target:**

By focusing on the 3 server-side controllers (ReportingController, AssignmentsController, ScenariosController), we can:

1. **Achieve 80%+ coverage** with just Phase 1 (projected 81.28%)
2. **Faster development** - server tests are simpler (no React/DOM mocking)
3. **Higher confidence** - backend tests are more stable and reliable
4. **Better ROI** - 11-14 hours for 33.9% coverage gain

**Next Steps:**

1. Start with **ReportingController.ts** - highest impact, zero current coverage
2. Move to **AssignmentsController.ts** - critical business logic
3. Complete with **ScenariosController.ts** - scenario management core

After Phase 1 completion, reassess:
- If coverage target met (80%+), Phase 2/3 become optional quality improvements
- If specific areas still need coverage, cherry-pick from Phase 2/3

---

## Risk Assessment

### Low Risk (Server Controllers)
- ReportingController.ts ✅
- AssignmentsController.ts ✅
- ScenariosController.ts ✅

### Medium Risk (UI Components)
- SmartAssignmentModal.tsx ⚠️ (algorithm complexity)
- PersonDetails.tsx ⚠️ (many code paths)
- Reports.tsx ⚠️ (already partially tested)

### High Risk (Complex Component)
- InteractiveTimeline.tsx ⚠️⚠️ (UI interactions, canvas rendering)

**Mitigation:** Start with low-risk items to build momentum and achieve target quickly.

---

## Success Metrics

**Target Achievement:**
- Primary Goal: 75% overall coverage ✅ Achievable with Phase 1
- Stretch Goal: 80% overall coverage ✅ Likely with Phase 1
- Aspirational: 85%+ coverage ✅ Possible with Phase 1 + selective Phase 2

**Quality Metrics:**
- All new tests must pass consistently
- Test execution time < 2 minutes total
- No flaky tests (95%+ reliability)
- Meaningful assertions (not just smoke tests)

**Documentation:**
- Update TEST_COVERAGE_PLAN.md after each file completion
- Document any discovered bugs or issues
- Note any test infrastructure improvements needed

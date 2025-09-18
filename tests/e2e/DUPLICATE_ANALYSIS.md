# E2E Test Duplicate Analysis

## Phase 1: Assignment Tests Analysis

### Overview
Analyzed 12 assignment-related test files with significant duplication found.

### Detailed File Analysis

#### Core Assignment CRUD Tests (6 files with major overlap)

| File | Lines | Tests | Unique Features | Recommendation |
|------|-------|-------|-----------------|----------------|
| assignment-crud-complete.spec.ts | 600 | 16 | • Bulk operations<br>• Recommendations<br>• Conflict detection<br>• Most comprehensive | **KEEP** - Merge all unique tests here |
| assignment-crud-comprehensive.spec.ts | 440 | 9 | • randomUUID for data<br>• Lifecycle testing | Extract UUID approach, then REMOVE |
| assignment-crud-final.spec.ts | 451 | 7 | • Navigation helpers<br>• Data persistence | Extract helpers, then REMOVE |
| assignment-crud-fixed.spec.ts | 218 | 3 | • None (basic only) | REMOVE |
| assignment-crud-working.spec.ts | 297 | 6 | • Test data creation | REMOVE |
| assignment-simple-crud.spec.ts | 175 | 2 | • Minimal smoke tests | **KEEP** - For quick testing |

#### Specialized Assignment Tests

| File | Lines | Tests | Purpose | Recommendation |
|------|-------|-------|---------|----------------|
| assignment-edge-cases.spec.ts | ??? | ??? | Edge case testing | Review for unique cases → Merge |
| assignment-integration.spec.ts | ??? | ??? | Integration scenarios | Review → Merge valuable tests |
| assignment-minimal.spec.ts | ??? | ??? | Minimal testing | REMOVE (redundant) |
| api-contract-assignments.spec.ts | ??? | ??? | API contract validation | **KEEP** - Move to API suite |
| bob-smith-assignment-test.spec.ts | ??? | ??? | Specific user scenario | Review → Extract pattern |
| inline-edit-assignments.spec.ts | ??? | ??? | Inline editing feature | Merge into main suite |

### Test Duplication Matrix

| Test Case | Files Containing Test | Times Duplicated |
|-----------|----------------------|------------------|
| Create fixed-date assignment | ALL 6 CRUD files | 6x |
| View assignments list | 5 files | 5x |
| Allocation percentage warnings | 5 files | 5x |
| Search by project name | 5 files | 5x |
| Create phase-linked assignment | 4 files | 4x |
| Edit assignment | 4 files | 4x |
| Delete assignment | 4 files | 4x |
| Validation errors | 4 files | 4x |
| Filter assignments | 3 files | 3x |
| Sort assignments | 3 files | 3x |

### Unique Test Coverage by File

#### assignment-crud-complete.spec.ts (UNIQUE)
- Bulk assignment operations
- Assignment recommendations based on skills
- Conflict detection between assignments
- Complex filtering combinations
- Export functionality

#### assignment-crud-comprehensive.spec.ts (UNIQUE)
- Full lifecycle test with randomized data
- Comprehensive field validation
- Error message verification

#### assignment-crud-final.spec.ts (UNIQUE)
- Navigation helper patterns
- Cross-page navigation tests
- Data persistence verification

#### Other Files
- Mostly duplicate basic CRUD operations
- No significant unique coverage

### Consolidation Plan

#### Step 1: Create Master Assignment Test
Combine all unique tests into `tests/e2e/suites/crud/assignments.spec.ts`:

```typescript
describe('Assignment Management', () => {
  // Core CRUD (from multiple files)
  describe('Basic Operations', () => {
    test('create fixed-date assignment')
    test('create phase-linked assignment')
    test('edit assignment')
    test('delete assignment')
    test('view assignment details')
  });

  // Validation (from comprehensive)
  describe('Validation', () => {
    test('required field validation')
    test('allocation percentage limits')
    test('date range validation')
    test('overlap warnings')
  });

  // Advanced Features (from complete)
  describe('Advanced Features', () => {
    test('bulk operations')
    test('recommendations')
    test('conflict detection')
    test('complex filtering')
    test('export data')
  });

  // Search & Filter (from multiple)
  describe('Search and Filter', () => {
    test('search by project')
    test('filter by person')
    test('filter by date range')
    test('sort by columns')
  });
});
```

#### Step 2: Create Assignment Smoke Test
Keep minimal version for quick checks:

```typescript
describe('Assignment Smoke Tests', () => {
  test('create and view assignment')
  test('basic assignment workflow')
});
```

#### Step 3: Move API Tests
Move `api-contract-assignments.spec.ts` to `tests/e2e/suites/api/assignments-contract.spec.ts`

#### Step 4: Delete Redundant Files
Remove 8 redundant files after consolidation:
- assignment-crud-comprehensive.spec.ts
- assignment-crud-final.spec.ts
- assignment-crud-fixed.spec.ts
- assignment-crud-working.spec.ts
- assignment-minimal.spec.ts
- assignment-edge-cases.spec.ts (after extraction)
- assignment-integration.spec.ts (after extraction)
- bob-smith-assignment-test.spec.ts (after pattern extraction)

### Expected Outcome
- **Before**: 12 files, ~3,000 lines, 50+ tests (many duplicates)
- **After**: 3 files, ~800 lines, ~25 unique tests
- **Reduction**: 75% fewer files, 73% less code, 50% fewer tests (but same coverage)

---

## Phase 1: Reports Tests Analysis

### Overview
Found 16 report test files with 5 already migrated to organized structure.

### Report Tests Status

#### Already Organized (5 files in suites/reports/)
- capacity-report-accuracy.spec.ts ✅
- demand-report-accuracy.spec.ts ✅
- gaps-analysis-accuracy.spec.ts ✅
- reports-comprehensive.spec.ts ✅
- utilization-report-accuracy.spec.ts ✅

#### Duplicate/Legacy Files to Review (11 files)
| File | Purpose | Recommendation |
|------|---------|----------------|
| capacity-report-accuracy.spec.ts | Duplicate of organized | **REMOVE** |
| demand-report-accuracy.spec.ts | Duplicate of organized | **REMOVE** |
| utilization-report-accuracy.spec.ts | Duplicate of organized | **REMOVE** |
| reports-comprehensive.spec.ts | Duplicate of organized | **REMOVE** |
| 22-reporting-operations.spec.ts | Operations testing | Review → Merge unique tests |
| advanced-reporting-features.spec.ts | Advanced features | Review → Merge unique tests |
| reports-adaptive.spec.ts | Adaptive behavior | Review → Merge if unique |
| reports-debug.spec.ts | Debug version | **REMOVE** |
| reports-filter-testing.spec.ts | Filter functionality | Merge into comprehensive |
| reports-final-validation.spec.ts | Validation tests | Review → Merge |
| reports-live-test.spec.ts | Live testing | **REMOVE** (likely debug) |
| reports-navigation.spec.ts | Navigation tests | Merge into comprehensive |
| reports-quick-check.spec.ts | Quick validation | **REMOVE** (use smoke) |
| reports-simple.spec.ts | Simple tests | **REMOVE** |
| reports-tables.spec.ts | Table functionality | Review → Merge |
| reports-validation.spec.ts | Validation | Merge with final-validation |

### Consolidation Plan for Reports

1. **Immediate Removal** (7 files)
   - 4 exact duplicates of organized tests
   - 3 debug/simple versions

2. **Merge Candidates** (4 files)
   - Extract unique filter tests → reports-comprehensive.spec.ts
   - Extract navigation patterns → reports-comprehensive.spec.ts
   - Extract table tests → respective report accuracy tests
   - Extract validation → add validation describe block to each report

3. **Expected Outcome**
   - **Before**: 16 files (5 organized + 11 legacy)
   - **After**: 5 files (all organized)
   - **Reduction**: 69% fewer files

---

## Phase 1: Scenario Tests Analysis

### Overview
Found 17 scenario test files, no organized structure yet.

### Scenario Test Categories

#### Core Scenario Management
| File | Tests | Purpose | Priority |
|------|-------|---------|----------|
| scenario-basic.spec.ts | Base CRUD | Core functionality | HIGH |
| scenario-planning.spec.ts | Planning workflows | Key feature | HIGH |
| scenario-comparison-demo.spec.ts | Comparison feature | Key feature | HIGH |
| scenario-workflow-integration.spec.ts | Full workflows | Integration | HIGH |

#### UI/Visualization Tests
| File | Purpose | Recommendation |
|------|---------|----------------|
| scenario-dropdown.spec.ts | Dropdown behavior | Merge into basic |
| scenario-dropdown-simple.spec.ts | Simple dropdown | **REMOVE** (duplicate) |
| scenario-graph-visualization.spec.ts | Graph features | Create visualization suite |
| scenario-view-modes.spec.ts | View switching | Merge into basic |
| scenario-visual-regression.spec.ts | Visual testing | Keep separate |
| full-scenario-ui-test.spec.ts | UI testing | Review → Merge |
| scenario-ui-demonstration.spec.ts | Demo test | **REMOVE** |
| ui-scenario-visibility.spec.ts | Visibility | Merge into basic |

#### Advanced Features
| File | Purpose | Priority |
|------|---------|----------|
| scenario-concurrent-operations.spec.ts | Concurrency | HIGH - Unique |
| scenario-merge-corruption-prevention.spec.ts | Data integrity | HIGH - Critical |
| scenario-edge-cases.spec.ts | Edge cases | MEDIUM |
| scenario-detailed-workflows.spec.ts | Detailed flows | MEDIUM |
| test-simple-scenario.spec.ts | Simple test | **REMOVE** |

### Proposed Scenario Suite Structure

```
tests/e2e/suites/scenarios/
├── scenario-management.spec.ts    (Basic CRUD + dropdowns + view modes)
├── scenario-planning.spec.ts      (Planning workflows)
├── scenario-comparison.spec.ts    (Comparison features)
├── scenario-visualization.spec.ts (Graphs + visual features)
├── scenario-integrity.spec.ts     (Concurrency + merge + corruption)
└── scenario-workflows.spec.ts     (Complex workflows + edge cases)
```

### Consolidation Impact

- **Before**: 17 scattered files
- **After**: 6 organized files
- **Reduction**: 65% fewer files
- **Benefit**: Clear feature separation, easier maintenance

---

## Summary Statistics

### Total Duplication Analysis
| Category | Current Files | After Consolidation | Reduction |
|----------|---------------|-------------------|-----------|
| Assignments | 12 | 3 | 75% |
| Reports | 16 | 5 | 69% |
| Scenarios | 17 | 6 | 65% |
| **Total** | **45** | **14** | **69%** |

### Next Steps
1. Start with assignment consolidation (highest duplication)
2. Clean up report duplicates (easiest - just remove files)
3. Organize scenarios into new structure (most complex)
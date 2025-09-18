# Report Tests Consolidation Plan

## Unique Tests to Preserve

### From 22-reporting-operations.spec.ts
- [ ] Real-time metrics updates
- [ ] Capacity forecast generation
- [ ] Project health breakdown
- [ ] Resource utilization charts
- [ ] Assignment conflicts view
- [ ] Custom date range testing
- [ ] Save report preferences
- [ ] Export to Excel
- [ ] Print functionality

**Target**: Add to `reports-comprehensive.spec.ts` as "Report Operations" describe block

### From advanced-reporting-features.spec.ts
- [ ] Custom report builder
- [ ] Custom field selection
- [ ] Custom calculations/formulas
- [ ] Report scheduling
- [ ] Report delivery (Email, FTP)
- [ ] Trend analysis/forecasting
- [ ] Actionable insights
- [ ] Drill-down analysis
- [ ] KPI calculations
- [ ] Report templates
- [ ] Report customization
- [ ] Report sharing/collaboration
- [ ] Access permissions
- [ ] Multi-dimensional filtering
- [ ] Saved filter combinations
- [ ] Dynamic parameters
- [ ] Large dataset performance

**Target**: Create new `tests/e2e/suites/reports/advanced-features.spec.ts`

### From reports-filter-testing.spec.ts
- [ ] Filter state preservation
- [ ] Cross-filter integration
- [ ] Reset/clear filters
- [ ] Filter validation per report type

**Target**: Add to each report accuracy test file as "Filtering" describe block

### From reports-navigation.spec.ts
- [ ] Contextual action parameters
- [ ] Navigation flow preservation
- [ ] Summary card links
- [ ] Date range preservation in links

**Target**: Create new `tests/e2e/suites/reports/navigation-context.spec.ts`

### From reports-tables.spec.ts
- [ ] Full-width layout
- [ ] Row status styling
- [ ] Badge formatting
- [ ] Data accuracy calculations
- [ ] Utilization % validation
- [ ] Gap calculations
- [ ] Responsive behavior
- [ ] Long text handling
- [ ] Sorting functionality
- [ ] Action buttons

**Target**: Add to respective report accuracy tests as "Table Display" describe block

## Migration Steps

1. **Create new test files**:
   ```bash
   touch tests/e2e/suites/reports/advanced-features.spec.ts
   touch tests/e2e/suites/reports/navigation-context.spec.ts
   ```

2. **Extract and migrate tests** (in order):
   - advanced-reporting-features.spec.ts → advanced-features.spec.ts
   - reports-navigation.spec.ts → navigation-context.spec.ts
   - Other files → distribute to existing organized tests

3. **Delete legacy files** (after extraction):
   ```bash
   rm tests/e2e/22-reporting-operations.spec.ts
   rm tests/e2e/advanced-reporting-features.spec.ts
   rm tests/e2e/reports-filter-testing.spec.ts
   rm tests/e2e/reports-navigation.spec.ts
   rm tests/e2e/reports-tables.spec.ts
   rm tests/e2e/reports-adaptive.spec.ts
   rm tests/e2e/reports-final-validation.spec.ts
   rm tests/e2e/reports-validation.spec.ts
   ```

4. **Remove exact duplicates**:
   ```bash
   rm tests/e2e/capacity-report-accuracy.spec.ts
   rm tests/e2e/demand-report-accuracy.spec.ts
   rm tests/e2e/reports-comprehensive.spec.ts
   rm tests/e2e/utilization-report-accuracy.spec.ts
   ```

## Expected Outcome

### Before:
- 16 report test files (scattered)
- ~2000+ test cases (many duplicates)
- Inconsistent patterns

### After:
- 7 organized files:
  - capacity-report-accuracy.spec.ts (enhanced)
  - demand-report-accuracy.spec.ts (enhanced)
  - gaps-analysis-accuracy.spec.ts
  - utilization-report-accuracy.spec.ts (enhanced)
  - reports-comprehensive.spec.ts (enhanced)
  - advanced-features.spec.ts (NEW)
  - navigation-context.spec.ts (NEW)

### Benefits:
- Clear separation of concerns
- No duplicate tests
- Easier to maintain
- Better test discovery
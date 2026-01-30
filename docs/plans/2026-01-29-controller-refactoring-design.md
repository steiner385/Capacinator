# Controller Refactoring Design

## Issue
#52 - Refactor large controllers exceeding 600 lines

## Problem
Three controllers exceed the 300-line target:
- ReportingController: 1,051 lines
- ExportController: 927 lines
- DemandController: 653 lines

These controllers mix HTTP concerns with business logic, duplicate calculations, and are difficult to test in isolation.

## Solution
Extract business logic into dedicated services, leaving controllers thin (~150-200 lines each).

## New Services

### 1. ReportDataService
**Location**: `src/server/services/reports/ReportDataService.ts`

Consolidates all report data fetching and aggregation:
- `getDashboardStats()` - Dashboard summary statistics
- `getCapacityReport(filters)` - Capacity by role with gaps
- `getUtilizationReport(filters)` - Person utilization with date filtering
- `getDemandReport(filters)` - Demand aggregated by project/role/type
- `getGapsAnalysis()` - Capacity gaps and project health
- `getTimelineReport(filters)` - Project and phase timelines
- `getProjectReport(filters)` - Project health overview

### 2. DemandCalculationService
**Location**: `src/server/services/demand/DemandCalculationService.ts`

Handles demand calculations and forecasting:
- `getProjectDemands(projectId)` - Demands for a specific project
- `getDemandSummary(filters)` - Aggregated demand summary
- `getDemandForecast(months)` - Forward-looking demand forecast
- `getDemandGaps()` - Roles where demand exceeds capacity
- `calculateScenarioImpact(scenario)` - What-if scenario modeling
- `calculateFte()`, `calculateWorkDays()` - Shared calculation utilities

### 3. ExportFormatterService
**Location**: `src/server/services/export/ExportFormatterService.ts`

Handles report formatting for export:
- `generateExcel(reportType, data)` - Excel workbook generation
- `generateCSV(reportType, data)` - CSV string generation
- `generatePDF(reportType, data)` - PDF via HTML templates

## Refactored Controller Structure

Each controller endpoint becomes ~15-20 lines:
```typescript
getDemandReport = this.asyncHandler(async (req, res) => {
  const filters = this.extractFilters(req);
  const data = await this.reportDataService.getDemandReport(filters);
  this.sendSuccess(req, res, data);
});
```

## Type Definitions
Shared types in `src/server/services/reports/types.ts`:
- Filter interfaces (DateRangeFilter, DemandReportFilters, etc.)
- Report data interfaces (CapacityReportData, UtilizationReportData, etc.)
- Database row types

## Expected Results

| Controller | Before | After | Reduction |
|------------|--------|-------|-----------|
| ReportingController | 1,051 | ~200 | 81% |
| ExportController | 927 | ~150 | 84% |
| DemandController | 653 | ~180 | 72% |

## Implementation Order
1. Create shared type definitions
2. Create ReportDataService (largest extraction)
3. Create DemandCalculationService
4. Create ExportFormatterService
5. Refactor ReportingController
6. Refactor DemandController
7. Refactor ExportController
8. Run tests to verify no regressions

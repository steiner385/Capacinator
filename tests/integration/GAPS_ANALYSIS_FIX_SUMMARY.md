# Gaps Analysis Fix Summary

## Issue
The "Gaps by Role" and "Gap Trend (Projected)" charts on the Reports & Analytics page were displaying as blank/empty.

## Root Cause Analysis

### 1. Field Name Mismatch
- The frontend was looking for `gap.gap_fte` but the API returned `gap.capacity_gap_fte`
- This caused the transformation to fail and return undefined values

### 2. Data Interpretation Issue
- The capacity_gaps_view returns positive values for excess capacity and negative values for shortages
- The original transformation wasn't handling this correctly
- Most test data showed excess capacity (positive gaps) rather than shortages (negative gaps)

### 3. Missing Data Filtering
- Empty roles with no capacity or demand were being included
- This created noise in the charts

## Fixes Applied

### Frontend Changes (Reports.tsx)

1. **Fixed field name reference**:
   ```typescript
   gap: Math.round(-gap.capacity_gap_fte * 160)
   ```
   - Changed from `gap.gap_fte` to `gap.capacity_gap_fte`
   - Applied negative transformation since negative values represent shortages

2. **Added data filtering**:
   ```typescript
   .filter((gap: any) => gap.total_demand_fte > 0 || gap.total_capacity_fte > 0)
   .filter((gap: any) => gap.gap !== 0)
   .sort((a: any, b: any) => b.gap - a.gap)
   ```
   - Filter out roles with no data
   - Only show roles with actual gaps
   - Sort by gap size (biggest shortage first)

3. **Fixed gap percentage calculation**:
   ```typescript
   const totalGapFte = data.capacityGaps.reduce((sum: number, g: any) => 
     sum + Math.max(0, -g.capacity_gap_fte || 0), 0);
   ```
   - Changed to use `capacity_gap_fte` 
   - Only sum negative values (shortages)

## Testing

### Manual Testing
Created test data with actual demand gaps:
- Data Scientist: 2.5 FTE shortage
- Frontend Developer: 1.0 FTE shortage

Verified that:
- Gaps by Role chart now displays the shortage data
- Gap Trend chart shows projected reduction over time
- Summary metrics calculate correctly

### Integration Tests
Created comprehensive integration tests in `gaps-analysis.test.ts`:
- Test balanced capacity scenarios
- Test shortage detection
- Test demand aggregation
- Test scenario filtering
- Test date range filtering
- Test summary metric calculations

## Data Model Understanding

The `capacity_gaps_view` returns:
- `capacity_gap_fte`: Positive = excess capacity, Negative = shortage
- `total_capacity_fte`: Total available capacity for the role
- `total_demand_fte`: Total demand for the role
- `status`: 'GAP', 'TIGHT', or 'OK'

## Recommendations

1. **Data Clarity**: Consider renaming fields to be more intuitive:
   - `capacity_gap_fte` → `capacity_balance_fte`
   - Add explicit `shortage_fte` and `excess_fte` fields

2. **Chart Enhancement**: Consider showing both shortages and excess in different colors:
   - Red bars for shortages
   - Green bars for excess capacity

3. **Test Data**: Add more realistic test data that includes both shortages and excess capacity scenarios

## Files Modified

1. `/home/tony/GitHub/Capacinator/client/src/pages/Reports.tsx`
   - Fixed data transformation for gaps analysis
   - Updated field references
   - Added proper filtering and sorting

2. `/home/tony/GitHub/Capacinator/tests/integration/test-schema-additions.sql`
   - Added `created_by` field to scenarios table

3. Created `/home/tony/GitHub/Capacinator/tests/integration/gaps-analysis.test.ts`
   - Comprehensive integration tests for gaps analysis endpoint

The charts should now display properly when there is demand that exceeds capacity for any role.
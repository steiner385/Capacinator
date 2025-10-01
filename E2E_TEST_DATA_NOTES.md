# E2E Test Data Requirements

## Issue Summary
The E2E tests are showing empty data in the reports because the seed data dates don't match the UI date ranges.

## Problem
- The UI shows date range: 09/29/2025 to 12/29/2025
- The original seed data used relative dates from "today" (when the seed runs)
- This causes no assignments to fall within the future date range being queried

## Solution Applied
Updated the e2e-test-data-consolidated.ts file to use fixed dates in September-December 2025:
- Start date: 2025-09-29
- End dates: Various dates through 2025-12-29
- All assignments now use explicit date strings instead of Date objects

## Files Modified
- `/src/server/database/seeds/e2e-test-data-consolidated.ts`
  - Updated date variables to use fixed 2025 dates
  - Converted all date assignments to ISO string format
  - Added aspiration dates to projects
  - Ensured assignment dates span the full test period

## How to Apply Changes
1. Stop any running E2E tests
2. Clear the E2E test database
3. Re-run the E2E test setup which will apply the updated seed data
4. The reports should now show data for the September-December 2025 period

## Verification
- Utilization Report should show 4 people with various utilization percentages
- Demand Report should show project demand data
- Gaps Analysis should load properly and show any capacity gaps
- All charts should be populated with data

## Note
The seed data is specifically designed for E2E testing with predictable, fixed dates to ensure consistent test results regardless of when the tests are run.
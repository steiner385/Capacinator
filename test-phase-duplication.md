# Phase Duplication UI Test Plan

## Changes Made

1. **Phase Selection**
   - Added radio button column to phase table
   - Added `selectedPhaseId` state to track selected phase
   - Phase rows are now selectable with visual feedback

2. **Duplicate Button Behavior**
   - Button is disabled by default
   - Enabled only when a phase is selected
   - Clicking opens modal with source phase pre-populated

3. **Redesigned Modal**
   - Shows source phase name (read-only)
   - Two duplication modes:
     - "Create new phase instance" - Creates a new phase with dates
     - "Copy to existing phase" - Copies to an existing phase (backend support pending)
   - Different form fields based on selected mode

4. **Visual Feedback**
   - Selected row has blue background (#e0f2fe)
   - Blue left border on selected row
   - Hover effect preserved

## Testing Steps

1. Navigate to a project with existing phases
2. Verify "Duplicate Phase" button is disabled
3. Click on a phase row's radio button
4. Verify the row is highlighted and button is enabled
5. Click "Duplicate Phase"
6. Verify source phase is pre-populated
7. Test both duplication modes
8. Verify form validation works

## Known Issues

- "Copy to existing phase" mode shows alert - backend support not yet implemented
- Need to implement backend endpoint for copying to existing phases

## Next Steps

1. Implement backend support for copying to existing phases
2. Add success notifications
3. Add error handling for edge cases
4. Write automated tests
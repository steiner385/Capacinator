# E2E Tests Skipped Tests Mapping

## Quick Reference Guide

### Utilization Modal Tests (High Priority)
**Files affected**: 4 test files, ~25 conditional skips

#### utilization-modals-comprehensive.spec.ts
- **Skip**: "No person with assignments found"
  - **Solution**: Create test person with assignments in beforeEach
- **Skip**: "No person with available capacity found"  
  - **Solution**: Create person with <100% allocation
- **Skip**: "No projects available for assignment"
  - **Solution**: Create unassigned test projects
- **Skip**: "No suitable person found for integration test"
  - **Solution**: Ensure comprehensive test data scenario

#### utilization-modals-focused.spec.ts
- **Skip**: "No Add Projects functionality available"
  - **Solution**: Create under-utilized person (< 100%)
- **Skip**: "No Reduce Load functionality available"
  - **Solution**: Create person with removable assignments
- **Skip**: "No assignable projects available"
  - **Solution**: Create projects without full team

#### utilization-modals-enhanced.spec.ts
- **Skip**: "No person with removable assignments found"
  - **Solution**: Create person with multiple assignments
- **Skip**: "No team members found for rapid interaction test"
  - **Solution**: Ensure minimum 3 people in test data

#### utilization-modals-flexible.spec.ts
- **Skip**: "No over-utilized person found"
  - **Solution**: Create person with >100% allocation
- **Skip**: "Location filter not found"
  - **Solution**: Implement LocationFilter component

### Assignment Inline Editing Tests (High Priority)
**File**: `assignment-inline-editing.spec.ts`
**All skips**: "No inline editable fields found"

**Root Cause**: Missing `data-editable="true"` attribute on inputs
**Solution**: 
1. Implement EditableAllocationCell component
2. Implement EditableNotesCell component
3. Add keyboard navigation support
4. Add validation feedback

### Phase Duplication UI Tests (Medium Priority)
**File**: `duplication-ui.spec.ts`

- **Test**: "should handle after phase placement with dropdown"
  - **Status**: Permanently skipped (test.skip)
  - **Solution**: Complete dropdown population logic
  
- **Test**: "keyboard navigation"
  - **Status**: Permanently skipped (test.skip)
  - **Solution**: Add Escape key handler to modal

### Other Tests

#### 25-quick-smoke-test.spec.ts
- **Skip**: "No add buttons found on projects page"
  - **Solution**: Ensure proper user permissions in test setup

#### scenario-basic-operations.spec.ts
- **Skip**: When no draft scenario exists
  - **Solution**: Create draft scenario in test data

#### crud/assignments.spec.ts
- **Skip**: "No roles available"
  - **Solution**: Ensure roles are seeded in test database

#### performance/load-tests.spec.ts
- **Status**: Permanently skipped unless RUN_PERFORMANCE_TESTS=true
  - **Solution**: Environment variable configuration

#### templates/standard-test-template.spec.ts
- **Status**: Skip visual regression unless VISUAL_REGRESSION=true
  - **Solution**: Environment variable configuration

## Implementation Priority

### 🔴 Critical (Week 1)
1. **Test Data Factory**
   - Fix all utilization modal test skips
   - Ensure consistent test data creation
   - Remove all conditional skips

### 🟡 High (Week 2)
2. **Inline Editing UI**
   - Implement editable cells for assignments
   - Add data-editable attributes
   - Support keyboard navigation

3. **Location Filter**
   - Implement filter component
   - Add to utilization report page

### 🟢 Medium (Week 3)
4. **Phase UI Completion**
   - Fix after phase dropdown
   - Add keyboard navigation
   - Complete modal interactions

5. **Environment Setup**
   - Document env variables
   - Create test scripts
   - Update CI configuration

## Test Data Requirements Summary

### Always Required:
```javascript
{
  people: [
    { name: "Over Utilized", allocation: 110 },
    { name: "Under Utilized", allocation: 60 },
    { name: "Available", allocation: 0 },
    { name: "With Assignments", assignments: 3 }
  ],
  projects: [
    { name: "Unassigned Project 1", assigned: false },
    { name: "Unassigned Project 2", assigned: false },
    { name: "Active Project", assigned: true }
  ],
  scenarios: [
    { name: "Draft Scenario", status: "draft" }
  ],
  roles: [
    { name: "Developer" },
    { name: "Designer" }
  ]
}
```

## Quick Fixes Checklist

- [ ] Create E2ETestDataBuilder class
- [ ] Update beforeEach hooks in utilization tests
- [ ] Implement EditableAllocationCell
- [ ] Implement EditableNotesCell  
- [ ] Implement LocationFilter
- [ ] Fix phase duplication dropdown
- [ ] Add modal keyboard handlers
- [ ] Document environment variables
- [ ] Update test scripts in package.json
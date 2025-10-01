# Scenario Comparison Modal Fix

## Issue
The scenario type and status badges in the comparison modal have white text on light gray backgrounds, making them invisible.

## Temporary Fix
Add this style tag to your Scenarios.tsx file at the top of the CompareModal component (around line 440):

```jsx
return (
  <div className="modal-overlay">
    <style>{`
      .scenario-card-mini .scenario-type.sandbox {
        background-color: #fed7aa !important;
        color: #92400e !important;
      }
      .scenario-card-mini .scenario-status.active {
        background-color: #d1fae5 !important;
        color: #065f46 !important;
      }
      .scenario-card-mini .scenario-type.branch {
        background-color: #e0e7ff !important;
        color: #4338ca !important;
      }
      .scenario-card-mini .scenario-type.baseline {
        background-color: #d1fae5 !important;
        color: #065f46 !important;
      }
    `}</style>
    <div className="modal-content modal-large">
      ...rest of modal content
```

## Permanent Fix
The CSS has been added to Scenarios.css but may not be loading due to:
1. Build/bundling issues
2. CSS specificity conflicts
3. Vite dev server caching

Try:
1. Restart your dev server completely
2. Clear browser cache and hard refresh
3. Check browser DevTools to see if the CSS is loading

## CSS Variables Solution
Once the styles are working, replace the hard-coded colors with:
- `var(--badge-warning-bg)` and `var(--badge-warning-text)` for sandbox
- `var(--badge-success-bg)` and `var(--badge-success-text)` for active/baseline
- `var(--badge-primary-bg)` and `var(--badge-primary-text)` for branch
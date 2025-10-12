# Accessibility Testing Checklist for UnifiedTabComponent

## Manual Testing Procedures

### 1. Keyboard Navigation Testing
- [ ] **Tab Key Navigation**
  - Press Tab to move focus to the first tab
  - Press Tab again to move to tab content area
  - Shift+Tab should move focus back to tabs

- [ ] **Arrow Key Navigation**
  - Use Left/Right arrows to move between tabs (horizontal)
  - Use Up/Down arrows to move between tabs (vertical)
  - Focus should wrap around (last tab → first tab)

- [ ] **Activation Keys**
  - Press Space or Enter on focused tab to activate it
  - Only focused tab should activate, not other tabs

- [ ] **Home/End Keys**
  - Home key should move to first tab
  - End key should move to last tab

### 2. Screen Reader Testing
- [ ] **Tab List Announcement**
  - Screen reader should announce: "Navigation tabs, tablist"
  - Should announce total number of tabs

- [ ] **Tab Announcement**
  - Should announce: "[Tab Name], tab, [X] of [Y] tabs"
  - Should announce selected state: "selected" or "not selected"

- [ ] **Panel Announcement**
  - Should announce panel content is associated with tab
  - Should be able to navigate panel content easily

### 3. ARIA Attributes Validation
- [ ] **Tab List Attributes**
  - `role="tablist"`
  - `aria-orientation="horizontal"` or `"vertical"`
  - `aria-label` or `aria-labelledby`

- [ ] **Tab Attributes**
  - `role="tab"`
  - `aria-selected="true"` (active) or `"false"` (inactive)
  - `aria-controls="[panel-id]"`
  - `tabindex="0"` (active) or `"-1"` (inactive)

- [ ] **Panel Attributes**
  - `role="tabpanel"`
  - `aria-labelledby="[tab-id]"`
  - `tabindex="0"`

### 4. Focus Management Testing
- [ ] **Roving Tabindex**
  - Only one tab should have `tabindex="0"` at a time
  - Other tabs should have `tabindex="-1"`
  - Focus should move correctly with arrow keys

- [ ] **Focus Indicators**
  - Focus ring should be clearly visible
  - Should meet 3:1 contrast ratio requirement
  - Should work in high contrast mode

### 5. Color and Contrast Testing
- [ ] **Text Contrast**
  - Normal text: 4.5:1 minimum contrast ratio
  - Large text: 3:1 minimum contrast ratio

- [ ] **Focus Indicators**
  - Focus ring: 3:1 contrast against background
  - Focus indicator should be at least 2px thick

- [ ] **State Indicators**
  - Active/selected state should not rely solely on color
  - Should have additional visual indicators (underline, background, etc.)

### 6. Mobile Accessibility Testing
- [ ] **Touch Targets**
  - Minimum 48x48dp touch targets
  - Adequate spacing between interactive elements

- [ ] **Screen Reader Support**
  - Test with TalkBack (Android) and VoiceOver (iOS)
  - Swipe navigation should work correctly

## Automated Testing Commands

### ESLint Accessibility Rules
```bash
npm run lint -- --ext .tsx --config .eslintrc-a11y.js src/components/ui/UnifiedTabComponent.tsx
```

### Jest Accessibility Tests
```bash
npm test -- UnifiedTabComponent.test.tsx
```

### Lighthouse Accessibility Audit
```bash
npx lighthouse http://localhost:3110/reports --only-categories=accessibility --chrome-flags="--headless"
```

## Browser Testing Matrix

| Browser | Version | Keyboard Nav | Screen Reader | Notes |
|---------|---------|--------------|---------------|-------|
| Chrome  | Latest  | [ ]          | [ ]           |       |
| Firefox | Latest  | [ ]          | [ ]           |       |
| Safari  | Latest  | [ ]          | [ ]           |       |
| Edge    | Latest  | [ ]          | [ ]           |       |

## Screen Reader Testing Matrix

| Screen Reader | Version | Basic Nav | Tab Count | Panel Access | Notes |
|---------------|---------|-----------|-----------|--------------|-------|
| NVDA          | Latest  | [ ]       | [ ]       | [ ]          |       |
| JAWS          | Latest  | [ ]       | [ ]       | [ ]          |       |
| VoiceOver     | Latest  | [ ]       | [ ]       | [ ]          |       |
| TalkBack      | Latest  | [ ]       | [ ]       | [ ]          |       |

## Issues Found

| Issue | Severity | Description | Fix Applied | Verified |
|-------|----------|-------------|-------------|----------|
|       |          |             |             |          |

## Compliance Status

- [ ] WCAG 2.1 Level AA Compliant
- [ ] Keyboard Navigation: Full functionality
- [ ] Screen Reader Support: Tested with 2+ readers
- [ ] Mobile Accessibility: Touch targets compliant
- [ ] Focus Management: Proper roving tabindex
- [ ] Color Contrast: All text meets 4.5:1 ratio
- [ ] ARIA Implementation: Complete and correct

## Notes
- Testing should be performed in both light and dark themes
- Test with browser zoom levels up to 200%
- Verify functionality with JavaScript disabled (graceful degradation)
- Test with various font sizes and display settings
# E2E Test Commands

## 🚀 Running the Tests

Since there seems to be an issue with the bash environment, here are the commands you can run directly in your terminal:

### Prerequisites
Make sure the development server is running:
```bash
npm run dev
```

### Test Commands

#### 1. Run Smoke Tests (Quick validation)
```bash
npm run test:e2e:smoke
```
Or directly:
```bash
npx playwright test tests/e2e/suites/smoke/smoke-tests.spec.ts --reporter=list
```

#### 2. Run All E2E Tests
```bash
npm run test:e2e
```

#### 3. Run Specific Test Suites
```bash
# CRUD tests
npx playwright test tests/e2e/suites/crud --reporter=list

# Report tests
npx playwright test tests/e2e/suites/reports --reporter=list

# Table tests
npx playwright test tests/e2e/suites/tables --reporter=list

# Navigation tests
npx playwright test tests/e2e/suites/core --reporter=list
```

#### 4. Run Individual Test Files
```bash
# People CRUD tests
npx playwright test tests/e2e/suites/crud/people.spec.ts

# Availability table tests
npx playwright test tests/e2e/suites/tables/people-availability.spec.ts

# Settings permissions tests
npx playwright test tests/e2e/suites/tables/settings-permissions.spec.ts

# Project phase manager tests
npx playwright test tests/e2e/suites/tables/project-phase-manager.spec.ts
```

#### 5. Run Tests with Different Reporters
```bash
# List reporter (simple output)
npx playwright test --reporter=list

# HTML reporter (generates report)
npx playwright test --reporter=html

# Line reporter (default)
npx playwright test --reporter=line
```

#### 6. Run Tests in UI Mode (Recommended for debugging)
```bash
npx playwright test --ui
```

#### 7. Run Tests in Headed Mode (See browser)
```bash
npm run test:e2e:headed
```
Or:
```bash
npx playwright test --headed
```

#### 8. Debug a Specific Test
```bash
npx playwright test tests/e2e/suites/smoke/smoke-tests.spec.ts --debug
```

#### 9. Run Tests by Tag
```bash
# Run only smoke tests
npx playwright test --grep @smoke

# Run only CRUD tests
npx playwright test --grep @crud

# Run only critical tests
npx playwright test --grep @critical
```

### Verification Scripts

1. **Verify E2E Setup**
```bash
node verify-e2e-setup.js
```

2. **Run Test Suite** (if bash works)
```bash
chmod +x run-e2e-tests.sh
./run-e2e-tests.sh smoke
```

### Troubleshooting

If tests fail with profile selection issues:
1. Delete `test-results/e2e-auth.json` if it exists
2. Run tests again - the global setup will create a fresh auth state

If tests fail with timeout issues:
1. Ensure the dev server is running on port 3120
2. Check that the API server is running on port 3111
3. Increase timeout in specific tests if needed

### Recommended First Run

Start with smoke tests to verify the setup:
```bash
# 1. Start dev server (in one terminal)
npm run dev

# 2. Run smoke tests (in another terminal)
npm run test:e2e:smoke
```

The smoke tests should complete in under 1 minute and verify:
- Server connectivity
- Authentication flow
- Basic navigation
- All main pages load
- No console errors

After smoke tests pass, you can run the full suite or specific test groups.
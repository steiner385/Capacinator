# E2E Environment Setup Guide

This document describes the isolated E2E test environment setup for Capacinator.

## Overview

The E2E environment provides complete isolation from the development environment with:
- **Separate ports**: E2E runs on ports 3121 (frontend) and 3457 (backend)
- **Separate database**: Uses `capacinator-e2e.db`
- **Separate configuration**: Uses `.env.e2e` file
- **Separate test data**: Dedicated E2E seed data

## Architecture

```
Development Environment     E2E Environment
┌─────────────────────┐    ┌─────────────────────┐
│ Frontend: 3120      │    │ Frontend: 3121      │
│ Backend: 3456       │    │ Backend: 3457       │
│ DB: capacinator.db  │    │ DB: capacinator-e2e.db│
│ Config: .env.dev    │    │ Config: .env.e2e    │
└─────────────────────┘    └─────────────────────┘
```

## Quick Start

### 1. Run E2E Tests (Recommended)
```bash
# Run all E2E tests with isolated environment
npm run test:e2e:isolated

# Run with UI for debugging
npm run test:e2e:isolated:ui

# Run in headed mode (see browser)
npm run test:e2e:isolated:headed
```

### 2. Manual E2E Environment Control
```bash
# Start E2E environment
npm run e2e:start

# Stop E2E environment
npm run e2e:stop

# Stop and cleanup database
npm run e2e:stop:cleanup

# Reset environment (stop, cleanup, start)
npm run e2e:reset
```

## Configuration Files

### `.env.e2e`
Contains E2E-specific environment variables:
- `NODE_ENV=e2e`
- `PORT=3457` (backend)
- `FRONTEND_PORT=3121`
- `DB_FILENAME=capacinator-e2e.db`
- Performance optimizations for testing

### `playwright.e2e.config.ts`
E2E-specific Playwright configuration:
- Uses ports 3121/3457
- Isolated test data
- Enhanced reporting
- Global setup/teardown

## Database Management

### E2E Database Features
- **Isolated**: Completely separate from dev database
- **Fast**: Performance optimizations for testing
- **Resettable**: Can be reset between test runs
- **Seed Data**: Dedicated E2E test data

### Database Scripts
```bash
# Initialize E2E database
npx tsx src/server/database/init-e2e.ts

# Reset E2E database
npm run e2e:reset
```

## Test Data

### E2E Seed Data
The E2E environment includes dedicated test data:
- **Locations**: E2E Test Office, E2E Remote
- **Roles**: E2E Developer, E2E Designer, E2E Manager
- **People**: E2E Test User 1, E2E Test User 2, E2E Test Manager
- **Projects**: E2E Test Project 1, E2E Test Project 2
- **Scenarios**: E2E Baseline Plan, E2E Branch Scenario 1

### Data Isolation
- All E2E data is prefixed with "E2E"
- Completely separate from development data
- Can be reset without affecting dev environment

## Scripts Reference

### NPM Scripts
```json
{
  "test:e2e:isolated": "playwright test --config playwright.e2e.config.ts",
  "test:e2e:isolated:ui": "playwright test --ui --config playwright.e2e.config.ts",
  "test:e2e:isolated:headed": "playwright test --headed --config playwright.e2e.config.ts",
  "test:e2e:isolated:debug": "playwright test --debug --config playwright.e2e.config.ts",
  "e2e:start": "./scripts/start-e2e-server.sh",
  "e2e:stop": "./scripts/stop-e2e-server.sh",
  "e2e:stop:cleanup": "./scripts/stop-e2e-server.sh --cleanup-db",
  "e2e:reset": "./scripts/stop-e2e-server.sh --cleanup-db && ./scripts/start-e2e-server.sh"
}
```

### Shell Scripts
- `scripts/start-e2e-server.sh`: Starts E2E environment
- `scripts/stop-e2e-server.sh`: Stops E2E environment
- `scripts/stop-e2e-server.sh --cleanup-db`: Stops and cleans database

## File Structure

```
├── .env.e2e                               # E2E environment config
├── playwright.e2e.config.ts              # E2E Playwright config
├── scripts/
│   ├── start-e2e-server.sh              # Start E2E environment
│   └── stop-e2e-server.sh               # Stop E2E environment
├── src/server/database/
│   ├── init-e2e.ts                      # E2E database initialization
│   ├── knexfile.e2e.ts                  # E2E database config
│   └── seeds/
│       └── e2e-test-data.ts             # E2E seed data
└── tests/e2e/
    ├── helpers/
    │   ├── e2e-global-setup.ts          # E2E global setup
    │   └── e2e-global-teardown.ts       # E2E global teardown
    └── 00-e2e-environment-test.spec.ts   # Environment verification tests
```

## Best Practices

### 1. Always Use Isolated Environment
```bash
# ✅ Good - uses isolated environment
npm run test:e2e:isolated

# ❌ Avoid - uses development environment
npm run test:e2e
```

### 2. Reset Between Sessions
```bash
# Reset environment for clean slate
npm run e2e:reset
```

### 3. Verify Environment
```bash
# Run environment verification tests
npm run test:e2e:isolated -- tests/e2e/00-e2e-environment-test.spec.ts
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Stop all E2E processes
npm run e2e:stop:cleanup

# Check for hanging processes
lsof -i :3121
lsof -i :3457
```

#### Database Issues
```bash
# Reset database
npm run e2e:reset

# Check database file
ls -la data/capacinator-e2e.db
```

#### Test Failures
```bash
# Run with debug mode
npm run test:e2e:isolated:debug

# Run with UI
npm run test:e2e:isolated:ui
```

### Environment Verification
Run the environment test to verify everything is working:
```bash
npm run test:e2e:isolated -- tests/e2e/00-e2e-environment-test.spec.ts
```

## Migration from Old Setup

### Before (Non-isolated)
```bash
npm run test:e2e  # Used dev environment
```

### After (Isolated)
```bash
npm run test:e2e:isolated  # Uses isolated environment
```

The old commands still work but are not recommended for new development.

## Benefits

1. **Complete Isolation**: E2E tests don't interfere with development
2. **Faster Tests**: Optimized database and configuration
3. **Reliable Results**: Consistent test data and environment
4. **Easy Debugging**: Separate environment for troubleshooting
5. **CI/CD Ready**: Designed for continuous integration

## Next Steps

1. Migrate existing E2E tests to use the isolated environment
2. Update CI/CD pipelines to use `npm run test:e2e:isolated`
3. Add more E2E-specific test data as needed
4. Consider adding E2E performance tests with isolated environment
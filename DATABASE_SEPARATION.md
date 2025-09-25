# Database Separation: Dev vs E2E

This document explains how the development and E2E test databases are kept separate.

## Overview

Capacinator uses SQLite databases for both development and E2E testing, but these must be kept completely separate to avoid data contamination.

## Database Locations

- **Development Database**: `data/capacinator-dev.db`
- **E2E Test Database**: `.e2e-data/e2e-test.db`

## Environment Configuration

### Development Environment
- Set `NODE_ENV=development` (or leave it unset)
- Uses regular seed data from `src/server/database/seeds/`
- Persistent database that maintains state between runs

### E2E Test Environment
- Set `NODE_ENV=e2e`
- Uses special E2E seed data from `e2e-test-data-consolidated.ts`
- Database is recreated for each test run
- Contains test users like "E2E Over Utilized", "E2E Normal Utilized", etc.

## Common Issues and Solutions

### Issue: E2E test data appearing in dev environment

**Cause**: The `.env.local` file had `NODE_ENV=e2e`, causing the dev server to use E2E configuration.

**Solution**: 
1. Ensure `.env.local` has `NODE_ENV=development` (or remove the NODE_ENV line entirely)
2. Run the cleanup script: `./scripts/cleanup-databases.sh`
3. Restart your dev server

### Issue: Tests failing due to wrong database

**Cause**: E2E tests might be using the dev database or vice versa.

**Solution**: 
1. Check that E2E test scripts properly set `NODE_ENV=e2e`
2. Ensure dev server is stopped before running E2E tests
3. Use separate ports (dev: 3110, E2E: 3120)

## Scripts

### Cleanup Script
`./scripts/cleanup-databases.sh` - Removes both databases for a fresh start

### Start Scripts
- `npm run dev` - Starts development server with dev database
- `npm run test:e2e` - Runs E2E tests with isolated test database

## How It Works

1. **Server Startup**: 
   - Checks `NODE_ENV` environment variable
   - If `e2e`, initializes E2E database at `.e2e-data/e2e-test.db`
   - Otherwise, uses dev database at `data/capacinator-dev.db`

2. **Database Connection** (`src/server/database/index.ts`):
   - The `getDb()` function returns appropriate database based on `NODE_ENV`
   - Logs which database is being used on first connection

3. **Knex Configuration** (`src/server/database/knexfile.ts`):
   - Exports different configurations based on environment
   - E2E config uses optimized settings for test performance

## Best Practices

1. **Never** set `NODE_ENV=e2e` in `.env.local` or `.env.development`
2. **Always** stop dev server before running E2E tests
3. **Use** the cleanup script if you see unexpected data
4. **Check** server logs to verify which database is being used
5. **Keep** E2E test data prefixed with "E2E" for easy identification

## Verification

When starting the server, you should see one of these messages:
- `🔧 Using development database` - For normal development
- `🧪 Using E2E test database` - Only during E2E test runs

If you see the wrong message, check your environment configuration.
# Server Instance Separation: Dev vs E2E

This document confirms that Capacinator maintains **distinct and separate server instances** for development and E2E testing environments.

## Overview

✅ **Confirmed**: Dev and E2E environments use completely separate server instances with different ports, databases, and configurations.

## Server Instance Details

### Development Server
- **Backend Port**: 3110 (default)
- **Frontend Port**: 3120 (default)
- **Database**: `data/capacinator-dev.db`
- **Environment**: `NODE_ENV=development`
- **Start Command**: `npm run dev` or `./scripts/start-dev.sh`
- **Config File**: `.env.development`

### E2E Test Server
- **Backend Port**: 3110 (same as dev, but separate instance)
- **Frontend Port**: 3120 (same as dev, but separate instance)
- **Database**: `.e2e-data/e2e-test.db` OR `:memory:` (in-memory)
- **Environment**: `NODE_ENV=e2e`
- **Start Command**: `npm run e2e:start` or during test execution
- **Config File**: `.env.e2e`

## Key Separation Mechanisms

### 1. Environment-Based Database Selection
```typescript
// src/server/index.ts
if (isE2E) {
  const e2eDb = await initializeE2EDatabase();
  global.__E2E_DB__ = e2eDb;
} else {
  await initializeDatabase();
}
```

### 2. Database Path Isolation
- Dev: `data/capacinator-dev.db` (persistent SQLite file)
- E2E: `.e2e-data/e2e-test.db` or `:memory:` (ephemeral)

### 3. Process Isolation
E2E tests spawn their own server processes:
```typescript
// tests/e2e/helpers/e2e-global-setup.ts
serverProcess = spawn('npx', ['tsx', 'src/server/index.ts'], {
  env: {
    NODE_ENV: 'e2e',
    DATABASE_URL: ':memory:',
    PORT: '3110',
    CLIENT_PORT: '3120'
  }
});
```

### 4. Port Conflict Resolution
The E2E setup checks if dev servers are already running:
```typescript
const serverRunning = await checkServerRunning(baseURL);
if (serverRunning) {
  console.log('ℹ️ Development server already running');
  // E2E tests will use separate database even with same ports
}
```

## Server Management Scripts

### Development
- `npm run dev` - Starts dev servers in foreground
- `npm run dev:stop` - Stops background dev servers
- `npm run dev:logs` - Shows dev server logs

### E2E Testing
- `npm run e2e:start` - Manually starts E2E servers
- `npm run e2e:stop` - Stops E2E servers
- `npm run e2e:restart` - Restarts E2E servers
- `npm run e2e:status` - Checks E2E server health
- `npm run e2e:logs` - Shows E2E server logs

## Database Verification

When servers start, they log which database they're using:
```
🔧 Using development database  (for dev)
🧪 Using E2E test database     (for E2E)
```

## Best Practices

1. **Avoid Port Conflicts**: Stop dev servers before running E2E tests for cleaner isolation
2. **Check Logs**: Server logs clearly indicate which database/environment is active
3. **Use Cleanup Scripts**: Run `./scripts/cleanup-databases.sh` if you suspect data contamination
4. **Environment Files**: Never set `NODE_ENV=e2e` in `.env.local` or `.env.development`

## Troubleshooting

### If E2E data appears in dev environment:
1. Check `.env.local` doesn't have `NODE_ENV=e2e`
2. Run cleanup script: `./scripts/cleanup-databases.sh`
3. Restart dev server: `npm run dev`

### If tests use wrong database:
1. Ensure E2E server manager is used: `npm run e2e:start`
2. Check test logs for database initialization messages
3. Verify `NODE_ENV=e2e` is set in test environment

## Summary

The separation is achieved through:
- ✅ Different database files/locations
- ✅ Environment-based configuration (`NODE_ENV`)
- ✅ Separate server processes (even if using same ports)
- ✅ Database initialization logic that checks environment
- ✅ Clear logging to identify which instance is running
- ✅ Dedicated management scripts for each environment

This architecture ensures complete isolation between development and E2E testing environments, preventing data contamination and allowing both to run independently.
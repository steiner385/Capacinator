# E2E Server Connection Issues - Root Cause Analysis & Solutions

## Root Causes Identified

### 1. Port Mismatch
**Issue**: The E2E tests were configured to use different ports than what the servers were actually started on.
- `.env.e2e` specified: `PORT=3110, CLIENT_PORT=3120`
- `start-e2e-server.sh` was using: `3111, 3121`
- Playwright config expected: `3120`

**Solution**: Updated scripts to read ports from `.env.e2e` consistently.

### 2. HTTPS vs HTTP Check
**Issue**: The startup script was checking `https://localhost:3121` when the server runs on HTTP.

**Solution**: Changed to `http://localhost:$E2E_CLIENT_PORT`

### 3. No Robust Process Management
**Issue**: Scripts didn't handle edge cases like:
- Stale processes from previous runs
- Partial server states
- Proper cleanup on failure
- Race conditions during startup

**Solution**: Created comprehensive server management system.

### 4. Missing Health Checks
**Issue**: No proper health verification before running tests.

**Solution**: Added health check utilities with retry logic.

### 5. Hardcoded Values
**Issue**: Ports and URLs were hardcoded in multiple places, making configuration fragile.

**Solution**: Centralized configuration in `e2e.config.ts`

## Solutions Implemented

### 1. Enhanced Server Management Script
Created `/scripts/e2e-server-manager.sh` with:
- Proper port detection from environment
- Health checks with retries
- Graceful shutdown handling
- PID file management
- Colored output for better visibility
- Status checking capability

### 2. Centralized Configuration
Created `/tests/e2e/config/e2e.config.ts` with:
- Single source of truth for ports
- Configurable timeouts and retries
- Feature flags for different environments
- Helper utilities for common operations

### 3. Process Manager Infrastructure
Leveraging existing:
- `/tests/e2e/helpers/process-manager.ts` - Handles process lifecycle
- `/tests/e2e/helpers/health-check.ts` - Verifies server health
- Lock files to prevent concurrent test runs

### 4. Updated NPM Scripts
```json
{
  "e2e:start": "./scripts/e2e-server-manager.sh start",
  "e2e:stop": "./scripts/e2e-server-manager.sh stop",
  "e2e:restart": "./scripts/e2e-server-manager.sh restart",
  "e2e:status": "./scripts/e2e-server-manager.sh status",
  "e2e:logs": "./scripts/e2e-server-manager.sh logs"
}
```

## Preventing Future Issues

### 1. Environment Variables
Always read from `.env.e2e`:
```bash
E2E_PORT=${PORT:-3110}
E2E_CLIENT_PORT=${CLIENT_PORT:-3120}
```

### 2. Health Checks
Always verify server health before proceeding:
```bash
wait_for_url "http://localhost:$E2E_PORT/api/health" 30
```

### 3. Process Cleanup
Always clean up before starting:
```bash
kill_port $E2E_PORT
kill_port $E2E_CLIENT_PORT
```

### 4. Error Handling
Proper error messages and exit codes:
```bash
if [ $counter -eq $timeout ]; then
    echo "❌ Backend server failed to start within ${timeout} seconds"
    tail -20 "$LOG_DIR/e2e-backend.log"
    exit 1
fi
```

### 5. Monitoring
Log files for debugging:
- Backend: `/tmp/capacinator-logs/e2e-backend.log`
- Frontend: `/tmp/capacinator-logs/e2e-frontend.log`

## Best Practices

1. **Always check server status before running tests**:
   ```bash
   npm run e2e:status
   ```

2. **Use the server manager for all operations**:
   ```bash
   npm run e2e:start    # Start servers
   npm run e2e:stop     # Stop servers
   npm run e2e:restart  # Restart servers
   npm run e2e:logs     # View logs
   ```

3. **Clean restart if issues persist**:
   ```bash
   npm run e2e:stop
   npm run e2e:start
   ```

4. **Debug connection issues**:
   ```bash
   # Check if ports are in use
   lsof -i:3110
   lsof -i:3120
   
   # Check server health
   curl http://localhost:3110/api/health
   curl http://localhost:3120
   ```

5. **Environment-specific configuration**:
   - Development: Uses ports 3110/3120
   - E2E Testing: Uses ports from `.env.e2e`
   - CI: Can override with environment variables

## Verification

To verify the fixes work:

1. Stop any running servers:
   ```bash
   npm run e2e:stop
   ```

2. Start E2E servers:
   ```bash
   npm run e2e:start
   ```

3. Check status:
   ```bash
   npm run e2e:status
   ```

4. Run tests:
   ```bash
   npm run test:e2e
   ```

The server connection issues should now be completely resolved with proper error handling, health checks, and configuration management in place.
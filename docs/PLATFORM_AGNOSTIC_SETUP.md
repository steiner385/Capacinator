# Platform-Agnostic Development Setup

This document describes the cross-platform development environment that works on Windows, macOS, and Linux.

## Overview

The Capacinator development environment has been updated to be fully platform-agnostic. All shell scripts have been replaced with Node.js/TypeScript scripts that work identically across all platforms.

## Key Changes

### 1. Cross-Platform Process Management

**New Utility**: `scripts/utils/process-manager.ts`

Provides cross-platform functions for:
- Finding processes on specific ports
- Killing processes by PID
- Managing PID files in system temp directory
- Checking if processes are running

**Platform Detection**: Automatically handles Windows (`netstat`, `taskkill`) vs Unix (`lsof`, `kill`) commands.

### 2. Temp Directory Handling

All temporary files now use Node's `os.tmpdir()` instead of hardcoded `/tmp/`:
- PID files: `{tmpdir}/capacinator/*.pid`
- Log files: `{tmpdir}/capacinator/logs/*.log`

**Windows Example**: `C:\Users\{user}\AppData\Local\Temp\capacinator\`
**macOS Example**: `/var/folders/.../capacinator/`
**Linux Example**: `/tmp/capacinator/`

### 3. Replaced Scripts

#### Development Scripts
- ✅ `cleanup-orphaned-processes.sh` → `cleanup-processes.ts`
- ✅ `start-dev.sh` → `start-dev.ts`
- ✅ `stop-dev.sh` → `stop-dev.ts`
- ✅ `dev-logs.sh` → `dev-logs.ts`

#### Production Scripts
- ✅ `start-prod.sh`, `stop-prod.sh`, `prod-logs.sh` → `prod-server.ts`
- ✅ `start-server.sh`, `stop-server.sh`, `server-logs.sh` → `prod-server.ts`

#### E2E Scripts
- ✅ `e2e-server-manager.sh` → `e2e-server.ts`

#### Utility Scripts
- ✅ `list-commands.sh` → `list-commands.ts`

### 4. Server Manager Architecture

**New Class**: `ServerManager` (in `server-manager.ts`)

Generic server management with commands:
- `start` - Start the server in background
- `stop` - Stop the server gracefully (or force kill)
- `restart` - Stop then start
- `status` - Check if server is running
- `logs` - View server logs (with follow mode)

## Usage

All npm scripts now work identically on Windows, macOS, and Linux:

### Development

```bash
npm run dev              # Start dev servers (backend + frontend)
npm run dev:stop         # Stop dev servers
npm run dev:logs         # View live logs
npm run dev:cleanup      # Clean up orphaned processes
```

### Production

```bash
npm run prod:start       # Start production server
npm run prod:stop        # Stop production server
npm run prod:logs        # View production logs
npm run prod:status      # Check server status
npm run prod:restart     # Restart server
```

### E2E Testing

```bash
npm run e2e:start        # Start E2E test server
npm run e2e:stop         # Stop E2E test server
npm run e2e:status       # Check E2E server status
npm run e2e:logs         # View E2E server logs
npm run e2e:restart      # Restart E2E server
```

### Utilities

```bash
npm run commands         # List all available commands
npm run dev:cleanup      # Clean up any orphaned processes
```

## Technical Details

### Process Detection

**Windows**:
```typescript
// Find process on port
netstat -ano | findstr :3110

// Kill process
taskkill /F /PID 1234 /T
```

**Unix (macOS/Linux)**:
```typescript
// Find process on port
lsof -ti:3110

// Kill process
kill -9 1234
```

### Log Viewing

**Windows**: Uses PowerShell `Get-Content -Wait -Tail 50`
**Unix**: Uses `tail -f`

### Background Processes

**Windows**: Uses `spawn()` with `shell: true` (detached mode doesn't work reliably)
**Unix**: Uses `spawn()` with `detached: true` and `child.unref()`

## Migration Notes

### Old Way (Shell Scripts)

```json
{
  "scripts": {
    "dev": "./scripts/start-dev.sh",
    "dev:stop": "./scripts/stop-dev.sh"
  }
}
```

Required:
- Bash shell (Git Bash on Windows)
- Unix commands (ps, lsof, etc.)
- Hardcoded `/tmp/` paths

### New Way (Node.js Scripts)

```json
{
  "scripts": {
    "dev": "npx tsx scripts/start-dev.ts",
    "dev:stop": "npx tsx scripts/stop-dev.ts"
  }
}
```

Requires:
- Node.js (already required for the project)
- Works in cmd, PowerShell, bash, etc.
- Cross-platform by default

## Remaining Shell Scripts

Some scripts still use `.sh` for specific reasons:

1. **`prod:frontend:*`** - Frontend-specific scripts (low priority, rarely used)
2. **`e2e:*:legacy`** - Legacy E2E scripts (kept for compatibility)
3. **`test:scenarios:all`** - Complex test orchestration (can be converted if needed)

These can be converted to Node.js scripts if needed, but they're lower priority since:
- They're not used in the main development workflow
- They work fine in Git Bash on Windows
- Converting them would require significant effort

## Benefits

### ✅ Cross-Platform
- Works on Windows without Git Bash
- Identical behavior on macOS and Linux
- No platform-specific code in npm scripts

### ✅ Better Developer Experience
- Clear error messages
- Consistent output formatting
- Status checks show URLs and PIDs

### ✅ More Reliable
- Proper process cleanup
- Handles edge cases (stale PIDs, ports in use)
- Graceful shutdown with fallback to force kill

### ✅ Maintainable
- TypeScript with type safety
- Reusable `ServerManager` class
- Single source of truth for process management

## Testing

Test that everything works on your platform:

```bash
# 1. Clean up any existing processes
npm run dev:cleanup

# 2. Start dev environment
npm run dev

# 3. Check logs
npm run dev:logs

# 4. Stop dev environment
npm run dev:stop

# 5. Verify cleanup
npm run dev:cleanup
```

Should see:
- ✅ Servers start successfully
- ✅ PID files created in temp directory
- ✅ Logs accessible
- ✅ Clean shutdown
- ✅ No orphaned processes

## Troubleshooting

### "Port already in use"

```bash
npm run dev:cleanup
```

### "Cannot find process"

Check if PID file exists:
```bash
# Windows
dir %TEMP%\capacinator\

# macOS/Linux
ls /tmp/capacinator/
```

### "Permission denied"

On Unix systems, ensure scripts are executable:
```bash
chmod +x scripts/*.ts
```

(Not needed since we use `npx tsx`, but good practice)

## Future Improvements

Potential enhancements:
1. Convert remaining shell scripts (prod:frontend, test:scenarios)
2. Add health check endpoints for servers
3. Implement graceful reload (zero-downtime restarts)
4. Add monitoring/metrics for running services
5. Create a TUI (terminal UI) for managing all services

## Contributing

When adding new scripts:
1. Use TypeScript (`.ts` files)
2. Import from `utils/process-manager.ts`
3. Use `os.tmpdir()` for temp files
4. Add to package.json with `npx tsx`
5. Test on Windows, macOS, and Linux

## Resources

- [Node.js os module](https://nodejs.org/api/os.html)
- [Node.js child_process](https://nodejs.org/api/child_process.html)
- [tsx - TypeScript execute](https://github.com/privatenumber/tsx)

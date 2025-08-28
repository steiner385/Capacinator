# Building Capacinator for Windows

This guide explains how to build Capacinator as a standalone Windows executable.

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- Windows, macOS, or Linux (for cross-platform builds)

## Quick Build

```bash
# Install dependencies
npm install

# Build for Windows
./build-windows.sh
# or
npm run dist:win
```

## Build Output

The Windows installer will be created in the `dist-electron/` directory:
- `Capacinator Setup 1.0.0.exe` - Windows installer

## Architecture

The standalone application consists of:

1. **Electron Shell**: Provides the desktop application wrapper
2. **Express Server**: Runs locally on port 3456, serves the API
3. **React Frontend**: Built and bundled, served by the Express server
4. **SQLite Database**: Stored in the user's app data directory
   - Windows: `%APPDATA%/Capacinator/capacinator.db`

## Database Location

The SQLite database is stored in the platform-specific application data directory:
- Windows: `C:\Users\<username>\AppData\Roaming\Capacinator\capacinator.db`
- The database is automatically created on first run

## Features

- **Offline Operation**: Fully functional without internet connection
- **Local Database**: All data stored locally in SQLite
- **Automatic Backups**: Scheduled database backups (configurable)
- **Import/Export**: Excel import/export functionality
- **Database Backup/Restore**: Manual backup through File menu

## Development vs Production

- Development: Frontend and backend run as separate processes
- Production: Everything bundled into a single executable
  - Express server starts automatically
  - Frontend served from Express
  - Database in user data directory

## Troubleshooting

### Build Fails

1. Ensure all dependencies are installed: `npm install`
2. Check Node.js version: `node --version` (should be 20+)
3. Clear build cache: `rm -rf dist dist-electron node_modules && npm install`

### Application Won't Start

1. Check if port 3456 is available
2. Look for error logs in the console
3. Try running with DevTools: Add `--inspect` to the Electron command

### Database Issues

1. Database location: `%APPDATA%/Capacinator/`
2. Check write permissions
3. Use File > Backup Database to save a copy

## Manual Build Steps

If the build script doesn't work, you can build manually:

```bash
# 1. Clean
rm -rf dist dist-electron

# 2. Build server (TypeScript to JavaScript)
npx tsc

# 3. Build client (React app)
npx vite build --config client-vite.config.ts

# 4. Prepare Electron files
mkdir -p dist/electron
cp src/electron/main-production.js dist/electron/main.js
cp src/electron/preload.js dist/electron/preload.js

# 5. Build with Electron Builder
npx electron-builder --win
```

## Configuration

The build configuration is in `package.json` under the `build` section:
- `appId`: com.capacinator.app
- `productName`: Capacinator
- Windows uses NSIS installer
- Includes desktop and start menu shortcuts
# Revised Architecture - Standalone Application

## Overview
A completely standalone project capacity planning application that requires zero external dependencies and can run on a freshly imaged Windows PC.

## Revised Tech Stack

### Core Technologies
- **Runtime**: Node.js (bundled with Electron)
- **Database**: SQLite3 (embedded, file-based)
- **ORM**: Knex.js (lightweight query builder)
- **Desktop Framework**: Electron
- **Backend**: Express.js (embedded server)
- **Frontend**: React + Vite (bundled)
- **State**: Built-in React Context/Zustand
- **Cache**: In-memory with persistence to SQLite
- **UI**: Tailwind CSS + shadcn/ui

### Key Changes from Original Proposal
1. **SQLite instead of PostgreSQL**: File-based database, no server needed
2. **No Redis**: Use in-memory caching with SQLite persistence
3. **No Docker**: Single executable with Electron
4. **Bundled Node.js**: Electron includes Node runtime
5. **Local file storage**: All data stored in user's app data directory

## Application Structure

```
project-capacitizer.exe
├── Embedded Node.js runtime
├── SQLite database file (auto-created)
├── Web server (Express)
├── React frontend (pre-built)
└── All dependencies bundled
```

## Data Storage

### Database Location
- Windows: `%APPDATA%/Capacinator/data.db`
- Mac: `~/Library/Application Support/Capacinator/data.db`
- Linux: `~/.config/Capacinator/data.db`

### Backup Strategy
- Automatic daily backups to `backups/` folder
- Export to Excel for external backup
- Import/restore from Excel files

## Deployment Model

### Windows Installer
```json
{
  "build": {
    "appId": "com.company.capacinator",
    "productName": "Capacinator",
    "directories": {
      "output": "dist-electron"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}
```

### Single Executable Features
1. **Auto-update**: Built-in update mechanism
2. **Portable mode**: Can run from USB drive
3. **No admin rights**: Installs to user directory
4. **Self-contained**: All assets bundled

## Performance Optimizations

### SQLite Configuration
```javascript
const db = new Database('data.db');
db.pragma('journal_mode = WAL'); // Write-Ahead Logging
db.pragma('synchronous = NORMAL'); // Balance safety/speed
db.pragma('cache_size = 10000'); // 10MB cache
db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped I/O
```

### In-Memory Caching
```javascript
class CacheService {
  private cache = new Map();
  private sqlite: Database;
  
  async get(key: string) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const value = await this.sqlite.get(key);
    this.cache.set(key, value);
    return value;
  }
}
```

## Simplified Architecture Benefits

1. **Zero Configuration**: Just download and run
2. **No IT Dependencies**: No database server, no Redis, no Docker
3. **Offline Capable**: Works without internet
4. **Fast**: SQLite is extremely fast for single-user apps
5. **Portable**: Can copy entire app folder to another PC
6. **Backup-friendly**: Database is a single file

## Migration Path

### From Excel
1. User clicks "Import Excel"
2. Select Excel file
3. Map columns (with smart defaults)
4. Import into SQLite
5. Verify and start using

### To Production Server (Future)
If scaling needed later:
1. Export SQLite to PostgreSQL script
2. Deploy web version
3. Multi-user support
4. Keep desktop app as client

## Resource Requirements

### Minimum System Requirements
- Windows 10 or later
- 4GB RAM
- 500MB disk space
- No internet required

### Typical Performance
- 100,000+ projects
- 10,000+ resources
- Sub-second queries
- 50MB typical database size

## Development Workflow

### Local Development
```bash
npm run dev          # Runs Electron with hot-reload
npm run build        # Builds distributable
npm run dist         # Creates installer
```

### Build Process
1. Bundle frontend with Vite
2. Compile TypeScript
3. Package with Electron
4. Create NSIS installer
5. Sign executable (optional)

## Security Considerations

### Local Security
- Database encrypted at rest (optional)
- User authentication (local only)
- Backup encryption
- No network exposure

### Data Privacy
- All data stored locally
- No cloud connectivity
- No telemetry
- Complete user control
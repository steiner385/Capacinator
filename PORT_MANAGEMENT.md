# Port Management Guidelines

## Port Range Allocation

**Capacinator Application Port Range: 3100-3199**

This application is strictly limited to the port range 3100-3199 to avoid conflicts with other applications and development environments.

## Environment-Specific Port Assignments

### Development Environment
- **Frontend (Vite)**: `3120`
- **Backend (Express)**: `3121` 
- **Database**: Uses SQLite (file-based, no port)

### End-to-End Testing (E2E)
- **Frontend (Vite)**: `3130`
- **Backend (Express)**: `3131`
- **Test Database**: Uses separate SQLite file

### QA Environment
- **Frontend**: `3140`
- **Backend**: `3141`
- **Database**: Uses separate SQLite file or external DB

### Production Environment
- **Frontend**: `3150`
- **Backend**: `3151`
- **Database**: External database (PostgreSQL/MySQL)

### Staging Environment
- **Frontend**: `3160`
- **Backend**: `3161`
- **Database**: External database

## Reserved Ports (for future use)
- `3100-3119`: Reserved for additional development services
- `3170-3199`: Reserved for additional environments or services

## Configuration Files

Each environment should have its own configuration with hardcoded ports:

- `.env.development` - Dev ports (3120, 3121)
- `.env.test` - E2E ports (3130, 3131)
- `.env.qa` - QA ports (3140, 3141)
- `.env.production` - Prod ports (3150, 3151)
- `.env.staging` - Staging ports (3160, 3161)

## Updated Configuration Files

The following configuration files have been updated to use the new port assignments:

### Frontend Configuration
- `vite.config.ts` - Uses `VITE_PORT` environment variable
- `client/src/lib/api-client.ts` - Default API URL uses port 3121

### E2E Testing Configuration  
- `playwright.config.ts` - Uses ports 3130/3131 for E2E testing
- `playwright.scenario.config.ts` - Scenario tests use E2E ports
- `playwright.scenario.simple.config.ts` - Simple scenario tests
- `playwright.scenario.debug.config.ts` - Debug configuration

### Server Configuration
- `src/server/index.ts` - Loads environment-specific .env files
- Default port fallback changed from 8081 to 3121
- CORS origins updated to new port range

### Production/Deployment Configuration
- `nginx/dev.capacinator.com.conf` - Nginx config uses port 3121 (development)
- `nginx/dev.capacinator.com-temp.conf` - Temporary nginx config
- `nginx/e2e.capacinator.com.conf` - E2E testing nginx config uses ports 3130/3131
- `systemd/capacinator.service` - SystemD service uses port 3151
- `ecosystem.config.js` - PM2 configuration uses port 3151

### Domain Configuration
- **Development**: `dev.capacinator.com` → ports 3120/3121
- **E2E Testing**: `e2e.capacinator.com` → ports 3130/3131  
- **QA**: `qa.capacinator.com` → ports 3140/3141 (to be configured)
- **Production**: `capacinator.com` → ports 3150/3151

## Port Conflict Resolution

If you encounter port conflicts within the 3100-3199 range:

1. Check if another Capacinator instance is running: `lsof -i :3120-3199`
2. Stop conflicting processes: `kill -9 <PID>`
3. Use environment-specific commands: `npm run dev:e2e`, `npm run dev:qa`

## Enforcement

- All port configurations are hardcoded in environment files
- No dynamic port assignment
- Scripts validate port availability before starting
- Documentation must be updated if port assignments change

## Quick Reference

| Environment | Frontend | Backend | Command |
|-------------|----------|---------|---------|
| Development | 3120     | 3121    | `npm run dev` |
| E2E Testing | 3130     | 3131    | `npm run dev:e2e` |
| QA          | 3140     | 3141    | `npm run dev:qa` |
| Production  | 3150     | 3151    | `npm start` |
| Staging     | 3160     | 3161    | `npm run start:staging` |
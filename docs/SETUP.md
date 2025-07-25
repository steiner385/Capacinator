# Capacinator Setup Guide

## Prerequisites

### Required Software

1. **Node.js 20.0.0 or higher**
   - Check version: `node --version`
   - Download from: https://nodejs.org/
   - Consider using a version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm)

2. **npm (comes with Node.js)**
   - Check version: `npm --version`

3. **Build tools for native modules**
   - **Ubuntu/Debian**: 
     ```bash
     sudo apt-get update
     sudo apt-get install build-essential python3
     ```
   - **macOS**: 
     ```bash
     xcode-select --install
     ```
   - **Windows**: 
     - Install Visual Studio Build Tools
     - Or run PowerShell as Administrator: `npm install -g windows-build-tools`

## Installation Methods

### Method 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Capacinator

# Run the automated setup script
./scripts/setup-environment.sh
```

The setup script will:
- ✓ Check Node.js version (must be 20+)
- ✓ Check for required system dependencies
- ✓ Install npm dependencies
- ✓ Initialize SQLite database
- ✓ Run database migrations
- ✓ Seed database with sample data
- ✓ Install Playwright browsers for E2E testing
- ✓ Create .env file with default configuration

### Method 2: Manual Setup

#### Step 1: Clone and Navigate
```bash
git clone <repository-url>
cd Capacinator
```

#### Step 2: Verify Node.js Version
```bash
node --version
# Should output v20.0.0 or higher
```

#### Step 3: Install Dependencies
```bash
npm install
```

#### Step 4: Setup Database
```bash
# Create data directory
mkdir -p data

# Initialize database schema
npm run db:init

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

#### Step 5: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env file as needed
# nano .env  # or use your preferred editor
```

#### Step 6: Install E2E Test Dependencies (Optional)
```bash
npx playwright install
```

## Troubleshooting

### Node.js Version Issues

**Problem**: `EBADENGINE Unsupported engine` warnings during npm install

**Solution**: Upgrade to Node.js 20 or higher
```bash
# Using nvm
nvm install 20
nvm use 20

# Or download directly from nodejs.org
```

### Better-SQLite3 Build Errors

**Problem**: `The module was compiled against a different Node.js version`

**Solution**: 
```bash
# Clean and rebuild
rm -rf node_modules
npm cache clean --force
npm install

# Or specifically rebuild better-sqlite3
npm rebuild better-sqlite3
```

### Missing Build Tools

**Problem**: `gyp ERR! stack Error: Can't find Python executable`

**Solution**: Install required build tools (see Prerequisites above)

### Database Connection Errors

**Problem**: `Could not connect to database`

**Solution**:
1. Ensure the data directory exists: `mkdir -p data`
2. Check file permissions: `ls -la data/`
3. Try removing and recreating: `rm -f data/capacinator.db && npm run db:init`

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3110`

**Solution**:
1. Check what's using the port: `lsof -i :3110` (Linux/Mac) or `netstat -ano | findstr :3110` (Windows)
2. Kill the process or change the port in .env file

## Verification

After setup, verify everything is working:

```bash
# 1. Start the development server
npm run dev

# 2. Check the API health endpoint
curl http://localhost:3110/api/health

# 3. Open the application in your browser
# Navigate to: http://localhost:3120

# 4. Run tests (optional)
npm test
npm run test:e2e
```

## Common npm Scripts

- `npm run dev` - Start development servers
- `npm run dev:server` - Start backend only
- `npm run dev:client` - Start frontend only
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Check code style
- `npm run typecheck` - Check TypeScript types
- `npm run build` - Build for production
- `npm run commands` - List all available commands

## Next Steps

1. Review the [README.md](../README.md) for project overview
2. Check [API_ENDPOINTS.md](./API_ENDPOINTS.md) for API documentation
3. See [database-schema.md](./database-schema.md) for database structure
4. Explore the sample data in the application
5. Try importing Excel data using the templates in `test-data/`

## Getting Help

- Check existing documentation in the `docs/` folder
- Review test files for usage examples
- Create an issue on GitHub for bugs or questions
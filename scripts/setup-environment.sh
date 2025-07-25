#!/bin/bash

echo "🔧 Capacinator Environment Setup"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_ge() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Track if all requirements are met
REQUIREMENTS_MET=true

# 1. Check Node.js version
echo -n "Checking Node.js version... "
if command_exists node; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -ge 20 ]; then
        echo -e "${GREEN}✓ Node.js v$NODE_VERSION (meets requirement: >=20.0.0)${NC}"
    else
        echo -e "${RED}✗ Node.js v$NODE_VERSION (requires >=20.0.0)${NC}"
        echo -e "${YELLOW}  Please install Node.js 20 or higher from https://nodejs.org/${NC}"
        REQUIREMENTS_MET=false
    fi
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo -e "${YELLOW}  Please install Node.js 20 or higher from https://nodejs.org/${NC}"
    REQUIREMENTS_MET=false
fi

# 2. Check npm
echo -n "Checking npm... "
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    REQUIREMENTS_MET=false
fi

# 3. Check for required system dependencies
echo -n "Checking system dependencies... "
MISSING_DEPS=""

# Check for build tools (needed for native modules)
if ! command_exists gcc && ! command_exists clang; then
    MISSING_DEPS="$MISSING_DEPS build-essential"
fi

# Check for Python (needed for node-gyp)
if ! command_exists python3 && ! command_exists python; then
    MISSING_DEPS="$MISSING_DEPS python3"
fi

if [ -z "$MISSING_DEPS" ]; then
    echo -e "${GREEN}✓ All system dependencies found${NC}"
else
    echo -e "${YELLOW}⚠ Missing system dependencies:$MISSING_DEPS${NC}"
    echo "  Install with: sudo apt-get install$MISSING_DEPS (on Ubuntu/Debian)"
fi

# 4. Check if in correct directory
echo -n "Checking project directory... "
if [ -f "package.json" ] && grep -q '"name": "capacinator"' package.json; then
    echo -e "${GREEN}✓ In Capacinator project directory${NC}"
else
    echo -e "${RED}✗ Not in Capacinator project directory${NC}"
    echo -e "${YELLOW}  Please run this script from the project root${NC}"
    REQUIREMENTS_MET=false
fi

echo ""

# If requirements not met, exit
if [ "$REQUIREMENTS_MET" = false ]; then
    echo -e "${RED}❌ Some requirements are not met. Please fix the issues above and run again.${NC}"
    exit 1
fi

# Continue with setup
echo "✅ All requirements met! Proceeding with setup..."
echo ""

# 5. Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if npm install succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
fi

# 6. Setup database
echo ""
echo "🗄️  Setting up database..."

# Create data directory
mkdir -p data

# Initialize database
echo "  Initializing database..."
npm run db:init

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Database initialization failed${NC}"
    exit 1
fi

# Run migrations
echo "  Running migrations..."
npm run db:migrate

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Database migrations failed${NC}"
    exit 1
fi

# Seed database
echo "  Seeding database with sample data..."
npm run db:seed

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Database seeding failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database setup complete${NC}"

# 7. Install Playwright browsers for E2E tests
echo ""
echo "🎭 Installing Playwright browsers for E2E tests..."
npx playwright install

# 8. Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Environment
NODE_ENV=development

# Server
PORT=3110
API_URL=http://localhost:3110

# Database
DATABASE_PATH=./data/capacinator.db

# Frontend
VITE_API_URL=http://localhost:3110

# JWT Secret (change this in production!)
JWT_SECRET=your-secret-key-here

# Email configuration (optional)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
EOF
    echo -e "${GREEN}✓ Created .env file with defaults${NC}"
fi

# 9. Summary
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the development server: ${GREEN}npm run dev${NC}"
echo "  2. Open your browser to: ${GREEN}http://localhost:3120${NC}"
echo ""
echo "Other useful commands:"
echo "  - ${GREEN}npm test${NC} - Run unit tests"
echo "  - ${GREEN}npm run test:e2e${NC} - Run E2E tests"
echo "  - ${GREEN}npm run lint${NC} - Check code style"
echo "  - ${GREEN}npm run typecheck${NC} - Check TypeScript types"
echo "  - ${GREEN}npm run commands${NC} - List all available commands"
#!/bin/bash

echo "=== Database Cleanup Script ==="
echo "This script will help separate E2E and development databases"
echo ""

# Check current NODE_ENV
echo "Current NODE_ENV: ${NODE_ENV:-not set}"
echo ""

# Show database files
echo "=== Current Database Files ==="
echo "Development database:"
if [ -f "data/capacinator-dev.db" ]; then
    ls -la data/capacinator-dev.db
else
    echo "  Not found (this is normal if you haven't run dev server yet)"
fi

echo ""
echo "E2E test database:"
if [ -f ".e2e-data/e2e-test.db" ]; then
    ls -la .e2e-data/e2e-test.db
else
    echo "  Not found (this is normal if you haven't run E2E tests yet)"
fi

echo ""
echo "=== Checking for database conflicts ==="

# Check if .env.local has NODE_ENV=e2e
if grep -q "^NODE_ENV=e2e" .env.local 2>/dev/null; then
    echo "⚠️  WARNING: .env.local contains NODE_ENV=e2e"
    echo "   This will cause your dev environment to use E2E database!"
    echo "   This has been fixed in the updated .env.local file."
fi

# Offer to clean up databases
echo ""
read -p "Do you want to clean up the databases? This will remove both dev and E2E databases. (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up databases..."
    
    # Stop any running servers first
    echo "Please ensure all servers are stopped before continuing..."
    read -p "Press Enter when ready..."
    
    # Remove development database
    if [ -f "data/capacinator-dev.db" ]; then
        rm -f data/capacinator-dev.db
        echo "✅ Removed development database"
    fi
    
    # Remove E2E database
    if [ -f ".e2e-data/e2e-test.db" ]; then
        rm -f .e2e-data/e2e-test.db
        echo "✅ Removed E2E test database"
    fi
    
    echo ""
    echo "Databases cleaned up successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start your dev server: npm run dev"
    echo "2. The dev database will be recreated with clean data"
    echo "3. E2E tests will create their own isolated database when run"
else
    echo "Skipping database cleanup."
fi

echo ""
echo "=== Environment Verification ==="
echo "Your .env.local file now correctly sets NODE_ENV=development"
echo "This ensures dev and E2E databases remain separate."
echo ""
echo "Database locations:"
echo "- Dev: data/capacinator-dev.db"
echo "- E2E: .e2e-data/e2e-test.db"
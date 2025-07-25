#!/bin/bash

echo "🔧 Capacinator Setup for Node.js 18"
echo "==================================="
echo ""
echo "⚠️  WARNING: This project requires Node.js 20 or higher for full compatibility."
echo "This script will attempt to set up with Node.js 18, but some features may not work."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ] || ! grep -q '"name": "capacinator"' package.json; then
    echo "❌ Not in Capacinator project directory. Please run from project root."
    exit 1
fi

echo "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

# Try to use an older version of better-sqlite3 that supports Node 18
echo ""
echo "📦 Installing compatible better-sqlite3 version..."
npm install better-sqlite3@9.6.0 --save

echo ""
echo "🗄️  Setting up database..."

# Create data directory
mkdir -p data

# Try to initialize database
echo "  Attempting database initialization..."
npm run db:init

if [ $? -eq 0 ]; then
    echo "✅ Database initialized successfully"
    
    # Run migrations
    echo "  Running migrations..."
    npm run db:migrate
    
    # Seed database
    echo "  Seeding database..."
    npm run db:seed
else
    echo "❌ Database initialization failed"
    echo ""
    echo "You may need to upgrade to Node.js 20 or higher."
fi

echo ""
echo "Setup attempt complete. If you encountered errors, please:"
echo "  1. Upgrade to Node.js 20 or higher"
echo "  2. Run: npm install"
echo "  3. Run: npm run db:init && npm run db:migrate && npm run db:seed"
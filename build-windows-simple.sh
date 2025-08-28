#!/bin/bash

echo "🚀 Building Capacinator for Windows (Simple Build)..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist dist-electron

# Create dist directories
mkdir -p dist/server dist/client dist/electron

# Copy server files (skip TypeScript compilation for now)
echo ""
echo "📦 Copying server files..."
cp -r src/server dist/
cp package.json dist/
cp package-lock.json dist/

# Build React client
echo ""
echo "📦 Building client..."
NODE_ENV=production npm run build:client

# Copy built client files
cp -r client/dist/* dist/client/

# Copy Electron files
echo ""
echo "📋 Preparing Electron files..."
cp src/electron/main-production.js dist/electron/main.js
cp src/electron/preload.js dist/electron/preload.js

# Update package.json for production
echo ""
echo "📝 Updating package.json for production..."
node -e "
const pkg = require('./package.json');
pkg.main = 'electron/main.js';
pkg.devDependencies = undefined;
require('fs').writeFileSync('./dist/package.json', JSON.stringify(pkg, null, 2));
"

echo ""
echo "✅ Build files prepared! Next steps:"
echo "1. cd dist"
echo "2. npm install --production"
echo "3. npx electron-builder --win"
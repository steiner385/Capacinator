#!/bin/bash

echo "🚀 Building Capacinator for Windows..."
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist dist-electron

# Build TypeScript server
echo ""
echo "📦 Building server..."
npm run build:server

# Build React client
echo ""
echo "📦 Building client..."
npm run build:client

# Copy Electron files
echo ""
echo "📋 Preparing Electron files..."
mkdir -p dist/electron
cp src/electron/main-production.cjs dist/electron/main.js
cp src/electron/preload.cjs dist/electron/preload.js

# Build Windows executable
echo ""
echo "🔨 Building Windows executable..."
npm run dist:win

echo ""
echo "✅ Build complete! Check dist-electron/ for the Windows installer."
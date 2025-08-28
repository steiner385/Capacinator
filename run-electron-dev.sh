#!/bin/bash

echo "🚀 Starting Capacinator in Electron (Development Mode)"
echo ""
echo "⚠️  Make sure the development servers are running:"
echo "   npm run dev"
echo ""
echo "Starting Electron..."

# Run Electron with the development main file
npx electron src/electron/main-dev.cjs
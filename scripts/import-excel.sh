#!/bin/bash

# Excel Import Utility Shell Wrapper
# Provides a convenient shell interface for the Node.js import script

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js to use this utility"
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Error: node_modules not found"
    echo "Please run 'npm install' first"
    exit 1
fi

# Run the TypeScript import script with all arguments passed through
exec npx tsx scripts/import-excel.js "$@"
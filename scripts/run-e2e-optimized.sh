#!/bin/bash

# Run E2E tests with optimized configuration
# Usage: ./scripts/run-e2e-optimized.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
CONFIG="playwright.config.optimized.ts"
PROJECT=""
SHARD=""
WORKERS=""
HEADED=""
DEBUG=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT="--project=$2"
      shift 2
      ;;
    --shard)
      SHARD="--shard=$2"
      shift 2
      ;;
    --workers)
      WORKERS="--workers=$2"
      shift 2
      ;;
    --headed)
      HEADED="--headed"
      shift
      ;;
    --debug)
      DEBUG="--debug"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --project <name>    Run specific project (smoke, api, crud, etc.)"
      echo "  --shard <n/m>       Run specific shard (e.g., 1/3)"
      echo "  --workers <n>       Number of parallel workers"
      echo "  --headed            Run tests in headed mode"
      echo "  --debug             Run with debug output"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                           # Run all tests"
      echo "  $0 --project smoke           # Run smoke tests only"
      echo "  $0 --shard 1/3              # Run first shard of 3"
      echo "  $0 --workers 8              # Run with 8 workers"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Check if optimized config exists, if not use the original
if [ ! -f "$CONFIG" ]; then
  echo -e "${YELLOW}Optimized config not found, copying from original...${NC}"
  cp playwright.config.ts playwright.config.optimized.ts
fi

# Ensure test results directory exists
mkdir -p test-results

# Build the command
CMD="npx playwright test --config=$CONFIG"

# Add optional parameters
[ -n "$PROJECT" ] && CMD="$CMD $PROJECT"
[ -n "$SHARD" ] && CMD="$CMD $SHARD"
[ -n "$WORKERS" ] && CMD="$CMD $WORKERS"
[ -n "$HEADED" ] && CMD="$CMD $HEADED"
[ -n "$DEBUG" ] && CMD="$CMD $DEBUG"

# Add performance reporter
CMD="$CMD --reporter=list,html,./tests/e2e/helpers/performance-reporter.ts"

# Print what we're running
echo -e "${GREEN}Running E2E tests with optimized configuration...${NC}"
echo "Command: $CMD"
echo ""

# Run the tests
if $CMD; then
  echo -e "\n${GREEN}✅ Tests completed successfully!${NC}"
  
  # Show performance summary if available
  if [ -f "test-results/performance-report.json" ]; then
    echo -e "\n${GREEN}📊 Performance Summary:${NC}"
    node -r tsx tests/e2e/helpers/generate-performance-report.ts test-results/performance-report.json
  fi
else
  echo -e "\n${RED}❌ Tests failed!${NC}"
  exit 1
fi
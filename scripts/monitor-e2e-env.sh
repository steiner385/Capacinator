#!/bin/bash

# E2E Environment Monitor
# Monitors the health of the E2E test environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
E2E_PORT=3110
E2E_CLIENT_PORT=3120
LOG_DIR="/tmp/capacinator-logs"
PID_DIR="$PROJECT_ROOT/.e2e-pids"

# Function to check port status
check_port() {
    local port=$1
    local name=$2
    
    if lsof -i:$port >/dev/null 2>&1; then
        local pid=$(lsof -ti:$port 2>/dev/null || echo "unknown")
        echo -e "${YELLOW}⚠️  Port $port ($name): IN USE (PID: $pid)${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port ($name): AVAILABLE${NC}"
        return 0
    fi
}

# Function to check process status
check_process() {
    local pattern=$1
    local name=$2
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        local count=$(echo "$pids" | wc -l)
        echo -e "${YELLOW}⚠️  $name: $count process(es) running${NC}"
        echo "     PIDs: $pids"
        return 1
    else
        echo -e "${GREEN}✅ $name: NOT RUNNING${NC}"
        return 0
    fi
}

# Function to check PID files
check_pid_files() {
    if [ -d "$PID_DIR" ]; then
        local files=$(find "$PID_DIR" -name "*.pid" 2>/dev/null || true)
        if [ -n "$files" ]; then
            echo -e "${YELLOW}⚠️  PID files found:${NC}"
            for file in $files; do
                if [ -f "$file" ]; then
                    local name=$(basename "$file" .pid)
                    local content=$(cat "$file" 2>/dev/null || echo "{}")
                    local pid=$(echo "$content" | grep -o '"pid":[0-9]*' | cut -d: -f2 || echo "unknown")
                    
                    if [ "$pid" != "unknown" ] && kill -0 "$pid" 2>/dev/null; then
                        echo -e "     ${RED}$name (PID: $pid) - RUNNING${NC}"
                    else
                        echo -e "     ${YELLOW}$name (PID: $pid) - STALE${NC}"
                    fi
                fi
            done
            return 1
        else
            echo -e "${GREEN}✅ No PID files found${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ No PID directory${NC}"
        return 0
    fi
}

# Function to check lock file
check_lock_file() {
    local lock_file="$PROJECT_ROOT/.e2e-lock"
    
    if [ -f "$lock_file" ]; then
        local content=$(cat "$lock_file" 2>/dev/null || echo "{}")
        local pid=$(echo "$content" | grep -o '"pid":[0-9]*' | cut -d: -f2 || echo "unknown")
        local timestamp=$(echo "$content" | grep -o '"timestamp":[0-9]*' | cut -d: -f2 || echo "0")
        
        if [ "$timestamp" != "0" ]; then
            local age=$(( ($(date +%s) * 1000 - timestamp) / 1000 / 60 ))
            echo -e "${YELLOW}⚠️  Lock file exists (PID: $pid, Age: ${age} minutes)${NC}"
        else
            echo -e "${YELLOW}⚠️  Lock file exists (PID: $pid)${NC}"
        fi
        
        if [ "$pid" != "unknown" ] && kill -0 "$pid" 2>/dev/null; then
            echo -e "     ${RED}Lock holder is ACTIVE${NC}"
        else
            echo -e "     ${YELLOW}Lock holder is INACTIVE (stale lock)${NC}"
        fi
        return 1
    else
        echo -e "${GREEN}✅ No lock file${NC}"
        return 0
    fi
}

# Function to check disk space
check_disk_space() {
    if command -v df >/dev/null 2>&1; then
        local usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$usage" -gt 90 ]; then
            echo -e "${RED}❌ Disk usage: ${usage}% (CRITICAL)${NC}"
            return 1
        elif [ "$usage" -gt 80 ]; then
            echo -e "${YELLOW}⚠️  Disk usage: ${usage}% (WARNING)${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Disk usage: ${usage}%${NC}"
            return 0
        fi
    else
        echo -e "${BLUE}ℹ️  Disk space check not available${NC}"
        return 0
    fi
}

# Function to check logs
check_logs() {
    if [ -d "$LOG_DIR" ]; then
        local log_count=$(find "$LOG_DIR" -name "*.log" -type f 2>/dev/null | wc -l)
        local total_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        
        echo -e "${BLUE}ℹ️  Log directory: $log_count files, $total_size${NC}"
        
        # Check for recent errors
        local recent_errors=$(find "$LOG_DIR" -name "*.log" -mmin -10 -exec grep -l "ERROR\|FATAL\|Unhandled" {} \; 2>/dev/null | wc -l)
        if [ "$recent_errors" -gt 0 ]; then
            echo -e "     ${YELLOW}⚠️  $recent_errors log file(s) with recent errors${NC}"
        fi
    else
        echo -e "${GREEN}✅ No log directory${NC}"
    fi
}

# Main monitoring function
monitor() {
    clear
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}        E2E Environment Monitor - $(date +"%Y-%m-%d %H:%M:%S")${NC}"
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}"
    echo
    
    echo -e "${BLUE}🔍 Port Status:${NC}"
    check_port $E2E_PORT "Backend"
    check_port $E2E_CLIENT_PORT "Frontend"
    echo
    
    echo -e "${BLUE}🔍 Process Status:${NC}"
    check_process "tsx.*src/server/index.ts" "Backend Server"
    check_process "vite.*client-vite.config.ts" "Frontend Server"
    check_process "playwright.*test" "Playwright Tests"
    echo
    
    echo -e "${BLUE}🔍 File System Status:${NC}"
    check_pid_files
    check_lock_file
    check_disk_space
    echo
    
    echo -e "${BLUE}🔍 Logs:${NC}"
    check_logs
    echo
    
    echo -e "${BLUE}═════════════════════════════════════════════════════${NC}"
}

# Function to clean up environment
cleanup_environment() {
    echo -e "\n${BLUE}🧹 Cleaning up E2E environment...${NC}\n"
    
    # Kill processes on ports
    echo -e "${BLUE}Killing processes on E2E ports...${NC}"
    lsof -ti:$E2E_PORT 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    lsof -ti:$E2E_CLIENT_PORT 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    
    # Remove PID files
    if [ -d "$PID_DIR" ]; then
        echo -e "${BLUE}Removing PID files...${NC}"
        rm -rf "$PID_DIR"
    fi
    
    # Remove lock file
    local lock_file="$PROJECT_ROOT/.e2e-lock"
    if [ -f "$lock_file" ]; then
        echo -e "${BLUE}Removing lock file...${NC}"
        rm -f "$lock_file"
    fi
    
    # Clean logs (optional)
    if [ "$1" = "--clean-logs" ]; then
        echo -e "${BLUE}Cleaning logs...${NC}"
        rm -rf "$LOG_DIR"
    fi
    
    echo -e "\n${GREEN}✅ Cleanup completed${NC}\n"
}

# Main script
case "${1:-monitor}" in
    monitor)
        if [ "${2:-}" = "--watch" ]; then
            # Continuous monitoring
            while true; do
                monitor
                sleep 5
            done
        else
            # Single check
            monitor
        fi
        ;;
    clean|cleanup)
        cleanup_environment "${2:-}"
        ;;
    *)
        echo "Usage: $0 [monitor|clean] [options]"
        echo "  monitor        Check E2E environment status (default)"
        echo "    --watch      Continuous monitoring (refresh every 5s)"
        echo "  clean          Clean up E2E environment"
        echo "    --clean-logs Also remove log files"
        exit 1
        ;;
esac
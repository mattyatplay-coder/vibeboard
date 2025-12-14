#!/bin/bash
#
# VibeBoard Service Stopper
# Kills all running VibeBoard services
#
# Usage: ./stop-vibeboard.sh
#

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Stopping VibeBoard Services${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Kill processes by port
kill_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pid" ]; then
        echo -e "${RED}Stopping${NC} $name (port $port, PID $pid)..."
        kill $pid 2>/dev/null
        sleep 0.5
        # Force kill if still running
        if lsof -ti:$port >/dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
        fi
        echo -e "${GREEN}✓${NC} $name stopped"
    else
        echo -e "  $name not running (port $port)"
    fi
}

kill_port 8188 "ComfyUI"
kill_port 3000 "Frontend"
kill_port 3001 "Backend"
kill_port 8765 "MMAudio"

echo ""
echo -e "${GREEN}All services stopped.${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

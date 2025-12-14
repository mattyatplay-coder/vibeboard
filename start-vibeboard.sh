#!/bin/bash
#
# VibeBoard Service Launcher
# Opens all services in separate Terminal windows with restart capability
#
# Usage: ./start-vibeboard.sh
#

VIBEBOARD_DIR="/Users/matthenrichmacbook/Antigravity/vibeboard"
COMFYUI_DIR="/Users/matthenrichmacbook/ComfyUI"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VibeBoard Service Launcher${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to open a new terminal with a service wrapper
open_service_terminal() {
    local title="$1"
    local dir="$2"
    local setup_cmd="$3"
    local run_cmd="$4"
    local port="$5"

    # Create the command that will run in the terminal
    local full_cmd="cd \"$dir\" && clear && "
    full_cmd+="echo '════════════════════════════════════════════════════════════════' && "
    full_cmd+="echo '  $title' && "
    full_cmd+="echo '  Port: $port' && "
    full_cmd+="echo '════════════════════════════════════════════════════════════════' && "
    full_cmd+="echo '' && "
    full_cmd+="echo 'Press Ctrl+C then type \"r\" to restart' && "
    full_cmd+="echo '' && "
    full_cmd+="echo '════════════════════════════════════════════════════════════════' && "
    full_cmd+="echo '' && "

    # Add setup command if provided
    if [ -n "$setup_cmd" ]; then
        full_cmd+="$setup_cmd && "
    fi

    # Create restart function and run
    full_cmd+="r() { echo 'Restarting...'; $run_cmd; }; "
    full_cmd+="$run_cmd"

    osascript <<EOF
tell application "Terminal"
    activate
    do script "$full_cmd"
    delay 0.5
    set custom title of front window to "$title"
end tell
EOF
}

# 1. ComfyUI (Python on port 8188)
echo -e "${GREEN}[1/4]${NC} Starting ComfyUI..."
open_service_terminal \
    "ComfyUI" \
    "$COMFYUI_DIR" \
    "source venv/bin/activate" \
    "python main.py --listen 0.0.0.0 --port 8188" \
    "8188"

sleep 1.5

# 2. Backend (Express.js on port 3001)
echo -e "${GREEN}[2/4]${NC} Starting Backend..."
open_service_terminal \
    "VibeBoard Backend" \
    "$VIBEBOARD_DIR/backend" \
    "" \
    "npm run dev" \
    "3001"

sleep 1.5

# 3. Frontend (Next.js on port 3000)
echo -e "${GREEN}[3/4]${NC} Starting Frontend..."
open_service_terminal \
    "VibeBoard Frontend" \
    "$VIBEBOARD_DIR/frontend" \
    "" \
    "npm run dev" \
    "3000"

sleep 1.5

# 4. MMAudio Local Service (Python on port 8765)
echo -e "${GREEN}[4/4]${NC} Starting MMAudio Local Service..."
open_service_terminal \
    "MMAudio NSFW" \
    "$VIBEBOARD_DIR/local-services/mmaudio-nsfw" \
    "source venv/bin/activate" \
    "python server.py" \
    "8765"


# 5. Antigravity Browser
echo -e "${GREEN}[5/5]${NC} Launching Antigravity Browser..."
open_service_terminal \
    "Antigravity Browser" \
    "$VIBEBOARD_DIR/browser" \
    "" \
    "npm start" \
    "APP"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All services started!${NC}"
echo ""
echo -e "  ${YELLOW}ComfyUI${NC}:   http://localhost:8188"
echo -e "  ${YELLOW}Frontend${NC}:  http://localhost:3000"
echo -e "  ${YELLOW}Backend${NC}:   http://localhost:3001"
echo -e "  ${YELLOW}MMAudio${NC}:   http://localhost:8765"
echo -e "  ${YELLOW}Browser${NC}:   Antigravity"
echo ""
echo "To restart a service: Press Ctrl+C, then type 'r' and Enter"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

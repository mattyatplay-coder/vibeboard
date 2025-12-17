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

# ==========================================
# DRIVE AUTO-MOUNT CHECK
# ==========================================
# ==========================================
# DRIVE AUTO-MOUNT CHECK
# ==========================================

check_and_mount_drive() {
    local drive_name="$1"
    local drive_path="/Volumes/$drive_name"
    local server_address="smb://Mac mini.local/$drive_name"

    echo -e "${BLUE}Checking for drive: $drive_name...${NC}"

    if [ ! -d "$drive_path" ]; then
        echo -e "${YELLOW}Drive not found at $drive_path${NC}"
        echo -e "${YELLOW}Attempting auto-mount from Mac mini...${NC}"
        
        # Try to open the connection (standard macOS mount behavior)
        open "$server_address"
        
        # Wait up to 10 seconds for it to appear
        for i in {1..10}; do
            echo -n "."
            sleep 1
            if [ -d "$drive_path" ]; then
                echo ""
                echo -e "${GREEN}Drive mounted successfully!${NC}"
                return 0
            fi
        done
        echo ""
        
        # Final check
        if [ ! -d "$drive_path" ]; then
            echo -e "${RED}ERROR: Could not mount '$drive_name' automatically.${NC}"
            echo -e "${RED}Please ensure 'Mac mini' is on and the drive is connected.${NC}"
            echo -e "${YELLOW}Press Enter to ignore and continue, or Ctrl+C to abort.${NC}"
            read
        fi
    else
        echo -e "${GREEN}Drive found: $drive_path${NC}"
    fi
    echo ""
}

# Check both drives
check_and_mount_drive "Samsung.SSD.990.PRO.2TB"
check_and_mount_drive "WD 8TB"

# ==========================================

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

    # Escape quotes for AppleScript
    # 1. Escape backslashes first
    full_cmd=${full_cmd//\\/\\\\}
    # 2. Escape double quotes
    full_cmd=${full_cmd//\"/\\\"}

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
echo -e "${GREEN}All systems operational!${NC}"
echo -e "  ${YELLOW}ComfyUI${NC}:   http://localhost:8188"
echo -e "  ${YELLOW}Frontend${NC}:  http://localhost:3000"
echo -e "  ${YELLOW}Backend${NC}:   http://localhost:3001"
echo -e "  ${YELLOW}MMAudio${NC}:   http://localhost:8765"
echo -e "  ${YELLOW}Browser${NC}:   Antigravity"
echo ""
echo "To restart a service: Press Ctrl+C, then type 'r' and Enter"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}REMINDER: When you are finished, run './scripts/backup_assets.sh' to sync your files!${NC}"

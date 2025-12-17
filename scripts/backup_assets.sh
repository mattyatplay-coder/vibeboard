#!/bin/bash

# Configuration
LOCAL_DIR="/Users/matthenrichmacbook/Antigravity/vibeboard/backend/uploads/"
REMOTE_DIR="/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/uploads/"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Asset Backup...${NC}"

# Check if drive is mounted
if [ ! -d "$REMOTE_DIR" ]; then
    echo -e "${RED}Error: Network drive not found at $REMOTE_DIR${NC}"
    echo "Please mount 'Samsung.SSD.990.PRO.2TB' and try again."
    exit 1
fi

# Sync files
# -a: archive mode (recursive, preserves timestamps/permissions)
# -v: verbose
# --progress: show progress bar
# --ignore-existing: optional, skip files that exist (safer for overwrite protection)
# To MOVE files (delete from local), uncomment the next line:
# RSYNC_OPTS="-av --progress --remove-source-files"
RSYNC_OPTS="-av --progress"

echo "Syncing from local to network drive..."
rsync $RSYNC_OPTS "$LOCAL_DIR" "$REMOTE_DIR"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Backup Complete!${NC}"
else
    echo -e "${RED}Backup Failed.${NC}"
fi

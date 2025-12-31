#!/bin/bash
# VibeBoard Feature Backup Sync Script
# Syncs modified files to external SSD backup
#
# Usage: ./sync-to-backup.sh [--dry-run] [specific-file]

MAIN_REPO="/Users/matthenrichmacbook/Antigravity/vibeboard"
BACKUP_DIR="/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backup drive is mounted
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}ERROR: Backup drive not mounted at $BACKUP_DIR${NC}"
    echo "Please connect the Samsung SSD and try again."
    exit 1
fi

DRY_RUN=false
SPECIFIC_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            SPECIFIC_FILE="$1"
            shift
            ;;
    esac
done

sync_file() {
    local file="$1"
    local src="$MAIN_REPO/$file"
    local dst="$BACKUP_DIR/$file"
    local dst_dir=$(dirname "$dst")

    if [ ! -f "$src" ]; then
        echo -e "${YELLOW}SKIP: $file (not found)${NC}"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}DRY-RUN: Would sync $file${NC}"
    else
        mkdir -p "$dst_dir"
        cp "$src" "$dst"
        echo -e "${GREEN}SYNCED: $file${NC}"
    fi
}

if [ -n "$SPECIFIC_FILE" ]; then
    # Sync specific file
    echo "Syncing specific file: $SPECIFIC_FILE"
    sync_file "$SPECIFIC_FILE"
else
    # Sync all modified files from git status
    echo "Syncing all modified files..."
    echo ""

    cd "$MAIN_REPO"

    # Get modified files (staged and unstaged)
    git status --porcelain | while read -r status file; do
        # Skip deleted files
        if [[ "$status" == "D"* ]] || [[ "$status" == *"D" ]]; then
            continue
        fi

        # Handle renamed files (R100 old -> new)
        if [[ "$status" == "R"* ]]; then
            file=$(echo "$file" | sed 's/.* -> //')
        fi

        # Clean up file path (remove quotes if present)
        file=$(echo "$file" | tr -d '"')

        sync_file "$file"
    done

    # Also sync feature-dna files
    echo ""
    echo "Syncing feature-dna files..."
    for dna_file in .claude/feature-dna/*.json; do
        if [ -f "$MAIN_REPO/$dna_file" ]; then
            sync_file "$dna_file"
        fi
    done
fi

echo ""
echo -e "${GREEN}Backup sync complete!${NC}"
echo "Backup location: $BACKUP_DIR"

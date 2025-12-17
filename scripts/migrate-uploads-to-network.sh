#!/bin/bash
# =============================================================================
# VibeBoard Uploads Migration Script
# Migrates backend/uploads to network storage with symlink
# =============================================================================

set -e

# Configuration
NETWORK_VOLUME="/Volumes/Samsung.SSD.990.PRO.2TB"
NETWORK_UPLOADS_DIR="$NETWORK_VOLUME/vibeboard backup/uploads"
LOCAL_UPLOADS_DIR="backend/uploads"
LOCAL_TEMP_BACKUP="backend/uploads_local_temp"

echo "=============================================="
echo "VibeBoard Uploads Migration to Network Storage"
echo "=============================================="
echo ""
echo "Source: $LOCAL_UPLOADS_DIR"
echo "Destination: $NETWORK_UPLOADS_DIR"
echo ""

# Check if network volume is mounted
if [ ! -d "$NETWORK_VOLUME" ]; then
    echo "❌ ERROR: Network volume not mounted at $NETWORK_VOLUME"
    echo "   Please connect and mount the Samsung SSD first."
    exit 1
fi

echo "✅ Network volume is mounted"

# Check if source exists
if [ ! -d "$LOCAL_UPLOADS_DIR" ]; then
    echo "❌ ERROR: Source directory does not exist: $LOCAL_UPLOADS_DIR"
    exit 1
fi

# Check if already a symlink
if [ -L "$LOCAL_UPLOADS_DIR" ]; then
    echo "⚠️  $LOCAL_UPLOADS_DIR is already a symlink"
    echo "   Current target: $(readlink "$LOCAL_UPLOADS_DIR")"
    echo "   Nothing to do. Exiting."
    exit 0
fi

# Create destination directory if needed
echo ""
echo "Creating destination directory..."
mkdir -p "$NETWORK_UPLOADS_DIR"

# Keep temp folders local for performance
echo ""
echo "Preserving temp folders locally..."
if [ -d "$LOCAL_UPLOADS_DIR/temp" ]; then
    mkdir -p "$LOCAL_TEMP_BACKUP"
    mv "$LOCAL_UPLOADS_DIR/temp" "$LOCAL_TEMP_BACKUP/"
fi
if [ -d "$LOCAL_UPLOADS_DIR/temp_frames" ]; then
    mkdir -p "$LOCAL_TEMP_BACKUP"
    mv "$LOCAL_UPLOADS_DIR/temp_frames" "$LOCAL_TEMP_BACKUP/"
fi

# Count files to migrate
FILE_COUNT=$(find "$LOCAL_UPLOADS_DIR" -type f | wc -l | tr -d ' ')
echo ""
echo "Found $FILE_COUNT files to migrate"

# Confirm before proceeding
echo ""
read -p "Proceed with migration? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    # Restore temp folders
    if [ -d "$LOCAL_TEMP_BACKUP/temp" ]; then
        mv "$LOCAL_TEMP_BACKUP/temp" "$LOCAL_UPLOADS_DIR/"
    fi
    if [ -d "$LOCAL_TEMP_BACKUP/temp_frames" ]; then
        mv "$LOCAL_TEMP_BACKUP/temp_frames" "$LOCAL_UPLOADS_DIR/"
    fi
    rmdir "$LOCAL_TEMP_BACKUP" 2>/dev/null || true
    exit 1
fi

# Migrate files using rsync (preserves permissions, shows progress)
echo ""
echo "Migrating files (this may take a while for 118GB)..."
rsync -avh --progress "$LOCAL_UPLOADS_DIR/" "$NETWORK_UPLOADS_DIR/"

# Verify migration
DEST_COUNT=$(find "$NETWORK_UPLOADS_DIR" -type f | wc -l | tr -d ' ')
echo ""
echo "Verification: $DEST_COUNT files in destination"

if [ "$DEST_COUNT" -lt "$FILE_COUNT" ]; then
    echo "⚠️  WARNING: File count mismatch. Source: $FILE_COUNT, Dest: $DEST_COUNT"
    echo "   Not removing source. Please investigate."
    exit 1
fi

# Remove original and create symlink
echo ""
echo "Creating symlink..."
rm -rf "$LOCAL_UPLOADS_DIR"
ln -s "$NETWORK_UPLOADS_DIR" "$LOCAL_UPLOADS_DIR"

# Restore temp folders to network location (they'll work through symlink)
# Or keep them truly local by moving back
echo ""
echo "Restoring temp folders locally..."
mkdir -p "$LOCAL_UPLOADS_DIR/temp"
mkdir -p "$LOCAL_UPLOADS_DIR/temp_frames"
if [ -d "$LOCAL_TEMP_BACKUP/temp" ]; then
    # Move contents, not the folder itself
    mv "$LOCAL_TEMP_BACKUP/temp/"* "$LOCAL_UPLOADS_DIR/temp/" 2>/dev/null || true
fi
if [ -d "$LOCAL_TEMP_BACKUP/temp_frames" ]; then
    mv "$LOCAL_TEMP_BACKUP/temp_frames/"* "$LOCAL_UPLOADS_DIR/temp_frames/" 2>/dev/null || true
fi
rm -rf "$LOCAL_TEMP_BACKUP"

echo ""
echo "=============================================="
echo "✅ Migration Complete!"
echo "=============================================="
echo ""
echo "Symlink created: $LOCAL_UPLOADS_DIR -> $NETWORK_UPLOADS_DIR"
echo ""
echo "To rollback:"
echo "  rm $LOCAL_UPLOADS_DIR"
echo "  mv /path/to/backup/uploads $LOCAL_UPLOADS_DIR"

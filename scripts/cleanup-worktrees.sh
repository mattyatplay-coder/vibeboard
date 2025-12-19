#!/bin/bash

# VibeBoard Worktree Cleanup Script
# ==================================
# Removes stale worktrees that are behind main.
#
# Usage:
#   ./scripts/cleanup-worktrees.sh        # Dry run (shows what would be removed)
#   ./scripts/cleanup-worktrees.sh --force # Actually remove worktrees

set -e

DRY_RUN=true
if [ "$1" == "--force" ]; then
    DRY_RUN=false
fi

echo "VibeBoard Worktree Cleanup"
echo "=========================="
echo ""

# Get current main commit
MAIN_COMMIT=$(git rev-parse main)
echo "Current main: $MAIN_COMMIT ($(git log -1 --format='%s' main))"
echo ""

# List worktrees to potentially remove
STALE_WORKTREES=()
ACTIVE_WORKTREES=()

while read -r line; do
    # Parse worktree output
    PATH_WT=$(echo "$line" | awk '{print $1}')
    COMMIT=$(echo "$line" | awk '{print $2}')
    BRANCH=$(echo "$line" | awk '{print $3}' | tr -d '[]')

    # Skip main
    if [ "$BRANCH" == "main" ]; then
        continue
    fi

    # Check if commit is an ancestor of main (i.e., already merged/superseded)
    if git merge-base --is-ancestor "$COMMIT" "$MAIN_COMMIT" 2>/dev/null; then
        STALE_WORKTREES+=("$PATH_WT|$BRANCH|$COMMIT")
    else
        ACTIVE_WORKTREES+=("$PATH_WT|$BRANCH|$COMMIT")
    fi
done < <(git worktree list)

echo "STALE WORKTREES (behind main):"
echo "------------------------------"
if [ ${#STALE_WORKTREES[@]} -eq 0 ]; then
    echo "  (none)"
else
    for entry in "${STALE_WORKTREES[@]}"; do
        IFS='|' read -r path branch commit <<< "$entry"
        echo "  - $branch ($commit)"
        echo "    Path: $path"
    done
fi
echo ""

echo "ACTIVE WORKTREES (may have unique work):"
echo "-----------------------------------------"
if [ ${#ACTIVE_WORKTREES[@]} -eq 0 ]; then
    echo "  (none)"
else
    for entry in "${ACTIVE_WORKTREES[@]}"; do
        IFS='|' read -r path branch commit <<< "$entry"
        echo "  - $branch ($commit)"
        echo "    Path: $path"
    done
fi
echo ""

if [ ${#STALE_WORKTREES[@]} -eq 0 ]; then
    echo "No stale worktrees to clean up."
    exit 0
fi

if [ "$DRY_RUN" = true ]; then
    echo "DRY RUN: Would remove ${#STALE_WORKTREES[@]} worktrees."
    echo "Run with --force to actually remove them."
    echo ""
    echo "Command to run:"
    echo "  ./scripts/cleanup-worktrees.sh --force"
else
    echo "Removing ${#STALE_WORKTREES[@]} stale worktrees..."
    echo ""

    for entry in "${STALE_WORKTREES[@]}"; do
        IFS='|' read -r path branch commit <<< "$entry"
        echo "Removing: $branch"
        git worktree remove "$path" --force
        git branch -D "$branch" 2>/dev/null || true
    done

    echo ""
    echo "Cleanup complete!"
    echo ""
    echo "Remaining worktrees:"
    git worktree list
fi

# Session Checkpoint & Documentation Update

## Quick Reference
- **Starting a session?** → Follow "Session Start Mode" (quick sync)
- **Completed a task?** → Follow "Task Complete Mode" (full workflow)
- **Making frontend changes?** → ALWAYS use worktree development environment

---

## Worktree Development Environment (MANDATORY)

**CRITICAL**: All frontend development MUST happen in the worktree first, then be pushed to main repo after verification.

### Development Servers
| Component | Location | Port |
|-----------|----------|------|
| Frontend (dev) | Worktree: `/Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend` | **3005** |
| Backend | Main repo: `/Users/matthenrichmacbook/Antigravity/vibeboard/backend` | **3001** |

### Starting Development Servers
```bash
# Terminal 1: Start worktree frontend on port 3005
cd /Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend
PORT=3005 npm run dev

# Terminal 2: Start main repo backend on port 3001 (if not already running)
cd /Users/matthenrichmacbook/Antigravity/vibeboard/backend
npm run dev
```

### Development Workflow
1. **Make ALL frontend changes in worktree** (`/Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend/src/`)
2. **Test at http://localhost:3005** (connects to backend at port 3001)
3. **Verify changes work correctly**
4. **Copy verified files to main repo** (see Push to Main Repo below)
5. **Run build verification in main repo**
6. **Commit to main repo**

### Push to Main Repo
After verifying changes work in worktree:
```bash
# Copy specific file(s) from worktree to main repo
cp /Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend/src/components/prompts/PromptBuilder.tsx \
   /Users/matthenrichmacbook/Antigravity/vibeboard/frontend/src/components/prompts/

# Or copy entire directory
cp -r /Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend/src/components/generations/* \
   /Users/matthenrichmacbook/Antigravity/vibeboard/frontend/src/components/generations/
```

### Why Worktree Development?
- **Isolation**: Changes don't affect main repo until verified
- **Protection**: Feature registry protects against accidental overwrites
- **Testing**: Can test changes without breaking production code
- **Rollback**: Easy to discard worktree changes if something goes wrong

---

## Session Start Mode (Quick Sync)

When beginning a new session, quickly sync with current state:

### 1. Read Current State
Read these files to understand where we left off:
- `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/SYSTEM_STATE.yaml` - Canonical system state (AUTHORITY)
- `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/task.md` - Current task list
- `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/agent_resolutions.json` - Recent decisions

### 2. Check Memory MCP
Query memory for VibeBoard entities to get additional context.

### 3. Report Ready
Summarize:
- Last completed work
- Next pending tasks
- Any blockers noted

**Then ask**: "What would you like to work on?"

---

## Task Complete Mode (Full Workflow)

After completing a task, follow ALL steps below:

### Step 1: Worktree Verification (Frontend Changes)
If you made frontend changes in the worktree:

1. **Verify worktree frontend builds**:
```bash
cd /Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend
npm run build
```

2. **Copy verified files to main repo**:
```bash
# Example: Copy modified components
cp -r /Users/matthenrichmacbook/.claude-worktrees/vibeboard/wizardly-engelbart/frontend/src/components/prompts/* \
   /Users/matthenrichmacbook/Antigravity/vibeboard/frontend/src/components/prompts/
```

3. **List files that were copied** (for documentation)

### Step 2: Follow Approval Gate Protocol
Execute verification checks per `/Users/matthenrichmacbook/Antigravity/approval.gate.json`:
- Frontend (main repo): `npm run build`, `npm run lint`, `npm run test`
- Backend: `npm run build`, `npm run dev` + curl verification
- Paste terminal output as proof

### Step 3: Update SYSTEM_STATE.yaml
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/SYSTEM_STATE.yaml` (AUTHORITY - outranks all other context)

Update the canonical system state:
- Infrastructure status changes (database, backend, frontend, tunnels, GPU)
- Security configuration updates
- API routing changes
- Update `LAST_UPDATED` timestamp

### Step 4: Update .agent/task.md
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/task.md`

- Check off completed tasks with `[x]`
- Add new tasks discovered during work
- Use format: `- [x] Task description <!-- id: N -->`

### Step 5: Update agent_resolutions.json
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/agent_resolutions.json`

Add a new session entry with:
```json
{
    "id": "SESSION-XXX",
    "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
    "topic": "Feature/Bug name",
    "context": {
        "symptom": "What was the problem",
        "user_intent": "What user wanted",
        "constraints": ["Any limitations"]
    },
    "execution_log": [
        {"step": 1, "action": "Type", "description": "What was done"}
    ],
    "architectural_decision": {
        "decision": "What was decided",
        "rationale": "Why"
    }
}
```

### Step 5b: Add to Fix Registry (If Bug/Issue Fixed)
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/fix_registry.json`

If this session fixed a bug or resolved an issue, add an entry:
```json
{
    "id": "FIX-XXX",
    "date": "YYYY-MM-DD",
    "title": "Short descriptive title",
    "category": "frontend|backend|infrastructure|api|database",
    "tags": ["searchable", "keywords"],
    "symptom": "What was broken or wrong",
    "root_cause": "Why it was broken",
    "solution": {
        "summary": "One-line fix description",
        "steps": [
            "Step 1: What to do first",
            "Step 2: What to do next"
        ],
        "commands": [
            "any shell commands used"
        ]
    },
    "files_modified": ["list/of/files.ts"],
    "verification": "How to confirm the fix worked",
    "related_entities": ["Memory MCP entity names"]
}
```

**Purpose**: Makes fixes searchable by tags, reproducible via steps, and linked to Memory MCP.

### Step 6: Backup to External Drive
**Location**: `/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup`

Sync all changes to the backup drive:
```bash
rsync -av --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.git' \
  /Users/matthenrichmacbook/Antigravity/vibeboard/ \
  "/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup/"
```

Verify the backup completed successfully.

### Step 7: Update vibeboard.md (if needed)
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/vibeboard.md`

Update for:
- Major feature additions
- Architecture changes
- New API endpoints
- Resolved bugs (add to table)
- Change log entries

### Step 8: Back up to Memory MCP
Create/update entities for:
- Current active work and status
- Recently completed features
- Key technical decisions
- Any blockers for next session

### Step 9: Verification Summary
End with:
```markdown
# Verification Results
## Worktree (port 3005)
- Worktree frontend: npm run build PASS/FAIL
- Files copied to main repo: [list files]

## Main Repo
- Frontend: npm run build PASS/FAIL
- Frontend: npm run lint PASS/FAIL
- Backend: npm run build PASS/FAIL
- Backend: npm run dev PASS/FAIL

# Documentation Updated
- [ ] .agent/SYSTEM_STATE.yaml (AUTHORITY)
- [ ] .agent/task.md
- [ ] agent_resolutions.json
- [ ] vibeboard.md (if applicable)
- [ ] Memory MCP backup
- [ ] External drive backup (Samsung SSD)

# Approval Gate
- Status: READY FOR APPROVAL | UNVERIFIED
```

### Step 10: Export Session History
**IMPORTANT**: Export the current session transcript for future reference.

Run the export script:
```bash
node /Users/matthenrichmacbook/Antigravity/vibeboard/scripts/export-session.js \
  "$TRANSCRIPT_PATH" \
  "/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/chathistory/session_$(date +%Y%m%d_%H%M%S).md" \
  "Session: $(date +%Y-%m-%d)"
```

If TRANSCRIPT_PATH is not available, find the current session:
```bash
# Find the most recent JSONL file for this worktree
ls -lt ~/.claude/projects/-Users-matthenrichmacbook--claude-worktrees-vibeboard-*/*.jsonl | head -1
```

The session export includes:
- Files modified
- Key decisions made
- User requests summary
- Tool usage statistics

### Step 11: Sync All Sessions to Memory MCP
**IMPORTANT**: Run the unified sync script to push all Claude AND Gemini sessions to Memory MCP.

```bash
# Sync all chat history to Memory MCP (run after backup)
node "/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/chathistory/sync-to-memory.js"

# Options:
#   --dry-run      Preview without saving
#   --gemini-only  Only process Gemini brain files
#   --claude-only  Only process Claude sessions
```

The script:
- Processes Claude JSONL sessions from backup directories
- Processes Gemini brain markdown files from `~/.gemini/antigravity/brain/`
- Extracts insights: bug fixes, features, API endpoints, key files, learnings
- Saves to `memory_mcp_sync.json` for Memory MCP import
- Tracks processed sessions to avoid duplicates

### Step 12: Session Continuity Summary
Provide brief summary:
- What was accomplished
- What to focus on next
- Any pending issues

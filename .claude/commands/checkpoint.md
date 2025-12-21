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
- `/Users/matthenrichmacbook/Antigravity/vibeboard/CLAUDE.md` - Recent session summaries
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

### Step 3: Update CLAUDE.md
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/CLAUDE.md` (ALWAYS use this path)

Add to the appropriate section:
- New features with implementation details
- Bug fixes with root cause and solution
- Architecture decisions
- API endpoints added/modified

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

### Step 6: Update vibeboard.md (if needed)
**Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/vibeboard.md`

Update for:
- Major feature additions
- Architecture changes
- New API endpoints
- Resolved bugs (add to table)
- Change log entries

### Step 7: Back up to Memory MCP
Create/update entities for:
- Current active work and status
- Recently completed features
- Key technical decisions
- Any blockers for next session

### Step 8: Verification Summary
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
- [ ] CLAUDE.md
- [ ] .agent/task.md
- [ ] agent_resolutions.json
- [ ] vibeboard.md (if applicable)
- [ ] Memory MCP backup

# Approval Gate
- Status: READY FOR APPROVAL | UNVERIFIED
```

### Step 9: Export Session History
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

### Step 10: Session Continuity Summary
Provide brief summary:
- What was accomplished
- What to focus on next
- Any pending issues

---
description: Create a session checkpoint and backup history
---

# Checkpoint Workflow

This workflow summarizes the current session, updates documentation, and backs up history.

## 1. Summarize Session
Run the export script to save current session details to the backup drive.
// turbo
node scripts/export-gemini-session.js

## 2. Update Documentation
- Check `.agent/SYSTEM_STATE.yaml` - canonical system state (AUTHORITY - outranks all other context)
- Update infrastructure status, security config, API routing as needed
- Update `LAST_UPDATED` timestamp

## 3. Update Task Status
- Mark completed items in `task.md`.

## 4. Continuity Note
- Create a `notify_user` message summarizing the session and listing next steps.

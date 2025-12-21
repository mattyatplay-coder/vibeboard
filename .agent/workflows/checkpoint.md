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
- Check `GEMINI.md` and ensure the "Session History" section is up to date (Agent to perform manual edit).
- Check `CLAUDE.md` and add any new high-level architecture notes (Agent to perform manual edit).

## 3. Update Task Status
- Mark completed items in `task.md`.

## 4. Continuity Note
- Create a `notify_user` message summarizing the session and listing next steps.

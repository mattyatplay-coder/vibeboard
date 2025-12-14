# Protocol: Staging Logs for Remote Agent (Claude)

**To the Remote Agent (Claude):**

You are working in a collaborative environment where **Antigravity** (the local agent) manages the repository's "source of truth."

## Your Responsibilities

1.  **Read Baseline**: Use `claude_resolutions.json` and `claude_task.md` in this directory (`.agent/staging/`) to understand the current project state.
2.  **Make Updates Here**: When you complete tasks or make architectural decisions, **UPDATE THESE STAGING FILES**. Do not attempt to update the files in the parent `.agent/` directory directly.
3.  **Detailed entries**:
    *   **Resolutions**: Your JSON entries must include strict `timestamp`, `context` (symptom/intent), and detailed `execution_log` steps. Ambiguous or vague entries will be rejected.
    *   **Tasks**: Mark tasks as completed `[x]` only when verification is done. Add new sub-tasks here if you expand the scope.

## The Gatekeeper Process

Antigravity will:
1.  Read your updates in `claude_resolutions.json` and `claude_task.md`.
2.  Verify the logic and JSON syntax.
3.  **Merge** valid updates into the main `.agent/agent_resolutions.json` and `.agent/task.md`.
4.  Sync the main files back to this staging folder for your next session.

**Do not deviate from this file structure.**

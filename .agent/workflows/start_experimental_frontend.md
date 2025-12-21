---
description: Start or Sync the Experimental Frontend Server (Port 3005)
---

This workflow helps you manage the Experimental Frontend Sandbox.

1.  **Sync (Optional)**: If you want to overwrite your experiment with the latest code from the main `frontend/` folder, run this first. **WARNING**: This deletes your experimental changes.
    *   Command: `rsync -av --exclude 'node_modules' --exclude '.next' --exclude '.git' frontend/ frontend-experimental/`
    *   *Note*: The first time you use this, you might need to re-install dependencies if `package.json` changed.

2.  **Start Experimental Server**: Launches the sandbox on http://localhost:3005.
    *   Command: `cd frontend-experimental && npm run dev`

Your main server on port 3000 will continue running undisturbed.

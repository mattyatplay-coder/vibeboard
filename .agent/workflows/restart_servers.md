---
description: Restarts the Backend (3001) and Frontend (3000) servers.
---
# Restart Servers Workflow

This workflow kills the existing processes on ports 3000 and 3001 and restarts them.

1.  **Stop Existing Services**
    Kill processes running on ports 3000 and 3001.
    ```bash
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    ```

2.  **Restart Backend**
    Start the backend server in the background.
    ```bash
    cd backend && npm run dev
    ```

3.  **Restart Frontend**
    Start the frontend server in the background.
    ```bash
    cd frontend && npm run dev
    ```

4.  **Verify Health**
    Wait for servers to come online.
    ```bash
    # Wait for backend
    sleep 5
    curl -s http://localhost:3001/api/health
    
    # Wait for frontend
    sleep 5
    curl -I http://localhost:3000
    ```

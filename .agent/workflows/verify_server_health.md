---
description: Verify that the Backend (3001) and Frontend (3000) servers are running and reachable.
---
1. Check Backend Health
   Run the following command to check if the backend API is responding.
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
   ```
   - Expect Output: `200`
   - If failing (Connection Refused), run: `cd backend && npm run dev`

2. Check Frontend Status
   Run the following command to check if the frontend is serving.
   ```bash
   curl -I http://localhost:3000
   ```
   - Expect Output: `HTTP/1.1 200 OK`
   - If failing, run: `cd frontend && npm run dev`

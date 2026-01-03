# VibeBoard – Launch Readiness Checklist

> Pre-launch verification for production deployment.
> Last Updated: January 3, 2026

---

## Quick Status

| Category              | Status                     | Owner    |
| --------------------- | -------------------------- | -------- |
| Environment Variables | See below                  | DevOps   |
| Database Migrations   | See below                  | Backend  |
| SSL/TLS               | See below                  | DevOps   |
| Monitoring            | See below                  | SRE      |
| Security              | See SECURITY_P1_ROADMAP.md | Security |

---

## 1. Environment Variables

### 1.1 Backend (Render)

| Variable                | Required | Description                                | Verification               |
| ----------------------- | -------- | ------------------------------------------ | -------------------------- |
| `DATABASE_URL`          | YES      | PostgreSQL connection string               | `prisma db push --dry-run` |
| `JWT_SECRET`            | YES      | 256-bit random secret for JWT signing      | `openssl rand -base64 32`  |
| `CORS_ORIGIN`           | YES      | Allowed frontend origins (comma-separated) | Check response headers     |
| `FAL_KEY`               | YES      | Fal.ai API key for image/video generation  | Test `/api/health`         |
| `REDIS_URL`             | NO       | Redis URL for BullMQ queues                | Optional in dev            |
| `RUNPOD_API_KEY`        | NO       | RunPod serverless for GPU workers          | Test `/api/gpu/health`     |
| `OPENAI_API_KEY`        | NO       | OpenAI for embeddings/GPT                  | Test `/api/llm/models`     |
| `REPLICATE_API_TOKEN`   | NO       | Replicate for model hosting                | Test training jobs         |
| `CLOUDFLARE_R2_*`       | NO       | R2 for asset storage                       | Test uploads               |
| `YOUTUBE_CLIENT_ID`     | NO       | YouTube OAuth for delivery                 | Optional feature           |
| `YOUTUBE_CLIENT_SECRET` | NO       | YouTube OAuth secret                       | Optional feature           |

### 1.2 Frontend (Vercel)

| Variable               | Required | Description                                    |
| ---------------------- | -------- | ---------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | YES      | Backend API URL (https://api.vibeboard.studio) |
| `NEXT_PUBLIC_SITE_URL` | YES      | Frontend URL (https://vibeboard.studio)        |

### 1.3 GPU Worker (RunPod)

| Variable          | Required | Description                     |
| ----------------- | -------- | ------------------------------- |
| `DEVICE`          | YES      | Set to `cuda` for GPU inference |
| `MODEL_CACHE_DIR` | YES      | Model storage path              |
| `HF_HOME`         | YES      | Hugging Face cache directory    |

### Verification Script

```bash
#!/bin/bash
# Run on Render shell to verify env vars

required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "CORS_ORIGIN"
  "FAL_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "MISSING: $var"
  else
    echo "OK: $var is set"
  fi
done
```

---

## 2. Database Migrations

### 2.1 Pre-Launch Checklist

- [ ] **Backup existing data** (if any)

  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

- [ ] **Run migrations**

  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Verify schema**

  ```bash
  npx prisma db pull --print
  ```

- [ ] **Check indexes exist**
  ```sql
  SELECT indexname, tablename FROM pg_indexes
  WHERE schemaname = 'public';
  ```

### 2.2 Critical Tables

| Table          | Purpose            | Indexes                                   |
| -------------- | ------------------ | ----------------------------------------- |
| `User`         | Authentication     | email, googleId                           |
| `RefreshToken` | Session management | userId, token, expiresAt                  |
| `Project`      | User content       | userId, teamId                            |
| `Generation`   | AI outputs         | projectId, sessionId, status, indexStatus |
| `Team`         | Multi-tenant       | slug, ownerId                             |
| `TeamMember`   | Access control     | teamId, userId                            |

### 2.3 Migration Safety

```bash
# Always preview migrations first
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-migrations prisma/migrations \
  --shadow-database-url $SHADOW_DATABASE_URL
```

---

## 3. SSL/TLS Configuration

### 3.1 Certificates

| Domain                      | Provider   | Auto-Renew |
| --------------------------- | ---------- | ---------- |
| vibeboard.studio            | Vercel     | YES        |
| api.vibeboard.studio        | Render     | YES        |
| \*.r2.cloudflarestorage.com | Cloudflare | YES        |

### 3.2 Verification

```bash
# Check certificate validity
openssl s_client -connect api.vibeboard.studio:443 -servername api.vibeboard.studio </dev/null 2>/dev/null | openssl x509 -noout -dates

# Check HSTS header
curl -sI https://api.vibeboard.studio | grep -i strict-transport
```

### 3.3 Security Headers (Backend)

```typescript
// Add to backend/src/index.ts
import helmet from 'helmet';

app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

### 3.4 Force HTTPS

```typescript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

---

## 4. Monitoring & Alerting

### 4.1 Health Endpoints

| Endpoint                | Expected Response     | Check Interval |
| ----------------------- | --------------------- | -------------- |
| `GET /api/health`       | `{ status: "ok" }`    | 30 seconds     |
| `GET /api/queue/status` | `{ available: true }` | 1 minute       |

### 4.2 Uptime Monitoring

| Service     | Tool                 | Alert Threshold   |
| ----------- | -------------------- | ----------------- |
| Frontend    | Vercel Analytics     | Built-in          |
| Backend API | Render Health Checks | 3 failures        |
| Database    | Render Postgres      | Connection errors |
| GPU Workers | RunPod Dashboard     | Worker count = 0  |

### 4.3 Error Tracking

```bash
# Install Sentry (recommended)
npm install @sentry/node

# Add to backend/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 4.4 Log Aggregation

Current: Pino structured logging to stdout

Recommended additions:

- [ ] **Datadog** or **Logtail** for log aggregation
- [ ] **PagerDuty** for on-call alerts
- [ ] **Slack** integration for non-critical alerts

### 4.5 Key Metrics to Track

| Metric                  | Source         | Alert Threshold     |
| ----------------------- | -------------- | ------------------- |
| API response time       | Render metrics | P95 > 2s            |
| Error rate (5xx)        | Backend logs   | > 1%                |
| Database connections    | Prisma metrics | > 80% pool          |
| Queue depth             | Redis/BullMQ   | > 100 pending       |
| GPU worker utilization  | RunPod         | 0 workers available |
| Generation success rate | Database       | < 95%               |

---

## 5. Deployment Pipeline

### 5.1 Backend (Render)

```yaml
# render.yaml
services:
  - type: web
    name: vibeboard-api
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
```

### 5.2 Frontend (Vercel)

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 5.3 GPU Worker (RunPod)

```dockerfile
# Dockerfile.serverless
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04
# ... (see gpu-worker/Dockerfile.serverless)
```

**Build & Deploy:**

```bash
docker buildx build \
  --platform linux/amd64 \
  -t mattydc/vibeboard-gpu-worker:latest \
  -f Dockerfile.serverless \
  --push .
```

---

## 6. Pre-Launch Verification

### 6.1 Functional Tests

- [ ] User registration flow
- [ ] User login + token refresh
- [ ] Create project
- [ ] Upload element (image)
- [ ] Generate image (Fal.ai)
- [ ] Generate video (if GPU worker active)
- [ ] Semantic search
- [ ] Export functionality

### 6.2 Load Testing

```bash
# Install k6
brew install k6

# Run basic load test
k6 run --vus 10 --duration 30s scripts/load-test.js
```

### 6.3 Security Scan

```bash
# Dependency audit
npm audit --audit-level=high

# Check for exposed secrets
npx secretlint .
```

---

## 7. Rollback Plan

### 7.1 Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback last migration (manual SQL required)
# Prisma doesn't support automatic rollback
```

### 7.2 Deployment Rollback

| Platform | Rollback Command                            |
| -------- | ------------------------------------------- |
| Render   | Dashboard > Deploy > Rollback to previous   |
| Vercel   | Dashboard > Deployments > Redeploy previous |
| RunPod   | Update endpoint to previous image tag       |

### 7.3 Emergency Contacts

| Role         | Contact | Responsibility     |
| ------------ | ------- | ------------------ |
| Backend Lead | TBD     | API issues         |
| DevOps       | TBD     | Infrastructure     |
| Security     | TBD     | Security incidents |

---

## 8. Post-Launch Monitoring

### First 24 Hours

- [ ] Monitor error rates every hour
- [ ] Check GPU worker scaling
- [ ] Verify generation success rates
- [ ] Review user feedback channels

### First Week

- [ ] Daily error log review
- [ ] Performance baseline establishment
- [ ] Cost monitoring (GPU, API calls)
- [ ] User onboarding funnel analysis

---

## Sign-Off

| Stakeholder      | Status       | Date |
| ---------------- | ------------ | ---- |
| Engineering Lead | [ ] Approved |      |
| Security Lead    | [ ] Approved |      |
| Product Lead     | [ ] Approved |      |

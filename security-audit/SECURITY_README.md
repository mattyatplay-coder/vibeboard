# Security @ VibeBoard

> Authentication architecture, JWT lifecycle, and security guidelines for engineers.
> Last Updated: January 3, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [JWT Implementation](#3-jwt-implementation)
4. [Authorization Model](#4-authorization-model)
5. [Key Security Files](#5-key-security-files)
6. [Security Guidelines](#6-security-guidelines)
7. [Common Vulnerabilities](#7-common-vulnerabilities)
8. [Incident Response](#8-incident-response)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────┐     HTTPS      ┌─────────────────┐     PostgreSQL    ┌──────────────┐
│   Frontend      │◄──────────────►│   Backend API   │◄─────────────────►│   Database   │
│   (Vercel)      │     JWT        │   (Render)      │                   │   (Render)   │
│   Next.js       │                │   Express       │                   │   Prisma     │
└─────────────────┘                └─────────────────┘                   └──────────────┘
                                           │
                                           ▼
                              ┌────────────────────────┐
                              │   External Services    │
                              │   - Fal.ai (GPU)       │
                              │   - RunPod (GPU)       │
                              │   - OpenAI (LLM)       │
                              │   - Cloudflare R2      │
                              └────────────────────────┘
```

### 1.2 Security Layers

| Layer          | Protection                 | Implementation            |
| -------------- | -------------------------- | ------------------------- |
| Transport      | HTTPS/TLS 1.3              | Render/Vercel managed     |
| Authentication | JWT + Refresh Tokens       | `auth.ts` middleware      |
| Authorization  | Role-based + Ownership     | `withAuth`, `requireRole` |
| Data           | Prisma ORM (parameterized) | No raw SQL                |
| API            | CORS allowlist             | `index.ts` configuration  |

---

## 2. Authentication Flow

### 2.1 Registration

```
User                    Frontend                   Backend                    Database
 │                         │                          │                          │
 │  1. Submit email/pass   │                          │                          │
 │────────────────────────►│                          │                          │
 │                         │  2. POST /api/auth/register                         │
 │                         │─────────────────────────►│                          │
 │                         │                          │  3. Check email unique   │
 │                         │                          │─────────────────────────►│
 │                         │                          │◄─────────────────────────│
 │                         │                          │  4. Hash password (bcrypt 12 rounds)
 │                         │                          │  5. Create User record   │
 │                         │                          │─────────────────────────►│
 │                         │                          │◄─────────────────────────│
 │                         │                          │  6. Generate access token (15m)
 │                         │                          │  7. Generate refresh token (7d)
 │                         │                          │  8. Store refresh token  │
 │                         │                          │─────────────────────────►│
 │                         │  9. Return tokens + user │◄─────────────────────────│
 │  10. Store tokens       │◄─────────────────────────│                          │
 │◄────────────────────────│                          │                          │
```

### 2.2 Login

```
User                    Frontend                   Backend                    Database
 │                         │                          │                          │
 │  1. Submit email/pass   │                          │                          │
 │────────────────────────►│                          │                          │
 │                         │  2. POST /api/auth/login │                          │
 │                         │─────────────────────────►│                          │
 │                         │                          │  3. Find user by email   │
 │                         │                          │─────────────────────────►│
 │                         │                          │◄─────────────────────────│
 │                         │                          │  4. Verify password (bcrypt.compare)
 │                         │                          │  5. Check isActive       │
 │                         │                          │  6. Update lastLoginAt   │
 │                         │                          │─────────────────────────►│
 │                         │                          │  7. Generate tokens      │
 │                         │  8. Return tokens + user │◄─────────────────────────│
 │  9. Store tokens        │◄─────────────────────────│                          │
 │◄────────────────────────│                          │                          │
```

### 2.3 Token Refresh

```
Frontend                   Backend                    Database
 │                          │                          │
 │  1. POST /api/auth/refresh                          │
 │  { refreshToken: "..." } │                          │
 │─────────────────────────►│                          │
 │                          │  2. Find token in DB     │
 │                          │─────────────────────────►│
 │                          │◄─────────────────────────│
 │                          │  3. Check not expired    │
 │                          │  4. Get user             │
 │                          │─────────────────────────►│
 │                          │◄─────────────────────────│
 │                          │  5. Revoke old token (rotation)
 │                          │─────────────────────────►│
 │                          │  6. Generate new tokens  │
 │                          │  7. Store new refresh    │
 │                          │─────────────────────────►│
 │  8. Return new tokens    │◄─────────────────────────│
 │◄─────────────────────────│                          │
```

---

## 3. JWT Implementation

### 3.1 Access Token

```typescript
// Location: backend/src/middleware/auth.ts

// Configuration
const JWT_SECRET = process.env.JWT_SECRET; // REQUIRED in production
const JWT_EXPIRES_IN = '15m'; // Short-lived

// Token payload
interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat: number; // Issued at (auto)
  exp: number; // Expires at (auto)
}

// Generation
function generateAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
```

### 3.2 Refresh Token

```typescript
// Configuration
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

// Storage: Database (not JWT)
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique  // 64 random bytes, hex encoded
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// Generation
async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
    },
  });

  // Clean up expired tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  return token;
}
```

### 3.3 Token Validation

```typescript
export const withAuth = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
  }

  const token = authHeader.substring(7);

  // 2. Verify JWT signature and expiration
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }

  // 3. Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: { id: true, email: true, role: true, isActive: true, ... },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  // 4. Attach user to request
  (req as AuthenticatedRequest).user = user;
  next();
};
```

### 3.4 Token Lifecycle

| Token Type    | Lifetime   | Storage                      | Revocation        |
| ------------- | ---------- | ---------------------------- | ----------------- |
| Access Token  | 15 minutes | Frontend memory/localStorage | Expires naturally |
| Refresh Token | 7 days     | Database + Frontend          | DELETE from DB    |

**Security Properties:**

- Access tokens are stateless (no DB lookup needed)
- Refresh tokens are stateful (revocable immediately)
- Refresh token rotation on each use (prevents replay)
- Forced re-auth possible via `revokeAllUserTokens(userId)`

---

## 4. Authorization Model

### 4.1 Roles

| Role    | Description       | Capabilities                 |
| ------- | ----------------- | ---------------------------- |
| `user`  | Default free tier | CRUD own resources           |
| `pro`   | Paid subscriber   | CRUD own + higher limits     |
| `admin` | System admin      | Full access, user management |

### 4.2 Middleware Stack

```typescript
// Public endpoints (no auth)
app.use('/api/auth', authRoutes);
app.get('/api/health', ...);

// Protected endpoints
router.get('/projects',
  withAuth,                    // 1. Verify JWT, attach user
  async (req, res) => { ... }
);

// Protected + ownership check
router.get('/projects/:projectId/elements',
  withAuth,                    // 1. Verify JWT
  verifyProjectOwnership,      // 2. Verify user owns project
  async (req, res) => { ... }
);

// Protected + role check
router.delete('/admin/users/:id',
  withAuth,                    // 1. Verify JWT
  requireRole('admin'),        // 2. Verify admin role
  async (req, res) => { ... }
);

// Protected + quota check
router.post('/generations',
  withAuth,                    // 1. Verify JWT
  requireGenerationQuota,      // 2. Verify quota available
  async (req, res) => { ... }
);
```

### 4.3 Ownership Verification

```typescript
// backend/src/middleware/auth.ts:361-411

export const verifyProjectOwnership = async (req, res, next) => {
  const user = req.user;
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: user.id, // Must be owned by requesting user
    },
  });

  if (!project) {
    // Return 404 (not 403) to prevent enumeration
    return res.status(404).json({ error: 'Project not found' });
  }

  next();
};
```

---

## 5. Key Security Files

### 5.1 File Locations

| File                                 | Purpose                                    |
| ------------------------------------ | ------------------------------------------ |
| `backend/src/middleware/auth.ts`     | JWT verification, role checks, ownership   |
| `backend/src/routes/authRoutes.ts`   | Login, register, refresh, logout endpoints |
| `backend/src/index.ts`               | CORS configuration, route registration     |
| `backend/prisma/schema.prisma`       | User, RefreshToken models                  |
| `backend/src/middleware/mockAuth.ts` | DEV ONLY - mock auth for testing           |

### 5.2 Environment Variables

```bash
# REQUIRED for production
JWT_SECRET="<256-bit random secret>"  # NEVER commit to git

# CORS configuration
CORS_ORIGIN="https://vibeboard.studio,https://www.vibeboard.studio"

# Production safety check
NODE_ENV="production"  # Enables security checks
```

### 5.3 Security Checks at Startup

```typescript
// backend/src/middleware/auth.ts:37-41

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'CHANGE_THIS_IN_PRODUCTION') {
  log.fatal('JWT_SECRET must be set in production environment!');
  process.exit(1); // Fail-fast, don't start with insecure config
}
```

---

## 6. Security Guidelines

### 6.1 DO

- **Always use `withAuth` middleware** for any endpoint that accesses user data
- **Verify ownership** before returning resources (projects, generations, etc.)
- **Return 404 instead of 403** when resource exists but user lacks access (prevents enumeration)
- **Log security events** (failed logins, token revocations, permission denials)
- **Use Zod for input validation** before processing any request body
- **Parameterize all queries** (Prisma does this automatically)

### 6.2 DON'T

- **Never store JWT_SECRET in code** - use environment variables only
- **Never log sensitive data** (passwords, tokens, API keys)
- **Never trust client input** - always validate and sanitize
- **Never expose stack traces** in production error responses
- **Never use `mockAuth` in production** - it grants admin access
- **Never disable CORS** for debugging (use proper allowlist)

### 6.3 Code Review Checklist

```markdown
- [ ] New endpoints use appropriate auth middleware
- [ ] Ownership/permission checks are in place
- [ ] Input is validated with Zod schemas
- [ ] Error responses don't leak implementation details
- [ ] No hardcoded secrets or API keys
- [ ] Logging doesn't include sensitive data
- [ ] Tests cover auth failure cases
```

---

## 7. Common Vulnerabilities

### 7.1 Mitigated

| Vulnerability        | Mitigation                 | Location                |
| -------------------- | -------------------------- | ----------------------- |
| JWT Secret Exposure  | Env var + production check | `auth.ts:37-41`         |
| User Enumeration     | Generic login error        | `authRoutes.ts:166-169` |
| Password Brute Force | bcrypt (12 rounds)         | `authRoutes.ts:85`      |
| Token Replay         | Refresh rotation           | `authRoutes.ts:252-253` |
| CORS Bypass          | Explicit allowlist         | `index.ts:14-58`        |
| SQL Injection        | Prisma ORM                 | All queries             |

### 7.2 Pending (See P1 Roadmap)

| Vulnerability   | Status          | Priority |
| --------------- | --------------- | -------- |
| Rate Limiting   | Not implemented | HIGH     |
| Account Lockout | Not implemented | MEDIUM   |
| CSP Headers     | Not implemented | MEDIUM   |
| XSS Audit       | Not done        | MEDIUM   |

---

## 8. Incident Response

### 8.1 Compromised JWT Secret

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Update in Render dashboard
# Settings > Environment > JWT_SECRET

# 3. Trigger redeploy
# All existing access tokens immediately invalid

# 4. Clear all refresh tokens
npx prisma db execute --stdin <<< "DELETE FROM RefreshToken;"

# 5. Notify users to re-login
```

### 8.2 Compromised User Account

```typescript
// 1. Disable account
await prisma.user.update({
  where: { id: userId },
  data: { isActive: false },
});

// 2. Revoke all tokens
await prisma.refreshToken.deleteMany({
  where: { userId },
});

// 3. Log security event
log.warn({ userId, reason: 'account_compromised' }, 'ACCOUNT_DISABLED');

// 4. Notify user via email (future)
```

### 8.3 API Key Leak

| Key              | Recovery Steps                                              |
| ---------------- | ----------------------------------------------------------- |
| `FAL_KEY`        | Rotate in fal.ai dashboard, update Render env               |
| `RUNPOD_API_KEY` | Rotate in RunPod dashboard, update Render env               |
| `OPENAI_API_KEY` | Rotate in OpenAI dashboard, update Render env               |
| `DATABASE_URL`   | Reset password in Render Postgres, update connection string |

---

## Appendix: Quick Reference

### Token Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Codes

| Code               | HTTP Status | Meaning                       |
| ------------------ | ----------- | ----------------------------- |
| `NO_TOKEN`         | 401         | Missing Authorization header  |
| `INVALID_TOKEN`    | 401         | JWT verification failed       |
| `TOKEN_EXPIRED`    | 401         | JWT past expiration           |
| `USER_NOT_FOUND`   | 401         | User deleted or not found     |
| `ACCOUNT_DISABLED` | 403         | User isActive = false         |
| `FORBIDDEN`        | 403         | Insufficient role permissions |
| `QUOTA_EXCEEDED`   | 429         | Monthly limit reached         |

### Useful Commands

```bash
# Generate secure JWT secret
openssl rand -base64 32

# Decode JWT (for debugging - never in production)
echo "eyJhbG..." | cut -d. -f2 | base64 -d | jq

# Check refresh token count for user
npx prisma db execute --stdin <<< \
  "SELECT COUNT(*) FROM \"RefreshToken\" WHERE \"userId\" = 'user-id-here';"
```

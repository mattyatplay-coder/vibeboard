# VibeBoard – P1 Security Roadmap

> Post-launch security hardening priorities for production deployment.
> Last Updated: January 3, 2026

---

## Executive Summary

This roadmap covers P1 (Priority 1) security improvements to implement after initial launch. P0 items (JWT authentication, CORS allowlisting) are already in production. These items should be addressed within 30-60 days of launch.

---

## 1. Rate Limiting

### Current State

- **Quota-based limiting**: Users have `monthlyGenerations` tracked against `monthlyGenerationsLimit`
- **No request-level rate limiting**: API endpoints have no per-second/minute throttling

### Implementation Plan

#### 1.1 Global Rate Limiter

```typescript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

// Apply to all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 min per IP
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
```

#### 1.2 Endpoint-Specific Limits

| Endpoint Category               | Limit       | Window   | Rationale               |
| ------------------------------- | ----------- | -------- | ----------------------- |
| `/api/auth/login`               | 5 requests  | 1 minute | Brute-force protection  |
| `/api/auth/register`            | 3 requests  | 1 hour   | Spam account prevention |
| `/api/projects/:id/generations` | 30 requests | 1 minute | GPU cost control        |
| `/api/llm/*`                    | 60 requests | 1 minute | LLM API cost control    |
| `/api/gpu/*`                    | 20 requests | 1 minute | GPU worker protection   |
| `/api/qwen/*`                   | 20 requests | 1 minute | Expensive model calls   |

#### 1.3 User-Based vs IP-Based Limiting

```typescript
// For authenticated endpoints, rate limit by user ID
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: req => (req as AuthenticatedRequest).user?.id || req.ip,
});
```

#### 1.4 Redis-Backed Rate Limiting (Production)

```typescript
// Install: npm install rate-limit-redis
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  windowMs: 60 * 1000,
  max: 100,
});
```

### Priority: HIGH

### Effort: 1-2 days

### Dependencies: Redis (already deployed for BullMQ)

---

## 2. CSRF Protection

### Current State

- Frontend uses SPA architecture (React/Next.js)
- Authentication via Bearer tokens (not cookies)
- CORS properly configured with allowlist

### Risk Assessment

**LOW RISK** - Bearer token auth is inherently CSRF-resistant because:

1. Tokens are stored in memory/localStorage, not cookies
2. Attacker sites cannot read the token from localStorage
3. Authorization header must be manually set on each request

### Recommended Enhancements

#### 2.1 Double Submit Cookie (Optional Layer)

```typescript
import csrf from 'csurf';

// For any future cookie-based auth
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

#### 2.2 SameSite Cookie Policy

If cookies are used in future (e.g., for refresh tokens):

```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', // Prevents CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

#### 2.3 Origin Validation (Already Implemented)

```typescript
// backend/src/index.ts:40-57
const corsOptions = {
  origin: (origin, callback) => {
    if (CORS_ALLOWLIST.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
};
```

### Priority: LOW (architecture already resistant)

### Effort: 0.5 days if needed

### Dependencies: None

---

## 3. XSS Audit

### Current State

- React/Next.js frontend with automatic escaping
- No server-side HTML rendering
- JSON API responses only

### Audit Checklist

#### 3.1 Frontend (React/Next.js)

- [ ] **dangerouslySetInnerHTML** - Search for all usage, ensure content is sanitized
- [ ] **URL parameters** - Validate/sanitize query params before use
- [ ] **User-generated content** - Review prompt display, comments, story text
- [ ] **SVG uploads** - Consider sanitization or CSP restrictions
- [ ] **Rich text editors** - If any, use DOMPurify for output

#### 3.2 Backend (Node.js/Express)

- [ ] **JSON responses** - Verify no raw HTML in API responses
- [ ] **Error messages** - Don't echo user input in errors
- [ ] **File uploads** - Validate file types, scan content
- [ ] **Database queries** - Prisma ORM handles parameterization

#### 3.3 Content Security Policy (CSP)

```typescript
import helmet from 'helmet';

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Next.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://fal.media',
        'https://*.r2.cloudflarestorage.com',
      ],
      connectSrc: ["'self'", 'https://api.vibeboard.studio', 'wss://*.runpod.io'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https://fal.media', 'https://*.r2.cloudflarestorage.com'],
      frameSrc: ["'none'"],
    },
  })
);
```

#### 3.4 Input Validation Patterns

```typescript
// Using Zod (already in codebase)
import { z } from 'zod';

// Sanitize potentially dangerous strings
const safeTextSchema = z
  .string()
  .max(10000)
  .transform(s => s.replace(/<script/gi, '&lt;script'));

// Validate URLs
const urlSchema = z
  .string()
  .url()
  .refine(url => ['https:', 'http:'].includes(new URL(url).protocol), 'Invalid protocol');
```

### Priority: MEDIUM

### Effort: 2-3 days for full audit

### Dependencies: helmet npm package

---

## 4. SQL Injection

### Current State

- **Prisma ORM** - All database queries use parameterized queries by default
- **No raw SQL** - No `prisma.$queryRaw` or `prisma.$executeRaw` in codebase

### Audit Actions

- [ ] Search codebase for `$queryRaw` or `$executeRaw` usage
- [ ] Review any dynamic query construction
- [ ] Ensure no string concatenation in WHERE clauses

### Risk Assessment: **VERY LOW** (Prisma handles parameterization)

---

## 5. Authentication Hardening

### 5.1 Password Requirements (Implemented)

```typescript
// authRoutes.ts:37
password: z.string().min(8, 'Password must be at least 8 characters'),
```

**Enhancements**:

```typescript
password: z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
```

### 5.2 Bcrypt Configuration (Implemented)

```typescript
// authRoutes.ts:85
const passwordHash = await bcrypt.hash(password, 12); // 12 rounds
```

### 5.3 Account Lockout (TODO)

```typescript
// Add to User model
failedLoginAttempts: Int @default(0)
lockedUntil: DateTime?

// After 5 failed attempts, lock for 15 minutes
if (failedAttempts >= 5) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
  });
}
```

### 5.4 Suspicious Login Detection (Future)

- Track login locations (IP, geo)
- Alert on new device/location
- Optional 2FA for high-value accounts

### Priority: MEDIUM

### Effort: 1-2 days

---

## 6. Logging & Monitoring

### Current State

- Pino structured logging implemented
- Request logging middleware active
- Auth events logged

### Enhancements

#### 6.1 Security Event Logging

```typescript
// Log all security-relevant events
const securityLog = loggers.security;

securityLog.warn({ userId, ip, reason: 'invalid_token' }, 'AUTH_FAILURE');
securityLog.info({ userId, oldRole, newRole }, 'ROLE_CHANGE');
securityLog.alert({ userId, ip }, 'ACCOUNT_LOCKOUT');
```

#### 6.2 Monitoring Alerts

| Event           | Alert Threshold | Action                  |
| --------------- | --------------- | ----------------------- |
| Failed logins   | >100/hour       | PagerDuty alert         |
| 401 responses   | >500/hour       | Slack notification      |
| 500 errors      | >50/hour        | PagerDuty alert         |
| Rate limit hits | >1000/hour      | Review, possible attack |

### Priority: MEDIUM

### Effort: 1-2 days

---

## 7. Dependency Security

### Automated Scanning

```bash
# Weekly scan (add to CI/CD)
npm audit --audit-level=high
npx snyk test
```

### Key Dependencies to Monitor

| Package      | Risk Level | Notes             |
| ------------ | ---------- | ----------------- |
| jsonwebtoken | HIGH       | Auth critical     |
| bcryptjs     | HIGH       | Password hashing  |
| prisma       | MEDIUM     | Database access   |
| express      | MEDIUM     | HTTP framework    |
| axios/httpx  | MEDIUM     | External requests |

### Priority: LOW (ongoing)

### Effort: 0.5 days setup, then automated

---

## Timeline

| Phase    | Items                           | Target Date      |
| -------- | ------------------------------- | ---------------- |
| Week 1-2 | Rate limiting, CSP headers      | Launch + 14 days |
| Week 3-4 | XSS audit, input validation     | Launch + 28 days |
| Week 5-6 | Auth hardening, monitoring      | Launch + 42 days |
| Ongoing  | Dependency scanning, log review | Continuous       |

---

## Appendix: Security Contacts

- **Security Lead**: TBD
- **Incident Response**: security@vibeboard.studio
- **Bug Bounty**: Coming soon (HackerOne)

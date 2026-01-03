# VibeBoard – Billing Tiers & Quota Schemas

> Defines usage limits, subscription tiers, and rate limiting for production.
> Last Updated: January 3, 2026

---

## 1. Subscription Tiers

### 1.1 Tier Overview

| Tier           | Monthly Price | Target User           | Key Differentiators                                 |
| -------------- | ------------- | --------------------- | --------------------------------------------------- |
| **Free**       | $0            | Hobbyists, evaluators | 100 generations/mo, watermarked exports             |
| **Pro**        | $29/mo        | Solo creators         | 1,000 generations/mo, no watermarks, priority queue |
| **Team**       | $99/mo        | Small studios         | 5,000 generations/mo, 5 seats, shared assets        |
| **Enterprise** | Custom        | Production studios    | Unlimited, SLA, dedicated GPU workers               |

### 1.2 Feature Matrix

| Feature             | Free | Pro    | Team      | Enterprise |
| ------------------- | ---- | ------ | --------- | ---------- |
| Monthly Generations | 100  | 1,000  | 5,000     | Unlimited  |
| Max Resolution      | 720p | 1080p  | 4K        | 4K+        |
| Video Duration      | 5s   | 10s    | 30s       | 60s+       |
| Export Watermark    | Yes  | No     | No        | No         |
| GPU Priority        | Low  | Normal | High      | Dedicated  |
| Projects            | 3    | 20     | Unlimited | Unlimited  |
| Team Members        | 1    | 1      | 5         | Unlimited  |
| Custom LoRAs        | 2    | 10     | 50        | Unlimited  |
| API Access          | No   | Yes    | Yes       | Yes        |
| Priority Support    | No   | Email  | Chat      | Dedicated  |
| SLA                 | None | None   | 99.5%     | 99.9%      |

---

## 2. Database Schema

### 2.1 User Quotas (Current)

```prisma
model User {
  id                      String   @id @default(uuid())
  email                   String   @unique

  // Role-based tier assignment
  role                    String   @default("user") // 'user', 'pro', 'admin'

  // Rate limiting / quotas
  monthlyGenerations      Int      @default(0)       // Current usage
  monthlyGenerationsLimit Int      @default(100)     // Tier-based limit

  // Reset tracking
  quotaResetAt            DateTime?                  // When quota was last reset

  // ...other fields
}
```

### 2.2 Team Quotas (Current)

```prisma
model Team {
  id                      String   @id @default(uuid())
  name                    String
  ownerId                 String   // Billing contact
  slug                    String   @unique

  // Subscription tier
  tier                    String   @default("free")  // 'free', 'pro', 'enterprise'

  // Seat limits
  maxMembers              Int      @default(5)

  // Project limits
  maxProjects             Int      @default(10)

  // Shared generation quota
  monthlyGenerations      Int      @default(0)       // Shared usage
  monthlyGenerationsLimit Int      @default(500)     // Team-wide limit

  // ...other fields
}
```

### 2.3 Proposed: Subscription Model

```prisma
model Subscription {
  id              String   @id @default(uuid())

  // Owner (user or team)
  userId          String?  @unique
  teamId          String?  @unique

  // Stripe integration
  stripeCustomerId    String?   @unique
  stripeSubscriptionId String?  @unique

  // Plan details
  tier            String   @default("free")  // 'free', 'pro', 'team', 'enterprise'
  status          String   @default("active") // 'active', 'canceled', 'past_due', 'trialing'

  // Billing cycle
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean  @default(false)

  // Usage tracking
  generationsUsed     Int      @default(0)
  generationsLimit    Int      @default(100)

  // Overage handling
  allowOverage        Boolean  @default(false)
  overageRate         Float?   // Per-generation cost if overage allowed

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User?    @relation(fields: [userId], references: [id])
  team            Team?    @relation(fields: [teamId], references: [id])

  @@index([userId])
  @@index([teamId])
  @@index([stripeCustomerId])
}
```

### 2.4 Proposed: Usage Tracking

```prisma
model UsageRecord {
  id              String   @id @default(uuid())

  // Owner
  userId          String?
  teamId          String?

  // What was used
  resourceType    String   // 'image_gen', 'video_gen', 'llm_call', 'training'
  resourceId      String?  // Generation ID, etc.

  // Cost tracking
  provider        String   // 'fal', 'runpod', 'openai', 'replicate'
  inputCost       Float    @default(0)  // Cost to us

  // Quota impact
  quotaConsumed   Int      @default(1)  // How many "generations" this counts as

  // Metadata
  metadata        String?  // JSON: model used, resolution, duration, etc.

  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([teamId])
  @@index([resourceType])
  @@index([createdAt])
}
```

---

## 3. Quota Enforcement

### 3.1 Middleware (Current Implementation)

```typescript
// backend/src/middleware/auth.ts:214-236

export const requireGenerationQuota = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER',
    });
    return;
  }

  if (user.monthlyGenerations >= user.monthlyGenerationsLimit) {
    res.status(429).json({
      error: 'Monthly generation limit reached',
      code: 'QUOTA_EXCEEDED',
      used: user.monthlyGenerations,
      limit: user.monthlyGenerationsLimit,
    });
    return;
  }

  next();
};
```

### 3.2 Quota Increment

```typescript
// After successful generation
async function incrementQuota(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { monthlyGenerations: { increment: 1 } },
  });
}

// For team-based quota
async function incrementTeamQuota(teamId: string): Promise<void> {
  await prisma.team.update({
    where: { id: teamId },
    data: { monthlyGenerations: { increment: 1 } },
  });
}
```

### 3.3 Monthly Reset (Cron Job)

```typescript
// Run at midnight on the 1st of each month
async function resetMonthlyQuotas(): Promise<void> {
  // Reset individual user quotas
  await prisma.user.updateMany({
    data: {
      monthlyGenerations: 0,
      quotaResetAt: new Date(),
    },
  });

  // Reset team quotas
  await prisma.team.updateMany({
    data: { monthlyGenerations: 0 },
  });

  logger.info('Monthly quotas reset');
}
```

---

## 4. Rate Limiting

### 4.1 Request-Level Limits

| Tier       | Requests/min | Requests/hour | Concurrent |
| ---------- | ------------ | ------------- | ---------- |
| Free       | 30           | 500           | 2          |
| Pro        | 60           | 2,000         | 5          |
| Team       | 120          | 5,000         | 10         |
| Enterprise | 300          | Unlimited     | 50         |

### 4.2 Implementation

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Tier-based rate limiting
const getTierLimits = (tier: string) => {
  switch (tier) {
    case 'enterprise':
      return { windowMs: 60000, max: 300 };
    case 'team':
      return { windowMs: 60000, max: 120 };
    case 'pro':
      return { windowMs: 60000, max: 60 };
    default:
      return { windowMs: 60000, max: 30 };
  }
};

const dynamicRateLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
  keyGenerator: req => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  skip: req => req.user?.role === 'admin',
  max: req => getTierLimits(req.user?.role || 'user').max,
  windowMs: 60000,
});
```

---

## 5. GPU Cost Tracking

### 5.1 Provider Costs (Estimates)

| Operation        | Provider  | Est. Cost | Quota Value  |
| ---------------- | --------- | --------- | ------------ |
| Image Gen (Flux) | Fal.ai    | $0.005    | 1            |
| Image Gen (SD3)  | Fal.ai    | $0.003    | 1            |
| Video Gen (5s)   | RunPod    | $0.10     | 5            |
| Video Gen (10s)  | RunPod    | $0.20     | 10           |
| LoRA Training    | Replicate | $2.00     | 50           |
| LLM Call (GPT-4) | OpenAI    | $0.01     | 0 (separate) |
| Embedding        | OpenAI    | $0.0001   | 0 (free)     |

### 5.2 Cost Calculation

```typescript
interface GenerationCost {
  provider: string;
  model: string;
  inputCost: number; // What we pay
  quotaCost: number; // What user pays in quota
  margin: number; // Our margin %
}

function calculateCost(generation: Generation): GenerationCost {
  const costs: Record<string, { input: number; quota: number }> = {
    'fal-ai/flux/schnell': { input: 0.003, quota: 1 },
    'fal-ai/flux-pro': { input: 0.05, quota: 1 },
    'fal-ai/ltx-video': { input: 0.05, quota: 3 },
    'runpod/wan-t2v': { input: 0.1, quota: 5 },
    'runpod/wan-i2v': { input: 0.15, quota: 7 },
  };

  const cost = costs[generation.provider + '/' + generation.model] || { input: 0.01, quota: 1 };

  return {
    provider: generation.provider,
    model: generation.model,
    inputCost: cost.input,
    quotaCost: cost.quota,
    margin: (cost.quota * 0.03 - cost.input) / (cost.quota * 0.03),
  };
}
```

---

## 6. Overage Handling

### 6.1 Soft Limits vs Hard Limits

| Tier       | Behavior at Limit                     |
| ---------- | ------------------------------------- |
| Free       | Hard stop - upgrade required          |
| Pro        | Soft limit - $0.05/generation overage |
| Team       | Soft limit - $0.03/generation overage |
| Enterprise | No limit - invoiced monthly           |

### 6.2 Overage Billing

```typescript
async function handleOverage(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return false;

  // Check if overage is allowed
  if (!subscription.allowOverage) {
    return false; // Hard stop
  }

  // Record overage usage (billed at end of period)
  await prisma.usageRecord.create({
    data: {
      userId,
      resourceType: 'overage_generation',
      inputCost: subscription.overageRate || 0.05,
      quotaConsumed: 1,
    },
  });

  return true; // Allow generation
}
```

---

## 7. Stripe Integration (Future)

### 7.1 Webhook Events to Handle

| Event                           | Action                     |
| ------------------------------- | -------------------------- |
| `customer.subscription.created` | Create Subscription record |
| `customer.subscription.updated` | Update tier/limits         |
| `customer.subscription.deleted` | Downgrade to Free          |
| `invoice.payment_succeeded`     | Reset quota, log payment   |
| `invoice.payment_failed`        | Set status to `past_due`   |

### 7.2 Price IDs (Example)

```typescript
const STRIPE_PRICES = {
  pro_monthly: 'price_1234567890',
  pro_yearly: 'price_0987654321',
  team_monthly: 'price_ABCDEFGHIJ',
  team_yearly: 'price_JIHGFEDCBA',
};
```

---

## 8. Admin Tools

### 8.1 Quota Management Endpoints

```typescript
// GET /api/admin/users/:id/quota
router.get('/users/:id/quota', withAuth, requireRole('admin'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      role: true,
      monthlyGenerations: true,
      monthlyGenerationsLimit: true,
    },
  });
  res.json(user);
});

// PATCH /api/admin/users/:id/quota
router.patch('/users/:id/quota', withAuth, requireRole('admin'), async (req, res) => {
  const { limit, used } = req.body;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(limit !== undefined && { monthlyGenerationsLimit: limit }),
      ...(used !== undefined && { monthlyGenerations: used }),
    },
  });

  res.json({ success: true, user });
});
```

### 8.2 Usage Analytics

```sql
-- Monthly usage by tier
SELECT
  u.role as tier,
  COUNT(DISTINCT u.id) as users,
  SUM(u."monthlyGenerations") as total_generations,
  AVG(u."monthlyGenerations") as avg_per_user
FROM "User" u
GROUP BY u.role;

-- Top users by usage
SELECT
  u.email,
  u."monthlyGenerations" as used,
  u."monthlyGenerationsLimit" as limit,
  ROUND(u."monthlyGenerations"::numeric / u."monthlyGenerationsLimit" * 100, 1) as pct_used
FROM "User" u
ORDER BY u."monthlyGenerations" DESC
LIMIT 20;
```

---

## 9. Migration Path

### Phase 1: Current (Simple Quotas)

- `monthlyGenerations` and `monthlyGenerationsLimit` on User
- Manual tier assignment via `role` field
- No billing integration

### Phase 2: Subscription Model

- Add `Subscription` model
- Add `UsageRecord` for detailed tracking
- Implement Stripe webhooks
- Add overage handling

### Phase 3: Metered Billing

- Per-operation cost tracking
- Real-time usage dashboard
- Automatic tier recommendations
- Cost alerts and budgets

# Shared Types

This directory contains TypeScript types shared between the frontend and backend.

## Purpose

- **Single source of truth** for API contracts
- **Type safety** across the full stack
- **Prevents breaking changes** by requiring coordination

## Usage

### Frontend

```typescript
import type { Generation, CreateGenerationRequest } from '../../../shared/types';
```

Or add a path alias in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  }
}
```

Then:

```typescript
import type { Generation } from '@shared/types';
```

### Backend

```typescript
import type { Generation, CreateGenerationRequest } from '../../shared/types';
```

## Rules

1. **Only add optional fields** - Never remove or make fields required
2. **Document breaking changes** - Update version history in `api.ts`
3. **Coordinate changes** - Both frontend and backend must be updated together
4. **Test both sides** - Ensure TypeScript compiles in both packages

## Adding New Types

1. Add the type to `api.ts`
2. Export it from `index.ts` if needed
3. Update the version history
4. Create a PR with both frontend and backend changes

# VibeBoard Agent Roles & Responsibilities

> **Last Updated**: December 18, 2024
> **Purpose**: Define clear ownership boundaries for multi-agent development

---

## Overview

This document defines the roles, responsibilities, and boundaries for AI agents and human developers working on VibeBoard. Following these guidelines prevents conflicts and ensures seamless integration.

---

## Role Definitions

### Agent A: Backend & Logic (Claude)

**Primary Responsibilities:**

- Backend services and API development
- Database schema and migrations
- AI provider adapters (Fal, Replicate, OpenAI, etc.)
- Frontend state management and business logic
- Data registries and type definitions

**Owned Directories:**

```
/backend/                          # Full ownership
/frontend/src/lib/                 # State, API, utilities
/frontend/src/data/                # Data registries
/frontend/src/context/             # Context providers
/frontend/src/types/               # Type definitions
/shared/                           # Shared types/contracts
```

**Can Modify:**

- Any backend code
- Frontend logic (non-UI)
- API contracts
- Database schema
- Configuration files

**Cannot Modify Without Coordination:**

- Component styling (Tailwind classes)
- Layout structure
- Animations
- UI-only components

---

### Agent B: Frontend UI (Antigravity)

**Primary Responsibilities:**

- Visual design and styling
- Component layout and structure
- Animations and transitions
- User experience improvements
- Accessibility

**Owned Directories:**

```
/frontend/src/components/ui/       # Base UI primitives
/frontend/src/components/layout/   # Layout wrappers
/frontend/src/app/                 # Page layouts (styling only)
/frontend/tailwind.config.ts       # Theme configuration
/frontend/src/styles/              # Global styles
```

**Can Modify:**

- Tailwind classes on any component
- Component JSX structure
- Framer Motion animations
- z-index and portal configurations
- New UI-only components

**Cannot Modify:**

- Event handlers and callbacks (preserve function signatures)
- State management (useState, useEffect, Zustand)
- API calls (fetchAPI, uploadFile)
- Type definitions
- Backend code

**Safe Modification Pattern:**

```tsx
// BEFORE
<button onClick={handleGenerate} className="bg-blue-500">
  Generate
</button>

// AFTER (Safe - preserves onClick)
<motion.button
  onClick={handleGenerate}           // MUST preserve this
  className="bg-gradient-to-r from-purple-500 to-pink-500"
  whileHover={{ scale: 1.05 }}
>
  <SparklesIcon className="w-4 h-4 mr-2" />
  Generate
</motion.button>
```

---

### Agent C: Integrator

**Primary Responsibilities:**

- Merge queue management
- Conflict resolution
- Cross-boundary coordination
- CI/CD maintenance
- Final integration testing

**Owned Directories:**

```
/.github/                          # Workflows, CODEOWNERS
/docker-compose*.yml               # Container orchestration
/scripts/                          # Build/deploy scripts
```

**Responsibilities:**

- Review and merge PRs after CI passes
- Resolve merge conflicts between agents
- Ensure backward compatibility
- Coordinate breaking changes
- Maintain branch protection rules

**Workflow:**

1. Agents submit PRs to their feature branches
2. CI runs automatically
3. Integrator reviews for cross-boundary issues
4. Integrator merges to main via merge queue
5. Integrator resolves any conflicts

---

### Agent D: QA & Testing (Optional)

**Primary Responsibilities:**

- Test coverage
- E2E test maintenance
- Performance testing
- Bug verification

**Owned Directories:**

```
/frontend/tests/                   # Playwright tests
/backend/tests/                    # Jest tests
/frontend/playwright.config.ts     # Test configuration
```

---

## Coordination Protocols

### Before Starting Work

1. **Pull latest main:**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature
   ```

2. **Declare intent:**
   - List files/modules you intend to modify
   - Check if another agent is working on overlapping areas
   - Coordinate if overlap exists

3. **Check CODEOWNERS:**
   - Verify you have ownership of target files
   - Request coordination for cross-boundary work

### During Development

1. **Stay in your lane:**
   - Only modify files in your owned directories
   - For boundary files, coordinate first

2. **Small, focused changes:**
   - One feature per PR
   - Target < 300 lines changed
   - Avoid mixing refactors with features

3. **Preserve interfaces:**
   - Don't change function signatures without coordination
   - Add optional fields, don't remove required ones
   - Maintain backward compatibility

### Before Submitting PR

1. **Run all checks locally:**

   ```bash
   # Frontend
   cd frontend
   npm run build
   npm run lint
   npx tsc --noEmit

   # Backend
   cd backend
   npm run build
   npm test
   ```

2. **Fill out PR template completely**

3. **Mark verification status:**
   - VERIFIED: All checks passed locally
   - UNVERIFIED: Could not run all checks (explain why)

---

## Conflict Resolution

### Priority Order (when conflicts arise)

1. **API Contracts** - Backend/Logic agent's version wins
2. **Type Definitions** - Backend/Logic agent's version wins
3. **Component Logic** - Backend/Logic agent's version wins
4. **Component Styling** - UI agent's version wins
5. **Configuration** - Integrator decides

### Resolution Process

1. Integrator identifies conflict
2. Integrator determines which agent has priority
3. Losing agent rebases and adapts their changes
4. Both agents verify the resolution
5. Integrator merges

---

## Communication Channels

### For Coordination

- Use PR comments for async coordination
- Tag relevant agents in PR descriptions
- Use draft PRs to signal "work in progress"

### For Blocking Issues

- Mark PR as blocked with reason
- Tag integrator for resolution
- Document the dependency clearly

---

## Quick Reference: Who Owns What?

| Area                                 | Owner       | Notes             |
| ------------------------------------ | ----------- | ----------------- |
| `/backend/**`                        | Claude      | Full ownership    |
| `/frontend/src/lib/store.ts`         | Claude      | State management  |
| `/frontend/src/lib/api.ts`           | Claude      | API client        |
| `/frontend/src/lib/ModelRegistry.ts` | Claude      | Model definitions |
| `/frontend/src/data/**`              | Claude      | Data registries   |
| `/frontend/src/types/**`             | Claude      | Type definitions  |
| `/frontend/src/context/**`           | Claude      | Context providers |
| `/frontend/src/components/ui/**`     | Antigravity | UI primitives     |
| `/frontend/src/components/layout/**` | Antigravity | Layouts           |
| Component styling (classes)          | Antigravity | Any component     |
| Component logic (handlers)           | Claude      | Any component     |
| `/.github/**`                        | Integrator  | CI/CD             |
| `package.json`                       | Integrator  | Dependencies      |

---

## Version History

| Date       | Change                   | Author |
| ---------- | ------------------------ | ------ |
| 2024-12-18 | Initial role definitions | Claude |

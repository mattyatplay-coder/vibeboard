## Summary

<!-- Brief description of what this PR does. Focus on the "why" not just the "what". -->

## Type of Change

<!-- Check all that apply -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] UI/UX improvement (styling, layout, animations)
- [ ] Configuration change

## Files Changed

<!-- List the main files/modules this PR touches -->

| File/Directory | Change Type            |
| -------------- | ---------------------- |
| `path/to/file` | Added/Modified/Deleted |

## Claim List

<!-- Which areas does this PR claim ownership of? This prevents conflicts with other agents/developers. -->

### Backend

- [ ] `/backend/src/services/` - Service logic
- [ ] `/backend/src/controllers/` - Controllers
- [ ] `/backend/src/routes/` - API routes
- [ ] `/backend/prisma/` - Database schema

### Frontend Logic (Protected)

- [ ] `/frontend/src/lib/store.ts` - State management
- [ ] `/frontend/src/lib/api.ts` - API client
- [ ] `/frontend/src/lib/ModelRegistry.ts` - Model definitions
- [ ] `/frontend/src/data/` - Data registries
- [ ] `/frontend/src/context/` - Context providers
- [ ] `/frontend/src/types/` - Type definitions

### Frontend UI

- [ ] `/frontend/src/components/` - UI components
- [ ] `/frontend/src/app/` - Pages/routes
- [ ] Styling (Tailwind classes only)

### Configuration

- [ ] `package.json` changes
- [ ] Config files (`.env`, `tsconfig`, etc.)
- [ ] CI/CD workflows

## Testing

<!-- Check all that were completed -->

- [ ] Build passes locally (`npm run build`)
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Unit tests pass (`npm test`)
- [ ] Playwright tests pass (if applicable)
- [ ] Manual smoke test completed

### Test Commands Run

```bash
# Paste the commands you ran and their output
```

## API Changes

<!-- If this PR changes any API contracts, document them here -->

- [ ] No API changes
- [ ] New endpoint(s) added
- [ ] Existing endpoint modified
- [ ] Request/response schema changed

### API Changes Details

<!-- If API changed, describe the changes -->

```typescript
// Before

// After
```

## Risk Areas

## <!-- What could potentially break? What should reviewers pay attention to? -->

## Rollback Plan

<!-- How to revert if something goes wrong after merge -->

- [ ] Simple revert commit is sufficient
- [ ] Requires database migration rollback
- [ ] Requires manual cleanup steps (describe below)

## Screenshots/Videos

<!-- If UI changes, add before/after screenshots -->

## Checklist

<!-- Final checks before requesting review -->

- [ ] I have read the [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)
- [ ] I have checked the [CODEOWNERS](./CODEOWNERS) file for required reviewers
- [ ] My changes follow the existing code patterns
- [ ] I have not modified protected files without approval
- [ ] I have added/updated tests if applicable
- [ ] Documentation has been updated if needed

---

<!-- For AI Agents: Include the following section -->

## Agent Metadata

<!-- Fill this out if you are an AI agent -->

- **Agent Role**: <!-- e.g., Frontend UI, Backend, Integrator -->
- **Worktree**: <!-- e.g., zealous-ellis -->
- **Base Commit**: <!-- git rev-parse HEAD -->
- **Verification Status**: <!-- VERIFIED or UNVERIFIED -->

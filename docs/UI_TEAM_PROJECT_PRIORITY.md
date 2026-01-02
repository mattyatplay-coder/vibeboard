# VibeBoard 2.0 - Complete Project Priority List for UI Team

> **Generated**: January 1, 2026
> **Purpose**: Comprehensive prioritized list of all projects before UI team handoff

---

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | Launch Blocker - Must complete before any public release | Immediate |
| **P1** | Core Feature - Required for MVP launch | Sprint 1-2 |
| **P2** | Enhancement - Improves UX but not blocking | Sprint 3-4 |
| **P3** | Nice-to-Have - Future roadmap items | Backlog |

---

## P0 - LAUNCH BLOCKERS

### 1. Real Authentication System
**Status**: Not Started
**Current State**: Using `mockAuth.ts` - all users share mock credentials
**Required**:
- [ ] Production JWT verification (not mock tokens)
- [ ] Token refresh flow with proper expiry
- [ ] Session management with secure cookies
- [ ] Password reset / forgot password flow
- [ ] OAuth providers (Google, GitHub) optional but recommended

**Files to Modify**:
- `backend/src/middleware/auth.ts` (replace mockAuth)
- `backend/src/routes/authRoutes.ts`
- `frontend/src/lib/auth.ts`
- New: `frontend/src/app/(auth)/login/page.tsx`

**Why P0**: Without real auth, anyone can access any user's projects.

---

### 2. Team Collaboration Frontend
**Status**: Backend Complete, Frontend Not Started
**Current State**: Full RBAC backend exists (owner/admin/member/viewer roles)
**Required**:
- [ ] Team creation modal
- [ ] Team member invitation flow
- [ ] Role management UI (promote/demote members)
- [ ] Team project sharing
- [ ] Team settings page

**Backend Endpoints Already Exist**:
- `POST /api/teams` - Create team
- `GET /api/teams` - List user's teams
- `POST /api/teams/:id/invite` - Send invitation
- `PATCH /api/teams/:id/members/:userId` - Update role
- `DELETE /api/teams/:id/members/:userId` - Remove member

**Files**:
- `backend/src/services/TeamService.ts` - Complete
- `backend/src/routes/teamRoutes.ts` - Complete
- `backend/src/controllers/teamController.ts` - Complete
- New: `frontend/src/app/teams/page.tsx`
- New: `frontend/src/components/teams/TeamManagementModal.tsx`

**Why P0**: Planned for paid tiers - teams are a monetization feature.

---

### 3. Billing & Quota System
**Status**: Stub only
**Current State**: `BILLING_AND_QUOTA_SCHEMAS.md` is placeholder
**Required**:
- [ ] Define tier limits (Free: 50 gens/mo, Pro: 500, Enterprise: unlimited)
- [ ] Usage tracking per user
- [ ] Quota enforcement on generation endpoints
- [ ] Overage handling (block or charge)
- [ ] Stripe integration for payments
- [ ] Subscription management UI

**Files to Create**:
- `backend/src/services/BillingService.ts`
- `backend/src/services/QuotaService.ts`
- `backend/src/routes/billingRoutes.ts`
- `frontend/src/app/settings/billing/page.tsx`

**Why P0**: Cannot launch without payment system for paid features.

---

### 4. RunPod Endpoint Mismatch Resolution
**Status**: Configuration inconsistency detected
**Current State**:
- Render Backend: `RUNPOD_ENDPOINT_ID=8tqucjc03o2duo`
- Local .env: `RUNPOD_ENDPOINT_ID=6rg1i2nzxxugti`

**Required**:
- [ ] Verify which endpoint is correct
- [ ] Update Render environment variables to match
- [ ] Test GPU generation from production

**Why P0**: GPU generations may fail in production if wrong endpoint.

---

## P1 - CORE FEATURES (MVP)

### 5. VFX Suite Frontend Integration
**Status**: Backend Complete, Frontend Partial
**Current State**: `vfxController.ts` and `vfxRoutes.ts` exist with full endpoints
**Required**:
- [ ] Virtual Reshoot UI (InfCam) - camera path editor
- [ ] Focus Rescue UI (DiffCamera) - before/after preview
- [ ] Motion Fix UI - stabilization controls
- [ ] Artifact Cleanup UI - issue selector

**Backend Endpoints Already Exist**:
- `POST /api/vfx/virtual-reshoot`
- `POST /api/vfx/focus-rescue`
- `POST /api/vfx/motion-fix`
- `POST /api/vfx/artifact-cleanup`

**Files**:
- `backend/src/controllers/vfxController.ts` - Complete
- `backend/src/routes/vfxRoutes.ts` - Complete
- New: `frontend/src/app/projects/[id]/vfx-suite/page.tsx`
- New: `frontend/src/components/vfx/CameraPathEditor.tsx`

---

### 6. Shot Studio Page Completion
**Status**: Partial
**Current State**: `shot-studio/page.tsx` exists, `ShotStudioControls.tsx` complete
**Required**:
- [ ] Verify routing works correctly
- [ ] Integrate ReCo Blocking Canvas fully
- [ ] Add Spatia (Virtual Sets) backend connection
- [ ] Shot continuity tracking (StoryMem)

**Files**:
- `frontend/src/app/projects/[id]/shot-studio/page.tsx` - Exists
- `frontend/src/components/storyboard/ShotStudioControls.tsx` - Complete

---

### 7. Frontend Route Renaming
**Status**: Not Started
**Current State**: Using old route names
**Required Renames**:
| Old Route | New Route | Page |
|-----------|-----------|------|
| `/story-editor` | `/script-lab` | ScriptLab |
| `/train` | `/character-foundry` | CharacterFoundry |
| `/elements` | `/asset-bin` | AssetBin |
| `/viewfinder` | `/optics-engine` | OpticsEngine |
| `/generate` | `/shot-studio` | ShotStudio |
| `/process` | `/vfx-suite` | VFXSuite |
| `/timeline` | `/sequencer` | Sequencer |

**Additional**:
- [ ] Update all internal links
- [ ] Update navigation sidebar
- [ ] Add redirects from old URLs
- [ ] Update SAT tests

---

### 8. Security Documentation Completion
**Status**: Stub files only
**Current State**: Placeholder markdown files in `security-audit/`
**Required**:
- [ ] `SECURITY_P1_ROADMAP.md` - Rate limiting, CSRF, input sanitization
- [ ] `LAUNCH_READINESS_CHECKLIST.md` - Full launch checklist
- [ ] `SECURITY_README.md` - Auth architecture documentation

---

### 9. SAT (System Acceptance Test) Updates
**Status**: Exists but needs updates
**Current State**: `frontend/tests/sat.spec.ts` uses old routes
**Required**:
- [ ] Update route names to match new sitemap
- [ ] Add real GPU generation tests (with test budget)
- [ ] Configure for Render backend testing
- [ ] Add team collaboration tests
- [ ] Add billing/quota tests

---

## P2 - ENHANCEMENTS

### 10. Spatia (Virtual Sets) Backend
**Status**: UI hooks exist, no backend
**Current State**: `ShotStudioControls.tsx` has Spatia references
**Required**:
- [ ] Create `SpatiaService.ts`
- [ ] RunPod handler for Spatia model
- [ ] Set library management
- [ ] Environment compositing

---

### 11. Script Library RAG System
**Status**: COMPLETE
**Current State**: Fully implemented and deployed with real embeddings
**Completed**:
- [x] `VectorEmbeddingService.ts` - OpenAI text-embedding-3-small (1536 dims)
- [x] `ScriptAnalyzer.ts` - RAG retrieval methods (findSimilarScripts, generateStoryWithRAG)
- [x] `ScriptLibrary` Prisma model with pgvector support
- [x] Migration for vector column + IVFFlat index (deployed to Render)
- [x] `ingest-script-library.ts` CLI utility
- [x] RAG API endpoints in `storyStyleRoutes.ts`
- [x] 5 scripts ingested with real embeddings (3 Comedy, 2 Animation)
- [x] Frontend toggle in Story Editor ("Script Library AI")
- [x] `storyGenerationStore.ts` updated with `useRAG` config
- [x] Semantic similarity search verified working

**Architecture Decision**: Switched from MiniMax embo-01 (768 dims) to OpenAI text-embedding-3-small (1536 dims) due to MiniMax embedding API availability issues. OpenAI provides better reliability at ~$0.02/M tokens.

**Backend Endpoints**:
- `POST /api/story-style/rag/search` - Semantic search
- `POST /api/story-style/rag/generate` - RAG-enhanced generation
- `POST /api/story-style/rag/ingest` - Script ingestion
- `GET /api/story-style/rag/stats` - System statistics

---

### 12. Research LLM Pipeline (Web Scraping)
**Status**: Not Implemented
**Current State**: Planned in docs, no code
**Required**:
- [ ] Script/subtitle website scraper
- [ ] Genre/style categorization
- [ ] ShotDeck-style reference database
- [ ] Camera shot style matching

---

### 13. MiniMax Medic Middleware
**Status**: Not Implemented
**Current State**: Documented in planning files only
**Required**:
- [ ] Error interception middleware
- [ ] MiniMax LLM for JSON repair
- [ ] Auto-retry with fixed parameters
- [ ] Error pattern learning

---

### 14. Storyboard Shot Improvements
**Status**: Partial
**Current State**: Basic layout exists
**Required**:
- [ ] Shot reordering via drag-drop
- [ ] Batch operations (select multiple, delete)
- [ ] Shot templates
- [ ] Scene-level grouping

---

## P3 - BACKLOG (Future)

### 15. Stagecraft (Unreal WebRTC)
**Status**: Not Implemented
**Current State**: Planned in architecture docs
**Required**:
- [ ] RunPod Unreal Engine streaming
- [ ] WebRTC player in frontend
- [ ] NitroGen physics integration
- [ ] Real-time camera control

---

### 16. NitroGen Integration
**Status**: Not Implemented
**Current State**: Referenced in planning only
**Required**:
- [ ] Physics-based motion for characters
- [ ] Muscle simulation
- [ ] Cloth dynamics

---

### 17. ShotDeck Integration
**Status**: Not Implemented
**Required**:
- [ ] ShotDeck API integration
- [ ] Reference image search
- [ ] Camera angle matching

---

### 18. Advanced Team Features
**Status**: Backend ready for expansion
**Required**:
- [ ] Team asset libraries
- [ ] Version control for projects
- [ ] Comment threads on shots
- [ ] Activity feed

---

## Implementation Order (Recommended)

### Sprint 1 (Week 1-2)
1. **RunPod Endpoint Fix** - 1 hour
2. **Real Auth System** - 3-5 days
3. **Team Collaboration Frontend** - 2-3 days

### Sprint 2 (Week 3-4)
4. **Billing & Quota System** - 3-5 days
5. **VFX Suite Frontend** - 2-3 days
6. **Security Docs** - 1 day

### Sprint 3 (Week 5-6)
7. **Route Renaming** - 1 day
8. **Shot Studio Completion** - 2 days
9. **SAT Updates** - 1 day

### Sprint 4+ (Future)
10. Research LLM, Spatia, Medic, Stagecraft, etc.

---

## Files Ready for UI Team

### Backend Complete (No Changes Needed)
- `backend/src/services/TeamService.ts`
- `backend/src/controllers/teamController.ts`
- `backend/src/routes/teamRoutes.ts`
- `backend/src/controllers/vfxController.ts`
- `backend/src/routes/vfxRoutes.ts`
- `backend/src/services/rendering/RenderQueueService.ts`
- `backend/src/services/llm/VectorEmbeddingService.ts` (RAG embeddings)
- `backend/src/services/story/ScriptAnalyzer.ts` (RAG retrieval)
- `backend/src/scripts/ingest-script-library.ts` (CLI ingestion)
- All security middleware in `backend/src/middleware/auth.ts`

### Frontend Complete (Reference)
- `frontend/src/components/viewfinder/DirectorViewfinder.tsx`
- `frontend/src/components/storyboard/ShotStudioControls.tsx`
- `frontend/src/components/generations/GenerationSearch.tsx`
- `frontend/src/components/generations/RenderQueuePanel.tsx`

### Planning Documents
- `docs/VibeBoard Final UX Handoff List.md`
- `docs/VIBEBOARD_PRODUCT_BIBLE.md`
- `docs/FEATURE_INVENTORY.md`
- `docs/Camera_Data_Integration_Spec.md`
- `docs/System Acceptance Test (SAT).txt`
- `new_vibeboard_2.0_checklist.txt`

---

## API Endpoint Inventory

| Category | Total Endpoints | Auth Protected | Quota Protected |
|----------|-----------------|----------------|-----------------|
| Generation | 15 | 15 | 10 |
| VFX Suite | 6 | 6 | 4 |
| Tracking | 8 | 8 | 5 |
| Video Extension | 4 | 4 | 4 |
| Prompts | 3 | 3 | 3 |
| Search | 7 | 7 | 3 |
| Lighting | 1 | 1 | 1 |
| Foundry | 4 | 4 | 3 |
| Teams | 8 | 8 | 0 |
| RAG/Script Library | 4 | 4 | 2 |
| **TOTAL** | **60** | **60** | **35** |

---

## Cost Estimates (Infrastructure)

| Service | Current Monthly | Notes |
|---------|-----------------|-------|
| Render PostgreSQL | $19 | Standard tier |
| Render Web Service | $25 | Standard tier |
| Redis Cloud | Free | Free tier sufficient |
| Cloudflare R2 | ~$0 | Zero egress, pay per storage |
| RunPod GPU | Variable | ~$0.39/hr when active |
| **Total Fixed** | **~$44/mo** | Before GPU usage |

---

*Document generated from codebase analysis on January 1, 2026*

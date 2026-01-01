# VibeBoard - Master Feature & Resource Inventory

> **Last Updated**: December 31, 2025
> **Version**: 1.2
> **Purpose**: Comprehensive catalog of all tools, features, and capabilities in VibeBoard

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 7: Team Collaboration](#phase-7-team-collaboration)
3. [AI Providers & Models](#ai-providers--models)
4. [Frontend Pages](#frontend-pages)
5. [Backend Services](#backend-services)
6. [UI Components](#ui-components)
7. [Data Files & Static Resources](#data-files--static-resources)
8. [API Endpoints](#api-endpoints)
9. [Cost Reference](#cost-reference)

---

## Executive Summary

VibeBoard is a **self-hosted AI video production platform** with:

| Metric | Count |
|--------|-------|
| **AI Providers** | 11 (Fal.ai, Replicate, Together, OpenAI, Google, HuggingFace, Civitai, ComfyUI, Banana, xAI, Anthropic) |
| **Image Models** | 60+ |
| **Video Models** | 40+ |
| **LLM Adapters** | 7 |
| **Frontend Pages** | 13 |
| **Backend Services** | 68 files across 22 directories |
| **UI Components** | 122 React components |
| **API Endpoints** | 200+ (38 categories) |

---

## Phase 7: Team Collaboration

> **Status**: ✅ Complete (December 31, 2025)
> **Purpose**: Transform VibeBoard from "Personal Studio" to "Multi-Tenant Platform"

### Overview

Phase 7 introduces team-based collaboration with:
- **Multi-tenant architecture** - Teams as core tenant unit
- **Role-Based Access Control (RBAC)** - Owner, Admin, Member, Viewer roles
- **Shared asset libraries** - Elements & LoRAs accessible team-wide
- **Project sharing** - Projects belong to users but can be assigned to teams
- **Version Control** - Sequencer snapshots for timeline state preservation

### Team Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Team display name |
| `slug` | String | URL-friendly identifier (unique) |
| `tier` | Enum | `free`, `pro`, `enterprise` |
| `maxMembers` | Int | Member limit (default: 5) |
| `maxProjects` | Int | Project limit (default: 10) |
| `monthlyGenerationsLimit` | Int | Generation quota (default: 1000) |
| `members` | Relation | TeamMember[] |
| `projects` | Relation | Project[] |
| `elements` | Relation | Element[] |
| `loras` | Relation | LoRA[] |

### TeamMember Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full control, can delete team, transfer ownership |
| `admin` | Add/remove members, manage projects, cannot delete team |
| `member` | Create content, use shared assets, cannot manage members |
| `viewer` | Read-only access to team content |

### Team API Endpoints (`/api/teams`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/` | Create team | Required |
| GET | `/` | List user's teams | Required |
| GET | `/:teamId` | Get team details | Required |
| GET | `/slug/:slug` | Get team by slug | Required |
| PATCH | `/:teamId` | Update team | Admin+ |
| DELETE | `/:teamId` | Delete team | Owner only |
| POST | `/:teamId/members` | Add member | Admin+ |
| PATCH | `/:teamId/members/:memberId` | Update member role | Admin+ |
| DELETE | `/:teamId/members/:memberId` | Remove member | Admin+ |
| POST | `/:teamId/leave` | Leave team (self) | Member |
| GET | `/:teamId/quota` | Check quota status | Required |

### Asset Sharing

**Elements & LoRAs inherit teamId from parent project:**

```typescript
// When creating an element, inherit teamId from project
const teamId = await getProjectTeamId(projectId);
const element = await prisma.element.create({
    data: { projectId, teamId, name, type, fileUrl, ... }
});
```

**Multi-tenant query pattern for projects:**

```typescript
// Users see their own projects + team projects
const projects = await prisma.project.findMany({
    where: {
        OR: [
            { userId: user.id },           // User's own projects
            { teamId: { in: userTeamIds } } // Team projects
        ]
    }
});
```

### Version Control (Sequencer Snapshots)

**SequencerSnapshot Model:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `projectId` | UUID | Parent project |
| `name` | String | Snapshot name |
| `createdAt` | DateTime | When saved |
| `state` | JSON | Complete timeline state |

**Snapshot State Contents:**
- Segment order and timing
- Trim points (video and audio)
- Audio gain settings
- L-Cut/J-Cut offsets
- Any timeline-specific metadata

**Snapshot Endpoints (`/api/projects/:projectId/sequencer/snapshots`):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/` | Save snapshot |
| GET | `/` | List snapshots |
| GET | `/:snapshotId` | Get snapshot |
| POST | `/:snapshotId/restore` | Restore (auto-backup before restore) |
| DELETE | `/:snapshotId` | Delete snapshot |

### Key Implementation Files

| File | Purpose |
|------|---------|
| `backend/src/routes/teamRoutes.ts` | Team API endpoints |
| `backend/src/controllers/teamController.ts` | Team business logic |
| `backend/src/services/TeamService.ts` | Team operations service |
| `backend/src/controllers/projectController.ts` | Multi-tenant project queries |
| `backend/src/controllers/elementController.ts` | Asset teamId inheritance |
| `backend/src/routes/sequencerRoutes.ts` | Version control endpoints |
| `backend/prisma/schema.prisma` | Team, TeamMember, SequencerSnapshot models |

### Tier Limits

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Team members | 5 | 25 | Unlimited |
| Projects | 10 | 100 | Unlimited |
| Monthly generations | 1,000 | 10,000 | Unlimited |
| Asset storage | 5 GB | 50 GB | Unlimited |

---

## AI Providers & Models

### Image Generation

| Provider | Models | Cost Range | Best For |
|----------|--------|------------|----------|
| **Fal.ai** | Flux Dev/Pro/Schnell, Ideogram, Recraft, SDXL, Imagen 3/4, HiDream, Kling O1 | $0.003-$0.10 | Primary provider, fastest, most features |
| **Replicate** | Flux 1.1/2.0, SDXL, Imagen, Consistent Character | $0.002-$0.06 | Custom LoRA training, open-source models |
| **Together AI** | Flux Schnell, DreamShaper, HiDream, Juggernaut | $0.0006-$0.025 | Budget-friendly, no content filters |
| **OpenAI** | DALL-E 3, GPT Image 1 | $0.04-$0.08 | Premium quality, creative concepts |
| **Google** | Imagen 3, Imagen 4 | $0.03-$0.04 | Photorealism |
| **Civitai** | SDXL, Pony, Realistic Vision, Flux D | $0.01-$0.025 | LoRA ecosystem, community models |
| **HuggingFace** | Various (free tier) | Free | Testing, rate-limited |
| **ComfyUI** | Any local model | $0 | Full control, unlimited generations |

### Image Editing

| Model | Provider | Purpose | Cost |
|-------|----------|---------|------|
| Flux Kontext (Dev/Pro/Max) | Fal.ai | Text-based editing, scene transfer | $0.025-$0.08 |
| Flux Inpainting | Fal.ai | Object removal, inpainting | $0.025 |
| Flux Fill Pro | Fal.ai | Inpainting & outpainting | $0.05 |
| IP-Adapter Face ID | Fal.ai | Face identity preservation | $0.02 |
| Clarity/Creative Upscaler | Fal.ai | AI upscaling (2x-4x) | $0.015-$0.02/MP |
| Qwen Image Edit Plus | Fal.ai | Advanced object removal | $0.04 |

### Video Generation (Text-to-Video)

| Model | Provider | Duration | Cost/sec | Features |
|-------|----------|----------|----------|----------|
| Wan 2.6 | Fal.ai | 5-15s | $0.06 | Multi-shot, audio sync |
| Wan 2.5 | Fal.ai | 5-10s | $0.05 | Improved quality |
| Wan 2.2/2.1 | Fal.ai | 5-15s | $0.03-$0.05 | Efficient, realistic |
| Kling 2.6 Pro | Fal.ai | 5-10s | $0.12 | Native audio generation |
| Kling 2.1 Master | Fal.ai | 5-10s | $0.10 | Premium quality |
| Veo 3 | Fal.ai/Google | 5-10s | $0.40 | DeepMind flagship |
| Luma Ray 2 | Fal.ai | 5-9s | $0.08 | Realistic |
| MiniMax Hailuo | Fal.ai | 6s | $0.08 | Physics & camera |
| LTX Video | Fal.ai | 5s | $0.04 | Fast |
| Hunyuan Video | Fal.ai | 4s | $0.06 | Open source |

### Video Generation (Image-to-Video)

| Model | Provider | Duration | Cost/sec | Features |
|-------|----------|----------|----------|----------|
| Wan I2V (2.1-2.6) | Fal.ai | 5-15s | $0.05-$0.08 | Most versatile |
| Kling O1 I2V | Fal.ai | 5-10s | $0.15 | 4 reference images |
| Luma Ray 2 I2V | Fal.ai | 5-9s | $0.08 | Dreamlike |
| Runway Gen3 Turbo | Fal.ai | 5-10s | $0.10 | Fast |
| Vidu I2V | Fal.ai | 4-8s | $0.08 | Sound effects |

### Avatar & Lip Sync

| Model | Provider | Duration | Cost/sec |
|-------|----------|----------|----------|
| Kling AI Avatar Pro | Fal.ai | 10-60s | $0.12 |
| Kling AI Avatar Standard | Fal.ai | 10-60s | $0.08 |
| Creatify Aurora | Fal.ai | 10-60s | $0.10 |
| Wan Animate Move | Fal.ai | 5s | $0.06 |

### LLM Providers

| Provider | Model | Purpose | Best For |
|----------|-------|---------|----------|
| **xAI Grok** | Grok-3 | Vision + Chat | Primary - fastest vision, cinematography |
| **Anthropic** | Claude Sonnet 4 | Chat + Vision | Screenplay, creative writing |
| **OpenRouter** | Various | Fallback gateway | Cost optimization |
| **Together AI** | Mixtral, Llama | Budget LLM | Simple tasks |
| **Ollama** | Local models | Privacy | Local-only inference |

---

## Frontend Pages

| Page | Path | Purpose | Key Features |
|------|------|---------|--------------|
| **Home** | `/` | Project management | Create/delete projects, grid view |
| **Generate** | `/projects/[id]/generate` | Image/video creation | Smart Prompt Builder, Visual Librarian, Element picker |
| **Elements** | `/projects/[id]/elements` | Asset management | Drag-drop upload, batch operations, session filtering |
| **Storyboard** | `/projects/[id]/storyboard` | Scene chain editing | Shot-by-shot workflow, cost tracking, frame generation |
| **Story Editor** | `/projects/[id]/story-editor` | Script breakdown | Genre/director styles, Pixar rules, auto-prompts |
| **Timeline** | `/projects/[id]/timeline` | NLE editing | L-Cut support, FFmpeg export, YouTube delivery |
| **Training** | `/projects/[id]/train` | LoRA training | Character Foundry, synthetic datasets, pose presets |
| **Process** | `/projects/[id]/process` | Post-production | 6 tools: Tattoo, Eraser, Roto, Extension, Cast, Text |
| **Viewfinder** | `/projects/[id]/viewfinder` | DOF simulator | Layer compositing, framing guides, AR preview |
| **Dailies** | `/projects/[id]/dailies` | Review & approval | Comments, annotations, version switching |
| **Scene Chains** | `/projects/[id]/scene-chains` | Legacy scene management | Basic CRUD (superseded by Storyboard) |
| **Extend** | `/projects/[id]/extend` | Video extension | Quick/Advanced modes |
| **Test** | `/test-components` | Development sandbox | Component demos |

---

## Backend Services

### Core Generation (6 files)
- `GenerationService.ts` - Main orchestration, model-to-provider routing
- `GenerationJobService.ts` - Job lifecycle management
- `LLMService.ts` - Unified LLM interface

### AI Adapters (12 files in `generators/`)
| Adapter | Provider | Capabilities |
|---------|----------|--------------|
| `FalAIAdapter.ts` | Fal.ai | Images, videos, vision, character consistency |
| `ReplicateAdapter.ts` | Replicate | Images, training, custom LoRAs |
| `TogetherAdapter.ts` | Together AI | Budget images |
| `OpenAIAdapter.ts` | OpenAI | DALL-E, Sora |
| `GoogleVeoAdapter.ts` | Google | Imagen, Veo |
| `HuggingFaceAdapter.ts` | HuggingFace | Free inference |
| `ComfyUIAdapter.ts` | Local | Custom workflows |
| `CivitaiAdapter.ts` | Civitai | LoRA discovery |
| `WanVideoAdapter.ts` | Fal.ai Wan | Video generation |
| `BananaAdapter.ts` | Banana | Serverless GPU |
| `TopazAdapter.ts` | Topaz | Video upscaling |
| `AudioGenerator.ts` | Various | Audio generation |

### LLM Adapters (7 files in `llm/`)
| Adapter | Provider |
|---------|----------|
| `GrokAdapter.ts` | xAI (primary) |
| `ClaudeAdapter.ts` | Anthropic |
| `OpenRouterService.ts` | OpenRouter |
| `TogetherLLMAdapter.ts` | Together AI |
| `OllamaAdapter.ts` | Local |
| `DolphinAdapter.ts` | Dolphin |

### Prompt Engineering (3 files in `prompts/`)
- `PromptEnhancer.ts` - Model-specific enhancement
- `ModelPromptGuides.ts` - Syntax rules per model
- `LoRARegistry.ts` - LoRA metadata database

### Search & Indexing (2 files in `search/`)
- `SemanticIndexService.ts` - Visual Librarian (Grok Vision indexing)
- `VectorEmbeddingService.ts` - CLIP embeddings

### Tracking & Compositing (2 files in `tracking/`)
- `PointTrackingService.ts` - CoTracker3 integration
- `PropCompositorService.ts` - Prop compositing on video

### Export & Delivery (3 files)
- `export/MasterExportService.ts` - FFmpeg muxing, L-Cut, ProRes
- `export/AlphaChannelService.ts` - Transparency handling
- `delivery/YouTubeUploadService.ts` - OAuth2, AI metadata

### Lighting & Cinematography (2 files)
- `lighting/LightingAnalysisService.ts` - Inverse Gaffing (Grok Vision)
- `audio/AcousticMappingService.ts` - Perspective-matched audio

### Story & Scriptwriting (3 files in `story/`)
- `GenreStyleGuide.ts` - 14 genres, 12 directors, 5 cinematographers
- `ScriptAnalyzer.ts` - Script analysis, prompt generation
- `StoryEditorService.ts` - Script-to-storyboard pipeline

### Training & Character (4 files in `training/`)
- `DatasetGeneratorService.ts` - Character Foundry (20+ pose presets)
- `FalTrainingService.ts` - Fal.ai LoRA training
- `ReplicateTrainingService.ts` - Replicate training

### Processing (2 files in `processing/`)
- `InpaintingService.ts` - Magic Eraser (multi-tier quality)
- `TattooCompositingService.ts` - Realistic tattoo placement

### Rendering (2 files in `rendering/`)
- `RenderQueueService.ts` - Multi-pass queue (Draft→Master)
- `RenderQueueTypes.ts` - Type definitions, seed inheritance

### Learning (2 files in `learning/`)
- `AIFeedbackStore.ts` - User feedback collection
- `AnalysisService.ts` - Learned hint injection

### Analytics (1 file)
- `analytics/DirectorDashboardService.ts` - Cost/quality metrics

### Knowledge (1 file)
- `knowledge/KnowledgeBaseService.ts` - Global resource context

---

## UI Components (122 total)

### By Category

| Category | Count | Key Components |
|----------|-------|----------------|
| **generations/** | 21 | GenerationCard, GenerationResults, GenerationSearch, ABLightbox, EngineLibraryModal, ShotNavigator, VideoScopes, RenderQueuePanel |
| **storyboard/** | 24 | StoryboardShot, CinematicTagsModal, CameraControlPanel, StyleSelectorModal, ElementReferencePicker |
| **prompts/** | 8 | PromptBuilder, NegativePromptManager, PromptTreePanel, PropBinPanel, WeightHintTooltip |
| **processing/** | 8 | TattooPlacementPanel, MagicEraserPanel, RotoscopePanel, SetExtensionPanel, CastAssemblerPanel, TextFixerPanel |
| **elements/** | 4 | ElementCard, SortFilterHeader, EditElementModal, PropFabricatorModal |
| **audio/** | 4 | AudioInput, AudioGeneratorModal, AcousticStudioPanel, AcousticWaveform |
| **lighting/** | 2 | LightingStage, LightingPreview3D |
| **viewfinder/** | 6 | DirectorViewfinder, SceneDepthControls, LayerManager |
| **dailies/** | 5 | VersionSwitcher, CommentsButton, AnnotationOverlay |
| **timeline/** | 2 | NLETimeline, OverlayTrackPanel |
| **training/** | 2 | DatasetReviewPanel, PosePresetSelector |
| **loras/** | 3 | LoRAManager, GlobalLibraryPanel, CivitaiBrowser |
| **delivery/** | 1 | DeliveryModal |
| **templates/** | 2 | SaveTemplateModal, TemplateGalleryModal |
| **ui/** | 6 | Tooltip, RecoveryToast, ErrorBoundary, Skeleton, Toaster, DynamicRatioIcon |
| **layout/** | 3 | Sidebar, StudioLayout, StudioSidebar |
| **wizard/** | 5 | PromptWizard, Step1-4 |
| **Other** | 16 | Various specialized components |

### Key Feature Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `GenerationCard.tsx` | generations/ | Image/video card with toolbar (upscale, animate, reshoot) |
| `EngineLibraryModal.tsx` | generations/ | Model browser with 100+ models |
| `PromptBuilder.tsx` | prompts/ | Smart prompt enhancement with Grok |
| `ABLightbox.tsx` | generations/ | Side-by-side comparison with scopes |
| `ShotNavigator.tsx` | generations/ | Scene chain workflow from Generate page |
| `LightingStage.tsx` | lighting/ | Virtual Gaffer with Inverse Gaffing |
| `NLETimeline.tsx` | timeline/ | Professional editing with L-Cut support |
| `DirectorViewfinder.tsx` | viewfinder/ | DOF simulator with layer compositing |
| `CinematicTagsModal.tsx` | storyboard/ | 165+ tags across 7 categories |
| `DatasetReviewPanel.tsx` | training/ | Review synthetic datasets |

---

## Data Files & Static Resources

### Frontend Data (`frontend/src/data/`)

| File | Content |
|------|---------|
| `CinematicTags.ts` | 165+ tags: Cameras, Lenses, Film Stock, Color Grade, Lighting, Motion, Mood |
| `CameraPresets.ts` | Camera move definitions for generation |
| `LensPresets.ts` | Lens kits with focal lengths, anamorphic modifiers |
| `GenreTemplates.ts` | Genre-specific prompt templates |
| `CreatorArchetypes.ts` | Content creator personas |

### Frontend Lib (`frontend/src/lib/`)

| File | Content |
|------|---------|
| `ModelRegistry.ts` | 100+ model definitions with capabilities |
| `ModelPricing.ts` | Cost per image/second/megapixel |
| `api.ts` | API client functions |
| `lightingStore.ts` | Zustand store for Virtual Gaffer |
| `opticalPhysics.ts` | DOF calculations |
| `pageSessionStore.ts` | Session recovery persistence |
| `sessionRecoveryStore.ts` | Cross-page session state |

### Backend Data

| Location | Content |
|----------|---------|
| `backend/data/ai_feedback.json` | User feedback on AI analysis |
| `backend/data/ai_patterns.json` | Learned patterns from feedback |
| `backend/datasets/` | Synthetic datasets for training |
| `backend/uploads/` | User-uploaded files |

---

## API Endpoints

### Teams (`/api/teams/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/` | Create team |
| GET | `/` | List user's teams |
| GET | `/:teamId` | Get team details |
| GET | `/slug/:slug` | Get team by slug |
| PATCH | `/:teamId` | Update team |
| DELETE | `/:teamId` | Delete team (owner only) |
| POST | `/:teamId/members` | Add member |
| PATCH | `/:teamId/members/:memberId` | Update member role |
| DELETE | `/:teamId/members/:memberId` | Remove member |
| POST | `/:teamId/leave` | Leave team |
| GET | `/:teamId/quota` | Get quota status |

### Sequencer Snapshots (`/api/projects/:projectId/sequencer/snapshots`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/` | Save snapshot |
| GET | `/` | List snapshots |
| GET | `/:snapshotId` | Get snapshot |
| POST | `/:snapshotId/restore` | Restore snapshot |
| DELETE | `/:snapshotId` | Delete snapshot |

### Generation (`/api/projects/:projectId/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generations` | Create generation |
| GET | `/generations` | List generations |
| GET | `/generations/:id` | Get single generation |
| DELETE | `/generations/:id` | Delete generation |
| POST | `/generations/:id/iterate` | Create variation |
| POST | `/generations/:id/analyze` | Analyze with Grok Vision |

### Scene Chains (`/api/projects/:projectId/scene-chains/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List scene chains |
| POST | `/` | Create scene chain |
| GET | `/:chainId` | Get chain with segments |
| POST | `/:chainId/segments` | Add segment |
| PATCH | `/:chainId/segments/:segId` | Update segment |
| DELETE | `/:chainId/segments/:segId` | Delete segment |
| POST | `/:chainId/segments/:segId/generate` | Generate video |
| POST | `/:chainId/segments/:segId/generate-frame` | Generate frame |

### Search (`/api/projects/:projectId/search/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Natural language query |
| GET | `/stats` | Index statistics |
| GET | `/suggestions` | Smart suggestion pills |
| POST | `/index` | Batch indexing |
| POST | `/retry-failed` | Retry failed indexing |
| GET | `/similar/composition/:id` | Find similar framing |
| GET | `/similar/lighting/:id` | Find similar lighting |

### Training (`/api/training/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/pose-presets` | List pose presets |
| POST | `/jobs` | Create training job |
| GET | `/jobs` | List jobs |
| POST | `/jobs/:id/generate-dataset` | Generate synthetic dataset |

### Processing (`/api/process/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/tattoo-composite` | Composite tattoo |
| POST | `/magic-eraser` | Object removal |
| POST | `/upload-temp` | Upload temporary file |

### Qwen Image Edit (`/api/qwen/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/assemble` | Cast Assembler |
| POST | `/fabricate-prop` | Prop Fabricator |
| POST | `/fix-text` | Text/Sign Fixer |
| POST | `/reshoot` | AI Reshoot |

### Export (`/api/projects/:projectId/export/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/bake` | Bake timeline to video |
| POST | `/epk` | Generate EPK |

### YouTube (`/api/youtube/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/auth/init` | Initialize OAuth |
| GET | `/auth/callback` | OAuth callback |
| POST | `/generate-metadata` | AI title/description |
| POST | `/upload-from-path` | Upload video |

### Story Style (`/api/story-style/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/genres` | List genres |
| GET | `/directors` | List director styles |
| GET | `/cinematographers` | List cinematographers |
| GET | `/pixar-rules` | Get Pixar 22 rules |
| POST | `/generate-outline` | Generate story outline |
| POST | `/generate-scene-prompts` | Generate scene prompts |

### Tracking (`/api/tracking/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/grid` | Grid-based tracking |
| POST | `/points` | User point tracking |
| POST | `/planar` | 4-corner surface tracking |
| POST | `/homography` | Calculate transform matrix |
| POST | `/composite` | Composite prop onto video |
| POST | `/preview-frame` | Single frame preview |

### Authentication (`/api/auth/`)

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/register` | Create new user account | Public |
| POST | `/login` | Login with email/password | Public |
| POST | `/refresh` | Refresh access token | Public (with refresh token) |
| POST | `/logout` | Revoke current refresh token | Public |
| POST | `/logout-all` | Revoke all user tokens | Required |
| GET | `/me` | Get current user info | Required |

### Backup & Restore (`/api/projects/:projectId/backup`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/export` | Export project data as JSON |
| POST | `/import` | Import project from JSON backup |

### Acoustic Studio (`/api/acoustic/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/recipe` | Generate audio recipe for lens |
| GET | `/mappings` | Get all lens-to-reverb mappings |
| GET | `/lens/:focalLength` | Get mapping for specific focal length |
| GET | `/genre-ir` | Get genre-specific impulse responses |
| GET | `/moods` | Get mood-based audio presets |
| POST | `/batch` | Generate batch audio recipes |

### Continuity Checking (`/api/continuity/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/check` | Check visual continuity between frames |
| POST | `/scene` | Analyze scene continuity |

### LLM Generation (`/api/llm/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate` | Generate text with LLM |
| POST | `/stream` | Stream LLM response |

### GPU Worker (`/api/gpu/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Check GPU worker health |
| POST | `/optics/rack-focus` | Generate rack focus effect |
| POST | `/optics/lens-character` | Apply lens character effects |
| POST | `/rescue-focus` | DiffCamera focus rescue |
| POST | `/director/edit` | Director Edit (InfCam) |
| POST | `/video/generate` | Generate video on GPU |

### Overlay Tracks (`/api/overlays/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/lower-third` | Generate lower third graphic |
| GET | `/styles` | Get available overlay styles |
| GET | `/presets` | Get overlay presets |
| POST | `/tracks` | Create overlay track |
| POST | `/composite` | Composite overlay onto video |
| POST | `/preview` | Preview overlay |

### Content Creator (`/api/creator/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate-script` | Generate creator script |
| POST | `/generate-shot-list` | Generate shot list |
| POST | `/generate-visual-prompts` | Generate visual prompts |
| POST | `/generate-thumbnail` | Generate thumbnail |

### Render Queue (`/api/projects/:projectId/render-queue/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/jobs` | Create render job |
| GET | `/jobs` | List render jobs |
| GET | `/jobs/:jobId` | Get job details |
| DELETE | `/jobs/:jobId` | Cancel/delete job |
| POST | `/jobs/:jobId/passes` | Add render pass |
| POST | `/jobs/:jobId/promote` | Promote to higher quality |
| GET | `/version-stack/:shotId` | Get version stack |
| GET | `/version-stacks` | Get all version stacks |
| GET | `/cost-comparison` | Compare draft vs master costs |

### Video Extension (`/api/extend-video/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/analyze` | Analyze video for extension |
| POST | `/generate` | Generate extended video |
| GET | `/status/:id` | Check extension status |
| POST | `/batch` | Batch extend multiple videos |

### Virtual Gaffer (`/api/lighting/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/analyze` | Analyze image for lighting setup |
| GET | `/presets` | Get lighting presets |

### DOF Simulator (`/api/viewfinder/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/extract-layers` | Extract depth layers from image |
| POST | `/composite` | Composite layers with DOF |
| GET | `/presets` | Get lens/camera presets |

### Global Library (`/api/library/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/loras` | List global LoRAs |
| POST | `/loras` | Add LoRA to global library |
| GET | `/models` | List available models |
| GET | `/workflows` | List workflow templates |

### Project LoRAs (`/api/projects/:projectId/loras`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List project LoRAs |
| POST | `/` | Add LoRA to project |
| DELETE | `/:loraId` | Remove LoRA |
| POST | `/civitai-metadata` | Fetch Civitai metadata |

### Project Workflows (`/api/projects/:projectId/workflows`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List workflows |
| POST | `/` | Create workflow |
| GET | `/:workflowId` | Get workflow |
| PATCH | `/:workflowId` | Update workflow |
| DELETE | `/:workflowId` | Delete workflow |

### Model Parameters (`/api/projects/:projectId/parameters`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Get model parameters |
| POST | `/` | Save parameter preset |
| PATCH | `/:presetId` | Update preset |
| DELETE | `/:presetId` | Delete preset |

### Sessions (`/api/projects/:projectId/sessions`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List sessions |
| POST | `/` | Create session |
| GET | `/:sessionId` | Get session |
| PATCH | `/:sessionId` | Update session |
| DELETE | `/:sessionId` | Delete session |

### Scenes (`/api/projects/:projectId/scenes`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List scenes |
| POST | `/` | Create scene |
| GET | `/:sceneId` | Get scene |
| PATCH | `/:sceneId` | Update scene |
| DELETE | `/:sceneId` | Delete scene |

### Props (`/api/projects/:projectId/props`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List props |
| POST | `/` | Create prop |
| POST | `/extract` | Extract prop from image |
| DELETE | `/:propId` | Delete prop |

### Stories (`/api/projects/:projectId/stories`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List stories |
| POST | `/` | Create story |
| GET | `/:storyId` | Get story |
| PATCH | `/:storyId` | Update story |
| DELETE | `/:storyId` | Delete story |
| POST | `/:storyId/export-storyboard` | Export to storyboard |

### AI Providers (`/api/providers/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List available providers |
| GET | `/:provider/models` | List models for provider |
| GET | `/:provider/health` | Check provider health |

### Character Foundry (`/api/foundry/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate-performance` | Generate character performance |
| POST | `/flash-portrait` | FlashPortrait generation |
| GET | `/presets` | Get character presets |

### Optics Engine (`/api/optics/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/rack-focus` | Generate rack focus |
| POST | `/lens-character` | Apply lens character |
| GET | `/lenses` | Get lens database |
| POST | `/preview` | Preview optics effect |

### Camera Database (`/api/cameras/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List cameras |
| GET | `/:cameraId` | Get camera details |
| GET | `/:cameraId/lenses` | Get compatible lenses |

### Shot Studio (`/api/projects/:projectId/shot-studio`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/spatia` | Generate 3D set |
| POST | `/reco` | Apply ReCo compositional control |
| POST | `/shot` | Generate shot |

### VFX Suite (`/api/projects/:projectId/vfx`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/virtual-reshoot` | InfCam virtual camera move |
| POST | `/focus-rescue` | DiffCamera focus fix |
| POST | `/motion-fix` | Fix motion artifacts |
| POST | `/cleanup` | General VFX cleanup |

### Webhooks (`/api/webhooks/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/fal` | Fal.ai completion webhook |
| POST | `/replicate` | Replicate training webhook |

### Elements (Global) (`/api/elements`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List all elements across projects |

### Elements (Project) (`/api/projects/:projectId/elements`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List project elements |
| POST | `/` | Upload element |
| POST | `/from-generation` | Create from generation URL |
| GET | `/:elementId` | Get element |
| PATCH | `/:elementId` | Update element |
| DELETE | `/:elementId` | Delete element |

### Templates (`/api/templates/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List workflow templates |
| POST | `/` | Save as template |
| GET | `/:templateId` | Get template |
| DELETE | `/:templateId` | Delete template |

### Comments & Annotations (`/api/projects/:projectId/comments`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/:generationId` | Get comments for generation |
| POST | `/:generationId` | Add comment |
| DELETE | `/:generationId/:commentId` | Delete comment |

### Dashboard Analytics (`/api/dashboard/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/stats` | Get dashboard statistics |
| GET | `/cost-breakdown` | Get cost breakdown |
| GET | `/usage` | Get usage metrics |

### AI Feedback (`/api/ai-feedback/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/` | Submit feedback on AI analysis |
| GET | `/stats` | Get feedback statistics |

### Alpha Channel (`/api/alpha/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/extract` | Extract alpha channel (SAM 2) |
| POST | `/sequence` | Export PNG sequence with alpha |

### Prompts (`/api/prompts/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/enhance` | Enhance prompt with LLM |
| GET | `/presets` | Get prompt presets |

### RAG System (`/api/story-style/rag/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/search` | Semantic script search |
| POST | `/generate` | RAG-enhanced story generation |
| POST | `/ingest` | Ingest script to library |
| GET | `/stats` | Get RAG system statistics |

---

## Cost Reference

### Image Generation (per image)

| Tier | Cost | Models |
|------|------|--------|
| **Budget** | $0.0006-$0.01 | Together DreamShaper, HuggingFace, Civitai SDXL |
| **Standard** | $0.02-$0.035 | Flux Schnell, Flux Dev, SDXL, Imagen 3 |
| **Premium** | $0.04-$0.06 | Flux Pro, Ideogram V3, Kling O1 |
| **Ultra** | $0.08-$0.10 | Flux Kontext Max, Ideogram Character |
| **Free** | $0 | ComfyUI (local), HuggingFace (rate-limited) |

### Video Generation (per second)

| Tier | Cost | Models |
|------|------|--------|
| **Budget** | $0.03-$0.05 | Wan 2.1, LTX Video |
| **Standard** | $0.05-$0.08 | Wan 2.5/2.6, Luma, MiniMax, Vidu |
| **Premium** | $0.10-$0.15 | Kling Master/Pro, Runway Gen3 |
| **Ultra** | $0.40 | Google Veo 3 |
| **Free** | $0 | ComfyUI (local) |

### LLM (per 1K tokens)

| Provider | Input | Output |
|----------|-------|--------|
| Grok-3 | ~$0.002 | ~$0.01 |
| Claude Sonnet | ~$0.003 | ~$0.015 |
| GPT-4 | ~$0.01 | ~$0.03 |

### Training

| Provider | Cost | Duration |
|----------|------|----------|
| Fal.ai | ~$5-15 | 15-45 min |
| Replicate | ~$3-10 | 20-60 min |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Dec 31, 2025 | 1.2 | Complete API endpoint audit: Added 26 new endpoint categories (Auth, Backup, Acoustic, Continuity, LLM, GPU, Overlays, Creator, Render Queue, Video Extension, Lighting, Viewfinder, Library, LoRAs, Workflows, Parameters, Sessions, Scenes, Props, Stories, Providers, Foundry, Optics, Cameras, Shot Studio, VFX, Webhooks, Elements, Templates, Comments, Dashboard, AI Feedback, Alpha Channel, Prompts, RAG) |
| Dec 31, 2025 | 1.1 | Added Phase 7: Team Collaboration (Teams, RBAC, Asset Sharing, Version Control) |
| Dec 29, 2025 | 1.0 | Initial comprehensive inventory |

---

*This document is auto-generated and may be updated as features evolve.*

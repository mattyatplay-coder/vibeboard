# VibeBoard - Master Feature & Resource Inventory

> **Last Updated**: December 29, 2025
> **Version**: 1.0
> **Purpose**: Comprehensive catalog of all tools, features, and capabilities in VibeBoard

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI Providers & Models](#ai-providers--models)
3. [Frontend Pages](#frontend-pages)
4. [Backend Services](#backend-services)
5. [UI Components](#ui-components)
6. [Data Files & Static Resources](#data-files--static-resources)
7. [API Endpoints](#api-endpoints)
8. [Cost Reference](#cost-reference)

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
| **API Endpoints** | 100+ |

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
| POST | `/composite` | Composite prop onto video |

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
| Dec 29, 2025 | 1.0 | Initial comprehensive inventory |

---

*This document is auto-generated and may be updated as features evolve.*

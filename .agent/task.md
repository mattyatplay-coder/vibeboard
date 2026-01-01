# 🔴 ACTIVE SESSION TASKS - CHECK FIRST!

> **Last Updated**: Dec 31, 2025 (Evening)
> **Purpose**: Prevents Claude from forgetting mid-session items

## Current Session (Dec 30, 2025) - GPU Worker Deployment

### GPU Worker Status

- [x] **Async handler deadlock fix** - Fixed `runpod_handler.py` to use `asyncio.run()` instead of complex event loop handling
- [x] **Docker image pushed** - `mattydc/vibeboard-gpu-worker:v2-async-fix` tag created and pushed
- [x] **New template created** - `ejuyp43ar5` with fixed image
- [x] **New endpoint created** - `6rg1i2nzxxugti` (vibeboard-gpu-v2) using NVIDIA A40 GPU
- [ ] **Health check test** - Job `38ca3160-c457-42f6-a454-3c0c7eb858dd-u1` in queue, waiting for worker spin-up
- [ ] **End-to-end video generation test** - Pending health check success

### Key Changes Made

1. **runpod_handler.py line 131-142**: Simplified async wrapper to use `asyncio.run()` directly
2. **backend/.env**: Updated `RUNPOD_ENDPOINT_ID=6rg1i2nzxxugti`
3. **Deleted old endpoint**: `1587hs61irln2j` was stuck with cached old image

### RunPod Configuration

- **New Endpoint**: `6rg1i2nzxxugti` (vibeboard-gpu-v2)
- **Template**: `ejuyp43ar5` (vibeboard-gpu-worker-v2)
- **Docker Image**: `mattydc/vibeboard-gpu-worker:v2-async-fix`
- **GPU**: NVIDIA A40 (48GB VRAM)
- **Idle Timeout**: 30 seconds
- **Max Workers**: 1

### Legacy Endpoints (Do Not Use)

- `2sziwt3f5gzsob` - Old vibeboard-gpu-l40 with outdated image
- `1587hs61irln2j` - DELETED (was stuck with cached container)

## Quick Reference

- RunPod API Key: **stored in backend/.env** (RUNPOD_API_KEY)
- Current RunPod Endpoint: `6rg1i2nzxxugti`
- GPU Worker Mode: `runpod` (set in .env)

---

# Training Module Audit & Fixes

- [x] Locate and analyze existing training module code <!-- id: 0 -->
  - [x] Backend controllers and routes (`trainingController.ts`, `trainingRoutes.ts`) <!-- id: 1 -->
  - [x] Frontend pages (e.g., `train/page.tsx`) <!-- id: 2 -->
  - [x] Service adapters (Fal.ai training integration) <!-- id: 3 -->
- [x] Perform Code Audit <!-- id: 4 -->
  - [x] Check API endpoint completeness and correctness <!-- id: 5 -->
  - [x] Verify Fal.ai training configuration (zip upload, trigger words, parameters) <!-- id: 6 -->
  - [x] Assessment of UI usability and completeness <!-- id: 7 -->
- [x] Create Implementation Plan for fixes <!-- id: 8 -->
- [/] Execute Fixes <!-- id: 9 -->
  - [x] Verify `fal.storage.upload` capability <!-- id: 10 -->
  - [x] Fix `FalTrainingService.ts` parameter mapping <!-- id: 11 -->
  - [x] Fix `trainingController.ts` file handling <!-- id: 12 -->
  - [x] Fix `trainingRoutes.ts` temp directory <!-- id: 13 -->
- [x] Fix Server Routes <!-- id: 14 -->
  - [x] Locate replacement for `storyboard.routes.ts` (Recreated) <!-- id: 15 -->
  - [x] Update `server.ts` imports <!-- id: 16 -->
- [x] Restore Missing Files from Backup <!-- id: 18 -->
  - [x] Check `/Users/matthenrichmacbook/Downloads/Claude Downloads` (Files not compatible/found) <!-- id: 19 -->
  - [x] Restore missing controllers (Skipped - logic missing in backup) <!-- id: 20 -->
  - [x] Re-enable routes and verify build (Skipped - kept disabled) <!-- id: 21 -->
- [x] Archive Outdated Files <!-- id: 22 -->
  - [x] Create `Archived_Old_Code` in Downloads <!-- id: 23 -->
  - [x] Move outdated `.ts` files to archive <!-- id: 24 -->
- [x] Implement Training Job Deletion <!-- id: 25 -->
  - [x] Update `trainingController.ts` with delete logic <!-- id: 26 -->
  - [x] Update `trainingRoutes.ts` with delete endpoint <!-- id: 27 -->
  - [x] Update `page.tsx` with delete UI <!-- id: 28 -->
  - [x] Verify deletion <!-- id: 29 -->
- [x] Implement Replicate Training <!-- id: 30 -->
  - [x] Check dependencies (`replicate` SDK) <!-- id: 31 -->
  - [x] Create `ReplicateTrainingService.ts` <!-- id: 32 -->
  - [x] Update `trainingController.ts` to support multiple providers <!-- id: 33 -->
  - [x] Update `trainingController.ts` to support multiple providers <!-- id: 33 -->
  - [x] Update frontend to select provider <!-- id: 34 -->
- [x] Dynamic Modal Width Adjustment <!-- id: 35 -->
  - [x] Calculate dynamic width in `StyleSelectorModal` <!-- id: 36 -->
  - [x] Integrate Negative Prompt Catalog into Prompt Builder (frontend) <!-- id: 4 -->
    - [x] Add Negative Prompt UI to PromptBuilder.tsx
    - [x] Connect NegativePromptManager
    - [x] Verify persistence and enhancement flow <!-- id: 37 -->
  - [x] Verify consistent sizing <!-- id: 38 -->

- [x] Backend Security Remediation <!-- id: 56 -->
  - [x] SEC-004: Fix Cross-Tenant Data Access in `generationController.ts` <!-- id: 57 -->
  - [x] SEC-005: Fix Mass Assignment Vulnerability in `generationController.ts` <!-- id: 58 -->

- [x] **Wan Video Integration**
  - [x] Create backend adapter (`WanVideoAdapter.ts`)
  - [x] Update `GenerationService.ts` to route Wan models
  - [x] Update frontend `EngineSelector`
  - [x] Update `GeneratePage` UI for dual inputs (Video + Image) <!-- id: 62 -->
  - [x] Add Batch Save to Elements <!-- id: 63 -->

- [x] **Dataset Preparation Feature** <!-- id: 64 -->
  - [x] Create `DatasetService.ts` (Backend Pipeline) <!-- id: 65 -->
  - [x] Update `ReplicateAdapter.ts` (Face Parsing) <!-- id: 66 -->
  - [x] Update `FalAIAdapter.ts` (Auto-Captioning) <!-- id: 67 -->
  - [x] Update `LoRAManager.tsx` (Frontend UI) <!-- id: 68 -->
  - [x] Verify Pipeline (End-to-End) <!-- id: 69 -->

- [x] **Face Identity Matching** <!-- id: 70 -->
  - [x] Add "Reference Folder" upload to `LoRAManager.tsx` <!-- id: 71 -->
  - [x] Update `DatasetService.ts` to handle reference images <!-- id: 72 -->
  - [x] Implement `getFaceEmbeddings` in `ReplicateAdapter.ts` <!-- id: 73 -->
  - [x] Implement Face Matching Logic (Cosine Similarity) <!-- id: 74 -->
  - [x] Audit Remediation (Security & UX) <!-- id: 49 -->
- [x] **Video Support & Smart Curation** <!-- id: 80 -->
  - [x] Implement `extractFramesFromVideo` (ffmpeg) <!-- id: 82 -->
  - [x] Implement `analyzeCandidate` (Score Face & Quality) <!-- id: 84 -->
  - [x] Implement `curateDataset` (Select Top N) <!-- id: 85 -->
  - [x] Update `datasetController` for Batch Processing <!-- id: 83 -->
  - [x] Fix XSS in `GenerationCard.tsx` (Blob URL) <!-- id: 52 -->
  - [x] **UI Integration & Training Enhancements** <!-- id: 90 -->
  - [x] Update `FalTrainingService` to support Fast/Dev models <!-- id: 91 -->
  - [x] Update `trainingController` to handle Base Model & Curation <!-- id: 92 -->
  - [x] Update `TrainingPage` with Smart Curation & Base Model UI <!-- id: 93 -->
  - [x] Process Reference Images & Dataset in `startJob` <!-- id: 94 -->

- [x] Smart Prompt Builder Fixes <!-- id: 54 -->
  - [x] Fix Missing Negative Prompts (`customNegativePrompt`) <!-- id: 55 -->

- [x] **Cinematic Tags System** <!-- id: 200 -->
  - [x] Create `CinematicTags.ts` data file with 7 categories, ~150 tags <!-- id: 201 -->
    - Cameras (18): ARRI Alexa, RED, Blackmagic, Sony Venice, etc.
    - Lenses (15): Anamorphic, Prime, Vintage, Macro, etc.
    - Film Stock (18): Kodak Portra, Fuji Pro, Kodachrome, etc.
    - Color Grade (20): Teal & Orange, Blade Runner, Matrix, etc.
    - Lighting (23): Golden Hour, Noir, Neon, Rembrandt, etc.
    - Motion (20): Dolly, Crane, Steadicam, Dutch Angle, etc.
    - Mood (18): Dreamlike, Gritty, Ethereal, Melancholic, etc.
  - [x] Create `CinematicTagsModal.tsx` component <!-- id: 202 -->
    - Category pills navigation
    - Search functionality with real-time filtering
    - Subcategory sidebar when category selected
    - Embedded mode (w-[500px] h-[90vh]) for side panel
    - Overlay mode for standalone use
  - [x] Update `StyleSelectorModal.tsx` integration <!-- id: 203 -->
    - Add 'tags' to activeManager state type
    - Single "Add Cinematic Tags" button (condensed from 7)
    - Move Cinematic Inspiration textarea below button
    - Tags panel in AnimatePresence side panels
  - [x] Add separate Sampler & Scheduler accordion section <!-- id: 204 -->
  - [x] Update `ShotStyleEditorModal.tsx` with quick tag access <!-- id: 205 -->
  - [x] Add Phones & Consumer subcategory to Cameras <!-- id: 206 -->
    - iPhone 17 Pro (4K 120fps, Apple Log 2, 8x optical zoom)
    - iPhone 16 Pro (ProRes Log, 5x telephoto)
    - Samsung Galaxy S25 Ultra (8K, Galaxy Log, 10x optical)
    - Google Pixel 10 Pro (Tensor G5, 100x Super Res Zoom)
    - Disposable Camera, Polaroid, Webcam, CCTV
  - [x] Add Social Media Filters subcategory to Color Grades <!-- id: 207 -->
    - Instagram (Valencia, Clarendon, Juno)
    - TikTok Beauty, VSCO (A6, C1)
    - Snapchat Vivid, Beauty Mode

---

# Next Projects - Story Editor & Camera System (Dec 2025)

Based on competitive analysis against 13 market competitors (COMP-001 in agent_resolutions.json)

## Phase 1: Camera Preset Library (HIGH PRIORITY) ✅ COMPLETE

**Gap**: Higgsfield has 50+ camera presets, VibeBoard has 6 angles + 8 motions

- [x] **Expand Camera Presets to 50+** <!-- id: 100 -->
  - [x] Create `CAMERA_PRESETS` constant with 10 categories <!-- id: 101 -->
    - Zoom (8): Zoom In/Out, Crash Zoom, Dolly Zoom, YoYo
    - Dolly (7): In/Out/Left/Right, Super Dolly, Double Dolly
    - Crane (5): Up/Down, Over, Jib Up/Down
    - Pan/Tilt (5): Pan Left/Right, Tilt Up/Down, Whip Pan
    - Orbital (5): 360 Orbit, Arc Left/Right, Lazy Susan, 3D Rotation
    - Specialty (8): Bullet Time, Snorricam, Dutch Angle, Fisheye, FPV Drone, Through Object, Rack Focus, Low Shutter
    - Vehicle (5): Car Chase, Car Interior, Buckle Up, Road Rush, Hero Cam
    - Character (5): Eyes In, Hero Shot, Head Track, Glam Shot, Over Shoulder
    - Handheld (4): Handheld, Steadicam, Gimbal, Shaky Intense
    - Static (3): Static, Overhead, Worm's Eye
    - Timelapse (4): Hyperlapse, Sky, City, YoYo Zoom
  - [x] Update `ShotActionsPanel.tsx` with preset grid <!-- id: 102 -->
  - [x] Update `CreateStyleModal.tsx` ADVANCED_OPTIONS.cameraMotions <!-- id: 103 -->
  - [x] Create `CameraPresetSelector.tsx` component <!-- id: 104 -->
  - [x] Add preset mixing (combine 2+ moves like Higgsfield Mix) <!-- id: 105 -->

**Result**: 54 camera presets across 10 categories with genre-aware recommendations and mixing mode

## Phase 2: Genre-Aware Shot Templates (HIGH PRIORITY) ✅ COMPLETE

**Gap**: No competitor has genre-aware camera recommendations

- [x] **Create Genre Template System** <!-- id: 110 -->
  - [x] Create `GenreTemplates.ts` with 13 genres <!-- id: 111 -->
    - Film Noir: Low key, dutch angles, dolly zoom, static
    - Action: Bullet time, crash zoom, FPV drone, car chase
    - Horror: Snorricam, dolly zoom, crane down, static
    - Romance: Arc orbits, dolly in, crane up, glam
    - Documentary: Handheld, static, hyperlapse, steadicam
    - Sci-Fi: Through object, bullet time, FPV drone
    - Comedy, Thriller, Drama, Music Video, Commercial, Western, Fantasy
  - [x] Each genre has: recommendedMoves, avoidedMoves, defaultStyle, commonShots, styleNotes <!-- id: 112 -->
  - [x] Create `GenreSelector.tsx` component (with GenreBadge, GenrePills variants) <!-- id: 113 -->
  - [x] Integrate genre awareness into shot suggestions <!-- id: 114 -->

**Result**: 13 complete genre templates with full camera preset integration and backend LLM support

## Phase 3: Story Editor - Script-to-Storyboard (HIGH PRIORITY) ✅ COMPLETE

**Gap**: LTX Studio and InVideo have automated script-to-storyboard

- [x] **Build Story Editor Pipeline** <!-- id: 120 -->
  - [x] Create `StoryEditorService.ts` backend service <!-- id: 121 -->
  - [x] Implement script parsing with LLM (Save The Cat beat structure) <!-- id: 122 -->
  - [x] Map script to scenes automatically <!-- id: 123 -->
  - [x] Generate shots for each scene with genre-appropriate cameras <!-- id: 124 -->
  - [x] Map emotional beats (tension, release, climax) to shot types <!-- id: 125 -->
  - [x] Create `StoryEditorPage.tsx` frontend (with 6-stage pipeline visualization) <!-- id: 126 -->
  - [x] Add "AI Director" mode for full automation (AIDirectorConfig interface) <!-- id: 127 -->

**Result**: Full concept→outline→script→breakdown→prompts pipeline with 7 API endpoints, streaming support, and genre-aware LLM integration

## Phase 4: Video Duration Extension (HIGH PRIORITY) ✅ COMPLETE

**Gap**: Kling.ai offers 2-minute videos, VibeBoard max is 10s

- [x] **Implement Video Extension Chaining** <!-- id: 130 -->
  - [x] Auto-extract last frame from video (FrameExtractor.ts with extractLastFrameForContinuity) <!-- id: 131 -->
  - [x] Chain clips for longer sequences <!-- id: 132 -->
  - [x] Add Extend Video workflow at `/projects/[id]/extend` (Quick + Advanced modes) <!-- id: 133 -->
  - [x] Stitch extended videos with ffmpeg (VideoStitcher.ts with concat demuxer) <!-- id: 134 -->

**Result**: Full video extension with FrameExtractor, VideoStitcher, dedicated UI workflow, and `extend_video` generation mode. No 10-second limit.

## Phase 5: UX Simplification (HIGH PRIORITY) ✅ COMPLETE

**Gap**: InVideo/Leonardo have better onboarding than VibeBoard

- [x] **Guided vs Expert Mode** <!-- id: 140 -->
  - [x] Create Quick Mode vs Advanced Mode toggle in extend workflow <!-- id: 141 -->
  - [x] Add Quick Start templates (workflowTemplates.ts: Product Commercial, Cinematic Trailer, Social Media Short, Character Portrait) <!-- id: 142 -->
  - [x] Implement progressive disclosure of advanced features (showAdvanced toggles in MagicEraserPanel, PromptWizardModal) <!-- id: 143 -->
  - [x] Add 4-step PromptWizard with guided flow <!-- id: 144 -->

**Result**: Quick/Advanced mode toggle, 4-step wizard, workflow templates, progressive disclosure. Minor gap: contextual tooltips are inline text only (no rich tooltip system).

## Phase 6: Community Features (MEDIUM PRIORITY) ✅ COMPLETE

**Gap**: Civitai dominates LoRA/prompt sharing

- [x] **LoRA & Prompt Gallery** <!-- id: 150 -->
  - [x] Browse community LoRAs (`CivitaiBrowser.tsx` - search, filter, paginate Civitai) <!-- id: 151 -->
  - [x] One-click Civitai import (`loraController.ts` - `addToGlobalLibrary` + `civitai-metadata` endpoint) <!-- id: 152 -->
  - [x] Save/share favorite prompts (`PromptTreeStore.ts` + `PromptTreePanel.tsx` - version control with labels) <!-- id: 153 -->
  - [x] Workflow template library (`TemplateGalleryModal.tsx` + `templateRoutes.ts` + `libraryRoutes.ts`) <!-- id: 154 -->

**Implementation Notes (Dec 27, 2025)**:

- Civitai Browser: Full modal with search, type filter (LoRA/Checkpoint/Embedding), base model filter, sort options
- Global Library: `GlobalLibraryPanel.tsx` shows all global items with install-to-project functionality
- Prompt Tree: Project-scoped version control with branching, labels, and lineage visualization
- Templates: Database-backed with public/private visibility, CRUD operations

## Phase 7: Team Collaboration (MEDIUM PRIORITY)

**Gap**: LTX Studio has team workspaces ($125/mo Pro)

- [ ] **Team Workspaces** <!-- id: 160 -->
  - [ ] Shared projects with permissions <!-- id: 161 -->
  - [ ] Asset libraries <!-- id: 162 -->
  - [ ] Version control <!-- id: 163 -->

---

## VibeBoard Competitive Advantages (MAINTAIN)

These are areas where VibeBoard already leads:

- ✅ Model variety: 70+ image, 40+ video (10x more than competitors)
- ✅ Multi-provider orchestration (unique - no competitor has this)
- ✅ Local-first with ComfyUI (zero cost option)
- ✅ Smart dataset curation with face matching (unique)
- ✅ Cost transparency with provider comparison (unique)
- ✅ Storyboarding workflow (only LTX comes close)
- ✅ Character Foundry - single image to full training dataset (unique)

---

# Character Foundry - Synthetic Dataset Generation (Dec 2025)

- [x] **Core Implementation** <!-- id: 300 -->
  - [x] Create `DatasetGeneratorService.ts` with Flux 2 Max integration <!-- id: 301 -->
  - [x] Implement pose variation generation (20 poses per character) <!-- id: 302 -->
  - [x] Add auto-captioning via vision LLM <!-- id: 303 -->
  - [x] Integrate with `trainingController.ts` <!-- id: 304 -->

- [x] **Direction & Framing Fixes** <!-- id: 305 -->
  - [x] Fix left/right confusion - use frame-relative language <!-- id: 306 -->
  - [x] Fix medium shot rendering as full body - add explicit cropping language <!-- id: 307 -->
  - [x] Implement dynamic aspect ratios (1:1, 3:4, 9:16) based on shot type <!-- id: 308 -->

- [x] **Pose Preset System** <!-- id: 310 -->
  - [x] Create 7 pose presets (universal, swimwear, casual, formal, fantasy, anime, cartoon) <!-- id: 311 -->
  - [x] Add style prefixes for anime/cartoon presets <!-- id: 312 -->
  - [x] Create `GET /api/training/pose-presets` endpoint <!-- id: 313 -->
  - [x] Add preset dropdown to Character Foundry UI <!-- id: 314 -->
  - [x] Pass preset to backend generation <!-- id: 315 -->

- [x] **UI Integration** <!-- id: 320 -->
  - [x] Update `train/page.tsx` with Character Foundry mode <!-- id: 321 -->
  - [x] Add dataset review panel for generated images <!-- id: 322 -->
  - [x] Add delete button for individual dataset images <!-- id: 323 -->
  - [x] Support external editing (Photoshop) before training <!-- id: 324 -->

### Models Tested

| Model                               | Result          | Notes                                   |
| ----------------------------------- | --------------- | --------------------------------------- |
| Kling O1                            | ❌ Inconsistent | Character details changed between poses |
| Replicate fofr/consistent-character | ❌ Style drift  | Mixed Pixar/realistic styles            |
| Flux 2 Max (fal-ai/flux-2-max/edit) | ✅ Selected     | Best consistency + pose variety         |
| GPT Image 1.5                       | ✅ Good         | Alternative option, slower              |

### Key Technical Decisions

1. **Flux 2 Max over Kling O1**: Better character consistency with reference image
2. **Frame-relative directions**: "nose pointing toward left edge of frame" vs "facing left"
3. **Explicit cropping language**: "no legs visible", "cropped at chest" to force framing
4. **Dynamic aspect ratios**: Match aspect ratio to shot type for better results
5. **Clothing-aware presets**: Avoid impossible poses (no pockets in swimwear)

---

# Script Library & Genre Style System (Dec 2025)

## Phase 1: Script Library Organization ✅ COMPLETE

- [x] **Create Script Library Folder Structure** <!-- id: 400 -->
  - [x] Create main folder at `/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/Script Library/` <!-- id: 401 -->
  - [x] Create 16 genre subfolders (Action, Animation, Comedy, etc.) <!-- id: 402 -->
  - [x] Organize existing scripts from Movie Scripts folder <!-- id: 403 -->
  - [x] Create `_analyses` cache folder <!-- id: 404 -->

## Phase 2: Style Guide System ✅ COMPLETE

- [x] **Create GenreStyleGuide.ts** <!-- id: 410 -->
  - [x] Pixar 22 Rules of Storytelling with application guidance <!-- id: 411 -->
  - [x] 12 Director Visual Styles with prompt prefixes <!-- id: 412 -->
  - [x] 5 Cinematographer Styles <!-- id: 413 -->
  - [x] 14 Genre Guides with conventions, tropes, archetypes <!-- id: 414 -->

- [x] **Create ScriptAnalyzer.ts** <!-- id: 420 -->
  - [x] Script analysis for voice, patterns, structure extraction <!-- id: 421 -->
  - [x] Story outline generation with style combination <!-- id: 422 -->
  - [x] Scene prompt generation (First Frame, Last Frame, Video) <!-- id: 423 -->

## Phase 3: API Endpoints ✅ COMPLETE

- [x] **Create storyStyleRoutes.ts** <!-- id: 430 -->
  - [x] GET /api/story-style/genres <!-- id: 431 -->
  - [x] GET /api/story-style/directors <!-- id: 432 -->
  - [x] GET /api/story-style/cinematographers <!-- id: 433 -->
  - [x] GET /api/story-style/pixar-rules <!-- id: 434 -->
  - [x] POST /api/story-style/build-prefix <!-- id: 435 -->
  - [x] GET /api/story-style/scripts <!-- id: 436 -->
  - [x] POST /api/story-style/scripts/analyze <!-- id: 437 -->
  - [x] POST /api/story-style/generate-outline <!-- id: 438 -->
  - [x] POST /api/story-style/generate-scene-prompts <!-- id: 439 -->

## Phase 4: Story Editor Integration ✅ TESTED

- [x] **Full Pipeline Test** <!-- id: 450 -->
  - [x] Generate outline from concept (Tide Whisperer) <!-- id: 451 -->
  - [x] Generate screenplay from outline <!-- id: 452 -->
  - [x] Parse screenplay into 18 scenes <!-- id: 453 -->
  - [x] Breakdown scenes into shots with camera presets <!-- id: 454 -->
  - [x] Generate First Frame, Last Frame, Video prompts <!-- id: 455 -->

### Technical Results

- 3 Acts, 14 story beats following Pixar structure
- 18 scenes with full breakdowns
- Shot-level prompts with Hayao Miyazaki/Studio Ghibli style
- Director style injection via `promptPrefix`
- Negative prompts for artifact prevention

---

# Bug Fixes (Dec 2025)

## Video Generation Fix ✅ COMPLETE (Dec 24, 2025)

- [x] **Model ID Mapping for Fal.ai** <!-- id: 500 -->
  - [x] Add modelEndpointMap to WanVideoAdapter.ts <!-- id: 501 -->
  - [x] Map `fal-ai/wan-2.1-t2v-1.3b` → `fal-ai/wan-t2v` <!-- id: 502 -->
  - [x] Map `fal-ai/wan-2.1-i2v-14b` → `fal-ai/wan/v2.2-a14b/image-to-video` <!-- id: 503 -->
  - [x] Fix num_frames parameter (81-100 range required) <!-- id: 504 -->
  - [x] Add detailed error body logging <!-- id: 505 -->
  - [x] Add matching mapping to FalAIAdapter.ts <!-- id: 506 -->

### Test Result

```
✓ wan succeeded
Generation 137bc2f1-314d-4ffc-ba66-0f745483272e completed.
```

## Story Editor Fixes ✅ COMPLETE (Dec 24, 2025)

- [x] **Storyboard Export** <!-- id: 510 -->
  - [x] Auto-save story before exporting <!-- id: 511 -->
  - [x] Use scene-chains/segments API instead of scenes/shots <!-- id: 512 -->
  - [x] Auto-navigate to storyboard page after export <!-- id: 513 -->
  - [x] Add element loading console logging <!-- id: 514 -->

---

# Filmmaker's Toolbox - Batch Features (Dec 25, 2025)

## Batch #3 - Quick Wins ✅ COMPLETE

- [x] **Fork Recipe Button** <!-- id: 600 -->
  - [x] Metadata inspection overlay on GenerationCard <!-- id: 601 -->
  - [x] Copy prompt, model, settings to current generation form <!-- id: 602 -->

- [x] **Hover-Scrub Video Thumbnails** <!-- id: 610 -->
  - [x] Video playback on hover in gallery <!-- id: 611 -->
  - [x] Muted autoplay with smooth transitions <!-- id: 612 -->

- [x] **Proxy Placeholder System** <!-- id: 620 -->
  - [x] Shimmer loading states for slow generations <!-- id: 621 -->
  - [x] Spinner overlay with status badge <!-- id: 622 -->

- [x] **Prompt Variables ($MainLook syntax)** <!-- id: 630 -->
  - [x] Create promptVariableStore.ts with Zustand persist <!-- id: 631 -->
  - [x] Create PromptVariablePanel.tsx UI component <!-- id: 632 -->
  - [x] Integrate $Variable expansion in handleGenerate <!-- id: 633 -->

- [x] **Lighting Lock (IP-Adapter)** <!-- id: 640 -->
  - [x] Create lightingLockStore.ts <!-- id: 641 -->
  - [x] Create LightingLockPanel.tsx UI component <!-- id: 642 -->
  - [x] Integrate lighting reference with IP-Adapter <!-- id: 643 -->

## Batch #4 - Technical Director's Suite ✅ COMPLETE

- [x] **Focal Length Lens Kit** <!-- id: 700 -->
  - [x] Create LensPresets.ts with 7 presets (14mm-135mm) <!-- id: 701 -->
  - [x] Create LensKitSelector.tsx with visual slider <!-- id: 702 -->
  - [x] Add prompt modifier injection based on lens selection <!-- id: 703 -->
  - [x] Add 4 lens effects (bokeh, flare, vignette, distortion) <!-- id: 704 -->

- [x] **Prop Bin (#PropName syntax)** <!-- id: 710 -->
  - [x] Create propBinStore.ts with CRUD and expansion <!-- id: 711 -->
  - [x] Create PropBinPanel.tsx with search/filter <!-- id: 712 -->
  - [x] 9 prop categories (vehicle, weapon, clothing, etc.) <!-- id: 713 -->
  - [x] Integrate #PropName expansion in handleGenerate <!-- id: 714 -->

- [x] **Prompt Tree (Version Control)** <!-- id: 720 -->
  - [x] Create promptTreeStore.ts with git-like branching <!-- id: 721 -->
  - [x] Create PromptTreePanel.tsx with tree visualization <!-- id: 722 -->
  - [x] Lineage breadcrumb for active path <!-- id: 723 -->
  - [x] Auto-save prompts when generating <!-- id: 724 -->
  - [x] Load any previous prompt as starting point <!-- id: 725 -->

## Batch #5 - Executive Producer & Master Cinematographer Suite

### 1. The "Continuity Person" (Visual Heatmaps) ✅ COMPLETE <!-- id: 800 -->

_In real production, the Script Supervisor ensures visual consistency. In AI, "drift" is the enemy._

- [x] **Consistency Heatmap (Delta View)** <!-- id: 801 -->
  - [x] Add "Continuity Check" toggle in Shot Navigator <!-- id: 802 -->
  - [x] Implement Grok Vision comparison (alternative to CLIP) <!-- id: 803 -->
  - [x] Visual heatmap highlighting drift areas with severity colors <!-- id: 804 -->
  - [x] Compare @Image reference against current shot <!-- id: 805 -->
  - [x] Show specific drift details with descriptions <!-- id: 806 -->

**Implementation Notes:**

- Backend: `ContinuityService.ts` uses Grok Vision for AI-powered comparison
- Backend: `continuityRoutes.ts` with `/api/continuity/check` endpoint
- Frontend: `ContinuityHeatmap.tsx` with side-by-side comparison and drift overlays
- Frontend: `ShotNavigator.tsx` with toggle and per-shot check buttons
- Metrics: Color, Shape, Texture, Character consistency scores (0-1)
- Drift regions with normalized coordinates and severity levels (low/medium/high)

### 2. The "Virtual Gaffer" (3-Point Lighting Layout) ✅ COMPLETE <!-- id: 810 -->

_Pros want to design light, not just copy it._

- [x] **Interactive Light Map** <!-- id: 811 -->
  - [x] Top-down 2D "stage" widget next to prompt bar <!-- id: 812 -->
  - [x] Placeable light sources: Key, Fill, Backlight <!-- id: 813 -->
  - [x] Generate lighting prompt string (e.g., "rim lighting from back-left") <!-- id: 815 -->
  - [x] Color Temperature (Kelvin) setting per light source <!-- id: 816 -->
  - [x] Inverse Gaffing - analyze reference images to auto-place lights <!-- id: 817 -->
  - [x] Flip Map button for horizontal mirroring <!-- id: 818 -->

**Implementation Files:**

- Backend: `LightingAnalysisService.ts` with Grok Vision integration
- Frontend: `LightingStage.tsx` with draggable lights and gel colors
- Frontend: `LightingPreview3D.tsx` for visual preview

### 3. Neural Foley & Lens-Aware Audio ✅ COMPLETE <!-- id: 820 -->

_Pro audio is Spatial - match audio to visual focal length._

- [x] **Acoustic Mapping** <!-- id: 821 -->
  - [x] Use Lens Kit metadata to drive audio engine <!-- id: 822 -->
  - [x] 14mm Ultra Wide: High reverb, environmental atmos (wind, city hum) <!-- id: 823 -->
  - [x] 85mm Tight Close-up: Dry, intimate (enhanced foley, breathing) <!-- id: 824 -->
  - [x] Auto-apply "Sonic Realism" matching focal length <!-- id: 825 -->

**Implementation Files:**

- Backend: `AcousticMappingService.ts` with lens-to-audio mapping
- Frontend: `AcousticStudioPanel.tsx` with perspective-matched audio controls
- Frontend: `AcousticWaveform.tsx` for audio visualization

### 4. The "Set Extension" (Infinite Outpainting) ✅ COMPLETE <!-- id: 830 -->

_Discover the environment - pan 360° to build the entire "Set"._

- [x] **Infinite Canvas (Pan-to-Extend)** <!-- id: 831 -->
  - [x] Drag image in preview to reveal empty space <!-- id: 832 -->
  - [x] Outpaint section on release <!-- id: 833 -->
  - [x] Support 360° environment building <!-- id: 834 -->

**Implementation Files:**

- Backend: `processingController.ts` with outpaint endpoint
- Frontend: `SetExtensionPanel.tsx` with interactive canvas

### 5. Alpha-Channel Exports (VFX Bridge) ✅ COMPLETE <!-- id: 840 -->

_Make VibeBoard a "VFX Asset Generator" for After Effects integration._

- [x] **Background Transparency Toggle** <!-- id: 841 -->
  - [x] Use SAM 2/3 (Magic Mask) for alpha video generation <!-- id: 842 -->
  - [x] "Export with Alpha" checkbox in download settings <!-- id: 843 -->
  - [x] Black-and-white alpha video for every render <!-- id: 844 -->
  - [x] PNG sequence export with transparency <!-- id: 845 -->

**Implementation Files:**

- Backend: `alphaChannelRoutes.ts` with alpha export endpoints

### 6. The "Director's Dashboard" (Production Health) ✅ COMPLETE <!-- id: 850 -->

_High-level view for big projects._

- [x] **Continuity & Budget Monitor** <!-- id: 851 -->
  - [x] Style Drift graph (project "Look" consistency over time) <!-- id: 852 -->
  - [x] Asset Usage tracking (#Key, @Turtle_2 appearances) <!-- id: 853 -->
  - [x] Real-Time Spending dashboard (Fal/Replicate/OpenAI costs) <!-- id: 854 -->
  - [x] Project health summary widget <!-- id: 855 -->

**Implementation Files:**

- Backend: `DirectorDashboardService.ts` with analytics
- Frontend: `StyleDriftGraph.tsx` for consistency tracking
- Frontend: `AssetUsagePanel.tsx` for element tracking

### 7. Semantic Search (Enhanced) ✅ COMPLETE <!-- id: 860 -->

_Gallery becomes a searchable Database._

- [x] **Vision-Powered Search** <!-- id: 861 -->
  - [x] Auto-generate "Technical Description" on image creation <!-- id: 862 -->
  - [x] Use Grok Vision for cinematic terminology extraction <!-- id: 863 -->
  - [x] Natural language queries ("Turtle looking left") <!-- id: 864 -->
  - [x] Find Similar buttons (Composition, Lighting) <!-- id: 865 -->

**Implementation Files:**

- Backend: `SemanticIndexService.ts` with Grok Vision indexing
- Backend: `VectorEmbeddingService.ts` for similarity search
- Backend: `searchRoutes.ts` with query, suggestions, similar endpoints
- Frontend: `GenerationSearch.tsx` with Reality/Intent/Both modes
- Frontend: `GenerationCard.tsx` with Find Similar buttons

### 8. Multi-Pass Workflow <!-- id: 870 --> ✅ COMPLETE

_Quality improvement pipeline._

- [x] **Block-In → Upscale → Enhance** <!-- id: 871 -->
  - [x] Define quality stages pipeline <!-- id: 872 -->
  - [x] Auto-progression through stages <!-- id: 873 -->
  - [x] Manual override at each stage <!-- id: 874 -->

---

## Batch #6 - Multi-Pass Render Queue (Dec 25, 2025)

### 1. Multi-Pass Render Queue ✅ COMPLETE <!-- id: 900 -->

_Draft → Review → Master workflow with seed inheritance for visual consistency._

- [x] **RenderQueueTypes.ts** - Type definitions <!-- id: 901 -->
  - [x] ShotRecipe interface (locked creative settings) <!-- id: 902 -->
  - [x] RenderPass interface (seed inheritance, parent-child mapping) <!-- id: 903 -->
  - [x] ShotVersionStack interface (UI version display) <!-- id: 904 -->
  - [x] Quality presets (draft/review/master with model + cost mappings) <!-- id: 905 -->

- [x] **RenderQueueService.ts** - Core service <!-- id: 910 -->
  - [x] createRenderJob() - Create passes for scene chain segments <!-- id: 911 -->
  - [x] startJob() / processQueue() - Queue management <!-- id: 912 -->
  - [x] promoteShot() - Upgrade with seed inheritance <!-- id: 913 -->
  - [x] getVersionStack() / getAllVersionStacks() <!-- id: 914 -->
  - [x] getCostComparison() - Savings calculation <!-- id: 915 -->

- [x] **renderQueueRoutes.ts** - API endpoints <!-- id: 920 -->
  - [x] GET /version-stacks <!-- id: 921 -->
  - [x] POST /shots/:shotId/promote <!-- id: 922 -->

- [x] **RenderQueuePanel.tsx** - UI <!-- id: 930 -->
  - [x] Version stacking display (D/R/M badges) <!-- id: 931 -->
  - [x] handlePromoteShot() with loading state <!-- id: 932 -->
  - [x] Cost comparison display <!-- id: 933 -->

### 2. Semantic Search (Visual Librarian) ✅ COMPLETE <!-- id: 950 -->

_Gallery becomes a searchable database with professional cinematic terminology._

- [x] **SemanticIndexService.ts** <!-- id: 951 -->
  - [x] Grok Vision cinematic extraction (framing, lighting, lens, composition) <!-- id: 952 -->
  - [x] indexStatus tracking (pending/indexed/failed/skipped) <!-- id: 953 -->
  - [x] shouldIndex() to prevent double-spending API credits <!-- id: 954 -->

- [x] **Auto-Tagging on Generation** <!-- id: 960 -->
  - [x] CINEMATIC_EXTRACTION_PROMPT with DP terminology <!-- id: 961 -->
  - [x] Store visualDescription JSON with generation record <!-- id: 962 -->

- [x] **Search UI** <!-- id: 970 -->
  - [x] Natural language search bar with Reality/Intent/Both modes <!-- id: 971 -->
  - [x] "Find Similar Composition" and "Find Similar Lighting" buttons <!-- id: 972 -->
  - [x] Smart suggestion pills with category coloring <!-- id: 973 -->
  - [x] Index stats dropdown with progress bar <!-- id: 974 -->

---

## Strategic Notes (from Batch #5 planning)

### Director's Timeline Strategy

> Don't build Premiere Pro. Build a "Non-Linear Storyboard."
> Focus on "Rhythm" - let users set shot durations (3s, 5s, 8s) and see total "Story Length" instantly.

### Semantic Search Priority

> This is the next big win. As images generate, send to low-cost Vision model for "Technical Description."
> Gallery becomes a searchable database for pros.

---

# Pro Trajectory Engine - Phase 1 (Dec 27, 2025) ✅ COMPLETE

## Core Implementation

- [x] **Backend Tracking Services** <!-- id: 1000 -->
  - [x] Create `PointTrackingService.ts` with CoTracker3 integration <!-- id: 1001 -->
  - [x] Implement `trackGridPoints()` for automatic dense sampling <!-- id: 1002 -->
  - [x] Implement `trackPoints()` for user-defined points <!-- id: 1003 -->
  - [x] Implement `trackPlanarSurface()` for 4-corner tracking <!-- id: 1004 -->
  - [x] Implement DLT homography calculation <!-- id: 1005 -->

- [x] **Backend Compositor Service** <!-- id: 1010 -->
  - [x] Create `PropCompositorService.ts` with FFmpeg integration <!-- id: 1011 -->
  - [x] Implement frame extraction with FFmpeg <!-- id: 1012 -->
  - [x] Implement canvas compositing with affine transforms <!-- id: 1013 -->
  - [x] Implement triangulation for perspective warping <!-- id: 1014 -->
  - [x] Implement video reassembly with audio preservation <!-- id: 1015 -->

- [x] **API Endpoints** <!-- id: 1020 -->
  - [x] Create `trackingRoutes.ts` <!-- id: 1021 -->
  - [x] POST /api/tracking/grid <!-- id: 1022 -->
  - [x] POST /api/tracking/points <!-- id: 1023 -->
  - [x] POST /api/tracking/planar <!-- id: 1024 -->
  - [x] POST /api/tracking/homography <!-- id: 1025 -->
  - [x] POST /api/tracking/composite <!-- id: 1026 -->
  - [x] POST /api/tracking/preview-frame <!-- id: 1027 -->

- [x] **Frontend Tracker Tool** <!-- id: 1030 -->
  - [x] Create `TrackerTool.tsx` component <!-- id: 1031 -->
  - [x] Implement OpenCV.js dynamic loading <!-- id: 1032 -->
  - [x] Implement 4-point corner selection UI <!-- id: 1033 -->
  - [x] Implement real-time perspective preview <!-- id: 1034 -->
  - [x] Implement tracking data JSON export <!-- id: 1035 -->

## Bug Fixes (Dec 27, 2025) ✅ COMPLETE

- [x] **Hydration Mismatch Fix** <!-- id: 1040 -->
  - [x] Add `hasMounted` state pattern for localStorage stores <!-- id: 1041 -->
  - [x] Fix Prompt Variables button hydration <!-- id: 1042 -->
  - [x] Fix Prop Bin button hydration <!-- id: 1043 -->
  - [x] Fix Prompt Tree button hydration <!-- id: 1044 -->

- [x] **Toolbar Layout Fix** <!-- id: 1050 -->
  - [x] Add `.scrollbar-hide` CSS class <!-- id: 1051 -->
  - [x] Fix Generate button overlap with Model Selector <!-- id: 1052 -->
  - [x] Add border separator between sections <!-- id: 1053 -->

---

# Visual Librarian UI Polish (Dec 27, 2025) ✅ COMPLETE

## GenerationSearch Row Alignment Fix

- [x] **Row 2 Alignment with Search Bar** <!-- id: 1100 -->
  - [x] Add fixed width (`w-[141px]`) to "Generate" title in Row 1 <!-- id: 1101 -->
  - [x] Add invisible spacer (`w-[141px] shrink-0`) in Row 2 <!-- id: 1102 -->
  - [x] Ensure both rows use identical flex structure with `gap-4` <!-- id: 1103 -->
  - [x] Fix "bouncing back" alignment issue from HMR cache <!-- id: 1104 -->

### Technical Implementation

- **File**: `frontend/src/components/generations/GenerationSearch.tsx`
- **Pattern**: Invisible spacer ensures pixel-perfect alignment across rows
- **Calculation**: 141px title + 16px gap = 157px offset for Row 2 content

### User Feedback

> "There we go. It's perfect"

### Remaining (Future Session)

- User noted "we still have a few small tweaks" for another day (unspecified)

---

# Session Summary (Dec 27, 2025) - Performance Optimization & Code Audit Prep

## Performance Optimization ✅ COMPLETE

- [x] **Dynamic Imports for Generate Page** <!-- id: 1200 -->
  - [x] Convert 15 heavy modals to `next/dynamic` imports <!-- id: 1201 -->
  - [x] Components now load on-demand: PromptBuilder, StyleSelectorModal, LightingStage, AcousticStudioPanel, etc. <!-- id: 1202 -->
  - [x] Added loading spinner for PromptBuilder <!-- id: 1203 -->
  - [x] Reduced initial bundle size significantly <!-- id: 1204 -->

- [x] **Next.js Config Optimization** <!-- id: 1210 -->
  - [x] Enable `optimizePackageImports` for lucide-react, framer-motion, dnd-kit, Radix UI, zustand <!-- id: 1211 -->
  - [x] Configure Turbopack (Next.js 16 default) <!-- id: 1212 -->
  - [x] Add image optimization with AVIF/WebP formats <!-- id: 1213 -->
  - [x] Enable compression and on-demand entries <!-- id: 1214 -->

- [x] **Loading States** <!-- id: 1220 -->
  - [x] Create `loading.tsx` for project pages <!-- id: 1221 -->
  - [x] Smooth spinner during page transitions <!-- id: 1222 -->

### User Feedback

> "much better"

## Code Audit Preparation ✅ COMPLETE

- [x] **Generate Repomix Bundle** <!-- id: 1230 -->
  - [x] Created `repomix-output.xml` (9.7 MB, 630 files, 2.3M tokens) <!-- id: 1231 -->
  - [x] Created `repomix-output.txt` (16 MB, plain text format) <!-- id: 1232 -->
  - [x] Excluded: node_modules, dist, .next, uploads, datasets, package-lock.json <!-- id: 1233 -->

### Files Modified

| File                                               | Changes                                                |
| -------------------------------------------------- | ------------------------------------------------------ |
| `frontend/src/app/projects/[id]/generate/page.tsx` | 15 dynamic imports added                               |
| `frontend/next.config.ts`                          | Performance config (turbopack, optimizePackageImports) |
| `frontend/src/app/projects/[id]/loading.tsx`       | NEW - Loading spinner component                        |

### Build Verification

- ✅ Frontend: `npm run build` PASS
- ✅ Backend: `npm run build` PASS
- ✅ Backend: Health check returns `ok`

---

# Director's Viewfinder - DOF Simulator Enhancements (Dec 27, 2025) ✅ COMPLETE

## Phase 1: Optical Engine ✅ COMPLETE

- [x] **Enhanced calculateDOF()** <!-- id: 1300 -->
  - [x] Hyperfocal distance calculation <!-- id: 1301 -->
  - [x] Front/back DOF split percentages <!-- id: 1302 -->
  - [x] Diffraction warning threshold <!-- id: 1303 -->
  - [x] 35mm equivalent focal length <!-- id: 1304 -->
  - [x] Circle of Confusion per sensor size <!-- id: 1305 -->

- [x] **calculateBlurSize() - Physics-accurate blur** <!-- id: 1310 -->
  - [x] Implements: `BlurDiameter = (f²/N) × |s-d| / (s×d)` <!-- id: 1311 -->
  - [x] Converts blur diameter to CSS pixels <!-- id: 1312 -->
  - [x] Accounts for sensor size and viewport width <!-- id: 1313 -->

- [x] **calculateAOV() - Field of View calculator** <!-- id: 1320 -->
  - [x] Implements: `AOV = 2 × arctan(sensor/(2×f))` <!-- id: 1321 -->
  - [x] Returns horizontal, vertical, diagonal angles <!-- id: 1322 -->
  - [x] Lens compression descriptions (ultra-wide to super telephoto) <!-- id: 1323 -->

## Phase 2: Visualizer Engine ✅ COMPLETE

- [x] **DOFLayeredScene Component** <!-- id: 1330 -->
  - [x] 3-layer system: Foreground, Subject, Background <!-- id: 1331 -->
  - [x] Independent CSS blur per layer based on distance <!-- id: 1332 -->
  - [x] Perspective scaling for lens compression effect <!-- id: 1333 -->
  - [x] Foreground bokeh orb simulation at wide apertures <!-- id: 1334 -->
  - [x] Real-time blur amount indicators per layer <!-- id: 1335 -->
  - [x] FOV overlay with lens compression description <!-- id: 1336 -->

## Phase 3: UI Controls ✅ COMPLETE

- [x] **3-Layer Scene Controls** <!-- id: 1340 -->
  - [x] Toggle between layered and legacy blur modes <!-- id: 1341 -->
  - [x] Foreground Distance slider (0.3m - 10m, cyan themed) <!-- id: 1342 -->
  - [x] Background Distance slider (5m - 200m, purple themed) <!-- id: 1343 -->
  - [x] Infinity display for distances >= 100m <!-- id: 1344 -->

- [x] **Copy DOF Prompt Button** <!-- id: 1350 -->
  - [x] Generates prompt text from current settings <!-- id: 1351 -->
  - [x] Includes lens info, aperture, focus distance, DOF range <!-- id: 1352 -->
  - [x] Shows equivalent focal length for crop sensors <!-- id: 1353 -->

- [x] **DOF Stats Display** <!-- id: 1360 -->
  - [x] DOF Split Bar (cyan front, purple back) <!-- id: 1361 -->
  - [x] Hyperfocal distance with tooltip <!-- id: 1362 -->
  - [x] Diffraction warning banner at f/11+ <!-- id: 1363 -->
  - [x] FOV horizontal/vertical display <!-- id: 1364 -->

### Technical Reference (dofsimulator.net)

Based on gold-standard DOF simulator at dofsimulator.net:

- **Circle of Confusion**: `CoC = 0.029 / CropFactor`
- **Hyperfocal Distance**: `H = f² / (N × CoC) + f`
- **Near/Far Limits**: `Dn = (H × s) / (H + (s - f))`, `Df = (H × s) / (H - (s - f))`
- **Blur Diameter**: `BlurDiameter = (f²/N) × |s - d| / (s × d)`
- **Angle of View**: `AOV = 2 × arctan(SensorSize / (2 × f))`

### Files Modified

| File                                                        | Changes                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `frontend/src/components/viewfinder/DirectorViewfinder.tsx` | Added calculateBlurSize(), calculateAOV(), DOFLayeredScene, 3-layer controls |

## Phase 4: Bokeh Shape Simulation ✅ COMPLETE (Dec 27, 2025)

- [x] **Polygonal Aperture Blade System** <!-- id: 1370 -->
  - [x] `generateBokehPath()` - SVG path generator for polygon bokeh <!-- id: 1371 -->
  - [x] Supports 5-15 blades with rotation and curvature <!-- id: 1372 -->
  - [x] Quadratic bezier curves for curved blade simulation <!-- id: 1373 -->
  - [x] `BokehOrb` component with radial gradient fill <!-- id: 1374 -->

- [x] **Bokeh Presets** <!-- id: 1375 -->
  - [x] Vintage: 5 blades, pentagon, straight edges <!-- id: 1376 -->
  - [x] Standard: 7 blades, heptagon, slight curve <!-- id: 1377 -->
  - [x] Pro: 9 blades, nonagon, moderate curve <!-- id: 1378 -->
  - [x] Cinema: 11 blades, near-circular <!-- id: 1379 -->
  - [x] Perfect: 15 blades, fully circular <!-- id: 1380 -->

- [x] **UI Controls** <!-- id: 1381 -->
  - [x] Bokeh preset selector with mini SVG preview icons <!-- id: 1382 -->
  - [x] Tooltips showing blade count and edge curvature <!-- id: 1383 -->
  - [x] Foreground and background bokeh orbs with varied colors <!-- id: 1384 -->

## Phase 5: Shareable/Saveable DOF Presets ✅ COMPLETE (Dec 27, 2025)

- [x] **DOFPreset Interface** <!-- id: 1390 -->
  - [x] Stores all DOF settings, layer distances, bokeh preset <!-- id: 1391 -->
  - [x] LocalStorage persistence for user presets <!-- id: 1392 -->
  - [x] Built-in presets (6 cinematography looks) <!-- id: 1393 -->

- [x] **Built-in Presets** <!-- id: 1394 -->
  - [x] Dreamy Portrait: 85mm f/1.4, creamy bokeh <!-- id: 1395 -->
  - [x] Sharp Landscape: 24mm f/11, deep focus <!-- id: 1396 -->
  - [x] Cinematic Subject Isolation: 50mm f/2.0 <!-- id: 1397 -->
  - [x] Vintage Character: 35mm f/2.8, pentagon bokeh <!-- id: 1398 -->
  - [x] Extreme Macro: 100mm f/4, razor-thin DOF <!-- id: 1399 -->
  - [x] Compressed Telephoto: 200mm f/2.8 <!-- id: 1400 -->

- [x] **Preset Manager UI** <!-- id: 1401 -->
  - [x] Quick preset buttons for built-in looks <!-- id: 1402 -->
  - [x] Save current settings with custom name <!-- id: 1403 -->
  - [x] User preset list with delete option <!-- id: 1404 -->
  - [x] Export preset as JSON file <!-- id: 1405 -->
  - [x] Import preset from JSON file <!-- id: 1406 -->

### Technical Reference

- **Bokeh Path Formula**: Uses polar coordinates for vertices, bezier curves for curvature
- **Curvature**: 0 = straight edges (polygon), 1 = fully curved (circle)
- **Storage Key**: `vibeboard-dof-presets` in localStorage

### Build Verification

- ✅ Frontend: `npm run build` PASS
- ✅ Backend: `npm run build` PASS

### Files Modified

| File                                                        | Changes                                                                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/viewfinder/DirectorViewfinder.tsx` | Added BokehSettings, generateBokehPath(), BokehOrb, DOFPreset, BUILT_IN_DOF_PRESETS, preset management handlers, UI controls |

## Phase 6: dofsimulator.net Feature Parity ✅ COMPLETE (Dec 27, 2025)

Based on research of https://dofsimulator.net/en/ - the gold standard DOF simulator.

- [x] **AI-Powered Layer Extraction** <!-- id: 1410 -->
  - [x] Created `LayerExtractionService.ts` (backend) <!-- id: 1411 -->
  - [x] Integration with `fal-ai/qwen-image-layered/lora` API ($0.06/request) <!-- id: 1412 -->
  - [x] `extractLayers()` - Multi-layer decomposition (2-5 layers) <!-- id: 1413 -->
  - [x] `extractSubjectAndBackground()` - Quick 2-layer extraction for DOF <!-- id: 1414 -->
  - [x] Extract Layers button in UI with loading state <!-- id: 1415 -->
  - [x] Extracted layer preview thumbnails (subject/background) <!-- id: 1416 -->

- [x] **Framing Presets** <!-- id: 1420 -->
  - [x] Face: ECU, subject @ 0.5m, scale 4× <!-- id: 1421 -->
  - [x] Portrait: Head & shoulders @ 1.0m, scale 2.5× <!-- id: 1422 -->
  - [x] Medium: Waist up @ 2.0m, scale 1.5× <!-- id: 1423 -->
  - [x] American: Mid-thigh up @ 3.0m, scale 1.2× <!-- id: 1424 -->
  - [x] Full: Full body @ 5.0m, scale 1.0× <!-- id: 1425 -->
  - [x] Wide: Full body + environment @ 10.0m, scale 0.6× <!-- id: 1426 -->
  - [x] UI: 3×2 grid with tooltips, auto-adjusts focus distance <!-- id: 1427 -->

- [x] **Camera Model Database** <!-- id: 1430 -->
  - [x] 13 popular cameras with exact sensor specs <!-- id: 1431 -->
  - [x] Full Frame: Sony A7 IV, FX3, Canon R5, Nikon Z8, RED V-RAPTOR, ARRI ALEXA 35 <!-- id: 1432 -->
  - [x] APS-C: Sony A6700, FX30, Fuji X-H2S, Canon R7, BMPCC 6K <!-- id: 1433 -->
  - [x] Micro Four Thirds: Panasonic GH6, GH7 <!-- id: 1434 -->
  - [x] Grouped dropdown UI with sensor size optgroups <!-- id: 1435 -->
  - [x] Auto-updates sensor size setting when camera selected <!-- id: 1436 -->

- [x] **Stand-In Model Library** (Backend only) <!-- id: 1440 -->
  - [x] 8 silhouette figures: standing, sitting, walking, etc. <!-- id: 1441 -->
  - [x] Height variations for realistic scale preview <!-- id: 1442 -->
  - [x] API endpoints for future UI integration <!-- id: 1443 -->

- [x] **Backend API Endpoints** <!-- id: 1450 -->
  - [x] `POST /api/viewfinder/extract-layers` - Full layer extraction <!-- id: 1451 -->
  - [x] `POST /api/viewfinder/extract-subject` - Quick 2-layer extraction <!-- id: 1452 -->
  - [x] `GET /api/viewfinder/framing-presets` - List framing presets <!-- id: 1453 -->
  - [x] `GET /api/viewfinder/cameras` - Camera database query <!-- id: 1454 -->
  - [x] `GET /api/viewfinder/stand-in-models` - Model silhouettes <!-- id: 1455 -->
  - [x] `POST /api/viewfinder/calculate-framing` - Subject size calculator <!-- id: 1456 -->
  - [x] `POST /api/viewfinder/calculate-distance` - Distance calculator <!-- id: 1457 -->

### Build Verification

- ✅ Frontend: `npm run build` PASS
- ✅ Backend: `npm run build` PASS

### Files Created

| File                                                        | Purpose                                  |
| ----------------------------------------------------------- | ---------------------------------------- |
| `backend/src/services/viewfinder/LayerExtractionService.ts` | AI layer extraction, camera/framing data |
| `backend/src/routes/viewfinderRoutes.ts`                    | API endpoints for viewfinder features    |

### Files Modified

| File                                                        | Changes                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `backend/src/index.ts`                                      | Added viewfinderRoutes import and registration                                           |
| `frontend/src/components/viewfinder/DirectorViewfinder.tsx` | Added FRAMING_PRESETS, CAMERA_DATABASE, framing/camera selection UI, layer extraction UI |

## Phase 7: Optical Physics Engine ✅ COMPLETE (Dec 28, 2025)

Based on the VibeBoard Optical Lab Technical Roadmap - implementing real physics-based DOF simulation.

- [x] **opticalPhysics.ts Utility Library** <!-- id: 1500 -->
  - [x] SENSOR_DIAGONALS: 12 sensor types (Full Frame to IMAX) <!-- id: 1501 -->
  - [x] COC_LIMITS: Circle of Confusion per sensor type <!-- id: 1502 -->
  - [x] SENSOR_DIMENSIONS: Width/height in mm per sensor <!-- id: 1503 -->
  - [x] `calculateBlurRadius()` - Real blur formula: Blur = C × |Sfocus - Sbg|/Sbg × f²/(N × (Sfocus - f)) <!-- id: 1504 -->
  - [x] `calculateBlurPercent()` - Blur as percentage of frame width <!-- id: 1505 -->
  - [x] `calculateDOF()` - Near/far limits with hyperfocal detection <!-- id: 1506 -->
  - [x] `calculateFOV()` - Horizontal/vertical/diagonal angles <!-- id: 1507 -->
  - [x] `calculate35mmEquivalent()` - Crop factor conversion <!-- id: 1508 -->
  - [x] `calculateDollyZoom()` - Hitchcock effect parameters <!-- id: 1509 -->
  - [x] `calculateDistanceForFraming()` - Distance for target subject size <!-- id: 1510 -->
  - [x] `calculateSubjectFrameSize()` - Subject percentage in frame <!-- id: 1511 -->
  - [x] `calculateLayerTransform()` - Transform params for compositing layer <!-- id: 1512 -->

- [x] **LayerCompositor Component** <!-- id: 1520 -->
  - [x] Real-time compositing of extracted layers with blur <!-- id: 1521 -->
  - [x] Back-to-front layer rendering order <!-- id: 1522 -->
  - [x] Per-layer blur based on optical physics calculations <!-- id: 1523 -->
  - [x] Perspective scaling based on distance from focus <!-- id: 1524 -->
  - [x] Alpha mask support for layer separation <!-- id: 1525 -->
  - [x] Debug overlay showing blur/scale per layer <!-- id: 1526 -->
  - [x] `LayerPreview` component for layer thumbnails <!-- id: 1527 -->
  - [x] `DepthSlider` component for focus control <!-- id: 1528 -->

- [x] **DollyZoomSimulator Component** <!-- id: 1530 -->
  - [x] Mode A: Constant Framing (Hitchcock effect) <!-- id: 1531 -->
  - [x] Mode B: Constant Distance (pure zoom) <!-- id: 1532 -->
  - [x] Animation presets: Vertigo, Reverse Vertigo, Subtle, Dramatic <!-- id: 1533 -->
  - [x] Eased animation with progress bar <!-- id: 1534 -->
  - [x] Real-time FOV and background scale display <!-- id: 1535 -->
  - [x] Quick focal length buttons (24, 35, 50, 85, 135mm) <!-- id: 1536 -->
  - [x] Reference image integration for visual feedback <!-- id: 1537 -->

- [x] **SceneDepthControls Component** <!-- id: 1540 -->
  - [x] Layer list with visibility/lock toggles <!-- id: 1541 -->
  - [x] Per-layer distance sliders with DOF zone indicator <!-- id: 1542 -->
  - [x] Opacity controls per layer <!-- id: 1543 -->
  - [x] Layer reordering (up/down buttons) <!-- id: 1544 -->
  - [x] Layer deletion with confirmation <!-- id: 1545 -->
  - [x] DOF zone visualization (green for in-focus range) <!-- id: 1546 -->
  - [x] Quick focus presets for subject layers <!-- id: 1547 -->
  - [x] Depth map visualization with layer markers <!-- id: 1548 -->

- [x] **DirectorViewfinder Integration** <!-- id: 1550 -->
  - [x] Phase 7 imports (opticalPhysics, LayerCompositor, DollyZoomSimulator, SceneDepthControls) <!-- id: 1551 -->
  - [x] New state: compositorLayers, showDollyZoom, showSceneDepth, useOpticalPhysics <!-- id: 1552 -->
  - [x] `initializeCompositorLayers()` - Convert extracted layers to LayerConfig <!-- id: 1553 -->
  - [x] `handleLayerUpdate()`, `handleLayerDelete()`, `handleLayerReorder()` handlers <!-- id: 1554 -->
  - [x] "Open in Scene Depth Editor" button after layer extraction <!-- id: 1555 -->
  - [x] SceneDepthControls AccordionSection (when layers exist) <!-- id: 1556 -->
  - [x] DollyZoomSimulator AccordionSection <!-- id: 1557 -->

### Technical Reference (Optical Physics)

- **Blur Formula**: `Blur(mm) = C × |Sfocus - Sbg|/Sbg × f²/(N × (Sfocus - f))`
- **FOV Formula**: `FOV = 2 × arctan(dimension / (2 × focalLength))`
- **Dolly Zoom**: `d2 = d1 × (f2 / f1)` to maintain subject framing
- **Background Scale**: `scale = f2 / f1` (>1 = compression, <1 = expansion)

### Build Verification

- ✅ Frontend: `npm run build` PASS
- ✅ Backend: `npm run build` PASS

### Files Created

| File                                                        | Purpose                                             |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `frontend/src/lib/opticalPhysics.ts`                        | Physics calculations for blur, DOF, FOV, dolly zoom |
| `frontend/src/components/viewfinder/LayerCompositor.tsx`    | Real-time layer compositing with blur               |
| `frontend/src/components/viewfinder/DollyZoomSimulator.tsx` | Hitchcock effect simulation                         |
| `frontend/src/components/viewfinder/SceneDepthControls.tsx` | Layer depth management UI                           |

### Files Modified

| File                                                        | Changes                                         |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `frontend/src/components/viewfinder/DirectorViewfinder.tsx` | Phase 7 imports, state, handlers, UI components |

## Phase 7.1: DOF Simulator UX Improvements ✅ COMPLETE (Dec 28, 2025)

- [x] **Manual Layer Upload Fix** <!-- id: 1600 -->
  - [x] Fix upload endpoint from `/api/upload` to `/api/process/upload-temp` <!-- id: 1601 -->
  - [x] Add BACKEND_URL prefix to relative paths from upload response <!-- id: 1602 -->

- [x] **Layer Position Controls** <!-- id: 1610 -->
  - [x] Add `offsetX`, `offsetY`, `scale` properties to LayerConfig <!-- id: 1611 -->
  - [x] Add X/Y offset sliders (-100% to +100%) in SceneDepthControls <!-- id: 1612 -->
  - [x] Add scale slider (10% to 300%) in SceneDepthControls <!-- id: 1613 -->
  - [x] Add "Reset Position" button for each layer <!-- id: 1614 -->
  - [x] Apply CSS transforms to layer rendering in DOFLayeredScene <!-- id: 1615 -->

- [x] **Layer Clear Button (X)** <!-- id: 1620 -->
  - [x] Add X button in layer header (visible when layer has image) <!-- id: 1621 -->
  - [x] Clear layer image URL on click (layer slot remains) <!-- id: 1622 -->
  - [x] Show placeholder icon when layer is cleared <!-- id: 1623 -->
  - [x] Fallback rendering: background→gradient, subject→focus indicator, foreground→bokeh <!-- id: 1624 -->

### Files Modified

| File                                                        | Changes                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `frontend/src/components/viewfinder/DirectorViewfinder.tsx` | Upload endpoint fix, layer transform application         |
| `frontend/src/components/viewfinder/SceneDepthControls.tsx` | LayerConfig extensions, position sliders, X clear button |

---

# Content Creator Pipeline - Phase 5: YouTube Delivery ✅ COMPLETE (Dec 28, 2025)

## Backend Implementation

- [x] **YouTubeUploadService.ts** <!-- id: 2000 -->
  - [x] Google OAuth2 authentication flow <!-- id: 2001 -->
  - [x] Token management with refresh <!-- id: 2002 -->
  - [x] Video upload via YouTube Data API v3 <!-- id: 2003 -->
  - [x] LLM-powered metadata generation (Grok) <!-- id: 2004 -->
  - [x] Thumbnail upload support <!-- id: 2005 -->
  - [x] Channel info and video management <!-- id: 2006 -->

- [x] **youtubeRoutes.ts** <!-- id: 2010 -->
  - [x] GET /api/youtube/auth/init - OAuth URL generation <!-- id: 2011 -->
  - [x] GET /api/youtube/auth/callback - Token exchange <!-- id: 2012 -->
  - [x] GET /api/youtube/auth/status - Connection check <!-- id: 2013 -->
  - [x] POST /api/youtube/auth/disconnect - Remove tokens <!-- id: 2014 -->
  - [x] POST /api/youtube/generate-metadata - AI metadata <!-- id: 2015 -->
  - [x] GET /api/youtube/categories - List categories <!-- id: 2016 -->
  - [x] POST /api/youtube/upload - Direct file upload <!-- id: 2017 -->
  - [x] POST /api/youtube/upload-from-path - Server path upload <!-- id: 2018 -->
  - [x] GET /api/youtube/videos - List uploaded videos <!-- id: 2019 -->
  - [x] PATCH /api/youtube/videos/:videoId - Update metadata <!-- id: 2020 -->
  - [x] DELETE /api/youtube/videos/:videoId - Delete video <!-- id: 2021 -->

- [x] **Backend Fixes** <!-- id: 2030 -->
  - [x] Fix LLMService import path (../LLMService) <!-- id: 2031 -->
  - [x] Fix LLMService instantiation (new, not singleton) <!-- id: 2032 -->
  - [x] Fix generate() API call format <!-- id: 2033 -->
  - [x] Fix thumbnailUrl null handling <!-- id: 2034 -->
  - [x] Add YouTube routes to index.ts <!-- id: 2035 -->

## Frontend Implementation

- [x] **DeliveryModal.tsx** <!-- id: 2040 -->
  - [x] OAuth connection flow UI <!-- id: 2041 -->
  - [x] AI metadata generation with title options <!-- id: 2042 -->
  - [x] Upload progress tracking <!-- id: 2043 -->
  - [x] Privacy status selection <!-- id: 2044 -->
  - [x] Category dropdown <!-- id: 2045 -->
  - [x] Success state with video URL <!-- id: 2046 -->

- [x] **Timeline Page Integration** <!-- id: 2050 -->
  - [x] DeliveryModal import and state <!-- id: 2051 -->
  - [x] YouTube button in bake success toast <!-- id: 2052 -->
  - [x] Store bakedVideoPath for delivery <!-- id: 2053 -->

## Bug Fixes

- [x] **Validation Schema Fix** <!-- id: 2060 -->
  - [x] Fix audioUrl validation to allow empty strings <!-- id: 2061 -->
  - [x] Updated: `audioUrl: z.string().url().optional().nullable().or(z.literal(''))` <!-- id: 2062 -->

### Build Verification

- ✅ Frontend: `npm run build` PASS
- ✅ Backend: `npm run build` PASS
- ✅ YouTube endpoints verified via curl

---

# Storyboard Shot Layout Improvements (Dec 29, 2025) ✅ COMPLETE

## UI Layout Refinements

- [x] **Video Preview Size Enhancement** <!-- id: 2100 -->
  - [x] Add `min-w-[700px]` to right panel for larger preview <!-- id: 2101 -->
  - [x] Maintain 16:9 aspect ratio with `aspect-video` class <!-- id: 2102 -->

- [x] **Left Panel Width Optimization** <!-- id: 2110 -->
  - [x] Change from `w-96` (384px) to `w-[420px]` <!-- id: 2111 -->
  - [x] Balance layout to prevent right-side overflow <!-- id: 2112 -->
  - [x] Show more scene direction text without truncation <!-- id: 2113 -->

- [x] **Full-width Generate Video Button** <!-- id: 2120 -->
  - [x] Restore button below prompt area <!-- id: 2121 -->
  - [x] Activates when first frame and prompt are set <!-- id: 2122 -->

## Iteration Tracking & Cost Display

- [x] **Cost Functions (Exported)** <!-- id: 2130 -->
  - [x] `calculateImageCost()` - Per-megapixel pricing <!-- id: 2131 -->
  - [x] `calculateVideoCost()` - Per-second with resolution multipliers <!-- id: 2132 -->
  - [x] `calculateTotalShotCost()` - Combined image + video spend <!-- id: 2133 -->

- [x] **Iteration Count Badges** <!-- id: 2140 -->
  - [x] First Frame: ×N green badge <!-- id: 2141 -->
  - [x] Last Frame: ×N purple badge <!-- id: 2142 -->
  - [x] Video: ×N in Complete status badge <!-- id: 2143 -->

- [x] **Per-Shot Cost Summary** <!-- id: 2150 -->
  - [x] Only shows when iterations exist <!-- id: 2151 -->
  - [x] Frame spend (amber) + Video spend (emerald) = Total (white) <!-- id: 2152 -->

### Files Modified

| File                                                    | Changes                                      |
| ------------------------------------------------------- | -------------------------------------------- |
| `frontend/src/components/storyboard/StoryboardShot.tsx` | Panel widths, cost display, iteration badges |
| `frontend/src/app/projects/[id]/storyboard/page.tsx`    | Iteration count persistence to backend       |

### Build Verification

- ✅ Frontend: `npm run build` PASS

---

# P0 Security Hardening ✅ COMPLETE (Dec 31, 2025)

## Overview

Completed Phase 0 Security as prerequisite before Phase 5 (VFX Suite) and Phase 6 (Optics Engine).
All paid compute endpoints are now protected with JWT authentication and quota enforcement.

## Completed Tasks

- [x] **JWT Authentication Middleware** <!-- id: 3000 -->
  - [x] `withAuth` - Validates JWT access tokens from Authorization header <!-- id: 3001 -->
  - [x] `requireGenerationQuota` - Checks monthly generation limits <!-- id: 3002 -->
  - [x] Middleware chain: `withAuth` → `requireGenerationQuota` → handler <!-- id: 3003 -->

- [x] **Protected Route Categories** <!-- id: 3010 -->
  - [x] GPU Generation routes (10 endpoints with quota, 5 read-only) <!-- id: 3011 -->
  - [x] VFX Suite routes (4 endpoints with quota, 2 read-only) <!-- id: 3012 -->
  - [x] CoTracker3 tracking routes (5 endpoints with quota, 3 read-only) <!-- id: 3013 -->
  - [x] Video extension routes (4 endpoints with quota) <!-- id: 3014 -->
  - [x] Prompt enhancement routes (3 endpoints with quota) <!-- id: 3015 -->
  - [x] Semantic search routes (3 endpoints with quota, 4 read-only) <!-- id: 3016 -->
  - [x] Lighting analysis routes (1 endpoint with quota) <!-- id: 3017 -->
  - [x] Character Foundry routes (3 endpoints with quota, 1 read-only) <!-- id: 3018 -->

- [x] **Tenant Isolation (Prisma Schema)** <!-- id: 3020 -->
  - [x] `userId String?` on Project model (optional for backward compat) <!-- id: 3021 -->
  - [x] `userId String?` on Session model (optional for backward compat) <!-- id: 3022 -->
  - [x] Controller updates to associate new records with authenticated user <!-- id: 3023 -->

- [x] **Validation Fixes** <!-- id: 3030 -->
  - [x] Zod uses `.error.issues` not `.error.errors` <!-- id: 3031 -->

### Protected Route Files

| File                   | Auth Endpoints | Quota Endpoints |
| ---------------------- | -------------- | --------------- |
| `vfxRoutes.ts`         | 6              | 4               |
| `trackingRoutes.ts`    | 8              | 5               |
| `extendVideoRoutes.ts` | 4              | 4               |
| `promptRoutes.ts`      | 3              | 3               |
| `searchRoutes.ts`      | 7              | 3               |
| `lightingRoutes.ts`    | 1              | 1               |
| `foundryRoutes.ts`     | 4              | 3               |

### Security Status

**Phase 0 Security: ✅ COMPLETE**

### Next Steps

- Phase 5: VFX Suite (advanced features)
- Phase 6: Optics Engine (camera simulation)

---

# GitHub Security Audit ✅ COMPLETE (Dec 31, 2025)

## Overview

Completed GitHub repository security audit following P0 Security Hardening. Verified no secrets in tracked files and enabled available security features.

## Completed Tasks

- [x] **Secret Audit** <!-- id: 3100 -->
  - [x] Verified `backend/.env.example` contains only placeholder values <!-- id: 3101 -->
  - [x] Verified `backend/scripts/test_topaz_video_key.ts` reads from env vars <!-- id: 3102 -->
  - [x] Confirmed no real API keys in git history <!-- id: 3103 -->

- [x] **GitHub Settings** <!-- id: 3110 -->
  - [x] Enabled Dependabot vulnerability alerts <!-- id: 3111 -->
  - [x] Documented fork control limitation (org-only feature) <!-- id: 3112 -->
  - [x] Documented secret scanning limitation (requires Advanced Security) <!-- id: 3113 -->

## GitHub Settings Applied

| Setting | Status | Notes |
|---------|--------|-------|
| **Dependabot Alerts** | ✅ Enabled | Scans dependencies for vulnerabilities |
| **Disable Forking** | ❌ N/A | Only available for organization-owned repos |
| **Secret Scanning** | ❌ N/A | Requires GitHub Advanced Security (paid) |
| **Branch Protection** | ⚠️ Manual | Must configure via GitHub web UI |

## Manual Setup Required

**Branch Protection for `main`** (recommended):
1. Go to: https://github.com/mattyatplay-coder/vibeboard/settings/branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - ☑️ Require pull request reviews before merging
   - ☑️ Require status checks to pass before merging
   - ☑️ Do not allow bypassing the above settings
5. Click "Create"

## Security Summary

| Category | Status |
|----------|--------|
| No secrets in git | ✅ Verified |
| `.env` in `.gitignore` | ✅ Verified |
| Test scripts use env vars | ✅ Verified |
| Dependabot enabled | ✅ Enabled |
| P0 Auth middleware | ✅ 48 endpoints protected |

**GitHub Security Audit: ✅ COMPLETE**

---

# 🚀 Launch Readiness Checklist (Pre-Launch Required)

> **Source**: `/Users/matthenrichmacbook/Antigravity/vibeboard/security-audit/`
> **Added**: Dec 31, 2025
> **Priority**: Must complete before production launch

## Security Documentation (Placeholder Files to Complete)

- [ ] **SECURITY_P1_ROADMAP.md** <!-- id: 4000 -->
    - [ ] Define P1 security improvements for post-launch <!-- id: 4001 -->
    - [ ] Rate limiting strategy <!-- id: 4002 -->
    - [ ] CSRF protection <!-- id: 4003 -->
    - [ ] Input sanitization audit <!-- id: 4004 -->
    - [ ] SQL injection prevention verification <!-- id: 4005 -->
    - [ ] XSS prevention audit <!-- id: 4006 -->

- [ ] **LAUNCH_READINESS_CHECKLIST.md** <!-- id: 4010 -->
    - [ ] Environment variable documentation <!-- id: 4011 -->
    - [ ] Database migration checklist <!-- id: 4012 -->
    - [ ] SSL/TLS configuration <!-- id: 4013 -->
    - [ ] Backup and recovery procedures <!-- id: 4014 -->
    - [ ] Monitoring and alerting setup <!-- id: 4015 -->
    - [ ] Load testing results <!-- id: 4016 -->

- [ ] **BILLING_AND_QUOTA_SCHEMAS.md** <!-- id: 4020 -->
    - [ ] Define billing tiers (Free, Pro, Enterprise) <!-- id: 4021 -->
    - [ ] Monthly generation quotas per tier <!-- id: 4022 -->
    - [ ] API rate limits per tier <!-- id: 4023 -->
    - [ ] Overage pricing model <!-- id: 4024 -->
    - [ ] Usage tracking implementation <!-- id: 4025 -->

- [ ] **SECURITY_README.md** <!-- id: 4030 -->
    - [ ] Authentication architecture overview <!-- id: 4031 -->
    - [ ] JWT token lifecycle documentation <!-- id: 4032 -->
    - [ ] Protected route patterns <!-- id: 4033 -->
    - [ ] Tenant isolation guidelines <!-- id: 4034 -->
    - [ ] Security incident response procedures <!-- id: 4035 -->

## Production Infrastructure

- [ ] **Replace mockAuth.ts with Real Auth** <!-- id: 4040 -->
    - [ ] Implement production JWT verification <!-- id: 4041 -->
    - [ ] Token refresh flow <!-- id: 4042 -->
    - [ ] Session management <!-- id: 4043 -->

- [ ] **CI/CD Pipeline** <!-- id: 4050 -->
    - [ ] Deploy `github-workflows/ci.yml` to main repo <!-- id: 4051 -->
    - [ ] Configure GitHub Actions secrets <!-- id: 4052 -->
    - [ ] Set up staging environment <!-- id: 4053 -->

- [ ] **Database Production Setup** <!-- id: 4060 -->
    - [ ] PostgreSQL on Render configured <!-- id: 4061 -->
    - [ ] Prisma migrations applied <!-- id: 4062 -->
    - [ ] Backup schedule configured <!-- id: 4063 -->

## Launch Blockers Summary

| Item | Status | Priority |
|------|--------|----------|
| P1 Security Roadmap | ❌ Stub only | HIGH |
| Launch Checklist | ❌ Stub only | HIGH |
| Billing Schemas | ❌ Stub only | MEDIUM |
| Security Guidelines | ❌ Stub only | MEDIUM |
| Real Auth (replace mock) | ❌ Not started | HIGH |
| CI/CD Pipeline | ✅ Ready (in security-audit/) | LOW |

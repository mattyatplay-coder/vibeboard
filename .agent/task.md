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

## Phase 6: Community Features (MEDIUM PRIORITY)
**Gap**: Civitai dominates LoRA/prompt sharing

- [ ] **LoRA & Prompt Gallery** <!-- id: 150 -->
    - [ ] Browse community LoRAs <!-- id: 151 -->
    - [ ] One-click Civitai import <!-- id: 152 -->
    - [ ] Save/share favorite prompts <!-- id: 153 -->
    - [ ] Workflow template library <!-- id: 154 -->

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
| Model | Result | Notes |
|-------|--------|-------|
| Kling O1 | ❌ Inconsistent | Character details changed between poses |
| Replicate fofr/consistent-character | ❌ Style drift | Mixed Pixar/realistic styles |
| Flux 2 Max (fal-ai/flux-2-max/edit) | ✅ Selected | Best consistency + pose variety |
| GPT Image 1.5 | ✅ Good | Alternative option, slower |

### Key Technical Decisions
1. **Flux 2 Max over Kling O1**: Better character consistency with reference image
2. **Frame-relative directions**: "nose pointing toward left edge of frame" vs "facing left"
3. **Explicit cropping language**: "no legs visible", "cropped at chest" to force framing
4. **Dynamic aspect ratios**: Match aspect ratio to shot type for better results
5. **Clothing-aware presets**: Avoid impossible poses (no pockets in swimwear)

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
*In real production, the Script Supervisor ensures visual consistency. In AI, "drift" is the enemy.*

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

### 2. The "Virtual Gaffer" (3-Point Lighting Layout) <!-- id: 810 -->
*Pros want to design light, not just copy it.*

- [ ] **Interactive Light Map** <!-- id: 811 -->
    - [ ] Top-down 2D "stage" widget next to prompt bar <!-- id: 812 -->
    - [ ] Placeable light sources: Key, Fill, Backlight <!-- id: 813 -->
    - [ ] Generate ControlNet Depth/Canny map from layout <!-- id: 814 -->
    - [ ] Generate lighting prompt string (e.g., "rim lighting from back-left") <!-- id: 815 -->
    - [ ] Color Temperature (Kelvin) setting per light source <!-- id: 816 -->

### 3. Neural Foley & Lens-Aware Audio <!-- id: 820 -->
*Pro audio is Spatial - match audio to visual focal length.*

- [ ] **Acoustic Mapping** <!-- id: 821 -->
    - [ ] Use Lens Kit metadata to drive audio engine <!-- id: 822 -->
    - [ ] 14mm Ultra Wide: High reverb, environmental atmos (wind, city hum) <!-- id: 823 -->
    - [ ] 85mm Tight Close-up: Dry, intimate (enhanced foley, breathing) <!-- id: 824 -->
    - [ ] Auto-apply "Sonic Realism" matching focal length <!-- id: 825 -->

### 4. The "Set Extension" (Infinite Outpainting) <!-- id: 830 -->
*Discover the environment - pan 360° to build the entire "Set".*

- [ ] **Infinite Canvas (Pan-to-Extend)** <!-- id: 831 -->
    - [ ] Drag image in preview to reveal empty space <!-- id: 832 -->
    - [ ] Outpaint section on release <!-- id: 833 -->
    - [ ] Support 360° environment building <!-- id: 834 -->
    - [ ] Integrate with Shot Navigator for consistent set design <!-- id: 835 -->

### 5. Alpha-Channel Exports (VFX Bridge) <!-- id: 840 -->
*Make VibeBoard a "VFX Asset Generator" for After Effects integration.*

- [ ] **Background Transparency Toggle** <!-- id: 841 -->
    - [ ] Use SAM 2/3 (Magic Mask) for alpha video generation <!-- id: 842 -->
    - [ ] "Export with Alpha" checkbox in download settings <!-- id: 843 -->
    - [ ] Black-and-white alpha video for every render <!-- id: 844 -->
    - [ ] PNG sequence export with transparency <!-- id: 845 -->

### 6. The "Director's Dashboard" (Production Health) <!-- id: 850 -->
*High-level view for big projects.*

- [ ] **Continuity & Budget Monitor** <!-- id: 851 -->
    - [ ] Style Drift graph (project "Look" consistency over time) <!-- id: 852 -->
    - [ ] Asset Usage tracking (#Key, @Turtle_2 appearances) <!-- id: 853 -->
    - [ ] Real-Time Spending dashboard (Fal/Replicate/OpenAI costs) <!-- id: 854 -->
    - [ ] Project health summary widget <!-- id: 855 -->

### 7. Semantic Search (Enhanced) <!-- id: 860 -->
*Gallery becomes a searchable Database.*

- [ ] **Vision-Powered Search** <!-- id: 861 -->
    - [ ] Auto-generate "Technical Description" on image creation <!-- id: 862 -->
    - [ ] Use low-cost Vision model (Moondream/Llava) <!-- id: 863 -->
    - [ ] Natural language queries ("Turtle looking left") <!-- id: 864 -->
    - [ ] CLIP embedding for visual similarity search <!-- id: 865 -->

### 8. Multi-Pass Workflow <!-- id: 870 --> ✅ COMPLETE
*Quality improvement pipeline.*

- [x] **Block-In → Upscale → Enhance** <!-- id: 871 -->
    - [x] Define quality stages pipeline <!-- id: 872 -->
    - [x] Auto-progression through stages <!-- id: 873 -->
    - [x] Manual override at each stage <!-- id: 874 -->

---

## Batch #6 - Multi-Pass Render Queue (Dec 25, 2025)

### 1. Multi-Pass Render Queue ✅ COMPLETE <!-- id: 900 -->
*Draft → Review → Master workflow with seed inheritance for visual consistency.*

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

### 2. Semantic Search (CLIP/Vision Indexing) <!-- id: 950 -->
*Gallery becomes a searchable database - NOT STARTED*

- [ ] **SemanticSearchService.ts** <!-- id: 951 -->
    - [ ] CLIP embedding generation <!-- id: 952 -->
    - [ ] Vector storage <!-- id: 953 -->
    - [ ] Similarity search algorithm <!-- id: 954 -->

- [ ] **Auto-Tagging on Generation** <!-- id: 960 -->
    - [ ] Vision model for Technical Description <!-- id: 961 -->
    - [ ] Store tags with generation record <!-- id: 962 -->

- [ ] **Search UI** <!-- id: 970 -->
    - [ ] Natural language search bar <!-- id: 971 -->
    - [ ] "Find Similar" button on GenerationCard <!-- id: 972 -->

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

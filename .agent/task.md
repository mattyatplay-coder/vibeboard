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

## Phase 1: Camera Preset Library (HIGH PRIORITY)
**Gap**: Higgsfield has 50+ camera presets, VibeBoard has 6 angles + 8 motions

- [ ] **Expand Camera Presets to 50+** <!-- id: 100 -->
    - [ ] Create `CAMERA_PRESETS` constant with 10 categories <!-- id: 101 -->
        - Zoom (8): Zoom In/Out, Crash Zoom, Dolly Zoom, YoYo
        - Dolly (7): In/Out/Left/Right, Super Dolly, Double Dolly
        - Crane (3): Up/Down, Over Head
        - Orbital (5): 360 Orbit, Arc Left/Right, Lazy Susan, 3D Rotation
        - Specialty (8): Bullet Time, Snorricam, Dutch Angle, Fisheye, FPV Drone
        - Vehicle (5): Car Chase, Car Interior, Road Rush
        - Character (5): Eyes In, Hero Shot, Head Track, Glam
        - Handheld (3): Handheld, Steadicam, Whip Pan
        - Static (2): Static, Overhead
        - Timelapse (3): Hyperlapse, Sky, City
    - [ ] Update `ShotActionsPanel.tsx` with preset grid <!-- id: 102 -->
    - [ ] Update `CreateStyleModal.tsx` ADVANCED_OPTIONS.cameraMotions <!-- id: 103 -->
    - [ ] Create `CameraPresetSelector.tsx` component <!-- id: 104 -->
    - [ ] Add preset mixing (combine 2+ moves like Higgsfield Mix) <!-- id: 105 -->

## Phase 2: Genre-Aware Shot Templates (HIGH PRIORITY)
**Gap**: No competitor has genre-aware camera recommendations

- [ ] **Create Genre Template System** <!-- id: 110 -->
    - [ ] Create `GenreTemplates.ts` with 6 genres <!-- id: 111 -->
        - Film Noir: Low key, dutch angles, dolly zoom, static
        - Action: Bullet time, crash zoom, FPV drone, car chase
        - Horror: Snorricam, dolly zoom, crane down, static
        - Romance: Arc orbits, dolly in, crane up, glam
        - Documentary: Handheld, static, hyperlapse, steadicam
        - Sci-Fi: Through object, bullet time, FPV drone
    - [ ] Each genre has: recommendedMoves, avoidedMoves, defaultStyle, commonShots <!-- id: 112 -->
    - [ ] Create `GenreSelector.tsx` component <!-- id: 113 -->
    - [ ] Integrate genre awareness into shot suggestions <!-- id: 114 -->

## Phase 3: Story Editor - Script-to-Storyboard (HIGH PRIORITY)
**Gap**: LTX Studio and InVideo have automated script-to-storyboard

- [ ] **Build Story Editor Pipeline** <!-- id: 120 -->
    - [ ] Create `StoryEditorService.ts` backend service <!-- id: 121 -->
    - [ ] Implement script parsing with LLM <!-- id: 122 -->
    - [ ] Map script to scenes automatically <!-- id: 123 -->
    - [ ] Generate shots for each scene with genre-appropriate cameras <!-- id: 124 -->
    - [ ] Map emotional beats (tension, release, climax) to shot types <!-- id: 125 -->
    - [ ] Create `StoryEditorPage.tsx` frontend <!-- id: 126 -->
    - [ ] Add "AI Director" mode for full automation <!-- id: 127 -->

## Phase 4: Video Duration Extension (HIGH PRIORITY)
**Gap**: Kling.ai offers 2-minute videos, VibeBoard max is 10s

- [ ] **Implement Video Extension Chaining** <!-- id: 130 -->
    - [ ] Auto-extract last frame from video <!-- id: 131 -->
    - [ ] Chain clips for longer sequences <!-- id: 132 -->
    - [ ] Add "Extend Video" button to GenerationCard <!-- id: 133 -->
    - [ ] Stitch extended videos with ffmpeg <!-- id: 134 -->

## Phase 5: UX Simplification (HIGH PRIORITY)
**Gap**: InVideo/Leonardo have better onboarding than VibeBoard

- [ ] **Guided vs Expert Mode** <!-- id: 140 -->
    - [ ] Create first-run wizard selecting use case <!-- id: 141 -->
    - [ ] Add Quick Start templates <!-- id: 142 -->
        - "Generate Your First Image" (3 clicks)
        - "Create a Character" guided flow
        - "Make a Video Scene" template
    - [ ] Implement progressive disclosure of advanced features <!-- id: 143 -->
    - [ ] Add contextual tooltips <!-- id: 144 -->

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

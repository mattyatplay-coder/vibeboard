# 🏆 THE DEFINITIVE VIBEBOARD 3.0 PRODUCTION SOP

> Standard Operating Procedure: Complete workflow from concept to final delivery with full API linkage and governance gates

---

## Overview

This document maps the complete production pipeline with **governance gates** that ensure creative consistency, budget control, and professional repeatability.

```
BRIEF → CONCEPT → SCRIPT → ASSETS → STYLE LOCK → FRAMES → COST CHECK → VIDEO → DAILIES → VFX → SHOT LOCK → EDIT → PICTURE LOCK → RENDER → DELIVER
  0        1         2       3-4         5          6-7        7.5         8       8.5      9       9.5       10        10.5        11       12
```

---

## Phase 0: Development & Contract (The Intake)

### Step 0: Project Brief - Creative Contract [MANDATORY]

| Property        | Value                                                 |
| :-------------- | :---------------------------------------------------- |
| **Page**        | `/projects/[id]` (Project Settings)                   |
| **API**         | `POST /api/projects` / `PUT /api/projects/:projectId` |
| **Enforced By** | Producer Agent (Hard Block if Budget Cap exceeded)    |

> 🔐 **GATE: Creative Contract Lock**
> Before any generation can begin, the project must have locked creative and financial constraints.

**Required Contract Fields:**

```json
{
  "projectId": "...",
  "creativeContract": {
    "targetFormat": "trailer",
    "targetRuntime": 60,
    "aspectRatio": "21:9",
    "referencePack": ["ref1.jpg", "ref2.jpg", "ref3.jpg"],
    "budgetCap": 20.0,
    "styleNotes": "Neo-noir, high contrast, neon accents"
  }
}
```

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF budgetCap not set OR referencePack.length < 3:              │
│    → "Generate" buttons DISABLED across all modules             │
│    → Warning: "Complete Project Brief before generating"        │
│                                                                 │
│  ELSE:                                                          │
│    → All generation features ENABLED                            │
│    → Budget tracked against budgetCap throughout pipeline       │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Artifact:** `Project.creativeContract` JSON object with locked constraints

---

## Phase 1: Development (The Blueprint)

### Step 1: Script Lab - Concept Input

| Property | Value                                                |
| :------- | :--------------------------------------------------- |
| **Page** | `/projects/[id]/story-editor`                        |
| **API**  | `POST /api/projects/:projectId/story-editor/outline` |
| **Tech** | Claude 3.5 / RAG System (OpenAI Embeddings)          |

**Input:**

```json
{
  "concept": "Neo-Noir Laundromat",
  "genre": "thriller",
  "tone": "dark"
}
```

> 🔐 **GATE: RAG System (Creative Intelligence)**
> Before calling Claude, the system queries the Vector DB for style/genre references:
>
> ```
> POST /api/search/semantic
> { "query": "neo-noir cinematography laundromat scenes", "limit": 5 }
> ```
>
> Returns: Reference prompts, visual styles, and genre conventions that augment the LLM context.

**Output:**

```json
{
  "outline": {
    "logline": "A femme fatale's chance encounter in a late-night laundromat...",
    "acts": [...],
    "themes": ["betrayal", "redemption"]
  }
}
```

---

### Step 2: Script Lab - Auto-Breakdown

| Property | Value                                                  |
| :------- | :----------------------------------------------------- |
| **API**  | `POST /api/projects/:projectId/story-editor/breakdown` |
| **API**  | `POST /api/projects/:projectId/story-editor/prompts`   |
| **Tech** | MiniMax M2.1 (Agent Logic)                             |

**Output:**

```json
{
  "scenes": [
    {
      "scenePrompt": "Femme fatale enters smoky laundromat",
      "negativeElements": ["crowd", "daylight"],
      "visualElements": ["neon", "steam", "shadows"],
      "characters": ["femme_fatale"],
      "orderIndex": 0
    }
  ],
  "assetManifest": {
    "characters": ["femme_fatale"],
    "locations": ["laundromat_interior"],
    "props": ["washing_machine", "neon_sign"]
  }
}
```

> ⚡ **Key Output:**
>
> - `negativeElements` array auto-generates surgical removal prompts for I2I editing
> - `assetManifest` creates placeholder entries in Asset Bin and Character Foundry

---

## Phase 2: Pre-Production (Assets & Look)

### Step 3: Asset Bin - Set Construction & Governance

| Property | Value                                              |
| :------- | :------------------------------------------------- |
| **API**  | `POST /api/projects/:projectId/assets/deconstruct` |
| **Tech** | 3D-RE-GEN (mesh/point cloud), MVInverse (PBR maps) |

> 🔐 **GATE: Asset Governance (Naming Schema)**
> All assets must follow the team-wide naming convention for traceability.

**Naming Convention:**

```
SC{sceneNumber}_SH{shotNumber}_{AssetType}_{AssetName}

Examples:
  SC01_SH03_CHAR_FemmeFatale
  SC01_SH03_PROP_WashingMachine
  SC01_SH03_LOC_LaundromaInterior
```

**Asset with Provenance Sidecar:**

```json
{
  "assetId": "asset_123",
  "name": "SC01_SH03_LOC_LaundromaInterior",
  "type": "location",
  "files": [
    { "name": "Location_Laundromat.glb", "type": "geometry" },
    { "name": "materials.json", "type": "pbr" }
  ],
  "provenance": {
    "sourcePrompt": "Neo-noir laundromat interior, neon lighting...",
    "seed": 42,
    "model": "fal-ai/flux/dev",
    "createdAt": "2024-01-15T10:30:00Z",
    "createdBy": "user_456"
  }
}
```

> ⚡ **Key Artifact:** Sidecar JSON attached to every asset for full traceability

---

### Step 4: Character Foundry - Cast, LoRA & Style Bible

| Property | Value                                                  |
| :------- | :----------------------------------------------------- |
| **API**  | `POST /api/projects/:projectId/foundry/characters`     |
| **API**  | `POST /api/projects/:projectId/training/start`         |
| **Tech** | FlashPortrait (Video Performance), CARI4D (Grip Logic) |

**Character Creation:**

```json
{
  "name": "Femme Fatale",
  "referenceImages": ["https://...ref1.jpg", "https://...ref2.jpg"],
  "primaryImageUrl": "https://...primary.jpg",
  "attributes": {
    "age": "30s",
    "gender": "female",
    "hairColor": "black"
  }
}
```

**LoRA Training Output:**

```json
{
  "characterId": "char_femme_fatale",
  "loraId": "lora_123",
  "triggerWord": "jn",
  "status": "complete"
}
```

> 🔐 **ARTIFACT: Style Bible Generation**
> After character setup, system generates a consolidated Style Bible document.

**Style Bible Contents:**

```json
{
  "styleBibleId": "sb_001",
  "projectId": "...",
  "characters": [
    {
      "name": "Femme Fatale",
      "triggerWord": "jn",
      "loraId": "lora_123",
      "wardrobeRules": ["Black trench coat", "Red lipstick", "No hats"],
      "lightingRules": ["High contrast", "Rim lighting from behind"],
      "poseGuidance": ["Never facing directly at camera", "3/4 profile preferred"]
    }
  ],
  "globalRules": {
    "colorPalette": ["#1a1a2e", "#e94560", "#0f3460"],
    "bannedElements": ["daylight", "crowds", "modern phones"],
    "requiredElements": ["neon reflections", "smoke/haze", "wet surfaces"]
  }
}
```

> ⚡ **Key Artifact:** Style Bible freezes character look, lighting, and wardrobe rules for entire project

---

### Step 5: Optics Engine - Cinematography Lock

| Property | Value                                           |
| :------- | :---------------------------------------------- |
| **Page** | `/projects/[id]/optics-engine`                  |
| **API**  | `POST /api/optics/rack-focus`                   |
| **Tech** | Cadrage Data (DOF/FOV), GenFocus (Bokeh Kernel) |

**Input:**

```json
{
  "camera": "RED V-Raptor",
  "lens": "Lensbaby 85mm T1.8",
  "lensCharacter": {
    "fNumber": 1.8,
    "focalLength": 85,
    "lensType": "standard",
    "bokehShape": "round"
  }
}
```

**Output - Master Cinematic Modifier:**

```
"85mm lens, f/1.8 aperture, shallow depth of field, creamy bokeh background,
REDWideGamutRGB color science, anamorphic lens flares, cinematic film grain..."
```

> 🔐 **GATE: Style Lock**
> Once a SceneChain references this modifier, Optics Engine controls are LOCKED for that chain.

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF sceneChain.masterStyleContext is set:                       │
│    → Optics Engine controls DISABLED for this chain             │
│    → Warning: "Style locked. Create new chain for different look"│
│                                                                 │
│  ELSE:                                                          │
│    → Full Optics Engine controls available                      │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Output:** `masterStyleContext` string injected into ALL generations for this chain

---

## Phase 3: Production (The Shoot)

### Step 6: Storyboard - Export from Script Lab

| Property | Value                                                     |
| :------- | :-------------------------------------------------------- |
| **Page** | `/projects/[id]/storyboard`                               |
| **API**  | `POST /api/projects/:projectId/scene-chains`              |
| **API**  | `POST /api/projects/:projectId/scene-chains/:id/segments` |

> 🔐 **GATE: Master Cinematic Required**
> Cannot generate frames until a Master Cinematic Modifier is selected.

**Creates SceneChain:**

```json
{
  "name": "Scene 1 - Laundromat",
  "masterStyleContext": "cinematic lighting, RED camera, shallow DOF, 85mm lens...",
  "characterIds": ["char_femme_fatale"],
  "orderIndex": 0,
  "aspectRatio": "16:9",
  "transitionStyle": "smooth"
}
```

**Creates SceneChainSegments (per shot):**

```json
{
  "prompt": "Femme fatale enters through steam",
  "negativePrompt": "(crowd:1.5), (daylight:1.3)",
  "firstFramePrompt": "Close-up of door handle turning",
  "lastFramePrompt": "Wide shot, silhouette in doorway",
  "duration": 5,
  "orderIndex": 0
}
```

> ⚡ **Data Handoff:** `negativeElements` from Step 2 → `negativePrompt` here

---

### Step 7: Storyboard - Qwen Continuity Loop (Frame Generation)

| Property | Value                                                                           |
| :------- | :------------------------------------------------------------------------------ |
| **API**  | `POST /api/projects/:projectId/scene-chains/:id/segments/:segId/generate-frame` |
| **Tech** | Qwen-2511 (Surgical I2I), Flux Dev (T2I)                                        |

#### The Continuity Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SHOT 1                                                                 │
│  ┌──────────────────┐                    ┌──────────────────┐          │
│  │ First Frame      │ ──── Qwen I2I ───▶ │ Last Frame       │          │
│  │ (T2I: Flux Dev)  │                    │ (Qwen-2511)      │          │
│  │                  │                    │                  │          │
│  │ firstFrameUrl    │                    │ lastFrameUrl     │          │
│  └──────────────────┘                    └────────┬─────────┘          │
│                                                   │                     │
├───────────────────────────────────────────────────┼─────────────────────┤
│  SHOT 2                                           │                     │
│  ┌──────────────────┐                    ┌────────▼─────────┐          │
│  │ First Frame      │◀── Qwen I2I ───────│ (from Shot 1)    │          │
│  │ (Qwen-2511)      │    SEAMLESS!       │                  │          │
│  │                  │                    └──────────────────┘          │
│  │ firstFrameUrl    │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                             │
│           ▼ Qwen I2I                                                    │
│  ┌──────────────────┐                                                   │
│  │ Last Frame       │                                                   │
│  │ lastFrameUrl     │                                                   │
│  └──────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Model Selection Matrix

| Scenario                               | Model                         | Reason                                  |
| :------------------------------------- | :---------------------------- | :-------------------------------------- |
| First shot, first frame (no reference) | `fal-ai/flux/dev`             | Clean T2I, LoRA support                 |
| Any I2I operation                      | `fal-ai/qwen-image-edit-2511` | Surgical editing, identity preservation |
| Creative inpainting/outpainting        | `fal-ai/flux-kontext/dev`     | Hallucination-friendly contextual fill  |
| Text/typography in frame               | `fal-ai/ideogram/v2`          | Best text rendering                     |
| Photorealistic hero shots              | `google/imagen-4`             | Google photorealism                     |

#### Negative Prompt Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  GLOBAL CLEANLINESS (Auto-prepended to all generations)        │
│  ──────────────────────────────────────────────────────────────│
│  ugly, deformed, disfigured, extra limbs, missing limbs,       │
│  fused fingers, watermark, text, signature, logo,              │
│  low quality, bad anatomy, blurry, noise, artifacts            │
├─────────────────────────────────────────────────────────────────┤
│  + SURGICAL REMOVAL (User-specified per shot)                  │
│  ──────────────────────────────────────────────────────────────│
│  (crowd:1.5), (background people:1.3), (bystanders:1.2)        │
│                                                                 │
│  Weight Scale:                                                  │
│  1.0 = normal    1.3 = strong    1.5 = aggressive              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step 7.5: Producer Agent - Cost Validation Gate

| Property      | Value                                                 |
| :------------ | :---------------------------------------------------- |
| **Component** | Producer Agent (Internal Process)                     |
| **API**       | `POST /api/projects/:projectId/render-queue/estimate` |
| **Tech**      | Cost calculation engine with user quota validation    |

> 🔐 **GATE: Producer Agent (Financial Gatekeeper)**
> Before any video generation can proceed, the Producer Agent validates the total cost against the user's budget/quota AND the project's Budget Cap (from Step 0).

**Validation Check:**

```json
{
  "sceneChainId": "...",
  "quality": "draft",
  "shotCount": 58,
  "estimatedCost": 14.5,
  "userQuota": 50.0,
  "quotaRemaining": 35.5,
  "projectBudgetCap": 20.0,
  "projectSpentToDate": 5.0
}
```

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF estimatedCost > quotaRemaining:                             │
│    → Render button DISABLED (Soft Block)                        │
│    → Warning: "Insufficient quota. Add credits or reduce shots" │
│                                                                 │
│  IF (projectSpentToDate + estimatedCost) > projectBudgetCap:    │
│    → Render button DISABLED (Hard Block)                        │
│    → Warning: "Budget Cap exceeded. Admin override required."   │
│                                                                 │
│  ELSE:                                                          │
│    → Render button ENABLED                                      │
│    → Proceed to Step 8                                          │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Function:** Prevents runaway costs by validating ALL 58 shots before the most expensive step (video generation)

---

### Step 8: Shot Studio - Video Sequence Render

| Property | Value                                                                     |
| :------- | :------------------------------------------------------------------------ |
| **Page** | `/projects/[id]/shot-studio`                                              |
| **API**  | `POST /api/projects/:projectId/scene-chains/:id/segments/:segId/generate` |
| **API**  | `POST /api/projects/:projectId/scene-chains/:id/generate` (batch)         |
| **Tech** | SVI (Stable Video Infinity) → RunPod Worker                               |

**Input (per segment):**

```json
{
  "mode": "image_to_video",
  "imageUrl": "segment.firstFrameUrl",
  "prompt": "segment.prompt + masterStyleContext",
  "duration": 5,
  "elementReferences": ["character.primaryImageUrl"],
  "falModel": "runpod/stable-video-infinity"
}
```

**Output:**

```json
{
  "outputUrl": "https://...generated-video.mp4",
  "status": "complete"
}
```

---

### Step 8.5: Dailies Review - Quality Control

| Property | Value                                                             |
| :------- | :---------------------------------------------------------------- |
| **Page** | `/projects/[id]/dailies` (or integrated into Shot Studio)         |
| **API**  | `GET /api/projects/:projectId/scene-chains/:id/continuity-report` |
| **Tech** | Temporal Coherence Analyzer                                       |

> 🔐 **GATE: Dailies QC Pass**
> Before footage proceeds to VFX, automated and manual QC must flag issues.

**Automated Checks:**

```json
{
  "continuityHeatmap": {
    "shot_01": { "score": 0.95, "status": "pass" },
    "shot_02": { "score": 0.72, "status": "warn", "issues": ["identity_drift"] },
    "shot_03": { "score": 0.88, "status": "pass" }
  },
  "temporalCoherence": {
    "flickerScore": 0.02,
    "motionConsistency": 0.91
  },
  "exceptionsLog": [{ "shotId": "shot_02", "issue": "identity_drift", "severity": "medium" }]
}
```

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF any shot has continuityScore < 0.70:                        │
│    → Flag shot for revision                                     │
│    → Add to Continuity Exceptions Log                           │
│                                                                 │
│  Manual Review:                                                 │
│    → Reviewer can mark shot as "Approved" or "Needs Revision"   │
│    → Only approved shots proceed to VFX                         │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Artifact:** `Continuity Exceptions Log` - database entries for shots requiring revision

---

## Phase 4: Post-Production & Delivery

### Step 9: VFX Suite - Fix & Enhance

| Property | Value                                               |
| :------- | :-------------------------------------------------- |
| **Page** | `/projects/[id]/process`                            |
| **Tech** | DiffCamera (Focus Rescue), InfCam (Virtual Reshoot) |

#### Available Operations

| Operation                 | API Route                        | Description                            |
| :------------------------ | :------------------------------- | :------------------------------------- |
| Virtual Reshoot (InfCam)  | `POST /api/vfx/reshoot`          | Re-render with new camera path         |
| Focus Rescue (DiffCamera) | `POST /api/vfx/rescue-focus`     | AI-powered deblurring                  |
| Motion Fix                | `POST /api/vfx/motion-fix`       | Stabilization + speed adjustment       |
| Magic Eraser              | `POST /api/process/magic-eraser` | Remove unwanted objects via inpainting |
| AI Reshoot                | Qwen-2511 re-edit                | Uses same continuity loop logic        |

**Output:** Fixed `segment.outputUrl` replaces original

---

### Step 9.5: Shot Lock Gate

| Property        | Value                                                                |
| :-------------- | :------------------------------------------------------------------- |
| **Component**   | Shot Lock (Admin Action)                                             |
| **API**         | `PUT /api/projects/:projectId/scene-chains/:id/segments/:segId/lock` |
| **Enforced By** | Role-based access (Admin/Owner only)                                 |

> 🔐 **GATE: Shot Lock**
> Once VFX is complete, Producer/Admin clicks "Shot Lock" to freeze the segment.

**Lock Payload:**

```json
{
  "segmentId": "...",
  "locked": true,
  "lockedBy": "user_admin",
  "lockedAt": "2024-01-15T14:30:00Z"
}
```

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF segment.locked === true:                                    │
│    → Regenerate buttons DISABLED                                │
│    → VFX operations DISABLED                                    │
│    → Only trim/audio adjustments allowed in Timeline            │
│                                                                 │
│  To unlock:                                                     │
│    → Requires Admin override with reason                        │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Function:** Prevents accidental regeneration of approved footage

---

### Step 10: Timeline/NLE - Assembly & Audio

| Property | Value                                                           |
| :------- | :-------------------------------------------------------------- |
| **Page** | `/projects/[id]/timeline`                                       |
| **API**  | `GET /api/projects/:projectId/sequencer/timeline/:sceneChainId` |

**Receives Clips:**

```json
{
  "clips": [
    {
      "id": "segment_id",
      "videoUrl": "segment.outputUrl",
      "duration": 5,
      "trimStart": 0,
      "trimEnd": 5,
      "audioTrimStart": 0,
      "audioTrimEnd": 6,
      "audioGain": 1.0,
      "locked": true
    }
  ]
}
```

#### Editing Operations

- Drag/drop reorder
- Trim video/audio separately
- **L-Cut:** Audio extends past video cut
- **J-Cut:** Audio starts before video
- Audio levels adjustment

**Saves via:**

```
PUT /api/projects/:projectId/scene-chains/:id/segments/:segId
{ trimStart, trimEnd, audioTrimStart, audioTrimEnd, audioGain }
```

---

### Step 10.5: Picture Lock Gate

| Property        | Value                                                        |
| :-------------- | :----------------------------------------------------------- |
| **Component**   | Picture Lock (Admin Action)                                  |
| **API**         | `PUT /api/projects/:projectId/scene-chains/:id/picture-lock` |
| **Enforced By** | Role-based access (Admin/Owner only)                         |

> 🔐 **GATE: Picture Lock**
> Once editorial is complete, Producer/Admin sets Picture Lock to freeze the edit.

**Lock Payload:**

```json
{
  "sceneChainId": "...",
  "pictureLocked": true,
  "lockedBy": "user_admin",
  "lockedAt": "2024-01-15T16:00:00Z"
}
```

**Gate Logic:**

```
┌─────────────────────────────────────────────────────────────────┐
│  IF sceneChain.pictureLocked === true:                          │
│    → Drag/drop reorder DISABLED                                 │
│    → Trim controls DISABLED                                     │
│    → Only audio levels allowed                                  │
│    → Export enabled                                             │
│                                                                 │
│  To unlock:                                                     │
│    → Requires Admin override with reason                        │
│    → Logs unlock event for audit trail                          │
└─────────────────────────────────────────────────────────────────┘
```

> ⚡ **Key Function:** Prevents edit changes after client/director approval

---

### Step 11: Render Queue - Multi-Pass Quality

| Property | Value                                             |
| :------- | :------------------------------------------------ |
| **API**  | `POST /api/projects/:projectId/render-queue/jobs` |

**Create Job:**

```json
{
  "sceneChainId": "...",
  "qualities": ["draft", "review", "master"],
  "burnInMetadata": true
}
```

#### Multi-Pass Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  DRAFT   │ ──▶ │  REVIEW  │ ──▶ │  MASTER  │
│  720p    │     │  1080p   │     │  4K      │
│  $0.05   │     │  $0.15   │     │  $0.50   │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     ▼                ▼                ▼
Quick review     Detailed        Final delivery
Iterate fast     feedback        Ship it!
```

**Promote Shot:**

```
POST /api/.../render-queue/jobs/:jobId/shots/:shotId/promote
{ "quality": "master" }
```

**A/B Compare:**

```
GET /api/.../render-queue/.../shots/:shotId/compare
{ "qualityA": "draft", "qualityB": "master" }
```

---

### Step 12: Delivery - Final Export

| Property | Value                                         |
| :------- | :-------------------------------------------- |
| **API**  | `POST /api/projects/:projectId/export/master` |
| **Tech** | FFmpeg (ProRes/H.264), YouTube API            |

> 🔐 **GATE: Final QC Check**
> Before export, system validates resolution and frame rate consistency.

**Pre-Export Validation:**

```json
{
  "resolutionConsistent": true,
  "frameRateConsistent": true,
  "audioSyncValid": true,
  "allShotsLocked": true,
  "pictureLockedConfirmed": true
}
```

**Input:**

```json
{
  "sceneChainId": "...",
  "format": "prores",
  "frameRate": 24,
  "resolution": "4k",
  "audioCodec": "pcm",
  "includeEDL": true,
  "includeSidecar": true
}
```

**Poll Status:**

```
GET /api/exports/jobs/:jobId
{ "status": "completed", "progress": 100 }
```

**Final Deliverables (Release Package):**

| Endpoint                             | Output        | Contents                          |
| :----------------------------------- | :------------ | :-------------------------------- |
| `GET /api/exports/:exportId/video`   | `Master.mov`  | ProRes 4K final video             |
| `GET /api/exports/:exportId/edl`     | `Master.edl`  | Edit Decision List for re-conform |
| `GET /api/exports/:exportId/sidecar` | `Master.json` | Full metadata + IP attribution    |
| `GET /api/exports/:exportId/epk`     | `EPK.zip`     | Electronic Press Kit bundle       |

**Sidecar JSON (IP & Provenance):**

```json
{
  "projectId": "...",
  "exportId": "...",
  "ownership": {
    "creator": "user_456",
    "organization": "Studio XYZ",
    "rights": "All rights reserved"
  },
  "vibeboardAttribution": {
    "version": "3.0",
    "generatedAt": "2024-01-15T18:00:00Z",
    "modelsUsed": ["flux-dev", "qwen-2511", "svi"],
    "totalCost": 18.50
  },
  "clips": [...]
}
```

---

## 🔗 Complete Data Flow Diagram

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         DATA FLOW MAP (v3.0 SOP)                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

STEP 0: Project Brief
    │
    ▼
    🔐 CONTRACT GATE: Budget Cap + Reference Pack required
    │
    ▼
STEP 1: Concept Input
    │
    ▼
    🔐 RAG GATE: Query Vector DB for style/genre references
    │
    ▼
STEP 2: Auto-Breakdown ──────────────────────────────────────────┐
    │                                                            │
    │  negativeElements[], orderIndex, assetManifest             │
    │                                                            │
    ├──────────────┬──────────────┬──────────────┐              │
    ▼              ▼              ▼              │              │
STEP 3:        STEP 4:        STEP 5:           │              │
Asset Bin      Character      Optics            │              │
(+Governance)  (+Style Bible) Engine            │              │
    │              │              │              │              │
    │          loraId,        masterCinematic   │              │
    │          triggerWord        │              │              │
    │          styleBible         │              │              │
    │              │              ▼              │              │
    │              │         🔐 STYLE LOCK      │              │
    └──────────────┴──────────────┘              │              │
                   │                             │              │
                   ▼                             ▼              │
              STEP 6: Storyboard ◀───────────────┘              │
              (Must have Master Cinematic)                       │
              Create Segments ◀──────────────────────────────────┘
                   │                             negativePrompt
                   │
                   ▼
              STEP 7: Qwen Continuity Loop
              ┌─────────────────────────────────────────────────┐
              │  Shot1.lastFrameUrl ──▶ Shot2.firstFrame source │
              │  (Seamless I2I transition)                      │
              └─────────────────────────────────────────────────┘
                   │
                   │  firstFrameUrl
                   ▼
              🔐 PRODUCER GATE: Validate cost vs quota + Budget Cap
              ┌─────────────────────────────────────────────────┐
              │  Soft Block: Quota exceeded                     │
              │  Hard Block: Budget Cap exceeded                │
              └─────────────────────────────────────────────────┘
                   │
                   ▼
              STEP 8: Video Generation (I2V)
                   │
                   │  segment.outputUrl
                   ▼
              🔐 DAILIES GATE: QC Pass (Continuity Heatmap)
              ┌─────────────────────────────────────────────────┐
              │  Auto-flag shots with score < 0.70              │
              │  Exceptions Log generated                       │
              └─────────────────────────────────────────────────┘
                   │
                   ▼
              STEP 9: VFX Suite (Fix)
                   │
                   │  fixed outputUrl
                   ▼
              🔐 SHOT LOCK: Admin freezes approved shots
                   │
                   ▼
              STEP 10: Timeline/NLE
                   │
                   │  trim data, audio sync
                   ▼
              🔐 PICTURE LOCK: Admin freezes final edit
                   │
                   ▼
              STEP 11: Render Queue
              ┌─────────────────────────────────────────────────┐
              │  Draft ──▶ Review ──▶ Master                    │
              │  (Recipe locked, seed inherited)                │
              └─────────────────────────────────────────────────┘
                   │
                   │  approved RenderPass.outputUrl
                   ▼
              🔐 FINAL QC: Resolution/FrameRate validation
                   │
                   ▼
              STEP 12: Final Export
              ┌─────────────────────────────────────────────────┐
              │  Master.mov + Master.edl + Master.json + EPK    │
              │  (With full provenance + IP attribution)        │
              │                                                  │
              │              🎬 THE FINAL MOVIE                  │
              └─────────────────────────────────────────────────┘
```

---

## 📋 Quick Reference: The Complete Checklist (with All Gates)

| Step | Module            | Action                              | Key Output                                | Gate                               |
| :--- | :---------------- | :---------------------------------- | :---------------------------------------- | :--------------------------------- |
| 0    | Project Settings  | Lock Creative Contract              | Budget Cap, Reference Pack                | 🔐 Contract Gate                   |
| 1    | Script Lab        | Concept input                       | Outline                                   | 🔐 RAG Gate                        |
| 2    | Script Lab        | Auto-breakdown                      | Scenes + negativeElements + assetManifest | -                                  |
| 3    | Asset Bin         | Deconstruct + Governance            | 3D assets with Sidecar JSON               | 🔐 Naming Schema                   |
| 4    | Character Foundry | Train LoRAs + Style Bible           | characterId + triggerWord + styleBible    | -                                  |
| 5    | Optics Engine     | Lock camera/lens                    | masterCinematic string                    | 🔐 Style Lock                      |
| 6    | Storyboard        | Export to SceneChain                | Segments with prompts                     | 🔐 Master Cinematic Required       |
| 7    | Storyboard        | Qwen Continuity Loop                | firstFrameUrl, lastFrameUrl               | -                                  |
| 7.5  | Producer Agent    | Validate cost vs quota + Budget Cap | GO/NO-GO decision                         | 🔐 Producer Gate (Soft/Hard Block) |
| 8    | Shot Studio       | Generate video sequences            | outputUrl (video)                         | -                                  |
| 8.5  | Dailies Review    | QC Pass                             | Continuity Exceptions Log                 | 🔐 Dailies Gate                    |
| 9    | VFX Suite         | Fix focus/identity/motion           | Fixed outputUrl                           | -                                  |
| 9.5  | Admin Action      | Shot Lock                           | Frozen segments                           | 🔐 Shot Lock                       |
| 10   | Timeline          | Assemble, L-Cut, sync               | Trim data                                 | -                                  |
| 10.5 | Admin Action      | Picture Lock                        | Frozen edit                               | 🔐 Picture Lock                    |
| 11   | Render Queue      | Draft → Review → Master             | Approved passes                           | -                                  |
| 12   | Delivery          | Export final                        | .mov + .edl + .json + EPK                 | 🔐 Final QC                        |

---

## 🔐 Complete Gate Summary

| Gate                          | Location  | Type        | Trigger                                        |
| :---------------------------- | :-------- | :---------- | :--------------------------------------------- |
| **Contract Gate**             | Step 0    | Hard Block  | Missing Budget Cap or Reference Pack           |
| **RAG Gate**                  | Step 1    | Enhancement | Auto-queries Vector DB before LLM              |
| **Naming Schema**             | Step 3    | Governance  | Enforces `SC##_SH##_TYPE_Name` convention      |
| **Style Lock**                | Step 5    | Hard Lock   | Disables Optics once chain references modifier |
| **Master Cinematic Required** | Step 6    | Soft Block  | Cannot generate without style context          |
| **Producer Gate (Soft)**      | Step 7.5  | Soft Block  | Quota exceeded                                 |
| **Producer Gate (Hard)**      | Step 7.5  | Hard Block  | Budget Cap exceeded (Admin override)           |
| **Dailies Gate**              | Step 8.5  | Flag        | Auto-flags shots with low continuity score     |
| **Shot Lock**                 | Step 9.5  | Hard Lock   | Admin locks approved shots                     |
| **Picture Lock**              | Step 10.5 | Hard Lock   | Admin locks final edit                         |
| **Final QC**                  | Step 12   | Validation  | Checks resolution/framerate consistency        |

---

## 🛡️ Launch Readiness & Governance

### A. Budget Guardrail Enforcement

**Soft Block (Quota):**

- User's account quota is insufficient
- User can add credits to proceed

**Hard Block (Budget Cap):**

- Project's Budget Cap would be exceeded
- Requires Admin override with logged reason

### B. Operational Logging

All failures are logged with unique `traceId` for debugging:

```json
{
  "traceId": "trace_abc123",
  "timestamp": "2024-01-15T14:30:00Z",
  "service": "RunPod",
  "error": "GPU timeout",
  "segmentId": "seg_456",
  "retryCount": 2
}
```

### C. IP Protection

All exported assets include metadata showing:

- **User ownership** (creator, organization)
- **VibeBoard attribution** (version, models used)
- **Provenance chain** (prompts, seeds, timestamps)

### D. Role-Based Access Control

| Role       | Permissions                              |
| :--------- | :--------------------------------------- |
| **Viewer** | View only, no generation                 |
| **Editor** | Generate, edit, VFX                      |
| **Admin**  | Shot Lock, Picture Lock, Budget Override |
| **Owner**  | Full access, delete project, export      |

---

## 🎯 Module Reference

| Module            | Primary Function               | Key Tech                 | Page/Route           |
| :---------------- | :----------------------------- | :----------------------- | :------------------- |
| Project Settings  | Creative Contract              | Budget Cap, Refs         | `/projects/[id]`     |
| Script Lab        | Concept → Prompts              | Claude 3.5, RAG, MiniMax | `/story-editor`      |
| Asset Bin         | 3D Deconstruction + Governance | 3D-RE-GEN, MVInverse     | `/assets`            |
| Character Foundry | Identity Lock + Style Bible    | FlashPortrait, LoRA      | `/character-foundry` |
| Optics Engine     | Camera Simulation + Style Lock | Cadrage, GenFocus        | `/optics-engine`     |
| Storyboard        | Frame Generation               | Qwen-2511, Flux Dev      | `/storyboard`        |
| Shot Studio       | Video Render                   | SVI, RunPod              | `/shot-studio`       |
| Dailies Review    | QC + Continuity Check          | Temporal Analyzer        | `/dailies`           |
| VFX Suite         | Fix & Enhance                  | DiffCamera, InfCam       | `/process`           |
| Timeline          | Edit & Assembly                | FFmpeg, L-Cut            | `/timeline`          |
| Render Queue      | Multi-Pass Export              | Draft/Review/Master      | `/render-queue`      |
| Delivery          | Final Output + EPK             | ProRes, EDL, Sidecar     | `/export`            |

---

## 📊 Key Artifacts Generated

| Artifact                      | Created At | Purpose                                |
| :---------------------------- | :--------- | :------------------------------------- |
| **Creative Contract**         | Step 0     | Locks budget and creative constraints  |
| **Asset Sidecar JSON**        | Step 3     | Full provenance for every asset        |
| **Style Bible**               | Step 4     | Freezes character/lighting rules       |
| **Master Cinematic Modifier** | Step 5     | Consistent look across all generations |
| **Continuity Exceptions Log** | Step 8.5   | Tracks shots needing revision          |
| **Release Package**           | Step 12    | Master.mov + EDL + Sidecar + EPK       |

---

_Generated for Vibeboard 3.0 Production SOP - Go-to-Market Ready_

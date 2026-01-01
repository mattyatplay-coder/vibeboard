# VibeBoard - AI Assistant Development Guide (Claude & Antigravity)

> [!IMPORTANT]
> **CRITICAL: READ BEFORE STARTING**
> This guide applies to ALL AI assistants, including **Claude** and **Antigravity**.
> Before proceeding with ANY new task in VibeBoard, you MUST read these files to ensure you are up to date:
> 1. `.agent/task.md` - Current task tracking with checkboxes
> 2. `.agent/agent_resolutions.json` - Detailed session logs and decisions
> 3. `README.md` - User-facing documentation
> 4. **`.claude/feature-registry.json`** - Protected features that require approval before modification
> 5. **`.claude/ui-component-registry.json`** - UI component layouts with screenshots (MANDATORY for UI work)
> 6. **`.agent/fix_registry.json`** - Past fixes with reproducible steps
> 7. **`.claude/feature-dna/*.json`** - Feature DNA files for recovery protocol

> [!CAUTION]
> **PROTECTED FEATURES - DO NOT MODIFY WITHOUT APPROVAL**
> Before editing ANY file, check if it's listed in `.claude/feature-registry.json`.
> If it is, you MUST:
> 1. Tell the user which protected feature will be affected
> 2. List what functionality might break
> 3. Get EXPLICIT approval before proceeding
> 4. After changes, verify all `doNotRemove` items still exist
>
> **Protected features include:** AI Feedback Learning, Character Consistency, Magic Eraser, Tattoo Compositing, Cinematic Tags, Character Foundry, Generation Service routing

> [!WARNING]
> **UI COMPONENTS - CHECK VISUAL REGISTRY FIRST**
> Before modifying ANY UI component (toolbar, modal, page layout), you MUST:
> 1. Read `.claude/ui-component-registry.json`
> 2. View the screenshot to see EXACTLY what it looks like
> 3. Check `doNotRemove` list for protected UI elements
> 4. Check `doNotAdd` list for things intentionally excluded
> 5. If status is "FROZEN", get EXPLICIT user approval
>
> **FROZEN components:** Generate Page Toolbar, Engine Library Modal, Smart Prompt Builder, Element Picker

## Feature Recovery Protocol (Dec 30, 2025)

> [!TIP]
> **SELF-DIAGNOSIS FOR MISSING/BROKEN FEATURES**
> When a user reports a feature is broken or missing, follow this protocol BEFORE asking for screenshots:

### Step 1: Check Feature DNA Files
```bash
# List all documented features
ls .claude/feature-dna/*.json
```
Each Feature DNA file contains:
- **files**: Frontend and backend source files
- **endpoints**: API routes used by the feature
- **keyFunctions**: Critical logic and implementation notes
- **expectedBehavior**: What the feature should do
- **doNotRemove**: Protected elements that must exist
- **recoveryHints**: Common issues and fixes

### Step 2: Verify File Existence
```bash
# Check if all files from the DNA exist
cat .claude/feature-dna/{feature-name}.json | grep -A20 '"files"'
```

### Step 3: Check Backup if Files Missing
**Backup Location**: `/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup`

```bash
# Restore from backup
cp "/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup/path/to/file" /path/to/main/repo
```

### Step 4: Check Memory MCP
Query the Memory MCP for feature entities:
```
mcp__memory__search_nodes: query = "Feature DNA: {feature-name}"
```

### Backup Sync Script
After completing new features or fixes, run:
```bash
.claude/scripts/sync-to-backup.sh           # Sync all modified files
.claude/scripts/sync-to-backup.sh --dry-run # Preview what would sync
.claude/scripts/sync-to-backup.sh path/file  # Sync specific file
```

### Available Feature DNA Files
| Feature | DNA File |
|---------|----------|
| Magic Eraser | `.claude/feature-dna/magic-eraser.json` |
| Generation Card | `.claude/feature-dna/generation-card.json` |
| Character Foundry | `.claude/feature-dna/character-foundry.json` |
| Shot Navigator | `.claude/feature-dna/shot-navigator.json` |
| Virtual Gaffer | `.claude/feature-dna/virtual-gaffer.json` |
| Visual Librarian | `.claude/feature-dna/visual-librarian.json` |
| Engine Library Modal | `.claude/feature-dna/engine-library-modal.json` |


## Project Overview
VibeBoard is an AI video generation platform with multi-provider orchestration.

## Product Bible (Dec 31, 2025)
*Full document: `VIBEBOARD_PRODUCT_BIBLE.md`*

### Core Doctrine
1. **Script Lab is the Gravitational Center, not a Gate** - Orient users around story to prevent "blank canvas paralysis," but never block experts from jumping to specific tools.
2. **The "Producer" Speaks in Trade-offs** - Make cost/time/quality consequences visible *before* execution, never forbid bad decisions.
3. **Outcome > Mechanism** - Top layer shows Tone/Pacing/Realism; hide Seeds/Schedulers/CFG. Never show technical slider if creative toggle works.
4. **Vertical Integration** - We are a **Studio OS**, not an API wrapper. Own the compute (RunPod) and storage (R2).

### The Canonical Workflow ("The Spine")
| Step | Department | Purpose | Output |
|------|------------|---------|--------|
| 1 | **Script Lab** | Development | Scene Manifest (JSON) |
| 2 | **Asset Bin** | Art Dept | Filled Slots (linked files) |
| 3 | **Character Foundry** | Casting | Trained LoRAs & Performances |
| 4 | **Optics Engine** | Pre-Viz | Global Look LUT |
| 5 | **Shot Studio** | Production | Coverage (Raw Clips) |
| 6 | **VFX Suite** | Post-Prod | Finals (fixed glitches) |
| 7 | **Sequencer** | Editorial | Master File (.mp4) |

### Implementation Roadmap
| Phase | Name | Status | Key Tech |
|-------|------|--------|----------|
| 1 | Script Lab | ✅ COMPLETE | MiniMax M2.1 Agent |
| 2 | Foundry | ✅ COMPLETE | FlashPortrait, RunPod Worker |
| 3 | Asset Bin | 🟡 IN PROGRESS | 3D-RE-GEN, MVInverse |
| 4 | Shot Studio | ⚪ PLANNED | Spatia, ReCo, Learn2Refocus |
| 5 | VFX & Sequencer | ⚪ PLANNED | InfCam, DiffCamera |

### UI/UX Design Language
- **Palette**: Zinc 950 (`#09090b`) background, no pure black
- **Depth**: 1px borders (`white/10`), not drop shadows
- **Typography**: Inter (UI) + JetBrains Mono (Data/Timecode)
- **Hierarchy**: Creative=Violet (`#8b5cf6`), Technical=Cyan (`#22d3ee`), Destructive=Red (`#ef4444`)

## Production Architecture (Dec 30, 2025)

| Component | Host | URL | Notes |
|-----------|------|-----|-------|
| **Frontend** | Mac Mini | `https://vibeboard.studio` | Next.js via Cloudflare Tunnel |
| **Backend** | Render | `https://api.vibeboard.studio` | Express API, PostgreSQL |
| **GPU Worker** | RunPod | Serverless endpoint | NVIDIA L40, video generation |
| **Database** | Render | PostgreSQL | Production database |
| **Storage** | Local | `/data` volume | Mac Mini filesystem |

### RunPod GPU Configuration
- **Endpoint ID**: `6rg1i2nzxxugti` (vibeboard-gpu-v2)
- **Template**: `ejuyp43ar5`
- **Docker Image**: `mattydc/vibeboard-gpu-worker:v2-async-fix`
- **GPU**: NVIDIA L40 (48GB VRAM)
- **Idle Timeout**: 15 minutes (900 seconds)
- **Handler**: `runpod_handler.py` with `asyncio.run()` wrapper

### Environment Variables (Backend on Render)
```bash
RUNPOD_ENDPOINT_ID=6rg1i2nzxxugti
RUNPOD_API_KEY=rpa_...
GPU_WORKER_MODE=runpod
```

### AI Bot Access (Dec 30, 2025)
To allow AI bots (ChatGPT, Google AI Studio, Claude) to access vibeboard.studio:

**Problem**: Development mode (`npm run dev`) uses React Server Components streaming that AI bots can't parse.

**Solution**: Run frontend in production mode:
```bash
# On Mac Mini, use production mode:
./start-vibeboard.sh --prod

# Or manually:
cd frontend
npm run build
npm run start
```

**Endpoints for AI services**:
- `https://api.vibeboard.studio/robots.txt` - AI-friendly robots.txt
- `https://api.vibeboard.studio/api/info` - JSON API documentation

## Local Development Architecture
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS 4) - Port 3000
- **Backend**: Node.js (Express, TypeScript, Prisma) - Port 3001
- **Database**: SQLite (dev)
- **Storage**: Local filesystem (`/data` volume)

## Key Directories
```
frontend/
├── src/app/                    # Next.js App Router pages
│   ├── projects/[id]/          # Project detail pages
│   │   ├── storyboard/         # Storyboard editor
│   │   └── story-editor/       # Script-to-storyboard pipeline
│   ├── generate/               # Generation interface
│   └── train/                  # LoRA training
├── src/components/
│   ├── storyboard/             # Shot, scene, timeline components
│   ├── loras/                  # LoRA management
│   ├── prompts/                # Prompt builder, negative prompts
│   └── generation/             # Generation cards, engine selectors
└── src/data/                   # Static data (CameraPresets, CinematicTags)

backend/
├── src/controllers/            # Request handlers
├── src/services/               # Business logic
│   ├── llm/                    # LLM provider adapters (Grok, OpenAI, GLM)
│   └── prompts/                # Smart prompt enhancement
├── src/routes/                 # Express routes
└── prisma/                     # Database schema
```

## AI Providers
- **Image Generation**: Fal.ai, Replicate, Together AI, OpenAI, Google, HuggingFace, Civitai, ComfyUI
- **Video Generation**: Fal.ai (Wan, Kling, Veo, Luma, MiniMax, LTX)
- **LLM/Vision**: Grok (primary), OpenAI, Zhipu GLM

## Key Patterns

### Side Panel Modals
Many feature modals use a side panel pattern with `activeManager` state:
```typescript
const [activeManager, setActiveManager] = useState<'lora' | 'sampler' | 'scheduler' | 'tags' | null>(null);
```
Modals appear alongside main content using AnimatePresence with `embedded={true}` prop.

### Generation Flow
1. User configures prompt, model, parameters
2. Frontend calls `/api/generate`
3. Backend routes to appropriate provider adapter
4. Real-time status updates via polling
5. Results saved to project elements

### Cinematic Tags System (UI-001, UI-002)
Located in `frontend/src/data/CinematicTags.ts` with 7 categories (~165 tags):
- **Cameras**: Digital Cinema, IMAX, Film, Phones & Consumer, Specialty, Vintage
  - Phones: iPhone 17 Pro, iPhone 16 Pro, Samsung S25 Ultra, Google Pixel 10 Pro
- **Lenses**: Anamorphic, Vintage Primes, Modern Primes, Specialty, Focal Length
- **Film Stock**: Kodak Motion/Still, Fujifilm, Black & White, Experimental
- **Color Grade**: Hollywood, Vintage, Stylized, Natural, Social Media Filters, Creative
  - Social: Instagram (Valencia, Clarendon, Juno), TikTok Beauty, VSCO, Snapchat
- **Lighting**: Portrait, Cinematic, Natural, Practical, Stylized
- **Motion**: Static, Zoom, Dolly, Crane, Pan/Tilt, Orbit, Specialty, Speed
- **Mood**: Positive, Negative, Intense, Subtle, Atmospheric

Modal component: `frontend/src/components/storyboard/CinematicTagsModal.tsx`

## Development Commands
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev

# Tests
cd frontend && npm test

# Database
cd backend && npx prisma migrate dev
```

## Approval Gate Protocol
**Strict verification required before marking any task as "READY".**

### 1. Definition of READY
> You may only mark work as **READY FOR APPROVAL** if you have executed the required commands and **pasted the relevant terminal output**.
> If you cannot execute commands, you must mark the result as **UNVERIFIED** and provide a copy/paste command checklist.

### 2. Absolute Rules
- Never claim "tested/verified/ready" without command output.
- Any non-zero exit code = **NOT READY**.
- Failing placeholder tests must be fixed or explicitly documented/replaced before claiming readiness.

### 3. Required Checks & Approval Gate
**The definitive source for required checks and approval protocols is located at:**
`/Users/matthenrichmacbook/Antigravity/approval.gate.json`

You MUST refer to this file for:
- Exact list of mandatory commands for Frontend and Backend.
- Conditional checks (e.g. for auth changes).
- The exact JSON/Markdown structure required for the "Approval Gate" block in your final response.

> **Rule**: Do not rely on simplified lists here. Always check `approval.gate.json` for the current breakdown.


### 4. Proof Format
End every task with:
```markdown
# Verification Results
- Frontend: npm run build PASS/FAIL (paste output tail)
- Frontend: npm run lint PASS/FAIL
- Frontend: npm run test PASS/FAIL (Playwright)
- Backend: npm run build PASS/FAIL
- Backend: npm run dev PASS/FAIL + curl response
- Backend: npm test PASS/FAIL (or explanation)
- System: /restart_servers + /verify_server_health PASS/FAIL
- System: Browser Load Check PASS/FAIL

# Approval Gate
- Status: READY FOR APPROVAL | UNVERIFIED
```

## Documentation Files
- `.agent/task.md` - Current task tracking with checkboxes
- `.agent/agent_resolutions.json` - Detailed session logs and decisions
- `README.md` - User-facing documentation

## Recent Additions (Dec 2025)
- Cinematic Tags modal with category filtering (UI-001)
- Phones & Consumer cameras + Social Media Filters (UI-002)
- Vision LLM comparison (Grok recommended over OpenAI/GLM)
- IP-Adapter integration for character consistency
- Story Editor with running length tracking

## Experimental Frontend Sandbox (Dec 18, 2025)
A dedicated environment for testing UI/UX changes without risking the main application.
- **Location**: `frontend-experimental/` (Clone of main)
- **Port**: `3005` (Runs alongside main app on `3000`)
- **Workflow**: Run `/start_experimental_frontend` to launch.
- **Safety**: Shares the same database (data is shared), but code is isolated.

## UI Restoration & Polish (Dec 18, 2025)
- **Glass Studio Theme**: Full "Midnight & Neon" redesign with glassmorphism.
- **Generate Page**: Restored Element Picker, Model Library (Sparkles icon), and original Toolbar layout.
- **Prompts**: Fixed "Smart Prompt Builder" LoRA chip overflow issues.

## QA & Infrastructure (Dec 19, 2025)
- **Comprehensive Model Audit**: Ongoing evidence-driven audit of 52+ models (Visual & Backend).
- **Backend Reliability**: Fixed TypeScript startup errors in `FalAIAdapter`.
- **MCP Integration**: Installed Replicate MCP server for Claude Desktop.
- **MCP Integration**: Installed Replicate MCP server for Claude Desktop.
- **Model Registry**: Generated comprehensive `vibeboard_models.csv` and capability matrix.

## Production Hardening & Foundry (Dec 19, 2025)
- **Startup Stability**: Added `start-vibeboard.sh` with external drive checks to prevent crashes.
- **Security**: Rotated OpenRouter keys and enforced `.gitignore` for `.env`.
- **Character Foundry**: Validated `kling-image/o1` integration for synthetic datasets.
- **UI Fixes**: Refactored training file inputs to use semantic HTML for reliable uploads.

## Character Consistency System (Dec 2025)

### Available Character Consistency Models

| Model | Provider | Best For | Method |
|-------|----------|----------|--------|
| `fal-ai/ideogram/character` | Fal.ai | Character sheets/turnarounds | `FalAIAdapter.generateCharacterSheet()` |
| `fal-ai/flux-kontext/dev` | Fal.ai | Character-consistent editing | `FalAIAdapter.generateWithKontext()` |
| `fal-ai/flux-kontext/pro` | Fal.ai | Premium character consistency | `FalAIAdapter.generateWithKontext()` |
| `fal-ai/ip-adapter-face-id` | Fal.ai | Face identity preservation | `FalAIAdapter.generateWithFaceID()` |
| `fofr/consistent-character` | Replicate | Multi-pose generation | `ReplicateAdapter.generateConsistentCharacter()` |

### Character Consistency Workflow

**Layer 1 - Base Identity**: Custom LoRA or trigger words
**Layer 2 - Reference Injection**: IP-Adapter, ControlNet, Element References (up to 4)
**Layer 3 - Post-Processing**: Face swap, PuLID, InstantID

### Key Methods

```typescript
// FalAIAdapter - Character sheet generation
await falAdapter.generateCharacterSheet({
    prompt: "character turnaround sheet, front/back/side views",
    elementReferences: ["reference-image-url"],
    aspectRatio: "1:1"
});

// FalAIAdapter - Flux Kontext (character transfer to new scenes)
await falAdapter.generateWithKontext({
    prompt: "the character playing in a park",
    elementReferences: ["character-reference-url"],
    model: "fal-ai/flux-kontext/pro",
    kontextMode: "character_transfer"
});

// ReplicateAdapter - Consistent character poses
await replicateAdapter.generateConsistentCharacter(
    "reference-image-url",
    { prompt: "various poses", count: 4 }
);

// ReplicateAdapter - Turnaround sheet (front/left/back/right)
await replicateAdapter.generateCharacterTurnaround(
    "reference-image-url",
    { prompt: "Pixar 3D style character" }
);
```

### IP-Adapter Strength Formula
Located in `FalAIAdapter.ts:266`:
```typescript
// 0% slider = 0.2 weight (hints only)
// 50% slider = 0.5 weight (balanced)
// 100% slider = 0.8 weight (strong consistency)
const ipWeight = 0.2 + (elementStrength * 0.6);
```

### Element Reference System
- Supports up to 4 character references per generation
- Per-element strength control via `ElementReferencePicker.tsx`
- Use `@Image1-4` syntax in prompts for Kling O1

### Video Models with Character Reference Support
- **Kling O1**: 4 reference images via `elementReferences`
- **Vidu Q2**: Up to 7 reference images
- **Wan 2.5**: Single image-to-video reference

## Worktree Sync Protocol

**CRITICAL**: Dev servers (frontend:3000, backend:3001) run from the **MAIN REPO**, not worktrees!

### Why Changes Don't Appear in Browser
When working in a worktree, changes are isolated. The running servers watch the **main repo** files, not worktree files. You MUST copy modified files to the main repo for them to take effect.

```bash
# Copy worktree file to main repo (required for changes to appear!)
cp /path/to/worktree/frontend/src/file.tsx /Users/matthenrichmacbook/Antigravity/vibeboard/frontend/src/file.tsx

# Clear Next.js cache after copying
rm -rf /Users/matthenrichmacbook/Antigravity/vibeboard/frontend/.next/cache
```

### Server Locations
| Component | Location | Port |
|-----------|----------|------|
| Frontend Dev Server | `/Users/matthenrichmacbook/Antigravity/vibeboard/frontend` | 3000 |
| Backend Dev Server | `/Users/matthenrichmacbook/Antigravity/vibeboard/backend` | 3001 |

### Before Starting Work in a Worktree

```bash
# Check if you're in a worktree
git worktree list

# If in a worktree, sync with main repository
cd /Users/matthenrichmacbook/Antigravity/vibeboard  # Main repo
git fetch origin
git status  # Check for any pending changes

# Then update your worktree
cd /path/to/your/worktree
git fetch origin
git rebase origin/main  # Or merge, depending on preference
```

### Main Repository Location
- **Main repo**: `/Users/matthenrichmacbook/Antigravity/vibeboard`
- **All testing should run from the main directory**
- **All servers run from the main directory**

### Worktree Best Practices
1. Always pull latest from main before branching
2. Keep worktree branches short-lived
3. Sync frequently to avoid merge conflicts
4. **Copy files to main repo after editing for live preview**

## Tattoo Compositing Engine (Dec 2025)
**Service**: `backend/src/services/processing/TattooCompositingService.ts`
**Library**: `sharp`
**UI**: `frontend/src/components/processing/TattooPlacementPanel.tsx`
**Route**: `POST /api/process/tattoo-composite`

### Key Features
1. **Geometry**: Resizes and positions tattoo based on `widthRatio` and vertical/horizontal offsets.
2. **Ink Bleed**: Applies subtle Gaussian blur to mimic ink spreading in skin.
3. **Luminance Keying**: White-background designs (tattoo flash) are automatically converted to black ink with proper alpha.
4. **Opacity Control**: User-adjustable opacity slider (default 85%).

### Parameters (FormData)
- `base_image`: File - The skin/body photo
- `tattoo_image`: File - The tattoo design (PNG, ideally with transparency)
- `xOffset`: number - Horizontal shift from center (default 60)
- `widthRatio`: number - Scale relative to base width (default 0.4)
- `opacity`: number - Ink opacity 0.1-1.0 (default 0.85)
- `blur`: number - Ink bleed radius (default 0.8)
- `removeBackground`: boolean - Force white→transparent keying

### Critical Fixes (Dec 2025)
- **Black Ink for Keyed Designs**: When processing white-background tattoos, the service now creates black RGB ink instead of using the original white colors. This prevents washed-out composites.
- **Simplified Compositing**: Removed texture overlay (`soft-light` blend) which was causing overall image darkening. Simple `over` blend produces cleaner results.
- **Color Space Enforcement**: Final output is strictly converted to `sRGB` to prevent darkening/washout from mismatched display profiles (e.g., Apple Display P3).

## Magic Eraser / Inpainting (Dec 2025)
**Service**: `backend/src/services/processing/InpaintingService.ts`
**Model**: `fal-ai/object-removal/mask` (Fal.ai)
**UI**: `frontend/src/components/processing/MagicEraserPanel.tsx`
**Route**: `POST /api/process/magic-eraser`

### Key Features
1. **Brush-based Mask Painting**: Native DOM event listeners for smooth drawing (bypasses React re-render issues)
2. **Mask Dimension Scaling**: Automatically scales painted mask to match original image dimensions (required by Fal.ai)
3. **Binary Mask Generation**: Converts red painted areas to white-on-black binary mask
4. **Iterative Editing**: Result becomes new base image for multi-pass removal

### Parameters (FormData)
- `image`: File - The source image
- `mask`: File - Binary mask PNG (white = areas to remove, black = preserve)
- `prompt`: string - Optional guidance text (default: "clean skin, high quality, natural texture")

### Technical Implementation
- **Canvas Drawing**: Uses native `addEventListener` instead of React synthetic events to prevent re-render clearing
- **Dimension Refs**: `dimensionsRef` and `originalDimensionsRef` store sizes without triggering re-renders
- **Brush Cursor**: DOM-manipulated cursor overlay for real-time brush preview
- **Mask Processing**:
  1. Draw at display dimensions with red semi-transparent strokes
  2. Convert to binary (alpha > 0 → white, else black)
  3. Scale up to original image dimensions using nearest-neighbor interpolation
  4. Send to Fal.ai object-removal/mask model

### Fal.ai Object Removal API
```typescript
const result = await fal.subscribe("fal-ai/object-removal/mask", {
    input: {
        image_url: imageUrl,
        mask_url: maskUrl,
        model: "best_quality",  // Options: low_quality, medium_quality, high_quality, best_quality
        mask_expansion: 10      // Pixels to expand mask (0-50)
    }
});
```

## Character Foundry - Synthetic Dataset Generation (Dec 2025)
**Service**: `backend/src/services/training/DatasetGeneratorService.ts`
**Model**: `fal-ai/flux-2-max/edit` (Fal.ai)
**UI**: `frontend/src/app/projects/[id]/train/page.tsx`
**Route**: `POST /api/training/jobs/:id/generate-dataset`

### Overview
Character Foundry generates synthetic training datasets from a single "golden record" image. It produces 18-20 pose variations with consistent character identity, suitable for training character LoRAs.

### Key Features
1. **Single Image → Full Dataset**: Upload one high-quality reference image, get 20 pose variations
2. **Pose Presets**: Clothing/style-aware pose sets (swimwear, casual, formal, anime, etc.)
3. **Dynamic Aspect Ratios**: Automatic aspect ratio selection based on shot type
4. **Auto-Captioning**: Vision LLM analyzes source image if no description provided
5. **Style Preservation**: Anime/cartoon presets include style prefixes

### Pose Presets
| Preset | Best For | Pose Count |
|--------|----------|------------|
| `universal` | Any character - no clothing-specific poses | 20 |
| `swimwear` | Bikini, underwear, shirtless - no pockets | 19 |
| `casual` | T-shirts, jeans - includes pockets | 21 |
| `formal` | Suits, business attire - professional poses | 18 |
| `fantasy` | Armor, warriors - combat/heroic poses | 21 |
| `anime` | 2D anime style - exaggerated expressions | 22 |
| `cartoon` | Mascots, chibi - simple poses | 18 |
| `pixar3d` | Pixar/Disney 3D style - expressive eyes, soft lighting | 23 |

### Surfer/Action Presets (Dec 2025)
**ACTION POSES ONLY** - No turnaround angles (use base character LoRA for those)

| Preset | Style | Best For | Pose Count |
|--------|-------|----------|------------|
| `pixar3d_surfer` | Board shorts | Koa, Matt - beach surfing action | 27 |
| `pixar3d_surfer_wetsuit` | Full wetsuit | Chase Maddox - pro competition action | 27 |
| `pixar3d_surfer_kid` | Casual | Mylin - prodigy action + still developing | 34 |

**Key Features:**
- Pure action: surfing moves, paddling, tube riding, aerials
- No turnaround angles (base LoRA handles identity)
- Stack with character LoRA: `ohwx_koa` + action prompt
- Competition, emotional, and off-water moments

### Animal Action Presets (Dec 2025)
**ACTION POSES ONLY** - Use with base animal LoRA

| Preset | Category | Best For | Pose Count |
|--------|----------|----------|------------|
| `pixar3d_sea_turtle` | Aquatic | EAC current riding, Crush expressions | 23 |
| `pixar3d_aquatic` | Aquatic | Fish, dolphins, whales, sharks, octopi | 24 |
| `pixar3d_quadruped` | Land | Dogs, cats, lions, horses, deer | 25 |
| `pixar3d_avian` | Flying | Parrots, eagles, owls, penguins | 25 |
| `pixar3d_reptile` | Cold-blooded | Lizards, snakes, crocodiles, geckos | 25 |

**Key Features:**
- Locomotion-based categories (swimming, walking, flying, crawling)
- Pixar-style expressive faces and poses
- Species-appropriate movements and expressions
- Environmental context (underwater lighting, basking warmth, etc.)

### Pixar 3D Style (Dec 2025)
Added from ComfyUI workflow analysis (`【FLUX】3D pixar style_Workflow.json`):
- **LoRA**: Jixar (Civitai 650251) - trigger word `ohwx_pixar`
- **Recommended Settings**: Euler sampler, Simple scheduler, 20 steps, 1024x1024
- **Prompt Structure**: `[Age/Gender] [Hair description], [Age], [Clothing], [Action], [Setting/Background]`
- **Style Prefix**: "3D Pixar animation style, smooth rounded features, expressive large eyes, soft cinematic lighting"
- **Database ID**: `e86f011c-c7d4-44ad-9e23-e6e4f0624e97`

### API Endpoints
```typescript
// Get available presets
GET /api/training/pose-presets
// Response: { presets: [{ key, name, description }] }

// Generate dataset
POST /api/training/jobs/:id/generate-dataset
// FormData: source_image, projectId, triggerWord, characterDescription?, posePreset?
```

### Technical Implementation
- **Model**: Flux 2 Max via `fal-ai/flux-2-max/edit` with `image_urls` for reference
- **Direction Language**: Uses frame-relative terms ("nose pointing toward left edge of frame") instead of "facing left/right" to avoid model confusion
- **Framing Language**: Explicit cropping instructions ("no legs visible", "cropped at chest") to override full-body reference
- **Aspect Ratios**:
  - Close-up: 1:1 (square)
  - Medium shot: 3:4
  - Full body: 9:16

### Prompt Format
```
[character description], [pose instruction], white background
```

### Dataset Output
- Location: `backend/datasets/synthetic_{jobId}/`
- Images: `gen_00_front_view.png`, `gen_01_three-quarter_view.png`, etc.
- Captions: `gen_00_front_view.txt` with format `{triggerWord}, {description}`

### Workflow
1. User uploads single high-quality reference image
2. Selects pose preset appropriate for clothing/style
3. Optionally provides character description (or auto-caption)
4. System generates 18-22 variations with Flux 2 Max
5. User reviews dataset, can edit images in Photoshop
6. User starts training with reviewed dataset

### Editing Generated Images
Generated images can be edited in external tools (Photoshop, etc.) before training:
1. Open image from `datasets/synthetic_{jobId}/` folder
2. Make edits (remove artifacts, fix details)
3. Save to same filename
4. Start training - system uses current folder contents

## Notes
- Prefer Grok for vision tasks (2x faster than OpenAI)
- Camera presets in `CameraPresets.ts`, cinematic tags in `CinematicTags.ts`
- LoRA manager size: `w-[700px] h-[90vh]` embedded
- Tags modal size: `w-[500px] h-[90vh]` embedded

## Common Issues & Solutions (Extracted from Session History)

### Server & Deployment Issues
| Issue | Solution |
|-------|----------|
| Changes not appearing in browser | Copy files from worktree to main repo, clear `.next/cache` |
| Server needs restart to pick up changes | Run `npm run dev` in the appropriate directory |
| MCP servers not loading | Completely restart Claude Code (not just `/exit`) |

### Generation API Issues
| Issue | Solution |
|-------|----------|
| `count` vs `variations` parameter | Use `variations` not `count` for batch generation |
| `model` at top level vs `falModel` | Pass model inside `falModel` property |
| `image_url` vs `image_urls` | Fal.ai uses `image_urls` (array) for references |
| OpenAI Sora returns 'queued' | It's async - poll `predictions.get` for completion |
| Custom LoRA not routing correctly | Add to `MODEL_TO_PROVIDER_MAP` in GenerationService.ts |

### UI Component Issues
| Issue | Solution |
|-------|----------|
| Modal category resets on open | Store selection in parent, pass via `initialCategory` |
| Duration dropdown not showing | Check `mode === 'video'` condition in visibility logic |
| Character & Avatar filter not working | Filter uses `model.capability` not `model.type` |

### Magic Eraser / Inpainting Issues
| Issue | Solution |
|-------|----------|
| AI focusing on wrong element | Mask coverage too small - use larger brush |
| Thin objects leaving ghost edges | Increase mask_expansion to 15-20px |
| Brush too small for task | Default brush should be 15-20px, not 7px |

### Key Files for Common Tasks
| Task | Primary Files |
|------|---------------|
| Add new model | `ModelRegistry.ts`, `GenerationService.ts`, relevant Adapter |
| Fix generation routing | `GenerationService.ts` (MODEL_TO_PROVIDER_MAP) |
| Update UI components | Component file + check parent for prop types |
| Debug API calls | Controller → Service → Adapter chain |

## Automated Resource Context (Grok Vision & Prompt Builder)

### KnowledgeBaseService (New Dec 2025)
Located in `backend/src/services/knowledge/KnowledgeBaseService.ts`.
- **Purpose**: Aggregates all model capabilities (from code) and LoRA metadata (from DB) into a unified context.
- **Provider**: Singleton service accessible via `KnowledgeBaseService.getInstance()`.

### Grok Integration
The `GrokAdapter` now automatically injects global resource context into the system prompt for:
- **Image/Text Generation**: Grok knows about all registered models and their styles.
- **Vision Analysis**: When analyzing images, Grok is aware of available LoRAs that might match the style.

### Prompt Builder Integration
- **Route**: `POST /api/prompts/enhance`
- **Logic**: Automatically resolves LoRA trigger words and metadata from the database using `KnowledgeBaseService` if only an ID is provided.
- **Benefit**: Frontend does not need to send full LoRA objects; IDs are sufficient.

### usage Example (Backend)
```typescript
import { KnowledgeBaseService } from '../services/knowledge/KnowledgeBaseService';

// Get context string for LLM system prompt
const context = await KnowledgeBaseService.getInstance().getGlobalContext();

// Resolve LoRA by ID
const lora = await KnowledgeBaseService.getInstance().getLoRAById("lora-123");
```

## Custom Replicate LoRA Support (Dec 2025)

### Overview
VibeBoard now supports custom-trained Replicate LoRA models (e.g., Flux LoRAs trained via `replicate/fast-flux-trainer` or `ostris/flux-dev-lora-trainer`).

### Key Files Modified
- `backend/src/services/GenerationService.ts` - Model routing
- `backend/src/services/generators/ReplicateAdapter.ts` - Replicate API calls

### Adding New Custom LoRAs

**Step 1: Add to Model-to-Provider Map** (`GenerationService.ts` ~line 855)
```typescript
// Custom trained Replicate LoRA models
'mattyatplay-coder/angelicatraining': 'replicate',
'mattyatplay-coder/angelicatraining:d91b41c61d99d36b8649563cd79d8c2d83facd008199030c51952c5f13ea705a': 'replicate',
'your-username/your-model': 'replicate',
```

**Step 2: Add Version Mapping** (`ReplicateAdapter.ts` ~line 72)
```typescript
const customModelVersions: Record<string, string> = {
    'mattyatplay-coder/angelicatraining': 'mattyatplay-coder/angelicatraining:d91b41c61d99d36b8649563cd79d8c2d83facd008199030c51952c5f13ea705a',
    'your-username/your-model': 'your-username/your-model:full-64-char-version-hash',
};
```

### How to Find Version Hash
```bash
# List your trainings
curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    https://api.replicate.com/v1/trainings | jq '.results[].output.version'

# Or get specific model version
curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
    https://api.replicate.com/v1/models/your-username/your-model/versions | jq '.results[0].id'
```

### API Usage
```bash
# Create generation with custom LoRA
curl -X POST 'http://localhost:3001/api/projects/{projectId}/generations' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputPrompt": "ohwx_trigger_word your prompt here",
    "falModel": "your-username/your-model",
    "aspectRatio": "9:16",
    "mode": "text_to_image"
  }'
```

### Technical Details
- **Model Detection**: Any model starting with your username namespace (e.g., `mattyatplay-coder/`) or containing a version hash is detected as custom LoRA
- **Version Resolution**: Short model names are automatically resolved to full version-pinned format
- **Output Handling**: Supports both URL strings and ReadableStream outputs (binary saved to `uploads/`)
- **Default Parameters**: Uses Flux Dev base, 28 inference steps, guidance_scale 3, lora_scale 1

### Registered Custom LoRAs
| Model | Version | Trigger Word |
|-------|---------|--------------|
| `mattyatplay-coder/angelicatraining` | `d91b41...` | `ohwx_angelica` |
| `mattyatplay-coder/angelica` | `85fb80...` | `ohwx_angelica` |

## AI Feedback Learning System (Dec 19, 2025)

### Overview
A learning system that collects user feedback on AI analysis results and uses past corrections to improve future analyses. Implements thumbs up/down feedback on both Generation Card analysis and Magic Eraser AI recommendations.

### Key Files
- **`backend/src/services/AIFeedbackStore.ts`** - Singleton store for feedback and learned patterns
- **`backend/src/services/learning/AnalysisService.ts`** - Grok Vision analysis with learned hints injection
- **`frontend/src/components/generations/GenerationCard.tsx`** - Feedback UI for generation analysis
- **`frontend/src/components/processing/MagicEraserPanel.tsx`** - Feedback UI for eraser recommendations

### Data Storage
- **Feedback Log**: `backend/data/ai_feedback.json` - All thumbs up/down entries with corrections
- **Learned Patterns**: `backend/data/ai_patterns.json` - Extracted patterns from negative feedback

### FeedbackEntry Interface
```typescript
interface FeedbackEntry {
    id: string;
    timestamp: string;
    isHelpful: boolean;
    maskPosition: string;  // 'generation-analysis' for Generation Cards, position-based for Magic Eraser
    aiReasoning: string;   // What the AI said
    userCorrection?: string; // What the user actually wanted
    objectType?: string;   // tattoo, bikini, blemish, etc.
}
```

### Architecture Flow
```
User Feedback → AIFeedbackStore.addFeedback()
                      ↓
              learnFromMistake() (if negative)
                      ↓
              patterns.json updated
                      ↓
              Next analysis calls getAllLearnedHints()
                      ↓
              AnalysisService injects hints into Grok prompt
```

### API Endpoints
```typescript
// Record feedback
POST /api/ai-feedback
{
    isHelpful: boolean,
    maskPosition: string,
    aiReasoning: string,
    userCorrection?: string
}

// Get feedback stats
GET /api/ai-feedback/stats
// Returns: { totalFeedback, helpful, unhelpful, helpfulRate, learnedPatterns, patterns }
```

### Prompt Injection
When `getAllLearnedHints()` returns data, it's injected into the analysis prompt:
```
=== LEARNED FROM PAST FEEDBACK ===
Previous users have corrected the AI on these issues:
  - "septum piercing was missing"
  - "wrong hair color - should be blonde not brown"
Pay special attention to these kinds of details that the AI has missed before.
=== END LEARNED FEEDBACK ===
```

## Generation Analysis ("Analyze Failure") Fix (Dec 19, 2025)

### Issue
The "Analyze Failure" button on Generation Cards was returning mock/static data instead of actual AI analysis.

### Root Cause
The `generationController.analyzeFailure()` method was returning hardcoded mock data instead of calling the real `AnalysisService`.

### Fix Applied
Updated `backend/src/controllers/generationController.ts`:
```typescript
// Before (mock data)
return res.json({
    success: true,
    analysis: {
        flaws: ["Mock flaw 1"],
        positiveTraits: ["Mock positive"],
        rating: 3,
        advice: "This is mock data"
    }
});

// After (real Grok Vision analysis)
const analysis = await AnalysisService.getInstance().analyzeGeneration(
    generationId,
    userFeedback
);
return res.json({ success: true, analysis });
```

### User Feedback Priority
When user provides specific feedback (e.g., "missing septum piercing"), it's now:
1. Injected as the PRIMARY concern in the Grok prompt
2. Marked with `=== CRITICAL: USER'S SPECIFIC CONCERN ===`
3. AI must address it FIRST before other analysis

## Session Checkpoint Slash Command

### Location
`.claude/commands/checkpoint.md`

### Usage
Run `/checkpoint` to:
1. Update CLAUDE.md with session progress
2. Update vibeboard.md if needed
3. Back up context to Memory MCP
4. Provide session continuity summary

### Memory MCP Entities (Dec 19, 2025)
- `AI Feedback Learning System` (Feature)
- `AnalysisService` (Service)
- `Generation Card Feedback` (Feature)
- `Checkpoint Slash Command` (Configuration)

## Key Component Interfaces (Dec 19, 2025)

### EngineLibraryModal
**File**: `frontend/src/components/generations/EngineLibraryModal.tsx`
```typescript
interface EngineLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModelId: string;
    onSelect: (model: ModelInfo) => void;
    initialCategory?: ModelCapability | 'all';
}
// NO extra props like duration, setDuration, variations, etc.
```

### AnimateModal
**File**: `frontend/src/components/generations/AnimateModal.tsx`
```typescript
interface AnimateModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    initialAspectRatio?: string;
    initialPrompt?: string;
    onAnimate: (prompt: string, aspectRatio: string, duration: number) => void;  // 3 params!
    isGenerating: boolean;
}
```

### GenerationCard
**File**: `frontend/src/components/generations/GenerationCard.tsx`
```typescript
// onToggleSelection signature:
onToggleSelection?: (e: React.MouseEvent) => void;  // Takes event parameter!
```

### EngineSelectorV2
**File**: `frontend/src/components/generations/EngineSelectorV2.tsx`
- Opens EngineLibraryModal with ONLY the 5 props listed above
- Auto-switches mode (image/video) based on selected model type

## Generate Toolbar Architecture (Dec 19, 2025)
The Generate Page (`src/app/projects/[id]/generate/page.tsx`) features a unified, vertically-optimized toolbar.

### Key Components
1.  **Unified Prompt Bar**:
    -   Auto-expanding textarea.
    -   Inline "pills" for selected Elements (`@element`).
    -   Attached "Sparkles" button for Smart Prompt Builder.
2.  **Inline Controls** (Bottom Row):
    -   **Style Button**: Opens `ParameterManager` side-panel.
    -   **Dynamic Controls**: Duration/Quantity dropdowns appear based on model capabilities.
    -   **Element Picker Toggle**: Shows/hides horizontal element strip.
    -   **NO Mode Switcher**: Removed Dec 19, 2025 - mode is now auto-detected from Model Library selection.
3.  **Engine Selector V2**:
    -   Compact pill design showing Provider Icon + Model Name.
    -   Opens `EngineLibraryModal` for full model browsing.
    -   Auto-switches mode based on model type (image vs video).
4.  **AnimateModal Integration**:
    -   Triggered from GenerationCard "Animate" action.
    -   Converts images to video using image-to-video models.

### Visual Reference
**Toolbar & Element Picker**
![Toolbar Layout](/Users/matthenrichmacbook/.gemini/antigravity/brain/0e86b1df-e2c7-4d2e-9d14-7875efeff7d5/element_picker_and_toolbar_1766115865092.png)

**Model Library**
![Model Modal](/Users/matthenrichmacbook/.gemini/antigravity/brain/0e86b1df-e2c7-4d2e-9d14-7875efeff7d5/model_library_sidebar_1766111613154.png)

### Model Library Sidebar (Dec 19, 2025)
The sidebar shows ALL categories always (no mode filtering):
- **USE CASE Section**: All Uses, Image Generation, Text to Video, Animation (I2V), Character & Avatar
- **Favorites**: With count badge
- **MAKER Section**: Provider filter with model counts, multi-select supported
- **Stats**: Shows "X of Y" filtered models count

**Quick Reference (@mentions)**
![Autocomplete](/Users/matthenrichmacbook/.gemini/antigravity/brain/0e86b1df-e2c7-4d2e-9d14-7875efeff7d5/autocomplete_popup_visible_1766112819686.png)

### ParameterManager (`src/components/generations/ParameterManager.tsx`)
-   **Purpose**: Manages reusable presets for Samplers and Schedulers.
-   **UI Pattern**: Side-panel or Modal (embedded).
-   **Features**:
    -   "Quick Add" buttons for common presets (Euler a, DPM++).
    -   Manual API value entry.
    -   Selection state managed via `selectedId` prop.

## Session Summary (Dec 19, 2025) - Bug Fixes

### Fix 1: Audio Recording 0 KB Files
**Problem**: Audio recordings from microphone showed 0 KB file size.
**Solution**: Updated `AudioInput.tsx`:
- Added `timeslice` parameter: `mediaRecorder.start(250)` captures chunks every 250ms
- Added browser-compatible mimeType detection (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`)
- Added detailed console logging for debugging

### Fix 2: False "Failed" State During Processing
**Problem**: GenerationCard showed "Failed" text while status badge showed "Processing".
**Solution**: Updated `GenerationCard.tsx`:
- Changed logic to ONLY show "Failed" when `status === 'failed'`
- All other states (queued, running, processing, succeeded-without-URL) show spinner
- More robust against unknown future status values

## Session Summary (Dec 21, 2025) - Audio & Avatar Improvements

### Feature: Audio Notification Pill
- **UI**: Added a "Music" pill to the unified prompt bar when an audio file is attached. matches the style of reference element pills.
- **Functionality**: clearly shows the filename and provides a remove button.

### Feature: Adaptive Audio Recording
- **Problem**: Browsers have inconsistent support for audio mime types (Chrome vs Safari vs Firefox).
- **Solution**: Implemented adaptive format selection in `AudioInput.tsx`:
  1. Priority: `audio/mpeg` (MP3) -> `audio/ogg` -> `audio/mp4` (M4A) -> `audio/webm`.
  2. **Fallback**: If no preferred format is supported (or for specific quality needs), a custom `AudioContext` recorder generates standard `.wav` files.
  3. **Result**: Valid audio files generated across all major browsers.

### Bugfix: Kling AI Avatar (Unprocessable Entity)
- **Problem**: `fal-ai/kling-video/ai-avatar/v2/pro` was returning `422 Unprocessable Entity`.
- **Root Cause 1**: Frontend (`GeneratePage.tsx`) was reading `data.url` instead of `data.fileUrl` from the local upload response, sending `undefined` audio URL to backend.
- **Root Cause 2**: The Avatar model is purely audio-driven and rejects payloads containing `prompt`, `strength`, or `referenceCreativity`.
- **Fix**:
  1. Updated frontend to correctly capture `fileUrl`.
  2. Updated `FalAIAdapter.ts` to strictly sanitize the payload for `ai-avatar` models, removing all unsupported text/strength parameters.
  3. Enhanced error logging to expose deep validation errors from Fal.ai.

### Fix 3: Wan 2.5 I2V 422 Validation Error
**Problem**: Wan 2.5 Image-to-Video failed with 422 error due to unsupported `strength` parameter.
**Solution**: Updated `FalAIAdapter.ts` (main repo):
- Added whitelist: `['kling', 'vidu', 'minimax', 'luma', 'runway']`
- Only adds `strength` parameter for models in whitelist
- Wan 2.5 and other unsupported models no longer receive invalid parameter

### Worktree Note
Backend runs from main repo (`/Users/matthenrichmacbook/Antigravity/vibeboard/backend/`), NOT worktrees. FalAIAdapter fix was applied directly to main repo.

## Enhanced Character Consistency Methods (Dec 19, 2025)

### Overview
Added unified character consistency API to FalAIAdapter with intelligent method selection.

### New Methods in FalAIAdapter

| Method | Best For | Key Features |
|--------|----------|--------------|
| `generateWithCharacterConsistency()` | Unified entry point | Auto-selects best method based on options |
| `generateWithKontextEnhanced()` | Scene transfer | Preserves face, tattoos, jewelry, clothing |
| `generateWithIPAdapterEnhanced()` | Style consistency | Multiple reference images, style weights |
| `generateWithFaceIDEnhanced()` | Facial identity | Strict face matching for portraits |
| `createCharacterPreset()` | Settings optimizer | Analyzes image, returns optimal weights |
| `generateCharacterVariations()` | Batch generation | Character in multiple scenes |

### GenerationOptions.characterConsistency Interface
```typescript
characterConsistency?: {
    method?: 'auto' | 'kontext' | 'ip-adapter' | 'face-id' | 'lora';
    referenceImage?: string;
    faceWeight?: number;     // 0.0-1.0
    styleWeight?: number;    // 0.0-1.0
    poseGuidance?: number;   // 0.0-1.0
    preserveIdentity?: boolean;
    sceneTransfer?: boolean;
    multipleReferences?: string[];
};
```

### Method Selection Logic (Auto Mode)
- `sceneTransfer: true` → Kontext
- `preserveIdentity: true` + `faceWeight > 0.7` → Face ID
- `multipleReferences.length > 1` → IP-Adapter
- `styleWeight > 0.6` → IP-Adapter
- Default → Kontext

### Correct Fal.ai Endpoints
| Model | Endpoint |
|-------|----------|
| Kontext Dev | `fal-ai/flux-kontext/dev` |
| Kontext Pro | `fal-ai/flux-pro/kontext` |
| IP-Adapter Face ID | `fal-ai/ip-adapter-face-id` |

### Kontext-Specific Notes
- Does NOT support `aspect_ratio` - uses `resolution_mode: "auto"` instead
- Does NOT support `safety_tolerance` parameter
- Default `guidance_scale: 2.5` (range 1-20)

### Usage Example
```typescript
const falAdapter = new FalAIAdapter();

// Unified API (auto-selects method)
await falAdapter.generateWithCharacterConsistency({
    prompt: "Woman in a cafe, warm lighting",
    characterConsistency: {
        method: 'auto',
        referenceImage: 'https://example.com/character.jpg',
        sceneTransfer: true,
    }
});

// Direct Kontext call
await falAdapter.generateWithKontextEnhanced({
    prompt: "Character in an art gallery",
    characterConsistency: {
        referenceImage: 'https://example.com/character.jpg',
    }
});
```

### Test Results (All Passed)
- ✅ Unified (Auto) → Kontext
- ✅ Kontext Enhanced → Scene transfer
- ✅ IP-Adapter Enhanced → Style consistency

## Session Summary (Dec 20, 2025) - Smart Prompt Builder Improvements

### Fix 1: LoRA Display with Trigger Words
**Problem**: LoRAs weren't appearing in PromptBuilder and trigger words were missing.
**Solution**:
- Updated `StyleSelectorModal.tsx` to preserve `triggerWord` in StyleConfig interface
- Updated `handleToggleLoRA` to include `triggerWord: lora.triggerWord`
- Updated `GenerationForm.tsx` to pass `initialLoRAs` with `triggerWords` array
- Added "LoRA Models & Trigger Words" section header in PromptBuilder
- Added "Will prepend:" indicator showing trigger words in yellow chips

### Fix 2: Character Reference Display
**Problem**: Selected elements weren't showing images because Element type uses `url`/`fileUrl`/`thumbnail` not `imageUrl`.
**Solution**:
- Updated `GenerationForm.tsx` to filter elements by `selectedElementIds`
- Added mapping: `imageUrl: e.url || e.fileUrl || e.thumbnail`
- Replaced "Reference Images" with "Character Reference (For Consistency)" section
- Added element cards with 40x40px thumbnails, names, and "PRIMARY" badge

### Fix 3: Simplified Enhancement Flow
**Problem**: User wanted to remove "Use Enhanced Prompt" button and auto-apply enhancement.
**Solution**:
- Removed "Use Enhanced Prompt" button from PromptBuilder
- Updated `enhance` function to auto-apply result and close modal:
```typescript
if (result?.prompt) {
    setPrompt(result.prompt);
    onPromptChange(result.prompt, result.negativePrompt);
    if (onClose) onClose();
}
```

### Files Modified
- `frontend/src/components/storyboard/StyleSelectorModal.tsx` - StyleConfig interface, handleToggleLoRA
- `frontend/src/components/generations/GenerationForm.tsx` - Element/LoRA data passing
- `frontend/src/components/prompts/PromptBuilder.tsx` - UI sections, auto-apply enhancement

## Session Summary (Dec 21, 2025) - LoRA Filter & Civitai Metadata

### Feature 1: LoRA Capability Filter in Model Library
**Problem**: Users couldn't easily find models that support LoRAs.
**Solution**:
- Added `loraOnly` state and purple toggle button in `EngineLibraryModal.tsx`
- Filter uses `getModelConstraints(model.id).supportsLoRA`
- Added amber LoRA badge on compatible model cards (Flux Dev, Flux Schnell, etc.)
- Shows count of LoRA-compatible models next to filter

### Feature 2: Civitai Description Parsing for Recommended Settings
**Problem**: When adding LoRAs from Civitai, recommended settings (sampler, steps, CFG, scheduler) were lost.
**Solution**:
- Added `parseDescriptionSettings()` function in `ModelMetadataSync.ts`
- Parses HTML/Markdown descriptions for patterns like:
  - `Sampler: DPM++ 2M Karras`
  - `Steps: 20-30` (supports ranges)
  - `CFG: 4` or `CFG: 3-7` (supports ranges)
  - `Schedule Type: KL Optimal`
  - Pros/Cons sections
  - Negative prompt suggestions
- Added `ParsedRecommendedSettings` interface with all extracted fields
- Updated `civitaiToMetadata()` to parse both model and version descriptions
- Updated `/civitai-metadata` endpoint to return parsed settings

### Feature 3: Model Metadata Sync Service
**New Endpoints**:
- `POST /api/loras/civitai-metadata` - Fetch full metadata with prompt guide
- `POST /api/loras/sync-model` - Generate code snippets for adding models to registry

### Files Modified
- `frontend/src/components/generations/EngineLibraryModal.tsx` - LoRA filter toggle and badges
- `backend/src/services/sync/ModelMetadataSync.ts` - Description parsing, interfaces
- `backend/src/controllers/loraController.ts` - New endpoints
- `backend/src/routes/loraRoutes.ts` - New routes

### Technical Notes
- Description parsing handles various formats: markdown bold, bullet points, tables
- Version-specific settings override model-level settings
- Parsed settings are stored in `_parsedSettings` and `_recommendedSettings` for code generation

## Session Summary (Dec 21, 2025) - Weight Hint Tooltip & Prompt Enhancements

### Feature: Weight Hint Tooltip for Prompt Weighting
**Problem**: Users didn't have a visual reference for the prompt weighting feature (Cmd/Ctrl + Arrow Up/Down).
**Solution**:
- Created new `WeightHintTooltip.tsx` component in `frontend/src/components/prompts/`
- Displays weight-to-repetition mapping table for T5-based models (Flux, SD3.5):
  | Weight | Extra Repetitions |
  |--------|-------------------|
  | 1.0-1.1 | 0 (just removes syntax) |
  | 1.2-1.3 | 1 |
  | 1.4-1.5 | 2 |
  | 1.6+ | 3 |
- Shows keyboard shortcuts (⌘/Ctrl + ↑/↓)
- Auto-detects Mac vs Windows for correct modifier key display
- Positioned above prompt box, aligned with toolbar left edge

### Enhancement: usePromptWeighting Hook
**File**: `frontend/src/hooks/usePromptWeighting.ts`
- Added `isModifierHeld` state tracking via global keydown/keyup listeners
- Handles window blur to reset modifier state when switching tabs
- Hook now returns `{ handleKeyDown, isModifierHeld }`

### Integration in Generate Page
- Imported `WeightHintTooltip` component
- Tooltip shows when `isModifierHeld && isFocused` (modifier held + prompt textarea focused)
- Positioned at `left: calc(256px + 2rem)` (sidebar + padding) and `bottom: 180px`

### Files Modified
- `frontend/src/components/prompts/WeightHintTooltip.tsx` (NEW)
- `frontend/src/hooks/usePromptWeighting.ts`
- `frontend/src/app/projects/[id]/generate/page.tsx`

## Session Summary (Dec 22, 2025) - Shot Navigator & Scene Chain Integration

### Feature: Enhanced Shot Navigator with Beginning/Ending Frame Workflow
**Problem**: User wanted to build storyboards directly from the Generate page by dragging generations into frame slots.
**Solution**: Complete rebuild of ShotNavigator component with Scene Chain integration.

### New ShotNavigator Component
**File**: `frontend/src/components/generations/ShotNavigator.tsx`
- **Scene Chain Integration**: Select/create scenes directly from dropdown
- **Shot Cards**: Each shot has Beginning and Ending frame drop zones
- **Drag-and-Drop**: Drag generations from gallery into frame slots
- **Visual Connection**: Link/Unlink icons show when both frames are set
- **Per-Shot Generation**: Generate video button activates when beginning frame is set
- **Status Tracking**: Pending, Generating, Complete, Failed states with visual indicators
- **Video Preview**: Hover-to-play for completed shot videos
- **Total Duration**: Shows cumulative duration of all shots

### Key Interfaces
```typescript
export interface ShotNavigatorRef {
    handleFrameDrop: (shotId: string, frameType: 'beginning' | 'ending', imageUrl: string) => Promise<void>;
    refreshShots: () => void;
}

interface Shot {
    id: string;
    orderIndex: number;
    prompt: string;
    duration: number;
    status: 'pending' | 'generating' | 'complete' | 'failed';
    firstFrameUrl?: string | null;
    lastFrameUrl?: string | null;
    outputUrl?: string | null;
    failureReason?: string | null;
}
```

### Workflow
1. **Create/Select Scene** in Shot Navigator dropdown
2. **Add Shots** using "+ Add Shot" button
3. **Drag generation** → drop on **Beginning** frame slot (green border when set)
4. **Drag another** → drop on **Ending** frame slot (purple border when set)
5. **Generate Video** button activates when beginning frame is set
6. **Poll for completion** and view result in shot card

### Backend Endpoints Used
- `GET /api/projects/:id/scene-chains` - List scene chains
- `POST /api/projects/:id/scene-chains` - Create scene chain
- `GET /api/projects/:id/scene-chains/:chainId` - Get chain with segments
- `POST /api/projects/:id/scene-chains/:chainId/segments` - Add segment
- `PATCH /api/projects/:id/scene-chains/:chainId/segments/:segmentId` - Update segment (frame URLs)
- `DELETE /api/projects/:id/scene-chains/:chainId/segments/:segmentId` - Delete segment
- `POST /api/projects/:id/scene-chains/:chainId/segments/:segmentId/generate` - Generate video
- `GET /api/projects/:id/scene-chains/:chainId/segments/:segmentId` - Poll segment status

### Generate Page Integration
**File**: `frontend/src/app/projects/[id]/generate/page.tsx`
- Added `shotNavigatorRef` for calling methods from drag handler
- Updated `handleDragEnd` to detect frame slot drops and call ref method
- Extracts image URL from generation outputs for frame assignment

### Visual Design
| State | Beginning Frame | Ending Frame | Link Icon |
|-------|-----------------|--------------|-----------|
| Empty | dashed white border | dashed white border | gray unlink |
| Drag over | blue border + scale | purple border + scale | - |
| Set | green border | purple border | green link |

### Files Modified
- `frontend/src/components/generations/ShotNavigator.tsx` (COMPLETE REWRITE)
- `frontend/src/app/projects/[id]/generate/page.tsx` (drag handling, ref integration)

## Session Summary (Dec 23, 2025) - Draggable Elements & Frame Upload

### Feature 1: Draggable Elements for Shot Navigator
**Problem**: Users could only drag Generations into Shot Navigator frame slots, not Elements from the Element library.
**Solution**: Added `DraggableElementThumbnail` component and updated drag handling.

### Implementation Details
**File**: `frontend/src/app/projects/[id]/generate/page.tsx`
- Created `DraggableElementThumbnail` component wrapping elements with `useDraggable`
- Element thumbnails in horizontal strip are now draggable with grab cursor
- `handleDragEnd` now handles both `type: 'generation'` and `type: 'element'` drops
- DragOverlay shows purple-bordered 64x64 thumbnail for elements, blue-bordered for generations
- Cursor centered in drag thumbnail using negative margins

### Feature 2: Click-to-Upload for Frame Slots
**Problem**: Users could only populate frame slots by dragging; no direct upload option.
**Solution**: Empty frame slots are now clickable to trigger file upload.

**File**: `frontend/src/components/generations/ShotNavigator.tsx`
- Added hidden file inputs for Beginning and Ending frames
- Empty slots show "Click or drag" hint text
- Clicking triggers native file picker (image/* only)
- Upload shows spinner with "Uploading..." during transfer
- After upload, calls `onFrameDrop` with the uploaded image URL

### Feature 3: Drag Overlay Centering
**Problem**: Cursor was not centered in drag thumbnail during drag operations.
**Solution**: Applied negative margins to center the cursor:
```typescript
style={{
    width: thumbWidth,
    height: thumbHeight,
    marginLeft: -thumbWidth / 2,
    marginTop: -thumbHeight / 2
}}
```

### Visual Changes
| Feature | Before | After |
|---------|--------|-------|
| Element thumbnails | Static, click-only | Draggable with grab cursor |
| Empty frame slots | Drag-only | "Click or drag" with upload |
| Element drag overlay | N/A | 64x64 purple-bordered thumbnail |
| Cursor position | Top-left of thumbnail | Centered in thumbnail |

### Backend Bugfixes (from previous session)
- **sceneChainController.ts**: Made `prompt` optional for frame-based workflows
- **sceneChainController.ts**: Fixed Prisma serialization error in `generateSingleSegment`

## Session Summary (Dec 23, 2025) - Script Library & Genre Style System

### Feature: Script Library with Genre Organization
**Problem**: User wanted to organize scripts by genre and train LLM on storytelling styles.
**Solution**: Created comprehensive script library and style guide system.

### Script Library Structure
**Location**: `/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/Script Library/`
- 16 genre subfolders: Action, Animation, Comedy, Commercial, Documentary, Drama, Fantasy, Horror, Musical, Noir, Romance, Sci-Fi, Thriller, Video, Western, `_analyses` (cache)
- Organized 34+ existing scripts from Movie Scripts folder

### Key Files Created
**`backend/src/services/story/GenreStyleGuide.ts`** (900+ lines)
- **Pixar 22 Rules of Storytelling**: Full rules with application guidance
- **12 Director Visual Styles**: Wes Anderson, Denis Villeneuve, Christopher Nolan, Quentin Tarantino, Hayao Miyazaki, Guillermo del Toro, Ridley Scott, Stanley Kubrick, David Fincher, Terrence Malick, Park Chan-wook, Alfonso Cuarón
- **5 Cinematographer Styles**: Roger Deakins, Emmanuel Lubezki, Janusz Kamiński, Hoyte van Hoytema, Robert Richardson
- **14 Genre Guides**: Each with storytelling conventions, visual tropes, archetypes, prompt prefixes

**`backend/src/services/story/ScriptAnalyzer.ts`** (650+ lines)
- `analyzeScript()` - Extracts narrative voice, character patterns, story structure from scripts
- `generateStoryOutline()` - Combines script style, genre, director style, Pixar rules
- `generateScenePrompts()` - Creates First Frame, Last Frame, Video prompts per scene

**`backend/src/routes/storyStyleRoutes.ts`** (NEW)
- `GET /api/story-style/genres` - List available genres
- `GET /api/story-style/directors` - List director styles
- `GET /api/story-style/cinematographers` - List cinematographer styles
- `GET /api/story-style/pixar-rules` - Get all 22 Pixar rules
- `POST /api/story-style/build-prefix` - Combine styles into prompt prefix
- `GET /api/story-style/scripts` - List scripts in library
- `POST /api/story-style/scripts/analyze` - Analyze a script
- `POST /api/story-style/generate-outline` - Generate story from concept
- `POST /api/story-style/generate-scene-prompts` - Generate prompts for scene

### Story Editor Pipeline Test
Tested full Story Editor pipeline with "Tide Whisperer" concept:
- **Concept**: Hawaiian surfer girl discovers she can communicate with sea turtles
- **Style**: Hayao Miyazaki / Studio Ghibli aesthetic
- **Genre**: Animation
- **Output**:
  - 3 Acts, 14 story beats (Pixar structure)
  - 18 scenes parsed from screenplay
  - Full shot breakdowns with camera presets
  - First Frame, Last Frame, Video prompts for each shot
  - Negative prompts for artifact prevention

### Example Generated Prompts (Scene 1 - Opening)
```
First Frame: ohwx_scene, A breathtaking wide vista of the Hawaiian coast at
sunrise, with an expansive sky awash with soft pink and golden hues. The ocean
stretches endlessly, its surface shimmering with delicate sparkles of reflected
light. Hayao Miyazaki style, Studio Ghibli aesthetic...

Video Prompt: ohwx_studio_ghibli, A serene coastal landscape at sunrise, with
gentle waves rolling toward the shore and mist gradually clearing around the
cliffs. The sky shifts slowly in color as the sun ascends...
```

### Director Style Integration
| Director | Visual Signature |
|----------|-----------------|
| Wes Anderson | Symmetrical framing, pastel colors, centered subjects |
| Denis Villeneuve | Atmospheric, muted palette, epic scale, silhouettes |
| Hayao Miyazaki | Hand-drawn, watercolor backgrounds, environmental themes |
| Christopher Nolan | Practical effects, IMAX, non-linear, blue/gray palette |
| Quentin Tarantino | Pop culture, chapter cards, extreme close-ups, violence |

### Files Modified
- `backend/src/index.ts` - Added storyStyleRoutes

### Technical Notes
- Director styles include `promptPrefix` for easy injection into generation prompts
- Genre guides have `recommendedMoves` and `avoidedMoves` for camera preset filtering
- Script analysis caches results in `_analyses/` folder for performance
- LLM integration via existing LLMService (Grok primary)

## Session Summary (Dec 24, 2025) - Video Generation Fix

### Bug Fix: Video Generation Not Working
**Problem**: Video generation with `fal-ai/wan-2.1-t2v-1.3b` model was failing with "Not Found" error.

**Root Cause**:
1. Frontend ModelRegistry uses simplified model IDs (e.g., `fal-ai/wan-2.1-t2v-1.3b`)
2. These IDs don't match actual Fal.ai API endpoints (correct: `fal-ai/wan-t2v`)
3. `WanVideoAdapter` was directly passing the incorrect model ID to Fal.ai

**Solution Applied**:

**File: `backend/src/services/generators/WanVideoAdapter.ts`**
- Added `modelEndpointMap` to convert frontend model IDs to correct Fal.ai endpoints:
  | Frontend ID | Fal.ai Endpoint |
  |-------------|-----------------|
  | `fal-ai/wan-2.1-t2v-1.3b` | `fal-ai/wan-t2v` |
  | `fal-ai/wan-2.1-i2v-14b` | `fal-ai/wan/v2.2-a14b/image-to-video` |
  | `fal-ai/wan-video-2.2-animate-move` | `fal-ai/wan/v2.2-a14b/animate` |

- Fixed `num_frames` parameter:
  - `fal-ai/wan-t2v` requires `num_frames` between 81-100
  - Set to 97 (~4 seconds at 24fps)
  - Removed unsupported `frames_per_second` and `sample_shift` params

- Added detailed error body logging for easier debugging

**File: `backend/src/services/generators/FalAIAdapter.ts`**
- Added matching `modelIdMapping` for consistency

### Story Editor Fixes (from previous session)
- Auto-save story before exporting to storyboard
- Auto-navigate to storyboard page after successful export
- Updated to use `scene-chains` and `segments` API instead of old `scenes/shots` API
- Added console logging for element loading in character picker

### Test Result
```
✓ wan succeeded
Generation 137bc2f1-314d-4ffc-ba66-0f745483272e completed.
```

### Files Modified
- `backend/src/services/generators/WanVideoAdapter.ts` - Model ID mapping, parameter fixes, error logging
- `backend/src/services/generators/FalAIAdapter.ts` - Model ID mapping
- `frontend/src/app/projects/[id]/story-editor/page.tsx` - Auto-save, scene-chains API, navigation

## Session Summary (Dec 25, 2025) - Radix Dropdown Menus & Drag Cursor Fix

### Feature 1: Radix DropdownMenu for GenerationCard Toolbar
**Problem**: Upscale and Enhance dropdown menus were clipped by `overflow-hidden` containers in masonry/grid layouts.
**Solution**: Converted inline absolute-positioned dropdowns to Radix UI DropdownMenu with Portal rendering.

**Packages Added**:
- `@radix-ui/react-dropdown-menu`
- `@dnd-kit/modifiers`

**Implementation Details**:
- Used `DropdownMenu.Portal` with `forceMount` to allow Framer Motion exit animations
- Added `onPointerDown={(e) => e.stopPropagation()}` on triggers to prevent DnD drag conflicts
- Connected controlled state: `open={showUpscaleMenu} onOpenChange={setShowUpscaleMenu}`
- Updated toolbar visibility: menus keep toolbar visible while open

**File: `frontend/src/components/generations/GenerationCard.tsx`**
```typescript
// Typed constants for menu items
const UPSCALE_OPTIONS: Array<{ id: string; name: string; description: string }> = [
    { id: 'fal-ai/clarity-upscaler', name: 'Clarity 2x', description: 'Sharp, detailed upscale' },
    { id: 'fal-ai/creative-upscaler', name: 'Clarity 4x', description: 'Maximum quality upscale' },
    { id: 'fal-ai/aura-sr', name: 'Aura SR', description: 'Fast AI upscaling' },
];

const ENHANCE_ITEMS: Array<{ mode: 'full' | 'audio-only' | 'smooth-only'; emoji: string; title: string; description: string }> = [
    { mode: 'audio-only', emoji: '🔊', title: 'Add Audio Only', description: 'MMAudio (no speed change)' },
    { mode: 'smooth-only', emoji: '🎬', title: 'Smooth Only', description: 'RIFE interpolation (24fps)' },
    { mode: 'full', emoji: '✨', title: 'Full Enhancement', description: 'Smooth + Audio' },
];

// Radix Portal pattern with Framer Motion
<DropdownMenu.Root open={showUpscaleMenu} onOpenChange={setShowUpscaleMenu}>
    <DropdownMenu.Trigger asChild>
        <button onPointerDown={(e) => e.stopPropagation()} ...>
    </DropdownMenu.Trigger>
    <AnimatePresence>
        {showUpscaleMenu && (
            <DropdownMenu.Portal forceMount>
                <DropdownMenu.Content asChild side="bottom" align="end" sideOffset={6}>
                    <motion.div initial={{...}} animate={{...}} exit={{...}}>
                        {UPSCALE_OPTIONS.map(...)}
                    </motion.div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        )}
    </AnimatePresence>
</DropdownMenu.Root>
```

### Feature 2: Drag Thumbnail Cursor Centering
**Problem**: Drag overlay thumbnail was offset from cursor during drag operations.
**Solution**: Used `snapCenterToCursor` modifier from `@dnd-kit/modifiers`.

**File: `frontend/src/app/projects/[id]/generate/page.tsx`**
```typescript
import { snapCenterToCursor } from "@dnd-kit/modifiers";

<DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
    {/* Thumbnail content - no manual transform needed */}
</DragOverlay>
```

### Key Technical Patterns

| Pattern | Usage |
|---------|-------|
| `forceMount` on Portal | Keeps DOM mounted for exit animations |
| `onPointerDown` stopPropagation | Prevents DnD from intercepting menu clicks |
| `snapCenterToCursor` modifier | Centers drag overlay on cursor |
| CSS Container Queries | `cqw`/`cqh` units for responsive toolbar buttons |

### Files Modified
- `frontend/src/components/generations/GenerationCard.tsx` - Radix dropdown implementation
- `frontend/src/app/projects/[id]/generate/page.tsx` - snapCenterToCursor modifier
- `frontend/package.json` - Added @radix-ui/react-dropdown-menu, @dnd-kit/modifiers

## Session Summary (Dec 25, 2025) - Multi-Pass Render Queue & Batch #6

### Feature: Multi-Pass Render Queue (Draft → Review → Master)
**Purpose**: Save money during iteration by using cheap draft renders, then upgrading to master quality.

**Key Components**:
1. **RenderQueueTypes.ts** - Type definitions with ShotRecipe (locked creative settings) and RenderPass (with seed inheritance)
2. **RenderQueueService.ts** - Core service with job management, pass rendering, and promotion logic
3. **renderQueueRoutes.ts** - API endpoints for version stacks and quality promotion
4. **RenderQueuePanel.tsx** - UI with version stacking display (D/R/M badges) and upgrade buttons

**Seed Inheritance Flow**:
```
Draft (random seed) → resultSeed captured
                    ↓
Master (lockedSeed = parentPass.resultSeed)
                    ↓
Visual consistency maintained across quality levels
```

**Key Interfaces**:
```typescript
interface ShotRecipe {
    prompt, negativePrompt, aspectRatio, duration,
    lensKit?, lightingSetup?, cinematicTags?, loras?,
    elementReferences?, firstFrameUrl?, lastFrameUrl?,
    seed?, guidanceScale?, inferenceSteps?
}

interface RenderPass {
    parentPassId?, childPassIds[],  // Parent-child mapping
    lockedSeed?, seedSource,        // 'random' | 'inherited' | 'user'
    resultSeed?,                    // Captured for inheritance
    recipe: ShotRecipe              // Locked creative settings
}
```

**Cost Savings Example** (10 shots, 3 iterations):
- Master-only: $7.50 (10 × $0.25 × 3)
- Draft + Master: $1.15 (10 × $0.03 × 3 + 10 × $0.25)
- Savings: $6.35 (85%)

### Related: Lens Kit Enhancements
- Added `ANAMORPHIC_MODIFIERS` constant and `buildLensPrompt()` function to LensPresets.ts
- LensKitSelector now has Spherical/Anamorphic toggle with `handleAnamorphicToggle`
- Anamorphic mode auto-locks aspect ratio to 21:9 (2.39:1)

### Related: Virtual Gaffer (Lighting Stage)
- Added Inverse Gaffing feature - analyze reference images to auto-place lights
- `handleFileDrop` uploads image, calls `/api/lighting/analyze`, and auto-applies lights
- Proxy sphere preview shows real-time lighting effects based on light positions

### Batch #6 Status
| Feature | Status |
|---------|--------|
| Multi-Pass Render Queue | ✅ Complete |
| Semantic Search (CLIP/Vision Indexing) | ❌ Not Started |

### Files Modified
- `backend/src/services/rendering/RenderQueueTypes.ts` - ShotRecipe, RenderPass with seed inheritance
- `backend/src/services/rendering/RenderQueueService.ts` - promoteShot(), getVersionStack(), getAllVersionStacks()
- `backend/src/routes/renderQueueRoutes.ts` - Version stack and promotion endpoints
- `frontend/src/components/generations/RenderQueuePanel.tsx` - Version stacking UI, handlePromoteShot()
- `frontend/src/data/LensPresets.ts` - ANAMORPHIC_MODIFIERS, buildLensPrompt()
- `frontend/src/components/generation/LensKitSelector.tsx` - Spherical/Anamorphic toggle
- `frontend/src/components/lighting/LightingStage.tsx` - Inverse Gaffing with handleFileDrop

## Session Summary (Dec 25, 2025) - Virtual Gaffer Inverse Gaffing Improvements

### Feature 1: Fixed Neon Sign/Practical Light Positioning
**Problem**: The example JSON in the Grok Vision prompt had the neon sign placed at x=0.85 (back-right) when it should be at x=0.15 (back-left) based on the John Wick reference frame where the red neon is visible on the viewer's left.
**Root Cause**: AI was using subject-relative coordinates (stage-left/stage-right) instead of camera-relative coordinates (viewer's left/right).

**Solution**:
- Fixed neon sign example: `x: 0.85` → `x: 0.15`, description updated to "back-left"
- Added universal **COORDINATE ENFORCEMENT** rule for ALL lights (not just key lights):
  ```
  All coordinates must be VIEWER-RELATIVE (Camera-Perspective), NOT Subject-Relative.
  - If a light/object appears on the LEFT side of the image frame → x < 0.4
  - If a light/object appears on the RIGHT side of the image frame → x > 0.6
  ```
- Added **Practical Light Rule** specifically for neon signs, lamps, windows
- Added concrete John Wick example showing both key and practical positions

**File**: `backend/src/services/lighting/LightingAnalysisService.ts`

### Feature 2: Flip Map Button
**Problem**: Even with improved prompts, AI might occasionally flip left/right coordinates.
**Solution**: Added one-click "Flip" button to horizontally mirror all light X coordinates.

**Implementation**:
```typescript
const handleFlipMap = useCallback(() => {
    const flippedLights = lights.map(light => ({
        ...light,
        x: 1.0 - light.x,  // Mirror: 0.15 → 0.85, 0.85 → 0.15
    }));
    useLightingStore.setState({ lights: flippedLights });
}, [lights]);
```

**UI**: Cyan-colored button between Clear and Analyze Reference buttons, disabled when no lights exist.

**File**: `frontend/src/components/lighting/LightingStage.tsx`

### Feature 3: Simplified Status Text
**Change**: Status text during analysis simplified from "Analyzing lighting with Grok Vision..." to "Analyzing lighting..."

### Virtual Gaffer Coordinate System Reference
| Position | Coordinates | Description |
|----------|-------------|-------------|
| Back-left rim | x=0.15, y=0.15 | Rim light from behind, viewer's left |
| Back-right rim | x=0.85, y=0.15 | Rim light from behind, viewer's right |
| Front-left key | x=0.25, y=0.60 | Most common key position |
| Front-right fill | x=0.75, y=0.60 | Standard fill position |
| Center backlight | x=0.50, y=0.10 | Direct backlight |

### Files Modified
- `backend/src/services/lighting/LightingAnalysisService.ts` - Fixed neon sign coordinates, added coordinate enforcement rules
- `frontend/src/components/lighting/LightingStage.tsx` - Added Flip Map button, simplified status text

## Session Summary (Dec 26, 2025) - Visual Librarian / Semantic Search

### Overview
Complete implementation of the "Visual Librarian" semantic search system - a professional Media Asset Manager (MAM) for generations using cinematic terminology.

### Phase 1: Indexing Engine
**File**: `backend/src/services/search/SemanticIndexService.ts`
- **CINEMATIC_EXTRACTION_PROMPT**: Grok Vision prompt using professional DP terminology
- **Framing Detection**: ECU, CU, MCU, MS, WS, EWS with camera angles and movement
- **Lighting Analysis**: Low-Key, High-Key, Chiaroscuro, Rim-lit, direction, color temp
- **Lens Detection**: Anamorphic, Shallow DOF, Bokeh type, focal length, optical effects
- **Composition**: Rule of Thirds, Golden Ratio, Leading Lines, negative space
- **Re-indexing Safety**: `shouldIndex()` method prevents double-spending API credits
- **Error State Persistence**: `indexStatus` field (pending/indexed/failed/skipped) with error messages

**Prisma Schema Updates**:
```prisma
visualDescription  String?  // JSON: { framing, lighting, lens, composition, ... }
indexedAt          DateTime?
indexStatus        String   @default("pending")
indexError         String?
```

### Phase 2: Search API
**File**: `backend/src/routes/searchRoutes.ts`
- `GET /api/projects/:projectId/search` - Natural language query with scoring
- `GET /api/projects/:projectId/search/stats` - Index statistics
- `GET /api/projects/:projectId/search/suggestions` - Smart suggestion pills
- `POST /api/projects/:projectId/search/index` - Batch indexing
- `POST /api/projects/:projectId/search/retry-failed` - Retry failed indexing
- `GET /api/projects/:projectId/search/similar/composition/:id` - Find similar by framing
- `GET /api/projects/:projectId/search/similar/lighting/:id` - Find similar by lighting

### Phase 3: Search UI
**File**: `frontend/src/components/generations/GenerationSearch.tsx`
- Smart suggestion pills with category coloring:
  - Blue: Framing (Close-Up, Wide Shot, ECU)
  - Amber: Lighting (Golden Hour, Chiaroscuro, Rim-lit)
  - Purple: Lens (Anamorphic, Shallow DOF)
  - Green: Mood (Moody, Ethereal)
- Index stats dropdown with progress bar
- Retry failed button for error recovery
- Recent searches with localStorage persistence

### Phase 4: Discovery Workflow
**File**: `frontend/src/components/generations/GenerationCard.tsx`
- **Find Similar Composition** button (Layers icon, purple hover) - images only
- **Find Similar Lighting** button (Sun icon, amber hover) - images only
- Props: `onFindSimilarComposition`, `onFindSimilarLighting`

**File**: `frontend/src/components/generations/GenerationResults.tsx`
- `handleFindSimilarComposition()` - Fetches and displays similar compositions
- `handleFindSimilarLighting()` - Fetches and displays similar lighting setups
- Toast notifications for search progress and results

### Alpha Query Test Result
Query: *"Extreme close up with neon blue lighting and shallow depth of field"*
- ✅ Returned images with CU framing, shallow DOF, lens flares
- ✅ Top result scored 17 points (matching framing + DOF + lighting)
- ✅ Correctly identified John Wick style shots

### Search Scoring Algorithm
- Base score from query term matching in visualDescription
- Bonus points for cinematic terminology:
  - Framing terms (ECU, CU, WS): +5 points each
  - Lighting terms (Low-Key, Rim-lit): +3 points each
  - Lens terms (Anamorphic, Shallow DOF): +4 points each

### Files Modified
- `backend/prisma/schema.prisma` - Added indexStatus, indexError fields
- `backend/src/services/search/SemanticIndexService.ts` - Complete rewrite with cinematic prompt
- `backend/src/routes/searchRoutes.ts` - New endpoints for suggestions, retry, similar
- `frontend/src/components/generations/GenerationSearch.tsx` - Smart suggestion pills
- `frontend/src/components/generations/GenerationCard.tsx` - Find Similar buttons
- `frontend/src/components/generations/GenerationResults.tsx` - Similar handlers

## Session Summary (Dec 26, 2025) - Victory Lap: Master Export & Director's Loupe

### Overview
Completed the "Victory Lap" features to turn VibeBoard from AI experiment into production pipeline:
1. **Bake & Export Pass** - FFmpeg muxing with 24fps CFR for NLE compatibility
2. **EPK Export** - Self-contained HTML press kit for studios/clients
3. **Director's Loupe** - Professional RGB Histogram and Luma Waveform scopes

### Feature 1: Bake & Export Pass
**File**: `backend/src/services/export/MasterExportService.ts`
- **FFmpeg Pipeline**: 24fps constant frame rate (`-r 24 -vsync cfr`) for Premiere/Resolve
- **ProRes Option**: ProRes 422 HQ (`-c:v prores_ks -profile:v 3`) for professional workflows
- **Sidecar JSON**: Shot DNA with seed, model, prompt, Gaffer coordinates for re-import
- **CMX 3600 EDL**: Industry-standard Edit Decision List for timeline import

```typescript
// FFmpeg command template
ffmpeg -y -f concat -safe 0 -i concat.txt -r 24 -vsync cfr -c:v libx264 -crf 18 output.mp4
```

**API Endpoints**:
- `POST /api/projects/:projectId/export/bake` - Full scene chain export
- `POST /api/projects/:projectId/export/epk` - EPK generation
- `GET /api/exports/:exportId/epk` - View/download EPK

### Feature 2: Electronic Press Kit (EPK)
**Purpose**: Make VibeBoard a pitch deck engine for studios

**Content**:
- Final video with individual shot versions
- Lens & Lighting recipes per shot
- Continuity Heatmap with color-coded scores
- Sidecar JSON for settings re-import

**Continuity Scoring**:
| Criterion | Points |
|-----------|--------|
| hasFirstFrame | +25 |
| hasLastFrame | +25 |
| linkedToPrev | +25 |
| linkedToNext | +25 |
| **Total** | 0-100% |

**Implementation**:
```typescript
// Helper for object-type cinematicTags
function formatCinematicTags(tags: Record<string, string[]>): string {
    return Object.entries(tags)
        .map(([type, values]) => `${type}: ${values.join(', ')}`)
        .join(' | ');
}
```

### Feature 3: Director's Loupe (VideoScopes)
**File**: `frontend/src/components/generations/VideoScopes.tsx`

**Scope Types**:
| Type | Purpose |
|------|---------|
| RGB Histogram | Shows R/G/B channel distribution |
| Luma Waveform | Shows brightness levels (BT.709) |

**BT.709 Luma Formula**:
```typescript
const luma = 0.2126 * R + 0.7152 * G + 0.0722 * B;
```

**Clipping Indicators**:
- Red bar at left edge = crushed blacks
- Red bar at right edge = clipped highlights

**ABLightbox Integration**:
- `scopesEnabled` state with 'S' keyboard shortcut
- Scopes for both Draft and Master video/image refs

### TypeScript Fix
```typescript
// VideoScopes.tsx line 257
// Before (error): useRef<number>()
// After (fixed): useRef<number | undefined>(undefined)
```

### Files Created
- `backend/src/services/export/MasterExportService.ts`
- `backend/src/routes/exportRoutes.ts`
- `frontend/src/components/generations/VideoScopes.tsx`

### Files Modified
- `backend/src/index.ts` - Added exportRoutes at `/api`
- `frontend/src/components/generations/ABLightbox.tsx` - VideoScopes integration

### Memory MCP Entities Created
- `Victory Lap Export System` (Feature)
- `EPK Export System` (Feature)
- `Directors Loupe VideoScopes` (Component)

## Session Summary (Dec 26, 2025) - L-Cut Support with Independent Audio Trimming

### Overview
Implemented professional L-Cut/J-Cut editing in the NLE Timeline with independent audio trimming, allowing audio to lead or lag video for smooth dialogue transitions.

### New Components & Features

**File**: `frontend/src/components/timeline/NLETimeline.tsx`

**AudioClipComponent** - New component for A1 track with:
- Independent audio trim handles (purple themed, separate from cyan video handles)
- L-Cut/J-Cut offset badges showing time difference
- Audio gain slider (double-click to show, 0-200%)
- A/V link indicator (chain icon when linked)

**Visual Indicators**:
| Indicator | Meaning |
|-----------|---------|
| `L +0.5s` (amber badge) | Audio lags video by 0.5s (L-cut) |
| `J -0.3s` (blue badge) | Audio leads video by 0.3s (J-cut) |
| `⧖` (purple badge) | Duration mismatch only |
| Dashed border | Audio not aligned with video |

### TimelineClip Interface Extensions
```typescript
interface TimelineClip {
    // ... existing fields ...
    audioTrimStart?: number;  // Audio in-point for L-Cut (independent of video)
    audioTrimEnd?: number;    // Audio out-point for L-Cut (independent of video)
    audioGain?: number;       // Audio volume multiplier (0-2, default 1)
    audioDuration?: number;   // Audio file duration (may differ from video)
    avLinked?: boolean;       // Whether A/V trims are linked (default true)
}
```

### New Callbacks
```typescript
interface NLETimelineProps {
    // ... existing props ...
    onAudioTrimUpdate?: (clipId: string, audioTrimStart: number, audioTrimEnd: number) => void;
    onAudioGainChange?: (clipId: string, gain: number) => void;
}
```

### Audio Offset Calculation
```typescript
// Positive offset = audio starts AFTER video (L-cut: audio lags)
// Negative offset = audio starts BEFORE video (J-cut: audio leads)
const audioOffset = audioTrimStart - clip.trimStart;

// Position audio clip on timeline
const audioLeft = (videoStartTime + audioOffset) * zoom;
```

### Backend Support (Already Implemented)
The backend already supports L-Cut fields in `SceneChainSegment`:
- `audioTrimStart` - Audio in-point (seconds)
- `audioTrimEnd` - Audio out-point (seconds)
- `audioGain` - Volume multiplier (0-2)

FFmpeg baking in `BakeMasterPass.ts` already processes these independently.

### Files Modified
- `frontend/src/components/timeline/NLETimeline.tsx` - AudioClipComponent, trim handlers, offset indicators

### Usage Examples
1. **L-Cut** (audio continues from previous scene):
   - Trim video at the cut point
   - Drag audio's left trim handle to the right to make audio start later
   - Badge shows "L +Xs" indicating audio lag

2. **J-Cut** (audio from next scene starts early):
   - Drag audio's left trim handle to the left (before video starts)
   - Badge shows "J -Xs" indicating audio lead

3. **Audio Gain**:
   - Double-click audio clip to show gain slider
   - Adjust from 0% (muted) to 200% (boosted)

## Session Summary (Dec 27, 2025) - Pro Trajectory Engine & Hydration Fix

### Feature 1: Pro Trajectory Engine - Phase 1
Complete implementation of CoTracker3 point tracking and prop compositing system.

**Backend Services Created:**
- `backend/src/services/tracking/PointTrackingService.ts` - CoTracker3 integration via HuggingFace Gradio API
  - `trackGridPoints()` - Automatic dense grid sampling
  - `trackPoints()` - User-defined point tracking
  - `trackPlanarSurface()` - 4-corner planar tracking for prop attachment
  - Homography matrix calculation using Direct Linear Transform (DLT)

- `backend/src/services/tracking/PropCompositorService.ts` - FFmpeg + Canvas compositing
  - Frame extraction and reassembly with FFmpeg
  - Affine transform calculation for perspective warping
  - Triangulation-based texture mapping
  - Blend mode support (normal, multiply, screen, overlay)

- `backend/src/routes/trackingRoutes.ts` - API endpoints:
  | Endpoint | Purpose |
  |----------|---------|
  | `POST /api/tracking/grid` | Grid-based tracking |
  | `POST /api/tracking/points` | User point tracking |
  | `POST /api/tracking/planar` | 4-corner surface tracking |
  | `POST /api/tracking/homography` | Calculate transform matrix |
  | `POST /api/tracking/composite` | Composite prop onto video |
  | `POST /api/tracking/preview-frame` | Single frame preview |

**Frontend Component Created:**
- `frontend/src/components/tracking/TrackerTool.tsx`
  - OpenCV.js dynamic loading for client-side homography
  - 4-point corner selection with visual markers
  - Real-time perspective warp preview
  - Export tracking data as JSON

**Dependencies Added:**
- `@gradio/client` - HuggingFace Gradio API for CoTracker3
- `canvas` - Server-side canvas for compositing

### Feature 2: Hydration Mismatch Fix
Fixed React hydration errors caused by localStorage-based Zustand stores.

**Problem**: Three buttons displaying counts from `persist` stores showed different values on server (0) vs client (actual count):
- Prompt Variables (`$0`)
- Prop Bin (`#0`)
- Prompt Tree (version count)

**Solution**: Added `hasMounted` state pattern:
```typescript
const [hasMounted, setHasMounted] = useState(false);
useEffect(() => { setHasMounted(true); }, []);

// In render:
{hasMounted ? promptTreeNodes.length : 0}
```

**Files Modified:**
- `frontend/src/app/projects/[id]/generate/page.tsx` - Added hasMounted checks for all three stores

### Feature 3: Toolbar Layout Fixes (from previous session)
- Added `.scrollbar-hide` CSS class to `frontend/src/app/globals.css`
- Fixed Generate button overlap with Model Selector using `shrink-0` constraints
- Added border separator between scrollable and pinned sections

### Build Verification
- ✅ Frontend: `npm run build` - Compiled successfully
- ✅ Backend: `npm run build` - TypeScript compiled without errors
- ✅ Backend server running on port 3001

## Session Summary (Dec 27, 2025) - Visual Librarian UI Alignment

### Feature: GenerationSearch Layout Redesign
**Component**: `frontend/src/components/generations/GenerationSearch.tsx`

Implemented pixel-perfect alignment for the Visual Librarian search UI:

**Row 1**: Generate title + Search bar + Index badge + Sort + Filter buttons
**Row 2**: Reality/Both/Intent toggle + Suggestion pills + Select All link

### Key Implementation Details

**Problem**: Row 2 needed to align precisely with the search bar's left edge.

**Initial Approach**: Used fixed `ml-[Xpx]` margin values. This required iterative adjustments (140px → 156px → 148px → 152px → 154px → 158px → 157px) due to font rendering variations.

**Final Solution**: Used invisible spacer pattern for robust alignment:
```tsx
{/* Row 1 */}
<div className="flex items-center gap-4">
  <h1 className="w-[141px] shrink-0 text-3xl font-bold tracking-tight">Generate</h1>
  <div className="relative min-w-0 flex-1">...</div> {/* Search bar */}
</div>

{/* Row 2 - uses same structure for alignment */}
<div className="flex items-center gap-4">
  <div className="w-[141px] shrink-0" /> {/* Invisible spacer */}
  <div className="flex min-w-0 flex-1 items-center gap-2">
    {/* Row 2 content: toggle, pills, Select All */}
  </div>
</div>
```

**Why This Works**:
- Both rows use identical flex layout (`gap-4` = 16px)
- Row 1 title has fixed `w-[141px]` width
- Row 2 uses invisible spacer with same `w-[141px]` width
- Content naturally aligns regardless of font rendering

### Visual Librarian Features (Existing)
- **Search Modes**: Reality (visual content), Intent (prompts), Both (combined)
- **Smart Suggestion Pills**: Amber-themed, populated from indexed content
- **Index Badge**: Shows indexing progress percentage with click-to-index
- **Sort/Filter Buttons**: Placeholder for future functionality

### Files Modified
- `frontend/src/components/generations/GenerationSearch.tsx` - Layout restructure with invisible spacer

### Build Status
- ✅ Frontend: `npm run build` passed
- ✅ Backend: `npm run build` passed

## Session Summary (Dec 27, 2025) - Radix UI Tooltip Conversion

### Overview
Converted all native HTML `title=""` attribute tooltips throughout VibeBoard to use Radix UI tooltips with consistent styling.

### Tooltip Component
**File**: `frontend/src/components/ui/Tooltip.tsx`
- Reusable wrapper around `@radix-ui/react-tooltip`
- Each `<Tooltip>` is self-contained with its own `TooltipProvider`
- Default positioning: `side="top"` (above buttons)
- Text wrapping: `max-w-[200px]` with centered text

### Styling Applied
```typescript
className={clsx(
  'z-50 max-w-[200px] overflow-hidden rounded-md border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-md',
  'text-center leading-snug',
  // Animation classes...
)}
```

### Files Converted
| File | Tooltips Converted |
|------|-------------------|
| `app/page.tsx` | Delete Project |
| `app/projects/[id]/elements/page.tsx` | Copy Links |
| `app/projects/[id]/train/page.tsx` | Create preset, Edit preset, Download LoRA, Delete Job |
| `app/projects/[id]/storyboard/page.tsx` | New Scene |
| `app/projects/[id]/generate/page.tsx` | 12+ tooltips (Copy Links, Save Elements, Smart Prompt Builder, Tags, etc.) |
| `components/generations/GenerationCard.tsx` | All toolbar buttons (Fullscreen, Upscale, Animate, etc.) |
| `components/generations/ABLightbox.tsx` | Zoom controls, Flicker mode, Magnifier |
| `components/generations/GenerationSearch.tsx` | Search mode toggles |
| `components/processing/MagicEraserPanel.tsx` | Zoom controls |
| `components/processing/QuickRotoPanel.tsx` | Zoom controls |
| `components/processing/RotoscopePanel.tsx` | Clear session |
| `components/processing/SetExtensionPanel.tsx` | Zoom controls |
| `components/lighting/LightingStage.tsx` | Flip Map, gel colors |
| `components/prompts/PromptBuilder.tsx` | Copy to clipboard, CivitAI link |
| `components/prompts/NegativePromptManager.tsx` | Category management, prompt actions |
| `components/prompts/PromptTreePanel.tsx` | Add label, Copy prompt, Delete |
| `components/prompts/PromptVariablesPanel.tsx` | Copy usage, Edit, Delete |
| `components/prompts/PropBinPanel.tsx` | Click to copy, Edit, Delete |
| `components/storyboard/StoryboardShot.tsx` | Delete shot, Enhance prompt |
| `components/storyboard/CameraControlPanel.tsx` | Tilt controls |
| `components/layout/Sidebar.tsx` | Delete Session |

### Usage Pattern
```tsx
import { Tooltip } from '@/components/ui/Tooltip';

<Tooltip content="Delete Project" side="top">
  <button onClick={handleDelete}>
    <Trash2 className="h-4 w-4" />
  </button>
</Tooltip>
```

### Build Status
- ✅ Frontend: `npm run build` passed
- ✅ Backend: `npm run build` passed

## Session Summary (Dec 27, 2025) - Acoustic Studio Toolbar Integration

### Feature: Acoustic Studio Button in Generate Toolbar
**Problem**: User noticed the Sound/Audio button was missing from the Generate page toolbar.
**Solution**: Added Acoustic Studio button that opens the perspective-matched audio panel from Batch #3.

### Implementation Details
**File**: `frontend/src/app/projects/[id]/generate/page.tsx`

**Changes Made**:
1. Added import for `AcousticStudioPanel` component
2. Added state: `const [isAcousticStudioOpen, setIsAcousticStudioOpen] = useState(false);`
3. Added toolbar button with Music icon and "Sound" label
4. Added `AcousticStudioPanel` rendering with lens integration

**Button Code**:
```tsx
<Tooltip content="Acoustic Studio - Perspective-Matched Audio" side="top">
  <button
    onClick={() => setIsAcousticStudioOpen(true)}
    className={clsx(
      'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 transition-all hover:scale-105',
      isAcousticStudioOpen
        ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
    )}
  >
    <Music className="h-4 w-4" />
    <span className="whitespace-nowrap text-xs font-medium">Sound</span>
  </button>
</Tooltip>
```

**Panel Integration**:
```tsx
<AcousticStudioPanel
  focalLength={selectedLens?.focalMm || 35}
  isOpen={isAcousticStudioOpen}
  onClose={() => setIsAcousticStudioOpen(false)}
/>
```

### Acoustic Studio Features (Batch #3)
The Acoustic Studio panel provides perspective-matched audio settings:
- **Reverb Level**: Room size simulation based on lens perspective
- **Stereo Width**: Spatial audio matching visual width
- **Foley Detail**: Sound effect detail level
- **Atmosphere/Action Balance**: Mix between ambient and action sounds
- **Sync to Lens**: Auto-adjust settings when lens changes

### Files Modified
- `frontend/src/app/projects/[id]/generate/page.tsx` - Added Acoustic Studio button and panel

### Build Status
- ✅ Frontend: `npm run build` passed

## Session Summary (Dec 28, 2025) - DOF Simulator Phase 7.1 UX Improvements

### Feature 1: Manual Layer Upload Fix
**Problem**: Upload failed at `/api/upload` endpoint (doesn't exist).
**Solution**: Changed to `/api/process/upload-temp` and added BACKEND_URL prefix for relative paths.

**File**: `frontend/src/components/viewfinder/DirectorViewfinder.tsx`
```typescript
const response = await fetch(`${BACKEND_URL}/api/process/upload-temp`, {
    method: 'POST',
    body: formData,
});
// Handle relative paths
const imageUrl = rawUrl.startsWith('http') ? rawUrl : `${BACKEND_URL}${rawUrl}`;
```

### Feature 2: Layer Position Controls
**Problem**: Layer controls only affected bokeh blur, not layer position/scale.
**Solution**: Added offsetX, offsetY, scale properties to LayerConfig with corresponding sliders.

**Files Modified**:
- `frontend/src/components/viewfinder/SceneDepthControls.tsx` - Added position sliders
- `frontend/src/components/viewfinder/DirectorViewfinder.tsx` - Applied CSS transforms

**LayerConfig Extensions**:
```typescript
export interface LayerConfig extends ExtractedLayer {
    // ... existing fields ...
    offsetX?: number;  // -100 to 100 (percentage)
    offsetY?: number;  // -100 to 100 (percentage)
    scale?: number;    // 0.1 to 3
}
```

**Transform Application**:
```typescript
const getLayerTransform = (layer: LayerConfig | undefined) => {
    const offsetX = layer?.offsetX ?? 0;
    const offsetY = layer?.offsetY ?? 0;
    const scale = layer?.scale ?? 1;
    return {
        transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale})`,
        transformOrigin: 'center',
    };
};
```

### Feature 3: Layer Clear Button (X)
**Problem**: No way to remove/clear individual layer images.
**Solution**: Added X button in layer header that clears imageUrl while keeping layer slot.

**Implementation**:
- X button visible only when layer has an image
- Click clears `imageUrl` via `onLayerUpdate(layer.id, { imageUrl: '' })`
- Cleared layers show placeholder icon (Image icon)
- Fallback rendering: background→gradient, subject→focus indicator, foreground→bokeh

### Files Modified
- `frontend/src/components/viewfinder/DirectorViewfinder.tsx` - Upload fix, transforms
- `frontend/src/components/viewfinder/SceneDepthControls.tsx` - Position controls, X button

### Build Status
- ✅ Frontend: `npm run build` passed

## Session Summary (Dec 28, 2025) - Phase 5: YouTube Delivery Integration

### Overview
Completed Phase 5 of Content Creator Pipeline - YouTube Delivery integration with OAuth2, AI-powered metadata generation, and video upload.

### Backend Implementation

**YouTube Routes Registration** (`backend/src/index.ts`):
```typescript
import youtubeRoutes from './routes/youtubeRoutes';
app.use('/api/youtube', youtubeRoutes);
```

**YouTubeUploadService Fixes** (`backend/src/services/delivery/YouTubeUploadService.ts`):
- Fixed LLMService import path: `'../LLMService'` (not `'../llm/LLMService'`)
- Fixed LLMService instantiation: `new LLMService('grok')` (not singleton)
- Fixed generate() call: Uses `generate({prompt, temperature})` returning `{content}`
- Fixed null handling: `thumbnailUrl: response.data.snippet?.thumbnails?.high?.url ?? undefined`

**Validation Schema Fix** (`backend/src/middleware/validation.ts`):
```typescript
// Fixed empty string failing URL validation
audioUrl: z.string().url().optional().nullable().or(z.literal('')),
```

### Frontend Implementation

**DeliveryModal Component** (`frontend/src/components/delivery/DeliveryModal.tsx`):
- OAuth2 connection flow with YouTube
- AI-powered metadata generation (titles, description, tags)
- Video upload with progress tracking
- Privacy status selection
- Category selection

**Timeline Page Integration** (`frontend/src/app/projects/[id]/timeline/page.tsx`):
- Added DeliveryModal import and state
- YouTube button in bake success toast
- Stores bakedVideoPath for delivery

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/youtube/auth/init` | Initialize OAuth, get auth URL |
| `GET /api/youtube/auth/callback` | Handle OAuth callback |
| `GET /api/youtube/auth/status` | Check connection status |
| `POST /api/youtube/auth/disconnect` | Disconnect account |
| `POST /api/youtube/generate-metadata` | AI metadata generation |
| `GET /api/youtube/categories` | List YouTube categories |
| `POST /api/youtube/upload` | Upload video file |
| `POST /api/youtube/upload-from-path` | Upload from server path |
| `GET /api/youtube/videos` | List uploaded videos |
| `PATCH /api/youtube/videos/:videoId` | Update video metadata |
| `DELETE /api/youtube/videos/:videoId` | Delete video |

### Environment Variables Required
```bash
YOUTUBE_CLIENT_ID=your_google_oauth_client_id
YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/youtube/callback
```

### Files Created/Modified
- `backend/src/services/delivery/YouTubeUploadService.ts` - Core upload service
- `backend/src/routes/youtubeRoutes.ts` - API endpoints
- `backend/src/index.ts` - Route registration
- `backend/src/middleware/validation.ts` - audioUrl fix
- `frontend/src/components/delivery/DeliveryModal.tsx` - Upload UI
- `frontend/src/app/projects/[id]/timeline/page.tsx` - Integration

### Build Status
- ✅ Frontend: `npm run build` passed
- ✅ Backend: `npm run build` passed
- ✅ YouTube endpoints verified via curl

## Session Summary (Dec 29, 2025) - Storyboard Shot Layout Improvements

### Overview
Refined the StoryboardShot component layout to improve video preview visibility and balanced panel widths.

### UI Layout Changes

**StoryboardShot Component** (`frontend/src/components/storyboard/StoryboardShot.tsx`):

| Element | Before | After |
|---------|--------|-------|
| Left Panel (Scene Info) | `w-96` (384px) | `w-[420px]` |
| Right Panel (Shot Card) | `flex-1` only | `min-w-[700px] flex-1` |
| Video Preview | Standard aspect-video | Larger with min-width constraint |

**Key Changes**:
1. **Video Preview Size**: Added `min-w-[700px]` to right panel to make video preview larger while maintaining 16:9 aspect ratio
2. **Left Panel Width**: Increased from `w-96` → `w-[480px]` → `w-[420px]` to show more scene direction text without truncation
3. **Balanced Layout**: Final widths prevent content from overflowing off the right side of the page
4. **Full-width Generate Video Button**: Restored below the prompt area

### Iteration Tracking & Cost Display
Component now tracks and displays generation costs:
- **First Frame Iterations**: Badge showing `×N` count
- **Last Frame Iterations**: Badge showing `×N` count  
- **Video Iterations**: Badge showing `×N` count
- **Per-Shot Cost Summary**: Shows breakdown of image/video spend when iterations exist

### Cost Calculation Functions (Exported)
```typescript
export function calculateImageCost(imageModel, resolution): number
export function calculateVideoCost(videoModel, resolution, durationSeconds): number
export function calculateTotalShotCost(shot): { imageCost, videoCost, total, imageIterations, videoIterations }
```

### Resolution Pricing
- Image models: Priced per megapixel (720p=1MP, 1080p=3MP, 4K=9MP)
- Video models: Priced per second with resolution multipliers (480p=0.7×, 720p=1.0×, 1080p=1.5×)

### Files Modified
- `frontend/src/components/storyboard/StoryboardShot.tsx` - Layout widths, cost display
- `frontend/src/app/projects/[id]/storyboard/page.tsx` - Iteration count persistence

### Build Status
- ✅ Frontend: `npm run build` passed

## Session Summary (Dec 30, 2025) - Feature Inventory & Complete Backup

### Feature 1: Master Feature Inventory Document
**Problem**: No comprehensive documentation of all VibeBoard features, tools, and capabilities.
**Solution**: Created `/Users/matthenrichmacbook/Antigravity/vibeboard/FEATURE_INVENTORY.md`

**Document Contents**:
| Category | Count |
|----------|-------|
| AI Providers | 11 |
| AI Models | 100+ |
| Frontend Pages | 13 |
| Backend Services | 68 |
| UI Components | 122 |
| API Endpoints | 100+ |

**Key Sections**:
1. **AI Providers & Models** - Full catalog with costs (Fal.ai, Replicate, Together, OpenAI, etc.)
2. **Frontend Pages** - All 13 project pages with features and endpoints
3. **Backend Services** - 68 services organized by category (generators, LLM, processing, etc.)
4. **UI Components** - 122 components across 37 directories
5. **Cost Reference** - Tiered pricing from $0 (local) to $0.40/sec (Veo 3)

### Feature 2: Complete Backup Sync
**Location**: `/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/complete backup`

**Files Synced**:
- All 64 modified files from git status
- All new untracked files and directories
- Backend: 167 .ts files
- Frontend: 187 .tsx/.ts files

**Key Files Backed Up**:
- `DatasetGeneratorService.ts` - Hybrid Qwen/Flux generation
- `FalAIAdapter.ts` - Qwen Image Edit 2511 integration
- `qwenRoutes.ts` - New Qwen API routes
- `GenerationCard.tsx` - AI Reshoot button
- `PropFabricatorModal.tsx` - Prop Fabrication UI
- `CastAssemblerPanel.tsx` - Cast Assembler UI
- `TextFixerPanel.tsx` - Text/Sign fixer
- `FEATURE_INVENTORY.md` - Master resource document

### Qwen Image Edit 2511 Integration (from previous session)
**Completed Tasks**:
1. ✅ Add Qwen Image Edit 2511 adapter to FalAIAdapter
2. ✅ Create Qwen API routes (`/api/qwen/*`)
3. ✅ Add AI Reshoot button to GenerationCard toolbar
4. ✅ Integrate Qwen for Character Foundry pose generation
5. ✅ Add Cast Assembler UI
6. ✅ Add Prop Fabrication to Asset Bin
7. ✅ Add Text/Sign fixer to VFX Suite

### Hybrid Generation Mode (DatasetGeneratorService)
**File**: `backend/src/services/training/DatasetGeneratorService.ts`

Three generation modes for Character Foundry:
- `flux` - Flux 2 Max for all poses (best for style variations)
- `qwen` - Qwen Image Edit for all poses (best for geometric accuracy)
- `hybrid` - Qwen for angle/pose changes, Flux for expression/action poses

**Geometric Pose Detection**:
```typescript
const GEOMETRIC_POSE_KEYWORDS = [
    'front view', 'side profile', 'three-quarter view', 'back view',
    'looking over shoulder', 'head tilted', 'turn head', 'facing',
    'nose pointing', 'angled toward', '3/4 view'
];
```

### Files Created/Modified
- `FEATURE_INVENTORY.md` (NEW) - Master resource document
- Backup sync to external SSD

### Build Status
- ✅ All files verified in backup
- ✅ File counts match (167 backend, 187 frontend)
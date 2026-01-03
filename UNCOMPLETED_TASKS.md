# VibeBoard Uncompleted Tasks

> Last updated: January 3, 2026

---

## HIGH PRIORITY

### Open Source Model Migration (Self-Hosted on RunPod)

- **Status**: In Progress
- **Priority**: HIGH (Cost Reduction)
- **Purpose**: Migrate open-source models to self-hosted RunPod workers to eliminate per-generation API costs

#### Phase 1: Image Generation Models

| Model                      | Source                                                                                                  | GPU Req    | Priority | Status          |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------------- |
| FLUX.1 Schnell             | [black-forest-labs/FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell)             | 16GB+ VRAM | HIGH     | ✅ **DEPLOYED** |
| FLUX.1 Dev                 | [black-forest-labs/FLUX.1-dev](https://huggingface.co/black-forest-labs/FLUX.1-dev)                     | 24GB+ VRAM | HIGH     | ✅ **DEPLOYED** |
| Stable Diffusion 3.5 Large | [stabilityai/stable-diffusion-3.5-large](https://huggingface.co/stabilityai/stable-diffusion-3.5-large) | 24GB+ VRAM | MEDIUM   | ✅ **DEPLOYED** |
| HiDream I1                 | [HiDream-ai/HiDream-I1-Full](https://huggingface.co/HiDream-ai/HiDream-I1-Full)                         | 24GB+ VRAM | LOW      | Pending         |

#### Phase 2: Video Generation Models

| Model         | Source                                                                | GPU Req    | Priority | Status          |
| ------------- | --------------------------------------------------------------------- | ---------- | -------- | --------------- |
| Wan 2.1 (14B) | [Wan-AI/Wan2.1-T2V-14B](https://huggingface.co/Wan-AI/Wan2.1-T2V-14B) | 40GB+ VRAM | HIGH     | ✅ Deployed     |
| LTX Video     | [Lightricks/LTX-Video](https://huggingface.co/Lightricks/LTX-Video)   | 24GB+ VRAM | HIGH     | ✅ **DEPLOYED** |
| Hunyuan Video | [tencent/HunyuanVideo](https://huggingface.co/tencent/HunyuanVideo)   | 48GB+ VRAM | MEDIUM   | Pending         |
| CogVideoX     | [THUDM/CogVideoX-5b](https://huggingface.co/THUDM/CogVideoX-5b)       | 24GB+ VRAM | LOW      | Pending         |

#### Phase 3: Specialized Models

| Model              | Source                                                                                                  | GPU Req    | Priority | Status          |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------------- |
| Depth Anything V2  | [depth-anything/Depth-Anything-V2-Large](https://huggingface.co/depth-anything/Depth-Anything-V2-Large) | 8GB+ VRAM  | HIGH     | ✅ **DEPLOYED** |
| IP-Adapter Face ID | [h94/IP-Adapter-FaceID](https://huggingface.co/h94/IP-Adapter-FaceID)                                   | 16GB+ VRAM | MEDIUM   | Pending         |
| FLUX Redux         | [black-forest-labs/FLUX.1-Redux-dev](https://huggingface.co/black-forest-labs/FLUX.1-Redux-dev)         | 24GB+ VRAM | MEDIUM   | Pending         |
| Segment Anything 2 | [facebook/sam2-hiera-large](https://huggingface.co/facebook/sam2-hiera-large)                           | 8GB+ VRAM  | MEDIUM   | ✅ **DEPLOYED** |

#### Depth Anything V2 Large Deployment (Jan 3, 2026)

**Depth Anything V2 Large** is now **FULLY DEPLOYED**:

- **GPU Worker**: `gpu-worker/main.py` - Model loader `_load_depth_anything()` upgraded to Large (335M params)
- **Handler**: `gpu-worker/runpod_handler.py` - RunPod serverless operations (`depth_anything`, `depth_anything_v2`, `depth_estimate`)
- **Backend**: `backend/src/services/gpu/GPUWorkerClient.ts` - API integration with `estimateDepth()` method
- **Frontend**: `frontend/src/lib/ModelRegistry.ts` - Model selection UI (`runpod/depth-anything-v2`)
- **Docker**: `mattydc/vibeboard-gpu-worker:depth-v1` and `mattydc/vibeboard-gpu-worker:latest` - Deployed to DockerHub

**Model Details:**

- **Model ID**: `depth-anything/Depth-Anything-V2-Large-hf`
- **Parameters**: 335M (ViT-L encoder)
- **VRAM**: ~8GB
- **License**: Apache 2.0

**Features:**

- Multiple colormap options: gray, turbo, viridis, plasma
- PNG or JPEG output format
- Normalized depth values (0-255)
- Works on any image without fine-tuning

**Use Cases:**

- Rack focus effects (depth-based blur)
- 3D parallax animations
- Occlusion masks for compositing
- Depth-aware inpainting

**✅ FULLY OPERATIONAL** - Docker image built and pushed (Jan 3, 2026).

#### Segment Anything 2 (SAM2) Deployment (Jan 3, 2026)

**SAM2 Hiera-Large** is now **FULLY DEPLOYED**:

- **GPU Worker**: `gpu-worker/main.py` - Model loader `_load_sam2()` using Hiera-Large (224M params)
- **Handler**: `gpu-worker/runpod_handler.py` - RunPod serverless operations (`sam2_segment`, `sam2`, `segment`)
- **Backend**: `backend/src/services/gpu/GPUWorkerClient.ts` - API integration with `segmentWithSAM2()` method
- **Frontend**: `frontend/src/lib/ModelRegistry.ts` - Model selection UI (`runpod/sam2`)
- **Docker**: `mattydc/vibeboard-gpu-worker:sam2-v1` and `mattydc/vibeboard-gpu-worker:latest` - Deployed to DockerHub

**Model Details:**

- **Model ID**: `facebook/sam2-hiera-large`
- **Parameters**: 224M (Hiera-Large backbone)
- **VRAM**: ~8GB
- **License**: Apache 2.0

**Features:**

- Point prompts (click to segment)
- Box prompts (draw rectangle)
- Multi-mask output with IoU scoring
- PNG or JPEG output format

**Use Cases:**

- Rotoscoping for VFX
- Object selection for inpainting
- Background removal
- Video object tracking

**✅ FULLY OPERATIONAL** - Docker image built and pushed (Jan 3, 2026).

#### Implementation Notes

- **Dockerfile Template**: Extend `gpu-worker/Dockerfile.serverless`
- **Handler Pattern**: Follow `gpu-worker/runpod_handler.py` async pattern
- **Model Caching**: Use `/tmp/models` with HF_HOME environment variable
- **GPU Selection**: A40 (48GB) for large models, L40 (48GB) for production, RTX 4090 (24GB) for smaller models

#### Cost Savings Estimate

| Model        | Current API Cost | Self-Hosted Cost | Monthly Savings (1000 gens) |
| ------------ | ---------------- | ---------------- | --------------------------- |
| FLUX Schnell | $0.003/image     | ~$0.001/image    | ~$2                         |
| FLUX Dev     | $0.025/image     | ~$0.002/image    | ~$23                        |
| LTX Video    | $0.05/video      | ~$0.01/video     | ~$40                        |
| Wan 2.1      | $0.10/video      | ~$0.02/video     | ~$80                        |

#### GitHub Repos for Reference

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Unified inference backend
- [diffusers](https://github.com/huggingface/diffusers) - HuggingFace inference library
- [LTX-Video](https://github.com/Lightricks/LTX-Video) - Official LTX implementation
- [HunyuanVideo](https://github.com/Tencent/HunyuanVideo) - Official Hunyuan implementation
- [Wan2.1](https://github.com/Wan-Video/Wan2.1) - Official Wan implementation

#### Deployment Notes (Jan 3, 2026)

FLUX.1 Schnell and Dev are now **FULLY DEPLOYED**:

- **GPU Worker**: `gpu-worker/main.py` - FLUX pipeline loading and inference
- **Handler**: `gpu-worker/runpod_handler.py` - RunPod serverless operations
- **Backend**: `backend/src/services/gpu/GPUWorkerClient.ts` - API integration with dedicated FLUX endpoint
- **Frontend**: `frontend/src/lib/ModelRegistry.ts` - Model selection UI (runpod/flux-schnell, runpod/flux-dev)
- **Docker**: `mattydc/vibeboard-gpu-worker:flux-v1` - Deployed to DockerHub

**Deployment Details:**

- **RunPod Template ID**: `jcettciq59` (VibeBoard GPU Worker FLUX)
- **RunPod Endpoint ID**: `fjccwvoqbeuzzw` (vibeboard-flux)
- **Environment Variable**: `RUNPOD_FLUX_ENDPOINT_ID=fjccwvoqbeuzzw`
- **GPU**: NVIDIA L40 (48GB VRAM)
- **Max Workers**: 3 (idle timeout: 5 min)
- **Model IDs**: `runpod/flux-schnell`, `runpod/flux-dev`

**Cost Savings Now Active:**

- Schnell: $0.003/image → ~$0.001/image (66% savings)
- Dev: $0.025/image → ~$0.002/image (92% savings)

**✅ FULLY OPERATIONAL** - HuggingFace licenses accepted, endpoint tested and verified working (Jan 3, 2026).

#### SD 3.5 Large & LTX Video Deployment (Jan 3, 2026)

**SD 3.5 Large** and **LTX Video** are now **FULLY DEPLOYED**:

- **GPU Worker**: `gpu-worker/main.py` - Model loaders and API endpoints (`/image/sd35`, `/video/ltx`)
- **Handler**: `gpu-worker/runpod_handler.py` - RunPod serverless operations (`sd35_generate`, `ltx_generate`)
- **Backend**: `backend/src/services/gpu/GPUWorkerClient.ts` - API integration with `generateSD35Image()` and `generateLTXVideo()` methods
- **Frontend**: `frontend/src/lib/ModelRegistry.ts` - Model selection UI (`runpod/sd35-large`, `runpod/ltx-video`, `runpod/ltx-video-i2v`)
- **Docker**: `mattydc/vibeboard-gpu-worker:sd35-ltx-v1` and `mattydc/vibeboard-gpu-worker:latest` - Deployed to DockerHub

**Model Details:**

- **SD 3.5 Large**: 8B parameter model, 28 steps recommended, excellent prompt adherence
- **LTX Video**: 2B DiT-based model, ~2-5 seconds per video, Apache 2.0 license

**Deployment Details:**

- **RunPod Endpoint ID**: `fjccwvoqbeuzzw` (vibeboard-flux - same endpoint, multi-model)
- **GPU**: NVIDIA A40 (44GB VRAM) - verified operational
- **Docker Image**: `mattydc/vibeboard-gpu-worker:latest` (includes FLUX, SD35, LTX)
- **Model IDs**: `runpod/sd35-large`, `runpod/ltx-video`, `runpod/ltx-video-i2v`

**Cost Savings Now Active:**

- SD 3.5 Large: $0.035/megapixel → ~$0.003/image (~91% savings)
- LTX Video: $0.10/video → $0.00/video (100% savings - Apache 2.0)

**✅ FULLY OPERATIONAL** - Docker image built and pushed, endpoint verified healthy (Jan 3, 2026).

---

## MEDIUM PRIORITY

### Global Preferences Panel (Settings Modal)

- **Status**: Not started
- **Priority**: MEDIUM (User Experience)
- **Purpose**: Centralized settings for power-users and personalization

#### Database Model (Prisma)

```prisma
model UserPreferences {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])

  // Theme & Density
  uiMode                String   @default("creative")  // "console" | "creative"
  uiDensity             String   @default("comfortable") // "compact" | "comfortable" | "spacious"
  showTooltips          Boolean  @default(true)

  // Safety & Maturity
  nsfwFilter            String   @default("blur")  // "block" | "blur" | "off"

  // Cost & Performance
  gpuCacheTimeout       Int      @default(300)  // seconds before unloading idle models
  maxConcurrentRenders  Int      @default(2)
  preferredGpuTier      String   @default("balanced") // "economy" | "balanced" | "performance"

  // Editing & Timeline
  defaultFps            Int      @default(24)
  autoSaveInterval      Int      @default(30)  // seconds

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

#### Settings Categories

1. **Theme & Density**
   - **Console Mode**: Monochromatic palette, JetBrains Mono font, hard lines, minimal chrome (for power users)
   - **Creative Mode**: Current colorful aesthetic, Inter font, soft shadows (default for new users)
   - UI Density toggle: Compact / Comfortable / Spacious
   - Show tooltips toggle

2. **Safety & Maturity**
   - NSFW Filter: Block / Blur / Off
   - Content rating preferences

3. **Cost & Performance**
   - GPU Cache Timeout (slider: 60s - 600s)
   - Max Concurrent Renders (1-5)
   - Preferred GPU Tier: Economy / Balanced / Performance

4. **Editing & Timeline**
   - Default FPS (24/30/60)
   - Auto-save interval
   - Keyboard shortcut customization (future)

#### UI Implementation

- Location: `frontend/src/components/settings/SettingsModal.tsx`
- Trigger: Gear icon in header or `/settings` slash command
- Tabs for each category
- Real-time preview of theme changes
- Save button with optimistic UI updates

#### Console Mode Specifics

- Font: JetBrains Mono
- Colors: Grayscale with accent color (user choice)
- Borders: 1px solid, no rounded corners
- Shadows: None
- Inspired by: VS Code, terminal aesthetics

---

### Audio Studio VibeSync

- **Status**: Not started
- **Features**:
  - Neural Foley (AI sound effects)
  - Voice Foundry (ElevenLabs integration)
  - Lip-Sync editor
  - Audio Tab interface

---

### Character Foundry 2.0

- **Status**: Partial (Phase 2 FlashPortrait complete)
- **Missing features**:
  - Face Locker
  - Wardrobe Manager
  - Casting Board
  - Persistent character profiles
  - Auto-inject LoRAs

---

### Director's View Timeline

- **Status**: Not started
- **Features**:
  - Multi-track timeline
  - AI transitions (Morph Cuts, Camera Handoffs)
  - `StoryTimeline.tsx` component

---

### Node Graph View

- **Status**: Not started
- **Purpose**: ComfyUI-style visualization for advanced users
- **ON HOLD**: Paused to focus on cloud-based generation

---

### Phase 7: Team Collaboration

- **Status**: Not started
- **Features**:
  - Team Workspaces
  - Shared projects with permissions
  - Asset libraries
  - Version control

---

### VibeBoard 2.0 Self-Hosted Infrastructure

#### Phase 3: Optics Engines

- GenFocus integration
- Learn2Refocus integration
- Asset engines (3D-RE-GEN, MVInverse)

#### Phase 4: Self-Hosted Models

- Wan 2.1 backbone on RunPod
- InfCam for camera motion
- FlashPortrait for talking heads

#### Phase 5: UI Integration

- Blocking Canvas
- Camera Path Drawer

---

## LOW PRIORITY

### Glass Studio UI

- Full glassmorphism styling
- Framer Motion micro-interactions
- Floating palettes

---

### AI Roto & Paint

- In-video inpainting
- One-click rotoscoping

---

## COMPLETED (Reference)

| Feature                                            | Completion Date |
| -------------------------------------------------- | --------------- |
| GPU Worker Health Verification (RunPod Serverless) | Jan 3, 2026     |
| Producer Agent (Cost Guardian)                     | Dec 31, 2025    |
| P0 Security Hardening (JWT auth)                   | Dec 31, 2025    |
| Visual Librarian (Semantic Search)                 | Dec 26, 2025    |
| Victory Lap (Bake Export, EPK, VideoScopes)        | Dec 26, 2025    |
| Multi-Pass Render Queue                            | Dec 25, 2025    |
| YouTube Delivery Integration                       | Dec 28, 2025    |
| Phase 2 Character Foundry (FlashPortrait)          | Dec 31, 2025    |
| PRODUCTION_PIPELINE.md v3.0 SOP                    | Jan 3, 2026     |
| Pre-Flight Check Modal (Validation Gate)           | Jan 3, 2026     |
| Runtime Medic (Self-Healing Infrastructure)        | Jan 3, 2026     |
| Asset Archiving/Versioning (Asset Hygiene)         | Jan 3, 2026     |
| Technical Strip UI Toggle (Export Burn-In)         | Jan 3, 2026     |
| Launch Readiness Documentation (Security Audit)    | Jan 3, 2026     |
| Real Auth Implementation (JWT + Refresh Tokens)    | Jan 3, 2026     |

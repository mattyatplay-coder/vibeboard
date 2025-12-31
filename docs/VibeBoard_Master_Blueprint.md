# 🎬 VibeBoard 2.0: Master Implementation Blueprint

**Target Architecture:** "Solo Cloud Studio"
**Infrastructure:** Vercel (Frontend) + Railway (Node Logic) + RunPod (Python/GPU Workers) + Cloudflare R2 (Storage).
**Objective:** Integrate 15 advanced research models into a coherent filmmaking pipeline while minimizing API costs.

---

## 🗺️ 1. The Pro Studio Sitemap (Renaming & Flow)

We are restructuring the app to match the **Hollywood Production Pipeline**: *Development -> Pre-Production -> Production -> Post.*

| Order | **New Module Name** | Old Name | Primary AI Models | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Script Lab** | Story Editor | **MiniMax M2.1** (Logic/Coding) | Scripting, breakdown, asset lists. |
| **2** | **Character Foundry** | Training | **FlashPortrait**, **CARI4D**, **Qwen-Edit** | Training actors, performance capture, grip logic. |
| **3** | **Asset Bin** | Elements | **3D-RE-GEN**, **MVInverse**, **AniX** | Object extraction, PBR materials, motion library. |
| **4** | **Optics Engine** | Viewfinder | **Learn2Refocus**, **GenFocus** | Lens physics, bokeh sculpting, focus pulling. |
| **5** | **Stagecraft** *(New)* | N/A | **NitroGen**, **MiniMax** | Virtual sets, blocking, game engine control. |
| **6** | **Shot Studio** | Generate | **Spatia**, **StoryMem**, **ReCo**, **DreaMontage** | Principal photography, continuity generation. |
| **7** | **VFX Suite** | Roto & Paint | **InfCam**, **DiffCamera**, **Qwen-Edit** | Reshooting, fixing, style transfer. |
| **8** | **Sequencer** | Timeline | **MiniMax** (Captions) | Editing, audio mixing, export. |
| **9** | **Dailies** | Dailies | **DiffCamera** (Inspection) | Review, annotation, version control. |

---

## 🏗️ 2. Infrastructure: The "Cost-Killer" Stack

**Immediate Action:** Stop using Fal/Replicate for heavy iterative testing.

### Step A: Storage Migration (Stop paying for bandwidth)
*   **Provider:** Cloudflare R2 (S3 Compatible).
*   **Why:** Zero egress fees.
*   **Implementation:**
    *   Create Bucket: `vibeboard-assets`.
    *   Update Backend: Replace AWS S3 SDK with R2 configuration.

### Step B: The "Universal" GPU Worker (RunPod)
Instead of 10 different API subscriptions, we build **One Python Container** that loads models on demand.

*   **Hardware:** RunPod Secure Cloud -> **RTX A6000 (48GB VRAM)** or **A100 (80GB)**.
*   **Cost:** ~$0.79/hr (A6000). Turn it on when working. Turn it off when sleeping.
*   **Architecture:** FastAPI server with a **Model Manager**.

**`worker/main.py` (The Brain):**
```python
from fastapi import FastAPI
from model_loader import load_model_into_vram, unload_model

app = FastAPI()
CURRENT_MODEL = None

@app.post("/generate/{task}")
async def generate(task: str, payload: dict):
    global CURRENT_MODEL

    # 1. Dynamic VRAM Management
    required_model = MAP_TASK_TO_MODEL[task] # e.g. "shot_studio" -> "Wan2.1"
    if CURRENT_MODEL != required_model:
        unload_model(CURRENT_MODEL)
        load_model_into_vram(required_model)
        CURRENT_MODEL = required_model

    # 2. Inference
    result = run_inference(CURRENT_MODEL, payload)

    # 3. Upload to R2
    url = upload_to_r2(result)
    return {"status": "success", "url": url}
```

---

## 🛠️ 3. Step-by-Step Implementation Guide

### Phase 1: Core & Script Lab (The Brain)
*Goal: Intelligent orchestration and error handling.*

1.  **Deploy MiniMax M2.1 Agent (Node.js):**
    *   Create `services/DirectorAgent.ts`.
    *   **Function:** Intercepts frontend requests.
    *   **Logic:** If user requests "Camera Pan," route to `InfCam`. If "Talking Head," route to `FlashPortrait`.
2.  **Self-Healing Middleware:**
    *   Implement `apiMedic.ts`. If a Python worker crashes or returns bad JSON, MiniMax analyzes the stderr and retries with corrected parameters.

### Phase 2: Pre-Production Engines
*Goal: Building the assets.*

3.  **Asset Bin (3D-RE-GEN & MVInverse):**
    *   **Worker Action:** Install `3d-re-gen` and `mvinverse` repos.
    *   **UI:** Add "Deconstruct Scene" button to Asset Bin images.
    *   **Flow:** Upload Image -> Python Worker (Split) -> Save GLBs to R2 -> Update Asset Bin DB.
4.  **Optics Engine (GenFocus/Learn2Refocus):**
    *   **Worker Action:** Install `GenFocus`.
    *   **UI:** Replace "Focus Slider" with a video scrubber connected to the backend.
    *   **Flow:** On image load -> Generate 2s Focal Stack video -> Stream to UI.

### Phase 3: Production Engines (The Heavy Lift)
*Goal: Generating the content.*

5.  **Character Foundry (FlashPortrait & CARI4D):**
    *   **Worker Action:** Install `FlashPortrait` (uses Wan2.1 backbone).
    *   **UI:** Add "Performance" tab. Inputs: Audio + Image.
    *   **Flow:** Python Worker chunks audio -> generates video segments -> stitches with ffmpeg -> returns MP4.
6.  **Stagecraft (NitroGen):**
    *   **Worker Action:** Install `Unreal Engine 5` (Headless) + `NitroGen` agent on the GPU pod.
    *   **UI:** WebRTC stream from the GPU pod to the browser canvas.
    *   **Flow:** User types action -> NitroGen sends keystrokes to Unreal -> Video stream updates.
7.  **Shot Studio (Spatia & StoryMem):**
    *   **Worker Action:** Install `Spatia` (SLAM + Diffusion).
    *   **UI:** Add "Location Memory" toggle.
    *   **Flow:** Save `point_cloud.ply` between generations to maintain set consistency.

### Phase 4: Post-Production
*Goal: Fixing and Refining.*

8.  **VFX Suite (InfCam & DiffCamera):**
    *   **Worker Action:** Install `InfCam` (Wan2.1 backbone).
    *   **UI:** Add "Camera Path" drawing tool (Fabric.js) over video.
    *   **Flow:** Send video + vector path -> InfCam warps latent space -> Return new video.

---

## 🧩 4. Integration Matrix (Route -> Model -> Action)

| Route | User Action | Model Used | Python Worker Task |
| :--- | :--- | :--- | :--- |
| `/script-lab` | "Breakdown Script" | **MiniMax M2.1** | Analyze text, populate Asset DB slots. |
| `/foundry` | "Generate Performance" | **FlashPortrait** | Audio-driven video generation (Wan backbone). |
| `/foundry` | "Hold Prop" | **CARI4D** | Deform hand mesh around 3D object context. |
| `/asset-bin` | "Extract Materials" | **MVInverse** | Extract Albedo/Normal/Roughness maps. |
| `/optics` | "Rack Focus" | **Learn2Refocus** | Generate focal stack video. |
| `/stagecraft` | "Run forward" | **NitroGen** | Send input events to game engine. |
| `/shot-studio` | "Generate Shot" | **StoryMem** | Inject previous shot's latents into new generation. |
| `/shot-studio` | "Block Scene" | **ReCo** | Constrain diffusion to bounding boxes. |
| `/vfx-suite` | "Change Camera" | **InfCam** | Video-to-Video camera trajectory modification. |
| `/vfx-suite` | "Fix Focus" | **DiffCamera** | Hallucinate high-freq details in blurred regions. |
| `/vfx-suite` | "Edit Shirt" | **Qwen-Edit** | Instruction-based inpainting. |

---

## 💰 5. Cost Analysis: Current vs. RunPod

### Current API Spend Breakdown (~$700/mo)
| Activity | Provider | Unit Cost | Volume | Total |
| :--- | :--- | :--- | :--- | :--- |
| **Video Gen (Dev)** | Fal/Replicate (Wan/Kling) | ~$0.10 - $0.50 / clip | ~500 generations | **$250** |
| **Image Gen (Dev)** | Fal (Flux Pro/Dev) | ~$0.05 / image | ~2,000 images | **$100** |
| **Training (LoRA)** | Replicate | ~$2.00 - $5.00 / run | ~20 characters | **$100** |
| **LLM (Coding)** | Claude 3.5 / OpenAI | ~$0.01 / request | Heavy usage | **$150** |
| **Storage/Bwidth** | Vercel/AWS | Egress fees | High res video | **$100** |
| **TOTAL** | | | | **$700** |

### Proposed RunPod Architecture (~$80/mo)
| Component | Provider | Cost |
| :--- | :--- | :--- |
| **GPU Worker (8hr/day)** | RunPod A6000 | ~$0.79/hr × 8hr × 20 days = **$126** |
| **Storage** | Cloudflare R2 | ~$15 (500GB) |
| **LLM (Kept)** | Claude/Grok | ~$50 (reduced) |
| **Backup Video APIs** | Fal (Kling/Luma) | ~$20 (emergency only) |
| **TOTAL** | | **~$80-100** |

**Savings: 85-90%**

---

## 🔒 6. Models to KEEP on Managed APIs

These remain on external APIs because they are proprietary or more cost-effective for burst usage:

1. **Flux Pro/Dev/Schnell** (Fal) - Sub-second image generation
2. **Claude 3.5 Sonnet** (Anthropic) - Creative writing/scripting
3. **Grok 3 Vision** (xAI) - Visual analysis/metadata tagging
4. **ElevenLabs TTS** - Voice generation for FlashPortrait input
5. **Kling/Luma/Veo** (Fal) - Backup proprietary video engines

---

## 🔄 7. Models MOVING to Self-Hosted (RunPod)

| Model | Replaces | Savings |
| :--- | :--- | :--- |
| **Wan 2.1 (Self-hosted)** | Fal/Replicate Wan | ~85% |
| **3D-RE-GEN** | TripoSR / LGM | 100% (open source) |
| **InfCam** | Runway Gen-3 camera | 100% (open source) |
| **FlashPortrait** | Replicate talking head | ~90% |
| **Qwen-Edit** | Replicate training | ~90% |

---

## 📈 8. Scale Upgrade Points

### Phase 1: Solo / Testing (1 User)
- **Stack:** RunPod Serverless (Pay-per-second) + Railway (Backend)
- **Cost:** ~$50/mo
- **Why:** Sporadic usage, no need for always-on GPU

### Phase 2: Small Studio (2-5 Users)
- **Stack:** RunPod Dedicated Pod (1x A100 or 2x A4000)
- **Cost:** ~$300 - $500/mo (Flat rate)
- **Why:** Eliminates cold starts, enables background rendering

### Phase 3: Production Release (10+ Users)
- **Stack:** Auto-Scaling Cluster (Kubernetes on RunPod/Lambda)
- **Cost:** Scales with revenue
- **Why:** Handle concurrent jobs without queue buildup

---

## 🚀 9. Quick Start (Day 1)

### Immediate Actions:
1. **Create Cloudflare R2 bucket** - Stop bandwidth costs today
2. **Rent RunPod Community Cloud** - RTX 4090 @ $0.40/hr for dev testing
3. **Deploy FastAPI worker shell** - Model loading/unloading manager
4. **Update storage endpoints** - Point backend to R2

### Week 1 Targets:
- [ ] R2 storage migration complete
- [ ] Python worker running Wan 2.1 locally
- [ ] 10 test video generations at ~$0.01 each
- [ ] Validate cost savings before full migration

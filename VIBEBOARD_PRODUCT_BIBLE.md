# 📘 VibeBoard Product Bible & Strategy Log

**Version:** 1.1
**Last Updated:** Dec 31, 2025
**Status:** Phase 3 Execution (Asset Bin)

---

## 1. The Core Doctrine
*Rules that define every product decision. If a feature violates these, cut it.*

1.  **Script Lab is the Gravitational Center, not a Gate.**
    *   We orient users around the story to prevent "blank canvas paralysis."
    *   However, we never block experts from jumping straight to specific tools (Lens tests, Training).
    *   *Rule:* "You can shoot tests without a script, but you don't finish a movie without one."

2.  **The "Producer" Speaks in Trade-offs.**
    *   We do not forbid bad decisions (e.g., expensive drafts).
    *   We make the **consequences** (Cost, Time, Quality risk) painfully visible *before* execution.
    *   *Voice:* "If this were my budget, here's what I'd worry about."

3.  **Outcome > Mechanism.**
    *   **Top Layer:** Tone, Pacing, Realism, Camera Intent.
    *   **Hidden Layer:** Seeds, Schedulers, CFG Scales.
    *   *UI Rule:* Never show a technical slider if a creative toggle can achieve the same result.

4.  **Vertical Integration.**
    *   We are not an API Wrapper. We are a **Studio OS**.
    *   We own the compute (RunPod) and the storage (R2) to enable "Pro" features like long-form continuity that generic wrappers cannot offer.

---

## 2. The Canonical Workflow ("The Spine")
*The default path we highlight in the UI to guide a Solo Creator.*

| Step | Department (Page) | Purpose | Output |
| :--- | :--- | :--- | :--- |
| **1** | **Script Lab** | Development | **Scene Manifest** (JSON list of required Assets) |
| **2** | **Asset Bin** | Art Dept | **Filled Slots** (Every Character/Prop has a linked file) |
| **3** | **Character Foundry** | Casting | **Trained LoRAs** & **Performance** (Talking Heads) |
| **4** | **Optics Engine** | Pre-Viz | **Global Look LUT** (Lens + Lighting presets) |
| **5** | **Shot Studio** | Production | **Coverage** (Raw Video Clips) |
| **6** | **VFX Suite** | Post-Prod | **Finals** (Fixed glitches, sharpened faces) |
| **7** | **Sequencer** | Editorial | **Master File** (.mp4) |

---

## 3. Infrastructure Architecture (The "Solo Cloud" Stack)
*Designed to minimize burn rate while maximizing compute power.*

*   **Frontend:** Vercel (Next.js) - *Speed & CDN.*
*   **Backend Logic:** Railway (Node.js) - *Orchestration & Agents.*
*   **Heavy Compute:** RunPod (Python/FastAPI) - *Hosting Wan 2.1, Spatia, InfCam.*
    *   *Hardware:* NVIDIA A40 (48GB VRAM) or A6000.
    *   *Policy:* 15-minute idle timeout (Session-based).
*   **Storage:** Cloudflare R2 - *Zero egress fees for massive video files.*
*   **Database:** Supabase (PostgreSQL) - *Connection pooling for agent workloads.*

---

## 4. UI/UX Design Language
*Aesthetic: "Linear meets DaVinci Resolve."*

*   **Palette:** Zinc 950 (`#09090b`) background. No pure black.
*   **Depth:** 1px Borders (`white/10`), not drop shadows.
*   **Typography:** Inter (UI) + JetBrains Mono (Data/Timecode).
*   **Density:** High. Show metadata upfront.
*   **Hierarchy:**
    *   **Creative Actions:** Violet Glow (`#8b5cf6`).
    *   **Technical Data:** Cyan (`#22d3ee`).
    *   **Destructive/Record:** Signal Red (`#ef4444`).

---

## 5. Strategic Feedback Log

> "VibeBoard is not a tool that makes good work inevitable. It is a system that makes the cost of bad decisions unavoidable."

> "If Script Doctor doesn't orchestrate entry into the rest of the system, it will become just another powerful surface instead of the spine you claim it is."

> "You are closer to an OS than a product. OSs fail when defaults aren't opinionated."

---

## 6. Implementation Roadmap & Status

### Phase 1: Development (Script Lab)
*   **Status:** ✅ **COMPLETE (Green)**
*   **Key Tech:** MiniMax M2.1 Agent.
*   **Capabilities:** Generates screenplays, auto-extracts Asset Lists, populates Asset Bin.

### Phase 2: Pre-Production (Foundry)
*   **Status:** ✅ **COMPLETE (Green)**
*   **Key Tech:** FlashPortrait (Wan 2.1), RunPod Worker.
*   **Capabilities:** "Performance Mode" (Audio + Image -> Video), Training.

### Phase 3: Assets (Asset Bin)
*   **Status:** 🟡 **IN PROGRESS**
*   **Key Tech:** 3D-RE-GEN, MVInverse.
*   **Goal:** "Deconstruct" 2D images into 3D assets; "Extract" PBR materials.

### Phase 4: Production (Shot Studio & Optics)
*   **Status:** ⚪ **PLANNED**
*   **Key Tech:** Spatia (Sets), ReCo (Blocking), Learn2Refocus (Optics).

### Phase 5: Post (VFX & Sequencer)
*   **Status:** ⚪ **PLANNED**
*   **Key Tech:** InfCam (Reshoot), DiffCamera (Focus Fix).

# 📘 VibeBoard Product Bible & Strategy Log

**Version:** 1.2
**Last Updated:** Dec 31, 2025 (Finalization)

---

## 1. The Core Doctrine
*Rules that define every product decision. If a feature violates these, cut it.*

1.  **Script Lab is the Gravitational Center.**
    *   We orient users around the story (canonical flow).
    *   We never block experts from experimentation.
    *   *Rule:* "You can shoot tests without a script, but you don't finish a movie without one."

2.  **The "Producer" Speaks in Trade-offs.**
    *   We do not forbid bad decisions.
    *   We make the **consequences** (Cost, Time, Quality risk) explicitly visible *before* execution.

3.  **Outcome > Mechanism.**
    *   Expose filmmaking controls (Lens, Lighting, Pacing) first.
    *   Hide diffusion controls (Seed, Scheduler, CFG) behind an "Advanced" toggle.

4.  **Security is Financial Protection (P0).**
    *   All paid compute endpoints are gated by **Authentication** (AuthN) and **Authorization** (AuthZ) to prevent financial risk (GPU draining).

---

## 2. The Canonical Workflow ("The Spine")
*The enforced, most efficient path through the studio.*

| Step | Department (Page) | Purpose | Key Tech Implemented | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Script Lab** | Development | **MiniMax M2.1** (Logic/Breakdown) | **🟢 GREEN** |
| **1A**| **Script Library (RAG)** | **Style Authenticity** | **pgvector** (Vector Search) | **✅ NEW REQUIREMENT** |
| **2** | **Asset Bin** | Art Dept (Props/Sets) | **3D-RE-GEN**, **MVInverse** | **🟢 GREEN** |
| **3** | **Character Foundry** | Casting/Performance | **FlashPortrait**, **CARI4D** | **🟢 GREEN** |
| **4** | **Optics Engine** | Pre-Viz & Look Dev | **Learn2Refocus**, **GenFocus** | **🟢 GREEN** |
| **5** | **Shot Studio** | Production / Filming | **Spatia**, **ReCo**, **StoryMem** | **🟢 GREEN** |
| **6** | **VFX Suite** | Repair & Polish | **InfCam**, **DiffCamera** | **🟢 GREEN** |
| **7** | **Sequencer** | Editorial / Delivery | **MiniMax Captions**, **FFmpeg** | **🟢 GREEN** |

---

## 3. Infrastructure Architecture (The Production Stack)
*All components are now correctly wired and secured.*

*   **Frontend:** Vercel (Next.js)
*   **Backend Logic:** Railway (Node.js/Express)
*   **Database:** Supabase/Railway **PostgreSQL** (`pgvector` support enabled)
*   **Queue:** BullMQ (Redis) - *Handles all async jobs (Curation, Export).*
*   **Storage:** **Cloudflare R2** - *Zero Egress Fees (Primary asset storage).*
*   **Heavy Compute (GPU):** RunPod Secure Cloud (NVIDIA A40/A6000) - *The single source for Wan 2.1, Spatia, InfCam, and all research models.*

---

## 4. Security & Critical Rework Summary

| Item | Status | Action |
| :--- | :--- | :--- |
| **P0 Auth/AuthZ** | ✅ COMPLETE | All paid routes are gated by `withAuth` and `requireGenerationQuota`. |
| **Storage Integrity** | ✅ COMPLETE | Uploads are directed to R2, not local disk. Pro file types (.glb, .safetensors) are accepted. |
| **Async Stability** | ✅ COMPLETE | Exports/Curation are handled by BullMQ queue service, eliminating serverless timeouts. |
| **GPU Access** | ✅ COMPLETE | `GPUWorkerClient.ts` is fully implemented and correctly maps tasks to RunPod. |
| **Asset Pipeline** | ✅ COMPLETE | Script $\to$ Asset $\to$ Foundry pipeline is complete. |

---

## 5. Next Execution Sprint (Target: Library of Alexandria)

| Task ID | Component | Description |
| :--- | :--- | :--- |
| **RAG-01** | Database | Install `pgvector` extension on Supabase/Postgres. |
| **RAG-02** | Backend Service | Create `VectorEmbeddingService.ts` to convert text to vectors. |
| **RAG-03** | Script Lab Integration | Implement RAG query in `ScriptService.ts` to fetch style references from the vector database. |

# 📘 VibeBoard Product Bible & Strategy Log

**Version:** 2.0 (Go-to-Market Readiness)
**Last Updated:** Dec 31, 2025
**Status:** Code Complete (Architecture) / UX Sprint Active

---

## 1. The Core Doctrine
*Rules that define every product decision. (The CEO Philosophy)*

1.  **Script Lab is the Gravitational Center.** We guide the user to the story first, but never block experimentation.
2.  **The "Producer" Speaks in Trade-offs.** We expose cost and risk (The Producer Agent) to ensure consequences are visible before committing to an expensive decision.
3.  **Outcome > Mechanism.** We prioritize filmmaking language (Lens, Lighting) over diffusion technology (Seed, Scheduler).
4.  **Security is Financial Protection (P0).** All paid compute is gated by AuthN/AuthZ.

---

## 2. The Final VibeBoard Pipeline (7 Phases)

This is the definitive, complete vertical integration of all features.

| Phase | Module | Purpose | Key Tech | Status |
| :--- | :--- | :--- | :--- | :--- |
| **I** | **Script Lab** | **Development.** Story generation & breakdown. | **MiniMax M2.1** (Agent Logic), **RAG System** (Style), **Claude 3.5** | 🟢 **GREEN** |
| **II** | **Asset Bin** | **Art Dept & Props.** Asset storage and manipulation. | **3D-RE-GEN** (Sets), **MVInverse** (Materials) | 🟢 **GREEN** |
| **III** | **Foundry** | **Casting & Performance.** Character training & animation. | **FlashPortrait**, **CARI4D** (Grip), **LoRA** | 🟢 **GREEN** |
| **IV** | **Optics Engine** | **Pre-Viz & Camera.** Defining the visual grammar. | **Learn2Refocus**, **GenFocus**, Cadrage Data | 🟢 **GREEN** |
| **V** | **Shot Studio** | **Production.** Principal photography and blocking. | **Spatia**, **ReCo**, **StoryMem** | 🟢 **GREEN** |
| **VI** | **VFX Suite** | **Post-Prod & Repair.** Final fixing and polishing. | **InfCam**, **DiffCamera**, **AniX** (Motion Clone) | 🟢 **GREEN** |
| **VII** | **Sequencer** | **Editorial & Delivery.** Final assembly and export. | **FFmpeg**, **MiniMax Captions**, **EDL/EPK** | 🟢 **GREEN** |

---

## 3. Critical Component Review (Final Scan)

| Component | Status | Missing Element / Enhancement |
| :--- | :--- | :--- |
| **Team Collaboration** | ⚠️ **NOT IMPLEMENTED** | **CRITICAL:** Team/Organization structure missing from Prisma. Must be prioritized immediately for commercial launch. |
| **Script Library (RAG)**| ✅ **IMPLEMENTED** | **Data Ingestion:** The final system relies on the raw scripts being vectorized. A dedicated ingestion utility must be run. |
| **Sequencer (Export)** | ✅ **IMPLEMENTED** | **Technical Strip:** Burn-in of Lens/Timecode data has been coded in the service (a requirement from Cadrage audit). |
| **Producer Agent** | ✅ **IMPLEMENTED** | **Logic Complete:** All cost/risk/consistency alerts are ready to deploy in the final UI sprint. |
| **All GPU Models**| ✅ **IMPLEMENTED** | All 15+ research models are wired to the **RunPod A6000** worker. |

---

## 4. Final Directive: Go-to-Market Priority

The entire product core is finished. The last major piece of missing **infrastructure** is the ability to handle multiple users.

**Final Next Step:** Execute the **Phase 7: Team Collaboration** model refactor immediately.

**Implementation Action:**
1.  **Execute the Prisma Schema** for `Team` and `TeamMember` tables.
2.  **Refactor all controllers** (Projects, Elements, Generations) to scope by `teamId` instead of `userId`.
3.  **Then**, launch the final UI sprint.

This completes the VibeBoard 2.0 blueprint.

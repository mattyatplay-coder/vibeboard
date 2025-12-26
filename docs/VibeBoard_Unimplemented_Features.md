# VibeBoard: Unimplemented/Forgotten Features

*Based on analysis of 659 Claude sessions + 11 Gemini brains*

---

## HIGH PRIORITY - Core Features Never Completed

### 1. Scene Chaining & Video Extension System
**Status:** Backend incomplete, frontend partial

- [ ] Update Prisma schema (Character, SceneChain models)
- [ ] Create Character Controller & Routes
- [ ] Create Extend Video Controller & Routes
- [ ] Implement real video analysis (currently mocked)
- [ ] Frontend: Implement Scene Chaining UI
- [ ] Integration testing

### 2. Fal.ai Model Documentation & Parameter Research
**Status:** Never started

- [ ] Wan 2.1: Find FPS, frames parameters and schema
- [ ] Kling: Find Camera Control schema
- [ ] Veo: Check capabilities and schemas
- [ ] Create docs/fal_models.md summary
- [ ] Update FalAIAdapter.ts and modelCapabilities.ts

### 3. Deployment Scripts
**Status:** Never completed

- [ ] Prepare production deployment scripts
- [ ] Docker configuration finalization
- [ ] Environment variable documentation

---

## MEDIUM PRIORITY - Vision Features Not Started

### 4. Audio Studio "VibeSync"
**Status:** Conceptualized, not implemented

- [ ] Neural Foley: Generate ambient sound/SFX from video analysis
- [ ] Voice Foundry: ElevenLabs/OpenAI Audio integration for dialogue
- [ ] Lip-Sync Pipeline: Dedicated editor (partially implemented with sync-lips)
- [ ] Audio Tab interface for generating and layering sound

### 5. Character Foundry 2.0
**Status:** Basic version exists, advanced features missing

- [ ] Face Locker: Upload 5 photos → Train dedicated LoRA on-the-fly
- [ ] Wardrobe Manager: Define outfits separately from character face
- [ ] Casting Board: UI to cast generated characters into script roles
- [ ] Persistent Character profiles (LoRAs/Embeddings)
- [ ] Consistency Hook: Auto-inject Character LoRAs in generations

### 6. Director's View Timeline
**Status:** Conceptualized, not implemented

- [ ] Multi-Track Timeline (Video, Audio, SFX, adjustment layers)
- [ ] AI Transitions (Morph Cuts, Camera Handoffs)
- [ ] StoryTimeline.tsx component to replace/augment linear Storyboard

### 7. Node Graph View
**Status:** Conceptualized, not implemented

- [ ] Toggle from Timeline View to Node Graph View
- [ ] Visualize ComfyUI backend logic
- [ ] For advanced VFX Supervisor workflows

---

## LOW PRIORITY - Polish & Enhancement

### 8. Glass Studio UI Theme (Partial)
**Status:** Partially implemented

- [ ] Full glassmorphism implementation (backdrop-filter: blur-md)
- [ ] framer-motion page transitions and card interactions
- [ ] Micro-interactions (button glow/scale on hover)
- [ ] Success state particle effects
- [ ] Collapsible "Floating Palettes" for tools

### 9. Landing Page Redesign
**Status:** Not started

- [ ] "Netflix for Projects" gallery design
- [ ] Immersive canvas with less chrome

### 10. AI Roto & Paint (VFX)
**Status:** Conceptualized, not implemented

- [ ] In-Video Inpainting ("remove that coffee cup in a moving video")
- [ ] One-click rotoscoping for background removal
- [ ] Compositing characters into 3D environments

### 11. Camera Control Verification
**Status:** Implemented but not verified

- [ ] Verify camera controls work with Veo models

---

## KNOWN BUGS - Never Fully Resolved

### 12. Video Generation with Local Elements
**Discussed:** Multiple sessions

- [ ] Reference images from local storage not accessible to providers
- [ ] Element URLs need to be publicly accessible or base64-encoded

### 13. ComfyUI Workflow Integration
**Discussed:** Wizardly-engelbart worktree

- [ ] ComfyUI workflows not fully integrated with generation pipeline
- [ ] Active bug with workflow execution

### 14. Native App Verification
**Status:** Mentioned but never verified

- [ ] macOS native app packaging
- [ ] Desktop app deployment

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Core Features Incomplete | 3 |
| Vision Features Not Started | 4 |
| Polish/Enhancement | 4 |
| Known Bugs Unresolved | 3 |
| **Total** | **14 major items** |

---

## Recommended Priority Order

1. **Scene Chaining System** - Critical for multi-shot workflows
2. **Fal.ai Model Documentation** - Needed for proper parameter handling
3. **Deployment Scripts** - Blocking production launch
4. **Audio Studio** - Major differentiator vs competitors
5. **Character Foundry 2.0** - Solves the consistency problem
6. **Director's Timeline** - Pro-level editing capability

---

*Document generated: December 22, 2025*
*Source: Analysis of 659 Claude sessions + 11 Gemini brains*

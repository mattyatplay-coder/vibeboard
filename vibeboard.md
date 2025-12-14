# VibeBoard Master Reference Document

> **Last Updated**: December 9, 2024  
> **Project Owner**: Matt Henrich  
> **Location**: `/Users/matthenrichmacbook/Antigravity/vibeboard/`

---

## Table of Contents

1. [Project Vision & Overview](#project-vision--overview)
2. [Current State & Active Work](#current-state--active-work)
3. [Technical Architecture](#technical-architecture)
4. [AI Prompt Engineering Guide](#ai-prompt-engineering-guide)
5. [Knowledge Files Reference](#knowledge-files-reference)
6. [Feature Roadmap](#feature-roadmap)
7. [Development Patterns & Best Practices](#development-patterns--best-practices)
8. [Session Management](#session-management)
9. [Resolved Issues & Change Log](#resolved-issues--change-log)

---

## Project Vision & Overview

### What is VibeBoard?

VibeBoard is an **AI video generation platform** designed as an LTX.studio-style creative tool with multi-provider support. It serves creators working on multi-character animated projects, enabling professional-quality AI video generation accessible to everyone.

### Core Philosophy

- **Multi-Provider Flexibility**: Integrate multiple AI providers (Fal.ai, Google Gemini/Veo, Replicate, ComfyUI, HuggingFace, OpenAI/Sora) to offer flexibility and cost optimization
- **Character Consistency**: Maintain character and style consistency across scenes for multi-character projects
- **Cost Optimization**: Strategic provider selection for significant savings (free tiers, local deployment)
- **Dual-Mode UX**: Quick 2-minute workflows for casual users AND advanced 5-minute setups for power users
- **Uncensored Creation**: Enable creative freedom without unnecessary restrictions

### Current Focus: Hawaiian Adventure Project

Matt's active project features 8-9 recurring characters:
- **Kona** - Main character
- **Chase Maddox** - Supporting character
- **Myra Aikau** - Supporting character  
- **Turtle Character** - Animal companion
- Professional character reference materials including turnaround sheets with multiple viewing angles

---

## Current State & Active Work

### Active Bugs

#### Bug 1: LoRA State Synchronization
**Status**: Under Investigation  
**Symptoms**:
- Style & Parameters modal correctly shows selected LoRAs
- Smart Prompt Builder displays "No LoRAs selected"
- Disconnected state management between React components

**Files Involved**:
- `PromptBuilder.tsx`
- `StyleSelectorModal.tsx`
- `LoRAManager.tsx`
- Zustand state store

**Root Cause**: State not properly propagating between components via Zustand

---

#### Bug 2: Smart Prompt Builder Engine Detection Outdated
**Status**: Partially Fixed  
**Symptoms**:
- User selects "Kling 2.6 I2V" in engine selector
- Smart Prompt Builder shows "Kling 2.1"
- Prompt enhancement uses wrong format

**Fix Applied**: Updated `ModelPromptGuides.ts` with specific guides for Kling 2.6, Kling O1, Wan 2.5, and Sora; refined fuzzy match logic

**Remaining Work**: Verify all engine variants are properly detected

---

### Recently Completed

- ✅ Structure + Face generation (Smart Mode with ControlNet + IP-Adapter)
- ✅ Save Generation as Element feature
- ✅ Shot Navigator drag & drop fixes
- ✅ Kling Avatar audio support
- ✅ Upscale functionality (Clarity 2x/4x, AuraSR)
- ✅ Element Picker UI improvements

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS 4 |
| **State Management** | Zustand |
| **Backend** | Express.js, TypeScript, Prisma ORM |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **AI Providers** | Fal.ai, Replicate, Together AI, Google AI/Veo, OpenAI/Sora, Runway, XAI, HuggingFace, ComfyUI (local) |

### Project Structure

```
vibeboard/
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages
│       │   └── projects/[id]/generate/
│       ├── components/       # React components
│       │   ├── PromptBuilder.tsx
│       │   ├── StyleSelectorModal.tsx
│       │   ├── LoRAManager.tsx
│       │   ├── ElementReferencePicker.tsx
│       │   └── ...
│       ├── lib/              # API client, stores
│       │   └── stores/       # Zustand stores
│       └── context/          # React contexts
├── backend/
│   └── src/
│       ├── routes/           # 17+ route files
│       ├── services/
│       │   ├── video-generation.service.ts
│       │   ├── element-library.ts
│       │   └── storyboard.ts
│       ├── adapters/
│       │   └── FalAIAdapter.ts
│       └── middleware/
├── prisma/                   # Database schema
├── AI improvements/          # Documentation & specs
├── vibeboard-improvements/   # Enhancement modules
└── CLAUDE.md                 # Session continuity doc
```

### Key Architecture Patterns

#### Element System
```typescript
// Elements use storyboardProjectId, NOT projectId
const element = {
  storyboardProjectId: "...",  // Use this for linking
  views: [{
    imageUrl: "..."  // Actual image URL (fileUrl is null)
  }],
  tags: '["tag1", "tag2"]'  // JSON string - needs parsing
};

// Safe tag parsing
const parsedTags = Array.isArray(element.tags) 
  ? element.tags 
  : JSON.parse(element.tags || '[]');
```

#### Authentication (Currently Mock)
```typescript
// All API calls need this header
headers: { 'Authorization': 'Bearer mock-token' }
```

#### Video Generation Routing
- 13+ engine routing in `video-generation.service.ts`
- Fal.ai is primary provider
- Modular adapter pattern for each provider

---

## AI Prompt Engineering Guide

### Claude's Role

Claude serves as a **master AI video and image prompt engineer** with deep expertise across all major generation platforms. The role is to transform creative ideas into optimized, production-ready prompts while recommending the best engines and settings.

### Core Expertise Areas

- **Platforms**: Fal.ai (Wan, Kling, Luma, LTX, Hunyuan, Minimax, Pika), Google Veo (3.1, 3, 2), OpenAI Sora (2, 2 Pro), Replicate, ComfyUI, HuggingFace
- **Technical Parameters**: CFG scale, steps, samplers, schedulers, seeds
- **Resources**: LoRAs, checkpoints, workflows, motion modules
- **Troubleshooting**: Quality issues, motion problems, consistency

### Prompt Structure Template

```
[Shot Type] [Subject] [Action/State] [Environment] [Lighting] [Style] [Camera Movement] [Mood/Atmosphere]
```

### Specificity Guidelines

| Instead of... | Use... |
|--------------|--------|
| "beautiful" | "golden hour lighting, soft bokeh" |
| "moving" | "slow dolly forward, tracking shot" |
| "colorful" | "vibrant neon blues and magentas" |

### Quality Enhancers
`high detail, sharp focus, 4K, 8K, cinematic, professional color grading, film grain`

### Camera Terms
`shallow depth of field, anamorphic lens, 35mm, 50mm, bokeh, wide angle`

### Lighting Terms
`volumetric lighting, god rays, dramatic lighting, soft diffused, backlighting, rim light`

### Platform-Specific Syntax

| Platform | Prompt Style |
|----------|--------------|
| **FLUX** | Natural language descriptions |
| **SDXL** | Weighted tags `(keyword:1.2)` |
| **Hailuo Director** | Bracket syntax `[SCENE]...[/SCENE]` |
| **Kling** | Structured with shot types |

### Conversation Approach

1. **ACKNOWLEDGE** - Confirm understanding of vision
2. **CLARIFY** - Ask about: output type, references, aspect ratio, duration, resources, camera style, platform constraints, budget
3. **DEEP DIVE** - Style, lighting, mood, motion type, color grading
4. **ANALYZE & RECOMMEND** - 2-3 optimal engines with reasoning
5. **DELIVER** - Complete prompt package with settings

### Output Format

```
🎯 RECOMMENDED ENGINE: [Engine Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 OPTIMIZED PROMPT:
[Structured prompt]

⚙️ TECHNICAL SETTINGS:
- CFG Scale: [value]
- Steps: [value]
- Sampler: [name]
- Resolution: [dimensions]
- Duration: [seconds]
- FPS: [framerate]

🎨 ADDITIONAL RESOURCES:
- LoRAs: [with weights and trigger words]
- Workflow: [if applicable]

💡 PRO TIPS:
[2-3 specific tips]

⚠️ IMPORTANT NOTES:
[Critical considerations]
```

---

## Knowledge Files Reference

### Available Reference Files

| File | Purpose | Location |
|------|---------|----------|
| Engine Comparison Matrix | Engine specs, capabilities, pricing | `/mnt/project/Engine_Comparison_Matrix.txt` |
| Prompt Templates Library | Example prompts, structures | `/mnt/project/Prompt_Templates_Library.txt` |
| LoRA Database | LoRA info, trigger words, weights | `/mnt/project/LoRA_Database.txt` |
| Troubleshooting Guide | Common issues and solutions | `/mnt/project/Troubleshooting_Guide.txt` |
| Workflow Examples | ComfyUI workflows | `/mnt/project/Workflow_Examples.txt` |

### Project Documentation

| Document | Purpose |
|----------|---------|
| `AI improvements/Feature Enhancement Roadmap.pdf` | Platform comparison insights |
| `AI improvements/vibeboard-extend-video-spec-REVISED.md` | Extend Video feature spec |
| `AI improvements/vibeboard_sora2_integration_guide.md` | Sora 2 integration |
| `AI improvements/VibeBoard_Master_Recommendations.md` | Technical recommendations |

---

## Feature Roadmap

### Implemented Features ✅

- Text-to-Image generation (30+ models)
- Image-to-Video generation
- Text-to-Video generation
- Element library with multi-view support
- @ syntax for element references in prompts
- Magic Prompt (auto-enhancement)
- LoRA integration with Civitai
- Technical controls (CFG, steps, samplers)
- Upscale (Clarity 2x/4x, Aura SR, Topaz Video, RealESRGAN)
- Save Generation as Element
- 111 Playwright tests
- Smart Mode (ControlNet + IP-Adapter)
- Shot Navigator with drag & drop
- 24 Style Presets

### In Progress 🔧

- LoRA state synchronization fix
- Engine detection improvements
- Sora 2 video content download
- Veo 3.1 full integration

### Planned Features 📋

#### Extend Video Feature (Major)
Comprehensive video extension system including:
- Hybrid preview capabilities
- Smart model recommendations
- Semi-automatic scene chaining with review points
- Project-wide character libraries
- Detailed consistency scoring

#### Additional Planned
- Real authentication system (replace mock)
- Seed control UI
- Aspect ratio preset picker
- Batch generation
- Enhanced character consistency scoring
- Cost tracking dashboard

---

## Development Patterns & Best Practices

### Modular Architecture

```typescript
// Provider adapters follow consistent interface
interface ProviderAdapter {
  generateImage(params: GenerationParams): Promise<GenerationResult>;
  generateVideo(params: VideoParams): Promise<VideoResult>;
  checkStatus(jobId: string): Promise<JobStatus>;
}
```

### State Management with Zustand

```typescript
// Store pattern
const useGenerationStore = create((set, get) => ({
  selectedEngine: null,
  selectedLoRAs: [],
  setEngine: (engine) => set({ selectedEngine: engine }),
  addLoRA: (lora) => set((state) => ({
    selectedLoRAs: [...state.selectedLoRAs, lora]
  })),
}));
```

### Error Handling

```typescript
// Consistent error response format
{
  success: false,
  error: {
    code: "GENERATION_FAILED",
    message: "Human-readable message",
    details: { /* debug info */ }
  }
}
```

### Testing

```bash
# Run all tests
cd frontend && npm test

# Run with UI
npm run test:ui

# Specific test suite
npm run test:audit
```

---

## Session Management

### ⚠️ CRITICAL: File Location

**ALWAYS edit files in:**
```
/Users/matthenrichmacbook/Antigravity/vibeboard/
```

**NEVER use:**
```
~/.claude-worktrees/vibeboard/
```

Previous sessions edited worktree copies and changes weren't reflected in the main app.

### Before Every Edit

Confirm path starts with:
```
/Users/matthenrichmacbook/Antigravity/vibeboard/
```

### After Every Session

Update these files:
1. **CLAUDE.md** - Bugs fixed, changes made, new issues
2. **vibeboard.md** (this file) - Major updates, roadmap changes

### Running the Project

```bash
# Backend (Port 3001)
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# Frontend (Port 3000)
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `backend/.env`:
```env
FAL_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
REPLICATE_API_TOKEN=
XAI_API_KEY=
TOGETHER_API_KEY=
HUGGINGFACE_API_KEY=
DATABASE_URL=file:./dev.db
```

---

## Resolved Issues & Change Log

### Resolved Bugs

| Bug | Solution | Date |
|-----|----------|------|
| LoRA State Not Syncing | Passed `initialLoRAs` prop to `PromptBuilder`, enriched `StyleConfig` with `triggerWord` and `type` | 2024-12-08 |
| Smart Prompt Builder Engine Detection | Updated `ModelPromptGuides.ts` with specific guides for new engines, refined fuzzy match | 2024-12-08 |
| Shot Navigator Drag & Drop | Adjusted z-indices and pointer events, improved visuals | 2024-12-08 |
| Kling Avatar "Unprocessable Entity" | Fixed API parameter mapping (`image_url`/`audio_url`), removed unsupported params | 2024-12-09 |
| Structure + Face Generation | Implemented Smart Mode with ControlNet Depth + IP-Adapter, fixed Element ID passing | 2024-12-09 |
| Element Picker Selection | Updated highlight to blue, improved styling | 2024-12-08 |

### Change Log

| Date | Change | Files Modified |
|------|--------|----------------|
| 2024-12-08 | Fixed LoRA Sync | `StyleSelectorModal.tsx`, `PromptBuilder.tsx`, `generate/page.tsx` |
| 2024-12-08 | Shot Navigator Fixes | `GeneratePage.tsx`, `ShotNavigator.tsx`, `GenerationCard.tsx` |
| 2024-12-08 | Element Picker UI | `ElementReferencePicker.tsx` |
| 2024-12-09 | Kling Avatar Support | `FalAIAdapter.ts`, `GeneratePage.tsx`, `AudioInputModal.tsx` |
| 2024-12-09 | Upscale Functionality | `GenerationCard.tsx` |
| 2024-12-09 | Save as Element | `elementController.ts`, `elementRoutes.ts`, `GenerationCard.tsx`, `SaveElementModal.tsx` |
| 2024-12-09 | Structure + Face Fix | `FalAIAdapter.ts`, `ElementReferencePicker.tsx` |

---

## Quick Reference

### API Endpoints

```
GET    /api/projects                    - List projects
POST   /api/projects                    - Create project
GET    /api/projects/:id                - Get project
DELETE /api/projects/:id                - Delete project

GET    /api/projects/:id/elements       - List elements
POST   /api/projects/:id/elements       - Upload element
DELETE /api/projects/:id/elements/:eid  - Delete element

GET    /api/projects/:id/generations    - List generations
POST   /api/projects/:id/generations    - Create generation
PATCH  /api/projects/:id/generations/:gid - Update generation
DELETE /api/projects/:id/generations/:gid - Delete generation

GET    /api/projects/:id/loras          - List LoRAs
POST   /api/projects/:id/loras          - Add LoRA
PUT    /api/projects/:id/loras/:lid     - Update LoRA
DELETE /api/projects/:id/loras/:lid     - Delete LoRA

GET    /api/projects/:id/scenes         - List scenes
POST   /api/projects/:id/scenes         - Create scene
POST   /api/scenes/:sid/shots           - Add shot to scene
```

### Supported Models (30+)

**Image**: Flux Dev/Schnell/Pro, Recraft V3, Ideogram V2, Stable Diffusion 3.5

**Video**: Wan 2.2/2.5, Kling 2.1/2.6/O1, Hunyuan, MiniMax, Luma Dream Machine, LTX-Video, Google Veo 2/3/3.1, Sora 2

**Upscalers**: Clarity 2x/4x, Creative Upscaler, Aura SR, RealESRGAN

---

*This document serves as the single source of truth for the VibeBoard project. Keep it updated after every significant session.*

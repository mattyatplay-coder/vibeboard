# VIBEBOARD FEATURE MANIFESTO
## The Complete Capability Index

> **Last Updated**: December 25, 2025
> **Version**: 1.0
> **Total Features**: 500+

---

## Table of Contents

1. [Generation Engine](#1-generation-engine)
2. [Character Consistency](#2-character-consistency)
3. [Cinematic Tools](#3-cinematic-tools)
4. [Story Pipeline](#4-story-pipeline)
5. [Post-Processing](#5-post-processing)
6. [Training & LoRAs](#6-training--loras)
7. [UI/UX Features](#7-uiux-features)
8. [Intelligence Systems](#8-intelligence-systems)
9. [Cost & Tracking](#9-cost--tracking)
10. [API Endpoints](#10-api-endpoints)
11. [Infrastructure](#11-infrastructure)
12. [Competitive Advantages](#12-competitive-advantages)

---

## 1. GENERATION ENGINE

### 1.1 Multi-Provider Orchestration

| Provider | Model Count | Specialization |
|----------|-------------|----------------|
| **Fal.ai** | 30+ | Primary (Flux, Kling, Wan, Veo, Luma, LTX) |
| **Replicate** | 10+ | Custom LoRAs, AnimateDiff |
| **Together AI** | 5+ | Budget (Flux Schnell free tier) |
| **OpenAI** | 3 | DALL-E 3, Sora, GPT-4V |
| **Google** | 2 | Veo, Imagen 3 |
| **HuggingFace** | 5+ | Open-source models |
| **Civitai** | ∞ | Community LoRAs |
| **ComfyUI** | Local | Zero-cost, custom workflows |
| **Banana** | Serverless | Custom model deployment |

### 1.2 Generation Modes

| Mode | Description | Models |
|------|-------------|--------|
| **Text-to-Image** | Generate images from text prompts | 70+ models |
| **Text-to-Video** | Generate videos from text prompts | 40+ models (5-30 sec) |
| **Image-to-Video** | Animate images with motion | Wan, Kling, Vidu, LTX, Luma |
| **Audio-to-Video** | Avatar generation from audio | Kling AI Avatar |
| **Reference-to-Video** | Character-consistent video | Vidu Q2 (up to 7 refs) |

### 1.3 Prompt Intelligence

- **Smart Prompt Builder**: Grok LLM enhancement with model awareness
- **LoRA Trigger Injection**: Automatic trigger word placement
- **Negative Prompt Manager**: Preset library + custom entries
- **Prompt Weighting**: `Cmd/Ctrl + Arrow` keys (1.0-2.0 range)
- **Model-Specific Guides**: 100+ model prompt templates
- **Weight Hint Tooltip**: Visual guide for T5-based models

### 1.4 Supported Image Models

```
Flux Dev, Flux Schnell, Flux Pro, Flux Pro 1.1, Flux Pro Ultra
Ideogram v2, Ideogram v3, Recraft v3
SDXL, SD 3.5, Stable Diffusion variants
DALL-E 3, Imagen 3
Clarity Upscaler, Aura SR, Creative Upscaler
Juggernaut, DreamShaper, RealisticVision
100+ more via Civitai/Replicate
```

### 1.5 Supported Video Models

```
Wan 2.1 (T2V, I2V, Animate), Wan 2.5
Kling 1.6, Kling 2.0, Kling 2.1
Veo 2, Veo 3 (Google DeepMind)
Luma Ray 2, Dream Machine
LTX Video, LTX 0.9.5
Vidu Q1, Vidu Q2
MiniMax Video, Hailuo
Runway Gen-3 (via Replicate)
AnimateDiff, Hotshot XL
```

---

## 2. CHARACTER CONSISTENCY

### 2.1 Reference Methods

| Method | Best For | Provider | Key Feature |
|--------|----------|----------|-------------|
| **Flux Kontext** | Scene transfer | Fal.ai | Preserves face, tattoos, jewelry |
| **IP-Adapter** | Style consistency | Fal.ai | Multiple reference images |
| **Face ID** | Facial identity | Fal.ai | Strict face matching |
| **Custom LoRA** | Base identity | Replicate/Fal | Trained on character |
| **Ideogram Character** | Turnaround sheets | Fal.ai | Multi-view generation |
| **fofr/consistent-character** | Multi-pose | Replicate | Batch variations |

### 2.2 Element Reference System

- Up to **4 character references** per generation
- **Per-element strength control** (0-100% slider)
- IP-Adapter strength formula: `0.2 + (strength × 0.6)`
  - 0% slider = 0.2 weight (hints only)
  - 50% slider = 0.5 weight (balanced)
  - 100% slider = 0.8 weight (strong consistency)
- Prompt syntax: `@Image1`, `@Image2`, `@Image3`, `@Image4`

### 2.3 Character Foundry (Synthetic Dataset)

**Purpose**: Generate training datasets from a single reference image

**Pose Presets** (15+ presets):

| Preset | Best For | Pose Count |
|--------|----------|------------|
| `universal` | Any character | 20 |
| `swimwear` | Bikini, underwear | 19 |
| `casual` | T-shirts, jeans | 21 |
| `formal` | Suits, business | 18 |
| `fantasy` | Armor, warriors | 21 |
| `anime` | 2D anime style | 22 |
| `cartoon` | Mascots, chibi | 18 |
| `pixar3d` | Pixar/Disney 3D | 23 |
| `pixar3d_surfer` | Board shorts action | 27 |
| `pixar3d_surfer_wetsuit` | Wetsuit action | 27 |
| `pixar3d_surfer_kid` | Kid prodigy action | 34 |
| `pixar3d_sea_turtle` | Turtle action | 23 |
| `pixar3d_aquatic` | Fish, dolphins | 24 |
| `pixar3d_quadruped` | Dogs, cats, lions | 25 |
| `pixar3d_avian` | Birds, flight | 25 |

**Technical Features**:
- Frame-relative directions ("nose pointing toward left edge")
- Explicit cropping language for framing
- Dynamic aspect ratios (1:1, 3:4, 9:16)
- Auto-captioning via Grok Vision
- Dataset output with captions

---

## 3. CINEMATIC TOOLS

### 3.1 Camera Preset Library (54 Presets)

| Category | Count | Examples |
|----------|-------|----------|
| **Zoom** | 8 | Zoom In, Zoom Out, Crash Zoom, Rapid Zoom, Dolly Zoom, YoYo Zoom |
| **Dolly** | 7 | Dolly In, Dolly Out, Dolly Left, Dolly Right, Super Dolly, Double Dolly |
| **Crane** | 5 | Crane Up, Crane Down, Crane Over, Jib Up, Jib Down |
| **Pan/Tilt** | 5 | Pan Left, Pan Right, Tilt Up, Tilt Down, Whip Pan |
| **Orbit** | 5 | 360° Orbit, Arc Left, Arc Right, Lazy Susan, 3D Rotation |
| **Specialty** | 8 | Bullet Time, Snorricam, Dutch Angle, Fisheye, FPV Drone, Through Object, Rack Focus, Low Shutter |
| **Vehicle** | 5 | Car Chase, Car Interior, Buckle Up, Road Rush, Hero Cam |
| **Character** | 5 | Eyes In, Hero Shot, Head Track, Glam Shot, Over Shoulder |
| **Handheld** | 4 | Handheld, Steadicam, Gimbal, Shaky Intense |
| **Static** | 3 | Static, Overhead, Worm's Eye |
| **Timelapse** | 4 | Hyperlapse, Sky Timelapse, City Timelapse, YoYo Zoom |

### 3.2 Cinematic Tags (165+ Tags)

| Category | Tag Count | Subcategories |
|----------|-----------|---------------|
| **Cameras** | 30+ | Digital Cinema, IMAX, Film, Phones & Consumer, Specialty, Vintage |
| **Lenses** | 25+ | Anamorphic, Vintage Primes, Modern Primes, Specialty, Focal Length |
| **Film Stock** | 20+ | Kodak Motion, Kodak Still, Fujifilm, Black & White, Experimental |
| **Color Grade** | 35+ | Hollywood, Vintage, Stylized, Natural, Social Media, Creative |
| **Lighting** | 20+ | Portrait, Cinematic, Natural, Practical, Stylized |
| **Motion** | 30+ | Static, Zoom, Dolly, Crane, Pan/Tilt, Orbit, Specialty, Speed |
| **Mood** | 35+ | Positive, Negative, Intense, Subtle, Atmospheric |

**Camera Highlights**:
```
Digital Cinema: ARRI Alexa 35, RED V-Raptor, Sony Venice 2, Blackmagic URSA
IMAX: IMAX 70mm, Panavision DXL2, ARRI Alexa 65
Film: 16mm Bolex, Super 8, 35mm Panavision, 65mm IMAX
Phones: iPhone 17 Pro, Samsung S25 Ultra, Google Pixel 10 Pro
Consumer: Disposable Camera, Polaroid Instant, Webcam, CCTV Security
```

**Social Media Filters**:
```
Instagram: Valencia, Clarendon, Juno
TikTok: Beauty Mode
VSCO: A6, C1
Snapchat: Vivid, Beauty Mode
```

### 3.3 Genre Templates (14 Genres)

| Genre | Recommended Moves | Avoided Moves |
|-------|-------------------|---------------|
| **Film Noir** | Dutch Angle, Dolly Zoom, Static | Bright lighting, Fast cuts |
| **Action** | Bullet Time, Crash Zoom, FPV Drone | Static, Slow |
| **Horror** | Snorricam, Dolly Zoom, Crane Down | Cheerful lighting |
| **Romance** | Arc Orbit, Dolly In, Crane Up | Harsh cuts, Dutch |
| **Documentary** | Handheld, Static, Hyperlapse | Stylized |
| **Sci-Fi** | Through Object, Bullet Time, FPV | Natural/organic |
| **Comedy** | Whip Pan, Crash Zoom, Static | Dramatic tension |
| **Thriller** | Dolly Zoom, Dutch, Slow push | Wide establishing |
| **Drama** | Static, Slow dolly, Close-ups | Fast motion |
| **Music Video** | All creative moves | None |
| **Commercial** | Smooth dolly, Glamour shots | Shaky |
| **Western** | Wide static, Horse tracking | Modern tech |
| **Fantasy** | Crane, Epic orbit, Through fog | Handheld realism |

---

## 4. STORY PIPELINE

### 4.1 Story Editor Workflow

```
┌─────────┐    ┌─────────┐    ┌────────┐    ┌────────┐    ┌───────┐    ┌─────────┐    ┌────────────┐
│ Concept │ →  │ Outline │ →  │ Script │ →  │ Scenes │ →  │ Shots │ →  │ Prompts │ →  │ Storyboard │
└─────────┘    └─────────┘    └────────┘    └────────┘    └───────┘    └─────────┘    └────────────┘
```

### 4.2 Storytelling Intelligence

**Pixar 22 Rules of Storytelling** (Full Integration):
1. Admiration for trying > success
2. Keep in mind what's interesting to audience
3. Theme emerges at the end
4. Once upon a time... Every day... One day... Because of that... Until finally
5. Simplify, focus, combine characters
6. Know your ending before you start
7. Finish your story before perfecting it
8. When stuck, make a list of what wouldn't happen
9. Pull apart stories you like to see what works
10. Put ideas on paper to let new ones come
11. Work on story you'd share, not clever ideas
12. Discount first thing that comes to mind (2nd, 3rd, etc.)
13. Give characters opinions
14. Why must this story be told? What's the belief?
15. Be honest with characters, not clever
16. What are the stakes?
17. No work is wasted
18. Know the difference between doing your best and fussing
19. Coincidences to get into trouble = good, out = cheating
20. Exercise: Take the building blocks of a movie you dislike
21. You have to identify with situations/characters
22. What's the essence? Most economical telling

**Director Visual Styles** (12 Directors):

| Director | Signature Style |
|----------|----------------|
| **Wes Anderson** | Symmetrical framing, pastel colors, centered subjects, flat compositions |
| **Denis Villeneuve** | Atmospheric, muted palette, epic scale, silhouettes, slow pacing |
| **Hayao Miyazaki** | Hand-drawn, watercolor backgrounds, environmental themes, magical realism |
| **Christopher Nolan** | Practical effects, IMAX, non-linear narrative, blue/gray palette |
| **Quentin Tarantino** | Pop culture references, chapter cards, extreme close-ups, stylized violence |
| **Guillermo del Toro** | Gothic, practical effects, amber/teal, fairy tale darkness |
| **Ridley Scott** | Grand scale, dust and haze, earth tones, lived-in worlds |
| **Stanley Kubrick** | Symmetry, perfect compositions, artificial lighting, one-point perspective |
| **David Fincher** | High-contrast, desaturated, forensic detail, methodical pacing |
| **Terrence Malick** | Nature-focused, philosophical, poetic, magic hour |
| **Park Chan-wook** | Stylized violence, meticulous framing, color symbolism |
| **Alfonso Cuarón** | Long takes, natural light, handheld intimacy |

**Cinematographer Styles** (5 DPs):

| Cinematographer | Known For |
|-----------------|-----------|
| **Roger Deakins** | Golden hour, depth, warm tones, motivated lighting |
| **Emmanuel Lubezki** | Natural light, color theory, long takes, movement |
| **Janusz Kamiński** | Harsh light, dust particles, bleach bypass, Spielberg films |
| **Hoyte van Hoytema** | Cool tones, geometric composition, IMAX, Nolan films |
| **Robert Richardson** | High contrast, stylized color, dynamic lighting |

### 4.3 Shot Generation Output

For each scene, generates:
- **First Frame Prompt**: Scene opening image
- **Last Frame Prompt**: Scene closing image
- **Video Prompt**: Motion description
- **Camera Preset**: Assigned movement
- **Negative Prompts**: Artifact prevention
- **Duration**: Calculated length

---

## 5. POST-PROCESSING

### 5.1 Magic Eraser (Inpainting)

**Quality Tiers**:

| Tier | Model | Speed | Quality | Use Case |
|------|-------|-------|---------|----------|
| **Fast** | `fal-ai/object-removal/mask` | ⚡⚡⚡ | Good | Quick fixes |
| **Quality** | `fal-ai/flux-general/inpainting` | ⚡⚡ | Better | Most tasks |
| **Premium** | `juggernaut-flux-lora/inpainting` | ⚡ | Best | Final output |

**Features**:
- Brush-based mask painting (canvas)
- Real-time brush preview cursor
- Brush size control (15-40px recommended)
- Binary mask conversion (red → white/black)
- Mask expansion parameter (0-50px)
- Optional guidance prompt
- Iterative editing (result becomes new base)
- AI Feedback learning integration

### 5.2 Tattoo Compositing

**Controls**:
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Width Ratio | 0.4 | 0.1-1.0 | Size relative to base |
| X Offset | 60 | -500 to 500 | Horizontal position |
| Y Offset | 0 | -500 to 500 | Vertical position |
| Opacity | 0.85 | 0.1-1.0 | Ink transparency |
| Blur | 0.8 | 0-5 | Ink bleed effect |

**Features**:
- White-background keying (tattoo flash → black ink)
- Gaussian blur for realistic ink bleed
- sRGB color space enforcement
- Rotation support
- Mesh/cylindrical warp modes

### 5.3 Video Enhancement

| Mode | Feature | Description |
|------|---------|-------------|
| **Smooth-only** | RIFE Interpolation | 24fps frame interpolation |
| **Audio-only** | MMAudio | AI audio generation |
| **Full** | Both | Smooth + Audio combined |

### 5.4 Upscaling

| Model | Factor | Speed | Best For |
|-------|--------|-------|----------|
| **Clarity 2x** | 2× | Fast | General upscaling |
| **Clarity 4x** | 4× | Slow | Maximum quality |
| **Aura SR** | 2× | Fastest | Quick preview |
| **Creative Upscaler** | 4× | Slow | Artistic enhancement |

---

## 6. TRAINING & LoRAs

### 6.1 LoRA Training

**Providers**:
- **Fal.ai**: Flux LoRA Fast Training (fastest)
- **Replicate**: ostris/flux-dev-lora-trainer

**Configuration**:
| Setting | Options |
|---------|---------|
| Base Model | Flux Fast, Flux Dev, Wan-Video |
| Training Type | Style, Character |
| Steps | 500-2000 (default 1000) |
| Learning Rate | 1e-4 to 1e-6 |
| Dataset Size | 10-50 images recommended |

### 6.2 Civitai Integration

- **Model Discovery**: Search and browse
- **Metadata Extraction**: Automatic parsing
- **Recommended Settings**: Sampler, CFG, Steps, Scheduler
- **Negative Prompts**: Suggested negatives
- **One-Click Import**: Add to local library

### 6.3 Custom LoRA Support

**Replicate Custom Models**:
```typescript
// Model-to-Provider Map (GenerationService.ts)
'mattyatplay-coder/angelicatraining': 'replicate',
'your-username/your-model': 'replicate',

// Version Mapping (ReplicateAdapter.ts)
'mattyatplay-coder/angelicatraining':
  'mattyatplay-coder/angelicatraining:d91b41c61d99d36b8649563cd79d8c2d83facd008199030c51952c5f13ea705a'
```

---

## 7. UI/UX FEATURES

### 7.1 Director's Viewfinder (Prompt Bar)

**Ghost Frame**:
- Semi-transparent aspect ratio preview behind textarea
- Morphs dynamically based on selected ratio
- Opacity increases on focus

**Focus Brackets**:
- Camera HUD corners at four edges
- Purple glow animation on focus
- Expands from 12px to 16px

**Dynamic Ratio Icon**:
- Morphing rectangle in Style button
- Visual representation of current aspect ratio
- Instant recognition (wide = landscape, tall = portrait)

**Prompt Length Feedback**:
| Length | Border Color | Meaning |
|--------|--------------|---------|
| < 300 | White/10 | Normal |
| 300-500 | Yellow/20 | Getting complex |
| > 500 | Amber/30 | Very long |

### 7.2 Generation Gallery

- **Masonry Layout**: Responsive grid
- **Status Badges**: Queued, Processing, Complete, Failed
- **Hover Preview**: Auto-play for videos
- **Multi-Select**: Checkbox for batch operations
- **Radix Dropdowns**: Escape overflow containers

**Card Actions**:
- Animate (image-to-video)
- Upscale (3 options)
- Enhance (3 modes)
- Save as Element
- Analyze Failure
- Delete

### 7.3 Shot Navigator

- **Scene Chain Dropdown**: Select/create scenes
- **Frame Drop Zones**: Beginning (green) + Ending (purple)
- **Drag-and-Drop**: From gallery or elements
- **Click-to-Upload**: Direct file import
- **Link/Unlink Icons**: Visual connection status
- **Per-Shot Generation**: Generate when beginning frame set
- **Video Preview**: Hover-to-play completed shots
- **Total Duration**: Cumulative display

### 7.4 Engine Library Modal

**Filtering**:
| Filter | Options |
|--------|---------|
| USE CASE | All, Image, Text-to-Video, I2V, Character |
| PROVIDER | Multi-select with counts |
| FAVORITES | Quick access |
| LoRA SUPPORT | Purple toggle |

**Model Cards**:
- Provider icon + model name
- Cost estimate
- Speed rating
- LoRA badge (amber) for compatible models
- Favorite toggle (star)

---

## 8. INTELLIGENCE SYSTEMS

### 8.1 AI Feedback Learning

**Data Flow**:
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

**Storage**:
- `backend/data/ai_feedback.json` - All feedback entries
- `backend/data/ai_patterns.json` - Extracted patterns

**Features**:
- Thumbs up/down on analyses
- User correction logging
- Pattern extraction (common mistakes)
- Learned hint injection
- Feedback statistics dashboard

### 8.2 Generation Analysis

**Grok Vision Analysis**:
- Flaw identification
- Positive trait highlighting
- Quality rating (1-5 stars)
- Improvement suggestions
- User concern priority (`=== CRITICAL ===` tag)

### 8.3 Knowledge Base Service

- 200+ model capabilities indexed
- LoRA metadata aggregation
- Global context for LLM prompts
- Automatic resolution by ID
- Singleton pattern for efficiency

---

## 9. COST & TRACKING

### 9.1 Cost Tracking

**Per-Generation**:
- Model-specific pricing
- Image vs Video differentiation
- Duration multipliers for video
- Provider-based estimates

**Spending Widget**:
- Real-time session total
- Provider breakdown
- Budget alerts
- Cost history

### 9.2 Estimated Costs

| Type | Range | Examples |
|------|-------|----------|
| **Image** | $0.003-0.05 | Flux Schnell (cheap) → DALL-E 3 (expensive) |
| **Video (5s)** | $0.10-0.50 | LTX (cheap) → Kling Pro (expensive) |
| **Video (10s)** | $0.20-1.00 | Duration multiplier |
| **Upscale** | $0.01-0.05 | Aura (cheap) → Clarity 4x (expensive) |
| **Training** | $2-10 | Depending on steps |

---

## 10. API ENDPOINTS

### 10.1 Generation Routes

```
POST   /api/projects/:id/generations          Create generation
GET    /api/projects/:id/generations          List generations
PATCH  /api/projects/:id/generations/:genId   Update generation
DELETE /api/projects/:id/generations/:genId   Delete generation
GET    /api/projects/:id/generations/queue/status   Queue status
POST   /api/projects/:id/generations/:genId/enhance   Video enhance
POST   /api/projects/:id/generations/:genId/analyze   AI analysis
```

### 10.2 Scene Chain Routes

```
GET    /api/projects/:id/scene-chains                     List chains
POST   /api/projects/:id/scene-chains                     Create chain
GET    /api/projects/:id/scene-chains/:chainId            Get chain
PATCH  /api/projects/:id/scene-chains/:chainId            Update chain
DELETE /api/projects/:id/scene-chains/:chainId            Delete chain
POST   /api/projects/:id/scene-chains/:chainId/segments   Add segment
PATCH  /api/projects/:id/scene-chains/:chainId/segments/:segId   Update segment
DELETE /api/projects/:id/scene-chains/:chainId/segments/:segId   Delete segment
POST   /api/projects/:id/scene-chains/:chainId/segments/:segId/generate   Generate video
```

### 10.3 Story Routes

```
POST   /api/story-editor/outline    Generate outline
POST   /api/story-editor/script     Expand to screenplay
POST   /api/story-editor/scenes     Break into scenes
POST   /api/story-editor/shots      Generate shot list
POST   /api/story-editor/export     Export to storyboard
```

### 10.4 Style Routes

```
GET    /api/story-style/genres              List genres
GET    /api/story-style/directors           List director styles
GET    /api/story-style/cinematographers    List DP styles
GET    /api/story-style/pixar-rules         Get 22 rules
POST   /api/story-style/build-prefix        Combine styles
GET    /api/story-style/scripts             List script library
POST   /api/story-style/scripts/analyze     Analyze script
POST   /api/story-style/generate-outline    Generate from concept
POST   /api/story-style/generate-scene-prompts   Scene prompts
```

### 10.5 Other Routes

```
POST   /api/process/magic-eraser       Inpainting
POST   /api/process/tattoo-composite   Tattoo placement
POST   /api/prompts/enhance            Smart prompt
POST   /api/loras/civitai-metadata     Civitai import
GET    /api/training/pose-presets      List pose presets
POST   /api/training/jobs/:id/generate-dataset   Character Foundry
POST   /api/ai-feedback                Submit feedback
GET    /api/ai-feedback/stats          Feedback statistics
```

---

## 11. INFRASTRUCTURE

### 11.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 16 • React 19 • TypeScript • Tailwind CSS 4        │
│  Port: 3000                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Node.js • Express • TypeScript • Prisma                    │
│  Port: 3001                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  SQLite (dev) • PostgreSQL (prod)                           │
│  Local filesystem storage (/data)                           │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Key Directories

```
frontend/
├── src/app/                    # Next.js App Router pages
│   ├── projects/[id]/          # Project detail pages
│   │   ├── generate/           # Main generation interface
│   │   ├── storyboard/         # Storyboard editor
│   │   ├── story-editor/       # Script-to-storyboard
│   │   ├── train/              # LoRA training
│   │   └── process/            # Post-processing
├── src/components/             # React components
│   ├── generations/            # Generation cards, engine selector
│   ├── storyboard/             # Shot, scene, timeline
│   ├── prompts/                # Prompt builder, weight tooltip
│   └── processing/             # Magic eraser, tattoo
└── src/data/                   # Static data files

backend/
├── src/controllers/            # Request handlers
├── src/services/               # Business logic
│   ├── generators/             # Provider adapters
│   ├── llm/                    # LLM integrations
│   ├── story/                  # Story pipeline
│   ├── training/               # LoRA training
│   └── processing/             # Post-processing
├── src/routes/                 # Express routes
└── prisma/                     # Database schema
```

### 11.3 Self-Hosted Advantages

| Feature | Benefit |
|---------|---------|
| **ComfyUI Integration** | Zero API costs |
| **Full Data Ownership** | No cloud storage |
| **Custom Models** | Deploy any model |
| **No Rate Limits** | Local inference |
| **Privacy** | Data never leaves machine |

---

## 12. COMPETITIVE ADVANTAGES

### 12.1 Feature Comparison

| Feature | VibeBoard | Runway | Midjourney | Leonardo | Pika |
|---------|-----------|--------|------------|----------|------|
| Image Models | **70+** | 5 | 1 | 10 | 2 |
| Video Models | **40+** | 3 | 0 | 2 | 2 |
| Multi-Provider | **10** | 1 | 1 | 1 | 1 |
| Self-Hosted | **✅** | ❌ | ❌ | ❌ | ❌ |
| LoRA Training | **✅** | ❌ | ❌ | ✅ | ❌ |
| Character Foundry | **✅** | ❌ | ❌ | ❌ | ❌ |
| Cost Transparency | **✅** | ❌ | ❌ | ❌ | ❌ |
| AI Feedback Learning | **✅** | ❌ | ❌ | ❌ | ❌ |
| Story Pipeline | **✅** | ❌ | ❌ | ❌ | ❌ |
| Director Styles | **12** | 0 | 0 | 0 | 0 |
| Camera Presets | **54** | 10 | 0 | 5 | 3 |
| Genre Templates | **14** | 0 | 0 | 0 | 0 |

### 12.2 Unique Features

1. **Multi-Provider Orchestration**: Only platform with 10+ provider integration
2. **Character Foundry**: Single image → 20 training variations
3. **AI Feedback Learning**: Improves with every correction
4. **Genre-Aware Story Pipeline**: Director + DP + Pixar rules
5. **Self-Hosted Option**: Zero recurring API costs
6. **Cost Transparency**: Per-generation pricing visible
7. **Director's Viewfinder UI**: Camera HUD aesthetic

### 12.3 Target Users

| User Type | Key Features |
|-----------|--------------|
| **Indie Filmmakers** | Story pipeline, camera presets, genre templates |
| **Content Creators** | Quick generation, social media filters, batch export |
| **Character Artists** | Character Foundry, LoRA training, consistency tools |
| **Studios** | Self-hosted, multi-provider, cost control |
| **Hobbyists** | Free tiers (Together AI, ComfyUI), budget tracking |

---

## APPENDIX

### A. Environment Variables

```env
# Required
FAL_KEY=your-fal-ai-key
REPLICATE_API_TOKEN=your-replicate-token
XAI_API_KEY=your-grok-api-key

# Optional
OPENAI_API_KEY=your-openai-key
GOOGLE_AI_KEY=your-google-key
TOGETHER_API_KEY=your-together-key
HUGGINGFACE_TOKEN=your-hf-token
```

### B. Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev

# Database
cd backend && npx prisma migrate dev
```

### C. Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend | 3001 |
| ComfyUI (optional) | 8188 |

---

*This manifesto documents 500+ features across 12 major categories. VibeBoard is a production-ready, self-hosted AI video generation platform with unique capabilities in character consistency, storytelling intelligence, and multi-provider orchestration.*

**Version**: 1.0
**Last Updated**: December 25, 2025
**Maintainer**: VibeBoard Team

# VibeBoard UI Architecture Roadmap
## From "Page with Modals" to "Professional Workspace"

> **Source**: External UX Feedback (December 2025)
> **Goal**: Balance "Pro Power" with "Learner Comfort"
> **Philosophy**: Build the "Unreal Engine" of AI Filmmaking

---

## Executive Summary

The feedback identifies VibeBoard's core challenge: managing 500+ features, 110+ models, and a persistent story pipeline is no longer a "UI problem"—it's a **workspace architecture problem**.

### Key Insight
> "Pros hate 'Modal Prisons' (where they have to open/close windows to see their work)."

### The Solution
Move from **Page-based Layout** → **Panel-based Workspace** (like Adobe Premiere, Blender, DaVinci Resolve)

---

## 1. ZONAL WORKSPACE ARCHITECTURE

### Current State
- Modal-heavy interface
- Context lost when switching views
- Features hidden behind multiple clicks

### Target State: 4-Zone Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ZONE A: STORY CONTEXT (Header)                        │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           Total: 24s      │
│  │ S1  │ │ S2  │ │ S3  │ │ S4  │ │ S5  │ │ S6  │           [+ Add Shot]    │
│  │ 🟢  │ │ 🟢  │ │ 🔵  │ │ ⚪  │ │ ⚪  │ │ ⚪  │                             │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                             │
├────────────┬────────────────────────────────────────────────┬───────────────┤
│            │                                                │               │
│  ZONE B    │              ZONE C: THE STAGE                 │   ZONE D      │
│  Assets    │              (Generation Grid)                 │   The Lab     │
│  & Models  │                                                │               │
│            │  ┌────────┐ ┌────────┐ ┌────────┐              │  ┌─────────┐  │
│  ┌───────┐ │  │        │ │        │ │        │              │  │ Simple  │  │
│  │LoRAs  │ │  │ 16:9   │ │ 9:16   │ │ 1:1    │              │  │ ────────│  │
│  ├───────┤ │  │        │ │        │ │        │              │  │ Style   │  │
│  │Models │ │  └────────┘ └────────┘ └────────┘              │  │ Ratio   │  │
│  ├───────┤ │                                                │  └─────────┘  │
│  │Elements│ │  ┌────────────────┐ ┌────────┐                │               │
│  ├───────┤ │  │                │ │        │                │  ┌─────────┐  │
│  │Presets│ │  │    2.35:1      │ │  4:3   │                │  │Advanced │  │
│  └───────┘ │  │                │ │        │                │  │ ────────│  │
│            │  └────────────────┘ └────────┘                │  │ CFG     │  │
│  [Search]  │                                                │  │ Sampler │  │
│            │                                                │  │ Steps   │  │
│            │                                                │  │ Seed    │  │
│            │                                                │  └─────────┘  │
├────────────┴────────────────────────────────────────────────┴───────────────┤
│                        ZONE E: ELEMENTS TRAY                                 │
│  [@turtle_ref] [@style_ghibli] [🎵 audio.mp3]     [🔮 Prompt Bar...]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Zone Specifications

#### Zone A: Story Context (Persistent Header)
- **Purpose**: Anchor user to current story position
- **Content**: Shot Navigator (always visible)
- **Behavior**: Persists across ALL views (Generate, Roto, Storyboard)
- **Key Addition**: "Transfer Style" button between shots
  - "Lock Subject" to carry character references
  - One-click style inheritance

#### Zone B: Assets & Models (Left Rail)
- **Purpose**: Quick access to generation tools
- **Content**:
  - LoRA library (searchable)
  - Model selector (vertical list, not dropdown)
  - Elements library
  - Style presets
- **Behavior**: Collapsible, dockable
- **Learner Mode**: Show curated "Starter Pack"
- **Pro Mode**: Full library with filters

#### Zone C: The Stage (Center)
- **Purpose**: Primary generation workspace
- **Content**: Generation grid with justified rows
- **Key Feature**: Aspect ratio-aware layout
- **Background**: Ghost frame overlay matching selected ratio

#### Zone D: The Lab (Right Sidebar)
- **Purpose**: Technical controls
- **Learner Mode**: Hidden or "Simple" (Style + Ratio only)
- **Pro Mode**: Full forensic controls
  - CFG Scale
  - Samplers
  - Schedulers
  - Seeds
  - Steps
  - Provider selection

#### Zone E: Elements Tray (Bottom)
- **Purpose**: Active reference management
- **Content**: Draggable element slots (@Image1-4)
- **Feature**: Consistency Score meter (glows greener with more refs)
- **Integrated with**: Prompt bar

---

## 2. MULTI-ASPECT RATIO GRID

### Problem
16:9 next to 9:16 in masonry looks messy. Filmmakers need to see composition.

### Solution: Justified Row Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Row 1 (same height)                                               │
│ ┌────────────────────┐ ┌─────────┐ ┌─────────────┐               │
│ │                    │ │         │ │             │               │
│ │      2.35:1        │ │  9:16   │ │    4:3      │               │
│ │                    │ │         │ │             │               │
│ └────────────────────┘ └─────────┘ └─────────────┘               │
├──────────────────────────────────────────────────────────────────┤
│ Row 2 (same height)                                               │
│ ┌─────────────────┐ ┌─────────────────┐ ┌───────┐                │
│ │                 │ │                 │ │       │                │
│ │      16:9       │ │      16:9       │ │  1:1  │                │
│ │                 │ │                 │ │       │                │
│ └─────────────────┘ └─────────────────┘ └───────┘                │
└──────────────────────────────────────────────────────────────────┘
```

### Features
1. **Fixed-height rows**: All images align on same "horizon" (film strip feel)
2. **Grid Zoom slider**:
   - 100% = Full aspect ratio visible
   - 50% = Uniform 1:1 squares for high-density browsing
3. **Click to expand**: Lightroom-style preview at true ratio
4. **Aspect Ratio Safe-Zone Toggle**: Quick crop preview

---

## 3. CINEMATIC RACK (165+ Tags)

### Problem
Navigating 165 tags in dropdowns is slow for pros and overwhelming for learners.

### Solution A: Visual Tag Palette (Dockable)

```
┌──────────────────────────────────────────────┐
│ 🎬 CAMERA MOVES                    [Search]  │
├──────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │ ↗️ │ │ ↙️ │ │ 🔄 │ │ ➡️ │ │ ⬆️ │ │ 🎯 │   │
│ │Zoom│ │Dol-│ │Orb-│ │Pan │ │Cra-│ │Bul-│   │
│ │ In │ │ ly │ │ it │ │Left│ │ ne │ │let │   │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │ 🚁 │ │ 🎭 │ │ 🏎️ │ │ 👁️ │ │ 📷 │ │ ⏱️ │   │
│ │FPV │ │Snor│ │Car │ │Eye │ │Stat│ │Hyp-│   │
│ │Drn │ │ ri │ │Cha-│ │ In │ │ ic │ │ er │   │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   │
└──────────────────────────────────────────────┘
```

### Solution B: Command Palette (Cmd+K)

```
┌──────────────────────────────────────────────┐
│ 🔍 alex                                       │
├──────────────────────────────────────────────┤
│ 📷 Arri Alexa 35      Cinema Camera          │
│ 📷 Arri Alexa 65      Large Format           │
│ 📷 Arri Alexa Mini    Compact Cinema         │
└──────────────────────────────────────────────┘
                    ↓ Enter
         "shot on Arri Alexa 35" added to prompt
```

### Solution C: Genre-Based Grouping (Learner View)

Collapse 165 tags into 14 "Vibe Packs":

| Vibe Pack | Tags Included |
|-----------|---------------|
| Hollywood Action | Crash Zoom, Bullet Time, FPV Drone, High Contrast |
| Retro VHS | Super 8, Film Grain, Warm Tones, Handheld |
| Gritty Noir | Dutch Angle, Low Key, B&W, Static |
| Studio Ghibli | Watercolor, Soft Light, Nature, Crane |
| TikTok Viral | 9:16, Beauty Mode, Snap Filter, Quick Cuts |

---

## 4. DIRECTOR'S VIEWFINDER (Prompt Bar HUD)

### Current State ✅ (Implemented Dec 25)
- Ghost Frame (aspect ratio preview)
- Focus Brackets (corner HUD)
- Dynamic Ratio Icon
- Prompt length feedback

### Additions Needed

#### 4.1 Prompt Weight Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─                                                           ─┐ │
│                                                                 │
│   a (majestic:1.4) sea turtle swimming through (crystal:1.2)   │
│      ━━━━━━━━━━━━━━                         ━━━━━━━━━━━        │
│         purple                                 blue             │
│                                                                 │
│ └─                                                           ─┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Weight Color Scale**:
- 1.0-1.1: No underline
- 1.2-1.3: Blue underline
- 1.4-1.5: Purple underline
- 1.6+: Magenta underline

#### 4.2 Canvas Ghost Overlay

When 9:16 selected, Zone C background shows faint 9:16 rectangle:

```
┌────────────────────────────────────────────────────────────────┐
│                     ┌─────────────┐                            │
│                     │░░░░░░░░░░░░░│                            │
│   ┌─────┐           │░░ 9:16 ░░░░│           ┌─────┐          │
│   │     │           │░░ Ghost░░░░│           │     │          │
│   │ Gen │           │░░░░░░░░░░░░│           │ Gen │          │
│   │     │           │░░░░░░░░░░░░│           │     │          │
│   └─────┘           │░░░░░░░░░░░░│           └─────┘          │
│                     └─────────────┘                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. ELEMENTS TRAY (Character Foundry UI)

### Current State
- Modal-based element selection
- Hidden during generation

### Target State: Persistent Tray

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ELEMENTS TRAY                                         Consistency: ████░ 80% │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ @Image1  │  │ @Image2  │  │ @Image3  │  │ @Image4  │     [🔮 Prompt...] │
│  │  ┌────┐  │  │  ┌────┐  │  │  ┌────┐  │  │  + Drop  │                     │
│  │  │🐢  │  │  │  │🎨  │  │  │  │    │  │  │  Here   │                     │
│  │  └────┘  │  │  └────┘  │  │  └────┘  │  │         │                     │
│  │ turtle  │  │  ghibli  │  │  empty   │  │         │                     │
│  │  0.8    │  │   0.5    │  │          │  │         │                     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Features
1. **Drag-to-assign**: Drag from grid → drop on @Image1 slot
2. **Per-element strength**: Slider under each slot
3. **Consistency Meter**: Live indicator (greener = more consistent)
4. **Prompt integration**: Shows which refs are in current prompt

---

## 6. AI FEEDBACK INTEGRATION (Grok Assistant)

### Current State
- Thumbs up/down on generation cards
- Hidden learning system

### Target State: Visible Assistant Sidebar

```
┌────────────────────────────────────┐
│ 🤖 GROK ASSISTANT                  │
├────────────────────────────────────┤
│                                    │
│ 📊 Generation Analysis             │
│ ─────────────────────              │
│ Quality: ⭐⭐⭐⭐☆ (4.2/5)          │
│                                    │
│ ✅ Strong composition              │
│ ✅ Good color harmony              │
│ ⚠️ Minor artifacts on shell        │
│                                    │
│ 💡 Suggestion:                     │
│ Added "deformed texture" to your   │
│ learned negatives for this session │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Was this helpful?  👍  👎     │ │
│ └────────────────────────────────┘ │
│                                    │
│ 📚 Session Learnings (3)           │
│ • "blurry eyes" → negatives        │
│ • "watermark" → negatives          │
│ • "turtle" → character ref         │
│                                    │
└────────────────────────────────────┘
```

---

## 7. PRO-LEARNER BRIDGE

### Simple/Advanced Toggle

```
┌─────────────────────────────────────┐
│                    [Simple │ Pro]   │
└─────────────────────────────────────┘
```

### Simple Mode
| Visible | Hidden |
|---------|--------|
| Prompt bar | Samplers |
| Style presets | CFG Scale |
| Aspect ratio | Steps |
| Model (curated list) | Schedulers |
| Elements tray | Seed |
| Generate button | Provider selection |

### Pro Mode
| Visible | Additional |
|---------|------------|
| Everything in Simple | Full sampler list |
| + Zone D (The Lab) | CFG 1-30 slider |
| + Command palette (Cmd+K) | Step count |
| + Keyboard shortcuts | Scheduler options |
| + Provider orchestration | Seed control |
| + Cost breakdown | Batch controls |

### Progressive Disclosure in Modals

```
┌──────────────────────────────────────────────────────────┐
│ STYLE & PARAMETERS                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🎬 Style Preset                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Cinematic │ Anime │ Photorealistic │ Artistic │ +    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ 📐 Aspect Ratio                                          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│ │16:9│ │9:16│ │ 1:1│ │ 4:3│ │2.35│                      │
│ └────┘ └────┘ └────┘ └────┘ └────┘                      │
│                                                          │
│ ▼ Advanced Engine Settings                               │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Sampler: DPM++ 2M Karras          [What is this? ℹ️] │ │
│ │ CFG Scale: ████████░░ 7.5                            │ │
│ │ Steps: ████████████░ 30                              │ │
│ │ Scheduler: Karras                                    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 8. FILMMAKER POLISH

### 8.1 NLE Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `J` | Previous shot |
| `K` | Pause/Play preview |
| `L` | Next shot |
| `Space` | Play selected shot |
| `I` | Mark In (beginning frame) |
| `O` | Mark Out (ending frame) |
| `Cmd+K` | Command palette |
| `Cmd+/` | Toggle Simple/Pro |
| `Cmd+G` | Generate |
| `Cmd+S` | Save to Elements |

### 8.2 Color Space

**Current**: Pure black background (can crush blacks in images)

**Target**: Neutral Gray (Zinc-950: `#09090b`)
- Allows filmmakers to judge color and contrast accurately
- Standard in professional color grading suites

### 8.3 Model Card Enhancements

```
┌──────────────────────────────────────┐
│ 🖼️ Flux.1 Dev                        │
│ ────────────────────────────────────│
│ $0.025/image  ⚡ Fast  🎨 LoRA       │
│                                      │
│ ✨ Best for: Photorealism            │
│                                      │
│ [Select]                             │
└──────────────────────────────────────┘
```

Add "Best For" tags:
- Flux Dev: "Photorealism"
- Ideogram V3: "Typography/Signs"
- GPT Image 1.5: "Character Consistency"
- Kling 2.1: "Motion Quality"
- Wan 2.5: "Fast Video"

### 8.4 Cinematic Tag Tooltips

```
┌─────────────────────────────────────────────┐
│ 📷 Arri Alexa 35                            │
│ ─────────────────────────────────────────── │
│ ┌─────────────────────────┐                 │
│ │   [Camera Rig Image]    │                 │
│ │                         │                 │
│ └─────────────────────────┘                 │
│                                             │
│ Professional digital cinema camera used     │
│ in major Hollywood productions.             │
│                                             │
│ Look: Clean highlights, natural skin tones  │
│ Used in: Dune, The Batman, Oppenheimer      │
└─────────────────────────────────────────────┘
```

---

## 9. IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Week 1-2)
- [ ] Implement Simple/Pro toggle
- [ ] Make Shot Navigator persistent across views
- [ ] Add "Best For" tags to model cards
- [ ] Change background to Zinc-950

### Phase 2: Zonal Layout (Week 3-4)
- [ ] Create Zone B (Left Rail) asset panel
- [ ] Create Zone D (Right Sidebar) lab panel
- [ ] Implement collapsible/dockable panels
- [ ] Add keyboard shortcuts (J, K, L)

### Phase 3: Grid & Elements (Week 5-6)
- [ ] Implement justified row layout for grid
- [ ] Add Grid Zoom slider
- [ ] Create Elements Tray (bottom bar)
- [ ] Add Consistency Meter

### Phase 4: Command Palette & Polish (Week 7-8)
- [ ] Implement Cmd+K command palette
- [ ] Add prompt weight visualization
- [ ] Create visual tag palette
- [ ] Add Grok Assistant sidebar

### Phase 5: Learner Features (Week 9-10)
- [ ] Create Genre "Vibe Packs"
- [ ] Add "Vibe Check" enhancement preview
- [ ] Implement tooltips with camera images
- [ ] Add "What is this?" help system

---

## 10. SUCCESS METRICS

### Learner Comfort
- Time to first generation < 2 minutes
- Feature discoverability > 80%
- Tutorial completion rate > 60%

### Pro Power
- Keyboard-only workflow possible
- < 3 clicks for any action
- Full parameter access without modal hunting

### Filmmaker Validation
- Shot Navigator usage > 50% of sessions
- Multi-shot sequences > 3 shots average
- Style transfer usage between shots

---

## APPENDIX: REFERENCE IMAGES

### Current UI Screenshots Referenced
1. Shot Navigator with Beginning/Ending frames
2. Generation Grid (masonry layout)
3. Cinematic Tags modal
4. Style & Parameters modal
5. Sampler/Scheduler controls
6. LoRA Manager
7. Sidebar navigation
8. Smart Prompt Builder
9. Model Library grid
10. Shot status indicators

### Target UI Inspirations
- Adobe Premiere Pro (panel layout)
- DaVinci Resolve (color grading workspace)
- Blender (dockable panels)
- Figma (command palette)
- VS Code (sidebar + panels)

---

*Document created: December 25, 2025*
*Based on external UX feedback*
*Goal: Professional Workspace Architecture*

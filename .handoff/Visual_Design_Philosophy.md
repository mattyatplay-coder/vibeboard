# VibeBoard Visual Design Philosophy
**For UI/UX Implementation Team**
**Version:** 1.0 | December 31, 2025

---

## The Vision: "Linear Meets DaVinci Resolve"

VibeBoard occupies a unique space: **a professional video production suite that doesn't intimidate newcomers**. We draw inspiration from two seemingly opposite design philosophies and merge them into something new.

### Our Design DNA

| Inspiration | What We Take | What We Leave Behind |
|-------------|--------------|----------------------|
| **Linear** | Clean surfaces, generous whitespace, approachable onboarding, delightful micro-interactions | Over-simplification that hides power features |
| **DaVinci Resolve** | Information density, professional terminology, keyboard-driven workflows, panel flexibility | Intimidating first-run experience, dated visual language |
| **Photoshop** | Tool palettes, layer-based thinking, non-destructive workflows, power-user shortcuts | Modal dialogs that interrupt flow, cluttered toolbars |
| **Figma** | Multiplayer-ready design, contextual toolbars, command palette (Cmd+K), real-time collaboration | N/A (we embrace this fully) |

---

## Core Principle: Progressive Disclosure

> **"Simple by default, powerful on demand."**

Every interface should work for a first-time user clicking through with a mouse, AND a power user with both hands on the keyboard who never touches the mouse.

### The Three Layers

```
Layer 1: VISIBLE (Always shown)
├── Primary actions (Generate, Play, Export)
├── Essential status (Cost estimate, Duration, Progress)
└── Current context (Selected model, Active project)

Layer 2: HOVER/FOCUS (Revealed on interaction)
├── Secondary actions (Upscale, Animate, Delete)
├── Tooltips with keyboard shortcuts
└── Quick settings (Duration, Variations)

Layer 3: EXPANDED (Click to open)
├── Full configuration panels
├── Advanced parameters (Seed, CFG, Scheduler)
└── Batch operations and history
```

### Example: Generation Card

```
┌─────────────────────────────────────────────┐
│  [Video Thumbnail]                          │  ← Layer 1: Always visible
│                                             │
│  "A surfer riding a wave at sunset..."      │  ← Truncated prompt
│  Wan 2.1 · 5s · 720p                        │  ← Key metadata
└─────────────────────────────────────────────┘
        ↓ (on hover)
┌─────────────────────────────────────────────┐
│  [Video Thumbnail]                          │
│  ┌──────────────────────────────────────┐   │
│  │ ▶ ⬆ 🎬 ✨ ⋮ │  ← Layer 2: Action toolbar
│  └──────────────────────────────────────┘   │
│  "A surfer riding a wave at sunset..."      │
│  Wan 2.1 · 5s · 720p                        │
└─────────────────────────────────────────────┘
        ↓ (click ⋮ or right-click)
┌─────────────────────────────────────────────┐
│  Full metadata panel with:                  │  ← Layer 3: Expanded
│  - Seed: 12345678                           │
│  - Model version: fal-ai/wan-2.1-t2v        │
│  - Cost: $0.15                              │
│  - Generation time: 45s                     │
│  - Full prompt (scrollable)                 │
│  - Element references used                  │
└─────────────────────────────────────────────┘
```

---

## Color System: "Midnight & Neon"

Our palette is dark-first, with strategic use of color to create hierarchy and draw attention.

### Background Hierarchy

| Layer | Color | Usage |
|-------|-------|-------|
| **Canvas** | `zinc-950` (#09090b) | Page background, main content area |
| **Surface** | `zinc-900` (#18181b) | Cards, panels, modals |
| **Elevated** | `zinc-800` (#27272a) | Hover states, selected items, dropdowns |
| **Border** | `white/10` | Subtle separation, never harsh lines |

### Semantic Colors

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Creative Action** | Violet | `#8b5cf6` | Generate, Create, Magic actions |
| **Technical Info** | Cyan | `#22d3ee` | Timecode, dimensions, data |
| **Success** | Emerald | `#10b981` | Complete, saved, connected |
| **Warning** | Amber | `#f59e0b` | Cost alerts, duration warnings |
| **Destructive** | Red | `#ef4444` | Delete, cancel, errors |
| **Neutral** | Gray | `#71717a` | Secondary text, disabled states |

### The "Neon Glow" Effect

For primary actions and focus states, use a subtle glow:

```css
/* Violet glow for creative buttons */
.creative-action {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}

/* Cyan glow for technical elements */
.technical-focus {
  box-shadow: 0 0 15px rgba(34, 211, 238, 0.25);
}
```

**Rule:** Glow is reserved for:
- Primary CTA buttons
- Currently playing/recording states
- Active tool selection
- Never for static decoration

---

## Typography: Clear Hierarchy

### Font Stack

| Purpose | Font | Weight | Size Range |
|---------|------|--------|------------|
| **UI Text** | Inter | 400-600 | 12px-18px |
| **Headings** | Inter | 600-700 | 20px-32px |
| **Data/Code** | JetBrains Mono | 400-500 | 11px-14px |
| **Timecode** | JetBrains Mono | 500 | 12px (fixed) |

### Text Color Hierarchy

```
Primary:    text-white       (Headings, labels, primary content)
Secondary:  text-gray-300    (Descriptions, secondary info)
Tertiary:   text-gray-500    (Hints, placeholders, timestamps)
Disabled:   text-gray-600    (Inactive elements)
```

### The Timecode Standard

All time-related displays use consistent formatting:

```
Duration:    00:05.00     (MM:SS.ff - frames as decimal)
Timestamp:   01:23:45:12  (HH:MM:SS:FF - SMPTE for long-form)
Short:       5s           (For UI badges and pills)
```

---

## Layout Principles

### The 256px Sidebar

Our sidebar is exactly 256px wide when expanded (or 64px collapsed). This is intentional:
- Matches common IDE sidebar widths (familiar to developers)
- Allows 3-column layouts on 1440px screens
- Provides enough room for navigation labels without truncation

### Panel Flexibility (DaVinci-Inspired)

```
┌──────────────────────────────────────────────────────────┐
│  HEADER BAR (fixed, 48px)                                │
├────────┬─────────────────────────────────┬───────────────┤
│        │                                 │               │
│  NAV   │      MAIN CANVAS               │   INSPECTOR   │
│  256px │      (flexible)                │   320px       │
│        │                                 │   (optional)  │
│        │                                 │               │
├────────┴─────────────────────────────────┴───────────────┤
│  TIMELINE / PROPERTIES (collapsible, 200-400px)          │
└──────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Inspector panel slides in from right (doesn't push content)
- Timeline panel can be collapsed to just the header
- Double-click panel dividers to reset to defaults
- Panels remember their size per-user

### Density Modes

For users who want more information visible:

| Mode | Row Height | Font Size | Best For |
|------|------------|-----------|----------|
| **Comfortable** | 48px | 14px | Default, new users |
| **Compact** | 36px | 13px | Power users, small screens |
| **Dense** | 28px | 12px | Data-heavy views (timeline, tables) |

---

## Interaction Patterns

### Hover States

Every interactive element needs a hover state. Our pattern:

```css
/* Standard hover */
.interactive {
  transition: all 150ms ease;
}
.interactive:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px); /* Subtle lift */
}

/* Destructive hover */
.destructive:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
```

### Focus States (Accessibility)

```css
/* Keyboard focus - always visible */
.focusable:focus-visible {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
}

/* Click focus - subtle */
.focusable:focus:not(:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
}
```

### Drag & Drop

```
IDLE:       Normal appearance
DRAGGING:   50% opacity, subtle rotation (2deg)
OVER DROP:  Drop zone gets cyan border + pulse animation
DROPPED:    Brief scale animation (1.05 → 1.0)
```

### Keyboard Shortcuts

Every action that has a keyboard shortcut should display it:

```
┌────────────────────────────────┐
│  Generate                ⌘ ⏎  │  ← Shortcut in muted gray
└────────────────────────────────┘
```

**Tooltip pattern:**
```
"Generate Video (⌘+Enter)"
```

---

## Component Patterns

### Buttons

| Type | Appearance | Usage |
|------|------------|-------|
| **Primary** | Solid violet, white text | One per view, main CTA |
| **Secondary** | Ghost with border, violet text | Alternative actions |
| **Tertiary** | No border, gray text | Cancel, dismiss |
| **Icon** | Circle/square, subtle background | Toolbar actions |
| **Destructive** | Red text/border on hover | Delete, remove |

### Inputs

```
┌─────────────────────────────────────────┐
│ Label                                   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Placeholder text...              🔍 │ │  ← Icon inside when relevant
│ └─────────────────────────────────────┘ │
│ Helper text or error message            │  ← Below, in smaller text
└─────────────────────────────────────────┘
```

- Border: `border-white/10`
- Focus: `border-violet-500` + glow
- Error: `border-red-500`
- Background: `bg-zinc-900` or `bg-white/5`

### Cards

```
┌─────────────────────────────────────────┐
│                                         │
│  [Content Area]                         │
│                                         │
├─────────────────────────────────────────┤  ← Optional divider
│  Footer with actions                    │
└─────────────────────────────────────────┘

Border: 1px solid white/10
Radius: 12px (rounded-xl)
Shadow: None (we use borders, not shadows)
```

### Modals

```
┌─────────────────────────────────────────────────────────┐
│  ✕                                    Modal Title       │  ← Header with close
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Modal content here...                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                          [Cancel]  [Primary Action]     │  ← Footer actions
└─────────────────────────────────────────────────────────┘

Backdrop: bg-black/60 with backdrop-blur
Animation: Scale from 95% + fade in
Close: Escape key, click backdrop, or X button
```

---

## Motion & Animation

### Timing Functions

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| **Instant** | 0ms | - | Toggles, checkboxes |
| **Quick** | 150ms | ease-out | Hover states, tooltips |
| **Normal** | 250ms | ease-in-out | Modals, panels |
| **Slow** | 400ms | ease-in-out | Page transitions |
| **Emphasis** | 600ms | spring | Success celebrations |

### Animation Principles

1. **Purpose over polish**: Every animation should communicate state change
2. **Interruptible**: User can click away mid-animation
3. **Reduced motion**: Respect `prefers-reduced-motion` media query
4. **No blocking**: Animations never prevent user from taking action

### Key Animations

```tsx
// Panel slide-in (right side inspector)
initial={{ x: 320, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: 320, opacity: 0 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}

// Modal appear
initial={{ scale: 0.95, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 0.95, opacity: 0 }}
transition={{ duration: 0.2 }}

// Card hover lift
whileHover={{ y: -2, transition: { duration: 0.15 } }}

// Success pulse
animate={{ scale: [1, 1.05, 1] }}
transition={{ duration: 0.3 }}
```

---

## The "Pro Mode" Toggle

Some views should have an explicit Pro Mode that reveals advanced controls:

```
┌─────────────────────────────────────────────────────────┐
│  Generation Settings                    [Simple ◉ Pro]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Simple Mode:                                           │
│  - Model picker                                         │
│  - Duration slider                                      │
│  - Aspect ratio                                         │
│                                                         │
│  Pro Mode adds:                                         │
│  - Seed input                                           │
│  - CFG scale slider                                     │
│  - Scheduler dropdown                                   │
│  - Inference steps                                      │
│  - Negative prompt                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Rule:** Pro mode preference persists per-user, not per-session.

---

## Iconography

### Icon Style

- **Library**: Lucide React (consistent with current codebase)
- **Size**: 16px (small), 20px (default), 24px (large)
- **Stroke**: 1.5px (matches Lucide defaults)
- **Color**: Inherit from text color

### Icon + Text Alignment

```
[Icon] Label Text
  ↑
  Icon is vertically centered with first line of text
  Gap: 8px (gap-2)
```

### Common Icons Reference

| Action | Icon | Lucide Name |
|--------|------|-------------|
| Generate | Sparkles | `sparkles` |
| Play | Play | `play` |
| Pause | Pause | `pause` |
| Delete | Trash2 | `trash-2` |
| Settings | Settings | `settings` |
| Download | Download | `download` |
| Upload | Upload | `upload` |
| Fullscreen | Maximize2 | `maximize-2` |
| Close | X | `x` |
| Menu | MoreVertical | `more-vertical` |
| Add | Plus | `plus` |
| Search | Search | `search` |
| Filter | Filter | `filter` |
| Sort | ArrowUpDown | `arrow-up-down` |

---

## Responsive Behavior

### Breakpoints

| Name | Width | Layout Changes |
|------|-------|----------------|
| **Mobile** | < 768px | Single column, bottom nav, no sidebar |
| **Tablet** | 768-1024px | Collapsed sidebar, stacked panels |
| **Desktop** | 1024-1440px | Full layout, optional inspector |
| **Wide** | > 1440px | Full layout, always-visible inspector |

### Mobile Considerations

VibeBoard is desktop-first, but should be usable on tablet:
- Touch targets minimum 44x44px
- Swipe gestures for panel navigation
- Bottom sheet modals instead of side panels
- Simplified timeline (single track view)

---

## Accessibility Checklist

- [ ] All interactive elements have focus states
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Screen reader labels for icon-only buttons
- [ ] Keyboard navigation for all workflows
- [ ] Error states are not color-only (include icons/text)
- [ ] Form inputs have associated labels
- [ ] Modals trap focus when open

---

## What NOT To Do

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Pure black backgrounds (#000) | Use zinc-950 (#09090b) |
| Drop shadows for depth | Use 1px borders (white/10) |
| Hamburger menus on desktop | Always show navigation |
| Auto-playing videos with sound | Muted by default, click to unmute |
| Infinite scroll without indication | Show "Load more" or page counts |
| Disabled buttons without explanation | Tooltip explaining why disabled |
| Confirmation modals for reversible actions | Toast with undo option |
| Loading spinners with no context | Skeleton screens or progress bars |

### Common Mistakes

1. **Over-animating**: A subtle fade is usually enough
2. **Too many primary buttons**: One violet button per view
3. **Hiding essential info**: Cost and duration should always be visible
4. **Breaking keyboard flow**: Tab order should be logical
5. **Inconsistent spacing**: Stick to 4px grid (4, 8, 12, 16, 24, 32, 48)

---

## Reference Implementations

For pixel-perfect examples, reference these existing components:

| Pattern | Component File |
|---------|----------------|
| Card with hover toolbar | `GenerationCard.tsx` |
| Side panel modal | `EngineLibraryModal.tsx` |
| Timeline with tracks | `NLETimeline.tsx` |
| Form with validation | `PromptBuilder.tsx` |
| Data table | `ElementsPage.tsx` |
| Drag and drop | `ShotNavigator.tsx` |
| Keyboard shortcuts | `useTimelineShortcuts.ts` |
| Toast notifications | Uses `react-hot-toast` |
| Tooltips | `Tooltip.tsx` (Radix wrapper) |

---

## Summary: The VibeBoard Feel

When a user opens VibeBoard, they should feel:

1. **Calm**: Dark, uncluttered interface that doesn't overwhelm
2. **Capable**: All the power of professional tools is clearly available
3. **Guided**: The "Producer" gently suggests next steps
4. **Fast**: Instant feedback, smooth animations, no waiting
5. **Professional**: This is a serious tool for serious work

> "VibeBoard should feel like a luxury sports car: elegant exterior, powerful engine, and every control exactly where a professional expects it."

---

## Questions?

Reach out to the engineering team for:
- Component implementation details (check `.claude/feature-dna/`)
- Backend API contracts (check `FEATURE_INVENTORY.md`)
- Existing pattern examples (check component files directly)


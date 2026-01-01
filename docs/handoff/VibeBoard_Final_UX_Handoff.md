# VibeBoard — Final UX/UI Handoff for Frontend Team

> **Author:** Product / Architecture Lead
> **Date:** December 31 2025
> **Scope:** Private‑beta polish & interaction refinement

---

## 1. Studio Spine (Navigation)

### 1.1 Current State
| Element | Status | Notes |
|---------|--------|-------|
| Group Headers | ✅ Implemented | "Development", "Production", "Post" labels with divider lines |
| Collapse/Expand | ✅ Functional | `ChevronLeft/Right` toggles `isCollapsed` via `useSidebarStore` |
| Active Highlight | ✅ Styled | Uses Framer `layoutId="activeNav"` for pill animation |
| Tooltip on Collapse | ⚠️ Placeholder | `title={isCollapsed ? item.label : undefined}` — consider Radix Tooltip |

### 1.2 Recommended Tasks
1. **Radix Tooltip Integration**
   Replace native `title` with `<Tooltip>` from `@/components/ui/Tooltip` (already used elsewhere) for consistent styling & animation.

2. **Keyboard Navigation**
   Add `tabIndex`, `onKeyDown` handling for `Enter` / `Space` to trigger link navigation, improving a11y.

3. **Session List Polish**
   - Truncation is aggressive for long session names; consider `ellipsis` + `title` or hover tooltip.
   - "Delete Session" confirm dialog is `window.confirm` — swap for modal or toast confirmation.

---

## 2. Producer Agent (Cost Guardian)

### 2.1 Widget Anatomy

```
┌────────────────────────────────────────┐
│ ⚠️  Est. Job Cost: $X.XX   [3]         │  ← Badge shows pending alert count
└────────────────────────────────────────┘
        ↓ AnimatePresence
┌────────────────────────────────────────┐
│ 💰 High Cost Job                       │
│ This job is estimated at $5.20...      │
│ [Acknowledge & Continue] [Switch Draft]│
│ ● ○ ○  (queue dots)                    │
└────────────────────────────────────────┘
```

### 2.2 Alert Severity Theming

| Severity | Background | Border | Icon | Title Color |
|----------|------------|--------|------|-------------|
| Financial | `amber-900/40` | `amber-500/50` | `DollarSign` | `amber-300` |
| Consistency | `purple-900/40` | `purple-500/50` | `AlertCircle` | `purple-300` |
| Technical | `red-900/40` | `red-500/50` | `Zap` | `red-300` |

### 2.3 Recommended Tasks
1. **Toast Integration Option**
   Some users prefer inline toasts over a fixed bottom-right card. Provide a user setting toggle.

2. **Dismiss-All Button**
   When `alerts.length > 3`, show "Dismiss All" to bulk-clear without clicking each.

3. **Cost Breakdown Popover**
   On hover/click of cost pill, show breakdown: `base × duration × variations`.

4. **Persistence Across Routes**
   `acknowledgedAlerts` is ephemeral (useState). Consider syncing to session storage or Zustand persist so they survive page navigation.

---

## 3. Cinematography & Physics

### 3.1 Optics Engine
| Feature | Status | UX Polish Needed |
|---------|--------|------------------|
| Lens Kit Selector | ✅ Functional | Add "Favorite" star to pin frequently-used lenses |
| Anamorphic Toggle | ✅ Functional | Consider visual preview of aspect-ratio crop |
| DOF Slider | ⚠️ Partial | Need real-time bokeh preview on proxy sphere |

### 3.2 Virtual Gaffer
| Feature | Status | UX Polish Needed |
|---------|--------|------------------|
| Light Placement Canvas | ✅ Functional | Drag handles need larger hit-area for touch |
| Inverse Gaffing | ✅ AI-powered | Show loading skeleton while Grok analyzes |
| Flip Map | ✅ Functional | Consider undo support (currently one-way) |

### 3.3 Recommended Tasks
1. **Undo/Redo Stack**
   Implement for both Optics and Gaffer changes; use Zustand middleware or custom hook.

2. **Preset Quick-Apply**
   "John Wick Neon", "Studio Portrait", "Golden Hour" one-click presets for Gaffer.

3. **Keyboard Shortcuts**
   `L` to toggle lights panel, `G` for gel picker, `Esc` to deselect.

---

## 4. Dailies & Editorial Polish

### 4.1 AB Lightbox
| Feature | Status | Notes |
|---------|--------|-------|
| Side-by-Side Compare | ✅ Functional | Left = Draft, Right = Master |
| Flicker Mode | ✅ Functional | Toggles on 500ms interval |
| Zoom & Pan | ✅ Functional | Slider + magnifier loupe |
| VideoScopes | ✅ Functional | RGB Histogram & Luma Waveform |

### 4.2 NLE Timeline
| Feature | Status | Notes |
|---------|--------|-------|
| Clip Trimming | ✅ Functional | Cyan handles for video, purple for audio |
| L-Cut/J-Cut Badges | ✅ Functional | Shows offset in seconds |
| Audio Gain | ✅ Functional | Double-click to reveal slider |
| Zoom Slider | ⚠️ Basic | Consider minimap overview at top |

### 4.3 Recommended Tasks
1. **Clip Snapping**
   Magnetic snap to adjacent clip edges and playhead.

2. **Marker System**
   Allow dropping named markers on timeline for notes/cue points.

3. **Waveform Display**
   Show audio waveform inside A1 clips (requires FFmpeg probe on ingest).

4. **Thumbnail Scrubbing**
   On hover, show frame thumbnail for quick seeking.

---

## Appendix: Component File Map

| Component | Path | Key Props |
|-----------|------|-----------|
| Sidebar | `frontend/src/components/layout/Sidebar.tsx` | — |
| SpendingWidget | `frontend/src/components/sidebar/SpendingWidget.tsx` | `collapsed`, `currentModelId`, `isVideo` |
| ProducerWidget | `frontend/src/components/ui/ProducerWidget.tsx` | — (uses hook internally) |
| useProducerAgent | `frontend/src/hooks/useProducerAgent.ts` | `variations` |
| LensKitSelector | `frontend/src/components/generation/LensKitSelector.tsx` | `onSelect`, `selectedLens` |
| LightingStage | `frontend/src/components/lighting/LightingStage.tsx` | — |
| ABLightbox | `frontend/src/components/generations/ABLightbox.tsx` | `isOpen`, `generations`, `initialIndex` |
| VideoScopes | `frontend/src/components/generations/VideoScopes.tsx` | `videoRef` or `imageUrl` |
| NLETimeline | `frontend/src/components/timeline/NLETimeline.tsx` | `clips`, `onTrimUpdate`, etc. |

---

*End of Handoff Document*

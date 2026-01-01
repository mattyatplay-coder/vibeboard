# VibeBoard UX Implementation Package
**Version:** Private Beta
**Date:** December 31, 2025
**For:** UI/UX Implementation Team

---

## Overview

This document contains all component files, code snippets, and implementation notes needed to complete 15 pending UX polish tasks for VibeBoard's private beta launch.

### Priority Summary
| Priority | Count | Task IDs |
|----------|-------|----------|
| **High** | 3 | UX-002, UX-009, UX-012 |
| **Medium** | 8 | UX-001, UX-004, UX-006, UX-007, UX-010, UX-011, UX-013, UX-015 |
| **Low** | 4 | UX-003, UX-005, UX-008, UX-014 |

---

## Module 1: Navigation (Sidebar.tsx)

**File Location:** `frontend/src/components/layout/Sidebar.tsx`

### Current Implementation Notes
- Already imports Radix Tooltip (line 13)
- Uses `window.confirm()` for deletion (native browser dialog)
- Navigation items use native `title` attribute when collapsed

### UX-001: Radix Tooltip for Collapsed Sidebar
**Priority:** Medium
**Status:** Todo

**Current Code (line 224):**
```tsx
title={isCollapsed ? item.label : undefined}
```

**Required Change:**
Replace native `title` attribute with existing Radix Tooltip component:
```tsx
// Wrap navigation link with Tooltip when collapsed
<Tooltip content={item.label} side="right">
  <Link href={...} className={...}>
    {/* icon and label */}
  </Link>
</Tooltip>
```

**Notes:**
- Tooltip component already exists at `frontend/src/components/ui/Tooltip.tsx`
- Use `side="right"` for sidebar tooltips
- Only show tooltip when `isCollapsed === true`

---

### UX-002: Keyboard Navigation for Studio Spine
**Priority:** HIGH
**Status:** Todo

**Current Code (lines 211-230):**
```tsx
<Link
  key={item.href}
  href={item.href}
  className={clsx(
    'group flex items-center rounded-lg px-3 py-2 transition-colors',
    // ... styling
  )}
>
```

**Required Change:**
Add keyboard accessibility attributes:
```tsx
<Link
  key={item.href}
  href={item.href}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(item.href);
    }
  }}
  className={...}
  role="menuitem"
>
```

**Notes:**
- Add `role="menu"` to parent navigation container
- Add `role="menuitem"` to each navigation link
- Test with screen reader (VoiceOver on Mac)

---

### UX-003: Session Delete Confirmation Modal
**Priority:** Low
**Status:** Todo

**Current Code (lines 181-185):**
```tsx
const handleDeleteSession = (session: Session, e: React.MouseEvent) => {
  e.stopPropagation();
  if (confirm('Are you sure you want to delete this session? This will delete all generations, elements, and scenes within it.')) {
    deleteSession(session.id);
  }
};
```

**Required Change:**
Replace with styled modal using existing patterns:
```tsx
// Add state for modal
const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

// Replace confirm() with modal trigger
const handleDeleteSession = (session: Session, e: React.MouseEvent) => {
  e.stopPropagation();
  setSessionToDelete(session);
};

// Add AlertDialog component (Radix or custom modal)
{sessionToDelete && (
  <AlertDialog
    isOpen={!!sessionToDelete}
    onClose={() => setSessionToDelete(null)}
    onConfirm={() => {
      deleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }}
    title="Delete Session?"
    description="This will permanently delete all generations, elements, and scenes within this session."
    confirmText="Delete"
    variant="destructive"
  />
)}
```

**Notes:**
- Consider using `@radix-ui/react-alert-dialog` for accessibility
- Match styling with existing modals (dark theme, zinc-900 background)

---

## Module 2: Producer Agent

**File Locations:**
- `frontend/src/hooks/useProducerAgent.ts`
- `frontend/src/components/ui/ProducerWidget.tsx`

### Current Implementation Notes
- Cost calculation: `baseCost × durationSeconds × numVariations`
- Alert types: Financial, Consistency, Technical
- `acknowledgedAlerts` stored in React state (not persisted)
- Fixed position at `bottom-4 right-4`

### UX-004: Toast Integration Option
**Priority:** Medium
**Status:** Todo

**Current Code (ProducerWidget.tsx line 58):**
```tsx
className="fixed bottom-4 right-4 z-50 flex max-w-md flex-col gap-2"
```

**Required Change:**
Add setting for toast vs. fixed card display:
```tsx
// Add to useProducerAgent.ts or settings store
const [displayMode, setDisplayMode] = useState<'fixed' | 'toast'>('fixed');

// In ProducerWidget, conditionally render
if (displayMode === 'toast') {
  // Use react-hot-toast or custom toast system
  alerts.forEach(alert => toast.custom(...));
  return null;
}

// Otherwise render fixed card as current
```

**Notes:**
- Consider using existing toast system if one exists
- Add toggle in settings/preferences panel

---

### UX-005: Dismiss-All Button
**Priority:** Low
**Status:** Todo

**Current Code (ProducerWidget.tsx):**
No bulk dismiss exists.

**Required Change:**
Add dismiss-all when alerts > 3:
```tsx
{alerts.length > 3 && (
  <button
    onClick={() => {
      alerts.forEach(alert => acknowledgeAlert(alert.id));
    }}
    className="text-xs text-gray-400 hover:text-white transition"
  >
    Dismiss All ({alerts.length})
  </button>
)}
```

---

### UX-006: Cost Breakdown Popover
**Priority:** Medium
**Status:** Todo

**Current Cost Calculation (useProducerAgent.ts lines 74-92):**
```tsx
const totalCostEstimate = useMemo(() => {
  const baseCost = parseCostString(model.cost);
  const durationSeconds = isVideo ? parseInt(String(currentDuration) || '5', 10) : 1;
  if (isVideo) {
    return baseCost * durationSeconds * numVariations;
  } else {
    return baseCost * numVariations;
  }
}, [currentModelId, currentDuration, isVideo, variations]);
```

**Required Change:**
Expose breakdown data and add popover:
```tsx
// Return breakdown object from hook
const costBreakdown = useMemo(() => ({
  baseCost: parseCostString(model.cost),
  duration: isVideo ? parseInt(String(currentDuration) || '5', 10) : 1,
  variations: numVariations,
  total: totalCostEstimate,
  formula: isVideo
    ? `$${baseCost.toFixed(2)} × ${duration}s × ${variations} = $${total.toFixed(2)}`
    : `$${baseCost.toFixed(2)} × ${variations} = $${total.toFixed(2)}`
}), [...]);

// In ProducerWidget, add hover popover
<Popover>
  <PopoverTrigger>
    <span className="cursor-help">~${totalCostEstimate.toFixed(2)}</span>
  </PopoverTrigger>
  <PopoverContent>
    <div className="text-xs">
      <p>Base: ${costBreakdown.baseCost.toFixed(2)}/unit</p>
      {isVideo && <p>Duration: {costBreakdown.duration}s</p>}
      <p>Variations: ×{costBreakdown.variations}</p>
      <p className="font-bold mt-1">{costBreakdown.formula}</p>
    </div>
  </PopoverContent>
</Popover>
```

---

### UX-007: Persist Acknowledged Alerts
**Priority:** Medium
**Status:** Todo

**Current Code (useProducerAgent.ts line 62):**
```tsx
const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
```

**Required Change:**
Use sessionStorage or Zustand persist:
```tsx
// Option 1: sessionStorage
const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(() => {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('acknowledgedAlerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  }
  return new Set();
});

useEffect(() => {
  sessionStorage.setItem('acknowledgedAlerts', JSON.stringify([...acknowledgedAlerts]));
}, [acknowledgedAlerts]);

// Option 2: Zustand store with persist middleware
// Create producerAgentStore.ts with persist configuration
```

---

## Module 3: Studio Control

**File Locations:**
- `frontend/src/components/generation/LensKitSelector.tsx`
- `frontend/src/components/lighting/LightingStage.tsx`

### UX-008: Lens Favorites
**Priority:** Low
**Status:** Todo

**File:** `LensKitSelector.tsx`

**Current Implementation:**
No favorites system exists. Lenses are displayed in a flat list by category.

**Required Change:**
Add star/favorite functionality:
```tsx
// Add to store or local state
const [favoriteLenses, setFavoriteLenses] = useState<Set<string>>(() => {
  const saved = localStorage.getItem('favoriteLenses');
  return saved ? new Set(JSON.parse(saved)) : new Set();
});

const toggleFavorite = (lensId: string) => {
  setFavoriteLenses(prev => {
    const next = new Set(prev);
    if (next.has(lensId)) next.delete(lensId);
    else next.add(lensId);
    localStorage.setItem('favoriteLenses', JSON.stringify([...next]));
    return next;
  });
};

// In lens card, add star icon
<button onClick={() => toggleFavorite(lens.id)}>
  <Star
    className={clsx(
      'h-4 w-4',
      favoriteLenses.has(lens.id) ? 'fill-amber-400 text-amber-400' : 'text-gray-500'
    )}
  />
</button>

// Sort favorites to top
const sortedLenses = [...lenses].sort((a, b) => {
  const aFav = favoriteLenses.has(a.id) ? -1 : 0;
  const bFav = favoriteLenses.has(b.id) ? -1 : 0;
  return aFav - bFav;
});
```

---

### UX-009: Undo/Redo Stack for Optics & Gaffer
**Priority:** HIGH
**Status:** Todo

**File:** `NLETimeline.tsx` (placeholder exists)

**Current Code (lines 556-557):**
```tsx
onUndo: () => console.log('Undo'), // Implement undo stack
onRedo: () => console.log('Redo'), // Implement redo stack
```

**Required Change:**
Implement history stack with Zustand middleware:
```tsx
// Create useUndoRedo.ts hook
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const push = (newState: T) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newState,
      future: [],
    }));
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      const [newPresent, ...newPast] = [...prev.past].reverse();
      return {
        past: newPast.reverse(),
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  };

  const redo = () => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      const [newPresent, ...newFuture] = prev.future;
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  };

  return { state: history.present, push, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}
```

**Notes:**
- Apply to lighting store and optics store
- Add keyboard shortcuts: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo)
- Consider Zustand's `temporal` middleware for built-in undo/redo

---

### UX-010: Gaffer Quick-Apply Presets
**Priority:** Medium
**Status:** Todo

**File:** `LightingStage.tsx`

**Current Presets (lines 470-486):**
Presets exist in `LIGHTING_PRESETS` from lightingStore but require multiple clicks.

**Required Change:**
Add one-click preset buttons:
```tsx
const QUICK_PRESETS = [
  { id: 'john-wick', name: 'Neon Noir', icon: '🌃', description: 'Red/blue rim lights' },
  { id: 'portrait', name: 'Studio Portrait', icon: '📸', description: '3-point lighting' },
  { id: 'golden-hour', name: 'Golden Hour', icon: '🌅', description: 'Warm key, cool fill' },
];

// Add quick preset bar above stage
<div className="flex gap-2 mb-4">
  {QUICK_PRESETS.map(preset => (
    <button
      key={preset.id}
      onClick={() => applyPreset(preset.id)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
    >
      <span>{preset.icon}</span>
      <span className="text-sm">{preset.name}</span>
    </button>
  ))}
</div>
```

**Preset Configurations:**
```tsx
const PRESET_CONFIGS = {
  'john-wick': {
    lights: [
      { type: 'practical', x: 0.15, y: 0.3, intensity: 0.8, color: '#ff0040', name: 'Neon Red' },
      { type: 'rim', x: 0.85, y: 0.2, intensity: 0.7, color: '#0088ff', name: 'Blue Rim' },
    ]
  },
  'portrait': {
    lights: [
      { type: 'key', x: 0.25, y: 0.5, intensity: 1.0, color: '#fff5e6', name: 'Key' },
      { type: 'fill', x: 0.75, y: 0.6, intensity: 0.4, color: '#e6f0ff', name: 'Fill' },
      { type: 'rim', x: 0.5, y: 0.1, intensity: 0.6, color: '#ffffff', name: 'Hair' },
    ]
  },
  'golden-hour': {
    lights: [
      { type: 'key', x: 0.2, y: 0.4, intensity: 0.9, color: '#ffaa33', name: 'Sun' },
      { type: 'fill', x: 0.8, y: 0.5, intensity: 0.3, color: '#6699cc', name: 'Sky' },
    ]
  }
};
```

---

### UX-011: Keyboard Shortcuts for Lighting
**Priority:** Medium
**Status:** Todo

**File:** `LightingStage.tsx`

**Required Change:**
Add keyboard event handler:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      case 'l':
        setShowLightPanel(prev => !prev);
        break;
      case 'g':
        if (selectedLight) setShowGelPicker(true);
        break;
      case 'escape':
        setSelectedLight(null);
        setShowGelPicker(false);
        break;
      case 'delete':
      case 'backspace':
        if (selectedLight) {
          removeLight(selectedLight.id);
          setSelectedLight(null);
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedLight]);
```

**Notes:**
- Add visual hint showing shortcuts in UI
- Consider adding to help overlay or tooltip

---

## Module 4: Post-Production (NLETimeline.tsx)

**File Location:** `frontend/src/components/timeline/NLETimeline.tsx`

### Current Implementation Notes
- Has V1 (video) and A1 (audio) tracks
- Supports L-cut/J-cut via independent audio trimming
- Has keyboard shortcuts hook but undo/redo are placeholders
- `SNAP_THRESHOLD = 10` defined but not used for magnetic snapping

### UX-012: Timeline Clip Snapping
**Priority:** HIGH
**Status:** Todo

**Current Code:**
`SNAP_THRESHOLD = 10` is defined but snapping logic not implemented.

**Required Change:**
Add magnetic snapping during drag:
```tsx
const SNAP_THRESHOLD = 10; // pixels

const getSnapPoints = (clips: TimelineClip[], excludeId: string) => {
  const points: number[] = [0]; // Always snap to start
  clips.forEach(clip => {
    if (clip.id !== excludeId) {
      const startPx = clip.startTime * zoom;
      const endPx = (clip.startTime + clip.duration) * zoom;
      points.push(startPx, endPx);
    }
  });
  // Add playhead position
  points.push(playheadTime * zoom);
  return points;
};

const findNearestSnap = (position: number, snapPoints: number[]) => {
  let nearest = position;
  let minDist = SNAP_THRESHOLD + 1;

  for (const point of snapPoints) {
    const dist = Math.abs(position - point);
    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  }

  return minDist <= SNAP_THRESHOLD ? { snapped: true, position: nearest } : { snapped: false, position };
};

// In drag handler
const handleDrag = (clipId: string, newPosition: number) => {
  const snapPoints = getSnapPoints(clips, clipId);
  const { snapped, position } = findNearestSnap(newPosition, snapPoints);

  // Visual feedback for snap
  setShowSnapLine(snapped);
  setSnapLinePosition(position);

  updateClipPosition(clipId, position / zoom);
};
```

**Visual Feedback:**
```tsx
{/* Snap indicator line */}
{showSnapLine && (
  <div
    className="absolute top-0 bottom-0 w-px bg-cyan-400 z-50 pointer-events-none"
    style={{ left: snapLinePosition }}
  />
)}
```

---

### UX-013: Timeline Marker System
**Priority:** Medium
**Status:** Todo

**Required Change:**
Add marker track and marker data:
```tsx
interface TimelineMarker {
  id: string;
  time: number; // seconds
  label: string;
  color?: string;
}

// Add state
const [markers, setMarkers] = useState<TimelineMarker[]>([]);

// Marker track above V1
<div className="h-6 bg-zinc-900/50 relative border-b border-white/5">
  {markers.map(marker => (
    <div
      key={marker.id}
      className="absolute top-0 bottom-0 flex items-center"
      style={{ left: marker.time * zoom }}
    >
      <div
        className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent"
        style={{ borderTopColor: marker.color || '#22d3ee' }}
      />
      <span className="text-[10px] text-gray-400 ml-1 whitespace-nowrap">
        {marker.label}
      </span>
    </div>
  ))}
</div>

// Add marker on double-click or M key
const addMarker = (time: number) => {
  const label = prompt('Marker label:') || `Marker ${markers.length + 1}`;
  setMarkers(prev => [...prev, { id: uuidv4(), time, label }]);
};
```

---

### UX-014: Audio Waveform Display
**Priority:** Low
**Status:** Todo

**Notes:**
- Requires FFmpeg probe on audio file ingest
- Backend endpoint needed to generate waveform data
- Can use existing `/api/process/` infrastructure

**Required Change:**
```tsx
// Backend: Add waveform generation endpoint
// POST /api/process/waveform
// Returns: { peaks: number[], duration: number }

// Frontend: Render waveform in A1 clip
interface WaveformData {
  peaks: number[];
  duration: number;
}

const AudioWaveform: React.FC<{ audioUrl: string; width: number; height: number }> = ({ audioUrl, width, height }) => {
  const [waveform, setWaveform] = useState<WaveformData | null>(null);

  useEffect(() => {
    fetch(`/api/process/waveform?url=${encodeURIComponent(audioUrl)}`)
      .then(r => r.json())
      .then(setWaveform);
  }, [audioUrl]);

  if (!waveform) return null;

  const step = width / waveform.peaks.length;

  return (
    <svg width={width} height={height} className="fill-purple-500/30">
      {waveform.peaks.map((peak, i) => (
        <rect
          key={i}
          x={i * step}
          y={(height - peak * height) / 2}
          width={step * 0.8}
          height={peak * height}
        />
      ))}
    </svg>
  );
};
```

---

### UX-015: Thumbnail Scrubbing
**Priority:** Medium
**Status:** Todo

**Required Change:**
Add hover thumbnail preview:
```tsx
const [hoverTime, setHoverTime] = useState<number | null>(null);
const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

const handleTimelineHover = (e: React.MouseEvent) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const time = x / zoom;

  setHoverTime(time);
  setHoverPosition({ x: e.clientX, y: rect.top - 80 }); // Above timeline
};

// Thumbnail preview (fixed position)
{hoverTime !== null && (
  <div
    className="fixed z-50 pointer-events-none"
    style={{ left: hoverPosition.x - 60, top: hoverPosition.y }}
  >
    <div className="w-[120px] h-[68px] bg-zinc-900 rounded-lg overflow-hidden border border-white/10">
      {/* Video frame at hoverTime */}
      <video
        src={activeClip?.videoUrl}
        className="w-full h-full object-cover"
        ref={(el) => {
          if (el) el.currentTime = hoverTime;
        }}
      />
    </div>
    <div className="text-center text-xs text-gray-400 mt-1">
      {formatTimecode(hoverTime)}
    </div>
  </div>
)}
```

**Notes:**
- May need pre-generated thumbnail sprites for performance
- Consider using `<canvas>` for video frame extraction
- Backend could pre-generate sprite sheets during ingest

---

## Implementation Order Recommendation

### Sprint 1: High Priority (Week 1)
1. **UX-002** - Keyboard Navigation (accessibility requirement)
2. **UX-012** - Timeline Clip Snapping (core editing UX)
3. **UX-009** - Undo/Redo Stack (safety net for users)

### Sprint 2: Medium Priority (Week 2)
4. **UX-001** - Radix Tooltips (quick win, already have component)
5. **UX-006** - Cost Breakdown Popover (transparency)
6. **UX-007** - Persist Acknowledged Alerts (UX continuity)
7. **UX-010** - Gaffer Quick Presets (workflow speed)

### Sprint 3: Medium Priority (Week 3)
8. **UX-004** - Toast Integration Option (settings)
9. **UX-011** - Lighting Keyboard Shortcuts (power users)
10. **UX-013** - Timeline Markers (editorial workflow)
11. **UX-015** - Thumbnail Scrubbing (navigation)

### Sprint 4: Low Priority (Week 4)
12. **UX-003** - Session Delete Modal (polish)
13. **UX-005** - Dismiss-All Button (convenience)
14. **UX-008** - Lens Favorites (personalization)
15. **UX-014** - Audio Waveforms (requires backend work)

---

## Dependencies & Prerequisites

### NPM Packages (already installed)
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-popover` - Popovers
- `@radix-ui/react-alert-dialog` - Confirmation modals
- `framer-motion` - Animations
- `zustand` - State management

### Backend Requirements
- **UX-014**: FFmpeg waveform endpoint (`/api/process/waveform`)
- **UX-015**: Thumbnail sprite generation (optional optimization)

### Design System
- Colors: See `CLAUDE.md` - Zinc 950 background, Violet for creative, Cyan for technical
- Font: Inter (UI), JetBrains Mono (timecode/data)
- Borders: 1px `white/10`, no drop shadows

---

## Testing Checklist

- [ ] Test keyboard navigation with VoiceOver/NVDA
- [ ] Verify tooltips don't obstruct interaction
- [ ] Test undo/redo with complex state changes
- [ ] Verify clip snapping at zoom levels 1x-8x
- [ ] Test marker system with 50+ markers
- [ ] Verify waveform renders for audio files 1s-60min
- [ ] Test thumbnail scrubbing performance with 4K video

---

## Contact

For questions about existing code patterns:
- Check `CLAUDE.md` for component interfaces
- Check `.claude/feature-dna/*.json` for feature specifications
- Backend services documented in `FEATURE_INVENTORY.md`


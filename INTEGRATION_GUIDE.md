# VibeBoard Integration Guide: Antigravity UI/UX Updates

> **Last Updated**: December 18, 2024
> **Purpose**: Ensure seamless integration between Claude's backend/logic work and Antigravity's UI/UX updates

---

## Quick Reference: What's Safe to Modify

| Area                       | Safe to Modify   | Must Preserve         |
| -------------------------- | ---------------- | --------------------- |
| Tailwind classes           | ✅ Yes           | -                     |
| Component JSX structure    | ✅ Yes           | Function calls, props |
| Animations (Framer Motion) | ✅ Yes           | -                     |
| Portal wrappers            | ✅ Yes           | Callback signatures   |
| New UI components          | ✅ Yes           | -                     |
| TypeScript interfaces      | ⚠️ Additive only | Existing fields       |
| Backend files              | ❌ No            | Everything            |
| State management           | ❌ No            | Everything            |

---

## Verified Safe Changes (December 2024 Merge)

### 1. ModelRegistry.ts - Adding `supportedDurations`

**File**: `src/lib/ModelRegistry.ts`

**Current Interface (lines 11-20):**

```typescript
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capability: ModelCapability;
  desc?: string;
  cost?: string;
  type: 'image' | 'video';
  tier?: 'fast' | 'quality' | 'pro';
}
```

**Safe Addition:**

```typescript
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capability: ModelCapability;
  desc?: string;
  cost?: string;
  type: 'image' | 'video';
  tier?: 'fast' | 'quality' | 'pro';
  supportedDurations?: string[]; // ✅ NEW - Optional field, won't break existing code
}
```

**Why This Is Safe:**

- Optional field (`?`) - existing models without it won't break
- No existing code validates or iterates over this field
- TypeScript will only check new usages

**Updating ALL_MODELS:**

```typescript
// Example - adding durations to a model
{
    id: 'fal-ai/wan-t2v',
    name: 'Wan 2.2 T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Realistic motion, cinematic',
    supportedDurations: ['5s', '10s']  // ✅ Safe to add
},
```

---

### 2. GenerationForm.tsx - Duration Selector

**Status**: This file does not currently exist.

**Safe to Create**: ✅ Yes - new file, no conflicts

**If integrating into existing generate page** (`src/app/projects/[id]/generate/page.tsx`):

- Add new state for duration
- Add UI component for selection
- Pass duration to generation API call

**Preserve These API Patterns:**

```typescript
// Existing pattern for API calls - maintain this structure
const response = await fetch(`${API_URL}/api/projects/${projectId}/generations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer mock-token',
  },
  body: JSON.stringify({
    // existing fields...
    duration: selectedDuration, // ✅ Safe to add new field
  }),
});
```

---

### 3. ElementPicker.tsx - Portal Fix

**File**: `src/components/generations/ElementPicker.tsx`

**Current Implementation**: Uses `absolute` positioning

**Safe Modifications:**

- ✅ Wrap in React Portal (`createPortal`)
- ✅ Change z-index values
- ✅ Modify container structure
- ✅ Change styling/animations

**MUST PRESERVE These Callbacks:**

```typescript
// Line 50 - Element selection
onClick={() => onToggleElement(el)}  // Must pass Element object

// Line 23 - Close button
onClick={onClose}  // Must call this function
```

**Example Safe Portal Implementation:**

```typescript
import { createPortal } from 'react-dom';

export function ElementPicker({ isOpen, onClose, elements, selectedElementIds, onToggleElement }: ElementPickerProps) {
    if (!isOpen) return null;

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-[#1a1a1a] border border-white/20 rounded-xl ...">
                {/* ... existing content ... */}
                <button onClick={() => onToggleElement(el)}>  {/* ✅ Preserve this */}
                    {/* ... */}
                </button>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
```

---

### 4. EngineLibraryModal.tsx - Portal Fix

**File**: `src/components/generations/EngineLibraryModal.tsx`

**Safe Modifications:**

- ✅ Portal wrapping
- ✅ Z-index changes
- ✅ Layout/styling changes
- ✅ Animation changes

**MUST PRESERVE These Functions:**

```typescript
// Line 98-100 - Model selection
const handleSelect = (model: ModelInfo) => {
  onSelect(model); // ✅ Must call with ModelInfo object
  onClose(); // ✅ Must call this
};

// Lines 35-44 - Favorites (localStorage)
const toggleFavorite = (e: React.MouseEvent, modelId: string) => {
  e.stopPropagation();
  setFavorites(prev => {
    const next = prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId];
    localStorage.setItem('vibeboard_model_favorites', JSON.stringify(next));
    return next;
  });
};
```

---

## DO NOT MODIFY - Protected Files & Directories

### Backend (Entire Directory)

```
/backend/
├── src/
│   ├── services/          # ❌ Generation logic, adapters
│   ├── controllers/       # ❌ API request handlers
│   ├── routes/            # ❌ API endpoint definitions
│   └── middleware/        # ❌ Auth, upload handling
└── prisma/                # ❌ Database schema
```

### Frontend Data Registries

```
/frontend/src/
├── lib/
│   ├── store.ts           # ❌ Zustand state management
│   ├── api.ts             # ❌ API client functions
│   └── ModelRegistry.ts   # ⚠️ Only add optional fields to interface
├── data/
│   ├── CinematicTags.ts   # ❌ 44,957 lines of tag data
│   ├── CameraPresets.ts   # ❌ 29,387 lines of presets
│   ├── GenreTemplates.ts  # ❌ 33,116 lines of templates
│   ├── engines.ts         # ❌ Engine definitions
│   └── modelCapabilities.ts # ❌ Model capability matrix
├── context/               # ❌ React context providers
└── types/                 # ❌ TypeScript type definitions
```

---

## Safe to Modify Freely

### UI Components (Styling Only)

```
/frontend/src/components/
├── ui/                    # ✅ Base UI primitives
├── layout/                # ✅ Layout wrappers
└── [any].tsx              # ✅ Styling, structure, animations
```

### Styling & Configuration

```
/frontend/
├── tailwind.config.ts     # ✅ Theme, colors, spacing
├── globals.css            # ✅ Global styles
└── postcss.config.js      # ✅ PostCSS config
```

---

## Git Workflow for Integration

### Recommended Branch Strategy

```bash
# Antigravity creates feature branch
git checkout -b ui/antigravity-duration-selector

# Make changes
# ...

# Create PR for review
gh pr create --title "feat: Add duration selector and portal fixes" --body "..."
```

### Pre-Merge Checklist

Before merging Antigravity's changes, verify:

- [ ] No modifications to `/backend/` directory
- [ ] No changes to store.ts, api.ts logic
- [ ] Interface additions are optional fields only
- [ ] All callback signatures preserved
- [ ] No removal of existing props or state
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run type-check`

---

## API Contract Reference

When adding new features that call the backend, use these patterns:

### Generation Request

```typescript
// POST /api/projects/:projectId/generations
{
    prompt: string;
    negativePrompt?: string;
    model: string;           // Model ID from ModelRegistry
    width?: number;
    height?: number;
    duration?: string;       // ✅ New - e.g. "5s", "10s"
    // ... other fields
}
```

### Headers Required

```typescript
headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'  // Mock auth - will be replaced
}
```

---

## Contact & Questions

If you're unsure whether a change is safe:

1. Check if the file is in the "DO NOT MODIFY" list above
2. For component changes, identify the callback functions and preserve them
3. For interface changes, only add optional fields (`fieldName?: type`)
4. When in doubt, ask for verification before proceeding

---

## Version History

| Date       | Change                                   | Author |
| ---------- | ---------------------------------------- | ------ |
| 2024-12-18 | Initial guide created                    | Claude |
| 2024-12-18 | Verified duration selector, portal fixes | Claude |

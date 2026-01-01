# Magic Eraser / Content-Aware Fill - Feature Roadmap

## Overview
Implementation plan for Photoshop-style content-aware fill tool for removing blemishes, tattoos, and objects from images and video.

---

## Research Summary (Dec 2025)

### Recommended Models by Use Case

| Use Case | Model | Provider | Speed |
|----------|-------|----------|-------|
| Face blemishes | `fal-ai/retoucher` | Fal.ai | Fast |
| Object/tattoo removal | `fal-ai/object-removal/mask` | Fal.ai | Fast |
| Premium inpainting | `fal-ai/flux-pro/v1/fill` | Fal.ai | Slow (~57s) |
| Video (API) | `jd7h/xmem-propainter-inpainting` | Replicate | Medium |
| Video (quality) | DiffuEraser | Self-hosted | Medium |

### Current Implementation Status ✅ COMPLETE (Dec 2025)
- **Backend**: `InpaintingService.ts` + `processingController.magicEraser()`
- **Route**: `POST /api/process/magic-eraser`
- **Frontend**: `MagicEraserPanel.tsx` with brush drawing UI
- **Model**: `fal-ai/object-removal/mask` (best_quality mode)

---

## Phase 1: MVP ✅ COMPLETE

### Backend ✅
- [x] InpaintingService calling Fal.ai
- [x] Magic eraser endpoint in processingController
- [x] Route configured in processingRoutes.ts
- [x] Changed model from `fal-ai/flux/dev` to `fal-ai/object-removal/mask`
- [x] Added validation error logging

### Frontend ✅
- [x] MagicEraserPanel.tsx with brush drawing
- [x] Native DOM event listeners (prevents React re-render clearing canvas)
- [x] Brush size slider (5-100px)
- [x] Real-time brush cursor preview
- [x] Mask dimension scaling (display → original)
- [x] Binary mask generation (red strokes → white/black)
- [x] Integration with magic-eraser endpoint
- [x] Iterative editing (result becomes new base)
- [x] Download button for final result

---

## Phase 2: Professional Tools (2-4 Weeks)

### Drawing Tools
- [ ] Polygon mask tool (click-to-add points)
- [ ] Bézier curve conversion
- [ ] Per-point feathering control

### UX Enhancements
- [ ] Keyboard shortcuts (`[` `]` for brush size, `Z` for undo)
- [ ] Smart undo grouping (operations within 500ms)
- [ ] Preview modes (normal overlay, binary, rubylith)
- [ ] Brush softness/feathering slider

### DaVinci Resolve Patterns to Implement
- Multi-mode point editing (Default, Modify with Ctrl, Insert with Shift)
- Middle-click to delete points
- `L` for linear points, `S` for smooth points

---

## Phase 3: Video Support (1-3 Months)

### Frame-by-Frame Workflow
- [ ] Frame timeline visualization
- [ ] Keyframe indicators
- [ ] Forward/backward frame stepping
- [ ] Frame mode vs clip mode toggle

### Mask Tracking
- [ ] Point tracking for simple motion
- [ ] XMem/SAM2 mask propagation
- [ ] Track forward/backward/both directions
- [ ] Confidence indicators (green/yellow/red)

### Video Inpainting
- [ ] Frame extraction with FFmpeg
- [ ] Batch frame processing
- [ ] XMem-ProPainter integration (Replicate)
- [ ] Video reassembly

---

## Architecture

```
src/components/processing/
├── MagicEraserPanel.tsx      # Main container
├── MaskCanvas.tsx            # Drawing surface
├── MaskToolbar.tsx           # Tool selection
├── BrushControls.tsx         # Size, softness, opacity
├── PreviewModeSelector.tsx   # Normal/binary/rubylith
└── VideoTimeline.tsx         # Frame navigation (Phase 3)

backend/src/services/processing/
├── InpaintingService.ts      # Fal.ai inpainting calls
├── VideoInpaintingService.ts # Frame extraction + batch (Phase 3)
└── MaskPropagationService.ts # XMem/SAM2 tracking (Phase 3)
```

---

## API Reference

### Magic Eraser Endpoint
```
POST /api/process/magic-eraser
Content-Type: multipart/form-data

Fields:
- image: File (required) - Source image
- mask: File (required) - Binary mask (white = inpaint, black = keep)
- prompt: string (optional) - Guidance text (default: "clean skin, high quality, natural texture")

Response: image/png
```

### Fal.ai Models Used
- `fal-ai/object-removal/mask` - Object removal (current, best_quality mode)
- `fal-ai/flux-pro/v1/fill` - Premium quality (future option)
- `fal-ai/retoucher` - Face blemish specific (future option)

---

## Key UX Patterns from DaVinci Resolve

### Brush Controls
- Size: `[` and `]` bracket keys
- Softness: Number keys 1-9 (10%-90%)
- Cursor shows brush preview circle

### Preview Modes
- **Normal**: Green overlay at 30% opacity
- **Binary**: Black/white mask only
- **Rubylith**: Red overlay (After Effects style)
- **Alpha**: Checkerboard for transparency

### Mask Compositing
- Add (union)
- Subtract (remove from mask)
- Intersect (overlap only)

### Video Tracking
- Track from middle frame outward (most stable)
- Confidence indicators during tracking
- Auto-stop on low confidence (<70%)

---

## Cost Estimates

| Operation | Est. Cost | Notes |
|-----------|-----------|-------|
| Single image inpaint | ~$0.01-0.02 | Fal.ai SDXL |
| Premium inpaint (FLUX) | ~$0.02-0.05 | Higher quality |
| 10s video (300 frames) | ~$3-6 | Frame-by-frame |
| 10s video (ProPainter) | ~$0.50-1.00 | Native video model |

---

## References

- Fal.ai Inpainting: https://fal.ai/models/fal-ai/inpaint/api
- Fal.ai Object Removal: https://fal.ai/models/fal-ai/object-removal/mask/api
- XMem-ProPainter: https://replicate.com/jd7h/xmem-propainter-inpainting
- DiffuEraser: https://github.com/lixiaowen-xw/DiffuEraser

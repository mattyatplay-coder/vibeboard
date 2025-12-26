# Video Model Test Results - Dec 24, 2025

## Summary

Comprehensive testing of all video models in VibeBoard's ModelRegistry.

### Text-to-Video Models (14 tested)

| Model | Endpoint | Status | Time | Notes |
|-------|----------|--------|------|-------|
| Wan 2.2 (1.3B) | `fal-ai/wan-t2v` | ✅ SUCCESS | 66.2s | num_frames=97 |
| Wan 2.5 | `fal-ai/wan-25-preview/text-to-video` | ✅ SUCCESS | 179.2s | |
| Wan 2.6 | `wan/v2.6/text-to-video` | ✅ SUCCESS | 176.2s | **Fixed** - no fal-ai/ prefix |
| Wan Pro | `fal-ai/wan-pro/text-to-video` | ✅ SUCCESS | 59.0s | |
| LTX Video | `fal-ai/ltx-video` | ✅ SUCCESS | 15.2s | Fastest! |
| Kling 2.1 Master | `fal-ai/kling-video/v2.1/master/text-to-video` | ✅ SUCCESS | 194.5s | |
| Kling 2.6 Pro | `fal-ai/kling-video/v2.6/pro/text-to-video` | ✅ SUCCESS | 69.5s | |
| Vidu Q1 | `fal-ai/vidu/q1/text-to-video` | ✅ SUCCESS | 448.6s | Slow |
| Hunyuan Video | `fal-ai/hunyuan-video` | ✅ SUCCESS | 990.9s | Very slow (~16 min) |
| MiniMax Hailuo | `fal-ai/minimax-video` | ✅ SUCCESS | 193.9s | |
| Luma Dream Machine | `fal-ai/luma-dream-machine` | ✅ SUCCESS | 58.1s | |
| Luma Ray 2 | `fal-ai/luma-dream-machine/ray-2` | ✅ SUCCESS | 56.7s | |
| Veo 3 | `fal-ai/veo3` | ✅ SUCCESS | 59.3s | **Fixed** - duration format |
| Pixverse V4.5 | `fal-ai/pixverse/v4.5/text-to-video` | ✅ SUCCESS | 37.7s | |
| Magi | `fal-ai/magi` | ✅ SUCCESS | 695.3s | ~11 min |

### Image-to-Video Models (Sample tested)

| Model | Endpoint | Status | Notes |
|-------|----------|--------|-------|
| LTX Video I2V | `fal-ai/ltx-video/image-to-video` | ✅ SUCCESS | 10.9s |
| Kling 2.1 Standard I2V | `fal-ai/kling-video/v2.1/standard/image-to-video` | ✅ SUCCESS | 70.2s |
| Wan 2.6 I2V | `wan/v2.6/image-to-video` | ✅ SUCCESS | 159.2s |
| Luma Dream Machine I2V | `fal-ai/luma-dream-machine/image-to-video` | ⚠️ FAILED | Max image 1920x1920 |

## Fixes Applied

### 1. Wan 2.6 Endpoint Path
**Issue**: Fal.ai Wan 2.6 models use `wan/v2.6/...` format, NOT `fal-ai/wan/v2.6/...`

**Fix Location**: `backend/src/services/generators/FalAIAdapter.ts:961`
```typescript
if (model.includes("wan") && model.includes("v2.6") && model.startsWith("fal-ai/")) {
    model = model.replace("fal-ai/", "");
}
```

### 2. Veo 3 Duration Format
**Issue**: Veo 3 requires duration as `"4s"`, `"6s"`, or `"8s"` (string with 's' suffix)

**Fix Location**: `backend/src/services/generators/FalAIAdapter.ts:743-755`
```typescript
} else if (model.includes("veo3") || model.includes("veo-3")) {
    const durationNum = parseInt(String(options.duration || "6"), 10);
    if (durationNum <= 4) {
        input.duration = "4s";
    } else if (durationNum >= 8) {
        input.duration = "8s";
    } else {
        input.duration = "6s";
    }
}
```

### 3. Test Image URL
**Issue**: Original test image URL was 404

**Fix**: Use Pexels image with auto-compress for size limits:
```
https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1280
```

## I2V Image Size Limits

Some I2V models have maximum image dimension limits:
- **Luma Dream Machine I2V**: Max 1920x1920 pixels
- **Other models**: Generally accept larger images

## Performance Tiers

### Fast (< 60s)
- LTX Video: 15.2s
- Pixverse V4.5: 37.7s
- Luma Dream Machine: 58.1s
- Luma Ray 2: 56.7s
- Wan Pro: 59.0s
- Veo 3: 59.3s

### Medium (60-200s)
- Wan 2.2: 66.2s
- Kling 2.6 Pro: 69.5s
- Wan 2.6: 176.2s
- Wan 2.5: 179.2s
- MiniMax Hailuo: 193.9s
- Kling 2.1 Master: 194.5s

### Slow (> 200s)
- Vidu Q1: 448.6s (~7.5 min)
- Magi: 695.3s (~11.5 min)
- Hunyuan Video: 990.9s (~16.5 min)

## Test Configuration

```typescript
TEST_PROMPT = "A golden retriever running through a sunny park, cinematic lighting, high quality"
TEST_NEGATIVE = "low quality, blurry, distorted"
TEST_IMAGE_URL = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1280"
```

## Running Tests

```bash
cd backend
npx ts-node test-video-models.ts
```

Or for quick fix verification:
```bash
npx ts-node test-quick-fixes.ts
```

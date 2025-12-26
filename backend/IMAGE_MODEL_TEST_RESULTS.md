# Image Model Test Results - Dec 24, 2025

## Summary

Comprehensive testing of all image generation models in VibeBoard's ModelRegistry.

### Text-to-Image Models (13/17 tested successfully)

| Model | Endpoint | Status | Time | Notes |
|-------|----------|--------|------|-------|
| Flux Schnell | `fal-ai/flux/schnell` | ✅ SUCCESS | 0.9s | Fastest T2I model |
| Flux Dev | `fal-ai/flux/dev` | ✅ SUCCESS | 2.6s | Good quality/speed balance |
| Recraft V3 | `fal-ai/recraft-v3` | ✅ SUCCESS | 4.6s | |
| SD 3.5 Large | `fal-ai/stable-diffusion-v35-large` | ✅ SUCCESS | 4.7s | Supports negative prompt |
| Flux Pro | `fal-ai/flux-pro` | ✅ SUCCESS | 5.3s | |
| Imagen 4 Preview | `fal-ai/imagen4/preview` | ✅ SUCCESS | 8.3s | Google latest |
| Flux 1.1 Pro Ultra | `fal-ai/flux-pro/v1.1-ultra` | ✅ SUCCESS | 10.6s | |
| Ideogram V3 | `fal-ai/ideogram/v3` | ✅ SUCCESS | 10.9s | Good typography |
| Flux 2 Flex | `fal-ai/flux-2-flex` | ✅ SUCCESS | 16.3s | |
| Imagen 3 | `fal-ai/imagen3` | ✅ SUCCESS | 16.6s | |
| Ideogram V2 | `fal-ai/ideogram/v2` | ✅ SUCCESS | 21.4s | |
| Flux 2 Max | `fal-ai/flux-2-max` | ✅ SUCCESS | 23.2s | Highest quality Flux |
| Flux 2 Max Edit | `fal-ai/flux-2-max/edit` | ✅ SUCCESS | 37.7s | With reference image |

### Edit/Reference Models (Expected Failures - Require Input Images)

| Model | Endpoint | Status | Required Parameter |
|-------|----------|--------|-------------------|
| Flux Kontext Dev | `fal-ai/flux-kontext/dev` | ⚠️ N/A | `image_url` (character editing) |
| Flux Pro Kontext | `fal-ai/flux-pro/kontext` | ⚠️ N/A | `image_url` (character editing) |
| Kling O1 Image | `fal-ai/kling-image/o1` | ⚠️ N/A | `image_urls` (multi-reference) |
| Ideogram Character | `fal-ai/ideogram/character` | ⚠️ N/A | `reference_image_urls` |

These models are designed for image editing and character consistency, not pure text-to-image generation.

## No Fixes Required

All pure text-to-image models work correctly out of the box.

## Performance Tiers

### Fast (< 5 seconds)
- **Flux Schnell**: 0.9s - Best for quick iterations
- **Flux Dev**: 2.6s - Good balance of speed/quality
- **Recraft V3**: 4.6s - Strong design aesthetics
- **SD 3.5 Large**: 4.7s - Supports negative prompts

### Medium (5-15 seconds)
- **Flux Pro**: 5.3s
- **Imagen 4 Preview**: 8.3s - Google's latest
- **Flux 1.1 Pro Ultra**: 10.6s
- **Ideogram V3**: 10.9s - Best for text/typography

### Slow (> 15 seconds)
- **Flux 2 Flex**: 16.3s
- **Imagen 3**: 16.6s
- **Ideogram V2**: 21.4s
- **Flux 2 Max**: 23.2s - Highest quality
- **Flux 2 Max Edit**: 37.7s - With reference processing

## Parameter Formats

### Aspect Ratio Formats
| Model Family | Format | Example |
|--------------|--------|---------|
| Flux (most) | String preset | `"landscape_16_9"` |
| Flux Ultra/Max | Ratio format | `"16:9"` |
| Ideogram | Ratio format | `"16:9"` |
| Imagen | Ratio format | `"16:9"` |
| Recraft V3 | Width/Height object | `{ width: 1024, height: 768 }` |
| SD 3.5 | String preset | `"landscape_16_9"` |

### Common Parameters
```typescript
// Flux Dev/Schnell
{
    prompt: string,
    image_size: "square" | "landscape_16_9" | "portrait_16_9",
    num_inference_steps: number // Dev: 28, Schnell: 4
}

// Ideogram
{
    prompt: string,
    aspect_ratio: "16:9" | "1:1" | "9:16" | etc
}

// SD 3.5 Large
{
    prompt: string,
    negative_prompt: string, // Supported!
    image_size: "landscape_16_9" | etc
}

// Recraft V3
{
    prompt: string,
    image_size: { width: number, height: number }
}
```

## Test Configuration

```typescript
TEST_PROMPT = "A majestic golden retriever standing in a sunlit meadow, professional photography, detailed fur, golden hour lighting"
TEST_NEGATIVE = "low quality, blurry, distorted, ugly, deformed"
TEST_REFERENCE_IMAGE = "https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&w=1024"
```

## Running Tests

```bash
cd backend
npx ts-node test-image-models.ts
```

## Model Recommendations by Use Case

| Use Case | Recommended Model | Reason |
|----------|-------------------|--------|
| Quick iterations | Flux Schnell | 0.9s, good quality |
| General use | Flux Dev | 2.6s, excellent balance |
| Highest quality | Flux 2 Max | Best detail/coherence |
| Typography/Text | Ideogram V3 | Specialized for text |
| Design work | Recraft V3 | Strong aesthetics |
| Photorealism | Imagen 4 Preview | Google's latest |
| With negative prompts | SD 3.5 Large | Full control |

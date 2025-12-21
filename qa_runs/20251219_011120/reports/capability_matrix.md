# Vibeboard Model Capability Matrix

Generated: 2025-12-19

## Executive Summary

**Total Models Enumerated:** 52 (from `ModelRegistry.ts`)
**Providers:** 8 (Fal.ai, Replicate, OpenAI, Google, ComfyUI, Together, Civitai, HuggingFace)
**Model Types:** Image (22), Video (30)
**Capabilities:** text-to-image, image-editing, text-to-video, image-to-video, video-editing, avatar

### Provider Status (Backend)
| Provider | Status | Notes |
|----------|--------|-------|
| Fal.ai | ✓ Available | Primary provider, 80%+ of models |
| Replicate | ✓ Available | Custom LoRA models |
| Google Veo | ✓ Available | Veo 2, 3.1 |
| OpenAI | ✓ Available | DALL-E 3, Sora 2 |
| ComfyUI | ✓ Available | Local generation |
| Together | ✓ Available | LLM integration |
| HuggingFace | ✓ Available | Additional models |
| Civitai | ✓ Available | LoRA marketplace |
| Banana | ⚠ API Key Missing | BANANA_API_KEY not set |

---

## Image Models

### Text-to-Image Models

| Model ID | Name | Provider | LoRA | Neg Prompt | Ref Images | @element | Notes |
|----------|------|----------|------|------------|------------|----------|-------|
| fal-ai/flux/dev | Flux Dev | Fal.ai | ✓ | ✓ | ✓ (IP-Adapter) | ✓ | Primary model, best LoRA support |
| fal-ai/flux/schnell | Flux Schnell | Fal.ai | ✓ | ✓ | ✓ | ✓ | Fast (~2s), good for iteration |
| fal-ai/flux-pro | Flux Pro | Fal.ai | ✓ | ✓ | ✓ | ✓ | Commercial quality |
| fal-ai/flux-pro/v1.1-ultra | Flux 1.1 Pro Ultra | Fal.ai | ✓ | ✓ | ✓ | ✓ | 4MP native, up to 2K |
| fal-ai/flux-2-max | Flux 2 Max | Fal.ai | ✗ | ✗ | ✗ | ✗ | Simplified params, no LoRA |
| fal-ai/flux-2-flex | Flux 2 Flex | Fal.ai | ✓ | ✓ | ✓ | ✓ | Flexible aspect ratios |
| fal-ai/recraft-v3 | Recraft V3 | Fal.ai | ✗ | ✓ | ✗ | ✗ | Vector art, logos |
| fal-ai/ideogram/v2 | Ideogram V2 | Fal.ai | ✗ | ✓ | ✗ | ✗ | Best text rendering |
| fal-ai/stable-diffusion-v35-large | SD 3.5 Large | Fal.ai | ✓ | ✓ | ✓ | ✓ | Stability AI |
| fal-ai/imagen3 | Imagen 3 | Fal.ai | ✗ | ✗ | ✗ | ✗ | Google via Fal |
| fal-ai/imagen4/preview | Imagen 4 Preview | Fal.ai | ✗ | ✗ | ✗ | ✗ | Early access |
| imagen-3 | Imagen 3 | Google | ✗ | ✗ | ✗ | ✗ | Direct Google API |
| dall-e-3 | DALL-E 3 | OpenAI | ✗ | ✗ | ✗ | ✗ | Creative concepts |

### Image Editing Models

| Model ID | Name | Provider | Requires | Features | Notes |
|----------|------|----------|----------|----------|-------|
| fal-ai/flux-kontext/dev | Flux Kontext | Fal.ai | Source image | Natural language editing | Character consistency |
| fal-ai/flux-kontext/pro | Flux Kontext Pro | Fal.ai | Source image | Premium consistency | Falls back to dev |
| fal-ai/nano-banana-pro/edit | Nano Banana Edit | Fal.ai | Source image | Fast AI editing | Quick edits |
| fal-ai/gpt-image-1.5/edit | GPT Image 1.5 Edit | Fal.ai | Source image | High prompt adherence | OpenAI-style |
| fal-ai/ideogram/character | Ideogram Character | Fal.ai | Reference image | Character sheets | Turnarounds |
| fal-ai/ip-adapter-face-id | IP-Adapter Face ID | Fal.ai | Face reference | Face preservation | Tencent |
| fal-ai/kling-image/o1 | Kling O1 Image | Fal.ai | 1-10 refs | Multi-ref blending | Uses @Image1 syntax |
| fal-ai/flux-2-flex/edit | Flux 2 Flex Edit | Fal.ai | Source image | Style transfer | Transformation |
| fal-ai/flux/dev/image-to-image | Flux Dev I2I | Fal.ai | Source image | Strength control | Standard I2I |
| fal-ai/flux/dev/inpainting | Flux Inpainting | Fal.ai | Image + Mask | Regional editing | Mask-based |
| fal-ai/qwen-image/edit-plus | Qwen Edit Plus | Fal.ai | Source image | Object removal | Advanced editing |

### Upscalers

| Model ID | Name | Provider | Scale | Notes |
|----------|------|----------|-------|-------|
| fal-ai/creative-upscaler | Creative Upscaler | Fal.ai | 4x | AI detail enhancement |
| fal-ai/clarity-upscaler | Clarity Upscaler | Fal.ai | 2x/4x | Faithful upscaling |

---

## Video Models

### Text-to-Video Models

| Model ID | Name | Provider | Durations | LoRA | Neg Prompt | Audio | Notes |
|----------|------|----------|-----------|------|------------|-------|-------|
| fal-ai/wan-t2v | Wan 2.2 T2V | Fal.ai | 5s, 10s | ✗ | ✓ | ✗ | Cinematic |
| fal-ai/wan-25-preview/text-to-video | Wan 2.5 T2V | Fal.ai | 5s, 10s | ✗ | ✓ | ✗ | Latest, highest quality |
| fal-ai/wan-2.1-t2v-1.3b | Wan 2.1 T2V (1.3B) | Fal.ai | 5s | ✗ | ✓ | ✗ | Lightweight, fast |
| fal-ai/ltx-video | LTX-Video | Fal.ai | 5s, 10s | ✗ | ✓ | ✗ | Ultra-fast (~10s) |
| fal-ai/kling-video/v2.6/pro/text-to-video | Kling 2.6 Pro | Fal.ai | 5s, 10s | ✗ | ✓ | ✗ | Professional realism |
| fal-ai/vidu/v1/text-to-video | Vidu v1 | Fal.ai | 4s | ✗ | ✗ | ✗ | Fast Asian-style |
| fal-ai/hunyuan-video | Hunyuan Video | Fal.ai | 5s, 9s | ✗ | ✓ | ✗ | Tencent, complex motion |
| fal-ai/minimax-video | MiniMax Video | Fal.ai | 6s | ✗ | ✗ | ✗ | Expressive, anime |
| fal-ai/luma-dream-machine | Luma Dream Machine | Fal.ai | 5s, 9s | ✗ | ✓ | ✗ | Dreamlike motion |
| fal-ai/kling-video/v1.5/pro | Kling 1.5 Pro | Fal.ai | 5s, 10s | ✗ | ✓ | ✗ | High quality |
| fal-ai/veo3.1 | Veo 3.1 | Fal.ai | 5s | ✗ | ✓ | ✗ | Google via Fal ($0.40/s) |
| veo-2 | Veo 2 | Google | 5s | ✗ | ✓ | ✗ | Direct Google API |
| sora-2-pro | Sora 2.0 Pro | OpenAI | 5s, 10s | ✗ | ✗ | ✗ | Premium ($0.50/s) |
| sora-2 | Sora 2.0 | OpenAI | 5s | ✗ | ✗ | ✗ | Standard ($0.10/s) |

### Image-to-Video (Animation) Models

| Model ID | Name | Provider | Durations | Requires | Strength | Notes |
|----------|------|----------|-----------|----------|----------|-------|
| fal-ai/wan/v2.2-a14b/image-to-video | Wan 2.2 I2V | Fal.ai | 5s | Image | ✗ | Natural motion |
| fal-ai/wan/v2.2-a14b/image-to-video/lora | Wan 2.2 I2V LoRA | Fal.ai | 5s | Image | ✗ | Custom styles |
| fal-ai/wan-25-preview/image-to-video | Wan 2.5 I2V | Fal.ai | 5s | Image | ✗ | Highest quality |
| fal-ai/wan-2.1-i2v-14b | Wan 2.1 I2V (14B) | Fal.ai | 5s | Image | ✗ | Large model |
| fal-ai/ltx-video/image-to-video | LTX-Video I2V | Fal.ai | 6s, 10s | Image | ✗ | Fast (~10s) |
| fal-ai/kling-video/v2.1/standard/image-to-video | Kling 2.1 I2V | Fal.ai | 5s | Image | ✓ | Balanced |
| fal-ai/kling-video/v2.6/pro/image-to-video | Kling 2.6 Pro I2V | Fal.ai | 5s, 10s | Image | ✓ | Professional |
| fal-ai/kling-video/o1/image-to-video | Kling O1 I2V | Fal.ai | 5s, 10s | Image | ✓ | Reasoning-based |
| fal-ai/minimax-video/image-to-video | MiniMax I2V | Fal.ai | 6s, 10s | Image | ✓ | Quick, expressive |
| fal-ai/luma-dream-machine/image-to-video | Luma I2V | Fal.ai | 5s | Image | ✓ | Ethereal |
| fal-ai/runway-gen3/turbo/image-to-video | Runway Gen3 Turbo | Fal.ai | 5s, 10s | Image | ✗ | Fast cinematic |
| fal-ai/vidu/q2/reference-to-video | Vidu Q2 Reference | Fal.ai | 4s | Multi-refs (up to 7) | ✗ | Character consistency |

### Avatar/Character Animation Models

| Model ID | Name | Provider | Requires | Notes |
|----------|------|----------|----------|-------|
| fal-ai/one-to-all-animation/14b | One-To-All Animation | Fal.ai | Image + Motion Video | Pose-driven |
| fal-ai/wan-video-2.2-animate-move | Wan Animate Move | Fal.ai | Image + Motion Video | Motion transfer |
| fal-ai/kling-video/ai-avatar/v2/pro | Kling Avatar Pro | Fal.ai | Face + Audio | Talking head, lipsync |
| fal-ai/kling-video/ai-avatar/v2/standard | Kling Avatar | Fal.ai | Face + Audio | Fast talking head |
| fal-ai/creatify/aurora | Creatify Aurora | Fal.ai | Image + Audio | Ultra-realistic |

### Video Editing Models

| Model ID | Name | Provider | Requires | Notes |
|----------|------|----------|----------|-------|
| fal-ai/wan-vace-14b/inpainting | Wan VACE Inpaint | Fal.ai | Video + Mask | Region editing |
| fal-ai/kling-video/o1/video-to-video/edit | Kling O1 V2V | Fal.ai | Source Video | AI transformation |

---

## Feature Support Matrix

### Backend Parameter Support (from FalAIAdapter.ts)

| Feature | Supported Models | Backend Field | Notes |
|---------|-----------------|---------------|-------|
| **LoRA** | Flux Dev/Schnell/Pro, SD3.5 | `loras[]` | Auto-uploads local .safetensors |
| **Negative Prompt** | Most Fal models | `negative_prompt` | Checked per-model |
| **Reference Images** | Flux (IP-Adapter), Kling O1 | `image_prompts[]`, `image_urls[]` | Strength via `weight` |
| **Element References** | Via UI `@element` | Resolved to URLs | Frontend-processed |
| **Seed** | All image models | `seed` | For reproducibility |
| **Guidance Scale** | Flux, IP-Adapter | `guidance_scale` | Typically 2.5-7.5 |
| **Steps** | Flux (28 default) | `num_inference_steps` | Model-specific |
| **Aspect Ratio** | All | `image_size` | Mapped to preset sizes |
| **Count** | All | `num_images` | Multiple outputs |
| **Strength (I2V)** | Kling, Vidu, MiniMax, Luma, Runway | `strength` | Via `referenceCreativity` |

### UI Control Visibility (from GeneratePage.tsx)

| Control | Always Visible | Conditional | Trigger |
|---------|---------------|-------------|---------|
| Prompt | ✓ | - | - |
| Model Selector | ✓ | - | - |
| Duration | - | ✓ | Video models |
| Quantity | ✓ | - | - |
| Audio Input | - | ✓ | Avatar models |
| Element Picker | - | ✓ | Type `@` in prompt |
| LoRA Manager | ✓ | - | Separate panel |
| Style Presets | ✓ | - | 24 presets |
| Negative Prompt | ✓ (in PromptBuilder) | - | - |

---

## Known Issues

### Critical
- None identified during code analysis

### Major
1. **Flux 2 Max Negative Prompt**: Code comment indicates may not be supported, but UI doesn't reflect this

### Minor
1. **TypeScript Error Fixed**: `FalAIAdapter.ts:1083` - `model` possibly undefined (fixed during audit)
2. **Banana Provider**: Missing API key (BANANA_API_KEY not set)

---

## Test Recommendations

### Priority Image Models to Test
1. **fal-ai/flux/dev** - Primary model, LoRA + refs
2. **fal-ai/flux/schnell** - Fast iteration
3. **fal-ai/flux-2-max** - Latest flagship
4. **fal-ai/kling-image/o1** - Multi-reference

### Priority Video Models to Test
1. **fal-ai/wan-25-preview/text-to-video** - Latest Wan
2. **fal-ai/kling-video/v2.6/pro/text-to-video** - Professional
3. **fal-ai/veo3.1** - Google premium
4. **fal-ai/kling-video/o1/image-to-video** - Reasoning-based

### Test Cases to Execute
1. Baseline generation (prompt only)
2. With negative prompt
3. With LoRA (where supported)
4. With reference image(s)
5. With @element reference
6. Invalid input validation

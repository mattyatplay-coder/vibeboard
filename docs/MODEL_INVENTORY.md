# VibeBoard Model Inventory

> Complete list of AI models available in VibeBoard, organized by license type and capability.
> Last Updated: January 3, 2026

---

## Summary

| Category               | Count |
| ---------------------- | ----- |
| **Total Models**       | 137   |
| **Open Source**        | ~40   |
| **Proprietary/Closed** | ~97   |
| **Image Models**       | 72    |
| **Video Models**       | 57    |
| **Avatar/Lip-Sync**    | 8     |

---

## Open Source Models (Open Weights)

Models with publicly available weights that can be self-hosted or run locally.

### Image Generation

| Model                      | Provider(s)                       | License                     | Best For              |
| -------------------------- | --------------------------------- | --------------------------- | --------------------- |
| FLUX.1 Dev                 | Fal, Replicate, Together, ComfyUI | Apache 2.0 (non-commercial) | Photorealism          |
| FLUX.1 Schnell             | Fal, Replicate, Together, ComfyUI | Apache 2.0                  | Fast Iteration        |
| Stable Diffusion XL        | Replicate, Civitai, ComfyUI       | CreativeML Open RAIL-M      | Accurate Colors       |
| Stable Diffusion 3.5 Large | Fal, Replicate                    | Community License           | Fine Details          |
| HiDream I1                 | Fal, Together                     | Open Source                 | Detail & Clarity      |
| DreamShaper                | Together                          | Community Model             | Artistic & Uncensored |
| Juggernaut Pro/Lightning   | Together                          | Community Fine-tune         | Photorealism          |
| Realistic Vision           | Civitai                           | Community Model             | Uncensored Realism    |
| Pony Diffusion             | Civitai                           | Community Model             | Anime & Stylized      |
| IP-Adapter Face ID         | Fal                               | Open Source                 | Face Consistency      |
| FLUX Redux Dev             | Fal, Replicate                    | Open Source                 | Variations            |

### Video Generation

| Model         | Provider(s)                     | License                | Best For         |
| ------------- | ------------------------------- | ---------------------- | ---------------- |
| Hunyuan Video | Fal, ComfyUI                    | Open Weights (Tencent) | Open Source      |
| LTX Video     | Fal, ComfyUI                    | Open Source            | Quick Iteration  |
| Wan 2.1/2.2   | Fal, Replicate, Civitai, RunPod | Open Weights (Alibaba) | Cinematic Motion |

### Self-Hosted (RunPod) - Zero Marginal Cost

| Model                 | Type           | Best For             |
| --------------------- | -------------- | -------------------- |
| Wan 2.1 (14B) T2V     | Text-to-Video  | High Quality Video   |
| Wan 2.1 (14B) I2V     | Image-to-Video | Image Animation      |
| Stable Video Infinity | Image-to-Video | Long-Form Continuity |
| InfCam                | Image-to-Video | Virtual Reshoots     |
| Spatia                | Text-to-Video  | Virtual Sets         |
| FlashPortrait         | Avatar         | Dialogue             |
| Qwen Edit             | Image Editing  | Directing Actors     |

---

## Proprietary / Closed Source Models

Commercial models accessed via API. Weights not publicly available.

### Black Forest Labs (FLUX Commercial)

| Model              | Provider(s)    | Best For                    |
| ------------------ | -------------- | --------------------------- |
| FLUX Pro           | Fal, Replicate | Prompt Adherence            |
| FLUX 1.1 Pro       | Replicate      | Prompt Adherence            |
| FLUX 1.1 Pro Ultra | Fal, Replicate | High Resolution (4MP)       |
| FLUX.2 Pro         | Fal, Replicate | Character Consistency       |
| FLUX.2 Flex        | Fal, Replicate | Multi-Reference (10 images) |
| FLUX Kontext Dev   | Fal            | Style Transfer              |
| FLUX Kontext Pro   | Fal, Replicate | Scene Transfer              |
| FLUX Kontext Max   | Fal, Replicate | Premium Editing             |
| FLUX Fill Pro      | Fal, Replicate | Inpainting                  |
| FLUX Depth Pro     | Fal, Replicate | Depth Control               |
| FLUX Canny Pro     | Fal, Replicate | Edge Control                |

### Google

| Model    | Provider(s)            | Type  | Best For         |
| -------- | ---------------------- | ----- | ---------------- |
| Imagen 3 | Fal, Replicate, Google | Image | Photorealism     |
| Imagen 4 | Fal, Replicate, Google | Image | Latest Quality   |
| Veo 2    | Google                 | Video | Realistic Motion |
| Veo 3    | Fal, Google            | Video | Native Audio     |

### OpenAI

| Model         | Type  | Best For             |
| ------------- | ----- | -------------------- |
| DALL-E 3      | Image | Creative Concepts    |
| GPT Image 1   | Image | Prompt Understanding |
| GPT Image 1.5 | Image | Complex Prompts      |
| Sora          | Video | Legacy Support       |
| Sora 2        | Video | Realistic Motion     |
| Sora 2 Pro    | Video | Cinematic            |

### Kuaishou (Kling)

| Model                    | Provider | Type   | Best For              |
| ------------------------ | -------- | ------ | --------------------- |
| Kling 2.1 Master         | Fal      | Video  | Motion Fluidity       |
| Kling 2.1 Standard I2V   | Fal      | Video  | Balanced              |
| Kling 2.1 Master I2V     | Fal      | Video  | Premium Fluidity      |
| Kling 2.6 Pro            | Fal      | Video  | Native Audio          |
| Kling 2.6 Pro I2V        | Fal      | Video  | Audio + Animation     |
| Kling O1 Image           | Fal      | Image  | Character Consistency |
| Kling O1 I2V             | Fal      | Video  | State-of-Art          |
| Kling O1 Video Edit      | Fal      | Video  | Video Style Transfer  |
| Kling AI Avatar Pro      | Fal      | Avatar | Premium Lip Sync      |
| Kling AI Avatar Standard | Fal      | Avatar | Fast Lip Sync         |

### Luma AI

| Model                  | Provider  | Type  | Best For         |
| ---------------------- | --------- | ----- | ---------------- |
| Luma Dream Machine     | Fal       | Video | Dreamlike Motion |
| Luma Dream Machine I2V | Fal       | Video | Dreamlike        |
| Luma Ray 2             | Fal       | Video | Realistic Motion |
| Luma Ray 2 I2V         | Fal       | Video | Camera Control   |
| Luma Photon            | Replicate | Image | Photorealism     |

### Alibaba (Commercial Variants)

| Model       | Provider | Type  | Best For         |
| ----------- | -------- | ----- | ---------------- |
| Wan 2.5     | Fal      | Video | Motion Coherence |
| Wan 2.5 I2V | Fal      | Video | Latest Quality   |
| Wan 2.6     | Fal      | Video | Audio Sync       |
| Wan 2.6 I2V | Fal      | Video | 1080p Animation  |
| Wan 2.6 R2V | Fal      | Video | Video References |
| Wan Pro     | Fal      | Video | Pro Quality      |
| Wan Pro I2V | Fal      | Video | Pro Animation    |

### Other Proprietary

| Model                   | Provider       | Type   | Best For              |
| ----------------------- | -------------- | ------ | --------------------- |
| MiniMax Hailuo          | Fal            | Video  | Physics & Camera      |
| MiniMax Hailuo I2V      | Fal            | Video  | Lively Motion         |
| Vidu Q1                 | Fal            | Video  | Sound Effects         |
| Vidu Q2 Multi-Reference | Fal            | Video  | 7-Ref Consistency     |
| Vidu I2V                | Fal            | Video  | Sound Generation      |
| Ideogram V2             | Fal            | Image  | Typography            |
| Ideogram V3             | Fal, Replicate | Image  | Typography & Signs    |
| Ideogram V3 Character   | Fal            | Image  | Character Sheets      |
| Recraft V3              | Fal, Replicate | Image  | Design & Illustration |
| Runway Gen3 Turbo I2V   | Fal            | Video  | Cinematic Fast        |
| Pixverse V4.5           | Fal            | Video  | Motion Quality        |
| Pixverse V4.5 I2V       | Fal            | Video  | Quality Motion        |
| Magi                    | Fal            | Video  | Artistic Style        |
| Creatify Aurora         | Fal            | Avatar | Natural Expressions   |
| Janus                   | Fal            | Image  | Multimodal            |
| NVIDIA Sana             | Replicate      | Image  | Artistic Range        |
| SeedReam 4              | Replicate      | Image  | Style Control         |
| Qwen Image              | Replicate      | Image  | Foundation Model      |
| Qwen Image Edit Plus    | Fal            | Image  | Object Removal        |
| Consistent Character    | Replicate      | Image  | Multi-Pose            |

---

## Models by Provider

### Fal.ai (75 models)

Primary cloud provider. Hosts both open-source and proprietary models.

**Capabilities:**

- Text-to-Image (24 models)
- Image Editing (15 models)
- Text-to-Video (16 models)
- Image-to-Video (17 models)
- Avatar/Lip-Sync (5 models)
- Video Editing (2 models)

### Replicate (30 models)

Alternative cloud provider with strong FLUX and video support.

**Capabilities:**

- Text-to-Image (22 models)
- Image Editing (7 models)
- Video (3 models)

### Together AI (10 models)

Budget-friendly provider with open-source models only.

| Model                | Cost    | Notes              |
| -------------------- | ------- | ------------------ |
| FLUX Schnell         | $0.003  | 4 steps only       |
| FLUX Dev             | $0.025  | High quality       |
| DreamShaper          | $0.0006 | No content filters |
| HiDream Full         | $0.009  | High resolution    |
| HiDream Dev          | $0.0045 | Balanced           |
| HiDream Fast         | $0.0032 | Fast variant       |
| Juggernaut Pro       | $0.0049 | Photorealistic     |
| Juggernaut Lightning | $0.0017 | Fast variant       |

### Civitai (6 models)

Community models with LoRA ecosystem support.

- SDXL 1.0
- Pony Diffusion
- Realistic Vision
- FLUX.1 D
- Wan Video T2V
- Wan Video I2V

### ComfyUI / Local (5 models)

Self-hosted models with zero API cost.

- Stable Diffusion XL
- FLUX.1 Dev
- LTX Video
- Wan 2.2
- Hunyuan Video

### RunPod Self-Hosted (8 models)

Zero marginal cost after GPU time.

- Wan 2.1 (14B) T2V
- Wan 2.1 (14B) I2V
- Stable Video Infinity
- InfCam
- Spatia
- FlashPortrait
- Qwen Edit

### OpenAI (5 models)

Premium proprietary models.

- DALL-E 3
- GPT Image 1
- Sora (Legacy)
- Sora 2
- Sora 2 Pro

### Google Direct (4 models)

Direct API access to Google models.

- Imagen 3
- Imagen 4
- Veo 2
- Veo 3

---

## Models by Capability

### Text-to-Image (42 models)

Generate images from text prompts.

**Top Picks:**

- **Quality:** FLUX.2 Pro, Imagen 4, Ideogram V3
- **Speed:** FLUX Schnell, Together DreamShaper
- **Typography:** Ideogram V3, Recraft V3
- **Open Source:** FLUX Dev, Stable Diffusion 3.5, HiDream

### Image Editing (17 models)

Inpainting, outpainting, style transfer, upscaling.

**Top Picks:**

- **Inpainting:** FLUX Fill Pro, FLUX Dev Inpainting
- **Style Transfer:** FLUX Kontext Pro/Max
- **Upscaling:** Creative Upscaler, Clarity Upscaler
- **Control:** FLUX Depth Pro, FLUX Canny Pro

### Text-to-Video (19 models)

Generate video from text prompts.

**Top Picks:**

- **Quality:** Veo 3, Kling 2.1 Master, Sora 2 Pro
- **Speed:** LTX Video, Wan 2.1 (1.3B)
- **Audio:** Veo 3, Kling 2.6 Pro, Vidu Q1
- **Open Source:** Hunyuan Video, LTX Video

### Image-to-Video (26 models)

Animate still images.

**Top Picks:**

- **Quality:** Kling 2.1 Master I2V, Wan Pro I2V
- **Speed:** LTX Video I2V
- **Long-Form:** Stable Video Infinity (RunPod)
- **Open Source:** Hunyuan I2V, Wan 2.2 I2V

### Avatar / Lip-Sync (8 models)

Talking heads and character animation.

**Top Picks:**

- **Premium:** Kling AI Avatar Pro
- **Fast:** Kling AI Avatar Standard
- **Self-Hosted:** FlashPortrait (RunPod)
- **Expressions:** Creatify Aurora

### Video Editing (2 models)

Edit existing videos.

- Wan VACE Inpainting
- Kling O1 Video Edit

---

## License Reference

| License                | Commercial Use | Self-Host | Models                         |
| ---------------------- | -------------- | --------- | ------------------------------ |
| Apache 2.0             | Yes            | Yes       | FLUX Schnell                   |
| Apache 2.0 (NC)        | No             | Yes       | FLUX Dev                       |
| CreativeML Open RAIL-M | Limited        | Yes       | SDXL, SD 1.5                   |
| Open Weights           | Varies         | Yes       | Wan, Hunyuan, LTX              |
| Proprietary API        | Via API only   | No        | Imagen, Veo, Sora, Kling, etc. |

---

## Quick Selection Guide

### By Budget

| Budget               | Recommended Models                                     |
| -------------------- | ------------------------------------------------------ |
| **Free (Self-Host)** | ComfyUI: FLUX Dev, SDXL, Wan 2.2                       |
| **Ultra-Cheap**      | Together: DreamShaper ($0.0006), FLUX Schnell ($0.003) |
| **Budget**           | Fal: FLUX Schnell, LTX Video, Wan 2.1                  |
| **Standard**         | Fal: FLUX Pro, Wan 2.5, Kling Standard                 |
| **Premium**          | Fal: Veo 3, Kling Master, FLUX Kontext Max             |

### By Use Case

| Use Case                  | Recommended Models                                          |
| ------------------------- | ----------------------------------------------------------- |
| **Storyboards**           | FLUX Pro, Ideogram V3, Recraft V3                           |
| **Product Shots**         | Imagen 4, FLUX 1.1 Pro Ultra                                |
| **Character Consistency** | FLUX.2 Pro (8 refs), Vidu Q2 (7 refs), Consistent Character |
| **Cinematic Video**       | Kling 2.1 Master, Veo 3, Sora 2 Pro                         |
| **Fast Iteration**        | FLUX Schnell, LTX Video, Together models                    |
| **Talking Heads**         | Kling AI Avatar, FlashPortrait, Creatify Aurora             |
| **Typography/Signs**      | Ideogram V3, Recraft V3                                     |
| **Uncensored**            | Together DreamShaper, Civitai Realistic Vision              |

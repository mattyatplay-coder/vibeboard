# Z.ai (Zhipu AI) Models Research for VibeBoard

## Executive Summary

Z.ai (Zhipu AI) is a leading Chinese AI company that has open-sourced several powerful models across video generation, speech synthesis, character animation, and GUI automation. Several of these models are **directly relevant to VibeBoard** and could significantly enhance its capabilities.

---

## Models Analysis

### 1. CogVideoX (Video Generation) ⭐ HIGH PRIORITY

**What it is:** State-of-the-art open-source text-to-video and image-to-video diffusion model.

**Available Versions:**
| Model | Resolution | Duration | FPS | Key Features |
|-------|-----------|----------|-----|--------------|
| CogVideoX-2B | 720×480 | 6 sec | 8 | Lightweight, runs on GTX 1080Ti |
| CogVideoX-5B | 720×480 | 6 sec | 8 | Higher quality, RTX 3060+ |
| CogVideoX-5B-I2V | 720×480 | 6 sec | 8 | Image-to-video support |
| **CogVideoX1.5-5B** | 1360×768 | 5-10 sec | 16 | Latest, best quality |
| **CogVideoX1.5-5B-I2V** | Any (768-1360) | 5-10 sec | 16 | Flexible resolution I2V |

**API Availability:**
- ✅ **fal.ai** - Already supported by VibeBoard!
  - `fal-ai/cogvideox-5b` (Text-to-Video)
  - `fal-ai/cogvideox-5b/image-to-video` (Image-to-Video)
  - `fal-ai/cogvideox-5b/video-to-video` (Video-to-Video)
- ✅ **Replicate** - `thudm/cogvideox-i2v`
- ✅ **HuggingFace** - Self-hostable

**VRAM Requirements:**
- CogVideoX-2B: 4GB (FP16 with optimizations)
- CogVideoX-5B: 5GB (BF16 with optimizations)
- CogVideoX1.5-5B: 10GB (BF16)

**Recommendation:** 🟢 **ADD TO VIBEBOARD**
- Already available via fal.ai which VibeBoard supports
- Competitive with Kling and Hunyuan at lower cost
- Good for users wanting open-source alternatives

---

### 2. Kaleido (Multi-Subject Reference Video) ⭐ MEDIUM-HIGH PRIORITY

**What it is:** Subject-to-video (S2V) generation that maintains consistency across multiple reference images/characters in videos.

**Key Capabilities:**
- Generate videos with multiple consistent characters from reference images
- Superior subject preservation and background disentanglement
- Built on top of Wan2.1-T2V-14B architecture
- Outperforms previous S2V methods in consistency and fidelity

**Technical Details:**
- Uses Reference Rotary Positional Encoding (R-RoPE)
- Two-stage training: pre-training (2M pairs) + SFT (0.5M pairs)
- Open-sourced with model weights available

**API Availability:**
- ⚠️ Not yet on fal.ai or Replicate
- Available on HuggingFace for self-hosting

**Recommendation:** 🟡 **MONITOR FOR API AVAILABILITY**
- Perfect for VibeBoard's character consistency needs (IP-Adapter alternative)
- Would pair well with existing Cast/Character features
- Watch for fal.ai or Replicate deployment

---

### 3. SCAIL (Character Animation) ⭐ MEDIUM PRIORITY

**What it is:** Studio-grade character animation via in-context learning of 3D-consistent pose representations.

**Key Capabilities:**
- High-fidelity character animation
- Handles large motion variations
- Supports stylized characters
- Multi-character interactions
- Uses 3D-consistent pose representations

**Model Versions:**
- Preview 14B Model (512p, 5s videos)
- Official 1.3B/14B Models (improved stability, long video support)

**API Availability:**
- ⚠️ Only available via GitHub (self-hosted)
- Requires separate SCAIL-Pose repository for pose extraction

**Recommendation:** 🟡 **FUTURE CONSIDERATION**
- Could enable pose-driven video generation
- Useful for animating still characters
- Wait for easier deployment options

---

### 4. GLM-4-Voice (Speech Recognition & Generation) ⭐ MEDIUM PRIORITY

**What it is:** End-to-end speech large language model for voice conversations.

**Key Capabilities:**
- Real-time speech-to-text transcription
- Text-to-speech synthesis
- Speech-to-speech translation
- Emotion, tone, speed, and dialect control
- Chinese and English support
- Low-latency streaming (only 10 tokens needed to start synthesis)

**Architecture Components:**
- GLM-4-Voice-Tokenizer: Converts speech to discrete tokens (12.5 tokens/second)
- GLM-4-Voice-Decoder: Streaming speech synthesis
- GLM-4-Voice-9B: Core pre-trained model

**API Availability:**
- Available on HuggingFace
- Z.ai API access (China-focused)

**Recommendation:** 🟡 **FUTURE FEATURE**
- Could add voice narration to videos
- Enable voice-controlled generation
- Useful for adding dialogue to storyboard shots

---

### 5. GLM-TTS (Text-to-Speech) ⭐ MEDIUM PRIORITY

**What it is:** Industrial-grade, zero-shot, emotionally expressive TTS system.

**Key Capabilities:**
- Zero-shot voice cloning (no fine-tuning needed)
- Emotional expression control
- Dialect support
- 0.89 Character Error Rate (best open-source, competitive with commercial)
- Multi-language and dialect support

**Architecture:**
- Stage 1: LLM (Llama-based) converts text to speech tokens
- Stage 2: Flow Matching generates mel-spectrograms
- Final: Vocoder produces audio waveforms

**API Availability:**
- GitHub: https://github.com/zai-org/GLM-TTS
- HuggingFace: https://huggingface.co/zai-org/GLM-TTS

**Recommendation:** 🟡 **FUTURE FEATURE**
- Add audio/voice-over capability to VibeBoard
- Could integrate with storyboard for automated narration

---

### 6. CogAgent (GUI Automation) ⭐ LOW PRIORITY

**What it is:** Visual language model for GUI understanding and automation.

**Key Capabilities:**
- Predicts next GUI operation from screenshots
- Works across PC, mobile, and in-car devices
- Autonomous computer control

**Recommendation:** 🔵 **NOT DIRECTLY RELEVANT**
- Interesting for AI agent development
- Not directly applicable to video generation platform

---

## Implementation Recommendations

### Immediate Actions (High Priority)

#### 1. Add CogVideoX to VibeBoard
CogVideoX is already available on fal.ai. Add these models to `EngineSelectorV2.tsx`:

```typescript
// In fal provider models array:
{ id: 'fal-ai/cogvideox-5b', name: 'CogVideoX T2V', type: 'video' },
{ id: 'fal-ai/cogvideox-5b/image-to-video', name: 'CogVideoX I2V', type: 'video' },
{ id: 'fal-ai/cogvideox-5b/video-to-video', name: 'CogVideoX V2V', type: 'video' },
```

**Benefits:**
- Open-source alternative to proprietary models
- Good quality at lower cost
- 6-second videos at 720×480

### Near-Term Actions (Medium Priority)

#### 2. Monitor Kaleido for API Availability
- Would enable multi-character consistent video generation
- Perfect complement to existing IP-Adapter feature
- Set up alerts for fal.ai/Replicate deployment

#### 3. Consider Audio/Voice Features
- GLM-TTS could add voice-over capability
- GLM-4-Voice for voice-controlled generation
- Would enhance storyboard workflow

### Future Considerations

#### 4. ComfyUI Integration for Self-Hosted Models
- CogVideoX, Kaleido, SCAIL all work with ComfyUI
- VibeBoard already has ComfyUI adapter
- Could add as local/free options for users with powerful GPUs

---

## Cost Comparison

| Model | Provider | Cost | Quality | Speed |
|-------|----------|------|---------|-------|
| CogVideoX-5B | fal.ai | ~$0.03/video | Good | ~90s |
| Kling 2.6 | fal.ai | ~$0.08/video | Excellent | ~60s |
| Hunyuan | fal.ai | ~$0.05/video | Very Good | ~120s |
| Wan 2.5 | fal.ai | ~$0.04/video | Very Good | ~90s |

CogVideoX offers a good balance of quality and cost, especially for users wanting open-source options.

---

## Sources

- [Zhipu AI HuggingFace](https://huggingface.co/zai-org)
- [Z.ai GitHub](https://github.com/zai-org)
- [CogVideoX on fal.ai](https://fal.ai/models/fal-ai/cogvideox-5b/api)
- [CogVideoX GitHub](https://github.com/zai-org/CogVideo)
- [Kaleido Paper](https://arxiv.org/abs/2510.18573)
- [SCAIL GitHub](https://github.com/zai-org/SCAIL)
- [GLM-4-Voice](https://www.marktechpost.com/2024/10/25/zhipu-ai-releases-glm-4-voice-a-new-open-source-end-to-end-speech-large-language-model/)
- [GLM-TTS GitHub](https://github.com/zai-org/GLM-TTS)
- [CogAgent GitHub](https://github.com/zai-org/CogAgent)

---

*Research completed: December 2024*

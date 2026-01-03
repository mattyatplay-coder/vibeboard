/**
 * Model Pricing Data
 * Prices sourced from fal.ai/pricing and replicate.com/pricing (Dec 2025)
 *
 * Image models: price per image (at 1MP unless noted)
 * Video models: price per second of output
 * Local (comfy) models: $0 (free)
 */

export interface ModelPrice {
  perImage?: number; // $ per image
  perSecond?: number; // $ per second of video
  perMegapixel?: number; // $ per megapixel (some models)
  basePrice?: number; // Base price for video (e.g., first 5s)
  free?: boolean; // Local/free models
}

// Pricing by model ID
export const MODEL_PRICING: Record<string, ModelPrice> = {
  // === FAL.AI IMAGE MODELS ===
  'fal-ai/flux/dev': { perImage: 0.025 },
  'fal-ai/flux/schnell': { perImage: 0.003 },
  'fal-ai/flux-pro': { perImage: 0.05 },
  'fal-ai/flux-pro/v1.1-ultra': { perImage: 0.06 },
  'fal-ai/flux-2-pro': { perImage: 0.055 },
  'fal-ai/flux-2-flex': { perImage: 0.055 },
  'fal-ai/gpt-image-1.5/edit': { perImage: 0.08 },
  'fal-ai/recraft-v3': { perImage: 0.04 },
  'fal-ai/ideogram/v2': { perImage: 0.06 },
  'fal-ai/ideogram/v3': { perImage: 0.08 },
  'fal-ai/ideogram/character': { perImage: 0.1 },
  'fal-ai/flux-kontext/dev': { perImage: 0.025 },
  'fal-ai/flux-pro/kontext': { perImage: 0.04 },
  'fal-ai/flux-kontext-max': { perImage: 0.08 },
  'fal-ai/ip-adapter-face-id': { perImage: 0.02 },
  'fal-ai/stable-diffusion-v35-large': { perImage: 0.035 },
  'fal-ai/imagen3': { perImage: 0.03 },
  'fal-ai/imagen4/preview': { perImage: 0.04 },
  'fal-ai/nano-banana': { perImage: 0.02 },
  'fal-ai/nano-banana-pro': { perImage: 0.04 },
  'fal-ai/nano-banana/edit': { perImage: 0.025 },
  'fal-ai/nano-banana-pro/edit': { perImage: 0.05 },
  'fal-ai/hidream-i1-full': { perImage: 0.04 },
  'fal-ai/janus': { perImage: 0.03 },
  'fal-ai/flux-2-flex/edit': { perImage: 0.055 },
  'fal-ai/flux/dev/image-to-image': { perImage: 0.025 },
  'fal-ai/flux/dev/inpainting': { perImage: 0.025 },
  'fal-ai/flux-fill-pro': { perImage: 0.05 },
  'fal-ai/flux-depth-pro': { perImage: 0.05 },
  'fal-ai/flux-canny-pro': { perImage: 0.05 },
  'fal-ai/flux-redux-dev': { perImage: 0.025 },
  'fal-ai/kling-image/o1': { perImage: 0.08 },
  'fal-ai/creative-upscaler': { perMegapixel: 0.02 },
  'fal-ai/clarity-upscaler': { perMegapixel: 0.015 },
  // === FAL.AI QWEN MODELS ===
  'fal-ai/qwen-image': { perMegapixel: 0.02 },
  'fal-ai/qwen-image-2512': { perMegapixel: 0.02 },
  'fal-ai/qwen-image/image-to-image': { perMegapixel: 0.02 },
  'fal-ai/qwen-image-edit': { perMegapixel: 0.03 },
  'fal-ai/qwen-image-edit-2509': { perMegapixel: 0.03 },
  'fal-ai/qwen-image-edit-2511': { perMegapixel: 0.03 },
  'fal-ai/qwen-image-layered': { perImage: 0.05 },

  // === FAL.AI VIDEO MODELS (per second) ===
  'fal-ai/wan-t2v': { perSecond: 0.05 },
  'fal-ai/wan-25-preview/text-to-video': { perSecond: 0.05 },
  'fal-ai/wan/v2.6/text-to-video': { perSecond: 0.06 },
  'fal-ai/wan-2.1-t2v-1.3b': { perSecond: 0.03 },
  'fal-ai/wan-pro/text-to-video': { perSecond: 0.07 },
  'fal-ai/ltx-video': { perSecond: 0.04 },
  'fal-ai/kling-video/v2.1/master/text-to-video': { perSecond: 0.1 },
  'fal-ai/kling-video/v2.6/pro/text-to-video': { perSecond: 0.12 },
  'fal-ai/vidu/q1/text-to-video': { perSecond: 0.08 },
  'fal-ai/vidu/q2/reference-to-video': { perSecond: 0.1 },
  'fal-ai/hunyuan-video': { perSecond: 0.06 },
  'fal-ai/minimax-video': { perSecond: 0.08 },
  'fal-ai/luma-dream-machine': { perSecond: 0.06 },
  'fal-ai/luma-dream-machine/ray-2': { perSecond: 0.08 },
  'fal-ai/veo3': { perSecond: 0.4 },
  'fal-ai/pixverse/v4.5/text-to-video': { perSecond: 0.06 },
  'fal-ai/magi': { basePrice: 0.8, perSecond: 0.2 },

  // === FAL.AI IMAGE-TO-VIDEO (per second) ===
  'fal-ai/wan/v2.2-a14b/image-to-video': { perSecond: 0.05 },
  'fal-ai/wan/v2.2-a14b/image-to-video/lora': { perSecond: 0.06 },
  'fal-ai/wan-25-preview/image-to-video': { perSecond: 0.05 },
  'fal-ai/wan/v2.6/image-to-video': { perSecond: 0.06 },
  'fal-ai/wan/v2.6/reference-to-video': { perSecond: 0.08 },
  'fal-ai/wan-2.1-i2v-14b': { perSecond: 0.05 },
  'fal-ai/wan-pro/image-to-video': { perSecond: 0.07 },
  'fal-ai/ltx-video/image-to-video': { perSecond: 0.04 },
  'fal-ai/ltx-video-13b-distilled/image-to-video': { perSecond: 0.05 },
  'fal-ai/kling-video/v2.1/standard/image-to-video': { perSecond: 0.07 },
  'fal-ai/kling-video/v2.1/master/image-to-video': { perSecond: 0.1 },
  'fal-ai/kling-video/v2.6/pro/image-to-video': { perSecond: 0.12 },
  'fal-ai/kling-video/o1/image-to-video': { perSecond: 0.15 },
  'fal-ai/minimax-video/image-to-video': { perSecond: 0.08 },
  'fal-ai/luma-dream-machine/image-to-video': { perSecond: 0.06 },
  'fal-ai/luma-dream-machine/ray-2/image-to-video': { perSecond: 0.08 },
  'fal-ai/runway-gen3/turbo/image-to-video': { perSecond: 0.1 },
  'fal-ai/hunyuan-video-image-to-video': { perSecond: 0.06 },
  'fal-ai/vidu/image-to-video': { perSecond: 0.08 },
  'fal-ai/pixverse/v4.5/image-to-video': { perSecond: 0.06 },

  // === FAL.AI AVATAR/LIP SYNC ===
  'fal-ai/one-to-all-animation/14b': { perSecond: 0.08 },
  'fal-ai/wan-video-2.2-animate-move': { perSecond: 0.06 },
  'fal-ai/kling-video/ai-avatar/v2/pro': { perSecond: 0.12 },
  'fal-ai/kling-video/ai-avatar/v2/standard': { perSecond: 0.08 },
  'fal-ai/creatify/aurora': { perSecond: 0.1 },

  // === FAL.AI VIDEO EDITING ===
  'fal-ai/wan-vace-14b/inpainting': { perSecond: 0.08 },
  'fal-ai/kling-video/o1/video-to-video/edit': { perSecond: 0.15 },

  // === REPLICATE IMAGE MODELS ===
  'black-forest-labs/flux-2-pro': { perImage: 0.055 },
  'black-forest-labs/flux-2-flex': { perImage: 0.055 },
  'black-forest-labs/flux-2-dev': { perImage: 0.025 },
  'black-forest-labs/flux-1.1-pro-ultra': { perImage: 0.06 },
  'black-forest-labs/flux-1.1-pro': { perImage: 0.04 },
  'black-forest-labs/flux-dev': { perImage: 0.025 },
  'black-forest-labs/flux-schnell': { perImage: 0.003 },
  'black-forest-labs/flux-fill-pro': { perImage: 0.05 },
  'black-forest-labs/flux-depth-pro': { perImage: 0.05 },
  'black-forest-labs/flux-canny-pro': { perImage: 0.05 },
  'black-forest-labs/flux-kontext-max': { perImage: 0.08 },
  'black-forest-labs/flux-kontext-pro': { perImage: 0.04 },
  'black-forest-labs/flux-redux-dev': { perImage: 0.025 },
  'stability-ai/sdxl': { perImage: 0.002 },
  'stability-ai/stable-diffusion-3.5-large': { perImage: 0.035 },
  'google/imagen-4': { perImage: 0.04 },
  'google/imagen-4-fast': { perImage: 0.02 },
  'google/imagen-3': { perImage: 0.03 },
  'ideogram-ai/ideogram-v3-turbo': { perImage: 0.03 },
  'recraft-ai/recraft-v3': { perImage: 0.04 },
  'luma/photon': { perImage: 0.03 },
  'nvidia/sana': { perImage: 0.02 },
  'bytedance/seedream-4': { perImage: 0.03 },
  'qwen/qwen-image': { perImage: 0.02 },
  'fofr/consistent-character': { perImage: 0.05 },

  // === REPLICATE VIDEO ===
  'wan-2.5-t2v': { perSecond: 0.05 },
  'wan-2.5-i2v': { perSecond: 0.05 },

  // === GOOGLE DIRECT ===
  'imagen-3': { perImage: 0.03 },
  'imagen-4': { perImage: 0.04 },
  'veo-2': { perSecond: 0.25 },
  'veo-3': { perSecond: 0.4 },

  // === OPENAI ===
  'dall-e-3': { perImage: 0.04 },
  'gpt-image-1': { perImage: 0.05 },
  'sora-2-pro': { perSecond: 0.5 },
  'sora-2': { perSecond: 0.3 },
  sora: { perSecond: 0.2 },

  // === COMFYUI (LOCAL - FREE) ===
  sdxl: { free: true },
  'flux-dev': { free: true },
  'ltx-video': { free: true },
  'wan-2.2': { free: true },
  'hunyuan-video': { free: true },

  // === RUNPOD SELF-HOSTED (FREE - Just GPU compute costs) ===
  'runpod/stable-video-infinity': { free: true }, // SVI - Long-form continuity

  // === TOGETHER AI ===
  'together/flux-schnell': { perImage: 0.003 },
  'together/flux-dev': { perImage: 0.025 },
  'together/dreamshaper': { perImage: 0.0006 },
  'together/hidream-full': { perImage: 0.009 },
  'together/hidream-dev': { perImage: 0.0045 },
  'together/hidream-fast': { perImage: 0.0032 },
  'together/juggernaut-pro': { perImage: 0.0049 },
  'together/juggernaut-lightning': { perImage: 0.0017 },

  // === CIVITAI ===
  'civitai/sdxl': { perImage: 0.02 },
  'civitai/pony': { perImage: 0.02 },
  'civitai/realistic-vision': { perImage: 0.01 },
  'civitai/flux-d': { perImage: 0.025 },
  'civitai/wan-t2v': { perSecond: 0.05 },
  'civitai/wan-i2v': { perSecond: 0.05 },
};

/**
 * Calculate the cost of a generation
 */
export function calculateGenerationCost(
  modelId: string,
  options: {
    quantity?: number; // Number of images
    durationSeconds?: number; // Video duration in seconds
    megapixels?: number; // For upscalers
  } = {}
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;
  if (pricing.free) return 0;

  const { quantity = 1, durationSeconds = 5, megapixels = 1 } = options;

  // Image pricing
  if (pricing.perImage) {
    return pricing.perImage * quantity;
  }

  // Video pricing (per second)
  if (pricing.perSecond) {
    const baseCost = pricing.basePrice || 0;
    return baseCost + pricing.perSecond * durationSeconds;
  }

  // Megapixel pricing
  if (pricing.perMegapixel) {
    return pricing.perMegapixel * megapixels * quantity;
  }

  return 0;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Get human-readable price string for a model
 */
export function getModelPriceString(modelId: string): string {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 'Unknown';
  if (pricing.free) return 'Free (Local)';
  if (pricing.perImage) return `${formatCost(pricing.perImage)}/image`;
  if (pricing.perSecond) return `${formatCost(pricing.perSecond)}/sec`;
  if (pricing.perMegapixel) return `${formatCost(pricing.perMegapixel)}/MP`;
  return 'Unknown';
}

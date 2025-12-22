/**
 * Model Constraints Registry
 * Defines limitations and requirements for each generation model
 */

export interface ModelConstraints {
  supportsLoRA: boolean;
  maxLoRAs?: number;
  supportsIPAdapter: boolean;
  maxReferences?: number; // Max reference images (for character/pose)
  minReferences?: number;
  supportsNegativePrompt: boolean;
  supportsCFG: boolean; // CFG/Guidance scale
  supportsSeed: boolean;
  supportsSteps: boolean;
  maxPromptLength?: number;
  nsfwFiltered: boolean; // Has strict NSFW filter
  nsfwStrength?: 'strict' | 'moderate' | 'permissive';
  supportedAspectRatios?: string[];
  notes?: string[]; // Special notes about the model
}

// Default constraints for unknown models
const DEFAULT_CONSTRAINTS: ModelConstraints = {
  supportsLoRA: false,
  supportsIPAdapter: false,
  supportsNegativePrompt: true,
  supportsCFG: true,
  supportsSeed: true,
  supportsSteps: true,
  nsfwFiltered: true,
  nsfwStrength: 'moderate',
};

/**
 * Model-specific constraints
 * Key format: model ID (e.g., 'fal-ai/flux/dev')
 */
export const MODEL_CONSTRAINTS: Record<string, Partial<ModelConstraints>> = {
  // === FAL.AI FLUX MODELS ===
  'fal-ai/flux/dev': {
    supportsLoRA: true,
    maxLoRAs: 4,
    supportsIPAdapter: true,
    maxReferences: 4,
    supportsNegativePrompt: false, // Flux doesn't use negative prompts traditionally
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: [
      'Flux uses prompt weighting instead of negative prompts',
      'Best with detailed, descriptive prompts',
    ],
  },
  'fal-ai/flux/schnell': {
    supportsLoRA: true,
    maxLoRAs: 2, // Fewer for speed
    supportsIPAdapter: true,
    maxReferences: 2,
    supportsNegativePrompt: false,
    supportsSteps: false, // Fixed steps
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Fixed 4 steps, cannot be changed', 'Faster but less detailed'],
  },
  'fal-ai/flux-pro': {
    supportsLoRA: false, // Pro doesn't support LoRAs
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Commercial license', 'No LoRA support', 'Higher quality base model'],
  },
  'fal-ai/flux-pro/v1.1-ultra': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', '9:21'],
    notes: ['4K resolution output', 'No LoRA/IP-Adapter support', 'Commercial license'],
  },
  'fal-ai/flux-2-max': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Highest quality Flux v2', 'Stricter content filtering'],
  },
  'fal-ai/flux-kontext/dev': {
    supportsLoRA: false,
    supportsIPAdapter: false, // Built-in character consistency
    maxReferences: 1, // Single reference for character
    minReferences: 1,
    nsfwFiltered: false,
    notes: ['Requires exactly 1 reference image', 'Built-in character consistency'],
  },
  'fal-ai/flux-kontext/pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Premium character consistency', 'Requires exactly 1 reference'],
  },

  // === GOOGLE IMAGEN ===
  'fal-ai/imagen3': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    supportsCFG: false, // No guidance scale
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Very strict content filter', 'No LoRA/IP-Adapter', 'Photorealistic style'],
  },
  'fal-ai/imagen4/preview': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    supportsCFG: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Strictest content filter', 'Preview version - may change'],
  },

  // === STABLE DIFFUSION ===
  'fal-ai/stable-diffusion-v35-large': {
    supportsLoRA: true,
    maxLoRAs: 5,
    supportsIPAdapter: true,
    maxReferences: 4,
    supportsNegativePrompt: true,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Full LoRA support', 'Supports negative prompts', 'Classic SD workflow'],
  },

  // === RECRAFT / IDEOGRAM ===
  'fal-ai/recraft-v3': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Best for vector art, logos, icons', 'No LoRA support'],
  },
  'fal-ai/ideogram/v2': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: true,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Excellent text rendering', 'No LoRA support'],
  },

  // === KLING IMAGE ===
  'fal-ai/kling-image/o1': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 5, // Multi-reference editor
    minReferences: 0,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Multi-reference support', 'Good for complex compositions'],
  },

  // === VIDEO MODELS ===
  'fal-ai/wan-t2v': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Text-to-video only', 'Cinematic motion'],
  },
  'fal-ai/wan/v2.2-a14b/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1, // Single source image
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Requires exactly 1 source image'],
  },
  'fal-ai/wan/v2.2-a14b/image-to-video/lora': {
    supportsLoRA: true,
    maxLoRAs: 1, // Limited for video
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    notes: ['Supports 1 LoRA for character style', 'Requires source image'],
  },
  'fal-ai/vidu/q2/reference-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 7, // Up to 7 character refs
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Supports up to 7 character references', 'Best for multi-character scenes'],
  },
  'fal-ai/kling-video/v2.6/pro/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['High quality but strict filter', 'No reference images for T2V'],
  },
  'fal-ai/kling-video/v2.6/pro/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Strict content filter', 'Single source image required'],
  },
  'fal-ai/luma-dream-machine': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Very strict NSFW filter', 'Dreamlike/ethereal style'],
  },

  // === WAN 2.6 MODELS ===
  'fal-ai/wan/v2.6/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Multi-shot video generation', 'Native audio sync', '5-15s duration', '1080p support'],
  },
  'fal-ai/wan/v2.6/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Multi-shot with source image', 'Native audio sync', '5-15s duration', '1080p support'],
  },
  'fal-ai/wan/v2.6/reference-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 3, // Up to 3 reference videos
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: [
      'Use @Video1, @Video2, @Video3 in prompts to reference uploaded videos',
      'Supports 1-3 reference videos for character consistency',
      'Native audio sync',
      '5-15s duration',
      '1080p support',
    ],
  },

  // === REPLICATE MODELS ===
  'fofr/consistent-character': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Requires 1 face reference', 'Best for character turnarounds'],
  },
  'black-forest-labs/flux-dev': {
    supportsLoRA: true,
    maxLoRAs: 4,
    supportsIPAdapter: false, // Replicate version
    nsfwFiltered: false,
    notes: ['Replicate-hosted Flux', 'LoRA support may differ from Fal'],
  },

  // === OPENAI ===
  'dall-e-3': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    supportsCFG: false,
    supportsSeed: false,
    supportsSteps: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['No customization parameters', 'Prompt rewriting enabled', 'Strict content policy'],
  },
  'sora-2-pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Premium video generation', 'Strict OpenAI content policy'],
  },

  // === COMFY (Local) ===
  sdxl: {
    supportsLoRA: true,
    maxLoRAs: 10,
    supportsIPAdapter: true,
    maxReferences: 10,
    supportsNegativePrompt: true,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Full local control', 'Unlimited customization'],
  },
  'flux-dev': {
    supportsLoRA: true,
    maxLoRAs: 5,
    supportsIPAdapter: true,
    supportsNegativePrompt: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Local Flux with full LoRA support'],
  },

  // === ADDITIONAL FAL.AI MODELS ===
  'fal-ai/flux-2-pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 8,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Up to 8 reference images for character consistency'],
  },
  'fal-ai/flux-2-flex': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 10,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Up to 10 reference images for maximum control'],
  },
  'fal-ai/flux-pro/kontext': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Premium character consistency', 'Requires exactly 1 reference'],
  },
  'fal-ai/flux-kontext-max': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Premium text-based editing with typography support'],
  },
  'fal-ai/flux-fill-pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Inpainting and outpainting', 'Requires mask input'],
  },
  'fal-ai/flux-depth-pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Depth-guided generation', 'Requires source image for depth map'],
  },
  'fal-ai/flux-canny-pro': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Edge-guided generation using Canny detection'],
  },
  'fal-ai/flux-redux-dev': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Image variations', 'Requires source image'],
  },
  'fal-ai/ip-adapter-face-id': {
    supportsLoRA: false,
    supportsIPAdapter: true, // This IS the IP-Adapter
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Face identity preservation', 'Requires face reference image'],
  },
  'fal-ai/ideogram/v3': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: true,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Advanced typography', 'Best for text in images'],
  },
  'fal-ai/ideogram/character': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: true,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Character sheets and turnarounds', 'Best for reference poses'],
  },
  'fal-ai/hidream-i1-full': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['High-resolution generation', 'Exceptional detail'],
  },
  'fal-ai/janus': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Multimodal understanding', 'Creative generation'],
  },
  'fal-ai/gpt-image-1.5/edit': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Advanced prompt understanding', 'Supports editing'],
  },
  'fal-ai/creative-upscaler': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['4x upscaling with AI enhancement', 'Adds detail'],
  },
  'fal-ai/clarity-upscaler': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Sharp faithful upscaling', 'Preserves original'],
  },

  // === ADDITIONAL VIDEO MODELS ===
  'fal-ai/wan-25-preview/text-to-video': {
    supportsLoRA: false, // Wan 2.5 does NOT support LoRAs
    supportsIPAdapter: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Text-to-video only', 'No LoRA support', '5s or 10s duration'],
  },
  'fal-ai/wan-25-preview/image-to-video': {
    supportsLoRA: false, // Wan 2.5 does NOT support LoRAs
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['No LoRA support', 'Requires source image', '5s or 10s duration'],
  },
  'fal-ai/wan-pro/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Professional video quality', '5-15s duration'],
  },
  'fal-ai/wan-pro/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Professional animation quality', 'Requires source image'],
  },
  'fal-ai/ltx-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Fast video generation', '5s duration'],
  },
  'fal-ai/ltx-video/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Fast image animation', 'Requires source image'],
  },
  'fal-ai/kling-video/v2.1/master/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Premium quality', 'Strict content filter'],
  },
  'fal-ai/kling-video/v2.1/standard/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Balanced quality/speed', 'Requires source image'],
  },
  'fal-ai/kling-video/v2.1/master/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Premium image animation', 'Requires source image'],
  },
  'fal-ai/kling-video/o1/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['State-of-the-art animation', 'Requires source image'],
  },
  'fal-ai/vidu/q1/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Supports music and sound effects', '4s or 8s duration'],
  },
  'fal-ai/vidu/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Image animation with sound', 'Requires source image'],
  },
  'fal-ai/hunyuan-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Open-source model', 'High motion diversity', '4s duration'],
  },
  'fal-ai/hunyuan-video-image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Open-source image animation', 'Requires source image'],
  },
  'fal-ai/minimax-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Natural physics and motion', '6s duration'],
  },
  'fal-ai/minimax-video/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Natural animation', 'Requires source image'],
  },
  'fal-ai/luma-dream-machine/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Dreamlike animation', 'Requires source image', 'Strict filter'],
  },
  'fal-ai/luma-dream-machine/ray-2': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Realistic visuals', 'Natural camera control'],
  },
  'fal-ai/luma-dream-machine/ray-2/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Realistic image animation', 'Requires source image'],
  },
  'fal-ai/veo3': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Google DeepMind', 'Native audio support', 'Strict filter'],
  },
  'fal-ai/pixverse/v4.5/text-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['High quality motion', '5s or 10s duration'],
  },
  'fal-ai/pixverse/v4.5/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['High quality animation', 'Requires source image'],
  },
  'fal-ai/magi': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Artistic video generation', 'Creative styles'],
  },
  'fal-ai/runway-gen3/turbo/image-to-video': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Fast cinematic animation', 'Requires source image'],
  },
  'fal-ai/one-to-all-animation/14b': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 2, // Character image + motion video
    minReferences: 2,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Pose-driven animation', 'Requires character image + driving video'],
  },
  'fal-ai/wan-video-2.2-animate-move': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 2, // Character image + motion video
    minReferences: 2,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Motion transfer', 'Requires character image + driving video'],
  },
  'fal-ai/creatify/aurora': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 2, // Portrait + audio
    minReferences: 2,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Portrait animation', 'Requires portrait image + audio'],
  },
  'fal-ai/wan-vace-14b/inpainting': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 2, // Video + mask
    minReferences: 2,
    nsfwFiltered: false,
    nsfwStrength: 'permissive',
    notes: ['Video inpainting', 'Requires video + mask'],
  },
  'fal-ai/kling-video/o1/video-to-video/edit': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'strict',
    notes: ['Video editing and style transfer', 'Requires source video'],
  },
  'fal-ai/qwen-image/edit-plus': {
    supportsLoRA: false,
    supportsIPAdapter: false,
    maxReferences: 1,
    minReferences: 1,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
    notes: ['Advanced object removal', 'Requires source image'],
  },
};

/**
 * Get constraints for a model, with defaults for unknown models
 */
export function getModelConstraints(modelId: string): ModelConstraints {
  const specific = MODEL_CONSTRAINTS[modelId] || {};
  return { ...DEFAULT_CONSTRAINTS, ...specific };
}

/**
 * Check if a model supports a specific feature
 */
export function modelSupports(modelId: string, feature: keyof ModelConstraints): boolean {
  const constraints = getModelConstraints(modelId);
  return !!constraints[feature];
}

/**
 * Get human-readable constraint violations for a failed generation
 */
export function getConstraintViolations(
  modelId: string,
  settings: {
    loraCount?: number;
    referenceCount?: number;
    hasNegativePrompt?: boolean;
    hasCFG?: boolean;
  }
): string[] {
  const constraints = getModelConstraints(modelId);
  const violations: string[] = [];

  if (settings.loraCount && settings.loraCount > 0 && !constraints.supportsLoRA) {
    violations.push(
      `This model doesn't support LoRAs. Remove all ${settings.loraCount} LoRA(s) and try again.`
    );
  } else if (
    settings.loraCount &&
    constraints.maxLoRAs &&
    settings.loraCount > constraints.maxLoRAs
  ) {
    violations.push(
      `This model supports max ${constraints.maxLoRAs} LoRAs, but you have ${settings.loraCount}. Remove some LoRAs.`
    );
  }

  if (settings.referenceCount !== undefined) {
    if (constraints.minReferences && settings.referenceCount < constraints.minReferences) {
      violations.push(
        `This model requires at least ${constraints.minReferences} reference image(s). Add more references.`
      );
    }
    if (constraints.maxReferences && settings.referenceCount > constraints.maxReferences) {
      violations.push(
        `This model supports max ${constraints.maxReferences} reference(s), but you have ${settings.referenceCount}. Remove some.`
      );
    }
  }

  if (settings.hasNegativePrompt && !constraints.supportsNegativePrompt) {
    violations.push(
      `This model ignores negative prompts. Use prompt weighting or a different model.`
    );
  }

  return violations;
}

/**
 * Get model-specific tips for a given model
 */
export function getModelTips(modelId: string): string[] {
  const constraints = getModelConstraints(modelId);
  return constraints.notes || [];
}

// =============================================
// MODEL INPUT REQUIREMENTS
// =============================================

export type RequiredInputType =
  | 'image'
  | 'audio'
  | 'motionVideo'
  | 'sourceVideo'
  | 'mask'
  | 'faceReference';

export interface InputRequirement {
  input: RequiredInputType;
  label: string;
  description: string;
  accept?: string; // MIME type pattern for file inputs
}

export interface ModelRequirements {
  modelId: string;
  requirements: InputRequirement[];
}

/**
 * Models that have specific input requirements beyond a text prompt
 */
export const MODEL_REQUIREMENTS: ModelRequirements[] = [
  // Avatar / Talking Head Models - require face image + audio
  {
    modelId: 'fal-ai/kling-video/ai-avatar/v2/pro',
    requirements: [
      {
        input: 'image',
        label: 'Face Image',
        description: 'Portrait image of the person to animate',
        accept: 'image/*',
      },
      {
        input: 'audio',
        label: 'Audio',
        description: 'Speech or singing audio (MP3, WAV, M4A)',
        accept: 'audio/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/kling-video/ai-avatar/v2/standard',
    requirements: [
      {
        input: 'image',
        label: 'Face Image',
        description: 'Portrait image of the person to animate',
        accept: 'image/*',
      },
      {
        input: 'audio',
        label: 'Audio',
        description: 'Speech or singing audio (MP3, WAV, M4A)',
        accept: 'audio/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/creatify/aurora',
    requirements: [
      {
        input: 'image',
        label: 'Portrait Image',
        description: 'High-quality portrait photo',
        accept: 'image/*',
      },
      {
        input: 'audio',
        label: 'Audio',
        description: 'Driving audio for animation',
        accept: 'audio/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/sync-lips',
    requirements: [
      {
        input: 'sourceVideo',
        label: 'Source Video',
        description: 'Video to add lip sync to',
        accept: 'video/*',
      },
      { input: 'audio', label: 'Audio', description: 'Audio for lip sync', accept: 'audio/*' },
    ],
  },

  // Image-to-Video Models - require source image
  {
    modelId: 'fal-ai/wan/v2.2-a14b/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/wan/v2.2-a14b/image-to-video/lora',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/wan-25-preview/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/wan-2.1-i2v-14b',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/ltx-video/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/kling-video/v2.6/pro/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/kling-video/o1/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/minimax-video/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/luma-dream-machine/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/runway-gen3/turbo/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/vidu/q2/reference-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image(s)',
        description: 'Up to 7 character references',
        accept: 'image/*',
      },
    ],
  },

  // Wan 2.6 I2V and R2V
  {
    modelId: 'fal-ai/wan/v2.6/image-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to animate (1080p supported)',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/wan/v2.6/reference-to-video',
    requirements: [
      {
        input: 'sourceVideo',
        label: 'Reference Video(s)',
        description:
          'Up to 3 reference videos for character consistency. Use @Video1, @Video2, @Video3 in prompt.',
        accept: 'video/*',
      },
    ],
  },

  // Motion-driven animation
  {
    modelId: 'fal-ai/one-to-all-animation/14b',
    requirements: [
      {
        input: 'image',
        label: 'Character Image',
        description: 'Character to animate',
        accept: 'image/*',
      },
      {
        input: 'motionVideo',
        label: 'Motion Video',
        description: 'Driving video for pose/motion',
        accept: 'video/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/wan-video-2.2-animate-move',
    requirements: [
      {
        input: 'image',
        label: 'Character Image',
        description: 'Character to animate',
        accept: 'image/*',
      },
      {
        input: 'motionVideo',
        label: 'Motion Video',
        description: 'Driving video for motion',
        accept: 'video/*',
      },
    ],
  },

  // Kontext models - require reference
  {
    modelId: 'fal-ai/flux-kontext/dev',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image',
        description: 'Character/subject reference for consistency',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-kontext/pro',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image',
        description: 'Character/subject reference for consistency',
        accept: 'image/*',
      },
    ],
  },

  // IP-Adapter - requires face reference
  {
    modelId: 'fal-ai/ip-adapter-face-id',
    requirements: [
      {
        input: 'faceReference',
        label: 'Face Reference',
        description: 'Face image for identity preservation',
        accept: 'image/*',
      },
    ],
  },

  // === ADDITIONAL I2V MODELS ===
  {
    modelId: 'fal-ai/ltx-video/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/ltx-video-13b-distilled/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },
  {
    modelId: 'fal-ai/wan-pro/image-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to animate with professional quality',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/luma-dream-machine/ray-2/image-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to animate with realistic motion',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/hunyuan-video-image-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to animate with diverse motion',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/vidu/image-to-video',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to animate with optional sound',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/pixverse/v4.5/image-to-video',
    requirements: [
      { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' },
    ],
  },

  // === FLUX EDITING MODELS ===
  {
    modelId: 'fal-ai/flux-pro/kontext',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image',
        description: 'Character reference for consistency',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-kontext-max',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image',
        description: 'Image to edit with text guidance',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-fill-pro',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image for inpainting/outpainting',
        accept: 'image/*',
      },
      {
        input: 'mask',
        label: 'Mask',
        description: 'Mask defining area to fill',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-depth-pro',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image for depth-guided generation',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-canny-pro',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image for edge-guided generation',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-redux-dev',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to create variations from',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux/dev/image-to-image',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to transform',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux/dev/inpainting',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image for inpainting',
        accept: 'image/*',
      },
      {
        input: 'mask',
        label: 'Mask',
        description: 'Mask defining area to edit',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/flux-2-flex/edit',
    requirements: [
      {
        input: 'image',
        label: 'Reference Image(s)',
        description: 'Up to 10 reference images for editing',
        accept: 'image/*',
      },
    ],
  },

  // === UPSCALERS ===
  {
    modelId: 'fal-ai/creative-upscaler',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to upscale with AI enhancement',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/clarity-upscaler',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image to upscale faithfully',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/qwen-image/edit-plus',
    requirements: [
      {
        input: 'image',
        label: 'Source Image',
        description: 'Image for object removal/editing',
        accept: 'image/*',
      },
    ],
  },

  // === VIDEO EDITING ===
  {
    modelId: 'fal-ai/wan-vace-14b/inpainting',
    requirements: [
      {
        input: 'sourceVideo',
        label: 'Source Video',
        description: 'Video for inpainting',
        accept: 'video/*',
      },
      {
        input: 'mask',
        label: 'Mask',
        description: 'Mask defining area to fill',
        accept: 'image/*',
      },
    ],
  },
  {
    modelId: 'fal-ai/kling-video/o1/video-to-video/edit',
    requirements: [
      {
        input: 'sourceVideo',
        label: 'Source Video',
        description: 'Video to edit/transform',
        accept: 'video/*',
      },
    ],
  },
];

/**
 * Get requirements for a specific model
 */
export function getModelRequirements(modelId: string): InputRequirement[] {
  const modelReqs = MODEL_REQUIREMENTS.find(m => m.modelId === modelId);
  return modelReqs?.requirements || [];
}

/**
 * Check if a model has special input requirements
 */
export function hasSpecialRequirements(modelId: string): boolean {
  return MODEL_REQUIREMENTS.some(m => m.modelId === modelId);
}

/**
 * Current input state for validation
 */
export interface CurrentInputs {
  hasImage: boolean;
  hasAudio: boolean;
  hasMotionVideo: boolean;
  hasSourceVideo: boolean;
  hasMask: boolean;
  hasFaceReference: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  missingInputs: InputRequirement[];
}

/**
 * Validate that all required inputs are present for a model
 */
export function validateModelInputs(modelId: string, inputs: CurrentInputs): ValidationResult {
  const requirements = getModelRequirements(modelId);
  const missingInputs: InputRequirement[] = [];

  for (const req of requirements) {
    let hasInput = false;
    switch (req.input) {
      case 'image':
        hasInput = inputs.hasImage;
        break;
      case 'audio':
        hasInput = inputs.hasAudio;
        break;
      case 'motionVideo':
        hasInput = inputs.hasMotionVideo;
        break;
      case 'sourceVideo':
        hasInput = inputs.hasSourceVideo;
        break;
      case 'mask':
        hasInput = inputs.hasMask;
        break;
      case 'faceReference':
        hasInput = inputs.hasFaceReference || inputs.hasImage; // Face ref can be provided via element picker
        break;
    }

    if (!hasInput) {
      missingInputs.push(req);
    }
  }

  return {
    valid: missingInputs.length === 0,
    missingInputs,
  };
}

/**
 * Get a user-friendly message about missing inputs
 */
export function getMissingInputsMessage(modelId: string, inputs: CurrentInputs): string | null {
  const validation = validateModelInputs(modelId, inputs);
  if (validation.valid) return null;

  const missing = validation.missingInputs.map(r => r.label).join(', ');
  return `Missing required inputs: ${missing}`;
}

// =============================================
// LORA COMPATIBILITY
// =============================================

/**
 * Known LoRA base model types
 * These are the common base models that LoRAs are trained on
 */
export type LoRABaseModel =
  | 'SDXL'
  | 'SD1.5'
  | 'SD3'
  | 'SD3.5'
  | 'Flux'
  | 'Flux.1'
  | 'Pony'
  | 'Illustrious'
  | 'Wan'
  | 'Unknown';

/**
 * Mapping of generation model IDs to compatible LoRA base models
 * If a model isn't listed, it doesn't support LoRAs
 */
export const MODEL_LORA_COMPATIBILITY: Record<string, LoRABaseModel[]> = {
  // === FAL.AI FLUX MODELS ===
  'fal-ai/flux/dev': ['Flux', 'Flux.1'],
  'fal-ai/flux/schnell': ['Flux', 'Flux.1'],
  'fal-ai/flux-2-flex': ['Flux', 'Flux.1'],

  // === FAL.AI STABLE DIFFUSION ===
  'fal-ai/stable-diffusion-v35-large': ['SD3', 'SD3.5'],

  // === FAL.AI WAN (video) ===
  'fal-ai/wan/v2.2-a14b/image-to-video/lora': ['Wan'],

  // === REPLICATE MODELS ===
  'black-forest-labs/flux-dev': ['Flux', 'Flux.1'],
  'black-forest-labs/flux-schnell': ['Flux', 'Flux.1'],
  'stability-ai/sdxl': ['SDXL', 'Pony', 'Illustrious'],
  'realistic-vision': ['SD1.5'],

  // === COMFY (Local) - most flexible ===
  sdxl: ['SDXL', 'Pony', 'Illustrious'],
  'flux-dev': ['Flux', 'Flux.1'],
};

/**
 * Normalize a LoRA base model string to a known type
 * Handles variations in naming (e.g., "FLUX", "Flux 1", "flux.1-dev" all → 'Flux.1')
 */
export function normalizeLoRABaseModel(baseModel: string): LoRABaseModel {
  const lower = baseModel.toLowerCase().trim();

  // Flux variants
  if (lower.includes('flux')) {
    if (
      lower.includes('1') ||
      lower.includes('.1') ||
      lower.includes('dev') ||
      lower.includes('schnell')
    ) {
      return 'Flux.1';
    }
    return 'Flux';
  }

  // Stable Diffusion variants
  if (lower.includes('sdxl') || lower.includes('sd xl') || lower === 'xl') {
    return 'SDXL';
  }
  if (
    lower.includes('sd 1.5') ||
    lower.includes('sd1.5') ||
    lower.includes('sd15') ||
    lower === '1.5'
  ) {
    return 'SD1.5';
  }
  if (lower.includes('sd3.5') || lower.includes('sd 3.5')) {
    return 'SD3.5';
  }
  if (lower.includes('sd3') || lower.includes('sd 3')) {
    return 'SD3';
  }

  // Pony / Illustrious (SDXL-based)
  if (lower.includes('pony')) {
    return 'Pony';
  }
  if (lower.includes('illustrious') || lower.includes('ilxl')) {
    return 'Illustrious';
  }

  // Wan
  if (lower.includes('wan')) {
    return 'Wan';
  }

  return 'Unknown';
}

/**
 * Check if a LoRA is compatible with a generation model
 */
export function isLoRACompatible(loraBaseModel: string, generationModelId: string): boolean {
  const constraints = getModelConstraints(generationModelId);

  // If the model doesn't support LoRAs at all, not compatible
  if (!constraints.supportsLoRA) {
    return false;
  }

  const compatibleBases = MODEL_LORA_COMPATIBILITY[generationModelId];

  // If not in our mapping, assume compatible if model supports LoRA (be permissive)
  if (!compatibleBases) {
    return true;
  }

  const normalizedLoRABase = normalizeLoRABaseModel(loraBaseModel);

  // Unknown base models get a pass (user knows what they're doing)
  if (normalizedLoRABase === 'Unknown') {
    return true;
  }

  // Special case: Pony and Illustrious are SDXL-compatible
  if (
    (normalizedLoRABase === 'Pony' || normalizedLoRABase === 'Illustrious') &&
    compatibleBases.includes('SDXL')
  ) {
    return true;
  }

  return compatibleBases.includes(normalizedLoRABase);
}

/**
 * Result of LoRA compatibility check with detailed info
 */
export interface LoRACompatibilityResult {
  compatible: boolean;
  loraBase: LoRABaseModel;
  expectedBases: LoRABaseModel[];
  message?: string;
}

/**
 * Get detailed compatibility info for a LoRA
 */
export function getLoRACompatibility(
  loraBaseModel: string,
  loraName: string,
  generationModelId: string
): LoRACompatibilityResult {
  const constraints = getModelConstraints(generationModelId);

  // Model doesn't support LoRAs at all
  if (!constraints.supportsLoRA) {
    return {
      compatible: false,
      loraBase: normalizeLoRABaseModel(loraBaseModel),
      expectedBases: [],
      message: `"${loraName}" won't work - this model doesn't support LoRAs`,
    };
  }

  const compatibleBases = MODEL_LORA_COMPATIBILITY[generationModelId] || [];
  const normalizedLoRABase = normalizeLoRABaseModel(loraBaseModel);
  const isCompatible = isLoRACompatible(loraBaseModel, generationModelId);

  if (!isCompatible) {
    const expectedStr = compatibleBases.length > 0 ? compatibleBases.join(' or ') : 'unknown';
    return {
      compatible: false,
      loraBase: normalizedLoRABase,
      expectedBases: compatibleBases,
      message: `"${loraName}" is trained for ${normalizedLoRABase}, but this model needs ${expectedStr} LoRAs`,
    };
  }

  return {
    compatible: true,
    loraBase: normalizedLoRABase,
    expectedBases: compatibleBases,
  };
}

/**
 * Check multiple LoRAs and return all incompatible ones
 */
export function checkLoRAsCompatibility(
  loras: Array<{ name: string; baseModel: string }>,
  generationModelId: string
): LoRACompatibilityResult[] {
  return loras
    .map(lora => getLoRACompatibility(lora.baseModel, lora.name, generationModelId))
    .filter(result => !result.compatible);
}

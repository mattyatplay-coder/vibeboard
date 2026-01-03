/**
 * ModelRegistry - Single Source of Truth for Model/Provider Configuration
 *
 * This file is the authoritative source for:
 * - Model definitions and capabilities
 * - Provider configurations
 * - Model-to-provider routing
 *
 * The frontend should fetch this via /api/models endpoint.
 */

export type ProviderType =
  | 'fal'
  | 'comfy'
  | 'replicate'
  | 'together'
  | 'huggingface'
  | 'google'
  | 'openai'
  | 'civitai'
  | 'wan'
  | 'auto';

export type ModelCapability =
  | 'text-to-image'
  | 'image-editing'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-editing'
  | 'avatar';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  capability: ModelCapability;
  type: 'image' | 'video';
  desc?: string;
  cost?: number; // Estimated cost in USD
  tier?: 'fast' | 'quality' | 'pro';
  supportsLora?: boolean;
  maxReferenceImages?: number;
  supportedAspectRatios?: string[];
}

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  priority: number; // Lower = try first
  costPerImage: number;
  costPerVideo: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsLora: boolean;
  requiresApiKey: boolean;
  envVar?: string;
  category: 'local' | 'cloud';
  healthCheckEndpoint?: string;
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  comfy: {
    id: 'comfy',
    name: 'ComfyUI (Local)',
    priority: 1,
    costPerImage: 0,
    costPerVideo: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: true,
    requiresApiKey: false,
    category: 'local',
  },
  together: {
    id: 'together',
    name: 'Together AI',
    priority: 2,
    costPerImage: 0.0006,
    costPerVideo: 999,
    supportsVideo: false,
    supportsImage: true,
    supportsLora: false,
    requiresApiKey: true,
    envVar: 'TOGETHER_API_KEY',
    category: 'cloud',
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace',
    priority: 3,
    costPerImage: 0,
    costPerVideo: 0.01,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: false,
    requiresApiKey: false,
    category: 'cloud',
  },
  replicate: {
    id: 'replicate',
    name: 'Replicate',
    priority: 4,
    costPerImage: 0.003,
    costPerVideo: 0.05,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: true, // Via custom trained models
    requiresApiKey: true,
    envVar: 'REPLICATE_API_TOKEN',
    category: 'cloud',
  },
  fal: {
    id: 'fal',
    name: 'Fal.ai',
    priority: 5,
    costPerImage: 0.003,
    costPerVideo: 0.08,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: true,
    requiresApiKey: true,
    envVar: 'FAL_KEY',
    category: 'cloud',
  },
  civitai: {
    id: 'civitai',
    name: 'Civitai',
    priority: 4,
    costPerImage: 0,
    costPerVideo: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: true,
    requiresApiKey: true,
    envVar: 'CIVITAI_API_TOKEN',
    category: 'cloud',
  },
  google: {
    id: 'google',
    name: 'Google Veo',
    priority: 7,
    costPerImage: 0.02,
    costPerVideo: 0.15,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: false,
    requiresApiKey: true,
    envVar: 'GOOGLE_AI_API_KEY',
    category: 'cloud',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    priority: 8,
    costPerImage: 0.04,
    costPerVideo: 0.5,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: false,
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    category: 'cloud',
  },
  wan: {
    id: 'wan',
    name: 'Wan Video (Fal)',
    priority: 4,
    costPerImage: 0,
    costPerVideo: 0.1,
    supportsVideo: true,
    supportsImage: false,
    supportsLora: true,
    requiresApiKey: true,
    envVar: 'FAL_KEY',
    category: 'cloud',
  },
  auto: {
    id: 'auto',
    name: 'Auto (Best Available)',
    priority: 0,
    costPerImage: 0,
    costPerVideo: 0,
    supportsVideo: true,
    supportsImage: true,
    supportsLora: true,
    requiresApiKey: false,
    category: 'cloud',
  },
};

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

export const ALL_MODELS: ModelInfo[] = [
  // === FAL.AI - IMAGE ===
  {
    id: 'fal-ai/flux/dev',
    name: 'Flux Dev',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Best quality, great text & detail',
    supportsLora: true,
  },
  {
    id: 'fal-ai/flux/schnell',
    name: 'Flux Schnell',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast, good for drafts',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'fal-ai/flux-pro',
    name: 'Flux Pro',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Premium quality, commercial use',
    tier: 'pro',
    supportsLora: true,
  },
  {
    id: 'fal-ai/flux-pro/v1.1-ultra',
    name: 'Flux 1.1 Pro Ultra',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: '4K Ultra HD quality',
    tier: 'pro',
  },
  {
    id: 'fal-ai/flux-2-max',
    name: 'Flux 2 Max',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Highest fidelity Flux v2',
    tier: 'quality',
  },
  {
    id: 'fal-ai/flux-2-flex',
    name: 'Flux 2 Flex',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Flexible style control',
  },
  {
    id: 'fal-ai/flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High-quality with 8 reference support',
    tier: 'pro',
    maxReferenceImages: 8,
  },
  {
    id: 'fal-ai/nano-banana-pro/edit',
    name: 'Banana Pro Edit',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Experimental editor',
  },
  {
    id: 'fal-ai/gpt-image-1.5/edit',
    name: 'GPT Image 1.5 Edit',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Advanced prompt adherence',
  },
  {
    id: 'fal-ai/recraft-v3',
    name: 'Recraft V3',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Vector art, logos, icons',
  },
  {
    id: 'fal-ai/ideogram/v2',
    name: 'Ideogram V2',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Perfect text in images',
  },
  {
    id: 'fal-ai/ideogram/v3',
    name: 'Ideogram V3',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Advanced typography and realistic outputs',
  },
  {
    id: 'fal-ai/ideogram/character',
    name: 'Ideogram V3 Character',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Character sheets & turnarounds',
    tier: 'quality',
  },
  {
    id: 'fal-ai/hidream-i1-full',
    name: 'HiDream I1',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High-resolution image generation',
  },
  {
    id: 'fal-ai/janus',
    name: 'Janus',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Multimodal understanding and generation',
  },
  {
    id: 'fal-ai/flux-kontext/dev',
    name: 'Flux Kontext Dev',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Character-consistent editing',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/flux-kontext/pro',
    name: 'Flux Kontext Pro',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Premium character consistency',
    tier: 'pro',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/flux-kontext-max',
    name: 'Flux Kontext Max',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Premium editing with typography',
    tier: 'pro',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/ip-adapter-face-id',
    name: 'IP-Adapter Face ID',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Face identity preservation',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/stable-diffusion-v35-large',
    name: 'SD 3.5 Large',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Latest Stability AI model',
  },
  {
    id: 'fal-ai/imagen3',
    name: 'Imagen 3',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Google photorealistic',
  },
  {
    id: 'fal-ai/imagen4/preview',
    name: 'Imagen 4 (Preview)',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Latest Google quality',
  },
  {
    id: 'fal-ai/kling-image/o1',
    name: 'Kling O1 Image',
    provider: 'fal',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Multi-reference editor',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/creative-upscaler',
    name: 'Creative Upscaler (4x)',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Add detail while upscaling',
  },
  {
    id: 'fal-ai/clarity-upscaler',
    name: 'Clarity Upscaler',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Sharp, faithful upscaling',
  },
  {
    id: 'fal-ai/flux-2-flex/edit',
    name: 'Flux 2 Flex Edit',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Edit existing images',
  },
  {
    id: 'fal-ai/flux/dev/image-to-image',
    name: 'Flux Dev I2I',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Transform images',
  },
  {
    id: 'fal-ai/flux/dev/inpainting',
    name: 'Flux Dev Inpaint',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Edit specific regions',
  },
  {
    id: 'fal-ai/flux-fill-pro',
    name: 'Flux Fill Pro',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Inpainting and outpainting',
  },
  {
    id: 'fal-ai/flux-depth-pro',
    name: 'Flux Depth Pro',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Structure-preserving edits',
  },
  {
    id: 'fal-ai/flux-canny-pro',
    name: 'Flux Canny Pro',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Edge-guided generation',
  },
  {
    id: 'fal-ai/flux-redux-dev',
    name: 'Flux Redux Dev',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Image variation tool',
  },
  {
    id: 'fal-ai/qwen-image/edit-plus',
    name: 'Qwen Image Edit Plus',
    provider: 'fal',
    capability: 'image-editing',
    type: 'image',
    desc: 'Remove clothes/objects (Plus)',
    tier: 'quality',
  },

  // === FAL.AI - VIDEO T2V ===
  {
    id: 'fal-ai/wan-t2v',
    name: 'Wan 2.2 T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Realistic motion, cinematic',
    supportsLora: true,
  },
  {
    id: 'fal-ai/wan-25-preview/text-to-video',
    name: 'Wan 2.5 T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Latest Wan, best quality',
    tier: 'quality',
  },
  {
    id: 'fal-ai/wan/v2.6/text-to-video',
    name: 'Wan 2.6 T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: '1080p, 5-15s, multi-shot, audio',
    tier: 'pro',
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
  },
  {
    id: 'fal-ai/wan-2.1-t2v-1.3b',
    name: 'Wan 2.1 T2V (1.3B)',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast, efficient video gen',
    tier: 'fast',
  },
  {
    id: 'fal-ai/ltx-video',
    name: 'LTX-Video T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast, good for iteration',
    tier: 'fast',
  },
  {
    id: 'fal-ai/kling-video/v2.1/master/text-to-video',
    name: 'Kling 2.1 Master T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Premium motion fluidity',
    tier: 'pro',
  },
  {
    id: 'fal-ai/kling-video/v2.6/pro/text-to-video',
    name: 'Kling 2.6 T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High quality, realistic',
    tier: 'pro',
  },
  {
    id: 'fal-ai/vidu/v1/text-to-video',
    name: 'Vidu v1',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast generation',
  },
  {
    id: 'fal-ai/vidu/q1/text-to-video',
    name: 'Vidu Q1',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High-quality with audio',
  },
  {
    id: 'fal-ai/hunyuan-video',
    name: 'Hunyuan Video',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High motion quality',
  },
  {
    id: 'fal-ai/minimax-video',
    name: 'MiniMax Video',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast, expressive motion',
  },
  {
    id: 'fal-ai/luma-dream-machine',
    name: 'Luma Dream Machine',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Smooth, dreamlike motion',
  },
  {
    id: 'fal-ai/luma-dream-machine/ray-2',
    name: 'Luma Ray 2',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Latest Luma with realistic visuals',
  },
  {
    id: 'fal-ai/veo3',
    name: 'Veo 3',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Google DeepMind with native audio',
    tier: 'pro',
  },
  {
    id: 'fal-ai/pixverse/v4.5/text-to-video',
    name: 'Pixverse V4.5',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Advanced text-to-video',
  },
  {
    id: 'fal-ai/magi',
    name: 'Magi',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Creative video generation',
  },
  {
    id: 'fal-ai/wan-pro/text-to-video',
    name: 'Wan Pro T2V',
    provider: 'fal',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Professional video fidelity',
    tier: 'pro',
  },

  // === FAL.AI - VIDEO I2V ===
  {
    id: 'fal-ai/wan/v2.2-a14b/image-to-video',
    name: 'Wan 2.2 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Animate still images',
  },
  {
    id: 'fal-ai/wan/v2.2-a14b/image-to-video/lora',
    name: 'Wan 2.2 (LoRA)',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Animation with trained characters',
    supportsLora: true,
  },
  {
    id: 'fal-ai/wan-25-preview/image-to-video',
    name: 'Wan 2.5 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Best image animation',
    tier: 'quality',
  },
  {
    id: 'fal-ai/wan/v2.6/image-to-video',
    name: 'Wan 2.6 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: '1080p, 5-15s, multi-shot, audio',
    tier: 'pro',
  },
  {
    id: 'fal-ai/wan/v2.6/reference-to-video',
    name: 'Wan 2.6 R2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Multi-ref video (@Video1-3)',
    tier: 'pro',
    maxReferenceImages: 3,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
  },
  {
    id: 'fal-ai/wan-2.1-i2v-14b',
    name: 'Wan 2.1 I2V (14B)',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'High quality image-to-video',
    tier: 'quality',
  },
  {
    id: 'fal-ai/ltx-video/image-to-video',
    name: 'LTX-Video I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Quick image animation',
    tier: 'fast',
  },
  {
    id: 'fal-ai/ltx-video-13b-distilled/image-to-video',
    name: 'LTX Video 13B I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Distilled 13B for fast animation',
    tier: 'fast',
  },
  {
    id: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    name: 'Kling 2.1 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Good balance',
  },
  {
    id: 'fal-ai/kling-video/v2.1/master/image-to-video',
    name: 'Kling 2.1 Master I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Premium motion fluidity',
    tier: 'pro',
  },
  {
    id: 'fal-ai/kling-video/v2.6/pro/image-to-video',
    name: 'Kling 2.6 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Pro-quality animation',
    tier: 'pro',
  },
  {
    id: 'fal-ai/kling-video/o1/image-to-video',
    name: 'Kling O1 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Premium image animation',
    tier: 'pro',
    maxReferenceImages: 4,
  },
  {
    id: 'fal-ai/minimax-video/image-to-video',
    name: 'MiniMax I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Quick, lively animations',
    tier: 'fast',
  },
  {
    id: 'fal-ai/luma-dream-machine/image-to-video',
    name: 'Luma I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Ethereal animations',
  },
  {
    id: 'fal-ai/luma-dream-machine/ray-2/image-to-video',
    name: 'Luma Ray 2 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Latest Luma with realistic motion',
  },
  {
    id: 'fal-ai/runway-gen3/turbo/image-to-video',
    name: 'Runway Gen3 Turbo',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Fast, cinematic style',
    tier: 'fast',
  },
  {
    id: 'fal-ai/hunyuan-video-image-to-video',
    name: 'Hunyuan I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Open-source I2V with motion diversity',
  },
  {
    id: 'fal-ai/vidu/image-to-video',
    name: 'Vidu I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'High-quality with sound',
  },
  {
    id: 'fal-ai/vidu/q2/reference-to-video',
    name: 'Vidu Q2 (Ref)',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Up to 7 character refs',
    maxReferenceImages: 7,
  },
  {
    id: 'fal-ai/pixverse/v4.5/image-to-video',
    name: 'Pixverse V4.5 I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Advanced image-to-video',
  },
  {
    id: 'fal-ai/wan-pro/image-to-video',
    name: 'Wan Pro I2V',
    provider: 'fal',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Professional animation fidelity',
    tier: 'pro',
  },

  // === FAL.AI - AVATAR ===
  {
    id: 'fal-ai/one-to-all-animation/14b',
    name: 'One-To-All (14B)',
    provider: 'fal',
    capability: 'avatar',
    type: 'video',
    desc: 'Pose-driven character animation',
  },
  {
    id: 'fal-ai/wan-video-2.2-animate-move',
    name: 'Wan 2.2 Animate Move',
    provider: 'fal',
    capability: 'avatar',
    type: 'video',
    desc: 'Character animation from video',
  },
  {
    id: 'fal-ai/kling-video/ai-avatar/v2/pro',
    name: 'Kling Avatar Pro',
    provider: 'fal',
    capability: 'avatar',
    type: 'video',
    desc: 'Talking head (Pro)',
    tier: 'pro',
  },
  {
    id: 'fal-ai/kling-video/ai-avatar/v2/standard',
    name: 'Kling Avatar Std',
    provider: 'fal',
    capability: 'avatar',
    type: 'video',
    desc: 'Talking head (Fast)',
  },
  {
    id: 'fal-ai/creatify/aurora',
    name: 'Creatify Aurora',
    provider: 'fal',
    capability: 'avatar',
    type: 'video',
    desc: 'High-fidelity portrait animation',
  },

  // === FAL.AI - VIDEO EDITING ===
  {
    id: 'fal-ai/wan-vace-14b/inpainting',
    name: 'Wan VACE Inpaint',
    provider: 'fal',
    capability: 'video-editing',
    type: 'video',
    desc: 'Edit video regions',
  },
  {
    id: 'fal-ai/kling-video/o1/video-to-video/edit',
    name: 'Kling O1 V2V Edit',
    provider: 'fal',
    capability: 'video-editing',
    type: 'video',
    desc: 'Edit existing videos',
  },

  // === REPLICATE ===
  // FLUX Models (Black Forest Labs)
  {
    id: 'black-forest-labs/flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High-quality with 8 reference support',
    tier: 'pro',
    maxReferenceImages: 8,
  },
  {
    id: 'black-forest-labs/flux-2-flex',
    name: 'Flux 2 Flex',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Max-quality with 10 reference support',
    maxReferenceImages: 10,
  },
  {
    id: 'black-forest-labs/flux-2-dev',
    name: 'Flux 2 Dev',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Quality generation with reference editing',
    supportsLora: true,
  },
  {
    id: 'black-forest-labs/flux-1.1-pro-ultra',
    name: 'Flux 1.1 Pro Ultra',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Up to 4 megapixel output',
    tier: 'pro',
  },
  {
    id: 'black-forest-labs/flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Faster, better Flux Pro',
    tier: 'pro',
  },
  {
    id: 'black-forest-labs/flux-dev',
    name: 'Flux Dev',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: '12B parameter rectified flow',
    supportsLora: true,
  },
  {
    id: 'black-forest-labs/flux-schnell',
    name: 'Flux Schnell',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fastest FLUX model',
    tier: 'fast',
  },
  // FLUX Editing Models
  {
    id: 'black-forest-labs/flux-fill-pro',
    name: 'Flux Fill Pro',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Inpainting and outpainting',
  },
  {
    id: 'black-forest-labs/flux-depth-pro',
    name: 'Flux Depth Pro',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Structure-preserving edits',
  },
  {
    id: 'black-forest-labs/flux-canny-pro',
    name: 'Flux Canny Pro',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Edge-guided generation',
  },
  {
    id: 'black-forest-labs/flux-kontext-max',
    name: 'Flux Kontext Max',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Premium editing with typography',
    tier: 'pro',
  },
  {
    id: 'black-forest-labs/flux-kontext-pro',
    name: 'Flux Kontext Pro',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'State-of-the-art text editing',
    tier: 'pro',
  },
  {
    id: 'black-forest-labs/flux-redux-dev',
    name: 'Flux Redux Dev',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Image variation tool',
  },
  {
    id: 'black-forest-labs/flux-fill-dev',
    name: 'Flux Fill Dev',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Inpainting model',
  },
  // Other Replicate Image Models
  {
    id: 'stability-ai/sdxl',
    name: 'SDXL',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Standard SDXL',
    supportsLora: true,
  },
  {
    id: 'stability-ai/stable-diffusion-3.5-large',
    name: 'SD 3.5 Large',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High-resolution generation',
  },
  {
    id: 'google/imagen-3',
    name: 'Imagen 3',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Google highest quality photorealism',
  },
  {
    id: 'google/imagen-4',
    name: 'Imagen 4',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Google flagship model',
  },
  {
    id: 'google/imagen-4-fast',
    name: 'Imagen 4 Fast',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast version for rapid iteration',
    tier: 'fast',
  },
  {
    id: 'ideogram-ai/ideogram-v2',
    name: 'Ideogram V2',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Text-in-image specialist',
  },
  {
    id: 'ideogram-ai/ideogram-v3-turbo',
    name: 'Ideogram V3 Turbo',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fastest, cheapest Ideogram v3',
    tier: 'fast',
  },
  {
    id: 'recraft-ai/recraft-v3',
    name: 'Recraft V3',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Professional design with long text',
  },
  {
    id: 'luma/photon',
    name: 'Luma Photon',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High-quality photorealism',
  },
  {
    id: 'nvidia/sana',
    name: 'NVIDIA Sana',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast with wide artistic range',
  },
  {
    id: 'bytedance/seedream-4',
    name: 'SeedReam 4',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Unified T2I with style control',
  },
  {
    id: 'qwen/qwen-image',
    name: 'Qwen Image',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Image generation foundation model',
  },
  {
    id: 'fofr/consistent-character',
    name: 'Consistent Character',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Character poses & turnarounds',
    tier: 'quality',
  },
  {
    id: 'lucataco/juggernaut-xl-v9',
    name: 'Juggernaut XL v9',
    provider: 'replicate',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High detail photorealism',
  },
  {
    id: 'lucataco/sdxl-inpainting',
    name: 'SDXL Inpainting',
    provider: 'replicate',
    capability: 'image-editing',
    type: 'image',
    desc: 'Inpainting model',
  },
  // Replicate Video
  {
    id: 'wan-2.5-t2v',
    name: 'Wan 2.5 T2V',
    provider: 'replicate',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Replicate Wan T2V',
  },
  {
    id: 'wan-2.5-i2v',
    name: 'Wan 2.5 I2V',
    provider: 'replicate',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Replicate Wan I2V',
  },

  // === TOGETHER AI === (8 verified working Dec 24, 2025)
  // FLUX Models
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'Flux Schnell',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast generation ($0.003)',
    tier: 'fast',
  },
  {
    id: 'black-forest-labs/FLUX.1-dev',
    name: 'Flux Dev',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High quality',
    supportsLora: true,
  },
  // Dreamshaper - CHEAPEST at $0.0006/image!
  {
    id: 'Lykon/DreamShaper',
    name: 'Dreamshaper',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Creative & artistic ($0.0006)',
    tier: 'fast',
  },
  // HiDream Models
  {
    id: 'HiDream-ai/HiDream-I1-Full',
    name: 'HiDream I1 Full',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'High quality ($0.009)',
    tier: 'quality',
  },
  {
    id: 'HiDream-ai/HiDream-I1-Dev',
    name: 'HiDream I1 Dev',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Dev version ($0.0045)',
  },
  {
    id: 'HiDream-ai/HiDream-I1-Fast',
    name: 'HiDream I1 Fast',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast version ($0.0032)',
    tier: 'fast',
  },
  // Juggernaut Models (RunDiffusion) - FASTEST at 2.2s
  {
    id: 'RunDiffusion/Juggernaut-Pro-Flux',
    name: 'Juggernaut Pro Flux',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Premium quality ($0.0049)',
    tier: 'quality',
  },
  {
    id: 'RunDiffusion/Juggernaut-Lightning-Flux',
    name: 'Juggernaut Lightning',
    provider: 'together',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fastest ($0.0017)',
    tier: 'fast',
  },

  // === GOOGLE ===
  {
    id: 'imagen-3',
    name: 'Imagen 3',
    provider: 'google',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Google Photorealism',
    tier: 'quality',
  },
  {
    id: 'imagen-4',
    name: 'Imagen 4',
    provider: 'google',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Google latest quality',
  },
  {
    id: 'veo-2',
    name: 'Veo 2',
    provider: 'google',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High-quality with realistic motion',
  },
  {
    id: 'veo-3',
    name: 'Veo 3',
    provider: 'google',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Most advanced with native audio',
    tier: 'pro',
  },

  // === OPENAI ===
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Creative concepts',
  },
  {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    provider: 'openai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Latest OpenAI with advanced understanding',
  },
  {
    id: 'sora',
    name: 'Sora (Legacy)',
    provider: 'openai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Original Sora model',
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    provider: 'openai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Standard video with realistic motion',
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    provider: 'openai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High-fidelity cinematic video',
    tier: 'pro',
  },

  // === CIVITAI === (Fixed Dec 24, 2025 - SDK array parsing)
  // 3/5 models verified working: SDXL 1.0, Pony, Realistic Vision
  // Uses Civitai community models with full LoRA support
  // Flux Models
  {
    id: 'flux-1-d',
    name: 'Flux 1 Dev',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Civitai Flux Dev',
    supportsLora: true,
  },
  {
    id: 'flux-1-s',
    name: 'Flux 1 Schnell',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Civitai Flux Schnell',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'flux-1-kontext',
    name: 'Flux 1 Kontext',
    provider: 'civitai',
    capability: 'image-editing',
    type: 'image',
    desc: 'Civitai character consistency',
    supportsLora: true,
  },
  {
    id: 'flux-2-d',
    name: 'Flux 2 Dev',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Civitai Flux 2',
    supportsLora: true,
  },
  // SDXL Models
  {
    id: 'sdxl-1-0',
    name: 'SDXL 1.0',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Base SDXL with LoRA support',
    supportsLora: true,
  },
  {
    id: 'sdxl-lightning',
    name: 'SDXL Lightning',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Fast SDXL (4-8 steps)',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'sdxl-hyper',
    name: 'SDXL Hyper',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Hyper-fast SDXL',
    tier: 'fast',
    supportsLora: true,
  },
  // Stable Diffusion 1.x/2.x
  {
    id: 'sd-1-4',
    name: 'SD 1.4',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Classic SD 1.4',
    supportsLora: true,
  },
  {
    id: 'sd-1-5',
    name: 'SD 1.5',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Classic SD 1.5 with vast LoRA ecosystem',
    supportsLora: true,
  },
  {
    id: 'realistic-vision',
    name: 'Realistic Vision',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Photorealistic (fastest at 6.5s)',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'sd-1-5-lcm',
    name: 'SD 1.5 LCM',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Latent Consistency Model',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'sd-1-5-hyper',
    name: 'SD 1.5 Hyper',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Hyper-fast SD 1.5',
    tier: 'fast',
    supportsLora: true,
  },
  {
    id: 'sd-2-0',
    name: 'SD 2.0',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Stable Diffusion 2.0',
    supportsLora: true,
  },
  {
    id: 'sd-2-1',
    name: 'SD 2.1',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Stable Diffusion 2.1',
    supportsLora: true,
  },
  // Pony Models
  {
    id: 'pony',
    name: 'Pony Diffusion',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Anime/furry style',
    supportsLora: true,
  },
  {
    id: 'pony-v7',
    name: 'Pony V7',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Latest Pony with improved quality',
    tier: 'quality',
    supportsLora: true,
  },
  // Qwen
  {
    id: 'qwen',
    name: 'Qwen Image',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Alibaba Qwen foundation model',
    supportsLora: true,
  },
  // ZImageTurbo
  {
    id: 'zimage-turbo',
    name: 'ZImage Turbo',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Ultra-fast generation',
    tier: 'fast',
    supportsLora: true,
  },
  // Other specialty models
  {
    id: 'illustrious',
    name: 'Illustrious',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Illustration style',
    supportsLora: true,
  },
  {
    id: 'noobai',
    name: 'NoobAI',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Anime illustration',
    supportsLora: true,
  },
  {
    id: 'kolors',
    name: 'Kolors',
    provider: 'civitai',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Vivid colors',
    supportsLora: true,
  },
  // Civitai Video Models - Wan Family
  {
    id: 'wan-video-1-3b-t2v',
    name: 'Wan 1.3B T2V',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast Wan video',
    tier: 'fast',
  },
  {
    id: 'wan-video-14b-t2v',
    name: 'Wan 14B T2V',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'High-quality Wan',
  },
  {
    id: 'wan-video-14b-i2v-480p',
    name: 'Wan 14B I2V 480p',
    provider: 'civitai',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Image animation 480p',
  },
  {
    id: 'wan-video-14b-i2v-720p',
    name: 'Wan 14B I2V 720p',
    provider: 'civitai',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Image animation 720p',
  },
  {
    id: 'wan-video-2-2-t2v-5b',
    name: 'Wan 2.2 T2V (5B)',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Wan 2.2 text-to-video',
  },
  {
    id: 'wan-video-2-2-i2v-a14b',
    name: 'Wan 2.2 I2V',
    provider: 'civitai',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Wan 2.2 image-to-video',
  },
  {
    id: 'wan-video-2-2-t2v-a14b',
    name: 'Wan 2.2 T2V (14B)',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Wan 2.2 full quality',
  },
  {
    id: 'wan-video-2-5-t2v',
    name: 'Wan 2.5 T2V',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Latest Wan text-to-video',
    tier: 'quality',
  },
  {
    id: 'wan-video-2-5-i2v',
    name: 'Wan 2.5 I2V',
    provider: 'civitai',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Latest Wan image-to-video',
    tier: 'quality',
  },
  // Civitai Video - Other
  {
    id: 'cogvideox',
    name: 'CogVideoX',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Open-source T2V',
  },
  {
    id: 'hunyuan-video-civitai',
    name: 'Hunyuan Video',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Tencent video model',
  },
  {
    id: 'ltxv',
    name: 'LTXV',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast video generation',
    tier: 'fast',
  },
  {
    id: 'mochi',
    name: 'Mochi',
    provider: 'civitai',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Genmo Mochi video',
  },

  // === COMFY (Local) ===
  {
    id: 'sdxl',
    name: 'SDXL (Local)',
    provider: 'comfy',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Run SDXL locally with full control',
    supportsLora: true,
  },
  {
    id: 'flux-dev',
    name: 'Flux Dev (Local)',
    provider: 'comfy',
    capability: 'text-to-image',
    type: 'image',
    desc: 'Run Flux locally with custom LoRAs',
    supportsLora: true,
  },
  {
    id: 'ltx-video',
    name: 'LTX Video (Local)',
    provider: 'comfy',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast local video generation',
  },
  {
    id: 'wan-2.2',
    name: 'Wan 2.2 (Local)',
    provider: 'comfy',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Local image animation',
  },
  {
    id: 'hunyuan-video',
    name: 'Hunyuan Video (Local)',
    provider: 'comfy',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Open-source video running locally',
  },

  // === WAN (Dedicated Adapter) ===
  {
    id: 'fal-ai/wan-2.1-t2v-1.3b',
    name: 'Wan 2.1 T2V',
    provider: 'wan',
    capability: 'text-to-video',
    type: 'video',
    desc: 'Fast Wan T2V',
  },
  {
    id: 'fal-ai/wan-2.1-i2v-14b',
    name: 'Wan 2.1 I2V',
    provider: 'wan',
    capability: 'image-to-video',
    type: 'video',
    desc: 'Quality Wan I2V',
  },
  {
    id: 'fal-ai/wan-video-2.2-animate-move',
    name: 'Wan 2.2 Animate',
    provider: 'wan',
    capability: 'avatar',
    type: 'video',
    desc: 'Character motion',
  },
];

// ============================================================================
// MODEL ROUTING - Maps model IDs to their provider
// ============================================================================

// Build the routing map from ALL_MODELS
const buildModelToProviderMap = (): Record<string, ProviderType> => {
  const map: Record<string, ProviderType> = {};
  for (const model of ALL_MODELS) {
    map[model.id] = model.provider;
  }
  return map;
};

export const MODEL_TO_PROVIDER: Record<string, ProviderType> = buildModelToProviderMap();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getModelsByCapability(capability: ModelCapability): ModelInfo[] {
  return ALL_MODELS.filter(m => m.capability === capability);
}

export function getModelsByProvider(provider: ProviderType): ModelInfo[] {
  return ALL_MODELS.filter(m => m.provider === provider);
}

export function getModelById(id: string): ModelInfo | undefined {
  return ALL_MODELS.find(m => m.id === id);
}

export function getProviderForModel(modelId: string): ProviderType | null {
  return MODEL_TO_PROVIDER[modelId] || null;
}

export function getLoraCompatibleProviders(): ProviderType[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter(p => p.supportsLora)
    .map(p => p.id);
}

export function getVideoCapableProviders(): ProviderType[] {
  return Object.values(PROVIDER_CONFIGS)
    .filter(p => p.supportsVideo)
    .map(p => p.id);
}

export function getProviderConfig(provider: ProviderType): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[provider];
}

// ============================================================================
// LORA COMPATIBILITY
// ============================================================================

export type LoraBaseModel = 'SDXL' | 'Flux' | 'SD1.5' | 'Pony' | 'SVD' | 'Wan' | 'Other';

// Maps base model types to compatible providers
const LORA_PROVIDER_COMPATIBILITY: Record<LoraBaseModel, ProviderType[]> = {
  SDXL: ['fal', 'comfy', 'replicate', 'civitai'],
  Flux: ['fal', 'comfy', 'replicate', 'civitai'],
  'SD1.5': ['comfy', 'replicate', 'civitai'],
  Pony: ['civitai', 'comfy'], // Pony LoRAs work on Pony models (SDXL-based)
  SVD: ['comfy'], // Stable Video Diffusion LoRAs only work locally
  Wan: ['fal', 'wan', 'comfy'], // Wan LoRAs
  Other: ['comfy'], // Unknown LoRAs only safe for local
};

// Maps base model types to compatible model IDs
// NOTE: SDXL and Flux are INCOMPATIBLE - different architectures (U-Net vs DiT)
// Pony is SDXL-based, so Pony <-> SDXL LoRAs ARE compatible
const LORA_MODEL_COMPATIBILITY: Record<LoraBaseModel, string[]> = {
  SDXL: [
    // SDXL models only (U-Net architecture)
    'stability-ai/sdxl',
    'sdxl',
    'sdxl-1-0',
    'sdxl-lightning',
    'sdxl-hyper',
    'pony',
    'pony-v7', // Pony uses SDXL base - compatible!
  ],
  Flux: [
    // Flux models only (DiT architecture - NOT compatible with SDXL LoRAs)
    'fal-ai/flux/dev',
    'fal-ai/flux/schnell',
    'fal-ai/flux-pro',
    'fal-ai/flux-2-max',
    'fal-ai/flux-2-flex',
    'black-forest-labs/flux-dev',
    'black-forest-labs/flux-schnell',
    'flux-dev',
    'flux-schnell',
    'flux-1-d',
    'flux-1-s',
    'flux-1-kontext',
    'flux-2-d', // Civitai Flux
  ],
  'SD1.5': [
    'sd15',
    'sd-1-5',
    'sd-1-5-lcm',
    'sd-1-5-hyper',
    'sd-1-4',
    'sd-2-0',
    'sd-2-1',
    'realistic-vision',
  ],
  Pony: [
    'pony',
    'pony-v7', // Primary Pony models
    'sdxl-1-0',
    'sdxl-lightning',
    'sdxl-hyper', // Pony LoRAs also work on SDXL (same architecture)
  ],
  SVD: ['ltx-video', 'animatediff'],
  Wan: [
    'fal-ai/wan-t2v',
    'fal-ai/wan/v2.2-a14b/image-to-video/lora',
    'fal-ai/wan-2.1-t2v-1.3b',
    'fal-ai/wan-2.1-i2v-14b',
    'wan-2.2',
  ],
  Other: [],
};

export interface LoraCompatibilityResult {
  compatible: boolean;
  reason?: string;
  suggestedProviders?: ProviderType[];
  suggestedModels?: string[];
}

/**
 * Check if a LoRA is compatible with a specific provider
 */
export function isLoraCompatibleWithProvider(
  loraBaseModel: LoraBaseModel,
  provider: ProviderType
): boolean {
  const compatibleProviders = LORA_PROVIDER_COMPATIBILITY[loraBaseModel] || [];
  return compatibleProviders.includes(provider);
}

/**
 * Check if a LoRA is compatible with a specific model
 */
export function isLoraCompatibleWithModel(loraBaseModel: LoraBaseModel, modelId: string): boolean {
  const compatibleModels = LORA_MODEL_COMPATIBILITY[loraBaseModel] || [];
  return compatibleModels.includes(modelId) || compatibleModels.some(m => modelId.includes(m));
}

/**
 * Get compatible providers for a LoRA
 */
export function getCompatibleProvidersForLora(loraBaseModel: LoraBaseModel): ProviderType[] {
  return LORA_PROVIDER_COMPATIBILITY[loraBaseModel] || [];
}

/**
 * Get compatible models for a LoRA
 */
export function getCompatibleModelsForLora(loraBaseModel: LoraBaseModel): string[] {
  return LORA_MODEL_COMPATIBILITY[loraBaseModel] || [];
}

/**
 * Validate if a generation request is compatible with the provided LoRAs
 */
export function validateLoraCompatibility(
  loras: Array<{ baseModel: LoraBaseModel }>,
  provider?: ProviderType,
  modelId?: string
): LoraCompatibilityResult {
  if (!loras || loras.length === 0) {
    return { compatible: true };
  }

  // Check provider compatibility
  if (provider && provider !== 'auto') {
    const providerConfig = PROVIDER_CONFIGS[provider];
    if (!providerConfig?.supportsLora) {
      return {
        compatible: false,
        reason: `Provider ${provider} does not support LoRAs`,
        suggestedProviders: getLoraCompatibleProviders(),
      };
    }

    // Check each LoRA's base model against provider
    for (const lora of loras) {
      if (!isLoraCompatibleWithProvider(lora.baseModel, provider)) {
        return {
          compatible: false,
          reason: `LoRA base model ${lora.baseModel} is not compatible with provider ${provider}`,
          suggestedProviders: getCompatibleProvidersForLora(lora.baseModel),
        };
      }
    }
  }

  // Check model compatibility if specified
  if (modelId) {
    const model = getModelById(modelId);
    if (model && !model.supportsLora) {
      return {
        compatible: false,
        reason: `Model ${modelId} does not support LoRAs`,
        suggestedModels: ALL_MODELS.filter(m => m.supportsLora && m.type === model.type).map(
          m => m.id
        ),
      };
    }

    // Check each LoRA's base model against the model
    for (const lora of loras) {
      if (!isLoraCompatibleWithModel(lora.baseModel, modelId)) {
        return {
          compatible: false,
          reason: `LoRA base model ${lora.baseModel} is not compatible with model ${modelId}`,
          suggestedModels: getCompatibleModelsForLora(lora.baseModel),
        };
      }
    }
  }

  return { compatible: true };
}

/**
 * Parse compatibleProviders JSON string from LoRA record
 */
export function parseLoraCompatibleProviders(
  compatibleProvidersJson: string | null
): ProviderType[] {
  if (!compatibleProvidersJson) return [];
  try {
    return JSON.parse(compatibleProvidersJson);
  } catch {
    return [];
  }
}

/**
 * Get the best provider for a generation with LoRAs
 */
export function getBestProviderForLoraGeneration(
  loras: Array<{ baseModel: LoraBaseModel; compatibleProviders?: string | null }>,
  preferVideo: boolean = false
): ProviderType | null {
  if (!loras || loras.length === 0) {
    return null; // No LoRA constraints
  }

  // Find intersection of compatible providers for all LoRAs
  let candidates = getLoraCompatibleProviders();

  for (const lora of loras) {
    // Use stored compatibility if available
    if (lora.compatibleProviders) {
      const storedProviders = parseLoraCompatibleProviders(lora.compatibleProviders);
      if (storedProviders.length > 0) {
        candidates = candidates.filter(p => storedProviders.includes(p));
        continue;
      }
    }

    // Fall back to base model compatibility
    const loraCompatible = getCompatibleProvidersForLora(lora.baseModel);
    candidates = candidates.filter(p => loraCompatible.includes(p));
  }

  // Filter by video support if needed
  if (preferVideo) {
    candidates = candidates.filter(p => PROVIDER_CONFIGS[p]?.supportsVideo);
  }

  // Sort by priority and return best
  candidates.sort((a, b) => {
    const configA = PROVIDER_CONFIGS[a];
    const configB = PROVIDER_CONFIGS[b];
    return (configA?.priority || 99) - (configB?.priority || 99);
  });

  return candidates[0] || null;
}

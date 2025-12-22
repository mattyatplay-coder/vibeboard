export interface ModelCapability {
  id: string;
  name: string;
  provider: 'fal' | 'google' | 'openai' | 'replicate';
  features: {
    lora: boolean;
    imageToVideo: boolean;
    framesToVideo: boolean; // Start + End frames
    extendVideo: boolean;
    cameraControl: boolean; // Direct parameters (pan, tilt, zoom)
    inpainting: boolean;
    negativePrompt: boolean;
  };
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  'veo-3.1': {
    id: 'veo-3.1',
    name: 'Google Veo 3.1',
    provider: 'google',
    features: {
      lora: false,
      imageToVideo: true,
      framesToVideo: true,
      extendVideo: true,
      cameraControl: false, // Prompt only
      inpainting: false,
      negativePrompt: true,
    },
  },
  'veo-2': {
    id: 'veo-2',
    name: 'Google Veo 2',
    provider: 'google',
    features: {
      lora: false,
      imageToVideo: true,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: false,
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/ltx-video': {
    id: 'fal-ai/ltx-video',
    name: 'LTX Video',
    provider: 'fal',
    features: {
      lora: false, // Not yet supported in Fal API for LTX
      imageToVideo: true,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: false,
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/wan/v2.1/text-to-video': {
    id: 'fal-ai/wan/v2.1/text-to-video',
    name: 'Wan 2.1 T2V',
    provider: 'fal',
    features: {
      lora: false,
      imageToVideo: false,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: false,
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/wan/v2.1/image-to-video': {
    id: 'fal-ai/wan/v2.1/image-to-video',
    name: 'Wan 2.1 I2V',
    provider: 'fal',
    features: {
      lora: false,
      imageToVideo: true,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: false,
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/kling-video/v1/standard/text-to-video': {
    id: 'fal-ai/kling-video/v1/standard/text-to-video',
    name: 'Kling 1.0 T2V',
    provider: 'fal',
    features: {
      lora: false,
      imageToVideo: false,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: true, // Supported
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/kling-video/v1/standard/image-to-video': {
    id: 'fal-ai/kling-video/v1/standard/image-to-video',
    name: 'Kling 1.0 I2V',
    provider: 'fal',
    features: {
      lora: false,
      imageToVideo: true,
      framesToVideo: true, // Supports end_frame
      extendVideo: false,
      cameraControl: true,
      inpainting: false,
      negativePrompt: true,
    },
  },
  'fal-ai/minimax-video': {
    id: 'fal-ai/minimax-video',
    name: 'Minimax',
    provider: 'fal',
    features: {
      lora: false,
      imageToVideo: true,
      framesToVideo: false,
      extendVideo: false,
      cameraControl: false,
      inpainting: false,
      negativePrompt: false, // Minimax often ignores negatives
    },
  },
};

export function getModelCapabilities(modelId: string): ModelCapability | null {
  // Handle partial matches or aliases
  if (MODEL_CAPABILITIES[modelId]) return MODEL_CAPABILITIES[modelId];

  if (modelId.includes('veo')) return MODEL_CAPABILITIES['veo-3.1'];
  if (modelId.includes('ltx')) return MODEL_CAPABILITIES['fal-ai/ltx-video'];
  if (modelId.includes('kling'))
    return MODEL_CAPABILITIES['fal-ai/kling-video/v1/standard/image-to-video'];
  if (modelId.includes('wan')) return MODEL_CAPABILITIES['fal-ai/wan/v2.1/image-to-video'];
  if (modelId.includes('minimax')) return MODEL_CAPABILITIES['fal-ai/minimax-video'];

  return null;
}

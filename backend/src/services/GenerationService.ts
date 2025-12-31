import { OpenAIAdapter } from './generators/OpenAIAdapter';
import { CivitaiAdapter } from './generators/CivitaiAdapter';
import { FalAIAdapter } from './generators/FalAIAdapter';
import { ComfyUIAdapter } from './generators/ComfyUIAdapter';
import { ReplicateAdapter } from './generators/ReplicateAdapter';
import { TogetherAdapter } from './generators/TogetherAdapter';
import { HuggingFaceAdapter } from './generators/HuggingFaceAdapter';
import { BananaAdapter } from './generators/BananaAdapter';
import { GoogleVeoAdapter } from './generators/GoogleVeoAdapter';
import { WanVideoAdapter } from './generators/WanVideoAdapter';
import {
  GenerationProvider,
  GenerationOptions,
  GenerationResult,
} from './generators/GenerationProvider';

export type ProviderType =
  | 'fal'
  | 'comfy'
  | 'replicate'
  | 'together'
  | 'huggingface'
  | 'banana'
  | 'google'
  | 'openai'
  | 'civitai'
  | 'wan'
  | 'auto';

/**
 * Cost estimates (approximate):
 *
 * IMAGE GENERATION:
 * - ComfyUI (local): $0 (just electricity)
 * - HuggingFace Free: $0 (rate limited)
 * - Together Schnell Free: $0 (rate limited)
 * - Together Schnell: $0.0006
 * - Replicate FLUX Schnell: $0.003
 * - Fal FLUX Schnell: $0.003
 * - Banana (serverless): ~$0.01 (depends on model)
 * - OpenAI DALL-E 3: $0.04-0.08
 * - Google Imagen 3: ~$0.02
 *
 * VIDEO GENERATION:
 * - ComfyUI (local): $0
 * - Fal Wan 2.2: ~$0.05-0.15
 * - Fal LTX-Video: ~$0.03-0.08
 * - Replicate AnimateDiff: ~$0.05
 * - Banana (serverless): ~$0.10-0.30
 * - Google Veo 3.1: ~$0.10-0.25
 * - OpenAI Sora: TBD (limited access)
 */

interface ProviderConfig {
  type: ProviderType;
  name: string; // Display name
  priority: number; // Lower = try first
  costPerImage: number; // Approximate cost in USD
  costPerVideo: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  requiresApiKey: boolean;
  envVar?: string; // Environment variable to check
  models: {
    image: string[];
    video: string[];
  };
  category: 'local' | 'cloud'; // For UI grouping
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  comfy: {
    type: 'comfy',
    name: 'ComfyUI (Local)',
    priority: 1,
    costPerImage: 0,
    costPerVideo: 0,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: false,
    models: {
      image: ['sdxl', 'flux-dev', 'flux-schnell', 'sd15'],
      video: ['ltx-video', 'wan', 'animatediff'],
    },
    category: 'local',
  },
  together: {
    type: 'together',
    name: 'Together AI',
    priority: 2,
    costPerImage: 0.0006,
    costPerVideo: 999, // No video support
    supportsVideo: false,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'TOGETHER_API_KEY',
    models: {
      image: [
        'flux-schnell-free',
        'flux-schnell',
        'flux-dev',
        'sdxl',
        'realvis-xl',
        'realistic-vision-together',
        'dreamshaper-xl',
      ],
      video: [],
    },
    category: 'cloud',
  },
  huggingface: {
    type: 'huggingface',
    name: 'HuggingFace',
    priority: 3,
    costPerImage: 0,
    costPerVideo: 0.01,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: false, // Works without, just rate limited
    models: {
      image: ['sdxl', 'sd15', 'realistic-vision', 'dreamshaper'],
      video: ['text-to-video-ms'],
    },
    category: 'cloud',
  },
  replicate: {
    type: 'replicate',
    name: 'Replicate',
    priority: 4,
    costPerImage: 0.003,
    costPerVideo: 0.05,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'REPLICATE_API_TOKEN',
    models: {
      image: [
        'flux-schnell',
        'flux-dev',
        'sdxl',
        'kandinsky',
        'sdxl-nsfw',
        'realistic-vision',
        'juggernaut-xl',
        'deliberate-v6',
        'fofr/consistent-character',
      ],
      video: [
        'ltx-video',
        'animatediff',
        'wan-2.1-t2v-480p',
        'wan-2.1-t2v-720p',
        'wan-2.1-i2v-480p',
        'wan-2.1-i2v-720p',
        'wan-2.1-1.3b',
        'wan-2.2-t2v',
        'wan-2.2-i2v',
        'wan-2.2-t2v-fast',
        'wan-2.2-i2v-fast',
        'wan-2.5-t2v',
        'wan-2.5-i2v',
        'wan-2.5-t2v-fast',
        'wan-2.5-i2v-fast',
        'wan-video-1-3b-t2v',
        'wan-video-14b-t2v',
        'wan-video-14b-i2v-480p',
        'wan-video-14b-i2v-720p',
        'wan-video-2-2-t2v-5b',
        'wan-video-2-2-i2v-a14b',
        'wan-video-2-2-t2v-a14b',
        'wan-video-2-5-t2v',
        'wan-video-2-5-i2v',
      ],
    },
    category: 'cloud',
  },
  fal: {
    type: 'fal',
    name: 'Fal.ai',
    priority: 5,
    costPerImage: 0.003,
    costPerVideo: 0.08,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'FAL_KEY',
    models: {
      image: [
        'flux-schnell',
        'flux-dev',
        'flux-pro',
        'flux-1.1-ultra',
        'fal-ai/kling-image/o1',
        'fal-ai/flux-2-max', // User requested "Max"
        'fal-ai/flux-pro/v1.1-ultra',
        'fal-ai/nano-banana-pro/edit', // User requested
        'fal-ai/gpt-image-1.5/edit', // User requested
        'fal-ai/recraft-v3', // High quality vector/image
        'fal-ai/luma-photon', // High fidelity
        'fal-ai/ideogram/character',
        'fal-ai/flux-kontext/dev',
        'fal-ai/flux-kontext/pro',
        'fal-ai/ip-adapter-face-id',
      ],
      video: [
        'ltx-video',
        'wan-2.1',
        'wan-2.2',
        'fal-ai/wan/v2.2-a14b/image-to-video/lora', // Wan 2.2 with LoRA support
        'wan-2.5',
        'minimax-video',
      ],
    },
    category: 'cloud',
  },
  banana: {
    type: 'banana',
    name: 'Banana Dev',
    priority: 6,
    costPerImage: 0.01,
    costPerVideo: 0.15,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'BANANA_API_KEY',
    models: {
      image: ['custom-sdxl', 'custom-flux'],
      video: ['custom-ltx', 'custom-wan'],
    },
    category: 'cloud',
  },
  google: {
    type: 'google',
    name: 'Google Veo',
    priority: 7,
    costPerImage: 0.02,
    costPerVideo: 0.15,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'GOOGLE_AI_API_KEY',
    models: {
      image: ['imagen-3'],
      video: ['veo-2', 'veo-3', 'veo-3.1'],
    },
    category: 'cloud',
  },
  openai: {
    type: 'openai',
    name: 'OpenAI',
    priority: 8,
    costPerImage: 0.04,
    costPerVideo: 0.5, // Sora pricing TBD
    supportsVideo: true, // Sora when available
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'OPENAI_API_KEY',
    models: {
      image: ['dall-e-3', 'dall-e-2'],
      video: ['sora', 'sora-2-pro', 'sora-2'], // Added specific Sora versions
    },
    category: 'cloud',
  },
  civitai: {
    type: 'civitai',
    name: 'Civitai',
    priority: 4,
    costPerImage: 0,
    costPerVideo: 0,
    supportsVideo: true,
    supportsImage: true,
    requiresApiKey: true,
    envVar: 'CIVITAI_API_TOKEN',
    models: {
      image: [
        'auraflow',
        'chroma',
        'flux-1-d',
        'flux-1-s',
        'flux-1-krea',
        'flux-1-kontext',
        'flux-2-d',
        'hidream',
        'hunyuan-1',
        'illustrious',
        'kolors',
        'lumina',
        'noobai',
        'pixart-a',
        'pixart-e',
        'pony',
        'pony-v7',
        'qwen',
        'sd-1-4',
        'sd-1-5',
        'sd-1-5-lcm',
        'sd-1-5-hyper',
        'sd-2-0',
        'sd-2-1',
        'sdxl-1-0',
        'sdxl-lightning',
        'sdxl-hyper',
        'zimage-turbo',
      ],
      video: [
        'cogvideox',
        'hunyuan-video',
        'ltxv',
        'mochi',
        'wan-video-1-3b-t2v',
        'wan-video-14b-t2v',
        'wan-video-14b-i2v-480p',
        'wan-video-14b-i2v-720p',
        'wan-video-2-2-t2v-5b',
        'wan-video-2-2-i2v-a14b',
        'wan-video-2-2-t2v-a14b',
        'wan-video-2-5-t2v',
        'wan-video-2-5-i2v',
      ],
    },
    category: 'cloud',
  },
  wan: {
    type: 'wan',
    name: 'Wan Video (Fal)',
    priority: 4,
    costPerImage: 0,
    costPerVideo: 0.1,
    supportsVideo: true,
    supportsImage: false,
    requiresApiKey: true,
    envVar: 'FAL_KEY',
    models: {
      image: [],
      video: [
        'fal-ai/wan-2.1-t2v-1.3b',
        'fal-ai/wan-2.1-i2v-14b',
        'fal-ai/wan-video-2.2-animate-move',
      ],
    },
    category: 'cloud',
  },
}; // End PROVIDER_CONFIGS

export class GenerationService {
  private providers: Map<ProviderType, GenerationProvider> = new Map();
  private availableProviders: ProviderType[] = [];

  constructor(preferredProvider?: ProviderType) {
    this.initializeProviders();

    if (preferredProvider && preferredProvider !== 'auto') {
      // Move preferred provider to front if available
      const idx = this.availableProviders.indexOf(preferredProvider);
      if (idx > 0) {
        this.availableProviders.splice(idx, 1);
        this.availableProviders.unshift(preferredProvider);
      }
    }
  }

  /**
   * Analyze an image to get a caption/description (Logic: try Fal LLaVA first)
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string = 'Describe this character in detail'
  ): Promise<string> {
    // Prefer Fal
    const provider = this.providers.get('fal');
    if (provider && provider.analyzeImage) {
      return await provider.analyzeImage(imageUrl, prompt);
    }

    // Fallback or Error
    throw new Error('Analysis provider (Fal) not available or does not support analysis');
  }

  private initializeProviders() {
    // Check which providers are available based on environment
    const configs = Object.values(PROVIDER_CONFIGS).sort((a, b) => a.priority - b.priority);

    for (const config of configs) {
      if (config.requiresApiKey && config.envVar && !process.env[config.envVar]) {
        console.log(`Skipping ${config.type}: ${config.envVar} not set`);
        continue;
      }

      try {
        const provider = this.createProvider(config.type);
        this.providers.set(config.type, provider);
        this.availableProviders.push(config.type);
        console.log(`✓ ${config.name} provider available`);
      } catch (err) {
        console.log(`✗ ${config.name} provider failed to initialize`);
      }
    }

    if (this.availableProviders.length === 0) {
      console.warn('⚠️ No generation providers available! Set up at least one API key or ComfyUI.');
    }
  }

  private createProvider(type: ProviderType): GenerationProvider {
    switch (type) {
      case 'fal':
        return new FalAIAdapter();
      case 'comfy':
        return new ComfyUIAdapter();
      case 'replicate':
        return new ReplicateAdapter();
      case 'together':
        return new TogetherAdapter();
      case 'huggingface':
        return new HuggingFaceAdapter();
      case 'banana':
        return new BananaAdapter();
      case 'google':
        return new GoogleVeoAdapter();
      case 'openai':
        return new OpenAIAdapter();
      case 'civitai':
        return new CivitaiAdapter();
      case 'wan':
        return new WanVideoAdapter();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get the cheapest available provider for the given task
   */
  getCheapestProvider(forVideo: boolean = false): ProviderType | null {
    const sorted = [...this.availableProviders].sort((a, b) => {
      const configA = PROVIDER_CONFIGS[a];
      const configB = PROVIDER_CONFIGS[b];
      const costA = forVideo ? configA.costPerVideo : configA.costPerImage;
      const costB = forVideo ? configB.costPerVideo : configB.costPerImage;
      return costA - costB;
    });

    // Filter out providers that don't support video if needed
    if (forVideo) {
      const videoCapable = sorted.filter(p => PROVIDER_CONFIGS[p].supportsVideo);
      return videoCapable[0] || null;
    }

    return sorted[0] || null;
  }

  /**
   * Get all video-capable providers (for UI selector)
   */
  getVideoProviders(): Array<{ type: ProviderType; config: ProviderConfig; available: boolean }> {
    return Object.entries(PROVIDER_CONFIGS)
      .filter(([_, config]) => config.supportsVideo)
      .map(([type, config]) => ({
        type: type as ProviderType,
        config,
        available: this.availableProviders.includes(type as ProviderType),
      }));
  }

  /**
   * Get all image-capable providers (for UI selector)
   */
  getImageProviders(): Array<{ type: ProviderType; config: ProviderConfig; available: boolean }> {
    return Object.entries(PROVIDER_CONFIGS)
      .filter(([_, config]) => config.supportsImage)
      .map(([type, config]) => ({
        type: type as ProviderType,
        config,
        available: this.availableProviders.includes(type as ProviderType),
      }));
  }

  /**
   * Get cloud video providers only (excludes ComfyUI local)
   */
  getCloudVideoProviders(): Array<{
    type: ProviderType;
    config: ProviderConfig;
    available: boolean;
  }> {
    return Object.entries(PROVIDER_CONFIGS)
      .filter(([_, config]) => config.supportsVideo && config.category === 'cloud')
      .map(([type, config]) => ({
        type: type as ProviderType,
        config,
        available: this.availableProviders.includes(type as ProviderType),
      }));
  }

  /**
   * Generate image with automatic fallback
   */
  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    const errors: string[] = [];
    let providersToTry = [...this.availableProviders];

    // CRITICAL: If LoRAs are present, restrict to providers that support them
    // Supported providers:
    // - fal: fal-ai/flux-lora endpoint with uploaded safetensors
    // - comfy: Local ComfyUI with LoRA nodes
    // - civitai: LoRA syntax in prompt (<lora:name:strength>)
    // - replicate: Custom trained Flux LoRA models (mattyatplay-coder/*)
    if (options.loras && options.loras.length > 0) {
      const loraProviders: ProviderType[] = ['fal', 'comfy', 'civitai', 'replicate'];
      console.log(
        `LoRAs detected. Restricting to providers with LoRA support: ${loraProviders.join(', ')}`
      );
      providersToTry = providersToTry.filter(p => loraProviders.includes(p));

      if (providersToTry.length === 0) {
        return {
          id: Date.now().toString(),
          status: 'failed',
          error:
            'LoRAs are supported by Fal.ai, ComfyUI, Civitai, and Replicate, but none are available. Please check your configuration.',
        };
      }
    }

    // RESPECT EXPLICIT ENGINE SELECTION: If user chose 'comfy', use ComfyUI directly
    // This check comes BEFORE model routing to honor user's explicit choice
    const explicitEngine = (options as any).engine;
    if (explicitEngine === 'comfy' && this.providers.has('comfy')) {
      console.log(`User explicitly selected ComfyUI engine. Using ComfyUI directly...`);
      const provider = this.providers.get('comfy')!;
      try {
        const result = await provider.generateImage(options);
        if (result.status === 'succeeded') {
          console.log(`✓ ComfyUI succeeded`);
          return { ...result, provider: 'comfy' };
        }
        return {
          id: Date.now().toString(),
          status: 'failed',
          error: `comfy: ${result.error}`,
        };
      } catch (err: any) {
        return {
          id: Date.now().toString(),
          status: 'failed',
          error: `comfy: ${err.message}`,
        };
      }
    }

    // If a specific model is requested, route to the correct provider
    if (options.model) {
      // FORCE Replicate for Ideogram V2 and other inpainting models
      if (
        options.model === 'ideogram-ai/ideogram-v2' ||
        options.model === 'black-forest-labs/flux-fill-dev' ||
        options.model === 'lucataco/sdxl-inpainting'
      ) {
        console.log(`🎯 Forcing Replicate for ${options.model}`);
        const provider = this.providers.get('replicate');
        if (provider) {
          const result = await provider.generateImage(options);
          if (result.status === 'succeeded') {
            console.log(`✓ Replicate succeeded`);
            return { ...result, provider: 'replicate' };
          }
        }
      }

      let targetProvider = this.getProviderForModel(options.model, 'image');

      // Ensure target provider is allowed (e.g. supports LoRAs if needed)
      if (targetProvider && !providersToTry.includes(targetProvider)) {
        console.warn(
          `Model ${options.model} targets ${targetProvider}, but that provider is excluded (likely due to LoRA constraint). Falling back to allowed providers.`
        );
        targetProvider = null;
      }

      if (targetProvider) {
        const provider = this.providers.get(targetProvider);
        if (provider) {
          try {
            console.log(`Routing model "${options.model}" to ${targetProvider}...`);
            const result = await provider.generateImage(options);

            if (result.status === 'succeeded') {
              console.log(`✓ ${targetProvider} succeeded`);
              return { ...result, provider: targetProvider };
            }

            return {
              id: Date.now().toString(),
              status: 'failed',
              error: `${targetProvider}: ${result.error}`,
            };
          } catch (err: any) {
            return {
              id: Date.now().toString(),
              status: 'failed',
              error: `${targetProvider}: ${err.message}`,
            };
          }
        }
      } else {
        console.warn(
          `No provider found for model "${options.model}" (or provider excluded), trying allowed providers...`
        );
      }
    }

    // Fallback: Try allowed providers
    for (const providerType of providersToTry) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        console.log(`Trying ${providerType} for image generation...`);

        // Map model to something the provider understands
        const mappedModel = this.mapModelToProvider(options.model || '', providerType, 'image');
        const providerOptions = { ...options, model: mappedModel };

        if (options.model && !mappedModel) {
          console.log(
            `   > No direct mapping for ${options.model} on ${providerType}, using provider default.`
          );
        } else if (mappedModel && mappedModel !== options.model) {
          console.log(`   > Mapped ${options.model} -> ${mappedModel}`);
        }

        const result = await provider.generateImage(providerOptions);

        if (result.status === 'succeeded') {
          console.log(`✓ ${providerType} succeeded`);
          return { ...result, provider: providerType };
        }

        errors.push(`${providerType}: ${result.error}`);
      } catch (err: any) {
        errors.push(`${providerType}: ${err.message}`);
      }
    }

    return {
      id: Date.now().toString(),
      status: 'failed',
      error: `All providers failed:\n${errors.join('\n')}`,
    };
  }

  /**
   * Generate video with automatic fallback
   */
  async generateVideo(
    image: string | undefined,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const errors: string[] = [];

    // RESPECT EXPLICIT ENGINE SELECTION: If user chose 'comfy', use ComfyUI directly
    const explicitEngine = (options as any).engine;
    if (explicitEngine === 'comfy' && this.providers.has('comfy')) {
      console.log(`User explicitly selected ComfyUI engine for video. Using ComfyUI directly...`);
      const provider = this.providers.get('comfy')!;
      try {
        const result = await provider.generateVideo(image, options);
        if (result.status === 'succeeded') {
          console.log(`✓ ComfyUI video succeeded`);
          return { ...result, provider: 'comfy' };
        }
        return {
          id: Date.now().toString(),
          status: 'failed',
          error: `comfy: ${result.error}`,
        };
      } catch (err: any) {
        return {
          id: Date.now().toString(),
          status: 'failed',
          error: `comfy: ${err.message}`,
        };
      }
    }

    // If a specific model is requested, route to the correct provider
    if (options.model) {
      const targetProvider = this.getProviderForModel(options.model, 'video');

      if (targetProvider) {
        const provider = this.providers.get(targetProvider);
        if (provider) {
          try {
            console.log(`Routing model "${options.model}" to ${targetProvider}...`);
            const result = await provider.generateVideo(image, options);

            if (result.status === 'succeeded') {
              console.log(`✓ ${targetProvider} succeeded`);
              return { ...result, provider: targetProvider };
            }

            return {
              id: Date.now().toString(),
              status: 'failed',
              error: `${targetProvider}: ${result.error}`,
            };
          } catch (err: any) {
            return {
              id: Date.now().toString(),
              status: 'failed',
              error: `${targetProvider}: ${err.message}`,
            };
          }
        }
      } else {
        console.warn(
          `No provider found for model "${options.model}", checking for provider-specific prefixes...`
        );

        // Check for provider-specific prefixes to avoid blind fallback
        if (options.model.startsWith('fal-ai/')) {
          console.log(`Model "${options.model}" is a Fal.ai model. Routing to Fal...`);
          const provider = this.providers.get('fal');
          if (provider) {
            try {
              const result = await provider.generateVideo(image, options);
              if (result.status === 'succeeded') return { ...result, provider: 'fal' };
              return { id: Date.now().toString(), status: 'failed', error: `fal: ${result.error}` };
            } catch (err: any) {
              return { id: Date.now().toString(), status: 'failed', error: `fal: ${err.message}` };
            }
          }
        }
      }
    }

    // Fallback: Filter to video-capable providers
    // CRITICAL: Do NOT try all providers if the model was clearly meant for a specific one (e.g. fal-ai/...)
    // UNLESS we can map it.

    const videoProviders = this.availableProviders.filter(p => PROVIDER_CONFIGS[p].supportsVideo);

    for (const providerType of videoProviders) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        console.log(`Trying ${providerType} for video generation...`);

        // Map model to something the provider understands
        const mappedModel = this.mapModelToProvider(options.model || '', providerType, 'video');
        const providerOptions = { ...options, model: mappedModel };

        const result = await provider.generateVideo(image, providerOptions);

        if (result.status === 'succeeded') {
          console.log(`✓ ${providerType} succeeded`);
          return { ...result, provider: providerType };
        }

        errors.push(`${providerType}: ${result.error}`);
      } catch (err: any) {
        errors.push(`${providerType}: ${err.message}`);
      }
    }

    return {
      id: Date.now().toString(),
      status: 'failed',
      error: `All video providers failed:\n${errors.join('\n')}`,
    };
  }

  private mapModelToProvider(
    model: string,
    providerType: ProviderType,
    type: 'image' | 'video'
  ): string | undefined {
    // If the provider supports the model directly, return it
    const config = PROVIDER_CONFIGS[providerType];
    const supportedModels = type === 'video' ? config.models.video : config.models.image;
    if (supportedModels.includes(model)) {
      return model;
    }

    // Image Model Mapping
    if (type === 'image') {
      const isFluxDev = model.includes('flux') && (model.includes('dev') || model.includes('pro'));
      const isFluxSchnell = model.includes('flux') && model.includes('schnell');
      const isSDXL = model.includes('sdxl');

      switch (providerType) {
        case 'together':
          if (isFluxDev) return 'flux-dev';
          if (isFluxSchnell) return 'flux-schnell';
          if (isSDXL) return 'sdxl';
          return 'flux-schnell'; // Default fallback
        case 'replicate':
          // Preserve custom Replicate models (owner/model format) - pass through unchanged
          if (
            model.includes('/') &&
            !model.startsWith('fal-ai/') &&
            !model.startsWith('black-forest-labs/')
          ) {
            return model; // Custom trained model like mattyatplay-coder/angelicatraining
          }
          if (isFluxDev) return 'flux-dev';
          if (isFluxSchnell) return 'flux-schnell';
          if (isSDXL) return 'sdxl';
          return 'flux-schnell'; // Default fallback
        case 'openai':
          return 'dall-e-3';
        case 'huggingface':
          if (isSDXL) return 'sdxl';
          return 'sdxl';
        case 'google':
          return 'imagen-3';
        case 'civitai':
          if (isFluxDev || isFluxSchnell) return 'civitai-flux';
          return 'civitai-sdxl';
      }
    }

    // Video Model Mapping
    if (type === 'video') {
      // For video, if we don't match, return undefined to let provider use its default
      return undefined;
    }

    return undefined;
  }

  /**
   * Generate with a specific provider (no fallback)
   */
  async generateWithProvider(
    providerType: ProviderType,
    type: 'image' | 'video',
    options: GenerationOptions,
    sourceImage?: string
  ): Promise<GenerationResult> {
    const provider = this.providers.get(providerType);

    if (!provider) {
      return {
        id: Date.now().toString(),
        status: 'failed',
        error: `Provider ${providerType} is not available`,
      };
    }

    let result: GenerationResult;
    if (type === 'video') {
      result = await provider.generateVideo(sourceImage, options);
    } else {
      result = await provider.generateImage(options);
    }

    return { ...result, provider: providerType };
  }

  async checkStatus(id: string): Promise<GenerationResult> {
    // Try all providers - in practice you'd track which provider started the job
    for (const provider of this.providers.values()) {
      const result = await provider.checkStatus(id);
      if (result.status !== 'running') {
        return result;
      }
    }
    return { id, status: 'running' };
  }

  /**
   * Get cost estimate for a generation
   */
  estimateCost(providerType: ProviderType, type: 'image' | 'video', count: number = 1): number {
    const config = PROVIDER_CONFIGS[providerType];
    if (!config) return 0;
    const baseCost = type === 'video' ? config.costPerVideo : config.costPerImage;
    return baseCost * count;
  }

  /**
   * List available providers with their status
   */
  getAvailableProviders(): Array<{ type: ProviderType; config: ProviderConfig }> {
    return this.availableProviders.map(type => ({
      type,
      config: PROVIDER_CONFIGS[type],
    }));
  }

  /**
   * Get all provider configs (including unavailable)
   */
  getAllProviderConfigs(): Record<string, ProviderConfig> {
    return PROVIDER_CONFIGS;
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(type: ProviderType): boolean {
    return this.availableProviders.includes(type);
  }

  /**
   * Get models for a specific provider
   */
  getModelsForProvider(type: ProviderType, generationType: 'image' | 'video'): string[] {
    const config = PROVIDER_CONFIGS[type];
    if (!config) return [];
    return generationType === 'video' ? config.models.video : config.models.image;
  }

  /**
   * Get the provider that supports a specific model
   */
  getProviderForModel(modelId: string, generationType: 'image' | 'video'): ProviderType | null {
    // Map common model IDs to their providers
    const modelToProvider: Record<string, ProviderType> = {
      // OpenAI models
      'dall-e-3': 'openai',
      'dall-e-2': 'openai',
      sora: 'openai',
      'sora-2': 'openai',
      'sora-2-pro': 'openai',

      // Google models
      'imagen-3': 'google',
      'veo-2': 'google',
      'veo-3': 'google',
      'veo-3.1': 'google',

      // Flux models (Fal.ai has priority for flux)
      'flux-schnell': 'fal',
      'flux-dev': 'fal',
      'flux-pro': 'fal',
      'flux-1.1-ultra': 'fal',
      'flux-2': 'fal',
      'fal-ai/flux-2-max': 'fal',
      'fal-ai/flux-pro/v1.1-ultra': 'fal',
      'fal-ai/nano-banana-pro/edit': 'fal',
      'fal-ai/gpt-image-1.5/edit': 'fal',

      // NSFW-friendly models (Replicate - no content filters)
      'sdxl-nsfw': 'replicate',
      'realistic-vision': 'replicate',
      'juggernaut-xl': 'replicate',
      'deliberate-v6': 'replicate',

      // Together AI unrestricted models (cheap, no filters)
      'realvis-xl': 'together',
      'realistic-vision-together': 'together',
      'dreamshaper-xl': 'together',
      // Together AI models (new frontend IDs)
      'together/flux-schnell': 'together',
      'together/flux-dev': 'together',
      'together/dreamshaper': 'together',
      'together/hidream-full': 'together',
      'together/hidream-dev': 'together',
      'together/hidream-fast': 'together',
      'together/juggernaut-pro': 'together',
      'together/juggernaut-lightning': 'together',

      // Character Consistency Models
      'fal-ai/ideogram/character': 'fal',
      'fal-ai/flux-kontext/dev': 'fal',
      'fal-ai/flux-kontext/pro': 'fal',
      'fal-ai/ip-adapter-face-id': 'fal',
      'fofr/consistent-character': 'replicate',

      // Custom trained Replicate LoRA models (with version hash for specific version)
      'mattyatplay-coder/angelicatraining': 'replicate',
      'mattyatplay-coder/angelicatraining:d91b41c61d99d36b8649563cd79d8c2d83facd008199030c51952c5f13ea705a':
        'replicate',
      'mattyatplay-coder/angelica': 'replicate',
      'mattyatplay-coder/angelica:85fb8091d11fb467f36038529afdd2a5f34aff892861d27d580d1241549eb7bf':
        'replicate',

      // Image models - Civitai
      auraflow: 'civitai',
      chroma: 'civitai',
      'flux-1-d': 'civitai',
      // Civitai models (new frontend IDs)
      'civitai/sdxl': 'civitai',
      'civitai/pony': 'civitai',
      'civitai/realistic-vision': 'civitai',
      'civitai/flux-d': 'civitai',
      'civitai/wan-t2v': 'civitai',
      'civitai/wan-i2v': 'civitai',
      'flux-1-s': 'civitai',
      'flux-1-krea': 'civitai',
      'flux-1-kontext': 'civitai',
      'flux-2-d': 'civitai',
      hidream: 'civitai',
      'hunyuan-1': 'civitai',
      illustrious: 'civitai',
      kolors: 'civitai',
      lumina: 'civitai',
      noobai: 'civitai',
      'pixart-a': 'civitai',
      'pixart-e': 'civitai',
      pony: 'civitai',
      'pony-v7': 'civitai',
      qwen: 'civitai',
      'sd-1-4': 'civitai',
      'sd-1-5': 'civitai',
      'sd-1-5-lcm': 'civitai',
      'sd-1-5-hyper': 'civitai',
      'sd-2-0': 'civitai',
      'sd-2-1': 'civitai',
      'sdxl-1-0': 'civitai',
      'sdxl-lightning': 'civitai',
      'sdxl-hyper': 'civitai',
      'zimage-turbo': 'civitai',

      // Wan models (NEW)
      'wan-2.1-t2v-1.3b': 'wan',
      'wan-2.1-i2v-14b': 'wan',
      'wan-video-2.2-animate-move': 'wan',

      // Wan Video (Route to Wan Adapter)
      'fal-ai/wan-2.1-t2v-1.3b': 'wan',
      'fal-ai/wan-2.1-i2v-14b': 'wan',
      'fal-ai/wan-video-2.2-animate-move': 'wan',
      'wan-2.1': 'wan',
      'wan-2.2-animate': 'wan',

      // Fal Video (Others)
      'wan-2.2': 'fal',
      'wan-2.5': 'fal',
      'minimax-video': 'fal',
      'kling-video': 'fal',
      'fal-ai/kling-video/v2.6/pro/image-to-video': 'fal',
      'fal-ai/kling-video/v2.6/pro/text-to-video': 'fal',
      'fal-ai/wan/v2.2-a14b/image-to-video': 'fal',
      'fal-ai/wan-t2v': 'fal',
      'fal-ai/wan/v2.2-a14b/image-to-video/lora': 'fal', // Added mapping

      // Replicate Video (Wan variants)
      'wan-2.1-t2v-480p': 'replicate',
      'wan-2.1-t2v-720p': 'replicate',
      'wan-2.1-i2v-480p': 'replicate',
      'wan-2.1-i2v-720p': 'replicate',
      'wan-2.1-1.3b': 'replicate',
      'wan-2.2-t2v': 'replicate',
      'wan-2.2-i2v': 'replicate',
      'wan-2.2-t2v-fast': 'replicate',
      'wan-2.2-i2v-fast': 'replicate',
      'wan-2.5-t2v': 'replicate',
      'wan-2.5-i2v': 'replicate',
      'wan-2.5-t2v-fast': 'replicate',
      'wan-2.5-i2v-fast': 'replicate',
      'wan-video-1-3b-t2v': 'replicate',
      'wan-video-14b-t2v': 'replicate',
      'wan-video-14b-i2v-480p': 'replicate',
      'wan-video-14b-i2v-720p': 'replicate',
      'wan-video-2-2-t2v-5b': 'replicate',
      'wan-video-2-2-i2v-a14b': 'replicate',
      'wan-video-2-2-t2v-a14b': 'replicate',
      'wan-video-2-5-t2v': 'replicate',
      'wan-video-2-5-i2v': 'replicate',
      animatediff: 'replicate',
    };

    const preferredProvider = modelToProvider[modelId];

    // Check if preferred provider is available
    if (preferredProvider && this.availableProviders.includes(preferredProvider)) {
      return preferredProvider;
    }

    // Otherwise search through available providers for one that supports it
    for (const providerType of this.availableProviders) {
      const models = this.getModelsForProvider(providerType, generationType);
      if (models.includes(modelId)) {
        return providerType;
      }
    }

    return null;
  }
}

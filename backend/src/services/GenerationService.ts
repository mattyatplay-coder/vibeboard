import { OpenAIAdapter } from './generators/OpenAIAdapter';
import { CivitaiAdapter } from './generators/CivitaiAdapter';
import { FalAIAdapter } from './generators/FalAIAdapter';
import { ComfyUIAdapter } from './generators/ComfyUIAdapter';
import { ReplicateAdapter } from './generators/ReplicateAdapter';
import { TogetherAdapter } from './generators/TogetherAdapter';
import { HuggingFaceAdapter } from './generators/HuggingFaceAdapter';
import { BananaAdapter } from './generators/BananaAdapter';
import { GoogleVeoAdapter } from './generators/GoogleVeoAdapter';
import { GenerationProvider, GenerationOptions, GenerationResult } from './generators/GenerationProvider';

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
    name: string;           // Display name
    priority: number;       // Lower = try first
    costPerImage: number;   // Approximate cost in USD
    costPerVideo: number;
    supportsVideo: boolean;
    supportsImage: boolean;
    requiresApiKey: boolean;
    envVar?: string;        // Environment variable to check
    models: {
        image: string[];
        video: string[];
    };
    category: 'local' | 'cloud';  // For UI grouping
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
            video: ['ltx-video', 'wan', 'animatediff']
        },
        category: 'local'
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
            image: ['flux-schnell-free', 'flux-schnell', 'flux-dev', 'sdxl'],
            video: []
        },
        category: 'cloud'
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
            video: ['text-to-video-ms']
        },
        category: 'cloud'
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
            image: ['flux-schnell', 'flux-dev', 'sdxl', 'kandinsky'],
            video: ['ltx-video', 'animatediff', 'damo-text-to-video']
        },
        category: 'cloud'
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
            image: ['flux-schnell', 'flux-dev', 'flux-pro', 'flux-1.1-ultra'],
            video: ['ltx-video', 'wan-2.1', 'wan-2.2', 'minimax-video']
        },
        category: 'cloud'
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
            video: ['custom-ltx', 'custom-wan']
        },
        category: 'cloud'
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
            video: ['veo-2', 'veo-3', 'veo-3.1']
        },
        category: 'cloud'
    },
    openai: {
        type: 'openai',
        name: 'OpenAI',
        priority: 8,
        costPerImage: 0.04,
        costPerVideo: 0.50, // Sora pricing TBD
        supportsVideo: true, // Sora when available
        supportsImage: true,
        requiresApiKey: true,
        envVar: 'OPENAI_API_KEY',
        models: {
            image: ['dall-e-3', 'dall-e-2'],
            video: ['sora'] // When available
        },
        category: 'cloud'
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
            image: ['civitai-sdxl', 'civitai-flux'],
            video: ['civitai-kling', 'civitai-mochi']
        },
        category: 'cloud'
    }
};

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
            console.warn("⚠️ No generation providers available! Set up at least one API key or ComfyUI.");
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
                available: this.availableProviders.includes(type as ProviderType)
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
                available: this.availableProviders.includes(type as ProviderType)
            }));
    }

    /**
     * Get cloud video providers only (excludes ComfyUI local)
     */
    getCloudVideoProviders(): Array<{ type: ProviderType; config: ProviderConfig; available: boolean }> {
        return Object.entries(PROVIDER_CONFIGS)
            .filter(([_, config]) => config.supportsVideo && config.category === 'cloud')
            .map(([type, config]) => ({
                type: type as ProviderType,
                config,
                available: this.availableProviders.includes(type as ProviderType)
            }));
    }

    /**
     * Generate image with automatic fallback
     */
    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        const errors: string[] = [];

        // If a specific model is requested, route to the correct provider
        if (options.model) {
            // FORCE Replicate for Ideogram V2 and other inpainting models
            if (options.model === 'ideogram-ai/ideogram-v2' || options.model === 'black-forest-labs/flux-fill-dev' || options.model === 'lucataco/sdxl-inpainting') {
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

            const targetProvider = this.getProviderForModel(options.model, 'image');

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
                            error: `${targetProvider}: ${result.error}`
                        };
                    } catch (err: any) {
                        return {
                            id: Date.now().toString(),
                            status: 'failed',
                            error: `${targetProvider}: ${err.message}`
                        };
                    }
                }
            } else {
                console.warn(`No provider found for model "${options.model}", trying all providers...`);
            }
        }




        // Fallback: Try all providers
        for (const providerType of this.availableProviders) {
            const provider = this.providers.get(providerType);
            if (!provider) continue;

            try {
                console.log(`Trying ${providerType} for image generation...`);
                const result = await provider.generateImage(options);

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
            error: `All providers failed:\n${errors.join('\n')}`
        };
    }

    /**
     * Generate video with automatic fallback
     */
    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        const errors: string[] = [];

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
                            error: `${targetProvider}: ${result.error}`
                        };
                    } catch (err: any) {
                        return {
                            id: Date.now().toString(),
                            status: 'failed',
                            error: `${targetProvider}: ${err.message}`
                        };
                    }
                }
            } else {
                console.warn(`No provider found for model "${options.model}", trying all video providers...`);
            }
        }

        // Fallback: Filter to video-capable providers
        const videoProviders = this.availableProviders.filter(
            p => PROVIDER_CONFIGS[p].supportsVideo
        );

        for (const providerType of videoProviders) {
            const provider = this.providers.get(providerType);
            if (!provider) continue;

            try {
                console.log(`Trying ${providerType} for video generation...`);
                const result = await provider.generateVideo(image, options);

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
            error: `All video providers failed:\n${errors.join('\n')}`
        };
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
                error: `Provider ${providerType} is not available`
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
            config: PROVIDER_CONFIGS[type]
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
            'sora': 'openai',

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

            // Video models
            'ltx-video': 'fal',
            'wan-2.1': 'fal',
            'wan-2.2': 'fal',
            'minimax-video': 'fal',
            'kling-video': 'fal',
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

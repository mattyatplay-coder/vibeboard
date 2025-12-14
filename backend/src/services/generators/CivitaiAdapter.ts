import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';

/**
 * Civitai Adapter - Community models and video generation
 *
 * IMAGE MODELS:
 * - AuraFlow
 * - Chroma
 * - Flux: Flux.1 D, Flux.1 S, Flux.1 Krea, Flux.1 Kontext, Flux.2 D
 * - HiDream
 * - Hunyuan 1
 * - Illustrious
 * - Kolors
 * - Lumina
 * - NoobAI
 * - PixArt: PixArt a, PixArt E
 * - Pony: Pony, Pony V7
 * - Qwen
 * - Stable Diffusion: SD 1.4, SD 1.5, SD 1.5 LCM, SD 1.5 Hyper, SD 2.0, SD 2.1
 * - SDXL: SDXL 1.0, SDXL Lightning, SDXL Hyper
 * - ZImageTurbo
 *
 * VIDEO MODELS:
 * - CogVideoX
 * - Hunyuan Video
 * - LTXV
 * - Mochi
 * - Wan Video 1.3B t2v
 * - Wan Video 14B t2v
 * - Wan Video 14B i2v 480p
 * - Wan Video 14B i2v 720p
 * - Wan Video 2.2 TI2V-5B
 * - Wan Video 2.2 I2V-A14B
 * - Wan Video 2.2 T2V-A14B
 * - Wan Video 2.5 T2V
 * - Wan Video 2.5 I2V
 */
export class CivitaiAdapter implements GenerationProvider {
    private apiKey: string;
    private baseUrl: string = 'https://civitai.com/api/v1';

    // Model mappings for Civitai - Complete list from Civitai UI
    private readonly imageModelMap: Record<string, { baseModel: string; urn?: string }> = {
        // Flux models
        'flux-1-d': { baseModel: 'Flux.1 D' },
        'flux-1-s': { baseModel: 'Flux.1 S' },
        'flux-1-krea': { baseModel: 'Flux.1 Krea' },
        'flux-1-kontext': { baseModel: 'Flux.1 Kontext' },
        'flux-2-d': { baseModel: 'Flux.2 D' },
        // AuraFlow
        'auraflow': { baseModel: 'AuraFlow' },
        // Chroma
        'chroma': { baseModel: 'Chroma' },
        // HiDream
        'hidream': { baseModel: 'HiDream' },
        // Hunyuan
        'hunyuan-1': { baseModel: 'Hunyuan 1' },
        // Illustrious
        'illustrious': { baseModel: 'Illustrious' },
        // Kolors
        'kolors': { baseModel: 'Kolors' },
        // Lumina
        'lumina': { baseModel: 'Lumina' },
        // NoobAI
        'noobai': { baseModel: 'NoobAI' },
        // Other
        'other': { baseModel: 'Other' },
        // PixArt
        'pixart-a': { baseModel: 'PixArt a' },
        'pixart-e': { baseModel: 'PixArt E' },
        // Pony
        'pony': { baseModel: 'Pony' },
        'pony-v7': { baseModel: 'Pony V7' },
        // Qwen
        'qwen': { baseModel: 'Qwen' },
        // Stable Diffusion versions
        'sd-1-4': { baseModel: 'SD 1.4' },
        'sd-1-5': { baseModel: 'SD 1.5' },
        'sd-1-5-lcm': { baseModel: 'SD 1.5 LCM' },
        'sd-1-5-hyper': { baseModel: 'SD 1.5 Hyper' },
        'sd-2-0': { baseModel: 'SD 2.0' },
        'sd-2-1': { baseModel: 'SD 2.1' },
        // SDXL
        'sdxl-1-0': { baseModel: 'SDXL 1.0' },
        'sdxl-lightning': { baseModel: 'SDXL Lightning' },
        'sdxl-hyper': { baseModel: 'SDXL Hyper' },
        // ZImageTurbo
        'zimage-turbo': { baseModel: 'ZImageTurbo' },
    };

    // Video models - Complete list from Civitai UI
    private readonly videoModelMap: Record<string, string> = {
        // CogVideoX
        'cogvideox': 'CogVideoX',
        // Hunyuan Video
        'hunyuan-video': 'Hunyuan Video',
        // LTXV
        'ltxv': 'LTXV',
        // Mochi
        'mochi': 'Mochi',
        // Wan Video models (multiple variants)
        'wan-video-1-3b-t2v': 'Wan Video 1.3B t2v',
        'wan-video-14b-t2v': 'Wan Video 14B t2v',
        'wan-video-14b-i2v-480p': 'Wan Video 14B i2v 480p',
        'wan-video-14b-i2v-720p': 'Wan Video 14B i2v 720p',
        'wan-video-2-2-t2v-5b': 'Wan Video 2.2 TI2V-5B',
        'wan-video-2-2-i2v-a14b': 'Wan Video 2.2 I2V-A14B',
        'wan-video-2-2-t2v-a14b': 'Wan Video 2.2 T2V-A14B',
        'wan-video-2-5-t2v': 'Wan Video 2.5 T2V',
        'wan-video-2-5-i2v': 'Wan Video 2.5 I2V',
    };

    constructor() {
        this.apiKey = process.env.CIVITAI_API_TOKEN || '';
        if (!this.apiKey) {
            console.warn("WARNING: CIVITAI_API_TOKEN is not set. Civitai generations will fail.");
        }
    }

    private formatPrompt(prompt: string): string {
        // Civitai Best Practices: Subject -> Style -> Composition
        // We can't easily reorder user input without NLP, but we can append quality tags.

        let formatted = prompt.trim();

        // Append quality tags if not present
        const qualityTags = ["best quality", "masterpiece"];
        const missingTags = qualityTags.filter(tag => !formatted.toLowerCase().includes(tag));

        if (missingTags.length > 0) {
            formatted += `, ${missingTags.join(", ")}`;
        }

        return formatted;
    }

    private getDefaultNegativePrompt(): string {
        // Standard negative prompt for high quality generation
        // NOTE: Removed "nsfw" to allow unrestricted content generation
        return "lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]";
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            if (!this.apiKey) throw new Error("Civitai API key not configured");

            // Resolve model from our mapping or use as-is if it's a URN
            let baseModel = "Stable Diffusion XL";
            let modelUrn: string | undefined;

            if (options.model) {
                if (options.model.includes('urn:air')) {
                    // Direct URN passed
                    modelUrn = options.model;
                } else if (this.imageModelMap[options.model]) {
                    // Mapped model name
                    const mapping = this.imageModelMap[options.model];
                    baseModel = mapping.baseModel;
                    modelUrn = mapping.urn;
                } else {
                    // Use as baseModel directly
                    baseModel = options.model;
                }
            }

            console.log(`[Civitai] Using baseModel: ${baseModel}, URN: ${modelUrn || 'none'}`);

            // Handle LoRAs by appending to prompt (standard A1111/Civitai syntax)
            let finalPrompt = this.formatPrompt(options.prompt);
            if (options.loras && options.loras.length > 0) {
                const loraTags = options.loras.map(lora => `<lora:${lora.path}:${lora.strength}>`).join(" ");
                finalPrompt += ` ${loraTags}`;
            }

            const finalNegativePrompt = options.negativePrompt || this.getDefaultNegativePrompt();

            const payload: any = {
                baseModel: baseModel,
                params: {
                    prompt: finalPrompt,
                    negativePrompt: finalNegativePrompt,
                    cfgScale: options.guidanceScale || 7,
                    steps: options.steps || 25,
                    seed: options.seed,
                    width: options.width || 1024,
                    height: options.height || 1024,
                    clipSkip: 2,
                    quantity: options.count || 1,
                    sampler: options.sampler?.value || "Euler a",
                    scheduler: options.scheduler?.value
                },
                // Additional params for img2img if needed
                ...(options.sourceImages?.length ? {
                    image: options.sourceImages[0],
                    denoisingStrength: options.strength
                } : {})
            };

            // Add model URN if we have one
            if (modelUrn) {
                payload.model = modelUrn;
            }

            console.log("Sending to Civitai:", JSON.stringify(payload, null, 2));

            // 1. Create Generation Request
            const response = await axios.post(`${this.baseUrl}/generation/image`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const token = response.data.token; // Job token
            console.log("Civitai Job Token:", token);

            // 2. Poll for completion
            const images = await this.pollForCompletion(token);

            return {
                id: token,
                status: 'succeeded',
                outputs: images,
                seed: options.seed // Civitai might return the actual seed used
            };

        } catch (error: any) {
            console.error("Civitai generation failed:", error.response?.data || error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.response?.data?.error || error.message || "Unknown Civitai error"
            };
        }
    }

    private formatVideoPrompt(prompt: string): string {
        // Civitai Video Guide: Rich detail, clear camera movement, lighting, context.
        // We append video-specific quality tags to ensure better results.

        let formatted = prompt.trim();

        // Video specific quality tags
        const videoQualityTags = ["cinematic", "4k", "high quality", "smooth motion"];
        const missingTags = videoQualityTags.filter(tag => !formatted.toLowerCase().includes(tag));

        if (missingTags.length > 0) {
            formatted += `, ${missingTags.join(", ")}`;
        }

        return formatted;
    }

    private getDefaultVideoNegativePrompt(): string {
        // Video specific negative prompt to reduce common artifacts
        // NOTE: Removed "nsfw" to allow unrestricted content generation
        return "lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], flicker, jitter, morphing, distorted, shaky";
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        if (!this.apiKey) {
            throw new Error("Civitai API key not configured");
        }

        try {
            // Resolve video model from our mapping
            let videoModel = 'Kling'; // Default video model

            if (options.model) {
                if (this.videoModelMap[options.model]) {
                    videoModel = this.videoModelMap[options.model];
                } else {
                    // Use as-is if not in map
                    videoModel = options.model;
                }
            }

            console.log(`[Civitai] Using video model: ${videoModel}`);

            const finalPrompt = this.formatVideoPrompt(options.prompt);
            const finalNegativePrompt = options.negativePrompt || this.getDefaultVideoNegativePrompt();

            // Duration handling based on model type
            const durationSec = parseInt(String(options.duration || "5"), 10);
            let numFrames = 121; // Default 5 seconds at 24fps

            // Wan Video models use num_frames
            if (videoModel.includes('Wan Video')) {
                // Wan 2.5 models might support direct duration
                if (videoModel.includes('2.5')) {
                    numFrames = durationSec >= 8 ? 241 : 121; // 10s or 5s at 24fps
                    console.log(`[Civitai] Wan 2.5 numFrames set to: ${numFrames} (requested: ${options.duration})`);
                } else {
                    // Wan 2.1/2.2/14B models
                    numFrames = durationSec >= 8 ? 241 : 121;
                    console.log(`[Civitai] Wan numFrames set to: ${numFrames} (requested: ${options.duration})`);
                }
            } else if (videoModel.includes('LTXV')) {
                // LTX Video typically uses duration seconds
                numFrames = durationSec >= 8 ? 240 : 144; // ~10s or ~6s at 24fps
                console.log(`[Civitai] LTX numFrames set to: ${numFrames} (requested: ${options.duration})`);
            }

            const payload = {
                baseModel: videoModel,
                params: {
                    prompt: finalPrompt,
                    negativePrompt: finalNegativePrompt,
                    width: options.width || 1024,
                    height: options.height || 576, // 16:9 aspect ratio default for video
                    steps: options.steps || 30,
                    cfgScale: options.guidanceScale || 7,
                    seed: options.seed || -1,
                    quantity: 1,
                    numFrames: numFrames,
                    fps: 24,
                    // Pass source image for img2vid if provided
                    ...(image ? { image: image } : {})
                }
            };

            // Using video generation endpoint
            const response = await axios.post(`${this.baseUrl}/generation/video`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const jobToken = response.data.token;
            console.log(`Civitai video job started: ${jobToken}`);

            // Poll for completion
            const urls = await this.pollForCompletion(jobToken);

            return {
                id: jobToken,
                outputs: urls,
                provider: 'civitai',
                status: 'succeeded'
            };

        } catch (error: any) {
            console.error("Civitai video generation error:", error.response?.data || error.message);
            throw new Error(`Civitai video generation failed: ${error.message}`);
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        // Re-using poll logic or implementing a single check
        // For now, we rely on the polling inside generateImage/Video
        throw new Error("Method not implemented.");
    }

    private async pollForCompletion(token: string): Promise<string[]> {
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes (assuming 2s interval)
        const interval = 2000;

        while (attempts < maxAttempts) {
            try {
                const response = await axios.get(`${this.baseUrl}/generation/image/${token}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });

                const status = response.data.status; // e.g., 'Scheduled', 'Processing', 'Succeeded', 'Failed'

                if (status === 'Succeeded') {
                    const result = response.data.result;
                    const urls = result.map((item: any) => item.videoUrl || item.blobUrl || item.url);
                    return urls;
                } else if (status === 'Failed') {
                    throw new Error(`Civitai generation failed: ${JSON.stringify(response.data)}`);
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, interval));
                attempts++;
            } catch (error: any) {
                console.error("Error polling Civitai status:", error.message);
                // Don't throw immediately on poll error, retry
                await new Promise(resolve => setTimeout(resolve, interval));
                attempts++;
            }
        }

        throw new Error("Civitai generation timed out");
    }
}

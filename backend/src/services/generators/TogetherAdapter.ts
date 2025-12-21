import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Together AI Adapter
 * Cost: Very cheap! ~$0.0006 per image for FLUX Schnell
 *
 * Available models:
 * - black-forest-labs/FLUX.1-schnell-Free (FREE!)
 * - black-forest-labs/FLUX.1-schnell ($0.0006/image)
 * - black-forest-labs/FLUX.1-dev ($0.025/image)
 * - stabilityai/stable-diffusion-xl-base-1.0
 * - SG161222/RealVisXL_V4.0 (photorealistic, no filters)
 * - SG161222/Realistic_Vision_V6.0_B1_noVAE (photorealistic)
 * - Lykon/dreamshaper-xl-v2-turbo (artistic, fast)
 *
 * No censorship by default on most models!
 * NOTE: Together URLs are temporary short URLs that expire quickly, so we save images locally
 */
export class TogetherAdapter implements GenerationProvider {
    private apiKey: string;
    private baseUrl = 'https://api.together.xyz/v1';

    constructor() {
        this.apiKey = process.env.TOGETHER_API_KEY || '';
        if (!this.apiKey) {
            console.warn("WARNING: TOGETHER_API_KEY not set");
        }
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Model selection - default to free FLUX Schnell
            let model = options.model || 'black-forest-labs/FLUX.1-schnell-Free';
            
            // Map friendly names to Together model IDs
            const modelMap: Record<string, string> = {
                'flux-schnell-free': 'black-forest-labs/FLUX.1-schnell-Free',
                'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
                'flux-dev': 'black-forest-labs/FLUX.1-dev',
                'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
                // Unrestricted models (no content filters)
                'realvis-xl': 'SG161222/RealVisXL_V4.0',
                'realistic-vision-together': 'SG161222/Realistic_Vision_V6.0_B1_noVAE',
                'dreamshaper-xl': 'Lykon/dreamshaper-xl-v2-turbo',
            };

            model = modelMap[model] || model;

            const [width, height] = this.aspectRatioToDimensions(options.aspectRatio || '16:9');

            const payload: any = {
                model,
                prompt: options.prompt,
                width,
                height,
                n: options.count || 1,
                steps: options.steps || 4, // Schnell only needs 4 steps!
                response_format: 'url'
            };

            if (options.negativePrompt) {
                payload.negative_prompt = options.negativePrompt;
            }
            if (options.seed) {
                payload.seed = options.seed;
            }

            console.log("Together AI generation:", model);

            const response = await axios.post(
                `${this.baseUrl}/images/generations`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const tempUrls = response.data.data.map((img: any) => img.url);

            // Together URLs expire quickly, so download and save locally
            const outputs = await Promise.all(
                tempUrls.map((url: string) => this.downloadAndSaveImage(url, model))
            );

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs
            };

        } catch (error: any) {
            console.error("Together AI generation failed:", error.response?.data || error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        // Together doesn't have video models yet - fall back to error
        return {
            id: Date.now().toString(),
            status: 'failed',
            error: 'Together AI does not support video generation. Use Fal.ai or ComfyUI for video.'
        };
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        return { id, status: 'succeeded' };
    }

    private aspectRatioToDimensions(ratio: string): [number, number] {
        const ratios: Record<string, [number, number]> = {
            '16:9': [1440, 816],
            '9:16': [816, 1440],
            '1:1': [1024, 1024],
            '4:3': [1200, 896],
            '3:4': [896, 1200],
            '21:9': [1536, 640],
        };
        return ratios[ratio] || [1024, 1024];
    }

    /**
     * Download image from temporary URL and save to local uploads folder
     * Together URLs expire quickly, so we persist them locally
     */
    private async downloadAndSaveImage(url: string, model: string): Promise<string> {
        try {
            console.log(`[TogetherAdapter] Downloading image from Together...`);

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000,
            });

            const buffer = Buffer.from(response.data);
            console.log(`[TogetherAdapter] Downloaded ${buffer.length} bytes`);

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Determine extension from content-type or default to png
            const contentType = response.headers['content-type'] || 'image/png';
            const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';

            // Sanitize model name for filename
            const safeModelName = model.replace(/[^a-zA-Z0-9.-]/g, '-');

            // Save to file
            const filename = `together-${safeModelName}-${Date.now()}${ext}`;
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, buffer);

            console.log(`[TogetherAdapter] Image saved to: ${filepath}`);

            // Return the URL path that can be served statically
            return `/uploads/images/${filename}`;
        } catch (error: any) {
            console.error(`[TogetherAdapter] Failed to download image:`, error.message);
            // Fall back to original URL if download fails (better than nothing)
            return url;
        }
    }
}

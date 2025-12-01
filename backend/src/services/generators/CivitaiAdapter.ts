import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';

export class CivitaiAdapter implements GenerationProvider {
    private apiKey: string;
    private baseUrl: string = 'https://civitai.com/api/v1';

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
        return "nsfw, lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]";
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            if (!this.apiKey) throw new Error("Civitai API key not configured");

            // Civitai Generation API payload
            // Note: Civitai API structure might vary, using standard assumption based on their docs
            // Usually requires modelId or air (URN). 
            // Defaulting to a popular model if not specified, or mapping 'flux' to a known Civitai model URN if possible.
            // For now, let's use a generic payload and assume the user might pass a specific model URN in options.model
            // or we default to a safe general purpose model (e.g. Juggernaut XL or similar).

            // Example URN for Juggernaut XL: urn:air:sdxl:checkpoint:civitai:133005@357609
            const modelUrn = options.model && options.model.includes('urn:air') ? options.model : "urn:air:sdxl:checkpoint:civitai:133005@357609";

            // Handle LoRAs by appending to prompt (standard A1111/Civitai syntax)
            let finalPrompt = this.formatPrompt(options.prompt);
            if (options.loras && options.loras.length > 0) {
                const loraTags = options.loras.map(lora => `<lora:${lora.path}:${lora.strength}>`).join(" ");
                finalPrompt += ` ${loraTags}`;
            }

            const finalNegativePrompt = options.negativePrompt || this.getDefaultNegativePrompt();

            const payload = {
                baseModel: "SDXL", // Or "Flux" if supported
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
                    sampler: options.sampler?.value || "Euler a", // Default to a safe sampler
                    scheduler: options.scheduler?.value // Optional if provider distinguishes them
                },
                model: modelUrn,
                // Additional params for img2img if needed
                ...(options.sourceImages?.length ? {
                    image: options.sourceImages[0], // Civitai might expect base64 or URL
                    denoisingStrength: options.strength
                } : {})
            };

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
        return "nsfw, lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], flicker, jitter, morphing, distorted, shaky";
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        if (!this.apiKey) {
            throw new Error("Civitai API key not configured");
        }

        try {
            // Note: Civitai Video API details are not fully public. 
            // We are assuming a similar structure to image generation or a unified endpoint.
            // Users may need to update the 'model' URN to a specific video model (e.g., Kling, Mochi).
            const model = options.model || 'urn:air:kling:v1'; // Placeholder guess

            const finalPrompt = this.formatVideoPrompt(options.prompt);
            const finalNegativePrompt = options.negativePrompt || this.getDefaultVideoNegativePrompt();

            const payload = {
                model: model,
                params: {
                    prompt: finalPrompt,
                    negativePrompt: finalNegativePrompt,
                    width: options.width || 1024,
                    height: options.height || 576, // 16:9 aspect ratio default for video
                    steps: options.steps || 30,
                    cfgScale: options.guidanceScale || 7,
                    seed: options.seed || -1,
                    clipSkip: 2,
                    quantity: 1,
                    // Pass source image for img2vid if provided
                    ...(image ? { image: image } : {})
                }
            };

            // Using the same endpoint as image generation, assuming it handles video models too
            // or redirects based on the URN.
            const response = await axios.post(`${this.baseUrl}/generation/image`, payload, {
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

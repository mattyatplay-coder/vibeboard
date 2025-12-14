import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import { HfInference } from '@huggingface/inference';

/**
 * HuggingFace Inference API Adapter
 * Uses the official @huggingface/inference client.
 * 
 * Capabilities:
 * - Image Generation (Flux, SDXL, etc.)
 * - Background Removal (Image Segmentation)
 * - Image Captioning (Image to Text)
 */
export class HuggingFaceAdapter implements GenerationProvider {
    private hf: HfInference;
    private hasKey: boolean = false;

    constructor() {
        // Prefer HUGGINGFACE_API_TOKEN, fallback to KEY
        const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_KEY;
        if (!token) {
            console.warn("WARNING: HUGGINGFACE_API_TOKEN not set. Some API calls may be rate limited or restricted.");
        } else {
            this.hasKey = true;
        }
        this.hf = new HfInference(token);
    }

    /**
     * Required by GenerationProvider interface
     */
    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Default to Flux-Schnell if available, or SDXL
            const model = options.model || 'black-forest-labs/FLUX.1-schnell';

            console.log(`[HuggingFace] Generating image with ${model}`);

            const blob: any = await this.hf.textToImage({
                model: model,
                inputs: options.prompt,
                parameters: {
                    negative_prompt: options.negativePrompt,
                    num_inference_steps: options.steps,
                    guidance_scale: options.guidanceScale,
                    // seed: options.seed // Typed SDK might not support seed directly in parameters for all models
                }
            });

            // Convert Blob to Data URL
            const buffer = Buffer.from(await blob.arrayBuffer());
            const dataUrl = `data:${blob.type || 'image/png'};base64,${buffer.toString('base64')}`;

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: [dataUrl]
            };

        } catch (error: any) {
            console.error("[HuggingFace] Image generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Removes background using a HuggingFace model.
     * Tries to use the state-of-the-art Bria RMBG 2.0 or generic fallback.
     * Note: This usually requires a specific space or segmentation model.
     */
    async removeBackground(imageUrl: string, modelId: string = 'briaai/RMBG-1.4'): Promise<string> {
        try {
            console.log(`[HuggingFace] Removing background using ${modelId} for ${imageUrl}`);

            // Fetch the image
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            // Use the imageSegmentation task
            // Note: Standard output is an array of masks { label, mask: base64 } or similar
            // This is NOT a direct "remove background" result like Fal.
            // We would need to composite it. 
            // This method serves as a placeholder for when we want to implement the compositing logic.
            // For now, we return the original URL but warn it's not fully implemented.

            console.warn("[HuggingFace] removeBackground via Inference API returns masks, not the final image yet. Using Fal is recommended.");
            return imageUrl;

        } catch (error: any) {
            console.error(`[HuggingFace] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generates a caption using a HuggingFace model.
     * e.g. Salesforce/blip-image-captioning-large or NLPConnect/vit-gpt2
     */
    async generateCaption(imageUrl: string, modelId: string = 'Salesforce/blip-image-captioning-large'): Promise<string> {
        try {
            console.log(`[HuggingFace] Generating caption using ${modelId}`);

            // Standard fetch if url is remote
            const response = await fetch(imageUrl);
            const blob = await response.blob();

            const result = await this.hf.imageToText({
                data: blob,
                model: modelId
            });

            // Result is typically { generated_text: string } or array
            // @ts-ignore
            if (result && result.generated_text) return result.generated_text;
            // @ts-ignore
            if (Array.isArray(result) && result[0]?.generated_text) return result[0].generated_text;

            return "Caption generation failed";
        } catch (error: any) {
            console.error(`[HuggingFace] Caption error: ${error.message}`);
            throw error;
        }
    }

    // Stub for video, rarely used via HF Inference yet due to timeouts
    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        return { id: 'error', status: 'failed', error: 'Video generation not fully implemented for HF Inference' };
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        return { id, status: 'succeeded' };
    }
}

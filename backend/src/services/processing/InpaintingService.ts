import * as fal from "@fal-ai/serverless-client";
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// NOTE: Using return_data_url: true to get images as base64 data URIs directly.
// This avoids an extra fetch to Fal's CDN and keeps images out of request history.
// HOWEVER, this increases the response payload size significantly (base64 is ~33% larger).
// If performance suffers (slow responses, memory issues), switch back to URL mode:
//   1. Remove return_data_url: true from all API calls
//   2. Change processInpainting return type back to Promise<string>
//   3. Return result.images[0].url instead of converting to Buffer
//   4. Update controller to fetch from URL again

// Ensure Fal is configured
if (process.env.FAL_KEY) {
    fal.config({
        credentials: process.env.FAL_KEY
    });
} else {
    console.warn("WARNING: FAL_KEY environment variable is not set.");
}

export type InpaintingModel = 'fast' | 'quality' | 'premium';

interface InpaintingModelConfig {
    id: string;
    name: string;
    description: string;
    cost: string;
    inputFormat: 'object-removal' | 'flux-lora' | 'flux-general' | 'flux-pro-fill';
}

const INPAINTING_MODELS: Record<InpaintingModel, InpaintingModelConfig> = {
    fast: {
        id: 'fal-ai/object-removal/mask',
        name: 'Fast (Object Removal)',
        description: 'Quick removal, basic quality',
        cost: '~$0.01',
        inputFormat: 'object-removal'
    },
    quality: {
        // NOTE: Using flux-general/inpainting instead of flux-lora/inpainting
        // because flux-general supports negative_prompt parameter
        id: 'fal-ai/flux-general/inpainting',
        name: 'Quality (FLUX General Inpaint)',
        description: 'Good quality, supports negative prompts',
        cost: '~$0.02',
        inputFormat: 'flux-general'
    },
    premium: {
        // NOTE: Juggernaut flux-lora does NOT support negative_prompt
        // Consider switching to flux-general if negative prompts are needed
        id: 'rundiffusion-fal/juggernaut-flux-lora/inpainting',
        name: 'Premium (Juggernaut FLUX)',
        description: 'Best quality, sharper details',
        cost: '~$0.03',
        inputFormat: 'flux-lora'
    }
};

export class InpaintingService {

    /**
     * Get available inpainting models for UI display
     */
    getAvailableModels(): { key: InpaintingModel; config: InpaintingModelConfig }[] {
        return Object.entries(INPAINTING_MODELS).map(([key, config]) => ({
            key: key as InpaintingModel,
            config
        }));
    }

    /**
     * Performs "Magic Eraser" / Object Removal using selected model.
     *
     * @param imageBuffer - Original image
     * @param maskBuffer - Black and white mask (White = areas to remove)
     * @param prompt - Optional prompt for context
     * @param modelType - Which quality tier to use
     * @param strength - How much to replace vs blend (0.5-1.0)
     * @param inferenceSteps - Number of denoising iterations (higher = more refined)
     * @param guidanceScale - How strictly to follow the prompt (CFG scale)
     * @param negativePrompt - What to avoid generating
     * @param maskExpansion - Pixels to expand/dilate the mask (helps prevent edge artifacts/ghosting)
     * @returns Buffer containing the result image
     */
    async processInpainting(
        imageBuffer: Buffer,
        maskBuffer: Buffer,
        prompt: string = "clean skin, high quality, natural texture",
        modelType: InpaintingModel = 'quality',
        strength: number = 0.95,
        inferenceSteps: number = 28,
        guidanceScale: number = 3.5,
        negativePrompt?: string,
        maskExpansion: number = 15  // Default 15px expansion to catch edge artifacts
    ): Promise<Buffer> { // Returns image buffer directly

        const modelConfig = INPAINTING_MODELS[modelType];
        if (!modelConfig) {
            throw new Error(`Unknown model type: ${modelType}`);
        }

        try {
            // Debug: Save input files locally to inspect
            const debugDir = '/tmp/inpainting-debug';
            if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
            const timestamp = Date.now();
            fs.writeFileSync(path.join(debugDir, `${timestamp}-input.png`), imageBuffer);
            fs.writeFileSync(path.join(debugDir, `${timestamp}-mask-original.png`), maskBuffer);

            // Expand/dilate the mask to catch edge artifacts and prevent ghosting
            // This uses a blur + threshold technique to grow the white areas
            let expandedMaskBuffer = maskBuffer;
            if (maskExpansion > 0) {
                console.log(`[Inpainting] Expanding mask by ${maskExpansion}px to prevent ghosting...`);

                // Get mask dimensions
                const maskMetadata = await sharp(maskBuffer).metadata();
                const width = maskMetadata.width || 512;
                const height = maskMetadata.height || 512;

                // Dilate mask using blur + threshold technique:
                // 1. Blur the mask (spreads white pixels outward)
                // 2. Threshold back to binary (anything > 10% becomes fully white)
                // The sigma controls how far the dilation extends
                const sigma = maskExpansion / 2;  // Blur sigma roughly half the desired expansion

                expandedMaskBuffer = await sharp(maskBuffer)
                    .greyscale()  // Ensure single channel
                    .blur(sigma)  // Spread the white areas
                    .threshold(25)  // Convert back to binary (10% threshold = 25/255)
                    .png()
                    .toBuffer();

                fs.writeFileSync(path.join(debugDir, `${timestamp}-mask-expanded.png`), expandedMaskBuffer);
                console.log(`[Inpainting] Mask expanded: ${maskBuffer.length} -> ${expandedMaskBuffer.length} bytes`);
            }

            fs.writeFileSync(path.join(debugDir, `${timestamp}-mask.png`), expandedMaskBuffer);
            console.log(`[Inpainting] Debug files saved to ${debugDir}/${timestamp}-*.png`);

            // 1. Upload buffers to Fal Storage
            const imageBlob = new Blob([imageBuffer as any], { type: 'image/png' });
            const maskBlob = new Blob([expandedMaskBuffer as any], { type: 'image/png' });

            const imageUrl = await fal.storage.upload(imageBlob);
            const maskUrl = await fal.storage.upload(maskBlob);

            console.log(`[Inpainting] Using model: ${modelConfig.name} (${modelConfig.id})`);
            console.log(`[Inpainting] Uploaded assets:`);
            console.log(`  Image: ${imageUrl}`);
            console.log(`  Mask: ${maskUrl}`);

            let result: any;

            if (modelConfig.inputFormat === 'object-removal') {
                // Object Removal API format
                console.log(`[Inpainting] Submitting to object-removal model`);
                result = await fal.subscribe(modelConfig.id, {
                    input: {
                        image_url: imageUrl,
                        mask_url: maskUrl,
                        model: "best_quality",
                        mask_expansion: 10,
                        return_data_url: true  // Return data URI directly
                    },
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === 'IN_PROGRESS') {
                            update.logs?.map((log) => console.log(log.message));
                        }
                    },
                });
            } else if (modelConfig.inputFormat === 'flux-general') {
                // FLUX General Inpainting - supports ALL parameters including negative_prompt
                // Generate random seed to ensure different results each call
                const seed = Math.floor(Math.random() * 2147483647);

                console.log(`[Inpainting] Submitting to FLUX General inpainting model:`);
                console.log(`  Prompt: "${prompt}"`);
                console.log(`  Strength: ${strength}, Steps: ${inferenceSteps}, Guidance: ${guidanceScale}`);
                console.log(`  Seed: ${seed}`);
                if (negativePrompt) console.log(`  Negative Prompt: "${negativePrompt}"`);

                const input: any = {
                    image_url: imageUrl,
                    mask_url: maskUrl,
                    prompt: prompt,
                    num_inference_steps: inferenceSteps,
                    guidance_scale: guidanceScale,
                    strength: strength,
                    seed: seed,  // Random seed for varied results
                    num_images: 1,
                    output_format: "png",
                    enable_safety_checker: false,
                    return_data_url: true
                };

                // Add negative prompt if provided (flux-general DOES support this)
                if (negativePrompt && negativePrompt.trim()) {
                    input.negative_prompt = negativePrompt;
                }

                result = await fal.subscribe(modelConfig.id, {
                    input,
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === 'IN_PROGRESS') {
                            update.logs?.map((log) => console.log(log.message));
                        }
                    },
                });
            } else if (modelConfig.inputFormat === 'flux-lora') {
                // FLUX LoRA Inpainting (Juggernaut) - does NOT support negative_prompt
                // Generate random seed to ensure different results each call
                const seed = Math.floor(Math.random() * 2147483647);

                console.log(`[Inpainting] Submitting to FLUX LoRA inpainting model:`);
                console.log(`  Prompt: "${prompt}"`);
                console.log(`  Strength: ${strength}, Steps: ${inferenceSteps}, Guidance: ${guidanceScale}`);
                console.log(`  Seed: ${seed}`);
                if (negativePrompt) console.log(`  WARNING: negative_prompt ignored (not supported by flux-lora)`);

                const input: any = {
                    image_url: imageUrl,
                    mask_url: maskUrl,
                    prompt: prompt,
                    num_inference_steps: inferenceSteps,
                    guidance_scale: guidanceScale,
                    strength: strength,
                    seed: seed,  // Random seed for varied results
                    num_images: 1,
                    output_format: "png",
                    enable_safety_checker: false,
                    return_data_url: true
                };

                // NOTE: flux-lora does NOT support negative_prompt - it will be ignored

                result = await fal.subscribe(modelConfig.id, {
                    input,
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === 'IN_PROGRESS') {
                            update.logs?.map((log) => console.log(log.message));
                        }
                    },
                });
            } else if (modelConfig.inputFormat === 'flux-pro-fill') {
                // FLUX Pro Fill API format (simpler, no strength/steps)
                console.log(`[Inpainting] Submitting to FLUX Pro Fill model with prompt: "${prompt}"`);
                result = await fal.subscribe(modelConfig.id, {
                    input: {
                        image_url: imageUrl,
                        mask_url: maskUrl,
                        prompt: prompt,
                        num_images: 1,
                        output_format: "png",
                        safety_tolerance: 6,
                        return_data_url: true  // Return data URI directly
                    },
                    logs: true,
                    onQueueUpdate: (update) => {
                        if (update.status === 'IN_PROGRESS') {
                            update.logs?.map((log) => console.log(log.message));
                        }
                    },
                });
            } else {
                // Fallback - should not reach here
                throw new Error(`Unknown input format: ${modelConfig.inputFormat}`);
            }

            console.log(`[Inpainting] Job finished.`);

            // 3. Extract the data URI and convert to Buffer
            let dataUri: string | undefined;
            if (result.images && result.images.length > 0) {
                dataUri = result.images[0].url;
            } else if (result.image?.url) {
                dataUri = result.image.url;
            }

            if (!dataUri) {
                throw new Error("No image returned from inpainting service");
            }

            // Handle both data URIs and regular URLs
            if (dataUri.startsWith('data:')) {
                // Extract base64 from data URI: data:image/png;base64,iVBORw0...
                const base64Data = dataUri.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                console.log(`[Inpainting] Converted data URI to buffer: ${buffer.length} bytes`);
                return buffer;
            } else {
                // Fallback: fetch from URL if not a data URI
                console.log(`[Inpainting] Fetching from URL: ${dataUri}`);
                const response = await fetch(dataUri);
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }

        } catch (error: any) {
            console.error("[Inpainting] Error:", error);
            if (error.body?.detail) {
                console.error("[Inpainting] Validation Details:", JSON.stringify(error.body.detail, null, 2));
            }
            throw error;
        }
    }
}

export const inpaintingService = new InpaintingService();

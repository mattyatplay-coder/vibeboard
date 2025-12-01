import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import fs from 'fs';
import path from 'path';
import Replicate from 'replicate';

/**
 * Replicate Adapter - Access to 100s of models
 * Cost: Pay-per-use, often cheaper than Fal for certain models
 * Many open models available including uncensored ones
 * 
 * Popular models:
 * - stability-ai/sdxl (image)
 * - black-forest-labs/flux-schnell (image, fast)
 * - black-forest-labs/flux-dev (image, quality)
 * - lucataco/animate-diff (video)
 * - cjwbw/damo-text-to-video (video)
 * - fofr/ltx-video (video)
 */
export class ReplicateAdapter implements GenerationProvider {
    private replicate: Replicate;

    constructor() {
        if (!process.env.REPLICATE_API_TOKEN) {
            console.warn("WARNING: REPLICATE_API_TOKEN not set");
        }
        this.replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN
        });
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Select model based on options
            let model = options.model || "black-forest-labs/flux-schnell";

            // Map model names to Replicate versions
            const modelMap: Record<string, string> = {
                'flux-schnell': 'black-forest-labs/flux-schnell',
                'flux-dev': 'black-forest-labs/flux-dev',
                'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
                'kandinsky': 'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8ac01a8b0c3c0a6c6a4c1a2a4b3b5c6d7e8f9',
            };

            const input: any = {
                prompt: options.prompt,
                num_outputs: options.count || 1,
                disable_safety_checker: true, // For uncensored generation
            };

            // Handle INPAINTING - use FLUX.1 Fill (professional-grade inpainting)
            if (options.maskUrl) {
                model = "black-forest-labs/flux-fill-dev"; // Ensure model is set for inpainting

                // Resolve local paths
                const sourcePath = await this.resolveLocalPath(options.sourceImages?.[0]);
                const maskPath = await this.resolveLocalPath(options.maskUrl);

                if (sourcePath && maskPath) {
                    // Create a "punched out" image where the mask is transparent
                    // This ensures the model CANNOT see the original tattoo pixels
                    const sharp = require('sharp');
                    const outputPath = path.join(path.dirname(sourcePath), `masked-${path.basename(sourcePath)}.png`);

                    await sharp(sourcePath)
                        .composite([{ input: maskPath, blend: 'dest-out' }]) // Use mask to make source transparent
                        .toFile(outputPath);

                    // Convert to Data URL
                    const punchedBuffer = fs.readFileSync(outputPath);
                    input.image = `data:image/png;base64,${punchedBuffer.toString('base64')}`;

                    // FLUX Fill uses alpha channel as mask if present, so we don't strictly need input.mask
                    // But keeping it explicitly might be safer for some API versions. 
                    // Let's try sending ONLY the image with alpha first, as per docs.
                    // "If the image has an alpha channel, the alpha channel will be used as the mask."
                    delete input.mask;

                    console.log("Applied destructive masking: Original pixels removed under mask.");
                } else {
                    // Fallback to standard behavior if local resolution fails
                    input.image = await this.resolveLocalUrlToDataUrl(options.sourceImages?.[0]);
                    input.mask = await this.resolveLocalUrlToDataUrl(options.maskUrl);
                }

                // Preserve width/height to maintain resolution
                if (options.width) input.width = options.width;
                if (options.height) input.height = options.height;

                // FLUX Fill parameters
                // Map 'strength' to 'prompt_strength' if provided (default 0.8 in API)
                if (options.strength !== undefined) {
                    input.prompt_strength = options.strength;
                }

                // Use user's guidance scale or default to 3.5 (standard for FLUX)
                // 30 was likely too high and causing artifacts/failures
                input.guidance_scale = options.guidanceScale || 3.5;
                input.num_inference_steps = options.steps || 50;

                // Only enhance prompt if it's empty, very short, or generic
                // FLUX Fill ignores negative prompts, so we MUST provide a positive description
                if (!input.prompt || input.prompt.length < 5 || input.prompt === "inpaint this area") {
                    input.prompt = "clean skin, bare skin, unblemished, smooth natural skin texture, no ink, soft lighting";
                    console.log("Auto-enhanced prompt for tattoo removal");
                }

                input.output_format = "png";
                input.output_quality = 100;
                console.log(`INPAINTING MODE: Using FLUX.1 Fill with Destructive Masking`);
            }
            // Handle image-to-image
            else if (options.sourceImages?.length) {
                input.image = await this.resolveLocalUrlToDataUrl(options.sourceImages[0]);
                if (options.strength) input.prompt_strength = options.strength;
            }

            // Update resolvedModel AFTER potential model change
            const resolvedModel = modelMap[model] || model;
            console.log("Replicate generation:", resolvedModel);

            const output = await this.replicate.run(resolvedModel as `${string}/${string}`, { input });

            console.log("Replicate raw output type:", typeof output);

            // Handle different output formats
            let outputs: string[] = [];

            const extractUrl = async (item: any): Promise<string> => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                    if ('url' in item && typeof item.url === 'string') return item.url;

                    // Handle ReadableStream (common with FLUX models)
                    if (item instanceof ReadableStream || item.constructor.name === 'ReadableStream') {
                        console.log("Processing ReadableStream output...");
                        try {
                            const reader = item.getReader();
                            const chunks: Uint8Array[] = [];
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                if (value) chunks.push(value);
                                // console.log(`Received chunk of size: ${value?.length}`);
                            }

                            // Combine chunks into a buffer
                            const buffer = Buffer.concat(chunks);
                            console.log("Stream content length (bytes):", buffer.length);

                            // Check if it's a URL string (text)
                            const textPreview = buffer.subarray(0, 100).toString('utf-8');
                            if (textPreview.startsWith('http')) {
                                console.log("Stream contained URL:", textPreview);
                                return buffer.toString('utf-8');
                            }

                            // It's binary data (image). Save to uploads.
                            console.log("Stream contained binary data. Saving to uploads...");
                            const fs = require('fs');
                            const path = require('path');
                            const crypto = require('crypto');

                            const uploadsDir = path.join(process.cwd(), 'uploads');
                            if (!fs.existsSync(uploadsDir)) {
                                fs.mkdirSync(uploadsDir, { recursive: true });
                            }

                            const filename = `flux-fill-${crypto.randomUUID()}.png`; // We requested PNG output
                            const filepath = path.join(uploadsDir, filename);

                            fs.writeFileSync(filepath, buffer);
                            console.log("Saved stream to:", filepath);

                            // Return the relative URL that the frontend can access
                            // Assuming backend serves /uploads statically
                            const fileUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
                            return fileUrl;

                        } catch (e) {
                            console.error("Error reading stream:", e);
                            return '';
                        }
                    }
                }
                console.log("Item was not a stream or URL object:", typeof item, item);
                return String(item);
            };

            // Wait for all outputs to resolve (in case of streams)
            const resolvedOutputs = await Promise.all(
                (Array.isArray(output) ? output : [output]).map(extractUrl)
            );

            // Filter out empty strings
            outputs = resolvedOutputs.filter(url => url && url.length > 0);

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: outputs,
                provider: 'replicate'
            };
        } catch (error: any) {
            console.error("Replicate generation failed:", error);
            throw error;
        }
    }

    private async resolveLocalPath(url: string | undefined): Promise<string | undefined> {
        if (!url) return undefined;
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            const fs = require('fs');
            const path = require('path');
            const { URL } = require('url');
            try {
                const parsedUrl = new URL(url);
                const relativePath = parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname.slice(1) : parsedUrl.pathname;
                const filePath = path.join(process.cwd(), relativePath);
                if (fs.existsSync(filePath)) {
                    return filePath;
                }
            } catch (e) {
                console.error("Error resolving local path:", e);
            }
        }
        return undefined;
    }

    private async resolveLocalUrlToDataUrl(url: string | undefined): Promise<string | undefined> {
        if (!url) return undefined;

        // If it's already a data URL, return as is
        if (url.startsWith('data:')) return url;

        // Check if it's a localhost URL
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            console.log("Detected localhost URL in input, converting to Data URL:", url);
            try {
                const fs = require('fs');
                const path = require('path');
                const { URL } = require('url');

                const parsedUrl = new URL(url);
                // Remove leading slash from pathname if present to join correctly
                const relativePath = parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname.slice(1) : parsedUrl.pathname;

                // Assuming the URL path maps to the backend root (e.g. /uploads/...)
                // We need to find where the file actually is.
                // Based on previous steps, uploads are in backend/uploads
                // And the URL is http://localhost:3001/uploads/filename

                const filePath = path.join(process.cwd(), relativePath);

                if (fs.existsSync(filePath)) {
                    const buffer = fs.readFileSync(filePath);
                    const ext = path.extname(filePath).toLowerCase().replace('.', '');
                    const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
                    const base64 = buffer.toString('base64');
                    return `data:${mimeType};base64,${base64}`;
                } else {
                    console.warn("Local file not found for URL:", url, "at path:", filePath);
                    // Fallback: try to fetch it if it's a valid URL but file not found (maybe served from elsewhere)
                    // But for now, return original and hope for best, or let it fail.
                }
            } catch (e) {
                console.error("Error resolving local URL to Data URL:", e);
            }
        }

        return url;
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            let model = options.model || (image ? 'fofr/ltx-video' : 'cjwbw/damo-text-to-video');

            const input: any = {
                prompt: options.prompt,
            };

            if (image) {
                input.image = image;
            }

            if (options.negativePrompt) input.negative_prompt = options.negativePrompt;

            console.log("Replicate video generation:", model);

            const output = await this.replicate.run(model as `${string}/${string}`, { input });

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: Array.isArray(output) ? output : [(output as unknown) as string]
            };

        } catch (error: any) {
            console.error("Replicate video generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        // Replicate.run() is synchronous, so this is mainly for async predictions
        return { id, status: 'succeeded' };
    }

    private aspectRatioToDimensions(ratio: string): [number, number] {
        const ratios: Record<string, [number, number]> = {
            '16:9': [1344, 768],
            '9:16': [768, 1344],
            '1:1': [1024, 1024],
            '4:3': [1152, 896],
            '3:4': [896, 1152],
            '21:9': [1536, 640],
        };
        return ratios[ratio] || [1024, 1024];
    }
}

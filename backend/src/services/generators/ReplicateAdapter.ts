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
 * - lucataco/sdxl (image, no safety filter)
 * - lucataco/animate-diff (video)
 * - cjwbw/damo-text-to-video (video)
 * - fofr/ltx-video (video)
 *
 * NSFW-capable models (no content filter):
 * - lucataco/sdxl-nsfw
 * - lucataco/realistic-vision-v5.1
 * - prompthero/openjourney
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
                // Standard models
                'flux-schnell': 'black-forest-labs/flux-schnell',
                'flux-dev': 'black-forest-labs/flux-dev',
                'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
                'kandinsky': 'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8ac01a8b0c3c0a6c6a4c1a2a4b3b5c6d7e8f9',
                // NSFW-capable models (no content filter)
                'sdxl-nsfw': 'lucataco/sdxl-nsfw:a]s64d8f6e9c7b4a1f3d2e5c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8',
                'realistic-vision': 'lucataco/realistic-vision-v5.1:2c8e954decbf70b7607a4414e5785ef9e4de4b8c51d50fb8b8b8fa7d8b9d0c1e',
                'juggernaut-xl': 'lucataco/juggernaut-xl-v9:bea09cf018e513cef0841719559ea86d2299e05448633ac8fe270b5d5cd6777e',
                'deliberate-v6': 'mcai/deliberate-v6:5e7c6b3f2c8a4d9e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
            };

            const input: any = {
                prompt: options.prompt,
                num_outputs: options.count || 1,
                disable_safety_checker: true, // For uncensored generation
            };

            // Handle CUSTOM TRAINED LORA MODELS (e.g., Angelica)
            // These are trained Flux LoRA models with specific trigger words
            // Match any model in the mattyatplay-coder namespace or with explicit :version
            const isCustomTrainedLora = model.startsWith('mattyatplay-coder/') ||
                                        (model.includes('/') && model.includes(':') && !model.startsWith('black-forest-labs/'));

            if (isCustomTrainedLora) {
                console.log(`[ReplicateAdapter] Using custom trained LoRA model: ${model}`);

                // Map short model names to full versions (required for custom trained models)
                const customModelVersions: Record<string, string> = {
                    'mattyatplay-coder/angelicatraining': 'mattyatplay-coder/angelicatraining:d91b41c61d99d36b8649563cd79d8c2d83facd008199030c51952c5f13ea705a',
                    'mattyatplay-coder/angelica': 'mattyatplay-coder/angelica:85fb8091d11fb467f36038529afdd2a5f34aff892861d27d580d1241549eb7bf',
                };

                // Use version-pinned model if available, otherwise try the model as-is
                const resolvedModel = customModelVersions[model] || model;
                console.log(`[ReplicateAdapter] Resolved model: ${resolvedModel}`);

                const loraInput: any = {
                    prompt: options.prompt,
                    model: "dev", // Use Flux Dev base
                    aspect_ratio: options.aspectRatio || "16:9",
                    num_outputs: options.count || 1,
                    num_inference_steps: 28,
                    guidance_scale: 3,
                    lora_scale: 1,
                    go_fast: false,
                    output_format: "png",
                    output_quality: 80,
                    disable_safety_checker: true,
                };

                if (options.seed) {
                    loraInput.seed = options.seed;
                }

                console.log(`Sending to Replicate (Custom LoRA: ${resolvedModel}):`, { prompt: loraInput.prompt.substring(0, 100) + '...' });

                const output = await this.replicate.run(resolvedModel as `${string}/${string}`, {
                    input: loraInput
                });

                console.log("[ReplicateAdapter] Custom LoRA raw output type:", typeof output, Array.isArray(output) ? `array(${(output as any[]).length})` : '');

                // Handle output - including ReadableStream for Flux models
                const extractUrl = async (item: any): Promise<string> => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                        if ('url' in item && typeof item.url === 'string') return item.url;

                        // Handle ReadableStream (common with FLUX models)
                        if (item instanceof ReadableStream || item.constructor?.name === 'ReadableStream') {
                            console.log("[ReplicateAdapter] Processing ReadableStream output...");
                            try {
                                const reader = item.getReader();
                                const chunks: Uint8Array[] = [];
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    if (value) chunks.push(value);
                                }

                                const buffer = Buffer.concat(chunks);
                                console.log("[ReplicateAdapter] Stream content length (bytes):", buffer.length);

                                // Check if it's a URL string (text)
                                const textPreview = buffer.subarray(0, 100).toString('utf-8');
                                if (textPreview.startsWith('http')) {
                                    console.log("[ReplicateAdapter] Stream contained URL:", textPreview);
                                    return buffer.toString('utf-8');
                                }

                                // It's binary data (image). Save to uploads.
                                console.log("[ReplicateAdapter] Stream contained binary data. Saving to uploads...");
                                const crypto = require('crypto');

                                const uploadsDir = path.join(process.cwd(), 'uploads');
                                if (!fs.existsSync(uploadsDir)) {
                                    fs.mkdirSync(uploadsDir, { recursive: true });
                                }

                                const filename = `flux-lora-${crypto.randomUUID()}.png`;
                                const filepath = path.join(uploadsDir, filename);

                                fs.writeFileSync(filepath, buffer);
                                console.log("[ReplicateAdapter] Saved stream to:", filepath);

                                const fileUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
                                return fileUrl;

                            } catch (e) {
                                console.error("[ReplicateAdapter] Error reading stream:", e);
                                return '';
                            }
                        }
                    }
                    console.log("[ReplicateAdapter] Item was not a stream or URL object:", typeof item, item);
                    return String(item);
                };

                // Wait for all outputs to resolve (in case of streams)
                const outputArray = Array.isArray(output) ? output : [output];
                const resolvedOutputs = await Promise.all(outputArray.map(extractUrl));

                // Filter out empty strings
                const outputs = resolvedOutputs.filter(url => url && url.length > 0);

                console.log("[ReplicateAdapter] Custom LoRA final outputs:", outputs.length, "URLs");

                return {
                    id: Date.now().toString(),
                    status: 'succeeded',
                    outputs
                };
            }

            // Handle STANDARD LORA FILES (safetensors, etc.) via black-forest-labs/flux-dev-lora
            // This allows using LoRAs from Civitai, HuggingFace, or local files
            if (options.loras && options.loras.length > 0 && !isCustomTrainedLora) {
                console.log(`[ReplicateAdapter] Using standard LoRAs via flux-dev-lora: ${options.loras.length} LoRA(s)`);

                const primaryLora = options.loras[0];
                const loraInput: any = {
                    prompt: options.prompt,
                    lora_weights: primaryLora.path, // URL to LoRA safetensors file
                    lora_scale: primaryLora.strength || 1,
                    aspect_ratio: options.aspectRatio || "16:9",
                    num_outputs: options.count || 1,
                    num_inference_steps: options.steps || 28,
                    guidance: options.guidanceScale || 3.5,
                    output_format: "png",
                    output_quality: 90,
                    disable_safety_checker: true,
                };

                // Support for second LoRA via extra_lora
                if (options.loras.length > 1) {
                    const secondLora = options.loras[1];
                    loraInput.extra_lora = secondLora.path;
                    loraInput.extra_lora_scale = secondLora.strength || 1;
                    console.log(`[ReplicateAdapter] Added extra LoRA: ${secondLora.path}`);
                }

                if (options.seed) {
                    loraInput.seed = options.seed;
                }

                // Handle image-to-image
                if (options.sourceImages?.length) {
                    loraInput.image = await this.resolveLocalUrlToDataUrl(options.sourceImages[0]);
                    loraInput.prompt_strength = options.strength || 0.8;
                }

                console.log(`[ReplicateAdapter] Sending to flux-dev-lora with LoRA: ${primaryLora.path}`);

                const output = await this.replicate.run("black-forest-labs/flux-dev-lora" as `${string}/${string}`, {
                    input: loraInput
                });

                // Handle output - same as custom LoRA handling
                const extractUrl = async (item: any): Promise<string> => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                        if ('url' in item && typeof item.url === 'string') return item.url;
                        if (item instanceof ReadableStream || item.constructor?.name === 'ReadableStream') {
                            const reader = item.getReader();
                            const chunks: Uint8Array[] = [];
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                if (value) chunks.push(value);
                            }
                            const buffer = Buffer.concat(chunks);
                            if (buffer.subarray(0, 4).toString('utf-8').startsWith('http')) {
                                return buffer.toString('utf-8');
                            }
                            const crypto = require('crypto');
                            const uploadsDir = path.join(process.cwd(), 'uploads');
                            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                            const filename = `flux-lora-${crypto.randomUUID()}.png`;
                            const filepath = path.join(uploadsDir, filename);
                            fs.writeFileSync(filepath, buffer);
                            return `${process.env.API_URL || 'http://localhost:3001'}/uploads/${filename}`;
                        }
                    }
                    return String(item);
                };

                const outputArray = Array.isArray(output) ? output : [output];
                const resolvedOutputs = await Promise.all(outputArray.map(extractUrl));
                const outputs = resolvedOutputs.filter(url => url && url.length > 0);

                console.log("[ReplicateAdapter] Standard LoRA outputs:", outputs.length, "URLs");

                return {
                    id: Date.now().toString(),
                    status: 'succeeded',
                    outputs
                };
            }

            // Handle QWEN IMAGE EDIT PLUS - instruction-based image editing
            if (model === 'qwen/qwen-image-edit-plus') {
                console.log("[ReplicateAdapter] Using Qwen Image Edit Plus...");

                if (!options.sourceImages?.[0]) {
                    throw new Error("Qwen Image Edit Plus requires a source image to edit.");
                }

                const qwenInput: any = {
                    prompt: options.prompt,
                    image: await this.resolveLocalUrlToDataUrl(options.sourceImages[0]),
                };

                console.log("Sending to Replicate (Qwen Image Edit Plus):", { prompt: qwenInput.prompt, hasImage: !!qwenInput.image });

                const output = await this.replicate.run("qwen/qwen-image-edit-plus" as `${string}/${string}`, {
                    input: qwenInput
                });

                // Handle output
                let outputs: string[] = [];
                if (Array.isArray(output)) {
                    for (const item of output) {
                        if (typeof item === 'string') outputs.push(item);
                        else if (item?.url) outputs.push(item.url);
                    }
                } else if (typeof output === 'string') {
                    outputs = [output];
                } else if ((output as any)?.url) {
                    outputs = [(output as any).url];
                }

                return {
                    id: Date.now().toString(),
                    status: 'succeeded',
                    outputs
                };
            }

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
            // Map model names to Replicate video models
            const videoModelMap: Record<string, string> = {
                // Wan 2.1 models (wavespeedai)
                'wan-2.1-t2v-480p': 'wavespeedai/wan-2.1-t2v-480p',
                'wan-2.1-t2v-720p': 'wavespeedai/wan-2.1-t2v-720p',
                'wan-2.1-i2v-480p': 'wavespeedai/wan-2.1-i2v-480p',
                'wan-2.1-i2v-720p': 'wavespeedai/wan-2.1-i2v-720p',
                'wan-2.1-1.3b': 'wan-video/wan-2.1-1.3b',
                // Wan 2.2 models (fast variants)
                'wan-2.2-t2v': 'wan-video/wan-2.2-t2v-fast',
                'wan-2.2-i2v': 'wan-video/wan-2.2-i2v-fast',
                'wan-2.2-t2v-fast': 'wan-video/wan-2.2-t2v-fast',
                'wan-2.2-i2v-fast': 'wan-video/wan-2.2-i2v-fast',
                // Wan 2.5 models (up to 1080p, audio support)
                'wan-2.5-t2v': 'wan-video/wan-2.5-t2v-fast',
                'wan-2.5-i2v': 'wan-video/wan-2.5-i2v-fast',
                'wan-2.5-t2v-fast': 'wan-video/wan-2.5-t2v-fast',
                'wan-2.5-i2v-fast': 'wan-video/wan-2.5-i2v-fast',
                // Legacy mappings for Civitai-style model IDs
                'wan-video-2-5-t2v': 'wan-video/wan-2.5-t2v-fast',
                'wan-video-2-5-i2v': 'wan-video/wan-2.5-i2v-fast',
                'wan-video-2-2-t2v-5b': 'wan-video/wan-2.2-t2v-fast',
                'wan-video-2-2-i2v-a14b': 'wan-video/wan-2.2-i2v-fast',
                'wan-video-2-2-t2v-a14b': 'wan-video/wan-2.2-t2v-fast',
                'wan-video-14b-t2v': 'wavespeedai/wan-2.1-t2v-720p',
                'wan-video-14b-i2v-480p': 'wavespeedai/wan-2.1-i2v-480p',
                'wan-video-14b-i2v-720p': 'wavespeedai/wan-2.1-i2v-720p',
                'wan-video-1-3b-t2v': 'wan-video/wan-2.1-1.3b',
                // Other video models
                'ltx-video': 'lightricks/ltx-video',
                'animatediff': 'lucataco/animate-diff',
            };

            // Default model selection based on whether we have an input image
            let model = options.model || (image ? 'wan-2.5-i2v' : 'wan-2.5-t2v');
            model = videoModelMap[model] || model;

            const input: any = {
                prompt: options.prompt,
            };

            // Add image for i2v models - must be a valid URI (not localhost)
            if (image) {
                // Convert localhost URLs to data URLs since Replicate can't access localhost
                input.image = await this.resolveLocalUrlToDataUrl(image);
                console.log("I2V image resolved:", input.image?.substring(0, 100) + "...");
            }

            if (options.negativePrompt) input.negative_prompt = options.negativePrompt;

            // Add duration handling based on model type
            const durationSec = parseInt(String(options.duration || "5"), 10);

            // Wan 2.5 models use direct "duration" parameter (5 or 10)
            if (model.includes('wan-2.5') || model.includes('wan-25')) {
                input.duration = durationSec >= 8 ? 10 : 5;
                console.log(`[Replicate] Wan 2.5 duration set to: ${input.duration} (requested: ${options.duration})`);
            }
            // Wan 2.1/2.2 models use num_frames (24fps: 5s=120, 10s=240)
            else if (model.includes('wan')) {
                input.num_frames = durationSec >= 8 ? 241 : 121;
                input.fps = 24;
                console.log(`[Replicate] Wan 2.1/2.2 num_frames set to: ${input.num_frames} (requested: ${options.duration})`);
            }
            // LTX-Video uses duration parameter
            else if (model.includes('ltx')) {
                input.duration = durationSec >= 8 ? 10 : 6; // LTX supports 6, 8, 10
                console.log(`[Replicate] LTX duration set to: ${input.duration} (requested: ${options.duration})`);
            }

            console.log("Replicate video generation:", model, "with input:", JSON.stringify(input, null, 2));

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

    /**
     * Parses a face from an image, returning a segmentation mask.
     * Uses cjwbw/face-parsing model.
     */
    async parseFace(imageUrl: string): Promise<string> {
        try {
            console.log(`[Replicate] Parsing face for: ${imageUrl}`);

            // Resolve local paths to data URLs if needed
            const inputImage = await this.resolveLocalUrlToDataUrl(imageUrl);

            const input = {
                image: inputImage
            };

            const output = await this.replicate.run(
                "cjwbw/face-parsing:369528d7a18f237bf7c569f6eeb8863f6ec6d9bc561de68600cd9675c7bda30c",
                { input }
            );

            // The model returns a list of items, usually the first one is the mask or a JSON with mask URLs
            console.log("[Replicate] Face parsing output:", output);

            // Based on model documentation, it returns a URL to the segmentation map
            if (typeof output === 'string') return output;
            if (Array.isArray(output) && output.length > 0) return output[0];

            throw new Error("Invalid output from face parsing model");
        } catch (error: any) {
            console.error("Face parsing failed:", error);
            throw error;
        }
    }

    /**
     * Generates face embeddings for an image to identify people.
     * Uses InsightFace via Replicate.
     * Returns an array of objects with embedding and bounding box.
     */
    async getFaceEmbeddings(imageUrl: string): Promise<{ embedding: number[], bbox?: number[] }[]> {
        try {
            console.log(`[Replicate] Getting face embeddings for: ${imageUrl}`);
            // Resolve local paths
            const inputImage = await this.resolveLocalUrlToDataUrl(imageUrl);

            // Using zsxkib/insightface.
            const output: any = await this.replicate.run(
                "zsxkib/insightface:78a1bc40c79e602492f254922114d567311df9012354890656a84c6014459d28",
                {
                    input: {
                        image: inputImage,
                        return_json: true
                    }
                }
            );

            // Expected output: Array of objects
            // [ { bbox: [x,y,w,h], kps: [...], det_score: 0.9, embedding: [...] } ]
            if (Array.isArray(output)) {
                return output.map((face: any) => ({
                    embedding: face.embedding || face.normed_embedding,
                    bbox: face.bbox || face.det_box // standardized keys might vary
                })).filter(f => !!f.embedding);
            }

            return [];
        } catch (error: any) {
            console.warn(`[Replicate] Embedding generation warning: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate consistent character images in different poses using fofr/consistent-character
     * Best for: Creating character reference sheets, multiple poses of the same character
     *
     * @param referenceImage - The character reference image URL
     * @param options.prompt - Description of the pose/scene (e.g., "sitting on a bench", "running")
     * @param options.count - Number of poses to generate (default: 4)
     */
    async generateConsistentCharacter(
        referenceImage: string,
        options: GenerationOptions
    ): Promise<GenerationResult> {
        try {
            console.log(`[Replicate] Generating consistent character poses...`);

            const inputImage = await this.resolveLocalUrlToDataUrl(referenceImage);

            const input: any = {
                subject: inputImage,
                prompt: options.prompt || "a photo of the character",
                negative_prompt: options.negativePrompt || "bad quality, worst quality",
                number_of_outputs: options.count || 4,
                randomise_poses: true,
                number_of_images_per_pose: 1,
                output_format: "png",
                output_quality: 100,
            };

            // Style parameters
            if (options.seed) {
                input.seed = options.seed;
            }

            console.log(`[Replicate] Running fofr/consistent-character with ${input.number_of_outputs} outputs...`);

            const output = await this.replicate.run(
                "fofr/consistent-character:9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772",
                { input }
            );

            // Extract URLs from output
            let outputs: string[] = [];
            if (Array.isArray(output)) {
                outputs = output.map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item?.url) return item.url;
                    return String(item);
                }).filter(url => url && url.length > 0);
            }

            console.log(`[Replicate] Generated ${outputs.length} consistent character images`);

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: outputs,
                provider: 'replicate'
            };
        } catch (error: any) {
            console.error("[Replicate] Consistent character generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message || "Consistent character generation failed"
            };
        }
    }

    /**
     * Generate character turnaround sheet (front, side, back views) using consistent-character
     * Best for: Creating model sheets for animation or 3D reference
     */
    async generateCharacterTurnaround(
        referenceImage: string,
        options: GenerationOptions
    ): Promise<GenerationResult> {
        try {
            console.log(`[Replicate] Generating character turnaround sheet...`);

            const inputImage = await this.resolveLocalUrlToDataUrl(referenceImage);

            // Generate specific poses for turnaround
            const turnaroundPrompts = [
                "front view, facing camera, full body, standing pose",
                "left side profile view, full body, standing pose",
                "back view, facing away, full body, standing pose",
                "right side profile view, full body, standing pose"
            ];

            const allOutputs: string[] = [];

            for (const posePrompt of turnaroundPrompts) {
                const input: any = {
                    subject: inputImage,
                    prompt: `${options.prompt || "character"}, ${posePrompt}, white background, character reference sheet style`,
                    negative_prompt: options.negativePrompt || "bad quality, worst quality, multiple people, crowd",
                    number_of_outputs: 1,
                    randomise_poses: false,
                    number_of_images_per_pose: 1,
                    output_format: "png",
                    output_quality: 100,
                };

                if (options.seed) {
                    input.seed = options.seed;
                }

                const output = await this.replicate.run(
                    "fofr/consistent-character:9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772",
                    { input }
                );

                if (Array.isArray(output) && output.length > 0) {
                    const url = typeof output[0] === 'string' ? output[0] : output[0]?.url;
                    if (url) allOutputs.push(url);
                }
            }

            console.log(`[Replicate] Generated ${allOutputs.length} turnaround views`);

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: allOutputs,
                provider: 'replicate'
            };
        } catch (error: any) {
            console.error("[Replicate] Character turnaround generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message || "Character turnaround generation failed"
            };
        }
    }
}

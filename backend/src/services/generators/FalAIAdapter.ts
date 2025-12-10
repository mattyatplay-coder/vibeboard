import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import * as fal from "@fal-ai/serverless-client";

// Configure fal client
if (!process.env.FAL_KEY) {
    console.warn("WARNING: FAL_KEY environment variable is not set. Fal.ai generations will fail.");
}

fal.config({
    credentials: process.env.FAL_KEY
});

export class FalAIAdapter implements GenerationProvider {

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            const {
                prompt,
                negativePrompt,
                sourceImages,
                strength,
                referenceStrengths,
                referenceCreativity,
                loras,
                width,
                height,
                seed,
                guidanceScale,
                steps,
                aspectRatio
            } = options;

            // Determine generation mode
            const hasStructureImage = sourceImages && sourceImages.length > 0;
            const hasElementReferences = options.elementReferences && options.elementReferences.length > 0;
            const useSmartMode = hasStructureImage && hasElementReferences;

            if (useSmartMode) {
                return this.generateSmartMode(options);
            } else if (hasElementReferences) {
                return this.generateWithIPAdapter(options);
            }

            // Standard Generation Logic (Txt2Img / Img2Img)
            // Map options to Fal.ai Flux endpoint parameters
            const isFlux2 = options.model?.includes('flux-2');

            const input: any = {
                prompt: options.prompt,
                image_size: options.aspectRatio ? this.mapAspectRatioToSize(options.aspectRatio) : "landscape_4_3",
                num_inference_steps: options.steps || (isFlux2 ? 28 : 28),
                seed: options.seed,
                num_images: options.count || 1, // Support multiple images
                enable_safety_checker: false, // Disable safety filter to allow "undressing" etc.
                negative_prompt: options.negativePrompt, // Pass negative prompt
                safety_tolerance: "6", // Ensure maximally permissive for all Flux models
            };

            if (options.sampler) {
                input.sampler = options.sampler.value;
            }
            if (options.scheduler) {
                input.scheduler = options.scheduler.value;
            }
            if (options.guidanceScale) {
                input.guidance_scale = options.guidanceScale;
            }

            // Handle LoRAs - Upload local files if needed
            if (options.loras && options.loras.length > 0) {
                const processedLoRAs = await Promise.all(options.loras.map(async (l) => {
                    let path = l.path.replace(/^['"]|['"]$/g, '').trim();
                    // Check if path is local (not http/https and not a fal/huggingface ID)
                    // Fal/HF IDs usually look like "fal-ai/..." or "user/repo"
                    // Local paths start with / or have extensions like .safetensors
                    const isLocal = path.startsWith('/') || path.match(/\.(safetensors|ckpt|pt|bin)$/i);
                    const isUrl = path.startsWith('http');

                    if (isLocal && !isUrl) {
                        console.log(`Uploading local LoRA: ${path}`);
                        try {
                            path = await this.uploadToFal(path);
                        } catch (e) {
                            console.error(`Failed to upload LoRA ${path}:`, e);
                            // Keep original path, might fail but better than crashing
                        }
                    }

                    return {
                        path: path,
                        scale: l.strength
                    };
                }));

                input.loras = processedLoRAs;
            }

            // Handle Image-to-Image
            let model = options.model || "fal-ai/flux/dev";

            if (options.maskUrl && (options.model?.includes('inpainting') || options.model === 'fal-ai/flux/dev/inpainting' || options.model === 'fal-ai/flux/dev')) {
                // Image Inpainting
                console.log("Image Inpainting Mode Detected");
                model = "fal-ai/flux/dev";
                delete input.image_size;
                input.image_url = await this.uploadToFal(options.sourceImages?.[0] || options.sourceVideoUrl || "");
                input.mask_url = await this.uploadToFal(options.maskUrl);
                input.strength = options.strength !== undefined ? options.strength : 0.85;
                if (options.negativePrompt) {
                    input.negative_prompt = options.negativePrompt;
                }
            } else if (options.sourceImages && options.sourceImages.length > 0) {
                const uploadedUrl = await this.uploadToFal(options.sourceImages[0]);

                if (model.includes("flux-2")) {
                    model = "fal-ai/flux-2-flex/edit";
                    input.image_urls = [uploadedUrl];
                    input.safety_tolerance = "5";
                } else {
                    input.image_url = uploadedUrl;
                    input.strength = options.strength !== undefined ? options.strength : 0.85;
                    model = `${model}/image-to-image`;
                }
            }

            console.log("Sending to Fal:", model);

            const result: any = await fal.subscribe(model, {
                input,
                logs: true,
            });

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: result.images.map((img: any) => img.url),
                seed: result.seed
            };

        } catch (error: any) {
            console.error("Fal.ai generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message || "Unknown error"
            };
        }
    }

    private async generateSmartMode(options: GenerationOptions): Promise<GenerationResult> {
        const {
            prompt,
            negativePrompt,
            sourceImages,
            elementReferences,
            strength = 0.5,
            referenceStrengths = {},
            referenceCreativity = 0.85,
            loras,
            width,
            height,
            seed,
            guidanceScale = 7,
            steps = 30,
            aspectRatio
        } = options;

        const uploadedRefs = await Promise.all(
            (elementReferences || []).map(ref => this.uploadToFal(ref))
        );

        const falRequest: any = {
            prompt: prompt,
            negative_prompt: negativePrompt,
            image_size: aspectRatio ? this.mapAspectRatioToSize(aspectRatio) : "square_hd",
            seed: seed ?? Math.floor(Math.random() * 2147483647),
            guidance_scale: guidanceScale,
            num_inference_steps: steps,
            enable_safety_checker: false, // Disable safety filter
            safety_tolerance: "6", // Ensure maximally permissive
        };

        // Handle LoRAs for Smart Mode
        if (loras && loras.length > 0) {
            const processedLoRAs = await Promise.all(loras.map(async (l) => {
                let path = l.path.replace(/^['"]|['"]$/g, '').trim();
                const isLocal = path.startsWith('/') || path.match(/\.(safetensors|ckpt|pt|bin)$/i);
                const isUrl = path.startsWith('http');

                if (isLocal && !isUrl) {
                    console.log(`[SmartMode] Uploading local LoRA: ${path}`);
                    try {
                        path = await this.uploadToFal(path);
                    } catch (e) {
                        console.error(`[SmartMode] Failed to upload LoRA ${path}:`, e);
                    }
                }

                return {
                    path: path,
                    scale: l.strength
                };
            }));
            falRequest.loras = processedLoRAs;
        }

        // If sourceImages are provided, use them for ControlNet
        if (sourceImages && sourceImages.length > 0) {
            const sourceImageUrl = await this.uploadToFal(sourceImages[0]);
            const structureStrength = 1 - strength;
            const controlNetDepthScale = 0.15 + (structureStrength * 0.6);

            console.log(`[SmartMode] Structure: UI strength=${(1 - strength) * 100}% -> ControlNet scale=${controlNetDepthScale.toFixed(2)}`);

            falRequest.control_nets = [{
                path: "https://huggingface.co/XLabs-AI/flux-controlnet-depth-v3/resolve/main/flux-depth-controlnet-v3.safetensors",
                image_url: sourceImageUrl,
                conditioning_scale: controlNetDepthScale,
            }];
        }

        // Always apply IP-Adapter if elementReferences are present
        if (uploadedRefs.length > 0) {
            const ipAdapterImages = uploadedRefs.map((url, index) => {
                // Find original ref URL to look up strength
                const originalUrl = elementReferences![index];

                // Look up strength. If not found, fall back to referenceCreativity.
                // referenceStrengths is now Record<string, number> where keys are original URLs.
                const elementStrength = referenceStrengths?.[originalUrl] ?? referenceCreativity ?? 0.85;

                const ipWeight = 0.4 + (elementStrength * 0.6);

                return {
                    image_url: url,
                    weight: ipWeight,
                };
            });
            falRequest.ip_adapter = ipAdapterImages;
        }

        const model = options.model || 'fal-ai/flux/dev';
        console.log(`[SmartMode] Using model: ${model}`);
        const result: any = await fal.subscribe(model, {
            input: falRequest,
            logs: true,
        });

        return {
            id: Date.now().toString(),
            status: 'succeeded',
            outputs: result.images.map((img: any) => img.url),
            seed: result.seed,
        };
    }

    private async generateWithIPAdapter(options: GenerationOptions): Promise<GenerationResult> {
        return this.generateSmartMode({ ...options, sourceImages: [] });
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Determine model: Use provided model, or default based on input
            let model = options.model;
            if (!model) {
                model = image ? "fal-ai/wan/v2.2-a14b/image-to-video" : "fal-ai/wan-t2v";
            }

            // Prepare input
            const input: any = {
                prompt: options.prompt,
                negative_prompt: options.negativePrompt, // Pass negative prompt
                enable_safety_checker: false, // Disable safety filter
            };

            // Model-specific parameters
            if (model.includes("wan-2.5") || model.includes("wan-25")) {
                // Aspect ratio is only for T2V
                if (!model.includes("image-to-video") && !model.includes("i2v")) {
                    input.aspect_ratio = "16:9";
                }
                // Wan 2.5 defaults
            } else if (model.includes("wan")) {
                // Map legacy/alias IDs
                if (model === "fal-ai/wan-i2v") {
                    model = "fal-ai/wan/v2.2-a14b/image-to-video";
                }

                // Wan 2.1/2.2:
                // If FPS is 24, then 5s = 120 frames, 10s = 240 frames.
                // We use n+1 usually.
                input.frames_per_second = 24;
                input.sample_shift = 5.0;
                input.num_frames = options.duration === "10" ? 241 : 121;

                // Aspect ratio is only for T2V
                if (!model.includes("image-to-video") && !model.includes("i2v")) {
                    input.aspect_ratio = "16:9";
                }
            } else if (model.includes("kling")) {
                input.aspect_ratio = "16:9";
                input.duration = options.duration || "5"; // Kling supports "5" or "10"

                // Kling 2.6 - Native Audio Generation
                if (model.includes("v2.6")) {
                    // Default to generating audio (Kling 2.6's key feature)
                    input.generate_audio = options.generateAudio !== false;
                }

                // Kling O1 - Advanced keyframe and element reference support
                if (model.includes("/o1/")) {
                    // End frame support for O1 image-to-video (start frame is handled via main image_url)
                    // Use @Image1 for start frame, @Image2 for end frame in prompts
                    if (options.keyframes?.endFrame) {
                        input.end_image_url = await this.uploadToFal(options.keyframes.endFrame);
                    }

                    // Reference images for style/appearance (up to 4 total with elements)
                    // Reference in prompt as @Image1, @Image2, etc.
                    if (options.elementReferences && options.elementReferences.length > 0) {
                        const uploadedRefs = await Promise.all(
                            options.elementReferences.slice(0, 4).map(ref => this.uploadToFal(ref))
                        );
                        input.image_urls = uploadedRefs;
                    }
                }
            } else if (model.includes("ltx")) {
                input.aspect_ratio = "16:9";
                // LTX supports duration: 6, 8, 10 (for standard)
                // We map "5" -> 6, "10" -> 10
                input.duration = options.duration === "10" ? "10" : "6";
                // LTX default FPS is 25.
                // input.fps = 25; // Optional, default is 25
            }

            // Handle Image-to-Video
            if (image) {
                const uploadedUrl = await this.uploadToFal(image);
                input.image_url = uploadedUrl;
                // Some video models support strength/creativity for i2v
                // For now, we just pass the image.
                // If the model supports it, we can map referenceCreativity here.
                if (options.referenceCreativity !== undefined) {
                    input.strength = options.referenceCreativity;
                }

                // Ensure we are using an I2V model if image is provided
                if (model === "fal-ai/wan-t2v" || (model.includes("wan") && model.includes("t2v"))) {
                    console.log("Switching to Wan I2V model because image was provided");
                    model = "fal-ai/wan/v2.2-a14b/image-to-video";
                } else if (model === "wan-2.5" || (model.includes("wan") && model.includes("2.5"))) {
                    console.log("Switching to Wan 2.5 I2V model");
                    model = "fal-ai/wan-25-preview/image-to-video";
                } else if (model.includes("kling") && model.includes("text-to-video")) {
                    // Switch Kling T2V to I2V when image is provided
                    console.log("Switching Kling T2V to I2V because image was provided");
                    model = model.replace("text-to-video", "image-to-video");
                    model = model.replace("text-to-video", "image-to-video");
                } else if (model.includes("ai-avatar")) {
                    // Avatar models use image_url and audio_url
                    // Source: https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/pro
                    input.image_url = uploadedUrl;
                    delete input.face_image_url; // Remove incorrect param if present

                    // Handle driving audio
                    if (options.audioUrl) {
                        input.audio_url = await this.uploadToFal(options.audioUrl);
                    }

                    // Avatar models typically don't support aspect_ratio or duration (driven by audio)
                    delete input.aspect_ratio;
                    delete input.duration;
                    delete input.negative_prompt; // Not supported
                    delete input.enable_safety_checker; // Not supported
                }
            } else if (options.sourceVideoUrl && options.maskUrl) {
                // Video Inpainting / Retake Mode
                console.log("Video Inpainting Mode Detected");
                model = "fal-ai/wan-vace-14b/inpainting"; // Use VACE for inpainting
                input.video_url = await this.uploadToFal(options.sourceVideoUrl);
                input.mask_url = await this.uploadToFal(options.maskUrl);
                // VACE specific params if needed
            } else if (options.sourceVideoUrl && model.includes("kling") && model.includes("/o1/")) {
                // Kling O1 Video-to-Video edit mode
                // Supports: replace subjects, change backgrounds, restyle, change weather, etc.
                // Reference video in prompt as @Video1, images as @Image1, @Image2, etc.
                console.log("Kling O1 Video-to-Video Edit Mode Detected");
                input.video_url = await this.uploadToFal(options.sourceVideoUrl);

                // Route to the edit endpoint for video-to-video transformations
                if (!model.includes("video-to-video")) {
                    model = "fal-ai/kling-video/o1/video-to-video/edit";
                }
            } else if (model === "fal-ai/video-upscaler" || model === "topaz/upscale/video") {
                // Video Upscaling
                console.log("Video Upscaling Mode Detected");
                if (image) {
                    input.video_url = await this.uploadToFal(image);
                } else if (options.sourceVideoUrl) {
                    input.video_url = await this.uploadToFal(options.sourceVideoUrl);
                }

                // Remove unsupported params
                delete input.prompt;
                delete input.negative_prompt;
                delete input.enable_safety_checker;
            } else {
                // Ensure we are using a T2V model if no image
                if (model.includes("ai-avatar")) {
                    throw new Error("Kling AI Avatar models require a source image (face). Please select an image or reference one in the prompt (e.g. @MyImage).");
                }

                if (model.includes("image-to-video") || model.includes("i2v")) {
                    console.log("Switching to T2V model because no image was provided");
                    // Fallback logic for T2V if available
                    if (model.includes("wan") && !model.includes("2.5")) model = "fal-ai/wan-t2v";
                    if (model === "wan-2.5" || (model.includes("wan") && model.includes("2.5"))) model = "fal-ai/wan-25-preview/text-to-video";
                    // Kling T2V fallback
                    if (model.includes("kling") && model.includes("image-to-video")) {
                        console.log("Switching Kling I2V to T2V because no image was provided");
                        model = model.replace("image-to-video", "text-to-video");
                    }
                }
            }

            console.log("Generating video with:", model);
            console.log("Input payload:", JSON.stringify(input, null, 2));

            const result: any = await fal.subscribe(model, {
                input,
                logs: true,
            });

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: [result.video.url] // Wan returns { video: { url: ... } } usually
            };
        } catch (error: any) {
            console.error("Video generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message || "Video generation failed"
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        // Since we use subscribe, we get result immediately. 
        // For async queue, we would implement polling here.
        return { id, status: 'succeeded' };
    }

    private async uploadToFal(urlOrPath: string): Promise<string> {
        console.log("uploadToFal called with:", urlOrPath.substring(0, 100) + "...");

        // Handle Data URLs (e.g. masks)
        if (urlOrPath.startsWith('data:')) {
            console.log("Detected Data URL, uploading buffer...");
            try {
                // Extract base64 data
                const matches = urlOrPath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const buffer = Buffer.from(matches[2], 'base64');
                    // Cast to any because the type definition expects Blob (browser) but Node client supports Buffer
                    const url = await fal.storage.upload(buffer as any);
                    console.log("Uploaded Data URL to Fal:", url);
                    return url;
                } else {
                    console.warn("Invalid Data URL format");
                    return urlOrPath;
                }
            } catch (e) {
                console.error("Failed to upload Data URL:", e);
                return urlOrPath;
            }
        }

        if (urlOrPath.startsWith('http')) {
            // Check if it's a localhost URL
            if (urlOrPath.includes('localhost') || urlOrPath.includes('127.0.0.1')) {
                console.log("Detected localhost URL, converting to local path:", urlOrPath);
                try {
                    const urlObj = new URL(urlOrPath);
                    urlOrPath = urlObj.pathname;
                    console.log("Converted to pathname:", urlOrPath);
                } catch (e) {
                    console.warn("Failed to parse localhost URL, treating as string:", e);
                }
            } else {
                return urlOrPath;
            }
        }

        // Handle local file path
        try {
            const fs = require('fs');
            const path = require('path');

            // Resolve backend root (assuming we are in src/services/generators or dist/services/generators)
            // 3 levels up from generators -> services -> src/dist -> backend
            const backendRoot = path.join(__dirname, '../../..');

            // Remove leading/trailing quotes and leading slash
            const cleanPath = urlOrPath.replace(/^['"]|['"]$/g, '').trim();
            const relativePath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
            const fileName = path.basename(relativePath);

            // Potential paths to check
            const candidates = [
                path.isAbsolute(cleanPath) ? cleanPath : null,
                path.join(backendRoot, relativePath), // e.g. backend/uploads/foo.png
                path.join(backendRoot, 'uploads', fileName), // e.g. backend/uploads/foo.png (flattened)
                path.join(backendRoot, 'public', fileName), // e.g. backend/public/foo.png
                // Try removing 'uploads/' prefix if present and joining with uploads dir
                relativePath.startsWith('uploads/') ? path.join(backendRoot, relativePath) : null,
                // Handle case where relativePath starts with /uploads/
                path.join(backendRoot, relativePath.startsWith('/') ? relativePath.slice(1) : relativePath)
            ].filter(Boolean) as string[];

            let absolutePath = candidates.find(p => fs.existsSync(p));

            if (absolutePath) {
                console.log("Found local file at:", absolutePath);
                const fileData = fs.readFileSync(absolutePath);
                let url;

                if (typeof File !== 'undefined') {
                    // Use File object to preserve filename/extension
                    // Explicitly set type to application/octet-stream for safetensors
                    const mimeType = fileName.endsWith('.safetensors') ? 'application/octet-stream' : 'application/octet-stream';
                    const file = new File([fileData], fileName, { type: mimeType });
                    url = await fal.storage.upload(file);
                    console.log(`[FalAIAdapter] Uploaded ${fileName} to ${url}`);

                    // STRICT VALIDATION: Ensure the URL has the correct extension
                    if (!url.endsWith('.safetensors')) {
                        console.error(`[FalAIAdapter] CRITICAL: Uploaded LoRA URL missing extension! URL: ${url}`);
                        throw new Error(`LoRA upload failed to preserve extension. Fal returned: ${url}. Expected it to end with .safetensors`);
                    }
                } else {
                    url = await fal.storage.upload(fileData);
                }

                console.log("Uploaded to Fal:", url);
                return url;
            } else {
                console.error("Local file not found. Checked:", candidates);
                console.error("Current __dirname:", __dirname);
                throw new Error(`Failed to resolve local file path: ${urlOrPath}`);
            }
        } catch (err) {
            console.error("Failed to upload local file to Fal:", err);
            throw err;
        }
    }

    private mapAspectRatioToSize(ratio: string): string {
        switch (ratio) {
            case "16:9": return "landscape_16_9";
            case "9:16": return "portrait_16_9";
            case "1:1": return "square_hd";
            case "4:3": return "landscape_4_3";
            case "3:4": return "portrait_4_3";
            case "2.35:1": return "landscape_16_9"; // Approximate
            case "portrait_9:16": return "portrait_16_9"; // Handle potential mismatch
            case "landscape_16:9": return "landscape_16_9"; // Handle potential mismatch
            default:
                // If the user passes a valid Fal enum directly (e.g. "portrait_16_9"), pass it through
                if (ratio.startsWith("landscape_") || ratio.startsWith("portrait_") || ratio.startsWith("square")) {
                    return ratio;
                }
                return "landscape_4_3";
        }
    }
}

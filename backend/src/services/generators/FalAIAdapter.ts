import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import * as fal from "@fal-ai/serverless-client";
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Configure fal client
if (!process.env.FAL_KEY) {
    console.warn("WARNING: FAL_KEY environment variable is not set. Fal.ai generations will fail.");
}

fal.config({
    credentials: process.env.FAL_KEY
});

export class FalAIAdapter implements GenerationProvider {

    async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
        try {
            console.log(`[FalAIAdapter] Analyzing image with fal-ai/llava-next...`);
            const result: any = await fal.subscribe("fal-ai/llava-next", {
                input: {
                    image_url: imageUrl,
                    prompt: prompt,
                    max_tokens: 1000, // Ensure enough output
                    top_p: 1.0,
                    temperature: 0.2
                },
                logs: true,
            });

            console.log("[FalAIAdapter] Analysis complete.");
            return result.output;
        } catch (error: any) {
            console.error("[FalAIAdapter] Analysis failed:", error);
            throw error;
        }
    }

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

                // Lower minimum weight (0.2) to allow better scene override when slider is low
                // 0% slider = 0.2 weight (character hints only)
                // 50% slider = 0.5 weight (balanced)
                // 100% slider = 0.8 weight (strong character consistency)
                const ipWeight = 0.2 + (elementStrength * 0.6);

                console.log(`[SmartMode] IP-Adapter: slider=${(elementStrength * 100).toFixed(0)}% -> weight=${ipWeight.toFixed(2)}`);

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
                // Wan 2.5 uses duration parameter directly
                // According to Fal.ai docs, duration accepts "5" or "10" as strings
                const durationSec = parseInt(String(options.duration || "5"), 10);
                input.duration = durationSec >= 8 ? "10" : "5";
                console.log(`[FalAI] Wan 2.5 duration set to: ${input.duration} (requested: ${options.duration})`);

                // Aspect ratio is only for T2V
                if (!model.includes("image-to-video") && !model.includes("i2v")) {
                    input.aspect_ratio = options.aspectRatio || "16:9";
                }
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
                input.num_frames = String(options.duration) === "10" ? 241 : 121;

                // Aspect ratio is only for T2V
                if (!model.includes("image-to-video") && !model.includes("i2v")) {
                    input.aspect_ratio = options.aspectRatio || "16:9";
                }
            } else if (model.includes("kling")) {
                input.aspect_ratio = options.aspectRatio || "16:9";
                input.duration = String(options.duration || "5"); // Kling supports "5" or "10"

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
                input.aspect_ratio = options.aspectRatio || "16:9";
                // LTX supports duration: 6, 8, 10 (for standard)
                // We map "5" -> 6, "10" -> 10
                input.duration = String(options.duration) === "10" ? "10" : "6";
                // LTX default FPS is 25.
                // input.fps = 25; // Optional, default is 25
            } else if (model === 'fal-ai/one-to-all-animation/14b') {
                // One-To-All Animation (Pose Driven)
                // Requires image_url (Character) and video_url (Motion)
                if (!options.inputVideo) {
                    throw new Error("Motion/Pose video is required for One-To-All animation. Please upload a video in the Style/Reference settings.");
                }
                input.video_url = await this.uploadToFal(options.inputVideo);

                // Optional: Pose estimation guidance strength
                if (options.guidanceScale) {
                    input.pose_guidance_scale = options.guidanceScale; // Repurpose guidance scale? Or use separate?
                    // Standard guidacne scale usually maps to text cfg. 
                    // But for this model, maybe we keep text guidance default and use something else?
                    // Let's just set image_guidance_scale if we have strength.
                }

                if (options.strength) {
                    input.image_guidance_scale = options.strength;
                }
                if (options.strength) {
                    input.image_guidance_scale = options.strength;
                }
            } else if (model === 'fal-ai/creatify/aurora') {
                // Creatify Aurora (Avatar)
                // Requires image_url and audio_url
                if (!options.audioUrl) {
                    throw new Error("Audio is required for Aurora avatar generation.");
                }
                input.audio_url = await this.uploadToFal(options.audioUrl);

                // Aurora doesn't use prompt usually, just image + audio
                // input.text = options.prompt; // Optional if supported
            } else if (model === 'fal-ai/sync-lips') {
                // Sync Lips (Video Lip Sync)
                // Requires video_url and audio_url
                // In a pipeline, video_url usually comes from previous stage (passed as 'image' arg to generateVideo)
                // Or from options.inputVideo if starting fresh.

                // If we are in a pipeline, 'image' arg is the output of previous stage (video url)
                const sourceVideo = image || options.inputVideo;

                if (!sourceVideo) {
                    throw new Error("Video source is required for Sync Lips.");
                }
                input.video_url = await this.uploadToFal(sourceVideo);

                if (!options.audioUrl) {
                    throw new Error("Audio is required for Sync Lips.");
                }
                input.audio_url = await this.uploadToFal(options.audioUrl);

                // Sync Lips 2.0 might have sync_mode or other params
                input.sync_mode = "bounce"; // Default or options?
            } else if (model === 'fal-ai/vidu/q2/reference-to-video') {
                // Vidu Q2 (Reference-to-Video)
                // Supports up to 7 reference images for character consistency.
                // Input format: references: [{ type: "image", url: "..." }, ...]

                if (options.elementReferences && options.elementReferences.length > 0) {
                    const uploadedRefs = await Promise.all(
                        options.elementReferences.slice(0, 7).map(ref => this.uploadToFal(ref))
                    );

                    input.references = uploadedRefs.map(url => ({
                        type: "image",
                        url: url
                    }));
                    console.log(`[FalAI] Vidu Q2 references prepared: ${input.references.length} images`);
                } else {
                    console.warn("[FalAI] Vidu Q2 selected but no element references provided. Generating without references.");
                }

                // Vidu Q2 supports duration (int 2-8)
                if (options.duration) {
                    let d = parseInt(String(options.duration), 10);
                    if (d > 8) d = 8; // Max 8s
                    if (d < 2) d = 2; // Min 2s
                    input.duration = d;
                }

                // Map aspect ratio
                if (options.aspectRatio) {
                    input.aspect_ratio = options.aspectRatio;
                } else {
                    input.aspect_ratio = "16:9";
                }

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
                    if ((model.includes("wan-2.5") || model.includes("wan-25")) && model.includes("image-to-video")) {
                        model = "fal-ai/wan-25-preview/text-to-video";
                    } else if (model.includes("wan") && !model.includes("2.5") && !model.includes("25")) {
                        model = "fal-ai/wan-t2v";
                    }
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

            const outputUrl = result.video?.url || result.url; // Handle various Fal responses

            // Initial Result
            let finalResult: GenerationResult = {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: [outputUrl]
            };

            // Pipeline / Engine Stacking Logic
            if (options.nextStage) {
                console.log(`[FalAI] Pipeline detected. Proceeding to next stage: ${options.nextStage.model}`);

                if (!outputUrl) {
                    throw new Error("Pipeline Error: Previous stage produced no output, cannot continue pipeline.");
                }

                // Prepare next stage options
                // For One-To-All, we want the previous output (Character Video) to be the 'image' source (Character)
                // And we preserve other options like inputVideo (Driving Motion) which should be in nextStage settings
                const nextOptions = {
                    ...options.nextStage,
                    // If next stage is One-To-All, ensure we have the driving video from the original request or nextStage config
                    // Ideally nextStage config has it.
                };

                // Recursive call: pass current output as the 'image' input for the next stage
                // This works for I2V (image=source) and One-To-All (image=character).
                // If we are passing Video-to-Video (Vidu->Vidu), it also works if next stage treats 'image' arg as input.
                try {
                    console.log(`[FalAI] Starting stage 2 with input source: ${outputUrl}`);
                    finalResult = await this.generateVideo(outputUrl, nextOptions);

                    // Append metadata to trace the pipeline?
                    // finalResult.pipelineHistory = [...];
                } catch (pipelineError) {
                    console.error("[FalAI] Pipeline stage failed:", pipelineError);
                    throw new Error(`Pipeline stage (${options.nextStage.model}) failed: ${pipelineError}`);
                }
            }

            return finalResult;
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

                    // STRICT VALIDATION: Only for LoRA files (.safetensors), ensure extension is preserved
                    if (fileName.endsWith('.safetensors') && !url.endsWith('.safetensors')) {
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

    /**
     * Detect video FPS using ffprobe
     * Downloads a portion of the video to analyze frame rate
     */
    async detectVideoFps(videoUrl: string): Promise<{ fps: number; duration: number } | null> {
        let tempFile: string | null = null;
        try {
            console.log(`[FalAI FPS] Detecting FPS for: ${videoUrl}`);

            // Create temp file for the video
            const tempDir = os.tmpdir();
            tempFile = path.join(tempDir, `fps_detect_${Date.now()}.mp4`);

            // Download the video
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.status}`);
            }
            const buffer = await response.buffer();
            fs.writeFileSync(tempFile, buffer);

            // Use ffprobe to get video info
            const { stdout } = await execAsync(
                `ffprobe -v quiet -select_streams v:0 -show_entries stream=r_frame_rate,duration -of json "${tempFile}"`
            );

            const probeResult = JSON.parse(stdout);
            const stream = probeResult.streams?.[0];

            if (!stream) {
                console.warn('[FalAI FPS] No video stream found');
                return null;
            }

            // Parse frame rate (usually in format "24/1" or "30000/1001")
            const frameRateParts = stream.r_frame_rate?.split('/');
            let fps = 24; // Default
            if (frameRateParts && frameRateParts.length === 2) {
                fps = parseFloat(frameRateParts[0]) / parseFloat(frameRateParts[1]);
            }

            const duration = parseFloat(stream.duration) || 0;

            console.log(`[FalAI FPS] Detected: ${fps.toFixed(2)} fps, ${duration.toFixed(2)}s duration`);

            return { fps: Math.round(fps * 100) / 100, duration };
        } catch (error: any) {
            console.error('[FalAI FPS] Detection failed:', error.message);
            // Return null to indicate detection failed, caller should use defaults
            return null;
        } finally {
            // Clean up temp file
            if (tempFile && fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * RIFE Frame Interpolation - Smooth video by interpolating frames
     * Converts 16fps Wan output to 24fps for smoother playback
     */
    async interpolateVideo(videoUrl: string, options?: {
        targetFps?: number;
        numFrames?: number;
        useSceneDetection?: boolean;
    }): Promise<{ url: string }> {
        try {
            console.log(`[FalAI RIFE] Interpolating video: ${videoUrl}`);

            const input: any = {
                video_url: videoUrl,
                num_frames: options?.numFrames || 2, // 2 = double the frame rate (16fps -> 32fps, then target to 24fps)
                use_scene_detection: options?.useSceneDetection ?? true,
            };

            // If target FPS specified, use manual FPS mode
            if (options?.targetFps) {
                input.use_calculated_fps = false;
                input.fps = options.targetFps;
            } else {
                // Default: use calculated FPS (input * num_frames)
                input.use_calculated_fps = true;
            }

            console.log(`[FalAI RIFE] Input:`, JSON.stringify(input, null, 2));

            const result: any = await fal.subscribe("fal-ai/rife/video", {
                input,
                logs: true,
            });

            console.log(`[FalAI RIFE] Interpolation complete: ${result.video.url}`);
            return { url: result.video.url };
        } catch (error: any) {
            console.error("[FalAI RIFE] Interpolation failed:", error);
            throw new Error(`RIFE interpolation failed: ${error.message}`);
        }
    }

    /**
     * MMAudio V2 - Generate synchronized audio for video
     * Uses AI to create matching sound effects and ambient audio
     */
    async generateAudio(videoUrl: string, options?: {
        prompt?: string;
        negativePrompt?: string;
        duration?: number;
        numSteps?: number;
        cfgStrength?: number;
        seed?: number;
        useLocalNsfw?: boolean;
    }): Promise<{ url: string; usedLocalService?: boolean }> {
        // Check for local NSFW MMAudio service
        const localServiceUrl = process.env.MMAUDIO_LOCAL_URL;
        const preferLocal = options?.useLocalNsfw !== false && localServiceUrl;

        if (preferLocal) {
            try {
                console.log(`[MMAudio Local] Attempting local NSFW service at ${localServiceUrl}`);
                const localResult = await this.generateAudioLocal(videoUrl, options);
                if (localResult) {
                    console.log(`[MMAudio Local] Success: ${localResult.url}`);
                    return { url: localResult.url, usedLocalService: true };
                }
            } catch (error: any) {
                console.warn(`[MMAudio Local] Local service failed, falling back to Fal.ai: ${error.message}`);
            }
        }

        // Fall back to Fal.ai MMAudio
        try {
            console.log(`[FalAI MMAudio] Generating audio for video: ${videoUrl}`);

            const input: any = {
                video_url: videoUrl,
                prompt: options?.prompt || "natural ambient sound, realistic audio",
                negative_prompt: options?.negativePrompt || "music, speech, voice, talking, singing",
                num_steps: options?.numSteps || 25,
                cfg_strength: options?.cfgStrength || 4.5,
            };

            if (options?.duration) {
                input.duration = options.duration;
            }

            if (options?.seed !== undefined) {
                input.seed = options.seed;
            }

            console.log(`[FalAI MMAudio] Input:`, JSON.stringify(input, null, 2));

            const result: any = await fal.subscribe("fal-ai/mmaudio-v2", {
                input,
                logs: true,
            });

            // MMAudio returns video with audio embedded
            const outputUrl = result.video?.url || result.output?.url || result.url;
            console.log(`[FalAI MMAudio] Audio generation complete: ${outputUrl}`);
            return { url: outputUrl, usedLocalService: false };
        } catch (error: any) {
            console.error("[FalAI MMAudio] Audio generation failed:", error);
            throw new Error(`MMAudio generation failed: ${error.message}`);
        }
    }

    /**
     * Generate audio using local MMAudio NSFW service
     * This calls the local Python service running on the user's machine
     */
    private async generateAudioLocal(videoUrl: string, options?: {
        prompt?: string;
        negativePrompt?: string;
        duration?: number;
        numSteps?: number;
        cfgStrength?: number;
        seed?: number;
    }): Promise<{ url: string } | null> {
        const localServiceUrl = process.env.MMAUDIO_LOCAL_URL;
        if (!localServiceUrl) return null;

        try {
            // Check health first
            const healthResponse = await fetch(`${localServiceUrl}/health`);
            if (!healthResponse.ok) {
                console.warn(`[MMAudio Local] Service unhealthy: ${healthResponse.status}`);
                return null;
            }

            // Build form data
            const formData = new URLSearchParams();
            formData.append('video_url', videoUrl);
            if (options?.prompt) formData.append('prompt', options.prompt);
            if (options?.negativePrompt) formData.append('negative_prompt', options.negativePrompt);
            if (options?.duration) formData.append('duration', options.duration.toString());
            if (options?.numSteps) formData.append('num_steps', options.numSteps.toString());
            if (options?.cfgStrength) formData.append('cfg_strength', options.cfgStrength.toString());
            if (options?.seed !== undefined) formData.append('seed', options.seed.toString());

            console.log(`[MMAudio Local] Sending request to ${localServiceUrl}/generate`);

            const response = await fetch(`${localServiceUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Local service error: ${response.status} - ${errorText}`);
            }

            const result = await response.json() as { success: boolean; video_url?: string; audio_url?: string; error?: string };

            // Local service now returns video_url (video with embedded audio) to match Fal.ai API
            const outputUrl = result.video_url || result.audio_url;
            if (!result.success || !outputUrl) {
                throw new Error(result.error || 'No video URL returned');
            }

            // The local service returns a relative path, convert to full URL
            const finalUrl = outputUrl.startsWith('http')
                ? outputUrl
                : `${localServiceUrl}${outputUrl}`;

            return { url: finalUrl };
        } catch (error: any) {
            console.error(`[MMAudio Local] Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Enhance Video Pipeline - RIFE interpolation + MMAudio
     * 1. Detect source FPS to determine if interpolation is needed
     * 2. Interpolate only if source FPS is below target (e.g., 16fps -> 24fps)
     * 3. Generate synchronized audio using MMAudio
     * Returns enhanced video with smooth playback and audio
     */
    async enhanceVideo(videoUrl: string, options?: {
        targetFps?: number;
        audioPrompt?: string;
        skipInterpolation?: boolean;
        skipAudio?: boolean;
    }): Promise<{ url: string; interpolatedUrl?: string; audioUrl?: string; sourceFps?: number; skippedInterpolation?: boolean }> {
        try {
            console.log(`[FalAI Enhance] Starting video enhancement pipeline`);
            console.log(`[FalAI Enhance] Input video: ${videoUrl}`);
            console.log(`[FalAI Enhance] Options:`, options);

            let currentUrl = videoUrl;
            let interpolatedUrl: string | undefined;
            let audioUrl: string | undefined;
            let sourceFps: number | undefined;
            let skippedInterpolation = false;

            const targetFps = options?.targetFps || 24;

            // Step 0: Detect source video FPS
            if (!options?.skipInterpolation) {
                console.log(`[FalAI Enhance] Step 0: Detecting source video FPS...`);
                const fpsInfo = await this.detectVideoFps(videoUrl);

                if (fpsInfo) {
                    sourceFps = fpsInfo.fps;
                    console.log(`[FalAI Enhance] Source FPS: ${sourceFps}, Target FPS: ${targetFps}`);

                    // Skip interpolation if source FPS is already >= target
                    // Using >= 20 as threshold since videos at 20+ fps are generally smooth
                    if (sourceFps >= targetFps - 4) {
                        console.log(`[FalAI Enhance] Source FPS (${sourceFps}) is already close to target (${targetFps}), skipping interpolation`);
                        skippedInterpolation = true;
                    }
                } else {
                    console.log(`[FalAI Enhance] Could not detect FPS, assuming low FPS video`);
                }
            }

            // Step 1: RIFE Frame Interpolation (only if needed)
            if (!options?.skipInterpolation && !skippedInterpolation) {
                console.log(`[FalAI Enhance] Step 1: RIFE interpolation...`);
                const rifeResult = await this.interpolateVideo(currentUrl, {
                    targetFps: targetFps,
                    numFrames: 2,
                    useSceneDetection: true,
                });
                interpolatedUrl = rifeResult.url;
                currentUrl = rifeResult.url;
                console.log(`[FalAI Enhance] RIFE complete: ${interpolatedUrl}`);
            } else if (options?.skipInterpolation) {
                console.log(`[FalAI Enhance] Step 1: Skipping RIFE (user requested)`);
            }

            // Step 2: MMAudio - Generate synchronized audio
            if (!options?.skipAudio) {
                console.log(`[FalAI Enhance] Step 2: MMAudio audio generation...`);
                const audioResult = await this.generateAudio(currentUrl, {
                    prompt: options?.audioPrompt || "natural ambient sound, realistic audio matching the video content",
                    numSteps: 25,
                    cfgStrength: 4.5,
                });
                audioUrl = audioResult.url;
                currentUrl = audioResult.url;
                console.log(`[FalAI Enhance] MMAudio complete: ${audioUrl}`);
            }

            console.log(`[FalAI Enhance] Pipeline complete. Final URL: ${currentUrl}`);
            return {
                url: currentUrl,
                interpolatedUrl,
                audioUrl,
                sourceFps,
                skippedInterpolation,
            };
        } catch (error: any) {
            console.error("[FalAI Enhance] Enhancement pipeline failed:", error);
            throw new Error(`Video enhancement failed: ${error.message}`);
        }
    }
    /**
     * Generates a caption for an image using Fal.ai (Joy Caption)
     */
    async generateCaption(imageUrl: string): Promise<string> {
        try {
            console.log(`[FalAI] Generating caption for: ${imageUrl}`);

            // Using Joy Caption for detailed descriptive tags
            const result: any = await fal.subscribe("fal-ai/joy-caption", {
                input: {
                    image_url: imageUrl
                },
                logs: true,
            });

            if (result && result.text) {
                return result.text;
            }
            // Fallback
            if (result && result.caption) return result.caption;

            throw new Error("No caption returned from API");
        } catch (error: any) {
            console.error("[FalAI] Caption generation failed:", error);
            throw error;
        }
    }

    /**
     * Removes background from an image using Fal.ai (BiRefNet)
     * Returns the URL of the processed image (PNG with transparency)
     */
    async removeBackground(imageUrl: string): Promise<string> {
        try {
            console.log(`[FalAI] Removing background for: ${imageUrl}`);

            // Handle local file uploads if needed
            let processedUrl = imageUrl;
            if (!imageUrl.startsWith('http')) {
                processedUrl = await this.uploadToFal(imageUrl);
            }

            const result: any = await fal.subscribe("fal-ai/birefnet", {
                input: {
                    image_url: processedUrl
                },
                logs: true,
            });

            if (result && result.image && result.image.url) {
                return result.image.url;
            }

            throw new Error("No image returned from background removal API");
        } catch (error: any) {
            console.error("[FalAI] Background removal failed:", error);
            throw error;
        }
    }

}

import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
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

            const resolvedModel = modelMap[model] || model;

            const input: any = {
                prompt: options.prompt,
                num_outputs: options.count || 1,
                disable_safety_checker: true, // For uncensored generation
            };

            // Add optional parameters
            if (options.negativePrompt) input.negative_prompt = options.negativePrompt;
            if (options.seed) input.seed = options.seed;
            if (options.steps) input.num_inference_steps = options.steps;
            if (options.guidanceScale) input.guidance_scale = options.guidanceScale;
            
            // Handle aspect ratio
            if (options.aspectRatio) {
                const [w, h] = this.aspectRatioToDimensions(options.aspectRatio);
                input.width = w;
                input.height = h;
            }

            // Handle image-to-image
            if (options.sourceImages?.length) {
                input.image = options.sourceImages[0];
                if (options.strength) input.prompt_strength = options.strength;
            }

            console.log("Replicate generation:", resolvedModel);
            
            const output = await this.replicate.run(resolvedModel as `${string}/${string}`, { input });

            // Handle different output formats
            const outputs = Array.isArray(output) ? output : [output];

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: outputs as string[]
            };

        } catch (error: any) {
            console.error("Replicate generation failed:", error);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
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
                outputs: Array.isArray(output) ? output : [output as string]
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

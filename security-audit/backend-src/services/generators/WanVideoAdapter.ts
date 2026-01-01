import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import * as fal from '@fal-ai/serverless-client';

export class WanVideoAdapter implements GenerationProvider {
    constructor() {
        this.initializeFal();
    }

    private initializeFal() {
        if (!process.env.FAL_KEY) {
            console.warn('FAL_KEY is not set. Wan Video generation will fail.');
        }
        fal.config({
            credentials: process.env.FAL_KEY
        });
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        throw new Error('Wan Video does not support text-to-image.');
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        // Fal subscriptions handle status internally, but if we need polling:
        return { id, status: 'succeeded' };
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        // Map options to request
        const modelId = options.model;
        const prompt = options.prompt;
        const negativePrompt = options.negativePrompt;
        const aspectRatio = options.aspectRatio;
        const seed = options.seed;
        const imageUrl = image; // image is passed as first arg in generateVideo signature
        const videoUrl = options.inputVideo; // or options.sourceVideoUrl depending on how it's mapped

        console.log(`[WanVideoAdapter] Generating video with model: ${modelId}`);

        // ============================================================
        // MODEL ID MAPPING: Frontend registry IDs -> Fal.ai endpoints
        // ============================================================
        // Frontend ModelRegistry uses simplified IDs that don't match
        // actual Fal.ai API endpoints. Map them here.
        const modelEndpointMap: Record<string, string> = {
            // Wan Text-to-Video models -> actual Fal.ai endpoint
            'fal-ai/wan-2.1-t2v-1.3b': 'fal-ai/wan-t2v',
            'fal-ai/wan-2.1-t2v': 'fal-ai/wan-t2v',
            'wan-2.1-t2v-1.3b': 'fal-ai/wan-t2v',
            'wan-2.1-t2v': 'fal-ai/wan-t2v',

            // Wan Image-to-Video models
            'fal-ai/wan-2.1-i2v-14b': 'fal-ai/wan/v2.2-a14b/image-to-video',
            'fal-ai/wan-2.1-i2v': 'fal-ai/wan/v2.2-a14b/image-to-video',
            'wan-2.1-i2v-14b': 'fal-ai/wan/v2.2-a14b/image-to-video',
            'wan-2.1-i2v': 'fal-ai/wan/v2.2-a14b/image-to-video',

            // Animation model
            'fal-ai/wan-video-2.2-animate-move': 'fal-ai/wan/v2.2-a14b/animate',
        };

        try {
            let endpoint = '';
            let input: any = {
                prompt,
                negative_prompt: negativePrompt || "low quality, worst quality, deformed, distorted, watermark",
                seed: seed || Math.floor(Math.random() * 1000000),
            };

            // 1. Wan 2.1 Text-to-Video (maps to fal-ai/wan-t2v)
            // Note: fal-ai/wan-t2v is the fast 1.3B model with different param requirements
            // It requires num_frames between 81-100 (about 3-4 seconds at 24fps)
            if (modelId === 'fal-ai/wan-2.1-t2v-1.3b' || modelId === 'wan-2.1-t2v-1.3b' || modelId === 'fal-ai/wan-2.1-t2v') {
                endpoint = modelEndpointMap[modelId] || 'fal-ai/wan-t2v';
                input.aspect_ratio = aspectRatio || "16:9";
                // wan-t2v (1.3B) requires num_frames between 81-100 (~3.5-4s at 24fps)
                // Don't include frames_per_second or sample_shift
                input.num_frames = 97; // ~4 seconds at default 24fps, within 81-100 range
                console.log(`[WanVideoAdapter] Using endpoint: ${endpoint} (mapped from ${modelId})`);
            }

            // 2. Wan 2.1 Image-to-Video
            else if (modelId === 'fal-ai/wan-2.1-i2v-14b' || modelId === 'wan-2.1-i2v-14b' || modelId === 'fal-ai/wan-2.1-i2v') {
                endpoint = modelEndpointMap[modelId] || 'fal-ai/wan/v2.2-a14b/image-to-video';
                if (!imageUrl) throw new Error('Image URL is required for Image-to-Video');
                input.image_url = imageUrl;
                input.aspect_ratio = aspectRatio || "16:9";
                console.log(`[WanVideoAdapter] Using endpoint: ${endpoint} (mapped from ${modelId})`);
            }

            // 3. Wan 2.2 Animate (Video-to-Video / Character Animation)
            else if (modelId === 'fal-ai/wan-video-2.2-animate-move') {
                endpoint = modelEndpointMap[modelId] || 'fal-ai/wan/v2.2-a14b/animate';

                // This model needs TWO inputs:
                // - A character reference (image_url) -> Who moves
                // - A motion reference (video_url)  -> How they move

                // In GenerationService/PromptBuilder mapping:
                // imageUrl = Character
                // videoUrl = Motion Reference (options.inputVideo)

                if (!imageUrl) throw new Error('Character Reference (Image) is required for Animation');
                // The motion video is passed via inputVideo in UI -> GenerationService
                const motionVideo = options.inputVideo;
                if (!motionVideo) throw new Error('Motion Reference (Video) is required for Animation');

                input = {
                    prompt,
                    image_url: imageUrl,     // Character
                    video_url: motionVideo,  // Motion Reference
                    negative_prompt: negativePrompt,
                    seed: seed
                };
                console.log(`[WanVideoAdapter] Using endpoint: ${endpoint} (mapped from ${modelId})`);
            }

            else {
                // Fallback: Check mapping first, then use model ID directly
                endpoint = modelEndpointMap[modelId || ''] || modelId || 'fal-ai/wan-t2v';
                input.aspect_ratio = aspectRatio || "16:9";
                console.log(`[WanVideoAdapter] Using fallback endpoint: ${endpoint}`);
            }

            // Submit to Fal
            console.log(`[WanVideoAdapter] Submitting to ${endpoint}...`, JSON.stringify(input, null, 2));

            const result: any = await fal.subscribe(endpoint, {
                input,
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === 'IN_PROGRESS') {
                        update.logs.map((log) => log.message).forEach(console.log);
                    }
                }
            });

            console.log('[WanVideoAdapter] Generation complete:', result);

            if (!result.video || !result.video.url) {
                // Some models return `file` or just `url` at root or `images`
                if (result.url) return { id: Date.now().toString(), status: 'succeeded', outputs: [result.url] };
                throw new Error('No video URL returned from Fal');
            }

            return {
                id: Date.now().toString(), // Helper ID, real ID is internal to Fal
                status: 'succeeded',
                outputs: [result.video.url],
                seed: result.seed || input.seed
            };

        } catch (error: any) {
            console.error('[WanVideoAdapter] Error:', error);
            // Log detailed error body if available
            if (error.body) {
                console.error('[WanVideoAdapter] Error body:', JSON.stringify(error.body, null, 2));
            }
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message || "Wan Video generation failed"
            };
        }
    }
}

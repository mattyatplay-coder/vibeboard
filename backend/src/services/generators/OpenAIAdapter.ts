import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * OpenAI Adapter - DALL-E 3 and Sora
 *
 * Image Generation (DALL-E 3):
 * - Cost: $0.040 per image (1024x1024)
 * - Cost: $0.080 per image (1024x1792 or 1792x1024)
 * - High quality, good prompt following
 * - NOTE: DALL-E URLs expire after ~1 hour, so we save images locally
 *
 * Video Generation (Sora):
 * - Access may be limited/waitlist
 * - Premium pricing when available
 *
 * Get API key at: https://platform.openai.com/api-keys
 */
export class OpenAIAdapter implements GenerationProvider {
    private client: OpenAI;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY || '';

        if (!apiKey) {
            console.warn("WARNING: OPENAI_API_KEY not set");
        }

        this.client = new OpenAI({ apiKey });
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            const model = options.model || 'dall-e-3';

            // Map aspect ratio to DALL-E 3 sizes
            const size = this.mapAspectRatioToSize(options.aspectRatio || '1:1');

            // Build the prompt - DALL-E 3 doesn't support negative prompts
            // so we incorporate negative concepts into the prompt
            let prompt = options.prompt;
            if (options.negativePrompt) {
                prompt += `. Avoid: ${options.negativePrompt}`;
            }

            const requestOptions: any = {
                model,
                prompt,
                n: 1, // DALL-E 3 only supports n=1
                size,
                quality: 'hd', // 'standard' or 'hd'
                style: 'vivid', // 'vivid' or 'natural'
                response_format: 'url', // 'url' or 'b64_json'
            };

            console.log("OpenAI DALL-E generation:", model, size);

            const response = await this.client.images.generate(requestOptions);

            const tempUrls = response.data?.map(img => img.url || '').filter(Boolean) || [];

            // If user requested multiple images, we need to make multiple calls
            if ((options.count || 1) > 1) {
                const additionalOutputs = await this.generateMultiple(
                    requestOptions,
                    (options.count || 1) - 1
                );
                tempUrls.push(...additionalOutputs);
            }

            // DALL-E URLs expire after ~1 hour, so download and save locally
            const outputs = await Promise.all(
                tempUrls.map(url => this.downloadAndSaveImage(url, model))
            );

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs
            };

        } catch (error: any) {
            console.error("OpenAI generation failed:", error.message);

            // Handle content policy violations
            if (error.code === 'content_policy_violation') {
                return {
                    id: Date.now().toString(),
                    status: 'failed',
                    error: 'Content policy violation. Try rephrasing your prompt. Note: DALL-E has strict content filters.'
                };
            }

            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            const model = options.model || 'sora-2';
            const prompt = options.prompt;
            const size = options.aspectRatio === '9:16' ? '720x1280' : '1280x720'; // Simplified mapping
            // OpenAI Sora only supports 4, 8, or 12 seconds (as string literals)
            const duration = options.duration ? parseInt(String(options.duration), 10) : 4;
            let seconds: '4' | '8' | '12';
            if (duration <= 4) seconds = '4';
            else if (duration <= 8) seconds = '8';
            else seconds = '12';

            console.log(`[OpenAIAdapter] Generating video with model ${model}, size ${size}, duration ${seconds}s`);

            // Cast client to any because 'videos' might not be in the type definition yet
            const response = await (this.client as any).videos.create({
                model,
                prompt,
                size,
                seconds, // '4', '8', or '12'
            });

            console.log("[OpenAIAdapter] Job created:", response);

            // Sora returns async job - poll until completion (like Google Veo)
            const jobId = response.id;
            const result = await this.pollVideoJob(jobId);
            return result;

        } catch (error: any) {
            // Debug: log all error properties to understand structure
            console.error("[OpenAIAdapter] Sora generation failed. Full error:");
            console.error("  error:", error);
            console.error("  error?.message:", error?.message);
            console.error("  error?.name:", error?.name);
            console.error("  error?.code:", error?.code);
            console.error("  error?.status:", error?.status);
            console.error("  error?.body:", error?.body);
            console.error("  error?.error:", error?.error);
            console.error("  typeof error:", typeof error);
            if (error) console.error("  Object.keys(error):", Object.keys(error));

            // Extract error message from OpenAI API response
            let errorMessage = "Failed to create video job";
            if (error) {
                if (error.message) {
                    errorMessage = error.message;
                } else if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.response?.data?.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.status && error.body) {
                    // OpenAI SDK error format
                    errorMessage = `HTTP ${error.status}: ${JSON.stringify(error.body)}`;
                } else if (typeof error === 'string') {
                    errorMessage = error;
                } else {
                    try {
                        // Use Object.getOwnPropertyNames to get all properties including non-enumerable
                        const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
                        if (errStr && errStr !== '{}' && errStr !== 'undefined') {
                            errorMessage = errStr;
                        } else {
                            errorMessage = `Unknown error (keys: ${Object.keys(error).join(', ')})`;
                        }
                    } catch {
                        errorMessage = `Unknown error occurred (keys: ${Object.keys(error).join(', ')})`;
                    }
                }
            }
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: errorMessage
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        try {
            // Cast client to any
            const job = await (this.client as any).videos.retrieve(id);

            console.log(`[OpenAIAdapter] Polling job ${id}: ${job.status}`);

            if (job.status === 'completed') {
                // Download the video and save it locally
                try {
                    const videoUrl = await this.downloadAndSaveVideo(id);
                    console.log(`[OpenAIAdapter] Video saved to: ${videoUrl}`);
                    return {
                        id,
                        status: 'succeeded',
                        outputs: [videoUrl]
                    };
                } catch (downloadError: any) {
                    console.error(`[OpenAIAdapter] Failed to download video:`, downloadError);
                    return {
                        id,
                        status: 'failed',
                        error: `Video completed but download failed: ${downloadError.message}`
                    };
                }
            } else if (job.status === 'failed') {
                return {
                    id,
                    status: 'failed',
                    error: job.error?.message || "Video generation failed"
                };
            }

            return {
                id,
                status: 'running' // Map 'queued'/'in_progress' to 'running'
            };

        } catch (error: any) {
            console.error(`[OpenAIAdapter] Check status failed for ${id}:`, error);
            return {
                id,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Poll video job until completion (like Google Veo's pollOperation)
     * Sora videos can take several minutes to generate
     */
    private async pollVideoJob(jobId: string): Promise<GenerationResult> {
        const maxAttempts = 120; // 10 minutes max (5 second intervals)
        const pollInterval = 5000; // 5 seconds

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            console.log(`[OpenAIAdapter] Polling attempt ${attempt + 1}/${maxAttempts} for job ${jobId}`);

            const result = await this.checkStatus(jobId);

            if (result.status === 'succeeded' || result.status === 'failed') {
                return result;
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        return {
            id: jobId,
            status: 'failed',
            error: 'Video generation timed out after 10 minutes'
        };
    }

    /**
     * Download video from OpenAI and save to local uploads folder
     */
    private async downloadAndSaveVideo(id: string): Promise<string> {
        const fs = await import('fs');
        const path = await import('path');

        console.log(`[OpenAIAdapter] Downloading video ${id}...`);

        // Download the video content using the SDK method
        const response: Response = await (this.client as any).videos.downloadContent(id, { variant: 'video' });

        if (!response.ok) {
            throw new Error(`Download failed with status ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        console.log(`[OpenAIAdapter] Downloaded ${buffer.byteLength} bytes`);

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Save to file
        const filename = `sora-${id}-${Date.now()}.mp4`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, Buffer.from(buffer));

        console.log(`[OpenAIAdapter] Video saved to: ${filepath}`);

        // Return the URL path that can be served statically
        return `/uploads/videos/${filename}`;
    }

    /**
     * Download image from temporary URL and save to local uploads folder
     * DALL-E URLs expire after ~1 hour, so we persist them locally
     */
    private async downloadAndSaveImage(url: string, model: string): Promise<string> {
        try {
            console.log(`[OpenAIAdapter] Downloading image from DALL-E...`);

            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                timeout: 30000,
            });

            const buffer = Buffer.from(response.data);
            console.log(`[OpenAIAdapter] Downloaded ${buffer.length} bytes`);

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Determine extension from content-type or default to png
            const contentType = response.headers['content-type'] || 'image/png';
            const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';

            // Save to file
            const filename = `${model}-${Date.now()}${ext}`;
            const filepath = path.join(uploadsDir, filename);
            fs.writeFileSync(filepath, buffer);

            console.log(`[OpenAIAdapter] Image saved to: ${filepath}`);

            // Return the URL path that can be served statically
            return `/uploads/images/${filename}`;
        } catch (error: any) {
            console.error(`[OpenAIAdapter] Failed to download image:`, error.message);
            // Fall back to original URL if download fails (better than nothing)
            return url;
        }
    }

    /**
     * Generate multiple images (DALL-E 3 only supports n=1)
     */
    private async generateMultiple(baseOptions: any, count: number): Promise<string[]> {
        const outputs: string[] = [];

        for (let i = 0; i < count; i++) {
            try {
                const response = await this.client.images.generate(baseOptions);
                const url = response.data?.[0]?.url;
                if (url) outputs.push(url);
            } catch (error) {
                console.error(`Additional image ${i + 1} failed:`, error);
            }
        }

        return outputs;
    }

    /**
     * Edit an existing image (DALL-E 2 only)
     */
    async editImage(
        image: Buffer,
        mask: Buffer,
        prompt: string,
        options: GenerationOptions
    ): Promise<GenerationResult> {
        // Implementation commented out due to File type issues in Node environment
        return {
            id: Date.now().toString(),
            status: 'failed',
            error: 'Edit image not supported in this environment'
        };
        /*
        try {
            const response = await this.client.images.edit({
                model: 'dall-e-2',
                image: new File([image], 'image.png', { type: 'image/png' }),
                mask: new File([mask], 'mask.png', { type: 'image/png' }),
                prompt,
                n: options.count || 1,
                size: this.mapAspectRatioToSize(options.aspectRatio || '1:1') as any,
            });

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: response.data.map(img => img.url || '').filter(Boolean)
            };

        } catch (error: any) {
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
        */
    }

    /**
     * Create variations of an image (DALL-E 2 only)
     */
    async createVariation(
        image: Buffer,
        options: GenerationOptions
    ): Promise<GenerationResult> {
        // Implementation commented out due to File type issues in Node environment
        return {
            id: Date.now().toString(),
            status: 'failed',
            error: 'Create variation not supported in this environment'
        };
        /*
        try {
            const response = await this.client.images.createVariation({
                model: 'dall-e-2',
                image: new File([image], 'image.png', { type: 'image/png' }),
                n: options.count || 1,
                size: this.mapAspectRatioToSize(options.aspectRatio || '1:1') as any,
            });

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: response.data.map(img => img.url || '').filter(Boolean)
            };

        } catch (error: any) {
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
        */
    }

    /**
     * Enhance prompt using GPT-4 for better generation results
     */
    async enhancePrompt(prompt: string, style?: string): Promise<string> {
        try {
            const systemPrompt = `You are an expert at writing prompts for AI image generation. 
Your task is to enhance the user's prompt to get better results from DALL-E 3.
Add descriptive details about:
- Lighting and atmosphere
- Composition and framing
- Art style and medium
- Colors and mood
Keep the enhanced prompt under 400 characters.
${style ? `Apply this style: ${style}` : ''}
Return ONLY the enhanced prompt, no explanations.`;

            const response = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.7
            });

            return response.choices[0]?.message?.content || prompt;

        } catch (error) {
            console.error("Prompt enhancement failed:", error);
            return prompt;
        }
    }

    private mapAspectRatioToSize(ratio: string): '1024x1024' | '1024x1792' | '1792x1024' {
        // DALL-E 3 only supports these three sizes
        switch (ratio) {
            case '9:16':
            case '3:4':
                return '1024x1792'; // Portrait
            case '16:9':
            case '4:3':
            case '21:9':
                return '1792x1024'; // Landscape
            default:
                return '1024x1024'; // Square
        }
    }
}

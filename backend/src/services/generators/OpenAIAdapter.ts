import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import OpenAI from 'openai';

/**
 * OpenAI Adapter - DALL-E 3 and Sora
 * 
 * Image Generation (DALL-E 3):
 * - Cost: $0.040 per image (1024x1024)
 * - Cost: $0.080 per image (1024x1792 or 1792x1024)
 * - High quality, good prompt following
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

            const outputs = response.data?.map(img => img.url || '').filter(Boolean) || [];

            // If user requested multiple images, we need to make multiple calls
            if ((options.count || 1) > 1) {
                const additionalOutputs = await this.generateMultiple(
                    requestOptions,
                    (options.count || 1) - 1
                );
                outputs.push(...additionalOutputs);
            }

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
        // Sora integration - currently limited access
        try {
            // Check if Sora is available (it's in limited release)
            const model = options.model || 'sora-1.0';

            // Note: Sora API structure is hypothetical as it's not publicly available yet
            // This is based on expected API patterns
            const payload: any = {
                model,
                prompt: options.prompt,
                duration: parseInt(options.duration || '5'),
                aspect_ratio: options.aspectRatio || '16:9',
            };

            if (image) {
                payload.image = image;
            }

            if (options.negativePrompt) {
                payload.negative_prompt = options.negativePrompt;
            }

            console.log("OpenAI Sora generation (experimental):", model);

            // When Sora becomes available, the API call would look something like:
            // const response = await this.client.videos.generate(payload);

            // For now, return not available
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: 'Sora video generation is not yet publicly available. Check OpenAI for access.'
            };

        } catch (error: any) {
            console.error("OpenAI Sora generation failed:", error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        // OpenAI generations are synchronous
        return { id, status: 'succeeded' };
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

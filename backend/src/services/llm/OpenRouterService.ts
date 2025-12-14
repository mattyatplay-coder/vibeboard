import OpenAI from 'openai';

export class OpenRouterService {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000', // To identify your app on OpenRouter rankings
                'X-Title': 'VibeBoard',
            }
        });
    }

    /**
     * Analyzes an image using Grok Vision or other supported OpenRouter models.
     * @param imageUrl Base64 data URL or public HTTPS URL
     * @param prompt The prompt for the vision model
     * @returns The text description/analysis
     */
    async analyzeImage(
        images: string | string[],
        prompt: string = "Analyze this image efficiently.",
        model: string = "x-ai/grok-4"
    ): Promise<string> {
        try {
            console.log(`[OpenRouterService] Analyzing image with ${model}...`);

            const response = await this.client.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            ...(Array.isArray(images) ? images : [images]).map(url => ({
                                type: 'image_url' as const,
                                image_url: { url }
                            }))
                        ]
                    }
                ],
                max_tokens: 1000
            });

            const content = response.choices[0]?.message?.content || "";
            console.log(`[OpenRouterService] Analysis complete (${content.length} chars)`);
            return content;

        } catch (error) {
            console.error("[OpenRouterService] Failed to analyze image:", error);
            throw error;
        }
    }
    /**
     * Generic chat completion method
     */
    async chat(params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming): Promise<OpenAI.Chat.Completions.ChatCompletion> {
        return this.client.chat.completions.create(params);
    }
}

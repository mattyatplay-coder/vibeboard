import OpenAI from 'openai';
import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';

/**
 * Dolphin Adapter for LLM operations (via OpenRouter)
 *
 * Best for: Mature/uncensored content, NSFW screenplay generation
 * Uses uncensored models via OpenRouter with automatic fallback
 *
 * Model capabilities:
 * - Uncensored creative writing
 * - Adult content generation
 * - No content filtering or refusal
 * - Maintains creative quality without sanitization
 *
 * Fallback Order (Dec 2025):
 * 1. cognitivecomputations/dolphin-mistral-24b-venice-edition:free (FREE)
 * 2. nousresearch/hermes-3-llama-3.1-405b:free (FREE, 405B params!)
 * 3. nousresearch/deephermes-3-mistral-24b-preview (CHEAP $0.02/1M)
 * 4. nousresearch/hermes-3-llama-3.1-70b (CHEAP $0.30/1M)
 * 5. microsoft/wizardlm-2-8x22b (MID $0.48/1M)
 *
 * @see https://openrouter.ai/cognitivecomputations/dolphin-mistral-24b-venice-edition:free
 */

// Models to try in order (free first, then cheap paid)
// Source: https://openrouter.ai/api/v1/models
// All models below are uncensored / have low refusal rates
const MODEL_FALLBACK_ORDER = [
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',  // FREE - Venice uncensored (primary)
    'nousresearch/hermes-3-llama-3.1-405b:free',                      // FREE - Hermes 405B uncensored (fallback)
    'nousresearch/deephermes-3-mistral-24b-preview',                  // CHEAP $0.02/$0.10 per 1M tokens
    'nousresearch/hermes-3-llama-3.1-70b',                            // CHEAP $0.30/$0.30 per 1M tokens
    'microsoft/wizardlm-2-8x22b',                                     // MID $0.48/$0.48 per 1M tokens
];

export class DolphinAdapter implements LLMProvider {
    private client: OpenAI;
    private model: string;
    private fallbackModels: string[];

    constructor() {
        const apiKey = process.env.OPENROUTER_API_KEY || '';
        if (!apiKey) {
            console.warn('OPENROUTER_API_KEY is not set. Dolphin generations will fail.');
        }

        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'VibeBoard Story Editor',
            }
        });

        // Use configured model or default to free Dolphin R1
        this.model = process.env.DOLPHIN_MODEL || MODEL_FALLBACK_ORDER[0];
        this.fallbackModels = MODEL_FALLBACK_ORDER.filter(m => m !== this.model);

        console.log(`[DolphinAdapter] Initialized with model: ${this.model}`);
        console.log(`[DolphinAdapter] Fallback models: ${this.fallbackModels.join(', ')}`);
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        // Build list of models to try
        const modelsToTry = [request.model || this.model, ...this.fallbackModels];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                console.log(`[DolphinAdapter] Trying model: ${model}`);

                const response = await this.client.chat.completions.create({
                    model,
                    messages: [
                        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
                        { role: 'user' as const, content: request.prompt }
                    ],
                    max_tokens: request.maxTokens || 8192,
                    temperature: request.temperature ?? 0.8,
                    stop: request.stop
                });

                const content = response.choices[0]?.message?.content || '';

                console.log(`[DolphinAdapter] Generated ${content.length} chars with ${model}`);

                return {
                    content,
                    usage: response.usage ? {
                        promptTokens: response.usage.prompt_tokens,
                        completionTokens: response.usage.completion_tokens,
                        totalTokens: response.usage.total_tokens
                    } : undefined
                };
            } catch (error: any) {
                console.error(`[DolphinAdapter] Error with ${model}:`, error.message);
                lastError = error;

                // If auth error, don't try other models - the key is bad
                if (error.status === 401) {
                    throw new Error('OpenRouter API authentication failed. Check OPENROUTER_API_KEY.');
                }

                // If rate limited (429), try next model
                if (error.status === 429) {
                    console.log(`[DolphinAdapter] Rate limited on ${model}, trying next fallback...`);
                    continue;
                }

                // For other errors, also try fallback
                console.log(`[DolphinAdapter] Error on ${model}, trying next fallback...`);
            }
        }

        // All models failed
        throw new Error(`All Dolphin models failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
        // Build list of models to try
        const modelsToTry = [request.model || this.model, ...this.fallbackModels];
        let lastError: Error | null = null;

        for (const model of modelsToTry) {
            try {
                console.log(`[DolphinAdapter] Streaming with model: ${model}`);

                const stream = await this.client.chat.completions.create({
                    model,
                    messages: [
                        ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
                        { role: 'user' as const, content: request.prompt }
                    ],
                    max_tokens: request.maxTokens || 8192,
                    temperature: request.temperature ?? 0.8,
                    stop: request.stop,
                    stream: true
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                }

                console.log(`[DolphinAdapter] Stream complete with ${model}`);
                return; // Success, exit
            } catch (error: any) {
                console.error(`[DolphinAdapter] Stream error with ${model}:`, error.message);
                lastError = error;

                if (error.status === 401) {
                    throw new Error('OpenRouter API authentication failed. Check OPENROUTER_API_KEY.');
                }

                if (error.status === 429) {
                    console.log(`[DolphinAdapter] Rate limited on ${model}, trying next fallback...`);
                    continue;
                }

                console.log(`[DolphinAdapter] Error on ${model}, trying next fallback...`);
            }
        }

        throw new Error(`All Dolphin models failed streaming. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Dolphin doesn't have native vision support
     * For vision tasks, use GrokAdapter
     */
    async analyzeImage(images: (string | { url: string, label: string })[], prompt: string): Promise<string> {
        throw new Error('Vision analysis not implemented for DolphinAdapter. Use GrokAdapter for vision tasks.');
    }
}

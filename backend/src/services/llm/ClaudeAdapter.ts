import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';

/**
 * Claude Adapter for LLM operations
 *
 * Best for: Creative writing, screenplay generation, story structure
 * Uses Claude Sonnet 4 by default for fast, high-quality creative output
 *
 * Claude excels at:
 * - Pixar-style storytelling structure
 * - Character voice consistency
 * - Screenplay formatting
 * - Long-form narrative generation
 */
export class ClaudeAdapter implements LLMProvider {
    private client: Anthropic;

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY || '';
        if (!apiKey) {
            console.warn('ANTHROPIC_API_KEY is not set. Claude generations will fail.');
        }
        this.client = new Anthropic({ apiKey });
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        try {
            console.log(`[ClaudeAdapter] Generating with model: ${request.model || 'claude-sonnet-4-20250514'}`);

            const message = await this.client.messages.create({
                model: request.model || 'claude-sonnet-4-20250514',
                max_tokens: request.maxTokens || 8192,
                system: request.systemPrompt || undefined,
                messages: [
                    { role: 'user', content: request.prompt }
                ],
                stop_sequences: request.stop
            });

            // Extract text content from response
            const textContent = message.content.find(block => block.type === 'text');
            const content = textContent?.type === 'text' ? textContent.text : '';

            console.log(`[ClaudeAdapter] Generated ${content.length} chars, stop_reason: ${message.stop_reason}`);

            return {
                content,
                usage: {
                    promptTokens: message.usage.input_tokens,
                    completionTokens: message.usage.output_tokens,
                    totalTokens: message.usage.input_tokens + message.usage.output_tokens
                }
            };
        } catch (error: any) {
            console.error('Claude API Error:', error.message);
            if (error.status === 401) {
                throw new Error('Claude API authentication failed. Check ANTHROPIC_API_KEY.');
            }
            throw new Error(`Claude generation failed: ${error.message}`);
        }
    }

    async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
        try {
            console.log(`[ClaudeAdapter] Streaming with model: ${request.model || 'claude-sonnet-4-20250514'}`);

            const stream = this.client.messages.stream({
                model: request.model || 'claude-sonnet-4-20250514',
                max_tokens: request.maxTokens || 8192,
                system: request.systemPrompt || undefined,
                messages: [
                    { role: 'user', content: request.prompt }
                ],
                stop_sequences: request.stop
            });

            for await (const event of stream) {
                if (event.type === 'content_block_delta') {
                    const delta = event.delta;
                    if ('text' in delta) {
                        onChunk(delta.text);
                    }
                }
            }

            console.log('[ClaudeAdapter] Stream complete');
        } catch (error: any) {
            console.error('Claude Stream Error:', error.message);
            throw new Error(`Claude streaming failed: ${error.message}`);
        }
    }

    /**
     * Claude doesn't have native vision in the same way as Grok
     * For vision tasks, continue using GrokAdapter
     * This method throws an error to indicate vision is not supported
     */
    async analyzeImage(images: (string | { url: string, label: string })[], prompt: string): Promise<string> {
        // Claude does support vision, but we recommend Grok for faster analysis
        // If you want to enable Claude vision, implement it here similar to GrokAdapter
        throw new Error('Vision analysis not implemented for ClaudeAdapter. Use GrokAdapter for vision tasks.');
    }
}

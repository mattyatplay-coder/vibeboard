import axios from 'axios';
import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';

export class GrokAdapter implements LLMProvider {
    private apiKey: string;
    private baseUrl = 'https://api.x.ai/v1';

    constructor() {
        this.apiKey = process.env.XAI_API_KEY || '';
        if (!this.apiKey) {
            console.warn('XAI_API_KEY is not set. Grok generations will fail.');
        }
    }

    async generate(request: LLMRequest): Promise<LLMResponse> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    messages: [
                        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
                        { role: 'user', content: request.prompt }
                    ],
                    model: request.model || 'grok-4',
                    temperature: request.temperature || 0.7,
                    max_tokens: request.maxTokens,
                    stream: false
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const completion = response.data.choices[0].message.content;
            const usage = response.data.usage;

            return {
                content: completion,
                usage: {
                    promptTokens: usage?.prompt_tokens || 0,
                    completionTokens: usage?.completion_tokens || 0,
                    totalTokens: usage?.total_tokens || 0
                }
            };
        } catch (error: any) {
            console.error('Grok API Error:', error.response?.data || error.message);
            throw new Error(`Grok generation failed: ${error.message}`);
        }
    }

    async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    messages: [
                        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
                        { role: 'user', content: request.prompt }
                    ],
                    model: request.model || 'grok-4',
                    temperature: request.temperature || 0.7,
                    max_tokens: request.maxTokens,
                    stream: true
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    responseType: 'stream'
                }
            );

            const stream = response.data;

            for await (const chunk of stream) {
                const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
                for (const line of lines) {
                    if (line.includes('[DONE]')) return;
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content;
                            if (content) {
                                onChunk(content);
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk:', e);
                        }
                    }
                }
            }

        } catch (error: any) {
            console.error('Grok Stream Error:', error.response?.data || error.message);
            throw new Error(`Grok streaming failed: ${error.message}`);
        }
    }
}

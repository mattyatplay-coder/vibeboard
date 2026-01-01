import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';
import axios from 'axios';

export class TogetherLLMAdapter implements LLMProvider {
  private apiKey: string;
  private baseUrl = 'https://api.together.xyz/v1';

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('WARNING: TOGETHER_API_KEY not set for LLM service');
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      const model = this.normalizeModel(request.model);

      const payload = {
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stop: request.stop,
        stream: false,
      };

      console.log(
        `Together LLM Request (${model}):`,
        JSON.stringify(payload.messages[payload.messages.length - 1]).substring(0, 100) + '...'
      );

      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const content = response.data.choices[0]?.message?.content || '';
      const usage = response.data.usage
        ? {
            promptTokens: response.data.usage.prompt_tokens,
            completionTokens: response.data.usage.completion_tokens,
            totalTokens: response.data.usage.total_tokens,
          }
        : undefined;

      return { content, usage };
    } catch (error: any) {
      console.error('Together LLM generation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
    try {
      const model = this.normalizeModel(request.model);

      const payload = {
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stop: request.stop,
        stream: true,
      };

      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      });

      const stream = response.data;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const lines = chunk
            .toString()
            .split('\n')
            .filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6));
                const content = json.choices[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                console.warn('Failed to parse SSE chunk:', e);
              }
            }
          }
        });

        stream.on('end', () => resolve());
        stream.on('error', (err: any) => reject(err));
      });
    } catch (error: any) {
      console.error('Together LLM stream failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  private normalizeModel(model?: string): string {
    if (!model) return 'Qwen/Qwen2.5-72B-Instruct-Turbo'; // Default to Qwen 2.5 72B

    // If it's already a full ID, return it
    if (model.includes('/')) return model;

    // Map friendly names
    const map: Record<string, string> = {
      'qwen-2.5-72b': 'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'qwen-2.5-coder': 'Qwen/Qwen2.5-Coder-32B-Instruct',
      'qwen-2.5-7b': 'Qwen/Qwen2.5-7B-Instruct-Turbo',
      'llama-3-70b': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'llama-3-8b': 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'gemma-2-27b': 'google/gemma-2-27b-it',
    };

    return map[model] || model;
  }
}

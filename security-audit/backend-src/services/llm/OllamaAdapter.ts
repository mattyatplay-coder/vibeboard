import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';
import axios from 'axios';

export class OllamaAdapter implements LLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: request.model || 'llama3', // Default to llama3 or deepseek-r1
        prompt: request.prompt,
        system: request.systemPrompt,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
          stop: request.stop,
        },
      });

      return {
        content: response.data.response,
        usage: {
          promptTokens: response.data.prompt_eval_count,
          completionTokens: response.data.eval_count,
          totalTokens: response.data.prompt_eval_count + response.data.eval_count,
        },
      };
    } catch (error: any) {
      console.error('Ollama generation failed:', error);
      throw new Error(`Ollama failed: ${error.message}`);
    }
  }

  async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: request.model || 'llama3',
          prompt: request.prompt,
          system: request.systemPrompt,
          stream: true,
          options: {
            temperature: request.temperature,
            num_predict: request.maxTokens,
            stop: request.stop,
          },
        },
        {
          responseType: 'stream',
        }
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim() !== '');
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (!json.done) {
              onChunk(json.response);
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    } catch (error: any) {
      console.error('Ollama stream failed:', error);
      throw new Error(`Ollama stream failed: ${error.message}`);
    }
  }
}

import { LLMProvider, LLMRequest, LLMResponse } from './llm/LLMProvider';
import { OllamaAdapter } from './llm/OllamaAdapter';
import { GrokAdapter } from './llm/GrokAdapter';

export type LLMProviderType = 'ollama' | 'grok';

export class LLMService {
  private provider: LLMProvider;

  constructor(providerType: 'ollama' | 'grok' = 'ollama') {
    // Factory logic
    if (providerType === 'grok') {
      this.provider = new GrokAdapter();
    } else {
      this.provider = new OllamaAdapter();
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    return this.provider.generate(request);
  }

  async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
    return this.provider.stream(request, onChunk);
  }
}

import { LLMProvider, LLMRequest, LLMResponse } from './llm/LLMProvider';
import { OllamaAdapter } from './llm/OllamaAdapter';
import { GrokAdapter } from './llm/GrokAdapter';
import { ClaudeAdapter } from './llm/ClaudeAdapter';
import { DolphinAdapter } from './llm/DolphinAdapter';

export type LLMProviderType = 'ollama' | 'grok' | 'claude' | 'dolphin';

export class LLMService {
  private provider: LLMProvider;

  constructor(providerType: LLMProviderType = 'ollama') {
    // Factory logic
    if (providerType === 'claude') {
      this.provider = new ClaudeAdapter();
    } else if (providerType === 'grok') {
      this.provider = new GrokAdapter();
    } else if (providerType === 'dolphin') {
      // Dolphin via OpenRouter - uncensored for mature content
      this.provider = new DolphinAdapter();
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

  async analyzeImage(
    images: (string | { url: string; label: string })[],
    prompt: string
  ): Promise<string> {
    if (this.provider.analyzeImage) {
      return this.provider.analyzeImage(images, prompt);
    }
    throw new Error('Current LLM provider does not support image analysis');
  }
}

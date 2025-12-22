import axios from 'axios';
import { LLMProvider, LLMRequest, LLMResponse } from './LLMProvider';
import fs from 'fs';
import path from 'path';
import { KnowledgeBaseService } from '../knowledge/KnowledgeBaseService';

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
      // Inject Knowledge Base Context
      const params = request;
      let finalSystemPrompt = params.systemPrompt || '';

      try {
        const knowledge = await KnowledgeBaseService.getInstance().getGlobalContext();
        finalSystemPrompt = `${knowledge}\n\n${finalSystemPrompt}`;
      } catch (kErr) {
        console.warn('GrokAdapter: Failed to inject knowledge base context', kErr);
      }

      console.log(`[GrokAdapter] Sending request to ${this.baseUrl}/chat/completions`);
      console.log(`[GrokAdapter] Key present: ${this.apiKey ? 'Yes' : 'No'}`);

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          messages: [
            ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
            { role: 'user', content: request.prompt },
          ],
          model: request.model || 'grok-3',
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const completion = response.data.choices[0].message.content;
      const usage = response.data.usage;

      return {
        content: completion,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      console.error('Grok API Error:', error.response?.data || error.message);
      throw new Error(`Grok generation failed: ${error.message}`);
    }
  }

  async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<void> {
    try {
      // Inject Knowledge Base Context
      let finalSystemPrompt = request.systemPrompt || '';
      try {
        const knowledge = await KnowledgeBaseService.getInstance().getGlobalContext();
        finalSystemPrompt = `${knowledge}\n\n${finalSystemPrompt}`;
      } catch (kErr) {
        console.warn('GrokAdapter: Failed to inject knowledge base context', kErr);
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          messages: [
            ...(finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }] : []),
            { role: 'user', content: request.prompt },
          ],
          model: request.model || 'grok-beta',
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens,
          stream: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
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

  async analyzeImage(
    images: (string | { url: string; label: string })[],
    prompt: string
  ): Promise<string> {
    try {
      console.log(`[GrokAdapter] Analyzing ${images.length} items with grok-2-vision-1212...`);

      // Inject Knowledge Base Context
      let contextStr = '';
      try {
        contextStr = await KnowledgeBaseService.getInstance().getGlobalContext();
      } catch (e) {
        console.warn('Failed to get knowledge context for vision', e);
      }

      const contentConfig: any[] = [];

      // Add system-like context as first text block if it exists
      if (contextStr) {
        contentConfig.push({
          type: 'text',
          text: `SYSTEM CONTEXT (Know about these tools):\n${contextStr}\n\nUSER PROMPT:\n${prompt}`,
        });
      } else {
        contentConfig.push({ type: 'text', text: prompt });
      }

      // Process images sequentially to handle async file reading
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let url: string;
        let label: string;

        if (typeof item === 'string') {
          url = item;
          label = i === 0 ? `[Image 1: GENERATED RESULT]` : `[Image ${i + 1}: REFERENCE ${i}]`;
        } else {
          url = item.url;
          label = item.label;
        }

        // Handle Local Images (localhost)
        if (url.includes('localhost') || url.startsWith('/')) {
          console.log(`[GrokAdapter] Converting local image to Base64: ${url}`);
          try {
            let filePath = '';
            // Extract relative path from URL
            // e.g. http://localhost:3001/uploads/foo.png -> uploads/foo.png
            if (url.startsWith('http')) {
              const urlObj = new URL(url);
              filePath = urlObj.pathname;
            } else {
              filePath = url;
            }

            // Remove leading slash
            if (filePath.startsWith('/')) filePath = filePath.substring(1);

            // Construct absolute path (assuming backend root is where uploads/ exists or similar)
            // Adjust base path as needed. In this setup, static files are likely in 'uploads' in backend root.
            // backend/src/services/llm -> backend/
            const backendRoot = path.resolve(__dirname, '../../../');
            const absolutePath = path.join(backendRoot, filePath);

            if (fs.existsSync(absolutePath)) {
              const buffer = fs.readFileSync(absolutePath);
              const base64 = buffer.toString('base64');
              const ext = path.extname(absolutePath).substring(1); // png, jpg
              const mimeType = ext === 'jpg' ? 'jpeg' : ext; // simple mapping
              url = `data:image/${mimeType};base64,${base64}`;
            } else {
              console.warn(`[GrokAdapter] Local file not found: ${absolutePath}`);
              // Fallback: try fetching from localhost using axios (safer for complex routing)
              try {
                const localParams = url.startsWith('http') ? url : `http://localhost:3001/${url}`;
                const res = await axios.get(localParams, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(res.data, 'binary').toString('base64');
                const contentType = res.headers['content-type'];
                url = `data:${contentType};base64,${base64}`;
              } catch (fetchErr) {
                console.error(`[GrokAdapter] Failed to fetch local image: ${fetchErr}`);
              }
            }
          } catch (e) {
            console.error(`[GrokAdapter] Error processing local image: ${e}`);
          }
        }

        contentConfig.push({ type: 'text', text: label });

        contentConfig.push({
          type: 'image_url',
          image_url: {
            url: url,
            detail: 'high',
          },
        });
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          messages: [
            {
              role: 'user',
              content: contentConfig,
            },
          ],
          model: 'grok-2-vision-1212',
          temperature: 0.2, // Lower temp for factual analysis
          max_tokens: 1000,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error(
        'Grok Vision Error:',
        JSON.stringify(error.response?.data, null, 2) || error.message
      );
      throw new Error(
        `Grok Vision failed: ${error.message} - ${JSON.stringify(error.response?.data)}`
      );
    }
  }
}

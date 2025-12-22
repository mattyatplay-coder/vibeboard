import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import { Civitai, Scheduler } from 'civitai';

/**
 * Civitai Adapter - Community models and video generation
 * Uses the official Civitai JavaScript SDK for reliable generation
 *
 * IMAGE MODELS:
 * - AuraFlow, Chroma, Flux family, HiDream, Hunyuan 1
 * - Illustrious, Kolors, Lumina, NoobAI, PixArt family
 * - Pony, Qwen, Stable Diffusion family, SDXL family, ZImageTurbo
 *
 * VIDEO MODELS:
 * - CogVideoX, Hunyuan Video, LTXV, Mochi
 * - Wan Video family (1.3B, 14B, 2.2, 2.5)
 */
export class CivitaiAdapter implements GenerationProvider {
  private civitai: any; // Civitai SDK instance
  private apiKey: string;

  // Model URN mappings for Civitai
  // Format: urn:air:{ecosystem}:{type}:civitai:{modelId}@{versionId}
  private readonly imageModelMap: Record<string, { baseModel: string; urn?: string }> = {
    // Flux models
    'flux-1-d': { baseModel: 'Flux.1 D', urn: 'urn:air:flux1:checkpoint:civitai:618692@691639' },
    'flux-1-s': { baseModel: 'Flux.1 S' },
    'flux-1-krea': { baseModel: 'Flux.1 Krea' },
    'flux-1-kontext': { baseModel: 'Flux.1 Kontext' },
    'flux-2-d': { baseModel: 'Flux.2 D' },
    // SDXL - using a popular SDXL model
    'sdxl-1-0': { baseModel: 'SDXL 1.0', urn: 'urn:air:sdxl:checkpoint:civitai:133005@348913' },
    'sdxl-lightning': { baseModel: 'SDXL Lightning' },
    'sdxl-hyper': { baseModel: 'SDXL Hyper' },
    // Stable Diffusion versions
    'sd-1-5': { baseModel: 'SD 1.5', urn: 'urn:air:sd1:checkpoint:civitai:4201@130072' },
    'sd-1-4': { baseModel: 'SD 1.4' },
    'sd-1-5-lcm': { baseModel: 'SD 1.5 LCM' },
    'sd-1-5-hyper': { baseModel: 'SD 1.5 Hyper' },
    'sd-2-0': { baseModel: 'SD 2.0' },
    'sd-2-1': { baseModel: 'SD 2.1' },
    // AuraFlow
    auraflow: { baseModel: 'AuraFlow' },
    // Chroma
    chroma: { baseModel: 'Chroma' },
    // HiDream
    hidream: { baseModel: 'HiDream' },
    // Hunyuan
    'hunyuan-1': { baseModel: 'Hunyuan 1' },
    // Illustrious
    illustrious: { baseModel: 'Illustrious' },
    // Kolors
    kolors: { baseModel: 'Kolors' },
    // Lumina
    lumina: { baseModel: 'Lumina' },
    // NoobAI
    noobai: { baseModel: 'NoobAI' },
    // PixArt
    'pixart-a': { baseModel: 'PixArt a' },
    'pixart-e': { baseModel: 'PixArt E' },
    // Pony
    pony: { baseModel: 'Pony' },
    'pony-v7': { baseModel: 'Pony V7' },
    // Qwen
    qwen: { baseModel: 'Qwen' },
    // ZImageTurbo
    'zimage-turbo': { baseModel: 'ZImageTurbo' },
    // Other
    other: { baseModel: 'Other' },
  };

  // Video models mapping
  private readonly videoModelMap: Record<string, string> = {
    cogvideox: 'CogVideoX',
    'hunyuan-video': 'Hunyuan Video',
    ltxv: 'LTXV',
    mochi: 'Mochi',
    'wan-video-1-3b-t2v': 'Wan Video 1.3B t2v',
    'wan-video-14b-t2v': 'Wan Video 14B t2v',
    'wan-video-14b-i2v-480p': 'Wan Video 14B i2v 480p',
    'wan-video-14b-i2v-720p': 'Wan Video 14B i2v 720p',
    'wan-video-2-2-t2v-5b': 'Wan Video 2.2 TI2V-5B',
    'wan-video-2-2-i2v-a14b': 'Wan Video 2.2 I2V-A14B',
    'wan-video-2-2-t2v-a14b': 'Wan Video 2.2 T2V-A14B',
    'wan-video-2-5-t2v': 'Wan Video 2.5 T2V',
    'wan-video-2-5-i2v': 'Wan Video 2.5 I2V',
  };

  constructor() {
    this.apiKey = process.env.CIVITAI_API_TOKEN || '';
    if (!this.apiKey) {
      console.warn('WARNING: CIVITAI_API_TOKEN is not set. Civitai generations will fail.');
    }
    this.civitai = new Civitai({ auth: this.apiKey });
  }

  private formatPrompt(prompt: string): string {
    let formatted = prompt.trim();
    const qualityTags = ['best quality', 'masterpiece'];
    const missingTags = qualityTags.filter(tag => !formatted.toLowerCase().includes(tag));
    if (missingTags.length > 0) {
      formatted += `, ${missingTags.join(', ')}`;
    }
    return formatted;
  }

  private getDefaultNegativePrompt(): string {
    return 'lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]';
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    try {
      if (!this.apiKey) throw new Error('Civitai API key not configured');

      // Resolve model URN
      let modelUrn: string | undefined;
      let baseModel = 'SDXL 1.0';

      if (options.model) {
        if (options.model.includes('urn:air')) {
          modelUrn = options.model;
        } else if (this.imageModelMap[options.model]) {
          const mapping = this.imageModelMap[options.model];
          baseModel = mapping.baseModel;
          modelUrn = mapping.urn;
        } else {
          baseModel = options.model;
        }
      }

      // Default to SDXL if no URN available
      if (!modelUrn) {
        modelUrn = 'urn:air:sdxl:checkpoint:civitai:133005@348913'; // Juggernaut XL
      }

      console.log(`[Civitai] Using model: ${modelUrn} (base: ${baseModel})`);

      // Handle LoRAs using additionalNetworks parameter (official SDK method)
      // LoRAs can be specified as:
      // - Civitai model ID: "123456" or "123456@789012"
      // - Full AIR URN: "urn:air:sdxl:lora:civitai:123456@789012"
      // - HuggingFace URL (limited support)
      const additionalNetworks: Record<string, { strength: number; triggerWord?: string }> = {};

      if (options.loras && options.loras.length > 0) {
        for (const lora of options.loras) {
          let loraUrn: string;
          const loraPath = lora.path.trim();

          if (loraPath.startsWith('urn:air:')) {
            // Already a full AIR URN
            loraUrn = loraPath;
          } else if (loraPath.match(/^\d+(@\d+)?$/)) {
            // Civitai model ID format: "123456" or "123456@789012"
            // Determine ecosystem from base model
            const ecosystem = baseModel.toLowerCase().includes('flux')
              ? 'flux1'
              : baseModel.toLowerCase().includes('sdxl')
                ? 'sdxl'
                : baseModel.toLowerCase().includes('pony')
                  ? 'pony'
                  : 'sd1';
            loraUrn = `urn:air:${ecosystem}:lora:civitai:${loraPath}`;
          } else if (loraPath.startsWith('http')) {
            // URL-based LoRA (HuggingFace, etc.) - use as-is
            // Note: Civitai SDK may have limited support for external URLs
            loraUrn = loraPath;
            console.warn(`[Civitai] External URL LoRA may have limited support: ${loraPath}`);
          } else {
            // Assume it's a Civitai model ID without version
            const ecosystem = baseModel.toLowerCase().includes('flux')
              ? 'flux1'
              : baseModel.toLowerCase().includes('sdxl')
                ? 'sdxl'
                : 'sd1';
            loraUrn = `urn:air:${ecosystem}:lora:civitai:${loraPath}`;
          }

          additionalNetworks[loraUrn] = {
            strength: lora.strength || 1.0,
            ...(lora.triggerWord ? { triggerWord: lora.triggerWord } : {}),
          };
          console.log(`[Civitai] Added LoRA: ${loraUrn} (strength: ${lora.strength})`);
        }
      }

      const finalPrompt = this.formatPrompt(options.prompt);
      const finalNegativePrompt = options.negativePrompt || this.getDefaultNegativePrompt();

      // Build the generation request using SDK
      const input: any = {
        model: modelUrn,
        params: {
          prompt: finalPrompt,
          negativePrompt: finalNegativePrompt,
          scheduler: (options.scheduler?.value as Scheduler) || Scheduler.EULER_A,
          steps: options.steps || 25,
          cfgScale: options.guidanceScale || 7,
          width: options.width || 1024,
          height: options.height || 1024,
          seed: options.seed,
          clipSkip: 2,
        },
      };

      // Add LoRAs via additionalNetworks if any
      if (Object.keys(additionalNetworks).length > 0) {
        input.additionalNetworks = additionalNetworks;
      }

      console.log('[Civitai] Sending generation request:', JSON.stringify(input, null, 2));

      // Use SDK to generate
      const response = await this.civitai.image.fromText(input, true); // true = wait for completion

      console.log('[Civitai] Generation response:', JSON.stringify(response, null, 2));

      // Extract image URLs from response
      const outputs: string[] = [];
      if (response.jobs && response.jobs.length > 0) {
        for (const job of response.jobs) {
          if (job.result && job.result.blobUrl) {
            outputs.push(job.result.blobUrl);
          }
        }
      }

      if (outputs.length === 0) {
        throw new Error('No images returned from Civitai');
      }

      return {
        id: response.token || Date.now().toString(),
        status: 'succeeded',
        outputs,
        seed: options.seed,
      };
    } catch (error: any) {
      console.error('Civitai generation failed:', error.message || error);
      return {
        id: Date.now().toString(),
        status: 'failed',
        error: error.message || 'Unknown Civitai error',
      };
    }
  }

  private formatVideoPrompt(prompt: string): string {
    let formatted = prompt.trim();
    const videoQualityTags = ['cinematic', '4k', 'high quality', 'smooth motion'];
    const missingTags = videoQualityTags.filter(tag => !formatted.toLowerCase().includes(tag));
    if (missingTags.length > 0) {
      formatted += `, ${missingTags.join(', ')}`;
    }
    return formatted;
  }

  private getDefaultVideoNegativePrompt(): string {
    return 'lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], flicker, jitter, morphing, distorted, shaky';
  }

  async generateVideo(
    image: string | undefined,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    if (!this.apiKey) {
      throw new Error('Civitai API key not configured');
    }

    try {
      // Resolve video model
      let videoModel = 'Wan Video 2.5 T2V';
      if (options.model && this.videoModelMap[options.model]) {
        videoModel = this.videoModelMap[options.model];
      } else if (options.model) {
        videoModel = options.model;
      }

      console.log(`[Civitai] Using video model: ${videoModel}`);

      // Handle LoRAs using additionalNetworks format for REST API
      const additionalNetworks: Record<string, { strength: number }> = {};

      if (options.loras && options.loras.length > 0) {
        for (const lora of options.loras) {
          let loraUrn: string;
          const loraPath = lora.path.trim();

          if (loraPath.startsWith('urn:air:')) {
            loraUrn = loraPath;
          } else if (loraPath.match(/^\d+(@\d+)?$/)) {
            // Civitai model ID format - default to flux1 for video models
            loraUrn = `urn:air:flux1:lora:civitai:${loraPath}`;
          } else if (loraPath.startsWith('http')) {
            loraUrn = loraPath;
            console.warn(`[Civitai Video] External URL LoRA may have limited support: ${loraPath}`);
          } else {
            loraUrn = `urn:air:flux1:lora:civitai:${loraPath}`;
          }

          additionalNetworks[loraUrn] = { strength: lora.strength || 1.0 };
          console.log(`[Civitai Video] Added LoRA: ${loraUrn} (strength: ${lora.strength})`);
        }
      }

      const finalPrompt = this.formatVideoPrompt(options.prompt);
      const finalNegativePrompt = options.negativePrompt || this.getDefaultVideoNegativePrompt();

      // Note: Civitai SDK currently doesn't have official video generation support
      // Falling back to REST API for video
      const axios = (await import('axios')).default;
      const baseUrl = 'https://civitai.com/api/v1';

      const durationSec = parseInt(String(options.duration || '5'), 10);
      let numFrames = durationSec >= 8 ? 241 : 121;

      const payload: any = {
        baseModel: videoModel,
        params: {
          prompt: finalPrompt,
          negativePrompt: finalNegativePrompt,
          width: options.width || 1024,
          height: options.height || 576,
          steps: options.steps || 30,
          cfgScale: options.guidanceScale || 7,
          seed: options.seed || -1,
          quantity: 1,
          numFrames: numFrames,
          fps: 24,
          ...(image ? { image } : {}),
        },
      };

      // Add LoRAs via additionalNetworks if any
      if (Object.keys(additionalNetworks).length > 0) {
        payload.additionalNetworks = additionalNetworks;
      }

      console.log('[Civitai] Sending video request:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${baseUrl}/generation/video`, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const jobToken = response.data.token;
      console.log(`[Civitai] Video job started: ${jobToken}`);

      // Poll for completion
      const urls = await this.pollForCompletion(jobToken);

      return {
        id: jobToken,
        outputs: urls,
        provider: 'civitai',
        status: 'succeeded',
      };
    } catch (error: any) {
      console.error('Civitai video generation error:', error.message || error);
      throw new Error(`Civitai video generation failed: ${error.message}`);
    }
  }

  async checkStatus(id: string): Promise<GenerationResult> {
    try {
      const job = await this.civitai.jobs.getByToken(id);
      const outputs: string[] = [];

      if (job.jobs) {
        for (const j of job.jobs as any[]) {
          if (j.result && j.result.available && j.result.blobUrl) {
            outputs.push(j.result.blobUrl);
          }
        }
      }

      const allComplete = (job.jobs as any[])?.every((j: any) => j.result?.available) || false;

      return {
        id,
        status: allComplete ? 'succeeded' : 'running',
        outputs,
      };
    } catch (error: any) {
      return {
        id,
        status: 'failed',
        error: error.message,
      };
    }
  }

  private async pollForCompletion(token: string): Promise<string[]> {
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes for video
    const interval = 2000;

    while (attempts < maxAttempts) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`https://civitai.com/api/v1/generation/video/${token}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        const status = response.data.status;

        if (status === 'Succeeded') {
          const result = response.data.result;
          const urls = result.map((item: any) => item.videoUrl || item.blobUrl || item.url);
          return urls;
        } else if (status === 'Failed') {
          throw new Error(`Civitai generation failed: ${JSON.stringify(response.data)}`);
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error: any) {
        if (error.message.includes('Civitai generation failed')) {
          throw error;
        }
        console.error('Error polling Civitai status:', error.message);
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      }
    }

    throw new Error('Civitai generation timed out');
  }
}

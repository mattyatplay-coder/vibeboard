import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';

/**
 * Banana Dev Adapter - Serverless GPU inference
 * Cost: Pay per second of GPU time (~$0.0005/sec for A10G)
 *
 * Supports any model deployed on Banana including:
 * - Stable Diffusion variants
 * - LTX-Video
 * - Wan models
 * - Custom deployments
 *
 * Get API key at: https://app.banana.dev
 */
export class BananaAdapter implements GenerationProvider {
  private apiKey: string;
  private baseUrl = 'https://api.banana.dev';

  constructor() {
    this.apiKey = process.env.BANANA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('WARNING: BANANA_API_KEY not set');
    }
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    try {
      // Model key is the deployed model ID on Banana
      const modelKey = options.model || process.env.BANANA_IMAGE_MODEL_KEY || '';

      if (!modelKey) {
        throw new Error(
          'No Banana model key provided. Set BANANA_IMAGE_MODEL_KEY or pass model option.'
        );
      }

      const payload: any = {
        apiKey: this.apiKey,
        modelKey: modelKey,
        modelInputs: {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || '',
          num_inference_steps: options.steps || 30,
          guidance_scale: options.guidanceScale || 7.5,
          width: options.width || 1024,
          height: options.height || 1024,
          num_images: options.count || 1,
          seed: options.seed || Math.floor(Math.random() * 2147483647),
        },
      };

      // Handle aspect ratio
      if (options.aspectRatio) {
        const [w, h] = this.aspectRatioToDimensions(options.aspectRatio);
        payload.modelInputs.width = w;
        payload.modelInputs.height = h;
      }

      // Handle image-to-image
      if (options.sourceImages?.length) {
        payload.modelInputs.init_image = options.sourceImages[0];
        payload.modelInputs.strength = options.strength || 0.75;
      }

      console.log('Banana generation:', modelKey);

      const response = await axios.post(`${this.baseUrl}/start/v4`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const callID = response.data.callID;

      // Poll for result
      const result = await this.pollForResult(callID);

      return {
        id: callID,
        status: 'succeeded',
        outputs: Array.isArray(result.modelOutputs?.images)
          ? result.modelOutputs.images
          : [result.modelOutputs?.image || result.modelOutputs],
      };
    } catch (error: any) {
      console.error('Banana generation failed:', error.response?.data || error.message);
      return {
        id: Date.now().toString(),
        status: 'failed',
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async generateVideo(
    image: string | undefined,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      const modelKey = options.model || process.env.BANANA_VIDEO_MODEL_KEY || '';

      if (!modelKey) {
        throw new Error(
          'No Banana video model key provided. Set BANANA_VIDEO_MODEL_KEY or pass model option.'
        );
      }

      // Duration handling based on model type
      const durationSec = parseInt(String(options.duration || '5'), 10);
      let numFrames: number;
      let duration: number | undefined;

      // Check model type for appropriate duration parameter
      const isWan25 =
        modelKey.toLowerCase().includes('wan-2.5') || modelKey.toLowerCase().includes('wan25');
      const isWan = modelKey.toLowerCase().includes('wan');
      const isLTX = modelKey.toLowerCase().includes('ltx');

      if (isWan25) {
        // Wan 2.5 might use direct duration parameter
        duration = durationSec >= 8 ? 10 : 5;
        numFrames = durationSec >= 8 ? 241 : 121;
        console.log(
          `[Banana] Wan 2.5 duration: ${duration}, numFrames: ${numFrames} (requested: ${options.duration})`
        );
      } else if (isWan) {
        // Wan 2.1/2.2 use num_frames at 24fps
        numFrames = durationSec >= 8 ? 241 : 121;
        console.log(`[Banana] Wan numFrames: ${numFrames} (requested: ${options.duration})`);
      } else if (isLTX) {
        // LTX Video
        numFrames = durationSec >= 8 ? 240 : 144;
        console.log(`[Banana] LTX numFrames: ${numFrames} (requested: ${options.duration})`);
      } else {
        // Default
        numFrames = durationSec >= 8 ? 241 : 121;
      }

      const payload: any = {
        apiKey: this.apiKey,
        modelKey: modelKey,
        modelInputs: {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || '',
          num_inference_steps: options.steps || 25,
          guidance_scale: options.guidanceScale || 7.0,
          num_frames: numFrames,
          fps: 24,
          seed: options.seed || Math.floor(Math.random() * 2147483647),
          ...(duration !== undefined ? { duration } : {}),
        },
      };

      if (image) {
        payload.modelInputs.image = image;
      }

      console.log('Banana video generation:', modelKey);

      const response = await axios.post(`${this.baseUrl}/start/v4`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000, // 5 min timeout for video
      });

      const callID = response.data.callID;
      const result = await this.pollForResult(callID, 300000); // Longer timeout for video

      return {
        id: callID,
        status: 'succeeded',
        outputs: [result.modelOutputs?.video || result.modelOutputs],
      };
    } catch (error: any) {
      console.error('Banana video generation failed:', error.response?.data || error.message);
      return {
        id: Date.now().toString(),
        status: 'failed',
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async checkStatus(id: string): Promise<GenerationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/check/v4`, {
        apiKey: this.apiKey,
        callID: id,
      });

      if (response.data.message === 'success') {
        return {
          id,
          status: 'succeeded',
          outputs: response.data.modelOutputs?.images || [response.data.modelOutputs],
        };
      }

      return { id, status: 'running' };
    } catch (error) {
      return { id, status: 'running' };
    }
  }

  private async pollForResult(callID: string, timeout: number = 120000): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await axios.post(`${this.baseUrl}/check/v4`, {
        apiKey: this.apiKey,
        callID: callID,
      });

      if (response.data.message === 'success') {
        return response.data;
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Generation timed out');
  }

  private aspectRatioToDimensions(ratio: string): [number, number] {
    const ratios: Record<string, [number, number]> = {
      '16:9': [1344, 768],
      '9:16': [768, 1344],
      '1:1': [1024, 1024],
      '4:3': [1152, 896],
      '3:4': [896, 1152],
    };
    return ratios[ratio] || [1024, 1024];
  }
}

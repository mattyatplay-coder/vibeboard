/**
 * GPU Worker Client - Connects VibeBoard backend to GPU microservice
 *
 * Supports multiple deployment modes:
 * - Local: Direct HTTP to local GPU worker (development)
 * - RunPod: RunPod Serverless API
 * - Replicate: Replicate predictions API (fallback)
 */

import axios, { AxiosInstance } from 'axios';

// Types
export interface RackFocusParams {
  imageUrl: string;
  focusPointStart: [number, number];
  focusPointEnd: [number, number];
  durationSeconds?: number;
  fps?: number;
  blurStrength?: number;
}

export interface LensCharacterParams {
  imageUrl: string;
  lensType?: 'vintage' | 'anamorphic' | 'modern' | 'classic';
  bokehShape?: 'circular' | 'oval' | 'hexagonal' | 'swirly';
  aberrationStrength?: number;
  flareIntensity?: number;
  vignetteStrength?: number;
}

export interface FocusRescueParams {
  imageUrl: string;
  sharpnessTarget?: number;
  preserveBokeh?: boolean;
}

export interface DirectorEditParams {
  imageUrl: string;
  instruction: string;
  preserveIdentity?: boolean;
  strength?: number;
}

export interface VideoGenerationParams {
  prompt: string;
  imageUrl?: string;  // For I2V mode
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
}

export interface ProcessingResult {
  success: boolean;
  outputUrl?: string;
  outputBase64?: string;
  processingTimeMs: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface GPUWorkerHealth {
  status: string;
  device: string;
  gpuAvailable: boolean;
  gpuName?: string;
  gpuMemoryGb?: {
    total: number;
    allocated: number;
    cached: number;
  };
  loadedModels: string[];
}

type DeploymentMode = 'local' | 'runpod' | 'replicate';

export class GPUWorkerClient {
  private static instance: GPUWorkerClient;
  private client: AxiosInstance;
  private mode: DeploymentMode;
  private runpodEndpointId?: string;
  private runpodApiKey?: string;

  private constructor() {
    // Determine deployment mode from environment
    this.mode = (process.env.GPU_WORKER_MODE as DeploymentMode) || 'local';
    this.runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID;
    this.runpodApiKey = process.env.RUNPOD_API_KEY;

    const baseURL = this.getBaseURL();

    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for GPU operations
      headers: this.getHeaders(),
    });

    console.log(`[GPUWorkerClient] Initialized in ${this.mode} mode, base URL: ${baseURL}`);
  }

  private getBaseURL(): string {
    switch (this.mode) {
      case 'runpod':
        return `https://api.runpod.ai/v2/${this.runpodEndpointId}`;
      case 'replicate':
        return 'https://api.replicate.com/v1';
      case 'local':
      default:
        return process.env.GPU_WORKER_URL || 'http://localhost:8000';
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.mode === 'runpod' && this.runpodApiKey) {
      headers['Authorization'] = `Bearer ${this.runpodApiKey}`;
    }

    return headers;
  }

  public static getInstance(): GPUWorkerClient {
    if (!GPUWorkerClient.instance) {
      GPUWorkerClient.instance = new GPUWorkerClient();
    }
    return GPUWorkerClient.instance;
  }

  /**
   * Check GPU worker health status
   */
  async getHealth(): Promise<GPUWorkerHealth> {
    try {
      if (this.mode === 'runpod') {
        // RunPod health check
        const response = await this.client.get('/health');
        return response.data;
      }

      const response = await this.client.get('/health');
      return {
        status: response.data.status,
        device: response.data.device,
        gpuAvailable: response.data.gpu_available,
        gpuName: response.data.gpu_name,
        gpuMemoryGb: response.data.gpu_memory_gb,
        loadedModels: response.data.loaded_models,
      };
    } catch (error) {
      console.error('[GPUWorkerClient] Health check failed:', error);
      throw error;
    }
  }

  /**
   * Simulate cinematic rack focus effect
   */
  async rackFocus(params: RackFocusParams): Promise<ProcessingResult> {
    return this.executeOperation('rack_focus', {
      image_url: params.imageUrl,
      focus_point_start: params.focusPointStart,
      focus_point_end: params.focusPointEnd,
      duration_seconds: params.durationSeconds ?? 2.0,
      fps: params.fps ?? 24,
      blur_strength: params.blurStrength ?? 1.0,
    });
  }

  /**
   * Apply cinematic lens character to image
   */
  async lensCharacter(params: LensCharacterParams): Promise<ProcessingResult> {
    return this.executeOperation('lens_character', {
      image_url: params.imageUrl,
      lens_type: params.lensType ?? 'vintage',
      bokeh_shape: params.bokehShape ?? 'circular',
      aberration_strength: params.aberrationStrength ?? 0.5,
      flare_intensity: params.flareIntensity ?? 0.3,
      vignette_strength: params.vignetteStrength ?? 0.2,
    });
  }

  /**
   * Rescue slightly out-of-focus images
   */
  async rescueFocus(params: FocusRescueParams): Promise<ProcessingResult> {
    return this.executeOperation('rescue_focus', {
      image_url: params.imageUrl,
      sharpness_target: params.sharpnessTarget ?? 0.7,
      preserve_bokeh: params.preserveBokeh ?? true,
    });
  }

  /**
   * AI-powered director edit using natural language
   */
  async directorEdit(params: DirectorEditParams): Promise<ProcessingResult> {
    return this.executeOperation('director_edit', {
      image_url: params.imageUrl,
      instruction: params.instruction,
      preserve_identity: params.preserveIdentity ?? true,
      strength: params.strength ?? 0.7,
    });
  }

  /**
   * Generate video using Wan 2.1
   * Text-to-Video: Provide prompt only
   * Image-to-Video: Provide prompt + imageUrl
   */
  async generateVideo(params: VideoGenerationParams): Promise<ProcessingResult> {
    return this.executeOperation('video_generate', {
      prompt: params.prompt,
      image_url: params.imageUrl,
      duration_seconds: params.durationSeconds ?? 4.0,
      fps: params.fps ?? 24,
      width: params.width ?? 1280,
      height: params.height ?? 720,
      guidance_scale: params.guidanceScale ?? 7.5,
      num_inference_steps: params.numInferenceSteps ?? 50,
      seed: params.seed,
    });
  }

  /**
   * Execute operation based on deployment mode
   */
  private async executeOperation(
    operation: string,
    params: Record<string, unknown>
  ): Promise<ProcessingResult> {
    try {
      if (this.mode === 'runpod') {
        return this.executeRunPod(operation, params);
      }

      // Direct HTTP call for local mode
      const endpoint = this.getEndpoint(operation);
      const response = await this.client.post(endpoint, params);

      return {
        success: response.data.success,
        outputUrl: response.data.output_url,
        outputBase64: response.data.output_base64,
        processingTimeMs: response.data.processing_time_ms,
        metadata: response.data.metadata,
        error: response.data.error,
      };
    } catch (error: unknown) {
      console.error(`[GPUWorkerClient] ${operation} failed:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        processingTimeMs: 0,
        error: message,
      };
    }
  }

  /**
   * Execute operation via RunPod Serverless
   */
  private async executeRunPod(
    operation: string,
    params: Record<string, unknown>
  ): Promise<ProcessingResult> {
    // Submit job
    // NOTE: Python worker expects 'task' and 'payload' keys, not 'operation' and 'params'
    const runResponse = await this.client.post('/run', {
      input: {
        task: operation,
        payload: params,
      },
    });

    const jobId = runResponse.data.id;
    console.log(`[GPUWorkerClient] RunPod job submitted: ${jobId}`);

    // Poll for completion
    const maxAttempts = 120; // 10 minutes at 5 second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await this.client.get(`/status/${jobId}`);
      const status = statusResponse.data.status;

      if (status === 'COMPLETED') {
        const output = statusResponse.data.output;
        return {
          success: output.success,
          outputUrl: output.output_url,
          outputBase64: output.output_base64,
          processingTimeMs: output.processing_time_ms,
          metadata: output.metadata,
          error: output.error,
        };
      }

      if (status === 'FAILED') {
        return {
          success: false,
          processingTimeMs: 0,
          error: statusResponse.data.error || 'RunPod job failed',
        };
      }

      attempts++;
    }

    return {
      success: false,
      processingTimeMs: 0,
      error: 'RunPod job timed out',
    };
  }

  /**
   * Get endpoint path for operation
   */
  private getEndpoint(operation: string): string {
    const endpoints: Record<string, string> = {
      rack_focus: '/optics/rack-focus',
      lens_character: '/optics/lens-character',
      rescue_focus: '/optics/rescue-focus',
      director_edit: '/director/edit',
      video_generate: '/video/generate',
      video_t2v: '/video/generate',
      video_i2v: '/video/generate',
    };
    return endpoints[operation] || `/${operation}`;
  }
}

// Export singleton
export const gpuWorkerClient = GPUWorkerClient.getInstance();

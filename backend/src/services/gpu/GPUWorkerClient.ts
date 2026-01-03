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
  imageUrl?: string; // For I2V mode
  durationSeconds?: number;
  fps?: number;
  width?: number;
  height?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
}

export interface SVIGenerationParams {
  prompt: string;
  imageUrl: string;
  numFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  motionBucketId?: number;
  noiseAugStrength?: number;
  numInferenceSteps?: number;
  seed?: number;
  decodeChunkSize?: number;
}

export interface PerformanceParams {
  imageUrl: string; // Character face/portrait
  audioUrl: string; // Voice audio file
  driverVideoUrl?: string; // Optional driver video for expressions
  enhanceFace?: boolean; // Apply face enhancement
  lipSyncStrength?: number; // 0.0-1.0
}

// Phase 3: Asset Bin - Scene Deconstruction
export interface SceneDeconstructParams {
  imageUrl: string; // 2D image to deconstruct into 3D
  outputFormat?: '3d_gaussian' | 'mesh' | 'point_cloud'; // 3D output format
  qualityLevel?: 'draft' | 'standard' | 'high'; // Processing quality
}

export interface SceneDeconstructResult extends ProcessingResult {
  meshUrl?: string; // 3D model file URL (.glb, .obj)
  textureUrls?: string[]; // Extracted texture maps
  pointCloudUrl?: string; // Point cloud data
  gaussianUrl?: string; // 3D Gaussian splat file
  objectCount?: number; // Number of detected objects
}

// Phase 3: Asset Bin - PBR Material Extraction
export interface MaterialExtractParams {
  imageUrl: string; // Source texture/material image
  materialType?: 'auto' | 'metal' | 'fabric' | 'wood' | 'stone' | 'skin';
  resolution?: 512 | 1024 | 2048 | 4096;
}

export interface MaterialExtractResult extends ProcessingResult {
  albedoUrl?: string; // Base color map
  normalUrl?: string; // Normal map
  roughnessUrl?: string; // Roughness map
  metallicUrl?: string; // Metallic map
  aoUrl?: string; // Ambient occlusion map
  heightUrl?: string; // Height/displacement map
}

// Phase 4B: Shot Studio - Spatia (3D-aware generation)
export interface SpatiaGenerationParams {
  prompt: string;
  negativePrompt?: string;
  locationId: string; // ID of the persistent 3D virtual set
  locationUrl?: string; // URL to the 3D asset
  cameraPath?: CameraPathData; // Trajectory data (InfCam format)
  blockingRegions?: BlockingRegion[]; // ReCo bounding boxes
  aspectRatio?: string;
  duration?: number;
}

export interface CameraPathData {
  keyframes: Array<{
    time: number;
    position: [number, number, number];
    rotation: [number, number, number];
    fov?: number;
  }>;
  interpolation?: 'linear' | 'bezier' | 'catmull-rom';
}

// Phase 4B: Shot Studio - ReCo (Region-based Compositional Control)
export interface ReCoGenerationParams {
  prompt: string;
  negativePrompt?: string;
  blockingRegions: BlockingRegion[];
  aspectRatio?: string;
}

export interface BlockingRegion {
  id: string;
  label: string; // Object/subject description
  prompt?: string; // Per-region prompt override
  box: [number, number, number, number]; // [x, y, width, height] as percentages (0-100)
  locked?: boolean; // Lock region position
  color?: string; // Display color for UI
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
   * Generate video using Stable Video Infinity (SVI)
   * Premium long-form video generation with temporal coherence
   */
  async generateSVI(params: SVIGenerationParams): Promise<ProcessingResult> {
    return this.executeOperation('svi_generate', {
      prompt: params.prompt,
      image_url: params.imageUrl,
      num_frames: params.numFrames ?? 25,
      fps: params.fps ?? 24,
      width: params.width ?? 1024,
      height: params.height ?? 576,
      motion_bucket_id: params.motionBucketId ?? 127,
      noise_aug_strength: params.noiseAugStrength ?? 0.02,
      num_inference_steps: params.numInferenceSteps ?? 25,
      seed: params.seed,
      decode_chunk_size: params.decodeChunkSize ?? 8,
    });
  }

  /**
   * Generate talking head video from image + audio (FlashPortrait)
   * Audio-driven lip sync and expression animation
   */
  async generatePerformance(params: PerformanceParams): Promise<ProcessingResult> {
    return this.executeOperation('flash_portrait', {
      image_url: params.imageUrl,
      audio_url: params.audioUrl,
      driver_video_url: params.driverVideoUrl,
      enhance_face: params.enhanceFace ?? true,
      lip_sync_strength: params.lipSyncStrength ?? 0.8,
    });
  }

  /**
   * Phase 3: Deconstruct a 2D image into 3D assets (3D-RE-GEN)
   * Converts 2D images into 3D Gaussian splats, meshes, or point clouds
   */
  async deconstructScene(params: SceneDeconstructParams): Promise<SceneDeconstructResult> {
    return this.executeOperation('scene_deconstruct', {
      image_url: params.imageUrl,
      output_format: params.outputFormat ?? '3d_gaussian',
      quality_level: params.qualityLevel ?? 'standard',
    }) as Promise<SceneDeconstructResult>;
  }

  /**
   * Phase 3: Extract PBR material maps from a texture image (MVInverse)
   * Generates Albedo, Normal, Roughness, Metallic, AO, and Height maps
   */
  async extractMaterials(params: MaterialExtractParams): Promise<MaterialExtractResult> {
    return this.executeOperation('extract_pbr', {
      image_url: params.imageUrl,
      material_type: params.materialType ?? 'auto',
      resolution: params.resolution ?? 1024,
    }) as Promise<MaterialExtractResult>;
  }

  // =========================================================================
  // Phase 4B: Shot Studio - Spatia & ReCo Integration
  // =========================================================================

  /**
   * Phase 4B: Generate shot using Spatia (3D-aware generation)
   * Uses locked 3D virtual sets for consistent geometry across shots
   */
  async generateShotSpatia(params: SpatiaGenerationParams): Promise<ProcessingResult> {
    return this.executeOperation('spatia_generate', {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      location_id: params.locationId,
      location_url: params.locationUrl,
      camera_path: params.cameraPath,
      blocking_regions: params.blockingRegions,
      aspect_ratio: params.aspectRatio ?? '16:9',
      duration: params.duration,
    });
  }

  /**
   * Phase 4B: Generate with ReCo (Region-based Compositional Control)
   * Precise 2D control via bounding boxes for object placement
   */
  async generateWithReCo(params: ReCoGenerationParams): Promise<ProcessingResult> {
    return this.executeOperation('reco_generate', {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      blocking_regions: params.blockingRegions,
      aspect_ratio: params.aspectRatio ?? '16:9',
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

  // =========================================================================
  // Phase 5: VFX Suite - Post-Production Tools
  // =========================================================================

  /**
   * Execute VFX operation (InfCam, DiffCamera, Motion Fix, Cleanup)
   * Unified entry point for all VFX operations
   */
  async executeVFX(operation: string, params: Record<string, unknown>): Promise<ProcessingResult> {
    return this.executeOperation(operation, params);
  }

  /**
   * Virtual Reshoot via InfCam - Re-render with new camera path
   */
  async virtualReshoot(params: {
    videoUrl: string;
    cameraPath: {
      keyframes: Array<{
        time: number;
        position: [number, number, number];
        rotation: [number, number, number];
        fov?: number;
      }>;
      interpolation?: 'linear' | 'bezier' | 'catmull-rom';
    };
    aspectRatio?: string;
    outputFps?: number;
    preserveSubject?: boolean;
    motionBlur?: number;
  }): Promise<ProcessingResult> {
    return this.executeOperation('infcam_reshoot', {
      video_url: params.videoUrl,
      camera_path: params.cameraPath,
      aspect_ratio: params.aspectRatio ?? '16:9',
      output_fps: params.outputFps ?? 24,
      preserve_subject: params.preserveSubject ?? true,
      motion_blur: params.motionBlur ?? 0.5,
    });
  }

  /**
   * Focus Rescue via DiffCamera - AI deblurring and sharpening
   */
  async focusRescue(params: {
    sourceUrl: string;
    isVideo: boolean;
    targetRegion?: [number, number, number, number];
    sharpnessStrength?: number;
    preserveBokeh?: boolean;
    denoiseStrength?: number;
  }): Promise<ProcessingResult> {
    return this.executeOperation('diffcamera_focus', {
      source_url: params.sourceUrl,
      is_video: params.isVideo,
      target_region: params.targetRegion,
      sharpness_strength: params.sharpnessStrength ?? 0.6,
      preserve_bokeh: params.preserveBokeh ?? true,
      denoise_strength: params.denoiseStrength ?? 0.3,
    });
  }

  /**
   * Motion Fix - Stabilization and speed adjustment via RIFE
   */
  async motionFix(params: {
    videoUrl: string;
    stabilization?: 'none' | 'light' | 'standard' | 'cinematic';
    speedMultiplier?: number;
    interpolationMode?: 'blend' | 'optical_flow' | 'rife';
    targetFps?: number;
  }): Promise<ProcessingResult> {
    return this.executeOperation('motion_fix', {
      video_url: params.videoUrl,
      stabilization: params.stabilization ?? 'standard',
      speed_multiplier: params.speedMultiplier ?? 1.0,
      interpolation_mode: params.interpolationMode ?? 'optical_flow',
      target_fps: params.targetFps,
    });
  }

  /**
   * Artifact Cleanup - AI glitch and artifact removal
   */
  async artifactCleanup(params: {
    sourceUrl: string;
    isVideo: boolean;
    artifactType?: 'auto' | 'flicker' | 'banding' | 'compression' | 'morph_glitch';
    strength?: number;
    temporalConsistency?: boolean;
  }): Promise<ProcessingResult> {
    return this.executeOperation('artifact_cleanup', {
      source_url: params.sourceUrl,
      is_video: params.isVideo,
      artifact_type: params.artifactType ?? 'auto',
      strength: params.strength ?? 0.7,
      temporal_consistency: params.temporalConsistency ?? true,
    });
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
      flash_portrait: '/performance/flash-portrait',
      // Phase 3: Asset Bin
      scene_deconstruct: '/assets/deconstruct',
      extract_pbr: '/assets/extract-materials',
      // Phase 4B: Shot Studio
      spatia_generate: '/shot/spatia',
      reco_generate: '/shot/reco',
      // Phase 5: VFX Suite
      infcam_reshoot: '/vfx/reshoot',
      diffcamera_focus: '/vfx/focus-rescue',
      motion_fix: '/vfx/motion-fix',
      artifact_cleanup: '/vfx/cleanup',
    };
    return endpoints[operation] || `/${operation}`;
  }
}

// Export singleton
export const gpuWorkerClient = GPUWorkerClient.getInstance();

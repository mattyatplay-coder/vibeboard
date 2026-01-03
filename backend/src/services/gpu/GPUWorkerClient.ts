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

/**
 * SVI (Stable Video Infinity) Generation Parameters
 *
 * SVI is the premium long-form video model with built-in continuity.
 * Replaces the need for StoryMem + Spatia + InfCam.
 *
 * Key Features:
 * - Infinite Continuity: Persistent latent map for 100+ frame coherence
 * - Self-hosted on RunPod: $0/sec vs $0.15/sec on managed providers
 */
export interface SVIGenerationParams {
  prompt: string; // Motion guidance prompt
  imageUrl: string; // Required seed image (SVI is image-to-video only)
  numFrames?: number; // Max 100 for extended continuity (default: 25)
  fps?: number; // Output frame rate (default: 24)
  width?: number; // Video width, multiple of 64 (default: 1024)
  height?: number; // Video height, multiple of 64 (default: 576)
  motionBucketId?: number; // Motion intensity 1-255 (default: 127)
  noiseAugStrength?: number; // Noise augmentation 0-0.1 (default: 0.02)
  numInferenceSteps?: number; // Denoising steps 1-50 (default: 25)
  seed?: number; // Random seed for reproducibility
  decodeChunkSize?: number; // Frames to decode at once (default: 8)
}

/**
 * FLUX.1 Image Generation Parameters
 *
 * Self-hosted FLUX models on RunPod for zero API costs:
 * - Schnell: Fast (4 steps, ~2-3s), Apache 2.0 license
 * - Dev: Quality (25+ steps, ~10-15s), non-commercial
 */
export interface FluxImageParams {
  prompt: string; // Text prompt for generation
  model?: 'schnell' | 'dev'; // Model variant (default: schnell)
  width?: number; // Image width, multiple of 8 (default: 1024)
  height?: number; // Image height, multiple of 8 (default: 1024)
  numInferenceSteps?: number; // Denoising steps (4 for schnell, 25-50 for dev)
  guidanceScale?: number; // CFG scale 1.0-20.0 (default: 3.5)
  seed?: number; // Random seed for reproducibility
  outputFormat?: 'png' | 'jpeg'; // Output format (default: png)
}

/**
 * Stable Diffusion 3.5 Large Image Generation Parameters
 *
 * Self-hosted on RunPod for reduced API costs:
 * - 8B parameter model with excellent prompt adherence
 * - 28 inference steps recommended
 * - Stability AI Community license
 */
export interface SD35ImageParams {
  prompt: string; // Text prompt for generation
  negativePrompt?: string; // Negative prompt for unwanted elements
  width?: number; // Image width, multiple of 8 (default: 1024)
  height?: number; // Image height, multiple of 8 (default: 1024)
  numInferenceSteps?: number; // Denoising steps (default: 28)
  guidanceScale?: number; // CFG scale 1.0-20.0 (default: 7.0)
  seed?: number; // Random seed for reproducibility
  outputFormat?: 'png' | 'jpeg'; // Output format (default: png)
}

/**
 * LTX Video Generation Parameters
 *
 * Self-hosted on RunPod for zero API costs:
 * - 2B DiT-based model, extremely fast (~2-5 seconds)
 * - Native 768x512 resolution, up to 121 frames
 * - Apache 2.0 license (commercial use OK)
 */
export interface LTXVideoParams {
  prompt: string; // Text prompt for video generation
  negativePrompt?: string; // Negative prompt
  imageUrl?: string; // Optional source image for I2V mode
  width?: number; // Video width (default: 768)
  height?: number; // Video height (default: 512)
  numFrames?: number; // Number of frames (default: 49)
  fps?: number; // Output frame rate (default: 24)
  numInferenceSteps?: number; // Denoising steps (default: 30)
  guidanceScale?: number; // CFG scale 1.0-20.0 (default: 7.5)
  seed?: number; // Random seed for reproducibility
}

/**
 * Depth Anything V2 Large - Depth Estimation Parameters
 *
 * Self-hosted on RunPod for zero API costs:
 * - 335M parameter ViT-L encoder
 * - State-of-the-art monocular depth estimation
 * - Works on any image without fine-tuning
 * - 8GB+ VRAM required
 * - Apache 2.0 license
 */
export interface DepthAnythingParams {
  imageUrl: string; // URL of the source image
  outputFormat?: 'png' | 'jpeg'; // Output format (default: png)
  colormap?: 'gray' | 'turbo' | 'viridis' | 'plasma'; // Depth visualization colormap (default: gray)
  normalize?: boolean; // Normalize depth values to 0-255 (default: true)
}

/**
 * SAM2 (Segment Anything 2) - Segmentation Parameters
 *
 * Self-hosted on RunPod for zero API costs:
 * - Hiera-Large backbone (224M params)
 * - State-of-the-art promptable segmentation
 * - Point, box, or automatic prompts
 * - 8GB+ VRAM required
 * - Apache 2.0 license
 *
 * Use cases:
 * - Rotoscoping for VFX
 * - Object selection for inpainting
 * - Background removal
 * - Video object tracking
 */
export interface SAM2SegmentParams {
  imageUrl: string; // URL of the source image
  pointCoords?: [number, number][]; // Point prompts as [[x1,y1], [x2,y2], ...] normalized 0-1
  pointLabels?: number[]; // Labels for points: 1=foreground, 0=background
  box?: [number, number, number, number]; // Box prompt as [x1, y1, x2, y2] normalized 0-1
  multimaskOutput?: boolean; // Return multiple mask predictions (default: true)
  returnLogits?: boolean; // Return raw logits instead of binary masks (default: false)
  outputFormat?: 'png' | 'jpeg'; // Output format (default: png)
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

// Endpoint types for different model families
type EndpointType = 'default' | 'flux';

export class GPUWorkerClient {
  private static instance: GPUWorkerClient;
  private client: AxiosInstance;
  private fluxClient?: AxiosInstance; // Dedicated FLUX endpoint client
  private mode: DeploymentMode;
  private runpodEndpointId?: string;
  private runpodFluxEndpointId?: string;
  private runpodApiKey?: string;

  private constructor() {
    // Determine deployment mode from environment
    this.mode = (process.env.GPU_WORKER_MODE as DeploymentMode) || 'local';
    this.runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID;
    this.runpodFluxEndpointId = process.env.RUNPOD_FLUX_ENDPOINT_ID;
    this.runpodApiKey = process.env.RUNPOD_API_KEY;

    const baseURL = this.getBaseURL();

    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for GPU operations
      headers: this.getHeaders(),
    });

    // Create dedicated FLUX client if endpoint is configured
    if (this.mode === 'runpod' && this.runpodFluxEndpointId) {
      this.fluxClient = axios.create({
        baseURL: `https://api.runpod.ai/v2/${this.runpodFluxEndpointId}`,
        timeout: 300000,
        headers: this.getHeaders(),
      });
      console.log(`[GPUWorkerClient] FLUX endpoint configured: ${this.runpodFluxEndpointId}`);
    }

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
   * Generate video using Stable Video Infinity (SVI/SVD-XT)
   *
   * SVI is the premium long-form video model with built-in continuity.
   * Key advantages:
   * - Replaces StoryMem (memory bank) with integrated Spatial/Temporal Latent Storage
   * - Replaces Spatia (3D point cloud) with integrated View Synthesis
   * - Replaces InfCam (trajectory) with integrated Camera Control
   * - Self-hosted on RunPod: $0/sec vs $0.15/sec on managed providers
   *
   * Note: Requires an input image (image-to-video only)
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
   * Generate image using FLUX.1 (Schnell or Dev)
   *
   * Self-hosted on RunPod for zero API costs:
   * - FLUX.1 Schnell: Fast (4 steps, ~2-3s), Apache 2.0 license
   * - FLUX.1 Dev: Quality (25-50 steps, ~10-15s), non-commercial
   *
   * Cost savings vs Fal.ai:
   * - Schnell: $0.003/image -> $0.001/image (~66% savings)
   * - Dev: $0.025/image -> $0.002/image (~92% savings)
   */
  async generateFluxImage(params: FluxImageParams): Promise<ProcessingResult> {
    // Adjust steps based on model
    const model = params.model ?? 'schnell';
    const steps =
      model === 'schnell'
        ? Math.min(params.numInferenceSteps ?? 4, 4)
        : (params.numInferenceSteps ?? 25);

    return this.executeOperation('flux_generate', {
      prompt: params.prompt,
      model: model,
      width: params.width ?? 1024,
      height: params.height ?? 1024,
      num_inference_steps: steps,
      guidance_scale: params.guidanceScale ?? 3.5,
      seed: params.seed,
      output_format: params.outputFormat ?? 'png',
    });
  }

  /**
   * Generate image using Stable Diffusion 3.5 Large
   *
   * Self-hosted on RunPod for reduced API costs:
   * - 8B parameter model with excellent prompt adherence
   * - 28 inference steps recommended
   *
   * Cost savings vs Fal.ai:
   * - SD 3.5: $0.035/megapixel -> ~$0.003/image (~91% savings)
   */
  async generateSD35Image(params: SD35ImageParams): Promise<ProcessingResult> {
    return this.executeOperation('sd35_generate', {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt ?? '',
      width: params.width ?? 1024,
      height: params.height ?? 1024,
      num_inference_steps: params.numInferenceSteps ?? 28,
      guidance_scale: params.guidanceScale ?? 7.0,
      seed: params.seed,
      output_format: params.outputFormat ?? 'png',
    });
  }

  /**
   * Generate video using LTX Video
   *
   * Self-hosted on RunPod for zero API costs:
   * - 2B DiT-based model, extremely fast (~2-5 seconds)
   * - Native 768x512 resolution, up to 121 frames
   * - Apache 2.0 license (commercial use OK)
   *
   * Supports:
   * - Text-to-Video: Provide prompt only
   * - Image-to-Video: Provide prompt + imageUrl
   *
   * Cost savings vs Fal.ai:
   * - LTX Video: $0.10/video -> $0.00/video (100% savings)
   */
  async generateLTXVideo(params: LTXVideoParams): Promise<ProcessingResult> {
    return this.executeOperation('ltx_generate', {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt ?? '',
      image_url: params.imageUrl,
      width: params.width ?? 768,
      height: params.height ?? 512,
      num_frames: params.numFrames ?? 49,
      fps: params.fps ?? 24,
      num_inference_steps: params.numInferenceSteps ?? 30,
      guidance_scale: params.guidanceScale ?? 7.5,
      seed: params.seed,
    });
  }

  /**
   * Generate depth map using Depth Anything V2 Large
   *
   * Self-hosted on RunPod for zero API costs:
   * - 335M parameter ViT-L encoder
   * - State-of-the-art monocular depth estimation
   * - Works on any image without fine-tuning
   * - Apache 2.0 license
   *
   * Use cases:
   * - Rack focus effects (depth-based blur)
   * - 3D parallax animations
   * - Occlusion masks for compositing
   * - Depth-aware inpainting
   */
  async estimateDepth(params: DepthAnythingParams): Promise<ProcessingResult> {
    return this.executeOperation('depth_anything', {
      image_url: params.imageUrl,
      output_format: params.outputFormat ?? 'png',
      colormap: params.colormap ?? 'gray',
      normalize: params.normalize ?? true,
    });
  }

  /**
   * Generate segmentation mask using SAM2 (Segment Anything 2)
   *
   * Self-hosted on RunPod for zero API costs:
   * - Hiera-Large backbone (224M params)
   * - State-of-the-art promptable segmentation
   * - Point, box, or automatic prompts
   * - Apache 2.0 license
   *
   * Use cases:
   * - Rotoscoping for VFX
   * - Object selection for inpainting
   * - Background removal
   * - Video object tracking
   */
  async segmentWithSAM2(params: SAM2SegmentParams): Promise<ProcessingResult> {
    return this.executeOperation('sam2_segment', {
      image_url: params.imageUrl,
      point_coords: params.pointCoords,
      point_labels: params.pointLabels,
      box: params.box,
      multimask_output: params.multimaskOutput ?? true,
      return_logits: params.returnLogits ?? false,
      output_format: params.outputFormat ?? 'png',
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
   * Determine which endpoint type to use for an operation
   * Note: SD35 and LTX use the default endpoint (same GPU worker as other models)
   */
  private getEndpointType(operation: string): EndpointType {
    const fluxOperations = ['flux_generate', 'flux_schnell', 'flux_dev', 'image_flux'];
    return fluxOperations.includes(operation) ? 'flux' : 'default';
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
        const endpointType = this.getEndpointType(operation);
        return this.executeRunPod(operation, params, endpointType);
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
    params: Record<string, unknown>,
    endpointType: EndpointType = 'default'
  ): Promise<ProcessingResult> {
    // Select the appropriate client based on endpoint type
    const client = endpointType === 'flux' && this.fluxClient ? this.fluxClient : this.client;
    const endpointName = endpointType === 'flux' ? 'FLUX' : 'default';

    // Submit job
    // NOTE: Python worker expects 'task' and 'payload' keys, not 'operation' and 'params'
    const runResponse = await client.post('/run', {
      input: {
        task: operation,
        payload: params,
      },
    });

    const jobId = runResponse.data.id;
    console.log(`[GPUWorkerClient] RunPod job submitted to ${endpointName} endpoint: ${jobId}`);

    // Poll for completion
    const maxAttempts = 120; // 10 minutes at 5 second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusResponse = await client.get(`/status/${jobId}`);
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
      // SVI - Stable Video Infinity (Premium long-form continuity)
      svi_generate: '/video/svi-generate',
      stable_video_infinity: '/video/svi-generate',
      video_svi: '/video/svi-generate',
      // FLUX - Self-hosted image generation
      flux_generate: '/image/flux',
      flux_schnell: '/image/flux',
      flux_dev: '/image/flux',
      image_flux: '/image/flux',
      // SD 3.5 Large - Self-hosted high-quality image generation
      sd35_generate: '/image/sd35',
      sd35_large: '/image/sd35',
      image_sd35: '/image/sd35',
      // LTX Video - Self-hosted fast video generation
      ltx_generate: '/video/ltx',
      ltx_video: '/video/ltx',
      video_ltx: '/video/ltx',
      // Depth Anything V2 Large - Self-hosted depth estimation
      depth_anything: '/depth/anything-v2',
      depth_anything_v2: '/depth/anything-v2',
      depth_estimate: '/depth/anything-v2',
      // SAM2 - Self-hosted segmentation
      sam2_segment: '/segment/sam2',
      sam2: '/segment/sam2',
      segment: '/segment/sam2',
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

/**
 * LayerExtractionService - AI-Powered Subject/Background Separation
 *
 * Uses fal-ai/qwen-image-layered to decompose images into RGBA layers
 * for accurate DOF simulation with independent subject and background control.
 *
 * Features:
 * - Subject extraction with alpha mask
 * - Background isolation
 * - Multi-layer decomposition (2-10 layers)
 * - Depth-aware layer ordering
 */

import * as fal from '@fal-ai/serverless-client';
import * as fs from 'fs';
import * as path from 'path';
import { loggers, logApiCall } from '../../utils/logger';
import { withRetry, circuitBreakers } from '../../utils/retry';

const log = loggers.falai;

// Configure fal client
if (!process.env.FAL_KEY) {
  log.warn?.('FAL_KEY environment variable is not set.');
}

fal.config({
  credentials: process.env.FAL_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedLayer {
  id: string;
  name: string;
  imageUrl: string; // RGBA layer image URL
  order: number; // Z-order (0 = background, higher = closer)
  type: 'background' | 'subject' | 'foreground' | 'unknown';
  estimatedDepth?: number; // Estimated distance in meters (if available)
  width: number;
  height: number;
}

export interface LayerExtractionResult {
  success: boolean;
  layers: ExtractedLayer[];
  originalWidth: number;
  originalHeight: number;
  processingTimeMs: number;
  error?: string;
}

export interface LayerExtractionOptions {
  imageUrl: string;
  numLayers?: number; // 2-10 layers (default: 3 for subject/background/foreground)
  prompt?: string; // Optional caption to guide extraction
  outputFormat?: 'png' | 'webp';
}

// Framing presets with model distance and scale
export interface FramingPreset {
  id: string;
  name: string;
  description: string;
  modelDistance: number; // Distance to subject in meters
  modelScale: number; // Scale factor (1.0 = full body fits in frame)
  cropRegion: {
    // Normalized crop for framing
    top: number; // 0-1
    bottom: number; // 0-1
  };
}

// Camera database entry
export interface CameraModel {
  id: string;
  brand: string;
  model: string;
  sensorSize: 'full-frame' | 'aps-c' | 'aps-h' | 'micro-four-thirds' | 'one-inch' | 'medium-format';
  sensorWidth: number; // mm
  sensorHeight: number; // mm
  cropFactor: number;
  megapixels: number;
  circleOfConfusion: number; // mm (calculated)
  year?: number;
}

// Stand-in model silhouette
export interface StandInModel {
  id: string;
  name: string;
  type: 'woman' | 'man' | 'child' | 'silhouette';
  heightCm: number;
  silhouetteUrl: string; // PNG with transparency
  thumbnailUrl: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Framing presets based on dofsimulator.net */
export const FRAMING_PRESETS: FramingPreset[] = [
  {
    id: 'face',
    name: 'Face',
    description: 'Extreme close-up, face fills frame',
    modelDistance: 0.5,
    modelScale: 4.0,
    cropRegion: { top: 0.0, bottom: 0.35 },
  },
  {
    id: 'portrait',
    name: 'Portrait',
    description: 'Head and shoulders',
    modelDistance: 1.0,
    modelScale: 2.5,
    cropRegion: { top: 0.0, bottom: 0.5 },
  },
  {
    id: 'medium',
    name: 'Medium Shot',
    description: 'Waist up, classic interview framing',
    modelDistance: 2.0,
    modelScale: 1.5,
    cropRegion: { top: 0.0, bottom: 0.65 },
  },
  {
    id: 'american',
    name: 'American Shot',
    description: 'Mid-thigh up, Western/cowboy framing',
    modelDistance: 3.0,
    modelScale: 1.2,
    cropRegion: { top: 0.0, bottom: 0.8 },
  },
  {
    id: 'full',
    name: 'Full Shot',
    description: 'Full body visible',
    modelDistance: 5.0,
    modelScale: 1.0,
    cropRegion: { top: 0.0, bottom: 1.0 },
  },
  {
    id: 'wide',
    name: 'Wide Shot',
    description: 'Full body with environment',
    modelDistance: 10.0,
    modelScale: 0.6,
    cropRegion: { top: 0.0, bottom: 1.0 },
  },
];

/** Camera database with sensor specifications */
export const CAMERA_DATABASE: CameraModel[] = [
  // Full Frame (35mm)
  {
    id: 'sony-a7iv',
    brand: 'Sony',
    model: 'A7 IV',
    sensorSize: 'full-frame',
    sensorWidth: 35.7,
    sensorHeight: 23.8,
    cropFactor: 1.0,
    megapixels: 33,
    circleOfConfusion: 0.03,
    year: 2021,
  },
  {
    id: 'sony-a7siii',
    brand: 'Sony',
    model: 'A7S III',
    sensorSize: 'full-frame',
    sensorWidth: 35.6,
    sensorHeight: 23.8,
    cropFactor: 1.0,
    megapixels: 12.1,
    circleOfConfusion: 0.03,
    year: 2020,
  },
  {
    id: 'sony-fx3',
    brand: 'Sony',
    model: 'FX3',
    sensorSize: 'full-frame',
    sensorWidth: 35.6,
    sensorHeight: 23.8,
    cropFactor: 1.0,
    megapixels: 12.1,
    circleOfConfusion: 0.03,
    year: 2021,
  },
  {
    id: 'canon-r5',
    brand: 'Canon',
    model: 'EOS R5',
    sensorSize: 'full-frame',
    sensorWidth: 36.0,
    sensorHeight: 24.0,
    cropFactor: 1.0,
    megapixels: 45,
    circleOfConfusion: 0.03,
    year: 2020,
  },
  {
    id: 'canon-r6ii',
    brand: 'Canon',
    model: 'EOS R6 Mark II',
    sensorSize: 'full-frame',
    sensorWidth: 36.0,
    sensorHeight: 24.0,
    cropFactor: 1.0,
    megapixels: 24.2,
    circleOfConfusion: 0.03,
    year: 2022,
  },
  {
    id: 'nikon-z8',
    brand: 'Nikon',
    model: 'Z8',
    sensorSize: 'full-frame',
    sensorWidth: 35.9,
    sensorHeight: 23.9,
    cropFactor: 1.0,
    megapixels: 45.7,
    circleOfConfusion: 0.03,
    year: 2023,
  },
  {
    id: 'nikon-z6iii',
    brand: 'Nikon',
    model: 'Z6 III',
    sensorSize: 'full-frame',
    sensorWidth: 35.9,
    sensorHeight: 23.9,
    cropFactor: 1.0,
    megapixels: 24.5,
    circleOfConfusion: 0.03,
    year: 2024,
  },
  {
    id: 'panasonic-s5ii',
    brand: 'Panasonic',
    model: 'Lumix S5 II',
    sensorSize: 'full-frame',
    sensorWidth: 35.6,
    sensorHeight: 23.8,
    cropFactor: 1.0,
    megapixels: 24.2,
    circleOfConfusion: 0.03,
    year: 2023,
  },
  {
    id: 'red-v-raptor',
    brand: 'RED',
    model: 'V-RAPTOR',
    sensorSize: 'full-frame',
    sensorWidth: 40.96,
    sensorHeight: 21.6,
    cropFactor: 0.88,
    megapixels: 35.4,
    circleOfConfusion: 0.034,
    year: 2021,
  },
  {
    id: 'arri-alexa35',
    brand: 'ARRI',
    model: 'ALEXA 35',
    sensorSize: 'full-frame',
    sensorWidth: 27.99,
    sensorHeight: 19.22,
    cropFactor: 1.29,
    megapixels: 4.6,
    circleOfConfusion: 0.023,
    year: 2022,
  },

  // APS-C
  {
    id: 'sony-a6700',
    brand: 'Sony',
    model: 'A6700',
    sensorSize: 'aps-c',
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    cropFactor: 1.5,
    megapixels: 26,
    circleOfConfusion: 0.02,
    year: 2023,
  },
  {
    id: 'sony-fx30',
    brand: 'Sony',
    model: 'FX30',
    sensorSize: 'aps-c',
    sensorWidth: 23.4,
    sensorHeight: 15.6,
    cropFactor: 1.53,
    megapixels: 20.1,
    circleOfConfusion: 0.02,
    year: 2022,
  },
  {
    id: 'fuji-xh2s',
    brand: 'Fujifilm',
    model: 'X-H2S',
    sensorSize: 'aps-c',
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    cropFactor: 1.5,
    megapixels: 26.2,
    circleOfConfusion: 0.02,
    year: 2022,
  },
  {
    id: 'fuji-xt5',
    brand: 'Fujifilm',
    model: 'X-T5',
    sensorSize: 'aps-c',
    sensorWidth: 23.5,
    sensorHeight: 15.6,
    cropFactor: 1.5,
    megapixels: 40.2,
    circleOfConfusion: 0.02,
    year: 2022,
  },
  {
    id: 'canon-r7',
    brand: 'Canon',
    model: 'EOS R7',
    sensorSize: 'aps-c',
    sensorWidth: 22.3,
    sensorHeight: 14.8,
    cropFactor: 1.6,
    megapixels: 32.5,
    circleOfConfusion: 0.019,
    year: 2022,
  },
  {
    id: 'nikon-z50ii',
    brand: 'Nikon',
    model: 'Z50 II',
    sensorSize: 'aps-c',
    sensorWidth: 23.5,
    sensorHeight: 15.7,
    cropFactor: 1.5,
    megapixels: 20.9,
    circleOfConfusion: 0.02,
    year: 2024,
  },

  // Micro Four Thirds
  {
    id: 'panasonic-gh6',
    brand: 'Panasonic',
    model: 'Lumix GH6',
    sensorSize: 'micro-four-thirds',
    sensorWidth: 17.3,
    sensorHeight: 13.0,
    cropFactor: 2.0,
    megapixels: 25.2,
    circleOfConfusion: 0.015,
    year: 2022,
  },
  {
    id: 'panasonic-gh7',
    brand: 'Panasonic',
    model: 'Lumix GH7',
    sensorSize: 'micro-four-thirds',
    sensorWidth: 17.3,
    sensorHeight: 13.0,
    cropFactor: 2.0,
    megapixels: 25.2,
    circleOfConfusion: 0.015,
    year: 2024,
  },
  {
    id: 'om-om1ii',
    brand: 'OM System',
    model: 'OM-1 Mark II',
    sensorSize: 'micro-four-thirds',
    sensorWidth: 17.4,
    sensorHeight: 13.0,
    cropFactor: 2.0,
    megapixels: 20.4,
    circleOfConfusion: 0.015,
    year: 2024,
  },
  {
    id: 'bmpcc-6k',
    brand: 'Blackmagic',
    model: 'Pocket Cinema 6K',
    sensorSize: 'aps-c',
    sensorWidth: 23.1,
    sensorHeight: 12.99,
    cropFactor: 1.56,
    megapixels: 21.2,
    circleOfConfusion: 0.02,
    year: 2019,
  },

  // Medium Format
  {
    id: 'fuji-gfx100ii',
    brand: 'Fujifilm',
    model: 'GFX100 II',
    sensorSize: 'medium-format',
    sensorWidth: 43.8,
    sensorHeight: 32.9,
    cropFactor: 0.79,
    megapixels: 102,
    circleOfConfusion: 0.038,
    year: 2023,
  },
  {
    id: 'hasselblad-x2d',
    brand: 'Hasselblad',
    model: 'X2D 100C',
    sensorSize: 'medium-format',
    sensorWidth: 43.8,
    sensorHeight: 32.9,
    cropFactor: 0.79,
    megapixels: 100,
    circleOfConfusion: 0.038,
    year: 2022,
  },
  {
    id: 'phaseone-iq4',
    brand: 'Phase One',
    model: 'IQ4 150MP',
    sensorSize: 'medium-format',
    sensorWidth: 53.4,
    sensorHeight: 40.0,
    cropFactor: 0.65,
    megapixels: 151,
    circleOfConfusion: 0.046,
    year: 2019,
  },

  // Smartphones (for reference)
  {
    id: 'iphone-15-pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    sensorSize: 'one-inch',
    sensorWidth: 9.8,
    sensorHeight: 7.3,
    cropFactor: 3.67,
    megapixels: 48,
    circleOfConfusion: 0.008,
    year: 2023,
  },
  {
    id: 'iphone-16-pro',
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    sensorSize: 'one-inch',
    sensorWidth: 9.8,
    sensorHeight: 7.3,
    cropFactor: 3.67,
    megapixels: 48,
    circleOfConfusion: 0.008,
    year: 2024,
  },
  {
    id: 'samsung-s24ultra',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    sensorSize: 'one-inch',
    sensorWidth: 8.6,
    sensorHeight: 6.4,
    cropFactor: 4.19,
    megapixels: 200,
    circleOfConfusion: 0.007,
    year: 2024,
  },
];

/** Stand-in model silhouettes for DOF preview */
export const STAND_IN_MODELS: StandInModel[] = [
  {
    id: 'woman-170',
    name: 'Woman (170cm)',
    type: 'woman',
    heightCm: 170,
    silhouetteUrl: '/viewfinder/silhouettes/woman-170.png',
    thumbnailUrl: '/viewfinder/silhouettes/woman-170-thumb.png',
  },
  {
    id: 'woman-165',
    name: 'Woman (165cm)',
    type: 'woman',
    heightCm: 165,
    silhouetteUrl: '/viewfinder/silhouettes/woman-165.png',
    thumbnailUrl: '/viewfinder/silhouettes/woman-165-thumb.png',
  },
  {
    id: 'man-180',
    name: 'Man (180cm)',
    type: 'man',
    heightCm: 180,
    silhouetteUrl: '/viewfinder/silhouettes/man-180.png',
    thumbnailUrl: '/viewfinder/silhouettes/man-180-thumb.png',
  },
  {
    id: 'man-175',
    name: 'Man (175cm)',
    type: 'man',
    heightCm: 175,
    silhouetteUrl: '/viewfinder/silhouettes/man-175.png',
    thumbnailUrl: '/viewfinder/silhouettes/man-175-thumb.png',
  },
  {
    id: 'child-120',
    name: 'Child (120cm)',
    type: 'child',
    heightCm: 120,
    silhouetteUrl: '/viewfinder/silhouettes/child-120.png',
    thumbnailUrl: '/viewfinder/silhouettes/child-120-thumb.png',
  },
  {
    id: 'silhouette-generic',
    name: 'Generic Silhouette',
    type: 'silhouette',
    heightCm: 170,
    silhouetteUrl: '/viewfinder/silhouettes/generic.png',
    thumbnailUrl: '/viewfinder/silhouettes/generic-thumb.png',
  },
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class LayerExtractionService {
  private static instance: LayerExtractionService;

  private constructor() {}

  static getInstance(): LayerExtractionService {
    if (!LayerExtractionService.instance) {
      LayerExtractionService.instance = new LayerExtractionService();
    }
    return LayerExtractionService.instance;
  }

  /**
   * Upload local file to Fal storage if needed
   * Returns the original URL if already a public URL
   */
  private async ensurePublicUrl(imageUrl: string): Promise<string> {
    // Already a public URL
    if (imageUrl.startsWith('https://') && !imageUrl.includes('localhost')) {
      return imageUrl;
    }

    // Local URL pattern: http://localhost:3001/uploads/...
    if (imageUrl.includes('localhost') || imageUrl.startsWith('/uploads/')) {
      const backendRoot = path.resolve(__dirname, '../../..');

      // Extract the path portion
      let localPath = imageUrl;
      if (imageUrl.includes('localhost')) {
        // Extract path from URL like http://localhost:3001/uploads/temp_analysis/foo.jpg
        const urlPath = new URL(imageUrl).pathname;
        localPath = urlPath;
      }

      // Remove leading slash and construct absolute path
      const relativePath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
      const absolutePath = path.join(backendRoot, relativePath);

      log.info?.({ imageUrl, absolutePath }, 'Uploading local file to Fal storage');

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Local file not found: ${absolutePath}`);
      }

      const fileBuffer = fs.readFileSync(absolutePath);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      const publicUrl = await fal.storage.upload(blob as any);

      log.info?.({ publicUrl }, 'File uploaded to Fal storage');
      return publicUrl;
    }

    // For other cases, return as-is and let Fal handle it
    return imageUrl;
  }

  /**
   * Extract layers from an image using Qwen Image Layered model
   * Separates subject from background for independent DOF control
   */
  async extractLayers(options: LayerExtractionOptions): Promise<LayerExtractionResult> {
    const startTime = Date.now();
    const { imageUrl, numLayers = 3, prompt, outputFormat = 'png' } = options;

    try {
      // Ensure image is accessible to Fal (upload local files if needed)
      const publicImageUrl = await this.ensurePublicUrl(imageUrl);

      log.info?.(
        { imageUrl: publicImageUrl, numLayers },
        'Extracting layers with fal-ai/qwen-image-layered'
      );

      const result: any = await circuitBreakers.falai.execute(() =>
        withRetry(
          () =>
            fal.subscribe('fal-ai/qwen-image-layered/lora', {
              input: {
                image_url: publicImageUrl,
                num_layers: numLayers,
                prompt: prompt || 'separate subject from background',
                num_inference_steps: 28,
                guidance_scale: 5,
                output_format: outputFormat,
              },
              logs: true,
            }),
          { maxRetries: 2, initialDelayMs: 2000, maxDelayMs: 30000 }
        )
      );

      const processingTimeMs = Date.now() - startTime;
      logApiCall('falai', 'extractLayers', true, processingTimeMs);

      // Process the returned layers
      const layers: ExtractedLayer[] = [];
      if (result.images && Array.isArray(result.images)) {
        result.images.forEach((img: any, index: number) => {
          // Determine layer type based on position and content
          let layerType: ExtractedLayer['type'] = 'unknown';
          if (index === 0) {
            layerType = 'background';
          } else if (index === result.images.length - 1 || index === 1) {
            layerType = 'subject';
          } else if (index > result.images.length / 2) {
            layerType = 'foreground';
          }

          layers.push({
            id: `layer-${index}`,
            name: `Layer ${index + 1}`,
            imageUrl: img.url,
            order: index,
            type: layerType,
            width: img.width || 0,
            height: img.height || 0,
          });
        });
      }

      return {
        success: true,
        layers,
        originalWidth: layers[0]?.width || 0,
        originalHeight: layers[0]?.height || 0,
        processingTimeMs,
      };
    } catch (error: any) {
      const processingTimeMs = Date.now() - startTime;
      logApiCall('falai', 'extractLayers', false, processingTimeMs, { error: error.message });
      log.error?.({ error: error.message }, 'Layer extraction failed');

      return {
        success: false,
        layers: [],
        originalWidth: 0,
        originalHeight: 0,
        processingTimeMs,
        error: error.message,
      };
    }
  }

  /**
   * Quick 2-layer extraction (subject + background only)
   * Optimized for DOF simulation
   */
  async extractSubjectAndBackground(imageUrl: string): Promise<{
    subject: ExtractedLayer | null;
    background: ExtractedLayer | null;
    error?: string;
  }> {
    const result = await this.extractLayers({
      imageUrl,
      numLayers: 2,
      prompt: 'separate the main subject from the background',
    });

    if (!result.success || result.layers.length === 0) {
      return { subject: null, background: null, error: result.error };
    }

    // With 2 layers, first is background, second is subject
    const background = result.layers.find(l => l.order === 0) || null;
    const subject = result.layers.find(l => l.order === 1) || null;

    return { subject, background };
  }

  /**
   * Get framing preset by ID
   */
  getFramingPreset(presetId: string): FramingPreset | undefined {
    return FRAMING_PRESETS.find(p => p.id === presetId);
  }

  /**
   * Get all framing presets
   */
  getAllFramingPresets(): FramingPreset[] {
    return FRAMING_PRESETS;
  }

  /**
   * Get camera model by ID
   */
  getCameraModel(cameraId: string): CameraModel | undefined {
    return CAMERA_DATABASE.find(c => c.id === cameraId);
  }

  /**
   * Get all cameras, optionally filtered by sensor size
   */
  getCameras(sensorSize?: CameraModel['sensorSize']): CameraModel[] {
    if (sensorSize) {
      return CAMERA_DATABASE.filter(c => c.sensorSize === sensorSize);
    }
    return CAMERA_DATABASE;
  }

  /**
   * Get cameras grouped by brand
   */
  getCamerasByBrand(): Record<string, CameraModel[]> {
    return CAMERA_DATABASE.reduce(
      (acc, camera) => {
        if (!acc[camera.brand]) {
          acc[camera.brand] = [];
        }
        acc[camera.brand].push(camera);
        return acc;
      },
      {} as Record<string, CameraModel[]>
    );
  }

  /**
   * Get stand-in model by ID
   */
  getStandInModel(modelId: string): StandInModel | undefined {
    return STAND_IN_MODELS.find(m => m.id === modelId);
  }

  /**
   * Get all stand-in models
   */
  getAllStandInModels(): StandInModel[] {
    return STAND_IN_MODELS;
  }

  /**
   * Calculate the apparent size of a subject in frame
   * Based on camera sensor, focal length, and distance
   */
  calculateSubjectSize(
    subjectHeightCm: number,
    distanceM: number,
    focalLengthMm: number,
    sensorHeightMm: number
  ): {
    sizeInFrame: number; // 0-1, portion of frame height
    pixelsIfFullHD: number; // Pixels tall at 1080p
    framing: string; // Suggested framing type
  } {
    // Field of view calculation
    const vFOV = 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm));
    const visibleHeightM = 2 * distanceM * Math.tan(vFOV / 2);
    const subjectHeightM = subjectHeightCm / 100;

    const sizeInFrame = Math.min(1, subjectHeightM / visibleHeightM);
    const pixelsIfFullHD = Math.round(sizeInFrame * 1080);

    // Determine framing type
    let framing = 'wide';
    if (sizeInFrame > 0.9) framing = 'extreme close-up';
    else if (sizeInFrame > 0.7) framing = 'close-up';
    else if (sizeInFrame > 0.5) framing = 'medium close-up';
    else if (sizeInFrame > 0.35) framing = 'medium';
    else if (sizeInFrame > 0.2) framing = 'american';
    else if (sizeInFrame > 0.1) framing = 'full';

    return { sizeInFrame, pixelsIfFullHD, framing };
  }

  /**
   * Calculate the distance needed to achieve a specific framing
   * Inverse of calculateSubjectSize
   */
  calculateDistanceForFraming(
    subjectHeightCm: number,
    targetSizeInFrame: number,
    focalLengthMm: number,
    sensorHeightMm: number
  ): number {
    const subjectHeightM = subjectHeightCm / 100;
    const vFOV = 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm));
    const requiredVisibleHeight = subjectHeightM / targetSizeInFrame;
    const distance = requiredVisibleHeight / (2 * Math.tan(vFOV / 2));
    return Math.max(0.3, distance); // Minimum 30cm distance
  }
}

export default LayerExtractionService;

/**
 * PropExtractionService
 *
 * Module 7: The Prop Shop - Precision asset extraction with professional edge refinement.
 *
 * Features:
 * - BiRefNet v2 background removal via Fal.ai
 * - Batch extraction workflow
 * - Edge quality analysis
 * - Material property detection
 * - 3D proxy generation pipeline (TripoSR/LGM)
 * - Database persistence with Prisma
 */

import * as fal from '@fal-ai/serverless-client';
import { prisma } from '../../prisma';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Initialize Fal.ai
fal.config({
  credentials: process.env.FAL_KEY || process.env.FAL_API_KEY,
});

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ExtractionOptions {
  projectId: string;
  name?: string;
  category?: string;
  edgeRefinement?: 'fast' | 'balanced' | 'quality'; // Maps to BiRefNet settings
  generateThumbnail?: boolean;
  generate3dProxy?: boolean;
  model?: 'birefnet' | 'birefnet-massive' | 'sam2';
}

export interface ExtractionResult {
  propId: string;
  extractedUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  edgeQuality: number;
  materialAnalysis?: MaterialAnalysis;
}

export interface MaterialAnalysis {
  dominantColors: Array<{ hex: string; percentage: number }>;
  reflectivity: 'matte' | 'satin' | 'glossy' | 'metallic' | 'glass';
  transparency: 'opaque' | 'translucent' | 'transparent';
  texture: 'smooth' | 'rough' | 'patterned' | 'organic';
  suggestedLighting: string[];
}

export interface BatchExtractionResult {
  successful: ExtractionResult[];
  failed: Array<{ sourceUrl: string; error: string }>;
}

export interface Prop3DOptions {
  model: 'triposr' | 'lgm';
  outputFormat?: 'glb' | 'gltf' | 'obj';
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export class PropExtractionService {
  private static instance: PropExtractionService;
  private propsDir: string;
  private thumbnailSize = 256;

  private constructor() {
    this.propsDir = path.join(process.cwd(), 'uploads', 'props');
    if (!fs.existsSync(this.propsDir)) {
      fs.mkdirSync(this.propsDir, { recursive: true });
    }
  }

  static getInstance(): PropExtractionService {
    if (!PropExtractionService.instance) {
      PropExtractionService.instance = new PropExtractionService();
    }
    return PropExtractionService.instance;
  }

  // =========================================================================
  // CORE EXTRACTION
  // =========================================================================

  /**
   * Extract prop from image using BiRefNet background removal
   */
  async extractProp(
    sourceUrl: string,
    sourceType: 'generation' | 'upload' | 'element' | 'url',
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    const propId = uuidv4();
    const projectDir = path.join(this.propsDir, options.projectId);

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    console.log(`[PropExtraction] Starting extraction for prop ${propId}`);

    try {
      // Step 1: Run BiRefNet extraction
      const extractedImageUrl = await this.runBiRefNet(sourceUrl, options.model || 'birefnet');

      // Step 2: Download and save extracted image
      const extractedPath = path.join(projectDir, `${propId}.png`);
      await this.downloadImage(extractedImageUrl, extractedPath);

      // Step 3: Get image dimensions and analyze
      const metadata = await sharp(extractedPath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Step 4: Analyze edge quality
      const edgeQuality = await this.analyzeEdgeQuality(extractedPath);

      // Step 5: Generate thumbnail
      let thumbnailUrl: string | undefined;
      if (options.generateThumbnail !== false) {
        const thumbnailPath = path.join(projectDir, `${propId}_thumb.png`);
        await this.generateThumbnail(extractedPath, thumbnailPath);
        thumbnailUrl = `/uploads/props/${options.projectId}/${propId}_thumb.png`;
      }

      // Step 6: Analyze material properties
      const materialAnalysis = await this.analyzeMaterial(extractedPath);

      // Step 7: Save to database
      const prop = await prisma.prop.create({
        data: {
          id: propId,
          projectId: options.projectId,
          name: options.name || `Prop ${propId.substring(0, 8)}`,
          category: options.category || 'object',
          sourceType,
          sourceUrl,
          extractedUrl: `/uploads/props/${options.projectId}/${propId}.png`,
          thumbnailUrl,
          extractionModel: options.model || 'birefnet',
          edgeQuality,
          hasAlpha: true,
          width,
          height,
          aspectRatio: `${width}:${height}`,
          materialAnalysis: JSON.stringify(materialAnalysis),
        },
      });

      console.log(`[PropExtraction] Prop ${propId} extracted successfully`);

      return {
        propId: prop.id,
        extractedUrl: prop.extractedUrl,
        thumbnailUrl: prop.thumbnailUrl || undefined,
        width,
        height,
        edgeQuality,
        materialAnalysis,
      };
    } catch (error: any) {
      console.error(`[PropExtraction] Extraction failed:`, error);
      throw new Error(`Prop extraction failed: ${error.message}`);
    }
  }

  /**
   * Batch extract multiple props
   */
  async batchExtract(
    sources: Array<{
      url: string;
      type: 'generation' | 'upload' | 'element' | 'url';
      name?: string;
    }>,
    options: ExtractionOptions
  ): Promise<BatchExtractionResult> {
    const results: BatchExtractionResult = {
      successful: [],
      failed: [],
    };

    console.log(`[PropExtraction] Starting batch extraction of ${sources.length} items`);

    for (const source of sources) {
      try {
        const result = await this.extractProp(source.url, source.type, {
          ...options,
          name: source.name,
        });
        results.successful.push(result);
      } catch (error: any) {
        results.failed.push({
          sourceUrl: source.url,
          error: error.message,
        });
      }
    }

    console.log(
      `[PropExtraction] Batch complete: ${results.successful.length} succeeded, ${results.failed.length} failed`
    );
    return results;
  }

  // =========================================================================
  // BIREFNET INTEGRATION
  // =========================================================================

  /**
   * Run BiRefNet background removal via Fal.ai
   */
  private async runBiRefNet(imageUrl: string, model: string): Promise<string> {
    const endpoint = model === 'birefnet-massive' ? 'fal-ai/birefnet/massive' : 'fal-ai/birefnet';

    console.log(`[PropExtraction] Running ${model} on image...`);

    const result: any = await fal.subscribe(endpoint, {
      input: {
        image_url: imageUrl,
        model: 'General', // BiRefNet model variant
        output_format: 'png',
      },
      logs: true,
      onQueueUpdate: update => {
        if (update.status === 'IN_PROGRESS') {
          console.log(`[PropExtraction] BiRefNet processing...`);
        }
      },
    });

    if (!result?.image?.url) {
      throw new Error('BiRefNet did not return an image');
    }

    return result.image.url;
  }

  // =========================================================================
  // 3D PROXY GENERATION
  // =========================================================================

  /**
   * Generate 3D proxy model from extracted prop
   */
  async generate3DProxy(propId: string, options: Prop3DOptions): Promise<string> {
    const prop = await prisma.prop.findUnique({ where: { id: propId } });
    if (!prop) {
      throw new Error(`Prop ${propId} not found`);
    }

    // Update status to generating
    await prisma.prop.update({
      where: { id: propId },
      data: { proxy3dStatus: 'generating', proxy3dModel: options.model },
    });

    console.log(`[PropExtraction] Generating 3D proxy for prop ${propId} using ${options.model}`);

    try {
      let result: any;

      if (options.model === 'triposr') {
        // TripoSR via Fal.ai
        result = await fal.subscribe('fal-ai/triposr', {
          input: {
            image_url: prop.extractedUrl.startsWith('/')
              ? `${process.env.BASE_URL || 'http://localhost:3001'}${prop.extractedUrl}`
              : prop.extractedUrl,
            output_format: options.outputFormat || 'glb',
          },
          logs: true,
        });
      } else {
        // LGM (Large Geometric Model)
        result = await fal.subscribe('fal-ai/lgm', {
          input: {
            image_url: prop.extractedUrl.startsWith('/')
              ? `${process.env.BASE_URL || 'http://localhost:3001'}${prop.extractedUrl}`
              : prop.extractedUrl,
          },
          logs: true,
        });
      }

      const modelUrl = result?.model?.url || result?.mesh?.url;
      if (!modelUrl) {
        throw new Error(`${options.model} did not return a 3D model`);
      }

      // Download and save the 3D model
      const modelPath = path.join(
        this.propsDir,
        prop.projectId,
        `${propId}_3d.${options.outputFormat || 'glb'}`
      );
      await this.downloadFile(modelUrl, modelPath);

      const localUrl = `/uploads/props/${prop.projectId}/${propId}_3d.${options.outputFormat || 'glb'}`;

      // Update database
      await prisma.prop.update({
        where: { id: propId },
        data: {
          proxy3dUrl: localUrl,
          proxy3dStatus: 'complete',
        },
      });

      console.log(`[PropExtraction] 3D proxy generated: ${localUrl}`);
      return localUrl;
    } catch (error: any) {
      console.error(`[PropExtraction] 3D generation failed:`, error);

      await prisma.prop.update({
        where: { id: propId },
        data: { proxy3dStatus: 'failed' },
      });

      throw error;
    }
  }

  // =========================================================================
  // MATERIAL ANALYSIS
  // =========================================================================

  /**
   * Analyze material properties of extracted prop
   */
  private async analyzeMaterial(imagePath: string): Promise<MaterialAnalysis> {
    try {
      // Use Sharp to extract dominant colors
      const { dominant } = await sharp(imagePath)
        .resize(64, 64, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          // Simple color histogram
          const colorCounts = new Map<string, number>();
          for (let i = 0; i < data.length; i += info.channels) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = info.channels === 4 ? data[i + 3] : 255;

            // Skip transparent pixels
            if (a < 128) continue;

            // Quantize to reduce colors
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;
            const hex = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;

            colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
          }

          // Sort and get top colors
          const totalPixels = data.length / info.channels;
          const sortedColors = Array.from(colorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([hex, count]) => ({
              hex,
              percentage: Math.round((count / totalPixels) * 100),
            }));

          return { dominant: sortedColors };
        });

      // Analyze reflectivity based on color variance and brightness
      const avgBrightness =
        dominant.reduce((sum, c) => {
          const hex = c.hex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return sum + (r + g + b) / 3;
        }, 0) / dominant.length;

      let reflectivity: MaterialAnalysis['reflectivity'] = 'matte';
      if (avgBrightness > 200) {
        reflectivity = 'metallic';
      } else if (avgBrightness > 150) {
        reflectivity = 'glossy';
      } else if (avgBrightness > 100) {
        reflectivity = 'satin';
      }

      // Generate lighting suggestions based on reflectivity
      const suggestedLighting: string[] = [];
      switch (reflectivity) {
        case 'metallic':
          suggestedLighting.push('Large soft source to minimize hot spots');
          suggestedLighting.push('Gradient lighting for dimension');
          break;
        case 'glossy':
          suggestedLighting.push('Diffused key light');
          suggestedLighting.push('Careful highlight control');
          break;
        case 'matte':
          suggestedLighting.push('Hard or soft lighting both work');
          suggestedLighting.push('Great for product isolation');
          break;
        default:
          suggestedLighting.push('Standard three-point lighting');
      }

      return {
        dominantColors: dominant,
        reflectivity,
        transparency: 'opaque', // Would need alpha analysis
        texture: 'smooth', // Would need edge detection
        suggestedLighting,
      };
    } catch (error) {
      console.error('[PropExtraction] Material analysis failed:', error);
      return {
        dominantColors: [],
        reflectivity: 'matte',
        transparency: 'opaque',
        texture: 'smooth',
        suggestedLighting: ['Standard three-point lighting'],
      };
    }
  }

  // =========================================================================
  // EDGE QUALITY ANALYSIS
  // =========================================================================

  /**
   * Analyze edge quality of extracted prop (0-1 score)
   */
  private async analyzeEdgeQuality(imagePath: string): Promise<number> {
    try {
      // Use Sobel edge detection to measure edge sharpness
      const edgeBuffer = await sharp(imagePath)
        .extractChannel('alpha')
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1], // Sobel X
        })
        .raw()
        .toBuffer();

      // Calculate average edge strength
      let sum = 0;
      for (const byte of edgeBuffer) {
        sum += byte;
      }
      const avgEdge = sum / edgeBuffer.length;

      // Normalize to 0-1 (higher = sharper edges)
      const quality = Math.min(1, avgEdge / 128);

      return Math.round(quality * 100) / 100;
    } catch (error) {
      console.error('[PropExtraction] Edge analysis failed:', error);
      return 0.5; // Default to medium quality
    }
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Generate thumbnail from extracted prop
   */
  private async generateThumbnail(sourcePath: string, destPath: string): Promise<void> {
    await sharp(sourcePath)
      .resize(this.thumbnailSize, this.thumbnailSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(destPath);
  }

  /**
   * Download image from URL
   */
  private async downloadImage(url: string, destPath: string): Promise<void> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(destPath, Buffer.from(response.data));
  }

  /**
   * Download any file from URL
   */
  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });
  }

  // =========================================================================
  // CRUD OPERATIONS
  // =========================================================================

  /**
   * Get all props for a project
   */
  async getProps(projectId: string, category?: string): Promise<any[]> {
    return prisma.prop.findMany({
      where: {
        projectId,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single prop by ID
   */
  async getProp(propId: string): Promise<any> {
    return prisma.prop.findUnique({ where: { id: propId } });
  }

  /**
   * Update prop metadata
   */
  async updateProp(
    propId: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      isFavorite?: boolean;
      tags?: string[];
    }
  ): Promise<any> {
    return prisma.prop.update({
      where: { id: propId },
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });
  }

  /**
   * Delete prop and associated files
   */
  async deleteProp(propId: string): Promise<void> {
    const prop = await prisma.prop.findUnique({ where: { id: propId } });
    if (!prop) return;

    // Delete files
    const files = [prop.extractedUrl, prop.thumbnailUrl, prop.proxy3dUrl].filter(Boolean);

    for (const fileUrl of files) {
      const filePath = path.join(process.cwd(), fileUrl as string);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await prisma.prop.delete({ where: { id: propId } });
  }

  /**
   * Increment usage count
   */
  async trackUsage(propId: string): Promise<void> {
    await prisma.prop.update({
      where: { id: propId },
      data: { usageCount: { increment: 1 } },
    });
  }
}

export const propExtractionService = PropExtractionService.getInstance();

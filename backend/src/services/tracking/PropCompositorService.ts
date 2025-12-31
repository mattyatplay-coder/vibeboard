/**
 * PropCompositorService - Pro Trajectory Engine Compositor
 *
 * Composites prop images onto tracked video frames using:
 * - Homography transformations for perspective correction
 * - FFmpeg for video processing and output
 * - Canvas API for frame-by-frame compositing
 *
 * Pipeline:
 * 1. Load tracking data (corner points per frame)
 * 2. Extract frames from video
 * 3. Apply homography transform to prop image for each frame
 * 4. Composite prop onto video frame
 * 5. Reassemble frames into output video
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas, loadImage, Image } from '@napi-rs/canvas';

const execAsync = promisify(exec);

export interface CompositeOptions {
  videoPath: string;
  propImagePath: string;
  trackingData: TrackingData;
  outputPath?: string;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  opacity?: number;
  featherEdge?: number;
}

export interface TrackingData {
  frames: TrackedFrame[];
  fps: number;
  width: number;
  height: number;
}

export interface TrackedFrame {
  frameIndex: number;
  corners: { x: number; y: number }[];
  homography?: number[];
}

export interface CompositeResult {
  success: boolean;
  outputPath: string;
  frameCount: number;
  duration: number;
  error?: string;
}

class PropCompositorService {
  private static instance: PropCompositorService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'compositor');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  static getInstance(): PropCompositorService {
    if (!PropCompositorService.instance) {
      PropCompositorService.instance = new PropCompositorService();
    }
    return PropCompositorService.instance;
  }

  /**
   * Composite prop onto video using tracking data
   */
  async composite(options: CompositeOptions): Promise<CompositeResult> {
    const {
      videoPath,
      propImagePath,
      trackingData,
      outputPath = path.join(this.tempDir, `composite-${Date.now()}.mp4`),
      blendMode = 'normal',
      opacity = 1.0,
      featherEdge = 0,
    } = options;

    const jobId = Date.now().toString();
    const framesDir = path.join(this.tempDir, `frames-${jobId}`);
    const compositedDir = path.join(this.tempDir, `composited-${jobId}`);

    try {
      // Create temp directories
      fs.mkdirSync(framesDir, { recursive: true });
      fs.mkdirSync(compositedDir, { recursive: true });

      console.log(`[PropCompositor] Starting composite job ${jobId}`);

      // Step 1: Extract frames from video
      console.log('[PropCompositor] Extracting frames...');
      await this.extractFrames(videoPath, framesDir, trackingData.fps);

      // Step 2: Load prop image
      const propImage = await loadImage(propImagePath);

      // Step 3: Composite each frame
      console.log('[PropCompositor] Compositing frames...');
      const frameFiles = fs.readdirSync(framesDir).sort();

      for (let i = 0; i < frameFiles.length; i++) {
        const frameFile = frameFiles[i];
        const frameIndex = parseInt(frameFile.match(/\d+/)?.[0] || '0');
        const framePath = path.join(framesDir, frameFile);
        const outputFramePath = path.join(compositedDir, frameFile);

        // Get tracking data for this frame
        const frameData = trackingData.frames.find(f => f.frameIndex === frameIndex);

        if (frameData && frameData.corners.length === 4) {
          await this.compositeFrame(framePath, propImage, frameData.corners, outputFramePath, {
            blendMode,
            opacity,
            featherEdge,
          });
        } else {
          // No tracking data for this frame, copy original
          fs.copyFileSync(framePath, outputFramePath);
        }

        // Progress logging
        if (i % 10 === 0) {
          console.log(`[PropCompositor] Progress: ${i}/${frameFiles.length} frames`);
        }
      }

      // Step 4: Reassemble video with FFmpeg
      console.log('[PropCompositor] Assembling output video...');
      await this.assembleVideo(compositedDir, outputPath, trackingData.fps, videoPath);

      // Cleanup temp directories
      fs.rmSync(framesDir, { recursive: true, force: true });
      fs.rmSync(compositedDir, { recursive: true, force: true });

      console.log(`[PropCompositor] Complete: ${outputPath}`);

      return {
        success: true,
        outputPath,
        frameCount: frameFiles.length,
        duration: frameFiles.length / trackingData.fps,
      };
    } catch (error: any) {
      console.error('[PropCompositor] Error:', error);

      // Cleanup on error
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
      if (fs.existsSync(compositedDir)) {
        fs.rmSync(compositedDir, { recursive: true, force: true });
      }

      return {
        success: false,
        outputPath: '',
        frameCount: 0,
        duration: 0,
        error: error.message,
      };
    }
  }

  /**
   * Extract frames from video using FFmpeg
   */
  private async extractFrames(videoPath: string, outputDir: string, fps: number): Promise<void> {
    const command = `ffmpeg -i "${videoPath}" -vf "fps=${fps}" "${outputDir}/frame_%04d.png" -y`;

    try {
      await execAsync(command);
    } catch (error: any) {
      throw new Error(`Frame extraction failed: ${error.message}`);
    }
  }

  /**
   * Composite prop onto a single frame using canvas
   */
  private async compositeFrame(
    framePath: string,
    propImage: Image,
    corners: { x: number; y: number }[],
    outputPath: string,
    options: { blendMode: string; opacity: number; featherEdge: number }
  ): Promise<void> {
    // Load the video frame
    const frameImage = await loadImage(framePath);
    const width = frameImage.width;
    const height = frameImage.height;

    // Create canvas
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw original frame
    ctx.drawImage(frameImage, 0, 0);

    // Calculate homography and apply perspective transform
    const transformedProp = await this.applyPerspectiveTransform(propImage, corners, width, height);

    // Set blend mode and opacity
    ctx.globalAlpha = options.opacity;
    ctx.globalCompositeOperation = this.getCanvasBlendMode(options.blendMode);

    // Draw transformed prop
    ctx.drawImage(transformedProp, 0, 0);

    // Reset composite operation
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Save output
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * Apply perspective transform to prop image
   * Uses canvas 2D transforms with corner interpolation
   */
  private async applyPerspectiveTransform(
    propImage: Image,
    dstCorners: { x: number; y: number }[],
    outputWidth: number,
    outputHeight: number
  ): Promise<any> {
    // Create output canvas
    const canvas = createCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d');

    // Source corners (prop image bounds)
    const srcCorners = [
      { x: 0, y: 0 },
      { x: propImage.width, y: 0 },
      { x: propImage.width, y: propImage.height },
      { x: 0, y: propImage.height },
    ];

    // For canvas 2D, we use triangulation approach
    // Split the quad into two triangles and warp each

    // Draw using path clipping and transformation
    this.drawTexturedQuad(ctx, propImage, srcCorners, dstCorners);

    return canvas;
  }

  /**
   * Draw a textured quadrilateral using canvas 2D
   * Uses affine transform approximation with triangulation
   */
  private drawTexturedQuad(
    ctx: any,
    image: Image,
    src: { x: number; y: number }[],
    dst: { x: number; y: number }[]
  ): void {
    // Subdivide into triangles for better approximation
    // Triangle 1: TL, TR, BR
    this.drawTexturedTriangle(ctx, image, [src[0], src[1], src[2]], [dst[0], dst[1], dst[2]]);

    // Triangle 2: TL, BR, BL
    this.drawTexturedTriangle(ctx, image, [src[0], src[2], src[3]], [dst[0], dst[2], dst[3]]);
  }

  /**
   * Draw a textured triangle using affine transform
   */
  private drawTexturedTriangle(
    ctx: any,
    image: Image,
    srcTri: { x: number; y: number }[],
    dstTri: { x: number; y: number }[]
  ): void {
    ctx.save();

    // Create clipping path
    ctx.beginPath();
    ctx.moveTo(dstTri[0].x, dstTri[0].y);
    ctx.lineTo(dstTri[1].x, dstTri[1].y);
    ctx.lineTo(dstTri[2].x, dstTri[2].y);
    ctx.closePath();
    ctx.clip();

    // Calculate affine transform matrix
    const transform = this.calculateAffineTransform(srcTri, dstTri);

    // Apply transform
    ctx.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);

    // Draw image
    ctx.drawImage(image, 0, 0);

    ctx.restore();
  }

  /**
   * Calculate 2D affine transform from 3 point correspondences
   */
  private calculateAffineTransform(
    src: { x: number; y: number }[],
    dst: { x: number; y: number }[]
  ): { a: number; b: number; c: number; d: number; e: number; f: number } {
    // Solve for affine matrix [a c e; b d f; 0 0 1]
    // Using the 3 point correspondences

    const x0 = src[0].x,
      y0 = src[0].y;
    const x1 = src[1].x,
      y1 = src[1].y;
    const x2 = src[2].x,
      y2 = src[2].y;

    const u0 = dst[0].x,
      v0 = dst[0].y;
    const u1 = dst[1].x,
      v1 = dst[1].y;
    const u2 = dst[2].x,
      v2 = dst[2].y;

    const det = x0 * (y1 - y2) - x1 * (y0 - y2) + x2 * (y0 - y1);

    if (Math.abs(det) < 1e-10) {
      // Degenerate case, return identity
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }

    const a = ((u0 - u2) * (y1 - y2) - (u1 - u2) * (y0 - y2)) / det;
    const b = ((v0 - v2) * (y1 - y2) - (v1 - v2) * (y0 - y2)) / det;
    const c = ((u1 - u2) * (x0 - x2) - (u0 - u2) * (x1 - x2)) / det;
    const d = ((v1 - v2) * (x0 - x2) - (v0 - v2) * (x1 - x2)) / det;
    const e = u0 - a * x0 - c * y0;
    const f = v0 - b * x0 - d * y0;

    return { a, b, c, d, e, f };
  }

  /**
   * Convert blend mode string to canvas globalCompositeOperation
   */
  private getCanvasBlendMode(mode: string): GlobalCompositeOperation {
    const modeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
    };
    return modeMap[mode] || 'source-over';
  }

  /**
   * Reassemble frames into video using FFmpeg
   */
  private async assembleVideo(
    framesDir: string,
    outputPath: string,
    fps: number,
    originalVideo: string
  ): Promise<void> {
    // Get audio from original video if present
    const hasAudio = await this.checkVideoHasAudio(originalVideo);

    let command: string;

    if (hasAudio) {
      // Combine frames with original audio
      command = `ffmpeg -framerate ${fps} -i "${framesDir}/frame_%04d.png" -i "${originalVideo}" -map 0:v -map 1:a? -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest "${outputPath}" -y`;
    } else {
      // Just frames, no audio
      command = `ffmpeg -framerate ${fps} -i "${framesDir}/frame_%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p "${outputPath}" -y`;
    }

    try {
      await execAsync(command);
    } catch (error: any) {
      throw new Error(`Video assembly failed: ${error.message}`);
    }
  }

  /**
   * Check if video has audio track
   */
  private async checkVideoHasAudio(videoPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${videoPath}"`
      );
      return stdout.trim().includes('audio');
    } catch {
      return false;
    }
  }

  /**
   * Generate preview frame at specific index
   */
  async generatePreviewFrame(
    videoPath: string,
    propImagePath: string,
    corners: { x: number; y: number }[],
    frameIndex: number
  ): Promise<Buffer> {
    const tempFrame = path.join(this.tempDir, `preview-${Date.now()}.png`);
    const tempOutput = path.join(this.tempDir, `preview-out-${Date.now()}.png`);

    try {
      // Extract single frame
      const command = `ffmpeg -i "${videoPath}" -vf "select=eq(n\\,${frameIndex})" -vframes 1 "${tempFrame}" -y`;
      await execAsync(command);

      // Load and composite
      const propImage = await loadImage(propImagePath);
      await this.compositeFrame(tempFrame, propImage, corners, tempOutput, {
        blendMode: 'normal',
        opacity: 1.0,
        featherEdge: 0,
      });

      // Read result
      const buffer = fs.readFileSync(tempOutput);

      // Cleanup
      fs.unlinkSync(tempFrame);
      fs.unlinkSync(tempOutput);

      return buffer;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempFrame)) fs.unlinkSync(tempFrame);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      throw error;
    }
  }
}

export default PropCompositorService;

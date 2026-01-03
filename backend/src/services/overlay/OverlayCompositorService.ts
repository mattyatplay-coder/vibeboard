/**
 * OverlayCompositorService - FFmpeg-based overlay compositing
 *
 * Handles:
 * - Positioning overlays on video frames
 * - Animation effects (fade, slide, scale)
 * - Timing synchronization with video
 * - Multiple overlay stacking
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  OverlayTrack,
  OverlayItem,
  OverlayPosition,
  AnimationType,
  CompositeOverlayRequest,
  CompositeOverlayResult,
  DEFAULT_OVERLAY_SETTINGS,
} from './OverlayTypes';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PositionCoordinates {
  x: string; // FFmpeg expression
  y: string; // FFmpeg expression
}

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class OverlayCompositorService {
  private static instance: OverlayCompositorService;
  private outputDir: string;

  private constructor() {
    this.outputDir = path.join(process.cwd(), 'uploads', 'composited');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  static getInstance(): OverlayCompositorService {
    if (!OverlayCompositorService.instance) {
      OverlayCompositorService.instance = new OverlayCompositorService();
    }
    return OverlayCompositorService.instance;
  }

  /**
   * Composite overlays onto a video
   */
  async compositeOverlays(request: CompositeOverlayRequest): Promise<CompositeOverlayResult> {
    const startTime = Date.now();
    const { videoUrl, overlayTrack, outputFormat = 'mp4', quality = 18 } = request;

    // Get video metadata
    const metadata = await this.getVideoMetadata(videoUrl);

    // Generate output filename
    const outputFilename = `composited_${Date.now()}.${outputFormat}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    // Build FFmpeg command
    const ffmpegArgs = await this.buildFFmpegCommand(
      videoUrl,
      overlayTrack,
      metadata,
      outputPath,
      outputFormat,
      quality
    );

    // Execute FFmpeg
    await this.executeFFmpeg(ffmpegArgs);

    const processingTime = Date.now() - startTime;

    return {
      url: `/uploads/composited/${outputFilename}`,
      duration: metadata.duration,
      processingTime,
    };
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        videoUrl,
      ];

      const ffprobe = spawn('ffprobe', args);
      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', data => {
        stdout += data.toString();
      });
      ffprobe.stderr.on('data', data => {
        stderr += data.toString();
      });

      ffprobe.on('close', code => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed: ${stderr}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const videoStream = data.streams?.find(
            (s: { codec_type: string }) => s.codec_type === 'video'
          );

          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          // Parse frame rate (e.g., "24/1" or "30000/1001")
          const fpsMatch = videoStream.r_frame_rate?.match(/(\d+)\/(\d+)/);
          const fps = fpsMatch ? parseInt(fpsMatch[1]) / parseInt(fpsMatch[2]) : 24;

          resolve({
            width: videoStream.width || 1920,
            height: videoStream.height || 1080,
            duration: parseFloat(data.format?.duration || '0'),
            fps,
          });
        } catch (e) {
          reject(new Error(`Failed to parse ffprobe output: ${e}`));
        }
      });
    });
  }

  /**
   * Build FFmpeg filter complex for overlays
   */
  private async buildFFmpegCommand(
    videoUrl: string,
    overlayTrack: OverlayTrack,
    metadata: VideoMetadata,
    outputPath: string,
    outputFormat: 'mp4' | 'webm',
    quality: number
  ): Promise<string[]> {
    const args: string[] = ['-y']; // Overwrite output

    // Input: main video
    args.push('-i', videoUrl);

    // Collect all overlay inputs
    const overlayInputs: string[] = [];
    for (const overlay of overlayTrack.overlays) {
      const overlayPath = this.getOverlayPath(overlay);
      if (overlayPath) {
        args.push('-i', overlayPath);
        overlayInputs.push(overlayPath);
      }
    }

    // Build filter complex if we have overlays
    if (overlayInputs.length > 0) {
      const filterComplex = this.buildFilterComplex(
        overlayTrack.overlays,
        metadata,
        overlayTrack.settings || DEFAULT_OVERLAY_SETTINGS
      );
      args.push('-filter_complex', filterComplex);
      args.push('-map', '[out]');
      args.push('-map', '0:a?'); // Include audio if present
    }

    // Output settings
    if (outputFormat === 'mp4') {
      args.push('-c:v', 'libx264');
      args.push('-crf', quality.toString());
      args.push('-preset', 'medium');
      args.push('-c:a', 'aac');
      args.push('-b:a', '192k');
    } else {
      args.push('-c:v', 'libvpx-vp9');
      args.push('-crf', quality.toString());
      args.push('-b:v', '0');
      args.push('-c:a', 'libopus');
    }

    args.push(outputPath);

    return args;
  }

  /**
   * Build FFmpeg filter_complex string
   */
  private buildFilterComplex(
    overlays: OverlayItem[],
    metadata: VideoMetadata,
    settings: typeof DEFAULT_OVERLAY_SETTINGS
  ): string {
    const filters: string[] = [];
    let currentOutput = '[0:v]';
    const safeMargin = settings.safeAreaMargin;

    overlays.forEach((overlay, index) => {
      const inputIndex = index + 1; // +1 because [0] is main video
      const overlayInput = `[${inputIndex}:v]`;
      const outputLabel = index === overlays.length - 1 ? '[out]' : `[tmp${index}]`;

      // Get position coordinates
      const position = this.calculatePosition(overlay.position, metadata, safeMargin);

      // Build enable expression for timing
      const enableExpr = this.buildEnableExpression(overlay);

      // Build animation filter chain for this overlay
      const animatedInput = this.buildAnimationFilter(
        overlayInput,
        overlay,
        metadata,
        `[anim${index}]`
      );

      if (animatedInput.filter) {
        filters.push(animatedInput.filter);
      }

      // Overlay filter with timing
      const overlayFilter = [
        currentOutput,
        animatedInput.output,
        `overlay=${position.x}:${position.y}:enable='${enableExpr}'`,
        outputLabel,
      ].join('');

      filters.push(overlayFilter);
      currentOutput = outputLabel;
    });

    return filters.join(';');
  }

  /**
   * Build animation filter for an overlay
   */
  private buildAnimationFilter(
    input: string,
    overlay: OverlayItem,
    metadata: VideoMetadata,
    outputLabel: string
  ): { filter: string | null; output: string } {
    const { animationIn, animationOut, animationDuration, startTime, duration, opacity, scale } =
      overlay;
    const endTime = startTime + duration;
    const fps = metadata.fps;

    const filters: string[] = [];

    // Scale filter
    if (scale !== 1) {
      filters.push(`scale=iw*${scale}:ih*${scale}`);
    }

    // Base opacity
    if (opacity < 1) {
      filters.push(`colorchannelmixer=aa=${opacity}`);
    }

    // Fade in animation
    if (animationIn === 'fade') {
      filters.push(`fade=t=in:st=${startTime}:d=${animationDuration}`);
    }

    // Fade out animation
    if (animationOut === 'fade' && duration > 0) {
      const fadeOutStart = endTime - animationDuration;
      filters.push(`fade=t=out:st=${fadeOutStart}:d=${animationDuration}`);
    }

    // For slide/scale animations, we use overlay positioning with expressions
    // This is handled in the overlay filter itself

    if (filters.length === 0) {
      return { filter: null, output: input };
    }

    const filterChain = `${input}${filters.join(',')}${outputLabel}`;
    return { filter: filterChain, output: outputLabel };
  }

  /**
   * Calculate position coordinates based on position enum
   */
  private calculatePosition(
    position: OverlayPosition,
    metadata: VideoMetadata,
    safeMargin: number
  ): PositionCoordinates {
    const { width: W, height: H } = metadata;
    const margin = safeMargin;

    // Overlay dimensions referenced as overlay_w and overlay_h in FFmpeg
    const positions: Record<OverlayPosition, PositionCoordinates> = {
      'top-left': {
        x: `${margin}`,
        y: `${margin}`,
      },
      'top-center': {
        x: `(${W}-overlay_w)/2`,
        y: `${margin}`,
      },
      'top-right': {
        x: `${W}-overlay_w-${margin}`,
        y: `${margin}`,
      },
      'center-left': {
        x: `${margin}`,
        y: `(${H}-overlay_h)/2`,
      },
      center: {
        x: `(${W}-overlay_w)/2`,
        y: `(${H}-overlay_h)/2`,
      },
      'center-right': {
        x: `${W}-overlay_w-${margin}`,
        y: `(${H}-overlay_h)/2`,
      },
      'bottom-left': {
        x: `${margin}`,
        y: `${H}-overlay_h-${margin}`,
      },
      'bottom-center': {
        x: `(${W}-overlay_w)/2`,
        y: `${H}-overlay_h-${margin}`,
      },
      'bottom-right': {
        x: `${W}-overlay_w-${margin}`,
        y: `${H}-overlay_h-${margin}`,
      },
    };

    return positions[position];
  }

  /**
   * Build FFmpeg enable expression for overlay timing
   */
  private buildEnableExpression(overlay: OverlayItem): string {
    const { startTime, duration } = overlay;

    if (duration === 0) {
      // Show until end of video
      return `gte(t,${startTime})`;
    }

    const endTime = startTime + duration;
    return `between(t,${startTime},${endTime})`;
  }

  /**
   * Build animated position expression for slide animations
   */
  private buildAnimatedPositionExpression(
    basePosition: PositionCoordinates,
    overlay: OverlayItem,
    metadata: VideoMetadata,
    axis: 'x' | 'y'
  ): string {
    const { animationIn, animationOut, animationDuration, startTime, duration } = overlay;
    const endTime = startTime + duration;
    const base = axis === 'x' ? basePosition.x : basePosition.y;
    const dimension = axis === 'x' ? metadata.width : metadata.height;

    let expr = base;

    // Slide in animation
    if (animationIn.startsWith('slide-')) {
      const direction = animationIn.replace('slide-', '');
      const isRelevantAxis =
        (axis === 'x' && (direction === 'left' || direction === 'right')) ||
        (axis === 'y' && (direction === 'up' || direction === 'down'));

      if (isRelevantAxis) {
        const sign = direction === 'left' || direction === 'up' ? 1 : -1;
        const offset = dimension * sign;
        // Linear interpolation from offset to base position
        const progress = `min(1,(t-${startTime})/${animationDuration})`;
        expr = `${base}+${offset}*(1-${progress})`;
      }
    }

    // Slide out animation (similar logic for exit)
    if (animationOut.startsWith('slide-') && duration > 0) {
      const direction = animationOut.replace('slide-', '');
      const isRelevantAxis =
        (axis === 'x' && (direction === 'left' || direction === 'right')) ||
        (axis === 'y' && (direction === 'up' || direction === 'down'));

      if (isRelevantAxis) {
        const sign = direction === 'left' || direction === 'up' ? -1 : 1;
        const offset = dimension * sign;
        const fadeOutStart = endTime - animationDuration;
        const progress = `max(0,(t-${fadeOutStart})/${animationDuration})`;
        // Combine with existing expression using if/else
        expr = `if(lt(t,${fadeOutStart}),${expr},${base}+${offset}*${progress})`;
      }
    }

    return expr;
  }

  /**
   * Get the file path for an overlay's visual asset
   */
  private getOverlayPath(overlay: OverlayItem): string | null {
    switch (overlay.type) {
      case 'custom_graphic':
        const graphicData = overlay.data as { url: string };
        return graphicData.url;

      case 'watermark':
        const watermarkData = overlay.data as { url: string };
        return watermarkData.url;

      case 'lower_third':
      case 'subscribe':
      case 'text':
        // These need to be pre-generated as PNG/WebM
        // Return null if not yet generated
        return null;

      default:
        return null;
    }
  }

  /**
   * Execute FFmpeg command
   */
  private executeFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[OverlayCompositor] FFmpeg args:', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let stderr = '';

      ffmpeg.stderr.on('data', data => {
        stderr += data.toString();
      });

      ffmpeg.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          console.error('[OverlayCompositor] FFmpeg error:', stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', err => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });
    });
  }

  /**
   * Preview a single frame with overlays applied
   */
  async previewFrame(
    videoUrl: string,
    overlayTrack: OverlayTrack,
    frameTime: number
  ): Promise<string> {
    const metadata = await this.getVideoMetadata(videoUrl);
    const outputFilename = `preview_${Date.now()}.png`;
    const outputPath = path.join(this.outputDir, outputFilename);

    // Build simplified FFmpeg command for single frame
    const args: string[] = ['-y', '-ss', frameTime.toString(), '-i', videoUrl];

    // Add overlay inputs
    for (const overlay of overlayTrack.overlays) {
      const overlayPath = this.getOverlayPath(overlay);
      if (overlayPath) {
        args.push('-i', overlayPath);
      }
    }

    // Build filter for visible overlays at this time
    const visibleOverlays = overlayTrack.overlays.filter(o => {
      const endTime = o.duration === 0 ? Infinity : o.startTime + o.duration;
      return frameTime >= o.startTime && frameTime <= endTime;
    });

    if (visibleOverlays.length > 0) {
      const filterComplex = this.buildFilterComplex(
        visibleOverlays,
        metadata,
        overlayTrack.settings || DEFAULT_OVERLAY_SETTINGS
      );
      args.push('-filter_complex', filterComplex);
      args.push('-map', '[out]');
    }

    args.push('-frames:v', '1');
    args.push(outputPath);

    await this.executeFFmpeg(args);

    return `/uploads/composited/${outputFilename}`;
  }
}

export default OverlayCompositorService;

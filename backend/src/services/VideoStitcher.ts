import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export type TransitionStyle = 'cut' | 'fade' | 'dissolve' | 'smooth' | 'wipe';

export interface StitchOptions {
  transitionStyle?: TransitionStyle;
  transitionDuration?: number; // Duration in seconds (default: 0.5)
}

/**
 * Extended clip interface for L-Cut/J-Cut support
 */
export interface TimelineClip {
  id: string;
  videoPath: string; // URL or local path
  audioPath?: string; // Separate audio if exists
  duration: number; // Total clip duration
  trimStart: number; // Video in-point (seconds)
  trimEnd: number; // Video out-point (seconds)
  audioTrimStart: number; // Audio in-point (may differ for L-Cut)
  audioTrimEnd: number; // Audio out-point
  audioGain?: number; // 0-2 volume multiplier (default 1)
  avLinked?: boolean; // Whether A/V are linked (default true)
}

export interface TimelineStitchOptions {
  frameRate?: number; // Output frame rate (default 24)
  outputFormat?: 'h264' | 'prores422';
  includeAudio?: boolean; // Default true
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export class VideoStitcher {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'vibeboard-stitch');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          duration: metadata.format.duration || 5,
          width: videoStream?.width || 1920,
          height: videoStream?.height || 1080,
        });
      });
    });
  }

  /**
   * Stitch videos with optional transitions
   */
  async stitchVideos(videoUrls: string[], options: StitchOptions = {}): Promise<string> {
    if (videoUrls.length === 0) {
      throw new Error('No videos to stitch');
    }

    const { transitionStyle = 'cut', transitionDuration = 0.5 } = options;

    const jobId = uuidv4();
    const jobDir = path.join(this.tempDir, jobId);
    fs.mkdirSync(jobDir);

    try {
      console.log(
        `[Stitcher] Starting job ${jobId} with ${videoUrls.length} videos, transition: ${transitionStyle}`
      );

      // 1. Download all videos
      const localPaths: string[] = [];
      for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        const ext = path.extname(new URL(url).pathname) || '.mp4';
        const localPath = path.join(jobDir, `input_${i}${ext}`);

        console.log(`[Stitcher] Downloading ${url} to ${localPath}`);
        const response = await axios.get(url, { responseType: 'stream' });
        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', () => resolve(null));
          writer.on('error', reject);
        });
        localPaths.push(localPath);
      }

      const outputPath = path.join(jobDir, 'output.mp4');

      // 2. Choose stitching method based on transition style
      if (transitionStyle === 'cut' || videoUrls.length === 1) {
        // Simple concatenation (fastest)
        await this.concatSimple(localPaths, outputPath, jobDir);
      } else {
        // Complex stitching with transitions (requires re-encoding)
        await this.concatWithTransitions(
          localPaths,
          outputPath,
          transitionStyle,
          transitionDuration
        );
      }

      console.log(`[Stitcher] Stitching complete: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('[Stitcher] Error:', error);
      fs.rmSync(jobDir, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * Simple concat (no transitions, fast copy)
   */
  private async concatSimple(
    localPaths: string[],
    outputPath: string,
    jobDir: string
  ): Promise<void> {
    const listPath = path.join(jobDir, 'list.txt');
    const fileContent = localPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, fileContent);

    console.log(`[Stitcher] Simple concatenating to ${outputPath}`);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions('-c copy')
        .save(outputPath)
        .on('end', resolve)
        .on('error', err => {
          console.error('[Stitcher] ffmpeg simple concat error:', err);
          reject(err);
        });
    });
  }

  /**
   * Concat with transition effects (requires re-encoding)
   */
  private async concatWithTransitions(
    localPaths: string[],
    outputPath: string,
    transitionStyle: TransitionStyle,
    transitionDuration: number
  ): Promise<void> {
    console.log(
      `[Stitcher] Concatenating with ${transitionStyle} transitions (${transitionDuration}s)`
    );

    // Get metadata for all videos
    const metadataList: VideoMetadata[] = [];
    for (const filePath of localPaths) {
      const metadata = await this.getVideoMetadata(filePath);
      metadataList.push(metadata);
    }

    // Build complex filter for transitions
    const filterComplex = this.buildTransitionFilter(
      localPaths.length,
      metadataList,
      transitionStyle,
      transitionDuration
    );

    await new Promise((resolve, reject) => {
      let cmd = ffmpeg();

      // Add all inputs
      for (const filePath of localPaths) {
        cmd = cmd.input(filePath);
      }

      cmd
        .complexFilter(filterComplex.filter)
        .outputOptions([
          '-map',
          `[${filterComplex.outputLabel}]`,
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '23',
          '-pix_fmt',
          'yuv420p',
        ])
        .save(outputPath)
        .on('end', resolve)
        .on('error', err => {
          console.error('[Stitcher] ffmpeg transition error:', err);
          reject(err);
        });
    });
  }

  /**
   * Build ffmpeg filter_complex string for transitions
   */
  private buildTransitionFilter(
    videoCount: number,
    metadataList: VideoMetadata[],
    transitionStyle: TransitionStyle,
    transitionDuration: number
  ): { filter: string; outputLabel: string } {
    const filters: string[] = [];
    const td = transitionDuration;

    // Calculate offsets for xfade (when each clip should start transitioning)
    const offsets: number[] = [];
    let currentOffset = 0;

    for (let i = 0; i < videoCount - 1; i++) {
      // Each video starts transitioning at: previous offset + (duration - transitionDuration)
      currentOffset = currentOffset + metadataList[i].duration - td;
      offsets.push(currentOffset);
    }

    // Map transition style to ffmpeg xfade transition
    const xfadeTransition = this.mapTransitionToXfade(transitionStyle);

    if (videoCount === 2) {
      // Simple case: two videos with one transition
      filters.push(
        `[0:v][1:v]xfade=transition=${xfadeTransition}:duration=${td}:offset=${offsets[0]}[outv]`
      );
      return { filter: filters.join(';'), outputLabel: 'outv' };
    }

    // Multiple videos: chain xfade filters
    // First transition: [0:v][1:v] -> [v01]
    filters.push(
      `[0:v][1:v]xfade=transition=${xfadeTransition}:duration=${td}:offset=${offsets[0]}[v01]`
    );

    // Chain remaining transitions
    for (let i = 2; i < videoCount; i++) {
      const prevLabel = i === 2 ? 'v01' : `v0${i - 1}`;
      const nextLabel = i === videoCount - 1 ? 'outv' : `v0${i}`;

      // Recalculate offset relative to the merged video
      // After first merge, the duration changes, so we need cumulative offset
      let cumulativeDuration = metadataList[0].duration;
      for (let j = 1; j < i; j++) {
        cumulativeDuration += metadataList[j].duration - td;
      }
      const offset = cumulativeDuration - td;

      filters.push(
        `[${prevLabel}][${i}:v]xfade=transition=${xfadeTransition}:duration=${td}:offset=${offset}[${nextLabel}]`
      );
    }

    return { filter: filters.join(';'), outputLabel: 'outv' };
  }

  /**
   * Map our transition style names to ffmpeg xfade transitions
   */
  private mapTransitionToXfade(style: TransitionStyle): string {
    switch (style) {
      case 'fade':
        return 'fade';
      case 'dissolve':
        return 'dissolve';
      case 'smooth':
        return 'smoothleft'; // Smooth slide
      case 'wipe':
        return 'wipeleft';
      case 'cut':
      default:
        return 'fade'; // Fallback to fade
    }
  }

  /**
   * Stitch with per-segment transitions
   */
  async stitchWithSegmentTransitions(
    segments: Array<{ url: string; transitionType?: TransitionStyle }>
  ): Promise<string> {
    // For now, use the first segment's transition type for all
    // A more advanced implementation would handle per-segment transitions
    const transitionStyle = segments[0]?.transitionType || 'cut';
    const urls = segments.map(s => s.url);

    return this.stitchVideos(urls, { transitionStyle });
  }

  cleanup(filePath: string) {
    try {
      const jobDir = path.dirname(filePath);
      if (jobDir.startsWith(this.tempDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('[Stitcher] Cleanup failed:', e);
    }
  }

  /**
   * Stitch timeline clips with L-Cut/J-Cut support
   * Implements independent audio/video trimming for professional editing
   *
   * L-Cut Logic:
   * - Audio offset = audioTrimStart - trimStart
   * - If positive: audio starts AFTER video (L-cut: audio lags)
   * - If negative: audio starts BEFORE video (J-cut: audio leads)
   */
  async stitchTimelineWithLCuts(
    clips: TimelineClip[],
    options: TimelineStitchOptions = {}
  ): Promise<string> {
    if (clips.length === 0) {
      throw new Error('No clips to stitch');
    }

    const { frameRate = 24, outputFormat = 'h264', includeAudio = true } = options;

    const jobId = uuidv4();
    const jobDir = path.join(this.tempDir, jobId);
    fs.mkdirSync(jobDir);

    console.log(`[Stitcher] Starting L-Cut job ${jobId} with ${clips.length} clips`);

    try {
      // 1. Download/prepare all clips locally
      const localClips: Array<TimelineClip & { localVideoPath: string; localAudioPath?: string }> =
        [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const localVideoPath = path.join(jobDir, `clip_${i}_video.mp4`);

        // Download or copy video
        if (clip.videoPath.startsWith('http')) {
          console.log(`[Stitcher] Downloading clip ${i}: ${clip.videoPath.substring(0, 60)}...`);
          const response = await axios.get(clip.videoPath, { responseType: 'stream' });
          const writer = fs.createWriteStream(localVideoPath);
          response.data.pipe(writer);
          await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', reject);
          });
        } else {
          fs.copyFileSync(clip.videoPath, localVideoPath);
        }

        let localAudioPath: string | undefined;
        if (clip.audioPath) {
          localAudioPath = path.join(jobDir, `clip_${i}_audio.mp3`);
          if (clip.audioPath.startsWith('http')) {
            const response = await axios.get(clip.audioPath, { responseType: 'stream' });
            const writer = fs.createWriteStream(localAudioPath);
            response.data.pipe(writer);
            await new Promise<void>((resolve, reject) => {
              writer.on('finish', () => resolve());
              writer.on('error', reject);
            });
          } else {
            fs.copyFileSync(clip.audioPath, localAudioPath);
          }
        }

        localClips.push({
          ...clip,
          localVideoPath,
          localAudioPath,
        });
      }

      // 2. Build FFmpeg complex filter graph
      const { filter, outputLabels } = this.buildLCutFilterGraph(
        localClips,
        frameRate,
        includeAudio
      );

      // 3. Execute FFmpeg
      const outputPath = path.join(jobDir, 'output.mp4');
      await this.executeLCutBake(
        localClips,
        filter,
        outputLabels,
        outputPath,
        frameRate,
        outputFormat,
        includeAudio
      );

      console.log(`[Stitcher] L-Cut stitching complete: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('[Stitcher] L-Cut error:', error);
      fs.rmSync(jobDir, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * Build FFmpeg complex filter graph for L-Cut support
   */
  private buildLCutFilterGraph(
    clips: Array<TimelineClip & { localVideoPath: string; localAudioPath?: string }>,
    frameRate: number,
    includeAudio: boolean
  ): { filter: string; outputLabels: { video: string; audio: string } } {
    const filters: string[] = [];
    const videoOutputs: string[] = [];
    const audioOutputs: string[] = [];

    let currentVideoCursor = 0; // Track global timeline position in seconds

    clips.forEach((clip, index) => {
      const videoDuration = clip.trimEnd - clip.trimStart;
      const audioOffset = clip.audioTrimStart - clip.trimStart; // L-Cut offset

      // === VIDEO PROCESSING ===
      // Trim video, reset timestamps, enforce frame rate
      filters.push(
        `[${index}:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS,fps=${frameRate}[v${index}]`
      );
      videoOutputs.push(`[v${index}]`);

      if (includeAudio) {
        // === AUDIO PROCESSING (L-Cut Logic) ===
        // Calculate audio delay for global timeline position
        let audioDelayMs = (currentVideoCursor + audioOffset) * 1000;
        let audioTrimStart = clip.audioTrimStart;

        // Handle negative delays (J-cut: audio leads video)
        if (audioDelayMs < 0) {
          audioTrimStart += Math.abs(audioDelayMs / 1000);
          audioDelayMs = 0;
        }

        const audioGain = clip.audioGain ?? 1.0;

        // Audio filter chain: trim -> volume -> delay
        filters.push(
          `[${index}:a]atrim=start=${audioTrimStart}:end=${clip.audioTrimEnd},asetpts=PTS-STARTPTS,volume=${audioGain},adelay=${Math.floor(audioDelayMs)}|${Math.floor(audioDelayMs)}[a${index}]`
        );
        audioOutputs.push(`[a${index}]`);
      }

      // Advance timeline cursor
      currentVideoCursor += videoDuration;
    });

    // === VIDEO CONCATENATION ===
    if (clips.length > 1) {
      filters.push(`${videoOutputs.join('')}concat=n=${clips.length}:v=1:a=0[outv]`);
    } else {
      filters.push(`[v0]copy[outv]`);
    }

    // === AUDIO MIXING ===
    if (includeAudio) {
      if (clips.length > 1) {
        // Mix all audio streams (handles overlapping audio from L/J-cuts)
        filters.push(
          `${audioOutputs.join('')}amix=inputs=${clips.length}:duration=longest:dropout_transition=0.1,apad=whole_dur=${currentVideoCursor}[outa]`
        );
      } else {
        filters.push(`[a0]apad=whole_dur=${currentVideoCursor}[outa]`);
      }
    }

    return {
      filter: filters.join(';'),
      outputLabels: { video: 'outv', audio: includeAudio ? 'outa' : '' },
    };
  }

  /**
   * Execute FFmpeg with L-Cut filter graph
   */
  private async executeLCutBake(
    clips: Array<TimelineClip & { localVideoPath: string; localAudioPath?: string }>,
    filterComplex: string,
    outputLabels: { video: string; audio: string },
    outputPath: string,
    frameRate: number,
    outputFormat: string,
    includeAudio: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd = ffmpeg();

      // Add all input files
      for (const clip of clips) {
        cmd = cmd.input(clip.localVideoPath);
        if (clip.localAudioPath) {
          cmd = cmd.input(clip.localAudioPath);
        }
      }

      // Build output options
      const outputOptions: string[] = ['-map', `[${outputLabels.video}]`];

      if (includeAudio && outputLabels.audio) {
        outputOptions.push('-map', `[${outputLabels.audio}]`);
      }

      // Encoding settings based on format
      if (outputFormat === 'prores422') {
        outputOptions.push(
          '-c:v',
          'prores_ks',
          '-profile:v',
          '3', // ProRes 422 HQ
          '-pix_fmt',
          'yuv422p10le',
          '-r',
          String(frameRate),
          '-vsync',
          'cfr'
        );
        if (includeAudio) {
          outputOptions.push('-c:a', 'pcm_s16le');
        }
      } else {
        // H.264
        outputOptions.push(
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-r',
          String(frameRate),
          '-vsync',
          'cfr'
        );
        if (includeAudio) {
          outputOptions.push('-c:a', 'aac', '-b:a', '192k');
        }
      }

      console.log(`[Stitcher] Executing L-Cut bake with ${clips.length} clips...`);
      console.log(`[Stitcher] Filter graph: ${filterComplex.substring(0, 200)}...`);

      cmd
        .complexFilter(filterComplex)
        .outputOptions(outputOptions)
        .save(outputPath)
        .on('progress', progress => {
          if (progress.percent) {
            console.log(`[Stitcher] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('[Stitcher] L-Cut bake complete');
          resolve();
        })
        .on('error', err => {
          console.error('[Stitcher] L-Cut ffmpeg error:', err);
          reject(err);
        });
    });
  }
}

export const videoStitcher = new VideoStitcher();

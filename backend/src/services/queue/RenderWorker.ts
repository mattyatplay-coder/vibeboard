/**
 * RenderWorker - Processes FFmpeg rendering jobs from the queue
 *
 * Handles:
 * - Video concatenation (bake master)
 * - Transcoding (h264, prores)
 * - Thumbnail generation
 * - Audio mixing with L-Cut/J-Cut support
 *
 * This worker runs in a separate process from the Express API,
 * preventing long-running FFmpeg operations from blocking requests.
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { RenderJobData, JobResult } from './QueueService';

const QUEUE_NAME = 'vibeboard:render';

interface FFmpegProgress {
  frame: number;
  fps: number;
  time: string;
  speed: string;
  progress: number;
}

/**
 * Execute FFmpeg command with progress tracking
 */
async function runFFmpeg(
  args: string[],
  onProgress?: (progress: FFmpegProgress) => void
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise(resolve => {
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let output = '';
    let errorOutput = '';
    let duration = 0;

    ffmpeg.stdout.on('data', data => {
      output += data.toString();
    });

    ffmpeg.stderr.on('data', data => {
      const text = data.toString();
      errorOutput += text;

      // Parse duration from input
      const durationMatch = text.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch) {
        const [, h, m, s] = durationMatch;
        duration = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
      }

      // Parse progress
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      const frameMatch = text.match(/frame=\s*(\d+)/);
      const fpsMatch = text.match(/fps=\s*([\d.]+)/);
      const speedMatch = text.match(/speed=\s*([\d.]+)x/);

      if (timeMatch && onProgress) {
        const [, h, m, s] = timeMatch;
        const currentTime = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        onProgress({
          frame: frameMatch ? parseInt(frameMatch[1]) : 0,
          fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
          time: `${h}:${m}:${s}`,
          speed: speedMatch ? `${speedMatch[1]}x` : '0x',
          progress: Math.min(progress, 100),
        });
      }
    });

    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, output, error: errorOutput });
      }
    });

    ffmpeg.on('error', err => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}

/**
 * Process bake/concat job - combines multiple video segments
 */
async function processBakeJob(job: Job<RenderJobData>): Promise<JobResult> {
  const { inputPaths, outputPath, options } = job.data;
  const startTime = Date.now();

  console.log(`[RenderWorker] Processing bake job ${job.id}`);
  console.log(`[RenderWorker] Inputs: ${inputPaths.length} files`);

  // Create concat file
  const concatPath = path.join(path.dirname(outputPath), `concat_${job.id}.txt`);
  const concatContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');

  fs.writeFileSync(concatPath, concatContent);

  try {
    const codec = options?.codec || 'h264';
    const fps = options?.fps || 24;
    const quality = options?.quality || 18;

    const ffmpegArgs = [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-r',
      fps.toString(),
      '-vsync',
      'cfr',
    ];

    // Codec-specific settings
    if (codec === 'prores') {
      ffmpegArgs.push(
        '-c:v',
        'prores_ks',
        '-profile:v',
        '3', // ProRes 422 HQ
        '-vendor',
        'apl0',
        '-pix_fmt',
        'yuv422p10le'
      );
    } else {
      ffmpegArgs.push(
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        quality.toString(),
        '-pix_fmt',
        'yuv420p'
      );
    }

    // Audio settings
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', outputPath);

    const result = await runFFmpeg(ffmpegArgs, progress => {
      job.updateProgress(progress.progress);
    });

    // Cleanup concat file
    fs.unlinkSync(concatPath);

    if (!result.success) {
      throw new Error(result.error || 'FFmpeg failed');
    }

    const duration = Date.now() - startTime;
    console.log(`[RenderWorker] Bake complete: ${outputPath} (${duration}ms)`);

    return {
      success: true,
      data: {
        outputPath,
        duration,
        codec,
        fps,
      },
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(concatPath)) {
      fs.unlinkSync(concatPath);
    }
    throw error;
  }
}

/**
 * Process transcode job - convert video format
 */
async function processTranscodeJob(job: Job<RenderJobData>): Promise<JobResult> {
  const { inputPaths, outputPath, options } = job.data;
  const startTime = Date.now();

  if (inputPaths.length !== 1) {
    throw new Error('Transcode requires exactly one input file');
  }

  const inputPath = inputPaths[0];
  const codec = options?.codec || 'h264';
  const resolution = options?.resolution;
  const quality = options?.quality || 18;

  console.log(`[RenderWorker] Transcoding ${inputPath} -> ${outputPath}`);

  const ffmpegArgs = ['-y', '-i', inputPath];

  // Resolution scaling
  if (resolution) {
    ffmpegArgs.push('-vf', `scale=${resolution}`);
  }

  // Codec settings
  if (codec === 'prores') {
    ffmpegArgs.push('-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le');
  } else {
    ffmpegArgs.push(
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      quality.toString(),
      '-pix_fmt',
      'yuv420p'
    );
  }

  ffmpegArgs.push('-c:a', 'copy', outputPath);

  const result = await runFFmpeg(ffmpegArgs, progress => {
    job.updateProgress(progress.progress);
  });

  if (!result.success) {
    throw new Error(result.error || 'Transcode failed');
  }

  const duration = Date.now() - startTime;
  return {
    success: true,
    data: { outputPath, duration, codec },
  };
}

/**
 * Process thumbnail job - extract frame as image
 */
async function processThumbnailJob(job: Job<RenderJobData>): Promise<JobResult> {
  const { inputPaths, outputPath } = job.data;
  const startTime = Date.now();

  if (inputPaths.length !== 1) {
    throw new Error('Thumbnail requires exactly one input file');
  }

  const inputPath = inputPaths[0];

  console.log(`[RenderWorker] Generating thumbnail from ${inputPath}`);

  const ffmpegArgs = [
    '-y',
    '-i',
    inputPath,
    '-vframes',
    '1',
    '-ss',
    '0.5', // 0.5 seconds in
    '-vf',
    'scale=320:-1',
    '-q:v',
    '2',
    outputPath,
  ];

  const result = await runFFmpeg(ffmpegArgs);

  if (!result.success) {
    throw new Error(result.error || 'Thumbnail generation failed');
  }

  const duration = Date.now() - startTime;
  return {
    success: true,
    data: { outputPath, duration },
  };
}

/**
 * Main job processor
 */
async function processJob(job: Job<RenderJobData>): Promise<JobResult> {
  console.log(`[RenderWorker] Processing job ${job.id} (${job.data.type})`);

  switch (job.data.type) {
    case 'bake':
    case 'concat':
      return processBakeJob(job);

    case 'transcode':
      return processTranscodeJob(job);

    case 'thumbnail':
      return processThumbnailJob(job);

    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}

/**
 * Start the render worker
 */
export function startRenderWorker(connection?: IORedis): Worker<RenderJobData, JobResult> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const workerConnection =
    connection ||
    new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

  const worker = new Worker<RenderJobData, JobResult>(
    QUEUE_NAME,
    async job => {
      try {
        return await processJob(job);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[RenderWorker] Job ${job.id} failed:`, message);
        throw error;
      }
    },
    {
      connection: workerConnection,
      concurrency: 2, // Process 2 jobs simultaneously
      limiter: {
        max: 5,
        duration: 60000, // Max 5 jobs per minute
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[RenderWorker] Job ${job.id} completed:`, result.success);
  });

  worker.on('failed', (job, err) => {
    console.error(`[RenderWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    console.error('[RenderWorker] Worker error:', err.message);
  });

  console.log('[RenderWorker] Started and listening for jobs...');

  return worker;
}

// Run worker if executed directly
if (require.main === module) {
  console.log('[RenderWorker] Starting as standalone process...');
  startRenderWorker();
}

export default { startRenderWorker };

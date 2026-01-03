/**
 * GenerationWorker - Processes AI generation jobs from the queue
 *
 * Handles:
 * - Image generation (Fal.ai, Replicate, Together, etc.)
 * - Video generation (Wan, Kling, Veo, Luma, MiniMax)
 * - Upscaling (Clarity, Aura SR)
 * - Enhancement (MMAudio, RIFE interpolation)
 *
 * This worker decouples GPU-intensive AI operations from the Express API,
 * enabling proper timeout handling and horizontal scaling.
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { GenerationJobData, JobResult } from './QueueService';
import { PrismaClient } from '@prisma/client';

const QUEUE_NAME = 'vibeboard:generation';
const prisma = new PrismaClient();

// Import adapters dynamically to avoid circular dependencies
let FalAIAdapter: any;
let ReplicateAdapter: any;
let TogetherAdapter: any;

async function loadAdapters() {
  if (!FalAIAdapter) {
    const falModule = await import('../generators/FalAIAdapter');
    FalAIAdapter = falModule.FalAIAdapter;
  }
  if (!ReplicateAdapter) {
    const repModule = await import('../generators/ReplicateAdapter');
    ReplicateAdapter = repModule.ReplicateAdapter;
  }
  if (!TogetherAdapter) {
    const togModule = await import('../generators/TogetherAdapter');
    TogetherAdapter = togModule.TogetherAdapter;
  }
}

/**
 * Determine which adapter to use based on model ID
 */
function getProviderFromModel(model: string): 'fal' | 'replicate' | 'together' | 'unknown' {
  if (
    model.startsWith('fal-ai/') ||
    model.includes('flux') ||
    model.includes('kling') ||
    model.includes('wan')
  ) {
    return 'fal';
  }
  if (model.includes('replicate') || model.includes(':')) {
    return 'replicate';
  }
  if (model.startsWith('black-forest-labs/') || model.startsWith('stabilityai/')) {
    return 'together';
  }
  return 'fal'; // Default to Fal.ai
}

/**
 * Update generation status in database
 */
async function updateGenerationStatus(
  generationId: string,
  status: 'queued' | 'running' | 'succeeded' | 'failed',
  data?: {
    outputUrl?: string;
    thumbnailUrl?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await prisma.generation.update({
      where: { id: generationId },
      data: {
        status,
        ...(data?.outputUrl && { outputUrl: data.outputUrl }),
        ...(data?.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
        ...(data?.errorMessage && { errorMessage: data.errorMessage }),
        ...(data?.metadata && { metadata: JSON.stringify(data.metadata) }),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`[GenerationWorker] Failed to update generation ${generationId}:`, error);
  }
}

/**
 * Process image generation job
 */
async function processImageGeneration(job: Job<GenerationJobData>): Promise<JobResult> {
  const { generationId, model, prompt, options } = job.data;
  const startTime = Date.now();

  await loadAdapters();
  await updateGenerationStatus(generationId, 'running');

  console.log(`[GenerationWorker] Generating image with ${model}`);

  const provider = getProviderFromModel(model);
  let result: { url?: string; urls?: string[]; error?: string };

  try {
    switch (provider) {
      case 'fal': {
        const adapter = new FalAIAdapter();
        result = await adapter.generate({
          prompt,
          model,
          ...options,
        });
        break;
      }
      case 'replicate': {
        const adapter = new ReplicateAdapter();
        result = await adapter.generate({
          prompt,
          model,
          ...options,
        });
        break;
      }
      case 'together': {
        const adapter = new TogetherAdapter();
        result = await adapter.generate({
          prompt,
          model,
          ...options,
        });
        break;
      }
      default:
        throw new Error(`Unknown provider for model: ${model}`);
    }

    const outputUrl = result.url || result.urls?.[0];

    if (!outputUrl) {
      throw new Error('No output URL returned from generation');
    }

    await updateGenerationStatus(generationId, 'succeeded', {
      outputUrl,
      metadata: { model, duration: Date.now() - startTime },
    });

    return {
      success: true,
      data: { outputUrl, model },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGenerationStatus(generationId, 'failed', { errorMessage: message });
    throw error;
  }
}

/**
 * Process video generation job
 */
async function processVideoGeneration(job: Job<GenerationJobData>): Promise<JobResult> {
  const { generationId, model, prompt, options } = job.data;
  const startTime = Date.now();

  await loadAdapters();
  await updateGenerationStatus(generationId, 'running');

  console.log(`[GenerationWorker] Generating video with ${model}`);

  try {
    const adapter = new FalAIAdapter();

    // Most video models are on Fal.ai
    const result = await adapter.generateVideo({
      prompt,
      model,
      ...options,
    });

    const outputUrl = result.url || result.video_url;

    if (!outputUrl) {
      throw new Error('No video URL returned from generation');
    }

    await updateGenerationStatus(generationId, 'succeeded', {
      outputUrl,
      metadata: { model, duration: Date.now() - startTime },
    });

    return {
      success: true,
      data: { outputUrl, model },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGenerationStatus(generationId, 'failed', { errorMessage: message });
    throw error;
  }
}

/**
 * Process upscale job
 */
async function processUpscale(job: Job<GenerationJobData>): Promise<JobResult> {
  const { generationId, model, options } = job.data;
  const startTime = Date.now();

  await loadAdapters();
  await updateGenerationStatus(generationId, 'running');

  const imageUrl = (options as any)?.imageUrl;
  if (!imageUrl) {
    throw new Error('imageUrl required for upscale');
  }

  console.log(`[GenerationWorker] Upscaling with ${model}`);

  try {
    const adapter = new FalAIAdapter();
    const result = await adapter.upscale({
      imageUrl,
      model,
      ...options,
    });

    const outputUrl = result.url || result.image_url;

    if (!outputUrl) {
      throw new Error('No upscaled URL returned');
    }

    await updateGenerationStatus(generationId, 'succeeded', {
      outputUrl,
      metadata: { model, duration: Date.now() - startTime },
    });

    return {
      success: true,
      data: { outputUrl, model },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGenerationStatus(generationId, 'failed', { errorMessage: message });
    throw error;
  }
}

/**
 * Process enhance job (audio, interpolation)
 */
async function processEnhance(job: Job<GenerationJobData>): Promise<JobResult> {
  const { generationId, model, options } = job.data;
  const startTime = Date.now();

  await loadAdapters();
  await updateGenerationStatus(generationId, 'running');

  const videoUrl = (options as any)?.videoUrl;
  if (!videoUrl) {
    throw new Error('videoUrl required for enhance');
  }

  console.log(`[GenerationWorker] Enhancing with ${model}`);

  try {
    const adapter = new FalAIAdapter();
    let result: { url?: string };

    // MMAudio for audio
    if (model.includes('mmaudio') || (options as any)?.mode === 'audio-only') {
      result = await adapter.addAudio({
        videoUrl,
        ...options,
      });
    }
    // RIFE for interpolation
    else if (model.includes('rife') || (options as any)?.mode === 'smooth-only') {
      result = await adapter.interpolate({
        videoUrl,
        ...options,
      });
    }
    // Full enhancement
    else {
      result = await adapter.enhance({
        videoUrl,
        ...options,
      });
    }

    const outputUrl = result.url;

    if (!outputUrl) {
      throw new Error('No enhanced URL returned');
    }

    await updateGenerationStatus(generationId, 'succeeded', {
      outputUrl,
      metadata: { model, duration: Date.now() - startTime },
    });

    return {
      success: true,
      data: { outputUrl, model },
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGenerationStatus(generationId, 'failed', { errorMessage: message });
    throw error;
  }
}

/**
 * Main job processor
 */
async function processJob(job: Job<GenerationJobData>): Promise<JobResult> {
  console.log(`[GenerationWorker] Processing job ${job.id} (${job.data.type})`);

  switch (job.data.type) {
    case 'image':
      return processImageGeneration(job);

    case 'video':
      return processVideoGeneration(job);

    case 'upscale':
      return processUpscale(job);

    case 'enhance':
      return processEnhance(job);

    default:
      throw new Error(`Unknown job type: ${job.data.type}`);
  }
}

/**
 * Start the generation worker
 */
export function startGenerationWorker(connection?: IORedis): Worker<GenerationJobData, JobResult> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const workerConnection =
    connection ||
    new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

  const worker = new Worker<GenerationJobData, JobResult>(
    QUEUE_NAME,
    async job => {
      try {
        return await processJob(job);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[GenerationWorker] Job ${job.id} failed:`, message);
        throw error;
      }
    },
    {
      connection: workerConnection,
      concurrency: 3, // 3 concurrent generations
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute (rate limiting for APIs)
      },
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[GenerationWorker] Job ${job.id} completed:`, result.success);
  });

  worker.on('failed', (job, err) => {
    console.error(`[GenerationWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    console.error('[GenerationWorker] Worker error:', err.message);
  });

  console.log('[GenerationWorker] Started and listening for jobs...');

  return worker;
}

// Run worker if executed directly
if (require.main === module) {
  console.log('[GenerationWorker] Starting as standalone process...');
  startGenerationWorker();
}

export default { startGenerationWorker };

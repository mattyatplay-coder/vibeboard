/**
 * Worker Entry Point
 *
 * Starts all queue workers for background job processing.
 * Run with: npm run worker
 *
 * Workers:
 * - RenderWorker: FFmpeg bake, transcode, thumbnail
 * - GenerationWorker: AI image/video generation
 */

import { startRenderWorker } from './services/queue/RenderWorker';
import { startGenerationWorker } from './services/queue/GenerationWorker';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function main() {
  console.log('='.repeat(50));
  console.log('[Worker] VibeBoard Worker Process Starting...');
  console.log(`[Worker] Redis URL: ${REDIS_URL}`);
  console.log('='.repeat(50));

  // Create shared Redis connection
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: times => {
      if (times > 10) {
        console.error('[Worker] Redis connection failed after 10 retries');
        process.exit(1);
      }
      console.log(`[Worker] Redis retry attempt ${times}...`);
      return Math.min(times * 100, 3000);
    },
  });

  connection.on('connect', () => {
    console.log('[Worker] Redis connected');
  });

  connection.on('error', err => {
    console.error('[Worker] Redis error:', err.message);
  });

  // Wait for Redis connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Redis connection timeout'));
    }, 30000);

    connection.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    connection.once('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('[Worker] Starting workers...');

  // Start workers
  const renderWorker = startRenderWorker(connection);
  const generationWorker = startGenerationWorker(connection);

  console.log('[Worker] All workers started successfully');
  console.log('[Worker] Listening for jobs...');
  console.log('='.repeat(50));

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Worker] Shutting down...');

    try {
      await renderWorker.close();
      console.log('[Worker] Render worker closed');

      await generationWorker.close();
      console.log('[Worker] Generation worker closed');

      await connection.quit();
      console.log('[Worker] Redis connection closed');

      console.log('[Worker] Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[Worker] Shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Keep process alive
  process.stdin.resume();
}

main().catch(error => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});

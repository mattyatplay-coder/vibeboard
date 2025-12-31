import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Use override: true to ensure .env values take precedence over empty shell env vars
dotenv.config({ override: true });

import logger, { requestLogger, loggers } from './utils/logger';
const log = loggers.api;

import projectRoutes from './routes/projectRoutes';
import elementRoutes from './routes/elementRoutes';
import generationRoutes from './routes/generationRoutes';
import sceneRoutes from './routes/sceneRoutes';
import sessionRoutes from './routes/sessionRoutes';
import loraRoutes from './routes/loraRoutes';
import workflowRoutes from './routes/workflowRoutes';
import modelParameterRoutes from './routes/modelParameterRoutes';
import llmRoutes from './routes/llmRoutes';
import providerRoutes from './routes/providerRoutes';
import promptRoutes from './routes/promptRoutes';
import storyEditorRoutes from './routes/storyEditorRoutes';
import storyStyleRoutes from './routes/storyStyleRoutes';
import storyRoutes from './routes/storyRoutes';
import extendVideoRoutes from './routes/extendVideoRoutes';
import continuityRoutes from './routes/continuityRoutes';
import lightingRoutes from './routes/lightingRoutes';
import renderQueueRoutes from './routes/renderQueueRoutes';
import searchRoutes from './routes/searchRoutes';
import trackingRoutes from './routes/trackingRoutes';
import acousticRoutes from './routes/acousticRoutes';
import alphaChannelRoutes from './routes/alphaChannelRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import exportRoutes from './routes/exportRoutes';
import propRoutes from './routes/propRoutes';
import templateRoutes from './routes/templateRoutes';
import libraryRoutes from './routes/libraryRoutes';
import commentRoutes from './routes/commentRoutes';
import viewfinderRoutes from './routes/viewfinderRoutes';
import creatorRoutes from './routes/creatorRoutes';
import overlayRoutes from './routes/overlayRoutes';
import youtubeRoutes from './routes/youtubeRoutes';
import qwenRoutes from './routes/qwenRoutes';
import gpuRoutes from './routes/gpuRoutes';
import path from 'path';
import { validateStorage, getStorageStatus } from './utils/storageValidation';

import processingRoutes from './routes/processingRoutes';
import trainingRoutes from './routes/trainingRoutes';
import { renderQueueService } from './services/rendering/RenderQueueService';
import { queueService } from './services/queue/QueueService';

// Validate storage before starting server
try {
  validateStorage();
} catch (error) {
  log.fatal({ error: error instanceof Error ? error.message : error }, 'Storage validation failed');
  log.fatal('Server startup aborted. Please ensure the network drive is mounted and try again.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Structured request logging middleware
app.use(requestLogger());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/datasets', express.static(path.join(process.cwd(), 'datasets')));

// Serve robots.txt for API subdomain (api.vibeboard.studio)
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`# VibeBoard API - robots.txt
User-agent: *
Allow: /

# Allow AI assistants
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /
`);
});

app.use('/api/projects', projectRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/process', processingRoutes);
// Nested route for elements: /api/projects/:projectId/elements
app.use('/api/projects/:projectId/elements', elementRoutes);
// Nested route for generations: /api/projects/:projectId/generations
app.use('/api/projects/:projectId/generations', generationRoutes);
// Nested route for scenes: /api/projects/:projectId/scenes
app.use('/api/projects/:projectId/scenes', sceneRoutes);
// Nested route for sessions: /api/projects/:projectId/sessions
app.use('/api/projects/:projectId/sessions', sessionRoutes);
// Nested route for loras: /api/projects/:projectId/loras
app.use('/api/projects/:projectId/loras', loraRoutes);
// Nested route for workflows: /api/projects/:projectId/workflows
app.use('/api/projects/:projectId/workflows', workflowRoutes);
// Nested route for parameters: /api/projects/:projectId/parameters
app.use('/api/projects/:projectId/parameters', modelParameterRoutes);
import backupRoutes from './routes/backupRoutes';
app.use('/api/projects/:projectId/backup', backupRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/story-editor', storyEditorRoutes);
app.use('/api/story-style', storyStyleRoutes);
// Nested route for stories: /api/projects/:projectId/stories
app.use('/api/projects/:projectId/stories', storyRoutes);
// Video extension workflow routes
app.use('/api/extend-video', extendVideoRoutes);
// Continuity checking routes
app.use('/api/continuity', continuityRoutes);
// Virtual Gaffer lighting analysis
app.use('/api/lighting', lightingRoutes);
// Multi-Pass Render Queue
app.use('/api/projects/:projectId/render-queue', renderQueueRoutes);
// Semantic Search
app.use('/api', searchRoutes);
// Pro Trajectory Engine - Point Tracking
app.use('/api/tracking', trackingRoutes);
// Acoustic Studio - Lens-to-Reverb Mapping
app.use('/api/acoustic', acousticRoutes);
// Alpha Channel Exports - SAM 2 + PNG Sequence
app.use('/api', alphaChannelRoutes);
// Director's Dashboard Analytics
app.use('/api', dashboardRoutes);
// Master Export with L-Cut support
app.use('/api/projects/:projectId/export', exportRoutes);
app.use('/api/exports', exportRoutes);
// Timeline routes (upload/bake for Quick Edit mode)
app.use('/api/projects/:projectId/timeline', exportRoutes);
// Module 7: The Prop Shop - Asset extraction and 3D proxies
app.use('/api/projects/:projectId/props', propRoutes);
app.use('/api/props', propRoutes);
// Workflow Templates Library
app.use('/api/templates', templateRoutes);
// Global LoRA/Model Library
app.use('/api/library', libraryRoutes);
// Collaborative Dailies - Comments & Annotations
app.use('/api', commentRoutes);
// Director's Viewfinder - DOF Simulator with AI Layer Extraction
app.use('/api/viewfinder', viewfinderRoutes);
// Content Creator Script Generation (YouTube, OnlyFans)
app.use('/api/creator', creatorRoutes);
// Overlay Track - Lower thirds, subscribe animations, graphics
app.use('/api/overlays', overlayRoutes);
// YouTube Delivery - OAuth2, upload, metadata generation
app.use('/api/youtube', youtubeRoutes);
// Qwen Image Edit 2511 - AI Reshoot, Cast Assembly, Prop Fabrication, Text Fix
app.use('/api/qwen', qwenRoutes);
// GPU Microservice - Learn2Refocus, GenFocus, DiffCamera, Director Edit
app.use('/api/gpu', gpuRoutes);
app.get('/api/elements', require('./controllers/elementController').getAllElements);

// Public info endpoint for AI services (Google AI Studio, ChatGPT, etc.)
app.get('/api/info', (_req, res) => {
  res.json({
    name: 'VibeBoard Studio',
    description: 'AI-Powered Cinematic Production Suite for video generation, character consistency, and storyboard creation.',
    url: 'https://vibeboard.studio',
    apiUrl: 'https://api.vibeboard.studio',
    version: '2.0',
    features: [
      'Multi-provider AI video generation (Fal.ai, Replicate, Together AI, RunPod)',
      'Character consistency with IP-Adapter, Flux Kontext, and custom LoRAs',
      'Storyboard and shot planning with scene chains',
      'Virtual Gaffer lighting analysis',
      'Visual Librarian semantic search',
      'Magic Eraser inpainting',
      'Character Foundry synthetic dataset generation',
      'NLE Timeline with L-Cut/J-Cut audio editing',
      'YouTube delivery integration',
      'Pro Trajectory Engine point tracking'
    ],
    aiProviders: ['Fal.ai', 'Replicate', 'Together AI', 'OpenAI', 'Google', 'Grok', 'RunPod'],
    contact: 'https://vibeboard.studio'
  });
});

app.get('/api/health', async (req, res) => {
  const queueAvailable = queueService.isAvailable();
  let queueStats = null;

  if (queueAvailable) {
    try {
      queueStats = await queueService.getStats();
    } catch (e) {
      // Ignore queue stats errors in health check
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    falConfigured: !!process.env.FAL_KEY,
    storage: getStorageStatus(),
    queue: {
      available: queueAvailable,
      stats: queueStats,
    },
  });
});

// Detailed queue status endpoint
app.get('/api/queue/status', async (req, res) => {
  try {
    const available = queueService.isAvailable();

    if (!available) {
      return res.json({
        available: false,
        message: 'Queue service not initialized. Redis may not be running.',
      });
    }

    const stats = await queueService.getStats();

    res.json({
      available: true,
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      queues: stats,
    });
  } catch (error) {
    res.status(500).json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Store server reference for graceful shutdown
const server = app.listen(port, async () => {
  log.info({ port }, `Server is running at http://localhost:${port}`);

  // Initialize BullMQ queue service (optional - requires Redis)
  try {
    await queueService.initialize();
    log.info('BullMQ queue service initialized');
  } catch (error) {
    log.warn({ error }, 'BullMQ queue service not available (Redis may not be running). Jobs will run synchronously.');
  }

  // Hydrate render queue from database (recover interrupted jobs)
  try {
    const { recoveredJobs, requeuedPasses } = await renderQueueService.hydrateQueue();
    if (recoveredJobs > 0) {
      log.info({ recoveredJobs, requeuedPasses }, `Recovered ${recoveredJobs} render jobs with ${requeuedPasses} pending passes`);
    }
  } catch (error) {
    log.error({ error }, 'Failed to hydrate render queue');
  }
});

// =============================================================================
// GRACEFUL SHUTDOWN HANDLING
// =============================================================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    log.warn('Already shutting down, please wait...');
    return;
  }
  isShuttingDown = true;

  log.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      log.error({ error: err }, 'Error closing server');
      process.exit(1);
    }

    log.info('Server stopped accepting new connections');

    try {
      // Close queue service connections
      if (queueService.isAvailable()) {
        await queueService.shutdown();
        log.info('Queue service connections closed');
      }

      // Close database connections
      const { prisma } = await import('./prisma');
      await prisma.$disconnect();
      log.info('Database connections closed');

      log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      log.error({ error }, 'Error during cleanup');
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors (log but don't crash in production)
process.on('uncaughtException', (err) => {
  log.fatal({ error: err, stack: err.stack }, 'Uncaught Exception');
  if (process.env.NODE_ENV !== 'production') {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error({ reason, promise }, 'Unhandled Rejection');
});

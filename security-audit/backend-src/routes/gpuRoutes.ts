/**
 * GPU Worker API Routes
 *
 * Exposes GPU-accelerated ML operations to the frontend.
 * Routes to the GPU microservice (RunPod/Local) via GPUWorkerClient.
 */

import { Router, Request, Response } from 'express';
import { GPUWorkerClient } from '../services/gpu/GPUWorkerClient';

const router = Router();
const gpuClient = GPUWorkerClient.getInstance();

/**
 * GET /api/gpu/health
 * Check GPU worker health and availability
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await gpuClient.getHealth();
    res.json({
      success: true,
      ...health,
    });
  } catch (error) {
    console.error('[GPU Routes] Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'GPU worker unavailable',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/gpu/optics/rack-focus
 * Create a rack focus video from a single image
 */
router.post('/optics/rack-focus', async (req: Request, res: Response) => {
  try {
    const { imageUrl, focusPointStart, focusPointEnd, durationSeconds, fps, blurStrength } =
      req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    if (!focusPointStart || !focusPointEnd) {
      return res.status(400).json({
        success: false,
        error: 'focusPointStart and focusPointEnd are required (e.g., [0.5, 0.5])',
      });
    }

    const result = await gpuClient.rackFocus({
      imageUrl,
      focusPointStart,
      focusPointEnd,
      durationSeconds,
      fps,
      blurStrength,
    });

    res.json(result);
  } catch (error) {
    console.error('[GPU Routes] Rack focus failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/gpu/optics/lens-character
 * Apply cinematic lens character to an image
 */
router.post('/optics/lens-character', async (req: Request, res: Response) => {
  try {
    const { imageUrl, lensType, bokehShape, aberrationStrength, flareIntensity, vignetteStrength } =
      req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    const result = await gpuClient.lensCharacter({
      imageUrl,
      lensType,
      bokehShape,
      aberrationStrength,
      flareIntensity,
      vignetteStrength,
    });

    res.json(result);
  } catch (error) {
    console.error('[GPU Routes] Lens character failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/gpu/optics/rescue-focus
 * Rescue slightly out-of-focus images
 */
router.post('/optics/rescue-focus', async (req: Request, res: Response) => {
  try {
    const { imageUrl, sharpnessTarget, preserveBokeh } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    const result = await gpuClient.rescueFocus({
      imageUrl,
      sharpnessTarget,
      preserveBokeh,
    });

    res.json(result);
  } catch (error) {
    console.error('[GPU Routes] Focus rescue failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/gpu/director/edit
 * AI-powered director edit using natural language
 */
router.post('/director/edit', async (req: Request, res: Response) => {
  try {
    const { imageUrl, instruction, preserveIdentity, strength } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required',
      });
    }

    if (!instruction) {
      return res.status(400).json({
        success: false,
        error: 'instruction is required (e.g., "change lighting to golden hour")',
      });
    }

    const result = await gpuClient.directorEdit({
      imageUrl,
      instruction,
      preserveIdentity,
      strength,
    });

    res.json(result);
  } catch (error) {
    console.error('[GPU Routes] Director edit failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/gpu/video/generate
 * Generate video using Wan 2.1 (self-hosted)
 * Text-to-Video: Provide prompt only
 * Image-to-Video: Provide prompt + imageUrl
 */
router.post('/video/generate', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      imageUrl,
      durationSeconds,
      fps,
      width,
      height,
      guidanceScale,
      numInferenceSteps,
      seed,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required',
      });
    }

    const result = await gpuClient.generateVideo({
      prompt,
      imageUrl,
      durationSeconds,
      fps,
      width,
      height,
      guidanceScale,
      numInferenceSteps,
      seed,
    });

    res.json(result);
  } catch (error) {
    console.error('[GPU Routes] Video generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

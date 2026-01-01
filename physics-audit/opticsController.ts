/**
 * Optics Controller - Phase 4A: Optics Engine
 *
 * Provides real-time focus control and lens character simulation
 * via Learn2Refocus and GenFocus GPU workers.
 */

import { Request, Response } from 'express';
import { gpuWorkerClient } from '../services/gpu/GPUWorkerClient';

export const opticsController = {
  /**
   * Generate rack focus video from a single image
   * POST /api/optics/rack-focus
   *
   * Uses Learn2Refocus to create a video that shifts focus
   * from one point to another over time.
   */
  generateRackFocus: async (req: Request, res: Response) => {
    try {
      const {
        imageUrl,
        focusPointStart = [0.5, 0.5],
        focusPointEnd = [0.5, 0.5],
        durationSeconds = 2.0,
        fps = 24,
        blurStrength = 1.0,
      } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required' });
      }

      console.log(`[OpticsController] Generating rack focus for ${imageUrl}`);
      console.log(`[OpticsController] Start: [${focusPointStart}] -> End: [${focusPointEnd}]`);

      const result = await gpuWorkerClient.rackFocus({
        imageUrl,
        focusPointStart: focusPointStart as [number, number],
        focusPointEnd: focusPointEnd as [number, number],
        durationSeconds,
        fps,
        blurStrength,
      });

      if (result.success) {
        return res.json({
          success: true,
          videoUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
          metadata: result.metadata,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Rack focus generation failed',
          details: result.metadata,
        });
      }
    } catch (error) {
      console.error('[OpticsController] generateRackFocus error:', error);
      return res.status(500).json({
        error: 'Internal server error during rack focus generation',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Apply lens character effects to an image
   * POST /api/optics/lens-character
   *
   * Uses GenFocus to simulate physical lens characteristics
   * like anamorphic flares, vintage bokeh, and optical aberrations.
   */
  applyLensCharacter: async (req: Request, res: Response) => {
    try {
      const {
        imageUrl,
        lensType = 'modern',
        bokehShape = 'circular',
        aberrationStrength = 0.5,
        flareIntensity = 0.3,
        vignetteStrength = 0.2,
      } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required' });
      }

      console.log(
        `[OpticsController] Applying lens character: ${lensType} with ${bokehShape} bokeh`
      );

      const result = await gpuWorkerClient.lensCharacter({
        imageUrl,
        lensType: lensType as 'vintage' | 'anamorphic' | 'modern' | 'classic',
        bokehShape: bokehShape as 'circular' | 'oval' | 'hexagonal' | 'swirly',
        aberrationStrength,
        flareIntensity,
        vignetteStrength,
      });

      if (result.success) {
        return res.json({
          success: true,
          imageUrl: result.outputUrl,
          processingTimeMs: result.processingTimeMs,
          metadata: result.metadata,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Lens character application failed',
          details: result.metadata,
        });
      }
    } catch (error) {
      console.error('[OpticsController] applyLensCharacter error:', error);
      return res.status(500).json({
        error: 'Internal server error during lens character application',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Get available lens presets
   * GET /api/optics/presets
   */
  getPresets: async (_req: Request, res: Response) => {
    const presets = {
      lensTypes: [
        { id: 'vintage', name: 'Vintage Prime', description: 'Soft, dreamy with character flaws' },
        { id: 'anamorphic', name: 'Anamorphic', description: 'Oval bokeh, horizontal flares' },
        { id: 'modern', name: 'Modern Cine', description: 'Clean, sharp with minimal aberration' },
        { id: 'classic', name: 'Classic Hollywood', description: 'Golden-era glass feel' },
      ],
      bokehShapes: [
        { id: 'circular', name: 'Circular', description: 'Standard spherical lens bokeh' },
        { id: 'oval', name: 'Oval', description: 'Anamorphic squeeze characteristic' },
        { id: 'hexagonal', name: 'Hexagonal', description: 'Visible aperture blade pattern' },
        { id: 'swirly', name: 'Swirly', description: 'Helios-style rotating background' },
      ],
    };

    return res.json(presets);
  },
};

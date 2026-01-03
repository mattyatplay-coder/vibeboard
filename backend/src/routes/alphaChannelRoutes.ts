/**
 * Alpha Channel Export Routes
 *
 * API endpoints for generating alpha-channel mattes and exporting
 * videos with transparency for VFX compositing.
 */

import { Router, Request, Response } from 'express';
import { AlphaChannelService } from '../services/export/AlphaChannelService';

const router = Router();

/**
 * GET /api/alpha/formats
 * Get available export formats
 */
router.get('/alpha/formats', async (_req: Request, res: Response) => {
  try {
    const service = AlphaChannelService.getInstance();
    const formats = service.getAvailableFormats();
    res.json({ formats });
  } catch (error: any) {
    console.error('Get formats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alpha/generate-mask
 * Generate a mask for an image using SAM 2
 */
router.post('/alpha/generate-mask', async (req: Request, res: Response) => {
  try {
    const { imageUrl, points, box } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const service = AlphaChannelService.getInstance();
    const maskUrl = await service.generateImageMask(imageUrl, points, box);

    res.json({
      success: true,
      maskUrl,
    });
  } catch (error: any) {
    console.error('Generate mask error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alpha/generate-video-mask
 * Generate a mask for a video using SAM 2
 */
router.post('/alpha/generate-video-mask', async (req: Request, res: Response) => {
  try {
    const { videoUrl, method = 'auto', points, box } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    const service = AlphaChannelService.getInstance();
    const result = await service.generateMask(videoUrl, method, points, box);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Generate video mask error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/alpha/export
 * Export video with alpha channel
 */
router.post('/projects/:projectId/alpha/export', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      videoUrl,
      exportName,
      segmentationMethod = 'auto',
      points,
      box,
      outputFormat = 'png_sequence',
      frameRate,
      resolution,
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    const service = AlphaChannelService.getInstance();
    const result = await service.exportWithAlpha({
      videoUrl,
      projectId,
      exportName: exportName || 'alpha_export',
      segmentationMethod,
      points,
      box,
      outputFormat,
      frameRate,
      resolution,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Alpha export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/alpha/batch-segment
 * Batch segment multiple subjects from a video
 */
router.post('/projects/:projectId/alpha/batch-segment', async (req: Request, res: Response) => {
  try {
    const { videoUrl, subjects } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'subjects array is required' });
    }

    const service = AlphaChannelService.getInstance();
    const results = await service.batchSegment(videoUrl, subjects);

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Batch segment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alpha/cleanup
 * Clean up old exports
 */
router.post('/alpha/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 7 } = req.body;

    const service = AlphaChannelService.getInstance();
    const deleted = await service.cleanupExports(olderThanDays);

    res.json({
      success: true,
      deleted,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

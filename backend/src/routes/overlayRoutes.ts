/**
 * Overlay Routes - API endpoints for overlay track management
 */

import { Router, Request, Response } from 'express';
import { OverlayCompositorService } from '../services/overlay/OverlayCompositorService';
import { LowerThirdGenerator } from '../services/overlay/LowerThirdGenerator';
import {
    OverlayTrack,
    OverlayItem,
    GenerateLowerThirdRequest,
    CompositeOverlayRequest,
    LOWER_THIRD_PRESETS,
    SUBSCRIBE_PRESETS,
    DEFAULT_OVERLAY_SETTINGS,
} from '../services/overlay/OverlayTypes';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const compositorService = OverlayCompositorService.getInstance();
const lowerThirdGenerator = LowerThirdGenerator.getInstance();

// ═══════════════════════════════════════════════════════════════════════════
// LOWER THIRD GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/overlays/lower-third
 * Generate a lower third graphic
 */
router.post('/lower-third', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, subtitle, style, customColors, width, height } = req.body as GenerateLowerThirdRequest;

        if (!name || !style) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: name, style',
            });
            return;
        }

        const result = await lowerThirdGenerator.generate({
            name,
            subtitle,
            style,
            customColors,
            width,
            height,
        });

        res.json({
            success: true,
            lowerThird: result,
        });
    } catch (error) {
        console.error('[Overlay] Lower third generation error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate lower third',
        });
    }
});

/**
 * GET /api/overlays/lower-third/styles
 * Get available lower third styles
 */
router.get('/lower-third/styles', async (_req: Request, res: Response): Promise<void> => {
    try {
        const styles = lowerThirdGenerator.getAvailableStyles();
        res.json({
            success: true,
            styles,
        });
    } catch (error) {
        console.error('[Overlay] Get styles error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get styles',
        });
    }
});

/**
 * GET /api/overlays/lower-third/presets
 * Get full preset data for styling
 */
router.get('/lower-third/presets', async (_req: Request, res: Response): Promise<void> => {
    res.json({
        success: true,
        presets: LOWER_THIRD_PRESETS,
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBSCRIBE BUTTON PRESETS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/overlays/subscribe/presets
 * Get subscribe button style presets
 */
router.get('/subscribe/presets', async (_req: Request, res: Response): Promise<void> => {
    res.json({
        success: true,
        presets: SUBSCRIBE_PRESETS,
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY TRACK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/overlays/tracks
 * Create a new overlay track
 */
router.post('/tracks', async (req: Request, res: Response): Promise<void> => {
    try {
        const { projectId, sceneChainId } = req.body;

        if (!projectId) {
            res.status(400).json({
                success: false,
                error: 'Missing required field: projectId',
            });
            return;
        }

        const track: OverlayTrack = {
            id: uuidv4(),
            projectId,
            sceneChainId,
            overlays: [],
            settings: DEFAULT_OVERLAY_SETTINGS,
        };

        // TODO: Save to database via Prisma
        // For now, return the created track
        res.json({
            success: true,
            track,
        });
    } catch (error) {
        console.error('[Overlay] Create track error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create overlay track',
        });
    }
});

/**
 * POST /api/overlays/tracks/:trackId/items
 * Add an overlay item to a track
 */
router.post('/tracks/:trackId/items', async (req: Request, res: Response): Promise<void> => {
    try {
        const { trackId } = req.params;
        const overlayData = req.body as Partial<OverlayItem>;

        if (!overlayData.type || overlayData.startTime === undefined) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: type, startTime',
            });
            return;
        }

        const item: OverlayItem = {
            id: uuidv4(),
            type: overlayData.type,
            startTime: overlayData.startTime,
            duration: overlayData.duration ?? DEFAULT_OVERLAY_SETTINGS.lowerThirdDefaultDuration,
            position: overlayData.position ?? 'bottom-left',
            animationIn: overlayData.animationIn ?? 'fade',
            animationOut: overlayData.animationOut ?? 'fade',
            animationDuration: overlayData.animationDuration ?? DEFAULT_OVERLAY_SETTINGS.defaultAnimationDuration,
            opacity: overlayData.opacity ?? DEFAULT_OVERLAY_SETTINGS.defaultOpacity,
            scale: overlayData.scale ?? 1,
            data: overlayData.data!,
        };

        // TODO: Add to track in database
        res.json({
            success: true,
            item,
            trackId,
        });
    } catch (error) {
        console.error('[Overlay] Add item error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add overlay item',
        });
    }
});

/**
 * PATCH /api/overlays/tracks/:trackId/items/:itemId
 * Update an overlay item
 */
router.patch('/tracks/:trackId/items/:itemId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { trackId, itemId } = req.params;
        const updates = req.body as Partial<OverlayItem>;

        // TODO: Update in database
        res.json({
            success: true,
            message: `Updated item ${itemId} in track ${trackId}`,
            updates,
        });
    } catch (error) {
        console.error('[Overlay] Update item error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update overlay item',
        });
    }
});

/**
 * DELETE /api/overlays/tracks/:trackId/items/:itemId
 * Remove an overlay item from a track
 */
router.delete('/tracks/:trackId/items/:itemId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { trackId, itemId } = req.params;

        // TODO: Delete from database
        res.json({
            success: true,
            message: `Deleted item ${itemId} from track ${trackId}`,
        });
    } catch (error) {
        console.error('[Overlay] Delete item error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete overlay item',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/overlays/composite
 * Composite overlays onto a video
 */
router.post('/composite', async (req: Request, res: Response): Promise<void> => {
    try {
        const { videoUrl, overlayTrack, outputFormat, quality } = req.body as CompositeOverlayRequest;

        if (!videoUrl || !overlayTrack) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: videoUrl, overlayTrack',
            });
            return;
        }

        const result = await compositorService.compositeOverlays({
            videoUrl,
            overlayTrack,
            outputFormat,
            quality,
        });

        res.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error('[Overlay] Composite error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to composite overlays',
        });
    }
});

/**
 * POST /api/overlays/preview
 * Preview a single frame with overlays
 */
router.post('/preview', async (req: Request, res: Response): Promise<void> => {
    try {
        const { videoUrl, overlayTrack, frameTime } = req.body;

        if (!videoUrl || !overlayTrack || frameTime === undefined) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields: videoUrl, overlayTrack, frameTime',
            });
            return;
        }

        const previewUrl = await compositorService.previewFrame(
            videoUrl,
            overlayTrack,
            frameTime
        );

        res.json({
            success: true,
            previewUrl,
        });
    } catch (error) {
        console.error('[Overlay] Preview error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate preview',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/overlays/defaults
 * Get default overlay settings
 */
router.get('/defaults', async (_req: Request, res: Response): Promise<void> => {
    res.json({
        success: true,
        defaults: DEFAULT_OVERLAY_SETTINGS,
    });
});

export default router;

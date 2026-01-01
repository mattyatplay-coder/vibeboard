/**
 * Viewfinder Routes - DOF Simulator API
 *
 * Endpoints for:
 * - AI-powered layer extraction (subject/background separation)
 * - Camera database queries
 * - Framing presets
 * - Stand-in model silhouettes
 */

import { Router, Request, Response } from 'express';
import { LayerExtractionService } from '../services/viewfinder/LayerExtractionService';

const router = Router();
const layerService = LayerExtractionService.getInstance();

// ============================================================================
// LAYER EXTRACTION
// ============================================================================

/**
 * POST /api/viewfinder/extract-layers
 * Extract subject and background layers from an image using AI
 */
router.post('/extract-layers', async (req: Request, res: Response) => {
    try {
        const { imageUrl, numLayers, prompt } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'imageUrl is required' });
        }

        const result = await layerService.extractLayers({
            imageUrl,
            numLayers: numLayers || 3,
            prompt,
        });

        return res.json(result);
    } catch (error: any) {
        console.error('Layer extraction error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/viewfinder/extract-subject
 * Quick 2-layer extraction optimized for DOF simulation
 */
router.post('/extract-subject', async (req: Request, res: Response) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'imageUrl is required' });
        }

        const result = await layerService.extractSubjectAndBackground(imageUrl);

        return res.json({
            success: !result.error,
            subject: result.subject,
            background: result.background,
            error: result.error,
        });
    } catch (error: any) {
        console.error('Subject extraction error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// FRAMING PRESETS
// ============================================================================

/**
 * GET /api/viewfinder/framing-presets
 * Get all available framing presets
 */
router.get('/framing-presets', (_req: Request, res: Response) => {
    const presets = layerService.getAllFramingPresets();
    return res.json({ presets });
});

/**
 * GET /api/viewfinder/framing-presets/:id
 * Get a specific framing preset
 */
router.get('/framing-presets/:id', (req: Request, res: Response) => {
    const preset = layerService.getFramingPreset(req.params.id);

    if (!preset) {
        return res.status(404).json({ error: 'Framing preset not found' });
    }

    return res.json({ preset });
});

// ============================================================================
// CAMERA DATABASE
// ============================================================================

/**
 * GET /api/viewfinder/cameras
 * Get all cameras or filter by sensor size
 */
router.get('/cameras', (req: Request, res: Response) => {
    const { sensorSize, groupByBrand } = req.query;

    if (groupByBrand === 'true') {
        const grouped = layerService.getCamerasByBrand();
        return res.json({ cameras: grouped, grouped: true });
    }

    const cameras = layerService.getCameras(sensorSize as any);
    return res.json({ cameras, count: cameras.length });
});

/**
 * GET /api/viewfinder/cameras/:id
 * Get a specific camera model
 */
router.get('/cameras/:id', (req: Request, res: Response) => {
    const camera = layerService.getCameraModel(req.params.id);

    if (!camera) {
        return res.status(404).json({ error: 'Camera model not found' });
    }

    return res.json({ camera });
});

// ============================================================================
// STAND-IN MODELS
// ============================================================================

/**
 * GET /api/viewfinder/stand-in-models
 * Get all available stand-in model silhouettes
 */
router.get('/stand-in-models', (_req: Request, res: Response) => {
    const models = layerService.getAllStandInModels();
    return res.json({ models });
});

/**
 * GET /api/viewfinder/stand-in-models/:id
 * Get a specific stand-in model
 */
router.get('/stand-in-models/:id', (req: Request, res: Response) => {
    const model = layerService.getStandInModel(req.params.id);

    if (!model) {
        return res.status(404).json({ error: 'Stand-in model not found' });
    }

    return res.json({ model });
});

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * POST /api/viewfinder/calculate-framing
 * Calculate subject size in frame based on camera settings
 */
router.post('/calculate-framing', (req: Request, res: Response) => {
    try {
        const {
            subjectHeightCm,
            distanceM,
            focalLengthMm,
            sensorHeightMm,
        } = req.body;

        if (!subjectHeightCm || !distanceM || !focalLengthMm || !sensorHeightMm) {
            return res.status(400).json({
                error: 'Required: subjectHeightCm, distanceM, focalLengthMm, sensorHeightMm'
            });
        }

        const result = layerService.calculateSubjectSize(
            subjectHeightCm,
            distanceM,
            focalLengthMm,
            sensorHeightMm
        );

        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/viewfinder/calculate-distance
 * Calculate distance needed for a target framing
 */
router.post('/calculate-distance', (req: Request, res: Response) => {
    try {
        const {
            subjectHeightCm,
            targetSizeInFrame,
            focalLengthMm,
            sensorHeightMm,
        } = req.body;

        if (!subjectHeightCm || !targetSizeInFrame || !focalLengthMm || !sensorHeightMm) {
            return res.status(400).json({
                error: 'Required: subjectHeightCm, targetSizeInFrame, focalLengthMm, sensorHeightMm'
            });
        }

        const distance = layerService.calculateDistanceForFraming(
            subjectHeightCm,
            targetSizeInFrame,
            focalLengthMm,
            sensorHeightMm
        );

        return res.json({ distanceM: distance });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;

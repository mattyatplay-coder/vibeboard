/**
 * Camera and Lens API Routes
 * Exposes the camera/lens database for frontend consumption
 */

import { Router, Request, Response } from 'express';
import {
    CAMERA_DATABASE,
    LENS_DATABASE,
    LENS_FAMILIES,
    getCamera,
    getLens,
    buildCinematicModifier,
    type CameraSpec,
    type LensSpec
} from '../data/CameraDatabase';

const router = Router();

// ============================================================================
// CAMERA ENDPOINTS
// ============================================================================

/**
 * GET /api/cameras
 * List all cameras, optionally filtered by category
 */
router.get('/', (req: Request, res: Response) => {
    const { category } = req.query;

    let cameras = CAMERA_DATABASE;

    if (category && typeof category === 'string') {
        cameras = cameras.filter(c => c.category === category);
    }

    // Group by brand for easier frontend consumption
    const byBrand: Record<string, CameraSpec[]> = {};
    for (const camera of cameras) {
        if (!byBrand[camera.brand]) {
            byBrand[camera.brand] = [];
        }
        byBrand[camera.brand].push(camera);
    }

    res.json({
        success: true,
        count: cameras.length,
        cameras,
        byBrand,
        categories: ['cinema', 'mirrorless', 'dslr', 'phone', 'action', 'medium_format']
    });
});

/**
 * GET /api/cameras/:id
 * Get a specific camera by ID
 */
router.get('/:id', (req: Request, res: Response) => {
    const camera = getCamera(req.params.id);

    if (!camera) {
        return res.status(404).json({
            success: false,
            error: `Camera not found: ${req.params.id}`
        });
    }

    res.json({
        success: true,
        camera
    });
});

/**
 * GET /api/cameras/:id/prompt
 * Get the prompt keywords for a specific camera
 */
router.get('/:id/prompt', (req: Request, res: Response) => {
    const camera = getCamera(req.params.id);

    if (!camera) {
        return res.status(404).json({
            success: false,
            error: `Camera not found: ${req.params.id}`
        });
    }

    // Build camera-only prompt (no lens)
    const prompt = buildCinematicModifier(camera.id, '');

    res.json({
        success: true,
        cameraId: camera.id,
        prompt,
        keywords: camera.prompt_keywords
    });
});

// ============================================================================
// LENS ENDPOINTS
// ============================================================================

/**
 * GET /api/lenses
 * List all lenses, optionally filtered by family or anamorphic
 */
router.get('/lenses', (req: Request, res: Response) => {
    const { family, anamorphic, brand } = req.query;

    let lenses = LENS_DATABASE;

    if (family && typeof family === 'string') {
        lenses = lenses.filter(l => l.family.toLowerCase() === family.toLowerCase());
    }

    if (anamorphic === 'true') {
        lenses = lenses.filter(l => l.is_anamorphic);
    } else if (anamorphic === 'false') {
        lenses = lenses.filter(l => !l.is_anamorphic);
    }

    if (brand && typeof brand === 'string') {
        lenses = lenses.filter(l => l.brand.toLowerCase() === brand.toLowerCase());
    }

    // Group by family for easier frontend consumption
    const byFamily: Record<string, LensSpec[]> = {};
    for (const lens of lenses) {
        if (!byFamily[lens.family]) {
            byFamily[lens.family] = [];
        }
        byFamily[lens.family].push(lens);
    }

    res.json({
        success: true,
        count: lenses.length,
        lenses,
        byFamily
    });
});

/**
 * GET /api/lenses/families
 * List all lens families with metadata
 */
router.get('/lenses/families', (_req: Request, res: Response) => {
    res.json({
        success: true,
        count: LENS_FAMILIES.length,
        families: LENS_FAMILIES.map(f => ({
            id: f.id,
            brand: f.brand,
            name: f.name,
            type: f.type,
            is_anamorphic: f.is_anamorphic,
            squeeze_factor: f.squeeze_factor,
            flare_color: f.flare_color,
            focal_lengths: f.focal_lengths,
            min_t_stop: f.min_t_stop
        }))
    });
});

/**
 * GET /api/lenses/:id
 * Get a specific lens by ID
 */
router.get('/lenses/:id', (req: Request, res: Response) => {
    const lens = getLens(req.params.id);

    if (!lens) {
        return res.status(404).json({
            success: false,
            error: `Lens not found: ${req.params.id}`
        });
    }

    res.json({
        success: true,
        lens
    });
});

// ============================================================================
// COMBINED ENDPOINTS
// ============================================================================

/**
 * POST /api/cameras/cinematic-modifier
 * Build a cinematic modifier string from camera and lens selection
 */
router.post('/cinematic-modifier', (req: Request, res: Response) => {
    const { cameraId, lensId } = req.body;

    if (!cameraId && !lensId) {
        return res.status(400).json({
            success: false,
            error: 'At least one of cameraId or lensId is required'
        });
    }

    const modifier = buildCinematicModifier(cameraId, lensId);
    const camera = cameraId ? getCamera(cameraId) : null;
    const lens = lensId ? getLens(lensId) : null;

    res.json({
        success: true,
        modifier,
        camera: camera ? {
            id: camera.id,
            brand: camera.brand,
            model: camera.model,
            sensor: camera.sensor_spec,
            log_color_space: camera.log_color_space
        } : null,
        lens: lens ? {
            id: lens.id,
            brand: lens.brand,
            model: lens.model,
            focal_length_mm: lens.focal_length_mm,
            min_t_stop: lens.min_t_stop,
            is_anamorphic: lens.is_anamorphic,
            squeeze_factor: lens.squeeze_factor,
            flare_color: lens.flare_color
        } : null
    });
});

/**
 * GET /api/cameras/presets
 * Get common camera + lens preset combinations for quick selection
 */
router.get('/presets', (_req: Request, res: Response) => {
    const presets = [
        {
            id: 'hollywood-blockbuster',
            name: 'Hollywood Blockbuster',
            description: 'ARRI Alexa 35 + Panavision Anamorphic - Classic big-budget film look',
            cameraId: 'arri-alexa-35',
            lensId: 'panavision-anamorphic-40mm',
            style: 'cinematic'
        },
        {
            id: 'indie-darling',
            name: 'Indie Darling',
            description: 'Sony FX6 + Cooke S4i - Character-driven intimate feel',
            cameraId: 'sony-fx6',
            lensId: 'cooke-s4i-50mm',
            style: 'intimate'
        },
        {
            id: 'documentary-truth',
            name: 'Documentary Truth',
            description: 'Canon C500 II + Zeiss CP.3 - Authentic handheld style',
            cameraId: 'canon-c500-ii',
            lensId: 'zeiss-cp3-35mm',
            style: 'documentary'
        },
        {
            id: 'vintage-70s',
            name: 'Vintage 70s',
            description: 'ARRI Alexa Mini + Helios 44-2 - Soviet lens character',
            cameraId: 'arri-alexa-mini',
            lensId: 'helios-44-2-58mm',
            style: 'vintage'
        },
        {
            id: 'instagram-viral',
            name: 'Instagram Viral',
            description: 'iPhone 15 Pro Max - Social media optimized',
            cameraId: 'iphone-15-pro-max',
            lensId: null,
            style: 'social'
        },
        {
            id: 'action-sports',
            name: 'Action Sports',
            description: 'GoPro HERO 12 - Extreme POV footage',
            cameraId: 'gopro-hero-12',
            lensId: null,
            style: 'action'
        },
        {
            id: 'blade-runner-neo-noir',
            name: 'Blade Runner Neo-Noir',
            description: 'RED V-Raptor + ARRI DNA LF Anamorphic - Futuristic noir',
            cameraId: 'red-v-raptor',
            lensId: 'arri-dna-lf-anamorphic-40mm',
            style: 'neo-noir'
        },
        {
            id: 'portrait-beauty',
            name: 'Portrait Beauty',
            description: 'Hasselblad X2D + Zeiss Master Prime - Fashion editorial',
            cameraId: 'hasselblad-x2d-100c',
            lensId: 'zeiss-master-prime-75mm',
            style: 'fashion'
        },
        {
            id: 'music-video',
            name: 'Music Video',
            description: 'Blackmagic URSA 12K + Sigma Cine Art - High-end music production',
            cameraId: 'blackmagic-ursa-12k',
            lensId: 'sigma-cine-art-50mm',
            style: 'music'
        },
        {
            id: 'sci-fi-epic',
            name: 'Sci-Fi Epic',
            description: 'ARRI Alexa 65 + Panavision 70 - Large format sci-fi',
            cameraId: 'arri-alexa-65',
            lensId: 'panavision-70-50mm',
            style: 'sci-fi'
        }
    ];

    // Build the modifiers for each preset
    const presetsWithModifiers = presets.map(preset => ({
        ...preset,
        modifier: buildCinematicModifier(preset.cameraId, preset.lensId || ''),
        camera: getCamera(preset.cameraId),
        lens: preset.lensId ? getLens(preset.lensId) : null
    }));

    res.json({
        success: true,
        count: presetsWithModifiers.length,
        presets: presetsWithModifiers
    });
});

/**
 * GET /api/cameras/dof-parameters/:cameraId
 * Get DOF calculation parameters for a camera (sensor CoC, crop factor)
 */
router.get('/dof-parameters/:cameraId', (req: Request, res: Response) => {
    const camera = getCamera(req.params.cameraId);

    if (!camera) {
        return res.status(404).json({
            success: false,
            error: `Camera not found: ${req.params.cameraId}`
        });
    }

    res.json({
        success: true,
        cameraId: camera.id,
        camera: `${camera.brand} ${camera.model}`,
        dofParameters: {
            sensor_width_mm: camera.sensor_spec.width_mm,
            sensor_height_mm: camera.sensor_spec.height_mm,
            sensor_diagonal_mm: camera.sensor_spec.diagonal_mm,
            crop_factor: camera.sensor_spec.crop_factor_ff,
            circle_of_confusion_mm: camera.sensor_spec.coc_mm
        },
        usage: {
            description: 'Use these parameters with the DOF Simulator in Optics Engine',
            formula: 'DOF = 2 * f² * N * c * d² / (f⁴ - N² * c² * d²)',
            where: {
                f: 'focal length (mm)',
                N: 'f-number (aperture)',
                c: 'circle of confusion (coc_mm)',
                d: 'focus distance (mm)'
            }
        }
    });
});

export default router;

/**
 * Prop Routes
 *
 * API endpoints for Module 7: The Prop Shop
 * Handles prop extraction, 3D proxy generation, and asset management.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { propExtractionService } from '../services/props/PropExtractionService';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({ storage });

// =============================================================================
// EXTRACTION ENDPOINTS
// =============================================================================

/**
 * POST /api/projects/:projectId/props/extract
 * Extract prop from image URL using BiRefNet
 */
router.post('/extract', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const {
            sourceUrl,
            sourceType = 'url',
            sourceId,
            name,
            category,
            edgeRefinement = 'balanced',
            generate3dProxy = false,
            model = 'birefnet',
        } = req.body;

        if (!sourceUrl) {
            return res.status(400).json({ error: 'sourceUrl is required' });
        }

        console.log(`[PropRoutes] Extracting prop from: ${sourceUrl.substring(0, 60)}...`);

        const result = await propExtractionService.extractProp(sourceUrl, sourceType, {
            projectId,
            name,
            category,
            edgeRefinement,
            generateThumbnail: true,
            generate3dProxy,
            model,
        });

        // If 3D proxy requested, start generation
        if (generate3dProxy) {
            propExtractionService.generate3DProxy(result.propId, { model: 'triposr' })
                .catch(err => console.error('[PropRoutes] 3D generation failed:', err));
        }

        res.json({
            success: true,
            prop: result,
        });
    } catch (error: any) {
        console.error('[PropRoutes] Extraction failed:', error);
        res.status(500).json({ error: error.message || 'Extraction failed' });
    }
});

/**
 * POST /api/projects/:projectId/props/extract-upload
 * Extract prop from uploaded image file
 */
router.post('/extract-upload', upload.single('image'), async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        const {
            name,
            category,
            edgeRefinement = 'balanced',
            generate3dProxy = false,
            model = 'birefnet',
        } = req.body;

        // Create local URL for the uploaded file
        const localUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/temp/${file.filename}`;

        console.log(`[PropRoutes] Extracting prop from upload: ${file.originalname}`);

        const result = await propExtractionService.extractProp(localUrl, 'upload', {
            projectId,
            name: name || file.originalname.replace(/\.[^.]+$/, ''),
            category,
            edgeRefinement,
            generateThumbnail: true,
            generate3dProxy,
            model,
        });

        // Clean up temp file
        fs.unlinkSync(file.path);

        // If 3D proxy requested, start generation
        if (generate3dProxy === 'true' || generate3dProxy === true) {
            propExtractionService.generate3DProxy(result.propId, { model: 'triposr' })
                .catch(err => console.error('[PropRoutes] 3D generation failed:', err));
        }

        res.json({
            success: true,
            prop: result,
        });
    } catch (error: any) {
        console.error('[PropRoutes] Upload extraction failed:', error);
        res.status(500).json({ error: error.message || 'Extraction failed' });
    }
});

/**
 * POST /api/projects/:projectId/props/batch-extract
 * Extract multiple props in batch
 */
router.post('/batch-extract', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sources, category, model = 'birefnet' } = req.body;

        if (!sources || !Array.isArray(sources) || sources.length === 0) {
            return res.status(400).json({ error: 'sources array is required' });
        }

        console.log(`[PropRoutes] Batch extracting ${sources.length} props`);

        const results = await propExtractionService.batchExtract(sources, {
            projectId,
            category,
            model,
        });

        res.json({
            success: true,
            successful: results.successful.length,
            failed: results.failed.length,
            results: results.successful,
            errors: results.failed,
        });
    } catch (error: any) {
        console.error('[PropRoutes] Batch extraction failed:', error);
        res.status(500).json({ error: error.message || 'Batch extraction failed' });
    }
});

// =============================================================================
// 3D PROXY ENDPOINTS
// =============================================================================

/**
 * POST /api/projects/:projectId/props/:propId/generate-3d
 * Generate 3D proxy model for existing prop
 */
router.post('/:propId/generate-3d', async (req: Request, res: Response) => {
    try {
        const { propId } = req.params;
        const { model = 'triposr', outputFormat = 'glb' } = req.body;

        console.log(`[PropRoutes] Generating 3D proxy for prop ${propId}`);

        const modelUrl = await propExtractionService.generate3DProxy(propId, {
            model,
            outputFormat,
        });

        res.json({
            success: true,
            modelUrl,
        });
    } catch (error: any) {
        console.error('[PropRoutes] 3D generation failed:', error);
        res.status(500).json({ error: error.message || '3D generation failed' });
    }
});

// =============================================================================
// CRUD ENDPOINTS
// =============================================================================

/**
 * GET /api/projects/:projectId/props
 * List all props for a project
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { category } = req.query;

        const props = await propExtractionService.getProps(
            projectId,
            category as string | undefined
        );

        // Parse JSON fields
        const parsedProps = props.map(prop => ({
            ...prop,
            tags: JSON.parse(prop.tags || '[]'),
            materialAnalysis: prop.materialAnalysis ? JSON.parse(prop.materialAnalysis) : null,
        }));

        res.json({ props: parsedProps });
    } catch (error: any) {
        console.error('[PropRoutes] Get props failed:', error);
        res.status(500).json({ error: error.message || 'Failed to get props' });
    }
});

/**
 * GET /api/projects/:projectId/props/:propId
 * Get single prop details
 */
router.get('/:propId', async (req: Request, res: Response) => {
    try {
        const { propId } = req.params;
        const prop = await propExtractionService.getProp(propId);

        if (!prop) {
            return res.status(404).json({ error: 'Prop not found' });
        }

        res.json({
            ...prop,
            tags: JSON.parse(prop.tags || '[]'),
            materialAnalysis: prop.materialAnalysis ? JSON.parse(prop.materialAnalysis) : null,
        });
    } catch (error: any) {
        console.error('[PropRoutes] Get prop failed:', error);
        res.status(500).json({ error: error.message || 'Failed to get prop' });
    }
});

/**
 * PATCH /api/projects/:projectId/props/:propId
 * Update prop metadata
 */
router.patch('/:propId', async (req: Request, res: Response) => {
    try {
        const { propId } = req.params;
        const { name, category, description, isFavorite, tags } = req.body;

        const updated = await propExtractionService.updateProp(propId, {
            name,
            category,
            description,
            isFavorite,
            tags,
        });

        res.json({
            success: true,
            prop: {
                ...updated,
                tags: JSON.parse(updated.tags || '[]'),
            },
        });
    } catch (error: any) {
        console.error('[PropRoutes] Update prop failed:', error);
        res.status(500).json({ error: error.message || 'Failed to update prop' });
    }
});

/**
 * DELETE /api/projects/:projectId/props/:propId
 * Delete prop and associated files
 */
router.delete('/:propId', async (req: Request, res: Response) => {
    try {
        const { propId } = req.params;
        await propExtractionService.deleteProp(propId);

        res.json({ success: true, message: 'Prop deleted' });
    } catch (error: any) {
        console.error('[PropRoutes] Delete prop failed:', error);
        res.status(500).json({ error: error.message || 'Failed to delete prop' });
    }
});

/**
 * POST /api/projects/:projectId/props/:propId/track-usage
 * Increment usage count for prop
 */
router.post('/:propId/track-usage', async (req: Request, res: Response) => {
    try {
        const { propId } = req.params;
        await propExtractionService.trackUsage(propId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('[PropRoutes] Track usage failed:', error);
        res.status(500).json({ error: error.message || 'Failed to track usage' });
    }
});

// =============================================================================
// EXTRACTION MODELS INFO
// =============================================================================

/**
 * GET /api/props/models
 * Get available extraction models
 */
router.get('/models', async (_req: Request, res: Response) => {
    res.json({
        extractionModels: [
            {
                id: 'birefnet',
                name: 'BiRefNet',
                description: 'Fast, accurate background removal',
                speed: 'fast',
                quality: 'high',
            },
            {
                id: 'birefnet-massive',
                name: 'BiRefNet Massive',
                description: 'Higher quality, more detailed edges',
                speed: 'medium',
                quality: 'highest',
            },
            {
                id: 'sam2',
                name: 'SAM 2',
                description: 'Segment Anything for complex scenes',
                speed: 'medium',
                quality: 'high',
            },
        ],
        proxy3dModels: [
            {
                id: 'triposr',
                name: 'TripoSR',
                description: 'Fast single-image to 3D reconstruction',
                speed: 'fast',
                quality: 'medium',
            },
            {
                id: 'lgm',
                name: 'LGM',
                description: 'Large Geometric Model for detailed 3D',
                speed: 'medium',
                quality: 'high',
            },
        ],
        categories: [
            'object',
            'texture',
            'material',
            'vehicle',
            'weapon',
            'food',
            'furniture',
            'clothing',
            'accessory',
            'character',
            'other',
        ],
    });
});

export default router;

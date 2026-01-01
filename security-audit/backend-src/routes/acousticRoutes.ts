/**
 * Acoustic Mapping API Routes
 *
 * Provides endpoints for:
 * - Calculating acoustic recipes from shot data
 * - Getting lens-to-reverb mappings
 * - Genre IR recommendations
 */

import { Router, Request, Response } from 'express';
import {
    AcousticMappingService,
    LENS_ACOUSTIC_MAPPINGS,
    GENRE_IR_RECOMMENDATIONS,
    MOOD_ACOUSTIC_MAPPINGS
} from '../services/audio/AcousticMappingService';
import { ShotRecipe } from '../services/rendering/RenderQueueTypes';

const router = Router();

/**
 * POST /api/acoustic/recipe
 * Calculate acoustic recipe from shot recipe
 *
 * Request body: Partial<ShotRecipe> with at minimum lensKit.lensId
 * Response: AcousticRecipe
 */
router.post('/recipe', async (req: Request, res: Response) => {
    try {
        const recipe = req.body as ShotRecipe;

        if (!recipe) {
            return res.status(400).json({ error: 'Shot recipe is required' });
        }

        const service = AcousticMappingService.getInstance();
        const acousticRecipe = service.calculateAcousticRecipe(recipe);

        res.json(acousticRecipe);
    } catch (error: any) {
        console.error('Acoustic recipe error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/acoustic/mappings
 * Get all lens-to-reverb mappings for reference/display
 */
router.get('/mappings', async (_req: Request, res: Response) => {
    try {
        res.json({
            mappings: LENS_ACOUSTIC_MAPPINGS,
            description: 'Lens-to-Reverb Mapping Table (The "Audio LUT")'
        });
    } catch (error: any) {
        console.error('Mappings error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/acoustic/lens/:focalLength
 * Get acoustic values for a specific focal length
 */
router.get('/lens/:focalLength', async (req: Request, res: Response) => {
    try {
        const focalLength = parseInt(req.params.focalLength);

        if (isNaN(focalLength) || focalLength < 1) {
            return res.status(400).json({ error: 'Invalid focal length' });
        }

        const service = AcousticMappingService.getInstance();
        const mapping = service.getLensMapping(focalLength);
        const interpolated = service.getInterpolatedValues(focalLength);
        const description = service.getProfileDescription(focalLength);

        res.json({
            focalLength,
            mapping,
            interpolated,
            description
        });
    } catch (error: any) {
        console.error('Lens acoustic error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/acoustic/genre-ir
 * Get all genre impulse response recommendations
 */
router.get('/genre-ir', async (_req: Request, res: Response) => {
    try {
        res.json({
            recommendations: GENRE_IR_RECOMMENDATIONS,
            description: 'Genre-specific Impulse Response recommendations for reverb character'
        });
    } catch (error: any) {
        console.error('Genre IR error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/acoustic/genre-ir/:genre
 * Get IR recommendation for a specific genre
 */
router.get('/genre-ir/:genre', async (req: Request, res: Response) => {
    try {
        const { genre } = req.params;

        const service = AcousticMappingService.getInstance();
        const recommendation = service.getGenreIRRecommendation(genre);

        if (!recommendation) {
            return res.status(404).json({
                error: `No IR recommendation found for genre: ${genre}`,
                availableGenres: GENRE_IR_RECOMMENDATIONS.map(r => r.genre)
            });
        }

        res.json(recommendation);
    } catch (error: any) {
        console.error('Genre IR lookup error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/acoustic/moods
 * Get all mood-to-acoustic mappings
 */
router.get('/moods', async (_req: Request, res: Response) => {
    try {
        res.json({
            moods: MOOD_ACOUSTIC_MAPPINGS,
            description: 'Mood-based sonic texture modifiers'
        });
    } catch (error: any) {
        console.error('Moods error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/acoustic/batch
 * Calculate acoustic recipes for multiple shots at once
 * Useful for scene chain processing
 */
router.post('/batch', async (req: Request, res: Response) => {
    try {
        const { recipes } = req.body as { recipes: ShotRecipe[] };

        if (!recipes || !Array.isArray(recipes)) {
            return res.status(400).json({ error: 'recipes array is required' });
        }

        const service = AcousticMappingService.getInstance();
        const results = recipes.map(recipe => ({
            input: recipe,
            acoustic: service.calculateAcousticRecipe(recipe)
        }));

        res.json({
            count: results.length,
            results
        });
    } catch (error: any) {
        console.error('Batch acoustic error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

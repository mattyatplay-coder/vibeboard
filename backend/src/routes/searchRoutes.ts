/**
 * Semantic Search API Routes
 *
 * Provides endpoints for searching generations using natural language
 * and managing the visual description index.
 */

import { Router, Request, Response } from 'express';
import { SemanticIndexService } from '../services/search/SemanticIndexService';
import { VectorEmbeddingService } from '../services/search/VectorEmbeddingService';

const router = Router();

/**
 * GET /api/projects/:projectId/search
 * Search generations using natural language query
 */
router.get('/projects/:projectId/search', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { q, limit } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const searchLimit = parseInt(limit as string) || 50;
        const service = SemanticIndexService.getInstance();
        const results = await service.search(projectId, q, searchLimit);

        res.json({
            query: q,
            count: results.length,
            results
        });

    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/stats
 * Get indexing statistics for a project
 */
router.get('/projects/:projectId/search/stats', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const service = SemanticIndexService.getInstance();
        const stats = await service.getIndexStats(projectId);

        res.json(stats);

    } catch (error: any) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/:projectId/search/index
 * Trigger batch indexing of unindexed generations
 */
router.post('/projects/:projectId/search/index', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { batchSize } = req.body;

        const service = SemanticIndexService.getInstance();
        const result = await service.batchIndex(projectId, batchSize || 10);

        res.json({
            message: 'Batch indexing complete',
            ...result
        });

    } catch (error: any) {
        console.error('Batch index error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/generations/:generationId/index
 * Index a single generation
 */
router.post('/generations/:generationId/index', async (req: Request, res: Response) => {
    try {
        const { generationId } = req.params;

        const service = SemanticIndexService.getInstance();
        const description = await service.indexGeneration(generationId);

        if (description) {
            res.json({
                message: 'Generation indexed successfully',
                visualDescription: description
            });
        } else {
            res.status(404).json({ error: 'Generation not found or has no outputs' });
        }

    } catch (error: any) {
        console.error('Index error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/suggestions
 * Get smart suggestion pills based on indexed content aggregations
 */
router.get('/projects/:projectId/search/suggestions', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const service = SemanticIndexService.getInstance();
        const suggestions = await service.getSuggestionPills(projectId);
        res.json({ suggestions });
    } catch (error: any) {
        console.error('Suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/similar/:generationId
 * Find visually similar generations using indexed metadata
 */
router.get('/projects/:projectId/search/similar/:generationId', async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const { type = 'all' } = req.query; // 'all', 'framing', 'lighting', 'color'

        const service = SemanticIndexService.getInstance();
        const similar = await service.findSimilar(projectId, generationId, type as string);

        res.json({
            sourceId: generationId,
            similarityType: type,
            results: similar
        });
    } catch (error: any) {
        console.error('Find similar error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/reality
 * Search by visual REALITY (what AI actually generated) - searches visualDescription
 */
router.get('/projects/:projectId/search/reality', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { q, limit } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const service = SemanticIndexService.getInstance();
        const results = await service.searchByReality(projectId, q, parseInt(limit as string) || 50);

        res.json({
            query: q,
            mode: 'reality',
            count: results.length,
            results
        });
    } catch (error: any) {
        console.error('Reality search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/intent
 * Search by user INTENT (what was prompted) - searches inputPrompt only
 */
router.get('/projects/:projectId/search/intent', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { q, limit } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const service = SemanticIndexService.getInstance();
        const results = await service.searchByIntent(projectId, q, parseInt(limit as string) || 50);

        res.json({
            query: q,
            mode: 'intent',
            count: results.length,
            results
        });
    } catch (error: any) {
        console.error('Intent search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================================================
// VECTOR SIMILARITY SEARCH (CLIP Embeddings)
// =============================================================================

/**
 * GET /api/projects/:projectId/search/vector/similar/:generationId
 * Find visually similar generations using CLIP vector embeddings
 * This is TRUE visual similarity - finds images with similar visual content
 * regardless of how they were tagged or described
 */
router.get('/projects/:projectId/search/vector/similar/:generationId', async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const { limit, minSimilarity } = req.query;

        const service = VectorEmbeddingService.getInstance();
        const results = await service.findSimilarByVector(
            projectId,
            generationId,
            parseInt(limit as string) || 20,
            parseFloat(minSimilarity as string) || 0.7
        );

        res.json({
            sourceId: generationId,
            method: 'clip_vector',
            count: results.length,
            results
        });
    } catch (error: any) {
        console.error('Vector similarity error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/:projectId/search/vector/embed
 * Batch embed unembedded generations
 */
router.post('/projects/:projectId/search/vector/embed', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { batchSize } = req.body;

        const service = VectorEmbeddingService.getInstance();
        const result = await service.batchEmbed(projectId, batchSize || 10);

        res.json({
            message: 'Batch embedding complete',
            ...result
        });
    } catch (error: any) {
        console.error('Batch embed error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/generations/:generationId/embed
 * Generate and store CLIP embedding for a single generation
 */
router.post('/generations/:generationId/embed', async (req: Request, res: Response) => {
    try {
        const { generationId } = req.params;

        const service = VectorEmbeddingService.getInstance();
        const success = await service.embedGeneration(generationId);

        if (success) {
            res.json({ message: 'Embedding generated successfully' });
        } else {
            res.status(400).json({ error: 'Failed to generate embedding - no valid image found' });
        }
    } catch (error: any) {
        console.error('Embed error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/vector/stats
 * Get embedding statistics for a project
 */
router.get('/projects/:projectId/search/vector/stats', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const service = VectorEmbeddingService.getInstance();
        const stats = await service.getEmbeddingStats(projectId);

        res.json(stats);
    } catch (error: any) {
        console.error('Vector stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

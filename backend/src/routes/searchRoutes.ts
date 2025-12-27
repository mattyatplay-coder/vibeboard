/**
 * Semantic Search API Routes - Visual Librarian / Media Asset Manager
 *
 * Provides endpoints for:
 * - Natural language search with CINEMATIC terminology
 * - Find Similar (Composition, Lighting)
 * - Batch indexing with status tracking
 * - Search suggestions
 */

import { Router, Request, Response } from 'express';
import { SemanticIndexService } from '../services/search/SemanticIndexService';

const router = Router();

/**
 * GET /api/projects/:projectId/search
 * Search generations using natural language query with CINEMATIC terminology support
 *
 * Query params:
 * - q: Search query (required)
 * - limit: Max results (default 50)
 * - mode: Search mode - 'reality' (visual), 'intent' (prompt), 'both' (default)
 *
 * Supports queries like:
 * - "ECU shallow depth of field"
 * - "wide shot golden hour silhouette"
 * - "chiaroscuro rim lit moody"
 * - "anamorphic lens flare"
 */
router.get('/projects/:projectId/search', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { q, limit, mode } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const searchLimit = parseInt(limit as string) || 50;
        const searchMode = (mode as string) || 'both'; // 'reality' | 'intent' | 'both'
        const service = SemanticIndexService.getInstance();
        const results = await service.search(projectId, q, searchLimit, searchMode);

        res.json({
            query: q,
            mode: searchMode,
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
 * Get indexing statistics for a project (enhanced with status breakdown)
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
 * GET /api/projects/:projectId/search/suggestions
 * Get smart search suggestion pills
 */
router.get('/projects/:projectId/search/suggestions', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const service = SemanticIndexService.getInstance();
        const suggestions = await service.getSearchSuggestions(projectId);

        res.json({ suggestions });

    } catch (error: any) {
        console.error('Suggestions error:', error);
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
 * POST /api/projects/:projectId/search/retry-failed
 * Retry all failed indexing attempts
 */
router.post('/projects/:projectId/search/retry-failed', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { batchSize } = req.body;

        const service = SemanticIndexService.getInstance();
        const result = await service.retryFailed(projectId, batchSize || 10);

        res.json({
            message: 'Retry complete',
            ...result
        });

    } catch (error: any) {
        console.error('Retry failed error:', error);
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
        const { force } = req.body;

        const service = SemanticIndexService.getInstance();

        // Check if should index first (for informative response)
        if (!force) {
            const { shouldIndex, reason } = await service.shouldIndex(generationId);
            if (!shouldIndex) {
                return res.status(200).json({
                    message: 'Skipped',
                    reason,
                    indexed: false
                });
            }
        }

        const description = await service.indexGeneration(generationId, force);

        if (description) {
            res.json({
                message: 'Generation indexed successfully',
                indexed: true,
                visualDescription: description
            });
        } else {
            res.status(404).json({
                error: 'Generation not found or has no outputs',
                indexed: false
            });
        }

    } catch (error: any) {
        console.error('Index error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/generations/:generationId/index/reset
 * Reset a generation's index status to pending (for retry)
 */
router.post('/generations/:generationId/index/reset', async (req: Request, res: Response) => {
    try {
        const { generationId } = req.params;

        const service = SemanticIndexService.getInstance();
        await service.resetIndexStatus(generationId);

        res.json({
            message: 'Index status reset to pending',
            generationId
        });

    } catch (error: any) {
        console.error('Reset error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/similar/composition/:generationId
 * Find generations with similar composition (framing, camera angle)
 */
router.get('/projects/:projectId/search/similar/composition/:generationId', async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const { limit } = req.query;

        const searchLimit = parseInt(limit as string) || 20;
        const service = SemanticIndexService.getInstance();
        const results = await service.findSimilarComposition(generationId, projectId, searchLimit);

        res.json({
            sourceId: generationId,
            type: 'composition',
            count: results.length,
            results
        });

    } catch (error: any) {
        console.error('Similar composition error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/:projectId/search/similar/lighting/:generationId
 * Find generations with similar lighting (style, direction, mood)
 */
router.get('/projects/:projectId/search/similar/lighting/:generationId', async (req: Request, res: Response) => {
    try {
        const { projectId, generationId } = req.params;
        const { limit } = req.query;

        const searchLimit = parseInt(limit as string) || 20;
        const service = SemanticIndexService.getInstance();
        const results = await service.findSimilarLighting(generationId, projectId, searchLimit);

        res.json({
            sourceId: generationId,
            type: 'lighting',
            count: results.length,
            results
        });

    } catch (error: any) {
        console.error('Similar lighting error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

/**
 * Semantic Search API Routes
 *
 * Provides endpoints for searching generations using natural language
 * and managing the visual description index.
 */

import { Router, Request, Response } from 'express';
import { SemanticIndexService } from '../services/search/SemanticIndexService';

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

export default router;

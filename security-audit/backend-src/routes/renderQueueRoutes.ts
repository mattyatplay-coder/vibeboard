/**
 * Render Queue Routes
 *
 * API endpoints for multi-pass render queue management.
 * Supports draft → review → master workflow.
 */

import { Router, Request, Response } from 'express';
import { renderQueueService } from '../services/rendering/RenderQueueService';
import {
    RenderQuality,
    QUALITY_PRESETS,
    estimateCost,
    calculateSavings,
} from '../services/rendering/RenderQueueTypes';

const router = Router();

/**
 * GET /api/projects/:projectId/render-queue/presets
 * Get available quality presets with cost estimates
 */
router.get('/presets', (req: Request, res: Response) => {
    res.json({
        presets: QUALITY_PRESETS,
        qualities: ['draft', 'review', 'master'],
    });
});

/**
 * POST /api/projects/:projectId/render-queue/estimate
 * Get cost estimate for rendering
 */
router.post('/estimate', (req: Request, res: Response) => {
    try {
        const { quality, shotCount, isVideo = true, draftIterations = 3 } = req.body;

        if (!quality || !shotCount) {
            return res.status(400).json({ error: 'quality and shotCount are required' });
        }

        const estimate = estimateCost(quality as RenderQuality, shotCount, isVideo);
        const savings = calculateSavings(shotCount, isVideo, draftIterations);

        res.json({
            estimate,
            savings,
            recommendation: savings.savingsPercent > 30
                ? 'Using draft for iteration saves significant money'
                : 'Consider master-only for small projects',
        });
    } catch (error) {
        console.error('Error calculating estimate:', error);
        res.status(500).json({ error: 'Failed to calculate estimate' });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs
 * Create a new render job for a scene chain
 */
router.post('/jobs', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { sceneChainId, qualities = ['draft'], burnInMetadata = false } = req.body;

        if (!sceneChainId) {
            return res.status(400).json({ error: 'sceneChainId is required' });
        }

        // Validate qualities
        const validQualities = ['draft', 'review', 'master'];
        const targetQualities = qualities.filter((q: string) => validQualities.includes(q)) as RenderQuality[];

        if (targetQualities.length === 0) {
            return res.status(400).json({ error: 'At least one valid quality level required' });
        }

        const job = await renderQueueService.createRenderJob(
            sceneChainId,
            projectId,
            targetQualities,
            burnInMetadata  // Refinement C: Pass watermark option
        );

        res.status(201).json(job);
    } catch (error) {
        console.error('Error creating render job:', error);
        res.status(500).json({
            error: 'Failed to create render job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/jobs
 * Get all render jobs for a project
 */
router.get('/jobs', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const jobs = await renderQueueService.getJobsForProject(projectId);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch render jobs' });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/jobs/:jobId
 * Get a specific render job
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const job = await renderQueueService.getJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Render job not found' });
        }

        res.json(job);
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch render job' });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs/:jobId/start
 * Start a render job
 */
router.post('/jobs/:jobId/start', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const job = await renderQueueService.startJob(jobId);
        res.json(job);
    } catch (error) {
        console.error('Error starting job:', error);
        res.status(500).json({
            error: 'Failed to start render job',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs/:jobId/pause
 * Pause a render job
 */
router.post('/jobs/:jobId/pause', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const job = await renderQueueService.pauseJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Render job not found' });
        }

        res.json(job);
    } catch (error) {
        console.error('Error pausing job:', error);
        res.status(500).json({ error: 'Failed to pause render job' });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs/:jobId/resume
 * Resume a paused render job
 */
router.post('/jobs/:jobId/resume', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const job = await renderQueueService.resumeJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Render job not found or not paused' });
        }

        res.json(job);
    } catch (error) {
        console.error('Error resuming job:', error);
        res.status(500).json({ error: 'Failed to resume render job' });
    }
});

/**
 * DELETE /api/projects/:projectId/render-queue/jobs/:jobId
 * Cancel a render job
 */
router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;
        const success = await renderQueueService.cancelJob(jobId);

        if (!success) {
            return res.status(404).json({ error: 'Render job not found' });
        }

        res.json({ success: true, message: 'Job cancelled' });
    } catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({ error: 'Failed to cancel render job' });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/scene-chains/:chainId/summaries
 * Get render summaries for all shots in a scene chain
 */
router.get('/scene-chains/:chainId/summaries', async (req: Request, res: Response) => {
    try {
        const { chainId } = req.params;
        const summaries = await renderQueueService.getShotSummaries(chainId);
        res.json(summaries);
    } catch (error) {
        console.error('Error fetching summaries:', error);
        res.status(500).json({ error: 'Failed to fetch shot summaries' });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/scene-chains/:chainId/version-stacks
 * Get version stacks for all shots in a scene chain
 * Shows all quality passes (v1=Draft, v2=Review, v3=Master) with upgrade options
 */
router.get('/scene-chains/:chainId/version-stacks', async (req: Request, res: Response) => {
    try {
        const { chainId } = req.params;
        const stacks = await renderQueueService.getAllVersionStacks(chainId);
        res.json(stacks);
    } catch (error) {
        console.error('Error fetching version stacks:', error);
        res.status(500).json({ error: 'Failed to fetch version stacks' });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/scene-chains/:chainId/shots/:shotId/version-stack
 * Get version stack for a specific shot
 */
router.get('/scene-chains/:chainId/shots/:shotId/version-stack', async (req: Request, res: Response) => {
    try {
        const { chainId, shotId } = req.params;
        const stack = await renderQueueService.getVersionStack(chainId, shotId);

        if (!stack) {
            return res.status(404).json({ error: 'No render passes found for this shot' });
        }

        res.json(stack);
    } catch (error) {
        console.error('Error fetching version stack:', error);
        res.status(500).json({ error: 'Failed to fetch version stack' });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs/:jobId/shots/:shotId/promote
 * Promote a shot to higher quality
 */
router.post('/jobs/:jobId/shots/:shotId/promote', async (req: Request, res: Response) => {
    try {
        const { jobId, shotId } = req.params;
        const { quality = 'master' } = req.body;

        if (!['draft', 'review', 'master'].includes(quality)) {
            return res.status(400).json({ error: 'Invalid quality level' });
        }

        const pass = await renderQueueService.promoteShot(jobId, shotId, quality as RenderQuality);
        res.json(pass);
    } catch (error) {
        console.error('Error promoting shot:', error);
        res.status(500).json({
            error: 'Failed to promote shot',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/projects/:projectId/render-queue/jobs/:jobId/passes/:passId/retry
 * Retry a failed pass
 */
router.post('/jobs/:jobId/passes/:passId/retry', async (req: Request, res: Response) => {
    try {
        const { jobId, passId } = req.params;
        const pass = await renderQueueService.retryPass(jobId, passId);
        res.json(pass);
    } catch (error) {
        console.error('Error retrying pass:', error);
        res.status(500).json({
            error: 'Failed to retry pass',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/cost-comparison
 * Get cost comparison showing savings from draft workflow
 */
router.get('/cost-comparison', (req: Request, res: Response) => {
    try {
        const { shots = 10, iterations = 3 } = req.query;

        const shotCount = parseInt(shots as string) || 10;
        const draftIterations = parseInt(iterations as string) || 3;

        const comparison = renderQueueService.getCostComparison(shotCount, true, draftIterations);

        res.json({
            ...comparison,
            scenario: {
                shotCount,
                draftIterations,
                workflow: 'Draft for iteration → Master for final',
            },
            message: `Save $${comparison.savings.toFixed(2)} (${comparison.savingsPercent.toFixed(0)}%) by using draft for ${draftIterations} iterations before master render`,
        });
    } catch (error) {
        console.error('Error calculating comparison:', error);
        res.status(500).json({ error: 'Failed to calculate cost comparison' });
    }
});

/**
 * REFINEMENT B: A/B Lightbox Comparison Endpoints
 */

/**
 * GET /api/projects/:projectId/render-queue/scene-chains/:chainId/comparisons
 * Get all available A/B comparisons for a scene chain
 * Returns shots that have at least 2 completed quality passes
 */
router.get('/scene-chains/:chainId/comparisons', async (req: Request, res: Response) => {
    try {
        const { chainId } = req.params;
        const comparisons = await renderQueueService.getAvailableComparisons(chainId);
        res.json(comparisons);
    } catch (error) {
        console.error('Error fetching comparisons:', error);
        res.status(500).json({ error: 'Failed to fetch available comparisons' });
    }
});

/**
 * GET /api/projects/:projectId/render-queue/scene-chains/:chainId/shots/:shotId/compare
 * Get A/B comparison data for a specific shot
 * Query params: qualityA (default: draft), qualityB (default: master)
 */
router.get('/scene-chains/:chainId/shots/:shotId/compare', async (req: Request, res: Response) => {
    try {
        const { chainId, shotId } = req.params;
        const { qualityA = 'draft', qualityB = 'master' } = req.query;

        const validQualities = ['draft', 'review', 'master'];
        if (!validQualities.includes(qualityA as string) || !validQualities.includes(qualityB as string)) {
            return res.status(400).json({ error: 'Invalid quality level. Must be draft, review, or master' });
        }

        const comparison = await renderQueueService.getPassComparison(
            chainId,
            shotId,
            qualityA as RenderQuality,
            qualityB as RenderQuality
        );

        if (!comparison) {
            return res.status(404).json({ error: 'No comparison data found for this shot' });
        }

        res.json(comparison);
    } catch (error) {
        console.error('Error fetching comparison:', error);
        res.status(500).json({ error: 'Failed to fetch pass comparison' });
    }
});

export default router;

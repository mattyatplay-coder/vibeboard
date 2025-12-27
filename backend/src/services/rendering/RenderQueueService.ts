/**
 * Render Queue Service
 *
 * Manages multi-pass rendering workflow for scene chains.
 * Supports draft → review → master quality progression to save money.
 *
 * PERSISTENCE: All jobs and passes are stored in the database (RenderJob/RenderPass tables)
 * to survive server restarts. The hydrateQueue() method recovers interrupted jobs on startup.
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../prisma';
import { GenerationService } from '../GenerationService';
import { GenerationOptions } from '../generators/GenerationProvider';
import {
    RenderQuality,
    RenderPass,
    RenderPassStatus,
    RenderJob,
    ShotRenderSummary,
    ShotRecipe,
    ShotVersionStack,
    WatermarkConfig,
    DEFAULT_WATERMARK_CONFIG,
    buildWatermarkText,
    QUALITY_PRESETS,
    getModelForQuality,
    estimateCost,
    calculateSavings,
} from './RenderQueueTypes';

// In-memory queue for active processing
interface QueuedPass {
    passId: string;
    jobId: string;
}

class RenderQueueService {
    private static instance: RenderQueueService;
    private generationService: GenerationService;
    private queue: QueuedPass[] = [];
    private isProcessing: boolean = false;
    private initialized: boolean = false;

    private constructor() {
        this.generationService = new GenerationService();
    }

    static getInstance(): RenderQueueService {
        if (!RenderQueueService.instance) {
            RenderQueueService.instance = new RenderQueueService();
        }
        return RenderQueueService.instance;
    }

    /**
     * HYDRATION: Recover interrupted jobs on server startup
     * Call this in your server initialization to resume any in-progress renders
     */
    async hydrateQueue(): Promise<{ recoveredJobs: number; requeuedPasses: number }> {
        if (this.initialized) {
            console.log('[RenderQueue] Already initialized, skipping hydration');
            return { recoveredJobs: 0, requeuedPasses: 0 };
        }

        console.log('[RenderQueue] Hydrating queue from database...');

        // Find all jobs that were in-progress when server stopped
        const interruptedJobs = await prisma.renderJob.findMany({
            where: {
                status: { in: ['pending', 'rendering'] }
            },
            include: {
                passes: {
                    where: {
                        status: { in: ['pending', 'rendering', 'queued'] }
                    }
                }
            }
        });

        let recoveredJobs = 0;
        let requeuedPasses = 0;

        for (const dbJob of interruptedJobs) {
            // Reset "rendering" passes to "pending" (they were interrupted)
            for (const dbPass of dbJob.passes) {
                if (dbPass.status === 'rendering') {
                    await prisma.renderPass.update({
                        where: { id: dbPass.id },
                        data: { status: 'pending' }
                    });
                }

                // Requeue passes that need processing
                if (dbPass.status === 'pending' || dbPass.status === 'queued') {
                    this.queue.push({ passId: dbPass.id, jobId: dbJob.id });
                    requeuedPasses++;
                }
            }

            recoveredJobs++;
            console.log(`[RenderQueue] Recovered job ${dbJob.id} with ${dbJob.passes.length} passes`);
        }

        this.initialized = true;

        if (requeuedPasses > 0) {
            console.log(`[RenderQueue] Requeued ${requeuedPasses} passes, starting processing...`);
            this.processQueue();
        }

        console.log(`[RenderQueue] Hydration complete: ${recoveredJobs} jobs, ${requeuedPasses} passes`);
        return { recoveredJobs, requeuedPasses };
    }

    /**
     * Create a new render job for a scene chain
     */
    async createRenderJob(
        sceneChainId: string,
        projectId: string,
        targetQualities: RenderQuality[] = ['draft'],
        burnInMetadata: boolean = false
    ): Promise<RenderJob> {
        // Fetch scene chain with segments
        const chain = await prisma.sceneChain.findUnique({
            where: { id: sceneChainId },
            include: {
                segments: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!chain) {
            throw new Error(`Scene chain ${sceneChainId} not found`);
        }

        // Build recipes for each segment
        const segmentRecipes: { segmentId: string; recipe: ShotRecipe }[] = [];
        for (const segment of chain.segments) {
            const recipe: ShotRecipe = {
                prompt: segment.prompt || '',
                aspectRatio: chain.aspectRatio || '16:9',
                duration: segment.duration || 5,
                firstFrameUrl: segment.firstFrameUrl || undefined,
                lastFrameUrl: segment.lastFrameUrl || undefined,
            };
            segmentRecipes.push({ segmentId: segment.id, recipe });
        }

        // Estimate total cost
        let estimatedCost = 0;
        for (const quality of targetQualities) {
            const est = estimateCost(quality, chain.segments.length, true);
            estimatedCost += est.totalCost;
        }

        // Create job in database
        const dbJob = await prisma.renderJob.create({
            data: {
                projectId,
                sceneChainId,
                name: chain.name,
                recipe: JSON.stringify({ targetQualities, segments: segmentRecipes }),
                burnInMetadata,
                status: 'pending',
                currentQuality: targetQualities[0],
                totalCost: estimatedCost,
            }
        });

        // Create passes for each segment and quality
        const passes: RenderPass[] = [];
        for (const { segmentId, recipe } of segmentRecipes) {
            const segment = chain.segments.find(s => s.id === segmentId)!;

            for (const quality of targetQualities) {
                const dbPass = await prisma.renderPass.create({
                    data: {
                        jobId: dbJob.id,
                        quality,
                        modelId: getModelForQuality(quality, true),
                        seedSource: 'random',
                        status: 'pending',
                    }
                });

                passes.push({
                    id: dbPass.id,
                    shotId: segmentId,
                    sceneChainId,
                    quality,
                    orderIndex: segment.orderIndex,
                    recipe,
                    childPassIds: [],
                    seedSource: 'random',
                    status: 'pending',
                    retryCount: 0,
                    createdAt: dbPass.createdAt,
                    updatedAt: dbPass.updatedAt,
                });
            }
        }

        console.log(`[RenderQueue] Created job ${dbJob.id} with ${passes.length} passes (persisted to DB)`);

        // Return in-memory format for compatibility
        return this.dbJobToRenderJob(dbJob, passes, targetQualities, burnInMetadata);
    }

    /**
     * Convert database job to in-memory RenderJob format
     */
    private dbJobToRenderJob(
        dbJob: any,
        passes: RenderPass[],
        targetQualities: RenderQuality[],
        burnInMetadata: boolean
    ): RenderJob {
        return {
            id: dbJob.id,
            sceneChainId: dbJob.sceneChainId || '',
            projectId: dbJob.projectId,
            name: dbJob.name,
            targetQualities,
            activeQuality: dbJob.currentQuality as RenderQuality,
            watermarkConfig: {
                ...DEFAULT_WATERMARK_CONFIG,
                enabled: burnInMetadata,
            },
            totalPasses: passes.length,
            completedPasses: passes.filter(p => p.status === 'complete').length,
            failedPasses: passes.filter(p => p.status === 'failed').length,
            estimatedCost: dbJob.totalCost,
            actualCost: 0,
            status: dbJob.status as any,
            passes,
            createdAt: dbJob.createdAt,
            updatedAt: dbJob.updatedAt,
        };
    }

    /**
     * Start rendering a job
     */
    async startJob(jobId: string): Promise<RenderJob> {
        const dbJob = await prisma.renderJob.findUnique({
            where: { id: jobId },
            include: { passes: true }
        });

        if (!dbJob) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (dbJob.status === 'rendering') {
            console.log(`[RenderQueue] Job ${jobId} already rendering`);
            return this.getJob(jobId) as Promise<RenderJob>;
        }

        // Update job status
        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'rendering' }
        });

        // Queue all pending passes for the active quality level
        const passesToQueue = dbJob.passes.filter(
            p => p.quality === dbJob.currentQuality && p.status === 'pending'
        );

        for (const pass of passesToQueue) {
            await prisma.renderPass.update({
                where: { id: pass.id },
                data: { status: 'queued' }
            });
            this.queue.push({ passId: pass.id, jobId });
        }

        console.log(`[RenderQueue] Queued ${passesToQueue.length} passes for job ${jobId}`);

        // Start processing if not already
        this.processQueue();

        return this.getJob(jobId) as Promise<RenderJob>;
    }

    /**
     * Process the render queue with staggered delay
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        this.isProcessing = true;

        let isFirstPass = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;

            // Staggered delay for rate limiting
            if (!isFirstPass) {
                const dbPass = await prisma.renderPass.findUnique({ where: { id: item.passId } });
                const delay = dbPass?.quality === 'master' ? 750 : 500;
                console.log(`[RenderQueue] Staggered delay: ${delay}ms before pass ${item.passId}`);
                await this.sleep(delay);
            }
            isFirstPass = false;

            await this.renderPass(item.passId, item.jobId);
        }

        this.isProcessing = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Render a single pass
     */
    private async renderPass(passId: string, jobId: string): Promise<void> {
        const dbPass = await prisma.renderPass.findUnique({
            where: { id: passId },
            include: { job: true }
        });

        if (!dbPass) {
            console.error(`[RenderQueue] Pass ${passId} not found`);
            return;
        }

        const dbJob = dbPass.job;
        const jobRecipe = JSON.parse(dbJob.recipe);

        // Find the segment/shot this pass belongs to
        const segmentData = jobRecipe.segments?.find((s: any) =>
            // Match by order in array for now
            true
        );
        const recipe: ShotRecipe = segmentData?.recipe || {
            prompt: '',
            aspectRatio: '16:9',
            duration: 5,
        };

        console.log(`[RenderQueue] Rendering pass ${passId} (${dbPass.quality})`);
        console.log(`[RenderQueue] Seed source: ${dbPass.seedSource}, locked seed: ${dbPass.lockedSeed}`);

        // Update status to generating
        await prisma.renderPass.update({
            where: { id: passId },
            data: { status: 'rendering' }
        });

        try {
            const preset = QUALITY_PRESETS[dbPass.quality as RenderQuality];
            const model = dbPass.modelId || getModelForQuality(dbPass.quality as RenderQuality, true);

            // Build watermark text if enabled
            let promptWithWatermark = recipe.prompt;
            if (dbJob.burnInMetadata && dbPass.quality !== 'master') {
                const watermarkText = `${dbPass.quality.toUpperCase()} | Seed: ${dbPass.lockedSeed || 'random'} | Pass #${dbPass.passNumber}`;
                promptWithWatermark = `${recipe.prompt}. Small semi-transparent white text overlay at bottom-left corner showing: "${watermarkText}"`;
            }

            // Build generation options
            const options: GenerationOptions = {
                prompt: promptWithWatermark,
                negativePrompt: recipe.negativePrompt,
                model: model,
                aspectRatio: recipe.aspectRatio,
                duration: String(recipe.duration),
                startFrame: recipe.firstFrameUrl,
                endFrame: recipe.lastFrameUrl,
                steps: recipe.inferenceSteps || preset.inferenceSteps,
                guidanceScale: recipe.guidanceScale || preset.guidanceScale,
            };

            // Use locked seed for deterministic upgrade
            if (dbPass.lockedSeed !== null && dbPass.lockedSeed !== undefined) {
                options.seed = dbPass.lockedSeed;
                console.log(`[RenderQueue] Using locked seed: ${dbPass.lockedSeed}`);
            }

            // Include LoRAs from recipe if present
            if (recipe.loras && recipe.loras.length > 0) {
                options.loras = recipe.loras;
            }

            // Generate video
            const result = await this.generationService.generateVideo(
                recipe.firstFrameUrl,
                options
            );

            if (result.outputs && result.outputs.length > 0) {
                // Capture result seed for potential future upgrades
                const resultSeed = (result as any).seed;

                await prisma.renderPass.update({
                    where: { id: passId },
                    data: {
                        status: 'complete',
                        outputUrl: result.outputs[0],
                        thumbnailUrl: result.outputs[0],
                        generationId: result.id,
                        resultSeed: resultSeed !== undefined ? resultSeed : null,
                        cost: preset.videoCost,
                    }
                });

                // Update job cost
                await prisma.renderJob.update({
                    where: { id: jobId },
                    data: {
                        totalCost: { increment: preset.videoCost }
                    }
                });

                console.log(`[RenderQueue] Pass ${passId} complete: ${result.outputs[0]}`);
            } else {
                throw new Error('No output from generation');
            }
        } catch (error) {
            console.error(`[RenderQueue] Pass ${passId} failed:`, error);

            await prisma.renderPass.update({
                where: { id: passId },
                data: {
                    status: 'failed',
                    failureReason: error instanceof Error ? error.message : 'Unknown error',
                }
            });
        }

        // Check if job is complete
        await this.checkJobCompletion(jobId);
    }

    /**
     * Check if a job is complete
     */
    private async checkJobCompletion(jobId: string): Promise<void> {
        const dbJob = await prisma.renderJob.findUnique({
            where: { id: jobId },
            include: { passes: true }
        });

        if (!dbJob) return;

        const activePasses = dbJob.passes.filter(p => p.quality === dbJob.currentQuality);
        const allComplete = activePasses.every(p => p.status === 'complete' || p.status === 'failed');

        if (!allComplete) return;

        const jobRecipe = JSON.parse(dbJob.recipe);
        const targetQualities: RenderQuality[] = jobRecipe.targetQualities || ['draft'];
        const currentIndex = targetQualities.indexOf(dbJob.currentQuality as RenderQuality);
        const nextQuality = targetQualities[currentIndex + 1];

        if (nextQuality) {
            // Move to next quality level
            console.log(`[RenderQueue] Job ${jobId} advancing from ${dbJob.currentQuality} to ${nextQuality}`);

            await prisma.renderJob.update({
                where: { id: jobId },
                data: { currentQuality: nextQuality }
            });

            // Queue next quality passes
            const nextPasses = dbJob.passes.filter(p => p.quality === nextQuality && p.status === 'pending');
            for (const pass of nextPasses) {
                await prisma.renderPass.update({
                    where: { id: pass.id },
                    data: { status: 'queued' }
                });
                this.queue.push({ passId: pass.id, jobId });
            }

            this.processQueue();
        } else {
            // Job complete
            const allSucceeded = dbJob.passes.every(p => p.status !== 'failed');
            await prisma.renderJob.update({
                where: { id: jobId },
                data: { status: allSucceeded ? 'approved' : 'failed' }
            });
            console.log(`[RenderQueue] Job ${jobId} complete`);
        }
    }

    /**
     * Pause a job
     */
    async pauseJob(jobId: string): Promise<RenderJob | undefined> {
        const dbJob = await prisma.renderJob.findUnique({ where: { id: jobId } });
        if (!dbJob) return undefined;

        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'pending' }  // Use pending as paused state
        });

        // Remove queued passes from queue
        this.queue = this.queue.filter(item => item.jobId !== jobId);

        return this.getJob(jobId);
    }

    /**
     * Resume a paused job
     */
    async resumeJob(jobId: string): Promise<RenderJob | undefined> {
        return this.startJob(jobId);
    }

    /**
     * Get job by ID
     */
    async getJob(jobId: string): Promise<RenderJob | undefined> {
        const dbJob = await prisma.renderJob.findUnique({
            where: { id: jobId },
            include: { passes: true }
        });

        if (!dbJob) return undefined;

        const jobRecipe = JSON.parse(dbJob.recipe);
        const targetQualities: RenderQuality[] = jobRecipe.targetQualities || ['draft'];

        // Convert DB passes to in-memory format
        const passes: RenderPass[] = dbJob.passes.map((p, index) => ({
            id: p.id,
            shotId: jobRecipe.segments?.[index % (jobRecipe.segments?.length || 1)]?.segmentId || '',
            sceneChainId: dbJob.sceneChainId || '',
            quality: p.quality as RenderQuality,
            orderIndex: index,
            recipe: jobRecipe.segments?.[index % (jobRecipe.segments?.length || 1)]?.recipe || {},
            parentPassId: p.parentPassId || undefined,
            childPassIds: [],
            lockedSeed: p.lockedSeed || undefined,
            seedSource: p.seedSource as any,
            resultSeed: p.resultSeed || undefined,
            status: p.status as RenderPassStatus,
            outputUrl: p.outputUrl || undefined,
            thumbnailUrl: p.thumbnailUrl || undefined,
            generationId: p.generationId || undefined,
            actualCost: p.cost,
            failureReason: p.failureReason || undefined,
            retryCount: 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

        return this.dbJobToRenderJob(dbJob, passes, targetQualities, dbJob.burnInMetadata);
    }

    /**
     * Get all jobs for a project
     */
    async getJobsForProject(projectId: string): Promise<RenderJob[]> {
        const dbJobs = await prisma.renderJob.findMany({
            where: { projectId },
            include: { passes: true },
            orderBy: { createdAt: 'desc' }
        });

        const jobs: RenderJob[] = [];
        for (const dbJob of dbJobs) {
            const job = await this.getJob(dbJob.id);
            if (job) jobs.push(job);
        }

        return jobs;
    }

    /**
     * Get render summary for all shots in a scene chain
     */
    async getShotSummaries(sceneChainId: string): Promise<ShotRenderSummary[]> {
        const dbJobs = await prisma.renderJob.findMany({
            where: { sceneChainId },
            include: { passes: true }
        });

        const summaries: Map<string, ShotRenderSummary> = new Map();

        for (const dbJob of dbJobs) {
            const jobRecipe = JSON.parse(dbJob.recipe);

            for (let i = 0; i < dbJob.passes.length; i++) {
                const pass = dbJob.passes[i];
                const segmentId = jobRecipe.segments?.[i % (jobRecipe.segments?.length || 1)]?.segmentId || `shot-${i}`;

                let summary = summaries.get(segmentId);
                if (!summary) {
                    summary = {
                        shotId: segmentId,
                        shotName: `Shot ${i + 1}`,
                        passes: [],
                        totalCost: 0,
                    };
                    summaries.set(segmentId, summary);
                }

                summary.passes.push({
                    quality: pass.quality as RenderQuality,
                    status: pass.status as RenderPassStatus,
                    outputUrl: pass.outputUrl || undefined,
                    cost: pass.cost,
                });

                if (pass.cost) {
                    summary.totalCost += pass.cost;
                }

                if (pass.status === 'complete' && pass.outputUrl) {
                    const qualityRank = { draft: 1, review: 2, master: 3 };
                    const currentBestRank = summary.bestOutputQuality
                        ? qualityRank[summary.bestOutputQuality]
                        : 0;
                    if (qualityRank[pass.quality as RenderQuality] > currentBestRank) {
                        summary.bestOutputUrl = pass.outputUrl;
                        summary.bestOutputQuality = pass.quality as RenderQuality;
                    }
                }
            }
        }

        return Array.from(summaries.values());
    }

    /**
     * Promote a shot to the next quality level with SEED INHERITANCE
     */
    async promoteShot(
        jobId: string,
        shotId: string,
        targetQuality: RenderQuality
    ): Promise<RenderPass> {
        const dbJob = await prisma.renderJob.findUnique({
            where: { id: jobId },
            include: { passes: true }
        });

        if (!dbJob) throw new Error(`Job ${jobId} not found`);

        // Find parent pass (highest quality completed pass)
        const completedPasses = dbJob.passes.filter(p => p.status === 'complete');
        const qualityRank = { draft: 1, review: 2, master: 3 };

        const parentDbPass = completedPasses.sort((a, b) =>
            qualityRank[b.quality as RenderQuality] - qualityRank[a.quality as RenderQuality]
        )[0];

        if (!parentDbPass) throw new Error(`No completed pass found for shot ${shotId}`);

        // Validate upgrade
        if (qualityRank[targetQuality] <= qualityRank[parentDbPass.quality as RenderQuality]) {
            throw new Error(`Cannot promote from ${parentDbPass.quality} to ${targetQuality}`);
        }

        // Create new pass with inherited seed
        const newDbPass = await prisma.renderPass.create({
            data: {
                jobId,
                quality: targetQuality,
                modelId: getModelForQuality(targetQuality, true),
                parentPassId: parentDbPass.id,
                // CRITICAL: Seed inheritance
                lockedSeed: parentDbPass.resultSeed,
                seedSource: parentDbPass.resultSeed !== null ? 'inherited' : 'random',
                status: 'queued',
            }
        });

        console.log(`[RenderQueue] Promoting shot ${shotId} from ${parentDbPass.quality} to ${targetQuality}`);
        console.log(`[RenderQueue] Parent pass: ${parentDbPass.id}, seed: ${parentDbPass.resultSeed}`);
        console.log(`[RenderQueue] New pass: ${newDbPass.id}, locked seed: ${newDbPass.lockedSeed}`);

        // Queue immediately
        this.queue.push({ passId: newDbPass.id, jobId });
        this.processQueue();

        const jobRecipe = JSON.parse(dbJob.recipe);
        return {
            id: newDbPass.id,
            shotId,
            sceneChainId: dbJob.sceneChainId || '',
            quality: targetQuality,
            orderIndex: 0,
            recipe: jobRecipe.segments?.[0]?.recipe || {},
            parentPassId: parentDbPass.id,
            childPassIds: [],
            lockedSeed: newDbPass.lockedSeed || undefined,
            seedSource: newDbPass.seedSource as any,
            status: 'queued',
            retryCount: 0,
            createdAt: newDbPass.createdAt,
            updatedAt: newDbPass.updatedAt,
        };
    }

    /**
     * Get version stack for a shot
     */
    async getVersionStack(sceneChainId: string, shotId: string): Promise<ShotVersionStack | null> {
        const dbJobs = await prisma.renderJob.findMany({
            where: { sceneChainId },
            include: { passes: true }
        });

        for (const dbJob of dbJobs) {
            const jobRecipe = JSON.parse(dbJob.recipe);
            const shotPasses = dbJob.passes;

            if (shotPasses.length === 0) continue;

            const recipe = jobRecipe.segments?.[0]?.recipe || {};

            const versions = shotPasses
                .sort((a, b) => {
                    const rank = { draft: 1, review: 2, master: 3 };
                    return rank[a.quality as RenderQuality] - rank[b.quality as RenderQuality];
                })
                .map(pass => ({
                    passId: pass.id,
                    quality: pass.quality as RenderQuality,
                    status: pass.status as RenderPassStatus,
                    outputUrl: pass.outputUrl || undefined,
                    thumbnailUrl: pass.thumbnailUrl || undefined,
                    seed: pass.resultSeed || pass.lockedSeed || undefined,
                    model: pass.modelId,
                    cost: pass.cost,
                    createdAt: pass.createdAt,
                }));

            const completedVersions = versions.filter(v => v.status === 'complete');
            const bestVersion = completedVersions.length > 0
                ? completedVersions[completedVersions.length - 1]
                : versions[0];

            const qualityOrder: RenderQuality[] = ['draft', 'review', 'master'];
            const completedQualities = completedVersions.map(v => v.quality);
            const highestComplete = completedQualities.length > 0
                ? qualityOrder.indexOf(completedQualities[completedQualities.length - 1])
                : -1;
            const nextUpgrade = highestComplete < 2 ? qualityOrder[highestComplete + 1] : undefined;
            const upgradeCost = nextUpgrade ? estimateCost(nextUpgrade, 1, true).perShotCost : undefined;

            return {
                shotId,
                shotName: `Shot 1`,
                versions,
                activeVersion: bestVersion?.quality || 'draft',
                recipe,
                canUpgrade: nextUpgrade !== undefined,
                nextUpgradeQuality: nextUpgrade,
                upgradeCost,
            };
        }

        return null;
    }

    /**
     * Get all version stacks for a scene chain
     */
    async getAllVersionStacks(sceneChainId: string): Promise<ShotVersionStack[]> {
        const stack = await this.getVersionStack(sceneChainId, '');
        return stack ? [stack] : [];
    }

    /**
     * Get cost comparison
     */
    getCostComparison(
        shotCount: number,
        isVideo: boolean = true,
        draftIterations: number = 3
    ) {
        return calculateSavings(shotCount, isVideo, draftIterations);
    }

    /**
     * Retry a failed pass
     */
    async retryPass(jobId: string, passId: string): Promise<RenderPass> {
        const dbPass = await prisma.renderPass.findUnique({
            where: { id: passId },
            include: { job: true }
        });
        if (!dbPass) throw new Error(`Pass ${passId} not found`);
        if (dbPass.status !== 'failed') throw new Error('Can only retry failed passes');

        await prisma.renderPass.update({
            where: { id: passId },
            data: {
                status: 'queued',
                failureReason: null,
            }
        });

        this.queue.push({ passId, jobId });
        this.processQueue();

        // Parse recipe from job
        const recipe: ShotRecipe = dbPass.job.recipe
            ? JSON.parse(dbPass.job.recipe)
            : { prompt: '', aspectRatio: '16:9', duration: 5 };

        return {
            id: dbPass.id,
            shotId: '',
            sceneChainId: dbPass.job.sceneChainId || '',
            quality: dbPass.quality as RenderQuality,
            orderIndex: 0,
            recipe,
            childPassIds: [],
            seedSource: dbPass.seedSource as 'random' | 'inherited' | 'user',
            status: 'queued',
            retryCount: 0,
            createdAt: dbPass.createdAt,
            updatedAt: dbPass.updatedAt,
        };
    }

    /**
     * Cancel a job
     */
    async cancelJob(jobId: string): Promise<boolean> {
        const dbJob = await prisma.renderJob.findUnique({ where: { id: jobId } });
        if (!dbJob) return false;

        // Remove from queue
        this.queue = this.queue.filter(item => item.jobId !== jobId);

        // Mark job as failed
        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'failed' }
        });

        // Mark pending passes as skipped
        await prisma.renderPass.updateMany({
            where: {
                jobId,
                status: { in: ['pending', 'queued'] }
            },
            data: { status: 'pending' }  // Use pending as skipped
        });

        return true;
    }

    /**
     * Get A/B comparison data
     */
    async getPassComparison(
        sceneChainId: string,
        shotId: string,
        qualityA: RenderQuality,
        qualityB: RenderQuality
    ): Promise<any> {
        const stack = await this.getVersionStack(sceneChainId, shotId);
        if (!stack) return null;

        const versionA = stack.versions.find(v => v.quality === qualityA && v.status === 'complete');
        const versionB = stack.versions.find(v => v.quality === qualityB && v.status === 'complete');

        return {
            shotId: stack.shotId,
            shotName: stack.shotName,
            passA: versionA ? {
                passId: versionA.passId,
                quality: versionA.quality,
                outputUrl: versionA.outputUrl || '',
                cost: versionA.cost || 0,
                seed: versionA.seed,
                model: versionA.model,
            } : null,
            passB: versionB ? {
                passId: versionB.passId,
                quality: versionB.quality,
                outputUrl: versionB.outputUrl || '',
                cost: versionB.cost || 0,
                seed: versionB.seed,
                model: versionB.model,
            } : null,
            costDifference: (versionB?.cost || 0) - (versionA?.cost || 0),
            qualityUpgrade: `${qualityA} → ${qualityB}`,
        };
    }

    /**
     * Get available comparisons
     */
    async getAvailableComparisons(sceneChainId: string): Promise<Array<{
        shotId: string;
        shotName: string;
        availableQualities: RenderQuality[];
    }>> {
        const stacks = await this.getAllVersionStacks(sceneChainId);
        return stacks
            .filter(stack => {
                const completedVersions = stack.versions.filter(v => v.status === 'complete');
                return completedVersions.length >= 2;
            })
            .map(stack => ({
                shotId: stack.shotId,
                shotName: stack.shotName,
                availableQualities: stack.versions
                    .filter(v => v.status === 'complete')
                    .map(v => v.quality),
            }));
    }
}

export const renderQueueService = RenderQueueService.getInstance();
export { RenderQueueService };

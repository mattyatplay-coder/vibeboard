/**
 * Render Queue Service
 *
 * Manages multi-pass rendering workflow for scene chains.
 * Supports draft → review → master quality progression to save money.
 *
 * NOW PERSISTED TO DATABASE for crash-safe recovery.
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

// In-memory queue for active processing (DB is source of truth)
interface QueuedPass {
    passId: string;
    jobId: string;
}

// Snapshotted element reference (immutable URL capture)
interface ElementSnapshot {
    id: string;
    url: string;
    name: string;
}

class RenderQueueService {
    private static instance: RenderQueueService;
    private generationService: GenerationService;
    private processingQueue: QueuedPass[] = [];
    private isProcessing: boolean = false;
    private isHydrated: boolean = false;

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
     * CRITICAL: Hydrate queue from database on server startup
     * Restores any in-progress jobs that were interrupted by a crash/restart
     */
    async hydrateQueue(): Promise<void> {
        if (this.isHydrated) {
            console.log('[RenderQueue] Already hydrated, skipping');
            return;
        }

        console.log('[RenderQueue] Hydrating queue from database...');

        try {
            // Find all jobs that were rendering when server stopped
            const activeJobs = await prisma.renderJob.findMany({
                where: {
                    status: { in: ['rendering', 'paused'] }
                },
                include: {
                    passes: {
                        where: {
                            status: { in: ['queued', 'generating'] }
                        }
                    }
                }
            });

            for (const job of activeJobs) {
                // Reset 'generating' passes back to 'queued' (they were interrupted)
                const generatingPasses = job.passes.filter(p => p.status === 'generating');
                for (const pass of generatingPasses) {
                    await prisma.renderPass.update({
                        where: { id: pass.id },
                        data: { status: 'queued', startedAt: null }
                    });
                }

                // Re-queue all queued passes
                const queuedPasses = job.passes.filter(p => p.status === 'queued' || p.status === 'generating');
                for (const pass of queuedPasses) {
                    this.processingQueue.push({ passId: pass.id, jobId: job.id });
                }

                console.log(`[RenderQueue] Restored job ${job.id} with ${queuedPasses.length} queued passes`);
            }

            this.isHydrated = true;
            console.log(`[RenderQueue] Hydration complete. ${this.processingQueue.length} passes queued.`);

            // Resume processing if there are queued items
            if (this.processingQueue.length > 0) {
                this.processQueue();
            }
        } catch (error) {
            console.error('[RenderQueue] Hydration failed:', error);
            this.isHydrated = true; // Mark as hydrated to prevent infinite retries
        }
    }

    /**
     * Snapshot element references - capture actual URLs instead of just IDs
     * This prevents crashes if elements are deleted before Master pass
     */
    private async snapshotElements(elementIds: string[]): Promise<ElementSnapshot[]> {
        if (!elementIds || elementIds.length === 0) return [];

        const elements = await prisma.element.findMany({
            where: { id: { in: elementIds } },
            select: { id: true, fileUrl: true, name: true }
        });

        return elements.map(e => ({
            id: e.id,
            url: e.fileUrl,
            name: e.name
        }));
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

        const now = new Date();
        const jobId = uuidv4();

        // Estimate total cost
        const isVideo = true;
        let estimatedCost = 0;
        for (const quality of targetQualities) {
            const est = estimateCost(quality, chain.segments.length, isVideo);
            estimatedCost += est.totalCost;
        }

        // Watermark configuration
        const watermarkConfig: WatermarkConfig = {
            ...DEFAULT_WATERMARK_CONFIG,
            enabled: burnInMetadata,
        };

        // Create job in database
        const dbJob = await prisma.renderJob.create({
            data: {
                id: jobId,
                sceneChainId,
                projectId,
                name: chain.name,
                targetQualities: JSON.stringify(targetQualities),
                activeQuality: targetQualities[0],
                watermarkConfig: JSON.stringify(watermarkConfig),
                totalPasses: chain.segments.length * targetQualities.length,
                estimatedCost,
                status: 'pending',
            }
        });

        // Create passes for each segment and quality level
        const passesToCreate: any[] = [];

        for (const segment of chain.segments) {
            // Build the locked recipe for this shot
            const recipe: ShotRecipe = {
                prompt: segment.prompt || '',
                aspectRatio: chain.aspectRatio || '16:9',
                duration: segment.duration || 5,
                firstFrameUrl: segment.firstFrameUrl || undefined,
                lastFrameUrl: segment.lastFrameUrl || undefined,
            };

            for (const quality of targetQualities) {
                passesToCreate.push({
                    id: uuidv4(),
                    jobId,
                    shotId: segment.id,
                    sceneChainId,
                    quality,
                    orderIndex: segment.orderIndex,
                    recipe: JSON.stringify(recipe),
                    childPassIds: JSON.stringify([]),
                    seedSource: 'random',
                    status: 'pending',
                    retryCount: 0,
                });
            }
        }

        await prisma.renderPass.createMany({ data: passesToCreate });

        console.log(`[RenderQueue] Created job ${jobId} with ${passesToCreate.length} passes (persisted to DB)`);

        // Return the full job object
        return this.getJob(jobId) as Promise<RenderJob>;
    }

    /**
     * Get job from database (source of truth)
     */
    async getJob(jobId: string): Promise<RenderJob | null> {
        const dbJob = await prisma.renderJob.findUnique({
            where: { id: jobId },
            include: { passes: true }
        });

        if (!dbJob) return null;

        return this.dbJobToRenderJob(dbJob);
    }

    /**
     * Convert DB record to RenderJob type
     */
    private dbJobToRenderJob(dbJob: any): RenderJob {
        const passes: RenderPass[] = (dbJob.passes || []).map((p: any) => this.dbPassToRenderPass(p));

        return {
            id: dbJob.id,
            sceneChainId: dbJob.sceneChainId,
            projectId: dbJob.projectId,
            name: dbJob.name,
            targetQualities: JSON.parse(dbJob.targetQualities || '["draft"]'),
            activeQuality: dbJob.activeQuality as RenderQuality,
            watermarkConfig: JSON.parse(dbJob.watermarkConfig || JSON.stringify(DEFAULT_WATERMARK_CONFIG)),
            totalPasses: dbJob.totalPasses,
            completedPasses: dbJob.completedPasses,
            failedPasses: dbJob.failedPasses,
            estimatedCost: dbJob.estimatedCost,
            actualCost: dbJob.actualCost,
            status: dbJob.status as RenderJob['status'],
            passes,
            createdAt: dbJob.createdAt,
            updatedAt: dbJob.updatedAt,
        };
    }

    /**
     * Convert DB record to RenderPass type
     */
    private dbPassToRenderPass(p: any): RenderPass {
        return {
            id: p.id,
            shotId: p.shotId,
            sceneChainId: p.sceneChainId,
            quality: p.quality as RenderQuality,
            orderIndex: p.orderIndex,
            parentPassId: p.parentPassId || undefined,
            childPassIds: JSON.parse(p.childPassIds || '[]'),
            recipe: JSON.parse(p.recipe || '{}'),
            lockedSeed: p.lockedSeed || undefined,
            seedSource: (p.seedSource || 'random') as 'random' | 'inherited' | 'user',
            resultSeed: p.resultSeed || undefined,
            modelOverride: p.modelOverride || undefined,
            status: p.status as RenderPassStatus,
            outputUrl: p.outputUrl || undefined,
            thumbnailUrl: p.thumbnailUrl || undefined,
            generationId: p.generationId || undefined,
            resultMetadata: p.resultMetadata ? JSON.parse(p.resultMetadata) : undefined,
            actualCost: p.actualCost || undefined,
            inferenceTime: p.inferenceTime || undefined,
            failureReason: p.failureReason || undefined,
            retryCount: p.retryCount,
            queuedAt: p.queuedAt || undefined,
            startedAt: p.startedAt || undefined,
            completedAt: p.completedAt || undefined,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        };
    }

    /**
     * Start rendering a job
     */
    async startJob(jobId: string): Promise<RenderJob> {
        const job = await this.getJob(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (job.status === 'rendering') {
            console.log(`[RenderQueue] Job ${jobId} already rendering`);
            return job;
        }

        // Update job status in DB
        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'rendering' }
        });

        // Queue all pending passes for the active quality level
        const passesToQueue = job.passes.filter(
            p => p.quality === job.activeQuality && p.status === 'pending'
        );

        for (const pass of passesToQueue) {
            await prisma.renderPass.update({
                where: { id: pass.id },
                data: { status: 'queued', queuedAt: new Date() }
            });
            this.processingQueue.push({ passId: pass.id, jobId });
        }

        console.log(`[RenderQueue] Queued ${passesToQueue.length} passes for job ${jobId}`);

        // Start processing if not already
        this.processQueue();

        return (await this.getJob(jobId))!;
    }

    /**
     * Process the render queue
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        if (this.processingQueue.length === 0) return;

        this.isProcessing = true;

        let isFirstPass = true;
        while (this.processingQueue.length > 0) {
            const item = this.processingQueue.shift()!;

            // Fetch pass and job from DB
            const dbPass = await prisma.renderPass.findUnique({ where: { id: item.passId } });
            const dbJob = await prisma.renderJob.findUnique({ where: { id: item.jobId } });

            if (!dbPass || !dbJob) {
                console.warn(`[RenderQueue] Pass or job not found, skipping: ${item.passId}`);
                continue;
            }

            const pass = this.dbPassToRenderPass(dbPass);
            const job = await this.getJob(item.jobId);
            if (!job) continue;

            // Staggered delay for rate limiting
            if (!isFirstPass) {
                const delay = pass.quality === 'master' ? 750 : 500;
                console.log(`[RenderQueue] Staggered delay: ${delay}ms before pass ${pass.id}`);
                await this.sleep(delay);
            }
            isFirstPass = false;

            await this.renderPass(pass, job);
        }

        this.isProcessing = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Render a single pass
     */
    private async renderPass(pass: RenderPass, job: RenderJob): Promise<void> {
        console.log(`[RenderQueue] Rendering pass ${pass.id} (${pass.quality}) for shot ${pass.shotId}`);
        console.log(`[RenderQueue] Seed source: ${pass.seedSource}, locked seed: ${pass.lockedSeed}`);

        // Update status in DB
        await prisma.renderPass.update({
            where: { id: pass.id },
            data: { status: 'generating', startedAt: new Date() }
        });

        try {
            const preset = QUALITY_PRESETS[pass.quality];
            const model = pass.modelOverride || getModelForQuality(pass.quality, true);
            const recipe = pass.recipe;

            // Build prompt with optional watermark
            let promptWithWatermark = recipe.prompt;
            if (job.watermarkConfig.enabled && pass.quality !== 'master') {
                const watermarkText = buildWatermarkText(pass, job.watermarkConfig);
                promptWithWatermark = `${recipe.prompt}. Small semi-transparent white text overlay at bottom-left corner showing: "${watermarkText}"`;
                console.log(`[RenderQueue] Watermark enabled: ${watermarkText}`);
            }

            // Build generation options from locked recipe
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
            if (pass.lockedSeed !== undefined) {
                options.seed = pass.lockedSeed;
                console.log(`[RenderQueue] Using locked seed: ${pass.lockedSeed}`);
            }

            // Include LoRAs from recipe
            if (recipe.loras && recipe.loras.length > 0) {
                options.loras = recipe.loras;
            }

            // Use snapshotted URLs for element references (crash-safe!)
            // Fetch from DB if available
            const dbPass = await prisma.renderPass.findUnique({ where: { id: pass.id } });
            if (dbPass?.elementSnapshots) {
                const snapshots: ElementSnapshot[] = JSON.parse(dbPass.elementSnapshots);
                options.elementReferences = snapshots.map(s => s.url);
                options.referenceCreativity = recipe.elementStrength || 0.7;
            } else if (recipe.elementReferences && recipe.elementReferences.length > 0) {
                // Fallback to recipe (legacy - IDs instead of URLs)
                options.elementReferences = recipe.elementReferences;
                options.referenceCreativity = recipe.elementStrength || 0.7;
            }

            // Generate video
            const result = await this.generationService.generateVideo(
                recipe.firstFrameUrl,
                options
            );

            if (result.outputs && result.outputs.length > 0) {
                const inferenceTime = pass.startedAt ? Date.now() - new Date(pass.startedAt).getTime() : 0;

                // Update pass in DB
                await prisma.renderPass.update({
                    where: { id: pass.id },
                    data: {
                        status: 'complete',
                        outputUrl: result.outputs[0],
                        thumbnailUrl: result.outputs[0],
                        generationId: result.id,
                        actualCost: preset.videoCost,
                        resultSeed: (result as any).seed || undefined,
                        resultMetadata: JSON.stringify({
                            model: model,
                            provider: 'fal',
                            inferenceTime,
                        }),
                        completedAt: new Date(),
                    }
                });

                // Update job counters
                await prisma.renderJob.update({
                    where: { id: job.id },
                    data: {
                        completedPasses: { increment: 1 },
                        actualCost: { increment: preset.videoCost },
                    }
                });

                // Update the segment with the output
                await prisma.sceneChainSegment.update({
                    where: { id: pass.shotId },
                    data: {
                        outputUrl: result.outputs[0],
                        generationId: result.id,
                        status: 'complete',
                    }
                });

                console.log(`[RenderQueue] Pass ${pass.id} complete: ${result.outputs[0]}`);
            } else {
                throw new Error('No output from generation');
            }
        } catch (error) {
            console.error(`[RenderQueue] Pass ${pass.id} failed:`, error);

            const failureReason = error instanceof Error ? error.message : 'Unknown error';

            // Update pass in DB
            await prisma.renderPass.update({
                where: { id: pass.id },
                data: {
                    status: 'failed',
                    failureReason,
                    retryCount: { increment: 1 },
                    completedAt: new Date(),
                }
            });

            // Update job counters
            await prisma.renderJob.update({
                where: { id: job.id },
                data: { failedPasses: { increment: 1 } }
            });

            // Update segment status
            await prisma.sceneChainSegment.update({
                where: { id: pass.shotId },
                data: {
                    status: 'failed',
                    failureReason,
                }
            });
        }

        // Check if job is complete
        await this.checkJobCompletion(job.id);
    }

    /**
     * Check if a job is complete and transition to next quality level if needed
     */
    private async checkJobCompletion(jobId: string): Promise<void> {
        const job = await this.getJob(jobId);
        if (!job) return;

        const activePasses = job.passes.filter(p => p.quality === job.activeQuality);
        const allComplete = activePasses.every(p => p.status === 'complete' || p.status === 'failed');

        if (!allComplete) return;

        const currentIndex = job.targetQualities.indexOf(job.activeQuality);
        const nextQuality = job.targetQualities[currentIndex + 1];

        if (nextQuality) {
            // Move to next quality level
            console.log(`[RenderQueue] Job ${jobId} advancing from ${job.activeQuality} to ${nextQuality}`);

            await prisma.renderJob.update({
                where: { id: jobId },
                data: { activeQuality: nextQuality }
            });

            // Queue next quality passes
            const nextPasses = job.passes.filter(p => p.quality === nextQuality && p.status === 'pending');
            for (const pass of nextPasses) {
                await prisma.renderPass.update({
                    where: { id: pass.id },
                    data: { status: 'queued', queuedAt: new Date() }
                });
                this.processingQueue.push({ passId: pass.id, jobId });
            }

            this.processQueue();
        } else {
            // Job complete
            const allSucceeded = job.failedPasses === 0;
            await prisma.renderJob.update({
                where: { id: jobId },
                data: { status: allSucceeded ? 'complete' : 'failed' }
            });
            console.log(`[RenderQueue] Job ${jobId} complete. Status: ${allSucceeded ? 'complete' : 'failed'}`);
        }
    }

    /**
     * Pause a job
     */
    async pauseJob(jobId: string): Promise<RenderJob | null> {
        const job = await this.getJob(jobId);
        if (!job) return null;

        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'paused' }
        });

        // Remove from processing queue
        this.processingQueue = this.processingQueue.filter(item => item.jobId !== jobId);

        return this.getJob(jobId);
    }

    /**
     * Resume a paused job
     */
    async resumeJob(jobId: string): Promise<RenderJob | null> {
        const job = await this.getJob(jobId);
        if (!job || job.status !== 'paused') return null;

        return this.startJob(jobId);
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

        return dbJobs.map(j => this.dbJobToRenderJob(j));
    }

    /**
     * Get render summary for all shots in a scene chain
     */
    async getShotSummaries(sceneChainId: string): Promise<ShotRenderSummary[]> {
        const jobs = await prisma.renderJob.findMany({
            where: { sceneChainId },
            include: { passes: true }
        });

        const summaries: Map<string, ShotRenderSummary> = new Map();

        for (const dbJob of jobs) {
            const job = this.dbJobToRenderJob(dbJob);

            for (const pass of job.passes) {
                let summary = summaries.get(pass.shotId);
                if (!summary) {
                    summary = {
                        shotId: pass.shotId,
                        shotName: `Shot ${pass.orderIndex + 1}`,
                        passes: [],
                        totalCost: 0,
                    };
                    summaries.set(pass.shotId, summary);
                }

                summary.passes.push({
                    quality: pass.quality,
                    status: pass.status,
                    outputUrl: pass.outputUrl,
                    cost: pass.actualCost,
                });

                if (pass.actualCost) {
                    summary.totalCost += pass.actualCost;
                }

                // Track best available output
                if (pass.status === 'complete' && pass.outputUrl) {
                    const qualityRank = { draft: 1, review: 2, master: 3 };
                    const currentBestRank = summary.bestOutputQuality ? qualityRank[summary.bestOutputQuality] : 0;
                    if (qualityRank[pass.quality] > currentBestRank) {
                        summary.bestOutputUrl = pass.outputUrl;
                        summary.bestOutputQuality = pass.quality;
                    }
                }
            }
        }

        return Array.from(summaries.values());
    }

    /**
     * Promote a shot to the next quality level
     * CRITICAL: This is where seed inheritance and URL snapshotting happens!
     */
    async promoteShot(
        jobId: string,
        shotId: string,
        targetQuality: RenderQuality
    ): Promise<RenderPass> {
        const job = await this.getJob(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        // Find existing pass at current highest quality (the parent)
        const parentPass = job.passes
            .filter(p => p.shotId === shotId && p.status === 'complete')
            .sort((a, b) => {
                const rank = { draft: 1, review: 2, master: 3 };
                return rank[b.quality] - rank[a.quality];
            })[0];

        if (!parentPass) throw new Error(`No completed pass found for shot ${shotId}`);

        // Validate quality upgrade
        const qualityRank = { draft: 1, review: 2, master: 3 };
        if (qualityRank[targetQuality] <= qualityRank[parentPass.quality]) {
            throw new Error(`Cannot promote from ${parentPass.quality} to ${targetQuality}`);
        }

        // CRITICAL: Snapshot element references NOW before they can be deleted
        let elementSnapshots: ElementSnapshot[] = [];
        if (parentPass.recipe.elementReferences && parentPass.recipe.elementReferences.length > 0) {
            elementSnapshots = await this.snapshotElements(parentPass.recipe.elementReferences);
            console.log(`[RenderQueue] Snapshotted ${elementSnapshots.length} element URLs for crash-safe rendering`);
        }

        const newPassId = uuidv4();

        // Create new pass in DB with inherited seed and snapshotted URLs
        await prisma.renderPass.create({
            data: {
                id: newPassId,
                jobId,
                shotId: parentPass.shotId,
                sceneChainId: parentPass.sceneChainId,
                quality: targetQuality,
                orderIndex: parentPass.orderIndex,
                parentPassId: parentPass.id,
                childPassIds: JSON.stringify([]),
                recipe: JSON.stringify(parentPass.recipe),
                elementSnapshots: JSON.stringify(elementSnapshots),
                lockedSeed: parentPass.resultSeed,
                seedSource: parentPass.resultSeed !== undefined ? 'inherited' : 'random',
                status: 'queued',
                queuedAt: new Date(),
                retryCount: 0,
            }
        });

        // Update parent to track its children
        const parentChildIds = [...(parentPass.childPassIds || []), newPassId];
        await prisma.renderPass.update({
            where: { id: parentPass.id },
            data: { childPassIds: JSON.stringify(parentChildIds) }
        });

        // Update job counters
        const est = estimateCost(targetQuality, 1, true);
        await prisma.renderJob.update({
            where: { id: jobId },
            data: {
                totalPasses: { increment: 1 },
                estimatedCost: { increment: est.totalCost },
            }
        });

        console.log(`[RenderQueue] Promoting shot ${shotId} from ${parentPass.quality} to ${targetQuality}`);
        console.log(`[RenderQueue] Parent pass: ${parentPass.id}, seed: ${parentPass.resultSeed}`);
        console.log(`[RenderQueue] New pass: ${newPassId}, locked seed: ${parentPass.resultSeed}`);

        // Queue immediately
        this.processingQueue.push({ passId: newPassId, jobId });
        this.processQueue();

        const newPass = await prisma.renderPass.findUnique({ where: { id: newPassId } });
        return this.dbPassToRenderPass(newPass);
    }

    /**
     * Get version stack for a shot
     */
    async getVersionStack(sceneChainId: string, shotId: string): Promise<ShotVersionStack | null> {
        const passes = await prisma.renderPass.findMany({
            where: { sceneChainId, shotId },
            orderBy: { createdAt: 'asc' }
        });

        if (passes.length === 0) return null;

        const firstPass = passes[0];
        const recipe: ShotRecipe = JSON.parse(firstPass.recipe || '{}');

        const versions = passes.map(p => ({
            passId: p.id,
            quality: p.quality as RenderQuality,
            status: p.status as RenderPassStatus,
            outputUrl: p.outputUrl || undefined,
            thumbnailUrl: p.thumbnailUrl || undefined,
            seed: p.resultSeed || p.lockedSeed || undefined,
            model: p.resultMetadata
                ? JSON.parse(p.resultMetadata).model
                : getModelForQuality(p.quality as RenderQuality, true),
            cost: p.actualCost || undefined,
            createdAt: p.createdAt,
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

        const upgradeCost = nextUpgrade
            ? estimateCost(nextUpgrade, 1, true).perShotCost
            : undefined;

        return {
            shotId,
            shotName: `Shot ${firstPass.orderIndex + 1}`,
            versions,
            activeVersion: bestVersion?.quality || 'draft',
            recipe,
            canUpgrade: nextUpgrade !== undefined,
            nextUpgradeQuality: nextUpgrade,
            upgradeCost,
        };
    }

    /**
     * Get all version stacks for a scene chain
     */
    async getAllVersionStacks(sceneChainId: string): Promise<ShotVersionStack[]> {
        const passes = await prisma.renderPass.findMany({
            where: { sceneChainId },
            orderBy: { orderIndex: 'asc' }
        });

        const shotIds = [...new Set(passes.map(p => p.shotId))];
        const stacks: ShotVersionStack[] = [];

        for (const shotId of shotIds) {
            const stack = await this.getVersionStack(sceneChainId, shotId);
            if (stack) stacks.push(stack);
        }

        return stacks;
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
        const pass = await prisma.renderPass.findUnique({ where: { id: passId } });
        if (!pass) throw new Error(`Pass ${passId} not found`);
        if (pass.jobId !== jobId) throw new Error(`Pass ${passId} does not belong to job ${jobId}`);
        if (pass.status !== 'failed') throw new Error('Can only retry failed passes');

        await prisma.renderPass.update({
            where: { id: passId },
            data: {
                status: 'queued',
                failureReason: null,
                queuedAt: new Date(),
            }
        });

        await prisma.renderJob.update({
            where: { id: jobId },
            data: { failedPasses: { decrement: 1 } }
        });

        this.processingQueue.push({ passId, jobId });
        this.processQueue();

        const updated = await prisma.renderPass.findUnique({ where: { id: passId } });
        return this.dbPassToRenderPass(updated);
    }

    /**
     * Cancel a job completely
     */
    async cancelJob(jobId: string): Promise<boolean> {
        const job = await this.getJob(jobId);
        if (!job) return false;

        // Remove from processing queue
        this.processingQueue = this.processingQueue.filter(item => item.jobId !== jobId);

        // Mark all pending/queued passes as skipped
        await prisma.renderPass.updateMany({
            where: {
                jobId,
                status: { in: ['pending', 'queued'] }
            },
            data: { status: 'skipped' }
        });

        // Mark job as failed
        await prisma.renderJob.update({
            where: { id: jobId },
            data: { status: 'failed' }
        });

        return true;
    }

    /**
     * Get A/B comparison data for a shot
     */
    async getPassComparison(
        sceneChainId: string,
        shotId: string,
        qualityA: RenderQuality,
        qualityB: RenderQuality
    ) {
        const stack = await this.getVersionStack(sceneChainId, shotId);
        if (!stack) return null;

        const versionA = stack.versions.find(v => v.quality === qualityA && v.status === 'complete');
        const versionB = stack.versions.find(v => v.quality === qualityB && v.status === 'complete');

        const passA = versionA ? {
            passId: versionA.passId,
            quality: versionA.quality,
            outputUrl: versionA.outputUrl || '',
            thumbnailUrl: versionA.thumbnailUrl,
            cost: versionA.cost || 0,
            seed: versionA.seed,
            model: versionA.model,
        } : null;

        const passB = versionB ? {
            passId: versionB.passId,
            quality: versionB.quality,
            outputUrl: versionB.outputUrl || '',
            thumbnailUrl: versionB.thumbnailUrl,
            cost: versionB.cost || 0,
            seed: versionB.seed,
            model: versionB.model,
        } : null;

        const costA = passA?.cost || 0;
        const costB = passB?.cost || 0;

        return {
            shotId: stack.shotId,
            shotName: stack.shotName,
            passA,
            passB,
            costDifference: costB - costA,
            qualityUpgrade: `${qualityA} → ${qualityB}`,
        };
    }

    /**
     * Get all available comparisons for a scene chain
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

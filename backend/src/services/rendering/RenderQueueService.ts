/**
 * Render Queue Service
 *
 * Manages multi-pass rendering workflow for scene chains.
 * Supports draft → review → master quality progression to save money.
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

// In-memory queue for active render jobs
interface QueuedPass {
    pass: RenderPass;
    job: RenderJob;
}

class RenderQueueService {
    private static instance: RenderQueueService;
    private generationService: GenerationService;
    private queue: QueuedPass[] = [];
    private isProcessing: boolean = false;
    private activeJobs: Map<string, RenderJob> = new Map();

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
     * Create a new render job for a scene chain
     */
    async createRenderJob(
        sceneChainId: string,
        projectId: string,
        targetQualities: RenderQuality[] = ['draft'],
        burnInMetadata: boolean = false  // Refinement C: Watermark option
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

        // Create passes for each segment and quality level
        const passes: RenderPass[] = [];
        const now = new Date();

        for (const segment of chain.segments) {
            // Build the locked recipe for this shot (shared across all quality passes)
            const recipe: ShotRecipe = {
                prompt: segment.prompt || '',
                aspectRatio: chain.aspectRatio || '16:9',
                duration: segment.duration || 5,
                firstFrameUrl: segment.firstFrameUrl || undefined,
                lastFrameUrl: segment.lastFrameUrl || undefined,
                // Future: Pull these from segment metadata if stored
                // lensKit, lightingSetup, cinematicTags, loras would come from generation settings
            };

            for (const quality of targetQualities) {
                passes.push({
                    id: uuidv4(),
                    shotId: segment.id,
                    sceneChainId,
                    quality,
                    orderIndex: segment.orderIndex,

                    // Locked recipe - identical for all quality passes of this shot
                    recipe,

                    // Parent-child mapping (set when promoting)
                    childPassIds: [],

                    // Seed source - initial passes use random seeds
                    seedSource: 'random',

                    status: 'pending',
                    retryCount: 0,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }

        // Estimate total cost
        const isVideo = true; // Scene chains are video-focused
        let estimatedCost = 0;
        for (const quality of targetQualities) {
            const est = estimateCost(quality, chain.segments.length, isVideo);
            estimatedCost += est.totalCost;
        }

        // REFINEMENT C: Configure watermark for dailies-style burn-in
        const watermarkConfig: WatermarkConfig = {
            ...DEFAULT_WATERMARK_CONFIG,
            enabled: burnInMetadata,
        };

        const job: RenderJob = {
            id: uuidv4(),
            sceneChainId,
            projectId,
            name: chain.name,
            targetQualities,
            activeQuality: targetQualities[0],
            watermarkConfig,  // Refinement C
            totalPasses: passes.length,
            completedPasses: 0,
            failedPasses: 0,
            estimatedCost,
            actualCost: 0,
            status: 'pending',
            passes,
            createdAt: now,
            updatedAt: now,
        };

        this.activeJobs.set(job.id, job);
        console.log(`[RenderQueue] Created job ${job.id} with ${passes.length} passes`);

        return job;
    }

    /**
     * Start rendering a job
     */
    async startJob(jobId: string): Promise<RenderJob> {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (job.status === 'rendering') {
            console.log(`[RenderQueue] Job ${jobId} already rendering`);
            return job;
        }

        job.status = 'rendering';
        job.updatedAt = new Date();

        // Queue all pending passes for the active quality level
        const passesToQueue = job.passes.filter(
            p => p.quality === job.activeQuality && p.status === 'pending'
        );

        for (const pass of passesToQueue) {
            pass.status = 'queued';
            pass.queuedAt = new Date();
            this.queue.push({ pass, job });
        }

        console.log(`[RenderQueue] Queued ${passesToQueue.length} passes for job ${jobId}`);

        // Start processing if not already
        this.processQueue();

        return job;
    }

    /**
     * Process the render queue
     *
     * REFINEMENT A: Staggered Delay
     * When hitting providers with multiple "Pro" level jobs simultaneously,
     * we add a 500ms delay between job emissions to prevent rate-limit
     * timeouts or safety-filter bottlenecks.
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        if (this.queue.length === 0) return;

        this.isProcessing = true;

        let isFirstPass = true;
        while (this.queue.length > 0) {
            const item = this.queue.shift()!;

            // Staggered delay: Skip delay for first pass, add 500ms for subsequent
            // This prevents hitting the provider API with a sudden burst of requests
            if (!isFirstPass) {
                const delay = item.pass.quality === 'master' ? 750 : 500; // Longer delay for expensive master passes
                console.log(`[RenderQueue] Staggered delay: ${delay}ms before pass ${item.pass.id}`);
                await this.sleep(delay);
            }
            isFirstPass = false;

            await this.renderPass(item.pass, item.job);
        }

        this.isProcessing = false;
    }

    /**
     * Utility: Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Render a single pass
     */
    private async renderPass(pass: RenderPass, job: RenderJob): Promise<void> {
        console.log(`[RenderQueue] Rendering pass ${pass.id} (${pass.quality}) for shot ${pass.shotId}`);
        console.log(`[RenderQueue] Seed source: ${pass.seedSource}, locked seed: ${pass.lockedSeed}`);

        pass.status = 'generating';
        pass.startedAt = new Date();
        pass.updatedAt = new Date();

        try {
            const preset = QUALITY_PRESETS[pass.quality];
            const model = pass.modelOverride || getModelForQuality(pass.quality, true);
            const recipe = pass.recipe;

            // REFINEMENT C: Build watermark text for dailies-style burn-in
            // Only apply to draft/review passes, not master
            let promptWithWatermark = recipe.prompt;
            if (job.watermarkConfig.enabled && pass.quality !== 'master') {
                const watermarkText = buildWatermarkText(pass, job.watermarkConfig);
                // Append watermark instruction to the prompt
                // The model will attempt to render this as subtle text overlay
                promptWithWatermark = `${recipe.prompt}. Small semi-transparent white text overlay at bottom-left corner showing: "${watermarkText}"`;
                console.log(`[RenderQueue] Watermark enabled: ${watermarkText}`);
            }

            // Build generation options from locked recipe
            const options: GenerationOptions = {
                prompt: promptWithWatermark,
                negativePrompt: recipe.negativePrompt,
                model: model,
                aspectRatio: recipe.aspectRatio,
                duration: String(recipe.duration),  // API expects string
                startFrame: recipe.firstFrameUrl,
                endFrame: recipe.lastFrameUrl,
                steps: recipe.inferenceSteps || preset.inferenceSteps,
                guidanceScale: recipe.guidanceScale || preset.guidanceScale,
            };

            // CRITICAL: Use locked seed for deterministic upgrade
            // When promoting Draft→Master, we inherit the seed for consistency
            if (pass.lockedSeed !== undefined) {
                options.seed = pass.lockedSeed;
                console.log(`[RenderQueue] Using locked seed: ${pass.lockedSeed}`);
            }

            // Include LoRAs from recipe if present
            if (recipe.loras && recipe.loras.length > 0) {
                options.loras = recipe.loras;
            }

            // Include element references for IP-Adapter
            if (recipe.elementReferences && recipe.elementReferences.length > 0) {
                options.elementReferences = recipe.elementReferences;
                options.referenceCreativity = recipe.elementStrength || 0.7;
            }

            // Generate video (or image if first frame is being generated)
            const result = await this.generationService.generateVideo(
                recipe.firstFrameUrl,
                options
            );

            if (result.outputs && result.outputs.length > 0) {
                pass.status = 'complete';
                pass.outputUrl = result.outputs[0];  // outputs is string[]
                pass.thumbnailUrl = result.outputs[0];  // Use same URL for thumbnail
                pass.generationId = result.id;
                pass.actualCost = preset.videoCost;  // Use preset cost estimate

                // Store result seed for potential future upgrades
                // This allows: Draft(random seed) → result seed → Master(locked to that seed)
                if ((result as any).seed !== undefined) {
                    pass.resultSeed = (result as any).seed;
                    console.log(`[RenderQueue] Captured result seed: ${pass.resultSeed}`);
                }

                // Store result metadata
                pass.resultMetadata = {
                    model: model,
                    provider: 'fal',  // TODO: Get from GenerationService
                    inferenceTime: pass.startedAt ? Date.now() - pass.startedAt.getTime() : 0,
                };

                job.completedPasses++;
                job.actualCost += pass.actualCost || 0;

                // Update the segment with the output
                await prisma.sceneChainSegment.update({
                    where: { id: pass.shotId },
                    data: {
                        outputUrl: pass.outputUrl,
                        generationId: pass.generationId,
                        status: 'complete',
                    }
                });

                console.log(`[RenderQueue] Pass ${pass.id} complete: ${pass.outputUrl}`);
            } else {
                throw new Error('No output from generation');
            }
        } catch (error) {
            console.error(`[RenderQueue] Pass ${pass.id} failed:`, error);

            pass.status = 'failed';
            pass.failureReason = error instanceof Error ? error.message : 'Unknown error';
            pass.retryCount++;

            job.failedPasses++;

            // Update segment status
            await prisma.sceneChainSegment.update({
                where: { id: pass.shotId },
                data: {
                    status: 'failed',
                    failureReason: pass.failureReason,
                }
            });
        }

        pass.completedAt = new Date();
        pass.updatedAt = new Date();
        job.updatedAt = new Date();

        // Check if job is complete
        this.checkJobCompletion(job);
    }

    /**
     * Check if a job is complete and transition to next quality level if needed
     */
    private checkJobCompletion(job: RenderJob): void {
        const activePasses = job.passes.filter(p => p.quality === job.activeQuality);
        const allComplete = activePasses.every(p => p.status === 'complete' || p.status === 'failed');

        if (!allComplete) return;

        const currentIndex = job.targetQualities.indexOf(job.activeQuality);
        const nextQuality = job.targetQualities[currentIndex + 1];

        if (nextQuality) {
            // Move to next quality level
            console.log(`[RenderQueue] Job ${job.id} advancing from ${job.activeQuality} to ${nextQuality}`);
            job.activeQuality = nextQuality;

            // Queue next quality passes
            const nextPasses = job.passes.filter(p => p.quality === nextQuality && p.status === 'pending');
            for (const pass of nextPasses) {
                pass.status = 'queued';
                pass.queuedAt = new Date();
                this.queue.push({ pass, job });
            }

            this.processQueue();
        } else {
            // Job complete
            const allSucceeded = job.failedPasses === 0;
            job.status = allSucceeded ? 'complete' : 'failed';
            console.log(`[RenderQueue] Job ${job.id} complete. Status: ${job.status}`);
        }
    }

    /**
     * Pause a job
     */
    pauseJob(jobId: string): RenderJob | undefined {
        const job = this.activeJobs.get(jobId);
        if (!job) return undefined;

        job.status = 'paused';
        job.updatedAt = new Date();

        // Remove queued passes from queue
        this.queue = this.queue.filter(item => item.job.id !== jobId);

        return job;
    }

    /**
     * Resume a paused job
     */
    async resumeJob(jobId: string): Promise<RenderJob | undefined> {
        const job = this.activeJobs.get(jobId);
        if (!job || job.status !== 'paused') return undefined;

        return this.startJob(jobId);
    }

    /**
     * Get job status
     */
    getJob(jobId: string): RenderJob | undefined {
        return this.activeJobs.get(jobId);
    }

    /**
     * Get all jobs for a project
     */
    getJobsForProject(projectId: string): RenderJob[] {
        return Array.from(this.activeJobs.values()).filter(j => j.projectId === projectId);
    }

    /**
     * Get render summary for all shots in a scene chain
     */
    getShotSummaries(sceneChainId: string): ShotRenderSummary[] {
        const summaries: Map<string, ShotRenderSummary> = new Map();

        for (const job of this.activeJobs.values()) {
            if (job.sceneChainId !== sceneChainId) continue;

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
     * (Re-render just this shot at higher quality)
     *
     * CRITICAL: This is where seed inheritance happens!
     * The Master pass locks in the seed from the Draft to ensure visual consistency.
     */
    async promoteShot(
        jobId: string,
        shotId: string,
        targetQuality: RenderQuality
    ): Promise<RenderPass> {
        const job = this.activeJobs.get(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        // Find existing pass at current highest quality (the parent)
        const parentPass = job.passes
            .filter(p => p.shotId === shotId && p.status === 'complete')
            .sort((a, b) => {
                const rank = { draft: 1, review: 2, master: 3 };
                return rank[b.quality] - rank[a.quality];
            })[0];

        if (!parentPass) throw new Error(`No completed pass found for shot ${shotId}`);

        // Validate quality upgrade (can't downgrade or stay same)
        const qualityRank = { draft: 1, review: 2, master: 3 };
        if (qualityRank[targetQuality] <= qualityRank[parentPass.quality]) {
            throw new Error(`Cannot promote from ${parentPass.quality} to ${targetQuality}`);
        }

        // Create new pass at target quality with INHERITED recipe and seed
        const newPass: RenderPass = {
            id: uuidv4(),
            shotId: parentPass.shotId,
            sceneChainId: parentPass.sceneChainId,
            quality: targetQuality,
            orderIndex: parentPass.orderIndex,

            // === PARENT-CHILD MAPPING ===
            parentPassId: parentPass.id,  // Link back to parent
            childPassIds: [],

            // === LOCKED RECIPE (inherited exactly from parent) ===
            recipe: { ...parentPass.recipe },

            // === SEED INHERITANCE ===
            // CRITICAL: Lock the seed from parent's result for visual consistency
            lockedSeed: parentPass.resultSeed,
            seedSource: parentPass.resultSeed !== undefined ? 'inherited' : 'random',

            status: 'pending',
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Update parent to track its children
        parentPass.childPassIds = parentPass.childPassIds || [];
        parentPass.childPassIds.push(newPass.id);

        job.passes.push(newPass);
        job.totalPasses++;

        // Reestimate cost
        const est = estimateCost(targetQuality, 1, true);
        job.estimatedCost += est.totalCost;

        console.log(`[RenderQueue] Promoting shot ${shotId} from ${parentPass.quality} to ${targetQuality}`);
        console.log(`[RenderQueue] Parent pass: ${parentPass.id}, seed: ${parentPass.resultSeed}`);
        console.log(`[RenderQueue] New pass: ${newPass.id}, locked seed: ${newPass.lockedSeed}`);

        // Queue immediately
        newPass.status = 'queued';
        newPass.queuedAt = new Date();
        this.queue.push({ pass: newPass, job });

        this.processQueue();

        return newPass;
    }

    /**
     * Get version stack for a shot - shows all quality passes and their outputs
     * Used for UI version switching (v1/v2/v3 display)
     */
    getVersionStack(sceneChainId: string, shotId: string): ShotVersionStack | null {
        // Find all jobs for this chain
        for (const job of this.activeJobs.values()) {
            if (job.sceneChainId !== sceneChainId) continue;

            const shotPasses = job.passes.filter(p => p.shotId === shotId);
            if (shotPasses.length === 0) continue;

            // Get the recipe from the first pass (all should share the same recipe)
            const recipe = shotPasses[0].recipe;

            // Build version list
            const versions = shotPasses
                .sort((a, b) => {
                    const rank = { draft: 1, review: 2, master: 3 };
                    return rank[a.quality] - rank[b.quality];
                })
                .map(pass => ({
                    passId: pass.id,
                    quality: pass.quality,
                    status: pass.status,
                    outputUrl: pass.outputUrl,
                    thumbnailUrl: pass.thumbnailUrl,
                    seed: pass.resultSeed || pass.lockedSeed,
                    model: pass.resultMetadata?.model || getModelForQuality(pass.quality, true),
                    cost: pass.actualCost,
                    createdAt: pass.createdAt,
                }));

            // Determine best available version
            const completedVersions = versions.filter(v => v.status === 'complete');
            const bestVersion = completedVersions.length > 0
                ? completedVersions[completedVersions.length - 1]  // Highest quality complete
                : versions[0];  // Fall back to first

            // Determine upgrade options
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
                shotName: `Shot ${shotPasses[0].orderIndex + 1}`,
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
    getAllVersionStacks(sceneChainId: string): ShotVersionStack[] {
        const stacks: ShotVersionStack[] = [];
        const seenShots = new Set<string>();

        for (const job of this.activeJobs.values()) {
            if (job.sceneChainId !== sceneChainId) continue;

            for (const pass of job.passes) {
                if (seenShots.has(pass.shotId)) continue;
                seenShots.add(pass.shotId);

                const stack = this.getVersionStack(sceneChainId, pass.shotId);
                if (stack) stacks.push(stack);
            }
        }

        return stacks.sort((a, b) => {
            // Sort by shot order
            const aOrder = parseInt(a.shotName.replace('Shot ', '')) || 0;
            const bOrder = parseInt(b.shotName.replace('Shot ', '')) || 0;
            return aOrder - bOrder;
        });
    }

    /**
     * Get cost comparison between draft iteration and master-only workflow
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
        const job = this.activeJobs.get(jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);

        const pass = job.passes.find(p => p.id === passId);
        if (!pass) throw new Error(`Pass ${passId} not found`);
        if (pass.status !== 'failed') throw new Error('Can only retry failed passes');

        pass.status = 'queued';
        pass.failureReason = undefined;
        pass.queuedAt = new Date();
        pass.updatedAt = new Date();

        job.failedPasses--;

        this.queue.push({ pass, job });
        this.processQueue();

        return pass;
    }

    /**
     * Cancel a job completely
     */
    cancelJob(jobId: string): boolean {
        const job = this.activeJobs.get(jobId);
        if (!job) return false;

        // Remove from queue
        this.queue = this.queue.filter(item => item.job.id !== jobId);

        // Mark all pending/queued passes as skipped
        for (const pass of job.passes) {
            if (pass.status === 'pending' || pass.status === 'queued') {
                pass.status = 'skipped';
            }
        }

        job.status = 'failed';
        this.activeJobs.delete(jobId);

        return true;
    }

    /**
     * REFINEMENT B: Get A/B comparison data for a shot
     * Returns two complete passes for side-by-side comparison in the Lightbox
     */
    getPassComparison(
        sceneChainId: string,
        shotId: string,
        qualityA: RenderQuality,
        qualityB: RenderQuality
    ): {
        shotId: string;
        shotName: string;
        passA: {
            passId: string;
            quality: RenderQuality;
            outputUrl: string;
            thumbnailUrl?: string;
            cost: number;
            seed?: number;
            model: string;
        } | null;
        passB: {
            passId: string;
            quality: RenderQuality;
            outputUrl: string;
            thumbnailUrl?: string;
            cost: number;
            seed?: number;
            model: string;
        } | null;
        costDifference: number;
        qualityUpgrade: string;
    } | null {
        const stack = this.getVersionStack(sceneChainId, shotId);
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
     * Returns shots that have at least 2 completed quality passes
     */
    getAvailableComparisons(sceneChainId: string): Array<{
        shotId: string;
        shotName: string;
        availableQualities: RenderQuality[];
    }> {
        const stacks = this.getAllVersionStacks(sceneChainId);
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

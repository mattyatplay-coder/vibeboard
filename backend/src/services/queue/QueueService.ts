/**
 * QueueService - BullMQ wrapper for job queue management
 *
 * Handles:
 * - FFmpeg rendering jobs (bake, export, concat)
 * - GPU generation jobs (image, video)
 * - Background processing jobs (indexing, analysis)
 *
 * This decouples long-running tasks from the Express API to prevent
 * serverless timeouts and enable horizontal scaling.
 */

import { Queue, QueueEvents, Job, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

// Job type definitions
export type JobType = 'render' | 'generation' | 'indexing' | 'export' | 'analysis' | 'training';

export interface RenderJobData {
    type: 'bake' | 'concat' | 'transcode' | 'thumbnail';
    projectId: string;
    sceneChainId?: string;
    segmentIds?: string[];
    inputPaths: string[];
    outputPath: string;
    options?: {
        codec?: 'h264' | 'prores';
        fps?: number;
        resolution?: string;
        quality?: number;
    };
}

export interface GenerationJobData {
    type: 'image' | 'video' | 'upscale' | 'enhance';
    generationId: string;
    projectId: string;
    model: string;
    prompt: string;
    options?: Record<string, unknown>;
}

export interface IndexingJobData {
    type: 'semantic' | 'vector' | 'batch';
    projectId: string;
    generationIds?: string[];
    force?: boolean;
}

export interface ExportJobData {
    type: 'epk' | 'master' | 'edl' | 'sidecar';
    projectId: string;
    sceneChainId: string;
    format?: string;
    options?: Record<string, unknown>;
}

export interface AnalysisJobData {
    type: 'vision' | 'lighting' | 'composition';
    generationId: string;
    imageUrl: string;
    options?: Record<string, unknown>;
}

export interface TrainingJobData {
    type: 'curate' | 'start' | 'generate_dataset';
    jobId: string;
    projectId: string;
    datasetPath?: string;
    uploadedFiles?: string[];
    referenceFiles?: string[];
    triggerWord?: string;
    options?: Record<string, unknown>;
}

export type QueueJobData =
    | RenderJobData
    | GenerationJobData
    | IndexingJobData
    | ExportJobData
    | AnalysisJobData
    | TrainingJobData;

export interface JobResult {
    success: boolean;
    data?: unknown;
    error?: string;
    duration?: number;
}

// Queue names (BullMQ doesn't allow colons in queue names)
const QUEUE_NAMES = {
    render: 'vibeboard-render',
    generation: 'vibeboard-generation',
    indexing: 'vibeboard-indexing',
    export: 'vibeboard-export',
    analysis: 'vibeboard-analysis',
    training: 'vibeboard-training',
} as const;

// Default job options by queue type
const DEFAULT_JOB_OPTIONS: Record<JobType, JobsOptions> = {
    render: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
    generation: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
    },
    indexing: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 200 },
    },
    export: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 25 },
    },
    analysis: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 50 },
    },
    training: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 25 },
    },
};

class QueueService {
    private static instance: QueueService;
    private connection: IORedis | null = null;
    private queues: Map<JobType, Queue> = new Map();
    private queueEvents: Map<JobType, QueueEvents> = new Map();
    private initialized = false;

    private constructor() {}

    static getInstance(): QueueService {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }

    /**
     * Initialize Redis connection and queues
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[QueueService] Already initialized');
            return;
        }

        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        try {
            console.log(`[QueueService] Connecting to Redis at ${redisUrl}...`);

            this.connection = new IORedis(redisUrl, {
                maxRetriesPerRequest: null, // Required by BullMQ
                enableReadyCheck: false,
                retryStrategy: (times) => {
                    if (times > 10) {
                        console.error('[QueueService] Redis connection failed after 10 retries');
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
            });

            this.connection.on('connect', () => {
                console.log('[QueueService] Redis connected');
            });

            this.connection.on('error', (err) => {
                console.error('[QueueService] Redis error:', err.message);
            });

            // Wait for connection
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Redis connection timeout'));
                }, 10000);

                this.connection!.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.connection!.once('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });

            // Initialize queues
            for (const [type, name] of Object.entries(QUEUE_NAMES)) {
                const queue = new Queue(name, { connection: this.connection });
                const events = new QueueEvents(name, { connection: this.connection });

                this.queues.set(type as JobType, queue);
                this.queueEvents.set(type as JobType, events);

                console.log(`[QueueService] Queue '${name}' initialized`);
            }

            this.initialized = true;
            console.log('[QueueService] All queues initialized successfully');
        } catch (error) {
            console.error('[QueueService] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check if queue system is available (Redis connected)
     */
    isAvailable(): boolean {
        return this.initialized && this.connection?.status === 'ready';
    }

    /**
     * Add a job to a queue
     */
    async addJob<T extends QueueJobData>(
        queueType: JobType,
        data: T,
        options?: Partial<JobsOptions>
    ): Promise<Job<T>> {
        if (!this.initialized) {
            throw new Error('QueueService not initialized. Call initialize() first.');
        }

        const queue = this.queues.get(queueType);
        if (!queue) {
            throw new Error(`Queue '${queueType}' not found`);
        }

        const jobOptions: JobsOptions = {
            ...DEFAULT_JOB_OPTIONS[queueType],
            ...options,
        };

        const job = await queue.add(data.type, data, jobOptions);
        console.log(`[QueueService] Job added to '${queueType}': ${job.id} (${data.type})`);

        return job as Job<T>;
    }

    /**
     * Add a render job (FFmpeg operations)
     */
    async addRenderJob(data: RenderJobData, options?: Partial<JobsOptions>): Promise<Job<RenderJobData>> {
        return this.addJob('render', data, options);
    }

    /**
     * Add a generation job (AI image/video)
     */
    async addGenerationJob(data: GenerationJobData, options?: Partial<JobsOptions>): Promise<Job<GenerationJobData>> {
        return this.addJob('generation', data, options);
    }

    /**
     * Add an indexing job (semantic search)
     */
    async addIndexingJob(data: IndexingJobData, options?: Partial<JobsOptions>): Promise<Job<IndexingJobData>> {
        return this.addJob('indexing', data, options);
    }

    /**
     * Add an export job (EPK, master, EDL)
     */
    async addExportJob(data: ExportJobData, options?: Partial<JobsOptions>): Promise<Job<ExportJobData>> {
        return this.addJob('export', data, options);
    }

    /**
     * Add an analysis job (vision, lighting)
     */
    async addAnalysisJob(data: AnalysisJobData, options?: Partial<JobsOptions>): Promise<Job<AnalysisJobData>> {
        return this.addJob('analysis', data, options);
    }

    /**
     * Add a training job (dataset curation, LoRA training)
     */
    async addTrainingJob(data: TrainingJobData, options?: Partial<JobsOptions>): Promise<Job<TrainingJobData>> {
        return this.addJob('training', data, options);
    }

    /**
     * Get job by ID
     */
    async getJob(queueType: JobType, jobId: string): Promise<Job | null> {
        const queue = this.queues.get(queueType);
        if (!queue) return null;
        const job = await queue.getJob(jobId);
        return job ?? null;
    }

    /**
     * Get job status with progress and result
     */
    async getJobStatus(queueType: JobType, jobId: string): Promise<{
        state: string;
        progress?: number;
        result?: JobResult;
    } | null> {
        const job = await this.getJob(queueType, jobId);
        if (!job) return null;

        const state = await job.getState();
        const progress = job.progress as number | undefined;

        let result: JobResult | undefined;
        if (state === 'completed') {
            result = {
                success: true,
                data: job.returnvalue,
            };
        } else if (state === 'failed') {
            result = {
                success: false,
                error: job.failedReason || 'Unknown error',
            };
        }

        return { state, progress, result };
    }

    /**
     * Wait for a job to complete
     */
    async waitForJob<T = unknown>(
        queueType: JobType,
        jobId: string,
        timeoutMs = 300000 // 5 minutes default
    ): Promise<JobResult> {
        const events = this.queueEvents.get(queueType);
        if (!events) {
            throw new Error(`Queue events for '${queueType}' not found`);
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timeout);
                events.off('completed', onCompleted);
                events.off('failed', onFailed);
            };

            const onCompleted = (args: { jobId: string; returnvalue: string }) => {
                if (args.jobId === jobId) {
                    cleanup();
                    resolve({
                        success: true,
                        data: JSON.parse(args.returnvalue || '{}'),
                    });
                }
            };

            const onFailed = (args: { jobId: string; failedReason: string }) => {
                if (args.jobId === jobId) {
                    cleanup();
                    resolve({
                        success: false,
                        error: args.failedReason,
                    });
                }
            };

            events.on('completed', onCompleted);
            events.on('failed', onFailed);
        });
    }

    /**
     * Get queue statistics
     */
    async getStats(queueType?: JobType): Promise<Record<string, unknown>> {
        const stats: Record<string, unknown> = {};

        const queuesToCheck = queueType
            ? [[queueType, this.queues.get(queueType)]] as [JobType, Queue | undefined][]
            : Array.from(this.queues.entries());

        for (const [type, queue] of queuesToCheck) {
            if (!queue) continue;

            const [waiting, active, completed, failed, delayed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
            ]);

            stats[type] = { waiting, active, completed, failed, delayed };
        }

        return stats;
    }

    /**
     * Clean up old jobs
     */
    async cleanOldJobs(queueType: JobType, maxAgeMs = 86400000): Promise<void> {
        const queue = this.queues.get(queueType);
        if (!queue) return;

        await queue.clean(maxAgeMs, 1000, 'completed');
        await queue.clean(maxAgeMs, 1000, 'failed');
        console.log(`[QueueService] Cleaned old jobs from '${queueType}'`);
    }

    /**
     * Get the raw queue instance (for workers)
     */
    getQueue(queueType: JobType): Queue | undefined {
        return this.queues.get(queueType);
    }

    /**
     * Get Redis connection (for workers)
     */
    getConnection(): IORedis | null {
        return this.connection;
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        console.log('[QueueService] Shutting down...');

        for (const [type, events] of this.queueEvents.entries()) {
            await events.close();
            console.log(`[QueueService] Queue events '${type}' closed`);
        }

        for (const [type, queue] of this.queues.entries()) {
            await queue.close();
            console.log(`[QueueService] Queue '${type}' closed`);
        }

        if (this.connection) {
            await this.connection.quit();
            console.log('[QueueService] Redis connection closed');
        }

        this.initialized = false;
    }
}

export const queueService = QueueService.getInstance();
export default QueueService;

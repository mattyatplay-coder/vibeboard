
import { Queue, Worker, QueueEvents } from 'bullmq';
import { GenerationJobService } from './GenerationJobService';

const QUEUE_NAME = 'generations';
const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

class QueueService {
    private queue: Queue;
    private worker: Worker | null = null;
    private queueEvents: QueueEvents;

    constructor() {
        console.log(`[QueueService] Initializing queue '${QUEUE_NAME}' on ${REDIS_CONNECTION.host}:${REDIS_CONNECTION.port}`);

        this.queue = new Queue(QUEUE_NAME, {
            connection: REDIS_CONNECTION,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 100, // Keep last 100 jobs
                removeOnFail: 200     // Keep last 200 failed jobs
            }
        });

        this.queueEvents = new QueueEvents(QUEUE_NAME, { connection: REDIS_CONNECTION });

        this.initWorker();
    }

    private initWorker() {
        if (this.worker) return;

        this.worker = new Worker(QUEUE_NAME, async (job) => {
            console.log(`[Worker] Starting job ${job.id} (Generation ${job.data.generationId})`);
            await GenerationJobService.processJob(job.data.generationId);
            console.log(`[Worker] Finished job ${job.id}`);
        }, {
            connection: REDIS_CONNECTION,
            concurrency: 2, // Process 2 generations in parallel if possible
            lockDuration: 300000 // 5 minutes lock
        });

        this.worker.on('completed', job => {
            console.log(`[Worker] Job ${job.id} completed successfully`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
        });

        this.worker.on('error', err => {
            // Redis connection lost, etc.
            console.error(`[Worker] Worker error: ${err.message}`);
        });
    }

    async addJob(generationId: string) {
        // Use generationId as jobId to prevent duplicates if user hammers button?
        // Actually unique ID per attempt is acceptable.
        await this.queue.add('generate', { generationId }, {
            jobId: generationId // Ensure idempotency mostly
        });
        console.log(`[QueueService] Added generation ${generationId} to queue`);
    }

    async getQueueStatus() {
        const counts = await this.queue.getJobCounts('active', 'waiting', 'completed', 'failed');
        return {
            active: counts.active || 0,
            waiting: counts.waiting || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            isWorkerRunning: !!this.worker && !this.worker.isPaused()
        };
    }
}

// Singleton instance
export const queueService = new QueueService();

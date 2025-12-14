import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { falTrainingService } from '../services/training/FalTrainingService';
import { replicateTrainingService } from '../services/training/ReplicateTrainingService';
import path from 'path';
import fs from 'fs';
import { DatasetService } from '../services/DatasetService'; // Import DatasetService

const datasetService = new DatasetService(); // Instantiate
// @ts-ignore - Prisma client types might not be fully updated in IDE
// const prisma = new PrismaClient();

export const trainingController = {

    // Create a new job entry
    createJob: async (req: Request, res: Response) => {
        try {
            const { projectId, name, triggerWord, steps, provider } = req.body;

            if (!projectId || !name || !triggerWord) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const job = await prisma.trainingJob.create({
                data: {
                    projectId,
                    name,
                    triggerWord,
                    datasetUrl: '', // Will be updated after upload
                    status: 'uploading',
                    steps: steps ? parseInt(steps) : 1000,
                    // @ts-ignore - Prisma types update lag
                    provider: provider || 'fal'
                }
            });

            res.json(job);
        } catch (error: any) {
            console.error('Create job failed:', error);
            res.status(500).json({ error: 'Failed to create job' });
        }
    },

    // STAGE 1: Curation
    curateJob: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { datasetPath } = req.body;
            const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
            const trainingFiles = filesMap['images'] || [];
            const referenceFiles = filesMap['reference_images'] || [];

            const hasDatasetPath = datasetPath && typeof datasetPath === 'string' && datasetPath.trim().length > 0;

            if ((!trainingFiles || trainingFiles.length === 0) && !hasDatasetPath) {
                return res.status(400).json({ error: 'No data provided for curation' });
            }

            console.log(`[Curation] Job ${id} - Starting Smart Curation...`);

            // Output Directory for Curated Files
            const curatedDir = path.resolve(__dirname, `../../datasets/job_${id}_curated`);
            if (!fs.existsSync(curatedDir)) fs.mkdirSync(curatedDir, { recursive: true });

            // 1. Gather Candidates
            let candidates: string[] = [];

            // A. Local Path
            if (hasDatasetPath && fs.existsSync(datasetPath)) {
                const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
                    const files = fs.readdirSync(dirPath);
                    files.forEach(function (file) {
                        const fullPath = path.join(dirPath, file);
                        if (fs.statSync(fullPath).isDirectory()) {
                            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
                        } else {
                            arrayOfFiles.push(fullPath);
                        }
                    });
                    return arrayOfFiles;
                };

                const localFiles = getAllFiles(datasetPath);
                for (const lf of localFiles) {
                    const ext = path.extname(lf).toLowerCase();
                    if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
                        // Extract frames from local video
                        const frameDir = path.join(path.resolve(__dirname, '../../uploads/temp_frames'), `job_${id}_local_${path.basename(lf)}`);
                        if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });
                        try {
                            const frames = await datasetService.extractFramesFromVideo(lf, frameDir);
                            candidates.push(...frames);
                        } catch (e) { console.error(`Local video frame extraction failed for ${lf}`, e); }
                    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                        candidates.push(lf);
                    }
                }
            }

            // B. Uploaded Files
            for (const file of trainingFiles) {
                if (file.mimetype.startsWith('video/')) {
                    const frameDir = path.join(path.dirname(file.path), `job_${id}_frames_${path.basename(file.filename)}`);
                    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir);
                    try {
                        const frames = await datasetService.extractFramesFromVideo(file.path, frameDir);
                        candidates.push(...frames);
                    } catch (e) { console.error(`Frame extraction failed`, e); }
                } else {
                    candidates.push(file.path);
                }
            }

            // 2. Reference Embedding (if any)
            let referenceEmbedding: number[] | null = null;
            if (referenceFiles.length > 0) {
                const refPaths = referenceFiles.map(f => f.path);
                try {
                    referenceEmbedding = await datasetService.calculateReferenceEmbedding(refPaths);
                } catch (e) { console.error("Ref embedding failed", e); }
            }

            // 3. Selection & Processing
            // We want to process ALL valid candidates if no limit, but typically we want top 75
            // But user might want to curate EVERYTHING. Let's cap at 100 for now.
            const selected = await datasetService.curateDataset(candidates, referenceEmbedding, 100);

            // 4. Process and Save to Final Directory
            let processCount = 0;
            for (const candidate of selected) {
                try {
                    // Use processedImage which crops/removes BG
                    // We need to bypass DatasetService's internal path logic slightly by giving it our curatedDir name
                    // But DatasetService joins paths relative to datasetsDir.
                    // Let's manually move the result.

                    // Actually, let's just use processImage and then move key files? 
                    // processImage writes to datasets/datasetName
                    const result = await datasetService.processImage(candidate, `job_${id}_curated`, referenceEmbedding);
                    if (result.status === 'success') processCount++;
                } catch (e) { console.error("Processing failed", e); }
            }

            // Cleanup Inputs
            [...trainingFiles, ...referenceFiles].forEach(f => {
                if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });

            // Update Job Status
            await prisma.trainingJob.update({
                where: { id },
                data: { status: 'completed_curation' }
            });

            res.json({
                message: 'Curation complete',
                count: processCount,
                curatedPath: curatedDir
            });

        } catch (error: any) {
            console.error('Curation failed:', error);
            res.status(500).json({ error: 'Curation failed' });
        }
    },

    // STAGE 2: Start Training (from curated folder)
    startJob: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { baseModel, datasetPath } = req.body;

            // Validation
            if (!datasetPath || !fs.existsSync(datasetPath)) {
                return res.status(400).json({ error: 'Valid dataset path is required for training' });
            }

            const job = await prisma.trainingJob.findUnique({ where: { id } });
            if (!job) return res.status(404).json({ error: 'Job not found' });

            // 1. Zip the folder
            const uploadDir = path.resolve(__dirname, '../../uploads/temp');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            // We need to list files in datasetPath
            const files = fs.readdirSync(datasetPath)
                .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.txt'))
                .map(f => path.join(datasetPath, f));

            if (files.length === 0) {
                return res.status(400).json({ error: 'No images found in dataset folder' });
            }

            const zipPath = await falTrainingService.createDatasetZip(files, uploadDir);

            // 2. Upload to Fal
            const datasetUrl = await falTrainingService.uploadDataset(zipPath);

            // 3. Start Training
            let requestId;
            // @ts-ignore
            if (job.provider === 'replicate') {
                requestId = await replicateTrainingService.createTraining(
                    datasetUrl,
                    job.triggerWord,
                    job.steps,
                    job.isStyle,
                    job.name
                );
            } else {
                requestId = await falTrainingService.startTraining(
                    datasetUrl,
                    job.triggerWord,
                    job.steps,
                    baseModel as 'fast' | 'dev'
                );
            }

            // 4. Update Job
            const updatedJob = await prisma.trainingJob.update({
                where: { id },
                data: {
                    datasetUrl,
                    providerJobId: requestId,
                    status: 'training'
                }
            });

            // Cleanup Zip
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

            res.json(updatedJob);

        } catch (error: any) {
            console.error('Start job failed:', error);
            res.status(500).json({ error: error.message || 'Failed to start training' });
        }
    },

    // Get all jobs for a project
    getJobs: async (req: Request, res: Response) => {
        try {
            const { projectId } = req.query;
            if (!projectId) return res.status(400).json({ error: 'Project ID required' });

            const jobs = await prisma.trainingJob.findMany({
                where: { projectId: String(projectId) },
                orderBy: { createdAt: 'desc' }
            });

            // Update status for active jobs
            const updatedJobs = await Promise.all(jobs.map(async (job: any) => {
                if (job.status === 'training' && job.providerJobId) {
                    try {
                        let status;
                        let result;

                        if (job.provider === 'replicate') {
                            status = await replicateTrainingService.getStatus(job.providerJobId);
                            // If completed, fetch result immediately or getResult handles it
                        } else {
                            status = await falTrainingService.getStatus(job.providerJobId);
                        }

                        let newStatus = job.status;
                        let loraUrl = job.loraUrl;
                        let error = job.error;

                        if (status.status === 'COMPLETED') {
                            newStatus = 'completed';

                            if (job.provider === 'replicate') {
                                result = await replicateTrainingService.getResult(job.providerJobId);
                            } else {
                                result = await falTrainingService.getResult(job.providerJobId);
                            }

                            // Assuming result structure: { lora_path: "url" } or similar
                            // Need to verify actual Fal output structure
                            if (result.diffusers_lora_file?.url) {
                                loraUrl = result.diffusers_lora_file.url;
                            }
                        } else if (status.status === 'FAILED') {
                            newStatus = 'failed';
                            error = status.error || 'Training failed';
                        }

                        if (newStatus !== job.status) {
                            return await prisma.trainingJob.update({
                                where: { id: job.id },
                                data: { status: newStatus, loraUrl, error }
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to update status for job ${job.id}`, e);
                    }
                }
                return job;
            }));

            res.json(updatedJobs);
        } catch (error: any) {
            console.error('Get jobs failed:', error);
            res.status(500).json({ error: 'Failed to fetch jobs' });
        }
    },

    // Delete a job
    deleteJob: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const job = await prisma.trainingJob.delete({
                where: { id }
            });
            res.json({ message: 'Job deleted successfully', id: job.id });
        } catch (error: any) {
            console.error('Delete job failed:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Job not found' });
            }
            res.status(500).json({ error: 'Failed to delete job' });
        }
    }
};

import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { falTrainingService } from '../services/training/FalTrainingService';
import { replicateTrainingService } from '../services/training/ReplicateTrainingService';
import path from 'path';
import fs from 'fs';
import { DatasetService } from '../services/DatasetService'; // Import DatasetService
import { DatasetGeneratorService, POSE_PRESETS, PosePresetKey, CustomPosePresetData } from '../services/training/DatasetGeneratorService';

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
        const { id } = req.params;
        let zipPath: string | null = null;

        try {
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

            zipPath = await falTrainingService.createDatasetZip(files, uploadDir);

            // 2. Upload to Fal
            let datasetUrl: string;
            try {
                datasetUrl = await falTrainingService.uploadDataset(zipPath);
            } catch (uploadError: any) {
                console.error('[TrainingController] Dataset upload failed:', uploadError);
                await prisma.trainingJob.update({
                    where: { id },
                    data: {
                        status: 'failed',
                        error: 'Dataset upload failed. Please ensure your images are valid PNG/JPG files and try again.'
                    }
                });
                throw new Error('Dataset upload failed');
            }

            // 3. Start Training
            let requestId: string;
            try {
                // @ts-ignore
                if (baseModel === 'wan-video') {
                    // NEW: Wan Video Training
                    requestId = await falTrainingService.startWanTraining(
                        datasetUrl,
                        job.triggerWord,
                        job.steps,
                        // webhookUrl could be added here
                    );
                } else if (job.provider === 'replicate') {
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
            } catch (trainingError: any) {
                console.error('[TrainingController] Training start failed:', trainingError);

                // Parse Fal error for user-friendly message
                let userMessage = 'Training failed to start. Please try again.';
                const errorStr = JSON.stringify(trainingError);

                if (errorStr.includes('octet') || errorStr.includes('unpack')) {
                    userMessage = 'Dataset format error: The training data must be uploaded as a valid .zip archive. This can happen if your images are corrupted or the upload was interrupted. Please try again with fresh images.';
                } else if (errorStr.includes('images_data_url')) {
                    userMessage = 'Invalid dataset: Please ensure your training folder contains valid PNG or JPG images (at least 5-10 images recommended).';
                } else if (trainingError.message) {
                    userMessage = trainingError.message;
                }

                await prisma.trainingJob.update({
                    where: { id },
                    data: {
                        status: 'failed',
                        error: userMessage
                    }
                });
                throw new Error(userMessage);
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
            if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

            res.json(updatedJob);

        } catch (error: any) {
            console.error('Start job failed:', error);
            // Cleanup Zip on error
            if (zipPath && fs.existsSync(zipPath)) {
                try { fs.unlinkSync(zipPath); } catch (e) { /* ignore */ }
            }
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
    },

    // Get available pose presets for UI (built-in + custom)
    getPosePresets: async (req: Request, res: Response) => {
        try {
            const { projectId } = req.query;

            // 1. Get built-in presets
            const builtInPresets = DatasetGeneratorService.getPresetOptions().map(p => ({
                ...p,
                isBuiltIn: true,
                id: p.key // Use key as id for built-ins
            }));

            // 2. Get custom presets (global + project-specific)
            const customPresets = await prisma.customPosePreset.findMany({
                where: {
                    OR: [
                        { projectId: null }, // Global presets
                        { projectId: projectId ? String(projectId) : undefined } // Project-specific
                    ].filter(Boolean)
                },
                orderBy: { createdAt: 'desc' }
            });

            const formattedCustom = customPresets.map((p: any) => ({
                key: `custom_${p.id}`,
                id: p.id,
                name: p.name,
                description: p.description || 'Custom preset',
                stylePrefix: p.stylePrefix,
                poses: JSON.parse(p.poses || '[]'),
                isBuiltIn: false,
                projectId: p.projectId
            }));

            res.json({
                presets: [...builtInPresets, ...formattedCustom],
                builtIn: builtInPresets,
                custom: formattedCustom
            });
        } catch (error: any) {
            console.error('Get pose presets failed:', error);
            res.status(500).json({ error: 'Failed to fetch pose presets' });
        }
    },

    // Create a custom pose preset
    createCustomPreset: async (req: Request, res: Response) => {
        try {
            const { projectId, name, description, stylePrefix, poses } = req.body;

            if (!name || !poses || !Array.isArray(poses) || poses.length === 0) {
                return res.status(400).json({ error: 'Name and at least one pose are required' });
            }

            const preset = await prisma.customPosePreset.create({
                data: {
                    projectId: projectId || null, // null = global
                    name,
                    description: description || null,
                    stylePrefix: stylePrefix || null,
                    poses: JSON.stringify(poses)
                }
            });

            res.json({
                key: `custom_${preset.id}`,
                id: preset.id,
                name: preset.name,
                description: preset.description,
                stylePrefix: preset.stylePrefix,
                poses: JSON.parse(preset.poses),
                isBuiltIn: false,
                projectId: preset.projectId
            });
        } catch (error: any) {
            console.error('Create custom preset failed:', error);
            res.status(500).json({ error: 'Failed to create custom preset' });
        }
    },

    // Update a custom pose preset
    updateCustomPreset: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, stylePrefix, poses } = req.body;

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (stylePrefix !== undefined) updateData.stylePrefix = stylePrefix;
            if (poses !== undefined) updateData.poses = JSON.stringify(poses);

            const preset = await prisma.customPosePreset.update({
                where: { id },
                data: updateData
            });

            res.json({
                key: `custom_${preset.id}`,
                id: preset.id,
                name: preset.name,
                description: preset.description,
                stylePrefix: preset.stylePrefix,
                poses: JSON.parse(preset.poses),
                isBuiltIn: false,
                projectId: preset.projectId
            });
        } catch (error: any) {
            console.error('Update custom preset failed:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Preset not found' });
            }
            res.status(500).json({ error: 'Failed to update custom preset' });
        }
    },

    // Delete a custom pose preset
    deleteCustomPreset: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            await prisma.customPosePreset.delete({
                where: { id }
            });

            res.json({ message: 'Preset deleted successfully', id });
        } catch (error: any) {
            console.error('Delete custom preset failed:', error);
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Preset not found' });
            }
            res.status(500).json({ error: 'Failed to delete custom preset' });
        }
    },

    // Get a single custom preset with full pose list
    getCustomPreset: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const preset = await prisma.customPosePreset.findUnique({
                where: { id }
            });

            if (!preset) {
                return res.status(404).json({ error: 'Preset not found' });
            }

            res.json({
                key: `custom_${preset.id}`,
                id: preset.id,
                name: preset.name,
                description: preset.description,
                stylePrefix: preset.stylePrefix,
                poses: JSON.parse(preset.poses),
                isBuiltIn: false,
                projectId: preset.projectId
            });
        } catch (error: any) {
            console.error('Get custom preset failed:', error);
            res.status(500).json({ error: 'Failed to fetch preset' });
        }
    },

    // STAGE 0: Generate Synthetic Dataset
    generateDataset: async (req: Request, res: Response) => {
        try {
            console.log("Generate dataset request received");
            const { projectId, triggerWord, prompt, characterDescription, posePreset } = req.body;
            let { id } = req.params;

            if (!req.file) {
                return res.status(400).json({ error: 'Source image is required' });
            }

            const sourcePath = req.file.path;

            // Determine preset: built-in key or custom preset from database
            let presetToUse: PosePresetKey | CustomPosePresetData = 'universal';

            if (posePreset) {
                if (posePreset.startsWith('custom_')) {
                    // Custom preset - fetch from database
                    const customId = posePreset.replace('custom_', '');
                    const customPreset = await prisma.customPosePreset.findUnique({
                        where: { id: customId }
                    });

                    if (customPreset) {
                        presetToUse = {
                            name: customPreset.name,
                            description: customPreset.description || undefined,
                            stylePrefix: customPreset.stylePrefix || undefined,
                            poses: JSON.parse(customPreset.poses || '[]')
                        };
                        console.log(`[Controller] Using custom preset: ${customPreset.name}`);
                    } else {
                        console.warn(`[Controller] Custom preset ${customId} not found, using universal`);
                    }
                } else if (posePreset in POSE_PRESETS) {
                    // Built-in preset
                    presetToUse = posePreset as PosePresetKey;
                }
            }

            // Import dynamically to avoid circular dependencies
            const { datasetGenerator } = require('../services/training/DatasetGeneratorService');

            // 1. Update Job Status
            await prisma.trainingJob.update({
                where: { id },
                data: { status: 'processing_dataset' }
            });

            // 2. Start Background Process
            // Pass characterDescription and preset to the generator
            console.log(`[Controller] Starting dataset generation for job ${id}...`);
            console.log(`[Controller] Source: ${sourcePath}`);
            console.log(`[Controller] Trigger: ${triggerWord}`);
            console.log(`[Controller] Preset: ${typeof presetToUse === 'string' ? presetToUse : presetToUse.name}`);
            console.log(`[Controller] Description: ${characterDescription?.substring(0, 100)}...`);

            datasetGenerator.generateVariations(sourcePath, triggerWord, prompt, projectId, id, characterDescription, presetToUse)
                .then(async (result: any) => {
                    // Success
                    console.log(`[Controller] Job ${id} generation complete. Updating status...`);
                    try {
                        await prisma.trainingJob.update({
                            where: { id },
                            data: {
                                status: 'generated_dataset', // New status
                                datasetUrl: result.outputDir // Save the output path
                            }
                        });
                        console.log(`[Controller] ✅ Job ${id} status updated to 'generated_dataset'. Generated ${result.count} images at ${result.outputDir}`);
                    } catch (dbErr: any) {
                        console.error(`[Controller] ❌ Failed to update job ${id} status:`, dbErr);
                    }
                })
                .catch(async (err: any) => {
                    console.error(`[Controller] ❌ Job ${id} generation failed:`, err);
                    try {
                        await prisma.trainingJob.update({
                            where: { id },
                            data: { status: 'failed', error: err.message || 'Unknown generation error' }
                        });
                        console.log(`[Controller] Job ${id} marked as failed in database.`);
                    } catch (dbErr: any) {
                        console.error(`[Controller] ❌ Failed to update job ${id} failure status:`, dbErr);
                    }
                });

            res.json({ message: 'Dataset generation started', jobId: id, status: 'processing_dataset' });

        } catch (error: any) {
            console.error('Generate dataset failed:', error);
            res.status(500).json({ error: 'Failed to start generation' });
        }
    },

    getJobDataset: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Construct path: datasets/synthetic_{id}
            const datasetDir = path.resolve(__dirname, '../../datasets', `synthetic_${id}`);

            if (!fs.existsSync(datasetDir)) {
                return res.json({ images: [] });
            }

            const files = fs.readdirSync(datasetDir)
                .filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'));

            // Convert to server URLs
            // URL format: /datasets/synthetic_{id}/{filename}
            const images = files.map(f => ({
                filename: f,
                url: `/datasets/synthetic_${id}/${f}`
            }));

            res.json({ images });
        } catch (error: any) {
            console.error("Get dataset error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    deleteDatasetImage: async (req: Request, res: Response) => {
        try {
            const { id, filename } = req.params;
            const datasetDir = path.resolve(__dirname, '../../datasets', `synthetic_${id}`);
            const filePath = path.join(datasetDir, filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);

                // Also delete caption txt if exists
                const captionPath = filePath.replace(/\.(png|jpg)$/i, '.txt');
                if (fs.existsSync(captionPath)) fs.unlinkSync(captionPath);

                res.json({ success: true });
            } else {
                res.status(404).json({ error: "File not found" });
            }
        } catch (error: any) {
            console.error("Delete image error:", error);
            res.status(500).json({ error: error.message });
        }
    }
};

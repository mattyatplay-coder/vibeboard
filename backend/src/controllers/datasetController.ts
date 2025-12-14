import { Request, Response } from 'express';
import { DatasetService } from '../services/DatasetService';
import path from 'path';
import fs from 'fs'; // Added fs import

const datasetService = new DatasetService();

export const createDataset = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        // Handle multer fields
        const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
        const files = filesMap['files'] || [];
        const referenceFiles = filesMap['referenceFiles'] || [];

        if (!name) {
            res.status(400).json({ error: 'Dataset name is required' });
            return;
        }

        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return;
        }

        console.log(`[DatasetController] Received ${files.length} dataset files and ${referenceFiles.length} reference files for dataset "${name}"`);

        // Process files asynchronously to avoid timeout
        (async () => {
            console.log(`[DatasetController] Starting background processing...`);

            // 1. Calculate Reference Embedding
            let referenceEmbedding: number[] | null = null;
            if (referenceFiles.length > 0) {
                const referencePaths = referenceFiles.map(f => f.path);
                try {
                    referenceEmbedding = await datasetService.calculateReferenceEmbedding(referencePaths);
                } catch (error) {
                    console.error("Failed to calculate reference embedding:", error);
                }
            }

            // 2. Expand Dataset Candidates (Handle Videos)
            let candidates: string[] = [];
            const tempDirsToDelete: string[] = []; // Track temp dirs for video frames to cleanup later

            for (const file of files) {
                if (file.mimetype.startsWith('video/')) {
                    // Create a temp dir for this video's frames
                    const frameDir = path.join(path.dirname(file.path), `frames_${path.basename(file.filename)}`);
                    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir);
                    tempDirsToDelete.push(frameDir);

                    try {
                        const frames = await datasetService.extractFramesFromVideo(file.path, frameDir);
                        candidates.push(...frames);
                        console.log(`[DatasetController] Extracted ${frames.length} frames from ${file.originalname}`);
                    } catch (err) {
                        console.error(`Failed to extract frames from ${file.originalname}`, err);
                    }
                } else if (file.mimetype.startsWith('image/')) {
                    candidates.push(file.path);
                }
            }

            console.log(`[DatasetController] Total candidates before curation: ${candidates.length}`);

            // 3. Curate Dataset (Select Best N)
            // Limit to 75 by default to get "50-100" range roughly
            const selectedCandidates = await datasetService.curateDataset(candidates, referenceEmbedding, 75);

            console.log(`[DatasetController] Proceeding with ${selectedCandidates.length} selected items.`);

            // 4. Process Selected Items
            for (const filePath of selectedCandidates) {
                try {
                    await datasetService.processImage(filePath, name, referenceEmbedding);
                } catch (e: any) {
                    console.error(`Failed to process ${path.basename(filePath)}:`, e);
                }
            }

            console.log(`[DatasetController] Finished processing dataset "${name}"`);

            // 5. Cleanup
            // Cleanup reference files
            if (referenceFiles.length > 0) {
                referenceFiles.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
            }
            // Cleanup uploaded files (both images and videos)
            // Note: We processed images directly from upload path, so we should delete them now.
            // But wait, what if we want to keep them? Usually temp uploads are transient.
            // Let's delete them to save space.
            files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });

            // Cleanup temp frame directories
            tempDirsToDelete.forEach(dir => {
                if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
            });

        })();

        // Respond immediately that processing started
        res.status(202).json({
            message: 'Dataset processing started',
            fileCount: files.length,
            referenceCount: referenceFiles.length,
            datasetName: name,
            note: "Processing video frames and selecting best candidates in background."
        });

    } catch (error: any) {
        console.error('Create dataset failed:', error);
        res.status(500).json({ error: error.message });
    }
};

export const listDatasets = async (req: Request, res: Response) => {
    // TODO: Implement listing logic reading from datasets dir
    res.json({ datasets: [] });
};

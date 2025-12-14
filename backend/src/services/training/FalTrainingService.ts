import * as fal from "@fal-ai/serverless-client";
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Configure Fal
fal.config({
    credentials: process.env.FAL_KEY || '',
});

export class FalTrainingService {

    /**
     * Create a zip file from a list of image paths
     */
    async createDatasetZip(imagePaths: string[], outputDir: string): Promise<string> {
        console.log(`[FalTrainingService] Starting zip creation for ${imagePaths.length} images...`);
        return new Promise((resolve, reject) => {
            const zipName = `dataset-${Date.now()}.zip`;
            const zipPath = path.join(outputDir, zipName);
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                const size = fs.statSync(zipPath).size;
                console.log(`[FalTrainingService] Zip creation complete: ${zipPath} (${(size / 1024 / 1024).toFixed(2)} MB)`);
                resolve(zipPath);
            });
            archive.on('error', (err: any) => {
                console.error("[FalTrainingService] Zip creation failed:", err);
                reject(err);
            });

            archive.pipe(output);

            for (const imgPath of imagePaths) {
                if (fs.existsSync(imgPath)) {
                    archive.file(imgPath, { name: path.basename(imgPath) });
                } else {
                    console.warn(`[FalTrainingService] Image not found during zip: ${imgPath}`);
                }
            }

            archive.finalize();
        });
    }

    /**
     * Upload the zip file to Fal's storage
     */
    async uploadDataset(zipPath: string): Promise<string> {
        console.log(`[FalTrainingService] Starting upload to Fal: ${zipPath}`);
        try {
            // Fal's storage.upload is the standard way, but if not available in this SDK version,
            // we might need to use a general file upload endpoint or S3.
            // Assuming fal.storage.upload exists or similar.
            // If not, we'll mock it or use a public URL if we have one (e.g. from our own server).

            // For now, let's assume we serve it from our server and pass that URL.
            // In production, we should upload to S3/Fal Storage.

            // NOTE: Since we are running locally, we can't pass localhost URL to Fal.
            // We MUST upload to Fal storage.

            // @ts-ignore - Fal SDK types might mismatch with Node streams
            const fileBuffer = fs.readFileSync(zipPath);
            const blob = new Blob([fileBuffer]);
            const url = await fal.storage.upload(blob);
            console.log(`[FalTrainingService] Upload complete. URL: ${url}`);
            return url;
        } catch (error) {
            console.error("[FalTrainingService] Fal upload failed:", error);
            throw new Error("Failed to upload dataset to Fal");
        }
    }

    /**
     * Start a training job
     */
    async startTraining(
        datasetUrl: string,
        triggerWord: string,
        steps: number = 1000,
        baseModel: 'fast' | 'dev' = 'fast',
        webhookUrl?: string
    ): Promise<string> {
        console.log(`[FalTrainingService] Submitting training job to Fal (${baseModel})...`);

        const modelEndpoint = baseModel === 'dev'
            ? "fal-ai/flux-lora-general-training"
            : "fal-ai/flux-lora-fast-training";

        try {
            const result = await fal.queue.submit(modelEndpoint, {
                input: {
                    images_data_url: datasetUrl,
                    trigger_word: triggerWord,
                    is_style: true,
                    training_steps: steps
                },
                webhookUrl
            });

            console.log(`[FalTrainingService] Training job submitted to ${modelEndpoint}. Request ID: ${result.request_id}`);
            return result.request_id;
        } catch (error) {
            console.error("[FalTrainingService] Fal training start failed:", error);
            throw new Error("Failed to start training job");
        }
    }

    /**
     * Check job status
     */
    async getStatus(requestId: string): Promise<any> {
        try {
            // @ts-ignore
            return await fal.queue.status("fal-ai/flux-lora-fast-training", { requestId });
        } catch (error) {
            console.error("Fal status check failed:", error);
            throw error;
        }
    }

    /**
     * Get result
     */
    async getResult(requestId: string): Promise<any> {
        try {
            // @ts-ignore
            return await fal.queue.result("fal-ai/flux-lora-fast-training", { requestId });
        } catch (error) {
            console.error("Fal result fetch failed:", error);
            throw error;
        }
    }
}

export const falTrainingService = new FalTrainingService();

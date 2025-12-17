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
            // Read the zip file as a buffer
            const fileBuffer = fs.readFileSync(zipPath);
            const fileName = path.basename(zipPath);

            // IMPORTANT: Create a Blob with the correct MIME type for zip files
            // Fal's training API requires proper archive format detection
            const blob = new Blob([fileBuffer], { type: 'application/zip' });

            // Use the File constructor to preserve the filename with .zip extension
            // This ensures Fal can properly detect the archive format
            const file = new File([blob], fileName, { type: 'application/zip' });

            console.log(`[FalTrainingService] Uploading file: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

            const url = await fal.storage.upload(file);
            console.log(`[FalTrainingService] Upload complete. URL: ${url}`);

            // Verify the URL has proper extension (warn if it doesn't)
            if (!url.includes('.zip') && !url.includes('application/zip')) {
                console.warn(`[FalTrainingService] Warning: Uploaded URL may not have proper zip extension: ${url}`);
            }

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
    /**
     * Start a Wan 2.2 Video Model Training Job
     */
    async startWanTraining(
        datasetUrl: string,
        triggerWord: string,
        steps: number = 1000,
        webhookUrl?: string
    ): Promise<string> {
        console.log(`[FalTrainingService] Submitting WAN 2.2 training job to Fal...`);
        const modelEndpoint = "fal-ai/wan-22-image-trainer";

        try {
            const result = await fal.queue.submit(modelEndpoint, {
                input: {
                    training_data_url: datasetUrl,
                    trigger_phrase: triggerWord,
                    steps: steps,
                    // Default parameters for standard subject training
                    is_style: false,
                    use_face_detection: true,
                    include_synthetic_captions: true
                },
                webhookUrl
            });

            console.log(`[FalTrainingService] Wan 2.2 Training submitted. Request ID: ${result.request_id}`);
            return result.request_id;
        } catch (error) {
            console.error("[FalTrainingService] Wan training start failed:", error);
            throw new Error("Failed to start Wan training job");
        }
    }
}

export const falTrainingService = new FalTrainingService();

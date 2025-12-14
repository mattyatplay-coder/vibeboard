import { fal } from "@fal-ai/client";
import AdmZip from "adm-zip";
import axios from "axios";

export interface TrainingOptions {
    zipUrl?: string;
    imageUrls?: string[];
    triggerWord: string;
    isStyle: boolean;
}

export class TrainingService {
    static async trainLoRA(options: TrainingOptions) {
        console.log("Starting LoRA training with options:", options);

        let zipUrl = options.zipUrl;

        if (!zipUrl && options.imageUrls && options.imageUrls.length > 0) {
            console.log("Creating zip from images...");
            const zipBuffer = await this.createZipFromUrls(options.imageUrls);
            // Upload zip to Fal storage
            zipUrl = await fal.storage.upload(new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' }));
            console.log("Zip uploaded to:", zipUrl);
        }

        if (!zipUrl) {
            throw new Error("No zip URL or images provided for training");
        }

        try {
            const result = await fal.subscribe("fal-ai/flux-lora-fast-training", {
                input: {
                    images_data_url: zipUrl,
                    trigger_word: options.triggerWord,
                    is_style: options.isStyle
                },
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === 'IN_PROGRESS') {
                        update.logs.map((log) => log.message).forEach(console.log);
                    }
                },
            });

            return result;
        } catch (error) {
            console.error("Training failed:", error);
            throw error;
        }
    }

    private static async createZipFromUrls(urls: string[]): Promise<Buffer> {
        const zip = new AdmZip();

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                // Guess extension or default to jpg
                const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
                zip.addFile(`image_${i}.${ext}`, buffer);
            } catch (err) {
                console.error(`Failed to download image ${url}:`, err);
            }
        }

        return zip.toBuffer();
    }
}

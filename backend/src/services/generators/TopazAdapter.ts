import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';
import FormData from 'form-data';

const TOPAZ_API_KEY = process.env.TOPAZ_API_KEY;
const BASE_URL = 'https://api.topazlabs.com/image/v1';

export class TopazAdapter implements GenerationProvider {

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        if (!TOPAZ_API_KEY) {
            throw new Error("TOPAZ_API_KEY is not set");
        }

        if (!options.sourceImages || options.sourceImages.length === 0) {
            throw new Error("Topaz Adapter requires a source image for upscaling");
        }

        const sourceUrl = options.sourceImages[0];

        try {
            // 1. Download image
            console.log(`[Topaz] Downloading source image: ${sourceUrl}`);
            const imageResponse = await axios.get(sourceUrl, { responseType: 'stream' });

            // 2. Prepare FormData
            const formData = new FormData();
            formData.append('image', imageResponse.data);
            formData.append('output_format', 'png');
            if (options.width) formData.append('output_width', options.width.toString());
            if (options.height) formData.append('output_height', options.height.toString());
            formData.append('face_recovery', 'true');

            // 3. Send Request
            console.log(`[Topaz] Initiating enhancement...`);
            const response = await axios.post(`${BASE_URL}/enhance/async`, formData, {
                headers: {
                    'X-API-Key': TOPAZ_API_KEY,
                    ...formData.getHeaders()
                }
            });

            const { process_id, eta } = response.data;
            console.log(`[Topaz] Job started: ${process_id}, ETA: ${eta}`);

            // 4. Poll for Completion
            const resultUrl = await this.pollForCompletion(process_id);

            return {
                id: process_id,
                status: 'succeeded',
                outputs: [resultUrl]
            };

        } catch (error: any) {
            console.error("[Topaz] Error:", error.response?.data || error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.response?.data?.message || error.message
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        throw new Error("Topaz Video not implemented yet");
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        if (!TOPAZ_API_KEY) {
            throw new Error("TOPAZ_API_KEY is not set");
        }
        try {
            const response = await axios.get(`${BASE_URL}/status/${id}`, {
                headers: { 'X-API-Key': TOPAZ_API_KEY }
            });
            const status = response.data;

            let genStatus: GenerationResult['status'] = 'running';
            if (status.status === 'completed' || status.status === 'succeeded') genStatus = 'succeeded';
            else if (status.status === 'failed') genStatus = 'failed';

            return {
                id: id,
                status: genStatus,
                outputs: status.output_url ? [status.output_url] : (status.url ? [status.url] : undefined),
                error: status.error
            };
        } catch (error: any) {
            return {
                id: id,
                status: 'failed',
                error: error.message
            };
        }
    }

    private async pollForCompletion(processId: string): Promise<string> {
        const maxAttempts = 60; // 2 minutes (if 2s interval)
        const interval = 2000;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, interval));

            try {
                const result = await this.checkStatus(processId);
                console.log(`[Topaz] Poll ${i}:`, result.status);

                if (result.status === 'succeeded') {
                    if (result.outputs && result.outputs.length > 0) return result.outputs[0];
                    throw new Error("Completed but no output URL found");
                } else if (result.status === 'failed') {
                    throw new Error(`Topaz job failed: ${result.error || 'Unknown error'}`);
                }
            } catch (error: any) {
                // If 404, maybe it's not ready or endpoint is wrong?
                if (error.message?.includes('404')) {
                    console.warn(`[Topaz] Status 404 for ${processId}, retrying...`);
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Topaz job timed out");
    }
}

import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google Veo Adapter - Google's video generation model
 * 
 * Veo 3 / Veo 3.1 features:
 * - High quality video generation
 * - Text-to-video and image-to-video
 * - Up to 8 seconds of video
 * - 1080p resolution
 * 
 * Access via:
 * - Google AI Studio (api.google.com)
 * - Vertex AI (for production)
 * 
 * Get API key at: https://aistudio.google.com/app/apikey
 */
export class GoogleVeoAdapter implements GenerationProvider {
    private apiKey: string;
    private baseUrl: string;
    private useVertexAI: boolean;

    constructor() {
        this.apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
        this.useVertexAI = !!process.env.GOOGLE_VERTEX_PROJECT;

        if (this.useVertexAI) {
            const project = process.env.GOOGLE_VERTEX_PROJECT;
            const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
            this.baseUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models`;
        } else {
            this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        }

        if (!this.apiKey && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.warn("WARNING: GOOGLE_AI_API_KEY not set");
        }
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        // Veo is primarily for video, use Imagen for images
        try {
            // Normalize model ID for Google's API
            const model = this.normalizeModelId(options.model || 'imagen-3');

            const payload = {
                instances: [{
                    prompt: options.prompt,
                }],
                parameters: {
                    sampleCount: options.count || 1,
                    aspectRatio: this.mapAspectRatio(options.aspectRatio || '16:9'),
                    seed: options.seed,
                    // Safety settings - set to least restrictive
                    safetyFilterLevel: 'block_none',
                    personGeneration: 'allow_all',
                }
            };

            const response = await this.makeRequest(model, payload);

            const outputs = response.predictions?.map((p: any) =>
                `data:image/png;base64,${p.bytesBase64Encoded}`
            ) || [];

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs
            };

        } catch (error: any) {
            console.error("Google Imagen generation failed:", error.response?.data || error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Veo 3.1 model
            const model = options.model || 'veo-3.1-generate';

            const payload: any = {
                instances: [{
                    prompt: options.prompt,
                }],
                parameters: {
                    // Video parameters
                    aspectRatio: this.mapAspectRatio(options.aspectRatio || '16:9'),
                    durationSeconds: parseInt(options.duration || '5'),
                    // Veo 3.1 supports up to 8 seconds
                    // For longer videos, you'd need to chain generations

                    // Quality settings
                    sampleCount: 1,
                    seed: options.seed,

                    // Safety - least restrictive
                    safetyFilterLevel: 'block_none',
                    personGeneration: 'allow_all',
                }
            };

            // Handle different modes
            if (options.mode === 'frames_to_video') {
                // Start frame (image)
                if (image) {
                    payload.instances[0].image = await this.processImageInput(image);
                }
                // End frame
                if (options.endFrame) {
                    payload.parameters.lastFrame = await this.processImageInput(options.endFrame);
                }
            } else if (options.mode === 'extend_video') {
                // Input video for extension
                if (options.inputVideo) {
                    payload.instances[0].video = await this.processVideoInput(options.inputVideo);
                }
            } else {
                // Default: Text-to-Video or Image-to-Video
                if (image) {
                    payload.instances[0].image = await this.processImageInput(image);
                }
            }



            console.log("Google Veo generation:", model);

            // Veo uses async generation - start the job
            const response = await this.makeRequest(model, payload, true);

            // For Vertex AI, we get an operation ID to poll
            if (response.name) {
                const result = await this.pollOperation(response.name);
                return {
                    id: response.name,
                    status: 'succeeded',
                    outputs: this.extractVideoOutputs(result)
                };
            }

            // For direct API, result might be immediate
            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: this.extractVideoOutputs(response)
            };

        } catch (error: any) {
            console.error("Google Veo generation failed:", error.response?.data || error.message);
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        try {
            const response = await this.getOperation(id);

            if (response.done) {
                return {
                    id,
                    status: 'succeeded',
                    outputs: this.extractVideoOutputs(response.response)
                };
            }

            return { id, status: 'running' };
        } catch (error) {
            return { id, status: 'running' };
        }
    }

    private async makeRequest(model: string, payload: any, isVideo: boolean = false): Promise<any> {
        const url = this.useVertexAI
            ? `${this.baseUrl}/${model}:${isVideo ? 'generateVideo' : 'predict'}`
            : `${this.baseUrl}/${model}:${isVideo ? 'generateVideo' : 'predict'}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (!this.useVertexAI) {
            headers['x-goog-api-key'] = this.apiKey;
        } else {
            // For Vertex AI, use service account auth
            headers['Authorization'] = `Bearer ${await this.getAccessToken()}`;
        }

        const response = await axios.post(url, payload, {
            headers,
            timeout: isVideo ? 300000 : 60000 // 5 min for video, 1 min for images
        });

        return response.data;
    }

    private async getAccessToken(): Promise<string> {
        // For Vertex AI, get access token from service account
        // This requires GOOGLE_APPLICATION_CREDENTIALS env var set
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token || '';
    }

    private async pollOperation(operationName: string, timeout: number = 300000): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const result = await this.getOperation(operationName);

            if (result.done) {
                if (result.error) {
                    throw new Error(result.error.message);
                }
                return result.response;
            }

            // Wait 3 seconds before polling again
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        throw new Error('Video generation timed out');
    }

    private async getOperation(operationName: string): Promise<any> {
        const url = this.useVertexAI
            ? `https://${process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'}-aiplatform.googleapis.com/v1/${operationName}`
            : `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (!this.useVertexAI) {
            headers['x-goog-api-key'] = this.apiKey;
        } else {
            headers['Authorization'] = `Bearer ${await this.getAccessToken()}`;
        }

        const response = await axios.get(url, { headers });
        return response.data;
    }

    private extractVideoOutputs(response: any): string[] {
        if (!response) return [];

        // Handle different response formats
        if (response.predictions) {
            return response.predictions.map((p: any) => {
                if (p.bytesBase64Encoded) {
                    return `data:video/mp4;base64,${p.bytesBase64Encoded}`;
                }
                if (p.gcsUri) {
                    return p.gcsUri; // GCS URL
                }
                if (p.video?.uri) {
                    return p.video.uri;
                }
                return p;
            });
        }

        if (response.generatedSamples) {
            return response.generatedSamples.map((s: any) => s.video?.uri || s.uri);
        }

        return [];
    }

    private normalizeModelId(modelId: string): string {
        // Map user-friendly IDs to Google's actual model names
        if (!this.useVertexAI) {
            // API Key (AI Studio) specific mappings
            // Imagen 3 not available, use Imagen 4 Preview
            if (modelId.includes('imagen')) {
                return 'imagen-4.0-generate-preview-06-06';
            }
        }

        const modelMapping: Record<string, string> = {
            'imagen-3': 'imagen-3.0-generate-001',
            'veo-2': 'veo-2.0',
            'veo-3': 'veo-3.0',
            'veo-3.1': 'veo-3.1-generate-preview'
        };
        return modelMapping[modelId] || modelId;
    }

    private async processImageInput(input: string): Promise<any> {
        if (input.startsWith('data:')) {
            return { bytesBase64Encoded: input.split(',')[1] };
        } else if (input.startsWith('http')) {
            // Fetch remote image
            try {
                const response = await axios.get(input, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                return { bytesBase64Encoded: base64 };
            } catch (e) {
                console.error("Failed to fetch image input:", e);
                return { gcsUri: input }; // Fallback
            }
        } else if (input.startsWith('/uploads/')) {
            // Local file
            try {
                const filePath = path.join(process.cwd(), input.substring(1)); // Remove leading slash
                const buffer = await fs.promises.readFile(filePath);
                return { bytesBase64Encoded: buffer.toString('base64') };
            } catch (e) {
                console.error("Failed to read local image input:", e);
            }
        }
        return { gcsUri: input };
    }

    private async processVideoInput(input: string): Promise<any> {
        if (input.startsWith('data:')) {
            return { bytesBase64Encoded: input.split(',')[1] };
        } else if (input.startsWith('http')) {
            // Fetch remote video
            try {
                const response = await axios.get(input, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                return { bytesBase64Encoded: base64 };
            } catch (e) {
                console.error("Failed to fetch video input:", e);
                return { gcsUri: input }; // Fallback
            }
        } else if (input.startsWith('/uploads/')) {
            // Local file
            try {
                const filePath = path.join(process.cwd(), input.substring(1)); // Remove leading slash
                const buffer = await fs.promises.readFile(filePath);
                return { bytesBase64Encoded: buffer.toString('base64') };
            } catch (e) {
                console.error("Failed to read local video input:", e);
            }
        }
        return { gcsUri: input };
    }

    private mapAspectRatio(ratio: string): string {
        const mapping: Record<string, string> = {
            '16:9': '16:9',
            '9:16': '9:16',
            '1:1': '1:1',
            '4:3': '4:3',
            '3:4': '3:4',
        };
        return mapping[ratio] || '16:9';
    }
}

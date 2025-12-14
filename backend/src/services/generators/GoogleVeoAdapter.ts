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
            const model = this.normalizeModelId(options.model || 'veo-3.1');

            // Build payload based on API type (Vertex AI vs Gemini API / AI Studio)
            let payload: any;

            if (this.useVertexAI) {
                // Vertex AI format - uses instances/parameters structure
                payload = {
                    instances: [{
                        prompt: options.prompt,
                    }],
                    parameters: {
                        aspectRatio: this.mapAspectRatio(options.aspectRatio || '16:9'),
                        durationSeconds: parseInt(options.duration || '5'),
                        sampleCount: 1,
                        seed: options.seed,
                        safetyFilterLevel: 'block_none',
                        personGeneration: 'allow_all',
                    }
                };

                // Handle image/video inputs for Vertex AI
                if (image) {
                    payload.instances[0].image = await this.processImageInput(image);
                }
                if (options.endFrame) {
                    payload.parameters.lastFrame = await this.processImageInput(options.endFrame);
                }
                if (options.inputVideo) {
                    payload.instances[0].video = await this.processVideoInput(options.inputVideo);
                }
            } else {
                // Gemini API / AI Studio format - simpler structure
                // Docs: https://ai.google.dev/gemini-api/docs/video
                payload = {
                    prompt: options.prompt,
                    config: {
                        aspectRatio: this.mapAspectRatio(options.aspectRatio || '16:9'),
                        numberOfVideos: 1,
                    }
                };

                // Add duration - Veo supports "4", "6", or "8" seconds
                const duration = parseInt(options.duration || '5');
                if (duration <= 4) {
                    payload.config.durationSeconds = 4;
                } else if (duration <= 6) {
                    payload.config.durationSeconds = 6;
                } else {
                    payload.config.durationSeconds = 8;
                }

                // Add negative prompt if provided
                if (options.negativePrompt) {
                    payload.negativePrompt = options.negativePrompt;
                }

                // Image-to-Video: Add initial frame
                if (image) {
                    payload.image = await this.processImageInput(image);
                }

                // Frames-to-Video: Add last frame for interpolation (Veo 3.1 only)
                if (options.endFrame) {
                    payload.lastFrame = await this.processImageInput(options.endFrame);
                }

                // Reference images for content guidance (up to 3, Veo 3.1 only)
                if (options.elementReferences && options.elementReferences.length > 0) {
                    payload.referenceImages = await Promise.all(
                        options.elementReferences.slice(0, 3).map(ref => this.processImageInput(ref))
                    );
                }

                // Video extension mode
                if (options.inputVideo) {
                    payload.video = await this.processVideoInput(options.inputVideo);
                }
            }

            console.log("[GoogleVeo] Generating video with model:", model);

            // Veo uses async generation - start the job
            const response = await this.makeRequest(model, payload, true);

            // Both APIs return an operation to poll
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
            console.error("[GoogleVeo] Generation failed:", error.response?.data || error.message);
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
        // Google AI Studio (Gemini API) uses predictLongRunning for video
        // Vertex AI uses generateVideo
        const action = isVideo
            ? (this.useVertexAI ? 'generateVideo' : 'predictLongRunning')
            : 'predict';

        const url = `${this.baseUrl}/${model}:${action}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (!this.useVertexAI) {
            headers['x-goog-api-key'] = this.apiKey;
        } else {
            // For Vertex AI, use service account auth
            headers['Authorization'] = `Bearer ${await this.getAccessToken()}`;
        }

        console.log(`[GoogleVeo] Making request to: ${url}`);
        console.log(`[GoogleVeo] Payload:`, JSON.stringify(payload, null, 2));

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

        console.log("[GoogleVeo] Extracting outputs from response:", JSON.stringify(response, null, 2));

        // Gemini API format: generated_videos array
        // Per docs: "the result is in operation.response" with "generated_videos[0].video"
        if (response.generated_videos || response.generatedVideos) {
            const videos = response.generated_videos || response.generatedVideos;
            return videos.map((v: any) => {
                // Video can be a file object with uri/url
                if (v.video?.uri) return v.video.uri;
                if (v.video?.url) return v.video.url;
                if (v.uri) return v.uri;
                if (v.url) return v.url;
                // Base64 encoded
                if (v.video?.bytesBase64Encoded) {
                    return `data:video/mp4;base64,${v.video.bytesBase64Encoded}`;
                }
                if (v.bytesBase64Encoded) {
                    return `data:video/mp4;base64,${v.bytesBase64Encoded}`;
                }
                return v;
            }).filter(Boolean);
        }

        // Vertex AI format: predictions array
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
            }).filter(Boolean);
        }

        // Legacy format
        if (response.generatedSamples) {
            return response.generatedSamples.map((s: any) => s.video?.uri || s.uri).filter(Boolean);
        }

        return [];
    }

    private normalizeModelId(modelId: string): string {
        // Map user-friendly IDs to Google's actual model names
        // See: https://ai.google.dev/gemini-api/docs/video

        if (!this.useVertexAI) {
            // API Key (AI Studio / Gemini API) model names
            const aiStudioMapping: Record<string, string> = {
                // Video models - Veo
                'veo-2': 'veo-2.0-generate-001',
                'veo-3': 'veo-3.0-generate-001',
                'veo-3-fast': 'veo-3.0-fast-generate-001',
                'veo-3.1': 'veo-3.1-generate-preview',
                'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
                // Image models - Imagen
                'imagen-3': 'imagen-3.0-generate-001',
                'imagen-4': 'imagen-4.0-generate-preview-06-06',
            };

            // Handle imagen fallback to Imagen 4 if Imagen 3 not available
            if (modelId.includes('imagen') && !aiStudioMapping[modelId]) {
                return 'imagen-4.0-generate-preview-06-06';
            }

            return aiStudioMapping[modelId] || modelId;
        }

        // Vertex AI model names (same as AI Studio for newer models)
        const modelMapping: Record<string, string> = {
            'imagen-3': 'imagen-3.0-generate-001',
            'imagen-4': 'imagen-4.0-generate-preview-06-06',
            'veo-2': 'veo-2.0-generate-001',
            'veo-3': 'veo-3.0-generate-001',
            'veo-3-fast': 'veo-3.0-fast-generate-001',
            'veo-3.1': 'veo-3.1-generate-preview',
            'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
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

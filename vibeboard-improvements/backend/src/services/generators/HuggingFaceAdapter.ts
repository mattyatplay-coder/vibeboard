import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import axios from 'axios';

/**
 * HuggingFace Inference API Adapter
 * Cost: FREE tier available! Pro tier is $9/month for faster inference
 * 
 * Available models (all support uncensored generation):
 * - stabilityai/stable-diffusion-xl-base-1.0
 * - runwayml/stable-diffusion-v1-5
 * - black-forest-labs/FLUX.1-dev (PRO only)
 * - Many community fine-tuned models
 * 
 * Rate limits: ~1000 requests/day on free tier
 */
export class HuggingFaceAdapter implements GenerationProvider {
    private apiKey: string;
    private baseUrl = 'https://api-inference.huggingface.co/models';

    constructor() {
        this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
        if (!this.apiKey) {
            console.warn("WARNING: HUGGINGFACE_API_KEY not set. Using anonymous access (very limited).");
        }
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Default to SDXL - widely available and uncensored
            let model = options.model || 'stabilityai/stable-diffusion-xl-base-1.0';
            
            // Map friendly names
            const modelMap: Record<string, string> = {
                'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',
                'sd15': 'runwayml/stable-diffusion-v1-5',
                'flux-dev': 'black-forest-labs/FLUX.1-dev',
                'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
                // Community models that are uncensored
                'realistic-vision': 'SG161222/Realistic_Vision_V5.1_noVAE',
                'dreamshaper': 'Lykon/dreamshaper-xl-1-0',
            };

            model = modelMap[model] || model;

            const payload: any = {
                inputs: options.prompt,
                parameters: {
                    num_inference_steps: options.steps || 30,
                    guidance_scale: options.guidanceScale || 7.5,
                },
                options: {
                    wait_for_model: true, // Wait if model is loading
                    use_cache: false
                }
            };

            if (options.negativePrompt) {
                payload.parameters.negative_prompt = options.negativePrompt;
            }
            if (options.seed) {
                payload.parameters.seed = options.seed;
            }

            console.log("HuggingFace generation:", model);

            const response = await axios.post(
                `${this.baseUrl}/${model}`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            // HF returns raw image bytes - convert to base64 data URL
            const base64 = Buffer.from(response.data).toString('base64');
            const contentType = response.headers['content-type'] || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64}`;

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: [dataUrl]
            };

        } catch (error: any) {
            console.error("HuggingFace generation failed:", error.response?.data || error.message);
            
            // Handle specific HF errors
            let errorMsg = error.message;
            if (error.response?.status === 503) {
                errorMsg = 'Model is loading. Please try again in 20-30 seconds.';
            } else if (error.response?.status === 429) {
                errorMsg = 'Rate limit exceeded. Free tier allows ~1000 requests/day.';
            }

            return {
                id: Date.now().toString(),
                status: 'failed',
                error: errorMsg
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            // HuggingFace has some video models available
            let model = options.model || 'ali-vilab/text-to-video-ms-1.7b';
            
            const payload = {
                inputs: options.prompt,
                parameters: {
                    num_inference_steps: options.steps || 25,
                    num_frames: options.duration === "10" ? 64 : 32
                },
                options: {
                    wait_for_model: true
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/${model}`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',
                    timeout: 120000 // Video takes longer
                }
            );

            const base64 = Buffer.from(response.data).toString('base64');
            const dataUrl = `data:video/mp4;base64,${base64}`;

            return {
                id: Date.now().toString(),
                status: 'succeeded',
                outputs: [dataUrl]
            };

        } catch (error: any) {
            return {
                id: Date.now().toString(),
                status: 'failed',
                error: error.message
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        return { id, status: 'succeeded' };
    }
}

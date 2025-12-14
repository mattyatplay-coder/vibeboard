import { GenerationProvider, GenerationOptions, GenerationResult } from './GenerationProvider';
import WebSocket from 'ws';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ComfyUI Adapter with full workflow support
 * Supports: SDXL, Flux, LTX-Video, Wan, CogVideoX locally
 * Cost: FREE (runs on your own hardware)
 */
export class ComfyUIAdapter implements GenerationProvider {
    private baseUrl: string;
    private clientId: string;
    private outputDir: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
        this.clientId = uuidv4();
        this.outputDir = process.env.COMFYUI_OUTPUT_DIR || '/ComfyUI/output';
    }

    async generateImage(options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Build workflow based on model selection
            const workflow = this.buildImageWorkflow(options);

            // Queue the prompt
            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;

            // Wait for completion via WebSocket
            const outputs = await this.waitForCompletion(promptId);

            return {
                id: promptId,
                status: 'succeeded',
                outputs,
                seed: options.seed || (workflow["3"]?.inputs?.seed as number) || (workflow["25"]?.inputs?.noise_seed as number)
            };

        } catch (error: any) {
            console.error("ComfyUI generation failed:", error);
            return {
                id: 'error',
                status: 'failed',
                error: error.message
            };
        }
    }

    async generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult> {
        try {
            // Determine which video workflow to use
            const workflow = image
                ? this.buildI2VWorkflow(options, image)
                : this.buildT2VWorkflow(options);

            const response = await axios.post(`${this.baseUrl}/prompt`, {
                prompt: workflow,
                client_id: this.clientId
            });

            const promptId = response.data.prompt_id;
            const outputs = await this.waitForCompletion(promptId);

            return {
                id: promptId,
                status: 'succeeded',
                outputs
            };

        } catch (error: any) {
            console.error("ComfyUI video generation failed:", error);
            return {
                id: 'error',
                status: 'failed',
                error: error.message
            };
        }
    }

    async checkStatus(id: string): Promise<GenerationResult> {
        try {
            const history = await axios.get(`${this.baseUrl}/history/${id}`);
            if (history.data[id]) {
                const outputs = this.extractOutputs(history.data[id].outputs);
                return { id, status: 'succeeded', outputs };
            }
            return { id, status: 'running' };
        } catch (err) {
            return { id, status: 'running' };
        }
    }

    private async waitForCompletion(promptId: string, timeout: number = 300000): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const wsUrl = this.baseUrl.replace('http', 'ws') + `/ws?clientId=${this.clientId}`;
            const ws = new WebSocket(wsUrl);

            const timeoutId = setTimeout(() => {
                ws.close();
                reject(new Error('Generation timed out'));
            }, timeout);

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === 'executed' && message.data.prompt_id === promptId) {
                        clearTimeout(timeoutId);
                        ws.close();

                        // Fetch final outputs
                        const history = await axios.get(`${this.baseUrl}/history/${promptId}`);
                        const outputs = this.extractOutputs(history.data[promptId].outputs);
                        resolve(outputs);
                    }

                    if (message.type === 'execution_error' && message.data.prompt_id === promptId) {
                        clearTimeout(timeoutId);
                        ws.close();
                        reject(new Error(message.data.exception_message || 'Execution failed'));
                    }
                } catch (e) {
                    // Non-JSON message, ignore
                }
            });

            ws.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }

    private extractOutputs(outputs: any): string[] {
        const results: string[] = [];

        for (const nodeId in outputs) {
            const nodeOutput = outputs[nodeId];

            // Handle images
            if (nodeOutput.images) {
                for (const img of nodeOutput.images) {
                    results.push(`${this.baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`);
                }
            }

            // Handle videos (gifs, mp4s)
            if (nodeOutput.gifs) {
                for (const vid of nodeOutput.gifs) {
                    results.push(`${this.baseUrl}/view?filename=${vid.filename}&subfolder=${vid.subfolder || ''}&type=${vid.type}`);
                }
            }
        }

        return results;
    }

    /**
     * Build SDXL/Flux image generation workflow
     * Supports LoRAs when provided in options
     */
    private buildImageWorkflow(options: GenerationOptions): any {
        const seed = options.seed || Math.floor(Math.random() * 2147483647);
        const steps = options.steps || 20;
        const cfg = options.guidanceScale || 7.0;
        const width = options.width || 1024;
        const height = options.height || 1024;

        // Detect model type from options
        const isFlux = options.model?.toLowerCase().includes('flux');

        if (isFlux) {
            return this.buildFluxWorkflow(options, seed, steps, width, height);
        }

        // Default SDXL workflow
        const workflow: any = {
            "3": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": options.sampler?.value || "euler",
                    "scheduler": options.scheduler?.value || "normal",
                    "denoise": options.strength || 1.0,
                    "model": ["4", 0],  // Will be updated if LoRAs are present
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": "sd_xl_base_1.0.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": options.count || 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": options.prompt,
                    "clip": ["4", 1]  // Will be updated if LoRAs are present
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": options.negativePrompt || "",
                    "clip": ["4", 1]  // Will be updated if LoRAs are present
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "vibeboard",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            }
        };

        // Add LoRA nodes if present
        if (options.loras && options.loras.length > 0) {
            let previousModelOutput: [string, number] = ["4", 0]; // Start from CheckpointLoader model output
            let previousClipOutput: [string, number] = ["4", 1];  // Start from CheckpointLoader clip output
            let loraNodeId = 100; // Start LoRA nodes at ID 100

            for (const lora of options.loras) {
                const nodeIdStr = loraNodeId.toString();

                // Extract LoRA filename from path
                const loraName = this.extractLoraName(lora.path);

                workflow[nodeIdStr] = {
                    "inputs": {
                        "lora_name": loraName,
                        "strength_model": lora.strength,
                        "strength_clip": lora.strength,
                        "model": previousModelOutput,
                        "clip": previousClipOutput
                    },
                    "class_type": "LoraLoader"
                };

                previousModelOutput = [nodeIdStr, 0];
                previousClipOutput = [nodeIdStr, 1];
                loraNodeId++;
            }

            // Update downstream nodes to use the final LoRA output
            workflow["3"]["inputs"]["model"] = previousModelOutput;
            workflow["6"]["inputs"]["clip"] = previousClipOutput;
            workflow["7"]["inputs"]["clip"] = previousClipOutput;

            console.log(`[ComfyUI] Added ${options.loras.length} LoRA(s) to SDXL workflow`);
        }

        return workflow;
    }

    /**
     * Build Flux-specific workflow (uses different nodes)
     * Supports LoRAs when provided in options
     */
    private buildFluxWorkflow(options: GenerationOptions, seed: number, steps: number, width: number, height: number): any {
        const workflow: any = {
            "6": {
                "inputs": {
                    "text": options.prompt,
                    "clip": ["11", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["13", 0],
                    "vae": ["10", 0]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "vibeboard_flux",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "vae_name": "ae.safetensors"
                },
                "class_type": "VAELoader"
            },
            "11": {
                "inputs": {
                    "clip_name1": "t5xxl_fp16.safetensors",
                    "clip_name2": "clip_l.safetensors",
                    "type": "flux"
                },
                "class_type": "DualCLIPLoader"
            },
            "12": {
                "inputs": {
                    "unet_name": "flux1-dev.safetensors",
                    "weight_dtype": "default"
                },
                "class_type": "UNETLoader"
            },
            "13": {
                "inputs": {
                    "noise": ["25", 0],
                    "guider": ["22", 0],
                    "sampler": ["16", 0],
                    "sigmas": ["17", 0],
                    "latent_image": ["27", 0]
                },
                "class_type": "SamplerCustomAdvanced"
            },
            "16": {
                "inputs": {
                    "sampler_name": "euler"
                },
                "class_type": "KSamplerSelect"
            },
            "17": {
                "inputs": {
                    "scheduler": "simple",
                    "steps": steps,
                    "denoise": options.strength || 1.0,
                    "model": ["12", 0]  // Will be updated if LoRAs are present
                },
                "class_type": "BasicScheduler"
            },
            "22": {
                "inputs": {
                    "model": ["12", 0],  // Will be updated if LoRAs are present
                    "conditioning": ["26", 0]
                },
                "class_type": "BasicGuider"
            },
            "25": {
                "inputs": {
                    "noise_seed": seed
                },
                "class_type": "RandomNoise"
            },
            "26": {
                "inputs": {
                    "guidance": options.guidanceScale || 3.5,
                    "conditioning": ["6", 0]
                },
                "class_type": "FluxGuidance"
            },
            "27": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": options.count || 1
                },
                "class_type": "EmptySD3LatentImage"
            }
        };

        // Add LoRA nodes if present
        if (options.loras && options.loras.length > 0) {
            let previousModelOutput: [string, number] = ["12", 0]; // Start from UNETLoader
            let loraNodeId = 100; // Start LoRA nodes at ID 100

            for (const lora of options.loras) {
                const nodeIdStr = loraNodeId.toString();

                // Extract LoRA filename from path (supports both local paths and URLs)
                const loraName = this.extractLoraName(lora.path);

                workflow[nodeIdStr] = {
                    "inputs": {
                        "lora_name": loraName,
                        "strength_model": lora.strength,
                        "strength_clip": lora.strength,
                        "model": previousModelOutput,
                        "clip": ["11", 0]  // CLIP from DualCLIPLoader
                    },
                    "class_type": "LoraLoader"
                };

                previousModelOutput = [nodeIdStr, 0];
                loraNodeId++;
            }

            // Update downstream nodes to use the final LoRA output
            workflow["17"]["inputs"]["model"] = previousModelOutput;
            workflow["22"]["inputs"]["model"] = previousModelOutput;

            console.log(`[ComfyUI] Added ${options.loras.length} LoRA(s) to Flux workflow`);
        }

        return workflow;
    }

    /**
     * Extract LoRA filename from path or URL
     */
    private extractLoraName(loraPath: string): string {
        // If it's a URL (from Civitai, HuggingFace, etc.), extract the filename
        if (loraPath.startsWith('http')) {
            const url = new URL(loraPath);
            const pathParts = url.pathname.split('/');
            return pathParts[pathParts.length - 1];
        }
        // If it's a local path, get the filename
        const parts = loraPath.split(/[/\\]/);
        return parts[parts.length - 1];
    }

    /**
     * Build LTX-Video / Wan Text-to-Video workflow
     */
    private buildT2VWorkflow(options: GenerationOptions): any {
        const isWan = options.model?.toLowerCase().includes('wan');
        const isLTX = options.model?.toLowerCase().includes('ltx');
        const isWan25 = options.model?.toLowerCase().includes('wan-2.5') || options.model?.toLowerCase().includes('wan25');

        // Duration handling - Wan models use num_frames (24fps)
        const durationSec = parseInt(String(options.duration || "5"), 10);
        let numFrames: number;

        if (isWan25) {
            // Wan 2.5 - 5 or 10 seconds at 24fps
            numFrames = durationSec >= 8 ? 241 : 121;
            console.log(`[ComfyUI] Wan 2.5 numFrames: ${numFrames} (requested: ${options.duration})`);
        } else if (isWan) {
            // Wan 2.1/2.2 - 5 or 10 seconds at 24fps
            numFrames = durationSec >= 8 ? 241 : 121;
            console.log(`[ComfyUI] Wan numFrames: ${numFrames} (requested: ${options.duration})`);
        } else if (isLTX) {
            // LTX Video - typically 6 or 10 seconds at 24fps
            numFrames = durationSec >= 8 ? 240 : 144;
            console.log(`[ComfyUI] LTX numFrames: ${numFrames} (requested: ${options.duration})`);
        } else {
            // Default fallback
            numFrames = durationSec >= 8 ? 241 : 121;
        }

        // Basic T2V structure - you'd customize based on your installed nodes
        return {
            "1": {
                "inputs": {
                    "ckpt_name": isWan25 ? "wan_2.5_t2v.safetensors" : (isWan ? "wan_2.2_t2v.safetensors" : "ltx_video.safetensors")
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "2": {
                "inputs": {
                    "text": options.prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "3": {
                "inputs": {
                    "text": options.negativePrompt || "blurry, low quality",
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": {
                    "width": 1280,
                    "height": 720,
                    "length": numFrames,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentVideo"
            },
            "5": {
                "inputs": {
                    "seed": options.seed || Math.floor(Math.random() * 2147483647),
                    "steps": options.steps || 20,
                    "cfg": options.guidanceScale || 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0]
                },
                "class_type": "KSampler"
            },
            "6": {
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                },
                "class_type": "VAEDecode"
            },
            "7": {
                "inputs": {
                    "filename_prefix": "vibeboard_video",
                    "fps": 24,
                    "images": ["6", 0]
                },
                "class_type": "SaveAnimatedWEBP"
            }
        };
    }

    /**
     * Build Image-to-Video workflow
     */
    private buildI2VWorkflow(options: GenerationOptions, imageUrl: string): any {
        // Similar to T2V but with image input
        // You'd load the image and use it as the first frame
        return this.buildT2VWorkflow(options); // Placeholder - extend as needed
    }

    /**
     * Upload an image to ComfyUI for use in workflows
     */
    async uploadImage(imagePath: string): Promise<string> {
        const formData = new FormData();
        const imageBuffer = fs.readFileSync(imagePath);
        const blob = new Blob([imageBuffer]);
        formData.append('image', blob, path.basename(imagePath));

        const response = await axios.post(`${this.baseUrl}/upload/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data.name;
    }
}

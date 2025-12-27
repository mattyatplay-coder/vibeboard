import { Cloud, Server, Zap, Play, Bot, Sparkles } from "lucide-react";

export type ModelCapability =
    | 'text-to-image'
    | 'image-editing' // Inpainting, Upscaling, I2I
    | 'text-to-video'
    | 'image-to-video' // Animation
    | 'video-editing'
    | 'avatar';        // Character/Lipsync

export interface ModelInfo {
    id: string;
    name: string;
    provider: string; // 'fal', 'replicate', 'openai', etc.
    capability: ModelCapability;
    desc?: string;
    cost?: string; // Estimated cost string e.g. "$0.003"
    type: 'image' | 'video'; // Underlying primitive type
    tier?: 'fast' | 'quality' | 'pro';
    supportedDurations?: string[]; // e.g. ['5s', '10s']
    supportedQuantities?: number[]; // e.g. [1, 2, 3, 4]
}

export interface ProviderDefinition {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}

export const PROVIDER_DEFINITIONS: Record<string, ProviderDefinition> = {
    fal: { id: 'fal', name: 'Fal.ai', icon: Cloud, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    replicate: { id: 'replicate', name: 'Replicate', icon: Cloud, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    openai: { id: 'openai', name: 'OpenAI', icon: Bot, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    google: { id: 'google', name: 'Google', icon: Play, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    together: { id: 'together', name: 'Together AI', icon: Zap, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    comfy: { id: 'comfy', name: 'ComfyUI (Local)', icon: Server, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    civitai: { id: 'civitai', name: 'Civitai', icon: Sparkles, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
    huggingface: { id: 'huggingface', name: 'HuggingFace', icon: Cloud, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
};

export const ALL_MODELS: ModelInfo[] = [
    // === FAL.AI ===
    // Image Generation - FLUX Models (Black Forest Labs)
    { id: 'fal-ai/flux/dev', name: 'FLUX.1 Dev', provider: 'fal', capability: 'text-to-image', type: 'image', desc: '12B parameter rectified flow transformer for high-quality image generation', supportedQuantities: [1, 2, 3, 4] },
    { id: 'fal-ai/flux/schnell', name: 'FLUX.1 Schnell', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Fastest FLUX model, optimized for rapid iteration and local development' },
    { id: 'fal-ai/flux-pro', name: 'FLUX.1 Pro', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Excellent image quality, prompt adherence, and output diversity' },
    { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX 1.1 Pro Ultra', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Generates images up to 4 megapixels with enhanced photorealism' },
    { id: 'fal-ai/flux-2-pro', name: 'FLUX.2 Pro', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'High-quality generation with 8 reference image support for character consistency' },
    { id: 'fal-ai/flux-2-flex', name: 'FLUX.2 Flex', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Max-quality generation with 10 reference image support for precise control' },
    { id: 'fal-ai/gpt-image-1.5/edit', name: 'GPT Image 1.5', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Advanced prompt understanding for complex image generation and editing' },
    { id: 'fal-ai/recraft-v3', name: 'Recraft V3', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Professional design and illustration with long text rendering capability', supportedQuantities: [1, 2, 3, 4, 5, 6] },
    { id: 'fal-ai/ideogram/v2', name: 'Ideogram V2', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Exceptional typography with accurate text rendering in images', supportedQuantities: [1, 2, 3, 4] },
    { id: 'fal-ai/ideogram/v3', name: 'Ideogram V3', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Advanced typography and realistic outputs with improved detail', supportedQuantities: [1, 2, 3, 4] },
    { id: 'fal-ai/ideogram/character', name: 'Ideogram V3 Character', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Specialized for character sheets, turnarounds, and reference poses', tier: 'quality' },
    { id: 'fal-ai/flux-kontext/dev', name: 'FLUX Kontext Dev', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Text-based image editing with character consistency preservation' },
    { id: 'fal-ai/flux-pro/kontext', name: 'FLUX Kontext Pro', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'State-of-the-art text-based editing with excellent prompt adherence', tier: 'pro' },
    { id: 'fal-ai/flux-kontext-max', name: 'FLUX Kontext Max', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Premium text-based editing with improved typography generation', tier: 'pro' },
    { id: 'fal-ai/ip-adapter-face-id', name: 'IP-Adapter Face ID', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Face identity preservation for consistent character generation' },
    { id: 'fal-ai/stable-diffusion-v35-large', name: 'Stable Diffusion 3.5 Large', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'High-resolution generation with improved quality and performance', supportedQuantities: [1, 2, 3, 4] },
    { id: 'fal-ai/imagen3', name: 'Imagen 3', provider: 'fal', capability: 'text-to-image', type: 'image', desc: "Google's highest quality text-to-image model for photorealism" },
    { id: 'fal-ai/imagen4/preview', name: 'Imagen 4', provider: 'fal', capability: 'text-to-image', type: 'image', desc: "Google's latest text-to-image model with improved quality" },
    { id: 'fal-ai/nano-banana', name: 'Nano Banana', provider: 'fal', capability: 'text-to-image', type: 'image', desc: "Google Gemini 2.5 Flash Image for fast creative generation" },
    { id: 'fal-ai/nano-banana-pro', name: 'Nano Banana Pro', provider: 'fal', capability: 'text-to-image', type: 'image', desc: "Google Gemini 3 Pro Image with superior text rendering and 4K output" },
    { id: 'fal-ai/nano-banana/edit', name: 'Nano Banana Edit', provider: 'fal', capability: 'image-editing', type: 'image', desc: "Google Gemini 2.5 Flash for fast image editing" },
    { id: 'fal-ai/nano-banana-pro/edit', name: 'Nano Banana Pro Edit', provider: 'fal', capability: 'image-editing', type: 'image', desc: "Google Gemini 3 Pro for precise image editing with text accuracy" },
    { id: 'fal-ai/hidream-i1-full', name: 'HiDream I1', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'High-resolution image generation with exceptional detail' },
    { id: 'fal-ai/janus', name: 'Janus', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Multimodal understanding and generation for creative workflows' },

    // Image Editing - FLUX Models
    { id: 'fal-ai/flux-2-flex/edit', name: 'FLUX.2 Flex Edit', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Multi-reference image editing with up to 10 reference images' },
    { id: 'fal-ai/flux/dev/image-to-image', name: 'FLUX.1 Dev Image-to-Image', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Transform and restyle existing images with high fidelity' },
    { id: 'fal-ai/flux/dev/inpainting', name: 'FLUX.1 Dev Inpainting', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Edit specific regions with seamless blending' },
    { id: 'fal-ai/flux-fill-pro', name: 'FLUX Fill Pro', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Inpainting and outpainting with seamless object removal' },
    { id: 'fal-ai/flux-depth-pro', name: 'FLUX Depth Pro', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Structure-preserving edits maintaining spatial relationships' },
    { id: 'fal-ai/flux-canny-pro', name: 'FLUX Canny Pro', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Edge-guided generation using Canny detection for controlled composition' },
    { id: 'fal-ai/flux-redux-dev', name: 'FLUX Redux Dev', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Image variation tool creating new versions while preserving elements' },
    { id: 'fal-ai/kling-image/o1', name: 'Kling O1 Image', provider: 'fal', capability: 'text-to-image', type: 'image', desc: 'Multi-reference image generation with up to 4 character references' },
    { id: 'fal-ai/creative-upscaler', name: 'Creative Upscaler', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'AI-enhanced 4x upscaling that adds detail and improves quality' },
    { id: 'fal-ai/clarity-upscaler', name: 'Clarity Upscaler', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Sharp, faithful upscaling preserving original image integrity' },

    // Video Text-to-Video - Wan Models (Alibaba)
    { id: 'fal-ai/wan-t2v', name: 'Wan 2.2', provider: 'fal', capability: 'text-to-video', type: 'video', desc: "Alibaba's video model with realistic motion and cinematic quality", supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-25-preview/text-to-video', name: 'Wan 2.5', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Latest Wan with improved quality, motion coherence, and text alignment', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-2.1-t2v-1.3b', name: 'Wan 2.1 (1.3B)', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Efficient 1.3B parameter model for fast video generation', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-pro/text-to-video', name: 'Wan Pro', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Professional video generation with enhanced visual fidelity', supportedDurations: ['5s', '10s', '15s'] },
    // Video Text-to-Video - Other Providers
    { id: 'fal-ai/ltx-video', name: 'LTX Video', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Fast, high-quality video generation optimized for rapid iteration', supportedDurations: ['5s'] },
    { id: 'fal-ai/kling-video/v2.1/master/text-to-video', name: 'Kling 2.1 Master', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Premium text-to-video with unparalleled motion fluidity and cinematic visuals', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/v2.6/pro/text-to-video', name: 'Kling 2.6 Pro', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Latest Kling with native audio generation support', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/vidu/q1/text-to-video', name: 'Vidu Q1', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'High-quality text-to-video with music and sound effect generation', supportedDurations: ['4s', '8s'] },
    { id: 'fal-ai/vidu/q2/reference-to-video', name: 'Vidu Q2 Multi-Reference', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Supports up to 7 reference images for character-consistent video', supportedDurations: ['4s', '8s'] },
    { id: 'fal-ai/hunyuan-video', name: 'Hunyuan Video', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Open-source model with high visual quality and motion diversity', supportedDurations: ['4s'] },
    { id: 'fal-ai/minimax-video', name: 'MiniMax Hailuo', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Expressive motion with natural physics and camera control', supportedDurations: ['6s'] },
    { id: 'fal-ai/luma-dream-machine', name: 'Luma Dream Machine', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Smooth, coherent motion with dreamlike visual quality', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/luma-dream-machine/ray-2', name: 'Luma Ray 2', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Latest Luma with realistic visuals and natural camera control', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/veo3', name: 'Veo 3', provider: 'fal', capability: 'text-to-video', type: 'video', desc: "Google DeepMind's most advanced video model with native audio", supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/pixverse/v4.5/text-to-video', name: 'Pixverse V4.5', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Advanced text-to-video with high quality motion generation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/magi', name: 'Magi', provider: 'fal', capability: 'text-to-video', type: 'video', desc: 'Creative video generation with artistic style capabilities', supportedDurations: ['5s'] },

    // Video Image-to-Video (Animation) - Wan Models
    { id: 'fal-ai/wan/v2.2-a14b/image-to-video', name: 'Wan 2.2 I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Animate still images with natural motion and physics', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan/v2.2-a14b/image-to-video/lora', name: 'Wan 2.2 I2V + LoRA', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Image animation with custom LoRA character support', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-25-preview/image-to-video', name: 'Wan 2.5 I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Latest Wan image animation with improved quality and motion', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-2.1-i2v-14b', name: 'Wan 2.1 I2V (14B)', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'High-quality 14B parameter image-to-video generation', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'fal-ai/wan-pro/image-to-video', name: 'Wan Pro I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Professional image animation with enhanced visual fidelity', supportedDurations: ['5s', '10s', '15s'] },
    // Video Image-to-Video - LTX
    { id: 'fal-ai/ltx-video/image-to-video', name: 'LTX Video I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Fast, high-quality image-to-video conversion', supportedDurations: ['5s'] },
    { id: 'fal-ai/ltx-video-13b-distilled/image-to-video', name: 'LTX Video 13B I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Distilled 13B model for fast image animation', supportedDurations: ['5s', '10s'] },
    // Video Image-to-Video - Kling
    { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1 Standard I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Balanced quality and speed for image animation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/v2.1/master/image-to-video', name: 'Kling 2.1 Master I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Premium image-to-video with unparalleled motion fluidity', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/v2.6/pro/image-to-video', name: 'Kling 2.6 Pro I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Latest Kling with native audio for image animation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/o1/image-to-video', name: 'Kling O1 I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'State-of-the-art video editing and image animation', supportedDurations: ['5s', '10s'] },
    // Video Image-to-Video - Other Providers
    { id: 'fal-ai/minimax-video/image-to-video', name: 'MiniMax Hailuo I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Lively animations with natural physics and motion', supportedDurations: ['6s'] },
    { id: 'fal-ai/luma-dream-machine/image-to-video', name: 'Luma Dream Machine I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Smooth, dreamlike image animation', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/luma-dream-machine/ray-2/image-to-video', name: 'Luma Ray 2 I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Latest Luma with realistic motion and camera control', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/runway-gen3/turbo/image-to-video', name: 'Runway Gen3 Turbo I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Fast cinematic-style image animation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/hunyuan-video-image-to-video', name: 'Hunyuan I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Open-source image-to-video with motion diversity', supportedDurations: ['4s'] },
    { id: 'fal-ai/vidu/image-to-video', name: 'Vidu I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'High-quality image animation with sound generation', supportedDurations: ['4s', '8s'] },
    { id: 'fal-ai/pixverse/v4.5/image-to-video', name: 'Pixverse V4.5 I2V', provider: 'fal', capability: 'image-to-video', type: 'video', desc: 'Advanced image-to-video with high quality motion', supportedDurations: ['5s', '10s'] },

    // Avatar / Character / Lip Sync
    { id: 'fal-ai/one-to-all-animation/14b', name: 'One-To-All Animation (14B)', provider: 'fal', capability: 'avatar', type: 'video', desc: 'Pose-driven character animation from reference video', supportedDurations: ['5s'] },
    { id: 'fal-ai/wan-video-2.2-animate-move', name: 'Wan 2.2 Animate Move', provider: 'fal', capability: 'avatar', type: 'video', desc: 'Character motion transfer from driving video', supportedDurations: ['5s'] },
    { id: 'fal-ai/kling-video/ai-avatar/v2/pro', name: 'Kling AI Avatar Pro', provider: 'fal', capability: 'avatar', type: 'video', desc: 'Premium talking head with audio-driven lip sync', supportedDurations: ['10s', '30s', '60s'] },
    { id: 'fal-ai/kling-video/ai-avatar/v2/standard', name: 'Kling AI Avatar Standard', provider: 'fal', capability: 'avatar', type: 'video', desc: 'Fast talking head generation with lip sync', supportedDurations: ['10s', '30s', '60s'] },
    { id: 'fal-ai/creatify/aurora', name: 'Creatify Aurora', provider: 'fal', capability: 'avatar', type: 'video', desc: 'High-fidelity portrait animation with natural expressions', supportedDurations: ['10s', '60s'] },

    // Video Editing
    { id: 'fal-ai/wan-vace-14b/inpainting', name: 'Wan VACE Inpainting', provider: 'fal', capability: 'video-editing', type: 'video', desc: 'Video inpainting with mask-guided object removal', supportedDurations: ['5s', '15s'] },
    { id: 'fal-ai/kling-video/o1/video-to-video/edit', name: 'Kling O1 Video Edit', provider: 'fal', capability: 'video-editing', type: 'video', desc: 'State-of-the-art video editing and style transfer', supportedDurations: ['5s', '10s'] },

    // === HUGGINGFACE ===
    // { id: 'starsfriday/Qwen-Image-Edit-Remove-Clothes', name: 'Qwen Image Edit', provider: 'huggingface', capability: 'image-editing', type: 'image', desc: 'Remove clothes/objects (Experimental)' },

    // === FAL.AI - Additional Image Editing ===
    { id: 'fal-ai/qwen-image/edit-plus', name: 'Qwen Image Edit Plus', provider: 'fal', capability: 'image-editing', type: 'image', desc: 'Advanced object removal and image editing', tier: 'quality' },

    // === REPLICATE ===
    // Image Generation - FLUX Models (Black Forest Labs)
    { id: 'black-forest-labs/flux-2-pro', name: 'FLUX.2 Pro', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'High-quality generation with 8 reference image support', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-2-flex', name: 'FLUX.2 Flex', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Max-quality with 10 reference image support for control', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-2-dev', name: 'FLUX.2 Dev', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Quality generation with reference image editing support', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-1.1-pro-ultra', name: 'FLUX 1.1 Pro Ultra', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Up to 4 megapixel output with enhanced photorealism', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-1.1-pro', name: 'FLUX 1.1 Pro', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Faster, better FLUX Pro with excellent prompt adherence', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-dev', name: 'FLUX.1 Dev', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: '12B parameter rectified flow transformer', supportedQuantities: [1, 2, 3, 4] },
    { id: 'black-forest-labs/flux-schnell', name: 'FLUX.1 Schnell', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Fastest FLUX model for rapid iteration and local use' },
    // Image Generation - FLUX Editing Models
    { id: 'black-forest-labs/flux-fill-pro', name: 'FLUX Fill Pro', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'Inpainting and outpainting with seamless removal' },
    { id: 'black-forest-labs/flux-depth-pro', name: 'FLUX Depth Pro', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'Structure-preserving edits with depth awareness' },
    { id: 'black-forest-labs/flux-canny-pro', name: 'FLUX Canny Pro', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'Edge-guided generation for controlled composition' },
    { id: 'black-forest-labs/flux-kontext-max', name: 'FLUX Kontext Max', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'Premium text-based editing with typography support', tier: 'pro' },
    { id: 'black-forest-labs/flux-kontext-pro', name: 'FLUX Kontext Pro', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'State-of-the-art text-based image editing', tier: 'pro' },
    { id: 'black-forest-labs/flux-redux-dev', name: 'FLUX Redux Dev', provider: 'replicate', capability: 'image-editing', type: 'image', desc: 'Image variation while preserving original elements' },
    // Image Generation - Other Providers
    { id: 'stability-ai/sdxl', name: 'Stable Diffusion XL', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'High-definition features with accurate colors and contrast' },
    { id: 'stability-ai/stable-diffusion-3.5-large', name: 'Stable Diffusion 3.5 Large', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'High-resolution generation with fine detail support' },
    { id: 'google/imagen-4', name: 'Imagen 4', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: "Google's flagship image generation model" },
    { id: 'google/imagen-4-fast', name: 'Imagen 4 Fast', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Fast version of Imagen 4 for rapid iteration' },
    { id: 'google/imagen-3', name: 'Imagen 3', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: "Google's highest quality photorealistic model" },
    { id: 'ideogram-ai/ideogram-v3-turbo', name: 'Ideogram V3 Turbo', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Fastest, cheapest Ideogram v3 for rapid iteration' },
    { id: 'recraft-ai/recraft-v3', name: 'Recraft V3', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Professional design with long text rendering capability' },
    { id: 'luma/photon', name: 'Luma Photon', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'High-quality image generation optimized for photorealism' },
    { id: 'nvidia/sana', name: 'NVIDIA Sana', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Fast image model with wide artistic range' },
    { id: 'bytedance/seedream-4', name: 'SeedReam 4', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Unified text-to-image with precise style control' },
    { id: 'qwen/qwen-image', name: 'Qwen Image', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Image generation foundation model from Qwen series' },
    // Image Generation - Character Consistency
    { id: 'fofr/consistent-character', name: 'Consistent Character', provider: 'replicate', capability: 'text-to-image', type: 'image', desc: 'Multi-pose character generation with style consistency', tier: 'quality' },
    // Video Generation
    { id: 'wan-2.5-t2v', name: 'Wan 2.5 T2V', provider: 'replicate', capability: 'text-to-video', type: 'video', desc: 'Alibaba Wan video generation via Replicate', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'wan-2.5-i2v', name: 'Wan 2.5 I2V', provider: 'replicate', capability: 'image-to-video', type: 'video', desc: 'Alibaba Wan image animation via Replicate', supportedDurations: ['5s', '10s', '15s'] },

    // === GOOGLE (Direct API) ===
    { id: 'imagen-3', name: 'Imagen 3', provider: 'google', capability: 'text-to-image', type: 'image', desc: "Google's highest quality photorealistic image model" },
    { id: 'imagen-4', name: 'Imagen 4', provider: 'google', capability: 'text-to-image', type: 'image', desc: "Google's latest text-to-image with improved quality" },
    { id: 'veo-2', name: 'Veo 2', provider: 'google', capability: 'text-to-video', type: 'video', desc: 'High-quality video with realistic motion', supportedDurations: ['4s', '8s'] },
    { id: 'veo-3', name: 'Veo 3', provider: 'google', capability: 'text-to-video', type: 'video', desc: 'Most advanced video model with native audio support', supportedDurations: ['4s', '8s'] },

    // === OPENAI ===
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', capability: 'text-to-image', type: 'image', desc: 'Creative concept generation with strong prompt following' },
    { id: 'gpt-image-1', name: 'GPT Image 1', provider: 'openai', capability: 'text-to-image', type: 'image', desc: 'Latest OpenAI image model with advanced understanding' },
    { id: 'sora-2-pro', name: 'Sora 2 Pro', provider: 'openai', capability: 'text-to-video', type: 'video', desc: 'High-fidelity cinematic video with complex scenes', supportedDurations: ['4s', '8s', '12s'] },
    { id: 'sora-2', name: 'Sora 2', provider: 'openai', capability: 'text-to-video', type: 'video', desc: 'Standard video generation with realistic motion', supportedDurations: ['4s', '8s', '12s'] },
    { id: 'sora', name: 'Sora (Legacy)', provider: 'openai', capability: 'text-to-video', type: 'video', desc: 'Original Sora model for video generation', supportedDurations: ['4s', '8s', '12s'] },

    // === COMFYUI (Local) ===
    { id: 'sdxl', name: 'Stable Diffusion XL (Local)', provider: 'comfy', capability: 'text-to-image', type: 'image', desc: 'Run SDXL locally with full control and no API costs' },
    { id: 'flux-dev', name: 'FLUX.1 Dev (Local)', provider: 'comfy', capability: 'text-to-image', type: 'image', desc: 'Run FLUX locally with custom LoRAs and workflows' },
    { id: 'ltx-video', name: 'LTX Video (Local)', provider: 'comfy', capability: 'text-to-video', type: 'video', desc: 'Fast local video generation with ComfyUI', supportedDurations: ['5s'] },
    { id: 'wan-2.2', name: 'Wan 2.2 (Local)', provider: 'comfy', capability: 'image-to-video', type: 'video', desc: 'Local image animation with Alibaba Wan model', supportedDurations: ['5s'] },
    { id: 'hunyuan-video', name: 'Hunyuan Video (Local)', provider: 'comfy', capability: 'text-to-video', type: 'video', desc: 'Open-source video generation running locally', supportedDurations: ['4s'] },
];

export function getModelsByCapability(capability: ModelCapability): ModelInfo[] {
    return ALL_MODELS.filter(m => m.capability === capability);
}

export function getModelsByProvider(provider: string): ModelInfo[] {
    return ALL_MODELS.filter(m => m.provider === provider);
}

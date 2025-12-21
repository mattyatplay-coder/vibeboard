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
    maker: string;    // 'Black Forest Labs', 'Kling', 'Wan', 'OpenAI', 'Google', etc.
    capability: ModelCapability;
    desc?: string;
    cost?: string; // Estimated cost string e.g. "$0.003"
    type: 'image' | 'video'; // Underlying primitive type
    tier?: 'fast' | 'quality' | 'pro';
    supportedDurations?: string[]; // e.g. ['5s', '10s']
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
    // Image Gen
    { id: 'fal-ai/flux/dev', name: 'Flux Dev', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Best quality, great text & detail' },
    { id: 'fal-ai/flux/schnell', name: 'Flux Schnell', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Fast, good for drafts' },
    { id: 'fal-ai/flux-lora', name: 'Flux LoRA', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Flux with LoRA support' },
    { id: 'fal-ai/flux-pro', name: 'Flux Pro', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Premium quality, commercial use' },
    { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'Flux 1.1 Pro Ultra', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: '4K Ultra HD quality' },
    { id: 'fal-ai/flux-2-max', name: 'Flux 2 Max', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Highest fidelity Flux v2' },
    { id: 'fal-ai/flux-2-flex', name: 'Flux 2 Flex', provider: 'fal', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Flexible style control' },

    { id: 'fal-ai/recraft-v3', name: 'Recraft V3', provider: 'fal', maker: 'Recraft', capability: 'text-to-image', type: 'image', desc: 'Vector art, logos, icons' },
    { id: 'fal-ai/ideogram/v2', name: 'Ideogram V2', provider: 'fal', maker: 'Ideogram', capability: 'text-to-image', type: 'image', desc: 'Perfect text in images' },
    { id: 'fal-ai/ideogram/character', name: 'Ideogram V3 Character', provider: 'fal', maker: 'Ideogram', capability: 'text-to-image', type: 'image', desc: 'Character sheets & turnarounds', tier: 'quality' },
    { id: 'fal-ai/flux-kontext/dev', name: 'Flux Kontext Dev', provider: 'fal', maker: 'Black Forest Labs', capability: 'image-editing', type: 'image', desc: 'Character-consistent editing' },
    { id: 'fal-ai/flux-kontext/pro', name: 'Flux Kontext Pro', provider: 'fal', maker: 'Black Forest Labs', capability: 'image-editing', type: 'image', desc: 'Premium character consistency', tier: 'pro' },
    { id: 'fal-ai/ip-adapter-face-id', name: 'IP-Adapter Face ID', provider: 'fal', maker: 'Tencent', capability: 'image-editing', type: 'image', desc: 'Face identity preservation' },
    { id: 'fal-ai/stable-diffusion-v35-large', name: 'SD 3.5 Large', provider: 'fal', maker: 'Stability AI', capability: 'text-to-image', type: 'image', desc: 'Latest Stability AI model' },
    { id: 'fal-ai/imagen3', name: 'Imagen 3', provider: 'fal', maker: 'Google', capability: 'text-to-image', type: 'image', desc: 'Google photorealistic' },
    { id: 'fal-ai/imagen4/preview', name: 'Imagen 4 (Preview)', provider: 'fal', maker: 'Google', capability: 'text-to-image', type: 'image', desc: 'Latest Google quality' },

    // Image Edit
    { id: 'fal-ai/flux-2-flex/edit', name: 'Flux 2 Flex Edit', provider: 'fal', maker: 'Black Forest Labs', capability: 'image-editing', type: 'image', desc: 'Edit existing images' },
    { id: 'fal-ai/flux/dev/image-to-image', name: 'Flux Dev I2I', provider: 'fal', maker: 'Black Forest Labs', capability: 'image-editing', type: 'image', desc: 'Transform images' },
    { id: 'fal-ai/flux/dev/inpainting', name: 'Flux Dev Inpaint', provider: 'fal', maker: 'Black Forest Labs', capability: 'image-editing', type: 'image', desc: 'Edit specific regions' },
    { id: 'fal-ai/kling-image/o1', name: 'Kling O1 Image', provider: 'fal', maker: 'Kling', capability: 'text-to-image', type: 'image', desc: 'Multi-reference editor' },
    { id: 'fal-ai/creative-upscaler', name: 'Creative Upscaler (4x)', provider: 'fal', maker: 'Fal.ai', capability: 'image-editing', type: 'image', desc: 'Add detail while upscaling' },
    { id: 'fal-ai/clarity-upscaler', name: 'Clarity Upscaler', provider: 'fal', maker: 'Fal.ai', capability: 'image-editing', type: 'image', desc: 'Sharp, faithful upscaling' },

    // Video T2V
    { id: 'fal-ai/wan-t2v', name: 'Wan 2.2 T2V', provider: 'fal', maker: 'Wan', capability: 'text-to-video', type: 'video', desc: 'Realistic motion, cinematic', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/wan-25-preview/text-to-video', name: 'Wan 2.5 T2V', provider: 'fal', maker: 'Wan', capability: 'text-to-video', type: 'video', desc: 'Latest Wan, best quality', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/wan-2.1-t2v-1.3b', name: 'Wan 2.1 T2V (1.3B)', provider: 'fal', maker: 'Wan', capability: 'text-to-video', type: 'video', desc: 'Fast, efficient video gen', supportedDurations: ['5s'] },
    { id: 'fal-ai/ltx-video', name: 'LTX-Video T2V', provider: 'fal', maker: 'Lightricks', capability: 'text-to-video', type: 'video', desc: 'Fast, good for iteration', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/v2.6/pro/text-to-video', name: 'Kling 2.6 T2V', provider: 'fal', maker: 'Kling', capability: 'text-to-video', type: 'video', desc: 'High quality, realistic', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/vidu/v1/text-to-video', name: 'Vidu v1', provider: 'fal', maker: 'Vidu', capability: 'text-to-video', type: 'video', desc: 'Fast generation', supportedDurations: ['4s'] },
    { id: 'fal-ai/vidu/q2/reference-to-video', name: 'Vidu Q2 (Ref)', provider: 'fal', maker: 'Vidu', capability: 'image-to-video', type: 'video', desc: 'Up to 7 character refs', supportedDurations: ['4s'] },
    { id: 'fal-ai/hunyuan-video', name: 'Hunyuan Video', provider: 'fal', maker: 'Tencent', capability: 'text-to-video', type: 'video', desc: 'High motion quality', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/minimax-video', name: 'MiniMax Video', provider: 'fal', maker: 'MiniMax', capability: 'text-to-video', type: 'video', desc: 'Fast, expressive motion', supportedDurations: ['6s'] },
    { id: 'fal-ai/luma-dream-machine', name: 'Luma Dream Machine', provider: 'fal', maker: 'Luma', capability: 'text-to-video', type: 'video', desc: 'Smooth, dreamlike motion', supportedDurations: ['5s', '9s'] },
    { id: 'fal-ai/kling-video/v1.5/pro', name: 'Kling 1.5 Pro', provider: 'fal', maker: 'Kuaishou', capability: 'text-to-video', type: 'video', desc: 'High quality, realistic', supportedDurations: ['5s', '10s'] },

    // Video I2V (Animation)
    { id: 'fal-ai/wan/v2.2-a14b/image-to-video', name: 'Wan 2.2 I2V', provider: 'fal', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'Animate still images', supportedDurations: ['5s'] },
    { id: 'fal-ai/wan/v2.2-a14b/image-to-video/lora', name: 'Wan 2.2 (LoRA)', provider: 'fal', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'Animation with trained characters', supportedDurations: ['5s'] },
    { id: 'fal-ai/wan-25-preview/image-to-video', name: 'Wan 2.5 I2V', provider: 'fal', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'Best image animation', supportedDurations: ['5s'] },
    { id: 'fal-ai/wan-2.1-i2v-14b', name: 'Wan 2.1 I2V (14B)', provider: 'fal', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'High quality image-to-video', supportedDurations: ['5s'] },
    { id: 'fal-ai/ltx-video/image-to-video', name: 'LTX-Video I2V', provider: 'fal', maker: 'Lightricks', capability: 'image-to-video', type: 'video', desc: 'Quick image animation', supportedDurations: ['6s', '10s'] },
    { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1 I2V', provider: 'fal', maker: 'Kling', capability: 'image-to-video', type: 'video', desc: 'Good balance', supportedDurations: ['5s'] },
    { id: 'fal-ai/kling-video/v2.6/pro/image-to-video', name: 'Kling 2.6 I2V', provider: 'fal', maker: 'Kling', capability: 'image-to-video', type: 'video', desc: 'Pro-quality animation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/kling-video/o1/image-to-video', name: 'Kling O1 I2V', provider: 'fal', maker: 'Kling', capability: 'image-to-video', type: 'video', desc: 'Premium image animation', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/minimax-video/image-to-video', name: 'MiniMax I2V', provider: 'fal', maker: 'MiniMax', capability: 'image-to-video', type: 'video', desc: 'Quick, lively animations', supportedDurations: ['6s', '10s'] },
    { id: 'fal-ai/luma-dream-machine/image-to-video', name: 'Luma I2V', provider: 'fal', maker: 'Luma', capability: 'image-to-video', type: 'video', desc: 'Ethereal animations', supportedDurations: ['5s'] },
    { id: 'fal-ai/runway-gen3/turbo/image-to-video', name: 'Runway Gen3 Turbo', provider: 'fal', maker: 'Runway', capability: 'image-to-video', type: 'video', desc: 'Fast, cinematic style', supportedDurations: ['5s', '10s'] },

    // Avatar / Character (Pose)
    { id: 'fal-ai/one-to-all-animation/14b', name: 'One-To-All (14B)', provider: 'fal', maker: 'Synthesia', capability: 'avatar', type: 'video', desc: 'Pose-driven character animation' },
    { id: 'fal-ai/wan-video-2.2-animate-move', name: 'Wan 2.2 Animate Move', provider: 'fal', maker: 'Wan', capability: 'avatar', type: 'video', desc: 'Character animation from video' },
    { id: 'fal-ai/kling-video/ai-avatar/v2/pro', name: 'Kling Avatar Pro', provider: 'fal', maker: 'Kling', capability: 'avatar', type: 'video', desc: 'Talking head (Pro)' },
    { id: 'fal-ai/kling-video/ai-avatar/v2/standard', name: 'Kling Avatar Std', provider: 'fal', maker: 'Kling', capability: 'avatar', type: 'video', desc: 'Talking head (Fast)' },
    { id: 'fal-ai/creatify/aurora', name: 'Creatify Aurora', provider: 'fal', maker: 'Creatify', capability: 'avatar', type: 'video', desc: 'High-fidelity portrait animation' },

    // Video Editing
    { id: 'fal-ai/wan-vace-14b/inpainting', name: 'Wan VACE Inpaint', provider: 'fal', maker: 'Wan', capability: 'video-editing', type: 'video', desc: 'Edit video regions' },
    { id: 'fal-ai/kling-video/o1/video-to-video/edit', name: 'Kling O1 V2V Edit', provider: 'fal', maker: 'Kling', capability: 'video-editing', type: 'video', desc: 'Edit existing videos' },

    // === REPLICATE ===
    // Custom Trained LoRA Models
    { id: 'mattyatplay-coder/angelicatraining', name: 'Angelica (LoRA)', provider: 'replicate', maker: 'MattyAtPlay', capability: 'text-to-image', type: 'image', desc: 'Custom trained character - trigger: ohwx_angelica', tier: 'quality' },
    { id: 'qwen/qwen-image-edit-plus', name: 'Qwen Image Edit Plus', provider: 'replicate', maker: 'Qwen', capability: 'image-editing', type: 'image', desc: 'Remove clothes/objects (Plus)', tier: 'quality' },
    { id: 'fofr/consistent-character', name: 'Consistent Character', provider: 'replicate', maker: 'Fofr', capability: 'text-to-image', type: 'image', desc: 'Character poses & turnarounds', tier: 'quality' },
    { id: 'black-forest-labs/flux-dev', name: 'Flux Dev', provider: 'replicate', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Replicate Flux Dev' },
    { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', provider: 'replicate', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Replicate Flux Schnell' },
    { id: 'stability-ai/sdxl', name: 'SDXL', provider: 'replicate', maker: 'Stability AI', capability: 'text-to-image', type: 'image', desc: 'Standard SDXL' },
    { id: 'realistic-vision', name: 'Realistic Vision', provider: 'replicate', maker: 'SG161222', capability: 'text-to-image', type: 'image', desc: 'Photorealistic' },
    { id: 'wan-2.5-t2v', name: 'Wan 2.5 T2V', provider: 'replicate', maker: 'Wan', capability: 'text-to-video', type: 'video', desc: 'Replicate Wan T2V', supportedDurations: ['5s', '10s'] },
    { id: 'wan-2.5-i2v', name: 'Wan 2.5 I2V', provider: 'replicate', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'Replicate Wan I2V', supportedDurations: ['5s'] },

    // === GOOGLE ===
    { id: 'imagen-3', name: 'Imagen 3', provider: 'google', maker: 'Google', capability: 'text-to-image', type: 'image', desc: 'Google Photorealism' },
    { id: 'veo-2', name: 'Veo 2', provider: 'google', maker: 'Google', capability: 'text-to-video', type: 'video', desc: 'Stable video', supportedDurations: ['4s', '8s'] },
    { id: 'veo-3.1', name: 'Veo 3.1', provider: 'google', maker: 'Google', capability: 'text-to-video', type: 'video', desc: 'Cinematic video', supportedDurations: ['4s', '8s'] },
    { id: 'fal-ai/nano-banana-pro/edit', name: 'Nano Banana Pro Edit', provider: 'google', maker: 'Google', capability: 'text-to-image', type: 'image', desc: 'Experimental editor' },

    // === OPENAI ===
    { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', maker: 'OpenAI', capability: 'text-to-image', type: 'image', desc: 'Creative concepts' },
    { id: 'sora-2-pro', name: 'Sora 2.0 Pro', provider: 'openai', maker: 'OpenAI', capability: 'text-to-video', type: 'video', desc: 'High-fidelity cinematic video', supportedDurations: ['5s', '10s', '15s'] },
    { id: 'sora-2', name: 'Sora 2.0', provider: 'openai', maker: 'OpenAI', capability: 'text-to-video', type: 'video', desc: 'Standard video generation', supportedDurations: ['5s', '10s'] },
    { id: 'sora', name: 'Sora 1.0 (Alpha)', provider: 'openai', maker: 'OpenAI', capability: 'text-to-video', type: 'video', desc: 'Legacy alpha', supportedDurations: ['5s', '10s'] },
    { id: 'fal-ai/gpt-image-1.5/edit', name: 'GPT Image 1.5 Edit', provider: 'openai', maker: 'OpenAI', capability: 'text-to-image', type: 'image', desc: 'Advanced prompt adherence' },

    // === COMFY (Local) ===
    { id: 'sdxl', name: 'SDXL (Local)', provider: 'comfy', maker: 'Stability AI', capability: 'text-to-image', type: 'image', desc: 'Local SDXL' },
    { id: 'flux-dev', name: 'Flux Dev (Local)', provider: 'comfy', maker: 'Black Forest Labs', capability: 'text-to-image', type: 'image', desc: 'Local Flux' },
    { id: 'ltx-video', name: 'LTX-Video (Local)', provider: 'comfy', maker: 'Lightricks', capability: 'text-to-video', type: 'video', desc: 'Local Video', supportedDurations: ['5s', '10s'] },
    { id: 'wan-2.2', name: 'Wan 2.2 (Local)', provider: 'comfy', maker: 'Wan', capability: 'image-to-video', type: 'video', desc: 'Local Animation', supportedDurations: ['5s'] },
];

export function getModelsByCapability(capability: ModelCapability): ModelInfo[] {
    return ALL_MODELS.filter(m => m.capability === capability);
}

export function getModelsByProvider(provider: string): ModelInfo[] {
    return ALL_MODELS.filter(m => m.provider === provider);
}

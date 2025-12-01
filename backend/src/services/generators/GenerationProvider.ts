export interface GenerationOptions {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    aspectRatio?: string;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    model?: string; // Added for Fal.ai model selection
    strength?: number; // Added for Image-to-Image strength
    duration?: string; // Added for video duration (e.g. "5", "10")
    count?: number; // Added for number of images to generate
    sampler?: { id: string; name: string; value: string };
    scheduler?: { id: string; name: string; value: string };
    loras?: {
        path: string;
        strength: number;
    }[];
    sourceImages?: string[];
    maskUrl?: string; // Added for Inpainting/Retake
    sourceVideoUrl?: string; // Added for Video Inpainting
    // Advanced Video Generation
    mode?: 'text_to_video' | 'image_to_video' | 'frames_to_video' | 'extend_video';
    startFrame?: string; // base64 or URL
    endFrame?: string; // base64 or URL
    inputVideo?: string; // base64 or URL for extension
}

export interface GenerationResult {
    id: string;
    status: 'queued' | 'running' | 'succeeded' | 'failed';
    outputs?: string[]; // URLs
    error?: string;
    provider?: string; // Added to track which provider was used
    seed?: number; // Added to track the seed used
}

export interface GenerationProvider {
    generateImage(options: GenerationOptions): Promise<GenerationResult>;
    generateVideo(image: string | undefined, options: GenerationOptions): Promise<GenerationResult>;
    checkStatus(id: string): Promise<GenerationResult>;
}

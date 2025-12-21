export interface Tag {
    id: string;
    name: string;
    category: string;
    icon?: string;
    description?: string;
    promptKeyword: string;
    videoExample?: string;
}

export interface VideoEngine {
    id: 'kling' | 'wan' | 'ltx' | 'veo' | 'sora' | 'luma';
    name: string;
    description: string;
    capabilities: {
        maxDuration: number;
        resolutions: string[];
        aspectRatios: string[];
    };
    costPerSecond: number;
}

export interface LoRA {
    id: string;
    name: string;
    triggerWord: string;
    description?: string;
    thumbnail?: string;
}

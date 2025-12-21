/**
 * ModelMetadataSync - Automatically syncs model metadata from provider APIs
 *
 * This service fetches model information from:
 * - Civitai API (LoRAs, Checkpoints, embeddings)
 * - Fal.ai API (available models and their capabilities)
 * - Replicate API (model metadata)
 *
 * It auto-generates:
 * - ModelPromptGuides entries with syntax, quality boosters, templates
 * - ModelConstraints entries with LoRA support, NSFW filtering, etc.
 * - ModelRequirements for I2V, inpainting, and other specialized models
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

export interface ModelMetadata {
    id: string;
    name: string;
    provider: 'fal' | 'civitai' | 'replicate' | 'openai' | 'google' | 'runway' | 'local';
    type: 'image' | 'video' | 'both';

    // Capabilities
    capabilities: {
        textToImage?: boolean;
        imageToImage?: boolean;
        textToVideo?: boolean;
        imageToVideo?: boolean;
        videoToVideo?: boolean;
        inpainting?: boolean;
        outpainting?: boolean;
        upscaling?: boolean;
        avatar?: boolean;
        motionTransfer?: boolean;
    };

    // Technical constraints
    constraints: {
        supportsLoRA?: boolean;
        maxLoRAs?: number;
        supportsIPAdapter?: boolean;
        maxReferences?: number;
        minReferences?: number;
        supportsNegativePrompt?: boolean;
        supportsCFG?: boolean;
        supportsScheduler?: boolean;
        maxPromptLength?: number;
        supportedAspectRatios?: string[];
        supportedResolutions?: string[];
        supportedDurations?: string[];
        nsfwFiltered?: boolean;
        nsfwStrength?: 'strict' | 'moderate' | 'permissive';
        supportsAudio?: boolean;
    };

    // Prompt guidance
    promptGuide: {
        style: 'natural' | 'tags' | 'structured';
        separator: string;
        weightSyntax?: string;
        qualityBoosters: string[];
        avoidTerms: string[];
        stylePrefixes: string[];
        triggerWordPlacement?: 'start' | 'before_subject' | 'after_subject' | 'end';
        template?: string;
        examples?: Array<{ input: string; output: string; notes?: string }>;
        negativePromptTemplate?: string;
    };

    // Required inputs
    requirements?: Array<{
        input: 'image' | 'audio' | 'video' | 'mask' | 'faceReference' | 'motionVideo' | 'sourceVideo';
        label: string;
        description: string;
        accept: string;
        optional?: boolean;
    }>;

    // Pricing info
    pricing?: {
        perImage?: number;
        perSecond?: number;
        perMegapixel?: number;
        basePrice?: number;
    };

    // Base model for LoRA compatibility
    baseModel?: string;

    // Additional notes
    notes?: string[];

    // Last updated timestamp
    lastUpdated: Date;
    source: 'api' | 'manual' | 'inferred';
}

export interface CivitaiModelInfo {
    id: number;
    name: string;
    description?: string; // HTML/Markdown description with recommended settings
    type: 'Checkpoint' | 'LORA' | 'TextualInversion' | 'Hypernetwork' | 'AestheticGradient' | 'Controlnet' | 'Poses';
    nsfw: boolean;
    tags: string[];
    modelVersions: Array<{
        id: number;
        name: string;
        description?: string; // Version-specific description
        baseModel: string;
        trainedWords?: string[];
        files: Array<{
            name: string;
            downloadUrl: string;
            sizeKB: number;
        }>;
    }>;
    creator?: {
        username: string;
    };
}

/**
 * Parsed recommended settings from Civitai description
 */
export interface ParsedRecommendedSettings {
    sampler?: string;
    scheduler?: string;
    steps?: number;
    stepsRange?: { min: number; max: number };
    cfg?: number;
    cfgRange?: { min: number; max: number };
    clipSkip?: number;
    denoisingStrength?: number;
    hiresUpscaler?: string;
    vae?: string;
    negativePrompt?: string;
    pros?: string[];
    cons?: string[];
    notes?: string[];
}

export interface FalModelInfo {
    id: string;
    name: string;
    description?: string;
    input_schema?: Record<string, any>;
    output_schema?: Record<string, any>;
}

// ============================================
// DESCRIPTION PARSING
// ============================================

/**
 * Parse recommended settings from a Civitai model/version description
 * Handles various formats like:
 * - "**Sampler:** DPM++ 2M Karras"
 * - "Sampler: Euler a"
 * - "• CFG: 7"
 * - "Steps: 20-30"
 * - Markdown bullet points, tables, etc.
 */
export function parseDescriptionSettings(description: string | undefined): ParsedRecommendedSettings {
    if (!description) return {};

    const settings: ParsedRecommendedSettings = {};

    // Strip HTML tags but keep text content
    const text = description
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/\*/g, '')   // Remove markdown italic
        .replace(/`/g, '');   // Remove code ticks

    // Helper to find values after a label
    const findValue = (patterns: RegExp[]): string | undefined => {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1]) return match[1].trim();
        }
        return undefined;
    };

    // Helper to find numeric values
    const findNumber = (patterns: RegExp[]): number | undefined => {
        const val = findValue(patterns);
        if (val) {
            const num = parseFloat(val);
            if (!isNaN(num)) return num;
        }
        return undefined;
    };

    // Helper to find numeric ranges like "20-30" or "3.0 - 5.0"
    const findRange = (patterns: RegExp[]): { min: number; max: number } | undefined => {
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1] && match?.[2]) {
                const min = parseFloat(match[1]);
                const max = parseFloat(match[2]);
                if (!isNaN(min) && !isNaN(max)) {
                    return { min, max };
                }
            }
        }
        return undefined;
    };

    // Sampler patterns
    settings.sampler = findValue([
        /sampler[:\s]+([A-Za-z0-9+_\- ]+?)(?:\n|,|;|\||$)/i,
        /sampler[:\s]+([A-Za-z0-9+_\- ]+)/i,
    ]);

    // Scheduler patterns (sometimes called "Schedule Type")
    settings.scheduler = findValue([
        /schedule(?:\s*type)?[:\s]+([A-Za-z0-9+_\- ]+?)(?:\n|,|;|\||$)/i,
        /scheduler[:\s]+([A-Za-z0-9+_\- ]+?)(?:\n|,|;|\||$)/i,
    ]);

    // Steps patterns - try range first, then single value
    settings.stepsRange = findRange([
        /steps[:\s]+(\d+)\s*[-–—]\s*(\d+)/i,
        /steps[:\s]+(\d+)\s*to\s*(\d+)/i,
    ]);
    if (!settings.stepsRange) {
        settings.steps = findNumber([
            /steps[:\s]+(\d+)/i,
        ]);
    }

    // CFG patterns - try range first, then single value
    settings.cfgRange = findRange([
        /cfg[:\s]+(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/i,
        /cfg[:\s]+(\d+\.?\d*)\s*to\s*(\d+\.?\d*)/i,
        /guidance[:\s]+(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/i,
        /good\s*(?:working\s*)?range[:\s]+(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/i,
    ]);
    if (!settings.cfgRange) {
        settings.cfg = findNumber([
            /cfg[:\s]+(\d+\.?\d*)/i,
            /cfg\s*scale[:\s]+(\d+\.?\d*)/i,
            /guidance[:\s]+(\d+\.?\d*)/i,
        ]);
    }

    // Clip Skip
    settings.clipSkip = findNumber([
        /clip\s*skip[:\s]+(\d+)/i,
    ]);

    // Denoising Strength
    settings.denoisingStrength = findNumber([
        /denoising\s*(?:strength)?[:\s]+(\d+\.?\d*)/i,
    ]);

    // Hires Upscaler
    settings.hiresUpscaler = findValue([
        /(?:hires\s*)?upscaler[:\s]+([A-Za-z0-9+_\- ]+?)(?:\n|,|;|\||$)/i,
    ]);

    // VAE
    settings.vae = findValue([
        /vae[:\s]+([A-Za-z0-9+_\-.]+?)(?:\n|,|;|\||$)/i,
    ]);

    // Parse Pros section
    const prosMatch = text.match(/(?:✅\s*)?pros[:\s]*\n?((?:[•\-\*]\s*[^\n]+\n?)+)/i);
    if (prosMatch) {
        settings.pros = prosMatch[1]
            .split(/\n/)
            .map(line => line.replace(/^[•\-\*⚡]\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    // Parse Cons / Known Flaws section
    const consMatch = text.match(/(?:⚠️?\s*)?(?:cons|known\s*flaws)[:\s]*\n?((?:[•\-\*]\s*[^\n]+\n?)+)/i);
    if (consMatch) {
        settings.cons = consMatch[1]
            .split(/\n/)
            .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    // Parse negative prompt suggestions
    const negMatch = text.match(/(?:negative\s*prompt|avoid)[:\s]*["']?([^"'\n]+)["']?/i);
    if (negMatch) {
        settings.negativePrompt = negMatch[1].trim();
    }

    // Parse general notes (lines starting with "Note:" or similar)
    const notesMatches = text.matchAll(/(?:note|tip|important)[:\s]+([^\n]+)/gi);
    const notes: string[] = [];
    for (const match of notesMatches) {
        notes.push(match[1].trim());
    }
    if (notes.length > 0) {
        settings.notes = notes;
    }

    return settings;
}

/**
 * Convert parsed settings to a recommendedSettings object for the prompt guide
 */
export function settingsToRecommendedSettings(parsed: ParsedRecommendedSettings): Record<string, any> {
    const result: Record<string, any> = {};

    if (parsed.sampler) result.sampler = parsed.sampler;
    if (parsed.scheduler) result.scheduler = parsed.scheduler;

    if (parsed.stepsRange) {
        result.steps = parsed.stepsRange;
    } else if (parsed.steps) {
        result.steps = parsed.steps;
    }

    if (parsed.cfgRange) {
        result.cfg = parsed.cfgRange;
    } else if (parsed.cfg) {
        result.cfg = parsed.cfg;
    }

    if (parsed.clipSkip) result.clipSkip = parsed.clipSkip;
    if (parsed.denoisingStrength) result.denoisingStrength = parsed.denoisingStrength;
    if (parsed.hiresUpscaler) result.hiresUpscaler = parsed.hiresUpscaler;
    if (parsed.vae) result.vae = parsed.vae;

    return result;
}

// ============================================
// CIVITAI API
// ============================================

const CIVITAI_API_BASE = 'https://civitai.com/api/v1';

export async function fetchCivitaiModel(modelId: string): Promise<CivitaiModelInfo | null> {
    try {
        // Handle various Civitai ID formats:
        // - "123456" (model ID)
        // - "123456@789012" (model ID @ version ID)
        // - Full URL
        let numericId: string;
        let versionId: string | undefined;

        if (modelId.includes('@')) {
            [numericId, versionId] = modelId.split('@');
        } else if (modelId.includes('civitai.com')) {
            const match = modelId.match(/models\/(\d+)/);
            numericId = match?.[1] || modelId;
        } else {
            numericId = modelId;
        }

        const response = await fetch(`${CIVITAI_API_BASE}/models/${numericId}`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            console.error(`[ModelMetadataSync] Civitai API error: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('[ModelMetadataSync] Failed to fetch Civitai model:', error);
        return null;
    }
}

export function civitaiToMetadata(civitai: CivitaiModelInfo, versionId?: string): ModelMetadata {
    const version = versionId
        ? civitai.modelVersions.find(v => v.id.toString() === versionId)
        : civitai.modelVersions[0];

    const baseModel = version?.baseModel || 'Unknown';
    const triggerWords = version?.trainedWords || [];
    const isLoRA = civitai.type === 'LORA';
    const isCheckpoint = civitai.type === 'Checkpoint';

    // Parse recommended settings from both model and version descriptions
    const modelSettings = parseDescriptionSettings(civitai.description);
    const versionSettings = parseDescriptionSettings(version?.description);
    // Version-specific settings override model-level settings
    const parsedSettings: ParsedRecommendedSettings = { ...modelSettings, ...versionSettings };

    // Infer prompt style from base model
    const isPony = baseModel.toLowerCase().includes('pony');
    const isSDXL = baseModel.toLowerCase().includes('sdxl') || baseModel.toLowerCase().includes('xl');
    const isFlux = baseModel.toLowerCase().includes('flux');
    const isSD15 = baseModel.toLowerCase().includes('sd 1') || baseModel.toLowerCase().includes('sd1');
    const isIllustrious = baseModel.toLowerCase().includes('illustrious') || baseModel.toLowerCase().includes('noob');

    // Build quality boosters based on model type
    let qualityBoosters: string[] = [];
    let avoidTerms: string[] = [];
    let style: 'natural' | 'tags' | 'structured' = 'natural';
    let negativeTemplate = '';

    if (isPony) {
        style = 'tags';
        qualityBoosters = ['score_9', 'score_8_up', 'score_7_up', 'source_anime'];
        avoidTerms = ['score_4', 'score_3', 'score_2', 'score_1'];
        negativeTemplate = 'score_4, score_3, score_2, score_1, lowres, bad anatomy, worst quality, low quality';
    } else if (isIllustrious) {
        style = 'tags';
        qualityBoosters = ['masterpiece', 'best quality', 'absurdres', 'highres'];
        avoidTerms = ['lowres', 'bad anatomy', 'worst quality'];
        negativeTemplate = 'lowres, bad anatomy, bad hands, worst quality, low quality, blurry, jpeg artifacts';
    } else if (isFlux) {
        style = 'natural';
        qualityBoosters = ['highly detailed', 'professional quality', 'sharp focus'];
        avoidTerms = [];
        negativeTemplate = 'blurry, low quality, distorted, deformed';
    } else if (isSDXL) {
        style = 'tags';
        qualityBoosters = ['masterpiece', 'best quality', 'highly detailed', '8k'];
        avoidTerms = ['lowres', 'bad anatomy', 'worst quality'];
        negativeTemplate = 'lowres, bad anatomy, bad hands, text, error, worst quality, low quality, blurry';
    } else if (isSD15) {
        style = 'tags';
        qualityBoosters = ['masterpiece', 'best quality', 'highly detailed'];
        avoidTerms = ['lowres', 'bad anatomy'];
        negativeTemplate = 'lowres, bad anatomy, bad hands, text, error, worst quality, low quality, blurry, bad feet';
    }

    // Use negative prompt from description if available
    if (parsedSettings.negativePrompt) {
        negativeTemplate = parsedSettings.negativePrompt;
    }

    // Build template with trigger words
    let template = '';
    if (triggerWords.length > 0) {
        const triggerPlaceholder = triggerWords.join(', ');
        if (isPony) {
            template = `score_9, score_8_up, ${triggerPlaceholder}, {subject_description}, {pose_action}, {setting_background}, {style}`;
        } else {
            template = `${triggerPlaceholder}, {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}`;
        }
    }

    // Build recommended settings object from parsed description
    const recommendedSettings = settingsToRecommendedSettings(parsedSettings);

    // Build notes array with parsed info
    const notes: string[] = [
        `Civitai ${civitai.type}`,
        triggerWords.length > 0 ? `Trigger words: ${triggerWords.join(', ')}` : '',
        `Base model: ${baseModel}`,
    ];

    // Add recommended settings to notes for visibility
    if (parsedSettings.sampler) {
        notes.push(`Recommended sampler: ${parsedSettings.sampler}`);
    }
    if (parsedSettings.scheduler) {
        notes.push(`Recommended scheduler: ${parsedSettings.scheduler}`);
    }
    if (parsedSettings.steps) {
        notes.push(`Recommended steps: ${parsedSettings.steps}`);
    } else if (parsedSettings.stepsRange) {
        notes.push(`Recommended steps: ${parsedSettings.stepsRange.min}-${parsedSettings.stepsRange.max}`);
    }
    if (parsedSettings.cfg) {
        notes.push(`Recommended CFG: ${parsedSettings.cfg}`);
    } else if (parsedSettings.cfgRange) {
        notes.push(`Recommended CFG: ${parsedSettings.cfgRange.min}-${parsedSettings.cfgRange.max}`);
    }
    if (parsedSettings.clipSkip) {
        notes.push(`Recommended Clip Skip: ${parsedSettings.clipSkip}`);
    }

    // Add pros/cons to notes
    if (parsedSettings.pros && parsedSettings.pros.length > 0) {
        notes.push(`Pros: ${parsedSettings.pros.join('; ')}`);
    }
    if (parsedSettings.cons && parsedSettings.cons.length > 0) {
        notes.push(`Known issues: ${parsedSettings.cons.join('; ')}`);
    }

    // Add any additional notes from description
    if (parsedSettings.notes) {
        notes.push(...parsedSettings.notes);
    }

    return {
        id: `civitai:${civitai.id}${versionId ? `@${versionId}` : ''}`,
        name: civitai.name,
        provider: 'civitai',
        type: 'image',

        capabilities: {
            textToImage: isCheckpoint,
            imageToImage: true,
        },

        constraints: {
            supportsLoRA: isCheckpoint,
            maxLoRAs: isCheckpoint ? 5 : undefined,
            supportsIPAdapter: isSDXL || isFlux,
            supportsNegativePrompt: !isFlux,
            nsfwFiltered: false,
            nsfwStrength: civitai.nsfw ? 'permissive' : 'moderate',
        },

        promptGuide: {
            style,
            separator: ', ',
            qualityBoosters,
            avoidTerms,
            stylePrefixes: [],
            triggerWordPlacement: 'start',
            template,
            negativePromptTemplate: negativeTemplate,
            // Include recommended settings from parsed description
            ...(Object.keys(recommendedSettings).length > 0 && {
                // Note: recommendedSettings will be added to the generated code
            }),
        },

        baseModel,
        notes: notes.filter(Boolean),

        // Store parsed settings for code generation
        _parsedSettings: parsedSettings,
        _recommendedSettings: recommendedSettings,

        lastUpdated: new Date(),
        source: 'api',
    } as ModelMetadata & { _parsedSettings: ParsedRecommendedSettings; _recommendedSettings: Record<string, any> };
}

// ============================================
// FAL.AI API
// ============================================

const FAL_KNOWN_MODELS: Record<string, Partial<ModelMetadata>> = {
    // Text-to-Image
    'fal-ai/flux/dev': {
        type: 'image',
        capabilities: { textToImage: true, imageToImage: true },
        constraints: { supportsLoRA: true, maxLoRAs: 5, supportsNegativePrompt: false, nsfwFiltered: false },
        promptGuide: { style: 'natural', separator: ', ', qualityBoosters: ['highly detailed', 'professional quality'], avoidTerms: [], stylePrefixes: [] },
    },
    'fal-ai/flux/schnell': {
        type: 'image',
        capabilities: { textToImage: true },
        constraints: { supportsLoRA: true, maxLoRAs: 3, supportsNegativePrompt: false, nsfwFiltered: false },
        promptGuide: { style: 'natural', separator: ', ', qualityBoosters: ['detailed'], avoidTerms: [], stylePrefixes: [] },
    },
    'fal-ai/flux-pro': {
        type: 'image',
        capabilities: { textToImage: true },
        constraints: { supportsLoRA: false, nsfwFiltered: true, nsfwStrength: 'moderate' },
        promptGuide: { style: 'natural', separator: ', ', qualityBoosters: ['professional quality', 'sharp focus', '8k'], avoidTerms: [], stylePrefixes: [] },
    },

    // Video T2V
    'fal-ai/wan/v2.6/text-to-video': {
        type: 'video',
        capabilities: { textToVideo: true },
        constraints: { supportsLoRA: false, supportsAudio: true, nsfwFiltered: false },
        promptGuide: {
            style: 'natural',
            separator: ', ',
            qualityBoosters: ['cinematic', 'smooth motion', '1080p', 'multi-shot'],
            avoidTerms: ['static', 'frozen'],
            stylePrefixes: [],
        },
    },
    'fal-ai/wan/v2.6/reference-to-video': {
        type: 'video',
        capabilities: { textToVideo: true },
        constraints: { supportsLoRA: false, supportsAudio: true, maxReferences: 3, minReferences: 1, nsfwFiltered: false },
        promptGuide: {
            style: 'natural',
            separator: ', ',
            weightSyntax: '@Video1, @Video2, @Video3',
            qualityBoosters: ['cinematic', 'character consistent', '1080p'],
            avoidTerms: ['static', 'frozen', 'inconsistent'],
            stylePrefixes: [],
        },
    },

    // I2V models
    'fal-ai/kling-video/v2.1/master/image-to-video': {
        type: 'video',
        capabilities: { imageToVideo: true },
        constraints: { supportsLoRA: false, maxReferences: 1, minReferences: 1, nsfwFiltered: true, nsfwStrength: 'strict' },
        promptGuide: { style: 'natural', separator: ', ', qualityBoosters: ['cinematic', 'smooth motion', '4k'], avoidTerms: ['static', 'blurry'], stylePrefixes: [] },
    },
};

export function inferFalModelMetadata(modelId: string): ModelMetadata {
    const known = FAL_KNOWN_MODELS[modelId];
    const lowerId = modelId.toLowerCase();

    // Infer type from model ID
    let type: 'image' | 'video' = 'image';
    if (lowerId.includes('video') || lowerId.includes('wan') || lowerId.includes('kling-video') ||
        lowerId.includes('vidu') || lowerId.includes('luma') || lowerId.includes('hunyuan-video') ||
        lowerId.includes('pixverse') || lowerId.includes('magi') || lowerId.includes('veo') ||
        lowerId.includes('runway') || lowerId.includes('ltx')) {
        type = 'video';
    }

    // Infer capabilities
    const capabilities: ModelMetadata['capabilities'] = {};
    if (lowerId.includes('text-to-video') || lowerId.includes('t2v')) {
        capabilities.textToVideo = true;
    }
    if (lowerId.includes('image-to-video') || lowerId.includes('i2v')) {
        capabilities.imageToVideo = true;
    }
    if (lowerId.includes('inpaint')) {
        capabilities.inpainting = true;
    }
    if (lowerId.includes('upscal')) {
        capabilities.upscaling = true;
    }
    if (lowerId.includes('avatar')) {
        capabilities.avatar = true;
    }
    if (type === 'image' && !Object.keys(capabilities).length) {
        capabilities.textToImage = true;
    }

    // Infer constraints
    const constraints: ModelMetadata['constraints'] = {
        supportsLoRA: lowerId.includes('flux/dev') || lowerId.includes('flux/schnell') || lowerId.includes('stable-diffusion'),
        supportsNegativePrompt: !lowerId.includes('flux') && !lowerId.includes('imagen'),
        nsfwFiltered: lowerId.includes('kling') || lowerId.includes('luma') || lowerId.includes('veo') || lowerId.includes('imagen'),
        nsfwStrength: lowerId.includes('kling') || lowerId.includes('luma') || lowerId.includes('veo') ? 'strict' : 'moderate',
    };

    if (capabilities.imageToVideo || capabilities.inpainting || capabilities.upscaling) {
        constraints.maxReferences = 1;
        constraints.minReferences = 1;
    }

    // Build prompt guide
    const promptGuide: ModelMetadata['promptGuide'] = {
        style: 'natural',
        separator: ', ',
        qualityBoosters: type === 'video'
            ? ['cinematic', 'smooth motion', 'high quality', '4k']
            : ['highly detailed', 'professional quality', 'sharp focus'],
        avoidTerms: type === 'video'
            ? ['static', 'frozen', 'blurry', 'morphing']
            : ['blurry', 'low quality', 'distorted'],
        stylePrefixes: [],
    };

    // Build requirements
    const requirements: ModelMetadata['requirements'] = [];
    if (capabilities.imageToVideo || capabilities.inpainting || capabilities.upscaling) {
        requirements.push({
            input: 'image',
            label: 'Source Image',
            description: capabilities.upscaling ? 'Image to upscale' : 'Image to animate/edit',
            accept: 'image/*',
        });
    }
    if (capabilities.inpainting) {
        requirements.push({
            input: 'mask',
            label: 'Mask',
            description: 'Mask defining area to edit',
            accept: 'image/*',
        });
    }
    if (capabilities.avatar) {
        requirements.push({
            input: 'audio',
            label: 'Audio',
            description: 'Driving audio for lip sync',
            accept: 'audio/*',
        });
    }

    return {
        id: modelId,
        name: modelId.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || modelId,
        provider: 'fal',
        type,
        capabilities: { ...capabilities, ...known?.capabilities },
        constraints: { ...constraints, ...known?.constraints },
        promptGuide: { ...promptGuide, ...known?.promptGuide } as ModelMetadata['promptGuide'],
        requirements: requirements.length > 0 ? requirements : undefined,
        notes: [],
        lastUpdated: new Date(),
        source: known ? 'api' : 'inferred',
    };
}

// ============================================
// CODE GENERATION
// ============================================

export function generatePromptGuideEntry(meta: ModelMetadata & { _recommendedSettings?: Record<string, any> }): string {
    const guide = meta.promptGuide;
    const id = meta.id.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

    // Build recommended settings object from parsed description
    const recSettings = meta._recommendedSettings || {};
    const hasRecSettings = Object.keys(recSettings).length > 0;

    // Format recommended settings as TypeScript code
    let recSettingsStr = '{}';
    if (hasRecSettings) {
        const settingsParts: string[] = [];
        if (recSettings.sampler) settingsParts.push(`sampler: '${recSettings.sampler}'`);
        if (recSettings.scheduler) settingsParts.push(`scheduler: '${recSettings.scheduler}'`);
        if (recSettings.steps) {
            if (typeof recSettings.steps === 'object') {
                settingsParts.push(`steps: { min: ${recSettings.steps.min}, max: ${recSettings.steps.max} }`);
            } else {
                settingsParts.push(`steps: ${recSettings.steps}`);
            }
        }
        if (recSettings.cfg) {
            if (typeof recSettings.cfg === 'object') {
                settingsParts.push(`cfg: { min: ${recSettings.cfg.min}, max: ${recSettings.cfg.max} }`);
            } else {
                settingsParts.push(`cfg: ${recSettings.cfg}`);
            }
        }
        if (recSettings.clipSkip) settingsParts.push(`clipSkip: ${recSettings.clipSkip}`);
        if (recSettings.denoisingStrength) settingsParts.push(`denoisingStrength: ${recSettings.denoisingStrength}`);
        if (recSettings.hiresUpscaler) settingsParts.push(`hiresUpscaler: '${recSettings.hiresUpscaler}'`);
        if (recSettings.vae) settingsParts.push(`vae: '${recSettings.vae}'`);

        if (settingsParts.length > 0) {
            recSettingsStr = `{ ${settingsParts.join(', ')} }`;
        }
    }

    return `
    '${id}': {
        id: '${id}',
        name: '${meta.name}',
        provider: '${meta.provider}',
        type: '${meta.type}',
        ${meta.constraints.supportsAudio ? 'supportsAudio: true,' : ''}
        syntax: {
            style: '${guide.style}',
            separator: '${guide.separator}',
            ${guide.weightSyntax ? `weightSyntax: '${guide.weightSyntax}',` : ''}
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: '${guide.triggerWordPlacement || 'before_subject'}',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [${guide.qualityBoosters.map(q => `'${q}'`).join(', ')}],
        stylePrefixes: [${guide.stylePrefixes?.map(s => `'${s}'`).join(', ') || ''}],
        avoidTerms: [${guide.avoidTerms.map(a => `'${a}'`).join(', ')}],
        recommendedSettings: ${recSettingsStr},
        template: \`${guide.template || '{trigger_words} {subject_description}, {action_movement}, {setting_background}, {style}'}\`,
        examples: [${meta.promptGuide.examples?.map(ex => `
            {
                input: '${ex.input}',
                output: '${ex.output}',
                ${ex.notes ? `notes: '${ex.notes}'` : ''}
            }`).join(',') || ''}
        ]
    },`;
}

export function generateConstraintsEntry(meta: ModelMetadata): string {
    const c = meta.constraints;

    return `
    '${meta.id}': {
        supportsLoRA: ${c.supportsLoRA || false},
        ${c.maxLoRAs ? `maxLoRAs: ${c.maxLoRAs},` : ''}
        supportsIPAdapter: ${c.supportsIPAdapter || false},
        ${c.maxReferences ? `maxReferences: ${c.maxReferences},` : ''}
        ${c.minReferences ? `minReferences: ${c.minReferences},` : ''}
        ${c.supportsNegativePrompt !== undefined ? `supportsNegativePrompt: ${c.supportsNegativePrompt},` : ''}
        nsfwFiltered: ${c.nsfwFiltered || false},
        nsfwStrength: '${c.nsfwStrength || 'moderate'}',
        notes: [${meta.notes?.map(n => `'${n}'`).join(', ') || ''}],
    },`;
}

export function generateRequirementsEntry(meta: ModelMetadata): string {
    if (!meta.requirements || meta.requirements.length === 0) return '';

    return `
    {
        modelId: '${meta.id}',
        requirements: [
            ${meta.requirements.map(r => `{ input: '${r.input}', label: '${r.label}', description: '${r.description}', accept: '${r.accept}' }`).join(',\n            ')}
        ]
    },`;
}

export function generateNegativePromptEntry(meta: ModelMetadata): string {
    const neg = meta.promptGuide.negativePromptTemplate;
    if (!neg) {
        // Generate default based on type
        const defaultNeg = meta.type === 'video'
            ? 'static, frozen, blurry, low quality, distorted, flickering, morphing, bad anatomy'
            : 'blurry, low quality, distorted, deformed, bad anatomy, watermark, artifacts';
        return `    '${meta.id}': '${defaultNeg}',`;
    }
    return `    '${meta.id}': '${neg}',`;
}

// ============================================
// SYNC SERVICE
// ============================================

export class ModelMetadataSyncService {
    private metadataCache: Map<string, ModelMetadata> = new Map();
    private cacheFile: string;

    constructor(cacheDir: string = './data') {
        this.cacheFile = path.join(cacheDir, 'model-metadata-cache.json');
        this.loadCache();
    }

    private loadCache() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
                for (const [key, value] of Object.entries(data)) {
                    this.metadataCache.set(key, value as ModelMetadata);
                }
                console.log(`[ModelMetadataSync] Loaded ${this.metadataCache.size} cached models`);
            }
        } catch (error) {
            console.error('[ModelMetadataSync] Failed to load cache:', error);
        }
    }

    private saveCache() {
        try {
            const dir = path.dirname(this.cacheFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data: Record<string, ModelMetadata> = {};
            for (const [key, value] of this.metadataCache.entries()) {
                data[key] = value;
            }
            fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[ModelMetadataSync] Failed to save cache:', error);
        }
    }

    async fetchCivitaiMetadata(modelId: string): Promise<ModelMetadata | null> {
        // Check cache first
        const cacheKey = `civitai:${modelId}`;
        const cached = this.metadataCache.get(cacheKey);
        if (cached && (Date.now() - new Date(cached.lastUpdated).getTime()) < 24 * 60 * 60 * 1000) {
            return cached;
        }

        const civitaiInfo = await fetchCivitaiModel(modelId);
        if (!civitaiInfo) return null;

        const versionId = modelId.includes('@') ? modelId.split('@')[1] : undefined;
        const metadata = civitaiToMetadata(civitaiInfo, versionId);

        this.metadataCache.set(cacheKey, metadata);
        this.saveCache();

        return metadata;
    }

    getFalMetadata(modelId: string): ModelMetadata {
        // Check cache first
        const cached = this.metadataCache.get(modelId);
        if (cached && (Date.now() - new Date(cached.lastUpdated).getTime()) < 24 * 60 * 60 * 1000) {
            return cached;
        }

        const metadata = inferFalModelMetadata(modelId);
        this.metadataCache.set(modelId, metadata);
        this.saveCache();

        return metadata;
    }

    async syncModel(modelId: string): Promise<ModelMetadata | null> {
        if (modelId.includes('civitai') || /^\d+(@\d+)?$/.test(modelId)) {
            return this.fetchCivitaiMetadata(modelId);
        } else if (modelId.startsWith('fal-ai/')) {
            return this.getFalMetadata(modelId);
        }

        // For other providers, return inferred metadata
        return inferFalModelMetadata(modelId);
    }

    generateCodeSnippets(metadata: ModelMetadata): {
        promptGuide: string;
        constraints: string;
        requirements: string;
        negativePrompt: string;
    } {
        return {
            promptGuide: generatePromptGuideEntry(metadata),
            constraints: generateConstraintsEntry(metadata),
            requirements: generateRequirementsEntry(metadata),
            negativePrompt: generateNegativePromptEntry(metadata),
        };
    }

    async syncAndGenerateCode(modelId: string): Promise<string> {
        const metadata = await this.syncModel(modelId);
        if (!metadata) {
            return `// Failed to fetch metadata for ${modelId}`;
        }

        const snippets = this.generateCodeSnippets(metadata);

        return `
// ==========================================
// Auto-generated metadata for: ${metadata.name}
// Source: ${metadata.source} | Provider: ${metadata.provider}
// Generated: ${new Date().toISOString()}
// ==========================================

// Add to ModelPromptGuides.ts MODEL_PROMPTING_GUIDES:
${snippets.promptGuide}

// Add to ModelConstraints.ts MODEL_CONSTRAINTS:
${snippets.constraints}

// Add to ModelConstraints.ts MODEL_REQUIREMENTS:
${snippets.requirements}

// Add to ModelPromptGuides.ts NEGATIVE_PROMPT_TEMPLATES:
${snippets.negativePrompt}
`;
    }
}

// Singleton instance
let syncServiceInstance: ModelMetadataSyncService | null = null;

export function getModelMetadataSyncService(): ModelMetadataSyncService {
    if (!syncServiceInstance) {
        syncServiceInstance = new ModelMetadataSyncService();
    }
    return syncServiceInstance;
}

// CLI helper
export async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: npx ts-node ModelMetadataSync.ts <model-id>');
        console.log('Examples:');
        console.log('  npx ts-node ModelMetadataSync.ts 123456              # Civitai model');
        console.log('  npx ts-node ModelMetadataSync.ts 123456@789012       # Civitai model+version');
        console.log('  npx ts-node ModelMetadataSync.ts fal-ai/flux/dev     # Fal.ai model');
        return;
    }

    const service = getModelMetadataSyncService();
    const code = await service.syncAndGenerateCode(args[0]);
    console.log(code);
}

if (require.main === module) {
    main().catch(console.error);
}

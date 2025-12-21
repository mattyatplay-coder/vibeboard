/**
 * Model Constraints Registry
 * Defines limitations and requirements for each generation model
 */

export interface ModelConstraints {
    supportsLoRA: boolean;
    maxLoRAs?: number;
    supportsIPAdapter: boolean;
    maxReferences?: number;      // Max reference images (for character/pose)
    minReferences?: number;
    supportsNegativePrompt: boolean;
    supportsCFG: boolean;        // CFG/Guidance scale
    supportsSeed: boolean;
    supportsSteps: boolean;
    maxPromptLength?: number;
    nsfwFiltered: boolean;       // Has strict NSFW filter
    nsfwStrength?: 'strict' | 'moderate' | 'permissive';
    supportedAspectRatios?: string[];
    notes?: string[];            // Special notes about the model
}

// Default constraints for unknown models
const DEFAULT_CONSTRAINTS: ModelConstraints = {
    supportsLoRA: false,
    supportsIPAdapter: false,
    supportsNegativePrompt: true,
    supportsCFG: true,
    supportsSeed: true,
    supportsSteps: true,
    nsfwFiltered: true,
    nsfwStrength: 'moderate',
};

/**
 * Model-specific constraints
 * Key format: model ID (e.g., 'fal-ai/flux/dev')
 */
export const MODEL_CONSTRAINTS: Record<string, Partial<ModelConstraints>> = {
    // === FAL.AI FLUX MODELS ===
    'fal-ai/flux/dev': {
        supportsLoRA: true,
        maxLoRAs: 4,
        supportsIPAdapter: true,
        maxReferences: 4,
        supportsNegativePrompt: false, // Flux doesn't use negative prompts traditionally
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Flux uses prompt weighting instead of negative prompts', 'Best with detailed, descriptive prompts'],
    },
    'fal-ai/flux/schnell': {
        supportsLoRA: true,
        maxLoRAs: 2, // Fewer for speed
        supportsIPAdapter: true,
        maxReferences: 2,
        supportsNegativePrompt: false,
        supportsSteps: false, // Fixed steps
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Fixed 4 steps, cannot be changed', 'Faster but less detailed'],
    },
    'fal-ai/flux-pro': {
        supportsLoRA: false, // Pro doesn't support LoRAs
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Commercial license', 'No LoRA support', 'Higher quality base model'],
    },
    'fal-ai/flux-pro/v1.1-ultra': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', '9:21'],
        notes: ['4K resolution output', 'No LoRA/IP-Adapter support', 'Commercial license'],
    },
    'fal-ai/flux-2-max': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Highest quality Flux v2', 'Stricter content filtering'],
    },
    'fal-ai/flux-kontext/dev': {
        supportsLoRA: false,
        supportsIPAdapter: false, // Built-in character consistency
        maxReferences: 1, // Single reference for character
        minReferences: 1,
        nsfwFiltered: false,
        notes: ['Requires exactly 1 reference image', 'Built-in character consistency'],
    },
    'fal-ai/flux-kontext/pro': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 1,
        minReferences: 1,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Premium character consistency', 'Requires exactly 1 reference'],
    },

    // === GOOGLE IMAGEN ===
    'fal-ai/imagen3': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        supportsCFG: false, // No guidance scale
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Very strict content filter', 'No LoRA/IP-Adapter', 'Photorealistic style'],
    },
    'fal-ai/imagen4/preview': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        supportsCFG: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Strictest content filter', 'Preview version - may change'],
    },

    // === STABLE DIFFUSION ===
    'fal-ai/stable-diffusion-v35-large': {
        supportsLoRA: true,
        maxLoRAs: 5,
        supportsIPAdapter: true,
        maxReferences: 4,
        supportsNegativePrompt: true,
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Full LoRA support', 'Supports negative prompts', 'Classic SD workflow'],
    },

    // === RECRAFT / IDEOGRAM ===
    'fal-ai/recraft-v3': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Best for vector art, logos, icons', 'No LoRA support'],
    },
    'fal-ai/ideogram/v2': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: true,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Excellent text rendering', 'No LoRA support'],
    },

    // === KLING IMAGE ===
    'fal-ai/kling-image/o1': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 5, // Multi-reference editor
        minReferences: 0,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Multi-reference support', 'Good for complex compositions'],
    },

    // === VIDEO MODELS ===
    'fal-ai/wan-t2v': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Text-to-video only', 'Cinematic motion'],
    },
    'fal-ai/wan/v2.2-a14b/image-to-video': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 1, // Single source image
        minReferences: 1,
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Requires exactly 1 source image'],
    },
    'fal-ai/wan/v2.2-a14b/image-to-video/lora': {
        supportsLoRA: true,
        maxLoRAs: 1, // Limited for video
        supportsIPAdapter: false,
        maxReferences: 1,
        minReferences: 1,
        nsfwFiltered: false,
        notes: ['Supports 1 LoRA for character style', 'Requires source image'],
    },
    'fal-ai/vidu/q2/reference-to-video': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 7, // Up to 7 character refs
        minReferences: 1,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Supports up to 7 character references', 'Best for multi-character scenes'],
    },
    'fal-ai/kling-video/v2.6/pro/text-to-video': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['High quality but strict filter', 'No reference images for T2V'],
    },
    'fal-ai/kling-video/v2.6/pro/image-to-video': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 1,
        minReferences: 1,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Strict content filter', 'Single source image required'],
    },
    'fal-ai/luma-dream-machine': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Very strict NSFW filter', 'Dreamlike/ethereal style'],
    },

    // === REPLICATE MODELS ===
    'fofr/consistent-character': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        maxReferences: 1,
        minReferences: 1,
        nsfwFiltered: true,
        nsfwStrength: 'moderate',
        notes: ['Requires 1 face reference', 'Best for character turnarounds'],
    },
    'black-forest-labs/flux-dev': {
        supportsLoRA: true,
        maxLoRAs: 4,
        supportsIPAdapter: false, // Replicate version
        nsfwFiltered: false,
        notes: ['Replicate-hosted Flux', 'LoRA support may differ from Fal'],
    },

    // === OPENAI ===
    'dall-e-3': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        supportsCFG: false,
        supportsSeed: false,
        supportsSteps: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['No customization parameters', 'Prompt rewriting enabled', 'Strict content policy'],
    },
    'sora-2-pro': {
        supportsLoRA: false,
        supportsIPAdapter: false,
        supportsNegativePrompt: false,
        nsfwFiltered: true,
        nsfwStrength: 'strict',
        notes: ['Premium video generation', 'Strict OpenAI content policy'],
    },

    // === COMFY (Local) ===
    'sdxl': {
        supportsLoRA: true,
        maxLoRAs: 10,
        supportsIPAdapter: true,
        maxReferences: 10,
        supportsNegativePrompt: true,
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Full local control', 'Unlimited customization'],
    },
    'flux-dev': {
        supportsLoRA: true,
        maxLoRAs: 5,
        supportsIPAdapter: true,
        supportsNegativePrompt: false,
        nsfwFiltered: false,
        nsfwStrength: 'permissive',
        notes: ['Local Flux with full LoRA support'],
    },
};

/**
 * Get constraints for a model, with defaults for unknown models
 */
export function getModelConstraints(modelId: string): ModelConstraints {
    const specific = MODEL_CONSTRAINTS[modelId] || {};
    return { ...DEFAULT_CONSTRAINTS, ...specific };
}

/**
 * Check if a model supports a specific feature
 */
export function modelSupports(modelId: string, feature: keyof ModelConstraints): boolean {
    const constraints = getModelConstraints(modelId);
    return !!constraints[feature];
}

/**
 * Get human-readable constraint violations for a failed generation
 */
export function getConstraintViolations(
    modelId: string,
    settings: {
        loraCount?: number;
        referenceCount?: number;
        hasNegativePrompt?: boolean;
        hasCFG?: boolean;
    }
): string[] {
    const constraints = getModelConstraints(modelId);
    const violations: string[] = [];

    if (settings.loraCount && settings.loraCount > 0 && !constraints.supportsLoRA) {
        violations.push(`This model doesn't support LoRAs. Remove all ${settings.loraCount} LoRA(s) and try again.`);
    } else if (settings.loraCount && constraints.maxLoRAs && settings.loraCount > constraints.maxLoRAs) {
        violations.push(`This model supports max ${constraints.maxLoRAs} LoRAs, but you have ${settings.loraCount}. Remove some LoRAs.`);
    }

    if (settings.referenceCount !== undefined) {
        if (constraints.minReferences && settings.referenceCount < constraints.minReferences) {
            violations.push(`This model requires at least ${constraints.minReferences} reference image(s). Add more references.`);
        }
        if (constraints.maxReferences && settings.referenceCount > constraints.maxReferences) {
            violations.push(`This model supports max ${constraints.maxReferences} reference(s), but you have ${settings.referenceCount}. Remove some.`);
        }
    }

    if (settings.hasNegativePrompt && !constraints.supportsNegativePrompt) {
        violations.push(`This model ignores negative prompts. Use prompt weighting or a different model.`);
    }

    return violations;
}

/**
 * Get model-specific tips for a given model
 */
export function getModelTips(modelId: string): string[] {
    const constraints = getModelConstraints(modelId);
    return constraints.notes || [];
}

// =============================================
// MODEL INPUT REQUIREMENTS
// =============================================

export type RequiredInputType = 'image' | 'audio' | 'motionVideo' | 'sourceVideo' | 'mask' | 'faceReference';

export interface InputRequirement {
    input: RequiredInputType;
    label: string;
    description: string;
    accept?: string; // MIME type pattern for file inputs
}

export interface ModelRequirements {
    modelId: string;
    requirements: InputRequirement[];
}

/**
 * Models that have specific input requirements beyond a text prompt
 */
export const MODEL_REQUIREMENTS: ModelRequirements[] = [
    // Avatar / Talking Head Models - require face image + audio
    {
        modelId: 'fal-ai/kling-video/ai-avatar/v2/pro',
        requirements: [
            { input: 'image', label: 'Face Image', description: 'Portrait image of the person to animate', accept: 'image/*' },
            { input: 'audio', label: 'Audio', description: 'Speech or singing audio (MP3, WAV, M4A)', accept: 'audio/*' }
        ]
    },
    {
        modelId: 'fal-ai/kling-video/ai-avatar/v2/standard',
        requirements: [
            { input: 'image', label: 'Face Image', description: 'Portrait image of the person to animate', accept: 'image/*' },
            { input: 'audio', label: 'Audio', description: 'Speech or singing audio (MP3, WAV, M4A)', accept: 'audio/*' }
        ]
    },
    {
        modelId: 'fal-ai/creatify/aurora',
        requirements: [
            { input: 'image', label: 'Portrait Image', description: 'High-quality portrait photo', accept: 'image/*' },
            { input: 'audio', label: 'Audio', description: 'Driving audio for animation', accept: 'audio/*' }
        ]
    },
    {
        modelId: 'fal-ai/sync-lips',
        requirements: [
            { input: 'sourceVideo', label: 'Source Video', description: 'Video to add lip sync to', accept: 'video/*' },
            { input: 'audio', label: 'Audio', description: 'Audio for lip sync', accept: 'audio/*' }
        ]
    },

    // Image-to-Video Models - require source image
    {
        modelId: 'fal-ai/wan/v2.2-a14b/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/wan/v2.2-a14b/image-to-video/lora',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/wan-25-preview/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/wan-2.1-i2v-14b',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/ltx-video/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/kling-video/v2.1/standard/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/kling-video/v2.6/pro/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/kling-video/o1/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/minimax-video/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/luma-dream-machine/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/runway-gen3/turbo/image-to-video',
        requirements: [
            { input: 'image', label: 'Source Image', description: 'Image to animate', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/vidu/q2/reference-to-video',
        requirements: [
            { input: 'image', label: 'Reference Image(s)', description: 'Up to 7 character references', accept: 'image/*' }
        ]
    },

    // Motion-driven animation
    {
        modelId: 'fal-ai/one-to-all-animation/14b',
        requirements: [
            { input: 'image', label: 'Character Image', description: 'Character to animate', accept: 'image/*' },
            { input: 'motionVideo', label: 'Motion Video', description: 'Driving video for pose/motion', accept: 'video/*' }
        ]
    },
    {
        modelId: 'fal-ai/wan-video-2.2-animate-move',
        requirements: [
            { input: 'image', label: 'Character Image', description: 'Character to animate', accept: 'image/*' },
            { input: 'motionVideo', label: 'Motion Video', description: 'Driving video for motion', accept: 'video/*' }
        ]
    },

    // Kontext models - require reference
    {
        modelId: 'fal-ai/flux-kontext/dev',
        requirements: [
            { input: 'image', label: 'Reference Image', description: 'Character/subject reference for consistency', accept: 'image/*' }
        ]
    },
    {
        modelId: 'fal-ai/flux-kontext/pro',
        requirements: [
            { input: 'image', label: 'Reference Image', description: 'Character/subject reference for consistency', accept: 'image/*' }
        ]
    },

    // IP-Adapter - requires face reference
    {
        modelId: 'fal-ai/ip-adapter-face-id',
        requirements: [
            { input: 'faceReference', label: 'Face Reference', description: 'Face image for identity preservation', accept: 'image/*' }
        ]
    }
];

/**
 * Get requirements for a specific model
 */
export function getModelRequirements(modelId: string): InputRequirement[] {
    const modelReqs = MODEL_REQUIREMENTS.find(m => m.modelId === modelId);
    return modelReqs?.requirements || [];
}

/**
 * Check if a model has special input requirements
 */
export function hasSpecialRequirements(modelId: string): boolean {
    return MODEL_REQUIREMENTS.some(m => m.modelId === modelId);
}

/**
 * Current input state for validation
 */
export interface CurrentInputs {
    hasImage: boolean;
    hasAudio: boolean;
    hasMotionVideo: boolean;
    hasSourceVideo: boolean;
    hasMask: boolean;
    hasFaceReference: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    missingInputs: InputRequirement[];
}

/**
 * Validate that all required inputs are present for a model
 */
export function validateModelInputs(modelId: string, inputs: CurrentInputs): ValidationResult {
    const requirements = getModelRequirements(modelId);
    const missingInputs: InputRequirement[] = [];

    for (const req of requirements) {
        let hasInput = false;
        switch (req.input) {
            case 'image':
                hasInput = inputs.hasImage;
                break;
            case 'audio':
                hasInput = inputs.hasAudio;
                break;
            case 'motionVideo':
                hasInput = inputs.hasMotionVideo;
                break;
            case 'sourceVideo':
                hasInput = inputs.hasSourceVideo;
                break;
            case 'mask':
                hasInput = inputs.hasMask;
                break;
            case 'faceReference':
                hasInput = inputs.hasFaceReference || inputs.hasImage; // Face ref can be provided via element picker
                break;
        }

        if (!hasInput) {
            missingInputs.push(req);
        }
    }

    return {
        valid: missingInputs.length === 0,
        missingInputs
    };
}

/**
 * Get a user-friendly message about missing inputs
 */
export function getMissingInputsMessage(modelId: string, inputs: CurrentInputs): string | null {
    const validation = validateModelInputs(modelId, inputs);
    if (validation.valid) return null;

    const missing = validation.missingInputs.map(r => r.label).join(', ');
    return `Missing required inputs: ${missing}`;
}

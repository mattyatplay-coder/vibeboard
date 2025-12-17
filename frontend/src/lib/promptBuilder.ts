import { Tag } from '../components/tag-system/TagSelector';
import { VideoEngine, LoRA } from '../types/promptWizardTypes';

export function buildEnhancedPrompt(
    initialPrompt: string,
    tags: Tag[],
    engine: VideoEngine,
    loras: LoRA[] = []
): {
    enhancedPrompt: string;
    positiveAdditions: string[];
    negativePrompt: string;
} {
    // 1. Parse initial prompt
    const parsedPrompt = parsePrompt(initialPrompt);

    // 2. Add tag-based enhancements
    const tagEnhancements = buildTagEnhancements(tags);

    // 3. Add engine-specific keywords
    const engineKeywords = getEngineOptimalKeywords(engine);

    // 4. Add quality enhancers
    const qualityKeywords = [
        'high detail',
        'sharp focus',
        '4K',
        'professional color grading',
        'cinematic'
    ];

    // 5. Add LoRA trigger words
    const loraTriggers = loras.map(l => l.triggerWord).filter(Boolean);

    // 6. Combine and structure
    const enhancedPrompt = [
        parsedPrompt.subject,
        parsedPrompt.action,
        tagEnhancements.camera,
        parsedPrompt.environment,
        tagEnhancements.lighting,
        tagEnhancements.style,
        tagEnhancements.mood,
        ...loraTriggers,
        engineKeywords.join(', '),
        qualityKeywords.join(', ')
    ]
        .filter(Boolean)
        .join(', ');

    // 7. Build positive additions list
    const positiveAdditions = [
        ...tagEnhancements.all,
        ...engineKeywords,
        ...qualityKeywords,
        ...loraTriggers
    ];

    // 8. Build negative prompt
    const negativePrompt = buildNegativePrompt(engine, tags);

    return {
        enhancedPrompt,
        positiveAdditions,
        negativePrompt
    };
}

function parsePrompt(prompt: string) {
    // Basic NLP parsing
    // Extract: subject, action, environment
    // This is simplified - could use actual NLP library

    // For now, just return the prompt as subject if short, or split it up
    // Ideally this would use a more sophisticated parser
    return {
        subject: prompt,
        action: '',
        environment: '',
    };
}

function buildTagEnhancements(tags: Tag[]) {
    const byCategory = groupBy(tags, 'category');

    return {
        camera: byCategory['Shots']
            ?.map(t => t.promptKeyword)
            .join(', ') || '',
        lighting: byCategory['Lighting']
            ?.map(t => t.promptKeyword)
            .join(', ') || '',
        style: byCategory['Style']
            ?.map(t => t.promptKeyword)
            .join(', ') || '',
        mood: byCategory['Mood']
            ?.map(t => t.promptKeyword)
            .join(', ') || '',
        all: tags.map(t => t.promptKeyword || t.name.toLowerCase())
    };
}

function getEngineOptimalKeywords(engine: VideoEngine): string[] {
    const engineKeywords: Record<string, string[]> = {
        kling: [
            'cinematic camera movement',
            'professional cinematography',
            'smooth motion'
        ],
        wan: [
            'photorealistic',
            'high fidelity',
            'detailed textures'
        ],
        ltx: [
            'fast motion',
            'dynamic action',
            'high frame rate'
        ],
        veo: [
            'cinematic lighting',
            'film grain',
            'professional color grading'
        ],
        sora: [
            'photorealistic',
            'natural physics',
            'realistic motion'
        ],
        luma: [
            'creative',
            'artistic',
            'surreal elements'
        ]
    };

    return engineKeywords[engine.id] || [];
}

function buildNegativePrompt(engine: VideoEngine, _tags: Tag[]): string {
    const baseNegatives = [
        'low quality',
        'bad quality',
        'worst quality',
        'blurry',
        'distorted',
        'deformed',
        'ugly',
        'bad anatomy',
        'watermark',
        'text',
        'signature'
    ];

    // Add engine-specific negatives
    const engineNegatives: Record<string, string[]> = {
        kling: ['static camera', 'no movement'],
        wan: ['cartoon', 'anime'],
        ltx: ['slow motion', 'laggy'],
        veo: ['oversaturated', 'unrealistic colors'],
        sora: ['artificial', 'computer-generated look'],
        luma: ['realistic', 'photorealistic']
    };

    const allNegatives = [
        ...baseNegatives,
        ...(engineNegatives[engine.id] || [])
    ];

    return allNegatives.join(', ');
}

// Helper groupBy function
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, currentValue) => {
        const groupKey = String(currentValue[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(currentValue);
        return result;
    }, {} as Record<string, T[]>);
}

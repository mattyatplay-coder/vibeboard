/**
 * Model Prompting Guides Database
 * 
 * Contains model-specific prompting syntax, best practices, and formatting rules
 * for optimal generation results with character consistency and LoRA integration.
 */

export interface ModelPromptGuide {
    id: string;
    name: string;
    provider: string;
    type: 'image' | 'video' | 'both';
    supportsAudio?: boolean; // Whether model supports audio/dialogue generation

    // Prompt structure
    syntax: {
        style: 'natural' | 'tags' | 'weighted' | 'structured';
        separator: string;           // How to separate concepts
        weightSyntax?: string;       // e.g., "(word:1.2)" or "word++"
        negativePrefix?: string;     // How negative prompts work
        maxLength?: number;          // Token/character limits
        supportsMarkdown?: boolean;
    };

    // Character/subject handling
    characterHandling: {
        placementPriority: 'start' | 'middle' | 'end';
        triggerWordPlacement: 'before_subject' | 'after_subject' | 'start';
        consistencyKeywords: string[];  // Keywords that help consistency
        poseDescriptionStyle: 'detailed' | 'brief' | 'action-based';
    };

    // Quality and style
    qualityBoosters: string[];      // Terms that improve output quality
    stylePrefixes: string[];        // Common style prefixes
    avoidTerms: string[];           // Terms that cause issues

    // Technical settings
    recommendedSettings: {
        cfgScale?: [number, number];  // [min, max] range
        steps?: [number, number];
        sampler?: string[];
    };

    // Prompt template
    template: string;               // Template with placeholders
    examples: {
        input: string;
        output: string;
        notes?: string;
    }[];
}

export const MODEL_PROMPTING_GUIDES: Record<string, ModelPromptGuide> = {

    // ==================== FLUX MODELS ====================

    'flux-dev': {
        id: 'flux-dev',
        name: 'FLUX.1 Dev',
        provider: 'multiple',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            weightSyntax: undefined, // FLUX doesn't use weights well
            negativePrefix: undefined, // No negative prompt support
            maxLength: 512,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent character', 'same person', 'identical features', 'maintaining appearance'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'highly detailed', 'professional photography', 'sharp focus',
            '8k resolution', 'masterpiece', 'best quality', 'photorealistic'
        ],
        stylePrefixes: [
            'in the style of', 'rendered as', 'artistic interpretation of'
        ],
        avoidTerms: [
            'ugly', 'deformed', 'noisy', 'blurry', 'low quality', // These don't work without negatives
        ],
        recommendedSettings: {
            cfgScale: [3.5, 4.5],
            steps: [28, 50]
        },
        template: `{trigger_words} {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}, {quality_boosters}`,
        examples: [
            {
                input: 'a woman in a coffee shop',
                output: 'ohwx woman, elegant young woman with flowing auburn hair and green eyes, sitting at a rustic wooden table in a cozy artisan coffee shop, warm morning light streaming through large windows, holding a ceramic latte cup, wearing a cream cashmere sweater, soft bokeh background with exposed brick walls, professional portrait photography, highly detailed, sharp focus, 8k resolution',
                notes: 'FLUX excels with detailed natural language descriptions'
            }
        ]
    },

    'flux-schnell': {
        id: 'flux-schnell',
        name: 'FLUX.1 Schnell',
        provider: 'multiple',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 256, // Shorter for speed model
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'brief' // Less detail for speed
        },
        qualityBoosters: [
            'high quality', 'detailed', 'sharp'
        ],
        stylePrefixes: ['style of', 'like'],
        avoidTerms: [],
        recommendedSettings: {
            cfgScale: [1, 1], // Fixed for Schnell
            steps: [4, 4]    // Fixed for Schnell
        },
        template: `{trigger_words} {subject_description}, {pose_action}, {setting_background}, {style}`,
        examples: [
            {
                input: 'a man running',
                output: 'ohwx man, athletic man with short dark hair, running through city streets at sunset, dynamic pose mid-stride, urban environment, cinematic lighting, high quality',
                notes: 'Keep Schnell prompts concise for best results'
            }
        ]
    },

    'flux-pro': {
        id: 'flux-pro',
        name: 'FLUX.1 Pro',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 1024,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent character', 'same person', 'identical features'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'highly detailed', 'professional photography', 'sharp focus',
            '8k resolution', 'masterpiece', 'best quality', 'photorealistic', 'cinematic lighting'
        ],
        stylePrefixes: [
            'in the style of', 'rendered as', 'artistic interpretation of'
        ],
        avoidTerms: [
            'ugly', 'deformed', 'noisy', 'blurry', 'low quality'
        ],
        recommendedSettings: {
            cfgScale: [3.5, 4.5],
            steps: [28, 50]
        },
        template: `{trigger_words} {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}, {quality_boosters}`,
        examples: [
            {
                input: 'cyberpunk street',
                output: 'ohwx_scene, neon-lit cyberpunk street at night, rain slicked pavement reflecting colorful lights, towering skyscrapers with holographic advertisements, diverse crowd of futuristic citizens, flying cars overhead, cinematic lighting, highly detailed, 8k resolution',
                notes: 'FLUX Pro handles complex scenes and high detail very well'
            }
        ]
    },

    'flux-2': {
        id: 'flux-2',
        name: 'FLUX.2',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 1024,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent character', 'same person', 'identical features'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'highly detailed', 'professional photography', 'sharp focus',
            '8k resolution', 'masterpiece', 'best quality', 'photorealistic', 'next gen quality'
        ],
        stylePrefixes: [
            'in the style of', 'rendered as', 'artistic interpretation of'
        ],
        avoidTerms: [
            'ugly', 'deformed', 'noisy', 'blurry', 'low quality'
        ],
        recommendedSettings: {
            cfgScale: [3.5, 4.5],
            steps: [28, 50]
        },
        template: `{trigger_words} {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}, {quality_boosters}`,
        examples: [
            {
                input: 'portrait of a warrior',
                output: 'ohwx_warrior, fierce warrior in intricate armor, standing on a battlefield, smoke and embers in the air, determined expression, detailed textures on armor, dramatic lighting, cinematic composition, next gen quality, 8k resolution',
                notes: 'FLUX 2 offers improved prompt adherence and detail'
            }
        ]
    },

    'recraft-v3': {
        id: 'recraft-v3',
        name: 'Recraft V3',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 1000,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent style'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: ['vector art', 'icon', 'high quality', 'clean lines', 'svg style'],
        stylePrefixes: ['icon of', 'vector art of', 'illustration of'],
        avoidTerms: ['photorealistic', 'blurry', 'raster'],
        recommendedSettings: {},
        template: `{style} {subject_description}, {action_description}, {setting_description}, {quality}`,
        examples: [
            {
                input: 'red apple icon',
                output: 'icon of red apple, vector art style, clean lines, flat design, minimal shading, white background, high quality svg',
                notes: 'Recraft excels at vector and icon styles'
            }
        ]
    },

    'ideogram-v2': {
        id: 'ideogram-v2',
        name: 'Ideogram V2',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 1000,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: [],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: ['typography', 'text rendering', 'poster', 'graphic design'],
        stylePrefixes: ['poster of', 'typography design of'],
        avoidTerms: ['typo', 'spelling error'],
        recommendedSettings: {},
        template: `{subject_description} with text "{text_content}", {style_description}, {quality}`,
        examples: [
            {
                input: 'neon sign saying hello',
                output: 'neon sign text "Hello" glowing in blue and pink, brick wall background, cyber aesthetic, high quality typography, graphic design',
                notes: 'Ideogram is best for text rendering'
            }
        ]
    },

    'sd3-5-large': {
        id: 'sd3-5-large',
        name: 'Stable Diffusion 3.5 Large',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same person', 'consistent character'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: ['masterpiece', 'best quality', 'highly detailed', '8k'],
        stylePrefixes: ['style of', 'art by'],
        avoidTerms: ['bad anatomy', 'blurry'],
        recommendedSettings: {
            cfgScale: [4, 6],
            steps: [28, 50]
        },
        template: `{trigger_words} {subject_description}, {action_description}, {setting_description}, {style}, {quality}`,
        examples: [
            {
                input: 'cyberpunk street',
                output: 'ohwx_scene, bustling cyberpunk street at night, neon signs reflecting on wet pavement, futuristic vehicles, cinematic lighting, highly detailed, 8k resolution',
                notes: 'SD 3.5 follows natural language prompts well'
            }
        ]
    },

    // ==================== STABLE DIFFUSION MODELS ====================

    'sdxl': {
        id: 'sdxl',
        name: 'Stable Diffusion XL',
        provider: 'multiple',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)', // e.g., (beautiful:1.3)
            negativePrefix: 'Negative prompt: ',
            maxLength: 380, // 77 tokens * ~5 chars
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['1girl', '1boy', '1woman', '1man', 'solo', 'same character'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'masterpiece', 'best quality', 'highly detailed', 'sharp focus',
            'professional', '8k uhd', 'high resolution', 'absurdres'
        ],
        stylePrefixes: [
            'in style of', 'art by', 'aesthetic of'
        ],
        avoidTerms: [], // Use negative prompt instead
        recommendedSettings: {
            cfgScale: [5, 9],
            steps: [25, 40],
            sampler: ['DPM++ 2M Karras', 'Euler a', 'DPM++ SDE Karras']
        },
        template: `{trigger_words}, {quality_boosters}, {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}, {camera}`,
        examples: [
            {
                input: 'portrait of a fantasy elf',
                output: 'ohwx_elf, masterpiece, best quality, highly detailed, 1girl, beautiful elven woman, (pointed ears:1.2), long silver hair, ethereal blue eyes, wearing ornate golden circlet, forest background with magical particles, soft ethereal lighting, fantasy art style, portrait shot, sharp focus',
                notes: 'SDXL works well with weighted emphasis on key features'
            }
        ]
    },

    'sd15': {
        id: 'sd15',
        name: 'Stable Diffusion 1.5',
        provider: 'multiple',
        type: 'image',
        syntax: {
            style: 'tags',
            separator: ', ',
            weightSyntax: '(term:weight)',
            negativePrefix: 'Negative prompt: ',
            maxLength: 300,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['1girl', '1boy', 'solo', 'same person'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'masterpiece', 'best quality', '(highly detailed:1.1)',
            'sharp focus', 'intricate details'
        ],
        stylePrefixes: ['art style', 'by artist'],
        avoidTerms: [],
        recommendedSettings: {
            cfgScale: [7, 11],
            steps: [20, 35],
            sampler: ['Euler a', 'DPM++ 2M Karras', 'DDIM']
        },
        template: `{trigger_words}, {quality_boosters}, {subject_description}, {pose_action}, {setting_background}, {style}`,
        examples: [
            {
                input: 'anime girl with sword',
                output: 'ohwx_char, masterpiece, best quality, highly detailed, 1girl, young woman, long black hair, determined expression, holding katana, dynamic battle pose, cherry blossom forest, dramatic lighting, anime style, sharp focus',
                notes: 'SD1.5 responds well to danbooru-style tags'
            }
        ]
    },

    'realistic-vision': {
        id: 'realistic-vision',
        name: 'Realistic Vision',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)',
            negativePrefix: 'Negative prompt: ',
            maxLength: 350,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['RAW photo', 'same person', 'consistent features', '1woman', '1man'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'RAW photo', '8k uhd', 'dslr', 'high quality', 'film grain',
            'Fujifilm XT3', 'photorealistic', 'hyperrealistic'
        ],
        stylePrefixes: ['shot on', 'photograph of', 'portrait of'],
        avoidTerms: [
            'cartoon', 'anime', 'illustration', 'painting', 'drawing'
        ],
        recommendedSettings: {
            cfgScale: [4, 7],
            steps: [25, 40],
            sampler: ['DPM++ SDE Karras']
        },
        template: `{trigger_words}, RAW photo, {subject_description}, {pose_action}, {setting_background}, {lighting}, {camera_settings}, {quality_boosters}`,
        examples: [
            {
                input: 'woman in business attire',
                output: 'ohwx_woman, RAW photo, professional businesswoman, (same face:1.3), sharp features, wearing tailored navy suit, confident stance, modern office with city skyline, natural window light, shot on Canon EOS R5, 85mm lens, shallow depth of field, 8k uhd, photorealistic',
                notes: 'Realistic Vision needs camera/photo terminology for best results'
            }
        ]
    },

    'pony-diffusion': {
        id: 'pony-diffusion',
        name: 'Pony Diffusion V6',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'tags',
            separator: ', ',
            weightSyntax: '(term:weight)',
            negativePrefix: 'Negative prompt: ',
            maxLength: 400,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['score_9', 'score_8_up', 'source_anime', '1girl', '1boy'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'score_9', 'score_8_up', 'score_7_up', 'source_anime',
            'highly detailed', 'beautiful lighting'
        ],
        stylePrefixes: ['art style', 'aesthetic'],
        avoidTerms: ['score_4', 'score_3', 'score_2', 'score_1'],
        recommendedSettings: {
            cfgScale: [6, 8],
            steps: [25, 35],
            sampler: ['Euler a', 'DPM++ 2M Karras']
        },
        template: `score_9, score_8_up, {trigger_words}, {subject_description}, {pose_action}, {setting_background}, {style}, source_anime`,
        examples: [
            {
                input: 'anime magical girl',
                output: 'score_9, score_8_up, ohwx_magical, 1girl, magical girl, (consistent character:1.2), twintails, pink hair, sparkling eyes, frilly dress, holding magic wand, dynamic pose, starry night background, beautiful lighting, source_anime',
                notes: 'Pony requires score tags for quality control'
            }
        ]
    },

    // ==================== VIDEO MODELS ====================

    'wan-v2-2': {
        id: 'wan-v2-2',
        name: 'Wan 2.2 Video',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'maintaining identity'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic', 'high quality', 'smooth motion', 'professional video',
            'detailed', '4k quality'
        ],
        stylePrefixes: ['cinematic shot of', 'video of'],
        avoidTerms: ['static', 'still image', 'photograph'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {lighting}, {style}`,
        examples: [
            {
                input: 'woman walking through park',
                output: 'ohwx_woman, elegant woman with long brown hair wearing summer dress, walking gracefully through sunlit park, gentle breeze moving her hair, smooth tracking shot following her movement, lush green trees and blooming flowers, golden hour lighting, cinematic quality, 4k',
                notes: 'Wan needs clear motion description and camera movement'
            }
        ]
    },

    'ltx-video': {
        id: 'ltx-video',
        name: 'LTX-Video',
        provider: 'multiple',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 400,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same person', 'consistent character', 'identical appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'high quality video', 'smooth motion', 'cinematic', 'detailed'
        ],
        stylePrefixes: ['video of', 'footage of'],
        avoidTerms: ['image', 'photo', 'still'],
        recommendedSettings: {
            cfgScale: [3, 5],
            steps: [20, 30]
        },
        template: `{trigger_words} {subject_description}, {action_description}, {setting_background}, {camera_description}, {style}`,
        examples: [
            {
                input: 'man typing on laptop',
                output: 'ohwx_man, professional man with glasses, sitting at modern desk, typing on laptop with focused expression, hands moving across keyboard, contemporary office setting, soft ambient lighting, slight camera push in, high quality video',
                notes: 'LTX works best with clear action verbs and simple camera movements'
            }
        ]
    },

    'hailuo-director': {
        id: 'hailuo-director',
        name: 'Hailuo Director Mode',
        provider: 'hailuo',
        type: 'video',
        syntax: {
            style: 'structured',
            separator: ', ',
            weightSyntax: '[camera_command]', // Bracket syntax for camera
            maxLength: 600,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'middle',
            triggerWordPlacement: 'after_subject',
            consistencyKeywords: ['same character', 'maintaining appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic quality', 'professional lighting', 'detailed'
        ],
        stylePrefixes: [],
        avoidTerms: [],
        recommendedSettings: {
            steps: [50, 50]
        },
        template: `[{camera_commands}] {subject_description} {trigger_words}, {action_description}, {setting_background}, {style}`,
        examples: [
            {
                input: 'woman looking out window',
                output: '[Push in, Truck left] Elegant woman ohwx_char with contemplative expression, standing by large window, gazing at rainy cityscape, soft reflections on glass, moody interior lighting, cinematic quality',
                notes: 'Hailuo uses bracket syntax for camera commands at the start'
            }
        ]
    },

    'runway-gen4': {
        id: 'runway-gen4',
        name: 'Runway Gen-4',
        provider: 'runway',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: '. ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent character', 'same person throughout', 'maintaining appearance'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'cinematic', 'high production value', 'professional quality',
            'smooth motion', 'detailed textures'
        ],
        stylePrefixes: ['cinematic shot of', 'professional footage of'],
        avoidTerms: ['still image', 'photograph'],
        recommendedSettings: {
            steps: [50, 50]
        },
        template: `{subject_description} {trigger_words}. {action_scene_description}. {camera_movement}. {lighting_mood}. {style_quality}`,
        examples: [
            {
                input: 'chef cooking in kitchen',
                output: 'Professional chef ohwx_chef with white uniform and tall hat. Skillfully preparing dish in modern restaurant kitchen, flames rising from pan as they toss ingredients. Smooth tracking shot around the cooking station. Dramatic kitchen lighting with steam and warm tones. Cinematic quality, high production value',
                notes: 'Runway Gen-4 prefers sentence-based descriptions with periods'
            }
        ]
    },

    'kling-video-v2-1': {
        id: 'kling-video-v2-1',
        name: 'Kling 2.1',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic', 'high quality', 'smooth motion', '4k'
        ],
        stylePrefixes: ['cinematic shot of', 'video of'],
        avoidTerms: ['static', 'blurry'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {style}`,
        examples: [
            {
                input: 'dog running in field',
                output: 'ohwx_dog, golden retriever running joyfully through tall grass field, ears flapping in wind, dynamic camera tracking side view, sunny afternoon lighting, cinematic quality, 4k',
                notes: 'Kling works well with standard video prompts'
            }
        ]
    },

    'kling-video-v2-6': {
        id: 'kling-video-v2-6',
        name: 'Kling 2.6',
        provider: 'fal',
        type: 'video',
        supportsAudio: true, // Supports audio generation
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'high fidelity'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic', 'high quality', 'smooth motion', '4k', 'realistic texture', 'detailed'
        ],
        stylePrefixes: ['cinematic shot of', 'video of', 'professional footage of'],
        avoidTerms: ['static', 'blurry', 'distorted'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {style}`,
        examples: [
            {
                input: 'cyberpunk city street',
                output: 'ohwx_city, neon-lit cyberpunk street at night, rain falling on pavement, flying cars passing overhead, dynamic camera tracking forward, cinematic lighting, high fidelity, 4k',
                notes: 'Kling 2.6 excels at realistic textures and lighting'
            }
        ]
    },

    'kling-video-o1': {
        id: 'kling-video-o1',
        name: 'Kling O1',
        provider: 'fal',
        type: 'video',
        supportsAudio: true, // Supports audio generation
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'maintaining identity'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'cinematic masterpiece', 'best quality', 'smooth motion', '8k', 'professional lighting'
        ],
        stylePrefixes: ['cinematic shot of', 'video of', 'movie scene'],
        avoidTerms: ['static', 'blurry', 'low quality'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {lighting}, {style}`,
        examples: [
            {
                input: 'astronaut floating in space',
                output: 'ohwx_astronaut, astronaut in detailed white spacesuit floating in zero gravity, earth visible in background reflection of visor, slow smooth rotation, cinematic lighting from distant sun, 8k, masterpiece',
                notes: 'Kling O1 provides the highest quality cinematic motion'
            }
        ]
    },

    'fal-ai/kling-image/o1': {
        id: 'fal-ai/kling-image/o1',
        name: 'Kling O1 Image',
        provider: 'fal',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 1000,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'high fidelity'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'masterpiece', 'best quality', 'highly detailed', '8k', 'professional photography'
        ],
        stylePrefixes: ['cinematic shot of', 'photograph of', 'portrait of'],
        avoidTerms: ['blurry', 'low quality', 'distorted'],
        recommendedSettings: {
            cfgScale: [3.5, 5],
            steps: [20, 30]
        },
        template: `{trigger_words} {subject_description}, {pose_action}, {setting_background}, {lighting}, {style}, {quality_boosters}`,
        examples: [
            {
                input: 'cyberpunk street portrait',
                output: 'ohwx_char, cyberpunk street portrait, neon lights reflecting on wet pavement, futuristic clothing, detailed facial features, cinematic lighting, 8k resolution, masterpiece',
                notes: 'Kling O1 Image excels at high-fidelity image editing and generation'
            }
        ]
    },

    'kling-avatar-v2-pro': {
        id: 'kling-avatar-v2-pro',
        name: 'Kling Avatar V2 Pro',
        provider: 'fal',
        type: 'video',
        supportsAudio: true,
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['high fidelity', 'realistic texture', 'consistent identity'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'cinematic', 'high fidelity', 'lip sync accuracy', 'professional lighting', '4k'
        ],
        stylePrefixes: ['cinematic shot of', 'professional footage of'],
        avoidTerms: ['blurry', 'distorted', 'out of sync'],
        recommendedSettings: {
            cfgScale: [1, 1], // Avatar models often don't use CFG in the same way, or it's fixed
            steps: [20, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {setting_background}, {lighting}, {style}`,
        examples: [
            {
                input: 'woman speaking professionally',
                output: 'ohwx_woman, professional woman in business suit speaking confidently, office background with soft focus, studio lighting, high fidelity, lip sync accuracy, 4k',
                notes: 'Focus on facial details and lighting for avatar models'
            }
        ]
    },

    'kling-avatar-v2-standard': {
        id: 'kling-avatar-v2-standard',
        name: 'Kling Avatar V2 Standard',
        provider: 'fal',
        type: 'video',
        supportsAudio: true,
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent identity', 'clear features'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'high quality', 'clear audio', 'smooth motion'
        ],
        stylePrefixes: ['video of'],
        avoidTerms: ['blurry', 'distorted'],
        recommendedSettings: {
            cfgScale: [1, 1],
            steps: [20, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {setting_background}, {style}`,
        examples: [
            {
                input: 'man talking',
                output: 'ohwx_man, man in casual shirt talking naturally, living room background, daylight, high quality',
                notes: 'Standard model is good for general purpose avatars'
            }
        ]
    },

    'wan-v2-5': {
        id: 'wan-v2-5',
        name: 'Wan 2.5',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'maintaining identity'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic', 'high quality', 'smooth motion', 'professional video',
            'detailed', '4k quality', 'photorealistic'
        ],
        stylePrefixes: ['cinematic shot of', 'video of'],
        avoidTerms: ['static', 'still image', 'photograph', 'morphing'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {lighting}, {style}`,
        examples: [
            {
                input: 'lion roaring',
                output: 'ohwx_lion, majestic male lion with full mane roaring on savanna, mouth wide open showing teeth, wind blowing through mane, golden hour lighting, cinematic 4k video, photorealistic',
                notes: 'Wan 2.5 offers improved realism over 2.2'
            }
        ]
    },

    'sora': {
        id: 'sora',
        name: 'OpenAI Sora',
        provider: 'openai',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: '. ',
            maxLength: 1000,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start', // Sora might support LoRAs eventually, keeping standard
            consistencyKeywords: ['same character', 'consistent appearance', 'identical person'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'cinematic', 'photorealistic', 'highly detailed', '8k', 'smooth motion', 'physics simulation'
        ],
        stylePrefixes: ['cinematic shot of', 'video of'],
        avoidTerms: [],
        recommendedSettings: {},
        template: `{subject_description}. {action_description}. {setting_description}. {camera_movement}. {style_description}.`,
        examples: [
            {
                input: 'woolly mammoths',
                output: 'Several giant woolly mammoths approach treading through a snowy meadow, their long woolly fur blows lightly in the wind as they walk, snow covered trees and dramatic snow capped mountains in the distance, mid afternoon light with wispy clouds and a sun high in the distance creates a warm glow, the low camera view is stunning capturing the large furry mammal with beautiful photography, depth of field.',
                notes: 'Sora excels with very descriptive, narrative prompts'
            }
        ]
    },

    'minimax-video': {
        id: 'minimax-video',
        name: 'MiniMax Video',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'high quality', 'smooth', 'cinematic'
        ],
        stylePrefixes: [],
        avoidTerms: [],
        recommendedSettings: {},
        template: `{trigger_words} {subject_description}, {action_movement}, {setting_background}, {style}`,
        examples: [
            {
                input: 'cat sleeping',
                output: 'ohwx_cat, fluffy white cat sleeping on velvet cushion, chest rising and falling rhythmically, soft morning light, peaceful atmosphere, high quality video',
                notes: 'MiniMax handles simple motion well'
            }
        ]
    },

    'hunyuan-video': {
        id: 'hunyuan-video',
        name: 'Hunyuan Video',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: ['cinematic', 'high quality', 'smooth motion', '4k'],
        stylePrefixes: ['video of', 'cinematic shot of'],
        avoidTerms: ['static', 'blurry'],
        recommendedSettings: {
            cfgScale: [5, 7],
            steps: [25, 30]
        },
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {style}`,
        examples: [
            {
                input: 'waves crashing',
                output: 'ocean waves crashing on rocky shore, spray flying in air, dynamic camera movement, sunset lighting, cinematic quality, 4k video',
                notes: 'Hunyuan handles long consistent video generation'
            }
        ]
    },

    'luma-dream-machine': {
        id: 'luma-dream-machine',
        name: 'Luma Dream Machine',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: ['dreamlike', 'smooth', 'cinematic', 'high quality'],
        stylePrefixes: ['cinematic video of', 'dreamy shot of'],
        avoidTerms: ['static', 'glitch'],
        recommendedSettings: {},
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {style}`,
        examples: [
            {
                input: 'flying through clouds',
                output: 'camera flying through fluffy white clouds, blue sky, sun rays piercing through, dreamlike atmosphere, smooth motion, high quality',
                notes: 'Luma excels at smooth, physics-based motion'
            }
        ]
    },

    'runway-gen3': {
        id: 'runway-gen3',
        name: 'Runway Gen-3 Alpha',
        provider: 'fal',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: '. ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['consistent character', 'same person'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: ['cinematic', 'photorealistic', 'high fidelity', 'slow motion'],
        stylePrefixes: ['cinematic shot of', 'professional footage of'],
        avoidTerms: ['morphing', 'blurry'],
        recommendedSettings: {},
        template: `{subject_description}. {action_description}. {camera_movement}. {setting_description}. {style}.`,
        examples: [
            {
                input: 'car chase',
                output: 'High speed car chase on highway. Red sports car weaving through traffic. Dynamic camera tracking. Sunset lighting with lens flares. Cinematic movie scene, high fidelity.',
                notes: 'Gen-3 prefers descriptive sentences'
            }
        ]
    },

    'veo-2': {
        id: 'veo-2',
        name: 'Google Veo 2',
        provider: 'google',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: ['cinematic', 'high quality', 'smooth', '4k'],
        stylePrefixes: ['cinematic shot of', 'video of'],
        avoidTerms: ['static', 'blurry'],
        recommendedSettings: {},
        template: `{trigger_words} {subject_description}, {action_movement}, {camera_motion}, {setting_background}, {style}`,
        examples: [
            {
                input: 'forest stream',
                output: 'clear stream flowing through ancient forest, sunlight filtering through leaves, smooth camera tracking downstream, nature documentary style, 4k video',
                notes: 'Veo 2 produces stable, realistic video'
            }
        ]
    },

    'animatediff': {
        id: 'animatediff',
        name: 'AnimateDiff',
        provider: 'multiple',
        type: 'video',
        syntax: {
            style: 'tags',
            separator: ', ',
            maxLength: 300,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['1girl', '1boy', 'solo'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: ['masterpiece', 'best quality', 'highres', 'smooth animation'],
        stylePrefixes: ['anime style', 'animation of'],
        avoidTerms: ['low quality', 'bad anatomy'],
        recommendedSettings: {
            steps: [20, 30]
        },
        template: `{trigger_words}, {quality_boosters}, {subject_description}, {action_movement}, {setting_background}, {style}`,
        examples: [
            {
                input: 'anime girl dancing',
                output: 'ohwx_girl, masterpiece, best quality, 1girl, dancing, spinning, frilly dress, stage lights, anime style, smooth animation',
                notes: 'AnimateDiff works best with Stable Diffusion style tags'
            }
        ]
    },

    // ==================== DALL-E MODELS ====================

    'dall-e-3': {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: '. ',
            maxLength: 4000,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start', // But DALL-E doesn't support LoRAs
            consistencyKeywords: ['the same person', 'consistent character', 'identical appearance to'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'highly detailed', 'photorealistic', 'professional quality',
            'sharp focus', 'intricate details'
        ],
        stylePrefixes: [
            'in the style of', 'reminiscent of', 'artistic interpretation of'
        ],
        avoidTerms: [
            // DALL-E has content policy - avoid these
        ],
        recommendedSettings: {},
        template: `{subject_description}. {scene_description}. {style_description}. {quality_details}`,
        examples: [
            {
                input: 'astronaut on mars',
                output: 'A lone astronaut in a detailed white and orange spacesuit stands on the rust-colored surface of Mars. The astronaut gazes at a massive dust storm on the horizon while Earth is visible as a small blue dot in the salmon-pink sky. The scene captures the isolation and grandeur of space exploration. Highly detailed, photorealistic rendering with dramatic lighting from the distant sun.',
                notes: 'DALL-E 3 excels with detailed natural language, full sentences'
            }
        ]
    },

    // ==================== GOOGLE MODELS ====================

    'veo-3': {
        id: 'veo-3',
        name: 'Google Veo 3',
        provider: 'google',
        type: 'video',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 500,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same character', 'consistent appearance', 'identical person'],
            poseDescriptionStyle: 'action-based'
        },
        qualityBoosters: [
            'cinematic quality', 'professional production', 'smooth motion',
            'high fidelity', 'detailed'
        ],
        stylePrefixes: ['cinematic', 'professional video of'],
        avoidTerms: [],
        recommendedSettings: {},
        template: `{subject_description} {trigger_words}, {action_description}, {scene_setting}, {camera_style}, {mood_lighting}, {quality}`,
        examples: [
            {
                input: 'dancer performing',
                output: 'Graceful ballet dancer ohwx_dancer, performing elegant pirouette in grand theater, flowing white tutu catching stage lights, smooth continuous rotation, ornate golden interior with velvet seats, dramatic spotlight with soft ambient fill, cinematic quality, professional production',
                notes: 'Veo responds well to clear action descriptions and cinematic terminology'
            }
        ]
    },

    'imagen-3': {
        id: 'imagen-3',
        name: 'Google Imagen 3',
        provider: 'google',
        type: 'image',
        syntax: {
            style: 'natural',
            separator: ', ',
            maxLength: 480,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'before_subject',
            consistencyKeywords: ['same person', 'consistent character', 'identical features'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'highly detailed', 'professional quality', 'sharp focus',
            'vivid colors', 'masterful composition'
        ],
        stylePrefixes: ['artistic', 'styled as', 'in the manner of'],
        avoidTerms: [],
        recommendedSettings: {},
        template: `{subject_description} {trigger_words}, {pose_action}, {setting_environment}, {lighting_mood}, {style}, {quality}`,
        examples: [
            {
                input: 'scientist in laboratory',
                output: 'Brilliant scientist ohwx_scientist with safety goggles, examining glowing chemical reaction in beaker, modern laboratory with advanced equipment, dramatic blue and green lighting from experiments, documentary photography style, highly detailed, professional quality',
                notes: 'Imagen excels with vivid, descriptive natural language'
            }
        ]
    }
};

// Helper to get guide by model ID
export function getModelGuide(modelId: string): ModelPromptGuide | null {
    console.log(`[ModelPromptGuides] Looking up guide for: ${modelId}`);
    // Direct match
    if (MODEL_PROMPTING_GUIDES[modelId]) {
        console.log(`[ModelPromptGuides] Found direct match: ${MODEL_PROMPTING_GUIDES[modelId].id}`);
        return MODEL_PROMPTING_GUIDES[modelId];
    }

    // Standardize Wan IDs (case-insensitive)
    const lowerId = modelId.toLowerCase();
    if (lowerId.includes('wan-25') || lowerId.includes('wan-2.5') || lowerId.includes('wan-2.1') || lowerId.includes('wan-21') || lowerId.includes('wan 2.5')) {
        return MODEL_PROMPTING_GUIDES['wan-v2-5'];
    }

    // Fuzzy match for common variations
    const normalizedId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [key, guide] of Object.entries(MODEL_PROMPTING_GUIDES)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKey === normalizedId || normalizedId.includes(normalizedKey)) {
            return guide;
        }
    }

    // Default to flux-dev as a sensible fallback
    return MODEL_PROMPTING_GUIDES['flux-dev'];
}

// Get all guides for a specific type
export function getGuidesForType(type: 'image' | 'video'): ModelPromptGuide[] {
    return Object.values(MODEL_PROMPTING_GUIDES).filter(
        guide => guide.type === type || guide.type === 'both'
    );
}

// Negative prompt templates for models that support them
export const NEGATIVE_PROMPT_TEMPLATES: Record<string, string> = {
    // === STABLE DIFFUSION MODELS ===
    'sdxl': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, deformed, disfigured',
    'sd15': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, poorly drawn hands, poorly drawn face, mutation, deformed, extra limbs',
    'sd3-5-large': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry, deformed, disfigured, mutated',
    'realistic-vision': '(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
    'pony-diffusion': 'score_4, score_3, score_2, score_1, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',

    // === FLUX MODELS (limited negative support) ===
    'flux-dev': 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text',
    'flux-schnell': 'blurry, low quality, distorted, ugly',
    'flux-pro': 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, artifacts',
    'flux-2': 'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text, artifacts, oversaturated',

    // === VIDEO MODELS ===
    'wan-v2-2': 'static, frozen, blurry, low quality, distorted faces, morphing, flickering, jittery motion, bad anatomy, deformed',
    'wan-v2-5': 'static, frozen, blurry, low quality, distorted faces, morphing, flickering, jittery motion, bad anatomy, deformed, inconsistent character',
    'kling-video-v2-1': 'static, blurry, low quality, distorted, flickering, jittery, morphing faces, bad anatomy, deformed',
    'kling-video-v2-6': 'static, blurry, low quality, distorted, flickering, jittery, morphing faces, bad anatomy, deformed, audio sync issues',
    'kling-video-o1': 'static, blurry, low quality, distorted, flickering, jittery, morphing faces, bad anatomy, deformed, inconsistent character',
    'ltx-video': 'static, frozen, blurry, low quality, distorted, flickering, jittery motion, morphing, bad anatomy',
    'hailuo-director': 'static, blurry, low quality, distorted, flickering, jittery, morphing, bad anatomy, wrong camera movement',
    'runway-gen3': 'static, blurry, low quality, distorted, flickering, morphing, bad anatomy, deformed, jittery',
    'runway-gen4': 'static, blurry, low quality, distorted, flickering, morphing, bad anatomy, deformed, jittery, inconsistent',
    'luma-dream-machine': 'static, frozen, blurry, low quality, distorted, flickering, glitchy, morphing, bad physics',
    'hunyuan-video': 'static, frozen, blurry, low quality, distorted, flickering, jittery, morphing faces, bad anatomy',
    'minimax-video': 'static, frozen, blurry, low quality, distorted, flickering, jittery, morphing',
    'animatediff': 'lowres, bad anatomy, bad hands, text, worst quality, low quality, blurry, static, frozen, jittery, morphing',
    'veo-2': 'static, frozen, blurry, low quality, distorted, flickering, morphing, bad anatomy, deformed',
    'veo-3': 'static, frozen, blurry, low quality, distorted, flickering, morphing, bad anatomy, deformed, inconsistent',
    'sora': 'static, blurry, low quality, distorted, flickering, morphing, bad physics, unrealistic motion, deformed',

    // === IMAGE MODELS ===
    'recraft-v3': 'blurry, pixelated, low resolution, bad lines, inconsistent style, raster artifacts',
    'ideogram-v2': 'blurry, low quality, typos, misspellings, wrong text, bad typography, distorted letters',
    'dall-e-3': 'blurry, low quality, distorted, deformed, bad anatomy, watermark, text errors',
    'imagen-3': 'blurry, low quality, distorted, deformed, bad anatomy, watermark, artifacts, oversaturated',
    'fal-ai/kling-image/o1': 'blurry, low quality, distorted, deformed, bad anatomy, watermark, artifacts',

    // === AVATAR MODELS ===
    'kling-avatar-v2-pro': 'blurry, distorted face, out of sync, unnatural mouth movements, frozen, static, glitchy audio',
    'kling-avatar-v2-standard': 'blurry, distorted face, out of sync, unnatural mouth movements, frozen, static',
};

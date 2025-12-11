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

    // ==================== JUGGERNAUT MODELS ====================
    // Based on RunDiffusion prompt guides: https://learn.rundiffusion.com/

    'juggernaut-xi': {
        id: 'juggernaut-xi',
        name: 'Juggernaut XI',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)', // Use sparingly, 1.1-1.3 range
            negativePrefix: 'Negative prompt: ',
            maxLength: 300, // Try not to exceed 75 tokens
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start', // Lead with the subject
            triggerWordPlacement: 'start',
            consistencyKeywords: ['same person', 'consistent features', '1woman', '1man', 'photograph'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'High Resolution', 'Cinematic', 'sharp focus', 'detailed texture',
            'cinematic lighting', 'photograph'
        ],
        stylePrefixes: ['photograph of', 'cinematic shot of', 'portrait of'],
        avoidTerms: [
            'cgi', '3D', 'digital', 'airbrushed', 'cartoon', 'anime'
        ],
        recommendedSettings: {
            cfgScale: [4, 6], // CFG 4-6 recommended
            steps: [25, 40],
            sampler: ['DPM++ 2M Karras']
        },
        template: `{trigger_words}, {subject_description}, {action_pose}, {environment_setting}, {color_scheme}, {lighting}, {mood_atmosphere}, {style}, {texture_material}, High Resolution`,
        examples: [
            {
                input: 'portrait of a woman',
                output: 'ohwx_woman, beautiful woman with auburn hair and green eyes, confident expression, wearing elegant cream blouse, modern office setting, warm natural lighting, professional atmosphere, cinematic, (detailed skin texture:1.1), High Resolution, sharp focus',
                notes: 'Juggernaut XI: Lead with subject, keep under 75 tokens, use weights sparingly (1.1-1.3)'
            },
            {
                input: 'knight in battle',
                output: 'ohwx_knight, armored medieval knight, (battle-worn steel armor:1.2), standing on misty battlefield, low angle shot, dramatic fog, metallic texture, cinematic lighting, High Resolution, photograph',
                notes: 'Use texture descriptions for enhanced detail'
            }
        ]
    },

    'juggernaut-xii': {
        id: 'juggernaut-xii',
        name: 'Juggernaut XII',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)', // Use sparingly, 1.1-1.3 range
            negativePrefix: 'Negative prompt: ',
            maxLength: 300, // Try not to exceed 75 tokens
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start', // Lead with the subject
            triggerWordPlacement: 'start',
            consistencyKeywords: ['same person', 'consistent features', '1woman', '1man', 'photograph'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'High Resolution', 'Cinematic', 'sharp focus', 'detailed texture',
            'cinematic lighting', 'photograph'
        ],
        stylePrefixes: ['photograph of', 'cinematic shot of', 'portrait of'],
        avoidTerms: [
            'cgi', '3D', 'digital', 'airbrushed', 'cartoon', 'anime'
        ],
        recommendedSettings: {
            cfgScale: [4, 6], // CFG 4-6 recommended
            steps: [25, 40],
            sampler: ['DPM++ 2M Karras', '3M SDE Exponential', 'Euler'] // Euler produces softer results
        },
        template: `{trigger_words}, {subject_description}, {action_pose}, {environment_setting}, {color_scheme}, {lighting}, {mood_atmosphere}, {style}, {texture_material}, High Resolution`,
        examples: [
            {
                input: 'emotional portrait',
                output: 'ohwx_woman, young woman with expressive eyes, (melancholic emotion:1.2), tears welling up, soft window light, intimate close-up, detailed texture, cinematic, High Resolution, photograph',
                notes: 'Juggernaut XII excels in emotion rendering and hand quality. Add "bad hands" to negative for improved hands.'
            },
            {
                input: 'watercolor landscape',
                output: 'peaceful village scene, rolling hills with cottages, cherry blossom trees, soft pastel colors, watercolor medium, artistic interpretation, beautiful lighting, High Resolution',
                notes: 'XII handles artistic mediums well - specify the medium for style variation'
            }
        ]
    },

    'juggernaut-xiii': {
        id: 'juggernaut-xiii',
        name: 'Juggernaut XIII Ragnarok',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)', // Use sparingly on primary subjects
            negativePrefix: 'Negative prompt: ',
            maxLength: 300, // Try not to exceed 75 tokens - exceeding reduces prompt adherence
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start', // Lead with the subject - first sentence sets the foundation
            triggerWordPlacement: 'start',
            consistencyKeywords: ['same person', 'consistent features', '1woman', '1man', 'photograph', 'Skin Textures'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'High Resolution', 'Cinematic', 'sharp focus', 'Skin Textures',
            'photograph', 'detailed texture', 'natural', 'realistic texture'
        ],
        stylePrefixes: [
            'photograph of', 'cinematic shot of', 'portrait of',
            'surrealism', 'watercolor', 'photorealism'
        ],
        avoidTerms: [
            'cartoon', 'anime', 'cgi', '3D render'
        ],
        recommendedSettings: {
            cfgScale: [3, 6], // Lower CFG (3-6) enhances realism
            steps: [30, 40],
            sampler: ['DPM++ 2M SDE', 'DPM++ 2M Karras']
        },
        template: `{trigger_words}, {subject_description}, {action_pose}, {environment_setting}, {color_scheme}, {style}, {mood_atmosphere}, {lighting}, {perspective_viewpoint}, {texture_material}, {time_period}, {cultural_elements}, {emotion}, {medium}, {clothing}, High Resolution`,
        examples: [
            {
                input: 'ballerina portrait',
                output: 'ohwx_woman, graceful ballerina in white tutu, elegant pose en pointe, ornate theater stage, soft golden spotlight, ethereal mood, (detailed skin texture:1.1), cinematic, High Resolution, photograph',
                notes: 'Ragnarok: Lead with subject, be specific for control, vague for flexibility. Lower CFG (3-6) enhances realism.'
            },
            {
                input: 'cyborg cat',
                output: 'ohwx_cat, cybernetic feline with glowing blue eyes, (metallic chrome fur:1.2), leaping through neon-lit alley, motion blur on limbs, cyberpunk environment, dramatic backlighting, High Resolution, Cinematic',
                notes: 'Dynamic action with motion descriptors works well'
            },
            {
                input: 'ancient forest',
                output: 'mystical ancient forest clearing, towering moss-covered trees, ethereal light beams through canopy, magical particles floating, rich green color palette, fantasy atmosphere, detailed bark texture, bird\'s eye view, High Resolution, photograph',
                notes: 'Environmental focus with atmospheric tokens'
            },
            {
                input: 'grandmother portrait',
                output: 'ohwx_woman, elderly grandmother with warm smile, (soft wrinkles:1.1), silver hair in gentle bun, golden hour window light streaming across face, cozy living room, intimate mood, detailed skin texture, eye level portrait, High Resolution, Cinematic',
                notes: 'Lighting-focused portraits - golden hour and backlit work exceptionally well'
            },
            {
                input: 'embroidered fabric',
                output: 'intricate embroidered silk fabric, delicate floral patterns, (golden thread details:1.2), rich burgundy base, soft studio lighting, extreme close-up, detailed texture emphasis, High Resolution, photograph',
                notes: 'Texture descriptions significantly enhance output quality'
            },
            {
                input: 'WWII soldier',
                output: 'ohwx_man, weary WWII soldier in olive drab uniform, 1940s military gear, standing in bombed European village, overcast dramatic lighting, sepia undertones, time period accurate details, documentary photograph style, High Resolution, Cinematic',
                notes: 'Time period grounding helps with historical accuracy'
            }
        ]
    },

    // Generic Juggernaut fallback (maps to latest XIII)
    'juggernaut': {
        id: 'juggernaut',
        name: 'Juggernaut XL',
        provider: 'civitai',
        type: 'image',
        syntax: {
            style: 'weighted',
            separator: ', ',
            weightSyntax: '(term:weight)',
            negativePrefix: 'Negative prompt: ',
            maxLength: 300,
            supportsMarkdown: false
        },
        characterHandling: {
            placementPriority: 'start',
            triggerWordPlacement: 'start',
            consistencyKeywords: ['same person', 'consistent features', '1woman', '1man', 'photograph', 'Skin Textures'],
            poseDescriptionStyle: 'detailed'
        },
        qualityBoosters: [
            'High Resolution', 'Cinematic', 'sharp focus', 'Skin Textures',
            'photograph', 'detailed texture'
        ],
        stylePrefixes: ['photograph of', 'cinematic shot of', 'portrait of'],
        avoidTerms: ['cartoon', 'anime', 'cgi', '3D render'],
        recommendedSettings: {
            cfgScale: [3, 6],
            steps: [30, 40],
            sampler: ['DPM++ 2M SDE', 'DPM++ 2M Karras']
        },
        template: `{trigger_words}, {subject_description}, {action_pose}, {environment_setting}, {lighting}, {mood_atmosphere}, {style}, {texture_material}, High Resolution`,
        examples: [
            {
                input: 'portrait of a warrior',
                output: 'ohwx_warrior, fierce warrior with battle scars, (detailed armor:1.2), standing on misty battlefield, dramatic low angle, fog and embers, metallic texture, cinematic lighting, High Resolution, photograph',
                notes: 'Juggernaut: Lead with subject, keep under 75 tokens, CFG 3-6 for realism'
            }
        ]
    },

    // ==================== VIDEO MODELS ====================

    'wan-video': {
        id: 'wan-video',
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

    'kling-video': {
        id: 'kling-video',
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
    // Direct match
    if (MODEL_PROMPTING_GUIDES[modelId]) {
        return MODEL_PROMPTING_GUIDES[modelId];
    }

    // Fuzzy match for common variations
    const normalizedId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lowerModelId = modelId.toLowerCase();

    // Special handling for Juggernaut versions
    if (lowerModelId.includes('juggernaut')) {
        if (lowerModelId.includes('xiii') || lowerModelId.includes('13') || lowerModelId.includes('ragnarok')) {
            return MODEL_PROMPTING_GUIDES['juggernaut-xiii'];
        }
        if (lowerModelId.includes('xii') || lowerModelId.includes('12')) {
            return MODEL_PROMPTING_GUIDES['juggernaut-xii'];
        }
        if (lowerModelId.includes('xi') || lowerModelId.includes('11')) {
            return MODEL_PROMPTING_GUIDES['juggernaut-xi'];
        }
        // Default to latest Juggernaut
        return MODEL_PROMPTING_GUIDES['juggernaut'];
    }

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
    'sdxl': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, deformed, disfigured',
    'sd15': 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, poorly drawn hands, poorly drawn face, mutation, deformed, extra limbs',
    'realistic-vision': '(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck',
    'pony-diffusion': 'score_4, score_3, score_2, score_1, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
    'juggernaut-xi': 'fake eyes, deformed eyes, bad eyes, cgi, 3D, digital, airbrushed, bad hands, blurry, missing limbs, bad anatomy, cartoon',
    'juggernaut-xii': 'fake eyes, deformed eyes, bad eyes, cgi, 3D, digital, airbrushed, bad hands, blurry, missing limbs, bad anatomy, cartoon',
    'juggernaut-xiii': 'bad eyes, blurry, missing limbs, bad anatomy, cartoon, deformed, disfigured, extra limbs, mutated hands, poorly drawn hands, poorly drawn face',
    'juggernaut': 'bad eyes, blurry, missing limbs, bad anatomy, cartoon, deformed, disfigured, extra limbs, mutated hands, poorly drawn hands, poorly drawn face',
};

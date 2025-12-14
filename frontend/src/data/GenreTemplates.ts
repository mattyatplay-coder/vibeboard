/**
 * Genre Templates for Story Editor
 *
 * Each genre template provides:
 * - Visual style defaults
 * - Recommended camera movements
 * - Avoided camera movements
 * - Common shot types for different story beats
 * - Lighting and color preferences
 *
 * Used by the Story Editor to generate genre-appropriate shots
 * and by the CameraPresetSelector to show recommendations.
 */

import { Genre } from './CameraPresets';

// Re-export Genre for convenience
export type { Genre } from './CameraPresets';

export interface ShotType {
    type: 'establishing' | 'dialogue' | 'action' | 'tension' | 'reveal' | 'climax' | 'intimate' | 'transition' | 'hero_moment' | 'chase' | 'stalking';
    camera: string; // Camera preset ID
    angle?: string;
    lighting?: string;
    description?: string;
}

export interface GenreTemplate {
    id: Genre;
    name: string;
    description: string;
    icon: string;

    // Visual defaults
    defaultStyle: string;
    colorPalette: string[];
    defaultLighting: string;

    // Camera preferences
    cameraPreferences: string[]; // Recommended preset IDs
    avoidMoves: string[]; // Preset IDs to avoid

    // Common shot patterns for story beats
    commonShots: ShotType[];

    // Additional style notes
    styleNotes: string[];
}

export const GENRE_TEMPLATES: Record<Genre, GenreTemplate> = {
    // ═══════════════════════════════════════════════════════════════════════
    // FILM NOIR
    // ═══════════════════════════════════════════════════════════════════════
    film_noir: {
        id: 'film_noir',
        name: 'Film Noir',
        description: 'Classic 1940s detective thriller style with high contrast shadows',
        icon: '🎩',

        defaultStyle: 'high contrast black and white, dramatic shadows, venetian blinds, smoke, rain-slicked streets',
        colorPalette: ['black', 'white', 'silver', 'deep shadows'],
        defaultLighting: 'low key, hard shadows, rim lighting, chiaroscuro',

        cameraPreferences: [
            'dolly_zoom_in', 'dutch_angle', 'snorricam', 'static',
            'dolly_in', 'crane_down', 'focus_rack', 'arc_left', 'arc_right'
        ],
        avoidMoves: [
            'bullet_time', 'fpv_drone', 'yoyo_zoom', 'hyperlapse',
            'crash_zoom_in', 'orbit_360', 'fisheye'
        ],

        commonShots: [
            { type: 'establishing', camera: 'static', lighting: 'low_key', description: 'Rain-soaked city street at night' },
            { type: 'dialogue', camera: 'dolly_in', lighting: 'rembrandt', description: 'Slow push on detective in shadow' },
            { type: 'tension', camera: 'dolly_zoom_in', lighting: 'silhouette', description: 'Vertigo effect as truth dawns' },
            { type: 'reveal', camera: 'crane_down', lighting: 'dramatic', description: 'Descend to reveal the body' },
            { type: 'intimate', camera: 'static', angle: 'close', lighting: 'split', description: 'Femme fatale half in shadow' },
            { type: 'stalking', camera: 'steadicam', lighting: 'minimal', description: 'Following through dark alleys' }
        ],

        styleNotes: [
            'Use venetian blind shadows whenever possible',
            'Cigarette smoke adds atmosphere',
            'Night scenes with wet streets for reflections',
            'Strong backlighting for silhouettes',
            'Dutch angles for psychological unease'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION
    // ═══════════════════════════════════════════════════════════════════════
    action: {
        id: 'action',
        name: 'Action',
        description: 'High-energy blockbuster sequences with dynamic camera work',
        icon: '💥',

        defaultStyle: 'dynamic, kinetic, saturated colors, high contrast, sharp details',
        colorPalette: ['orange', 'teal', 'deep blue', 'fire red'],
        defaultLighting: 'dramatic, high contrast, practical lights, explosions',

        cameraPreferences: [
            'bullet_time', 'crash_zoom_in', 'whip_pan', 'fpv_drone', 'car_chase',
            'hero_cam', 'handheld', 'orbit_360', 'gimbal', 'rapid_zoom_in'
        ],
        avoidMoves: [
            'lazy_susan', 'glam', 'static', 'timelapse_sky',
            'focus_rack', 'dolly_zoom_in'
        ],

        commonShots: [
            { type: 'establishing', camera: 'fpv_drone', angle: 'wide', lighting: 'natural', description: 'Sweeping aerial of location' },
            { type: 'hero_moment', camera: 'hero_cam', angle: 'low', lighting: 'dramatic', description: 'Hero rises, camera low looking up' },
            { type: 'action', camera: 'handheld', angle: 'close', lighting: 'high_contrast', description: 'Intense fight choreography' },
            { type: 'chase', camera: 'car_chase', lighting: 'natural', description: 'Vehicle pursuit' },
            { type: 'climax', camera: 'bullet_time', lighting: 'dramatic', description: 'Key moment frozen in time' },
            { type: 'transition', camera: 'whip_pan', description: 'Fast cut between locations' }
        ],

        styleNotes: [
            'Teal and orange color grading is classic',
            'Quick cuts during fight sequences',
            'Practical explosions and effects when possible',
            'Speed ramping for impact moments',
            'Low angles make heroes look powerful'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // HORROR
    // ═══════════════════════════════════════════════════════════════════════
    horror: {
        id: 'horror',
        name: 'Horror',
        description: 'Atmospheric dread and terror with unsettling camera work',
        icon: '👻',

        defaultStyle: 'desaturated, dark shadows, unsettling, cold tones, grain',
        colorPalette: ['deep green', 'sickly yellow', 'blood red', 'pale blue', 'black'],
        defaultLighting: 'low key, underlit, practical sources, flickering',

        cameraPreferences: [
            'dolly_zoom_in', 'snorricam', 'dutch_angle', 'crane_down', 'static',
            'steadicam', 'tilt_down', 'eyes_in', 'low_shutter', 'worms_eye'
        ],
        avoidMoves: [
            'glam', 'yoyo_zoom', 'hyperlapse', 'orbit_360',
            'hero_cam', 'road_rush'
        ],

        commonShots: [
            { type: 'establishing', camera: 'crane_down', angle: 'wide', lighting: 'low_key', description: 'Descend to haunted location' },
            { type: 'stalking', camera: 'steadicam', angle: 'pov', lighting: 'dark', description: 'Following victim through corridors' },
            { type: 'reveal', camera: 'dolly_zoom_in', angle: 'dutch_angle', lighting: 'silhouette', description: 'Horror reveal with vertigo effect' },
            { type: 'tension', camera: 'static', angle: 'wide', lighting: 'minimal', description: 'Long static take building dread' },
            { type: 'intimate', camera: 'eyes_in', lighting: 'underlit', description: 'Terror in the eyes' },
            { type: 'climax', camera: 'crash_zoom_in', angle: 'close', lighting: 'flash', description: 'Jump scare moment' }
        ],

        styleNotes: [
            'Long static takes build unbearable tension',
            'Negative space for unseen threats',
            'Practical lighting sources (candles, flashlights)',
            'Subtle camera movement can be more unsettling than fast',
            'Sound design is half the horror - plan for silence'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ROMANCE
    // ═══════════════════════════════════════════════════════════════════════
    romance: {
        id: 'romance',
        name: 'Romance',
        description: 'Intimate emotional storytelling with soft, dreamy visuals',
        icon: '💕',

        defaultStyle: 'soft lighting, warm colors, dreamy bokeh, intimate framing',
        colorPalette: ['rose', 'gold', 'warm white', 'blush pink', 'sunset orange'],
        defaultLighting: 'soft, warm, golden hour, diffused, backlit',

        cameraPreferences: [
            'dolly_in', 'arc_left', 'arc_right', 'crane_up', 'glam',
            'focus_rack', 'lazy_susan', 'over_shoulder', 'orbit_360'
        ],
        avoidMoves: [
            'crash_zoom_in', 'handheld', 'dutch_angle', 'snorricam',
            'bullet_time', 'car_chase', 'fpv_drone', 'shaky_intense'
        ],

        commonShots: [
            { type: 'establishing', camera: 'crane_up', angle: 'wide', lighting: 'golden_hour', description: 'Sweeping reveal of romantic location' },
            { type: 'dialogue', camera: 'over_shoulder', lighting: 'soft', description: 'Intimate conversation framing' },
            { type: 'intimate', camera: 'dolly_in', angle: 'close', lighting: 'warm', description: 'Slow push as connection deepens' },
            { type: 'climax', camera: 'orbit_360', angle: 'close', lighting: 'romantic', description: 'Kiss scene with full orbit' },
            { type: 'reveal', camera: 'focus_rack', description: 'Shift focus between lovers' },
            { type: 'transition', camera: 'arc_left', lighting: 'soft', description: 'Gentle arc during tender moment' }
        ],

        styleNotes: [
            'Golden hour lighting is your best friend',
            'Shallow depth of field for dreamy bokeh',
            'Warm color grading throughout',
            'Slow, gentle camera movements',
            'Close-ups for emotional connection'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DOCUMENTARY
    // ═══════════════════════════════════════════════════════════════════════
    documentary: {
        id: 'documentary',
        name: 'Documentary',
        description: 'Authentic observational filmmaking with natural aesthetics',
        icon: '📹',

        defaultStyle: 'natural lighting, realistic colors, intimate, authentic',
        colorPalette: ['natural', 'earth tones', 'available light colors'],
        defaultLighting: 'natural, available light, practical sources',

        cameraPreferences: [
            'handheld', 'static', 'hyperlapse', 'steadicam', 'timelapse_city',
            'timelapse_sky', 'gimbal', 'pan_left', 'pan_right', 'head_tracking'
        ],
        avoidMoves: [
            'bullet_time', 'dolly_zoom_in', 'dutch_angle', 'through_object',
            'orbit_360', 'snorricam', 'fisheye'
        ],

        commonShots: [
            { type: 'establishing', camera: 'hyperlapse', angle: 'wide', lighting: 'natural', description: 'Moving through the environment' },
            { type: 'dialogue', camera: 'static', angle: 'medium', lighting: 'natural', description: 'Interview framing, slight headroom' },
            { type: 'action', camera: 'handheld', lighting: 'available', description: 'Following action as it happens' },
            { type: 'transition', camera: 'timelapse_city', description: 'Time passage between segments' },
            { type: 'intimate', camera: 'steadicam', angle: 'close', lighting: 'natural', description: 'Observational moment' },
            { type: 'reveal', camera: 'crane_up', lighting: 'natural', description: 'Rise to reveal scope' }
        ],

        styleNotes: [
            'Authenticity over style - don\'t overdo it',
            'Natural sound is crucial - plan for it',
            'Let moments breathe - don\'t cut too fast',
            'Available light keeps it real',
            'Subject headroom for lower-third graphics'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SCI-FI
    // ═══════════════════════════════════════════════════════════════════════
    sci_fi: {
        id: 'sci_fi',
        name: 'Sci-Fi',
        description: 'Futuristic and otherworldly with technological aesthetics',
        icon: '🚀',

        defaultStyle: 'neon lighting, cold colors, technological, volumetric, clean lines',
        colorPalette: ['cyan', 'magenta', 'electric blue', 'hologram green', 'chrome'],
        defaultLighting: 'neon, volumetric, rim lighting, LED practical',

        cameraPreferences: [
            'through_object', 'bullet_time', 'fpv_drone', 'crane_up',
            'orbit_360', '3d_rotation', 'dolly_in', 'hyperlapse', 'gimbal'
        ],
        avoidMoves: [
            'handheld', 'timelapse_sky', 'shaky_intense',
            'lazy_susan', 'worms_eye'
        ],

        commonShots: [
            { type: 'establishing', camera: 'fpv_drone', angle: 'wide', lighting: 'neon', description: 'Flying through futuristic cityscape' },
            { type: 'reveal', camera: 'through_object', lighting: 'volumetric', description: 'Camera passes through hologram or glass' },
            { type: 'action', camera: 'bullet_time', lighting: 'dramatic', description: 'Sci-fi action frozen in time' },
            { type: 'intimate', camera: 'dolly_in', angle: 'close', lighting: 'rim', description: 'Character moment with tech aesthetic' },
            { type: 'transition', camera: 'hyperlapse', lighting: 'neon', description: 'Time passage through futuristic space' },
            { type: 'climax', camera: 'orbit_360', lighting: 'dramatic', description: 'Hero moment with full rotation' }
        ],

        styleNotes: [
            'Volumetric lighting (fog, haze) adds atmosphere',
            'Practical LED lights for authenticity',
            'Clean, geometric compositions',
            'Lens flares can enhance futuristic feel',
            'Blue/cyan for cold tech, warm for organic elements'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // COMEDY
    // ═══════════════════════════════════════════════════════════════════════
    comedy: {
        id: 'comedy',
        name: 'Comedy',
        description: 'Bright, energetic visuals supporting comedic timing',
        icon: '😂',

        defaultStyle: 'bright, colorful, high key lighting, clean compositions',
        colorPalette: ['bright primaries', 'pastels', 'warm neutrals'],
        defaultLighting: 'high key, even, bright, flattering',

        cameraPreferences: [
            'crash_zoom_in', 'crash_zoom_out', 'whip_pan', 'static',
            'dolly_in', 'fisheye', 'yoyo_zoom', 'handheld'
        ],
        avoidMoves: [
            'dolly_zoom_in', 'snorricam', 'dutch_angle', 'low_shutter',
            'bullet_time', 'steadicam'
        ],

        commonShots: [
            { type: 'establishing', camera: 'static', angle: 'wide', lighting: 'bright', description: 'Clean establishing of comedic space' },
            { type: 'dialogue', camera: 'static', angle: 'medium', lighting: 'even', description: 'Let the performance carry it' },
            { type: 'reveal', camera: 'crash_zoom_out', lighting: 'bright', description: 'Comedic reveal with fast zoom' },
            { type: 'action', camera: 'whip_pan', description: 'Fast cut between reactions' },
            { type: 'climax', camera: 'crash_zoom_in', angle: 'close', description: 'Punch line emphasis' },
            { type: 'transition', camera: 'whip_pan', description: 'Quick scene transition' }
        ],

        styleNotes: [
            'Camera should support comedy, not compete with it',
            'Static shots often let jokes land better',
            'Quick zooms for emphasis on reactions',
            'Bright, even lighting - comedy dies in shadow',
            'Wide shots for physical comedy, close for reactions'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // THRILLER
    // ═══════════════════════════════════════════════════════════════════════
    thriller: {
        id: 'thriller',
        name: 'Thriller',
        description: 'Tense, suspenseful atmosphere with psychological unease',
        icon: '😰',

        defaultStyle: 'desaturated, cold tones, high contrast, claustrophobic framing',
        colorPalette: ['steel blue', 'sickly green', 'amber', 'shadow black'],
        defaultLighting: 'motivated, hard shadows, underexposed, practical',

        cameraPreferences: [
            'dolly_in', 'dolly_zoom_in', 'steadicam', 'static', 'dutch_angle',
            'focus_rack', 'crane_down', 'arc_left', 'arc_right', 'eyes_in'
        ],
        avoidMoves: [
            'yoyo_zoom', 'fisheye', 'orbit_360', 'glam',
            'hero_cam', 'hyperlapse'
        ],

        commonShots: [
            { type: 'establishing', camera: 'static', angle: 'wide', lighting: 'cold', description: 'Ominous establishing shot' },
            { type: 'stalking', camera: 'steadicam', lighting: 'dark', description: 'Following through tense environment' },
            { type: 'tension', camera: 'dolly_in', angle: 'close', lighting: 'underlit', description: 'Slow push building suspense' },
            { type: 'reveal', camera: 'focus_rack', description: 'Shift focus to threat' },
            { type: 'climax', camera: 'dolly_zoom_in', lighting: 'dramatic', description: 'Realization moment' },
            { type: 'dialogue', camera: 'arc_left', lighting: 'motivated', description: 'Circling during confrontation' }
        ],

        styleNotes: [
            'Slow burns are more effective than fast cuts',
            'Leave space for the unseen threat',
            'Sound design carries half the tension',
            'Claustrophobic framing increases anxiety',
            'Dutch angles for psychological unease'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DRAMA
    // ═══════════════════════════════════════════════════════════════════════
    drama: {
        id: 'drama',
        name: 'Drama',
        description: 'Emotionally resonant storytelling with naturalistic aesthetics',
        icon: '🎭',

        defaultStyle: 'naturalistic, subtle color grading, motivated lighting, intimate',
        colorPalette: ['earth tones', 'muted colors', 'natural palette'],
        defaultLighting: 'motivated, natural, soft with contrast',

        cameraPreferences: [
            'dolly_in', 'dolly_out', 'static', 'crane_up', 'focus_rack',
            'over_shoulder', 'arc_left', 'arc_right', 'steadicam', 'eyes_in'
        ],
        avoidMoves: [
            'bullet_time', 'crash_zoom_in', 'fisheye', 'fpv_drone',
            'yoyo_zoom', 'whip_pan', 'through_object'
        ],

        commonShots: [
            { type: 'establishing', camera: 'crane_up', angle: 'wide', lighting: 'natural', description: 'Reveal the world of the story' },
            { type: 'dialogue', camera: 'over_shoulder', lighting: 'soft', description: 'Classic conversation coverage' },
            { type: 'intimate', camera: 'dolly_in', angle: 'close', lighting: 'soft', description: 'Push in for emotional moment' },
            { type: 'tension', camera: 'static', angle: 'wide', lighting: 'natural', description: 'Let the scene breathe' },
            { type: 'reveal', camera: 'focus_rack', description: 'Shift attention between characters' },
            { type: 'climax', camera: 'eyes_in', lighting: 'emotional', description: 'Into the eyes for emotional climax' }
        ],

        styleNotes: [
            'Less is more - let performances carry scenes',
            'Motivated camera movement only',
            'Naturalistic color grading',
            'Close-ups for emotional connection',
            'Wide shots establish geography and relationships'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MUSIC VIDEO
    // ═══════════════════════════════════════════════════════════════════════
    music_video: {
        id: 'music_video',
        name: 'Music Video',
        description: 'Stylized, energetic visuals synced to music',
        icon: '🎵',

        defaultStyle: 'stylized, bold colors, high contrast, expressive lighting',
        colorPalette: ['neon', 'bold primaries', 'contrast pairs', 'whatever fits the song'],
        defaultLighting: 'expressive, colored gels, neon, dramatic',

        cameraPreferences: [
            'orbit_360', 'fpv_drone', 'through_object', 'crash_zoom_in',
            'yoyo_zoom', 'whip_pan', 'dutch_angle', 'bullet_time',
            'snorricam', 'fisheye', 'low_shutter', 'gimbal'
        ],
        avoidMoves: [
            'static', 'timelapse_sky', 'lazy_susan'
        ],

        commonShots: [
            { type: 'establishing', camera: 'fpv_drone', lighting: 'stylized', description: 'Dynamic intro establishing mood' },
            { type: 'action', camera: 'gimbal', lighting: 'neon', description: 'Performance with dynamic movement' },
            { type: 'climax', camera: 'orbit_360', lighting: 'dramatic', description: 'Chorus moment with full rotation' },
            { type: 'transition', camera: 'whip_pan', description: 'Beat-synced transitions' },
            { type: 'intimate', camera: 'dolly_in', lighting: 'expressive', description: 'Verse close-up' },
            { type: 'reveal', camera: 'through_object', lighting: 'creative', description: 'Creative reveal through elements' }
        ],

        styleNotes: [
            'Sync camera movement to beat and rhythm',
            'Bold choices - music videos can be experimental',
            'Color grading should match song mood',
            'Cut on the beat for energy',
            'Performance is key - showcase the artist'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // COMMERCIAL
    // ═══════════════════════════════════════════════════════════════════════
    commercial: {
        id: 'commercial',
        name: 'Commercial',
        description: 'Polished, product-focused visuals with aspirational aesthetics',
        icon: '📺',

        defaultStyle: 'polished, clean, high production value, aspirational',
        colorPalette: ['brand colors', 'clean whites', 'aspirational palette'],
        defaultLighting: 'high key, product lighting, flattering',

        cameraPreferences: [
            'orbit_360', 'lazy_susan', 'glam', 'crane_up', 'dolly_in',
            'gimbal', 'jib_up', 'hyperlapse', 'super_dolly_in'
        ],
        avoidMoves: [
            'handheld', 'shaky_intense', 'dutch_angle', 'snorricam',
            'low_shutter', 'worms_eye'
        ],

        commonShots: [
            { type: 'establishing', camera: 'crane_up', lighting: 'aspirational', description: 'Lifestyle establishing shot' },
            { type: 'reveal', camera: 'orbit_360', lighting: 'product', description: 'Product hero rotation' },
            { type: 'action', camera: 'gimbal', lighting: 'bright', description: 'Product in use' },
            { type: 'intimate', camera: 'glam', lighting: 'flattering', description: 'Talent/model close-up' },
            { type: 'transition', camera: 'hyperlapse', description: 'Time passage or lifestyle' },
            { type: 'climax', camera: 'super_dolly_in', lighting: 'hero', description: 'Final product shot' }
        ],

        styleNotes: [
            'Product should always look its best',
            'High production value is expected',
            'Brand colors should be consistent',
            'Aspirational lifestyle imagery',
            'Clean, precise camera movement'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // WESTERN
    // ═══════════════════════════════════════════════════════════════════════
    western: {
        id: 'western',
        name: 'Western',
        description: 'Epic frontier landscapes with classic western iconography',
        icon: '🤠',

        defaultStyle: 'dusty, warm earth tones, wide vistas, golden hour',
        colorPalette: ['dust brown', 'sunset orange', 'desert gold', 'sky blue'],
        defaultLighting: 'harsh sun, golden hour, practical fire/lamp',

        cameraPreferences: [
            'super_dolly_out', 'crane_up', 'static', 'pan_left', 'pan_right',
            'timelapse_sky', 'hero_shot', 'dolly_in', 'overhead'
        ],
        avoidMoves: [
            'fpv_drone', 'through_object', 'bullet_time', 'orbit_360',
            'fisheye', 'dutch_angle', 'snorricam'
        ],

        commonShots: [
            { type: 'establishing', camera: 'super_dolly_out', angle: 'wide', lighting: 'golden', description: 'Epic landscape reveal' },
            { type: 'hero_moment', camera: 'hero_shot', lighting: 'harsh_sun', description: 'Cowboy silhouette' },
            { type: 'action', camera: 'static', angle: 'wide', lighting: 'natural', description: 'Showdown framing' },
            { type: 'dialogue', camera: 'dolly_in', lighting: 'natural', description: 'Tension building on faces' },
            { type: 'transition', camera: 'timelapse_sky', description: 'Desert sky passage of time' },
            { type: 'climax', camera: 'static', angle: 'extreme_wide', description: 'Classic wide duel shot' }
        ],

        styleNotes: [
            'Wide shots establish the frontier',
            'Dust, sun flares add authenticity',
            'Classic western music cues enhance mood',
            'Static wide shots for showdowns',
            'Golden hour is the western\'s best friend'
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // FANTASY
    // ═══════════════════════════════════════════════════════════════════════
    fantasy: {
        id: 'fantasy',
        name: 'Fantasy',
        description: 'Magical, otherworldly visuals with epic scope',
        icon: '🧙',

        defaultStyle: 'magical lighting, rich colors, epic scope, ethereal',
        colorPalette: ['deep purple', 'gold', 'forest green', 'mystical blue'],
        defaultLighting: 'magical, volumetric, ethereal, dramatic',

        cameraPreferences: [
            'crane_up', 'crane_down', 'orbit_360', 'dolly_in', 'super_dolly_out',
            'fpv_drone', 'bullet_time', '3d_rotation', 'hero_shot', 'worms_eye'
        ],
        avoidMoves: [
            'handheld', 'shaky_intense', 'whip_pan', 'fisheye',
            'timelapse_city', 'car_chase'
        ],

        commonShots: [
            { type: 'establishing', camera: 'crane_up', angle: 'epic_wide', lighting: 'magical', description: 'Rise to reveal fantasy kingdom' },
            { type: 'reveal', camera: 'super_dolly_out', lighting: 'ethereal', description: 'Epic reveal of magical location' },
            { type: 'action', camera: 'bullet_time', lighting: 'dramatic', description: 'Magic battle frozen moment' },
            { type: 'hero_moment', camera: 'hero_shot', lighting: 'heroic', description: 'Hero framing with epic backdrop' },
            { type: 'intimate', camera: 'dolly_in', lighting: 'soft_magical', description: 'Character moment with wonder' },
            { type: 'climax', camera: 'orbit_360', lighting: 'dramatic', description: 'Climactic magical moment' }
        ],

        styleNotes: [
            'Volumetric lighting (fog, mist, rays) adds magic',
            'Epic scale requires wide establishing shots',
            'Rich, saturated colors for otherworldly feel',
            'Practical effects enhanced with VFX',
            'Camera movement should feel grand, not frantic'
        ]
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a genre template by ID
 */
export function getGenreTemplate(genreId: Genre): GenreTemplate {
    return GENRE_TEMPLATES[genreId];
}

/**
 * Get all genre IDs
 */
export function getAllGenreIds(): Genre[] {
    return Object.keys(GENRE_TEMPLATES) as Genre[];
}

/**
 * Get recommended camera presets for a genre
 */
export function getRecommendedCameraPresets(genreId: Genre): string[] {
    return GENRE_TEMPLATES[genreId]?.cameraPreferences || [];
}

/**
 * Get avoided camera presets for a genre
 */
export function getAvoidedCameraPresets(genreId: Genre): string[] {
    return GENRE_TEMPLATES[genreId]?.avoidMoves || [];
}

/**
 * Check if a camera preset is recommended for a genre
 */
export function isCameraPresetRecommended(presetId: string, genreId: Genre): boolean {
    return getRecommendedCameraPresets(genreId).includes(presetId);
}

/**
 * Check if a camera preset should be avoided for a genre
 */
export function isCameraPresetAvoided(presetId: string, genreId: Genre): boolean {
    return getAvoidedCameraPresets(genreId).includes(presetId);
}

/**
 * Get the common shot for a specific beat type
 */
export function getShotForBeat(genreId: Genre, beatType: ShotType['type']): ShotType | undefined {
    return GENRE_TEMPLATES[genreId]?.commonShots.find(shot => shot.type === beatType);
}

/**
 * Get all genres as display options
 */
export function getGenreOptions(): Array<{ value: Genre; label: string; icon: string }> {
    return getAllGenreIds().map(id => ({
        value: id,
        label: GENRE_TEMPLATES[id].name,
        icon: GENRE_TEMPLATES[id].icon
    }));
}

import { Genre } from './CameraPresets';
export type { Genre };
export interface ShotType {
  id: string;
  type: string;
  label: string;
}

export interface GenreTemplate {
  id: Genre;
  name: string;
  icon: string;
  description: string;
  type: 'narrative' | 'content'; // Distinguishes Cinema vs Social/Creator workflows
  restricted?: boolean; // When true, requires mature toggle to be visible
  recommendedTags: string[]; // tag IDs
  avoidedTags: string[]; // tag IDs
  defaultStyle: string; // additional prompt keywords
  // UI Display Properties
  colorPalette: string[]; // Hex codes or color names
  cameraPreferences: string[]; // Preset names or IDs
  styleNotes: string[]; // Bullet points for the UI
}

export const GENRE_TEMPLATES: Record<Genre, GenreTemplate> = {
  film_noir: {
    id: 'film_noir',
    name: 'Film Noir',
    icon: '🕵️‍♀️',
    description: 'Shadowy, crime-drama aesthetic with high contrast and moral ambiguity.',
    type: 'narrative',
    recommendedTags: [
      'chiaroscuro',
      'low_key',
      'silhouette',
      'venetian_blinds',
      'hard_light',
      'dutch_angle',
      'static',
      'dolly_in',
      'low_angle',
      'dolly_zoom_in',
      'black_white',
      'high_contrast_bw',
      'kodak_double_x',
      'cool_steel',
      'ominous',
      'mysterious',
      'tense',
      'melancholic',
    ],
    avoidedTags: ['high_key', 'pastel_dream', 'pop_colors', 'romantic', 'handheld_shake'],
    defaultStyle: 'dramatic shadows, film noir style, high contrast, moral ambiguity',
    colorPalette: ['#000000', '#FFFFFF', '#333333', '#1a1a1a'],
    cameraPreferences: ['Dutch Angle', 'Static', 'Dolly In', 'Low Angle'],
    styleNotes: ['Use high contrast lighting', 'Create moral ambiguity', 'Focus on shadows'],
  },
  action: {
    id: 'action',
    name: 'Action',
    icon: '💥',
    description: 'High energy, fast-paced movement and dynamic angles.',
    type: 'narrative',
    recommendedTags: [
      'crash_zoom_in',
      'crash_zoom_out',
      'whip_pan',
      'shaky_intense',
      'bullet_time',
      'fpv_drone',
      'car_chase',
      'road_rush',
      'hero_cam',
      'tracking_shot',
      'teal_orange',
      'blockbuster_grade',
      'high_contrast',
      'lens_flare',
      'energetic',
      'intense',
      'chaotic',
      'epic',
      'aggressive',
    ],
    avoidedTags: ['static', 'slow_motion', 'pastel_dream', 'soft_focus', 'romantic'],
    defaultStyle: 'dynamic action, motion blur, kinetic energy, blockbuster look',
    colorPalette: ['#FF5722', '#00BCD4', '#212121', '#FFC107'],
    cameraPreferences: ['Crash Zoom', 'Whip Pan', 'Tracking Shot', 'FPV Drone'],
    styleNotes: ['Keep camera moving', 'Use dynamic angles', 'High contrast grading'],
  },
  horror: {
    id: 'horror',
    name: 'Horror',
    icon: '👻',
    description: 'Unsettling atmosphere, tension, and dread.',
    type: 'narrative',
    recommendedTags: [
      'snorricam',
      'dolly_zoom_out',
      'handheld_shake',
      'dutch_angle',
      'worms_eye',
      'creeping_zoom',
      'underlighting',
      'silhouette',
      'low_key',
      'flickering_light',
      'moonlight',
      'cool_steel',
      'desaturated_gritty',
      'bleach_bypass',
      'ominous',
      'tense',
      'eerie',
      'haunting',
      'nightmare',
    ],
    avoidedTags: ['high_key', 'warm_golden', 'romantic', 'heroic', 'upbeat'],
    defaultStyle: 'terrifying atmosphere, ominous lighting, sense of dread',
    colorPalette: ['#000000', '#1A237E', '#B71C1C', '#424242'],
    cameraPreferences: ['Snorricam', 'Dolly Zoom', 'Handheld Shake', 'Dutch Angle'],
    styleNotes: ['Hide the monster', 'Use unsettling angles', 'Low key lighting'],
  },
  romance: {
    id: 'romance',
    name: 'Romance',
    icon: '💘',
    description: 'Intimate, warm, and emotionally connected.',
    type: 'narrative',
    recommendedTags: [
      'arc_left',
      'arc_right',
      'dolly_in',
      'glam',
      'close_up',
      'eyes_in',
      'lazy_susan',
      'golden_hour',
      'soft_light',
      'candlelight',
      'rim_light',
      'bokeh',
      'warm_golden',
      'pastel_dream',
      'kodak_portra_400',
      'soft_focus',
      'romantic',
      'intimate',
      'peaceful',
      'dreamy',
      'hopeful',
    ],
    avoidedTags: [
      'dutch_angle',
      'shaky_intense',
      'high_contrast_bw',
      'cyberpunk_neon',
      'aggressive',
    ],
    defaultStyle: 'romantic atmosphere, soft lighting, emotional connection, dreamy look',
    colorPalette: ['#FFCDD2', '#F8BBD0', '#FFF9C4', '#E1BEE7'],
    cameraPreferences: ['Close Up', 'Arc Shot', 'Soft Focus', 'Dolly In'],
    styleNotes: ['Soft lighting is key', 'Focus on emotions', 'Warm color palette'],
  },
  documentary: {
    id: 'documentary',
    name: 'Documentary',
    icon: '📹',
    description: 'Realistic, observational, and authentic.',
    type: 'narrative',
    recommendedTags: [
      'handheld',
      'shoulder_rig',
      'zoom_in',
      'pan_left',
      'pan_right',
      'rack_focus',
      'natural_light',
      'window_light',
      'practical_lights',
      'natural_grade',
      'documentary_natural',
      '16mm_film',
      'contemplative',
      'serious',
      'observational',
      'authentic',
    ],
    avoidedTags: ['glam', 'bullet_time', 'cyberpunk_neon', 'fantasy', 'surreal'],
    defaultStyle: 'documentary style, realism, natural lighting, handheld camera, natural look',
    colorPalette: ['#8D6E63', '#A1887F', '#BCAAA4', '#EFEBE9'],
    cameraPreferences: ['Handheld', 'Zoom In', 'Rack Focus', 'Shoulder Rig'],
    styleNotes: ['Keep it real', 'Use available light', 'Observational camera'],
  },
  sci_fi: {
    id: 'sci_fi',
    name: 'Sci-Fi',
    icon: '🛸',
    description: 'Futuristic, technological, and otherworldly.',
    type: 'narrative',
    recommendedTags: [
      'through_object',
      'fpv_drone',
      'orbital',
      '3d_rotation',
      'crane_over',
      'neon_lighting',
      'volumetric_fog',
      'laser',
      'screen_glow',
      'cold_light',
      'cyberpunk_neon',
      'teal_orange',
      'infrared_false',
      'mysterious',
      'ethereal',
      'surreal',
      'epic',
    ],
    avoidedTags: ['vintage', 'sepia', 'candlelight', 'rustic', 'handheld_shake'],
    defaultStyle: 'futuristic aesthetic, high tech, sci-fi atmosphere, clean lines',
    colorPalette: ['#00E676', '#2979FF', '#651FFF', '#212121'],
    cameraPreferences: ['Orbital', 'Crane Shot', 'Drone FPV', 'Smooth Dolly'],
    styleNotes: ['Neon lighting', 'Reflective surfaces', 'High tech feel'],
  },
  comedy: {
    id: 'comedy',
    name: 'Comedy',
    icon: '😂',
    description: 'Bright, clear, and timed for humor.',
    type: 'narrative',
    recommendedTags: [
      'static',
      'whip_pan',
      'crash_zoom',
      'high_key',
      'pop_colors',
      'wide_angle',
      'fisheye',
    ],
    avoidedTags: ['low_key', 'noir', 'melancholic', 'ominous', 'blur'],
    defaultStyle: 'bright lighting, clear composition, vibrant colors',
    colorPalette: ['#FFEB3B', '#FF4081', '#00B0FF', '#FFFFFF'],
    cameraPreferences: ['Static', 'Two Shot', 'Whip Pan', 'Wide Angle'],
    styleNotes: ['Bright and even lighting', 'Clear framing', 'Vibrant colors'],
  },
  thriller: {
    id: 'thriller',
    name: 'Thriller',
    icon: '🔪',
    description: 'Suspenseful, gripping, and high stakes.',
    type: 'narrative',
    recommendedTags: [
      'tracking_shot',
      'over_shoulder',
      'dolly_in',
      'tight_framing',
      'low_key',
      'cool_tones',
    ],
    avoidedTags: ['static', 'bright', 'cheerful', 'pastels'],
    defaultStyle: 'suspenseful atmosphere, high tension, cinematic thriller',
    colorPalette: ['#263238', '#37474F', '#455A64', '#546E7A'],
    cameraPreferences: ['Tracking Shot', 'Tight Framing', 'Over Shoulder'],
    styleNotes: ['Build tension', 'Use negative space', 'Cold tones'],
  },
  drama: {
    id: 'drama',
    name: 'Drama',
    icon: '🎭',
    description: 'Character-driven, emotional, and grounded.',
    type: 'narrative',
    recommendedTags: ['dolly_in', 'slow_zoom', 'medium_shot', 'rembrandt_lighting', 'cinematic'],
    avoidedTags: ['whip_pan', 'fisheye', 'distorted', 'hyperactive'],
    defaultStyle: 'dramatic lighting, emotional depth, cinematic drama',
    colorPalette: ['#3E2723', '#4E342E', '#5D4037', '#6D4C41'],
    cameraPreferences: ['Slow Dolly', 'Medium Shot', 'Close Up'],
    styleNotes: ['Focus on performance', 'Naturalistic lighting', 'Character depth'],
  },
  western: {
    id: 'western',
    name: 'Western',
    icon: '🤠',
    description: 'Epic landscapes, grit, and isolation.',
    type: 'narrative',
    recommendedTags: [
      'wide_shot',
      'extreme_close_up_eyes',
      'crane_up',
      'golden_hour',
      'dusty',
      'warm_tones',
    ],
    avoidedTags: ['neon', 'cyberpunk', 'cold_steel', 'smooth'],
    defaultStyle: 'western aesthetic, dusty atmosphere, epic landscape, warm tones',
    colorPalette: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300'],
    cameraPreferences: ['Wide Shot', 'Crane Up', 'Extreme Close Up'],
    styleNotes: ['Epic landscapes', 'Warm lighting', 'Gritty texture'],
  },
  fantasy: {
    id: 'fantasy',
    name: 'Fantasy',
    icon: '🏰',
    description: 'Magical, epic, and imaginative world-building.',
    type: 'narrative',
    recommendedTags: [
      'crane_over',
      'sweeping_shot',
      'ethereal_lighting',
      'magical_glow',
      'vibrant',
    ],
    avoidedTags: ['gritty', 'documentary', 'cctv', 'mundane'],
    defaultStyle: 'fantasy world, magical atmosphere, epic scale, enchanting',
    colorPalette: ['#7B1FA2', '#9C27B0', '#AB47BC', '#BA68C8'],
    cameraPreferences: ['Sweeping Shot', 'Crane Over', 'Aerial'],
    styleNotes: ['Magical atmosphere', 'Epic scale', 'Ethereal lighting'],
  },
  music_video: {
    id: 'music_video',
    name: 'Music Video',
    icon: '🎵',
    description: 'Stylized, rhythmic, and visually striking.',
    type: 'narrative',
    recommendedTags: ['performance_shot', 'glam', 'fisheye', 'rapid_cuts', 'strobing', 'stylized'],
    avoidedTags: ['static', 'boring', 'flat'],
    defaultStyle: 'music video aesthetic, stylized lighting, dynamic composition',
    colorPalette: ['#D500F9', '#AA00FF', '#6200EA', '#304FFE'],
    cameraPreferences: ['Fisheye', 'Rapid Cuts', 'Gimbal'],
    styleNotes: ['Sync with rhythm', 'Stylized lighting', 'Bold visuals'],
  },
  commercial: {
    id: 'commercial',
    name: 'Commercial',
    icon: '💼',
    description: 'Polished, clean, and product-focused.',
    type: 'narrative',
    recommendedTags: ['hero_shot', 'beauty_lighting', 'clean_background', 'high_key', 'crisp'],
    avoidedTags: ['grainy', 'dark', 'messy', 'lo-fi'],
    defaultStyle: 'commercial luxury, high end, polished, clean look',
    colorPalette: ['#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0'],
    cameraPreferences: ['Hero Shot', 'Product Shot', 'Macro'],
    styleNotes: ['Clean background', 'Perfect lighting', 'High key'],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // MATURE CONTENT - Only visible when allowNSFW is enabled
  // ═══════════════════════════════════════════════════════════════════════════
  adult: {
    id: 'adult',
    name: 'Adult / Boudoir',
    icon: '🔞',
    description: 'Intimate, sensual content for mature audiences. Glamour and boudoir aesthetics.',
    type: 'narrative',
    restricted: true,
    recommendedTags: [
      'glam',
      'beauty_lighting',
      'soft_focus',
      'bokeh',
      'rim_light',
      'dolly_in',
      'arc_left',
      'arc_right',
      'close_up',
      'eyes_in',
      'warm_golden',
      'pastel_dream',
      'low_key',
      'candlelight',
      'intimate',
      'sensual',
      'romantic',
      'dreamy',
      'seductive',
    ],
    avoidedTags: ['dutch_angle', 'shaky_intense', 'horror', 'aggressive', 'documentary'],
    defaultStyle:
      'intimate boudoir, sensual lighting, glamour photography, soft focus, romantic atmosphere',
    colorPalette: ['#FF4081', '#E91E63', '#F8BBD0', '#880E4F', '#4A148C'],
    cameraPreferences: ['Close Up', 'Arc Shot', 'Soft Focus', 'Beauty Shot', 'Dolly In'],
    styleNotes: [
      'Soft, flattering lighting is essential',
      'Use shallow depth of field for intimacy',
      'Warm color palette creates sensuality',
      'Slow camera movements enhance mood',
      'Focus on expressions and body language',
    ],
  },
  hardcore: {
    id: 'hardcore',
    name: 'XXX / Hardcore',
    icon: '🔥',
    description:
      'Explicit XXX adult content. Graphic sexual acts with professional pornographic production values.',
    type: 'narrative',
    restricted: true,
    recommendedTags: [
      'extreme_close_up',
      'pov',
      'gonzo',
      'handheld',
      'tracking_shot',
      'low_angle',
      'high_angle',
      'reverse_angle',
      'two_shot',
      'three_shot',
      'high_key',
      'ring_light',
      'practical_lights',
      'overhead',
      'explicit',
      'graphic',
      'raw',
      'intense',
      'primal',
      'uninhibited',
    ],
    avoidedTags: ['horror', 'dutch_angle', 'desaturated', 'cold_steel', 'noir', 'soft_focus'],
    defaultStyle:
      'XXX pornographic film, explicit graphic content, clear genital visibility, money shot coverage, professional adult production',
    colorPalette: ['#FF1744', '#D50000', '#FF6D00', '#000000', '#FFFFFF'],
    cameraPreferences: [
      'POV',
      'Extreme Close Up',
      'Gonzo',
      'Reverse Cowgirl Angle',
      'Missionary Angle',
      'Doggy Angle',
    ],
    styleNotes: [
      'Crystal clear footage of all action',
      'Graphic close-ups of penetration and genitals',
      'Money shot / cumshot coverage is essential',
      'Multiple angles for position changes',
      'POV for immersive first-person experience',
      'Well-lit to show all explicit details',
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT CREATOR - Social/YouTube workflows with algorithmic pacing
  // ═══════════════════════════════════════════════════════════════════════════
  youtuber: {
    id: 'youtuber',
    name: 'YouTuber / Creator',
    icon: '📹',
    description: 'Content creator workflows: vlogs, tech reviews, tutorials, shorts. Optimized for retention and algorithms.',
    type: 'content',
    recommendedTags: [
      'handheld',
      'whip_pan',
      'crash_zoom_in',
      'static',
      'rack_focus',
      'gimbal',
      'fisheye',
      'high_key',
      'ring_light',
      'natural_light',
      'energetic',
      'upbeat',
      'authentic',
    ],
    avoidedTags: ['low_key', 'noir', 'horror', 'slow_motion', 'melancholic'],
    defaultStyle: 'YouTube creator style, high energy, direct address, jump cuts, retention-focused editing',
    colorPalette: ['#FF0000', '#FFFFFF', '#282828', '#00C853'],
    cameraPreferences: ['Handheld', 'Static', 'Whip Pan', 'Crash Zoom'],
    styleNotes: [
      'Hook in the first 5 seconds',
      'Visual change every 3-5 seconds for retention',
      'Direct eye contact with camera',
      'Use [A-ROLL] for talking, [B-ROLL] for cutaways',
      'Jump cuts are encouraged for pacing',
    ],
  },
  onlyfans: {
    id: 'onlyfans',
    name: 'OnlyFans / Exclusive',
    icon: '🔒',
    description: 'Exclusive creator content for subscription platforms. Intimate, personal connection with audience.',
    type: 'content',
    restricted: true,
    recommendedTags: [
      'glam',
      'beauty_lighting',
      'soft_focus',
      'bokeh',
      'rim_light',
      'close_up',
      'eyes_in',
      'handheld',
      'pov',
      'ring_light',
      'warm_golden',
      'pastel_dream',
      'intimate',
      'sensual',
      'seductive',
    ],
    avoidedTags: ['documentary', 'horror', 'aggressive', 'cold_steel', 'dutch_angle'],
    defaultStyle: 'intimate creator content, personal connection, teaser aesthetic, subscription-worthy quality',
    colorPalette: ['#FF4081', '#E91E63', '#F8BBD0', '#880E4F'],
    cameraPreferences: ['POV', 'Close Up', 'Arc Shot', 'Glam Shot'],
    styleNotes: [
      'Personal, intimate framing',
      'Direct address and eye contact',
      'Soft, flattering lighting always',
      'Tease and reveal pacing',
      'Premium production values',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recommended camera preset IDs for a genre
 */
export function getRecommendedCameraPresets(genre: Genre): string[] {
  return GENRE_TEMPLATES[genre].recommendedTags;
}

/**
 * Get avoided camera preset IDs for a genre
 */
export function getAvoidedCameraPresets(genre: Genre): string[] {
  return GENRE_TEMPLATES[genre].avoidedTags;
}

/**
 * Check if a specific preset is recommended for a genre
 */
export function isCameraPresetRecommended(presetId: string, genre: Genre): boolean {
  return GENRE_TEMPLATES[genre].recommendedTags.includes(presetId);
}

/**
 * Check if a specific preset is avoided for a genre
 */
export function isCameraPresetAvoided(presetId: string, genre: Genre): boolean {
  return GENRE_TEMPLATES[genre].avoidedTags.includes(presetId);
}

// Genres that require mature content flag to be visible
export const MATURE_GENRES: Genre[] = ['adult', 'hardcore', 'onlyfans'];

// Genres that are content creator (not narrative/cinema)
export const CONTENT_GENRES: Genre[] = ['youtuber', 'onlyfans'];

/**
 * Get genre options for dropdowns
 * @param includeMature - When true, includes adult/NSFW genres. Default: false
 * @param typeFilter - Optional filter by genre type ('narrative' | 'content')
 */
export function getGenreOptions(
  includeMature: boolean = false,
  typeFilter?: 'narrative' | 'content'
): { value: Genre; label: string; icon: string; type: 'narrative' | 'content' }[] {
  return Object.values(GENRE_TEMPLATES)
    .filter(template => {
      // Filter by mature content flag
      if (!includeMature && template.restricted) return false;
      // Filter by type if specified
      if (typeFilter && template.type !== typeFilter) return false;
      return true;
    })
    .map(template => ({
      value: template.id,
      label: template.name,
      icon: template.icon,
      type: template.type,
    }));
}

/**
 * Get genre template by ID
 */
export function getGenreTemplate(genre: Genre): GenreTemplate {
  return GENRE_TEMPLATES[genre];
}

/**
 * Check if a genre is a content creator type (vs narrative/cinema)
 */
export function isContentGenre(genre: Genre): boolean {
  return GENRE_TEMPLATES[genre]?.type === 'content';
}

/**
 * Check if a genre requires mature content toggle
 */
export function isRestrictedGenre(genre: Genre): boolean {
  return GENRE_TEMPLATES[genre]?.restricted === true;
}

/**
 * Get grouped genre options for dropdown with optgroups
 */
export function getGroupedGenreOptions(includeMature: boolean = false): {
  narrative: { value: Genre; label: string; icon: string }[];
  content: { value: Genre; label: string; icon: string }[];
} {
  const options = getGenreOptions(includeMature);
  return {
    narrative: options.filter(opt => opt.type === 'narrative'),
    content: options.filter(opt => opt.type === 'content'),
  };
}

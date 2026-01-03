/**
 * CameraDatabase.ts
 *
 * Professional camera and lens database for the VibeBoard Optics Engine.
 * Based on real-world specifications from professional cinema cameras and lenses.
 *
 * Data sources:
 * - Manufacturer spec sheets (ARRI, RED, Sony, Canon, Blackmagic)
 * - Cadrage app reference data
 * - Wikipedia camera sensor specifications
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SensorSpec {
  width_mm: number; // Sensor width in mm
  height_mm: number; // Sensor height in mm
  diagonal_mm: number; // Sensor diagonal in mm
  crop_factor_ff: number; // Crop factor relative to Full Frame (36x24mm)
  coc_mm: number; // Circle of Confusion for DOF calculations
}

export interface CameraSpec {
  id: string;
  brand: string;
  model: string;
  category: 'cinema' | 'mirrorless' | 'dslr' | 'phone' | 'action' | 'medium_format';
  sensor_spec: SensorSpec;
  resolution: string; // e.g., '4K', '6K', '8K'
  base_iso: number; // Native ISO for cleanest image
  log_color_space: string; // Color science profile
  prompt_keywords: string[]; // Keywords for AI prompt injection
  aspect_ratios: string[]; // Supported native aspect ratios
}

export interface LensSpec {
  id: string;
  brand: string;
  model: string;
  family: string; // Lens family/series
  focal_length_mm: number; // Fixed focal length
  min_t_stop: number; // Maximum aperture (T-stop for cinema, f-stop for photo)
  max_t_stop: number; // Minimum aperture
  is_anamorphic: boolean;
  squeeze_factor?: number; // For anamorphic: 1.33x, 1.5x, 2x
  prompt_keywords: string[]; // Keywords for lens character
  flare_color?: string; // Flare characteristic (for anamorphic)
}

export interface LensFamily {
  id: string;
  brand: string;
  name: string;
  type: 'prime' | 'zoom' | 'anamorphic' | 'vintage' | 'specialty';
  focal_lengths: number[]; // Available focal lengths
  min_t_stop: number;
  is_anamorphic: boolean;
  squeeze_factor?: number;
  prompt_keywords: string[];
  flare_color?: string;
}

// =============================================================================
// SENSOR SPECIFICATIONS
// =============================================================================

const FULL_FRAME_SENSOR: SensorSpec = {
  width_mm: 36,
  height_mm: 24,
  diagonal_mm: 43.27,
  crop_factor_ff: 1.0,
  coc_mm: 0.029,
};

const SUPER_35_SENSOR: SensorSpec = {
  width_mm: 24.89,
  height_mm: 18.66,
  diagonal_mm: 31.11,
  crop_factor_ff: 1.39,
  coc_mm: 0.021,
};

const ARRI_ALEXA_35_SENSOR: SensorSpec = {
  width_mm: 27.99,
  height_mm: 19.22,
  diagonal_mm: 33.96,
  crop_factor_ff: 1.27,
  coc_mm: 0.023,
};

const ARRI_LF_SENSOR: SensorSpec = {
  width_mm: 36.7,
  height_mm: 25.54,
  diagonal_mm: 44.71,
  crop_factor_ff: 0.97,
  coc_mm: 0.03,
};

const RED_VV_SENSOR: SensorSpec = {
  width_mm: 40.96,
  height_mm: 21.6,
  diagonal_mm: 46.31,
  crop_factor_ff: 0.93,
  coc_mm: 0.031,
};

const RED_S35_SENSOR: SensorSpec = {
  width_mm: 27.03,
  height_mm: 14.26,
  diagonal_mm: 30.56,
  crop_factor_ff: 1.42,
  coc_mm: 0.02,
};

const APS_C_SENSOR: SensorSpec = {
  width_mm: 23.5,
  height_mm: 15.6,
  diagonal_mm: 28.2,
  crop_factor_ff: 1.53,
  coc_mm: 0.019,
};

const MFT_SENSOR: SensorSpec = {
  width_mm: 17.3,
  height_mm: 13.0,
  diagonal_mm: 21.64,
  crop_factor_ff: 2.0,
  coc_mm: 0.015,
};

const IPHONE_SENSOR: SensorSpec = {
  width_mm: 9.8,
  height_mm: 7.3,
  diagonal_mm: 12.2,
  crop_factor_ff: 3.55,
  coc_mm: 0.008,
};

const MEDIUM_FORMAT_SENSOR: SensorSpec = {
  width_mm: 43.8,
  height_mm: 32.9,
  diagonal_mm: 54.78,
  crop_factor_ff: 0.79,
  coc_mm: 0.036,
};

// =============================================================================
// CAMERA DATABASE
// =============================================================================

export const CAMERA_DATABASE: CameraSpec[] = [
  // =========================================================================
  // ARRI CAMERAS
  // =========================================================================
  {
    id: 'arri_alexa_35',
    brand: 'ARRI',
    model: 'ALEXA 35',
    category: 'cinema',
    sensor_spec: ARRI_ALEXA_35_SENSOR,
    resolution: '4.6K',
    base_iso: 800,
    log_color_space: 'ARRI LogC4',
    prompt_keywords: [
      'high dynamic range',
      'natural skin tones',
      'cinematic grade',
      'clean shadows',
      'organic film texture',
      'rich highlight rolloff',
    ],
    aspect_ratios: ['4:3', '16:9', '2.39:1', '1.85:1'],
  },
  {
    id: 'arri_alexa_mini_lf',
    brand: 'ARRI',
    model: 'ALEXA Mini LF',
    category: 'cinema',
    sensor_spec: ARRI_LF_SENSOR,
    resolution: '4.5K',
    base_iso: 800,
    log_color_space: 'ARRI LogC3',
    prompt_keywords: [
      'full frame cinematic',
      'shallow depth of field',
      'natural colors',
      'premium film look',
      'organic grain structure',
      'pristine image quality',
    ],
    aspect_ratios: ['16:9', '2.39:1', '1.85:1', 'Open Gate'],
  },
  {
    id: 'arri_amira',
    brand: 'ARRI',
    model: 'AMIRA',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '4K',
    base_iso: 800,
    log_color_space: 'ARRI LogC3',
    prompt_keywords: [
      'documentary style',
      'run and gun',
      'natural rendering',
      'broadcast quality',
      'true-to-life colors',
    ],
    aspect_ratios: ['16:9', '4:3'],
  },

  // =========================================================================
  // RED CAMERAS
  // =========================================================================
  {
    id: 'red_v_raptor_xl',
    brand: 'RED',
    model: 'V-RAPTOR XL 8K VV',
    category: 'cinema',
    sensor_spec: RED_VV_SENSOR,
    resolution: '8K',
    base_iso: 800,
    log_color_space: 'REDWideGamutRGB',
    prompt_keywords: [
      'ultra high resolution',
      'extreme detail',
      'modern digital cinema',
      'sharp rendering',
      'high contrast',
      'bold colors',
    ],
    aspect_ratios: ['17:9', '16:9', '2.4:1', '2:1'],
  },
  {
    id: 'red_komodo',
    brand: 'RED',
    model: 'KOMODO 6K',
    category: 'cinema',
    sensor_spec: RED_S35_SENSOR,
    resolution: '6K',
    base_iso: 800,
    log_color_space: 'REDWideGamutRGB',
    prompt_keywords: [
      'compact cinema',
      'high frame rate',
      'sharp digital',
      'modern blockbuster look',
      'punchy colors',
    ],
    aspect_ratios: ['17:9', '16:9', '2.4:1'],
  },
  {
    id: 'red_gemini',
    brand: 'RED',
    model: 'DSMC2 GEMINI 5K S35',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '5K',
    base_iso: 3200,
    log_color_space: 'REDWideGamutRGB',
    prompt_keywords: [
      'low light champion',
      'clean high ISO',
      'night shooting',
      'dual ISO performance',
      'cinematic low light',
    ],
    aspect_ratios: ['16:9', '2.4:1'],
  },

  // =========================================================================
  // SONY CAMERAS
  // =========================================================================
  {
    id: 'sony_venice_2',
    brand: 'Sony',
    model: 'VENICE 2',
    category: 'cinema',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '8.6K',
    base_iso: 800,
    log_color_space: 'S-Log3/S-Gamut3.Cine',
    prompt_keywords: [
      'full frame cinema',
      'dual base ISO',
      'highlight rolloff',
      'premium production',
      'Netflix approved',
      'rich color science',
    ],
    aspect_ratios: ['17:9', '16:9', '2.39:1', '1.85:1'],
  },
  {
    id: 'sony_fx6',
    brand: 'Sony',
    model: 'FX6',
    category: 'cinema',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '4K',
    base_iso: 800,
    log_color_space: 'S-Log3',
    prompt_keywords: [
      'run and gun cinema',
      'documentary filmmaker',
      'versatile',
      'compact full frame',
      'professional broadcast',
    ],
    aspect_ratios: ['16:9', '17:9'],
  },
  {
    id: 'sony_a7s_iii',
    brand: 'Sony',
    model: 'A7S III',
    category: 'mirrorless',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '4K',
    base_iso: 640,
    log_color_space: 'S-Log3',
    prompt_keywords: [
      'low light king',
      'mirrorless cinema',
      'clean high ISO',
      'compact full frame',
      'content creator',
    ],
    aspect_ratios: ['16:9', '4:3', '3:2'],
  },
  {
    id: 'sony_fx3',
    brand: 'Sony',
    model: 'FX3',
    category: 'cinema',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '4K',
    base_iso: 800,
    log_color_space: 'S-Log3',
    prompt_keywords: [
      'cinematic mirrorless',
      'compact cinema',
      'gimbal friendly',
      'indie filmmaker',
      'content creation',
    ],
    aspect_ratios: ['16:9', '17:9'],
  },

  // =========================================================================
  // CANON CAMERAS
  // =========================================================================
  {
    id: 'canon_c500_ii',
    brand: 'Canon',
    model: 'EOS C500 Mark II',
    category: 'cinema',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '5.9K',
    base_iso: 800,
    log_color_space: 'Canon Log 3',
    prompt_keywords: [
      'cinema EOS',
      'modular design',
      'dual pixel AF',
      'Netflix approved',
      'natural skin tones',
    ],
    aspect_ratios: ['17:9', '16:9', '2.39:1'],
  },
  {
    id: 'canon_c70',
    brand: 'Canon',
    model: 'EOS C70',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '4K',
    base_iso: 800,
    log_color_space: 'Canon Log 3',
    prompt_keywords: [
      'RF mount cinema',
      'compact pro',
      'dual pixel AF',
      'documentary style',
      'run and gun',
    ],
    aspect_ratios: ['16:9', '4:3'],
  },
  {
    id: 'canon_r5',
    brand: 'Canon',
    model: 'EOS R5',
    category: 'mirrorless',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '8K',
    base_iso: 100,
    log_color_space: 'Canon Log 3',
    prompt_keywords: [
      'hybrid shooter',
      '8K mirrorless',
      'high resolution',
      'stills and video',
      'professional photography',
    ],
    aspect_ratios: ['16:9', '3:2', '4:3'],
  },

  // =========================================================================
  // BLACKMAGIC CAMERAS
  // =========================================================================
  {
    id: 'bmpcc_6k_pro',
    brand: 'Blackmagic',
    model: 'Pocket Cinema Camera 6K Pro',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '6K',
    base_iso: 400,
    log_color_space: 'Blackmagic Film Gen 5',
    prompt_keywords: [
      'indie cinema',
      'RAW workflow',
      'DaVinci Resolve',
      'affordable cinema',
      'EF mount',
      'organic film look',
    ],
    aspect_ratios: ['16:9', '2.4:1', '4:3'],
  },
  {
    id: 'bmpcc_6k_g2',
    brand: 'Blackmagic',
    model: 'Pocket Cinema Camera 6K G2',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '6K',
    base_iso: 400,
    log_color_space: 'Blackmagic Film Gen 5',
    prompt_keywords: [
      'compact cinema',
      'budget filmmaking',
      'ProRes ready',
      'indie production',
      'film student',
    ],
    aspect_ratios: ['16:9', '2.4:1'],
  },
  {
    id: 'blackmagic_ursa_12k',
    brand: 'Blackmagic',
    model: 'URSA Mini Pro 12K',
    category: 'cinema',
    sensor_spec: SUPER_35_SENSOR,
    resolution: '12K',
    base_iso: 800,
    log_color_space: 'Blackmagic Film Gen 5',
    prompt_keywords: [
      'ultra high resolution',
      'VFX plate',
      'extreme crop',
      'future proof',
      '12K RAW',
    ],
    aspect_ratios: ['17:9', '16:9', '2.4:1'],
  },

  // =========================================================================
  // PANASONIC CAMERAS
  // =========================================================================
  {
    id: 'panasonic_gh6',
    brand: 'Panasonic',
    model: 'LUMIX GH6',
    category: 'mirrorless',
    sensor_spec: MFT_SENSOR,
    resolution: '5.7K',
    base_iso: 800,
    log_color_space: 'V-Log',
    prompt_keywords: [
      'micro four thirds',
      'deep depth of field',
      'compact system',
      'vlogger friendly',
      'stabilized video',
    ],
    aspect_ratios: ['16:9', '4:3', '3:2'],
  },
  {
    id: 'panasonic_s1h',
    brand: 'Panasonic',
    model: 'LUMIX S1H',
    category: 'mirrorless',
    sensor_spec: FULL_FRAME_SENSOR,
    resolution: '6K',
    base_iso: 640,
    log_color_space: 'V-Log',
    prompt_keywords: [
      'full frame mirrorless',
      'Netflix approved',
      'dual native ISO',
      'compact cinema',
      'hybrid shooter',
    ],
    aspect_ratios: ['16:9', '3:2', 'Open Gate'],
  },

  // =========================================================================
  // PHONE CAMERAS
  // =========================================================================
  {
    id: 'iphone_17_pro',
    brand: 'Apple',
    model: 'iPhone 17 Pro',
    category: 'phone',
    sensor_spec: IPHONE_SENSOR,
    resolution: '4K',
    base_iso: 50,
    log_color_space: 'Apple Log',
    prompt_keywords: [
      'smartphone cinema',
      'vertical video',
      'social media',
      'deep depth of field',
      'HDR video',
      'computational photography',
    ],
    aspect_ratios: ['16:9', '9:16', '4:3'],
  },
  {
    id: 'iphone_16_pro',
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    category: 'phone',
    sensor_spec: IPHONE_SENSOR,
    resolution: '4K',
    base_iso: 50,
    log_color_space: 'Apple Log',
    prompt_keywords: [
      'ProRes mobile',
      'cinematic mode',
      'action mode',
      'TikTok style',
      'Instagram reels',
      'mobile filmmaking',
    ],
    aspect_ratios: ['16:9', '9:16', '4:3'],
  },
  {
    id: 'samsung_s25_ultra',
    brand: 'Samsung',
    model: 'Galaxy S25 Ultra',
    category: 'phone',
    sensor_spec: IPHONE_SENSOR,
    resolution: '8K',
    base_iso: 50,
    log_color_space: 'Galaxy Log',
    prompt_keywords: [
      'android flagship',
      '8K mobile',
      'high zoom',
      'social media content',
      'mobile journalism',
    ],
    aspect_ratios: ['16:9', '9:16', '4:3'],
  },

  // =========================================================================
  // MEDIUM FORMAT
  // =========================================================================
  {
    id: 'hasselblad_x2d',
    brand: 'Hasselblad',
    model: 'X2D 100C',
    category: 'medium_format',
    sensor_spec: MEDIUM_FORMAT_SENSOR,
    resolution: '100MP',
    base_iso: 64,
    log_color_space: 'Hasselblad Natural Color',
    prompt_keywords: [
      'medium format',
      'ultra shallow depth of field',
      'fashion photography',
      'extreme detail',
      'billboard quality',
      'editorial',
    ],
    aspect_ratios: ['4:3', '3:2', '1:1', '16:9'],
  },
  {
    id: 'fuji_gfx_100s',
    brand: 'Fujifilm',
    model: 'GFX 100S',
    category: 'medium_format',
    sensor_spec: MEDIUM_FORMAT_SENSOR,
    resolution: '102MP',
    base_iso: 100,
    log_color_space: 'F-Log',
    prompt_keywords: [
      'medium format cinema',
      'commercial photography',
      'fashion',
      'extreme resolution',
      'studio quality',
      'beauty work',
    ],
    aspect_ratios: ['4:3', '3:2', '16:9', '1:1'],
  },

  // =========================================================================
  // ACTION CAMERAS
  // =========================================================================
  {
    id: 'gopro_hero_13',
    brand: 'GoPro',
    model: 'HERO 13 Black',
    category: 'action',
    sensor_spec: {
      width_mm: 6.17,
      height_mm: 4.55,
      diagonal_mm: 7.66,
      crop_factor_ff: 5.65,
      coc_mm: 0.005,
    },
    resolution: '5.3K',
    base_iso: 100,
    log_color_space: 'GP-Log',
    prompt_keywords: [
      'action camera',
      'wide angle POV',
      'extreme sports',
      'fisheye distortion',
      'adventure footage',
      'rugged',
    ],
    aspect_ratios: ['16:9', '4:3', '9:16'],
  },
  {
    id: 'dji_osmo_action_5',
    brand: 'DJI',
    model: 'Osmo Action 5 Pro',
    category: 'action',
    sensor_spec: {
      width_mm: 6.17,
      height_mm: 4.55,
      diagonal_mm: 7.66,
      crop_factor_ff: 5.65,
      coc_mm: 0.005,
    },
    resolution: '4K',
    base_iso: 100,
    log_color_space: 'D-Log',
    prompt_keywords: [
      'action POV',
      'stabilized action',
      'vlogging',
      'dual screen',
      'extreme sports',
      'underwater',
    ],
    aspect_ratios: ['16:9', '4:3', '9:16'],
  },
];

// =============================================================================
// LENS FAMILIES DATABASE
// =============================================================================

export const LENS_FAMILIES: LensFamily[] = [
  // =========================================================================
  // ZEISS
  // =========================================================================
  {
    id: 'zeiss_master_prime',
    brand: 'Zeiss',
    name: 'Master Prime',
    type: 'prime',
    focal_lengths: [14, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 100, 135, 150],
    min_t_stop: 1.3,
    is_anamorphic: false,
    prompt_keywords: [
      'clinical sharpness',
      'zero aberration',
      'high contrast',
      'perfect optical quality',
      'no distortion',
      'modern precision',
    ],
  },
  {
    id: 'zeiss_supreme_prime',
    brand: 'Zeiss',
    name: 'Supreme Prime',
    type: 'prime',
    focal_lengths: [15, 18, 21, 25, 29, 35, 40, 50, 65, 85, 100, 135, 150, 200],
    min_t_stop: 1.5,
    is_anamorphic: false,
    prompt_keywords: [
      'large format',
      'modern cine',
      'subtle character',
      'beautiful bokeh',
      'smooth falloff',
      'pleasing skin tones',
    ],
  },
  {
    id: 'zeiss_compact_prime',
    brand: 'Zeiss',
    name: 'CP.3',
    type: 'prime',
    focal_lengths: [15, 18, 21, 25, 28, 35, 50, 85, 100, 135],
    min_t_stop: 2.1,
    is_anamorphic: false,
    prompt_keywords: [
      'compact cine',
      'modern look',
      'sharp rendering',
      'budget friendly',
      'clean optics',
    ],
  },

  // =========================================================================
  // COOKE
  // =========================================================================
  {
    id: 'cooke_s4i',
    brand: 'Cooke',
    name: 'S4/i',
    type: 'prime',
    focal_lengths: [12, 14, 16, 18, 21, 25, 27, 32, 35, 40, 50, 65, 75, 100, 135, 150, 180, 300],
    min_t_stop: 2.0,
    is_anamorphic: false,
    prompt_keywords: [
      'Cooke Look',
      'warm skin tones',
      'creamy bokeh',
      'organic rendering',
      'subtle edge glow',
      'classic cinema',
    ],
  },
  {
    id: 'cooke_s7i',
    brand: 'Cooke',
    name: 'S7/i Full Frame Plus',
    type: 'prime',
    focal_lengths: [18, 25, 32, 40, 50, 75, 100, 135],
    min_t_stop: 2.0,
    is_anamorphic: false,
    prompt_keywords: [
      'full frame Cooke',
      'large format warmth',
      'creamy highlights',
      'natural skin',
      'organic character',
      'cinematic warmth',
    ],
  },
  {
    id: 'cooke_anamorphic_i',
    brand: 'Cooke',
    name: 'Anamorphic/i',
    type: 'anamorphic',
    focal_lengths: [25, 32, 40, 50, 65, 75, 100, 135, 180, 300],
    min_t_stop: 2.3,
    is_anamorphic: true,
    squeeze_factor: 2.0,
    prompt_keywords: [
      'oval bokeh',
      '2x anamorphic',
      'subtle flare',
      'widescreen cinema',
      'classic Hollywood',
      'epic scope',
    ],
    flare_color: 'amber',
  },

  // =========================================================================
  // PANAVISION
  // =========================================================================
  {
    id: 'panavision_primo_70',
    brand: 'Panavision',
    name: 'Primo 70',
    type: 'prime',
    focal_lengths: [24, 27, 35, 40, 50, 65, 80, 100, 125, 150, 200, 250],
    min_t_stop: 1.9,
    is_anamorphic: false,
    prompt_keywords: [
      'large format',
      'Hollywood premium',
      'pristine optics',
      'smooth falloff',
      'natural rendering',
      'A-list production',
    ],
  },
  {
    id: 'panavision_c_series',
    brand: 'Panavision',
    name: 'C-Series Anamorphic',
    type: 'anamorphic',
    focal_lengths: [35, 40, 50, 75, 100, 150],
    min_t_stop: 2.8,
    is_anamorphic: true,
    squeeze_factor: 2.0,
    prompt_keywords: [
      'vintage anamorphic',
      'blue streak flare',
      'oval bokeh',
      'classic Hollywood',
      'Lawrence of Arabia',
      'epic widescreen',
    ],
    flare_color: 'blue',
  },
  {
    id: 'panavision_ultra_speed',
    brand: 'Panavision',
    name: 'Ultra Speed MKII',
    type: 'prime',
    focal_lengths: [14, 17, 24, 29, 35, 50, 75, 100, 135],
    min_t_stop: 1.1,
    is_anamorphic: false,
    prompt_keywords: [
      'fast aperture',
      'low light',
      'extreme bokeh',
      'razor thin focus',
      'vintage warmth',
    ],
  },

  // =========================================================================
  // ARRI/ZEISS
  // =========================================================================
  {
    id: 'arri_signature_prime',
    brand: 'ARRI',
    name: 'Signature Prime',
    type: 'prime',
    focal_lengths: [12, 15, 18, 21, 25, 29, 35, 40, 47, 58, 75, 95, 125, 150, 200, 280, 560],
    min_t_stop: 1.8,
    is_anamorphic: false,
    prompt_keywords: [
      'ARRI look',
      'warm and forgiving',
      'beautiful skin',
      'gentle highlight rolloff',
      'full frame native',
      'premium cinema',
    ],
  },
  {
    id: 'arri_master_anamorphic',
    brand: 'ARRI',
    name: 'Master Anamorphic',
    type: 'anamorphic',
    focal_lengths: [28, 35, 40, 50, 60, 75, 100, 135, 180],
    min_t_stop: 1.9,
    is_anamorphic: true,
    squeeze_factor: 2.0,
    prompt_keywords: [
      'modern anamorphic',
      'controlled flare',
      'oval bokeh',
      'clean widescreen',
      'contemporary cinema',
      'refined character',
    ],
    flare_color: 'cyan',
  },

  // =========================================================================
  // SIGMA
  // =========================================================================
  {
    id: 'sigma_cine_ff',
    brand: 'Sigma',
    name: 'FF High Speed Cine',
    type: 'prime',
    focal_lengths: [14, 20, 24, 35, 50, 85, 135],
    min_t_stop: 1.5,
    is_anamorphic: false,
    prompt_keywords: [
      'affordable cinema',
      'sharp modern',
      'full frame coverage',
      'indie filmmaker',
      'high value',
      'clean rendering',
    ],
  },
  {
    id: 'sigma_art',
    brand: 'Sigma',
    name: 'Art Series',
    type: 'prime',
    focal_lengths: [14, 20, 24, 28, 35, 40, 50, 85, 105, 135],
    min_t_stop: 1.4,
    is_anamorphic: false,
    prompt_keywords: [
      'photo lens cine',
      'ultra sharp',
      'clinical',
      'high resolution',
      'budget cinema',
      'content creator',
    ],
  },

  // =========================================================================
  // VINTAGE PRIMES
  // =========================================================================
  {
    id: 'cooke_speed_panchro',
    brand: 'Cooke',
    name: 'Speed Panchro',
    type: 'vintage',
    focal_lengths: [18, 25, 32, 40, 50, 75, 100],
    min_t_stop: 2.0,
    is_anamorphic: false,
    prompt_keywords: [
      'vintage Cooke',
      '1930s Hollywood',
      'soft glow',
      'romantic rendering',
      'low contrast',
      'period film',
    ],
  },
  {
    id: 'bausch_lomb_super_baltar',
    brand: 'Bausch & Lomb',
    name: 'Super Baltar',
    type: 'vintage',
    focal_lengths: [20, 25, 35, 50, 75, 100, 152],
    min_t_stop: 2.0,
    is_anamorphic: false,
    prompt_keywords: [
      'golden age Hollywood',
      'soft focus',
      'warm rendering',
      'classic cinema',
      'film noir',
      'romantic glow',
    ],
  },
  {
    id: 'helios_44',
    brand: 'Helios',
    name: '44-2 (58mm f/2)',
    type: 'vintage',
    focal_lengths: [58],
    min_t_stop: 2.0,
    is_anamorphic: false,
    prompt_keywords: [
      'swirly bokeh',
      'Soviet lens',
      'dreamy background',
      'artistic rendering',
      'portrait character',
      'unique look',
    ],
  },
  {
    id: 'canon_fd',
    brand: 'Canon',
    name: 'FD SSC',
    type: 'vintage',
    focal_lengths: [24, 28, 35, 50, 85, 100, 135, 200],
    min_t_stop: 1.4,
    is_anamorphic: false,
    prompt_keywords: [
      '1970s look',
      'warm flare',
      'organic rendering',
      'low contrast',
      'vintage warmth',
      'nostalgic',
    ],
  },

  // =========================================================================
  // SPECIALTY LENSES
  // =========================================================================
  {
    id: 'laowa_probe',
    brand: 'Laowa',
    name: '24mm f/14 Probe',
    type: 'specialty',
    focal_lengths: [24],
    min_t_stop: 14.0,
    is_anamorphic: false,
    prompt_keywords: [
      'macro probe',
      'bug perspective',
      'miniature world',
      'extreme close-up',
      'product shot',
      'tiny perspective',
    ],
  },
  {
    id: 'lensbaby_velvet',
    brand: 'Lensbaby',
    name: 'Velvet 85',
    type: 'specialty',
    focal_lengths: [85],
    min_t_stop: 1.8,
    is_anamorphic: false,
    prompt_keywords: [
      'ethereal glow',
      'soft focus portrait',
      'dreamy',
      'romantic haze',
      'fantasy look',
      'skin smoothing',
    ],
  },
  {
    id: 'petzval_85',
    brand: 'Lomography',
    name: 'Petzval 85mm Art',
    type: 'specialty',
    focal_lengths: [85],
    min_t_stop: 2.2,
    is_anamorphic: false,
    prompt_keywords: [
      'swirly bokeh',
      'vintage brass',
      'artistic portrait',
      'vignette',
      'center sharpness',
      '1840s optics',
    ],
  },

  // =========================================================================
  // ANAMORPHIC SPECIALTY
  // =========================================================================
  {
    id: 'atlas_orion',
    brand: 'Atlas',
    name: 'Orion',
    type: 'anamorphic',
    focal_lengths: [32, 40, 50, 65, 80, 100],
    min_t_stop: 2.0,
    is_anamorphic: true,
    squeeze_factor: 2.0,
    prompt_keywords: [
      'modern anamorphic',
      'amber flare',
      'oval bokeh',
      'indie anamorphic',
      'affordable widescreen',
      'cinematic scope',
    ],
    flare_color: 'amber',
  },
  {
    id: 'sirui_anamorphic',
    brand: 'Sirui',
    name: 'Saturn',
    type: 'anamorphic',
    focal_lengths: [24, 35, 50, 75],
    min_t_stop: 2.0,
    is_anamorphic: true,
    squeeze_factor: 1.33,
    prompt_keywords: [
      '1.33x anamorphic',
      'blue flare',
      'budget anamorphic',
      'content creator',
      'entry level widescreen',
    ],
    flare_color: 'blue',
  },
];

// =============================================================================
// INDIVIDUAL LENS DATABASE (Expanded from families)
// =============================================================================

export const LENS_DATABASE: LensSpec[] = LENS_FAMILIES.flatMap(family =>
  family.focal_lengths.map(focal_length => ({
    id: `${family.id}_${focal_length}mm`,
    brand: family.brand,
    model: family.name,
    family: family.id,
    focal_length_mm: focal_length,
    min_t_stop: family.min_t_stop,
    max_t_stop: 22,
    is_anamorphic: family.is_anamorphic,
    squeeze_factor: family.squeeze_factor,
    prompt_keywords: family.prompt_keywords,
    flare_color: family.flare_color,
  }))
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get camera by ID
 */
export function getCamera(id: string): CameraSpec | undefined {
  return CAMERA_DATABASE.find(c => c.id === id);
}

/**
 * Get lens by ID
 */
export function getLens(id: string): LensSpec | undefined {
  return LENS_DATABASE.find(l => l.id === id);
}

/**
 * Get lens family by ID
 */
export function getLensFamily(id: string): LensFamily | undefined {
  return LENS_FAMILIES.find(f => f.id === id);
}

/**
 * Get all cameras by category
 */
export function getCamerasByCategory(category: CameraSpec['category']): CameraSpec[] {
  return CAMERA_DATABASE.filter(c => c.category === category);
}

/**
 * Get all lens families by type
 */
export function getLensFamiliesByType(type: LensFamily['type']): LensFamily[] {
  return LENS_FAMILIES.filter(f => f.type === type);
}

/**
 * Build cinematic modifier string for prompt injection
 */
export function buildCinematicModifier(cameraId: string, lensId: string): string {
  const camera = getCamera(cameraId);
  const lens = getLens(lensId);

  if (!camera && !lens) return '';

  const keywords: string[] = [];

  if (camera) {
    keywords.push(...camera.prompt_keywords);
    keywords.push(`shot on ${camera.brand} ${camera.model}`);
    keywords.push(`${camera.log_color_space} color science`);
  }

  if (lens) {
    keywords.push(...lens.prompt_keywords);
    keywords.push(
      `${lens.brand} ${lens.model} ${lens.focal_length_mm}mm T${lens.min_t_stop.toFixed(1)} lens`
    );

    if (lens.is_anamorphic) {
      keywords.push(`${lens.squeeze_factor || 2}x anamorphic`);
      if (lens.flare_color) {
        keywords.push(`${lens.flare_color} streak anamorphic flare`);
      }
      keywords.push('oval bokeh', 'horizontal lens flare');
    } else {
      keywords.push('spherical lens');
    }
  }

  return keywords.join(', ');
}

/**
 * Build camera prompt for Shot Studio
 */
export function buildCameraPrompt(
  cameraId: string,
  lensId: string,
  additionalKeywords?: string[]
): string {
  const modifier = buildCinematicModifier(cameraId, lensId);
  const extra = additionalKeywords?.join(', ') || '';

  return [modifier, extra].filter(Boolean).join(', ');
}

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================

export default {
  CAMERA_DATABASE,
  LENS_FAMILIES,
  LENS_DATABASE,
  getCamera,
  getLens,
  getLensFamily,
  getCamerasByCategory,
  getLensFamiliesByType,
  buildCinematicModifier,
  buildCameraPrompt,
};

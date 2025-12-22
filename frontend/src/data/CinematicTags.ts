/**
 * Cinematic Tags Library
 *
 * Comprehensive collection of professional cinematography tags organized into categories.
 * Used for Quick Add Tags in StyleSelectorModal and ShotStyleEditorModal.
 *
 * Categories:
 * - Cameras: Professional cinema cameras
 * - Lenses: Prime, zoom, anamorphic, and specialty lenses
 * - Film Stock: Classic and modern film emulations
 * - Color Grade: Color grading looks and styles
 * - Lighting: Lighting setups and techniques
 * - Motion: Camera movement and motion techniques
 * - Mood: Emotional and atmospheric tags
 */

export interface CinematicTag {
  id: string;
  name: string;
  prompt: string;
  description?: string;
}

export interface TagCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  subcategories?: TagSubcategory[];
  tags: CinematicTag[];
}

export interface TagSubcategory {
  id: string;
  label: string;
  tagIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERAS CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const CAMERAS: TagCategory = {
  id: 'cameras',
  label: 'Cameras',
  icon: '📷',
  description: 'Professional cinema and specialty cameras',
  subcategories: [
    {
      id: 'digital_cinema',
      label: 'Digital Cinema',
      tagIds: [
        'arri_alexa_65',
        'arri_alexa_35',
        'arri_alexa_mini',
        'red_v_raptor',
        'red_monstro_8k',
        'sony_venice_2',
        'blackmagic_ursa_mini',
        'canon_c500_mark_ii',
        'panasonic_varicam',
      ],
    },
    {
      id: 'imax_large_format',
      label: 'IMAX & Large Format',
      tagIds: ['imax_70mm', 'panavision_dxl2', 'arri_alexa_65_imax', 'red_ranger_monstro'],
    },
    {
      id: 'film_cameras',
      label: 'Film Cameras',
      tagIds: ['16mm_film', 'super_8', '35mm_film', '65mm_film', 'bolex_h16'],
    },
    {
      id: 'phones',
      label: 'Phones & Consumer',
      tagIds: [
        'iphone_17_pro',
        'iphone_16_pro',
        'samsung_galaxy_s25_ultra',
        'google_pixel_10_pro',
        'disposable_camera',
        'polaroid_instant',
        'webcam',
        'cctv_security',
      ],
    },
    {
      id: 'specialty',
      label: 'Specialty',
      tagIds: [
        'gopro_hero',
        'dji_drone',
        'phantom_high_speed',
        'infrared_camera',
        'thermal_camera',
      ],
    },
    {
      id: 'vintage',
      label: 'Vintage',
      tagIds: ['mitchell_bnc', 'panavision_panaflex', 'arriflex_35_bl', 'eclair_npr'],
    },
  ],
  tags: [
    // Digital Cinema
    {
      id: 'arri_alexa_65',
      name: 'ARRI Alexa 65',
      prompt: 'shot on ARRI Alexa 65 large format',
      description: 'Large format cinema camera, exceptional dynamic range',
    },
    {
      id: 'arri_alexa_35',
      name: 'ARRI Alexa 35',
      prompt: 'shot on ARRI Alexa 35',
      description: 'Latest generation ARRI, ALEV 4 sensor',
    },
    {
      id: 'arri_alexa_mini',
      name: 'ARRI Alexa Mini',
      prompt: 'shot on ARRI Alexa Mini',
      description: 'Compact cinema camera, industry standard',
    },
    {
      id: 'red_v_raptor',
      name: 'RED V-Raptor',
      prompt: 'shot on RED V-Raptor 8K VV',
      description: 'Global shutter, 8K full frame',
    },
    {
      id: 'red_monstro_8k',
      name: 'RED Monstro 8K',
      prompt: 'shot on RED Monstro 8K VV',
      description: 'Large format 8K sensor',
    },
    {
      id: 'sony_venice_2',
      name: 'Sony Venice 2',
      prompt: 'shot on Sony Venice 2',
      description: 'Dual base ISO, full frame 8.6K',
    },
    {
      id: 'blackmagic_ursa_mini',
      name: 'Blackmagic URSA Mini Pro',
      prompt: 'shot on Blackmagic URSA Mini Pro 12K',
      description: '12K Super 35 sensor',
    },
    {
      id: 'canon_c500_mark_ii',
      name: 'Canon C500 Mark II',
      prompt: 'shot on Canon C500 Mark II',
      description: 'Full frame cinema EOS',
    },
    {
      id: 'panasonic_varicam',
      name: 'Panasonic VariCam',
      prompt: 'shot on Panasonic VariCam LT',
      description: 'Dual native ISO, Super 35',
    },
    // IMAX & Large Format
    {
      id: 'imax_70mm',
      name: 'IMAX 70mm',
      prompt: 'shot on IMAX 70mm film',
      description: '15 perf 70mm, maximum resolution',
    },
    {
      id: 'panavision_dxl2',
      name: 'Panavision DXL2',
      prompt: 'shot on Panavision Millennium DXL2',
      description: 'Large format 8K Monstro sensor',
    },
    {
      id: 'arri_alexa_65_imax',
      name: 'Alexa 65 IMAX',
      prompt: 'shot on ARRI Alexa 65 IMAX certified',
      description: 'IMAX-approved large format',
    },
    {
      id: 'red_ranger_monstro',
      name: 'RED Ranger Monstro',
      prompt: 'shot on RED Ranger Monstro',
      description: 'Studio-style large format',
    },
    // Film Cameras
    {
      id: '16mm_film',
      name: '16mm Film',
      prompt: 'shot on 16mm film camera',
      description: 'Classic documentary look, heavy grain',
    },
    {
      id: 'super_8',
      name: 'Super 8',
      prompt: 'shot on Super 8 film camera',
      description: 'Nostalgic home movie aesthetic',
    },
    {
      id: '35mm_film',
      name: '35mm Film',
      prompt: 'shot on 35mm film camera',
      description: 'Traditional cinema format',
    },
    {
      id: '65mm_film',
      name: '65mm Film',
      prompt: 'shot on 65mm film camera',
      description: 'Large format film, exceptional detail',
    },
    {
      id: 'bolex_h16',
      name: 'Bolex H16',
      prompt: 'shot on Bolex H16 16mm',
      description: 'Swiss precision, spring-wound',
    },
    // Phones & Consumer
    {
      id: 'iphone_17_pro',
      name: 'iPhone 17 Pro',
      prompt: 'shot on iPhone 17 Pro, 4K 120fps Dolby Vision, Apple Log 2, cinematic mode',
      description: '48MP triple lens, 8x optical zoom, Dual Capture',
    },
    {
      id: 'iphone_16_pro',
      name: 'iPhone 16 Pro',
      prompt: 'shot on iPhone 16 Pro, ProRes Log, cinematic mode, smartphone footage',
      description: '48MP Fusion camera, 5x telephoto',
    },
    {
      id: 'samsung_galaxy_s25_ultra',
      name: 'Samsung Galaxy S25 Ultra',
      prompt: 'shot on Samsung Galaxy S25 Ultra, 8K video, Galaxy Log, smartphone',
      description: '200MP sensor, 10x optical zoom, 10-bit HDR',
    },
    {
      id: 'google_pixel_10_pro',
      name: 'Google Pixel 10 Pro',
      prompt: 'shot on Google Pixel 10 Pro, Tensor G5 computational photography, Video Boost',
      description: '50MP main, 100x Super Res Zoom, AI Camera Coach',
    },
    {
      id: 'disposable_camera',
      name: 'Disposable Camera',
      prompt: 'shot on disposable camera, flash, grainy, amateur',
      description: 'Party cam aesthetic',
    },
    {
      id: 'polaroid_instant',
      name: 'Polaroid Instant',
      prompt: 'Polaroid instant camera, square format, faded colors',
      description: 'Instant film look',
    },
    {
      id: 'webcam',
      name: 'Webcam',
      prompt: 'webcam footage, low quality, compressed, video call aesthetic',
      description: 'Video chat quality',
    },
    {
      id: 'cctv_security',
      name: 'CCTV Security',
      prompt: 'CCTV security camera footage, grainy, timestamp overlay',
      description: 'Surveillance footage',
    },
    // Specialty
    {
      id: 'gopro_hero',
      name: 'GoPro',
      prompt: 'shot on GoPro action camera wide angle',
      description: 'Action camera, ultra-wide',
    },
    {
      id: 'dji_drone',
      name: 'DJI Drone',
      prompt: 'shot on DJI drone aerial footage',
      description: 'Aerial cinematography',
    },
    {
      id: 'phantom_high_speed',
      name: 'Phantom High Speed',
      prompt: 'shot on Phantom high-speed camera extreme slow motion',
      description: 'High-speed cinematography',
    },
    {
      id: 'infrared_camera',
      name: 'Infrared',
      prompt: 'shot on infrared camera',
      description: 'Infrared spectrum, surreal look',
    },
    {
      id: 'thermal_camera',
      name: 'Thermal',
      prompt: 'shot on thermal imaging camera',
      description: 'Heat signature visualization',
    },
    // Vintage
    {
      id: 'mitchell_bnc',
      name: 'Mitchell BNC',
      prompt: 'shot on Mitchell BNC 35mm',
      description: 'Hollywood golden age camera',
    },
    {
      id: 'panavision_panaflex',
      name: 'Panavision Panaflex',
      prompt: 'shot on Panavision Panaflex',
      description: 'New Hollywood era standard',
    },
    {
      id: 'arriflex_35_bl',
      name: 'Arriflex 35BL',
      prompt: 'shot on Arriflex 35 BL',
      description: 'Self-blimped 35mm',
    },
    {
      id: 'eclair_npr',
      name: 'Eclair NPR',
      prompt: 'shot on Eclair NPR 16mm',
      description: 'French New Wave documentary style',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// LENSES CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const LENSES: TagCategory = {
  id: 'lenses',
  label: 'Lenses',
  icon: '🔍',
  description: 'Cinema lenses and optical characteristics',
  subcategories: [
    {
      id: 'anamorphic',
      label: 'Anamorphic',
      tagIds: [
        'anamorphic_prime',
        'anamorphic_zoom',
        'panavision_c_series',
        'cooke_anamorphic',
        'atlas_orion',
      ],
    },
    {
      id: 'vintage_primes',
      label: 'Vintage Primes',
      tagIds: [
        'cooke_speed_panchro',
        'canon_k35',
        'zeiss_super_speeds',
        'bausch_lomb_super_baltar',
        'kowa_cine',
      ],
    },
    {
      id: 'modern_primes',
      label: 'Modern Primes',
      tagIds: [
        'zeiss_master_prime',
        'arri_signature_prime',
        'cooke_s7i',
        'leica_summilux_c',
        'sigma_cine',
      ],
    },
    {
      id: 'specialty',
      label: 'Specialty',
      tagIds: ['petzval_lens', 'macro_lens', 'tilt_shift', 'lensbaby', 'split_diopter'],
    },
    {
      id: 'focal_length',
      label: 'Focal Length',
      tagIds: [
        'ultra_wide_12mm',
        'wide_24mm',
        'normal_50mm',
        'portrait_85mm',
        'telephoto_135mm',
        'super_tele_200mm',
      ],
    },
  ],
  tags: [
    // Anamorphic
    {
      id: 'anamorphic_prime',
      name: 'Anamorphic Prime',
      prompt: 'anamorphic lens, 2x squeeze, oval bokeh, lens flares',
      description: 'Classic widescreen look',
    },
    {
      id: 'anamorphic_zoom',
      name: 'Anamorphic Zoom',
      prompt: 'anamorphic zoom lens, horizontal flares',
      description: 'Versatile anamorphic',
    },
    {
      id: 'panavision_c_series',
      name: 'Panavision C-Series',
      prompt: 'Panavision C-Series anamorphic, warm flares',
      description: 'Hollywood standard anamorphic',
    },
    {
      id: 'cooke_anamorphic',
      name: 'Cooke Anamorphic',
      prompt: 'Cooke Anamorphic/i lens, soft flares',
      description: 'Organic anamorphic look',
    },
    {
      id: 'atlas_orion',
      name: 'Atlas Orion',
      prompt: 'Atlas Orion anamorphic, blue flares',
      description: 'Modern vintage anamorphic',
    },
    // Vintage Primes
    {
      id: 'cooke_speed_panchro',
      name: 'Cooke Speed Panchro',
      prompt: 'vintage Cooke Speed Panchro lens, soft glow',
      description: '1920s-1960s Hollywood look',
    },
    {
      id: 'canon_k35',
      name: 'Canon K35',
      prompt: 'Canon K35 vintage lens, warm bokeh',
      description: '1970s cinema glass',
    },
    {
      id: 'zeiss_super_speeds',
      name: 'Zeiss Super Speeds',
      prompt: 'Zeiss Super Speed lens, clinical sharpness',
      description: "Kubrick's preferred lens",
    },
    {
      id: 'bausch_lomb_super_baltar',
      name: 'Super Baltar',
      prompt: 'Bausch & Lomb Super Baltar lens, soft rendering',
      description: 'Classic Hollywood glamour',
    },
    {
      id: 'kowa_cine',
      name: 'Kowa Cine',
      prompt: 'Kowa Cine Prominar lens, swirly bokeh',
      description: 'Japanese vintage character',
    },
    // Modern Primes
    {
      id: 'zeiss_master_prime',
      name: 'Zeiss Master Prime',
      prompt: 'Zeiss Master Prime lens, razor sharp',
      description: 'Ultimate modern sharpness',
    },
    {
      id: 'arri_signature_prime',
      name: 'ARRI Signature Prime',
      prompt: 'ARRI Signature Prime lens, large format',
      description: 'Modern large format glass',
    },
    {
      id: 'cooke_s7i',
      name: 'Cooke S7/i',
      prompt: 'Cooke S7/i full frame lens, Cooke Look',
      description: 'Full frame with character',
    },
    {
      id: 'leica_summilux_c',
      name: 'Leica Summilux-C',
      prompt: 'Leica Summilux-C cinema lens, smooth bokeh',
      description: 'Leica optical quality',
    },
    {
      id: 'sigma_cine',
      name: 'Sigma Cine',
      prompt: 'Sigma Cine lens, high resolution',
      description: 'Modern high-res glass',
    },
    // Specialty
    {
      id: 'petzval_lens',
      name: 'Petzval',
      prompt: 'Petzval art lens, swirly bokeh effect',
      description: '1840s optical design, dreamy',
    },
    {
      id: 'macro_lens',
      name: 'Macro 100mm',
      prompt: 'macro lens extreme close-up, shallow DOF',
      description: 'Extreme close-up capability',
    },
    {
      id: 'tilt_shift',
      name: 'Tilt-Shift',
      prompt: 'tilt-shift lens, selective focus plane',
      description: 'Perspective and focus control',
    },
    {
      id: 'lensbaby',
      name: 'Lensbaby',
      prompt: 'Lensbaby lens, selective focus spot',
      description: 'Creative blur effects',
    },
    {
      id: 'split_diopter',
      name: 'Split Diopter',
      prompt: 'split diopter dual focus effect',
      description: 'Two focus planes, De Palma style',
    },
    // Focal Length
    {
      id: 'ultra_wide_12mm',
      name: '12mm Ultra Wide',
      prompt: '12mm ultra wide angle lens, dramatic perspective',
      description: 'Extreme wide, barrel distortion',
    },
    {
      id: 'wide_24mm',
      name: '24mm Wide',
      prompt: '24mm wide angle lens, environmental',
      description: 'Wide establishing shots',
    },
    {
      id: 'normal_50mm',
      name: '50mm Normal',
      prompt: '50mm normal lens, natural perspective',
      description: 'Human eye perspective',
    },
    {
      id: 'portrait_85mm',
      name: '85mm Portrait',
      prompt: '85mm portrait lens, flattering compression',
      description: 'Classic portrait focal',
    },
    {
      id: 'telephoto_135mm',
      name: '135mm Telephoto',
      prompt: '135mm telephoto lens, background compression',
      description: 'Intimate telephoto',
    },
    {
      id: 'super_tele_200mm',
      name: '200mm Super Tele',
      prompt: '200mm super telephoto lens, extreme compression',
      description: 'Maximum compression',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FILM STOCK CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const FILM_STOCK: TagCategory = {
  id: 'films',
  label: 'Film Stock',
  icon: '🎞️',
  description: 'Classic film stock emulations',
  subcategories: [
    {
      id: 'kodak_motion',
      label: 'Kodak Motion Picture',
      tagIds: ['kodak_5219', 'kodak_5213', 'kodak_5207', 'kodak_5203', 'kodak_250d'],
    },
    {
      id: 'kodak_still',
      label: 'Kodak Still',
      tagIds: [
        'kodak_portra_400',
        'kodak_portra_800',
        'kodak_ektar_100',
        'kodachrome_64',
        'kodak_gold_200',
      ],
    },
    {
      id: 'fujifilm',
      label: 'Fujifilm',
      tagIds: [
        'fuji_eterna_500t',
        'fuji_eterna_vivid',
        'fuji_pro_400h',
        'fuji_superia',
        'fuji_velvia_50',
      ],
    },
    {
      id: 'black_white',
      label: 'Black & White',
      tagIds: ['ilford_hp5', 'kodak_tri_x', 'ilford_delta_3200', 'foma_fomapan', 'kodak_double_x'],
    },
    {
      id: 'experimental',
      label: 'Experimental',
      tagIds: [
        'lomochrome_purple',
        'cinestill_800t',
        'cinestill_50d',
        'expired_film',
        'cross_processed',
      ],
    },
  ],
  tags: [
    // Kodak Motion Picture
    {
      id: 'kodak_5219',
      name: 'Kodak Vision3 500T',
      prompt: 'Kodak Vision3 500T film stock, tungsten balanced',
      description: 'Standard Hollywood negative',
    },
    {
      id: 'kodak_5213',
      name: 'Kodak Vision3 200T',
      prompt: 'Kodak Vision3 200T film stock, fine grain tungsten',
      description: 'Fine grain tungsten',
    },
    {
      id: 'kodak_5207',
      name: 'Kodak Vision3 250D',
      prompt: 'Kodak Vision3 250D film stock, daylight balanced',
      description: 'Daylight motion picture',
    },
    {
      id: 'kodak_5203',
      name: 'Kodak Vision3 50D',
      prompt: 'Kodak Vision3 50D film stock, ultra fine grain',
      description: 'Finest grain color',
    },
    {
      id: 'kodak_250d',
      name: 'Kodak 250D',
      prompt: 'Kodak 250D film emulation, warm daylight',
      description: 'Classic daylight stock',
    },
    // Kodak Still
    {
      id: 'kodak_portra_400',
      name: 'Kodak Portra 400',
      prompt: 'Kodak Portra 400 film stock, natural skin tones',
      description: 'Portrait standard, natural colors',
    },
    {
      id: 'kodak_portra_800',
      name: 'Kodak Portra 800',
      prompt: 'Kodak Portra 800 film stock, higher grain',
      description: 'Low light portrait film',
    },
    {
      id: 'kodak_ektar_100',
      name: 'Kodak Ektar 100',
      prompt: 'Kodak Ektar 100 film stock, vivid saturated colors',
      description: 'Finest grain color negative',
    },
    {
      id: 'kodachrome_64',
      name: 'Kodachrome 64',
      prompt: 'Kodachrome 64 emulation, rich reds and blues',
      description: 'Legendary slide film look',
    },
    {
      id: 'kodak_gold_200',
      name: 'Kodak Gold 200',
      prompt: 'Kodak Gold 200 film stock, warm consumer look',
      description: 'Classic consumer film',
    },
    // Fujifilm
    {
      id: 'fuji_eterna_500t',
      name: 'Fuji Eterna 500T',
      prompt: 'Fujifilm Eterna 500T film stock, subtle colors',
      description: 'Japanese cinema standard',
    },
    {
      id: 'fuji_eterna_vivid',
      name: 'Fuji Eterna Vivid',
      prompt: 'Fujifilm Eterna Vivid film stock, punchy colors',
      description: 'Saturated cinema stock',
    },
    {
      id: 'fuji_pro_400h',
      name: 'Fuji Pro 400H',
      prompt: 'Fujifilm Pro 400H film stock, soft pastels',
      description: 'Wedding photographer favorite',
    },
    {
      id: 'fuji_superia',
      name: 'Fuji Superia',
      prompt: 'Fujifilm Superia film stock, green shifted',
      description: 'Consumer film character',
    },
    {
      id: 'fuji_velvia_50',
      name: 'Fuji Velvia 50',
      prompt: 'Fujifilm Velvia 50 slide film, hyper saturated',
      description: 'Landscape slide film',
    },
    // Black & White
    {
      id: 'ilford_hp5',
      name: 'Ilford HP5 Plus',
      prompt: 'Ilford HP5 Plus black and white film, classic grain',
      description: 'Versatile B&W film',
    },
    {
      id: 'kodak_tri_x',
      name: 'Kodak Tri-X 400',
      prompt: 'Kodak Tri-X 400 black and white film, contrasty',
      description: 'Photojournalism standard',
    },
    {
      id: 'ilford_delta_3200',
      name: 'Ilford Delta 3200',
      prompt: 'Ilford Delta 3200 black and white film, heavy grain',
      description: 'Low light B&W, visible grain',
    },
    {
      id: 'foma_fomapan',
      name: 'Fomapan',
      prompt: 'Fomapan black and white film, vintage European',
      description: 'Czech B&W character',
    },
    {
      id: 'kodak_double_x',
      name: 'Kodak Double-X',
      prompt: 'Kodak Double-X black and white film, cinema classic',
      description: 'Cinema B&W standard',
    },
    // Experimental
    {
      id: 'lomochrome_purple',
      name: 'LomoChrome Purple',
      prompt: 'LomoChrome Purple film stock, purple infrared shift',
      description: 'Color-shifting experimental',
    },
    {
      id: 'cinestill_800t',
      name: 'CineStill 800T',
      prompt: 'CineStill 800T film stock, halation glow, tungsten',
      description: 'Remjet removed, halation',
    },
    {
      id: 'cinestill_50d',
      name: 'CineStill 50D',
      prompt: 'CineStill 50D film stock, daylight cinema',
      description: 'Daylight cinema in still form',
    },
    {
      id: 'expired_film',
      name: 'Expired Film',
      prompt: 'expired film stock, color shifts and fading',
      description: 'Degraded vintage look',
    },
    {
      id: 'cross_processed',
      name: 'Cross Processed',
      prompt: 'cross processed film, shifted colors high contrast',
      description: 'E-6 in C-41 look',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// COLOR GRADE CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR_GRADES: TagCategory = {
  id: 'colors',
  label: 'Color Grade',
  icon: '🎨',
  description: 'Color grading looks and styles',
  subcategories: [
    {
      id: 'hollywood',
      label: 'Hollywood Looks',
      tagIds: [
        'teal_orange',
        'blockbuster_grade',
        'desaturated_gritty',
        'warm_golden',
        'cool_steel',
      ],
    },
    {
      id: 'vintage',
      label: 'Vintage',
      tagIds: ['technicolor_2strip', 'technicolor_3strip', 'faded_vintage', '70s_warm', '80s_neon'],
    },
    {
      id: 'stylized',
      label: 'Stylized',
      tagIds: [
        'bleach_bypass',
        'high_contrast_bw',
        'cyberpunk_neon',
        'pastel_dream',
        'monochrome_color',
      ],
    },
    {
      id: 'natural',
      label: 'Natural',
      tagIds: [
        'natural_grade',
        'film_print',
        'log_flat',
        'documentary_natural',
        'broadcast_standard',
      ],
    },
    {
      id: 'social_media',
      label: 'Social Media Filters',
      tagIds: [
        'instagram_valencia',
        'instagram_clarendon',
        'instagram_juno',
        'tiktok_beauty',
        'vsco_a6',
        'vsco_c1',
        'snapchat_vivid',
        'beauty_mode',
      ],
    },
    {
      id: 'creative',
      label: 'Creative',
      tagIds: ['duotone', 'split_tone', 'color_pop', 'infrared_false', 'day_for_night'],
    },
  ],
  tags: [
    // Hollywood Looks
    {
      id: 'teal_orange',
      name: 'Teal & Orange',
      prompt: 'teal and orange color grading, complementary colors',
      description: 'Modern blockbuster standard',
    },
    {
      id: 'blockbuster_grade',
      name: 'Blockbuster',
      prompt: 'blockbuster color grade, high contrast, saturated',
      description: 'Big budget film look',
    },
    {
      id: 'desaturated_gritty',
      name: 'Desaturated Gritty',
      prompt: 'desaturated gritty color grade, muted colors',
      description: 'War film, dark thriller look',
    },
    {
      id: 'warm_golden',
      name: 'Warm Golden',
      prompt: 'warm golden color grade, nostalgic sunset',
      description: 'Golden hour extended',
    },
    {
      id: 'cool_steel',
      name: 'Cool Steel',
      prompt: 'cool steel blue color grade, clinical cold',
      description: 'Thriller, sci-fi coldness',
    },
    // Vintage
    {
      id: 'technicolor_2strip',
      name: 'Technicolor 2-Strip',
      prompt: 'Technicolor 2-strip emulation, cyan and red only',
      description: '1920s-1930s two-color',
    },
    {
      id: 'technicolor_3strip',
      name: 'Technicolor 3-Strip',
      prompt: 'Technicolor 3-strip emulation, saturated primaries',
      description: 'Golden age Technicolor',
    },
    {
      id: 'faded_vintage',
      name: 'Faded Vintage',
      prompt: 'faded vintage color grade, lifted blacks, muted',
      description: 'Aged print look',
    },
    {
      id: '70s_warm',
      name: '70s Warm',
      prompt: '1970s warm color grade, amber browns, soft contrast',
      description: 'Seventies film aesthetic',
    },
    {
      id: '80s_neon',
      name: '80s Neon',
      prompt: '1980s neon color grade, magenta cyan, high saturation',
      description: 'Eighties synthwave look',
    },
    // Stylized
    {
      id: 'bleach_bypass',
      name: 'Bleach Bypass',
      prompt: 'bleach bypass color grade, silver retained, low saturation',
      description: 'Saving Private Ryan look',
    },
    {
      id: 'high_contrast_bw',
      name: 'High Contrast B&W',
      prompt: 'high contrast black and white, deep blacks',
      description: 'Dramatic monochrome',
    },
    {
      id: 'cyberpunk_neon',
      name: 'Cyberpunk Neon',
      prompt: 'cyberpunk neon color grade, magenta green blue',
      description: 'Futuristic urban night',
    },
    {
      id: 'pastel_dream',
      name: 'Pastel Dream',
      prompt: 'pastel color grade, soft muted pastels',
      description: 'Soft feminine aesthetic',
    },
    {
      id: 'monochrome_color',
      name: 'Monochrome Color',
      prompt: 'monochromatic color grade, single hue variations',
      description: 'Single color palette',
    },
    // Natural
    {
      id: 'natural_grade',
      name: 'Natural',
      prompt: 'natural color grade, true to life colors',
      description: 'Minimal color manipulation',
    },
    {
      id: 'film_print',
      name: 'Film Print',
      prompt: 'film print emulation, projection characteristics',
      description: 'Theatre projection look',
    },
    {
      id: 'log_flat',
      name: 'Log/Flat',
      prompt: 'log flat color profile, maximum latitude',
      description: 'Ungraded camera log',
    },
    {
      id: 'documentary_natural',
      name: 'Documentary Natural',
      prompt: 'documentary natural color grade, authentic',
      description: 'Realistic documentary',
    },
    {
      id: 'broadcast_standard',
      name: 'Broadcast Standard',
      prompt: 'broadcast standard Rec.709 color grade',
      description: 'TV broadcast standard',
    },
    // Social Media Filters
    {
      id: 'instagram_valencia',
      name: 'Instagram Valencia',
      prompt: 'Instagram Valencia filter, warm faded vintage',
      description: 'Warm vintage Instagram',
    },
    {
      id: 'instagram_clarendon',
      name: 'Instagram Clarendon',
      prompt: 'Instagram Clarendon filter, brightened shadows vivid',
      description: 'Bright and punchy',
    },
    {
      id: 'instagram_juno',
      name: 'Instagram Juno',
      prompt: 'Instagram Juno filter, warm highlights cool shadows',
      description: 'Warm/cool split',
    },
    {
      id: 'tiktok_beauty',
      name: 'TikTok Beauty',
      prompt: 'TikTok beauty filter, smoothed skin, enhanced eyes, soft glow',
      description: 'Soft beauty glow',
    },
    {
      id: 'vsco_a6',
      name: 'VSCO A6',
      prompt: 'VSCO A6 filter, analog fade, muted colors, lifted blacks',
      description: 'Analog film fade',
    },
    {
      id: 'vsco_c1',
      name: 'VSCO C1',
      prompt: 'VSCO C1 filter, warm chromatic, slight fade',
      description: 'Warm chromatic look',
    },
    {
      id: 'snapchat_vivid',
      name: 'Snapchat Vivid',
      prompt: 'Snapchat vivid filter, saturated colors, enhanced contrast',
      description: 'Punchy social media',
    },
    {
      id: 'beauty_mode',
      name: 'Beauty Mode',
      prompt: 'beauty mode filter, skin smoothing, face slimming, eye enlarging',
      description: 'Smartphone beauty filter',
    },
    // Creative
    {
      id: 'duotone',
      name: 'Duotone',
      prompt: 'duotone color grade, two color palette',
      description: 'Two-color artistic',
    },
    {
      id: 'split_tone',
      name: 'Split Tone',
      prompt: 'split tone color grade, different shadow and highlight colors',
      description: 'Shadow/highlight split',
    },
    {
      id: 'color_pop',
      name: 'Color Pop',
      prompt: 'selective color pop, desaturated background one color',
      description: 'Single color emphasis',
    },
    {
      id: 'infrared_false',
      name: 'False Infrared',
      prompt: 'false color infrared look, vegetation red',
      description: 'Aerochrome simulation',
    },
    {
      id: 'day_for_night',
      name: 'Day for Night',
      prompt: 'day for night color grade, blue night simulation',
      description: 'American night look',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// LIGHTING CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const LIGHTING: TagCategory = {
  id: 'lighting',
  label: 'Lighting',
  icon: '💡',
  description: 'Lighting setups and techniques',
  subcategories: [
    {
      id: 'portrait',
      label: 'Portrait Lighting',
      tagIds: [
        'rembrandt_lighting',
        'butterfly_lighting',
        'loop_lighting',
        'split_lighting',
        'broad_lighting',
      ],
    },
    {
      id: 'cinematic',
      label: 'Cinematic',
      tagIds: ['three_point', 'high_key', 'low_key', 'chiaroscuro', 'silhouette'],
    },
    {
      id: 'natural',
      label: 'Natural Light',
      tagIds: ['golden_hour', 'blue_hour', 'overcast_diffused', 'direct_sunlight', 'window_light'],
    },
    {
      id: 'practical',
      label: 'Practical Lights',
      tagIds: ['neon_lighting', 'fluorescent', 'candlelight', 'fire_light', 'screen_glow'],
    },
    {
      id: 'stylized',
      label: 'Stylized',
      tagIds: ['volumetric_fog', 'god_rays', 'rim_light_only', 'underlighting', 'color_gel'],
    },
  ],
  tags: [
    // Portrait Lighting
    {
      id: 'rembrandt_lighting',
      name: 'Rembrandt',
      prompt: 'Rembrandt lighting, triangle on cheek, dramatic',
      description: 'Classic portrait, triangle shadow',
    },
    {
      id: 'butterfly_lighting',
      name: 'Butterfly',
      prompt: 'butterfly lighting, paramount glamour, overhead',
      description: 'Hollywood glamour lighting',
    },
    {
      id: 'loop_lighting',
      name: 'Loop',
      prompt: 'loop lighting, small nose shadow, flattering',
      description: 'Versatile portrait lighting',
    },
    {
      id: 'split_lighting',
      name: 'Split',
      prompt: 'split lighting, half face shadow, dramatic',
      description: 'Dramatic half-face shadow',
    },
    {
      id: 'broad_lighting',
      name: 'Broad',
      prompt: 'broad lighting, lit side toward camera',
      description: 'Wider face appearance',
    },
    // Cinematic
    {
      id: 'three_point',
      name: 'Three Point',
      prompt: 'three point lighting, key fill back',
      description: 'Standard cinematic setup',
    },
    {
      id: 'high_key',
      name: 'High Key',
      prompt: 'high key lighting, bright minimal shadows',
      description: 'Bright, low contrast',
    },
    {
      id: 'low_key',
      name: 'Low Key',
      prompt: 'low key lighting, dark dramatic shadows',
      description: 'Dark, high contrast',
    },
    {
      id: 'chiaroscuro',
      name: 'Chiaroscuro',
      prompt: 'chiaroscuro lighting, strong light and shadow',
      description: 'Renaissance contrast',
    },
    {
      id: 'silhouette',
      name: 'Silhouette',
      prompt: 'silhouette lighting, backlit only',
      description: 'Subject in shadow',
    },
    // Natural Light
    {
      id: 'golden_hour',
      name: 'Golden Hour',
      prompt: 'golden hour lighting, warm sunset',
      description: 'Warm sunset/sunrise',
    },
    {
      id: 'blue_hour',
      name: 'Blue Hour',
      prompt: 'blue hour lighting, cool twilight',
      description: 'Pre-sunrise/post-sunset',
    },
    {
      id: 'overcast_diffused',
      name: 'Overcast',
      prompt: 'overcast diffused lighting, soft shadows',
      description: 'Giant softbox sky',
    },
    {
      id: 'direct_sunlight',
      name: 'Direct Sun',
      prompt: 'direct sunlight, hard shadows',
      description: 'Harsh midday sun',
    },
    {
      id: 'window_light',
      name: 'Window Light',
      prompt: 'window light, soft natural side light',
      description: 'Single window source',
    },
    // Practical Lights
    {
      id: 'neon_lighting',
      name: 'Neon',
      prompt: 'neon lighting, colorful neon signs glow',
      description: 'Urban neon signs',
    },
    {
      id: 'fluorescent',
      name: 'Fluorescent',
      prompt: 'fluorescent lighting, green tint institutional',
      description: 'Office/hospital lighting',
    },
    {
      id: 'candlelight',
      name: 'Candlelight',
      prompt: 'candlelight, warm flickering intimate',
      description: 'Period/romantic lighting',
    },
    {
      id: 'fire_light',
      name: 'Fire Light',
      prompt: 'fire light, warm orange flickering',
      description: 'Campfire/fireplace',
    },
    {
      id: 'screen_glow',
      name: 'Screen Glow',
      prompt: 'screen glow, blue computer light face',
      description: 'Digital device illumination',
    },
    // Stylized
    {
      id: 'volumetric_fog',
      name: 'Volumetric Fog',
      prompt: 'volumetric lighting through fog, light rays visible',
      description: 'Visible light beams',
    },
    {
      id: 'god_rays',
      name: 'God Rays',
      prompt: 'god rays, crepuscular rays through clouds',
      description: 'Dramatic light shafts',
    },
    {
      id: 'rim_light_only',
      name: 'Rim Light Only',
      prompt: 'rim light only, edge definition no fill',
      description: 'Separation lighting',
    },
    {
      id: 'underlighting',
      name: 'Underlighting',
      prompt: 'underlighting from below, horror effect',
      description: 'Spooky from-below',
    },
    {
      id: 'color_gel',
      name: 'Color Gel',
      prompt: 'color gel lighting, tinted theatrical',
      description: 'Colored light sources',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MOTION CATEGORY (incorporates existing CameraPresets)
// ═══════════════════════════════════════════════════════════════════════════

export const MOTION: TagCategory = {
  id: 'cameraMotions',
  label: 'Motion',
  icon: '🎥',
  description: 'Camera movement and motion techniques',
  subcategories: [
    {
      id: 'static_stable',
      label: 'Static & Stable',
      tagIds: ['static', 'locked_tripod', 'steadicam', 'gimbal'],
    },
    { id: 'zoom', label: 'Zoom', tagIds: ['zoom_in', 'zoom_out', 'crash_zoom', 'dolly_zoom'] },
    {
      id: 'dolly',
      label: 'Dolly',
      tagIds: ['dolly_in', 'dolly_out', 'dolly_left', 'dolly_right', 'super_dolly'],
    },
    {
      id: 'crane',
      label: 'Crane & Jib',
      tagIds: ['crane_up', 'crane_down', 'crane_over', 'jib_up', 'jib_down'],
    },
    {
      id: 'pan_tilt',
      label: 'Pan & Tilt',
      tagIds: ['pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'whip_pan'],
    },
    {
      id: 'orbit',
      label: 'Orbit & Arc',
      tagIds: ['orbit_360', 'arc_left', 'arc_right', 'lazy_susan', 'rotation_3d'],
    },
    {
      id: 'specialty',
      label: 'Specialty',
      tagIds: ['bullet_time', 'snorricam', 'fpv_drone', 'through_object', 'handheld_shake'],
    },
    {
      id: 'speed',
      label: 'Speed Effects',
      tagIds: ['slow_motion', 'speed_ramp', 'timelapse', 'hyperlapse', 'freeze_frame'],
    },
  ],
  tags: [
    // Static & Stable
    {
      id: 'static',
      name: 'Static',
      prompt: 'static camera, locked off, stationary',
      description: 'Completely still camera',
    },
    {
      id: 'locked_tripod',
      name: 'Locked Tripod',
      prompt: 'locked tripod shot, no movement',
      description: 'Tripod-mounted static',
    },
    {
      id: 'steadicam',
      name: 'Steadicam',
      prompt: 'steadicam smooth floating movement',
      description: 'Smooth handheld glide',
    },
    {
      id: 'gimbal',
      name: 'Gimbal',
      prompt: 'gimbal stabilized smooth movement',
      description: 'Electronic stabilization',
    },
    // Zoom
    {
      id: 'zoom_in',
      name: 'Zoom In',
      prompt: 'slow zoom in toward subject',
      description: 'Gradual zoom toward',
    },
    {
      id: 'zoom_out',
      name: 'Zoom Out',
      prompt: 'slow zoom out revealing scene',
      description: 'Gradual zoom away',
    },
    {
      id: 'crash_zoom',
      name: 'Crash Zoom',
      prompt: 'rapid crash zoom dramatic',
      description: 'Fast sudden zoom',
    },
    {
      id: 'dolly_zoom',
      name: 'Dolly Zoom',
      prompt: 'dolly zoom vertigo effect background stretch',
      description: 'Hitchcock vertigo effect',
    },
    // Dolly
    {
      id: 'dolly_in',
      name: 'Dolly In',
      prompt: 'smooth dolly push in toward subject',
      description: 'Camera moves toward',
    },
    {
      id: 'dolly_out',
      name: 'Dolly Out',
      prompt: 'smooth dolly pull out from subject',
      description: 'Camera moves away',
    },
    {
      id: 'dolly_left',
      name: 'Dolly Left',
      prompt: 'lateral dolly tracking left smooth',
      description: 'Camera slides left',
    },
    {
      id: 'dolly_right',
      name: 'Dolly Right',
      prompt: 'lateral dolly tracking right smooth',
      description: 'Camera slides right',
    },
    {
      id: 'super_dolly',
      name: 'Super Dolly',
      prompt: 'extended super dolly dramatic long push',
      description: 'Extended dolly move',
    },
    // Crane & Jib
    {
      id: 'crane_up',
      name: 'Crane Up',
      prompt: 'crane shot rising up smoothly',
      description: 'Camera rises vertically',
    },
    {
      id: 'crane_down',
      name: 'Crane Down',
      prompt: 'crane shot descending smoothly',
      description: 'Camera lowers vertically',
    },
    {
      id: 'crane_over',
      name: 'Crane Over',
      prompt: 'crane arcing over dramatic reveal',
      description: 'Arc over subject',
    },
    {
      id: 'jib_up',
      name: 'Jib Up',
      prompt: 'jib arm rising upward',
      description: 'Smaller vertical rise',
    },
    {
      id: 'jib_down',
      name: 'Jib Down',
      prompt: 'jib arm lowering downward',
      description: 'Smaller descent',
    },
    // Pan & Tilt
    {
      id: 'pan_left',
      name: 'Pan Left',
      prompt: 'smooth pan left horizontal rotation',
      description: 'Camera rotates left',
    },
    {
      id: 'pan_right',
      name: 'Pan Right',
      prompt: 'smooth pan right horizontal rotation',
      description: 'Camera rotates right',
    },
    {
      id: 'tilt_up',
      name: 'Tilt Up',
      prompt: 'smooth tilt up looking upward',
      description: 'Camera tilts upward',
    },
    {
      id: 'tilt_down',
      name: 'Tilt Down',
      prompt: 'smooth tilt down looking downward',
      description: 'Camera tilts downward',
    },
    {
      id: 'whip_pan',
      name: 'Whip Pan',
      prompt: 'ultra fast whip pan motion blur',
      description: 'Fast blur transition',
    },
    // Orbit & Arc
    {
      id: 'orbit_360',
      name: '360° Orbit',
      prompt: 'camera orbiting 360 degrees around subject',
      description: 'Full rotation around',
    },
    {
      id: 'arc_left',
      name: 'Arc Left',
      prompt: 'camera arcing left around subject',
      description: 'Partial left orbit',
    },
    {
      id: 'arc_right',
      name: 'Arc Right',
      prompt: 'camera arcing right around subject',
      description: 'Partial right orbit',
    },
    {
      id: 'lazy_susan',
      name: 'Lazy Susan',
      prompt: 'slow rotating gentle orbit',
      description: 'Slow gentle rotation',
    },
    {
      id: 'rotation_3d',
      name: '3D Rotation',
      prompt: 'complex 3D camera rotation multi-axis',
      description: 'Multi-axis rotation',
    },
    // Specialty
    {
      id: 'bullet_time',
      name: 'Bullet Time',
      prompt: 'bullet time frozen moment rotating slow motion',
      description: 'Matrix time freeze',
    },
    {
      id: 'snorricam',
      name: 'Snorricam',
      prompt: 'snorricam body mount subject centered',
      description: 'Body-mounted camera',
    },
    {
      id: 'fpv_drone',
      name: 'FPV Drone',
      prompt: 'FPV drone flying through immersive',
      description: 'First-person drone',
    },
    {
      id: 'through_object',
      name: 'Through Object',
      prompt: 'camera passing through object impossible',
      description: 'Passing through solid',
    },
    {
      id: 'handheld_shake',
      name: 'Handheld Shake',
      prompt: 'handheld shaky camera documentary style',
      description: 'Natural camera shake',
    },
    // Speed Effects
    {
      id: 'slow_motion',
      name: 'Slow Motion',
      prompt: 'slow motion high frame rate smooth',
      description: 'Time slowed down',
    },
    {
      id: 'speed_ramp',
      name: 'Speed Ramp',
      prompt: 'speed ramping variable speed dramatic',
      description: 'Variable speed change',
    },
    {
      id: 'timelapse',
      name: 'Timelapse',
      prompt: 'timelapse sped up time passage',
      description: 'Compressed time',
    },
    {
      id: 'hyperlapse',
      name: 'Hyperlapse',
      prompt: 'hyperlapse moving timelapse through space',
      description: 'Moving timelapse',
    },
    {
      id: 'freeze_frame',
      name: 'Freeze Frame',
      prompt: 'freeze frame moment frozen in time',
      description: 'Frozen moment',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MOOD CATEGORY
// ═══════════════════════════════════════════════════════════════════════════

export const MOODS: TagCategory = {
  id: 'moods',
  label: 'Mood',
  icon: '🎭',
  description: 'Emotional and atmospheric moods',
  subcategories: [
    {
      id: 'positive',
      label: 'Positive',
      tagIds: ['happy', 'euphoric', 'peaceful', 'romantic', 'hopeful'],
    },
    {
      id: 'negative',
      label: 'Negative',
      tagIds: ['sad', 'melancholic', 'ominous', 'tense', 'anxious'],
    },
    {
      id: 'intense',
      label: 'Intense',
      tagIds: ['energetic', 'epic', 'heroic', 'chaotic', 'aggressive'],
    },
    {
      id: 'subtle',
      label: 'Subtle',
      tagIds: ['mysterious', 'contemplative', 'nostalgic', 'bittersweet', 'wistful'],
    },
    {
      id: 'atmospheric',
      label: 'Atmospheric',
      tagIds: ['dreamy', 'ethereal', 'surreal', 'eerie', 'haunting'],
    },
  ],
  tags: [
    // Positive
    {
      id: 'happy',
      name: 'Happy',
      prompt: 'happy joyful mood, bright warm atmosphere',
      description: 'Joyful and bright',
    },
    {
      id: 'euphoric',
      name: 'Euphoric',
      prompt: 'euphoric ecstatic mood, overwhelming joy',
      description: 'Overwhelming happiness',
    },
    {
      id: 'peaceful',
      name: 'Peaceful',
      prompt: 'peaceful calm mood, serene tranquil',
      description: 'Calm and serene',
    },
    {
      id: 'romantic',
      name: 'Romantic',
      prompt: 'romantic intimate mood, warm loving',
      description: 'Love and intimacy',
    },
    {
      id: 'hopeful',
      name: 'Hopeful',
      prompt: 'hopeful optimistic mood, uplifting',
      description: 'Optimistic expectation',
    },
    // Negative
    {
      id: 'sad',
      name: 'Sad',
      prompt: 'sad melancholy mood, somber emotional',
      description: 'Sorrow and grief',
    },
    {
      id: 'melancholic',
      name: 'Melancholic',
      prompt: 'melancholic wistful mood, beautiful sadness',
      description: 'Bittersweet sadness',
    },
    {
      id: 'ominous',
      name: 'Ominous',
      prompt: 'ominous foreboding mood, impending doom',
      description: 'Threatening atmosphere',
    },
    {
      id: 'tense',
      name: 'Tense',
      prompt: 'tense suspenseful mood, anxiety building',
      description: 'Suspense and tension',
    },
    {
      id: 'anxious',
      name: 'Anxious',
      prompt: 'anxious uneasy mood, nervous energy',
      description: 'Nervous unease',
    },
    // Intense
    {
      id: 'energetic',
      name: 'Energetic',
      prompt: 'energetic dynamic mood, high energy',
      description: 'High energy dynamic',
    },
    {
      id: 'epic',
      name: 'Epic',
      prompt: 'epic grand mood, monumental scale',
      description: 'Grand and monumental',
    },
    {
      id: 'heroic',
      name: 'Heroic',
      prompt: 'heroic triumphant mood, courageous',
      description: 'Triumph and courage',
    },
    {
      id: 'chaotic',
      name: 'Chaotic',
      prompt: 'chaotic frenzied mood, disorder',
      description: 'Disorder and frenzy',
    },
    {
      id: 'aggressive',
      name: 'Aggressive',
      prompt: 'aggressive intense mood, forceful',
      description: 'Forceful intensity',
    },
    // Subtle
    {
      id: 'mysterious',
      name: 'Mysterious',
      prompt: 'mysterious enigmatic mood, unknown',
      description: 'Enigmatic unknown',
    },
    {
      id: 'contemplative',
      name: 'Contemplative',
      prompt: 'contemplative thoughtful mood, introspective',
      description: 'Deep thought',
    },
    {
      id: 'nostalgic',
      name: 'Nostalgic',
      prompt: 'nostalgic reminiscent mood, memory',
      description: 'Fond remembrance',
    },
    {
      id: 'bittersweet',
      name: 'Bittersweet',
      prompt: 'bittersweet mood, joy with sadness',
      description: 'Mixed emotions',
    },
    {
      id: 'wistful',
      name: 'Wistful',
      prompt: 'wistful longing mood, gentle yearning',
      description: 'Gentle longing',
    },
    // Atmospheric
    {
      id: 'dreamy',
      name: 'Dreamy',
      prompt: 'dreamy ethereal mood, soft hazy',
      description: 'Soft dreamlike',
    },
    {
      id: 'ethereal',
      name: 'Ethereal',
      prompt: 'ethereal otherworldly mood, transcendent',
      description: 'Otherworldly',
    },
    {
      id: 'surreal',
      name: 'Surreal',
      prompt: 'surreal bizarre mood, dreamlike strange',
      description: 'Strange dreamlike',
    },
    {
      id: 'eerie',
      name: 'Eerie',
      prompt: 'eerie unsettling mood, strange unease',
      description: 'Strange unease',
    },
    {
      id: 'haunting',
      name: 'Haunting',
      prompt: 'haunting lingering mood, memorable disturbing',
      description: 'Memorable disturbing',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_CATEGORIES: TagCategory[] = [
  CAMERAS,
  LENSES,
  FILM_STOCK,
  COLOR_GRADES,
  LIGHTING,
  MOTION,
  MOODS,
];

export const CATEGORY_MAP: Record<string, TagCategory> = {
  cameras: CAMERAS,
  lenses: LENSES,
  films: FILM_STOCK,
  colors: COLOR_GRADES,
  lighting: LIGHTING,
  cameraMotions: MOTION,
  moods: MOODS,
};

/**
 * Get all tags from all categories as a flat array
 */
export function getAllTags(): CinematicTag[] {
  return ALL_CATEGORIES.flatMap(cat => cat.tags);
}

/**
 * Get a tag by ID across all categories
 */
export function getTagById(id: string): CinematicTag | undefined {
  for (const cat of ALL_CATEGORIES) {
    const tag = cat.tags.find(t => t.id === id);
    if (tag) return tag;
  }
  return undefined;
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): TagCategory | undefined {
  return CATEGORY_MAP[id];
}

/**
 * Get tags for a specific subcategory
 */
export function getTagsForSubcategory(categoryId: string, subcategoryId: string): CinematicTag[] {
  const category = CATEGORY_MAP[categoryId];
  if (!category) return [];

  const subcategory = category.subcategories?.find(s => s.id === subcategoryId);
  if (!subcategory) return [];

  return subcategory.tagIds
    .map(id => category.tags.find(t => t.id === id))
    .filter((t): t is CinematicTag => t !== undefined);
}

/**
 * Search tags across all categories
 */
export function searchTags(query: string): CinematicTag[] {
  const lowerQuery = query.toLowerCase();
  return getAllTags().filter(
    tag =>
      tag.name.toLowerCase().includes(lowerQuery) ||
      tag.prompt.toLowerCase().includes(lowerQuery) ||
      tag.description?.toLowerCase().includes(lowerQuery)
  );
}

// Legacy compatibility - export simple arrays for backward compatibility
export const ADVANCED_OPTIONS = {
  cameras: CAMERAS.tags.map(t => t.name),
  lenses: LENSES.tags.map(t => t.name),
  films: FILM_STOCK.tags.map(t => t.name),
  colors: COLOR_GRADES.tags.map(t => t.name),
  lighting: LIGHTING.tags.map(t => t.name),
  cameraMotions: MOTION.tags.map(t => t.name),
  moods: MOODS.tags.map(t => t.name),
};

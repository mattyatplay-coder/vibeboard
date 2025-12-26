/**
 * Camera Presets Library
 *
 * 50+ professional camera movements organized into 10 categories.
 * Inspired by Higgsfield's camera system with genre-aware recommendations.
 *
 * Each preset includes:
 * - id: Unique identifier
 * - name: Display name
 * - prompt: Text to append to generation prompt
 * - description: Tooltip explanation
 * - genres: Array of genres where this move is recommended
 */

export interface CameraPreset {
  id: string;
  name: string;
  prompt: string;
  description: string;
  genres: Genre[];
}

export interface CameraCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  presets: CameraPreset[];
}

export type Genre =
  | 'film_noir'
  | 'action'
  | 'horror'
  | 'romance'
  | 'documentary'
  | 'sci_fi'
  | 'comedy'
  | 'thriller'
  | 'drama'
  | 'music_video'
  | 'commercial'
  | 'western'
  | 'fantasy'
  | 'adult' // Mature content - only visible when allowNSFW is enabled
  | 'hardcore'; // Explicit adult content - only visible when allowNSFW is enabled

export const CAMERA_PRESETS: Record<string, CameraCategory> = {
  // ═══════════════════════════════════════════════════════════════════
  // ZOOM FAMILY (8 presets)
  // ═══════════════════════════════════════════════════════════════════
  zoom: {
    id: 'zoom',
    label: 'Zoom',
    icon: '🔍',
    description: 'Lens-based zoom movements',
    presets: [
      {
        id: 'zoom_in',
        name: 'Zoom In',
        prompt: 'slow zoom in toward subject',
        description: 'Gradual zoom toward subject, draws attention and builds intimacy',
        genres: ['drama', 'thriller', 'horror', 'documentary'],
      },
      {
        id: 'zoom_out',
        name: 'Zoom Out',
        prompt: 'slow zoom out revealing scene',
        description: 'Gradual zoom away from subject, reveals context and environment',
        genres: ['drama', 'documentary', 'fantasy', 'sci_fi'],
      },
      {
        id: 'crash_zoom_in',
        name: 'Crash Zoom In',
        prompt: 'rapid crash zoom in dramatic',
        description: 'Ultra-fast zoom toward subject for shock or urgency',
        genres: ['action', 'horror', 'comedy', 'music_video'],
      },
      {
        id: 'crash_zoom_out',
        name: 'Crash Zoom Out',
        prompt: 'rapid crash zoom out revealing',
        description: 'Ultra-fast zoom away for sudden revelation or comedic effect',
        genres: ['action', 'comedy', 'music_video'],
      },
      {
        id: 'rapid_zoom_in',
        name: 'Rapid Zoom In',
        prompt: 'fast zoom in emphasizing',
        description: 'Quick but controlled zoom for emphasis, smoother than crash zoom',
        genres: ['action', 'thriller', 'music_video'],
      },
      {
        id: 'rapid_zoom_out',
        name: 'Rapid Zoom Out',
        prompt: 'fast zoom out scene reveal',
        description: 'Quick pull back revealing environment or context',
        genres: ['action', 'thriller', 'documentary'],
      },
      {
        id: 'dolly_zoom_in',
        name: 'Dolly Zoom In',
        prompt: 'vertigo dolly zoom effect background stretching',
        description:
          'Hitchcock Vertigo effect - zoom + dolly creates disorienting perspective shift',
        genres: ['horror', 'thriller', 'film_noir', 'drama'],
      },
      {
        id: 'dolly_zoom_out',
        name: 'Dolly Zoom Out',
        prompt: 'reverse vertigo dolly zoom background compressing',
        description: 'Reverse Vertigo effect for disorientation or realization moments',
        genres: ['horror', 'thriller', 'drama'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // DOLLY FAMILY (7 presets)
  // ═══════════════════════════════════════════════════════════════════
  dolly: {
    id: 'dolly',
    label: 'Dolly',
    icon: '🎬',
    description: 'Camera movement on tracks or wheels',
    presets: [
      {
        id: 'dolly_in',
        name: 'Dolly In',
        prompt: 'smooth dolly push in toward subject',
        description: 'Camera physically moves toward subject, creates intimacy and focus',
        genres: ['drama', 'romance', 'thriller', 'film_noir'],
      },
      {
        id: 'dolly_out',
        name: 'Dolly Out',
        prompt: 'smooth dolly pull out from subject',
        description: 'Camera physically moves away, reveals context or creates distance',
        genres: ['drama', 'documentary', 'fantasy'],
      },
      {
        id: 'dolly_left',
        name: 'Dolly Left',
        prompt: 'lateral dolly tracking left smooth',
        description: 'Camera slides left parallel to action, follows movement or reveals scene',
        genres: ['action', 'thriller', 'drama', 'documentary'],
      },
      {
        id: 'dolly_right',
        name: 'Dolly Right',
        prompt: 'lateral dolly tracking right smooth',
        description: 'Camera slides right parallel to action',
        genres: ['action', 'thriller', 'drama', 'documentary'],
      },
      {
        id: 'super_dolly_in',
        name: 'Super Dolly In',
        prompt: 'extended smooth dolly push in dramatic approach',
        description: 'Long, dramatic push toward subject for emotional crescendo',
        genres: ['drama', 'romance', 'fantasy', 'film_noir'],
      },
      {
        id: 'super_dolly_out',
        name: 'Super Dolly Out',
        prompt: 'extended smooth dolly pull out grand reveal',
        description: 'Long pull back for epic reveals or emotional distance',
        genres: ['drama', 'fantasy', 'documentary', 'western'],
      },
      {
        id: 'double_dolly',
        name: 'Double Dolly',
        prompt: 'dolly movement combined with secondary motion',
        description: 'Complex dolly with direction change or combined movement',
        genres: ['action', 'music_video', 'commercial'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CRANE FAMILY (5 presets)
  // ═══════════════════════════════════════════════════════════════════
  crane: {
    id: 'crane',
    label: 'Crane',
    icon: '🏗️',
    description: 'Vertical camera movements on crane or jib',
    presets: [
      {
        id: 'crane_up',
        name: 'Crane Up',
        prompt: 'crane shot rising up smoothly',
        description: 'Camera rises vertically, reveals scope or elevates subject',
        genres: ['drama', 'fantasy', 'romance', 'documentary'],
      },
      {
        id: 'crane_down',
        name: 'Crane Down',
        prompt: 'crane shot descending smoothly',
        description: 'Camera lowers vertically, grounds scene or creates intimacy',
        genres: ['drama', 'horror', 'thriller', 'documentary'],
      },
      {
        id: 'crane_over',
        name: 'Crane Over',
        prompt: 'crane arcing over the head dramatic reveal',
        description: 'Camera arcs over subject for dramatic perspective shift',
        genres: ['action', 'drama', 'fantasy', 'music_video'],
      },
      {
        id: 'jib_up',
        name: 'Jib Up',
        prompt: 'jib arm rising smoothly upward',
        description: 'Smaller vertical rise, more intimate than full crane',
        genres: ['drama', 'commercial', 'music_video', 'documentary'],
      },
      {
        id: 'jib_down',
        name: 'Jib Down',
        prompt: 'jib arm lowering smoothly downward',
        description: 'Gentle descent toward subject or action',
        genres: ['drama', 'documentary', 'romance'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // PAN & TILT FAMILY (5 presets)
  // ═══════════════════════════════════════════════════════════════════
  pan_tilt: {
    id: 'pan_tilt',
    label: 'Pan/Tilt',
    icon: '↔️',
    description: 'Camera rotation on fixed point',
    presets: [
      {
        id: 'pan_left',
        name: 'Pan Left',
        prompt: 'smooth pan left horizontal rotation',
        description: 'Camera rotates left on axis, follows action or reveals scene',
        genres: ['documentary', 'drama', 'western', 'action'],
      },
      {
        id: 'pan_right',
        name: 'Pan Right',
        prompt: 'smooth pan right horizontal rotation',
        description: 'Camera rotates right on axis',
        genres: ['documentary', 'drama', 'western', 'action'],
      },
      {
        id: 'tilt_up',
        name: 'Tilt Up',
        prompt: 'smooth tilt up vertical rotation looking upward',
        description: 'Camera tilts upward, reveals height or creates awe',
        genres: ['fantasy', 'sci_fi', 'drama', 'documentary'],
      },
      {
        id: 'tilt_down',
        name: 'Tilt Down',
        prompt: 'smooth tilt down vertical rotation looking downward',
        description: 'Camera tilts downward, grounds scene or reveals floor-level action',
        genres: ['horror', 'thriller', 'drama', 'documentary'],
      },
      {
        id: 'whip_pan',
        name: 'Whip Pan',
        prompt: 'ultra fast whip pan motion blur transition',
        description: 'Ultra-fast pan creating motion blur, used for transitions or energy',
        genres: ['comedy', 'action', 'music_video', 'thriller'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // ORBITAL FAMILY (5 presets)
  // ═══════════════════════════════════════════════════════════════════
  orbital: {
    id: 'orbital',
    label: 'Orbit',
    icon: '🔄',
    description: 'Camera circles around subject',
    presets: [
      {
        id: 'orbit_360',
        name: '360° Orbit',
        prompt: 'camera orbiting 360 degrees around subject complete circle',
        description: 'Full rotation around subject for hero moments or reveals',
        genres: ['action', 'music_video', 'commercial', 'fantasy'],
      },
      {
        id: 'arc_left',
        name: 'Arc Left',
        prompt: 'camera arcing left around subject partial orbit',
        description: 'Partial orbit moving left around subject',
        genres: ['drama', 'thriller', 'romance', 'documentary'],
      },
      {
        id: 'arc_right',
        name: 'Arc Right',
        prompt: 'camera arcing right around subject partial orbit',
        description: 'Partial orbit moving right around subject',
        genres: ['drama', 'thriller', 'romance', 'documentary'],
      },
      {
        id: 'lazy_susan',
        name: 'Lazy Susan',
        prompt: 'slow rotating camera movement gentle orbit',
        description: 'Slow, gentle rotation around subject, meditative quality',
        genres: ['commercial', 'drama', 'documentary', 'romance'],
      },
      {
        id: '3d_rotation',
        name: '3D Rotation',
        prompt: 'complex 3D camera rotation multi-axis movement',
        description: 'Multi-axis rotation for dynamic, disorienting effect',
        genres: ['action', 'music_video', 'sci_fi', 'fantasy'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // SPECIALTY EFFECTS (8 presets)
  // ═══════════════════════════════════════════════════════════════════
  specialty: {
    id: 'specialty',
    label: 'Specialty',
    icon: '✨',
    description: 'Special camera techniques and effects',
    presets: [
      {
        id: 'bullet_time',
        name: 'Bullet Time',
        prompt: 'bullet time frozen moment multi-angle rotating slow motion',
        description: 'Matrix-style frozen moment with camera movement',
        genres: ['action', 'sci_fi', 'music_video', 'fantasy'],
      },
      {
        id: 'snorricam',
        name: 'Snorricam',
        prompt: 'snorricam attached to subject body mount walking',
        description: 'Camera mounted on subject, background moves while subject stays centered',
        genres: ['thriller', 'horror', 'drama', 'music_video'],
      },
      {
        id: 'dutch_angle',
        name: 'Dutch Angle',
        prompt: 'tilted dutch angle disorienting canted frame',
        description: 'Tilted camera for unease, tension, or stylization',
        genres: ['horror', 'thriller', 'film_noir', 'music_video'],
      },
      {
        id: 'fisheye',
        name: 'Fisheye',
        prompt: 'fisheye wide angle distorted lens extreme wide',
        description: 'Ultra-wide distorted view for surreal or energetic feel',
        genres: ['music_video', 'comedy', 'action', 'documentary'],
      },
      {
        id: 'fpv_drone',
        name: 'FPV Drone',
        prompt: 'FPV drone flying through immersive first person flight',
        description: 'First-person drone footage, immersive flying through spaces',
        genres: ['action', 'music_video', 'sci_fi', 'documentary'],
      },
      {
        id: 'through_object',
        name: 'Through Object',
        prompt: 'camera passing through object impossible shot',
        description: 'Camera appears to pass through solid objects',
        genres: ['music_video', 'sci_fi', 'fantasy', 'commercial'],
      },
      {
        id: 'focus_rack',
        name: 'Rack Focus',
        prompt: 'rack focus shifting depth of field foreground to background',
        description: 'Focus shifts between foreground and background subjects',
        genres: ['drama', 'thriller', 'documentary', 'romance'],
      },
      {
        id: 'low_shutter',
        name: 'Low Shutter',
        prompt: 'motion blur low shutter speed dreamy blur',
        description: 'Motion blur effect for dreamy or chaotic feel',
        genres: ['horror', 'music_video', 'drama', 'thriller'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // VEHICLE & ACTION (5 presets)
  // ═══════════════════════════════════════════════════════════════════
  vehicle: {
    id: 'vehicle',
    label: 'Vehicle',
    icon: '🚗',
    description: 'Camera movements with vehicles',
    presets: [
      {
        id: 'car_chase',
        name: 'Car Chase',
        prompt: 'car chase following vehicle pursuit tracking',
        description: 'Camera follows or pursues moving vehicle',
        genres: ['action', 'thriller', 'documentary'],
      },
      {
        id: 'car_interior',
        name: 'Car Interior',
        prompt: 'inside car interior POV dashboard mounted',
        description: 'Camera inside vehicle looking at occupants or through windshield',
        genres: ['drama', 'thriller', 'documentary', 'comedy'],
      },
      {
        id: 'buckle_up',
        name: 'Buckle Up',
        prompt: 'buckled in car POV passenger view driving',
        description: 'Passenger perspective inside moving vehicle',
        genres: ['drama', 'thriller', 'documentary'],
      },
      {
        id: 'road_rush',
        name: 'Road Rush',
        prompt: 'speeding road rush effect fast motion low angle road',
        description: 'Low angle on road surface with speed effect',
        genres: ['action', 'music_video', 'commercial'],
      },
      {
        id: 'hero_cam',
        name: 'Hero Cam',
        prompt: 'heroic low angle looking up powerful imposing',
        description: 'Low angle making subject appear powerful and heroic',
        genres: ['action', 'fantasy', 'sci_fi', 'commercial'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // CHARACTER FOCUSED (5 presets)
  // ═══════════════════════════════════════════════════════════════════
  character: {
    id: 'character',
    label: 'Character',
    icon: '👤',
    description: 'Subject-focused camera techniques',
    presets: [
      {
        id: 'eyes_in',
        name: 'Eyes In',
        prompt: 'slow zoom into eyes close up emotional',
        description: "Zoom into subject's eyes for emotional connection",
        genres: ['drama', 'thriller', 'horror', 'romance'],
      },
      {
        id: 'hero_shot',
        name: 'Hero Shot',
        prompt: 'low angle hero shot looking up powerful dramatic',
        description: 'Classic hero framing from below, emphasizes power',
        genres: ['action', 'fantasy', 'sci_fi', 'western'],
      },
      {
        id: 'head_tracking',
        name: 'Head Track',
        prompt: 'tracking subject head movement following face',
        description: "Camera follows subject's head movement naturally",
        genres: ['documentary', 'drama', 'thriller'],
      },
      {
        id: 'glam',
        name: 'Glam Shot',
        prompt: 'glamorous beauty shot soft lighting flattering angle',
        description: 'Flattering angle with soft lighting for beauty',
        genres: ['commercial', 'music_video', 'romance', 'drama'],
      },
      {
        id: 'over_shoulder',
        name: 'Over Shoulder',
        prompt: 'over the shoulder shot dialogue framing',
        description: "Classic dialogue framing over one subject's shoulder",
        genres: ['drama', 'thriller', 'romance', 'documentary'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // HANDHELD & DOCUMENTARY (4 presets)
  // ═══════════════════════════════════════════════════════════════════
  handheld: {
    id: 'handheld',
    label: 'Handheld',
    icon: '🤚',
    description: 'Handheld and stabilized camera work',
    presets: [
      {
        id: 'handheld',
        name: 'Handheld',
        prompt: 'handheld shaky camera realistic documentary style',
        description: 'Natural camera shake for authenticity and immediacy',
        genres: ['documentary', 'horror', 'drama', 'action'],
      },
      {
        id: 'steadicam',
        name: 'Steadicam',
        prompt: 'steadicam smooth following floating movement',
        description: 'Smooth handheld following subject, gliding quality',
        genres: ['thriller', 'horror', 'drama', 'documentary'],
      },
      {
        id: 'gimbal',
        name: 'Gimbal',
        prompt: 'gimbal stabilized smooth dynamic movement',
        description: 'Modern stabilized movement, smoother than handheld',
        genres: ['action', 'music_video', 'commercial', 'documentary'],
      },
      {
        id: 'shaky_intense',
        name: 'Shaky Intense',
        prompt: 'intense shaky camera chaotic handheld urgent',
        description: 'Exaggerated shake for chaos, urgency, or found footage feel',
        genres: ['horror', 'action', 'thriller'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // STATIC & LOCKED (3 presets)
  // ═══════════════════════════════════════════════════════════════════
  static: {
    id: 'static',
    label: 'Static',
    icon: '📍',
    description: 'Locked-off camera positions',
    presets: [
      {
        id: 'static',
        name: 'Static',
        prompt: 'static locked off camera stationary tripod',
        description: 'Completely still camera, lets action play in frame',
        genres: ['drama', 'horror', 'comedy', 'documentary', 'film_noir'],
      },
      {
        id: 'overhead',
        name: 'Overhead',
        prompt: "overhead bird's eye view looking straight down",
        description: 'Top-down view for patterns, geography, or godlike perspective',
        genres: ['documentary', 'thriller', 'drama', 'action'],
      },
      {
        id: 'worms_eye',
        name: "Worm's Eye",
        prompt: "worm's eye view extreme low angle looking up from ground",
        description: 'Extreme low angle from ground level looking up',
        genres: ['horror', 'fantasy', 'action', 'drama'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIMELAPSE & SPEED (4 presets)
  // ═══════════════════════════════════════════════════════════════════
  timelapse: {
    id: 'timelapse',
    label: 'Timelapse',
    icon: '⏱️',
    description: 'Time manipulation techniques',
    presets: [
      {
        id: 'hyperlapse',
        name: 'Hyperlapse',
        prompt: 'hyperlapse moving through space timelapse with motion',
        description: 'Moving timelapse through environment',
        genres: ['documentary', 'commercial', 'music_video', 'sci_fi'],
      },
      {
        id: 'timelapse_sky',
        name: 'Sky Timelapse',
        prompt: 'timelapse of sky clouds moving sun tracking',
        description: 'Classic sky/cloud timelapse for time passage',
        genres: ['documentary', 'drama', 'fantasy', 'western'],
      },
      {
        id: 'timelapse_city',
        name: 'City Timelapse',
        prompt: 'city timelapse day to night urban traffic lights',
        description: 'Urban timelapse showing passage of time',
        genres: ['documentary', 'drama', 'commercial', 'sci_fi'],
      },
      {
        id: 'yoyo_zoom',
        name: 'YoYo Zoom',
        prompt: 'rhythmic zoom in and out pulsing yoyo effect',
        description: 'Rhythmic zoom in/out synced to music or action',
        genres: ['music_video', 'comedy', 'commercial'],
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all presets as a flat array
 */
export function getAllPresets(): CameraPreset[] {
  return Object.values(CAMERA_PRESETS).flatMap(category => category.presets);
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): CameraPreset | undefined {
  for (const category of Object.values(CAMERA_PRESETS)) {
    const preset = category.presets.find(p => p.id === id);
    if (preset) return preset;
  }
  return undefined;
}

/**
 * Get presets recommended for a specific genre
 */
export function getPresetsForGenre(genre: Genre): CameraPreset[] {
  return getAllPresets().filter(preset => preset.genres.includes(genre));
}

/**
 * Get presets NOT recommended for a genre (for "avoided" list)
 */
export function getPresetsToAvoidForGenre(genre: Genre): CameraPreset[] {
  return getAllPresets().filter(preset => !preset.genres.includes(genre));
}

/**
 * Check if a preset is recommended for a genre
 */
export function isPresetRecommendedForGenre(presetId: string, genre: Genre): boolean {
  const preset = getPresetById(presetId);
  return preset ? preset.genres.includes(genre) : false;
}

/**
 * Get category for a preset
 */
export function getCategoryForPreset(presetId: string): CameraCategory | undefined {
  for (const category of Object.values(CAMERA_PRESETS)) {
    if (category.presets.some(p => p.id === presetId)) {
      return category;
    }
  }
  return undefined;
}

/**
 * Count total presets
 */
export function getTotalPresetCount(): number {
  return getAllPresets().length;
}

/**
 * Get all category IDs
 */
export function getCategoryIds(): string[] {
  return Object.keys(CAMERA_PRESETS);
}

// Export preset count for reference
export const TOTAL_PRESETS = getTotalPresetCount(); // Should be 54

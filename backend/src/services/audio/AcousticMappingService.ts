/**
 * Acoustic Mapping Service - Perspective-Matched Audio Generation
 *
 * The "secret sauce" of high-end cinema: the eyes and the ears must agree
 * on the size of the space. This service translates visual camera settings
 * (focal length, lighting mood) into acoustic parameters.
 *
 * Key Principle:
 * - Wide shots (14mm) = Distant environmental sound, high reverb, expansive
 * - Normal shots (50mm) = Natural room tone, balanced acoustics
 * - Tight shots (135mm) = Intimate, dry, hyper-detailed foley
 *
 * This creates "Biological Truth" - making AI video feel physically real.
 */

import { ShotRecipe } from '../rendering/RenderQueueTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface AcousticRecipe {
  // The generated prompt for audio models (MMAudio, ElevenLabs, etc.)
  prompt: string;

  // Core acoustic parameters (0-1 scale)
  reverbLevel: number; // 0 = bone dry, 1 = cathedral wash
  stereoWidth: number; // 0 = mono, 1 = ultra-wide stereo
  foleyDetail: number; // 0 = distant ambiance, 1 = close-mic textures

  // Derived visual state
  acousticProfile: AcousticProfile;
  focalLength: number;

  // Mood modifiers from lighting
  moodPrompt: string;
  isNoir: boolean;
}

export type AcousticProfile = 'environment' | 'dialogue' | 'intimacy';

export interface LensAcousticMapping {
  focalRange: [number, number]; // min, max mm
  profile: AcousticProfile;
  reverb: number;
  stereoWidth: number;
  foleyDetail: number;
  sonicKeywords: string[];
  description: string;
}

// ============================================================================
// LENS-TO-REVERB MAPPING TABLE (The "Audio LUT")
// ============================================================================

export const LENS_ACOUSTIC_MAPPINGS: LensAcousticMapping[] = [
  {
    focalRange: [14, 24],
    profile: 'environment',
    reverb: 0.85,
    stereoWidth: 1.0,
    foleyDetail: 0.2,
    sonicKeywords: [
      'distant environmental sound',
      'expansive reverb',
      'huge hall acoustics',
      'atmospheric hum',
      'vast spatial width',
      'echoing room tone',
      'wide soundstage',
    ],
    description: 'LARGE ENCLOSURE - DIFFUSED',
  },
  {
    focalRange: [24, 35],
    profile: 'dialogue',
    reverb: 0.65,
    stereoWidth: 0.8,
    foleyDetail: 0.4,
    sonicKeywords: [
      'environmental ambiance',
      'natural room echo',
      'spacious acoustics',
      'airy sound design',
      'moderate reverb tail',
    ],
    description: 'NATURAL ROOM - SPACIOUS',
  },
  {
    focalRange: [35, 50],
    profile: 'dialogue',
    reverb: 0.45,
    stereoWidth: 0.6,
    foleyDetail: 0.65,
    sonicKeywords: [
      'natural room tone',
      'balanced acoustics',
      'clear presence',
      'standard perspective',
      'conversational distance',
    ],
    description: 'BALANCED - NATURAL',
  },
  {
    focalRange: [50, 85],
    profile: 'dialogue',
    reverb: 0.35,
    stereoWidth: 0.45,
    foleyDetail: 0.75,
    sonicKeywords: [
      'reduced room ambiance',
      'subject focus',
      'moderate proximity',
      'clear dialogue',
    ],
    description: 'FOCUSED - PRESENT',
  },
  {
    focalRange: [85, 135],
    profile: 'intimacy',
    reverb: 0.15,
    stereoWidth: 0.25,
    foleyDetail: 0.9,
    sonicKeywords: [
      'close-mic',
      'intimate acoustics',
      'studio dry',
      'crisp textures',
      'proximity effect',
      'detailed foley',
    ],
    description: 'STUDIO DRY - INTIMATE',
  },
  {
    focalRange: [135, 500],
    profile: 'intimacy',
    reverb: 0.05,
    stereoWidth: 0.1,
    foleyDetail: 1.0,
    sonicKeywords: [
      'hyper-detailed foley',
      'zero reverb',
      'bone dry',
      'isolated textures',
      'macro-sound',
      'breathing audible',
      'fabric rustle',
    ],
    description: 'HYPER-INTIMATE - ISOLATED',
  },
];

// ============================================================================
// MOOD MAPPING (Lighting → Sonic Texture)
// ============================================================================

export interface MoodAcousticMapping {
  mood: string;
  keywords: string[];
  lowFrequencyBias: number; // 0 = bright, 1 = dark/bassy
}

export const MOOD_ACOUSTIC_MAPPINGS: MoodAcousticMapping[] = [
  {
    mood: 'noir',
    keywords: [
      'dark brooding low-frequency drone',
      'moody silence',
      'tense undertones',
      'shadowy ambiance',
    ],
    lowFrequencyBias: 0.8,
  },
  {
    mood: 'horror',
    keywords: ['unsettling dissonance', 'creeping dread', 'sudden silence', 'low rumble'],
    lowFrequencyBias: 0.7,
  },
  {
    mood: 'romantic',
    keywords: ['warm tones', 'soft ambiance', 'gentle presence', 'intimate whispers'],
    lowFrequencyBias: 0.3,
  },
  {
    mood: 'action',
    keywords: ['punchy dynamics', 'impactful bass', 'crisp transients', 'explosive energy'],
    lowFrequencyBias: 0.6,
  },
  {
    mood: 'ethereal',
    keywords: ['airy reverb', 'crystalline tones', 'floating ambiance', 'dreamlike wash'],
    lowFrequencyBias: 0.2,
  },
  {
    mood: 'suspense',
    keywords: ['building tension', 'held breath', 'quiet before storm', 'subtle unease'],
    lowFrequencyBias: 0.5,
  },
];

// ============================================================================
// GENRE IMPULSE RESPONSE RECOMMENDATIONS
// ============================================================================

export interface GenreIRRecommendation {
  genre: string;
  irType: string;
  description: string;
  reverbCharacter: string;
}

export const GENRE_IR_RECOMMENDATIONS: GenreIRRecommendation[] = [
  {
    genre: 'sci-fi',
    irType: 'metallic_hall',
    description: 'Metallic/Industrial reverb',
    reverbCharacter: 'cold, reflective, spaceship corridors',
  },
  {
    genre: 'western',
    irType: 'canyon',
    description: 'Open Canyon reverb',
    reverbCharacter: 'vast, natural, desert echo',
  },
  {
    genre: 'horror',
    irType: 'basement',
    description: 'Dark Basement reverb',
    reverbCharacter: 'claustrophobic, damp, unsettling',
  },
  {
    genre: 'fantasy',
    irType: 'cathedral',
    description: 'Stone Cathedral reverb',
    reverbCharacter: 'majestic, ancient, mystical',
  },
  {
    genre: 'noir',
    irType: 'jazz_club',
    description: 'Smoky Jazz Club reverb',
    reverbCharacter: 'intimate, warm, vintage',
  },
  {
    genre: 'thriller',
    irType: 'parking_garage',
    description: 'Concrete Parking Garage',
    reverbCharacter: 'cold, urban, echoey',
  },
  {
    genre: 'romance',
    irType: 'living_room',
    description: 'Warm Living Room',
    reverbCharacter: 'cozy, intimate, natural',
  },
  {
    genre: 'action',
    irType: 'stadium',
    description: 'Large Stadium/Arena',
    reverbCharacter: 'massive, impactful, energetic',
  },
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AcousticMappingService {
  private static instance: AcousticMappingService;

  static getInstance(): AcousticMappingService {
    if (!AcousticMappingService.instance) {
      AcousticMappingService.instance = new AcousticMappingService();
    }
    return AcousticMappingService.instance;
  }

  /**
   * Calculate acoustic recipe from shot recipe
   * This is the main entry point for the service
   */
  calculateAcousticRecipe(recipe: ShotRecipe): AcousticRecipe {
    // Extract focal length from lens kit (e.g., 'storyteller-35' -> 35)
    const focalLength = this.extractFocalLength(recipe.lensKit?.lensId);

    // Find matching acoustic mapping
    const mapping = this.getLensMapping(focalLength);

    // Detect mood from cinematic tags and lighting
    const { moodPrompt, isNoir } = this.analyzeMood(recipe);

    // Build the spatial prompt based on focal length
    const spatialPrompt = mapping.sonicKeywords.slice(0, 3).join(', ');

    // Combine all elements into final audio prompt
    const fullPrompt = this.buildFullPrompt(spatialPrompt, moodPrompt, recipe.prompt);

    return {
      prompt: fullPrompt,
      reverbLevel: mapping.reverb,
      stereoWidth: mapping.stereoWidth,
      foleyDetail: mapping.foleyDetail,
      acousticProfile: mapping.profile,
      focalLength,
      moodPrompt,
      isNoir,
    };
  }

  /**
   * Extract numerical focal length from lens ID
   */
  private extractFocalLength(lensId: string | null | undefined): number {
    if (!lensId) return 50; // Default to natural perspective

    // Try to extract number from strings like 'storyteller-35', 'lens-85mm', '50mm', etc.
    const match = lensId.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return 50; // Default
  }

  /**
   * Find the acoustic mapping for a given focal length
   */
  getLensMapping(focalLength: number): LensAcousticMapping {
    for (const mapping of LENS_ACOUSTIC_MAPPINGS) {
      const [min, max] = mapping.focalRange;
      if (focalLength >= min && focalLength < max) {
        return mapping;
      }
    }

    // Default to the last mapping (telephoto) if beyond range
    return LENS_ACOUSTIC_MAPPINGS[LENS_ACOUSTIC_MAPPINGS.length - 1];
  }

  /**
   * Analyze mood from recipe's cinematic tags and lighting
   */
  private analyzeMood(recipe: ShotRecipe): { moodPrompt: string; isNoir: boolean } {
    const moodTag = recipe.cinematicTags?.mood?.toLowerCase() || '';
    const lightingPrompt = recipe.lightingSetup?.promptModifier?.toLowerCase() || '';

    // Check for noir/dark moods
    const isNoir =
      moodTag.includes('noir') ||
      moodTag.includes('dark') ||
      moodTag.includes('moody') ||
      lightingPrompt.includes('low-key') ||
      lightingPrompt.includes('chiaroscuro');

    // Find matching mood mapping
    const moodMapping = MOOD_ACOUSTIC_MAPPINGS.find(
      m => moodTag.includes(m.mood) || lightingPrompt.includes(m.mood)
    );

    if (moodMapping) {
      return {
        moodPrompt: moodMapping.keywords.slice(0, 2).join(', '),
        isNoir,
      };
    }

    // Default mood based on noir detection
    if (isNoir) {
      return {
        moodPrompt: 'dark brooding atmosphere, moody undertones',
        isNoir: true,
      };
    }

    return {
      moodPrompt: 'clear natural tones, balanced ambiance',
      isNoir: false,
    };
  }

  /**
   * Build the complete audio generation prompt
   */
  private buildFullPrompt(spatialPrompt: string, moodPrompt: string, scenePrompt: string): string {
    // Extract audio-relevant keywords from scene prompt
    const audioContext = this.extractAudioContext(scenePrompt);

    return [spatialPrompt, moodPrompt, audioContext].filter(Boolean).join(', ');
  }

  /**
   * Extract audio-relevant context from scene prompt
   */
  private extractAudioContext(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const audioKeywords: string[] = [];

    // Environment detection
    if (lowerPrompt.includes('forest') || lowerPrompt.includes('jungle')) {
      audioKeywords.push('rustling leaves', 'distant bird calls');
    }
    if (
      lowerPrompt.includes('ocean') ||
      lowerPrompt.includes('beach') ||
      lowerPrompt.includes('water')
    ) {
      audioKeywords.push('ocean waves', 'water ambiance');
    }
    if (
      lowerPrompt.includes('city') ||
      lowerPrompt.includes('urban') ||
      lowerPrompt.includes('street')
    ) {
      audioKeywords.push('urban ambiance', 'distant traffic');
    }
    if (lowerPrompt.includes('rain') || lowerPrompt.includes('storm')) {
      audioKeywords.push('rain sounds', 'thunder');
    }
    if (lowerPrompt.includes('wind') || lowerPrompt.includes('windy')) {
      audioKeywords.push('wind howling');
    }
    if (lowerPrompt.includes('night') || lowerPrompt.includes('dark')) {
      audioKeywords.push('night ambiance', 'crickets');
    }

    // Action detection
    if (lowerPrompt.includes('running') || lowerPrompt.includes('chase')) {
      audioKeywords.push('footsteps', 'heavy breathing');
    }
    if (
      lowerPrompt.includes('fight') ||
      lowerPrompt.includes('battle') ||
      lowerPrompt.includes('combat')
    ) {
      audioKeywords.push('impact sounds', 'action foley');
    }

    return audioKeywords.slice(0, 3).join(', ');
  }

  /**
   * Get genre-appropriate impulse response recommendation
   */
  getGenreIRRecommendation(genre: string): GenreIRRecommendation | undefined {
    return GENRE_IR_RECOMMENDATIONS.find(ir => ir.genre.toLowerCase() === genre.toLowerCase());
  }

  /**
   * Calculate the acoustic profile description for UI display
   */
  getProfileDescription(focalLength: number): string {
    const mapping = this.getLensMapping(focalLength);
    return mapping.description;
  }

  /**
   * Get all acoustic mappings for UI display (e.g., reference table)
   */
  getAllMappings(): LensAcousticMapping[] {
    return LENS_ACOUSTIC_MAPPINGS;
  }

  /**
   * Calculate interpolated values for smooth UI transitions
   */
  getInterpolatedValues(focalLength: number): {
    reverb: number;
    stereoWidth: number;
    foleyDetail: number;
  } {
    // Find the two mappings we're between
    let lowerMapping = LENS_ACOUSTIC_MAPPINGS[0];
    let upperMapping = LENS_ACOUSTIC_MAPPINGS[LENS_ACOUSTIC_MAPPINGS.length - 1];

    for (let i = 0; i < LENS_ACOUSTIC_MAPPINGS.length - 1; i++) {
      const current = LENS_ACOUSTIC_MAPPINGS[i];
      const next = LENS_ACOUSTIC_MAPPINGS[i + 1];

      if (focalLength >= current.focalRange[0] && focalLength < next.focalRange[0]) {
        lowerMapping = current;
        upperMapping = next;
        break;
      }
    }

    // Calculate interpolation factor
    const range = upperMapping.focalRange[0] - lowerMapping.focalRange[0];
    const position = focalLength - lowerMapping.focalRange[0];
    const t = range > 0 ? Math.max(0, Math.min(1, position / range)) : 0;

    // Lerp between values
    return {
      reverb: lowerMapping.reverb + (upperMapping.reverb - lowerMapping.reverb) * t,
      stereoWidth:
        lowerMapping.stereoWidth + (upperMapping.stereoWidth - lowerMapping.stereoWidth) * t,
      foleyDetail:
        lowerMapping.foleyDetail + (upperMapping.foleyDetail - lowerMapping.foleyDetail) * t,
    };
  }
}

// Export singleton getter
export const getAcousticMappingService = () => AcousticMappingService.getInstance();

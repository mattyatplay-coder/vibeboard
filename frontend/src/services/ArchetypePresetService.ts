/**
 * ArchetypePresetService - Auto-selects Lens/Lighting/Audio presets based on archetype
 *
 * When a user selects a content creator archetype (e.g., "Tech Reviewer"),
 * this service provides the recommended presets for:
 * - Lens Kit (focal length, lens style)
 * - Virtual Gaffer (lighting preset)
 * - Acoustic Studio (audio settings)
 */

import { LensPreset, LENS_PRESETS } from '@/data/LensPresets';
import { LIGHTING_PRESETS, LightingPreset } from '@/lib/lightingStore';
import { AcousticSettings } from '@/components/audio/AcousticStudioPanel';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  settings: AcousticSettings;
}

export interface ArchetypePresets {
  /** Recommended lens focal length (mm) */
  lensId: string;
  /** Recommended lighting preset ID */
  lightingId: string;
  /** Recommended audio preset ID */
  audioId: string;
  /** Optional aspect ratio override */
  aspectRatio?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO PRESETS FOR CONTENT CREATORS
// ═══════════════════════════════════════════════════════════════════════════

export const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'broadcaster',
    name: 'Broadcaster',
    description: 'Clean, professional podcast/interview audio',
    settings: {
      reverbLevel: 0.15,
      stereoWidth: 0.4,
      foleyDetail: 0.8,
      atmosphereActionBalance: 0.3,
      syncToLens: false,
    },
  },
  {
    id: 'studio_clean',
    name: 'Studio Clean',
    description: 'Dead room, zero reverb for tech reviews',
    settings: {
      reverbLevel: 0.05,
      stereoWidth: 0.5,
      foleyDetail: 0.9,
      atmosphereActionBalance: 0.2,
      syncToLens: false,
    },
  },
  {
    id: 'voiceover',
    name: 'Voiceover',
    description: 'Warm, intimate narration',
    settings: {
      reverbLevel: 0.1,
      stereoWidth: 0.3,
      foleyDetail: 0.95,
      atmosphereActionBalance: 0.1,
      syncToLens: false,
    },
  },
  {
    id: 'gaming_mic',
    name: 'Gaming Mic',
    description: 'Close-mic with room ambiance',
    settings: {
      reverbLevel: 0.25,
      stereoWidth: 0.6,
      foleyDetail: 0.85,
      atmosphereActionBalance: 0.5,
      syncToLens: false,
    },
  },
  {
    id: 'punchy',
    name: 'Punchy',
    description: 'High energy, TikTok-style compression',
    settings: {
      reverbLevel: 0.2,
      stereoWidth: 0.7,
      foleyDetail: 0.7,
      atmosphereActionBalance: 0.6,
      syncToLens: false,
    },
  },
  {
    id: 'intimate',
    name: 'Intimate',
    description: 'Close, warm, personal connection',
    settings: {
      reverbLevel: 0.08,
      stereoWidth: 0.25,
      foleyDetail: 1.0,
      atmosphereActionBalance: 0.15,
      syncToLens: false,
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Epic, spacious audio for performance',
    settings: {
      reverbLevel: 0.45,
      stereoWidth: 0.85,
      foleyDetail: 0.6,
      atmosphereActionBalance: 0.4,
      syncToLens: false,
    },
  },
  {
    id: 'ambient',
    name: 'Ambient',
    description: 'Atmospheric, music-bed focused',
    settings: {
      reverbLevel: 0.6,
      stereoWidth: 0.9,
      foleyDetail: 0.3,
      atmosphereActionBalance: 0.2,
      syncToLens: false,
    },
  },
  {
    id: 'music_bed',
    name: 'Music Bed',
    description: 'Background music priority, minimal voice',
    settings: {
      reverbLevel: 0.55,
      stereoWidth: 0.95,
      foleyDetail: 0.25,
      atmosphereActionBalance: 0.15,
      syncToLens: false,
    },
  },
  {
    id: 'close_mic',
    name: 'Close Mic',
    description: 'ASMR-style extremely close proximity',
    settings: {
      reverbLevel: 0.03,
      stereoWidth: 0.2,
      foleyDetail: 1.0,
      atmosphereActionBalance: 0.05,
      syncToLens: false,
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Neutral, versatile default',
    settings: {
      reverbLevel: 0.35,
      stereoWidth: 0.5,
      foleyDetail: 0.65,
      atmosphereActionBalance: 0.5,
      syncToLens: true,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ARCHETYPE → PRESET MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * YouTube/Content Creator Archetype Mappings
 */
const YOUTUBE_ARCHETYPE_PRESETS: Record<string, ArchetypePresets> = {
  vlogger: {
    lensId: '16mm', // Wide angle for handheld vlogging
    lightingId: 'ring_light',
    audioId: 'broadcaster',
    aspectRatio: '16:9',
  },
  tech_reviewer: {
    lensId: '50mm', // Clean, product-focused
    lightingId: 'tech_studio',
    audioId: 'studio_clean',
    aspectRatio: '16:9',
  },
  video_essay: {
    lensId: '35mm', // Neutral, versatile
    lightingId: 'soft_key', // Soft neutral lighting
    audioId: 'voiceover',
    aspectRatio: '16:9',
  },
  gamer: {
    lensId: '24mm', // Webcam angle
    lightingId: 'rgb_streamer',
    audioId: 'gaming_mic',
    aspectRatio: '16:9',
  },
  shorts: {
    lensId: '24mm', // Wide for vertical
    lightingId: 'ring_light',
    audioId: 'punchy',
    aspectRatio: '9:16',
  },
  tutorial: {
    lensId: '35mm', // Clean framing
    lightingId: 'soft_key',
    audioId: 'studio_clean',
    aspectRatio: '16:9',
  },
  podcast: {
    lensId: '85mm', // Portrait lens for interviews
    lightingId: 'three_point',
    audioId: 'broadcaster',
    aspectRatio: '16:9',
  },
  custom: {
    lensId: '35mm',
    lightingId: 'classic-3-point',
    audioId: 'balanced',
    aspectRatio: '16:9',
  },
};

/**
 * Adult/OnlyFans Archetype Mappings
 */
const ADULT_ARCHETYPE_PRESETS: Record<string, ArchetypePresets> = {
  gfe: {
    lensId: '24mm', // Wide angle, POV-style
    lightingId: 'ring_light_warm',
    audioId: 'intimate',
    aspectRatio: '16:9',
  },
  cosplay: {
    lensId: '50mm', // Portrait lens
    lightingId: 'rgb_rim',
    audioId: 'cinematic',
    aspectRatio: '16:9',
  },
  boudoir: {
    lensId: '85mm', // Classic portrait
    lightingId: 'beauty_soft',
    audioId: 'ambient',
    aspectRatio: '4:5',
  },
  b_roll: {
    lensId: '100mm-macro', // Macro for details
    lightingId: 'natural_soft',
    audioId: 'music_bed',
    aspectRatio: '16:9',
  },
  pov: {
    lensId: '16mm', // Wide POV
    lightingId: 'practical',
    audioId: 'close_mic',
    aspectRatio: '16:9',
  },
  custom: {
    lensId: '35mm',
    lightingId: 'beauty_soft',
    audioId: 'balanced',
    aspectRatio: '16:9',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ArchetypePresetService {
  private static instance: ArchetypePresetService;

  private constructor() {}

  static getInstance(): ArchetypePresetService {
    if (!ArchetypePresetService.instance) {
      ArchetypePresetService.instance = new ArchetypePresetService();
    }
    return ArchetypePresetService.instance;
  }

  /**
   * Get preset recommendations for an archetype
   */
  getPresetsForArchetype(archetype: string, genre: 'youtuber' | 'onlyfans'): ArchetypePresets {
    const presetMap = genre === 'onlyfans' ? ADULT_ARCHETYPE_PRESETS : YOUTUBE_ARCHETYPE_PRESETS;
    return presetMap[archetype] || presetMap.custom;
  }

  /**
   * Get the lens preset by ID
   */
  getLensPreset(lensId: string): LensPreset | undefined {
    return LENS_PRESETS.find(l => l.id === lensId || l.focalLength === lensId);
  }

  /**
   * Get the lighting preset by ID
   */
  getLightingPreset(lightingId: string): LightingPreset | undefined {
    return LIGHTING_PRESETS.find(l => l.id === lightingId);
  }

  /**
   * Get the audio preset by ID
   */
  getAudioPreset(audioId: string): AudioPreset | undefined {
    return AUDIO_PRESETS.find(a => a.id === audioId);
  }

  /**
   * Get all presets for an archetype with full data
   */
  getFullPresetsForArchetype(
    archetype: string,
    genre: 'youtuber' | 'onlyfans'
  ): {
    presets: ArchetypePresets;
    lens: LensPreset | undefined;
    lighting: LightingPreset | undefined;
    audio: AudioPreset | undefined;
  } {
    const presets = this.getPresetsForArchetype(archetype, genre);
    return {
      presets,
      lens: this.getLensPreset(presets.lensId),
      lighting: this.getLightingPreset(presets.lightingId),
      audio: this.getAudioPreset(presets.audioId),
    };
  }

  /**
   * Get all available audio presets
   */
  getAllAudioPresets(): AudioPreset[] {
    return AUDIO_PRESETS;
  }

  /**
   * Get audio presets suitable for a genre
   */
  getAudioPresetsForGenre(genre: 'youtuber' | 'onlyfans'): AudioPreset[] {
    if (genre === 'onlyfans') {
      // Prefer intimate, ambient, music-bed for adult content
      return AUDIO_PRESETS.filter(p =>
        ['intimate', 'ambient', 'music_bed', 'close_mic', 'cinematic', 'balanced'].includes(p.id)
      );
    }
    // All presets available for YouTube
    return AUDIO_PRESETS;
  }
}

export default ArchetypePresetService;

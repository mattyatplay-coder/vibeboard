/**
 * Creator Archetypes
 *
 * Defines the "vibe" presets for content creator workflows (YouTube, OnlyFans, etc.)
 * These archetypes influence:
 * - Camera/Lens auto-selection in LensKit
 * - Lighting presets in Virtual Gaffer
 * - Script pacing in the backend LLM prompts
 * - Acoustic Studio settings
 */

export type CreatorArchetype = string;

export interface ArchetypeData {
  label: string;
  description: string;
  styleHint: string; // Injected into LLM system prompt for generation
  recommendedLens?: string; // Auto-select lens (e.g., "16mm", "50mm Macro")
  lightingPreset?: string; // Virtual Gaffer preset name
  audioPreset?: string; // Acoustic Studio preset
}

// ═══════════════════════════════════════════════════════════════════
// YOUTUBE / SOCIAL CONTENT ARCHETYPES
// ═══════════════════════════════════════════════════════════════════
export const YOUTUBE_ARCHETYPES: Record<string, ArchetypeData> = {
  vlogger: {
    label: 'Vlogger / Lifestyle',
    description: 'High energy, handheld, jump cuts, storytelling.',
    styleHint:
      'Wide angle 16mm, handheld shake, fast pacing, direct address to camera, jump cuts every 3-5 seconds.',
    recommendedLens: '16mm',
    lightingPreset: 'ring_light',
    audioPreset: 'broadcaster',
  },
  tech_reviewer: {
    label: 'Tech / Product',
    description: 'Crisp 8K studio, slow pans, clean audio, depth of field.',
    styleHint:
      '50mm Macro, softbox lighting, clean audio, slow pans, product B-roll with shallow depth of field.',
    recommendedLens: '50mm Macro',
    lightingPreset: 'tech_studio',
    audioPreset: 'studio_clean',
  },
  video_essay: {
    label: 'Video Essay',
    description: 'Archival footage, motion graphics, voiceover-led.',
    styleHint:
      'Mixed media, archival scale, motion graphics overlays, Ken Burns effect on stills, voiceover-driven narrative.',
    recommendedLens: '35mm',
    lightingPreset: 'soft_neutral',
    audioPreset: 'voiceover',
  },
  gamer: {
    label: 'Gamer / Streamer',
    description: 'Face-cam overlay, high saturation, reaction shots.',
    styleHint:
      'Webcam angle, RGB lighting, green screen background, high contrast, reaction cuts, picture-in-picture gameplay.',
    recommendedLens: '24mm',
    lightingPreset: 'rgb_streamer',
    audioPreset: 'gaming_mic',
  },
  shorts: {
    label: 'Shorts / TikTok',
    description: '9:16 vertical, fast cuts, text overlays, hooks in 1 second.',
    styleHint:
      'Vertical framing 9:16, ultra-fast pacing, text overlays, hook in first second, trending audio sync.',
    recommendedLens: '24mm',
    lightingPreset: 'ring_light',
    audioPreset: 'punchy',
  },
  tutorial: {
    label: 'Tutorial / How-To',
    description: 'Screen recording mixed with face cam, step-by-step pacing.',
    styleHint:
      'Clean framing, screen recording with face-cam corner, numbered steps, clear audio, zoom-ins on important elements.',
    recommendedLens: '35mm',
    lightingPreset: 'soft_key',
    audioPreset: 'studio_clean',
  },
  podcast: {
    label: 'Podcast / Interview',
    description: 'Multi-cam setup, conversation-driven, minimal movement.',
    styleHint:
      'Multi-camera setup, two-shot and singles, minimal movement, focus on speakers, over-the-shoulder cutaways.',
    recommendedLens: '85mm',
    lightingPreset: 'three_point',
    audioPreset: 'broadcast',
  },
  custom: {
    label: 'Custom Persona',
    description: 'Define a specific style or paste a transcript to analyze.',
    styleHint: 'Custom - user-defined style will be injected here.',
    recommendedLens: '35mm',
    lightingPreset: 'natural',
    audioPreset: 'balanced',
  },
};

// ═══════════════════════════════════════════════════════════════════
// ADULT / MATURE CONTENT ARCHETYPES (hidden by default)
// ═══════════════════════════════════════════════════════════════════
export const ADULT_ARCHETYPES: Record<string, ArchetypeData> = {
  gfe: {
    label: 'GFE / Vlog',
    description: 'POV, handheld, intimate connection, direct address.',
    styleHint:
      '24mm wide angle, eye-level framing, ring light with warm color temp 3200K, handheld intimacy, direct eye contact.',
    recommendedLens: '24mm',
    lightingPreset: 'ring_light_warm',
    audioPreset: 'intimate',
  },
  cosplay: {
    label: 'Cosplay / Teaser',
    description: 'High production value, costume focus, slow motion reveals.',
    styleHint:
      '50mm portrait lens, RGB rim lighting, slow pan reveals, high contrast, costume detail shots, dramatic poses.',
    recommendedLens: '50mm',
    lightingPreset: 'rgb_rim',
    audioPreset: 'cinematic',
  },
  boudoir: {
    label: 'Boudoir / Artistic',
    description: 'Soft lighting, elegant poses, film-like color grade.',
    styleHint:
      '85mm portrait lens, large softbox key, film grain overlay, muted color palette, elegant poses, negative space.',
    recommendedLens: '85mm',
    lightingPreset: 'beauty_soft',
    audioPreset: 'ambient',
  },
  b_roll: {
    label: 'Aesthetic / B-Roll',
    description: 'Atmospheric, music-driven, montage style.',
    styleHint:
      'Macro lens, shallow depth of field, soft focus, dream-like quality, slow motion, music-synced cuts.',
    recommendedLens: 'Macro',
    lightingPreset: 'natural_soft',
    audioPreset: 'music_bed',
  },
  pov: {
    label: 'POV Experience',
    description: 'First-person perspective, immersive framing.',
    styleHint:
      'Wide angle 16mm, first-person POV, handheld movement, subjective camera, direct interaction with lens.',
    recommendedLens: '16mm',
    lightingPreset: 'practical',
    audioPreset: 'close_mic',
  },
  custom: {
    label: 'Custom Persona',
    description: "Upload a specific creator's voice/style guide.",
    styleHint: 'Custom - user-defined style will be injected here.',
    recommendedLens: '35mm',
    lightingPreset: 'natural',
    audioPreset: 'balanced',
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get archetypes for a specific genre ID
 */
export function getArchetypesForGenre(genreId: string): Record<string, ArchetypeData> {
  switch (genreId) {
    case 'youtuber':
      return YOUTUBE_ARCHETYPES;
    case 'onlyfans':
      return ADULT_ARCHETYPES;
    default:
      return YOUTUBE_ARCHETYPES;
  }
}

/**
 * Get a specific archetype's data
 */
export function getArchetypeData(genreId: string, archetypeKey: string): ArchetypeData | undefined {
  const archetypes = getArchetypesForGenre(genreId);
  return archetypes[archetypeKey];
}

/**
 * Get all archetype keys for a genre
 */
export function getArchetypeKeys(genreId: string): string[] {
  const archetypes = getArchetypesForGenre(genreId);
  return Object.keys(archetypes);
}

/**
 * Get the default archetype for a genre
 */
export function getDefaultArchetype(genreId: string): string {
  switch (genreId) {
    case 'youtuber':
      return 'vlogger';
    case 'onlyfans':
      return 'gfe';
    default:
      return 'vlogger';
  }
}

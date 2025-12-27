/**
 * Lens Presets - Professional Focal Length Mapping
 *
 * Maps real camera focal lengths to AI generation prompt modifications.
 * Each lens has specific optical characteristics that affect the image.
 */

export interface LensPreset {
  id: string;
  name: string;
  focalLength: string; // e.g., "14mm", "35mm"
  focalMm: number; // numeric for slider
  category: 'ultra-wide' | 'wide' | 'normal' | 'portrait' | 'telephoto';
  description: string;
  promptModifiers: string[]; // Terms to add to prompt
  negativeModifiers?: string[]; // Terms to add to negative prompt
  characteristics: {
    distortion: 'barrel' | 'minimal' | 'pincushion';
    compression: 'none' | 'slight' | 'moderate' | 'extreme';
    depthOfField: 'deep' | 'moderate' | 'shallow' | 'extremely shallow';
    perspective: 'exaggerated' | 'natural' | 'flattened' | 'compressed';
  };
  useCases: string[];
  filmExamples?: string[]; // Famous shots using this lens
}

export const LENS_PRESETS: LensPreset[] = [
  {
    id: 'ultra-wide-14',
    name: '14mm Ultra Wide',
    focalLength: '14mm',
    focalMm: 14,
    category: 'ultra-wide',
    description: 'Extreme perspective, dramatic barrel distortion, captures vast spaces',
    promptModifiers: [
      'ultra wide angle lens',
      'extreme perspective',
      'barrel distortion',
      'expansive view',
      'dramatic depth',
      'exaggerated foreground',
    ],
    negativeModifiers: ['flat', 'compressed'],
    characteristics: {
      distortion: 'barrel',
      compression: 'none',
      depthOfField: 'deep',
      perspective: 'exaggerated',
    },
    useCases: ['Architecture', 'Landscapes', 'Action POV', 'Horror close-ups'],
    filmExamples: ['Mad Max: Fury Road chase scenes', 'The Revenant landscapes'],
  },
  {
    id: 'wide-24',
    name: '24mm Wide',
    focalLength: '24mm',
    focalMm: 24,
    category: 'wide',
    description: 'Classic wide angle, slight distortion, great for establishing shots',
    promptModifiers: [
      'wide angle lens 24mm',
      'environmental portrait',
      'slight barrel distortion',
      'deep depth of field',
      'establishing shot',
    ],
    characteristics: {
      distortion: 'barrel',
      compression: 'none',
      depthOfField: 'deep',
      perspective: 'exaggerated',
    },
    useCases: ['Establishing shots', 'Documentary', 'Interior scenes', 'Group shots'],
    filmExamples: ['The Grand Budapest Hotel wide shots', 'Blade Runner cityscapes'],
  },
  {
    id: 'storyteller-35',
    name: '35mm Storyteller',
    focalLength: '35mm',
    focalMm: 35,
    category: 'wide',
    description: 'The documentary lens, natural perspective, versatile for any scene',
    promptModifiers: [
      '35mm lens',
      'natural perspective',
      'documentary style',
      'environmental context',
      'subtle depth of field',
    ],
    characteristics: {
      distortion: 'minimal',
      compression: 'slight',
      depthOfField: 'moderate',
      perspective: 'natural',
    },
    useCases: ['Documentary', 'Street photography', 'Dialogue scenes', 'Walkaround'],
    filmExamples: ['Children of Men long takes', 'The Hurt Locker'],
  },
  {
    id: 'natural-50',
    name: '50mm Natural',
    focalLength: '50mm',
    focalMm: 50,
    category: 'normal',
    description: 'Human eye perspective, no distortion, classic and timeless',
    promptModifiers: [
      '50mm lens',
      'natural field of view',
      'human eye perspective',
      'no distortion',
      'classic framing',
      'balanced composition',
    ],
    characteristics: {
      distortion: 'minimal',
      compression: 'slight',
      depthOfField: 'moderate',
      perspective: 'natural',
    },
    useCases: ['Dialogue', 'Medium shots', 'Classic portraiture', 'Everyday scenes'],
    filmExamples: ["Kubrick's Barry Lyndon", 'The Godfather interiors'],
  },
  {
    id: 'portrait-85',
    name: '85mm Portrait',
    focalLength: '85mm',
    focalMm: 85,
    category: 'portrait',
    description: 'The portrait king, beautiful bokeh, flattering facial proportions',
    promptModifiers: [
      '85mm portrait lens',
      'shallow depth of field',
      'beautiful bokeh',
      'creamy background blur',
      'subject isolation',
      'flattering perspective',
      'compressed background',
    ],
    negativeModifiers: ['wide angle distortion', 'deep focus'],
    characteristics: {
      distortion: 'minimal',
      compression: 'moderate',
      depthOfField: 'shallow',
      perspective: 'flattened',
    },
    useCases: ['Portraits', 'Close-ups', 'Emotional moments', 'Beauty shots'],
    filmExamples: ['Her close-ups', 'Portrait of a Lady on Fire'],
  },
  {
    id: 'telephoto-135',
    name: '135mm Telephoto',
    focalLength: '135mm',
    focalMm: 135,
    category: 'telephoto',
    description: 'Compressed perspective, extreme bokeh, intimate but distant',
    promptModifiers: [
      '135mm telephoto lens',
      'extreme background compression',
      'very shallow depth of field',
      'subject isolation',
      'dreamy bokeh',
      'flattened perspective',
      'intimate framing',
    ],
    negativeModifiers: ['wide angle', 'deep focus', 'environmental'],
    characteristics: {
      distortion: 'pincushion',
      compression: 'extreme',
      depthOfField: 'extremely shallow',
      perspective: 'compressed',
    },
    useCases: ['Intimate portraits', 'Sports', 'Wildlife', 'Romantic scenes'],
    filmExamples: ["Wong Kar-wai's In the Mood for Love", 'Atonement tracking shot'],
  },
];

// Anamorphic lens modifiers - applied when isAnamorphic is true
export const ANAMORPHIC_MODIFIERS = [
  'shot on anamorphic lenses',
  'oval bokeh',
  'horizontal blue lens flares',
  'cinematic 2.39:1 aspect ratio',
  'blue streak flare',
  'widescreen cinema',
  'anamorphic squeeze',
];

// Lens Character - Modern vs Vintage glass characteristics
export type LensCharacter = 'modern' | 'vintage';

export interface LensCharacterPreset {
  id: LensCharacter;
  name: string;
  description: string;
  promptModifiers: string[];
  negativeModifiers: string[];
  visualTraits: string[];
}

export const LENS_CHARACTER_PRESETS: Record<LensCharacter, LensCharacterPreset> = {
  modern: {
    id: 'modern',
    name: 'Modern Glass',
    description: 'Clinical sharpness, clean rendering, perfect correction',
    promptModifiers: [
      'modern lens',
      'razor sharp',
      'clinical sharpness',
      'high micro-contrast',
      'pristine optics',
      'edge-to-edge sharpness',
    ],
    negativeModifiers: [
      'soft focus',
      'vintage lens',
      'chromatic aberration',
      'lens flare',
    ],
    visualTraits: [
      'Perfect corner sharpness',
      'Neutral color rendering',
      'Clean highlight rolloff',
      'Minimal distortion',
    ],
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage Glass',
    description: 'Character-rich rendering, dreamy softness, organic imperfections',
    promptModifiers: [
      'vintage lens',
      'soft glow',
      'dreamy rendering',
      'lens imperfections',
      'organic bokeh',
      'gentle halation',
      'classic glass character',
    ],
    negativeModifiers: [
      'clinical sharpness',
      'modern lens',
      'perfect optics',
    ],
    visualTraits: [
      'Soft corner falloff',
      'Warm color cast',
      'Smooth highlight blooming',
      'Character-rich aberrations',
    ],
  },
};

// Build complete lens prompt with optional anamorphic modifier and character
export function buildLensPrompt(
  lens: LensPreset | null,
  isAnamorphic: boolean,
  effects: string[],
  character: LensCharacter = 'modern'
): { positive: string; negative: string } {
  const positiveModifiers: string[] = [];
  const negativeModifiers: string[] = [];

  // Base lens modifiers
  if (lens) {
    positiveModifiers.push(...lens.promptModifiers);
    if (lens.negativeModifiers) {
      negativeModifiers.push(...lens.negativeModifiers);
    }
  }

  // Anamorphic modifiers override spherical
  if (isAnamorphic) {
    positiveModifiers.push(...ANAMORPHIC_MODIFIERS);
  } else if (lens) {
    positiveModifiers.push('spherical cinema lenses');
  }

  // Lens character modifiers (Modern vs Vintage)
  const characterPreset = LENS_CHARACTER_PRESETS[character];
  if (characterPreset) {
    positiveModifiers.push(...characterPreset.promptModifiers);
    negativeModifiers.push(...characterPreset.negativeModifiers);
  }

  // Effect modifiers
  effects.forEach(effectId => {
    const effect = LENS_EFFECTS.find(e => e.id === effectId);
    if (effect) {
      positiveModifiers.push(...effect.promptModifiers);
    }
  });

  return {
    positive: positiveModifiers.join(', '),
    negative: negativeModifiers.join(', '),
  };
}

// Lens flare/aberration effects
export interface LensEffect {
  id: string;
  name: string;
  description: string;
  promptModifiers: string[];
}

export const LENS_EFFECTS: LensEffect[] = [
  {
    id: 'lens-flare',
    name: 'Lens Flare',
    description: 'Visible light artifacts from bright sources',
    promptModifiers: ['lens flare', 'light streaks', 'cinematic lighting'],
  },
  {
    id: 'chromatic-aberration',
    name: 'Chromatic Aberration',
    description: 'Color fringing on high-contrast edges (vintage glass look)',
    promptModifiers: ['chromatic aberration', 'color fringing', 'vintage lens'],
  },
  {
    id: 'vignette',
    name: 'Vignette',
    description: 'Darkened corners, classic film look',
    promptModifiers: ['vignette', 'darkened corners', 'vintage photography'],
  },
  {
    id: 'soft-glow',
    name: 'Soft Glow / Halation',
    description: 'Bloom around highlights, dreamy atmosphere',
    promptModifiers: ['soft glow', 'halation', 'dreamy atmosphere', 'blooming highlights'],
  },
];

// Helper to get prompt modifiers for a lens
export function getLensPromptModifiers(lensId: string): string[] {
  const lens = LENS_PRESETS.find(l => l.id === lensId);
  return lens?.promptModifiers || [];
}

// Helper to get negative modifiers for a lens
export function getLensNegativeModifiers(lensId: string): string[] {
  const lens = LENS_PRESETS.find(l => l.id === lensId);
  return lens?.negativeModifiers || [];
}

// Get lens by focal length (approximate match)
export function getLensByFocalLength(mm: number): LensPreset | undefined {
  // Find closest match
  return LENS_PRESETS.reduce((closest, lens) => {
    const closestDiff = Math.abs(closest.focalMm - mm);
    const lensDiff = Math.abs(lens.focalMm - mm);
    return lensDiff < closestDiff ? lens : closest;
  }, LENS_PRESETS[0]);
}

// Category colors for UI
export const LENS_CATEGORY_COLORS: Record<LensPreset['category'], string> = {
  'ultra-wide': 'text-red-400 bg-red-500/20 border-red-500/30',
  wide: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  normal: 'text-green-400 bg-green-500/20 border-green-500/30',
  portrait: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  telephoto: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
};

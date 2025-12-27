/**
 * Virtual Gaffer - Lighting Store
 *
 * Manages light source positions and settings for the 3-point lighting layout.
 * Generates prompt modifiers based on light placements.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LightType = 'key' | 'fill' | 'back' | 'rim' | 'practical' | 'ambient';

export interface LightSource {
  id: string;
  type: LightType;
  name: string;
  // Position on stage (0-1 normalized, center is 0.5, 0.5)
  x: number;
  y: number;
  // Light properties
  intensity: number; // 0-100
  colorTemp: number; // Kelvin (2700-10000)
  softness: number; // 0-100 (0 = hard, 100 = very soft)
  enabled: boolean;
  // Gel color (RGB override - when set, ignores colorTemp). Optional, defaults to false/white.
  useGel?: boolean;
  gelColor?: string; // Hex color like '#ff00ff'
  // Distance from subject (affects falloff - 0.1 to 1.0, where 0.5 is default distance). Optional, defaults to 0.5.
  distance?: number; // Affects intensity via inverse square law
}

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  lights: Omit<LightSource, 'id'>[];
}

// Common 3-point lighting presets
export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'classic-3-point',
    name: 'Classic 3-Point',
    description: 'Standard key, fill, and backlight setup',
    lights: [
      {
        type: 'key',
        name: 'Key Light',
        x: 0.25,
        y: 0.3,
        intensity: 100,
        colorTemp: 5600,
        softness: 30,
        enabled: true,
      },
      {
        type: 'fill',
        name: 'Fill Light',
        x: 0.75,
        y: 0.35,
        intensity: 50,
        colorTemp: 5600,
        softness: 60,
        enabled: true,
      },
      {
        type: 'back',
        name: 'Back Light',
        x: 0.5,
        y: 0.1,
        intensity: 70,
        colorTemp: 5600,
        softness: 20,
        enabled: true,
      },
    ],
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'High contrast, dramatic shadows',
    lights: [
      {
        type: 'key',
        name: 'Key Light',
        x: 0.15,
        y: 0.25,
        intensity: 100,
        colorTemp: 4000,
        softness: 10,
        enabled: true,
      },
      {
        type: 'rim',
        name: 'Rim Light',
        x: 0.85,
        y: 0.15,
        intensity: 60,
        colorTemp: 5600,
        softness: 15,
        enabled: true,
      },
    ],
  },
  {
    id: 'soft-beauty',
    name: 'Soft Beauty',
    description: 'Even, flattering light for portraits',
    lights: [
      {
        type: 'key',
        name: 'Key Light',
        x: 0.5,
        y: 0.2,
        intensity: 80,
        colorTemp: 5200,
        softness: 90,
        enabled: true,
      },
      {
        type: 'fill',
        name: 'Fill Left',
        x: 0.2,
        y: 0.4,
        intensity: 60,
        colorTemp: 5200,
        softness: 80,
        enabled: true,
      },
      {
        type: 'fill',
        name: 'Fill Right',
        x: 0.8,
        y: 0.4,
        intensity: 60,
        colorTemp: 5200,
        softness: 80,
        enabled: true,
      },
    ],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm, natural sunset lighting',
    lights: [
      {
        type: 'key',
        name: 'Sun',
        x: 0.1,
        y: 0.2,
        intensity: 100,
        colorTemp: 3200,
        softness: 40,
        enabled: true,
      },
      {
        type: 'ambient',
        name: 'Ambient Fill',
        x: 0.5,
        y: 0.5,
        intensity: 30,
        colorTemp: 6500,
        softness: 100,
        enabled: true,
      },
    ],
  },
  {
    id: 'rembrandt',
    name: 'Rembrandt',
    description: 'Classic portrait lighting with triangle shadow',
    lights: [
      {
        type: 'key',
        name: 'Key Light',
        x: 0.2,
        y: 0.25,
        intensity: 100,
        colorTemp: 5000,
        softness: 25,
        enabled: true,
      },
      {
        type: 'fill',
        name: 'Subtle Fill',
        x: 0.8,
        y: 0.5,
        intensity: 20,
        colorTemp: 5000,
        softness: 70,
        enabled: true,
      },
    ],
  },
  {
    id: 'neon-cyberpunk',
    name: 'Neon Cyberpunk',
    description: 'Colorful practical lighting with gels',
    lights: [
      {
        type: 'practical',
        name: 'Neon Pink',
        x: 0.15,
        y: 0.3,
        intensity: 80,
        colorTemp: 5600,
        softness: 50,
        enabled: true,
        useGel: true,
        gelColor: '#ff00ff',
        distance: 0.4,
      },
      {
        type: 'practical',
        name: 'Neon Cyan',
        x: 0.85,
        y: 0.35,
        intensity: 80,
        colorTemp: 5600,
        softness: 50,
        enabled: true,
        useGel: true,
        gelColor: '#00ffff',
        distance: 0.4,
      },
      {
        type: 'ambient',
        name: 'Dark Ambient',
        x: 0.5,
        y: 0.5,
        intensity: 10,
        colorTemp: 5600,
        softness: 100,
        enabled: true,
        useGel: false,
        gelColor: '#ffffff',
        distance: 0.5,
      },
    ],
  },
  {
    id: 'horror',
    name: 'Horror Underlighting',
    description: 'Unsettling bottom-up lighting',
    lights: [
      {
        type: 'key',
        name: 'Under Light',
        x: 0.5,
        y: 0.85,
        intensity: 100,
        colorTemp: 4000,
        softness: 20,
        enabled: true,
      },
      {
        type: 'rim',
        name: 'Top Rim',
        x: 0.5,
        y: 0.05,
        intensity: 40,
        colorTemp: 6500,
        softness: 30,
        enabled: true,
      },
    ],
  },
];

// Convert position to directional description
// Stage map coordinate system:
//   Y=0 (top of map) = BACK of stage (behind subject) → rim/backlight territory
//   Y=1 (bottom of map) = FRONT of stage (camera side) → front lighting
//   X=0 (left of map) = camera-left
//   X=1 (right of map) = camera-right
function getPositionDescription(x: number, y: number): string {
  const horizontal = x < 0.33 ? 'left' : x > 0.66 ? 'right' : 'center';

  // Y-axis: low Y = back of stage, high Y = front (near camera)
  const depth = y < 0.35 ? 'back' : y > 0.65 ? 'front' : 'side';

  // CENTRALITY LOGIC: Detect overhead/top light (centered horizontally, anywhere vertically)
  // A light near x=0.5 is directly above the subject when combined with any Y position
  const isCentered = x >= 0.4 && x <= 0.6;

  // True overhead/top down: centered AND at the top (low Y = above/behind subject)
  if (isCentered && y <= 0.25) {
    return 'from directly above (overhead/top light)';
  }

  // Centered at middle height: top-center lighting (butterfly/paramount)
  if (isCentered && y > 0.25 && y <= 0.45) {
    return 'from above-center (butterfly/paramount)';
  }

  // For lights behind subject (low Y), use rim/backlight terminology
  if (y < 0.35) {
    if (horizontal === 'center') return 'from behind (backlight)';
    return `from ${horizontal}-rear (rim light)`;
  }

  // For lights in front of subject (high Y), use front terminology
  if (y > 0.65) {
    if (horizontal === 'center') return 'from front';
    return `from ${horizontal}-front`;
  }

  // Side lighting (middle Y range)
  if (horizontal === 'center') return 'from the side';
  return `from ${horizontal}`;
}

// Helper to check if a light is in overhead/top position (for UI labels)
export function isOverheadPosition(x: number, y: number): boolean {
  const isCentered = x >= 0.4 && x <= 0.6;
  return isCentered && y <= 0.25;
}

// Helper to check if a light is in butterfly/paramount position
export function isButterflyPosition(x: number, y: number): boolean {
  const isCentered = x >= 0.4 && x <= 0.6;
  return isCentered && y > 0.25 && y <= 0.45;
}

// Convert Kelvin to color description
function getColorTempDescription(kelvin: number): string {
  if (kelvin < 3000) return 'warm orange';
  if (kelvin < 4000) return 'warm';
  if (kelvin < 5000) return 'neutral warm';
  if (kelvin < 6000) return 'neutral';
  if (kelvin < 7000) return 'cool';
  if (kelvin < 9000) return 'cool blue';
  return 'cold blue';
}

// Convert softness to description (with shadow language for prompts)
function getSoftnessDescription(softness: number): string {
  if (softness < 15) return 'hard, sharp shadows';
  if (softness < 30) return 'crisp';
  if (softness < 50) return 'slightly soft';
  if (softness < 70) return 'soft, gentle shadows';
  if (softness < 85) return 'very soft, diffused';
  return 'extremely diffused, wraparound';
}

// Convert hex color to descriptive name
function getGelColorDescription(hex: string): string {
  // Common gel color names
  const colorMap: Record<string, string> = {
    '#ff0000': 'red gel',
    '#ff00ff': 'magenta/pink gel',
    '#00ffff': 'cyan gel',
    '#0000ff': 'blue gel',
    '#00ff00': 'green gel',
    '#ffff00': 'yellow gel',
    '#ff8800': 'orange gel (CTO)',
    '#8800ff': 'purple gel',
  };

  // Check for close matches
  const hexLower = hex.toLowerCase();
  if (colorMap[hexLower]) return colorMap[hexLower];

  // Parse RGB and determine general color
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (r > 200 && g < 100 && b > 200) return 'magenta gel';
  if (r < 100 && g > 200 && b > 200) return 'cyan gel';
  if (r > 200 && g < 100 && b < 100) return 'red gel';
  if (r < 100 && g < 100 && b > 200) return 'blue gel';
  if (r < 100 && g > 200 && b < 100) return 'green gel';
  if (r > 200 && g > 200 && b < 100) return 'yellow gel';
  if (r > 200 && g > 100 && b < 100) return 'orange gel';
  if (r > 100 && g < 100 && b > 150) return 'purple gel';

  return 'colored gel';
}

// Calculate effective intensity with distance falloff (inverse square law)
function getEffectiveIntensity(intensity: number, distance: number): number {
  // distance: 0.1 (very close) to 1.0 (far away)
  // At distance 0.5 (default), intensity is as set
  // Closer = brighter, farther = dimmer
  const falloffFactor = Math.pow(0.5 / Math.max(0.1, distance), 2);
  return Math.min(100, intensity * falloffFactor);
}

interface LightingState {
  lights: LightSource[];
  isEnabled: boolean;
  selectedLightId: string | null;

  // Actions
  addLight: (type: LightType) => void;
  removeLight: (id: string) => void;
  updateLight: (id: string, updates: Partial<LightSource>) => void;
  moveLight: (id: string, x: number, y: number) => void;
  selectLight: (id: string | null) => void;
  toggleEnabled: () => void;
  loadPreset: (presetId: string) => void;
  clearAll: () => void;

  // Getters
  generatePromptModifier: () => string;
  getLightingDescription: () => string;
}

export const useLightingStore = create<LightingState>()(
  persist(
    (set, get) => ({
      lights: [],
      isEnabled: false,
      selectedLightId: null,

      addLight: type => {
        const typeNames: Record<LightType, string> = {
          key: 'Key Light',
          fill: 'Fill Light',
          back: 'Back Light',
          rim: 'Rim Light',
          practical: 'Practical',
          ambient: 'Ambient',
        };

        // Use timestamp + random suffix for unique IDs (prevents collisions when adding multiple lights rapidly)
        const newLight: LightSource = {
          id: `light-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type,
          name: typeNames[type],
          x: 0.5,
          y: 0.5,
          intensity: type === 'fill' ? 50 : type === 'ambient' ? 30 : 100,
          colorTemp: 5600,
          softness: type === 'ambient' ? 100 : type === 'fill' ? 60 : 30,
          enabled: true,
          useGel: false,
          gelColor: '#ffffff',
          distance: 0.5, // Default distance
        };

        set(state => ({ lights: [...state.lights, newLight] }));
      },

      removeLight: id => {
        set(state => ({
          lights: state.lights.filter(l => l.id !== id),
          selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
        }));
      },

      updateLight: (id, updates) => {
        set(state => ({
          lights: state.lights.map(l => (l.id === id ? { ...l, ...updates } : l)),
        }));
      },

      moveLight: (id, x, y) => {
        set(state => ({
          lights: state.lights.map(l => (l.id === id ? { ...l, x, y } : l)),
        }));
      },

      selectLight: id => {
        set({ selectedLightId: id });
      },

      toggleEnabled: () => {
        set(state => ({ isEnabled: !state.isEnabled }));
      },

      loadPreset: presetId => {
        const preset = LIGHTING_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const lights: LightSource[] = preset.lights.map((l, i) => ({
          ...l,
          id: `light-${Date.now()}-${i}`,
          useGel: (l as LightSource).useGel ?? false,
          gelColor: (l as LightSource).gelColor ?? '#ffffff',
          distance: (l as LightSource).distance ?? 0.5,
        }));

        set({ lights, isEnabled: true });
      },

      clearAll: () => {
        set({ lights: [], selectedLightId: null });
      },

      generatePromptModifier: () => {
        const { lights, isEnabled } = get();
        if (!isEnabled || lights.length === 0) return '';

        const enabledLights = lights.filter(l => l.enabled);
        if (enabledLights.length === 0) return '';

        const descriptions: string[] = [];

        // Sort by effective intensity (most important lights first)
        const sortedLights = [...enabledLights].sort((a, b) => {
          const effA = getEffectiveIntensity(a.intensity, a.distance ?? 0.5);
          const effB = getEffectiveIntensity(b.intensity, b.distance ?? 0.5);
          return effB - effA;
        });

        for (const light of sortedLights) {
          const position = getPositionDescription(light.x, light.y);
          // Use gel color description if gel is enabled, otherwise use Kelvin
          const colorDesc =
            light.useGel && light.gelColor
              ? getGelColorDescription(light.gelColor)
              : getColorTempDescription(light.colorTemp);
          const softness = getSoftnessDescription(light.softness);

          let desc = '';

          if (light.type === 'key') {
            desc = `${softness} ${colorDesc} key light ${position}`;
          } else if (light.type === 'fill') {
            desc = `${softness} fill light ${position}`;
          } else if (light.type === 'back' || light.type === 'rim') {
            desc = `${colorDesc} rim lighting ${position}`;
          } else if (light.type === 'practical') {
            desc = `${colorDesc} practical light ${position}`;
          } else if (light.type === 'ambient') {
            desc = `${colorDesc} ambient lighting`;
          }

          if (desc) descriptions.push(desc);
        }

        return descriptions.join(', ');
      },

      getLightingDescription: () => {
        const { lights, isEnabled } = get();
        if (!isEnabled || lights.length === 0) return 'No lighting setup';

        const enabledLights = lights.filter(l => l.enabled);
        if (enabledLights.length === 0) return 'All lights disabled';

        const types = enabledLights.map(l => l.type);
        const hasKey = types.includes('key');
        const hasFill = types.includes('fill');
        const hasBack = types.includes('back') || types.includes('rim');

        if (hasKey && hasFill && hasBack) return '3-Point Lighting';
        if (hasKey && hasFill) return '2-Point Lighting';
        if (hasKey && hasBack) return 'Key + Rim';
        if (hasKey) return 'Single Key';

        return `${enabledLights.length} light${enabledLights.length > 1 ? 's' : ''}`;
      },
    }),
    {
      name: 'vibeboard-lighting',
    }
  )
);

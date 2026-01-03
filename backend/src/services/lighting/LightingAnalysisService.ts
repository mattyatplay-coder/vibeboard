/**
 * Lighting Analysis Service
 *
 * Uses Grok Vision to analyze reference images and extract lighting setups.
 * Powers the "Inverse Gaffing" feature - drop a movie frame, get a lighting map.
 */

import { GrokAdapter } from '../llm/GrokAdapter';

export interface AnalyzedLight {
  type: 'key' | 'fill' | 'back' | 'rim' | 'practical' | 'ambient';
  name: string;
  x: number; // 0-1 normalized position (0 = left, 1 = right)
  y: number; // 0-1 normalized position (0 = top/back, 1 = bottom/front)
  intensity: number; // 0-100
  colorTemp: number; // Kelvin (2700-10000)
  softness: number; // 0-100 (0 = hard, 100 = very soft)
  description: string; // Human-readable description
  // Enhanced color fields from Chromatic Mandate analysis
  hex?: string; // Direct hex color code (e.g., "#4D94FF")
  isGel?: boolean; // Whether this is a colored gel light
  gelName?: string; // Name of the gel (e.g., "Steel Blue", "CTO Full")
}

export interface LightingAnalysisResult {
  lights: AnalyzedLight[];
  overallStyle: string;
  lightingRatio: string; // e.g., "3:1", "5:1"
  keyLightPosition: string; // e.g., "45° camera left"
  mood: string[];
  genre?: string; // e.g., "Sci-Fi Noir", "Horror", "Romance"
  colorPalette: {
    dominant: string; // Hex color
    accent: string; // Hex color
    shadows: string; // Hex color
  };
  promptSuggestion: string; // Ready-to-use lighting prompt
  cinematicReference?: string; // e.g., "Similar to Gordon Willis's work in The Godfather"
}

export class LightingAnalysisService {
  private static instance: LightingAnalysisService;
  private grokAdapter: GrokAdapter;

  private constructor() {
    this.grokAdapter = new GrokAdapter();
  }

  static getInstance(): LightingAnalysisService {
    if (!LightingAnalysisService.instance) {
      LightingAnalysisService.instance = new LightingAnalysisService();
    }
    return LightingAnalysisService.instance;
  }

  /**
   * Analyze a reference image and extract its lighting setup
   * This is the core "Inverse Gaffing" function
   */
  async analyzeLighting(imageUrl: string): Promise<LightingAnalysisResult> {
    console.log('[LightingAnalysis] Analyzing reference image lighting...');

    const prompt = `You are an Academy Award-winning Cinematographer and Master Gaffer. Reverse-engineer this image's lighting setup with surgical precision for a 2D lighting map.

## STRICT COLOR MANDATE (CRITICAL!)
- Do NOT default to "neutral" or "white" unless the light is PURE 5600K daylight with NO color cast.
- You MUST identify specific Gel colors and provide HEX codes for EVERY light.
- If you see stylized lighting (Cyberpunk, Noir, Neon, Sunset), identify dominant Gel colors:
  - Cyberpunk: "Cyan Gel" (#00FFFF), "Magenta Gel" (#FF00FF), "Tokyo Pink" (#FF1493)
  - Noir: "Steel Blue" (#4682B4), "Cold White" (#E6F0FF)
  - Golden Hour: "CTO Full" (#FF8C00), "Straw" (#FFD700)
  - Horror: "Blood Red" (#8B0000), "Sickly Green" (#9ACD32)
- ALWAYS provide a hex color code, even for "neutral" lights (use #FFF4CC for daylight, #B3D4FF for cool)

## SPATIAL MAPPING (TOP-DOWN STAGE VIEW)
- Subject is at center (0.5, 0.5)
- Camera is at bottom center (0.5, 1.0)
- Y: 0.0 = BACK of set (behind subject), 1.0 = FRONT (camera position)
- X: 0.0 = camera-left, 1.0 = camera-right

## ANALYSIS PROCESS
1. **Shadow Analysis**: Find darkest shadow → Key light is OPPOSITE
2. **Highlight Analysis**: Brightest skin highlight confirms Key position
3. **Rim Detection**: Bright edges on hair/shoulders = backlight (y < 0.3)
4. **Practicals**: Visible light sources (neon signs, lamps, screens) - mark as "practical"
5. **Color Temperature**: Look at the ACTUAL color cast, not just "warm/cool"

## LIGHT CATEGORIES
- "key": Main light creating primary shadows (intensity=100)
- "fill": Opposite key, softer (intensity 20-50)
- "rim"/"back": Edge lighting from behind subject (y < 0.3)
- "practical": Visible in-frame sources (neon, lamps, windows)
- "ambient": Overall environmental fill

## REQUIRED OUTPUT FORMAT
{
  "lights": [
    {
      "type": "key",
      "name": "Steel Blue Key",
      "x": 0.25,
      "y": 0.55,
      "intensity": 100,
      "colorTemp": 7000,
      "hex": "#4682B4",
      "softness": 20,
      "isGel": true,
      "gelName": "Steel Blue",
      "description": "Hard cool key from front-left, creates dramatic shadow on viewer's right"
    },
    {
      "type": "practical",
      "name": "Neon Sign",
      "x": 0.15,
      "y": 0.20,
      "intensity": 60,
      "colorTemp": 5600,
      "hex": "#FF1493",
      "softness": 50,
      "isGel": true,
      "gelName": "Tokyo Pink",
      "description": "Practical neon from back-left, adds pink rim on viewer's left edge"
    }
  ],
  "overallStyle": "Chiaroscuro",
  "lightingRatio": "8:1",
  "keyLightPosition": "45° camera-left, front position",
  "mood": ["dramatic", "mysterious", "cyberpunk"],
  "genre": "Sci-Fi Noir",
  "colorPalette": {
    "dominant": "#4682B4",
    "accent": "#FF1493",
    "shadows": "#1A1A2E"
  },
  "promptSuggestion": "Steel Blue hard key light from front-left, Tokyo Pink neon practical rim from back-left, deep black shadows, 8:1 chiaroscuro ratio",
  "cinematicReference": "Chad Stahelski - John Wick"
}

## POSITION REFERENCE GRID (CRITICAL - MATCH DESCRIPTION TO COORDINATES!)
The Y-axis determines FRONT vs BACK:
- y < 0.30 = BACK of set (rim/backlight territory) - describe as "from behind" or "rim"
- y 0.30-0.50 = SIDE position - describe as "from side" or "side key"
- y > 0.50 = FRONT of set (key/fill territory) - describe as "from front" or "front key"

Common positions:
- Back-left rim: x=0.15, y=0.15 → "rim from back-left"
- Back-right rim: x=0.85, y=0.15 → "rim from back-right"
- Side-left key: x=0.20, y=0.45 → "side key from camera-left"
- Side-right key: x=0.80, y=0.45 → "side key from camera-right"
- Front-left key: x=0.25, y=0.60 → "key from front-left" (MOST COMMON KEY POSITION!)
- Front-right fill: x=0.75, y=0.60 → "fill from front-right"
- Center backlight: x=0.50, y=0.10 → "backlight from behind"
- Front center: x=0.50, y=0.70 → "front-center fill"

**COORDINATE ENFORCEMENT (VIEWER-RELATIVE - THIS IS CRITICAL FOR ALL LIGHTS!)**:
All coordinates must be VIEWER-RELATIVE (Camera-Perspective), NOT Subject-Relative.
- If a light/object appears on the LEFT side of the image frame → x < 0.4 (left side of map)
- If a light/object appears on the RIGHT side of the image frame → x > 0.6 (right side of map)
- NEVER use the subject's perspective (stage-left/stage-right) - always use CAMERA perspective.

**Shadow Rule for Key Lights:**
- Shadow on VIEWER'S RIGHT side of face → Key light is on CAMERA-LEFT (x < 0.4)
- Shadow on VIEWER'S LEFT side of face → Key light is on CAMERA-RIGHT (x > 0.6)

**Practical Light Rule (neon signs, lamps, windows):**
- If the practical is visible on the LEFT side of frame → x < 0.4
- If the practical is visible on the RIGHT side of frame → x > 0.6

Example (John Wick):
- Blue key light illuminates VIEWER'S LEFT side of Keanu's face → Key is on CAMERA-LEFT (x ≈ 0.25)
- Red neon circle is visible on VIEWER'S LEFT behind him → Practical is on BACK-LEFT (x ≈ 0.15, y ≈ 0.20)

## COLOR-FIRST PROMPT GENERATION (USE GEL NAMES, NOT "colored gel")
When generating promptSuggestion, use SPECIFIC gel names:
- GOOD: "Steel Blue hard key light from front-left, Tokyo Pink neon practical from back-left, 8:1 chiaroscuro"
- BAD: "colored gel key light from left, colored gel rim light"
- BAD: "soft neutral key light"

REMEMBER: Color is the soul of cinematography. Be specific. Be bold. No "neutral" unless truly neutral.
REMEMBER: Match your coordinate placement (x,y) to your description (front/back/side).`;

    try {
      const response = await this.grokAdapter.analyzeImage([imageUrl], prompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[LightingAnalysis] No JSON found in response');
        return this.getDefaultResult();
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the lights array
      // Include new hex/gel fields from Chromatic Mandate analysis
      const lights: AnalyzedLight[] = (parsed.lights || []).map((light: any) => ({
        type: this.validateLightType(light.type),
        name: light.name || 'Light',
        x: this.clamp(light.x ?? 0.5, 0, 1),
        y: this.clamp(light.y ?? 0.5, 0, 1),
        intensity: this.clamp(light.intensity ?? 50, 0, 100),
        colorTemp: this.clamp(light.colorTemp ?? 5600, 2700, 10000),
        softness: this.clamp(light.softness ?? 50, 0, 100),
        description: light.description || '',
        // New color fields from enhanced analysis
        hex: light.hex || undefined,
        isGel: light.isGel === true,
        gelName: light.gelName || undefined,
      }));

      // Log gel usage for debugging
      const gelLights = lights.filter(l => l.isGel || l.hex);
      if (gelLights.length > 0) {
        console.log(
          `[LightingAnalysis] Detected ${gelLights.length} gel-colored lights:`,
          gelLights.map(l => `${l.name}: ${l.hex} (${l.gelName || 'unnamed'})`)
        );
      }
      console.log(`[LightingAnalysis] Detected ${lights.length} total lights`);

      return {
        lights,
        overallStyle: parsed.overallStyle || 'Natural',
        lightingRatio: parsed.lightingRatio || '2:1',
        keyLightPosition: parsed.keyLightPosition || 'Front',
        mood: Array.isArray(parsed.mood) ? parsed.mood : ['neutral'],
        genre: parsed.genre || undefined,
        colorPalette: {
          dominant: parsed.colorPalette?.dominant || '#808080',
          accent: parsed.colorPalette?.accent || '#808080',
          shadows: parsed.colorPalette?.shadows || '#1a1a1a',
        },
        promptSuggestion: parsed.promptSuggestion || this.generatePromptFromLights(lights),
        cinematicReference: parsed.cinematicReference,
      };
    } catch (error) {
      console.error('[LightingAnalysis] Analysis failed:', error);
      return this.getDefaultResult();
    }
  }

  private validateLightType(type: string | undefined): AnalyzedLight['type'] {
    const validTypes: AnalyzedLight['type'][] = [
      'key',
      'fill',
      'back',
      'rim',
      'practical',
      'ambient',
    ];
    if (type && validTypes.includes(type as AnalyzedLight['type'])) {
      return type as AnalyzedLight['type'];
    }
    return 'key';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private generatePromptFromLights(lights: AnalyzedLight[]): string {
    if (lights.length === 0) return 'natural lighting';

    const descriptions = lights.map(light => {
      const temp = light.colorTemp < 4000 ? 'warm' : light.colorTemp > 6000 ? 'cool' : 'neutral';
      const soft = light.softness > 60 ? 'soft' : light.softness < 30 ? 'hard' : '';
      return `${soft} ${temp} ${light.type} light`.trim();
    });

    return descriptions.join(', ');
  }

  private getDefaultResult(): LightingAnalysisResult {
    return {
      lights: [
        {
          type: 'key',
          name: 'Key Light',
          x: 0.3,
          y: 0.35,
          intensity: 100,
          colorTemp: 5600,
          softness: 40,
          description: 'Main key light',
        },
      ],
      overallStyle: 'Natural',
      lightingRatio: '2:1',
      keyLightPosition: 'Front-left',
      mood: ['neutral'],
      colorPalette: {
        dominant: 'neutral',
        accent: 'neutral',
        shadows: 'grey',
      },
      promptSuggestion: 'natural soft lighting',
      cinematicReference: undefined,
    };
  }
}

export const lightingAnalysisService = LightingAnalysisService.getInstance();

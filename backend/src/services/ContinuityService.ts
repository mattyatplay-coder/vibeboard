/**
 * Continuity Service
 *
 * Provides visual consistency checking between reference images and generated shots.
 * Uses CLIP embeddings for feature comparison and Grok Vision for detailed drift analysis.
 */

import * as fal from '@fal-ai/serverless-client';
import { GrokAdapter } from './llm/GrokAdapter';

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
});

export interface DriftRegion {
  x: number; // 0-1 normalized position
  y: number;
  width: number;
  height: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  category: 'color' | 'shape' | 'texture' | 'missing' | 'added' | 'position';
}

export interface ContinuityResult {
  overallScore: number; // 0-1 (1 = perfect match)
  driftDetected: boolean;
  driftRegions: DriftRegion[];
  summary: string;
  details: {
    colorConsistency: number; // 0-1
    shapeConsistency: number; // 0-1
    textureConsistency: number; // 0-1
    characterMatch: number; // 0-1 (if characters detected)
  };
  recommendations: string[];
}

export class ContinuityService {
  private static instance: ContinuityService;
  private grokAdapter: GrokAdapter;

  private constructor() {
    this.grokAdapter = new GrokAdapter();
  }

  static getInstance(): ContinuityService {
    if (!ContinuityService.instance) {
      ContinuityService.instance = new ContinuityService();
    }
    return ContinuityService.instance;
  }

  /**
   * Compare a generated image against a reference image for continuity
   */
  async checkContinuity(
    referenceImageUrl: string,
    generatedImageUrl: string,
    options: {
      checkCharacters?: boolean;
      characterNames?: string[];
      focusAreas?: string[]; // e.g., "face", "clothing", "background"
    } = {}
  ): Promise<ContinuityResult> {
    console.log(`[Continuity] Checking continuity between reference and generated image`);

    try {
      // Use Grok Vision for detailed comparison
      const analysisPrompt = this.buildAnalysisPrompt(options);
      const imageInputs = [
        { url: referenceImageUrl, label: '[REFERENCE IMAGE - This is the source of truth]' },
        { url: generatedImageUrl, label: '[GENERATED IMAGE - Check this against the reference]' },
      ];

      const response = await this.grokAdapter.analyzeImage(imageInputs, analysisPrompt);

      // Parse the structured response
      return this.parseAnalysisResponse(response);
    } catch (error) {
      console.error('[Continuity] Analysis failed:', error);
      // Return a default result on error
      return {
        overallScore: 0.5,
        driftDetected: true,
        driftRegions: [],
        summary: 'Unable to complete continuity analysis',
        details: {
          colorConsistency: 0.5,
          shapeConsistency: 0.5,
          textureConsistency: 0.5,
          characterMatch: 0.5,
        },
        recommendations: ['Retry analysis'],
      };
    }
  }

  /**
   * Build the analysis prompt for Grok Vision
   */
  private buildAnalysisPrompt(options: {
    checkCharacters?: boolean;
    characterNames?: string[];
    focusAreas?: string[];
  }): string {
    const focusAreasStr = options.focusAreas?.length
      ? `Pay special attention to: ${options.focusAreas.join(', ')}`
      : '';

    const characterCheck =
      options.checkCharacters && options.characterNames?.length
        ? `\nVerify these characters maintain consistency: ${options.characterNames.join(', ')}`
        : '';

    return `You are a professional continuity supervisor for film/video production. Compare the REFERENCE IMAGE against the GENERATED IMAGE and identify any visual inconsistencies (drift).

${focusAreasStr}${characterCheck}

Analyze for:
1. **Color Consistency**: Are skin tones, clothing colors, hair colors consistent?
2. **Shape Consistency**: Are body proportions, facial features, object shapes preserved?
3. **Texture Consistency**: Are surface textures (skin, fabric, materials) similar?
4. **Missing/Added Elements**: Are there items in one image not in the other?
5. **Position/Pose Drift**: Are elements in unexpected positions?

Respond in JSON format:
{
  "overallScore": 0.85,
  "driftDetected": true,
  "driftRegions": [
    {
      "x": 0.3,
      "y": 0.2,
      "width": 0.15,
      "height": 0.1,
      "severity": "medium",
      "description": "Eye color shifted from blue to green",
      "category": "color"
    }
  ],
  "summary": "Brief overall assessment",
  "details": {
    "colorConsistency": 0.9,
    "shapeConsistency": 0.8,
    "textureConsistency": 0.85,
    "characterMatch": 0.75
  },
  "recommendations": [
    "Increase character reference strength",
    "Add 'blue eyes' to prompt"
  ]
}

Rules:
- overallScore: 0-1 where 1 is perfect match, 0 is completely different
- driftRegions: Use normalized coordinates (0-1) relative to image dimensions
- severity: "low" = minor, "medium" = noticeable, "high" = significant break
- category: "color" | "shape" | "texture" | "missing" | "added" | "position"
- Be specific in descriptions (e.g., "hair color changed from blonde to brown")
- Provide actionable recommendations`;
  }

  /**
   * Parse the Grok Vision response
   */
  private parseAnalysisResponse(response: string): ContinuityResult {
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          overallScore: Math.max(0, Math.min(1, parsed.overallScore || 0.5)),
          driftDetected: parsed.driftDetected ?? parsed.overallScore < 0.9,
          driftRegions: (parsed.driftRegions || []).map((r: any) => ({
            x: Math.max(0, Math.min(1, r.x || 0)),
            y: Math.max(0, Math.min(1, r.y || 0)),
            width: Math.max(0, Math.min(1, r.width || 0.1)),
            height: Math.max(0, Math.min(1, r.height || 0.1)),
            severity: r.severity || 'medium',
            description: r.description || 'Unknown drift',
            category: r.category || 'shape',
          })),
          summary: parsed.summary || 'Analysis complete',
          details: {
            colorConsistency: parsed.details?.colorConsistency || 0.5,
            shapeConsistency: parsed.details?.shapeConsistency || 0.5,
            textureConsistency: parsed.details?.textureConsistency || 0.5,
            characterMatch: parsed.details?.characterMatch || 0.5,
          },
          recommendations: parsed.recommendations || [],
        };
      }
    } catch (parseError) {
      console.error('[Continuity] Failed to parse response:', parseError);
      console.log('[Continuity] Raw response:', response);
    }

    // Default fallback
    return {
      overallScore: 0.5,
      driftDetected: true,
      driftRegions: [],
      summary: 'Unable to parse analysis',
      details: {
        colorConsistency: 0.5,
        shapeConsistency: 0.5,
        textureConsistency: 0.5,
        characterMatch: 0.5,
      },
      recommendations: [],
    };
  }

  /**
   * Compare multiple frames for scene consistency
   */
  async checkSceneConsistency(
    frames: string[],
    options: {
      referenceFrame?: string; // Use first frame if not specified
      characterNames?: string[];
    } = {}
  ): Promise<{
    frameResults: Map<number, ContinuityResult>;
    averageScore: number;
    worstFrame: number;
    driftTrend: 'stable' | 'increasing' | 'decreasing';
  }> {
    const referenceFrame = options.referenceFrame || frames[0];
    const frameResults = new Map<number, ContinuityResult>();
    let totalScore = 0;
    let worstScore = 1;
    let worstFrame = 0;
    const scores: number[] = [];

    for (let i = 0; i < frames.length; i++) {
      if (frames[i] === referenceFrame) {
        // Skip reference frame
        frameResults.set(i, {
          overallScore: 1,
          driftDetected: false,
          driftRegions: [],
          summary: 'Reference frame',
          details: {
            colorConsistency: 1,
            shapeConsistency: 1,
            textureConsistency: 1,
            characterMatch: 1,
          },
          recommendations: [],
        });
        scores.push(1);
        totalScore += 1;
        continue;
      }

      const result = await this.checkContinuity(referenceFrame, frames[i], {
        checkCharacters: !!options.characterNames?.length,
        characterNames: options.characterNames,
      });

      frameResults.set(i, result);
      scores.push(result.overallScore);
      totalScore += result.overallScore;

      if (result.overallScore < worstScore) {
        worstScore = result.overallScore;
        worstFrame = i;
      }
    }

    // Calculate drift trend
    let driftTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (scores.length > 2) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg < firstAvg - 0.1) {
        driftTrend = 'increasing'; // Drift is getting worse
      } else if (secondAvg > firstAvg + 0.1) {
        driftTrend = 'decreasing'; // Drift is improving
      }
    }

    return {
      frameResults,
      averageScore: totalScore / frames.length,
      worstFrame,
      driftTrend,
    };
  }
}

// Export singleton instance
export const continuityService = ContinuityService.getInstance();

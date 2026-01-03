/**
 * ThumbnailGeneratorService - Generates YouTube-optimized thumbnails
 *
 * Creates eye-catching thumbnails using AI generation with:
 * - Archetype-aware styling (tech reviewer vs vlogger vs gamer)
 * - Text overlay suggestions (clickbait-optimized)
 * - Face emphasis and emotion enhancement
 * - A/B variant generation for testing
 */

import { FalAIAdapter } from '../generators/FalAIAdapter';
import { LLMService } from '../LLMService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ThumbnailRequest {
  /** Project ID for storage */
  projectId: string;
  /** Video title for context */
  videoTitle: string;
  /** Brief description of video content */
  videoDescription: string;
  /** Content creator archetype */
  archetype:
    | 'vlogger'
    | 'tech_reviewer'
    | 'video_essay'
    | 'gamer'
    | 'shorts'
    | 'tutorial'
    | 'podcast'
    | 'custom';
  /** Genre for style adaptation */
  genre: 'youtuber' | 'onlyfans';
  /** Optional reference image (creator's face, product, etc.) */
  referenceImageUrl?: string;
  /** Generate A/B variants */
  generateVariants?: boolean;
  /** Number of variants (1-4) */
  variantCount?: number;
  /** Custom style override */
  customStyle?: string;
}

export interface ThumbnailResult {
  /** Primary thumbnail URL */
  thumbnailUrl: string;
  /** Suggested text overlay */
  textOverlay: {
    primary: string;
    secondary?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  /** A/B variants if requested */
  variants?: Array<{
    url: string;
    style: string;
    textOverlay: { primary: string; secondary?: string };
  }>;
  /** Generation prompt used */
  prompt: string;
  /** Style applied */
  appliedStyle: string;
}

// Unified style interface for both YouTube and Adult content
interface ThumbnailStyle {
  visualStyle: string;
  guidanceText: string; // emotionGuidance for YouTube, moodGuidance for adult
  compositionTips: string;
  colorPalette: string;
  textStyle?: string; // Optional, YouTube-only
}

// ═══════════════════════════════════════════════════════════════════════════
// ARCHETYPE THUMBNAIL STYLES
// ═══════════════════════════════════════════════════════════════════════════

const ARCHETYPE_THUMBNAIL_STYLES: Record<string, ThumbnailStyle> = {
  vlogger: {
    visualStyle: 'bright, colorful, dynamic energy, lifestyle aesthetic',
    guidanceText: 'excited expression, wide eyes, open mouth reaction, genuine surprise',
    compositionTips: 'face prominently featured, looking at camera or pointing at subject',
    colorPalette: 'vibrant yellows, bright blues, warm oranges, high saturation',
    textStyle: 'bold sans-serif, high contrast, drop shadow, 2-3 words max',
  },
  tech_reviewer: {
    visualStyle: 'clean, minimal, professional studio lighting, product focus',
    guidanceText: 'thoughtful expression, raised eyebrow, analytical look',
    compositionTips: 'product in foreground, reviewer slightly behind, clean background',
    colorPalette: 'tech blues, clean whites, accent neon, low saturation background',
    textStyle: 'modern sans-serif, clean lines, tech aesthetic, specs/numbers highlighted',
  },
  video_essay: {
    visualStyle: 'cinematic, moody, artistic composition, film grain optional',
    guidanceText: 'contemplative, serious, intellectual curiosity',
    compositionTips: 'subject matter imagery, conceptual visuals, less face-focused',
    colorPalette: 'muted tones, cinematic color grading, teal and orange, desaturated',
    textStyle: 'elegant serif or bold sans, minimal text, provocative question',
  },
  gamer: {
    visualStyle: 'high energy, RGB lighting, gaming setup aesthetic, screen glow',
    guidanceText: 'intense focus, victory celebration, shocked reaction',
    compositionTips: 'gameplay in background, face reaction prominent, gaming peripherals visible',
    colorPalette: 'neon RGB colors, dark backgrounds, glowing accents, purple and green',
    textStyle: 'bold impact font, glowing effects, esports aesthetic, ALL CAPS',
  },
  shorts: {
    visualStyle: 'vertical composition, bold and simple, mobile-first design',
    guidanceText: 'extreme expressions, maximum engagement, hook-focused',
    compositionTips: 'central focus, minimal clutter, instant visual impact',
    colorPalette: 'high contrast, trending colors, eye-catching combinations',
    textStyle: 'large bold text, emoji optional, single word hooks',
  },
  tutorial: {
    visualStyle: 'clean, educational, before/after splits, step indicators',
    guidanceText: 'friendly, approachable, helpful expression',
    compositionTips: 'clear subject demonstration, numbered steps, result preview',
    colorPalette: 'trustworthy blues, clean whites, educational green accents',
    textStyle: 'clear readable fonts, numbered badges, how-to format',
  },
  podcast: {
    visualStyle: 'professional studio, dual/multi person setup, microphones visible',
    guidanceText: 'engaged conversation, laughing, deep discussion',
    compositionTips: 'guest featured prominently, host reaction, studio atmosphere',
    colorPalette: 'warm studio lighting, professional tones, brand colors',
    textStyle: 'guest name prominent, episode topic, quotation marks for quotes',
  },
  custom: {
    visualStyle: 'adaptable based on content',
    guidanceText: 'authentic expression matching content tone',
    compositionTips: 'subject-focused composition',
    colorPalette: 'brand-appropriate colors',
    textStyle: 'readable, on-brand typography',
  },
};

// Adult content styles (tasteful/suggestive, not explicit)
const ADULT_THUMBNAIL_STYLES: Record<string, ThumbnailStyle> = {
  gfe: {
    visualStyle: 'intimate, warm, inviting, soft focus, personal connection',
    guidanceText: 'welcoming smile, eye contact, approachable warmth',
    compositionTips: 'close framing, soft lighting, personal space feel',
    colorPalette: 'warm pinks, soft lighting, intimate atmosphere',
  },
  cosplay: {
    visualStyle: 'character-accurate, dramatic lighting, fantasy aesthetic',
    guidanceText: 'in-character expression, dramatic pose, fantasy mood',
    compositionTips: 'costume details visible, character-appropriate setting',
    colorPalette: 'character-appropriate, anime/game inspired',
  },
  boudoir: {
    visualStyle: 'elegant, artistic, tasteful glamour, professional photography',
    guidanceText: 'confident, sensual but classy, empowered',
    compositionTips: 'artistic angles, silhouette options, elegant setting',
    colorPalette: 'rich blacks, golds, deep reds, luxury aesthetic',
  },
  custom: {
    visualStyle: 'creator-defined aesthetic',
    guidanceText: 'authentic personal brand',
    compositionTips: 'brand-consistent composition',
    colorPalette: 'personal brand colors',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class ThumbnailGeneratorService {
  private static instance: ThumbnailGeneratorService;
  private falAdapter: FalAIAdapter;

  private constructor() {
    this.falAdapter = new FalAIAdapter();
  }

  static getInstance(): ThumbnailGeneratorService {
    if (!ThumbnailGeneratorService.instance) {
      ThumbnailGeneratorService.instance = new ThumbnailGeneratorService();
    }
    return ThumbnailGeneratorService.instance;
  }

  /**
   * Generate a YouTube-optimized thumbnail
   */
  async generateThumbnail(request: ThumbnailRequest): Promise<ThumbnailResult> {
    const {
      archetype,
      genre,
      videoTitle,
      videoDescription,
      referenceImageUrl,
      generateVariants,
      variantCount = 2,
    } = request;

    // Get archetype-specific style
    const style: ThumbnailStyle =
      genre === 'onlyfans'
        ? ADULT_THUMBNAIL_STYLES[archetype] || ADULT_THUMBNAIL_STYLES.custom
        : ARCHETYPE_THUMBNAIL_STYLES[archetype] || ARCHETYPE_THUMBNAIL_STYLES.custom;

    // Generate text overlay suggestion
    const textOverlay = await this.generateTextOverlay(
      videoTitle,
      videoDescription,
      archetype,
      genre
    );

    // Build the generation prompt
    const prompt = this.buildThumbnailPrompt(request, style, textOverlay);

    // Generate the primary thumbnail
    const primaryResult = await this.falAdapter.generateImage({
      prompt,
      aspectRatio: '16:9', // YouTube thumbnail ratio
      model: 'fal-ai/flux-pro/v1.1', // High quality for thumbnails
      elementReferences: referenceImageUrl ? [referenceImageUrl] : undefined,
    });

    const result: ThumbnailResult = {
      thumbnailUrl: primaryResult.outputs?.[0] || '',
      textOverlay,
      prompt,
      appliedStyle: JSON.stringify(style),
    };

    // Generate A/B variants if requested
    if (generateVariants && variantCount > 1) {
      result.variants = await this.generateVariants(request, style, variantCount - 1);
    }

    return result;
  }

  /**
   * Generate text overlay suggestions using LLM
   */
  private async generateTextOverlay(
    title: string,
    description: string,
    archetype: string,
    genre: string
  ): Promise<ThumbnailResult['textOverlay']> {
    const llmService = new LLMService(genre === 'onlyfans' ? 'dolphin' : 'grok');

    try {
      const response = await llmService.generate({
        prompt: `Generate a short, punchy thumbnail text overlay for this YouTube video.

Video Title: ${title}
Description: ${description}
Creator Type: ${archetype}

Rules:
- Primary text: 2-4 words MAX, creates curiosity/urgency
- Use power words: FREE, NEW, SHOCKING, SECRET, EASY, FAST, etc.
- Create an information gap (make them want to click)
- Optional secondary text: 1-2 words for context

Respond in JSON format:
{
    "primary": "MAIN TEXT",
    "secondary": "optional context",
    "position": "top-right"
}

Position options: top-left, top-right, bottom-left, bottom-right, center`,
        temperature: 0.8,
        maxTokens: 200,
      });

      // Parse LLM response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to generate text overlay:', error);
    }

    // Fallback: extract key words from title
    const words = title.split(' ').slice(0, 3).join(' ').toUpperCase();
    return {
      primary: words || 'WATCH NOW',
      position: 'bottom-right',
    };
  }

  /**
   * Build the image generation prompt
   */
  private buildThumbnailPrompt(
    request: ThumbnailRequest,
    style: ThumbnailStyle,
    textOverlay: ThumbnailResult['textOverlay']
  ): string {
    const { videoTitle, videoDescription, customStyle, genre } = request;

    const basePrompt = `YouTube thumbnail, ${style.visualStyle}, ${style.guidanceText}`;

    const compositionPrompt = `Composition: ${style.compositionTips}`;

    const colorPrompt = `Color palette: ${style.colorPalette}`;

    // Build context from video info
    const contextPrompt = `Content context: ${videoTitle}, ${videoDescription}`;

    // Add text placeholder indication (actual text added in post)
    const textPrompt = `Space for text overlay in ${textOverlay.position} area, "${textOverlay.primary}"`;

    // Combine all elements
    const fullPrompt = [
      basePrompt,
      compositionPrompt,
      colorPrompt,
      contextPrompt,
      textPrompt,
      customStyle || '',
      'high resolution, 1280x720, thumbnail optimized, eye-catching, scroll-stopping',
    ]
      .filter(Boolean)
      .join('. ');

    return fullPrompt;
  }

  /**
   * Generate A/B test variants with different styles
   */
  private async generateVariants(
    request: ThumbnailRequest,
    baseStyle: ThumbnailStyle,
    count: number
  ): Promise<ThumbnailResult['variants']> {
    const variants: ThumbnailResult['variants'] = [];

    const styleVariations = [
      {
        name: 'High Contrast',
        modifier: 'extremely high contrast, bold colors, dramatic lighting',
      },
      {
        name: 'Minimal Clean',
        modifier: 'minimal design, clean composition, lots of negative space',
      },
      { name: 'Retro Pop', modifier: 'retro aesthetic, 80s colors, nostalgic vibe' },
      { name: 'Dark Moody', modifier: 'dark background, moody lighting, mysterious atmosphere' },
    ];

    for (let i = 0; i < Math.min(count, styleVariations.length); i++) {
      const variation = styleVariations[i];

      // Generate variant text overlay
      const variantText = await this.generateTextOverlay(
        request.videoTitle,
        request.videoDescription,
        request.archetype,
        request.genre
      );

      // Build variant prompt
      const variantPrompt =
        this.buildThumbnailPrompt(request, baseStyle, variantText) + `, ${variation.modifier}`;

      try {
        const result = await this.falAdapter.generateImage({
          prompt: variantPrompt,
          aspectRatio: '16:9',
          model: 'fal-ai/flux-pro/v1.1',
          elementReferences: request.referenceImageUrl ? [request.referenceImageUrl] : undefined,
        });

        variants.push({
          url: result.outputs?.[0] || '',
          style: variation.name,
          textOverlay: variantText,
        });
      } catch (error) {
        console.error(`Failed to generate variant ${variation.name}:`, error);
      }
    }

    return variants;
  }

  /**
   * Get available archetype styles for UI display
   */
  getArchetypeStyles(
    genre: 'youtuber' | 'onlyfans'
  ): Array<{ key: string; name: string; description: string }> {
    const styles = genre === 'onlyfans' ? ADULT_THUMBNAIL_STYLES : ARCHETYPE_THUMBNAIL_STYLES;

    return Object.entries(styles).map(([key, style]) => ({
      key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: style.visualStyle,
    }));
  }
}

export default ThumbnailGeneratorService;

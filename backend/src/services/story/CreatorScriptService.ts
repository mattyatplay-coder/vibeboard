/**
 * CreatorScriptService - Generates scripts optimized for algorithm performance
 *
 * Unlike narrative/cinema scripts, content creator scripts are:
 * - Retention-focused (Hook → Body → CTA → Payoff)
 * - Algorithm-optimized (viewer retention, watch time, engagement)
 * - Platform-aware (YouTube, OnlyFans, TikTok)
 *
 * Uses archetype styleHints to adapt camera/lighting/pacing instructions
 */

import { LLMService } from '../LLMService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ArchetypeData {
  label: string;
  description: string;
  styleHint: string;
  recommendedLens?: string;
  lightingPreset?: string;
  audioPreset?: string;
}

export interface ContentScriptRequest {
  genre: 'youtuber' | 'onlyfans';
  archetype: string;
  archetypeData: ArchetypeData;
  hook: string;
  concept: string;
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'onlyfans';
  duration?: 'short' | 'medium' | 'long'; // <1min, 1-10min, 10min+
  isAdult?: boolean;
}

export interface ContentScriptSection {
  type: 'hook' | 'body' | 'cta' | 'payoff';
  timestamp: string; // e.g., "0:00-0:30"
  duration: number; // seconds
  content: string; // Script text
  cameraDirection: string;
  shotType: 'A-ROLL' | 'B-ROLL';
  notes?: string;
}

export interface GeneratedContentScript {
  title: string;
  thumbnail: {
    suggestion: string;
    textOverlay?: string;
  };
  hook: ContentScriptSection;
  body: ContentScriptSection[];
  cta: ContentScriptSection;
  payoff: ContentScriptSection;
  metadata: {
    estimatedDuration: number;
    archetype: string;
    styleHint: string;
    platform: string;
    hashtags?: string[];
    seoKeywords?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const YOUTUBE_SYSTEM_PROMPT = `You are a professional YouTube Scriptwriter optimized for Algorithm Performance.
Your scripts are designed for maximum viewer retention and engagement.

CRITICAL RULES:
1. The HOOK (first 30 seconds) is EVERYTHING. If viewers don't stay, nothing else matters.
2. Use open loops - tease what's coming but don't reveal it yet.
3. Every 30-60 seconds needs a "pattern interrupt" to maintain attention.
4. End with a clear CTA (Call to Action) - subscribe, like, comment prompt.

FORMATTING:
- [A-ROLL] = Creator speaking directly to camera
- [B-ROLL] = Overlay footage, product shots, graphics
- [GRAPHICS] = Text overlays, lower thirds, callouts
- [SFX] = Sound effects, music cues

RETENTION TECHNIQUES:
- "But wait..." / "Here's the thing..." / "What happened next..."
- Visual cuts every 3-5 seconds during high-energy sections
- Pattern interrupts: zoom, sound effect, b-roll, graphics
- Open loops that get paid off later in the video`;

const ADULT_SYSTEM_PROMPT = `You are a creative director for exclusive subscription content.
Your scripts focus on anticipation, pacing, and aesthetic presentation.

APPROACH:
1. Build anticipation through visual storytelling
2. Focus on mood, lighting, and atmosphere
3. Pacing that rewards viewer patience
4. Aesthetic value over explicit content

FORMATTING:
- [INTRO] = Opening teaser, silhouette, or aesthetic shot
- [REVEAL] = Gradual reveals, costume details, setting
- [A-ROLL] = Direct address, personality moments
- [B-ROLL] = Atmospheric shots, detail closeups
- [TRANSITION] = Mood changes, outfit changes

IMPORTANT: Content descriptions should be tasteful and suggestive rather than explicit.
Focus on the creative direction, mood, and aesthetic rather than explicit content.`;

// ═══════════════════════════════════════════════════════════════════════════
// CREATOR SCRIPT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class CreatorScriptService {
  private static instance: CreatorScriptService;

  private constructor() {}

  static getInstance(): CreatorScriptService {
    if (!CreatorScriptService.instance) {
      CreatorScriptService.instance = new CreatorScriptService();
    }
    return CreatorScriptService.instance;
  }

  /**
   * Generate a content creator script based on archetype and hook
   */
  async generateContentScript(request: ContentScriptRequest): Promise<GeneratedContentScript> {
    const {
      genre,
      archetype,
      archetypeData,
      hook,
      concept,
      platform = 'youtube',
      duration = 'medium',
      isAdult = false,
    } = request;

    // Select appropriate system prompt
    const systemPrompt = isAdult ? ADULT_SYSTEM_PROMPT : YOUTUBE_SYSTEM_PROMPT;

    // Build the generation prompt
    const userPrompt = this.buildGenerationPrompt(request);

    // Call LLM - use Dolphin for mature content (uncensored), Grok otherwise
    const llmService = new LLMService(isAdult ? 'dolphin' : 'grok');
    const llmResponse = await llmService.generate({
      prompt: userPrompt,
      systemPrompt: `${systemPrompt}

STYLE GUIDE FOR THIS VIDEO:
- Archetype: ${archetypeData.label}
- Visual Language: ${archetypeData.styleHint}
${archetypeData.recommendedLens ? `- Recommended Lens: ${archetypeData.recommendedLens}` : ''}
${archetypeData.lightingPreset ? `- Lighting Preset: ${archetypeData.lightingPreset}` : ''}
${archetypeData.audioPreset ? `- Audio Style: ${archetypeData.audioPreset}` : ''}

THE HOOK (CRITICAL - First 30 Seconds):
${hook}

Respond in JSON format with the structure defined in the prompt.`,
      temperature: 0.8,
      maxTokens: 4000,
    });

    // Parse response - extract content from LLMResponse
    return this.parseScriptResponse(llmResponse.content, request);
  }

  /**
   * Build the user prompt for script generation
   */
  private buildGenerationPrompt(request: ContentScriptRequest): string {
    const { concept, duration, platform, isAdult } = request;

    const durationGuide = {
      short: { total: 60, hook: 5, body: 45, cta: 10 },
      medium: { total: 600, hook: 30, body: 520, cta: 50 },
      long: { total: 1200, hook: 30, body: 1100, cta: 70 },
    }[duration || 'medium'];

    return `Generate a ${isAdult ? 'exclusive content' : 'viral YouTube'} script for the following concept:

CONCEPT: ${concept}

TARGET DURATION: ~${durationGuide.total} seconds (${Math.floor(durationGuide.total / 60)}:${String(durationGuide.total % 60).padStart(2, '0')})
PLATFORM: ${platform || 'youtube'}

Generate a complete script with the following JSON structure:
{
    "title": "Catchy, clickable title",
    "thumbnail": {
        "suggestion": "Description of thumbnail visual",
        "textOverlay": "2-3 word text overlay (optional)"
    },
    "hook": {
        "type": "hook",
        "timestamp": "0:00-0:30",
        "duration": ${durationGuide.hook},
        "content": "Exact script text for the hook",
        "cameraDirection": "Camera/framing instructions",
        "shotType": "A-ROLL or B-ROLL",
        "notes": "Additional direction"
    },
    "body": [
        {
            "type": "body",
            "timestamp": "0:30-3:00",
            "duration": 150,
            "content": "Script for body section 1",
            "cameraDirection": "Camera direction",
            "shotType": "A-ROLL",
            "notes": "Pattern interrupt at 1:30"
        },
        // ... more body sections (aim for 3-5 beats)
    ],
    "cta": {
        "type": "cta",
        "timestamp": "9:00-9:30",
        "duration": ${durationGuide.cta},
        "content": "Call to action script",
        "cameraDirection": "Camera direction",
        "shotType": "A-ROLL"
    },
    "payoff": {
        "type": "payoff",
        "timestamp": "9:30-10:00",
        "duration": 30,
        "content": "Payoff/conclusion script",
        "cameraDirection": "Camera direction",
        "shotType": "A-ROLL or B-ROLL"
    },
    "metadata": {
        "estimatedDuration": ${durationGuide.total},
        "archetype": "${request.archetype}",
        "styleHint": "${request.archetypeData.styleHint}",
        "platform": "${platform}",
        "hashtags": ["#relevant", "#hashtags"],
        "seoKeywords": ["seo", "keywords"]
    }
}

IMPORTANT:
1. The HOOK must grab attention in the first 5 seconds
2. Each body section should be a distinct "beat" with a pattern interrupt
3. Include specific camera directions that match the archetype's style
4. The CTA should feel natural, not forced
5. The payoff should deliver on promises made in the hook`;
  }

  /**
   * Parse the LLM response into a structured script
   */
  private parseScriptResponse(
    response: string,
    request: ContentScriptRequest
  ): GeneratedContentScript {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as GeneratedContentScript;
      }
    } catch (error) {
      console.error('Failed to parse script response as JSON:', error);
    }

    // Fallback: create a basic structure from the text response
    return {
      title: `${request.archetypeData.label} Style Video`,
      thumbnail: {
        suggestion: 'Thumbnail based on concept',
      },
      hook: {
        type: 'hook',
        timestamp: '0:00-0:30',
        duration: 30,
        content: request.hook || 'Opening hook...',
        cameraDirection: request.archetypeData.styleHint,
        shotType: 'A-ROLL',
      },
      body: [
        {
          type: 'body',
          timestamp: '0:30-5:00',
          duration: 270,
          content: response,
          cameraDirection: 'Match archetype style',
          shotType: 'A-ROLL',
        },
      ],
      cta: {
        type: 'cta',
        timestamp: '5:00-5:30',
        duration: 30,
        content: 'Remember to like and subscribe!',
        cameraDirection: 'Direct address',
        shotType: 'A-ROLL',
      },
      payoff: {
        type: 'payoff',
        timestamp: '5:30-6:00',
        duration: 30,
        content: 'Thanks for watching!',
        cameraDirection: 'Wide shot, wave',
        shotType: 'A-ROLL',
      },
      metadata: {
        estimatedDuration: 360,
        archetype: request.archetype,
        styleHint: request.archetypeData.styleHint,
        platform: request.platform || 'youtube',
      },
    };
  }

  /**
   * Generate shot list from content script
   */
  generateShotList(script: GeneratedContentScript): string[] {
    const shots: string[] = [];

    // Hook shots
    shots.push(`[HOOK] ${script.hook.shotType}: ${script.hook.cameraDirection}`);

    // Body shots
    script.body.forEach((section, index) => {
      shots.push(`[BODY ${index + 1}] ${section.shotType}: ${section.cameraDirection}`);
    });

    // CTA
    shots.push(`[CTA] ${script.cta.shotType}: ${script.cta.cameraDirection}`);

    // Payoff
    shots.push(`[PAYOFF] ${script.payoff.shotType}: ${script.payoff.cameraDirection}`);

    return shots;
  }

  /**
   * Generate visual prompts for AI generation based on script sections
   */
  async generateVisualPrompts(script: GeneratedContentScript): Promise<Record<string, string>> {
    const prompts: Record<string, string> = {};

    // Build base style from metadata
    const stylePrefix = script.metadata.styleHint;

    // Hook visual
    prompts.hook = `${stylePrefix}, ${script.hook.cameraDirection}, ${script.hook.shotType === 'A-ROLL' ? 'speaking to camera' : 'cinematic b-roll'}, high energy opening`;

    // Body visuals
    script.body.forEach((section, index) => {
      prompts[`body_${index}`] =
        `${stylePrefix}, ${section.cameraDirection}, ${section.shotType === 'A-ROLL' ? 'presenter' : 'atmospheric footage'}`;
    });

    // CTA visual
    prompts.cta = `${stylePrefix}, ${script.cta.cameraDirection}, engaging call to action, subscribe graphic overlay`;

    // Payoff visual
    prompts.payoff = `${stylePrefix}, ${script.payoff.cameraDirection}, satisfying conclusion, end screen friendly`;

    return prompts;
  }
}

export default CreatorScriptService;

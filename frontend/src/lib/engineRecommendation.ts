import { Tag } from '../components/tag-system/TagSelector';
import { VideoEngine } from '../types/promptWizardTypes';

export const ENGINES: Record<string, VideoEngine> = {
  kling: {
    id: 'kling',
    name: 'Kling AI',
    description: 'High-quality cinematic video generation',
    capabilities: {
      maxDuration: 10,
      resolutions: ['1080p', '720p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
    },
    costPerSecond: 1.5,
  },
  wan: {
    id: 'wan',
    name: 'Wan 2.5',
    description: 'Fast and efficient motion generation',
    capabilities: {
      maxDuration: 10,
      resolutions: ['720p'],
      aspectRatios: ['16:9', '9:16'],
    },
    costPerSecond: 1.0,
  },
  ltx: {
    id: 'ltx',
    name: 'LTX Video',
    description: 'Budget-friendly rapid prototyping',
    capabilities: {
      maxDuration: 5,
      resolutions: ['720p'],
      aspectRatios: ['16:9'],
    },
    costPerSecond: 0.5,
  },
  veo: {
    id: 'veo',
    name: 'Google Veo',
    description: 'Advanced physics and lighting simulation',
    capabilities: {
      maxDuration: 60,
      resolutions: ['1080p', '4k'],
      aspectRatios: ['16:9', '9:16', '1:1'],
    },
    costPerSecond: 2.5,
  },
  sora: {
    id: 'sora',
    name: 'OpenAI Sora',
    description: 'State-of-the-art realistic video',
    capabilities: {
      maxDuration: 60,
      resolutions: ['1080p'],
      aspectRatios: ['16:9'],
    },
    costPerSecond: 3.0,
  },
  luma: {
    id: 'luma',
    name: 'Luma Dream Machine',
    description: 'Creative and artistic transitions',
    capabilities: {
      maxDuration: 5,
      resolutions: ['720p'],
      aspectRatios: ['16:9'],
    },
    costPerSecond: 0.8,
  },
};

interface EngineRecommendation {
  engine: VideoEngine;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  bestFor: string;
  maxDuration: string;
  estimatedCost: number;
  alternative?: {
    name: string;
    benefit: string;
  };
}

export function recommendEngine(prompt: string, tags: Tag[]): EngineRecommendation {
  // Extract features from prompt and tags
  const hasCharacter = detectCharacter(prompt);
  const hasMotion = detectMotion(prompt, tags);
  const hasCameraWork = tags.some(t => t.category === 'Shots' || t.category === 'Camera Motion');
  const hasComplexLighting = tags.some(
    t =>
      t.category === 'Lighting' &&
      ['cinematic', 'volumetric', 'dramatic'].includes(t.name.toLowerCase())
  );
  const promptLength = prompt.split(' ').length;
  const actionTags = tags.filter(t => t.category === 'Energy');

  // Decision tree
  if (hasCharacter && hasCameraWork) {
    return {
      engine: ENGINES.kling,
      reasoning:
        'Your prompt includes character animation and camera control. Kling excels at character consistency and cinematic camera movements.',
      confidence: 'high',
      bestFor: 'Character-focused videos with camera work',
      maxDuration: 'Up to 10 seconds',
      estimatedCost: 15,
      alternative: {
        name: 'Wan 2.5',
        benefit: 'Faster generation, 10 credits',
      },
    };
  }

  if (actionTags.length >= 2 || hasMotion) {
    return {
      engine: ENGINES.wan,
      reasoning:
        'Your scene has significant motion. Wan 2.5 provides excellent motion quality with fast generation.',
      confidence: 'high',
      bestFor: 'Dynamic action scenes',
      maxDuration: 'Up to 10 seconds',
      estimatedCost: 10,
      alternative: {
        name: 'LTX Video',
        benefit: 'More budget-friendly, 5 credits',
      },
    };
  }

  if (hasComplexLighting && promptLength > 30) {
    return {
      engine: ENGINES.veo,
      reasoning:
        "Your detailed prompt with complex lighting will benefit from Veo's advanced rendering capabilities.",
      confidence: 'high',
      bestFor: 'Cinematic quality, detailed scenes',
      maxDuration: 'Up to 30 seconds',
      estimatedCost: 25,
      alternative: {
        name: 'Kling 1.5 Pro',
        benefit: 'Similar quality, 15 credits',
      },
    };
  }

  // Default recommendation
  return {
    engine: ENGINES.wan,
    reasoning: 'Wan 2.5 offers excellent balance of quality, speed, and cost for your content.',
    confidence: 'medium',
    bestFor: 'General purpose video generation',
    maxDuration: 'Up to 10 seconds',
    estimatedCost: 10,
    alternative: {
      name: 'LTX Video',
      benefit: 'Faster and cheaper, 5 credits',
    },
  };
}

function detectCharacter(prompt: string): boolean {
  const characterKeywords = [
    'person',
    'man',
    'woman',
    'boy',
    'girl',
    'character',
    'human',
    'face',
    'portrait',
    'figure',
    'people',
  ];
  return characterKeywords.some(kw => prompt.toLowerCase().includes(kw));
}

function detectMotion(prompt: string, tags: Tag[]): boolean {
  const motionKeywords = [
    'walk',
    'run',
    'move',
    'dance',
    'jump',
    'fly',
    'swimming',
    'running',
    'walking',
    'motion',
  ];

  const hasMotionInPrompt = motionKeywords.some(kw => prompt.toLowerCase().includes(kw));

  const hasMotionTags = tags.some(
    t => t.category === 'Energy' && ['dynamic', 'kinetic', 'fast'].includes(t.name.toLowerCase())
  );

  return hasMotionInPrompt || hasMotionTags;
}

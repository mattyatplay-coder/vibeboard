import { VideoEngine } from '../types/promptWizardTypes';

export const ENGINES: Record<string, VideoEngine> = {
  kling: {
    id: 'kling',
    name: 'Kling 1.5 Pro',
    description: 'Best for character consistency and cinematic camera movements.',
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
    description: 'Excellent motion quality and fast generation.',
    capabilities: {
      maxDuration: 10,
      resolutions: ['1080p', '720p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
    },
    costPerSecond: 1.0,
  },
  ltx: {
    id: 'ltx',
    name: 'LTX Video',
    description: 'Budget-friendly option for quick iterations.',
    capabilities: {
      maxDuration: 5,
      resolutions: ['720p'],
      aspectRatios: ['16:9', '9:16', '1:1'],
    },
    costPerSecond: 0.5,
  },
  veo: {
    id: 'veo',
    name: 'Google Veo',
    description: 'High fidelity and detailed textures, great for complex lighting.',
    capabilities: {
      maxDuration: 30,
      resolutions: ['1080p'],
      aspectRatios: ['16:9'],
    },
    costPerSecond: 2.5,
  },
  sora: {
    id: 'sora',
    name: 'OpenAI Sora',
    description: 'State-of-the-art realism and physics simulation.',
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
    description: 'Creative and artistic generations.',
    capabilities: {
      maxDuration: 5,
      resolutions: ['720p'],
      aspectRatios: ['16:9'],
    },
    costPerSecond: 0.8,
  },
};

export const AVAILABLE_ENGINES = Object.values(ENGINES);

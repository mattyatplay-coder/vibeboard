import { SceneGenerationConfig } from '../components/storyboard/SceneGeneratorModal';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: Partial<SceneGenerationConfig>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'product-commercial',
    name: 'Product Commercial',
    description: 'Clean, high-quality product showcase with smooth camera movement.',
    icon: '🛍️',
    config: {
      mode: 'text_to_video',
      shotTypes: ['Close-up', 'Macro'],
      cameraAngles: ['Eye Level'],
      lighting: 'Studio Lighting',
      location: 'Clean Studio Background',
      resolution: '4k',
      aspectRatio: '16:9',
      cameraMovement: { type: 'pan', direction: 'right', intensity: 3 },
      prompt:
        'Cinematic product shot of [Product Name], professional lighting, 8k resolution, highly detailed texture, slow smooth motion.',
    },
  },
  {
    id: 'cinematic-trailer',
    name: 'Cinematic Trailer',
    description: 'Epic, wide-screen movie trailer style with dramatic lighting.',
    icon: '🎬',
    config: {
      mode: 'text_to_video',
      shotTypes: ['Wide Shot', 'Extreme Wide Shot'],
      cameraAngles: ['Low Angle'],
      lighting: 'Dramatic, Volumetric',
      location: 'Epic Landscape',
      resolution: '4k',
      aspectRatio: '2.35:1',
      cameraMovement: { type: 'zoom', direction: 'in', intensity: 4 },
      prompt:
        'Epic cinematic shot of [Subject], dramatic atmosphere, movie trailer style, volumetric fog, anamorphic lens flares, color graded.',
    },
  },
  {
    id: 'social-media-short',
    name: 'Social Media Short',
    description: 'Vertical format, energetic style for TikTok/Reels.',
    icon: '📱',
    config: {
      mode: 'text_to_video',
      shotTypes: ['Medium Shot'],
      cameraAngles: ['Eye Level'],
      lighting: 'Bright, High Key',
      location: 'Modern Urban Setting',
      resolution: '1080p',
      aspectRatio: '9:16',
      cameraMovement: { type: 'static' },
      prompt:
        'Trendy social media clip of [Subject], vibrant colors, sharp focus, modern aesthetic, high energy.',
    },
  },
  {
    id: 'character-portrait',
    name: 'Character Portrait',
    description: 'Intimate, detailed character study with subtle movement.',
    icon: '👤',
    config: {
      mode: 'text_to_video',
      shotTypes: ['Close-up', 'Over the Shoulder'],
      cameraAngles: ['Eye Level'],
      lighting: 'Rembrandt Lighting',
      location: 'Blurred Background',
      resolution: '4k',
      aspectRatio: '16:9',
      cameraMovement: { type: 'roll', direction: 'cw', intensity: 2 },
      prompt:
        'Detailed portrait of [Character], expressive eyes, skin texture, subtle movement, emotional atmosphere, bokeh background.',
    },
  },
];

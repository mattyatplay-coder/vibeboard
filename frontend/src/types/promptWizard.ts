// ============================================================================
// VIBEBOARD UX COMPONENTS - TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// TAG SYSTEM TYPES
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  category: string;
  promptKeyword: string;
  color?: string;
  description?: string;
}

export interface TagCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
  availableCategories?: string[];
  className?: string;
}

// ============================================================================
// MOTION SLIDER TYPES
// ============================================================================

export type EngineType = 'kling' | 'veo' | 'sora' | 'wan' | 'luma';

export interface MotionPreset {
  value: number;
  label: string;
  icon: string;
  description: string;
}

export interface EngineRecommendation {
  name: string;
  optimal: [number, number]; // [min, max] range
  description: string;
}

export interface MotionSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showRecommendations?: boolean;
  engineType?: EngineType;
  className?: string;
}

export interface MotionSettings {
  cfgScale: number;
  steps: number;
  description: string;
  sampler?: string;
  scheduler?: string;
}

// ============================================================================
// GENERATION SETTINGS TYPES
// ============================================================================

export interface GenerationSettings {
  model: string;
  cfgScale: number;
  steps: number;
  seed?: number;
  aspectRatio: string;
  duration?: number;
  motionScale: number;
  negativePrompt?: string;
}

export interface PromptWizardState {
  step: number;
  basePrompt: string;
  selectedTags: Tag[];
  selectedEngine: string;
  motionScale: number;
  advancedSettings: Partial<GenerationSettings>;
}

// ============================================================================
// ENGINE TYPES
// ============================================================================

export interface EngineConfig {
  id: string;
  name: string;
  type: EngineType;
  supportsAudio: boolean;
  maxDuration: number;
  maxResolution: string;
  costPerSecond: number;
  optimalMotionRange: [number, number];
}

export interface EngineRecommendationResult {
  engineId: string;
  engineName: string;
  reason: string;
  confidence: number;
  estimatedCost: number;
}

// ============================================================================
// STORYBOARD TYPES (For future use)
// ============================================================================

export interface StoryboardShot {
  id: string;
  index: number;
  prompt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  status: 'pending' | 'generating' | 'complete' | 'error';
  error?: string;
  createdAt: Date;
}

export interface Element {
  id: string;
  name: string;
  type: 'character' | 'prop' | 'environment';
  views: ElementView[];
  createdAt: Date;
}

export interface ElementView {
  viewType: 'front' | 'side' | 'back' | '3/4' | 'custom';
  imageUrl: string;
}

export interface StoryboardProject {
  id: string;
  name: string;
  shots: StoryboardShot[];
  elements: Element[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PromptEnhancementType = 'cinematic' | 'lighting' | 'camera' | 'quality' | 'motion';

export interface PromptEnhancement {
  type: PromptEnhancementType;
  keywords: string[];
  description: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export for convenience
  Tag as TagType,
  MotionSliderProps as MotionSliderPropsType,
  GenerationSettings as GenerationSettingsType,
};

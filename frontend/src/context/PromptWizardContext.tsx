import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Tag, VideoEngine, LoRA } from '../types/promptWizardTypes';

interface PromptWizardState {
  currentStep: 1 | 2 | 3 | 4;

  // Step 1
  initialPrompt: string;
  referenceMedia: File | null;

  // Step 2
  selectedTags: Tag[];

  // Step 3
  selectedEngine: VideoEngine | null;
  selectedCheckpoint: string | null;
  selectedLoRAs: LoRA[];

  // Step 4
  enhancedPrompt: string;
  positiveAdditions: string[];
  negativePrompt: string;
  motionScale: number;
  cfgScale: number;
  steps: number;
  sampler: string;
  scheduler: string;
  seed: number;
  seedLocked: boolean;
  aspectRatio: string;
  duration: number;

  // Analysis
  complexity: number;
  consistencyScore: number;
  estimatedCost: number;
}

type PromptWizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_INITIAL_PROMPT'; prompt: string }
  | { type: 'SET_REFERENCE_MEDIA'; file: File | null }
  | { type: 'SET_SELECTED_TAGS'; tags: Tag[] }
  | { type: 'SET_ENGINE'; engine: VideoEngine }
  | { type: 'SET_MOTION_SCALE'; value: number }
  | { type: 'SET_CFG_SCALE'; value: number }
  | { type: 'SET_STEPS'; value: number }
  | { type: 'SET_SEED'; value: number; locked: boolean }
  | { type: 'SET_ENHANCED_PROMPT'; prompt: string }
  | { type: 'SET_POSITIVE_ADDITIONS'; additions: string[] }
  | { type: 'SET_NEGATIVE_PROMPT'; prompt: string }
  | { type: 'RESET_WIZARD' };

const initialState: PromptWizardState = {
  currentStep: 1,
  initialPrompt: '',
  referenceMedia: null,
  selectedTags: [],
  selectedEngine: null,
  selectedCheckpoint: null,
  selectedLoRAs: [],
  enhancedPrompt: '',
  positiveAdditions: [],
  negativePrompt: 'low quality, blurry, distorted, bad anatomy, watermark, text',
  motionScale: 0.6,
  cfgScale: 12,
  steps: 40,
  sampler: 'DPM++ 2M',
  scheduler: 'Karras',
  seed: Math.floor(Math.random() * 1000000000),
  seedLocked: false,
  aspectRatio: '16:9',
  duration: 8,
  complexity: 0,
  consistencyScore: 0,
  estimatedCost: 0,
};

// Helper function to get engine-specific defaults
function getEngineDefaults(engine: VideoEngine) {
  const defaults: Record<string, any> = {
    kling: {
      cfgScale: 12,
      steps: 40,
      sampler: 'DPM++ 2M',
      scheduler: 'Karras',
      baseCost: 15,
    },
    wan: {
      cfgScale: 10,
      steps: 40,
      sampler: 'Euler A',
      scheduler: 'Simple',
      baseCost: 10,
    },
    ltx: {
      cfgScale: 4,
      steps: 35,
      sampler: 'Euler',
      scheduler: 'Simple',
      baseCost: 5,
    },
    veo: {
      cfgScale: 14,
      steps: 50,
      sampler: 'DDIM',
      scheduler: 'Karras',
      baseCost: 25,
    },
    sora: {
      cfgScale: 12,
      steps: 50,
      sampler: 'DPM++ 2M',
      scheduler: 'Exponential',
      baseCost: 30,
    },
    luma: {
      cfgScale: 8,
      steps: 30,
      sampler: 'Euler A',
      scheduler: 'Simple',
      baseCost: 8,
    },
  };

  return defaults[engine.id] || defaults.wan;
}

function promptWizardReducer(
  state: PromptWizardState,
  action: PromptWizardAction
): PromptWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step as 1 | 2 | 3 | 4 };

    case 'SET_INITIAL_PROMPT':
      return { ...state, initialPrompt: action.prompt };

    case 'SET_REFERENCE_MEDIA':
      return { ...state, referenceMedia: action.file };

    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        selectedTags: action.tags,
        // Auto-update positive additions
        positiveAdditions: action.tags.map(t => t.promptKeyword || t.name.toLowerCase()),
      };

    case 'SET_ENGINE':
      // Auto-configure settings for selected engine
      const engineDefaults = getEngineDefaults(action.engine);
      return {
        ...state,
        selectedEngine: action.engine,
        cfgScale: engineDefaults.cfgScale,
        steps: engineDefaults.steps,
        sampler: engineDefaults.sampler,
        scheduler: engineDefaults.scheduler,
        estimatedCost: engineDefaults.baseCost,
      };

    case 'SET_MOTION_SCALE':
      return { ...state, motionScale: action.value };

    case 'SET_CFG_SCALE':
      return { ...state, cfgScale: action.value };

    case 'SET_STEPS':
      return { ...state, steps: action.value };

    case 'SET_SEED':
      return {
        ...state,
        seed: action.value,
        seedLocked: action.locked,
      };

    case 'SET_ENHANCED_PROMPT':
      return { ...state, enhancedPrompt: action.prompt };

    case 'SET_POSITIVE_ADDITIONS':
      return { ...state, positiveAdditions: action.additions };

    case 'SET_NEGATIVE_PROMPT':
      return { ...state, negativePrompt: action.prompt };

    case 'RESET_WIZARD':
      return {
        ...initialState,
        seed: Math.floor(Math.random() * 1000000000),
      };

    default:
      return state;
  }
}

const PromptWizardContext = createContext<{
  state: PromptWizardState;
  dispatch: React.Dispatch<PromptWizardAction>;
} | null>(null);

export function PromptWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(promptWizardReducer, initialState);

  return (
    <PromptWizardContext.Provider value={{ state, dispatch }}>
      {children}
    </PromptWizardContext.Provider>
  );
}

export function usePromptWizard() {
  const context = useContext(PromptWizardContext);
  if (!context) {
    throw new Error('usePromptWizard must be used within PromptWizardProvider');
  }
  return context;
}

/**
 * Story Generation Store
 *
 * Global store for story generation pipeline that persists across navigation.
 * The generation continues running even when the user navigates to other pages.
 */

import { create } from 'zustand';
import { fetchAPI } from '@/lib/api';

// Pipeline stages
export type PipelineStage = 'concept' | 'outline' | 'script' | 'breakdown' | 'prompts' | 'complete';

export interface StageStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  data?: unknown;
  error?: string;
}

export interface ProgressInfo {
  stage: 'breakdown' | 'prompts' | null;
  current: number;
  total: number;
  sceneName?: string;
}

// Story character for prompt injection
export interface StoryCharacter {
  name: string;
  elementId?: string;
  loraId?: string;
  triggerWord?: string;
  visualDescription: string;
  referenceImageUrl?: string;
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
}

export interface GenerationConfig {
  projectId: string;
  concept: string;
  uploadedScript?: string; // For "script" input mode
  genre: string;
  style?: string;
  pace?: 'slow' | 'medium' | 'fast';
  targetDurationSeconds?: number | null;
  shotDuration?: number;
  allowNSFW?: boolean;
  characters?: StoryCharacter[];
}

// Data needed to continue generation from a saved story
export interface ContinueFromData {
  outline?: unknown;
  script?: string;
  scenes?: unknown[];
  prompts?: unknown[];
}

interface StoryGenerationState {
  // Which project has an active generation
  activeProjectId: string | null;

  // Generation config
  config: GenerationConfig | null;

  // Pipeline state
  isRunning: boolean;
  currentStage: PipelineStage;
  stages: Record<PipelineStage, StageStatus>;
  progressInfo: ProgressInfo | null;

  // Results
  outline: unknown;
  script: string;
  scenes: unknown[];
  prompts: unknown[];

  // Actions
  startGeneration: (config: GenerationConfig) => Promise<void>;
  startFromScript: (config: GenerationConfig) => Promise<void>;
  continueGeneration: (config: GenerationConfig, fromData: ContinueFromData) => Promise<void>;
  stopGeneration: () => void;
  resetGeneration: () => void;
  updateStageStatus: (stage: PipelineStage, update: Partial<StageStatus>) => void;

  // For resuming display when navigating back
  getGenerationState: () => {
    isRunning: boolean;
    currentStage: PipelineStage;
    stages: Record<PipelineStage, StageStatus>;
    outline: unknown;
    script: string;
    scenes: unknown[];
    prompts: unknown[];
    progressInfo: ProgressInfo | null;
  };
}

const initialStages: Record<PipelineStage, StageStatus> = {
  concept: { status: 'pending' },
  outline: { status: 'pending' },
  script: { status: 'pending' },
  breakdown: { status: 'pending' },
  prompts: { status: 'pending' },
  complete: { status: 'pending' },
};

export const useStoryGenerationStore = create<StoryGenerationState>((set, get) => ({
  activeProjectId: null,
  config: null,
  isRunning: false,
  currentStage: 'concept',
  stages: { ...initialStages },
  progressInfo: null,
  outline: null,
  script: '',
  scenes: [],
  prompts: [],

  updateStageStatus: (stage, update) => {
    set(state => ({
      stages: {
        ...state.stages,
        [stage]: { ...state.stages[stage], ...update },
      },
    }));
  },

  resetGeneration: () => {
    set({
      activeProjectId: null,
      config: null,
      isRunning: false,
      currentStage: 'concept',
      stages: { ...initialStages },
      progressInfo: null,
      outline: null,
      script: '',
      scenes: [],
      prompts: [],
    });
  },

  stopGeneration: () => {
    set({ isRunning: false });
  },

  getGenerationState: () => {
    const state = get();
    return {
      isRunning: state.isRunning,
      currentStage: state.currentStage,
      stages: state.stages,
      outline: state.outline,
      script: state.script,
      scenes: state.scenes,
      prompts: state.prompts,
      progressInfo: state.progressInfo,
    };
  },

  startGeneration: async (config: GenerationConfig) => {
    const { updateStageStatus } = get();

    // Reset and start
    set({
      activeProjectId: config.projectId,
      config,
      isRunning: true,
      currentStage: 'outline',
      stages: { ...initialStages },
      progressInfo: null,
      outline: null,
      script: '',
      scenes: [],
      prompts: [],
    });

    try {
      // Mark concept as in_progress while validating
      updateStageStatus('concept', { status: 'in_progress' });

      // Brief delay to show concept in_progress, then mark complete
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStageStatus('concept', { status: 'complete' });

      // Stage 1: Generate Outline
      updateStageStatus('outline', { status: 'in_progress' });

      const outlineResponse = await fetchAPI('/story-editor/outline', {
        method: 'POST',
        body: JSON.stringify({
          concept: config.concept,
          genre: config.genre,
          numberOfActs: 3,
          targetDuration: config.targetDurationSeconds,
          allowNSFW: config.allowNSFW,
        }),
      });

      // Check if still running (user might have stopped)
      if (!get().isRunning) return;

      set({ outline: outlineResponse });
      updateStageStatus('outline', { status: 'complete', data: outlineResponse });

      // Stage 2: Generate Script
      set({ currentStage: 'script' });
      updateStageStatus('script', { status: 'in_progress' });

      const scriptResponse = await fetchAPI('/story-editor/script', {
        method: 'POST',
        body: JSON.stringify({
          outline: outlineResponse,
          genre: config.genre,
          style: config.style || `cinematic ${config.genre}`,
          allowNSFW: config.allowNSFW,
        }),
      });

      if (!get().isRunning) return;

      set({ script: scriptResponse.script });
      updateStageStatus('script', { status: 'complete', data: scriptResponse });

      // Continue with breakdown and prompts
      await runBreakdownAndPrompts(config, scriptResponse.script);

    } catch (error) {
      console.error('Pipeline error:', error);
      const currentStage = get().currentStage;
      set({ progressInfo: null });
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ isRunning: false, progressInfo: null });
    }
  },

  startFromScript: async (config: GenerationConfig) => {
    const { updateStageStatus } = get();

    if (!config.uploadedScript) {
      throw new Error('No script provided');
    }

    // Reset and start
    set({
      activeProjectId: config.projectId,
      config,
      isRunning: true,
      currentStage: 'breakdown',
      stages: { ...initialStages },
      progressInfo: null,
      outline: null,
      script: config.uploadedScript,
      scenes: [],
      prompts: [],
    });

    try {
      // Mark initial stages as complete (skipped)
      updateStageStatus('concept', { status: 'in_progress' });
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStageStatus('concept', { status: 'complete' });
      updateStageStatus('outline', { status: 'complete', data: { skipped: true } });
      updateStageStatus('script', { status: 'complete', data: { script: config.uploadedScript } });

      // Continue with breakdown and prompts
      await runBreakdownAndPrompts(config, config.uploadedScript);

    } catch (error) {
      console.error('Pipeline error:', error);
      const currentStage = get().currentStage;
      set({ progressInfo: null });
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ isRunning: false, progressInfo: null });
    }
  },

  // Continue generation from a saved story (resumes from last completed stage)
  continueGeneration: async (config: GenerationConfig, fromData: ContinueFromData) => {
    const { updateStageStatus } = get();

    // Determine what stage to start from based on available data
    const hasOutline = !!fromData.outline;
    const hasScript = !!fromData.script;
    const hasScenes = fromData.scenes && fromData.scenes.length > 0;
    const hasPrompts = fromData.prompts && fromData.prompts.length > 0;

    // If already complete, nothing to do
    if (hasPrompts) {
      console.log('[StoryGeneration] Story already complete, nothing to continue');
      return;
    }

    // Set up initial state based on what we have
    const completedStages: Record<PipelineStage, StageStatus> = {
      concept: { status: 'complete' },
      outline: hasOutline ? { status: 'complete', data: fromData.outline } : { status: 'pending' },
      script: hasScript ? { status: 'complete', data: { script: fromData.script } } : { status: 'pending' },
      breakdown: hasScenes ? { status: 'complete', data: fromData.scenes } : { status: 'pending' },
      prompts: { status: 'pending' },
      complete: { status: 'pending' },
    };

    // Determine start stage
    let startStage: PipelineStage = 'outline';
    if (hasScenes) {
      startStage = 'prompts';
    } else if (hasScript) {
      startStage = 'breakdown';
    } else if (hasOutline) {
      startStage = 'script';
    }

    console.log(`[StoryGeneration] Continuing from stage: ${startStage}`);

    set({
      activeProjectId: config.projectId,
      config,
      isRunning: true,
      currentStage: startStage,
      stages: completedStages,
      progressInfo: null,
      outline: fromData.outline || null,
      script: fromData.script || '',
      scenes: fromData.scenes || [],
      prompts: [],
    });

    try {
      // Continue from the appropriate stage
      if (startStage === 'prompts' && fromData.scenes) {
        // Just generate prompts from existing scenes
        await runPromptsOnly(config, fromData.scenes);
      } else if (startStage === 'breakdown' && fromData.script) {
        // Run breakdown and prompts from script
        await runBreakdownAndPrompts(config, fromData.script);
      } else if (startStage === 'script' && fromData.outline) {
        // Generate script, then breakdown and prompts
        updateStageStatus('script', { status: 'in_progress' });

        const scriptResponse = await fetchAPI('/story-editor/script', {
          method: 'POST',
          body: JSON.stringify({
            outline: fromData.outline,
            genre: config.genre,
            style: config.style || `cinematic ${config.genre}`,
            allowNSFW: config.allowNSFW,
          }),
        });

        if (!get().isRunning) return;

        set({ script: scriptResponse.script });
        updateStageStatus('script', { status: 'complete', data: scriptResponse });

        await runBreakdownAndPrompts(config, scriptResponse.script);
      } else {
        // Start from beginning
        await get().startGeneration(config);
      }
    } catch (error) {
      console.error('Continue pipeline error:', error);
      const currentStage = get().currentStage;
      set({ progressInfo: null });
      updateStageStatus(currentStage, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      set({ isRunning: false, progressInfo: null });
    }
  },
}));

// Helper function to generate prompts only (for continuing from scenes)
async function runPromptsOnly(config: GenerationConfig, scenes: unknown[]) {
  const { updateStageStatus } = useStoryGenerationStore.getState();

  useStoryGenerationStore.setState({ currentStage: 'prompts' });
  updateStageStatus('prompts', { status: 'in_progress' });

  const allPrompts: unknown[] = [];
  const totalScenes = scenes.length;

  for (let i = 0; i < totalScenes; i++) {
    if (!useStoryGenerationStore.getState().isRunning) return;

    const breakdown = scenes[i] as Record<string, unknown>;
    const heading = breakdown.heading;
    const sceneName =
      typeof heading === 'object'
        ? (heading as { location?: string })?.location || `Scene ${i + 1}`
        : heading || `Scene ${i + 1}`;

    useStoryGenerationStore.setState({
      progressInfo: {
        stage: 'prompts',
        current: i + 1,
        total: totalScenes,
        sceneName: String(sceneName).slice(0, 40),
      },
    });

    // Get shots from various possible keys
    const shotsToUse =
      (breakdown.suggestedShots as unknown[]) ||
      (breakdown.shots as unknown[]) ||
      (breakdown.shot_list as unknown[]) ||
      (breakdown.shotList as unknown[]) ||
      [];

    if (shotsToUse.length === 0) continue;

    try {
      const promptsResponse = await fetchAPI('/story-editor/prompts', {
        method: 'POST',
        body: JSON.stringify({
          shots: shotsToUse,
          sceneHeading: heading,
          genre: config.genre,
          style: config.style,
          allowNSFW: config.allowNSFW,
          shotDuration: config.shotDuration || 5,
          characters: config.characters?.length ? config.characters : undefined,
        }),
      });

      // Handle both array and object responses
      const shotDuration = config.shotDuration || 5;
      if (Array.isArray(promptsResponse)) {
        const promptsWithDuration = promptsResponse.map((p: unknown) => ({
          ...(p as object),
          duration: shotDuration,
        }));
        allPrompts.push(...promptsWithDuration);
      } else if (
        promptsResponse &&
        typeof promptsResponse === 'object' &&
        'prompts' in promptsResponse &&
        Array.isArray((promptsResponse as { prompts: unknown[] }).prompts)
      ) {
        const promptsWithDuration = (promptsResponse as { prompts: unknown[] }).prompts.map(
          (p: unknown) => ({
            ...(p as object),
            duration: shotDuration,
          })
        );
        allPrompts.push(...promptsWithDuration);
      }
    } catch (promptError) {
      console.error(`Failed to generate prompts for scene ${i + 1}:`, promptError);
    }
  }

  useStoryGenerationStore.setState({ progressInfo: null, prompts: allPrompts });
  updateStageStatus('prompts', { status: 'complete', data: allPrompts });

  // Complete!
  useStoryGenerationStore.setState({ currentStage: 'complete' });
  updateStageStatus('complete', { status: 'complete' });
}

// Helper function for breakdown and prompts stages (shared between both generation modes)
async function runBreakdownAndPrompts(config: GenerationConfig, scriptText: string) {
  const store = useStoryGenerationStore.getState();
  const { updateStageStatus } = store;

  // Stage 3: Parse & Breakdown
  useStoryGenerationStore.setState({ currentStage: 'breakdown' });
  updateStageStatus('breakdown', { status: 'in_progress' });

  const parseResponse = await fetchAPI('/story-editor/parse', {
    method: 'POST',
    body: JSON.stringify({
      scriptText,
    }),
  });

  if (!useStoryGenerationStore.getState().isRunning) return;

  // Break down each scene
  const breakdowns: unknown[] = [];
  const totalScenes = parseResponse.scenes?.length || 0;

  for (let i = 0; i < totalScenes; i++) {
    if (!useStoryGenerationStore.getState().isRunning) return;

    const sceneHeading = parseResponse.scenes[i];
    const sceneName =
      typeof sceneHeading === 'object'
        ? (sceneHeading as { location?: string })?.location || `Scene ${i + 1}`
        : sceneHeading || `Scene ${i + 1}`;

    useStoryGenerationStore.setState({
      progressInfo: {
        stage: 'breakdown',
        current: i + 1,
        total: totalScenes,
        sceneName: String(sceneName).slice(0, 40),
      },
    });

    const breakdownResponse = await fetchAPI('/story-editor/breakdown', {
      method: 'POST',
      body: JSON.stringify({
        sceneNumber: i + 1,
        heading: parseResponse.scenes[i],
        sceneText: parseResponse.sceneTexts?.[i] || '',
        genre: config.genre,
        config: {
          pace: config.pace,
          style: config.style,
          targetDuration: config.targetDurationSeconds,
          totalScenes,
          allowNSFW: config.allowNSFW,
        },
      }),
    });

    breakdowns.push(breakdownResponse);
  }

  useStoryGenerationStore.setState({ progressInfo: null, scenes: breakdowns });
  updateStageStatus('breakdown', { status: 'complete', data: breakdowns });

  // Stage 4: Generate Prompts
  useStoryGenerationStore.setState({ currentStage: 'prompts' });
  updateStageStatus('prompts', { status: 'in_progress' });

  const allPrompts: unknown[] = [];
  const totalBreakdowns = breakdowns.length;

  for (let i = 0; i < totalBreakdowns; i++) {
    if (!useStoryGenerationStore.getState().isRunning) return;

    const breakdown = breakdowns[i] as Record<string, unknown>;
    const heading = breakdown.heading || parseResponse.scenes[i];
    const sceneName =
      typeof heading === 'object'
        ? (heading as { location?: string })?.location || `Scene ${i + 1}`
        : heading || `Scene ${i + 1}`;

    useStoryGenerationStore.setState({
      progressInfo: {
        stage: 'prompts',
        current: i + 1,
        total: totalBreakdowns,
        sceneName: String(sceneName).slice(0, 40),
      },
    });

    // Get shots from various possible keys
    const shotsToUse =
      (breakdown.suggestedShots as unknown[]) ||
      (breakdown.shots as unknown[]) ||
      (breakdown.shot_list as unknown[]) ||
      (breakdown.shotList as unknown[]) ||
      [];

    if (shotsToUse.length === 0) continue;

    try {
      const promptsResponse = await fetchAPI('/story-editor/prompts', {
        method: 'POST',
        body: JSON.stringify({
          shots: shotsToUse,
          sceneHeading: heading,
          genre: config.genre,
          style: config.style,
          allowNSFW: config.allowNSFW,
          shotDuration: config.shotDuration || 5,
          characters: config.characters?.length ? config.characters : undefined,
        }),
      });

      // Handle both array and object responses
      const shotDuration = config.shotDuration || 5;
      if (Array.isArray(promptsResponse)) {
        const promptsWithDuration = promptsResponse.map((p: unknown) => ({
          ...(p as object),
          duration: shotDuration,
        }));
        allPrompts.push(...promptsWithDuration);
      } else if (
        promptsResponse &&
        typeof promptsResponse === 'object' &&
        'prompts' in promptsResponse &&
        Array.isArray((promptsResponse as { prompts: unknown[] }).prompts)
      ) {
        const promptsWithDuration = (promptsResponse as { prompts: unknown[] }).prompts.map(
          (p: unknown) => ({
            ...(p as object),
            duration: shotDuration,
          })
        );
        allPrompts.push(...promptsWithDuration);
      }
    } catch (promptError) {
      console.error(`Failed to generate prompts for scene ${i + 1}:`, promptError);
    }
  }

  useStoryGenerationStore.setState({ progressInfo: null, prompts: allPrompts });
  updateStageStatus('prompts', { status: 'complete', data: allPrompts });

  // Complete!
  useStoryGenerationStore.setState({ currentStage: 'complete' });
  updateStageStatus('complete', { status: 'complete' });
}

import { create } from 'zustand';

interface EngineConfigState {
  currentModelId: string | null;
  currentDuration: string | null;
  currentAspectRatio: string | null;
  isVideo: boolean;
  setCurrentConfig: (config: { modelId?: string; duration?: string; aspectRatio?: string; isVideo?: boolean }) => void;
  clearConfig: () => void;
}

export const useEngineConfigStore = create<EngineConfigState>(set => ({
  currentModelId: null,
  currentDuration: null,
  currentAspectRatio: null,
  isVideo: false,
  setCurrentConfig: ({ modelId, duration, aspectRatio, isVideo }) =>
    set(state => ({
      currentModelId: modelId ?? state.currentModelId,
      currentDuration: duration ?? state.currentDuration,
      currentAspectRatio: aspectRatio ?? state.currentAspectRatio,
      isVideo: isVideo ?? state.isVideo,
    })),
  clearConfig: () => set({ currentModelId: null, currentDuration: null, currentAspectRatio: null, isVideo: false }),
}));

import { create } from 'zustand';

interface EngineConfigState {
    currentModelId: string | null;
    currentDuration: string | null;
    isVideo: boolean;
    setCurrentConfig: (config: { modelId?: string; duration?: string; isVideo?: boolean }) => void;
    clearConfig: () => void;
}

export const useEngineConfigStore = create<EngineConfigState>((set) => ({
    currentModelId: null,
    currentDuration: null,
    isVideo: false,
    setCurrentConfig: ({ modelId, duration, isVideo }) => set((state) => ({
        currentModelId: modelId ?? state.currentModelId,
        currentDuration: duration ?? state.currentDuration,
        isVideo: isVideo ?? state.isVideo,
    })),
    clearConfig: () => set({ currentModelId: null, currentDuration: null, isVideo: false }),
}));

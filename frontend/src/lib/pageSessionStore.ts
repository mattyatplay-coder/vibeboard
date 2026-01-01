/**
 * Unified Page Session Store
 *
 * Auto-saves state for ALL project pages every 500ms to localStorage.
 * Each page type has its own session data structure.
 * On page load, checks for unsaved session and offers to restore.
 *
 * Supported pages:
 * - generate: Prompt, model, elements, settings
 * - story-editor: Script content, scenes, characters
 * - storyboard: Scene chains, shots, camera presets
 * - timeline: Clips, playhead position, zoom level
 * - process: Current image, tool settings, history
 * - train: Training job settings, dataset selections
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Page type discriminator
export type PageType = 'generate' | 'story-editor' | 'storyboard' | 'timeline' | 'process' | 'train';

// Base session interface
interface BasePageSession {
    pageType: PageType;
    projectId: string;
    savedAt: number;
    isDirty: boolean;
}

// Generate page session (already implemented, re-export for compatibility)
export interface GenerateSession extends BasePageSession {
    pageType: 'generate';
    prompt: string;
    negativePrompt: string;
    modelId: string;
    mode: 'text_to_image' | 'text_to_video' | 'image_to_video';
    aspectRatio: string;
    duration: number;
    variations: number;
    selectedElementIds: string[];
    audioFileUrl: string | null;
    lensKit: {
        lensId: string;
        focalMm: number;
        isAnamorphic: boolean;
    } | null;
}

// Story Editor page session
export interface StoryEditorSession extends BasePageSession {
    pageType: 'story-editor';
    title: string;
    logline: string;
    scriptContent: string;
    genre: string;
    directorStyle: string;
    selectedCharacterIds: string[];
    currentSceneIndex: number;
}

// Storyboard page session
export interface StoryboardSession extends BasePageSession {
    pageType: 'storyboard';
    selectedSceneChainId: string | null;
    expandedSceneIds: string[];
    selectedShotId: string | null;
    viewMode: 'grid' | 'timeline';
    zoomLevel: number;
}

// Timeline page session
export interface TimelineSession extends BasePageSession {
    pageType: 'timeline';
    clips: Array<{
        id: string;
        videoUrl: string;
        name: string;
        duration: number;
        trimStart: number;
        trimEnd: number;
    }>;
    playheadPosition: number;
    zoomLevel: number;
    selectedClipId: string | null;
}

// Process page session
export interface ProcessSession extends BasePageSession {
    pageType: 'process';
    currentImageUrl: string | null;
    activeTool: 'magic-eraser' | 'roto' | 'tattoo' | 'set-extension' | null;
    toolSettings: Record<string, unknown>;
    historyIndex: number;
}

// Train page session
export interface TrainSession extends BasePageSession {
    pageType: 'train';
    selectedJobId: string | null;
    jobName: string;
    triggerWord: string;
    trainingType: string;
    provider: string;
    baseModel: string;
    steps: number;
    learningRate: number;
    datasetPath: string;
    isFoundryMode: boolean;
    foundryPrompt: string;
    selectedPreset: string;
    characterDescription: string;
    posePreset: string;
    datasetImages: string[];
}

// Union type for all sessions
export type PageSession =
    | GenerateSession
    | StoryEditorSession
    | StoryboardSession
    | TimelineSession
    | ProcessSession
    | TrainSession;

// Store state
interface PageSessionState {
    // Map of projectId:pageType -> session
    sessions: Record<string, PageSession>;

    // Recovery UI state per page
    recoveryDismissed: Record<string, boolean>;

    // Global disable flag for testing - set to true to suppress all recovery toasts
    recoveryDisabled: boolean;

    // Actions
    saveSession: <T extends PageSession>(session: Partial<T> & { projectId: string; pageType: PageType }) => void;
    getSession: <T extends PageSession>(projectId: string, pageType: PageType) => T | null;
    clearSession: (projectId: string, pageType: PageType) => void;
    clearAllSessions: (projectId: string) => void;
    dismissRecovery: (projectId: string, pageType: PageType) => void;
    isRecoveryDismissed: (projectId: string, pageType: PageType) => boolean;
    markClean: (projectId: string, pageType: PageType) => void;
    setRecoveryDisabled: (disabled: boolean) => void;
}

// Session is considered stale after 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Default values for each page type (typed as any to avoid discriminated union issues)
const DEFAULT_SESSIONS: Record<PageType, any> = {
    generate: {
        pageType: 'generate',
        prompt: '',
        negativePrompt: '',
        modelId: 'fal-ai/flux/dev',
        mode: 'text_to_image',
        aspectRatio: '16:9',
        duration: 5,
        variations: 1,
        selectedElementIds: [],
        audioFileUrl: null,
        lensKit: null,
    },
    'story-editor': {
        pageType: 'story-editor',
        title: '',
        logline: '',
        scriptContent: '',
        genre: '',
        directorStyle: '',
        selectedCharacterIds: [],
        currentSceneIndex: 0,
    },
    storyboard: {
        pageType: 'storyboard',
        selectedSceneChainId: null,
        expandedSceneIds: [],
        selectedShotId: null,
        viewMode: 'grid',
        zoomLevel: 1,
    },
    timeline: {
        pageType: 'timeline',
        clips: [],
        playheadPosition: 0,
        zoomLevel: 50,
        selectedClipId: null,
    },
    process: {
        pageType: 'process',
        currentImageUrl: null,
        activeTool: null,
        toolSettings: {},
        historyIndex: 0,
    },
    train: {
        pageType: 'train',
        selectedJobId: null,
        jobName: '',
        triggerWord: '',
        trainingType: 'style',
        provider: 'fal',
        baseModel: 'fast',
        steps: 1000,
        learningRate: 0.0001,
        datasetPath: '',
        isFoundryMode: false,
        foundryPrompt: '',
        selectedPreset: 'universal',
        characterDescription: '',
        posePreset: 'universal',
        datasetImages: [],
    },
};

// Helper to create session key
const getSessionKey = (projectId: string, pageType: PageType) => `${projectId}:${pageType}`;

export const usePageSessionStore = create<PageSessionState>()(
    persist(
        (set, get) => ({
            sessions: {},
            recoveryDismissed: {},
            recoveryDisabled: true, // Set to true to suppress all recovery toasts for testing

            saveSession: (session) => {
                const key = getSessionKey(session.projectId, session.pageType);
                const now = Date.now();
                const existing = get().sessions[key];
                const defaults = DEFAULT_SESSIONS[session.pageType];

                // Merge with existing or defaults
                const merged = {
                    ...defaults,
                    ...existing,
                    ...session,
                    savedAt: now,
                    isDirty: session.isDirty ?? true,
                } as PageSession;

                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [key]: merged,
                    },
                    // Clear dismissed state when saving new content
                    recoveryDismissed: {
                        ...state.recoveryDismissed,
                        [key]: false,
                    },
                }));
            },

            getSession: <T extends PageSession>(projectId: string, pageType: PageType): T | null => {
                const key = getSessionKey(projectId, pageType);
                const session = get().sessions[key];

                if (!session) return null;
                if (session.pageType !== pageType) return null;

                // Check expiry
                const age = Date.now() - session.savedAt;
                if (age > SESSION_EXPIRY_MS) {
                    // Clear expired session
                    set((state) => {
                        const newSessions = { ...state.sessions };
                        delete newSessions[key];
                        return { sessions: newSessions };
                    });
                    return null;
                }

                return session as T;
            },

            clearSession: (projectId, pageType) => {
                const key = getSessionKey(projectId, pageType);
                set((state) => {
                    const newSessions = { ...state.sessions };
                    delete newSessions[key];
                    const newDismissed = { ...state.recoveryDismissed };
                    delete newDismissed[key];
                    return { sessions: newSessions, recoveryDismissed: newDismissed };
                });
            },

            clearAllSessions: (projectId) => {
                set((state) => {
                    const newSessions: Record<string, PageSession> = {};
                    const newDismissed: Record<string, boolean> = {};

                    Object.entries(state.sessions).forEach(([key, session]) => {
                        if (!key.startsWith(`${projectId}:`)) {
                            newSessions[key] = session;
                        }
                    });

                    Object.entries(state.recoveryDismissed).forEach(([key, dismissed]) => {
                        if (!key.startsWith(`${projectId}:`)) {
                            newDismissed[key] = dismissed;
                        }
                    });

                    return { sessions: newSessions, recoveryDismissed: newDismissed };
                });
            },

            dismissRecovery: (projectId, pageType) => {
                const key = getSessionKey(projectId, pageType);
                set((state) => ({
                    recoveryDismissed: {
                        ...state.recoveryDismissed,
                        [key]: true,
                    },
                }));
            },

            isRecoveryDismissed: (projectId, pageType) => {
                // If globally disabled, always report as dismissed
                if (get().recoveryDisabled) return true;
                const key = getSessionKey(projectId, pageType);
                return get().recoveryDismissed[key] ?? false;
            },

            setRecoveryDisabled: (disabled) => {
                set({ recoveryDisabled: disabled });
            },

            markClean: (projectId, pageType) => {
                const key = getSessionKey(projectId, pageType);
                const session = get().sessions[key];
                if (session) {
                    set((state) => ({
                        sessions: {
                            ...state.sessions,
                            [key]: { ...session, isDirty: false },
                        },
                    }));
                }
            },
        }),
        {
            name: 'vibeboard-page-sessions',
            version: 1,
        }
    )
);

/**
 * Hook for page-specific auto-save
 */
export function usePageAutoSave<T extends PageSession>(pageType: PageType) {
    const saveSession = usePageSessionStore((state) => state.saveSession);
    const getSession = usePageSessionStore((state) => state.getSession);
    const clearSession = usePageSessionStore((state) => state.clearSession);
    const dismissRecovery = usePageSessionStore((state) => state.dismissRecovery);
    const isRecoveryDismissed = usePageSessionStore((state) => state.isRecoveryDismissed);
    const markClean = usePageSessionStore((state) => state.markClean);

    return {
        saveSession: (session: Partial<T> & { projectId: string }) =>
            saveSession({ ...session, pageType } as Partial<T> & { projectId: string; pageType: PageType }),
        getSession: (projectId: string) => getSession<T>(projectId, pageType),
        clearSession: (projectId: string) => clearSession(projectId, pageType),
        dismissRecovery: (projectId: string) => dismissRecovery(projectId, pageType),
        isRecoveryDismissed: (projectId: string) => isRecoveryDismissed(projectId, pageType),
        markClean: (projectId: string) => markClean(projectId, pageType),
    };
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Check if a session has meaningful content worth recovering
 */
export function hasRecoverableContent(session: PageSession | null): boolean {
    if (!session) return false;

    switch (session.pageType) {
        case 'generate':
            return session.prompt.trim().length > 0 || session.selectedElementIds.length > 0;
        case 'story-editor':
            return session.scriptContent.trim().length > 0 || session.title.trim().length > 0;
        case 'storyboard':
            return session.selectedSceneChainId !== null;
        case 'timeline':
            return session.clips.length > 0;
        case 'process':
            return session.currentImageUrl !== null;
        case 'train':
            return session.triggerWord.trim().length > 0 || session.datasetImages.length > 0;
        default:
            return false;
    }
}

/**
 * Session Recovery Store
 *
 * Auto-saves Generate page state every 500ms to localStorage.
 * On page load, checks for unsaved session and offers to restore.
 *
 * Saved state includes:
 * - Current prompt text
 * - Negative prompt
 * - Selected model ID
 * - Selected elements (IDs)
 * - Duration & variations
 * - Aspect ratio
 * - Audio file URL (if any)
 * - Lens kit selection
 * - Lighting setup
 * - Timestamp of last save
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecoverableSession {
  // Core generation settings
  prompt: string;
  negativePrompt: string;
  modelId: string;
  mode: 'text_to_image' | 'text_to_video' | 'image_to_video';

  // Parameters
  aspectRatio: string;
  duration: number;
  variations: number;

  // References
  selectedElementIds: string[];
  audioFileUrl: string | null;

  // Advanced settings
  lensKit: {
    lensId: string;
    focalMm: number;
    isAnamorphic: boolean;
  } | null;

  // Metadata
  projectId: string;
  savedAt: number; // Unix timestamp
  isDirty: boolean; // Has unsaved changes since last generation
}

interface SessionRecoveryState {
  // Current session being auto-saved
  currentSession: RecoverableSession | null;

  // Recovery state
  hasRecoveryAvailable: boolean;
  recoveryDismissed: boolean;

  // Actions
  saveSession: (session: Partial<RecoverableSession> & { projectId: string }) => void;
  clearSession: (projectId: string) => void;
  dismissRecovery: () => void;
  getRecoverableSession: (projectId: string) => RecoverableSession | null;
  markClean: () => void;
}

// Session is considered stale after 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const useSessionRecoveryStore = create<SessionRecoveryState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      hasRecoveryAvailable: false,
      recoveryDismissed: false,

      saveSession: session => {
        const now = Date.now();
        const existing = get().currentSession;

        // Merge with existing session data
        const merged: RecoverableSession = {
          prompt: session.prompt ?? existing?.prompt ?? '',
          negativePrompt: session.negativePrompt ?? existing?.negativePrompt ?? '',
          modelId: session.modelId ?? existing?.modelId ?? 'fal-ai/flux/dev',
          mode: session.mode ?? existing?.mode ?? 'text_to_image',
          aspectRatio: session.aspectRatio ?? existing?.aspectRatio ?? '16:9',
          duration: session.duration ?? existing?.duration ?? 5,
          variations: session.variations ?? existing?.variations ?? 1,
          selectedElementIds: session.selectedElementIds ?? existing?.selectedElementIds ?? [],
          audioFileUrl: session.audioFileUrl ?? existing?.audioFileUrl ?? null,
          lensKit: session.lensKit ?? existing?.lensKit ?? null,
          projectId: session.projectId,
          savedAt: now,
          isDirty: session.isDirty ?? true,
        };

        set({
          currentSession: merged,
          hasRecoveryAvailable: true,
          recoveryDismissed: false,
        });
      },

      clearSession: projectId => {
        const current = get().currentSession;
        if (current?.projectId === projectId) {
          set({
            currentSession: null,
            hasRecoveryAvailable: false,
            recoveryDismissed: false,
          });
        }
      },

      dismissRecovery: () => {
        set({ recoveryDismissed: true });
      },

      getRecoverableSession: projectId => {
        const session = get().currentSession;
        if (!session) return null;

        // Check if session is for this project
        if (session.projectId !== projectId) return null;

        // Check if session is expired
        const age = Date.now() - session.savedAt;
        if (age > SESSION_EXPIRY_MS) {
          // Clear expired session
          set({ currentSession: null, hasRecoveryAvailable: false });
          return null;
        }

        // Check if session has meaningful content
        const hasContent =
          session.prompt.trim().length > 0 || session.selectedElementIds.length > 0;
        if (!hasContent) return null;

        return session;
      },

      markClean: () => {
        const current = get().currentSession;
        if (current) {
          set({
            currentSession: { ...current, isDirty: false },
          });
        }
      },
    }),
    {
      name: 'vibeboard-session-recovery',
      version: 1,
    }
  )
);

/**
 * Hook to use auto-save functionality
 * Call this in your component with the current state
 */
export function useAutoSave() {
  const saveSession = useSessionRecoveryStore(state => state.saveSession);
  const markClean = useSessionRecoveryStore(state => state.markClean);

  return { saveSession, markClean };
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

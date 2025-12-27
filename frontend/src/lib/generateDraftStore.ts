/**
 * Generate Page Draft Store - Auto-save system
 *
 * Automatically persists the Generate Page state to localStorage with debounced saves.
 * Enables session recovery after page refresh, browser crash, or accidental navigation.
 *
 * Features:
 * - Debounced saves (500ms delay to avoid excessive writes)
 * - Per-project drafts (each project has its own saved state)
 * - Timestamp tracking for stale draft detection
 * - Explicit save/clear controls
 * - Recovery detection on page load
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// The state we want to auto-save from Generate Page
export interface GenerateDraft {
  // Core prompt
  prompt: string;
  negativePrompt?: string;

  // Model & Mode
  engineConfig: {
    provider: string;
    model: string;
  };
  mode: 'image' | 'video';

  // Generation parameters
  aspectRatio: string;
  duration: string;
  variations: number;
  strength: number;
  steps: number;
  guidanceScale: number;
  motionScale: number;
  referenceCreativity: number;

  // Selected elements
  selectedElementIds: string[];
  elementStrengths: Record<string, number>;

  // Style config (LoRAs, sampler, scheduler, etc.)
  styleConfig: {
    loras?: Array<{
      id: string;
      name: string;
      triggerWord?: string;
      strength?: number;
    }>;
    sampler?: { id: string; name: string; value: string };
    scheduler?: { id: string; name: string; value: string };
    inspiration?: string;
    negativePrompt?: string;
    guidanceScale?: number;
    steps?: number;
    seed?: number;
  } | null;

  // Lens Kit
  selectedLensId?: string | null;
  selectedLensEffects: string[];
  isAnamorphic: boolean;
  lensCharacter: 'modern' | 'vintage';

  // Audio (for avatar models)
  audioFileName?: string | null;

  // Metadata
  savedAt: number; // Unix timestamp
  projectId: string;
}

// Store for managing drafts across all projects
interface DraftStore {
  // Map of projectId -> draft
  drafts: Record<string, GenerateDraft>;

  // Actions
  saveDraft: (projectId: string, draft: Omit<GenerateDraft, 'savedAt' | 'projectId'>) => void;
  getDraft: (projectId: string) => GenerateDraft | null;
  clearDraft: (projectId: string) => void;
  hasDraft: (projectId: string) => boolean;
  getDraftAge: (projectId: string) => number | null; // Returns age in minutes

  // Cleanup
  clearStaleDrafts: (maxAgeMinutes?: number) => void;
}

// Maximum age for drafts before they're considered stale (24 hours)
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;

export const useGenerateDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (projectId, draft) => {
        const fullDraft: GenerateDraft = {
          ...draft,
          projectId,
          savedAt: Date.now(),
        };

        set(state => ({
          drafts: {
            ...state.drafts,
            [projectId]: fullDraft,
          },
        }));
      },

      getDraft: projectId => {
        const draft = get().drafts[projectId];
        if (!draft) return null;

        // Check if draft is stale
        const age = Date.now() - draft.savedAt;
        if (age > MAX_DRAFT_AGE_MS) {
          // Auto-clear stale draft
          get().clearDraft(projectId);
          return null;
        }

        return draft;
      },

      clearDraft: projectId => {
        set(state => {
          const { [projectId]: removed, ...remaining } = state.drafts;
          return { drafts: remaining };
        });
      },

      hasDraft: projectId => {
        const draft = get().drafts[projectId];
        if (!draft) return false;

        // Check staleness
        const age = Date.now() - draft.savedAt;
        return age <= MAX_DRAFT_AGE_MS;
      },

      getDraftAge: projectId => {
        const draft = get().drafts[projectId];
        if (!draft) return null;

        const ageMs = Date.now() - draft.savedAt;
        return Math.floor(ageMs / 60000); // Return minutes
      },

      clearStaleDrafts: (maxAgeMinutes = 24 * 60) => {
        const maxAgeMs = maxAgeMinutes * 60 * 1000;
        const now = Date.now();

        set(state => {
          const freshDrafts: Record<string, GenerateDraft> = {};

          for (const [projectId, draft] of Object.entries(state.drafts)) {
            if (now - draft.savedAt <= maxAgeMs) {
              freshDrafts[projectId] = draft;
            }
          }

          return { drafts: freshDrafts };
        });
      },
    }),
    {
      name: 'vibeboard-generate-drafts',
    }
  )
);

// ============================================================================
// Debounced Auto-Save Hook
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveState {
  prompt: string;
  negativePrompt?: string;
  engineConfig: { provider: string; model: string };
  mode: 'image' | 'video';
  aspectRatio: string;
  duration: string;
  variations: number;
  strength: number;
  steps: number;
  guidanceScale: number;
  motionScale: number;
  referenceCreativity: number;
  selectedElementIds: string[];
  elementStrengths: Record<string, number>;
  styleConfig: {
    loras?: Array<{
      id: string;
      name: string;
      triggerWord?: string;
      strength?: number;
    }>;
    sampler?: { id: string; name: string; value: string };
    scheduler?: { id: string; name: string; value: string };
    inspiration?: string;
    negativePrompt?: string;
    guidanceScale?: number;
    steps?: number;
    seed?: number;
  } | null;
  selectedLens: { id: string } | null;
  selectedLensEffects: string[];
  isAnamorphic: boolean;
  lensCharacter: 'modern' | 'vintage';
  audioFileName?: string | null;
}

export function useAutoSave(projectId: string, state: AutoSaveState, debounceMs = 500) {
  const { saveDraft } = useGenerateDraftStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  const save = useCallback(() => {
    const draft: Omit<GenerateDraft, 'savedAt' | 'projectId'> = {
      prompt: state.prompt,
      negativePrompt: state.negativePrompt,
      engineConfig: state.engineConfig,
      mode: state.mode,
      aspectRatio: state.aspectRatio,
      duration: state.duration,
      variations: state.variations,
      strength: state.strength,
      steps: state.steps,
      guidanceScale: state.guidanceScale,
      motionScale: state.motionScale,
      referenceCreativity: state.referenceCreativity,
      selectedElementIds: state.selectedElementIds,
      elementStrengths: state.elementStrengths,
      styleConfig: state.styleConfig,
      selectedLensId: state.selectedLens?.id || null,
      selectedLensEffects: state.selectedLensEffects,
      isAnamorphic: state.isAnamorphic,
      lensCharacter: state.lensCharacter,
      audioFileName: state.audioFileName,
    };

    // Only save if something changed
    const serialized = JSON.stringify(draft);
    if (serialized !== lastSavedRef.current) {
      lastSavedRef.current = serialized;
      saveDraft(projectId, draft);
    }
  }, [projectId, state, saveDraft]);

  // Debounced save on state change
  useEffect(() => {
    // Don't save empty state
    if (!state.prompt && state.selectedElementIds.length === 0) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, save, debounceMs]);

  // Save immediately on unmount
  useEffect(() => {
    return () => {
      if (state.prompt || state.selectedElementIds.length > 0) {
        save();
      }
    };
  }, [save, state.prompt, state.selectedElementIds.length]);

  return { saveNow: save };
}

// ============================================================================
// Recovery Hook - Check for drafts on mount
// ============================================================================

export function useRecoveryCheck(projectId: string): {
  hasDraft: boolean;
  draftAge: number | null;
  draft: GenerateDraft | null;
  clearDraft: () => void;
} {
  const store = useGenerateDraftStore();

  return {
    hasDraft: store.hasDraft(projectId),
    draftAge: store.getDraftAge(projectId),
    draft: store.getDraft(projectId),
    clearDraft: () => store.clearDraft(projectId),
  };
}

// ============================================================================
// Format helpers
// ============================================================================

export function formatDraftAge(minutes: number | null): string {
  if (minutes === null) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * UX-009: Undo/Redo Stack for Optics & Gaffer
 *
 * A generic hook for implementing undo/redo functionality.
 * Works with any state type and supports keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
 *
 * @template T - The type of state being tracked
 * @param initialState - The initial state value
 * @param options - Configuration options
 * @returns Object containing state, setState, undo, redo, and history info
 *
 * @example
 * const {
 *   state,
 *   setState,
 *   undo,
 *   redo,
 *   canUndo,
 *   canRedo,
 *   historyLength
 * } = useUndoRedo(initialLights, { maxHistory: 50 });
 */

interface UseUndoRedoOptions {
  /** Maximum number of history states to keep (default: 50) */
  maxHistory?: number;
  /** Enable keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z) (default: true) */
  enableKeyboardShortcuts?: boolean;
  /** Debounce time in ms for grouping rapid changes (default: 0 = no debounce) */
  debounceMs?: number;
}

interface UseUndoRedoReturn<T> {
  /** Current state value */
  state: T;
  /** Update state (adds to history) */
  setState: (newState: T | ((prev: T) => T)) => void;
  /** Undo to previous state */
  undo: () => void;
  /** Redo to next state */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Total history length */
  historyLength: number;
  /** Clear all history (keeps current state) */
  clearHistory: () => void;
  /** Replace current state without adding to history (useful for trivial updates) */
  replaceState: (newState: T) => void;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const {
    maxHistory = 50,
    enableKeyboardShortcuts = true,
    debounceMs = 0,
  } = options;

  // History stacks
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Set state with history tracking
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    const resolvedState = typeof newState === 'function'
      ? (newState as (prev: T) => T)(present)
      : newState;

    // Skip if state hasn't changed
    if (resolvedState === present) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // If debouncing and within debounce window, just update present without adding to history
    if (debounceMs > 0 && timeSinceLastUpdate < debounceMs) {
      setPresent(resolvedState);
      lastUpdateRef.current = now;
      return;
    }

    // Normal update: push current state to past, set new present, clear future
    setPast(prev => {
      const newPast = [...prev, present];
      // Trim history if exceeds max
      if (newPast.length > maxHistory) {
        return newPast.slice(newPast.length - maxHistory);
      }
      return newPast;
    });
    setPresent(resolvedState);
    setFuture([]);
    lastUpdateRef.current = now;
  }, [present, maxHistory, debounceMs]);

  // Replace state without adding to history
  const replaceState = useCallback((newState: T) => {
    setPresent(newState);
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    setPast(newPast);
    setPresent(previous);
    setFuture(prev => [present, ...prev]);
  }, [past, present]);

  // Redo
  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [future, present]);

  // Clear history
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Also support Cmd/Ctrl+Y for redo (Windows convention)
      if (modifierKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, undo, redo]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    state: present,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
    historyLength: past.length + 1 + future.length,
    clearHistory,
    replaceState,
  };
}

/**
 * Zustand middleware version for stores
 * Wraps a Zustand store with undo/redo capabilities
 */
export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

/**
 * Create undo/redo wrapper for Zustand store state
 * Use this to add undo/redo to specific slices of your store
 */
export function createUndoRedoSlice<T>(
  initialState: T,
  maxHistory: number = 50
) {
  return {
    past: [] as T[],
    present: initialState,
    future: [] as T[],

    // Call this when updating the tracked state
    pushState: (newState: T, get: () => { past: T[]; present: T; future: T[] }, set: (partial: Partial<{ past: T[]; present: T; future: T[] }>) => void) => {
      const { past, present } = get();
      const newPast = [...past, present].slice(-maxHistory);
      set({
        past: newPast,
        present: newState,
        future: [],
      });
    },

    undo: (get: () => { past: T[]; present: T; future: T[] }, set: (partial: Partial<{ past: T[]; present: T; future: T[] }>) => void) => {
      const { past, present, future } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        present: previous,
        future: [present, ...future],
      });
    },

    redo: (get: () => { past: T[]; present: T; future: T[] }, set: (partial: Partial<{ past: T[]; present: T; future: T[] }>) => void) => {
      const { past, present, future } = get();
      if (future.length === 0) return;

      const next = future[0];
      set({
        past: [...past, present],
        present: next,
        future: future.slice(1),
      });
    },

    clearHistory: (set: (partial: Partial<{ past: T[]; present: T; future: T[] }>) => void) => {
      set({ past: [], future: [] });
    },
  };
}

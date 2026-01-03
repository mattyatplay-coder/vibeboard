/**
 * useTimelineShortcuts
 *
 * React hook implementing DaVinci/Premiere standard keyboard shortcuts
 * including J-K-L shuttle controls for professional NLE editing.
 *
 * Shortcuts:
 * - Space: Play/Pause
 * - J: Reverse shuttle (1x, 2x, 4x, 8x)
 * - K: Stop
 * - L: Forward shuttle (1x, 2x, 4x, 8x)
 * - I: Mark In
 * - O: Mark Out
 * - Cmd/Ctrl+B: Blade/Split at playhead
 * - Left/Right: Nudge 1 frame
 * - Shift+Left/Right: Nudge 10 frames
 * - Cmd/Ctrl+=: Zoom in
 * - Cmd/Ctrl+-: Zoom out
 * - Shift+Z: Zoom to fit
 * - Cmd/Ctrl+Z: Undo
 * - Cmd/Ctrl+Shift+Z: Redo
 * - Delete/Backspace: Delete selected
 * - Cmd/Ctrl+A: Select all
 * - Escape: Deselect all
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface TimelineShortcutHandlers {
    onPlayPause: () => void;
    onShuttle: (speed: number) => void;
    onStop: () => void;
    onSplit: () => void;
    onMarkIn: () => void;
    onMarkOut: () => void;
    onNudge: (frames: number) => void;
    onZoom: (direction: 'in' | 'out' | 'fit') => void;
    onUndo: () => void;
    onRedo: () => void;
    onDelete?: () => void;
    onSelectAll?: () => void;
    onDeselectAll?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onCut?: () => void;
}

interface UseTimelineShortcutsOptions {
    enabled?: boolean;
    maxShuttleSpeed?: number;
}

export function useTimelineShortcuts(
    handlers: TimelineShortcutHandlers,
    options: UseTimelineShortcutsOptions = {}
) {
    const { enabled = true, maxShuttleSpeed = 8 } = options;
    const [shuttleSpeedState, setShuttleSpeedState] = useState(0);
    const shuttleSpeedRef = useRef(0);
    const isPlaying = useRef(false);

    // Reset shuttle speed
    const resetShuttle = useCallback(() => {
        shuttleSpeedRef.current = 0;
        setShuttleSpeedState(0);
        isPlaying.current = false;
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input fields
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
            if (target.isContentEditable) return;

            const cmd = e.metaKey || e.ctrlKey;
            const shift = e.shiftKey;
            const key = e.key.toLowerCase();

            switch (key) {
                // Play/Pause (Space)
                case ' ':
                    e.preventDefault();
                    handlers.onPlayPause();
                    if (shuttleSpeedRef.current !== 0) {
                        shuttleSpeedRef.current = 0;
                        setShuttleSpeedState(0);
                    }
                    isPlaying.current = !isPlaying.current;
                    break;

                // Stop (K)
                case 'k':
                    e.preventDefault();
                    handlers.onStop();
                    handlers.onShuttle(0);
                    resetShuttle();
                    break;

                // Reverse Shuttle (J)
                case 'j':
                    e.preventDefault();
                    // If moving forward, stop first
                    if (shuttleSpeedRef.current > 0) {
                        shuttleSpeedRef.current = 0;
                    } else {
                        // Double speed each press, max at -maxShuttleSpeed
                        shuttleSpeedRef.current = shuttleSpeedRef.current <= -1
                            ? Math.max(shuttleSpeedRef.current * 2, -maxShuttleSpeed)
                            : -1;
                    }
                    setShuttleSpeedState(shuttleSpeedRef.current);
                    handlers.onShuttle(shuttleSpeedRef.current);
                    break;

                // Forward Shuttle (L)
                case 'l':
                    e.preventDefault();
                    // If moving backward, stop first
                    if (shuttleSpeedRef.current < 0) {
                        shuttleSpeedRef.current = 0;
                    } else {
                        // Double speed each press, max at maxShuttleSpeed
                        shuttleSpeedRef.current = shuttleSpeedRef.current >= 1
                            ? Math.min(shuttleSpeedRef.current * 2, maxShuttleSpeed)
                            : 1;
                    }
                    setShuttleSpeedState(shuttleSpeedRef.current);
                    handlers.onShuttle(shuttleSpeedRef.current);
                    break;

                // Blade/Split (Cmd+B)
                case 'b':
                    if (cmd) {
                        e.preventDefault();
                        handlers.onSplit();
                    }
                    break;

                // Mark In (I)
                case 'i':
                    if (!cmd) {
                        e.preventDefault();
                        handlers.onMarkIn();
                    }
                    break;

                // Mark Out (O)
                case 'o':
                    if (!cmd) {
                        e.preventDefault();
                        handlers.onMarkOut();
                    }
                    break;

                // Nudge Left (Arrow Left)
                case 'arrowleft':
                    e.preventDefault();
                    handlers.onNudge(shift ? -10 : -1);
                    break;

                // Nudge Right (Arrow Right)
                case 'arrowright':
                    e.preventDefault();
                    handlers.onNudge(shift ? 10 : 1);
                    break;

                // Zoom In (Cmd+=)
                case '=':
                case '+':
                    if (cmd) {
                        e.preventDefault();
                        handlers.onZoom('in');
                    }
                    break;

                // Zoom Out (Cmd+-)
                case '-':
                    if (cmd) {
                        e.preventDefault();
                        handlers.onZoom('out');
                    }
                    break;

                // Undo/Redo/Zoom Fit (Z)
                case 'z':
                    if (cmd) {
                        e.preventDefault();
                        if (shift) {
                            handlers.onRedo();
                        } else {
                            handlers.onUndo();
                        }
                    } else if (shift) {
                        e.preventDefault();
                        handlers.onZoom('fit');
                    }
                    break;

                // Delete
                case 'delete':
                case 'backspace':
                    if (!cmd && handlers.onDelete) {
                        e.preventDefault();
                        handlers.onDelete();
                    }
                    break;

                // Select All (Cmd+A)
                case 'a':
                    if (cmd && handlers.onSelectAll) {
                        e.preventDefault();
                        handlers.onSelectAll();
                    }
                    break;

                // Deselect (Escape)
                case 'escape':
                    if (handlers.onDeselectAll) {
                        e.preventDefault();
                        handlers.onDeselectAll();
                    }
                    break;

                // Copy (Cmd+C)
                case 'c':
                    if (cmd && handlers.onCopy) {
                        e.preventDefault();
                        handlers.onCopy();
                    }
                    break;

                // Paste (Cmd+V)
                case 'v':
                    if (cmd && handlers.onPaste) {
                        e.preventDefault();
                        handlers.onPaste();
                    }
                    break;

                // Cut (Cmd+X)
                case 'x':
                    if (cmd && handlers.onCut) {
                        e.preventDefault();
                        handlers.onCut();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, handlers, maxShuttleSpeed, resetShuttle]);

    return {
        shuttleSpeed: shuttleSpeedState,
        resetShuttle,
    };
}

// Shortcut reference for UI display
export const TIMELINE_SHORTCUTS = [
    { key: 'Space', action: 'Play/Pause' },
    { key: 'J', action: 'Reverse Shuttle (1x, 2x, 4x, 8x)' },
    { key: 'K', action: 'Stop' },
    { key: 'L', action: 'Forward Shuttle (1x, 2x, 4x, 8x)' },
    { key: 'I', action: 'Mark In' },
    { key: 'O', action: 'Mark Out' },
    { key: 'M', action: 'Add Marker at Playhead' },
    { key: 'Shift+M', action: 'Go to Previous Marker' },
    { key: 'Shift+N', action: 'Go to Next Marker' },
    { key: 'Cmd/Ctrl+B', action: 'Blade/Split at Playhead' },
    { key: 'Left/Right', action: 'Nudge 1 Frame' },
    { key: 'Shift+Left/Right', action: 'Nudge 10 Frames' },
    { key: 'Cmd/Ctrl+=', action: 'Zoom In' },
    { key: 'Cmd/Ctrl+-', action: 'Zoom Out' },
    { key: 'Shift+Z', action: 'Zoom to Fit' },
    { key: 'Cmd/Ctrl+Z', action: 'Undo' },
    { key: 'Cmd/Ctrl+Shift+Z', action: 'Redo' },
    { key: 'Delete', action: 'Delete Selected' },
    { key: 'Cmd/Ctrl+A', action: 'Select All' },
    { key: 'Escape', action: 'Deselect All' },
] as const;

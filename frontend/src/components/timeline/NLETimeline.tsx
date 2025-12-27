'use client';

/**
 * NLETimeline - Professional Non-Linear Editor Timeline
 *
 * Features:
 * - V1 (Video) and A1 (Audio) tracks with independent trimming
 * - L-Cut/J-Cut support via audio offset
 * - Magnetic snapping (10px threshold)
 * - Gap detection with red indicators
 * - Playhead scrubbing with frame-accurate positioning
 * - Trim handles for in/out points
 * - Link/Unlink A/V tracks
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, SkipBack, SkipForward, Scissors, Link2, Unlink2,
    ZoomIn, ZoomOut, Volume2, VolumeX, ChevronDown, ChevronUp,
    Trash2, Copy, Maximize2
} from 'lucide-react';
import { useTimelineShortcuts, TIMELINE_SHORTCUTS } from '@/hooks/useTimelineShortcuts';

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineClip {
    id: string;
    name: string;
    videoUrl: string;
    audioUrl?: string;
    duration: number;          // Total clip duration in seconds
    trimStart: number;         // Video in-point (seconds)
    trimEnd: number;           // Video out-point (seconds)
    audioTrimStart: number;    // Audio in-point for L-Cut
    audioTrimEnd: number;      // Audio out-point for L-Cut
    audioGain: number;         // 0-2 (0=muted, 1=normal, 2=boosted)
    avLinked: boolean;         // Are A/V trims locked together?
    thumbnailUrl?: string;
    waveformUrl?: string;
}

export interface TimelineMark {
    type: 'in' | 'out';
    time: number;
}

interface NLETimelineProps {
    clips: TimelineClip[];
    currentTime: number;
    isPlaying: boolean;
    duration: number;          // Total timeline duration
    frameRate?: number;        // Default 24fps
    zoom?: number;             // Pixels per second (default 50)
    onClipsChange: (clips: TimelineClip[]) => void;
    onTimeChange: (time: number) => void;
    onPlayPause: () => void;
    onSplit?: (clipId: string, time: number) => void;
    onDelete?: (clipId: string) => void;
    onExport?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TRACK_HEIGHT = 60;
const AUDIO_TRACK_HEIGHT = 40;
const RULER_HEIGHT = 28;
const SNAP_THRESHOLD = 10; // pixels
const MIN_ZOOM = 10;
const MAX_ZOOM = 200;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimecode(seconds: number, frameRate: number = 24): string {
    const totalFrames = Math.floor(seconds * frameRate);
    const frames = totalFrames % frameRate;
    const totalSeconds = Math.floor(seconds);
    const secs = totalSeconds % 60;
    const mins = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

function findSnapPoints(clips: TimelineClip[], excludeId?: string): number[] {
    const points: number[] = [0];
    let cursor = 0;

    for (const clip of clips) {
        if (clip.id === excludeId) continue;
        const clipDuration = clip.trimEnd - clip.trimStart;
        points.push(cursor);
        points.push(cursor + clipDuration);
        cursor += clipDuration;
    }

    return [...new Set(points)];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VideoClipProps {
    clip: TimelineClip;
    startTime: number;
    zoom: number;
    isSelected: boolean;
    onSelect: () => void;
    onTrimStart: (delta: number) => void;
    onTrimEnd: (delta: number) => void;
    onMove: (delta: number) => void;
}

function VideoClipComponent({
    clip,
    startTime,
    zoom,
    isSelected,
    onSelect,
    onTrimStart,
    onTrimEnd,
}: VideoClipProps) {
    const clipDuration = clip.trimEnd - clip.trimStart;
    const width = clipDuration * zoom;
    const left = startTime * zoom;

    const [isDraggingStart, setIsDraggingStart] = useState(false);
    const [isDraggingEnd, setIsDraggingEnd] = useState(false);
    const dragStartX = useRef(0);

    // Trim start handle
    const handleTrimStartMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingStart(true);
        dragStartX.current = e.clientX;

        const handleMouseMove = (moveE: MouseEvent) => {
            const delta = (moveE.clientX - dragStartX.current) / zoom;
            onTrimStart(delta);
            dragStartX.current = moveE.clientX;
        };

        const handleMouseUp = () => {
            setIsDraggingStart(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Trim end handle
    const handleTrimEndMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingEnd(true);
        dragStartX.current = e.clientX;

        const handleMouseMove = (moveE: MouseEvent) => {
            const delta = (moveE.clientX - dragStartX.current) / zoom;
            onTrimEnd(delta);
            dragStartX.current = moveE.clientX;
        };

        const handleMouseUp = () => {
            setIsDraggingEnd(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={`absolute top-0 h-full rounded-md border-2 transition-colors ${
                isSelected
                    ? 'border-cyan-400 bg-cyan-500/30'
                    : 'border-cyan-600/50 bg-cyan-900/40 hover:border-cyan-500'
            }`}
            style={{ left, width: Math.max(width, 20) }}
            onClick={onSelect}
        >
            {/* Thumbnail background */}
            {clip.thumbnailUrl && (
                <div
                    className="absolute inset-0 rounded bg-cover bg-center opacity-30"
                    style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
                />
            )}

            {/* Clip name */}
            <div className="absolute inset-x-0 top-0 truncate px-2 py-1 text-xs font-medium text-white">
                {clip.name}
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[10px] text-white/70">
                {clipDuration.toFixed(2)}s
            </div>

            {/* Trim handles */}
            <div
                className={`absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l ${
                    isDraggingStart ? 'bg-cyan-400' : 'bg-cyan-500/50 hover:bg-cyan-400'
                }`}
                onMouseDown={handleTrimStartMouseDown}
            />
            <div
                className={`absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r ${
                    isDraggingEnd ? 'bg-cyan-400' : 'bg-cyan-500/50 hover:bg-cyan-400'
                }`}
                onMouseDown={handleTrimEndMouseDown}
            />
        </div>
    );
}

interface AudioClipProps {
    clip: TimelineClip;
    videoStartTime: number;
    zoom: number;
    isSelected: boolean;
    onSelect: () => void;
    onAudioTrimStart: (delta: number) => void;
    onAudioTrimEnd: (delta: number) => void;
    onToggleLink: () => void;
    onGainChange: (gain: number) => void;
}

function AudioClipComponent({
    clip,
    videoStartTime,
    zoom,
    isSelected,
    onSelect,
    onAudioTrimStart,
    onAudioTrimEnd,
    onToggleLink,
    onGainChange,
}: AudioClipProps) {
    const audioDuration = clip.audioTrimEnd - clip.audioTrimStart;
    const width = audioDuration * zoom;

    // Calculate audio offset (L-Cut/J-Cut)
    const audioOffset = clip.audioTrimStart - clip.trimStart;
    const audioLeft = (videoStartTime + audioOffset) * zoom;

    const [isDraggingStart, setIsDraggingStart] = useState(false);
    const [isDraggingEnd, setIsDraggingEnd] = useState(false);
    const [showGainSlider, setShowGainSlider] = useState(false);
    const dragStartX = useRef(0);

    // Determine L-Cut/J-Cut badge
    const offsetBadge = useMemo(() => {
        if (Math.abs(audioOffset) < 0.05) return null;
        if (audioOffset > 0) return { text: `L +${audioOffset.toFixed(1)}s`, color: 'bg-amber-500' };
        return { text: `J ${audioOffset.toFixed(1)}s`, color: 'bg-blue-500' };
    }, [audioOffset]);

    // Check if audio is misaligned with video
    const isMisaligned = !clip.avLinked || Math.abs(audioOffset) > 0.05;

    const handleAudioTrimStartMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingStart(true);
        dragStartX.current = e.clientX;

        const handleMouseMove = (moveE: MouseEvent) => {
            const delta = (moveE.clientX - dragStartX.current) / zoom;
            onAudioTrimStart(delta);
            dragStartX.current = moveE.clientX;
        };

        const handleMouseUp = () => {
            setIsDraggingStart(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleAudioTrimEndMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingEnd(true);
        dragStartX.current = e.clientX;

        const handleMouseMove = (moveE: MouseEvent) => {
            const delta = (moveE.clientX - dragStartX.current) / zoom;
            onAudioTrimEnd(delta);
            dragStartX.current = moveE.clientX;
        };

        const handleMouseUp = () => {
            setIsDraggingEnd(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={`absolute top-0 h-full rounded-md border-2 transition-colors ${
                isSelected
                    ? 'border-purple-400 bg-purple-500/30'
                    : isMisaligned
                        ? 'border-dashed border-purple-500/50 bg-purple-900/30'
                        : 'border-purple-600/50 bg-purple-900/40 hover:border-purple-500'
            }`}
            style={{ left: audioLeft, width: Math.max(width, 20) }}
            onClick={onSelect}
            onDoubleClick={() => setShowGainSlider(!showGainSlider)}
        >
            {/* Waveform background */}
            {clip.waveformUrl && (
                <div
                    className="absolute inset-0 rounded bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${clip.waveformUrl})` }}
                />
            )}

            {/* Link indicator */}
            <button
                onClick={(e) => { e.stopPropagation(); onToggleLink(); }}
                className={`absolute left-1 top-1 rounded p-0.5 ${
                    clip.avLinked ? 'text-green-400' : 'text-red-400'
                }`}
            >
                {clip.avLinked ? <Link2 className="h-3 w-3" /> : <Unlink2 className="h-3 w-3" />}
            </button>

            {/* L-Cut/J-Cut badge */}
            {offsetBadge && (
                <div className={`absolute right-1 top-1 rounded px-1 text-[10px] font-medium text-white ${offsetBadge.color}`}>
                    {offsetBadge.text}
                </div>
            )}

            {/* Volume indicator */}
            <div className="absolute bottom-1 left-1 flex items-center gap-1">
                {clip.audioGain === 0 ? (
                    <VolumeX className="h-3 w-3 text-red-400" />
                ) : (
                    <Volume2 className="h-3 w-3 text-white/70" />
                )}
                <span className="text-[10px] text-white/50">{Math.round(clip.audioGain * 100)}%</span>
            </div>

            {/* Gain slider (shown on double-click) */}
            <AnimatePresence>
                {showGainSlider && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded bg-zinc-800 px-2 py-1 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={clip.audioGain * 100}
                            onChange={(e) => onGainChange(parseInt(e.target.value) / 100)}
                            className="h-1 w-20 cursor-pointer"
                        />
                        <span className="text-xs text-white">{Math.round(clip.audioGain * 100)}%</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Trim handles (purple themed) */}
            <div
                className={`absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l ${
                    isDraggingStart ? 'bg-purple-400' : 'bg-purple-500/50 hover:bg-purple-400'
                }`}
                onMouseDown={handleAudioTrimStartMouseDown}
            />
            <div
                className={`absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r ${
                    isDraggingEnd ? 'bg-purple-400' : 'bg-purple-500/50 hover:bg-purple-400'
                }`}
                onMouseDown={handleAudioTrimEndMouseDown}
            />
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NLETimeline({
    clips,
    currentTime,
    isPlaying,
    duration,
    frameRate = 24,
    zoom: initialZoom = 50,
    onClipsChange,
    onTimeChange,
    onPlayPause,
    onSplit,
    onDelete,
    onExport,
}: NLETimelineProps) {
    const [zoom, setZoom] = useState(initialZoom);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [markIn, setMarkIn] = useState<number | null>(null);
    const [markOut, setMarkOut] = useState<number | null>(null);
    const [shuttleSpeed, setShuttleSpeed] = useState(0);
    const [showShortcuts, setShowShortcuts] = useState(false);

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Calculate clip positions
    const clipPositions = useMemo(() => {
        const positions: { clip: TimelineClip; startTime: number }[] = [];
        let cursor = 0;

        for (const clip of clips) {
            positions.push({ clip, startTime: cursor });
            cursor += clip.trimEnd - clip.trimStart;
        }

        return positions;
    }, [clips]);

    // Find gaps in timeline
    const gaps = useMemo(() => {
        const gapList: { start: number; end: number }[] = [];
        // For now, no gaps since clips are sequential
        // This would be populated if clips could be moved freely
        return gapList;
    }, [clipPositions]);

    // Playhead position in pixels
    const playheadPosition = currentTime * zoom;

    // Timeline width
    const timelineWidth = Math.max(duration * zoom, 800);

    // Handle playhead scrubbing
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
        const newTime = Math.max(0, Math.min(x / zoom, duration));
        onTimeChange(newTime);
    };

    // Clip operations
    const handleTrimStart = useCallback((clipId: string, delta: number) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newTrimStart = Math.max(0, Math.min(clip.trimStart + delta, clip.trimEnd - 0.1));
            return {
                ...clip,
                trimStart: newTrimStart,
                audioTrimStart: clip.avLinked ? newTrimStart : clip.audioTrimStart,
            };
        }));
    }, [clips, onClipsChange]);

    const handleTrimEnd = useCallback((clipId: string, delta: number) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newTrimEnd = Math.max(clip.trimStart + 0.1, Math.min(clip.trimEnd + delta, clip.duration));
            return {
                ...clip,
                trimEnd: newTrimEnd,
                audioTrimEnd: clip.avLinked ? newTrimEnd : clip.audioTrimEnd,
            };
        }));
    }, [clips, onClipsChange]);

    const handleAudioTrimStart = useCallback((clipId: string, delta: number) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newAudioTrimStart = Math.max(0, Math.min(clip.audioTrimStart + delta, clip.audioTrimEnd - 0.1));
            return { ...clip, audioTrimStart: newAudioTrimStart };
        }));
    }, [clips, onClipsChange]);

    const handleAudioTrimEnd = useCallback((clipId: string, delta: number) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newAudioTrimEnd = Math.max(clip.audioTrimStart + 0.1, Math.min(clip.audioTrimEnd + delta, clip.duration));
            return { ...clip, audioTrimEnd: newAudioTrimEnd };
        }));
    }, [clips, onClipsChange]);

    const handleToggleLink = useCallback((clipId: string) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return { ...clip, avLinked: !clip.avLinked };
        }));
    }, [clips, onClipsChange]);

    const handleGainChange = useCallback((clipId: string, gain: number) => {
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            return { ...clip, audioGain: gain };
        }));
    }, [clips, onClipsChange]);

    // Keyboard shortcuts
    useTimelineShortcuts({
        onPlayPause,
        onShuttle: (speed) => {
            setShuttleSpeed(speed);
            // Implement shuttle playback logic here
        },
        onStop: () => {
            setShuttleSpeed(0);
            if (isPlaying) onPlayPause();
        },
        onSplit: () => {
            if (selectedClipId && onSplit) {
                // Find the clip and calculate split point
                const position = clipPositions.find(p => p.clip.id === selectedClipId);
                if (position) {
                    const splitTime = currentTime - position.startTime;
                    if (splitTime > 0 && splitTime < (position.clip.trimEnd - position.clip.trimStart)) {
                        onSplit(selectedClipId, splitTime);
                    }
                }
            }
        },
        onMarkIn: () => setMarkIn(currentTime),
        onMarkOut: () => setMarkOut(currentTime),
        onNudge: (frames) => {
            const frameDuration = 1 / frameRate;
            const newTime = Math.max(0, Math.min(currentTime + frames * frameDuration, duration));
            onTimeChange(newTime);
        },
        onZoom: (direction) => {
            if (direction === 'in') setZoom(z => Math.min(z * 1.5, MAX_ZOOM));
            else if (direction === 'out') setZoom(z => Math.max(z / 1.5, MIN_ZOOM));
            else setZoom(50); // fit
        },
        onUndo: () => console.log('Undo'), // Implement undo stack
        onRedo: () => console.log('Redo'), // Implement redo stack
        onDelete: () => {
            if (selectedClipId && onDelete) {
                onDelete(selectedClipId);
                setSelectedClipId(null);
            }
        },
        onDeselectAll: () => setSelectedClipId(null),
    });

    // Auto-scroll to playhead
    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const playheadX = currentTime * zoom;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        if (playheadX < scrollLeft + 100 || playheadX > scrollLeft + containerWidth - 100) {
            container.scrollTo({ left: playheadX - containerWidth / 2, behavior: 'smooth' });
        }
    }, [currentTime, zoom]);

    // Generate ruler marks
    const rulerMarks = useMemo(() => {
        const marks: { time: number; label: string; isMajor: boolean }[] = [];
        const step = zoom > 100 ? 0.5 : zoom > 50 ? 1 : zoom > 25 ? 2 : 5;

        for (let t = 0; t <= duration; t += step) {
            marks.push({
                time: t,
                label: formatTimecode(t, frameRate).slice(3), // Remove hours
                isMajor: t % (step * 2) === 0,
            });
        }

        return marks;
    }, [duration, zoom, frameRate]);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90">
            {/* Transport Controls */}
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-800/50 px-4 py-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onTimeChange(0)}
                        className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onPlayPause}
                        className="rounded bg-purple-500 p-2 text-white hover:bg-purple-400"
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onTimeChange(duration)}
                        className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <SkipForward className="h-4 w-4" />
                    </button>

                    {/* Shuttle speed indicator */}
                    {shuttleSpeed !== 0 && (
                        <div className={`rounded px-2 py-0.5 text-xs font-medium ${
                            shuttleSpeed > 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            {shuttleSpeed > 0 ? `${shuttleSpeed}x` : `${shuttleSpeed}x`}
                        </div>
                    )}
                </div>

                {/* Timecode display */}
                <div className="font-mono text-sm text-white">
                    {formatTimecode(currentTime, frameRate)}
                </div>

                {/* Tools */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setZoom(z => Math.max(z / 1.5, MIN_ZOOM))}
                        className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3rem] text-center text-xs text-white/50">
                        {Math.round(zoom)}px/s
                    </span>
                    <button
                        onClick={() => setZoom(z => Math.min(z * 1.5, MAX_ZOOM))}
                        className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <div className="mx-2 h-4 w-px bg-white/20" />

                    <button
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        {showShortcuts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
                        >
                            <Maximize2 className="h-4 w-4" />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* Keyboard shortcuts panel */}
            <AnimatePresence>
                {showShortcuts && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-white/10 bg-zinc-800/30"
                    >
                        <div className="grid grid-cols-4 gap-2 p-3 text-xs">
                            {TIMELINE_SHORTCUTS.map((shortcut) => (
                                <div key={shortcut.key} className="flex justify-between">
                                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-white">
                                        {shortcut.key}
                                    </span>
                                    <span className="text-white/50">{shortcut.action}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Timeline area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden"
            >
                <div
                    ref={timelineRef}
                    className="relative"
                    style={{ width: timelineWidth, minHeight: RULER_HEIGHT + TRACK_HEIGHT + AUDIO_TRACK_HEIGHT + 40 }}
                    onClick={handleTimelineClick}
                >
                    {/* Ruler */}
                    <div
                        className="sticky top-0 z-20 border-b border-white/10 bg-zinc-800"
                        style={{ height: RULER_HEIGHT }}
                    >
                        {rulerMarks.map((mark) => (
                            <div
                                key={mark.time}
                                className="absolute top-0 flex flex-col items-center"
                                style={{ left: mark.time * zoom }}
                            >
                                <div
                                    className={`${mark.isMajor ? 'h-3 bg-white/40' : 'h-2 bg-white/20'}`}
                                    style={{ width: 1 }}
                                />
                                {mark.isMajor && (
                                    <span className="mt-0.5 text-[10px] text-white/40">{mark.label}</span>
                                )}
                            </div>
                        ))}

                        {/* Mark In/Out indicators */}
                        {markIn !== null && (
                            <div
                                className="absolute top-0 h-full w-0.5 bg-yellow-400"
                                style={{ left: markIn * zoom }}
                            />
                        )}
                        {markOut !== null && (
                            <div
                                className="absolute top-0 h-full w-0.5 bg-yellow-400"
                                style={{ left: markOut * zoom }}
                            />
                        )}
                    </div>

                    {/* Track labels */}
                    <div className="absolute left-0 top-0 z-30 w-12 bg-zinc-900/90">
                        <div style={{ height: RULER_HEIGHT }} />
                        <div
                            className="flex items-center justify-center border-b border-r border-white/10 text-xs font-medium text-cyan-400"
                            style={{ height: TRACK_HEIGHT }}
                        >
                            V1
                        </div>
                        <div
                            className="flex items-center justify-center border-r border-white/10 text-xs font-medium text-purple-400"
                            style={{ height: AUDIO_TRACK_HEIGHT }}
                        >
                            A1
                        </div>
                    </div>

                    {/* Video track (V1) */}
                    <div
                        className="relative ml-12 border-b border-white/10 bg-zinc-800/30"
                        style={{ height: TRACK_HEIGHT, marginTop: RULER_HEIGHT }}
                    >
                        {clipPositions.map(({ clip, startTime }) => (
                            <VideoClipComponent
                                key={clip.id}
                                clip={clip}
                                startTime={startTime}
                                zoom={zoom}
                                isSelected={selectedClipId === clip.id}
                                onSelect={() => setSelectedClipId(clip.id)}
                                onTrimStart={(delta) => handleTrimStart(clip.id, delta)}
                                onTrimEnd={(delta) => handleTrimEnd(clip.id, delta)}
                                onMove={() => {}}
                            />
                        ))}
                    </div>

                    {/* Audio track (A1) */}
                    <div
                        className="relative ml-12 bg-zinc-800/20"
                        style={{ height: AUDIO_TRACK_HEIGHT }}
                    >
                        {clipPositions.map(({ clip, startTime }) => (
                            <AudioClipComponent
                                key={`audio-${clip.id}`}
                                clip={clip}
                                videoStartTime={startTime}
                                zoom={zoom}
                                isSelected={selectedClipId === clip.id}
                                onSelect={() => setSelectedClipId(clip.id)}
                                onAudioTrimStart={(delta) => handleAudioTrimStart(clip.id, delta)}
                                onAudioTrimEnd={(delta) => handleAudioTrimEnd(clip.id, delta)}
                                onToggleLink={() => handleToggleLink(clip.id)}
                                onGainChange={(gain) => handleGainChange(clip.id, gain)}
                            />
                        ))}
                    </div>

                    {/* Gap indicators */}
                    {gaps.map((gap, i) => (
                        <div
                            key={i}
                            className="absolute ml-12 bg-red-500/30"
                            style={{
                                left: gap.start * zoom,
                                width: (gap.end - gap.start) * zoom,
                                top: RULER_HEIGHT,
                                height: TRACK_HEIGHT + AUDIO_TRACK_HEIGHT,
                            }}
                        />
                    ))}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 z-40 w-0.5 bg-red-500"
                        style={{
                            left: playheadPosition + 48, // Account for track labels
                            height: RULER_HEIGHT + TRACK_HEIGHT + AUDIO_TRACK_HEIGHT,
                        }}
                    >
                        <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between border-t border-white/10 bg-zinc-800/50 px-4 py-1 text-xs text-white/50">
                <div>
                    {clips.length} clips | Duration: {formatTimecode(duration, frameRate)}
                </div>
                <div className="flex items-center gap-4">
                    {markIn !== null && <span>In: {formatTimecode(markIn, frameRate)}</span>}
                    {markOut !== null && <span>Out: {formatTimecode(markOut, frameRate)}</span>}
                    {markIn !== null && markOut !== null && (
                        <span>Selection: {formatTimecode(markOut - markIn, frameRate)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NLETimeline;

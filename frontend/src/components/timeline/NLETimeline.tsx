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
    Trash2, Copy, Maximize2, Film, Music
} from 'lucide-react';
import { useTimelineShortcuts, TIMELINE_SHORTCUTS } from '@/hooks/useTimelineShortcuts';
import { Tooltip } from '@/components/ui/Tooltip';
import { AudioWaveform } from './AudioWaveform';

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

// UX-013: Timeline Annotation Markers
export interface TimelineMarker {
    id: string;
    time: number;
    label: string;
    color: string;  // Marker color (e.g., '#fbbf24' for amber)
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

// UX-012: Find all snap points (clip edges, playhead, markers)
function findSnapPoints(
    clips: TimelineClip[],
    excludeId?: string,
    playheadTime?: number,
    markIn?: number | null,
    markOut?: number | null
): number[] {
    const points: number[] = [0]; // Always snap to timeline start
    let cursor = 0;

    for (const clip of clips) {
        if (clip.id === excludeId) continue;
        const clipDuration = clip.trimEnd - clip.trimStart;
        points.push(cursor);              // Clip start
        points.push(cursor + clipDuration); // Clip end
        cursor += clipDuration;
    }

    // Add playhead as snap point
    if (playheadTime !== undefined && playheadTime > 0) {
        points.push(playheadTime);
    }

    // Add mark in/out as snap points
    if (markIn !== null && markIn !== undefined) {
        points.push(markIn);
    }
    if (markOut !== null && markOut !== undefined) {
        points.push(markOut);
    }

    return [...new Set(points)].sort((a, b) => a - b);
}

// UX-012: Magnetic snapping - returns snapped value if within threshold
function snapToPoint(value: number, snapPoints: number[], threshold: number, zoom: number): { value: number; snapped: boolean; snapTarget?: number } {
    const thresholdInSeconds = threshold / zoom;

    for (const point of snapPoints) {
        if (Math.abs(value - point) <= thresholdInSeconds) {
            return { value: point, snapped: true, snapTarget: point };
        }
    }

    return { value, snapped: false };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface VideoClipProps {
    clip: TimelineClip;
    startTime: number;
    zoom: number;
    isSelected: boolean;
    snapPoints: number[];
    onSelect: () => void;
    onTrimStart: (delta: number, snapped: boolean, snapTarget?: number) => void;
    onTrimEnd: (delta: number, snapped: boolean, snapTarget?: number) => void;
    onMove: (delta: number) => void;
}

function VideoClipComponent({
    clip,
    startTime,
    zoom,
    isSelected,
    snapPoints,
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

    // UX-015: Thumbnail Scrubbing state
    const [isHovering, setIsHovering] = useState(false);
    const [hoverX, setHoverX] = useState(0);
    const [hoverTime, setHoverTime] = useState(0);
    const clipRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);

    // UX-015: Handle mouse move to calculate scrub position
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!clipRef.current || isDraggingStart || isDraggingEnd) return;

        const rect = clipRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const scrubProgress = Math.max(0, Math.min(1, relativeX / rect.width));
        const scrubTime = clip.trimStart + (clipDuration * scrubProgress);

        setHoverX(relativeX);
        setHoverTime(scrubTime);
    }, [clip.trimStart, clipDuration, isDraggingStart, isDraggingEnd]);

    // UX-015: Generate thumbnail at scrub position
    useEffect(() => {
        if (!isHovering || !clip.videoUrl) return;

        // Create video element for frame extraction
        if (!videoRef.current) {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = clip.videoUrl;
            video.muted = true;
            video.preload = 'metadata';
            videoRef.current = video;
        }

        const video = videoRef.current;

        const extractFrame = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 90;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    setThumbnailDataUrl(canvas.toDataURL('image/jpeg', 0.7));
                }
            } catch {
                // Silently fail - CORS or other issues
            }
        };

        video.currentTime = hoverTime;
        video.onseeked = extractFrame;

        return () => {
            video.onseeked = null;
        };
    }, [isHovering, hoverTime, clip.videoUrl]);

    // Cleanup video element on unmount
    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.src = '';
                videoRef.current = null;
            }
        };
    }, []);

    // Trim start handle with magnetic snapping
    const handleTrimStartMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingStart(true);
        dragStartX.current = e.clientX;
        let accumulatedDelta = 0;

        const handleMouseMove = (moveE: MouseEvent) => {
            const pixelDelta = moveE.clientX - dragStartX.current;
            accumulatedDelta += pixelDelta / zoom;

            // Calculate the new trim start position in timeline time
            const newTrimStart = clip.trimStart + accumulatedDelta;
            const newStartTimeOnTimeline = startTime + accumulatedDelta;

            // UX-012: Apply magnetic snapping
            const snapResult = snapToPoint(newStartTimeOnTimeline, snapPoints, SNAP_THRESHOLD, zoom);

            if (snapResult.snapped && snapResult.snapTarget !== undefined) {
                // Snapped - adjust delta to hit snap point exactly
                const snappedDelta = snapResult.snapTarget - startTime - clip.trimStart + clip.trimStart;
                onTrimStart(snappedDelta - clip.trimStart + clip.trimStart, true, snapResult.snapTarget);
            } else {
                onTrimStart(accumulatedDelta, false);
            }

            dragStartX.current = moveE.clientX;
            accumulatedDelta = 0;
        };

        const handleMouseUp = () => {
            setIsDraggingStart(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Trim end handle with magnetic snapping
    const handleTrimEndMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingEnd(true);
        dragStartX.current = e.clientX;
        let accumulatedDelta = 0;

        const handleMouseMove = (moveE: MouseEvent) => {
            const pixelDelta = moveE.clientX - dragStartX.current;
            accumulatedDelta += pixelDelta / zoom;

            // Calculate the new end position in timeline time
            const clipDur = clip.trimEnd - clip.trimStart;
            const newEndTimeOnTimeline = startTime + clipDur + accumulatedDelta;

            // UX-012: Apply magnetic snapping
            const snapResult = snapToPoint(newEndTimeOnTimeline, snapPoints, SNAP_THRESHOLD, zoom);

            if (snapResult.snapped && snapResult.snapTarget !== undefined) {
                // Snapped - calculate delta to hit snap point
                const targetDelta = snapResult.snapTarget - startTime - clipDur;
                onTrimEnd(targetDelta, true, snapResult.snapTarget);
            } else {
                onTrimEnd(accumulatedDelta, false);
            }

            dragStartX.current = moveE.clientX;
            accumulatedDelta = 0;
        };

        const handleMouseUp = () => {
            setIsDraggingEnd(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // UX-015: Format timecode for scrub preview
    const formatScrubTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const frames = Math.floor((time % 1) * 24);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    return (
        <div
            ref={clipRef}
            className={`absolute top-0 h-full rounded-md border-2 transition-colors ${
                isSelected
                    ? 'border-cyan-400 bg-cyan-500/30'
                    : 'border-cyan-600/50 bg-cyan-900/40 hover:border-cyan-500'
            }`}
            style={{ left, width: Math.max(width, 20) }}
            onClick={onSelect}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                setThumbnailDataUrl(null);
            }}
            onMouseMove={handleMouseMove}
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

            {/* UX-015: Floating Thumbnail Scrub Preview */}
            {isHovering && !isDraggingStart && !isDraggingEnd && (
                <div
                    className="pointer-events-none absolute bottom-full z-50 mb-2"
                    style={{
                        left: Math.max(0, Math.min(hoverX - 80, width - 160)),
                    }}
                >
                    <div className="overflow-hidden rounded-lg border border-white/20 bg-zinc-900 shadow-2xl">
                        {/* Thumbnail */}
                        <div className="relative h-[90px] w-[160px] bg-zinc-800">
                            {thumbnailDataUrl ? (
                                <img
                                    src={thumbnailDataUrl}
                                    alt="Scrub preview"
                                    className="h-full w-full object-cover"
                                />
                            ) : clip.thumbnailUrl ? (
                                <img
                                    src={clip.thumbnailUrl}
                                    alt="Clip thumbnail"
                                    className="h-full w-full object-cover opacity-50"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <Film className="h-8 w-8 text-white/30" />
                                </div>
                            )}
                            {/* Timecode overlay */}
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
                                {formatScrubTime(hoverTime)}
                            </div>
                        </div>
                        {/* Clip name */}
                        <div className="truncate bg-zinc-800/80 px-2 py-1 text-center text-[10px] text-white/70">
                            {clip.name}
                        </div>
                    </div>
                    {/* Arrow pointer */}
                    <div className="flex justify-center">
                        <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-900" />
                    </div>
                </div>
            )}
        </div>
    );
}

interface AudioClipProps {
    clip: TimelineClip;
    videoStartTime: number;
    zoom: number;
    isSelected: boolean;
    snapPoints: number[];
    onSelect: () => void;
    onAudioTrimStart: (delta: number, snapped: boolean, snapTarget?: number) => void;
    onAudioTrimEnd: (delta: number, snapped: boolean, snapTarget?: number) => void;
    onToggleLink: () => void;
    onGainChange: (gain: number) => void;
}

function AudioClipComponent({
    clip,
    videoStartTime,
    zoom,
    isSelected,
    snapPoints,
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

    // Audio trim start with magnetic snapping
    const handleAudioTrimStartMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingStart(true);
        dragStartX.current = e.clientX;
        let accumulatedDelta = 0;

        const handleMouseMove = (moveE: MouseEvent) => {
            const pixelDelta = moveE.clientX - dragStartX.current;
            accumulatedDelta += pixelDelta / zoom;

            // Calculate the new audio start position in timeline time
            const currentAudioLeft = videoStartTime + audioOffset;
            const newAudioStartTime = currentAudioLeft + accumulatedDelta;

            // UX-012: Apply magnetic snapping
            const snapResult = snapToPoint(newAudioStartTime, snapPoints, SNAP_THRESHOLD, zoom);

            if (snapResult.snapped && snapResult.snapTarget !== undefined) {
                const targetDelta = snapResult.snapTarget - currentAudioLeft;
                onAudioTrimStart(targetDelta, true, snapResult.snapTarget);
            } else {
                onAudioTrimStart(accumulatedDelta, false);
            }

            dragStartX.current = moveE.clientX;
            accumulatedDelta = 0;
        };

        const handleMouseUp = () => {
            setIsDraggingStart(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Audio trim end with magnetic snapping
    const handleAudioTrimEndMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingEnd(true);
        dragStartX.current = e.clientX;
        let accumulatedDelta = 0;

        const handleMouseMove = (moveE: MouseEvent) => {
            const pixelDelta = moveE.clientX - dragStartX.current;
            accumulatedDelta += pixelDelta / zoom;

            // Calculate the new audio end position in timeline time
            const currentAudioLeft = videoStartTime + audioOffset;
            const newAudioEndTime = currentAudioLeft + audioDuration + accumulatedDelta;

            // UX-012: Apply magnetic snapping
            const snapResult = snapToPoint(newAudioEndTime, snapPoints, SNAP_THRESHOLD, zoom);

            if (snapResult.snapped && snapResult.snapTarget !== undefined) {
                const targetDelta = snapResult.snapTarget - (currentAudioLeft + audioDuration);
                onAudioTrimEnd(targetDelta, true, snapResult.snapTarget);
            } else {
                onAudioTrimEnd(accumulatedDelta, false);
            }

            dragStartX.current = moveE.clientX;
            accumulatedDelta = 0;
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
            {/* UX-014: Audio Waveform visualization */}
            <div className="absolute inset-0 flex items-center overflow-hidden rounded opacity-60">
                <AudioWaveform
                    clipId={clip.id}
                    width={Math.max(width, 20)}
                    height={AUDIO_TRACK_HEIGHT - 8}
                    color="rgba(168, 85, 247, 0.7)"
                />
            </div>

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
    // UX-012: Snap indicator state
    const [snapIndicator, setSnapIndicator] = useState<number | null>(null);
    // UX-013: Timeline annotation markers
    const [markers, setMarkers] = useState<TimelineMarker[]>([]);
    const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
    const [markerInputValue, setMarkerInputValue] = useState('');

    const timelineRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const snapIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // UX-012: Calculate snap points (memoized for performance)
    const snapPoints = useMemo(() => {
        return findSnapPoints(clips, undefined, currentTime, markIn, markOut);
    }, [clips, currentTime, markIn, markOut]);

    // UX-012: Show snap indicator briefly when snapping occurs
    const showSnapIndicator = useCallback((snapTime: number) => {
        setSnapIndicator(snapTime);
        if (snapIndicatorTimeoutRef.current) {
            clearTimeout(snapIndicatorTimeoutRef.current);
        }
        snapIndicatorTimeoutRef.current = setTimeout(() => {
            setSnapIndicator(null);
        }, 500);
    }, []);

    // Handle playhead scrubbing
    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
        const newTime = Math.max(0, Math.min(x / zoom, duration));
        onTimeChange(newTime);
    };

    // Clip operations - UX-012: Updated to receive snap info
    const handleTrimStart = useCallback((clipId: string, delta: number, snapped?: boolean, snapTarget?: number) => {
        if (snapped && snapTarget !== undefined) {
            showSnapIndicator(snapTarget);
        }
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newTrimStart = Math.max(0, Math.min(clip.trimStart + delta, clip.trimEnd - 0.1));
            return {
                ...clip,
                trimStart: newTrimStart,
                audioTrimStart: clip.avLinked ? newTrimStart : clip.audioTrimStart,
            };
        }));
    }, [clips, onClipsChange, showSnapIndicator]);

    const handleTrimEnd = useCallback((clipId: string, delta: number, snapped?: boolean, snapTarget?: number) => {
        if (snapped && snapTarget !== undefined) {
            showSnapIndicator(snapTarget);
        }
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newTrimEnd = Math.max(clip.trimStart + 0.1, Math.min(clip.trimEnd + delta, clip.duration));
            return {
                ...clip,
                trimEnd: newTrimEnd,
                audioTrimEnd: clip.avLinked ? newTrimEnd : clip.audioTrimEnd,
            };
        }));
    }, [clips, onClipsChange, showSnapIndicator]);

    const handleAudioTrimStart = useCallback((clipId: string, delta: number, snapped?: boolean, snapTarget?: number) => {
        if (snapped && snapTarget !== undefined) {
            showSnapIndicator(snapTarget);
        }
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newAudioTrimStart = Math.max(0, Math.min(clip.audioTrimStart + delta, clip.audioTrimEnd - 0.1));
            return { ...clip, audioTrimStart: newAudioTrimStart };
        }));
    }, [clips, onClipsChange, showSnapIndicator]);

    const handleAudioTrimEnd = useCallback((clipId: string, delta: number, snapped?: boolean, snapTarget?: number) => {
        if (snapped && snapTarget !== undefined) {
            showSnapIndicator(snapTarget);
        }
        onClipsChange(clips.map(clip => {
            if (clip.id !== clipId) return clip;
            const newAudioTrimEnd = Math.max(clip.audioTrimStart + 0.1, Math.min(clip.audioTrimEnd + delta, clip.duration));
            return { ...clip, audioTrimEnd: newAudioTrimEnd };
        }));
    }, [clips, onClipsChange, showSnapIndicator]);

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

    // UX-013: Marker functions
    const addMarker = useCallback((time: number, label: string = '') => {
        const newMarker: TimelineMarker = {
            id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            time,
            label,
            color: '#fbbf24', // Amber by default
        };
        setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
        setEditingMarkerId(newMarker.id);
        setMarkerInputValue('');
    }, []);

    const updateMarkerLabel = useCallback((id: string, label: string) => {
        setMarkers(prev => prev.map(m => m.id === id ? { ...m, label } : m));
    }, []);

    const deleteMarker = useCallback((id: string) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
        if (editingMarkerId === id) {
            setEditingMarkerId(null);
        }
    }, [editingMarkerId]);

    const goToNextMarker = useCallback(() => {
        const nextMarker = markers.find(m => m.time > currentTime + 0.01);
        if (nextMarker) {
            onTimeChange(nextMarker.time);
        }
    }, [markers, currentTime, onTimeChange]);

    const goToPrevMarker = useCallback(() => {
        const prevMarkers = markers.filter(m => m.time < currentTime - 0.01);
        if (prevMarkers.length > 0) {
            onTimeChange(prevMarkers[prevMarkers.length - 1].time);
        }
    }, [markers, currentTime, onTimeChange]);

    // UX-013: M key to add marker at playhead
    useEffect(() => {
        const handleMarkerShortcut = (e: KeyboardEvent) => {
            // Ignore if typing in input fields
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
            if (target.isContentEditable) return;

            if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                addMarker(currentTime);
            }
            // Shift+M or Shift+N for marker navigation
            if (e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                goToPrevMarker();
            }
            if (e.shiftKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                goToNextMarker();
            }
        };

        window.addEventListener('keydown', handleMarkerShortcut);
        return () => window.removeEventListener('keydown', handleMarkerShortcut);
    }, [addMarker, currentTime, goToNextMarker, goToPrevMarker]);

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
                    {/* NLE Badge - Modern Non-Linear Editor indicator */}
                    <div className="mr-2 flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
                        <span className="text-[10px] font-semibold tracking-wider text-purple-300">NLE</span>
                    </div>

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

                {/* UX-013: Marker count badge */}
                {markers.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
                        <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-amber-400" />
                        <span className="text-xs font-medium text-amber-400">{markers.length}</span>
                    </div>
                )}

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

                        {/* UX-013: Timeline Markers */}
                        {markers.map((marker) => (
                            <div
                                key={marker.id}
                                className="absolute top-0 z-30 flex flex-col items-center"
                                style={{ left: marker.time * zoom }}
                            >
                                {/* Marker flag */}
                                <div
                                    className="group relative cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingMarkerId(marker.id);
                                        setMarkerInputValue(marker.label);
                                    }}
                                >
                                    {/* Triangle marker */}
                                    <div
                                        className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent transition-transform hover:scale-110"
                                        style={{ borderTopColor: marker.color }}
                                    />
                                    {/* Vertical line */}
                                    <div
                                        className="absolute left-1/2 top-[10px] h-[14px] w-0.5 -translate-x-1/2"
                                        style={{ backgroundColor: marker.color }}
                                    />
                                    {/* Label tooltip on hover */}
                                    {marker.label && (
                                        <div className="absolute left-1/2 top-7 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                                            {marker.label}
                                        </div>
                                    )}
                                    {/* Delete button on hover */}
                                    <button
                                        className="absolute -right-4 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white group-hover:flex"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteMarker(marker.id);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Inline label editor */}
                                {editingMarkerId === marker.id && (
                                    <div className="absolute top-7 z-50 flex items-center gap-1 rounded-lg border border-white/20 bg-zinc-900 p-1 shadow-xl">
                                        <input
                                            type="text"
                                            value={markerInputValue}
                                            onChange={(e) => setMarkerInputValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    updateMarkerLabel(marker.id, markerInputValue);
                                                    setEditingMarkerId(null);
                                                } else if (e.key === 'Escape') {
                                                    setEditingMarkerId(null);
                                                }
                                            }}
                                            onBlur={() => {
                                                updateMarkerLabel(marker.id, markerInputValue);
                                                setEditingMarkerId(null);
                                            }}
                                            autoFocus
                                            placeholder="Marker label..."
                                            className="w-32 rounded bg-zinc-800 px-2 py-1 text-xs text-white placeholder-white/40 outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                        <button
                                            onClick={() => deleteMarker(marker.id)}
                                            className="rounded p-1 text-red-400 hover:bg-red-500/20"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Track labels - Modern NLE style with icons and tooltips */}
                    <div className="absolute left-0 top-0 z-30 w-12 bg-zinc-900/90">
                        <div style={{ height: RULER_HEIGHT }} className="border-b border-r border-white/10" />
                        <Tooltip content="Video Track - Drag edges to trim, snap to other clips" side="right">
                            <div
                                className="flex cursor-help flex-col items-center justify-center gap-0.5 border-b border-r border-white/10 bg-gradient-to-r from-cyan-950/50 to-transparent transition-colors hover:from-cyan-900/50"
                                style={{ height: TRACK_HEIGHT }}
                            >
                                <Film className="h-3 w-3 text-cyan-400" />
                                <span className="text-[10px] font-semibold tracking-wide text-cyan-400">V1</span>
                            </div>
                        </Tooltip>
                        <Tooltip content="Audio Track - Independent trim for L-Cut/J-Cut editing" side="right">
                            <div
                                className="flex cursor-help flex-col items-center justify-center gap-0.5 border-r border-white/10 bg-gradient-to-r from-purple-950/50 to-transparent transition-colors hover:from-purple-900/50"
                                style={{ height: AUDIO_TRACK_HEIGHT }}
                            >
                                <Music className="h-3 w-3 text-purple-400" />
                                <span className="text-[10px] font-semibold tracking-wide text-purple-400">A1</span>
                            </div>
                        </Tooltip>
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
                                snapPoints={findSnapPoints(clips, clip.id, currentTime, markIn, markOut)}
                                onSelect={() => setSelectedClipId(clip.id)}
                                onTrimStart={(delta, snapped, snapTarget) => handleTrimStart(clip.id, delta, snapped, snapTarget)}
                                onTrimEnd={(delta, snapped, snapTarget) => handleTrimEnd(clip.id, delta, snapped, snapTarget)}
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
                                snapPoints={findSnapPoints(clips, clip.id, currentTime, markIn, markOut)}
                                onSelect={() => setSelectedClipId(clip.id)}
                                onAudioTrimStart={(delta, snapped, snapTarget) => handleAudioTrimStart(clip.id, delta, snapped, snapTarget)}
                                onAudioTrimEnd={(delta, snapped, snapTarget) => handleAudioTrimEnd(clip.id, delta, snapped, snapTarget)}
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

                    {/* UX-012: Snap indicator line */}
                    <AnimatePresence>
                        {snapIndicator !== null && (
                            <motion.div
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: 1, scaleY: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-0 z-35 w-0.5 bg-green-400"
                                style={{
                                    left: snapIndicator * zoom + 48,
                                    height: RULER_HEIGHT + TRACK_HEIGHT + AUDIO_TRACK_HEIGHT,
                                    transformOrigin: 'top',
                                }}
                            >
                                {/* Snap indicator top dot */}
                                <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-green-400" />
                                {/* Snap label */}
                                <div className="absolute -left-6 top-1 rounded bg-green-500/80 px-1 text-[9px] font-medium text-white">
                                    SNAP
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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

            {/* Status bar - Modern NLE footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-zinc-800/50 px-4 py-1.5 text-xs text-white/50">
                <div className="flex items-center gap-3">
                    {/* Non-Linear Editor mode indicator */}
                    <span className="rounded bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        Non-Linear Editor
                    </span>
                    <span className="text-white/30">|</span>
                    <span>{clips.length} clips</span>
                    <span className="text-white/30">•</span>
                    <span>Duration: {formatTimecode(duration, frameRate)}</span>
                </div>
                <div className="flex items-center gap-4">
                    {markIn !== null && <span className="text-yellow-400/70">In: {formatTimecode(markIn, frameRate)}</span>}
                    {markOut !== null && <span className="text-yellow-400/70">Out: {formatTimecode(markOut, frameRate)}</span>}
                    {markIn !== null && markOut !== null && (
                        <span className="text-yellow-300">Selection: {formatTimecode(markOut - markIn, frameRate)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NLETimeline;

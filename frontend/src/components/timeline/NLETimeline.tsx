'use client';

/**
 * NLE Timeline - Professional Non-Linear Editor Timeline UI
 *
 * Phase 1: Core Timeline with Global Playhead, Time-Ruler, J-K-L Keys
 * Phase 2: Non-Destructive Trimming (trimStart/trimEnd handles)
 * Phase 3: Director's Mix (Audio sub-track, L-Cut)
 * Phase 4: Bake Pass (FFmpeg trim→mux→stitch)
 *
 * Styling: DaVinci Resolve-inspired with Cyan glow, Purple waveforms
 */

import {
    useState,
    useRef,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useMemo,
} from 'react';
// Panel components available for future track resizing:
// import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { TimelineAudioWaveform } from './TimelineAudioWaveform';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    Volume2,
    VolumeX,
    Scissors,
    Link2,
    Unlink,
    GripVertical,
    Film,
    Music,
    ZoomIn,
    ZoomOut,
    Maximize2,
} from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineClip {
    id: string;
    orderIndex: number;
    prompt: string;
    duration: number;  // Total duration in seconds
    trimStart: number; // Trim in-point (seconds from start)
    trimEnd: number;   // Trim out-point (seconds from end)
    status: 'pending' | 'generating' | 'complete' | 'failed';
    firstFrameUrl?: string | null;
    lastFrameUrl?: string | null;
    outputUrl?: string | null;
    thumbnailUrl?: string | null;
    audioUrl?: string | null;
    audioTrimStart?: number;  // Audio in-point for L-Cut (independent of video)
    audioTrimEnd?: number;    // Audio out-point for L-Cut (independent of video)
    audioGain?: number;       // Audio volume multiplier (0-2, default 1)
    audioDuration?: number;   // Audio file duration (may differ from video)
    avLinked?: boolean;       // Whether A/V trims are linked (default true)
}

export interface TimelineTrack {
    id: string;
    type: 'video' | 'audio' | 'adjustment';
    name: string;
    clips: TimelineClip[];
    muted: boolean;
    locked: boolean;
    height: number;
}

export interface NLETimelineProps {
    projectId: string;
    sceneChainId: string | null;
    clips: TimelineClip[];
    fps?: number;
    onClipUpdate?: (clipId: string, updates: Partial<TimelineClip>) => void;
    onClipRemove?: (clipId: string) => void;
    onClipReorder?: (clipId: string, newIndex: number) => void;
    onPlaybackChange?: (playing: boolean, currentTime: number) => void;
    onClipSelect?: (clipId: string) => void;
    onAudioTrimUpdate?: (clipId: string, audioTrimStart: number, audioTrimEnd: number) => void;
    onAudioGainChange?: (clipId: string, gain: number) => void;
}

export interface NLETimelineRef {
    seek: (time: number) => void;
    play: () => void;
    pause: () => void;
    getCurrentTime: () => number;
    refreshClips: () => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

const FPS = 24;
const DEFAULT_ZOOM = 50; // pixels per second
const MIN_ZOOM = 10;
const MAX_ZOOM = 200;

/**
 * Convert time in seconds to SMPTE timecode (HH:MM:SS:FF)
 */
function formatTimecode(seconds: number, fps: number = FPS): string {
    const totalFrames = Math.floor(seconds * fps);
    const frames = totalFrames % fps;
    const totalSeconds = Math.floor(totalFrames / fps);
    const secs = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mins = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

/**
 * Convert time in seconds to millisecond precision display (HH:MM:SS.mmm)
 */
function formatTimecodeWithMs(seconds: number): string {
    const ms = Math.floor((seconds % 1) * 1000);
    const totalSeconds = Math.floor(seconds);
    const secs = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mins = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Get effective duration of clip after trimming
 */
function getEffectiveDuration(clip: TimelineClip): number {
    return clip.duration - clip.trimStart - clip.trimEnd;
}

/**
 * Calculate cumulative start time for a clip
 */
function getClipStartTime(clips: TimelineClip[], clipIndex: number): number {
    let time = 0;
    for (let i = 0; i < clipIndex; i++) {
        time += getEffectiveDuration(clips[i]);
    }
    return time;
}

/**
 * Get total timeline duration
 */
function getTotalDuration(clips: TimelineClip[]): number {
    return clips.reduce((sum, clip) => sum + getEffectiveDuration(clip), 0);
}

/**
 * Detect gaps between clips
 * Returns array of { startTime, endTime, duration } for each gap
 */
interface TimelineGap {
    startTime: number;
    endTime: number;
    duration: number;
    afterClipIndex: number;
}

function detectGaps(clips: TimelineClip[]): TimelineGap[] {
    // For now, clips are sequential without gaps in our current model
    // This function prepares for future drag-and-drop where gaps can occur
    // In the current implementation, clips are back-to-back
    // We'll use this when we add clip repositioning
    return [];
}

/**
 * Magnetic snap threshold in pixels
 */
const SNAP_THRESHOLD = 10;

// =============================================================================
// TIME RULER COMPONENT
// =============================================================================

interface TimeRulerProps {
    totalDuration: number;
    zoom: number;
    scrollLeft: number;
    fps: number;
    currentTime: number;
    onClick: (time: number) => void;
}

function TimeRuler({ totalDuration, zoom, scrollLeft, fps, currentTime, onClick }: TimeRulerProps) {
    const rulerRef = useRef<HTMLDivElement>(null);

    // Calculate tick interval based on zoom
    const getTickInterval = useCallback(() => {
        if (zoom >= 100) return 1;      // 1 second ticks
        if (zoom >= 50) return 2;       // 2 second ticks
        if (zoom >= 25) return 5;       // 5 second ticks
        return 10;                       // 10 second ticks
    }, [zoom]);

    const tickInterval = getTickInterval();
    const totalWidth = totalDuration * zoom;
    const ticks: number[] = [];

    for (let t = 0; t <= totalDuration; t += tickInterval) {
        ticks.push(t);
    }

    const handleClick = (e: React.MouseEvent) => {
        const rect = rulerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left + scrollLeft;
        const time = x / zoom;
        // Round to nearest millisecond for precision scrubbing
        const preciseTime = Math.round(time * 1000) / 1000;
        onClick(Math.max(0, Math.min(preciseTime, totalDuration)));
    };

    return (
        <div
            ref={rulerRef}
            className="relative h-6 bg-zinc-900 border-b border-white/10 cursor-pointer select-none"
            onClick={handleClick}
            style={{ width: Math.max(totalWidth, 100) }}
        >
            {ticks.map((time) => (
                <div
                    key={time}
                    className="absolute top-0 h-full flex flex-col items-center"
                    style={{ left: time * zoom }}
                >
                    <div className="w-px h-2 bg-white/30" />
                    <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                        {formatTimecode(time, fps)}
                    </span>
                </div>
            ))}

            {/* Sub-ticks for higher zoom levels */}
            {zoom >= 50 &&
                ticks.slice(0, -1).map((time) => {
                    const subTicks = [];
                    const subInterval = tickInterval / 4;
                    for (let i = 1; i < 4; i++) {
                        const subTime = time + i * subInterval;
                        if (subTime < totalDuration) {
                            subTicks.push(
                                <div
                                    key={subTime}
                                    className="absolute top-0 w-px h-1.5 bg-white/15"
                                    style={{ left: subTime * zoom }}
                                />
                            );
                        }
                    }
                    return subTicks;
                })}

            {/* Current time indicator on ruler */}
            <div
                className="absolute top-0 h-full pointer-events-none"
                style={{ left: currentTime * zoom }}
            >
                <div className="w-0.5 h-full bg-cyan-400" />
            </div>
        </div>
    );
}

// =============================================================================
// PLAYHEAD COMPONENT
// =============================================================================

interface PlayheadProps {
    currentTime: number;
    zoom: number;
    height: number;
    onDrag: (time: number) => void;
    clipEdgeTimes?: number[]; // Array of clip start/end times for magnetic snapping
}

function Playhead({ currentTime, zoom, height, onDrag, clipEdgeTimes = [] }: PlayheadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isSnapped, setIsSnapped] = useState(false);
    const lastDragX = useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        lastDragX.current = e.clientX;
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const timeline = document.getElementById('nle-timeline-tracks');
            if (!timeline) return;
            const rect = timeline.getBoundingClientRect();
            const x = e.clientX - rect.left + timeline.scrollLeft;
            // Calculate time with sub-pixel precision for millisecond accuracy
            let time = x / zoom;

            // Magnetic snapping: Check if we're within threshold of any clip edge
            let snappedTime: number | null = null;
            for (const edgeTime of clipEdgeTimes) {
                const edgeX = edgeTime * zoom;
                const distance = Math.abs(x - edgeX);
                if (distance <= SNAP_THRESHOLD) {
                    snappedTime = edgeTime;
                    break;
                }
            }

            if (snappedTime !== null) {
                time = snappedTime;
                setIsSnapped(true);
            } else {
                setIsSnapped(false);
            }

            // Round to nearest millisecond (0.001 seconds)
            const preciseTime = Math.round(time * 1000) / 1000;
            onDrag(Math.max(0, preciseTime));
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsSnapped(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, zoom, onDrag, clipEdgeTimes]);

    return (
        <div
            className="absolute top-0 z-50 pointer-events-none"
            style={{ left: currentTime * zoom, height }}
        >
            {/* Snap indicator line (purple) - shown when magnetically snapped */}
            {isSnapped && (
                <div className="absolute -left-px w-1 h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
            )}
            {/* Playhead line with cyan glow */}
            <div
                className={clsx(
                    'w-0.5 h-full transition-all',
                    isSnapped
                        ? 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                        : isDragging
                            ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                            : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                )}
            />
            {/* Playhead handle */}
            <div
                className={clsx(
                    'absolute -top-1 -left-2 w-4 h-4 cursor-ew-resize pointer-events-auto',
                    'flex items-center justify-center'
                )}
                onMouseDown={handleMouseDown}
            >
                <div
                    className={clsx(
                        'w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]',
                        'border-l-transparent border-r-transparent transition-colors',
                        isSnapped
                            ? 'border-t-purple-400'
                            : isDragging
                                ? 'border-t-cyan-300'
                                : 'border-t-cyan-400'
                    )}
                />
            </div>
            {/* Snap label */}
            {isSnapped && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-purple-500 text-[9px] font-medium text-white whitespace-nowrap">
                    SNAP
                </div>
            )}
        </div>
    );
}

// =============================================================================
// AUDIO CLIP COMPONENT (L-Cut Support)
// =============================================================================

interface AudioClipComponentProps {
    clip: TimelineClip;
    index: number;
    zoom: number;
    videoStartTime: number;  // When video starts on timeline
    videoEffectiveDuration: number;  // Video's trimmed duration
    isSelected: boolean;
    onSelect: () => void;
    onAudioTrimStart?: (delta: number) => void;
    onAudioTrimEnd?: (delta: number) => void;
    onGainChange?: (gain: number) => void;
}

function AudioClipComponent({
    clip,
    index,
    zoom,
    videoStartTime,
    videoEffectiveDuration,
    isSelected,
    onSelect,
    onAudioTrimStart,
    onAudioTrimEnd,
    onGainChange,
}: AudioClipComponentProps) {
    const [isDraggingTrimStart, setIsDraggingTrimStart] = useState(false);
    const [isDraggingTrimEnd, setIsDraggingTrimEnd] = useState(false);
    const [showGainSlider, setShowGainSlider] = useState(false);

    // Audio uses its own trim values, falling back to video trims if not set
    const audioTrimStart = clip.audioTrimStart ?? clip.trimStart;
    const audioTrimEnd = clip.audioTrimEnd ?? clip.trimEnd;
    const audioDuration = clip.audioDuration ?? clip.duration;
    const audioGain = clip.audioGain ?? 1;
    const avLinked = clip.avLinked !== false; // Default to linked

    // Calculate audio effective duration
    const audioEffectiveDuration = audioDuration - audioTrimStart - audioTrimEnd;

    // Calculate audio position relative to video
    // Positive offset = audio starts AFTER video (L-cut: audio lags)
    // Negative offset = audio starts BEFORE video (J-cut: audio leads)
    const audioOffset = audioTrimStart - clip.trimStart;

    // Position audio clip on timeline
    const audioLeft = (videoStartTime + audioOffset) * zoom;
    const audioWidth = audioEffectiveDuration * zoom;

    // Trim handle drag logic
    useEffect(() => {
        if (!isDraggingTrimStart && !isDraggingTrimEnd) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.movementX / zoom;
            if (isDraggingTrimStart && onAudioTrimStart) {
                onAudioTrimStart(delta);
            }
            if (isDraggingTrimEnd && onAudioTrimEnd) {
                onAudioTrimEnd(delta);
            }
        };

        const handleMouseUp = () => {
            setIsDraggingTrimStart(false);
            setIsDraggingTrimEnd(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingTrimStart, isDraggingTrimEnd, zoom, onAudioTrimStart, onAudioTrimEnd]);

    // Check if audio extends beyond video (L-cut visualization)
    const hasLCut = audioOffset !== 0 || Math.abs(audioEffectiveDuration - videoEffectiveDuration) > 0.01;

    return (
        <div
            className={clsx(
                'absolute top-1 bottom-1 rounded border transition-all cursor-pointer',
                'bg-purple-500/20',
                isSelected
                    ? 'border-purple-400 ring-1 ring-purple-400/50'
                    : hasLCut
                        ? 'border-purple-500/50 border-dashed'
                        : 'border-purple-500/30',
            )}
            style={{ left: Math.max(0, audioLeft), width: Math.max(audioWidth, 4) }}
            onClick={onSelect}
            onDoubleClick={() => setShowGainSlider(!showGainSlider)}
        >
            {/* L-Cut indicator: Shows offset badge when audio/video aren't aligned */}
            {hasLCut && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className={clsx(
                        'px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap',
                        audioOffset > 0
                            ? 'bg-amber-500/80 text-white'  // L-cut: audio lags
                            : audioOffset < 0
                                ? 'bg-blue-500/80 text-white'   // J-cut: audio leads
                                : 'bg-purple-500/80 text-white' // Duration mismatch
                    )}>
                        {audioOffset > 0 ? `L +${audioOffset.toFixed(1)}s` :
                         audioOffset < 0 ? `J ${audioOffset.toFixed(1)}s` :
                         '⧖'}
                    </div>
                </div>
            )}

            {/* Gain indicator */}
            {audioGain !== 1 && (
                <div className="absolute top-0.5 right-1 text-[9px] font-mono text-purple-300">
                    {audioGain > 1 ? '+' : ''}{((audioGain - 1) * 100).toFixed(0)}%
                </div>
            )}

            {/* Gain slider (shown on double-click) */}
            {showGainSlider && (
                <div
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-20 px-2 py-1 rounded bg-zinc-800 border border-purple-500/30 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Volume2 className="h-3 w-3 text-purple-400" />
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={audioGain}
                        onChange={(e) => onGainChange?.(parseFloat(e.target.value))}
                        className="w-16 h-1 accent-purple-400"
                    />
                    <span className="text-[9px] text-gray-400 w-6">{(audioGain * 100).toFixed(0)}%</span>
                </div>
            )}

            {/* Left Trim Handle (Audio) - Purple themed */}
            <div
                className={clsx(
                    'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize group',
                    'hover:bg-purple-400/30 transition-colors',
                    isDraggingTrimStart && 'bg-purple-400/40'
                )}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingTrimStart(true);
                }}
            >
                <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-purple-400/50 group-hover:bg-purple-400 transition-colors" />
            </div>

            {/* Right Trim Handle (Audio) - Purple themed */}
            <div
                className={clsx(
                    'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group',
                    'hover:bg-purple-400/30 transition-colors',
                    isDraggingTrimEnd && 'bg-purple-400/40'
                )}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingTrimEnd(true);
                }}
            >
                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-purple-400/50 group-hover:bg-purple-400 transition-colors" />
            </div>

            {/* Link/Unlink indicator */}
            <div className="absolute bottom-0.5 left-1 opacity-50">
                {avLinked ? (
                    <Link2 className="h-2.5 w-2.5 text-purple-300" />
                ) : (
                    <Unlink className="h-2.5 w-2.5 text-amber-400" />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// TIMELINE CLIP COMPONENT
// =============================================================================

interface TimelineClipComponentProps {
    clip: TimelineClip;
    index: number;
    zoom: number;
    startTime: number;
    isSelected: boolean;
    onSelect: () => void;
    onTrimStart?: (delta: number) => void;
    onTrimEnd?: (delta: number) => void;
}

function TimelineClipComponent({
    clip,
    index,
    zoom,
    startTime,
    isSelected,
    onSelect,
    onTrimStart,
    onTrimEnd,
}: TimelineClipComponentProps) {
    const effectiveDuration = getEffectiveDuration(clip);
    const width = effectiveDuration * zoom;
    const left = startTime * zoom;

    const [isDraggingTrimStart, setIsDraggingTrimStart] = useState(false);
    const [isDraggingTrimEnd, setIsDraggingTrimEnd] = useState(false);

    // Trim handle drag logic
    useEffect(() => {
        if (!isDraggingTrimStart && !isDraggingTrimEnd) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.movementX / zoom;
            if (isDraggingTrimStart && onTrimStart) {
                onTrimStart(delta);
            }
            if (isDraggingTrimEnd && onTrimEnd) {
                onTrimEnd(delta);
            }
        };

        const handleMouseUp = () => {
            setIsDraggingTrimStart(false);
            setIsDraggingTrimEnd(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingTrimStart, isDraggingTrimEnd, zoom, onTrimStart, onTrimEnd]);

    const getStatusColor = () => {
        switch (clip.status) {
            case 'complete':
                return 'border-green-500/50 bg-green-500/10';
            case 'generating':
                return 'border-amber-500/50 bg-amber-500/10';
            case 'failed':
                return 'border-red-500/50 bg-red-500/10';
            default:
                return 'border-white/20 bg-white/5';
        }
    };

    return (
        <div
            className={clsx(
                'absolute top-1 bottom-1 rounded border transition-all cursor-pointer',
                getStatusColor(),
                isSelected && 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-zinc-900 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
            )}
            style={{ left, width: Math.max(width, 4) }}
            onClick={onSelect}
        >
            {/* Thumbnail / Content */}
            <div className="absolute inset-0 overflow-hidden rounded-[3px]">
                {clip.thumbnailUrl || clip.firstFrameUrl ? (
                    <img
                        src={clip.thumbnailUrl || (clip.firstFrameUrl?.startsWith('http') ? clip.firstFrameUrl : `${BACKEND_URL}${clip.firstFrameUrl}`)}
                        alt={`Shot ${index + 1}`}
                        className="h-full w-full object-cover opacity-70"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20" />
                )}

                {/* Clip label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-0.5">
                    <span className="text-[10px] font-medium text-white/90 truncate block">
                        Shot {index + 1}
                    </span>
                </div>

                {/* Trim indicators */}
                {clip.trimStart > 0 && (
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-yellow-500/50" />
                )}
                {clip.trimEnd > 0 && (
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-yellow-500/50" />
                )}
            </div>

            {/* Left Trim Handle */}
            <div
                className={clsx(
                    'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize group',
                    'hover:bg-cyan-400/20 transition-colors',
                    isDraggingTrimStart && 'bg-cyan-400/30'
                )}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingTrimStart(true);
                }}
            >
                <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-white/30 group-hover:bg-cyan-400 transition-colors" />
            </div>

            {/* Right Trim Handle */}
            <div
                className={clsx(
                    'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize group',
                    'hover:bg-cyan-400/20 transition-colors',
                    isDraggingTrimEnd && 'bg-cyan-400/30'
                )}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingTrimEnd(true);
                }}
            >
                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full bg-white/30 group-hover:bg-cyan-400 transition-colors" />
            </div>
        </div>
    );
}

// =============================================================================
// TRANSPORT CONTROLS
// =============================================================================

interface TransportControlsProps {
    isPlaying: boolean;
    currentTime: number;
    totalDuration: number;
    fps: number;
    onPlay: () => void;
    onPause: () => void;
    onSeek: (time: number) => void;
    onSkipBack: () => void;
    onSkipForward: () => void;
    onFrameBack: () => void;
    onFrameForward: () => void;
}

function TransportControls({
    isPlaying,
    currentTime,
    totalDuration,
    fps,
    onPlay,
    onPause,
    onSeek,
    onSkipBack,
    onSkipForward,
    onFrameBack,
    onFrameForward,
}: TransportControlsProps) {
    const [showMilliseconds, setShowMilliseconds] = useState(true);

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-white/10">
            {/* Playback controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={onSkipBack}
                    className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Skip to start (Home)"
                >
                    <SkipBack className="h-4 w-4" />
                </button>

                {/* Frame backward button */}
                <button
                    onClick={onFrameBack}
                    className="p-1.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                    title="Previous frame (←)"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 4v16M10 12l8-6v12l-8-6z" />
                    </svg>
                </button>

                <button
                    onClick={isPlaying ? onPause : onPlay}
                    className={clsx(
                        'p-2 rounded transition-all',
                        isPlaying
                            ? 'text-cyan-400 bg-cyan-400/20 hover:bg-cyan-400/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                    )}
                    title={isPlaying ? 'Pause (K)' : 'Play (L)'}
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                {/* Frame forward button */}
                <button
                    onClick={onFrameForward}
                    className="p-1.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                    title="Next frame (→)"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 4v16M6 6l8 6-8 6V6z" />
                    </svg>
                </button>

                <button
                    onClick={onSkipForward}
                    className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Skip to end (End)"
                >
                    <SkipForward className="h-4 w-4" />
                </button>
            </div>

            {/* Timecode display - click to toggle frames/milliseconds */}
            <button
                onClick={() => setShowMilliseconds(!showMilliseconds)}
                className="flex items-center gap-2 px-3 py-1 rounded bg-black/50 border border-white/10 hover:border-cyan-400/30 transition-colors cursor-pointer"
                title="Click to toggle frames/milliseconds"
            >
                <span className="text-xs font-mono text-cyan-400">
                    {showMilliseconds
                        ? formatTimecodeWithMs(currentTime)
                        : formatTimecode(currentTime, fps)}
                </span>
                <span className="text-xs text-gray-600">/</span>
                <span className="text-xs font-mono text-gray-500">
                    {showMilliseconds
                        ? formatTimecodeWithMs(totalDuration)
                        : formatTimecode(totalDuration, fps)}
                </span>
            </button>

            {/* Frame indicator */}
            <div className="px-2 py-1 rounded bg-black/30 border border-white/5">
                <span className="text-[10px] font-mono text-gray-500">
                    F{Math.floor(currentTime * fps)}
                </span>
            </div>

            {/* Keyboard hints */}
            <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-600">
                <span><kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">←</kbd><kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">→</kbd> Frame</span>
                <span><kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">J</kbd> Rev</span>
                <span><kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">K</kbd> Stop</span>
                <span><kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500">L</kbd> Play</span>
            </div>
        </div>
    );
}

// =============================================================================
// MAIN NLE TIMELINE COMPONENT
// =============================================================================

export const NLETimeline = forwardRef<NLETimelineRef, NLETimelineProps>(
    (
        {
            projectId,
            sceneChainId,
            clips,
            fps = FPS,
            onClipUpdate,
            onClipRemove,
            onClipReorder,
            onPlaybackChange,
            onClipSelect,
            onAudioTrimUpdate,
            onAudioGainChange,
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(true);
        const [currentTime, setCurrentTime] = useState(0);
        const [isPlaying, setIsPlaying] = useState(false);
        const [playbackDirection, setPlaybackDirection] = useState<-1 | 0 | 1>(0);
        const [zoom, setZoom] = useState(DEFAULT_ZOOM);
        const [scrollLeft, setScrollLeft] = useState(0);
        const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

        const timelineRef = useRef<HTMLDivElement>(null);
        const tracksContainerRef = useRef<HTMLDivElement>(null);
        const playbackIntervalRef = useRef<number | null>(null);
        const videoRef = useRef<HTMLVideoElement>(null);

        // Calculate total duration
        const totalDuration = useMemo(() => getTotalDuration(clips), [clips]);

        // Calculate clip edge times for magnetic snapping
        const clipEdgeTimes = useMemo(() => {
            const edges: number[] = [0]; // Always include timeline start
            let accumulatedTime = 0;
            for (const clip of clips) {
                const effectiveDuration = getEffectiveDuration(clip);
                accumulatedTime += effectiveDuration;
                edges.push(accumulatedTime);
            }
            return edges;
        }, [clips]);

        // Playback loop
        useEffect(() => {
            if (playbackDirection === 0) {
                if (playbackIntervalRef.current) {
                    clearInterval(playbackIntervalRef.current);
                    playbackIntervalRef.current = null;
                }
                setIsPlaying(false);
                return;
            }

            setIsPlaying(true);
            const frameTime = 1 / fps;

            playbackIntervalRef.current = window.setInterval(() => {
                setCurrentTime((prev) => {
                    const next = prev + frameTime * playbackDirection;
                    if (next >= totalDuration) {
                        setPlaybackDirection(0);
                        return totalDuration;
                    }
                    if (next <= 0) {
                        setPlaybackDirection(0);
                        return 0;
                    }
                    return next;
                });
            }, 1000 / fps);

            return () => {
                if (playbackIntervalRef.current) {
                    clearInterval(playbackIntervalRef.current);
                }
            };
        }, [playbackDirection, fps, totalDuration]);

        // Store callback in a ref to avoid re-running effect when callback reference changes
        const onPlaybackChangeRef = useRef(onPlaybackChange);
        useEffect(() => {
            onPlaybackChangeRef.current = onPlaybackChange;
        }, [onPlaybackChange]);

        // Sync video element with playhead
        useEffect(() => {
            if (!videoRef.current) return;

            // Find which clip is at currentTime
            let accumulatedTime = 0;
            let activeClip: TimelineClip | null = null;
            let clipTime = 0;

            for (const clip of clips) {
                const effectiveDuration = getEffectiveDuration(clip);
                if (currentTime >= accumulatedTime && currentTime < accumulatedTime + effectiveDuration) {
                    activeClip = clip;
                    clipTime = currentTime - accumulatedTime + clip.trimStart;
                    break;
                }
                accumulatedTime += effectiveDuration;
            }

            if (activeClip?.outputUrl && videoRef.current.src !== activeClip.outputUrl) {
                const url = activeClip.outputUrl.startsWith('http')
                    ? activeClip.outputUrl
                    : `${BACKEND_URL}${activeClip.outputUrl}`;
                videoRef.current.src = url;
            }

            if (videoRef.current.src) {
                videoRef.current.currentTime = clipTime;
                if (isPlaying) {
                    videoRef.current.play().catch(() => {});
                } else {
                    videoRef.current.pause();
                }
            }

            onPlaybackChangeRef.current?.(isPlaying, currentTime);
        }, [currentTime, isPlaying, clips]); // Removed onPlaybackChange from deps - using ref instead

        // J-K-L Keyboard handling
        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                // Don't capture if user is typing in an input
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }

                switch (e.key.toLowerCase()) {
                    case 'j':
                        e.preventDefault();
                        setPlaybackDirection((prev) => (prev === -1 ? 0 : -1));
                        break;
                    case 'k':
                        e.preventDefault();
                        setPlaybackDirection(0);
                        break;
                    case 'l':
                        e.preventDefault();
                        setPlaybackDirection((prev) => (prev === 1 ? 0 : 1));
                        break;
                    case ' ':
                        e.preventDefault();
                        setPlaybackDirection((prev) => (prev === 0 ? 1 : 0));
                        break;
                    case 'home':
                        e.preventDefault();
                        setCurrentTime(0);
                        break;
                    case 'end':
                        e.preventDefault();
                        setCurrentTime(totalDuration);
                        break;
                    case 'arrowleft':
                        e.preventDefault();
                        setCurrentTime((prev) => Math.max(0, prev - 1 / fps));
                        break;
                    case 'arrowright':
                        e.preventDefault();
                        setCurrentTime((prev) => Math.min(totalDuration, prev + 1 / fps));
                        break;
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [fps, totalDuration]);

        // Handle scroll sync
        const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
            setScrollLeft(e.currentTarget.scrollLeft);
        }, []);

        // Handle zoom
        const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.5, MAX_ZOOM));
        const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.5, MIN_ZOOM));

        // Handle trim updates
        const handleTrimStart = useCallback(
            (clipId: string, delta: number) => {
                const clip = clips.find((c) => c.id === clipId);
                if (!clip || !onClipUpdate) return;

                const newTrimStart = Math.max(0, Math.min(clip.trimStart + delta, clip.duration - clip.trimEnd - 0.1));
                onClipUpdate(clipId, { trimStart: newTrimStart });
            },
            [clips, onClipUpdate]
        );

        const handleTrimEnd = useCallback(
            (clipId: string, delta: number) => {
                const clip = clips.find((c) => c.id === clipId);
                if (!clip || !onClipUpdate) return;

                const newTrimEnd = Math.max(0, Math.min(clip.trimEnd - delta, clip.duration - clip.trimStart - 0.1));
                onClipUpdate(clipId, { trimEnd: newTrimEnd });
            },
            [clips, onClipUpdate]
        );

        // Handle AUDIO trim updates (L-Cut support)
        const handleAudioTrimStart = useCallback(
            (clipId: string, delta: number) => {
                const clip = clips.find((c) => c.id === clipId);
                if (!clip) return;

                const audioDuration = clip.audioDuration ?? clip.duration;
                const currentTrimStart = clip.audioTrimStart ?? clip.trimStart;
                const currentTrimEnd = clip.audioTrimEnd ?? clip.trimEnd;

                const newAudioTrimStart = Math.max(0, Math.min(currentTrimStart + delta, audioDuration - currentTrimEnd - 0.1));

                if (onAudioTrimUpdate) {
                    onAudioTrimUpdate(clipId, newAudioTrimStart, currentTrimEnd);
                } else if (onClipUpdate) {
                    onClipUpdate(clipId, { audioTrimStart: newAudioTrimStart });
                }
            },
            [clips, onAudioTrimUpdate, onClipUpdate]
        );

        const handleAudioTrimEnd = useCallback(
            (clipId: string, delta: number) => {
                const clip = clips.find((c) => c.id === clipId);
                if (!clip) return;

                const audioDuration = clip.audioDuration ?? clip.duration;
                const currentTrimStart = clip.audioTrimStart ?? clip.trimStart;
                const currentTrimEnd = clip.audioTrimEnd ?? clip.trimEnd;

                const newAudioTrimEnd = Math.max(0, Math.min(currentTrimEnd - delta, audioDuration - currentTrimStart - 0.1));

                if (onAudioTrimUpdate) {
                    onAudioTrimUpdate(clipId, currentTrimStart, newAudioTrimEnd);
                } else if (onClipUpdate) {
                    onClipUpdate(clipId, { audioTrimEnd: newAudioTrimEnd });
                }
            },
            [clips, onAudioTrimUpdate, onClipUpdate]
        );

        const handleAudioGainChange = useCallback(
            (clipId: string, gain: number) => {
                if (onAudioGainChange) {
                    onAudioGainChange(clipId, gain);
                } else if (onClipUpdate) {
                    onClipUpdate(clipId, { audioGain: gain });
                }
            },
            [onAudioGainChange, onClipUpdate]
        );

        // Expose ref methods
        useImperativeHandle(ref, () => ({
            seek: (time: number) => setCurrentTime(Math.max(0, Math.min(time, totalDuration))),
            play: () => setPlaybackDirection(1),
            pause: () => setPlaybackDirection(0),
            getCurrentTime: () => currentTime,
            refreshClips: () => {}, // Clips come from props
        }));

        const trackHeight = 60;

        return (
            <div
                ref={timelineRef}
                className="flex h-full flex-col border-b border-white/10 bg-[#0a0a0a]"
            >
                {/* Hidden video element for preview sync */}
                <video ref={videoRef} className="hidden" muted playsInline />

                {/* Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex w-full items-center justify-between px-8 py-3 transition-colors hover:bg-white/5"
                >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <Film className="h-4 w-4 text-cyan-400" />
                        <span>NLE Timeline</span>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{clips.length} Clips</span>
                        <span>{formatTimecode(totalDuration, fps)}</span>
                    </div>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-1 flex-col overflow-hidden"
                        >
                            {/* Zoom controls */}
                            <div className="flex items-center justify-between border-b border-white/5 px-8 py-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleZoomOut}
                                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <div className="w-24 h-1 rounded-full bg-white/10 relative">
                                        <div
                                            className="absolute h-full rounded-full bg-cyan-400/50"
                                            style={{ width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleZoomIn}
                                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                    <span className="text-[10px] text-gray-600 ml-2">{Math.round(zoom)}px/s</span>
                                </div>

                                <button
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Fit Timeline"
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    Fit
                                </button>
                            </div>

                            {/* Timeline content */}
                            <div className="relative flex-1 flex flex-col">
                                {/* Time Ruler (sticky header) */}
                                <div
                                    className="sticky top-0 z-30 overflow-hidden bg-zinc-900"
                                    style={{ marginLeft: scrollLeft > 0 ? -scrollLeft : 0 }}
                                >
                                    <TimeRuler
                                        totalDuration={totalDuration}
                                        zoom={zoom}
                                        scrollLeft={scrollLeft}
                                        fps={fps}
                                        currentTime={currentTime}
                                        onClick={(time) => setCurrentTime(time)}
                                    />
                                </div>

                                {/* Tracks container */}
                                <div
                                    id="nle-timeline-tracks"
                                    ref={tracksContainerRef}
                                    className="relative flex-1 flex flex-col overflow-x-auto overflow-y-hidden"
                                    onScroll={handleScroll}
                                >
                                    {/* Video Track - takes 60% of available height */}
                                    <div
                                        className="relative bg-zinc-950/50 flex-[3]"
                                        style={{
                                            minHeight: trackHeight,
                                            width: Math.max(totalDuration * zoom, 100),
                                        }}
                                    >
                                        {/* Track label */}
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/10">
                                                <Film className="h-3 w-3 text-blue-400" />
                                                <span className="text-[10px] font-medium text-gray-400">V1</span>
                                            </div>
                                        </div>

                                        {/* Clips */}
                                        {clips.map((clip, index) => (
                                            <TimelineClipComponent
                                                key={clip.id}
                                                clip={clip}
                                                index={index}
                                                zoom={zoom}
                                                startTime={getClipStartTime(clips, index)}
                                                isSelected={selectedClipId === clip.id}
                                                onSelect={() => {
                                                    setSelectedClipId(clip.id);
                                                    onClipSelect?.(clip.id);
                                                }}
                                                onTrimStart={(delta) => handleTrimStart(clip.id, delta)}
                                                onTrimEnd={(delta) => handleTrimEnd(clip.id, delta)}
                                            />
                                        ))}

                                        {/* Playhead */}
                                        <Playhead
                                            currentTime={currentTime}
                                            zoom={zoom}
                                            height={trackHeight}
                                            onDrag={setCurrentTime}
                                            clipEdgeTimes={clipEdgeTimes}
                                        />
                                    </div>

                                    {/* Audio Track (A1) with Waveforms - takes 40% of available height */}
                                    <div
                                        className="relative bg-zinc-900/80 border-t border-white/5 flex-[2]"
                                        style={{
                                            minHeight: 40,
                                            width: Math.max(totalDuration * zoom, 100),
                                        }}
                                    >
                                        {/* Track label */}
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 backdrop-blur-sm border border-white/10">
                                                <Music className="h-3 w-3 text-purple-400" />
                                                <span className="text-[10px] font-medium text-gray-400">A1</span>
                                            </div>
                                        </div>

                                        {/* Audio Clips with L-Cut trim handles */}
                                        {clips.map((clip, index) => {
                                            const clipStartTime = getClipStartTime(clips, index);
                                            const videoEffectiveDuration = getEffectiveDuration(clip);

                                            // Audio-specific calculations for L-Cut positioning
                                            const audioTrimStart = clip.audioTrimStart ?? clip.trimStart;
                                            const audioTrimEnd = clip.audioTrimEnd ?? clip.trimEnd;
                                            const audioDuration = clip.audioDuration ?? clip.duration;
                                            const audioEffectiveDuration = audioDuration - audioTrimStart - audioTrimEnd;
                                            const audioOffset = audioTrimStart - clip.trimStart;
                                            const audioClipWidth = audioEffectiveDuration * zoom;
                                            const audioClipLeft = (clipStartTime + audioOffset) * zoom;

                                            // Calculate playhead time relative to this clip's audio
                                            const audioStartOnTimeline = clipStartTime + audioOffset;
                                            const clipPlayheadTime = currentTime >= audioStartOnTimeline && currentTime < audioStartOnTimeline + audioEffectiveDuration
                                                ? currentTime - audioStartOnTimeline
                                                : undefined;

                                            return (
                                                <div key={clip.id} className="absolute inset-0">
                                                    {/* AudioClipComponent with trim handles */}
                                                    <AudioClipComponent
                                                        clip={clip}
                                                        index={index}
                                                        zoom={zoom}
                                                        videoStartTime={clipStartTime}
                                                        videoEffectiveDuration={videoEffectiveDuration}
                                                        isSelected={selectedClipId === clip.id}
                                                        onSelect={() => {
                                                            setSelectedClipId(clip.id);
                                                            onClipSelect?.(clip.id);
                                                        }}
                                                        onAudioTrimStart={(delta) => handleAudioTrimStart(clip.id, delta)}
                                                        onAudioTrimEnd={(delta) => handleAudioTrimEnd(clip.id, delta)}
                                                        onGainChange={(gain) => handleAudioGainChange(clip.id, gain)}
                                                    />

                                                    {/* Waveform overlay inside the audio clip bounds */}
                                                    <div
                                                        className="absolute top-1 bottom-1 pointer-events-none"
                                                        style={{ left: Math.max(0, audioClipLeft), width: Math.max(audioClipWidth, 4) }}
                                                    >
                                                        <TimelineAudioWaveform
                                                            clipId={clip.id}
                                                            duration={audioDuration}
                                                            trimStart={audioTrimStart}
                                                            trimEnd={audioTrimEnd}
                                                            width={Math.max(audioClipWidth, 4)}
                                                            height={38}
                                                            playheadTime={clipPlayheadTime}
                                                            isPlaying={isPlaying && clipPlayheadTime !== undefined}
                                                            isMuted={false}
                                                            audioUrl={clip.audioUrl}
                                                            onClick={(clipLocalTime) => {
                                                                // Seek to this position in the timeline
                                                                const timelineTime = audioStartOnTimeline + clipLocalTime;
                                                                setCurrentTime(Math.max(0, Math.min(timelineTime, totalDuration)));
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Playhead on audio track */}
                                        <div
                                            className="absolute top-0 w-0.5 h-full bg-cyan-400/50 pointer-events-none z-10"
                                            style={{ left: currentTime * zoom }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Transport Controls */}
                            <TransportControls
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                                totalDuration={totalDuration}
                                fps={fps}
                                onPlay={() => setPlaybackDirection(1)}
                                onPause={() => setPlaybackDirection(0)}
                                onSeek={setCurrentTime}
                                onSkipBack={() => setCurrentTime(0)}
                                onSkipForward={() => setCurrentTime(totalDuration)}
                                onFrameBack={() => setCurrentTime((prev) => Math.max(0, prev - 1 / fps))}
                                onFrameForward={() => setCurrentTime((prev) => Math.min(totalDuration, prev + 1 / fps))}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

NLETimeline.displayName = 'NLETimeline';

export default NLETimeline;

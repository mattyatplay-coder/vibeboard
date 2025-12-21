import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';

export interface Frame {
    url: string;
    timestamp: number;
    index: number;
    _cacheKey?: number; // For cache busting after edits
}

interface FrameTimelineProps {
    frames: Frame[];
    currentFrameIndex: number;
    onFrameSelect: (index: number) => void;
    fps: number;
    isPlaying?: boolean;
    onPlayPause?: () => void;
    editedFrames?: Set<number>;  // Indices of frames that have been edited
    maskedFrames?: Set<number>;  // Indices of frames that have masks painted
}

export function FrameTimeline({
    frames,
    currentFrameIndex,
    onFrameSelect,
    fps,
    isPlaying = false,
    onPlayPause,
    editedFrames = new Set(),
    maskedFrames = new Set()
}: FrameTimelineProps) {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
    const [thumbnailsLoaded, setThumbnailsLoaded] = useState<Set<number>>(new Set());
    const frameWidth = 60;
    const frameHeight = 40;

    // Auto-scroll to keep current frame visible
    useEffect(() => {
        if (timelineRef.current) {
            const container = timelineRef.current;
            const frameElement = container.children[currentFrameIndex] as HTMLElement;
            if (frameElement) {
                const containerRect = container.getBoundingClientRect();
                const frameRect = frameElement.getBoundingClientRect();

                if (frameRect.left < containerRect.left || frameRect.right > containerRect.right) {
                    frameElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }
    }, [currentFrameIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (currentFrameIndex > 0) {
                        onFrameSelect(currentFrameIndex - 1);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (currentFrameIndex < frames.length - 1) {
                        onFrameSelect(currentFrameIndex + 1);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    onPlayPause?.();
                    break;
                case 'Home':
                    e.preventDefault();
                    onFrameSelect(0);
                    break;
                case 'End':
                    e.preventDefault();
                    onFrameSelect(frames.length - 1);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentFrameIndex, frames.length, onFrameSelect, onPlayPause]);

    // Virtual scrolling - update visible range on scroll
    const handleScroll = useCallback(() => {
        if (!timelineRef.current) return;
        const scrollLeft = timelineRef.current.scrollLeft;
        const containerWidth = timelineRef.current.clientWidth;

        const start = Math.max(0, Math.floor(scrollLeft / frameWidth) - 5);
        const end = Math.min(frames.length, Math.ceil((scrollLeft + containerWidth) / frameWidth) + 5);

        setVisibleRange({ start, end });
    }, [frames.length]);

    useEffect(() => {
        handleScroll();
    }, [handleScroll]);

    const formatTimecode = (timestamp: number) => {
        const minutes = Math.floor(timestamp / 60);
        const seconds = Math.floor(timestamp % 60);
        const frames = Math.floor((timestamp % 1) * fps);
        return `${minutes}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    const handlePrevFrame = () => {
        if (currentFrameIndex > 0) {
            onFrameSelect(currentFrameIndex - 1);
        }
    };

    const handleNextFrame = () => {
        if (currentFrameIndex < frames.length - 1) {
            onFrameSelect(currentFrameIndex + 1);
        }
    };

    const handleJumpToStart = () => {
        onFrameSelect(0);
    };

    const handleJumpToEnd = () => {
        onFrameSelect(frames.length - 1);
    };

    return (
        <div className="bg-black/60 border-t border-white/10 p-3">
            {/* Playback controls */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleJumpToStart}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Jump to start (Home)"
                    >
                        <SkipBack className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                        onClick={handlePrevFrame}
                        disabled={currentFrameIndex === 0}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
                        title="Previous frame (Left Arrow)"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                        onClick={onPlayPause}
                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
                        title="Play/Pause (Space)"
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                        ) : (
                            <Play className="w-4 h-4 text-white" />
                        )}
                    </button>
                    <button
                        onClick={handleNextFrame}
                        disabled={currentFrameIndex === frames.length - 1}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-30"
                        title="Next frame (Right Arrow)"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                        onClick={handleJumpToEnd}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Jump to end (End)"
                    >
                        <SkipForward className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Timecode display */}
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 font-mono">
                        Frame: {currentFrameIndex + 1} / {frames.length}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                        {formatTimecode(frames[currentFrameIndex]?.timestamp || 0)}
                    </span>
                    <span className="text-xs text-gray-500">
                        {fps} fps
                    </span>
                </div>
            </div>

            {/* Timeline scrubber */}
            <div
                ref={timelineRef}
                className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                onScroll={handleScroll}
                style={{ scrollBehavior: 'smooth' }}
            >
                {frames.map((frame, index) => {
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                    const isSelected = index === currentFrameIndex;
                    const isEdited = editedFrames.has(index);
                    const hasMask = maskedFrames.has(index);

                    return (
                        <div
                            key={frame.index}
                            className={clsx(
                                'flex-shrink-0 cursor-pointer transition-all duration-150 relative',
                                isSelected
                                    ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-black/50 scale-105 z-10'
                                    : hasMask
                                    ? 'ring-1 ring-purple-500/50'
                                    : 'hover:ring-1 hover:ring-white/30'
                            )}
                            style={{ width: frameWidth, height: frameHeight }}
                            onClick={() => onFrameSelect(index)}
                        >
                            {isVisible ? (
                                <>
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${frame.url}${frame._cacheKey ? `?t=${frame._cacheKey}` : ''}`}
                                        alt={`Frame ${index + 1}`}
                                        className="w-full h-full object-cover rounded"
                                        loading="lazy"
                                        onLoad={() => setThumbnailsLoaded(prev => new Set(prev).add(index))}
                                    />
                                    {/* Edited indicator */}
                                    {isEdited && (
                                        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full" title="Edited" />
                                    )}
                                    {/* Masked indicator */}
                                    {hasMask && !isEdited && (
                                        <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-purple-500 rounded-full" title="Has mask" />
                                    )}
                                    {/* Frame number overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center text-gray-400 py-0.5">
                                        {index + 1}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
                                    <span className="text-[8px] text-gray-600">{index + 1}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-600">
                <span><kbd className="bg-white/5 px-1 rounded">Space</kbd> Play/Pause</span>
                <span><kbd className="bg-white/5 px-1 rounded">Left/Right</kbd> Navigate</span>
                <span><kbd className="bg-white/5 px-1 rounded">Home/End</kbd> Jump</span>
            </div>
        </div>
    );
}

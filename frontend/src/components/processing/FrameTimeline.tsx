import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

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
  editedFrames?: Set<number>; // Indices of frames that have been edited
  maskedFrames?: Set<number>; // Indices of frames that have masks painted
}

export function FrameTimeline({
  frames,
  currentFrameIndex,
  onFrameSelect,
  fps,
  isPlaying = false,
  onPlayPause,
  editedFrames = new Set(),
  maskedFrames = new Set(),
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
    <div className="border-t border-white/10 bg-black/60 p-3">
      {/* Playback controls */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip content="Jump to start (Home)" side="top">
            <button
              onClick={handleJumpToStart}
              className="rounded p-1.5 transition-colors hover:bg-white/10"
            >
              <SkipBack className="h-4 w-4 text-gray-400" />
            </button>
          </Tooltip>
          <Tooltip content="Previous frame (Left Arrow)" side="top">
            <button
              onClick={handlePrevFrame}
              disabled={currentFrameIndex === 0}
              className="rounded p-1.5 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </button>
          </Tooltip>
          <Tooltip content="Play/Pause (Space)" side="top">
            <button
              onClick={onPlayPause}
              className="rounded bg-blue-600 p-2 transition-colors hover:bg-blue-500"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
            </button>
          </Tooltip>
          <Tooltip content="Next frame (Right Arrow)" side="top">
            <button
              onClick={handleNextFrame}
              disabled={currentFrameIndex === frames.length - 1}
              className="rounded p-1.5 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          </Tooltip>
          <Tooltip content="Jump to end (End)" side="top">
            <button
              onClick={handleJumpToEnd}
              className="rounded p-1.5 transition-colors hover:bg-white/10"
            >
              <SkipForward className="h-4 w-4 text-gray-400" />
            </button>
          </Tooltip>
        </div>

        {/* Timecode display */}
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-gray-400">
            Frame: {currentFrameIndex + 1} / {frames.length}
          </span>
          <span className="font-mono text-xs text-gray-400">
            {formatTimecode(frames[currentFrameIndex]?.timestamp || 0)}
          </span>
          <span className="text-xs text-gray-500">{fps} fps</span>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div
        ref={timelineRef}
        className="scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex gap-1 overflow-x-auto pb-2"
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
                'relative flex-shrink-0 cursor-pointer transition-all duration-150',
                isSelected
                  ? 'z-10 scale-105 ring-2 ring-blue-500 ring-offset-1 ring-offset-black/50'
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
                    className="h-full w-full rounded object-cover"
                    loading="lazy"
                    onLoad={() => setThumbnailsLoaded(prev => new Set(prev).add(index))}
                  />
                  {/* Edited indicator */}
                  {isEdited && (
                    <Tooltip content="Edited" side="top">
                      <div
                        className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-green-500"
                      />
                    </Tooltip>
                  )}
                  {/* Masked indicator */}
                  {hasMask && !isEdited && (
                    <Tooltip content="Has mask" side="top">
                      <div
                        className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-purple-500"
                      />
                    </Tooltip>
                  )}
                  {/* Frame number overlay */}
                  <div className="absolute right-0 bottom-0 left-0 bg-black/60 py-0.5 text-center text-[8px] text-gray-400">
                    {index + 1}
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded bg-gray-800">
                  <span className="text-[8px] text-gray-600">{index + 1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 flex justify-center gap-4 text-[10px] text-gray-600">
        <span>
          <kbd className="rounded bg-white/5 px-1">Space</kbd> Play/Pause
        </span>
        <span>
          <kbd className="rounded bg-white/5 px-1">Left/Right</kbd> Navigate
        </span>
        <span>
          <kbd className="rounded bg-white/5 px-1">Home/End</kbd> Jump
        </span>
      </div>
    </div>
  );
}

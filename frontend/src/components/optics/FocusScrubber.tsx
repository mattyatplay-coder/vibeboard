'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Play, Pause, RotateCcw, Focus, Loader2 } from 'lucide-react';

interface FocusScrubberProps {
  videoUrl: string;
  onFocusChange?: (focusPercent: number) => void;
  className?: string;
}

/**
 * FocusScrubber - Phase 4A Optics Engine
 *
 * Replaces traditional sliders with video scrubbing to simulate
 * instant physics-based focus shifting. The video is pre-rendered
 * with Learn2Refocus, and scrubbing through it feels like adjusting
 * a real follow-focus ring.
 */
export function FocusScrubber({ videoUrl, onFocusChange, className }: FocusScrubberProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusPercent, setFocusPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [duration, setDuration] = useState(0);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  }, []);

  // Scrub to specific percentage
  const scrubTo = useCallback((percent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    setFocusPercent(clampedPercent);

    if (videoRef.current && duration > 0) {
      const time = (clampedPercent / 100) * duration;
      videoRef.current.currentTime = time;
    }

    onFocusChange?.(clampedPercent);
  }, [duration, onFocusChange]);

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    scrubTo(percent);
  }, [scrubTo]);

  // Handle click on progress bar
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    scrubTo(percent);
  }, [scrubTo]);

  // Handle mouse drag on progress bar
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    scrubTo(percent);
  }, [isDragging, scrubTo]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Reset to beginning
  const reset = useCallback(() => {
    scrubTo(0);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [scrubTo]);

  // Update focus percent as video plays
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && duration > 0 && !isDragging) {
      const percent = (videoRef.current.currentTime / duration) * 100;
      setFocusPercent(percent);
      onFocusChange?.(percent);
    }
  }, [duration, isDragging, onFocusChange]);

  // Handle video ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Video Container */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}

        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-cover"
          preload="auto"
          playsInline
          muted
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {/* Focus Ring Overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-cyan-400/30"
          animate={{
            borderColor: isDragging ? 'rgba(34, 211, 238, 0.6)' : 'rgba(34, 211, 238, 0.3)',
            boxShadow: isDragging
              ? 'inset 0 0 30px rgba(34, 211, 238, 0.2)'
              : 'inset 0 0 0 rgba(34, 211, 238, 0)',
          }}
          transition={{ duration: 0.15 }}
        />
      </div>

      {/* Control Bar */}
      <div className="mt-3 rounded-full border border-white/10 bg-zinc-900/90 p-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!isLoaded}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 transition-colors hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          {/* Focus Label */}
          <div className="flex items-center gap-1.5">
            <Focus className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-400">FOCUS</span>
          </div>

          {/* Progress Bar / Scrubber */}
          <div
            ref={containerRef}
            className="relative flex-1 cursor-pointer"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDragging(true)}
          >
            {/* Background Track */}
            <div className="h-2 rounded-full bg-zinc-700">
              {/* Filled Track */}
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                style={{ width: `${focusPercent}%` }}
              />
            </div>

            {/* Hidden Range Input for Accessibility */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={focusPercent}
              onChange={handleSliderChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={!isLoaded}
            />

            {/* Scrubber Handle */}
            <motion.div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-zinc-900 shadow-lg"
              style={{ left: `${focusPercent}%` }}
              animate={{
                scale: isDragging ? 1.2 : 1,
                boxShadow: isDragging
                  ? '0 0 12px rgba(34, 211, 238, 0.5)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Focus Percentage Display */}
          <span className="min-w-[3rem] text-right font-mono text-sm text-white">
            {focusPercent.toFixed(0)}%
          </span>

          {/* Reset Button */}
          <button
            onClick={reset}
            disabled={!isLoaded}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Depth of Field Indicator */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Near Focus</span>
        <span className="text-cyan-400">|</span>
        <span>Far Focus</span>
      </div>
    </div>
  );
}

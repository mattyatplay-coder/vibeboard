'use client';

/**
 * Timeline Audio Waveform
 *
 * A compact, horizontal waveform visualization for the NLE Timeline's A1 track.
 * Displays audio waveform data for clips, with fallback to synthetic visualization
 * when no actual audio data is available.
 *
 * Features:
 * - Purple gradient matching the A1 track aesthetic
 * - Playhead position indicator
 * - Support for real audio waveform data (when available)
 * - Synthetic waveform generation for clips without audio analysis
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineAudioWaveformProps {
    /** Clip ID for identification */
    clipId: string;
    /** Duration of the clip in seconds */
    duration: number;
    /** Trim start in seconds */
    trimStart: number;
    /** Trim end in seconds */
    trimEnd: number;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
    /** Current playhead time relative to this clip's start (optional) */
    playheadTime?: number;
    /** Whether this clip is currently playing */
    isPlaying?: boolean;
    /** Whether this clip's audio is muted */
    isMuted?: boolean;
    /** Audio URL for potential future waveform analysis */
    audioUrl?: string | null;
    /** Pre-computed waveform peaks (0-1 normalized) */
    waveformData?: number[];
    /** Click handler for seeking within the clip */
    onClick?: (clipLocalTime: number) => void;
    /** Custom class name */
    className?: string;
}

// ============================================================================
// SYNTHETIC WAVEFORM GENERATION
// ============================================================================

/**
 * Generate synthetic waveform peaks for visualization
 * Uses seeded randomness based on clipId for consistency
 */
function generateSyntheticPeaks(clipId: string, count: number): number[] {
    // Simple seeded random based on clipId
    let seed = 0;
    for (let i = 0; i < clipId.length; i++) {
        seed = ((seed << 5) - seed) + clipId.charCodeAt(i);
        seed = seed & seed;
    }

    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
        // LCG random number generator
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const random = (seed % 1000) / 1000;

        // Create natural-looking waveform with peaks and valleys
        const baseAmplitude = 0.3 + random * 0.5;
        const phase = (i / count) * Math.PI * 8;
        const envelope = Math.sin(phase * 0.3 + random * 2) * 0.3 + 0.7;
        peaks.push(Math.min(1, Math.max(0.1, baseAmplitude * envelope)));
    }

    return peaks;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineAudioWaveform({
    clipId,
    duration,
    trimStart,
    trimEnd,
    width,
    height,
    playheadTime,
    isPlaying = false,
    isMuted = false,
    audioUrl,
    waveformData,
    onClick,
    className,
}: TimelineAudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    // Calculate effective duration
    const effectiveDuration = duration - trimStart - trimEnd;

    // Generate or use provided waveform data
    const peaks = useMemo(() => {
        if (waveformData && waveformData.length > 0) {
            return waveformData;
        }
        // Generate synthetic peaks - more peaks for longer clips
        const peakCount = Math.max(20, Math.min(200, Math.floor(width / 3)));
        return generateSyntheticPeaks(clipId, peakCount);
    }, [clipId, width, waveformData]);

    // Draw waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas resolution
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const render = () => {
            const mid = height / 2;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw center line
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, mid);
            ctx.lineTo(width, mid);
            ctx.stroke();

            // Draw waveform bars
            const barWidth = width / peaks.length;
            const maxBarHeight = (height - 4) / 2;

            peaks.forEach((peak, i) => {
                const x = i * barWidth;
                const barHeight = peak * maxBarHeight;

                // Calculate opacity based on muted state
                const baseOpacity = isMuted ? 0.3 : 0.8;

                // Create gradient for each bar
                const gradient = ctx.createLinearGradient(x, mid - barHeight, x, mid + barHeight);
                gradient.addColorStop(0, `rgba(168, 85, 247, ${baseOpacity})`);
                gradient.addColorStop(0.5, `rgba(139, 92, 246, ${baseOpacity})`);
                gradient.addColorStop(1, `rgba(168, 85, 247, ${baseOpacity})`);

                ctx.fillStyle = gradient;

                // Draw upper bar
                ctx.fillRect(x, mid - barHeight, Math.max(1, barWidth - 1), barHeight);
                // Draw lower bar (mirrored)
                ctx.fillRect(x, mid, Math.max(1, barWidth - 1), barHeight);
            });

            // Draw playhead position indicator if within this clip
            if (playheadTime !== undefined && playheadTime >= 0 && playheadTime <= effectiveDuration) {
                const playheadX = (playheadTime / effectiveDuration) * width;

                // Vertical line
                ctx.strokeStyle = isPlaying ? '#22d3ee' : 'rgba(34, 211, 238, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playheadX, 0);
                ctx.lineTo(playheadX, height);
                ctx.stroke();

                // Glow effect when playing
                if (isPlaying) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Continue animation if playing (for subtle movement effect)
            if (isPlaying) {
                animationRef.current = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [peaks, width, height, playheadTime, isPlaying, isMuted, effectiveDuration]);

    // Handle click for seeking
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onClick) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickRatio = x / width;
        const clipLocalTime = trimStart + clickRatio * effectiveDuration;

        onClick(clipLocalTime);
    };

    return (
        <canvas
            ref={canvasRef}
            className={clsx(
                'cursor-pointer',
                isMuted && 'opacity-50',
                className
            )}
            style={{ width, height }}
            onClick={handleClick}
            title={audioUrl ? 'Audio waveform' : 'Synthetic waveform (no audio data)'}
        />
    );
}

export default TimelineAudioWaveform;

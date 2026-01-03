'use client';

/**
 * Acoustic Waveform Visualizer
 *
 * A dynamic canvas-based waveform that visually represents the acoustic
 * characteristics of a shot based on its focal length.
 *
 * Visual Logic:
 * - Wide Lens (14mm): Slow, smooth, "fuzzy" waves = wash of reverb
 * - Telephoto (135mm): Sharp, high-frequency, "jagged" = intimate foley detail
 *
 * The waveform "morphs" based on the lens, teaching users that every shot
 * has a unique "Sonic Signature."
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { AudioWaveform, Mic2, Volume2, Link2 } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================================================
// TYPES
// ============================================================================

export interface AcousticWaveformProps {
  /** Focal length in mm (e.g., 14, 35, 85, 135) */
  focalLength: number;
  /** Whether acoustic settings are synced to lens kit */
  isSyncing: boolean;
  /** Optional genre for color theming */
  genre?: string;
  /** Size variant */
  size?: 'compact' | 'full';
  /** Show controls */
  showControls?: boolean;
  /** Custom class name */
  className?: string;
}

export type AcousticProfile = 'environment' | 'dialogue' | 'intimacy';

// ============================================================================
// ACOUSTIC CALCULATIONS
// ============================================================================

function getAcousticProfile(focalLength: number): AcousticProfile {
  if (focalLength <= 24) return 'environment';
  if (focalLength >= 85) return 'intimacy';
  return 'dialogue';
}

function getAcousticValues(focalLength: number): {
  reverb: number;
  stereoWidth: number;
  foleyDetail: number;
} {
  // Interpolate values based on focal length
  if (focalLength <= 24) {
    return { reverb: 0.85, stereoWidth: 1.0, foleyDetail: 0.2 };
  } else if (focalLength >= 135) {
    return { reverb: 0.05, stereoWidth: 0.1, foleyDetail: 1.0 };
  } else if (focalLength >= 85) {
    const t = (focalLength - 85) / (135 - 85);
    return {
      reverb: 0.15 - t * 0.1,
      stereoWidth: 0.25 - t * 0.15,
      foleyDetail: 0.9 + t * 0.1,
    };
  } else if (focalLength >= 50) {
    const t = (focalLength - 50) / (85 - 50);
    return {
      reverb: 0.45 - t * 0.3,
      stereoWidth: 0.6 - t * 0.35,
      foleyDetail: 0.65 + t * 0.25,
    };
  } else {
    // 24-50mm range
    const t = (focalLength - 24) / (50 - 24);
    return {
      reverb: 0.85 - t * 0.4,
      stereoWidth: 1.0 - t * 0.4,
      foleyDetail: 0.2 + t * 0.45,
    };
  }
}

function getProfileDescription(profile: AcousticProfile): string {
  switch (profile) {
    case 'environment':
      return 'LARGE ENCLOSURE - DIFFUSED';
    case 'dialogue':
      return 'NATURAL ROOM - BALANCED';
    case 'intimacy':
      return 'STUDIO DRY - INTIMATE';
  }
}

function getSonicDescription(focalLength: number, profile: AcousticProfile): string {
  switch (profile) {
    case 'environment':
      return `The ${focalLength}mm lens suggests distant environmental sounds like wind and echoing room tone.`;
    case 'dialogue':
      return `The ${focalLength}mm lens suggests a natural balance of subject and environment.`;
    case 'intimacy':
      return `The ${focalLength}mm lens suggests the intimate sounds of breathing, fabric rustle, and high-frequency textures.`;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AcousticWaveform({
  focalLength,
  isSyncing,
  genre,
  size = 'full',
  showControls = true,
  className,
}: AcousticWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate acoustic state
  const profile = useMemo(() => getAcousticProfile(focalLength), [focalLength]);
  const values = useMemo(() => getAcousticValues(focalLength), [focalLength]);

  const isWide = focalLength <= 24;
  const isTight = focalLength >= 85;

  // Animation loop for waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
      // Get actual canvas dimensions
      const width = canvas.width;
      const height = canvas.height;
      const mid = height / 2;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Set up stroke style based on profile
      ctx.beginPath();
      ctx.lineWidth = isTight ? 1.5 : 2.5;

      // Purple for intimacy (foley detail), Blue for environment (reverb)
      if (isTight) {
        ctx.strokeStyle = '#a855f7'; // Purple
      } else if (isWide) {
        ctx.strokeStyle = '#3b82f6'; // Blue
      } else {
        ctx.strokeStyle = '#06b6d4'; // Cyan for balanced
      }

      // Draw waveform
      for (let x = 0; x < width; x++) {
        let y: number;

        if (isTight) {
          // Telephoto: Sharp, random spikes (foley detail)
          const frequency = 0.15;
          const spike = (Math.random() - 0.5) * 30 * values.foleyDetail;
          const base = Math.sin(x * frequency + offset) * 5;
          y = mid + spike + base;
        } else if (isWide) {
          // Wide: Slow, smooth sine waves (reverb wash)
          const frequency = 0.02;
          const amplitude = 20 * values.reverb;
          y = mid + Math.sin(x * frequency + offset) * amplitude;
          // Add secondary wave for complexity
          y += Math.sin(x * 0.035 + offset * 0.7) * amplitude * 0.5;
        } else {
          // Natural: Balanced waves
          const frequency = 0.05;
          const amplitude = 15;
          y = mid + Math.sin(x * frequency + offset) * amplitude;
          // Add subtle noise
          y += (Math.random() - 0.5) * 5 * values.foleyDetail;
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Add glow effect for wide shots
      if (isWide) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Update offset for animation
      offset += isTight ? 0.15 : 0.03;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [focalLength, isWide, isTight, values]);

  // Compact mode
  if (size === 'compact') {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <div
          className={clsx(
            'flex h-6 w-6 items-center justify-center rounded-lg',
            isTight ? 'bg-purple-500/20' : isWide ? 'bg-blue-500/20' : 'bg-cyan-500/20'
          )}
        >
          <AudioWaveform
            className={clsx(
              'h-3.5 w-3.5',
              isTight ? 'text-purple-400' : isWide ? 'text-blue-400' : 'text-cyan-400'
            )}
          />
        </div>
        <div className="relative h-8 w-24 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <canvas ref={canvasRef} width={96} height={32} className="h-full w-full" />
          {isWide && (
            <div className="pointer-events-none absolute inset-0 bg-blue-500/5 backdrop-blur-[0.5px]" />
          )}
        </div>
        <span className="font-mono text-[10px] text-gray-500">
          {Math.round(values.reverb * 100)}% Rev
        </span>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={clsx(
        'w-full space-y-4 rounded-xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'rounded-lg p-1.5',
              isTight ? 'bg-purple-500/20' : isWide ? 'bg-blue-500/20' : 'bg-cyan-500/20'
            )}
          >
            <AudioWaveform
              className={clsx(
                'h-4 w-4',
                isTight ? 'text-purple-400' : isWide ? 'text-blue-400' : 'text-cyan-400'
              )}
            />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tighter text-zinc-200 uppercase">
              Acoustic Profile
            </h4>
            <p className="font-mono text-[10px] text-zinc-500">{getProfileDescription(profile)}</p>
          </div>
        </div>

        {isSyncing && (
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-zinc-800 px-2 py-0.5">
            <Link2 className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-bold text-cyan-400 uppercase">
              Synced to {focalLength}mm
            </span>
          </div>
        )}
      </div>

      {/* Canvas Waveform */}
      <div className="group relative h-24 overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <canvas ref={canvasRef} width={400} height={96} className="h-full w-full" />
        {/* Blur overlay for wide shots */}
        {isWide && (
          <div className="pointer-events-none absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]" />
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Reverb Wash */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase">
                <Volume2 className="h-3 w-3" /> Reverb Wash
              </label>
              <span className="font-mono text-[10px] text-zinc-400">
                {Math.round(values.reverb * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${values.reverb * 100}%` }}
              />
            </div>
          </div>

          {/* Foley Snap */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 uppercase">
                <Mic2 className="h-3 w-3" /> Foley Snap
              </label>
              <span className="font-mono text-[10px] text-zinc-400">
                {Math.round(values.foleyDetail * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${values.foleyDetail * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sonic Description */}
      <div className="rounded border border-white/5 bg-black/20 p-2">
        <p className="text-[10px] leading-relaxed text-zinc-400 italic">
          "{getSonicDescription(focalLength, profile)}"
        </p>
      </div>
    </div>
  );
}

export default AcousticWaveform;

'use client';

/**
 * AudioWaveform Component
 *
 * Displays a visual waveform for audio clips in the timeline.
 * Uses seeded random generation for consistent "fake" waveforms
 * that look like real audio data based on clip ID.
 */

import React, { useRef, useEffect, useMemo } from 'react';

interface AudioWaveformProps {
  clipId: string;
  width: number;
  height: number;
  color?: string;
  backgroundColor?: string;
}

// Seeded random number generator for consistent waveforms per clip
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return function () {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

export function AudioWaveform({
  clipId,
  width,
  height,
  color = 'rgba(168, 85, 247, 0.7)', // Purple for audio
  backgroundColor = 'transparent',
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate waveform data based on clip ID (memoized for performance)
  const waveformData = useMemo(() => {
    const random = seededRandom(clipId);
    const barCount = Math.max(Math.floor(width / 3), 50); // ~3px per bar
    const data: number[] = [];

    // Generate random amplitudes with some smoothing for natural look
    let prevAmplitude = 0.5;
    for (let i = 0; i < barCount; i++) {
      // Weighted toward previous value for smoothing
      const rawAmplitude = random();
      const smoothedAmplitude = prevAmplitude * 0.3 + rawAmplitude * 0.7;
      data.push(smoothedAmplitude);
      prevAmplitude = smoothedAmplitude;
    }

    return data;
  }, [clipId, width]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform bars
    const barWidth = width / waveformData.length;
    const barGap = 1;
    const actualBarWidth = Math.max(barWidth - barGap, 1);
    const centerY = height / 2;

    ctx.fillStyle = color;

    waveformData.forEach((amplitude, i) => {
      const barHeight = amplitude * (height * 0.8); // 80% of height max
      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      // Draw rounded bar
      const radius = Math.min(actualBarWidth / 2, 2);
      ctx.beginPath();
      ctx.roundRect(x, y, actualBarWidth, barHeight, radius);
      ctx.fill();
    });
  }, [waveformData, width, height, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
}

export default AudioWaveform;

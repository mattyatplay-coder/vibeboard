'use client';

/**
 * WeightedPromptOverlay - Visual overlay for prompt weighting
 *
 * Renders color-coded underlines beneath weighted terms (word:1.5)
 * in the prompt textarea. Syncs position with the textarea scroll.
 *
 * Weight visualization:
 * - 0.5-0.9: Blue (de-emphasized)
 * - 1.0: No underline (neutral)
 * - 1.1-1.3: Green (slightly emphasized)
 * - 1.4-1.6: Yellow (moderately emphasized)
 * - 1.7-2.0: Orange (strongly emphasized)
 * - 2.0+: Red (very strongly emphasized)
 */

import React, { useMemo } from 'react';
import { clsx } from 'clsx';

interface WeightedPromptOverlayProps {
  prompt: string;
  className?: string;
}

interface WeightedSegment {
  text: string;
  weight: number | null;
  isWeighted: boolean;
  start: number;
  end: number;
}

// Parse prompt into segments with weight information
function parseWeightedSegments(prompt: string): WeightedSegment[] {
  const segments: WeightedSegment[] = [];
  // Match (text:weight) patterns
  const weightRegex = /\(([^():]+):([0-9.]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = weightRegex.exec(prompt)) !== null) {
    // Add non-weighted text before this match
    if (match.index > lastIndex) {
      segments.push({
        text: prompt.slice(lastIndex, match.index),
        weight: null,
        isWeighted: false,
        start: lastIndex,
        end: match.index,
      });
    }

    // Add weighted segment
    const weight = parseFloat(match[2]);
    segments.push({
      text: match[0], // Full match including parens
      weight,
      isWeighted: true,
      start: match.index,
      end: match.index + match[0].length,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < prompt.length) {
    segments.push({
      text: prompt.slice(lastIndex),
      weight: null,
      isWeighted: false,
      start: lastIndex,
      end: prompt.length,
    });
  }

  return segments;
}

// Get color class based on weight value
function getWeightColor(weight: number): string {
  if (weight < 1.0) {
    // De-emphasized: blue shades
    return 'bg-blue-500/60 border-blue-400';
  } else if (weight <= 1.1) {
    // Slightly above neutral
    return 'bg-emerald-500/50 border-emerald-400';
  } else if (weight <= 1.3) {
    // Mild emphasis: green
    return 'bg-green-500/60 border-green-400';
  } else if (weight <= 1.5) {
    // Moderate emphasis: yellow
    return 'bg-yellow-500/60 border-yellow-400';
  } else if (weight <= 1.8) {
    // Strong emphasis: orange
    return 'bg-orange-500/60 border-orange-400';
  } else {
    // Very strong emphasis: red
    return 'bg-red-500/60 border-red-400';
  }
}

// Get text color based on weight
function getWeightTextColor(weight: number): string {
  if (weight < 1.0) return 'text-blue-300';
  if (weight <= 1.1) return 'text-emerald-300';
  if (weight <= 1.3) return 'text-green-300';
  if (weight <= 1.5) return 'text-yellow-300';
  if (weight <= 1.8) return 'text-orange-300';
  return 'text-red-300';
}

export function WeightedPromptOverlay({ prompt, className }: WeightedPromptOverlayProps) {
  const segments = useMemo(() => parseWeightedSegments(prompt), [prompt]);

  // If no weighted segments, render nothing
  const hasWeighted = segments.some(s => s.isWeighted);
  if (!hasWeighted) return null;

  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words font-mono text-sm leading-6',
        className
      )}
      aria-hidden="true"
    >
      {segments.map((segment, idx) => {
        if (!segment.isWeighted || segment.weight === null) {
          // Invisible placeholder to maintain alignment
          return (
            <span key={idx} className="invisible">
              {segment.text}
            </span>
          );
        }

        return (
          <span
            key={idx}
            className={clsx(
              'relative inline-block',
              getWeightTextColor(segment.weight)
            )}
            title={`Weight: ${segment.weight}`}
          >
            {/* Invisible text for spacing */}
            <span className="invisible">{segment.text}</span>
            {/* Visible underline bar */}
            <span
              className={clsx(
                'absolute right-0 bottom-0 left-0 h-[3px] rounded-full',
                getWeightColor(segment.weight)
              )}
              style={{
                opacity: Math.min(1, 0.4 + (segment.weight - 1) * 0.3),
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

// Inline highlight version - renders segments with actual visible styling
export function WeightedPromptHighlight({ prompt }: { prompt: string }) {
  const segments = useMemo(() => parseWeightedSegments(prompt), [prompt]);

  return (
    <>
      {segments.map((segment, idx) => {
        if (!segment.isWeighted || segment.weight === null) {
          return <span key={idx}>{segment.text}</span>;
        }

        const colorClass = getWeightTextColor(segment.weight);
        const underlineClass = getWeightColor(segment.weight);

        return (
          <span
            key={idx}
            className={clsx('relative', colorClass)}
            title={`Weight: ${segment.weight}`}
          >
            {segment.text}
            <span
              className={clsx(
                'absolute right-0 bottom-0 left-0 h-[2px] rounded-full',
                underlineClass
              )}
            />
          </span>
        );
      })}
    </>
  );
}

// Hook to get weight statistics for a prompt
export function usePromptWeightStats(prompt: string) {
  return useMemo(() => {
    const segments = parseWeightedSegments(prompt);
    const weighted = segments.filter(s => s.isWeighted && s.weight !== null);

    if (weighted.length === 0) {
      return {
        hasWeights: false,
        count: 0,
        min: 1,
        max: 1,
        average: 1,
      };
    }

    const weights = weighted.map(s => s.weight!);
    return {
      hasWeights: true,
      count: weights.length,
      min: Math.min(...weights),
      max: Math.max(...weights),
      average: weights.reduce((a, b) => a + b, 0) / weights.length,
    };
  }, [prompt]);
}

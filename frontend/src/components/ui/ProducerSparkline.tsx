'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';

interface SparklineProps {
  /** Array of values (e.g., cost per minute over time) */
  data: number[];
  /** SVG width in pixels */
  width?: number;
  /** SVG height in pixels */
  height?: number;
  /** Line color (CSS color value) */
  color?: string;
  /** Label text shown above the graph */
  label?: string;
  /** Unit suffix for the current value */
  unit?: string;
  /** Whether to show the glow effect */
  glow?: boolean;
}

/**
 * ProducerSparkline - Visual Spend Velocity Graph
 *
 * A lightweight SVG sparkline showing spend rate over time.
 * Designed for the Producer Widget to add professional data density.
 *
 * @example
 * <ProducerSparkline
 *   data={[0.05, 0.10, 0.08, 0.15, 0.12]}
 *   label="SPEND VELOCITY"
 *   color="#22d3ee"
 * />
 */
export const ProducerSparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 32,
  color = "#22d3ee", // Cyan-400 (Technical color)
  label = "SPEND VELOCITY",
  unit = "/m",
  glow = true,
}) => {
  // Calculate SVG path from data points
  const pathD = useMemo(() => {
    if (!data.length) return "";

    const max = Math.max(...data, 0.01); // Prevent division by zero
    const min = 0;
    const range = max - min;

    // Create path points
    const points = data.map((val, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
      const normalizedVal = range > 0 ? (val - min) / range : 0.5;
      const y = height - (normalizedVal * (height - 4)) - 2; // Leave padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' L ');

    return `M ${points}`;
  }, [data, width, height]);

  // Calculate fill path (area under the line)
  const fillPathD = useMemo(() => {
    if (!data.length) return "";
    return `${pathD} L ${width},${height} L 0,${height} Z`;
  }, [pathD, width, height]);

  const currentValue = data[data.length - 1] ?? 0;
  const endY = useMemo(() => {
    if (!data.length) return height / 2;
    const max = Math.max(...data, 0.01);
    const normalizedVal = max > 0 ? currentValue / max : 0.5;
    return height - (normalizedVal * (height - 4)) - 2;
  }, [data, currentValue, height]);

  return (
    <div className="flex flex-col gap-1">
      {/* Header with label and current value */}
      <div className="flex justify-between items-end px-0.5">
        <span className="text-[9px] font-bold text-zinc-600 tracking-widest uppercase">
          {label}
        </span>
        <span
          className="text-[10px] font-mono font-medium"
          style={{ color }}
        >
          ${currentValue.toFixed(2)}{unit}
        </span>
      </div>

      {/* Graph container */}
      <div
        className="relative border-b border-white/5"
        style={{ width, height }}
      >
        <svg
          width={width}
          height={height}
          className="overflow-visible"
          aria-label={`${label}: $${currentValue.toFixed(2)}${unit}`}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id={`spark-fill-${label}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            {glow && (
              <filter id={`spark-glow-${label}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>

          {/* Area fill under the line */}
          {data.length > 1 && (
            <path
              d={fillPathD}
              fill={`url(#spark-fill-${label})`}
            />
          )}

          {/* The sparkline */}
          {data.length > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={glow ? `url(#spark-glow-${label})` : undefined}
              className={clsx(glow && "drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]")}
            />
          )}

          {/* Pulsing dot at the current value */}
          {data.length > 0 && (
            <g>
              {/* Outer glow ring */}
              <circle
                cx={width}
                cy={endY}
                r="4"
                fill={color}
                opacity="0.3"
                className="animate-ping"
              />
              {/* Inner solid dot */}
              <circle
                cx={width}
                cy={endY}
                r="2.5"
                fill={color}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default ProducerSparkline;

'use client';

import React, { useState, useCallback } from 'react';
import clsx from 'clsx';

interface RotaryKnobProps {
  /** Current value (typically 0-360 for rotation, or custom range) */
  value: number;
  /** Callback when value changes */
  onChange: (val: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Whether the value wraps (360° → 0°) or clamps */
  wrap?: boolean;
  /** Knob diameter in pixels */
  size?: number;
  /** Label displayed below the knob */
  label?: string;
  /** Unit suffix for the value display */
  unit?: string;
  /** Color of the indicator dot */
  color?: 'cyan' | 'violet' | 'amber';
  /** Drag sensitivity (higher = slower rotation) */
  sensitivity?: number;
}

/**
 * RotaryKnob - Professional Twist Control
 *
 * Essential for Lighting Direction, Color Wheel Hue, or Audio Gain.
 * A knob implies "infinite" or "circular" control that a slider cannot convey.
 * Drag UP to increase, DOWN to decrease.
 *
 * @example
 * <RotaryKnob
 *   value={lightAngle}
 *   onChange={setLightAngle}
 *   label="ANGLE"
 *   unit="°"
 *   color="cyan"
 * />
 */
export const RotaryKnob = ({
  value,
  onChange,
  min = 0,
  max = 360,
  wrap = true,
  size = 48,
  label,
  unit = '°',
  color = 'cyan',
  sensitivity = 2,
}: RotaryKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);

  // Color variants for the indicator
  const colorStyles = {
    cyan: {
      dot: 'bg-cyan-400',
      glow: 'shadow-[0_0_8px_rgba(34,211,238,0.8)]',
      ring: 'border-cyan-500/30',
    },
    violet: {
      dot: 'bg-violet-400',
      glow: 'shadow-[0_0_8px_rgba(139,92,246,0.8)]',
      ring: 'border-violet-500/30',
    },
    amber: {
      dot: 'bg-amber-400',
      glow: 'shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      ring: 'border-amber-500/30',
    },
  };

  const styles = colorStyles[color];

  // Calculate rotation angle for visual indicator (map value range to 0-270°)
  // We use 270° range to leave a "dead zone" at the bottom
  const visualRotation = ((value - min) / (max - min)) * 270 - 135; // -135 to 135

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startY = e.clientY;
      const startVal = value;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (ev: MouseEvent) => {
        // Dragging UP increases value, DOWN decreases
        const deltaY = startY - ev.clientY;
        const change = deltaY * sensitivity;

        let newVal: number;
        if (wrap) {
          // Wrap around for circular values (like degrees)
          newVal = ((startVal + change - min) % (max - min + 1)) + min;
          if (newVal < min) newVal += max - min + 1;
        } else {
          // Clamp for linear values
          newVal = Math.min(max, Math.max(min, startVal + change));
        }

        onChange(Math.round(newVal));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [value, min, max, wrap, sensitivity, onChange]
  );

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* The Knob */}
      <div
        className={clsx(
          'group relative cursor-ns-resize rounded-full border border-white/10 bg-zinc-900 shadow-inner',
          isDragging && 'border-white/20'
        )}
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        {/* Track Ring (subtle) */}
        <div
          className="absolute inset-1 rounded-full border border-white/5"
          style={{
            background:
              'conic-gradient(from -135deg, rgba(255,255,255,0.05) 0deg, rgba(255,255,255,0.02) 270deg, transparent 270deg)',
          }}
        />

        {/* The Indicator Dot */}
        <div
          className={clsx(
            'absolute h-1.5 w-1.5 rounded-full transition-transform duration-75 ease-out',
            styles.dot,
            styles.glow
          )}
          style={{
            top: '20%',
            left: '50%',
            marginLeft: '-3px',
            transformOrigin: `50% ${size * 0.3}px`,
            transform: `rotate(${visualRotation}deg)`,
          }}
        />

        {/* Center Cap */}
        <div className="absolute inset-3 rounded-full border border-white/5 bg-zinc-800" />

        {/* Active Ring Glow */}
        {isDragging && (
          <div
            className={clsx('absolute inset-0 animate-pulse rounded-full border-2', styles.ring)}
          />
        )}
      </div>

      {/* Label & Value */}
      {label && (
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">
            {label}
          </span>
          <span className="font-mono text-[10px] text-zinc-300">
            {value}
            {unit}
          </span>
        </div>
      )}
    </div>
  );
};

export default RotaryKnob;

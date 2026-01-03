'use client';

import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { GripHorizontal } from 'lucide-react';

interface ScrubbableInputProps {
  /** Current numeric value */
  value: number;
  /** Callback when value changes */
  onChange: (val: number) => void;
  /** Label displayed above the input */
  label?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment for each drag unit */
  step?: number;
  /** Unit suffix displayed after value (e.g., "px", "%", "°") */
  unit?: string;
  /** Pixels of drag movement per step (lower = more sensitive) */
  sensitivity?: number;
  /** Enable smooth/fluid dragging (interpolates between steps) */
  smooth?: boolean;
  /** Format function for display value */
  formatValue?: (val: number) => string;
  /** Additional className for the container */
  className?: string;
}

/**
 * ScrubbableInput - Professional Drag-to-Adjust Control
 *
 * The hallmark of pro creative software (Blender, After Effects, Figma).
 * Users click & drag horizontally to adjust values fluidly, or double-click
 * to type a precise value manually.
 *
 * @example
 * <ScrubbableInput
 *   value={focalLength}
 *   onChange={setFocalLength}
 *   label="FOCAL LENGTH"
 *   min={12}
 *   max={200}
 *   step={1}
 *   unit="mm"
 * />
 */
export const ScrubbableInput = ({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  sensitivity = 3,
  smooth = true,
  formatValue,
  className,
}: ScrubbableInputProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const startX = useRef<number>(0);
  const startVal = useRef<number>(0);

  // Display value (supports custom formatting)
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  // Calculate progress percentage for visual bar
  const progressPercent = ((value - min) / (max - min)) * 100;

  // Clamp value to min/max range
  const clampValue = useCallback(
    (val: number) => {
      return Math.min(max, Math.max(min, val));
    },
    [min, max]
  );

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.preventDefault();

      setIsDragging(true);
      startX.current = e.clientX;
      startVal.current = value;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      // Calculate the value range for smooth interpolation
      const range = max - min;
      // Pixels to drag across the full range (makes larger ranges feel proportional)
      const fullRangePixels = Math.max(200, range * sensitivity * 10);

      const handleMouseMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX.current;

        if (smooth) {
          // Smooth mode: fluid interpolation based on pixel movement
          const deltaValue = (deltaX / fullRangePixels) * range;
          // Round to step for clean values, but allow fluid motion
          const rawValue = startVal.current + deltaValue;
          const steppedValue = Math.round(rawValue / step) * step;
          const newValue = clampValue(steppedValue);
          onChange(newValue);
        } else {
          // Step mode: discrete steps based on pixel threshold
          const steps = Math.floor(deltaX / sensitivity);
          const newValue = clampValue(startVal.current + steps * step);
          onChange(newValue);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isEditing, value, sensitivity, step, smooth, min, max, clampValue, onChange]
  );

  // Handle manual text entry
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        onChange(clampValue(parsed));
      }
    },
    [onChange, clampValue]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <div className={clsx('group flex flex-col gap-1 select-none', className)}>
      {/* Label - also draggable */}
      {label && (
        <span
          className="cursor-ew-resize text-[9px] font-bold tracking-widest text-zinc-500 uppercase transition-colors hover:text-zinc-300"
          onMouseDown={handleMouseDown}
        >
          {label}
        </span>
      )}

      <div
        className={clsx(
          'relative flex h-8 items-center overflow-hidden rounded-md border bg-zinc-900 transition-all',
          isDragging
            ? 'border-violet-500 bg-zinc-800 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
            : 'border-white/10 hover:border-zinc-600',
          isEditing && 'border-violet-500 ring-1 ring-violet-500'
        )}
      >
        {/* Visual Progress Bar */}
        {!isEditing && (
          <div
            className={clsx(
              'pointer-events-none absolute top-0 bottom-0 left-0 transition-all duration-75',
              isDragging ? 'bg-violet-500/20' : 'bg-white/5'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        )}

        {isEditing ? (
          <input
            autoFocus
            type="number"
            className="w-full [appearance:textfield] bg-transparent px-2 font-mono text-xs text-white outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleInputChange}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div
            className="flex w-full cursor-ew-resize items-center justify-between px-2"
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
          >
            <span className="relative z-10 font-mono text-xs text-zinc-200">{displayValue}</span>
            {/* Grip indicator on hover */}
            <GripHorizontal
              size={12}
              className="text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrubbableInput;

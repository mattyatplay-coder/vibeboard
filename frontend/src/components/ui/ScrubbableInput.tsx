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
  /** Pixels of drag movement per step */
  sensitivity?: number;
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
  sensitivity = 5,
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
  const clampValue = useCallback((val: number) => {
    return Math.min(max, Math.max(min, val));
  }, [min, max]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return;
    e.preventDefault();

    setIsDragging(true);
    startX.current = e.clientX;
    startVal.current = value;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX.current;
      const steps = Math.floor(deltaX / sensitivity);
      const newValue = clampValue(startVal.current + (steps * step));
      onChange(newValue);
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
  }, [isEditing, value, sensitivity, step, clampValue, onChange]);

  // Handle manual text entry
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onChange(clampValue(parsed));
    }
  }, [onChange, clampValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <div className={clsx("flex flex-col gap-1 select-none group", className)}>
      {/* Label - also draggable */}
      {label && (
        <span
          className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest cursor-ew-resize hover:text-zinc-300 transition-colors"
          onMouseDown={handleMouseDown}
        >
          {label}
        </span>
      )}

      <div
        className={clsx(
          "relative h-8 bg-zinc-900 border rounded-md flex items-center overflow-hidden transition-all",
          isDragging
            ? "border-violet-500 bg-zinc-800 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
            : "border-white/10 hover:border-zinc-600",
          isEditing && "ring-1 ring-violet-500 border-violet-500"
        )}
      >
        {/* Visual Progress Bar */}
        {!isEditing && (
          <div
            className={clsx(
              "absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-75",
              isDragging ? "bg-violet-500/20" : "bg-white/5"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        )}

        {isEditing ? (
          <input
            autoFocus
            type="number"
            className="w-full bg-transparent text-xs font-mono text-white px-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            className="w-full flex items-center justify-between px-2 cursor-ew-resize"
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
          >
            <span className="text-xs font-mono text-zinc-200 relative z-10">
              {displayValue}
            </span>
            {/* Grip indicator on hover */}
            <GripHorizontal
              size={12}
              className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrubbableInput;

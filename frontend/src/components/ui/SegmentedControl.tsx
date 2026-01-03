'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  label?: string;
}

/**
 * SegmentedControl - Pro Toggle Switch
 *
 * Replaces standard dropdowns for small option sets (2-4 choices).
 * Uses animated pill indicator that slides between options.
 *
 * @example
 * <SegmentedControl
 *   options={[
 *     { value: 'slow', label: 'Slow' },
 *     { value: 'medium', label: 'Medium' },
 *     { value: 'fast', label: 'Fast' },
 *   ]}
 *   value={pacing}
 *   onChange={setPacing}
 *   label="PACING"
 * />
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  fullWidth = false,
  label,
}: SegmentedControlProps<T>) {
  const selectedIndex = options.findIndex(opt => opt.value === value);

  return (
    <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">
          {label}
        </label>
      )}

      <div
        className={clsx(
          'relative inline-flex rounded-lg border border-white/5 bg-zinc-900/60 p-0.5',
          fullWidth && 'w-full'
        )}
      >
        {/* Animated Background Pill */}
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-md bg-white/10"
          initial={false}
          animate={{
            left: `calc(${(selectedIndex / options.length) * 100}% + 2px)`,
            width: `calc(${100 / options.length}% - 4px)`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />

        {/* Options */}
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-md whitespace-nowrap transition-colors',
              size === 'sm'
                ? 'min-w-[60px] px-4 py-1.5 text-[10px]'
                : 'min-w-[72px] px-5 py-2 text-xs',
              fullWidth && 'flex-1',
              value === option.value
                ? 'font-medium text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SegmentedControl;

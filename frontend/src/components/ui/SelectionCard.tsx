'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * SelectionCard - Glowing Edge Selection
 *
 * Replaces heavy solid-border selection cards with subtle
 * glowing edges that feel more premium.
 *
 * @example
 * <SelectionCard
 *   selected={trainingType === 'style'}
 *   onClick={() => setTrainingType('style')}
 *   title="Style LoRA"
 *   description="Train on aesthetic/lighting patterns"
 *   icon={<Palette size={20} />}
 * />
 */
export const SelectionCard = ({
  selected,
  onClick,
  title,
  description,
  icon,
  badge,
  disabled = false,
  children,
}: SelectionCardProps) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      className={clsx(
        'relative w-full rounded-xl p-4 text-left transition-all duration-300',
        'border bg-zinc-900/40',
        disabled && 'cursor-not-allowed opacity-50',
        selected
          ? 'border-violet-500/50 bg-violet-500/5 shadow-[0_0_25px_-5px_rgba(139,92,246,0.4)] ring-1 ring-violet-500/30'
          : 'border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
      )}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]">
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute top-3 left-3">
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-violet-400 uppercase">
            {badge}
          </span>
        </div>
      )}

      {/* Content */}
      <div className={clsx('flex gap-4', badge && 'mt-6')}>
        {/* Icon */}
        {icon && (
          <div
            className={clsx(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
              selected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800/50 text-zinc-500'
            )}
          >
            {icon}
          </div>
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h3
            className={clsx(
              'text-sm font-semibold transition-colors',
              selected ? 'text-white' : 'text-zinc-300'
            )}
          >
            {title}
          </h3>
          {description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{description}</p>}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>

      {/* Hover glow effect */}
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 rounded-xl transition-opacity',
          selected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
        )}
        style={{
          background:
            'radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139, 92, 246, 0.06), transparent 60%)',
        }}
      />
    </motion.button>
  );
};

export default SelectionCard;

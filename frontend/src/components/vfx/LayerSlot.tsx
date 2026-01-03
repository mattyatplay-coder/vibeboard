'use client';

import React from 'react';
import { Upload, Eye, EyeOff, X, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

interface LayerSlotProps {
  label: string;
  isActive?: boolean;
  isVisible?: boolean;
  hasFile?: boolean;
  previewUrl?: string;
  onUpload?: () => void;
  onClear?: () => void;
  onSelect?: () => void;
  onToggleVisibility?: () => void;
}

/**
 * LayerSlot - Professional Layer Panel Component
 *
 * Replaces massive upload boxes with compact, After Effects-style layer slots.
 * Part of the "Midnight & Neon" design system.
 *
 * @example
 * <LayerSlot
 *   label="Base Skin"
 *   hasFile={true}
 *   previewUrl="/preview.jpg"
 *   isActive={true}
 *   onSelect={() => setActiveLayer('skin')}
 * />
 */
export const LayerSlot = ({
  label,
  isActive,
  isVisible = true,
  hasFile,
  previewUrl,
  onUpload,
  onClear,
  onSelect,
  onToggleVisibility,
}: LayerSlotProps) => {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative flex h-16 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg border px-3 transition-all duration-200',
        isActive
          ? 'border-violet-500/50 bg-violet-500/10'
          : 'border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/80'
      )}
    >
      {/* 1. Visibility Toggle */}
      <button
        onClick={e => {
          e.stopPropagation();
          onToggleVisibility?.();
        }}
        className={clsx(
          'transition-colors',
          isVisible ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-700 hover:text-zinc-500'
        )}
      >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* 2. Thumbnail / Drop Zone */}
      <div
        onClick={e => {
          e.stopPropagation();
          if (!hasFile) onUpload?.();
        }}
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded border transition-all',
          hasFile
            ? 'border-white/10 bg-black'
            : 'border-dashed border-zinc-700 bg-zinc-950 hover:border-zinc-500'
        )}
      >
        {hasFile && previewUrl ? (
          <img src={previewUrl} alt={label} className="h-full w-full rounded-sm object-cover" />
        ) : (
          <Upload size={14} className="text-zinc-600" />
        )}
      </div>

      {/* 3. Label & Status */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span
          className={clsx(
            'truncate text-xs font-medium',
            isActive ? 'text-white' : 'text-zinc-400'
          )}
        >
          {label}
        </span>
        <span
          className={clsx(
            'font-mono text-[10px]',
            hasFile ? 'text-emerald-500/70' : 'text-zinc-600'
          )}
        >
          {hasFile ? 'Ready' : 'Empty'}
        </span>
      </div>

      {/* 4. Active Indicator or Clear */}
      {hasFile ? (
        <button
          onClick={e => {
            e.stopPropagation();
            onClear?.();
          }}
          className="text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
        >
          <X size={14} />
        </button>
      ) : (
        <div
          className={clsx(
            'h-1.5 w-1.5 rounded-full transition-all',
            isActive ? 'bg-violet-500 shadow-[0_0_8px_#8b5cf6]' : 'bg-transparent'
          )}
        />
      )}
    </div>
  );
};

export default LayerSlot;

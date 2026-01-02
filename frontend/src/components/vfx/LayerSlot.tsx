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
  onToggleVisibility
}: LayerSlotProps) => {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        "group relative h-16 w-full rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-3 px-3 overflow-hidden",
        isActive
          ? "bg-violet-500/10 border-violet-500/50"
          : "bg-zinc-900/40 border-white/5 hover:bg-zinc-900/80 hover:border-white/10"
      )}
    >
      {/* 1. Visibility Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}
        className={clsx(
          "transition-colors",
          isVisible ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-700 hover:text-zinc-500"
        )}
      >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* 2. Thumbnail / Drop Zone */}
      <div
        onClick={(e) => { e.stopPropagation(); if (!hasFile) onUpload?.(); }}
        className={clsx(
          "h-10 w-10 rounded border flex items-center justify-center transition-all shrink-0",
          hasFile ? "border-white/10 bg-black" : "border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950"
        )}
      >
        {hasFile && previewUrl ? (
          <img src={previewUrl} alt={label} className="h-full w-full object-cover rounded-sm" />
        ) : (
          <Upload size={14} className="text-zinc-600" />
        )}
      </div>

      {/* 3. Label & Status */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className={clsx("text-xs font-medium truncate", isActive ? "text-white" : "text-zinc-400")}>
          {label}
        </span>
        <span className={clsx(
          "text-[10px] font-mono",
          hasFile ? "text-emerald-500/70" : "text-zinc-600"
        )}>
          {hasFile ? "Ready" : "Empty"}
        </span>
      </div>

      {/* 4. Active Indicator or Clear */}
      {hasFile ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClear?.(); }}
          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
        >
           <X size={14} />
        </button>
      ) : (
        <div className={clsx(
          "w-1.5 h-1.5 rounded-full transition-all",
          isActive ? "bg-violet-500 shadow-[0_0_8px_#8b5cf6]" : "bg-transparent"
        )} />
      )}
    </div>
  );
};

export default LayerSlot;

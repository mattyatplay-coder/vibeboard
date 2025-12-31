'use client';

import React, { useEffect, memo } from 'react';
import { Youtube, Mic, Zap, Sparkles, Camera, Lightbulb, Volume2 } from 'lucide-react';
import { ArchetypeData } from '@/data/CreatorArchetypes';
import { ArchetypePresetService, ArchetypePresets } from '@/services/ArchetypePresetService';
import clsx from 'clsx';

interface CreatorControlsProps {
  archetypes: Record<string, ArchetypeData>;
  selectedArchetype: string;
  onArchetypeChange: (key: string) => void;
  hook: string;
  onHookChange: (text: string) => void;
  isAdult?: boolean;
  /** Called when archetype changes with recommended presets */
  onPresetsChange?: (presets: ArchetypePresets) => void;
}

/**
 * CreatorControls - Memoized to prevent re-renders when parent state changes.
 * Parent (StoryConceptInput) passes stable useState setters, so React.memo is effective.
 */
const CreatorControlsInner = ({
  archetypes,
  selectedArchetype,
  onArchetypeChange,
  hook,
  onHookChange,
  isAdult = false,
  onPresetsChange,
}: CreatorControlsProps) => {
  const accentColor = isAdult ? 'red' : 'purple';
  const Icon = isAdult ? Mic : Youtube;
  const presetService = ArchetypePresetService.getInstance();
  const genre = isAdult ? 'onlyfans' : 'youtuber';

  // Auto-apply presets when archetype changes
  useEffect(() => {
    if (selectedArchetype && onPresetsChange) {
      const presets = presetService.getPresetsForArchetype(selectedArchetype, genre);
      onPresetsChange(presets);
    }
  }, [selectedArchetype, genre, onPresetsChange, presetService]);

  // Get current presets for display
  const currentPresets = selectedArchetype
    ? presetService.getFullPresetsForArchetype(selectedArchetype, genre)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Archetype Grid */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          <Icon className="h-3 w-3" />
          Channel Archetype
        </label>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(archetypes).map(([key, data]) => {
            const isSelected = selectedArchetype === key;
            return (
              <button
                key={key}
                onClick={() => onArchetypeChange(key)}
                className={clsx(
                  'group relative rounded-lg border p-3 text-left transition-all',
                  isSelected
                    ? isAdult
                      ? 'border-red-500 bg-red-900/20 text-white'
                      : 'border-purple-500 bg-purple-900/20 text-white'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50'
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div
                    className={clsx(
                      'absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full',
                      isAdult ? 'bg-red-500' : 'bg-purple-500'
                    )}
                  >
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}

                <div className="font-bold text-sm">{data.label}</div>
                <div className="mt-1 line-clamp-2 text-[10px] opacity-70">
                  {data.description}
                </div>

                {/* Style hint preview on hover */}
                {key !== 'custom' && (
                  <div
                    className={clsx(
                      'mt-2 flex items-center gap-1 text-[9px] opacity-0 transition-opacity group-hover:opacity-60',
                      isSelected && 'opacity-60'
                    )}
                  >
                    <Zap className="h-2.5 w-2.5" />
                    <span className="truncate">{data.recommendedLens || data.styleHint.split(',')[0]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* The Hook Input */}
      <div className="space-y-2">
        <label
          className={clsx(
            'flex items-center gap-2 text-xs font-bold uppercase tracking-wider',
            isAdult ? 'text-red-400' : 'text-purple-400'
          )}
        >
          <Zap className="h-3 w-3" />
          The Hook (First 30 Seconds)
        </label>
        <div className="relative">
          <textarea
            value={hook}
            onChange={(e) => onHookChange(e.target.value)}
            placeholder={
              isAdult
                ? "Describe the teaser intro... (e.g., 'Slow reveal from silhouette...')"
                : "What happens in the first 5 seconds? (e.g., 'I spent $50k on...')"
            }
            className={clsx(
              'h-24 w-full resize-none rounded-lg border bg-zinc-900 p-3 pr-24 text-white outline-none transition-colors focus:ring-1',
              isAdult
                ? 'border-red-500/30 focus:border-red-500 focus:ring-red-500'
                : 'border-purple-500/30 focus:border-purple-500 focus:ring-purple-500'
            )}
          />
          <span
            className={clsx(
              'absolute right-3 top-3 rounded px-2 py-0.5 text-[10px] font-mono uppercase',
              isAdult ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
            )}
          >
            Retention Critical
          </span>
        </div>
        <p className="text-[10px] text-zinc-500">
          {isAdult
            ? 'The opening that creates anticipation and keeps subscribers engaged.'
            : 'YouTube videos live or die by the first 30 seconds. Make it count!'}
        </p>
      </div>

      {/* Selected Archetype Preview */}
      {selectedArchetype && archetypes[selectedArchetype] && (
        <div
          className={clsx(
            'rounded-lg border p-3',
            isAdult ? 'border-red-500/20 bg-red-950/20' : 'border-purple-500/20 bg-purple-950/20'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isAdult ? 'bg-red-500/20' : 'bg-purple-500/20'
              )}
            >
              <Icon className={clsx('h-4 w-4', isAdult ? 'text-red-400' : 'text-purple-400')} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-300">
                Style: {archetypes[selectedArchetype].label}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                {archetypes[selectedArchetype].styleHint}
              </div>

              {/* Auto-Selected Presets */}
              {currentPresets && (
                <div className="mt-3 space-y-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Auto-Applied Presets
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Lens */}
                    {currentPresets.lens && (
                      <div className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1">
                        <Camera className="h-3 w-3 text-blue-400" />
                        <span className="text-[10px] text-blue-300">
                          {currentPresets.lens.focalLength}
                        </span>
                      </div>
                    )}
                    {/* Lighting */}
                    {currentPresets.lighting && (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1">
                        <Lightbulb className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] text-amber-300">
                          {currentPresets.lighting.name}
                        </span>
                      </div>
                    )}
                    {/* Audio */}
                    {currentPresets.audio && (
                      <div className="flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-2 py-1">
                        <Volume2 className="h-3 w-3 text-cyan-400" />
                        <span className="text-[10px] text-cyan-300">
                          {currentPresets.audio.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap with React.memo to prevent re-renders when parent state changes
export const CreatorControls = memo(CreatorControlsInner);

export default CreatorControls;

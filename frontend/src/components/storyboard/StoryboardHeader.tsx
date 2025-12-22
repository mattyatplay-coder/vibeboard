'use client';

import { Monitor, Users, Wand2, Play, Download, Undo, Redo } from 'lucide-react';
import { clsx } from 'clsx';

interface StoryboardHeaderProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  onStyleClick: () => void;
  onCastClick: () => void;
  onPreview: () => void;
}

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '2.35:1', '4:3'];

export function StoryboardHeader({
  aspectRatio,
  onAspectRatioChange,
  onStyleClick,
  onCastClick,
  onPreview,
}: StoryboardHeaderProps) {
  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#1a1a1a] px-6">
      {/* Left Controls */}
      <div className="flex items-center gap-4">
        {/* Aspect Ratio Selector */}
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10">
            <Monitor className="h-4 w-4" />
            {aspectRatio}
          </button>
          <div className="absolute top-full left-0 hidden w-32 pt-2 group-hover:block">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1a1a1a] shadow-xl">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  onClick={() => onAspectRatioChange(ratio)}
                  className={clsx(
                    'w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5',
                    aspectRatio === ratio ? 'text-blue-400' : 'text-gray-400'
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Style Button */}
        <button
          onClick={onStyleClick}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
        >
          <Wand2 className="h-4 w-4" />
          Style
        </button>

        {/* Cast Button */}
        <button
          onClick={onCastClick}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
        >
          <Users className="h-4 w-4" />
          Cast
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Undo/Redo (Visual only) */}
        <div className="mr-4 flex items-center gap-1">
          <button className="p-2 text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-50">
            <Undo className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-50">
            <Redo className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={onPreview}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Play className="h-4 w-4 fill-white" />
          Preview
        </button>

        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-gray-200">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronDown, Check, Sparkles, Palette, Film } from 'lucide-react';
import {
  Genre,
  GenreTemplate,
  GENRE_TEMPLATES,
  getGenreOptions,
  getGenreTemplate,
} from '@/data/GenreTemplates';

interface GenreSelectorProps {
  selectedGenre: Genre | null;
  onSelect: (genre: Genre | null) => void;
  showStylePreview?: boolean;
  className?: string;
  /** When true, shows adult/NSFW genres like "Adult / OnlyFans" */
  includeMature?: boolean;
}

export function GenreSelector({
  selectedGenre,
  onSelect,
  showStylePreview = true,
  className,
  includeMature = false,
}: GenreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedTemplate = selectedGenre ? GENRE_TEMPLATES[selectedGenre] : null;
  const genreOptions = getGenreOptions(includeMature);

  return (
    <div className={clsx('space-y-2', className)}>
      {/* Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            {selectedTemplate ? (
              <>
                <span className="text-xl">{selectedTemplate.icon}</span>
                <div>
                  <span className="block text-sm font-medium text-white">
                    {selectedTemplate.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {selectedTemplate.description.slice(0, 50)}...
                  </span>
                </div>
              </>
            ) : (
              <>
                <Film className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-400">
                  Select a genre for smart recommendations...
                </span>
              </>
            )}
          </div>
          <ChevronDown
            className={clsx('h-5 w-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            >
              {/* Clear option */}
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition-colors',
                  !selectedGenre ? 'bg-blue-500/10 text-blue-300' : 'text-gray-400 hover:bg-white/5'
                )}
              >
                <span className="w-6 text-center text-gray-500">✕</span>
                <span className="text-sm">No genre (show all camera moves)</span>
                {!selectedGenre && <Check className="ml-auto h-4 w-4 text-blue-400" />}
              </button>

              {/* Genre options grid */}
              <div className="grid max-h-80 grid-cols-2 gap-1 overflow-y-auto p-2">
                {genreOptions.map(({ value, label, icon }) => {
                  const template = GENRE_TEMPLATES[value];
                  const isSelected = selectedGenre === value;

                  return (
                    <button
                      key={value}
                      onClick={() => {
                        onSelect(value);
                        setIsOpen(false);
                      }}
                      className={clsx(
                        'rounded-lg p-3 text-left transition-all',
                        isSelected
                          ? 'border border-blue-500/50 bg-blue-500/20'
                          : 'border border-transparent bg-white/5 hover:border-white/20 hover:bg-white/10'
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            isSelected ? 'text-blue-300' : 'text-white'
                          )}
                        >
                          {label}
                        </span>
                        {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-blue-400" />}
                      </div>
                      <p className="line-clamp-2 text-[10px] text-gray-500">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Style preview panel */}
      {showStylePreview && selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4"
        >
          {/* Default style */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Default Visual Style
              </span>
            </div>
            <p className="text-xs text-gray-300 italic">"{selectedTemplate.defaultStyle}"</p>
          </div>

          {/* Color palette */}
          <div>
            <span className="mb-2 block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Color Palette
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedTemplate.colorPalette.map((color: string, i: number) => (
                <span key={i} className="rounded bg-black/30 px-2 py-0.5 text-[10px] text-gray-300">
                  {color}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended cameras */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-green-400" />
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Recommended Camera Moves
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTemplate.cameraPreferences.slice(0, 6).map((preset: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-300"
                >
                  {preset.replace(/_/g, ' ')}
                </span>
              ))}
              {selectedTemplate.cameraPreferences.length > 6 && (
                <span className="text-[10px] text-gray-500">
                  +{selectedTemplate.cameraPreferences.length - 6} more
                </span>
              )}
            </div>
          </div>

          {/* Style notes */}
          <div>
            <span className="mb-2 block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Style Tips
            </span>
            <ul className="space-y-1">
              {selectedTemplate.styleNotes.slice(0, 3).map((note: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-[10px] text-gray-400">
                  <span className="mt-0.5 text-blue-400">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact inline version
// ═══════════════════════════════════════════════════════════════════════════

interface GenreBadgeProps {
  genre: Genre;
  onClick?: () => void;
  showRemove?: boolean;
  onRemove?: () => void;
}

export function GenreBadge({ genre, onClick, showRemove, onRemove }: GenreBadgeProps) {
  const template = GENRE_TEMPLATES[genre];

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-300',
        onClick && 'cursor-pointer hover:bg-blue-500/20'
      )}
    >
      <span>{template.icon}</span>
      <span>{template.name}</span>
      {showRemove && onRemove && (
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-white"
        >
          ×
        </button>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick genre pills for compact selection
// ═══════════════════════════════════════════════════════════════════════════

interface GenrePillsProps {
  selectedGenre: Genre | null;
  onSelect: (genre: Genre | null) => void;
  maxVisible?: number;
  /** When true, shows adult/NSFW genres like "Adult / OnlyFans" */
  includeMature?: boolean;
}

export function GenrePills({
  selectedGenre,
  onSelect,
  maxVisible = 6,
  includeMature = false,
}: GenrePillsProps) {
  const [showAll, setShowAll] = useState(false);
  const genreOptions = getGenreOptions(includeMature);
  const visibleOptions = showAll ? genreOptions : genreOptions.slice(0, maxVisible);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleOptions.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => onSelect(selectedGenre === value ? null : value)}
          className={clsx(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            selectedGenre === value
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          )}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
      {genreOptions.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="rounded-full px-2.5 py-1 text-xs text-gray-500 hover:bg-white/10 hover:text-white"
        >
          {showAll ? 'Show less' : `+${genreOptions.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

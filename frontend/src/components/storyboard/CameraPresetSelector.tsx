'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronDown, Check, Sparkles, Ban, Plus, X, Search } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  CAMERA_PRESETS,
  CameraPreset,
  CameraCategory,
  Genre,
  getAllPresets,
  getPresetById,
  getCategoryForPreset,
  TOTAL_PRESETS,
} from '@/data/CameraPresets';
import {
  GENRE_TEMPLATES,
  getRecommendedCameraPresets,
  getAvoidedCameraPresets,
  isCameraPresetRecommended,
  isCameraPresetAvoided,
  getGenreOptions,
} from '@/data/GenreTemplates';

interface CameraPresetSelectorProps {
  selectedPreset: string | null;
  onSelect: (preset: CameraPreset) => void;
  genre?: Genre | null;
  showGenreRecommendations?: boolean;
  allowMixing?: boolean; // Enable Higgsfield Mix style combining
  selectedMixPresets?: string[]; // For mixing mode
  onMixSelect?: (presets: string[]) => void;
  className?: string;
}

export function CameraPresetSelector({
  selectedPreset,
  onSelect,
  genre = null,
  showGenreRecommendations = true,
  allowMixing = false,
  selectedMixPresets = [],
  onMixSelect,
  className,
}: CameraPresetSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mixMode, setMixMode] = useState(false);

  const genreTemplate = genre ? GENRE_TEMPLATES[genre] : null;

  // Filter presets by search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return getAllPresets().filter(
      preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.prompt.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Get recommended presets for current genre
  const recommendedPresets = useMemo(() => {
    if (!genre) return [];
    return getRecommendedCameraPresets(genre);
  }, [genre]);

  // Handle preset selection
  const handlePresetClick = (preset: CameraPreset) => {
    if (mixMode && allowMixing && onMixSelect) {
      // Mixing mode - toggle selection
      const newSelection = selectedMixPresets.includes(preset.id)
        ? selectedMixPresets.filter(id => id !== preset.id)
        : [...selectedMixPresets, preset.id].slice(0, 3); // Max 3 presets
      onMixSelect(newSelection);
    } else {
      // Normal mode - single selection
      onSelect(preset);
    }
  };

  // Get combined prompt for mixed presets
  const getMixedPrompt = () => {
    if (selectedMixPresets.length === 0) return '';
    return selectedMixPresets
      .map(id => getPresetById(id)?.prompt)
      .filter(Boolean)
      .join(', ');
  };

  // Render preset button
  const renderPresetButton = (preset: CameraPreset) => {
    const isSelected = mixMode
      ? selectedMixPresets.includes(preset.id)
      : selectedPreset === preset.id;
    const isRecommended = genre && isCameraPresetRecommended(preset.id, genre);
    const isAvoided = genre && isCameraPresetAvoided(preset.id, genre);

    return (
      <button
        key={preset.id}
        onClick={() => !isAvoided && handlePresetClick(preset)}
        disabled={isAvoided ?? false}
        title={preset.description}
        className={clsx(
          'relative rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all',
          isSelected
            ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
            : isAvoided
              ? 'cursor-not-allowed border-red-500/20 bg-red-500/5 text-gray-600 opacity-50'
              : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white'
        )}
      >
        <span className="block truncate">{preset.name}</span>
        {/* Indicators */}
        {isRecommended && !isSelected && (
          <Tooltip content="Recommended for this genre" side="top">
            <span
              className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"
            />
          </Tooltip>
        )}
        {isAvoided && <Ban className="absolute -top-1 -right-1 h-3 w-3 text-red-400" />}
        {isSelected && mixMode && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold">
            {selectedMixPresets.indexOf(preset.id) + 1}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Header with search and mix toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold tracking-wider text-gray-400 uppercase">Camera Move</h4>
          <span className="text-[10px] text-gray-500">({TOTAL_PRESETS} presets)</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <Tooltip content="Search presets" side="top">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={clsx(
                'rounded-lg p-1.5 transition-colors',
                showSearch
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {/* Mix mode toggle */}
          {allowMixing && (
            <Tooltip content="Combine multiple camera moves" side="top">
              <button
                onClick={() => {
                  setMixMode(!mixMode);
                  if (!mixMode) onMixSelect?.([]);
                }}
                className={clsx(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors',
                  mixMode
                    ? 'border border-purple-500/30 bg-purple-500/20 text-purple-400'
                    : 'border border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                <Plus className="h-3 w-3" />
                Mix
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Search input */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search camera moves..."
                className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pr-8 pl-9 text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 hover:bg-white/10"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mix mode preview */}
      <AnimatePresence>
        {mixMode && selectedMixPresets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-purple-400">
                Camera Mix ({selectedMixPresets.length}/3)
              </span>
              <button
                onClick={() => onMixSelect?.([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {selectedMixPresets.map((id, index) => {
                const preset = getPresetById(id);
                return preset ? (
                  <span
                    key={id}
                    className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300"
                  >
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">
                      {index + 1}
                    </span>
                    {preset.name}
                    <button
                      onClick={() => onMixSelect?.(selectedMixPresets.filter(p => p !== id))}
                      className="hover:text-white"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <p className="text-[10px] text-gray-400 italic">{getMixedPrompt()}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Genre recommendations */}
      {showGenreRecommendations && genreTemplate && !searchQuery && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400">
              Recommended for {genreTemplate.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recommendedPresets.slice(0, 6).map(presetId => {
              const preset = getPresetById(presetId);
              return preset ? (
                <button
                  key={presetId}
                  onClick={() => handlePresetClick(preset)}
                  className={clsx(
                    'rounded-full border px-2 py-1 text-[10px] transition-colors',
                    selectedPreset === presetId || selectedMixPresets.includes(presetId)
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                  )}
                >
                  {preset.name}
                </button>
              ) : null;
            })}
            {recommendedPresets.length > 6 && (
              <span className="px-2 py-1 text-[10px] text-gray-500">
                +{recommendedPresets.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search results */}
      {searchQuery && filteredPresets && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            {filteredPresets.length} results for "{searchQuery}"
          </p>
          <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto">
            {filteredPresets.map(preset => renderPresetButton(preset))}
          </div>
        </div>
      )}

      {/* Category grid */}
      {!searchQuery && (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(CAMERA_PRESETS).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                className={clsx(
                  'rounded-lg border p-2 text-center transition-all',
                  activeCategory === key
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                )}
                title={category.description}
              >
                <span className="block text-base">{category.icon}</span>
                <span className="mt-0.5 block truncate text-[9px]">{category.label}</span>
              </button>
            ))}
          </div>

          {/* Expanded category presets */}
          <AnimatePresence mode="wait">
            {activeCategory && (
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-white">
                      <span>{CAMERA_PRESETS[activeCategory].icon}</span>
                      {CAMERA_PRESETS[activeCategory].label}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {CAMERA_PRESETS[activeCategory].presets.length} presets
                    </span>
                  </div>
                  <p className="mb-3 text-[10px] text-gray-400">
                    {CAMERA_PRESETS[activeCategory].description}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CAMERA_PRESETS[activeCategory].presets.map(preset =>
                      renderPresetButton(preset)
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Current selection display */}
      {selectedPreset && !mixMode && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-blue-300">
              {getPresetById(selectedPreset)?.name}
            </p>
            <p className="truncate text-[10px] text-gray-400">
              {getPresetById(selectedPreset)?.prompt}
            </p>
          </div>
          <Tooltip content="Clear selection" side="top">
            <button
              onClick={() => onSelect({ id: '', name: '', prompt: '', description: '', genres: [] })}
              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact version for inline use
// ═══════════════════════════════════════════════════════════════════════════

interface CameraPresetDropdownProps {
  selectedPreset: string | null;
  onSelect: (preset: CameraPreset) => void;
  genre?: Genre | null;
  className?: string;
}

export function CameraPresetDropdown({
  selectedPreset,
  onSelect,
  genre = null,
  className,
}: CameraPresetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPresetData = selectedPreset ? getPresetById(selectedPreset) : null;
  const category = selectedPreset ? getCategoryForPreset(selectedPreset) : null;

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
      >
        <span className="flex items-center gap-2">
          {category && <span>{category.icon}</span>}
          <span className={selectedPresetData ? 'text-white' : 'text-gray-500'}>
            {selectedPresetData?.name || 'Select camera move...'}
          </span>
        </span>
        <ChevronDown
          className={clsx('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a1a] p-3 shadow-2xl"
          >
            <CameraPresetSelector
              selectedPreset={selectedPreset}
              onSelect={preset => {
                onSelect(preset);
                setIsOpen(false);
              }}
              genre={genre}
              showGenreRecommendations={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

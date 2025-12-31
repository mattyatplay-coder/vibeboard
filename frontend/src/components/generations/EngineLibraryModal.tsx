import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Image as ImageIcon,
  Video,
  User,
  Crown,
  Sparkles,
  Check,
  Film,
  Upload,
  Mic,
  Music,
  Wand2,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_MODELS, ModelInfo, ModelCapability, PROVIDER_DEFINITIONS } from '@/lib/ModelRegistry';
import { getModelPriceString } from '@/lib/ModelPricing';
import { getModelConstraints } from '@/lib/ModelConstraints';
import { AudioInput } from './AudioInput';

interface EngineLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModelId: string;
  onSelect: (model: ModelInfo) => void;
  initialCategory?: ModelCapability | 'all';
  // Generation parameters
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  duration?: string;
  onDurationChange?: (d: string) => void;
  // Audio support for avatar models
  audioFile?: File | null;
  onAudioChange?: (file: File | null) => void;
}

const CATEGORIES = [
  { id: 'all' as const, label: 'All Uses', icon: Sparkles },
  { id: 'text-to-image' as ModelCapability, label: 'Image Generation', icon: ImageIcon },
  { id: 'text-to-video' as ModelCapability, label: 'Text to Video', icon: Video },
  { id: 'image-to-video' as ModelCapability, label: 'Animation (I2V)', icon: Film },
  { id: 'avatar' as ModelCapability, label: 'Character & Avatar', icon: User },
];

export function EngineLibraryModal({
  isOpen,
  onClose,
  currentModelId,
  onSelect,
  initialCategory = 'all',
  quantity = 1,
  onQuantityChange,
  duration,
  onDurationChange,
  audioFile,
  onAudioChange,
}: EngineLibraryModalProps) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    // Load favorites from local storage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vibeboard_model_favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const toggleFavorite = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId];
      localStorage.setItem('vibeboard_model_favorites', JSON.stringify(next));
      return next;
    });
  };

  const [selectedCategory, setSelectedCategory] = useState<ModelCapability | 'all' | 'favorites'>(
    'all'
  );
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [loraOnly, setLoraOnly] = useState(false);

  // Staged model selection - only applied when user clicks "Apply Model"
  const [stagedModelId, setStagedModelId] = useState<string>(currentModelId);

  // Update selected category and staged model when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setSelectedCategory(initialCategory);
      }
      // Reset staged selection to current model when modal opens
      setStagedModelId(currentModelId);
    }
  }, [isOpen, initialCategory, currentModelId]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get provider counts for MAKER filter
  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_MODELS.forEach(model => {
      counts[model.provider] = (counts[model.provider] || 0) + 1;
    });
    return counts;
  }, []);

  const toggleProvider = (provider: string) => {
    setSelectedProviders(prev =>
      prev.includes(provider) ? prev.filter(p => p !== provider) : [...prev, provider]
    );
  };

  const filteredModels = useMemo(() => {
    return ALL_MODELS.filter(model => {
      let matchesCategory = false;

      // Handle "All" - show all models
      if (selectedCategory === 'all') {
        matchesCategory = true;
      } else if (selectedCategory === 'favorites') {
        matchesCategory = favorites.includes(model.id);
      } else {
        matchesCategory = model.capability === selectedCategory;
      }

      // Filter by selected providers (if any)
      const matchesProvider =
        selectedProviders.length === 0 || selectedProviders.includes(model.provider);

      // Filter by LoRA capability
      const matchesLoRA = !loraOnly || getModelConstraints(model.id).supportsLoRA;

      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesProvider && matchesLoRA && matchesSearch;
    });
  }, [selectedCategory, searchQuery, favorites, selectedProviders, loraOnly]);

  // Count models that support LoRA
  const loraModelCount = useMemo(() => {
    return ALL_MODELS.filter(model => getModelConstraints(model.id).supportsLoRA).length;
  }, []);

  // Show all categories always
  const displayedCategories = CATEGORIES;

  // Check if current model is an Avatar model (needs audio)
  const isAvatarModel = useMemo(() => {
    // Not used for logic anymore, but kept if needed
    const model = ALL_MODELS.find(m => m.id === currentModelId);
    return model?.capability === 'avatar';
  }, [currentModelId]);

  const isVideoModel = useMemo(() => {
    const model = ALL_MODELS.find(m => m.id === currentModelId);
    return model?.type === 'video';
  }, [currentModelId]);

  const supportedDurations = useMemo(() => {
    const model = ALL_MODELS.find(m => m.id === currentModelId);
    return model?.supportedDurations || ['5s', '10s'];
  }, [currentModelId]);

  // Group by Capability if 'all' is selected, or just list
  // Actually, simple grid is better for now.

  const handleSelect = (model: ModelInfo) => {
    // Stage the selection - don't apply yet
    setStagedModelId(model.id);
  };

  const handleApply = () => {
    const model = ALL_MODELS.find(m => m.id === stagedModelId);
    if (model) {
      onSelect(model);
    }
    onClose();
  };

  // Get staged model info for footer display
  const stagedModel = useMemo(() => {
    return ALL_MODELS.find(m => m.id === stagedModelId);
  }, [stagedModelId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="flex w-64 flex-col overflow-y-auto border-r border-white/5 bg-black/40 p-4">
              <div className="mb-6 flex items-center gap-2 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Models</h2>
              </div>

              {/* Audio Source Section - Always visible per design */}
              <div className="mb-4">
                {onAudioChange && (
                  <AudioInput
                    file={audioFile}
                    onAudioChange={onAudioChange}
                    className="border border-white/10 bg-white/5"
                  />
                )}
              </div>

              {/* Quantity & Duration Row - Grid for fixed layout */}
              <div className="mb-4 grid grid-cols-2 gap-2 px-2">
                {/* Quantity */}
                {onQuantityChange && (
                  <div className="w-full">
                    <label className="mb-2 block text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      Quantity
                    </label>
                    <select
                      value={quantity}
                      onChange={e => onQuantityChange(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    >
                      {[1, 2, 3, 4].map(n => (
                        <option key={n} value={n} className="bg-[#1a1a1a]">
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Duration (Video Only) */}
                {isVideoModel && onDurationChange && (
                  <div className="animate-in fade-in slide-in-from-left-2 w-full">
                    <label className="mb-2 block text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={e => onDurationChange(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    >
                      {supportedDurations.map((d: string) => (
                        <option key={d} value={d} className="bg-[#1a1a1a]">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Favorites */}
              <button
                onClick={() => setSelectedCategory('favorites')}
                className={clsx(
                  'mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all',
                  selectedCategory === 'favorites'
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Crown
                  className={clsx(
                    'h-4 w-4',
                    selectedCategory === 'favorites' ? 'fill-current text-white' : 'text-gray-500'
                  )}
                />
                <span>My Favorites</span>
                <span className="ml-auto text-xs opacity-60">{favorites.length}</span>
              </button>

              {/* USE CASE Section */}
              <div className="mb-4">
                <p className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  Use Case
                </p>
                <div className="space-y-1">
                  {displayedCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all',
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <cat.icon
                        className={clsx(
                          'h-4 w-4',
                          selectedCategory === cat.id ? 'text-white' : 'text-gray-500'
                        )}
                      />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* LoRA Capability Filter */}
              <button
                onClick={() => setLoraOnly(!loraOnly)}
                className={clsx(
                  'mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all',
                  loraOnly
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Wand2 className={clsx('h-4 w-4', loraOnly ? 'text-white' : 'text-gray-500')} />
                <span>LoRA Support</span>
                <span className="ml-auto text-xs opacity-60">{loraModelCount}</span>
                {loraOnly && <Check className="h-3 w-3 text-white" />}
              </button>

              <div className="my-3 border-t border-white/10" />

              {/* MAKER Section */}
              <div className="mb-4">
                <p className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                  Maker
                </p>
                <div className="space-y-1">
                  {Object.entries(providerCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([provider, count]) => {
                      const providerDef = PROVIDER_DEFINITIONS[provider];
                      const isSelected = selectedProviders.includes(provider);
                      return (
                        <button
                          key={provider}
                          onClick={() => toggleProvider(provider)}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-all',
                            isSelected
                              ? 'bg-white/10 text-white'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          {providerDef?.icon && (
                            <providerDef.icon className={clsx('h-3.5 w-3.5', providerDef.color)} />
                          )}
                          <span className="flex-1 truncate">{providerDef?.name || provider}</span>
                          <span className="text-xs opacity-60">{count}</span>
                          {isSelected && <Check className="h-3 w-3 text-blue-400" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="mt-auto border-t border-white/5 pt-4">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                  <p className="mb-1 text-xs font-medium text-blue-300">Showing</p>
                  <p className="text-xl font-bold text-blue-100">
                    {filteredModels.length}{' '}
                    <span className="text-sm font-normal text-blue-300">
                      of {ALL_MODELS.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col bg-gradient-to-br from-[#0A0A0A] to-[#111111]">
              {/* Header */}
              <div className="flex h-16 items-center justify-between gap-4 border-b border-white/5 px-6">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-white/10 bg-white/5 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-500 transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6 pb-24">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredModels.map(model => {
                    const providerDef = PROVIDER_DEFINITIONS[model.provider];
                    const isSelected = stagedModelId === model.id;

                    return (
                      <div
                        key={model.id}
                        onClick={() => handleSelect(model)}
                        className={clsx(
                          'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-4 transition-all',
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                            : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:shadow-xl'
                        )}
                      >
                        <button
                          onClick={e => toggleFavorite(e, model.id)}
                          className={clsx(
                            'absolute top-2 right-2 z-20 rounded-full p-1.5 opacity-0 transition-all group-hover:opacity-100',
                            favorites.includes(model.id)
                              ? 'bg-black/20 text-yellow-400 opacity-100'
                              : 'text-gray-500 hover:bg-white/10 hover:text-yellow-400'
                          )}
                        >
                          <Crown
                            className={clsx(
                              'h-4 w-4',
                              favorites.includes(model.id) && 'fill-current'
                            )}
                          />
                        </button>

                        {/* Provider Pill */}
                        <div className="mb-3 flex items-center justify-between">
                          <div
                            className={clsx(
                              'flex items-center gap-1.5 rounded border border-white/5 px-2 py-1 text-xs font-medium',
                              providerDef?.bgColor || 'bg-gray-800'
                            )}
                          >
                            {providerDef?.icon && (
                              <providerDef.icon className={clsx('h-3 w-3', providerDef.color)} />
                            )}
                            <span className={clsx(providerDef?.color || 'text-gray-300')}>
                              {providerDef?.name || model.provider}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>

                        <h3 className="mb-1 text-base font-bold text-white transition-colors group-hover:text-blue-400">
                          {model.name}
                        </h3>
                        {model.bestFor && (
                          <span className="mb-2 inline-block rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                            Best for: {model.bestFor}
                          </span>
                        )}
                        <p className="mb-4 text-xs text-gray-400">
                          {model.desc || 'No description available.'}
                        </p>

                        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                'rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase',
                                model.type === 'video'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              )}
                            >
                              {model.type === 'video' ? 'Video' : 'Image'}
                            </span>
                            {model.capability === 'avatar' && (
                              <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-pink-300 uppercase">
                                Avatar
                              </span>
                            )}
                            {getModelConstraints(model.id).supportsLoRA && (
                              <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
                                <Wand2 className="h-2.5 w-2.5" />
                                LoRA
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-emerald-400">
                            {getModelPriceString(model.id)}
                          </span>
                        </div>

                        {/* Hover Effect Gradient */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
                {filteredModels.length === 0 && (
                  <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                    <Search className="mb-2 h-8 w-8 opacity-20" />
                    <p>No models found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="absolute right-0 bottom-0 left-64 flex items-center justify-between border-t border-white/10 bg-black/90 px-6 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  {stagedModel ? (
                    <>
                      <span className="font-medium text-white">{stagedModel.name}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-emerald-400">{getModelPriceString(stagedModel.id)}</span>
                    </>
                  ) : (
                    <span>No model selected</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!stagedModel}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Apply Model
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

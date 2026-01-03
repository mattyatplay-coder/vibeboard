import { useState } from 'react';
import { SortAsc, SortDesc, SlidersHorizontal, Image, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export interface SortFilterState {
  sortBy: 'name' | 'type' | 'aspectRatio';
  sortOrder: 'asc' | 'desc';
  filterType: string[];
  filterMediaType: string[];
  filterAspectRatio: string[];
  filterTags: string[];
  filterSessions: string[];
}

interface SortFilterHeaderProps {
  state: SortFilterState;
  onChange: (newState: SortFilterState) => void;
  availableTags: string[];
  availableSessions: { id: string; name: string }[];
  hideElementType?: boolean;
  onSelectAll?: () => void;
  selectAllLabel?: string;
}

export function SortFilterHeader({
  state,
  onChange,
  availableTags,
  availableSessions,
  hideElementType,
  onSelectAll,
  selectAllLabel = 'Select All',
}: SortFilterHeaderProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const updateState = (updates: Partial<SortFilterState>) => {
    onChange({ ...state, ...updates });
  };

  const toggleFilter = (category: keyof SortFilterState, value: string) => {
    const current = state[category] as string[];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    updateState({ [category]: updated });
  };

  const activeFilterCount =
    state.filterType.length +
    state.filterMediaType.length +
    state.filterAspectRatio.length +
    state.filterTags.length +
    state.filterSessions.length;

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      {/* Row 1: Sort & Filter */}
      <div className="flex items-center gap-2">
        {/* Sort Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-sm whitespace-nowrap text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            {state.sortOrder === 'asc' ? (
              <SortAsc className="h-3.5 w-3.5" />
            ) : (
              <SortDesc className="h-3.5 w-3.5" />
            )}
            Sort
          </button>

          <AnimatePresence>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={e => e.stopPropagation()}
                  className="absolute top-full right-0 z-50 mt-2 flex w-64 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-3">
                    <span className="text-sm font-bold text-white">Sort</span>
                  </div>
                  <div className="space-y-4 overflow-y-auto p-2">
                    {/* Sort By */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Sort By
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'Name', value: 'name' },
                          { label: 'Type', value: 'type' },
                          { label: 'Aspect Ratio', value: 'aspectRatio' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={state.sortBy === opt.value}
                              onChange={() => updateState({ sortBy: opt.value as any })}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span
                              className={clsx(
                                'text-sm',
                                state.sortBy === opt.value ? 'text-blue-400' : 'text-gray-300'
                              )}
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Order */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Order
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'Ascending', value: 'asc' },
                          { label: 'Descending', value: 'desc' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={state.sortOrder === opt.value}
                              onChange={() => updateState({ sortOrder: opt.value as any })}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span
                              className={clsx(
                                'text-sm',
                                state.sortOrder === opt.value ? 'text-blue-400' : 'text-gray-300'
                              )}
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Filter Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={clsx(
              'flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
              activeFilterCount > 0
                ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                : 'border-white/10 bg-zinc-900/80 text-white/70 hover:bg-white/5 hover:text-white'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-500 px-1.5 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={e => e.stopPropagation()}
                  className="absolute top-full right-0 z-50 mt-2 flex max-h-[80vh] w-64 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-3">
                    <span className="text-sm font-bold text-white">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() =>
                          onChange({
                            ...state,
                            filterType: [],
                            filterMediaType: [],
                            filterAspectRatio: [],
                            filterTags: [],
                            filterSessions: [],
                          })
                        }
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 overflow-y-auto p-2">
                    {/* Sessions */}
                    {availableSessions.length > 0 && (
                      <div>
                        <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                          Sessions
                        </div>
                        <div className="space-y-1">
                          {availableSessions.map(session => (
                            <label
                              key={session.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            >
                              <input
                                type="checkbox"
                                checked={state.filterSessions.includes(session.id)}
                                onChange={() => toggleFilter('filterSessions', session.id)}
                                className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                              />
                              <span className="truncate text-sm text-gray-300">{session.name}</span>
                            </label>
                          ))}
                          {/* Option for Unassigned */}
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={state.filterSessions.includes('unassigned')}
                              onChange={() => toggleFilter('filterSessions', 'unassigned')}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-gray-300">Global / Unassigned</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Element Type */}
                    {!hideElementType && (
                      <div>
                        <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                          Element Type
                        </div>
                        <div className="space-y-1">
                          {[
                            { value: 'character', label: 'Character' },
                            { value: 'prop', label: 'Object' },
                            { value: 'place', label: 'Location' },
                            { value: 'image', label: 'Image' },
                            { value: 'video', label: 'Video' },
                          ].map(opt => (
                            <label
                              key={opt.value}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            >
                              <input
                                type="checkbox"
                                checked={state.filterType.includes(opt.value)}
                                onChange={() => toggleFilter('filterType', opt.value)}
                                className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                              />
                              <span className="text-sm text-gray-300 capitalize">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Media Type */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Media Type
                      </div>
                      <div className="space-y-1">
                        {[
                          { value: 'image', label: 'Images', icon: Image },
                          { value: 'video', label: 'Videos', icon: Film },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={state.filterMediaType.includes(opt.value)}
                              onChange={() => toggleFilter('filterMediaType', opt.value)}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <opt.icon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-300">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Aspect Ratio
                      </div>
                      <div className="space-y-1">
                        {['16:9', '9:16', '1:1', '21:9', '4:3'].map(ratio => (
                          <label
                            key={ratio}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={state.filterAspectRatio.includes(ratio)}
                              onChange={() => toggleFilter('filterAspectRatio', ratio)}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-gray-300">{ratio}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    {availableTags.length > 0 && (
                      <div>
                        <div className="mb-1 px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-1 px-2">
                          {availableTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleFilter('filterTags', tag)}
                              className={clsx(
                                'rounded-full border px-2 py-1 text-xs transition-colors',
                                state.filterTags.includes(tag)
                                  ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                                  : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                              )}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Row 2: Select All Button - Same styling as Generate page */}
      {onSelectAll && (
        <button
          onClick={onSelectAll}
          className="flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm whitespace-nowrap text-sky-400 transition-colors hover:bg-sky-500/20"
        >
          {selectAllLabel}
        </button>
      )}
    </div>
  );
}

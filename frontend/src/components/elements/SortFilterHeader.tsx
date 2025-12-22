import { useState } from 'react';
import { Filter, SortAsc, SortDesc, Check, X, Tag } from 'lucide-react';
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
}

export function SortFilterHeader({
  state,
  onChange,
  availableTags,
  availableSessions,
  hideElementType,
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

  return (
    <div className="relative flex items-center gap-2">
      {/* Sort Button */}
      <div className="relative">
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10"
        >
          {state.sortOrder === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
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
                className="absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] p-2 shadow-xl"
              >
                <div className="space-y-1">
                  <div className="px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    Sort By
                  </div>
                  {[
                    { label: 'Name', value: 'name' },
                    { label: 'Type', value: 'type' },
                    { label: 'Aspect Ratio', value: 'aspectRatio' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        updateState({ sortBy: opt.value as any });
                        setIsSortOpen(false);
                      }}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm',
                        state.sortBy === opt.value
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-300 hover:bg-white/5'
                      )}
                    >
                      {opt.label}
                      {state.sortBy === opt.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
                <div className="my-2 border-t border-white/10" />
                <div className="space-y-1">
                  <div className="px-2 py-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    Order
                  </div>
                  {[
                    { label: 'Ascending', value: 'asc' },
                    { label: 'Descending', value: 'desc' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        updateState({ sortOrder: opt.value as any });
                        setIsSortOpen(false);
                      }}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm',
                        state.sortOrder === opt.value
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-300 hover:bg-white/5'
                      )}
                    >
                      {opt.label}
                      {state.sortOrder === opt.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Filter Button */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            state.filterType.length > 0 ||
              state.filterMediaType.length > 0 ||
              state.filterAspectRatio.length > 0 ||
              state.filterTags.length > 0 ||
              state.filterSessions.length > 0
              ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
              : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
          )}
        >
          <Filter className="h-4 w-4" />
          Filter
          {(state.filterType.length > 0 ||
            state.filterMediaType.length > 0 ||
            state.filterAspectRatio.length > 0 ||
            state.filterTags.length > 0 ||
            state.filterSessions.length > 0) && (
            <span className="rounded-full bg-blue-500 px-1.5 text-[10px] text-white">
              {state.filterType.length +
                state.filterMediaType.length +
                state.filterAspectRatio.length +
                state.filterTags.length +
                state.filterSessions.length}
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
                className="absolute top-full right-0 z-50 mt-2 flex max-h-[80vh] w-64 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 p-3">
                  <span className="text-sm font-bold text-white">Filters</span>
                  {(state.filterType.length > 0 ||
                    state.filterMediaType.length > 0 ||
                    state.filterAspectRatio.length > 0 ||
                    state.filterTags.length > 0 ||
                    state.filterSessions.length > 0) && (
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
                      {['image', 'video'].map(type => (
                        <label
                          key={type}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={state.filterMediaType.includes(type)}
                            onChange={() => toggleFilter('filterMediaType', type)}
                            className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                          />
                          <span className="text-sm text-gray-300 capitalize">{type}</span>
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
                      {['16:9', '9:16', '1:1', '2.35:1', '4:3'].map(ratio => (
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
  );
}

'use client';

/**
 * GenerationSearch Component - Visual Librarian
 *
 * Professional search interface for finding generations using cinematic terminology.
 * Features:
 * - Smart suggestion pills based on indexed content
 * - Reality vs Intent search mode toggle
 * - Cinematic terminology recognition (ECU, Low-Key, Anamorphic, etc.)
 * - Sort and Filter controls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  Eye,
  Wand2,
  SlidersHorizontal,
  AlertTriangle,
  SortAsc,
  SortDesc,
  Image,
  Film,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface IndexStats {
  total: number;
  indexed: number;
  pending: number;
  failed: number;
}

interface SuggestionPill {
  label: string;
  category: string;
  count: number;
}

type SearchMode = 'combined' | 'reality' | 'intent';
type SortBy = 'date' | 'score' | 'name';
type SortOrder = 'asc' | 'desc';

export interface GenerationSortFilterState {
  sortBy: SortBy;
  sortOrder: SortOrder;
  filterMediaType: ('image' | 'video')[];
  filterStatus: ('succeeded' | 'failed' | 'processing')[];
  filterAspectRatio: string[];
}

interface GenerationSearchProps {
  projectId: string;
  onSearchResults: (results: any[], query: string) => void;
  onClearSearch: () => void;
  onSelectAll?: () => void;
  onSortFilterChange?: (state: GenerationSortFilterState) => void;
}

export function GenerationSearch({
  projectId,
  onSearchResults,
  onClearSearch,
  onSelectAll,
  onSortFilterChange,
}: GenerationSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionPill[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('combined');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sort & Filter State
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortFilter, setSortFilter] = useState<GenerationSortFilterState>({
    sortBy: 'date',
    sortOrder: 'desc',
    filterMediaType: [],
    filterStatus: [],
    filterAspectRatio: [],
  });

  // Notify parent when sort/filter changes
  const updateSortFilter = (updates: Partial<GenerationSortFilterState>) => {
    const newState = { ...sortFilter, ...updates };
    setSortFilter(newState);
    onSortFilterChange?.(newState);
  };

  const toggleFilter = <K extends keyof GenerationSortFilterState>(
    category: K,
    value: GenerationSortFilterState[K] extends (infer U)[] ? U : never
  ) => {
    const current = sortFilter[category] as any[];
    const updated = current.includes(value)
      ? current.filter((item: any) => item !== value)
      : [...current, value];
    updateSortFilter({ [category]: updated } as Partial<GenerationSortFilterState>);
  };

  const activeFilterCount =
    sortFilter.filterMediaType.length +
    sortFilter.filterStatus.length +
    sortFilter.filterAspectRatio.length;

  // Load index stats and suggestions on mount
  useEffect(() => {
    fetchStats();
    fetchSuggestions();
  }, [projectId]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/search/suggestions`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/search/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch index stats:', err);
    }
  };

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        onClearSearch();
        return;
      }

      setIsSearching(true);
      try {
        // Build URL based on search mode
        let url: string;
        if (searchMode === 'reality') {
          url = `${BACKEND_URL}/api/projects/${projectId}/search/reality?q=${encodeURIComponent(searchQuery)}&limit=100`;
        } else if (searchMode === 'intent') {
          url = `${BACKEND_URL}/api/projects/${projectId}/search/intent?q=${encodeURIComponent(searchQuery)}&limit=100`;
        } else {
          url = `${BACKEND_URL}/api/projects/${projectId}/search?q=${encodeURIComponent(searchQuery)}&limit=100`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          onSearchResults(data.results, searchQuery);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, onSearchResults, onClearSearch, searchMode]
  );

  // Debounced search as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length === 0) {
      onClearSearch();
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      performSearch(query);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleClear = () => {
    setQuery('');
    onClearSearch();
    inputRef.current?.focus();
  };

  const handlePillClick = (label: string) => {
    setQuery(label);
    performSearch(label);
  };

  const handleBatchIndex = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/search/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 20 }),
      });
      if (res.ok) {
        await fetchStats();
        await fetchSuggestions();
      }
    } catch (err) {
      console.error('Batch index failed:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  const indexPercentage = stats ? Math.round((stats.indexed / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <TooltipProvider>
    <div className="space-y-2">
      {/* Row 1: Generate title + Search Bar + Index Badge + Sort + Filter */}
      <div className="flex items-center gap-4">
        {/* Generate Title - fixed width to ensure Row 2 alignment */}
        <h1 className="w-[141px] shrink-0 text-3xl font-bold tracking-tight">Generate</h1>

        {/* Search Input - Takes remaining space */}
        <div className="relative min-w-0 flex-1">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-white/40">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search... (e.g., 'ECU shallow depth neon')"
            className="w-full rounded-lg border border-white/10 bg-zinc-900/80 py-2 pr-10 pl-10 text-sm text-white placeholder-white/40 transition-all focus:border-white/20 focus:outline-none"
          />

          {query && (
            <button
              onClick={handleClear}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Index Status Badge - Black/white box with colored icon */}
        <Tooltip
          content={
            isIndexing
              ? 'Indexing...'
              : stats
                ? `${stats.indexed}/${stats.total} indexed${stats.failed > 0 ? `, ${stats.failed} failed` : ''}. Click to index remaining.`
                : 'Loading...'
          }
          side="top"
        >
          <button
            onClick={handleBatchIndex}
            disabled={isIndexing}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isIndexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
            ) : stats && stats.failed > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            ) : indexPercentage === 100 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            )}
            {indexPercentage}%
          </button>
        </Tooltip>

        {/* Sort & Filter Button Group - gap-2 for tighter spacing */}
        <div className="flex shrink-0 items-center gap-2">
        {/* Sort Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            {sortFilter.sortOrder === 'asc' ? (
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
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 z-50 mt-2 flex w-64 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-3">
                    <span className="text-sm font-bold text-white">Sort</span>
                  </div>
                  <div className="space-y-4 overflow-y-auto p-2">
                    {/* Sort By */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Sort By
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'Date', value: 'date' },
                          { label: 'Relevance', value: 'score' },
                          { label: 'Name', value: 'name' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={sortFilter.sortBy === opt.value}
                              onChange={() => updateSortFilter({ sortBy: opt.value as SortBy })}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className={clsx('text-sm', sortFilter.sortBy === opt.value ? 'text-blue-400' : 'text-gray-300')}>
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Order */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Order
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'Newest First', value: 'desc' },
                          { label: 'Oldest First', value: 'asc' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={sortFilter.sortOrder === opt.value}
                              onChange={() => updateSortFilter({ sortOrder: opt.value as SortOrder })}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className={clsx('text-sm', sortFilter.sortOrder === opt.value ? 'text-blue-400' : 'text-gray-300')}>
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
              'flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition-colors',
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
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 z-50 mt-2 flex max-h-[80vh] w-64 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 p-3">
                    <span className="text-sm font-bold text-white">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() =>
                          updateSortFilter({
                            filterMediaType: [],
                            filterStatus: [],
                            filterAspectRatio: [],
                          })
                        }
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 overflow-y-auto p-2">
                    {/* Media Type */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
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
                              checked={sortFilter.filterMediaType.includes(opt.value as 'image' | 'video')}
                              onChange={() => toggleFilter('filterMediaType', opt.value as 'image' | 'video')}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <opt.icon className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-300">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        Status
                      </div>
                      <div className="space-y-1">
                        {[
                          { value: 'succeeded', label: 'Completed', color: 'text-green-400' },
                          { value: 'processing', label: 'Processing', color: 'text-amber-400' },
                          { value: 'failed', label: 'Failed', color: 'text-red-400' },
                        ].map(opt => (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={sortFilter.filterStatus.includes(opt.value as any)}
                              onChange={() => toggleFilter('filterStatus', opt.value as any)}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className={clsx('text-sm', opt.color)}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <div className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-500">
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
                              checked={sortFilter.filterAspectRatio.includes(ratio)}
                              onChange={() => toggleFilter('filterAspectRatio', ratio)}
                              className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-gray-300">{ratio}</span>
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
        </div>
      </div>

      {/* Row 2: Reality/Both/Intent Toggle + Suggestion Pills + Select All */}
      {/* Uses same structure as Row 1: invisible spacer (141px) + gap (16px) = 157px offset */}
      <div className="flex items-center gap-4">
        {/* Invisible spacer matching title width */}
        <div className="w-[141px] shrink-0" />
        {/* Actual Row 2 content */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Reality / Both / Intent Toggle */}
        <div className="flex shrink-0 items-center rounded-lg border border-white/10 bg-zinc-900/80 p-0.5">
          <Tooltip content="Search what AI actually generated (visual analysis)" side="top">
            <button
              onClick={() => setSearchMode('reality')}
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                searchMode === 'reality'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Eye className="h-3 w-3" />
              Reality
            </button>
          </Tooltip>
          <Tooltip content="Search both visual content and prompts" side="top">
            <button
              onClick={() => setSearchMode('combined')}
              className={clsx(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                searchMode === 'combined'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              Both
            </button>
          </Tooltip>
          <Tooltip content="Search what you prompted (user intent)" side="top">
            <button
              onClick={() => setSearchMode('intent')}
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                searchMode === 'intent'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Wand2 className="h-3 w-3" />
              Intent
            </button>
          </Tooltip>
        </div>

        {/* Suggestion Pills - Same height as Reality/Both/Intent toggle */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
          {suggestions.slice(0, 8).map((pill, i) => (
            <button
              key={i}
              onClick={() => handlePillClick(pill.label)}
              className="shrink-0 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Select All Button - Same size as Sort/Filter buttons */}
        {onSelectAll && (
          <button
            onClick={onSelectAll}
            className="flex min-w-[90px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-400 transition-colors hover:bg-sky-500/20"
          >
            Select All
          </button>
        )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

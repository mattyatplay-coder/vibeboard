'use client';

/**
 * GenerationSearch Component
 *
 * Natural language search bar for finding generations by visual content.
 * Uses semantic indexing to search by subjects, colors, mood, etc.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, Database, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface IndexStats {
  total: number;
  indexed: number;
  pending: number;
}

interface GenerationSearchProps {
  projectId: string;
  onSearchResults: (results: any[], query: string) => void;
  onClearSearch: () => void;
}

export function GenerationSearch({
  projectId,
  onSearchResults,
  onClearSearch,
}: GenerationSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load index stats on mount
  useEffect(() => {
    fetchStats();
  }, [projectId]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`search-history-${projectId}`);
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, [projectId]);

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
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/search?q=${encodeURIComponent(searchQuery)}&limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          onSearchResults(data.results, searchQuery);

          // Save to recent searches
          const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(
            0,
            5
          );
          setRecentSearches(newRecent);
          localStorage.setItem(`search-history-${projectId}`, JSON.stringify(newRecent));
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, onSearchResults, recentSearches, onClearSearch]
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

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
    setShowStats(false);
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
        const data = await res.json();
        console.log('Batch index result:', data);
        // Refresh stats after indexing
        await fetchStats();
      }
    } catch (err) {
      console.error('Batch index failed:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  const indexPercentage = stats ? Math.round((stats.indexed / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
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
            onFocus={() => setShowStats(true)}
            onBlur={() => setTimeout(() => setShowStats(false), 200)}
            placeholder="Search by visual content... (e.g., 'red dress beach')"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-10 pl-10 text-sm text-white placeholder-white/40 transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
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

        {/* Index Status Button */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/10"
          title="Index Status"
        >
          <Database className="h-4 w-4 text-purple-400" />
          {stats && (
            <span
              className={`text-xs ${indexPercentage === 100 ? 'text-green-400' : 'text-amber-400'}`}
            >
              {indexPercentage}%
            </span>
          )}
        </button>
      </div>

      {/* Stats Dropdown */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border border-white/10 bg-zinc-900/95 shadow-xl"
          >
            {/* Index Stats */}
            {stats && (
              <div className="border-b border-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-white/60">Visual Index</span>
                  <button
                    onClick={handleBatchIndex}
                    disabled={isIndexing || stats.pending === 0}
                    className="flex items-center gap-1 text-xs text-purple-400 transition-colors hover:text-purple-300 disabled:cursor-not-allowed disabled:text-white/30"
                  >
                    {isIndexing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Index {stats.pending} remaining
                      </>
                    )}
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      indexPercentage === 100 ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${indexPercentage}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-white/40">
                  <span>{stats.indexed} indexed</span>
                  <span>{stats.total} total</span>
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-2">
                <div className="mb-1 px-2 text-xs text-white/40">Recent Searches</div>
                {recentSearches.map((recent, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(recent)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-white/80 transition-colors hover:bg-white/10"
                  >
                    <Search className="h-3 w-3 text-white/40" />
                    {recent}
                  </button>
                ))}
              </div>
            )}

            {/* Search Tips */}
            <div className="border-t border-white/5 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-white/40">
                <Sparkles className="h-3 w-3 text-purple-400" />
                Search Tips
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-white/60">
                <span>• "woman red dress"</span>
                <span>• "moody lighting"</span>
                <span>• "beach sunset"</span>
                <span>• "close-up portrait"</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

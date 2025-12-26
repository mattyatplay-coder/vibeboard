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

export function GenerationSearch({ projectId, onSearchResults, onClearSearch }: GenerationSearchProps) {
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

    const performSearch = useCallback(async (searchQuery: string) => {
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
                const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
                setRecentSearches(newRecent);
                localStorage.setItem(`search-history-${projectId}`, JSON.stringify(newRecent));
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, [projectId, onSearchResults, recentSearches, onClearSearch]);

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
                body: JSON.stringify({ batchSize: 20 })
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
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
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
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm
                                   text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50
                                   focus:border-purple-500/50 transition-all"
                    />

                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Index Status Button */}
                <button
                    onClick={() => setShowStats(!showStats)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                               hover:bg-white/10 transition-colors text-sm"
                    title="Index Status"
                >
                    <Database className="w-4 h-4 text-purple-400" />
                    {stats && (
                        <span className={`text-xs ${indexPercentage === 100 ? 'text-green-400' : 'text-amber-400'}`}>
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
                        className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 border border-white/10
                                   rounded-lg shadow-xl z-50 overflow-hidden"
                    >
                        {/* Index Stats */}
                        {stats && (
                            <div className="p-3 border-b border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-white/60">Visual Index</span>
                                    <button
                                        onClick={handleBatchIndex}
                                        disabled={isIndexing || stats.pending === 0}
                                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300
                                                   disabled:text-white/30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isIndexing ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Indexing...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-3 h-3" />
                                                Index {stats.pending} remaining
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            indexPercentage === 100 ? 'bg-green-500' : 'bg-purple-500'
                                        }`}
                                        style={{ width: `${indexPercentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-white/40">
                                    <span>{stats.indexed} indexed</span>
                                    <span>{stats.total} total</span>
                                </div>
                            </div>
                        )}

                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="p-2">
                                <div className="text-xs text-white/40 px-2 mb-1">Recent Searches</div>
                                {recentSearches.map((recent, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleRecentClick(recent)}
                                        className="w-full text-left px-2 py-1.5 rounded text-sm text-white/80
                                                   hover:bg-white/10 transition-colors flex items-center gap-2"
                                    >
                                        <Search className="w-3 h-3 text-white/40" />
                                        {recent}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search Tips */}
                        <div className="p-3 bg-white/5 border-t border-white/5">
                            <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
                                <Sparkles className="w-3 h-3 text-purple-400" />
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

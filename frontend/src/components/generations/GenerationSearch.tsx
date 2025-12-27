'use client';

/**
 * GenerationSearch Component - Visual Librarian
 *
 * Natural language search bar for finding generations by visual content.
 * Uses semantic indexing with CINEMATIC terminology support.
 *
 * Features:
 * - Smart suggestion pills (ECU, Wide Shot, Chiaroscuro, etc.)
 * - Enhanced stats with failed/skipped breakdown
 * - Retry failed indexing
 * - Search history
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, Loader2, Sparkles, Database, RefreshCw, AlertTriangle, Eye, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Search mode: search by visual content (reality) or by input prompt (intent)
export type SearchMode = 'reality' | 'intent' | 'both';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Cinematic suggestion pills - professional terminology
const CINEMATIC_SUGGESTIONS = [
    { label: 'Close-Up', query: 'close-up', category: 'framing' },
    { label: 'Wide Shot', query: 'wide shot', category: 'framing' },
    { label: 'ECU', query: 'ECU extreme close-up', category: 'framing' },
    { label: 'Shallow DOF', query: 'shallow depth of field', category: 'lens' },
    { label: 'Anamorphic', query: 'anamorphic lens flare', category: 'lens' },
    { label: 'Golden Hour', query: 'golden hour warm', category: 'lighting' },
    { label: 'Silhouette', query: 'silhouette backlit', category: 'lighting' },
    { label: 'Rim-lit', query: 'rim-lit dramatic', category: 'lighting' },
    { label: 'Chiaroscuro', query: 'chiaroscuro dramatic shadows', category: 'lighting' },
    { label: 'Neon', query: 'neon blue lighting', category: 'lighting' },
    { label: 'Moody', query: 'moody dramatic', category: 'mood' },
    { label: 'Ethereal', query: 'ethereal soft dreamy', category: 'mood' },
];

interface IndexStats {
    total: number;
    indexed: number;
    pending: number;
    failed?: number;
    skipped?: number;
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
    const [isRetrying, setIsRetrying] = useState(false);
    const [stats, setStats] = useState<IndexStats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [searchMode, setSearchMode] = useState<SearchMode>('both');
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Load index stats on mount
    useEffect(() => {
        fetchStats();
        fetchSuggestions();
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

    const fetchSuggestions = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/search/suggestions`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (err) {
            // Silently fail - use default suggestions
        }
    };

    const performSearch = useCallback(
        async (searchQuery: string, mode: SearchMode = searchMode) => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                onClearSearch();
                return;
            }

            setIsSearching(true);
            try {
                // Include search mode in query params
                const res = await fetch(
                    `${BACKEND_URL}/api/projects/${projectId}/search?q=${encodeURIComponent(searchQuery)}&limit=100&mode=${mode}`
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
        [projectId, onSearchResults, recentSearches, onClearSearch, searchMode]
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

    const handleSuggestionClick = (suggestionQuery: string) => {
        setQuery(suggestionQuery);
        performSearch(suggestionQuery);
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

    const handleRetryFailed = async () => {
        setIsRetrying(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}/search/retry-failed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchSize: 10 }),
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Retry failed result:', data);
                await fetchStats();
            }
        } catch (err) {
            console.error('Retry failed:', err);
        } finally {
            setIsRetrying(false);
        }
    };

    const indexPercentage = stats ? Math.round((stats.indexed / Math.max(stats.total, 1)) * 100) : 0;
    const hasFailed = stats?.failed && stats.failed > 0;

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
                        placeholder="Search... (e.g., 'ECU shallow depth neon')"
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

                {/* Index Status Button - uses h-8 sizing contract for toolbar alignment */}
                <button
                    onClick={() => setShowStats(!showStats)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm leading-none transition-colors ${
                        hasFailed
                            ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                    title="Index Status"
                >
                    {hasFailed ? (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : (
                        <Database className="h-4 w-4 text-purple-400" />
                    )}
                    {stats && (
                        <span
                            className={`text-xs ${
                                indexPercentage === 100 ? 'text-green-400' : hasFailed ? 'text-amber-400' : 'text-purple-400'
                            }`}
                        >
                            {indexPercentage}%
                        </span>
                    )}
                </button>
            </div>

            {/* Reality vs Intent Toggle + Cinematic Suggestion Pills */}
            <div className="mt-2 flex items-center gap-3">
                {/* Search Mode Toggle */}
                <div className="flex items-center overflow-hidden rounded-lg border border-white/10 text-xs">
                    <button
                        onClick={() => {
                            setSearchMode('reality');
                            if (query) performSearch(query, 'reality');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 transition-all ${
                            searchMode === 'reality'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-gray-500 hover:bg-white/5'
                        }`}
                        title="Search by what was generated (visual analysis)"
                    >
                        <Eye className="h-3 w-3" />
                        <span>Reality</span>
                    </button>
                    <button
                        onClick={() => {
                            setSearchMode('both');
                            if (query) performSearch(query, 'both');
                        }}
                        className={`border-x border-white/10 px-2.5 py-1 transition-all ${
                            searchMode === 'both'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'text-gray-500 hover:bg-white/5'
                        }`}
                        title="Search both prompt and visual content"
                    >
                        Both
                    </button>
                    <button
                        onClick={() => {
                            setSearchMode('intent');
                            if (query) performSearch(query, 'intent');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 transition-all ${
                            searchMode === 'intent'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'text-gray-500 hover:bg-white/5'
                        }`}
                        title="Search by what was prompted (input text)"
                    >
                        <Wand2 className="h-3 w-3" />
                        <span>Intent</span>
                    </button>
                </div>

                {/* Cinematic Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5">
                    {CINEMATIC_SUGGESTIONS.slice(0, 6).map((suggestion, i) => (
                        <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion.query)}
                            className={`rounded-full px-2.5 py-0.5 text-xs transition-all hover:scale-105 ${
                                suggestion.category === 'framing'
                                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                    : suggestion.category === 'lighting'
                                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                    : suggestion.category === 'lens'
                                    ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                        >
                            {suggestion.label}
                        </button>
                    ))}
                </div>
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
                                    <span className="text-xs text-white/60">Visual Librarian Index</span>
                                    <div className="flex gap-2">
                                        {hasFailed && (
                                            <button
                                                onClick={handleRetryFailed}
                                                disabled={isRetrying}
                                                className="flex items-center gap-1 text-xs text-amber-400 transition-colors hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isRetrying ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Retrying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Retry {stats.failed} failed
                                                    </>
                                                )}
                                            </button>
                                        )}
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
                                                    Index {stats.pending} pending
                                                </>
                                            )}
                                        </button>
                                    </div>
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
                                    <span>
                                        {stats.pending} pending
                                        {hasFailed && <span className="text-amber-400"> · {stats.failed} failed</span>}
                                    </span>
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

                        {/* Cinematic Search Tips */}
                        <div className="border-t border-white/5 bg-white/5 p-3">
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-white/40">
                                <Sparkles className="h-3 w-3 text-purple-400" />
                                Cinematic Search Examples
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-white/60">
                                <span>• "ECU shallow depth"</span>
                                <span>• "wide shot silhouette"</span>
                                <span>• "chiaroscuro dramatic"</span>
                                <span>• "anamorphic lens flare"</span>
                                <span>• "golden hour warm"</span>
                                <span>• "rim-lit moody"</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

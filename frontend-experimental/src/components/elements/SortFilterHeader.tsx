import { useState } from "react";
import { Filter, SortAsc, SortDesc, Check, X, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

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
}

export function SortFilterHeader({ state, onChange, availableTags, availableSessions }: SortFilterHeaderProps) {
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
        <div className="flex items-center gap-2 relative">
            {/* Sort Button */}
            <div className="relative">
                <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                    {state.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
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
                                className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden p-2"
                            >
                                <div className="space-y-1">
                                    <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Sort By</div>
                                    {[
                                        { label: 'Name', value: 'name' },
                                        { label: 'Type', value: 'type' },
                                        { label: 'Aspect Ratio', value: 'aspectRatio' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                updateState({ sortBy: opt.value as any });
                                                setIsSortOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between",
                                                state.sortBy === opt.value ? "bg-blue-500/20 text-blue-400" : "text-gray-300 hover:bg-white/5"
                                            )}
                                        >
                                            {opt.label}
                                            {state.sortBy === opt.value && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="my-2 border-t border-white/10" />
                                <div className="space-y-1">
                                    <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Order</div>
                                    {[
                                        { label: 'Ascending', value: 'asc' },
                                        { label: 'Descending', value: 'desc' }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                updateState({ sortOrder: opt.value as any });
                                                setIsSortOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between",
                                                state.sortOrder === opt.value ? "bg-blue-500/20 text-blue-400" : "text-gray-300 hover:bg-white/5"
                                            )}
                                        >
                                            {opt.label}
                                            {state.sortOrder === opt.value && <Check className="w-3 h-3" />}
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
                        "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors",
                        (state.filterType.length > 0 || state.filterMediaType.length > 0 || state.filterAspectRatio.length > 0 || state.filterTags.length > 0 || state.filterSessions.length > 0)
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    Filter
                    {(state.filterType.length > 0 || state.filterMediaType.length > 0 || state.filterAspectRatio.length > 0 || state.filterTags.length > 0 || state.filterSessions.length > 0) && (
                        <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">
                            {state.filterType.length + state.filterMediaType.length + state.filterAspectRatio.length + state.filterTags.length + state.filterSessions.length}
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
                                className="absolute right-0 top-full mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
                            >
                                <div className="p-3 border-b border-white/10 flex justify-between items-center">
                                    <span className="text-sm font-bold text-white">Filters</span>
                                    {(state.filterType.length > 0 || state.filterMediaType.length > 0 || state.filterAspectRatio.length > 0 || state.filterTags.length > 0 || state.filterSessions.length > 0) && (
                                        <button
                                            onClick={() => onChange({ ...state, filterType: [], filterMediaType: [], filterAspectRatio: [], filterTags: [], filterSessions: [] })}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-y-auto p-2 space-y-4">
                                    {/* Sessions */}
                                    {availableSessions.length > 0 && (
                                        <div>
                                            <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sessions</div>
                                            <div className="space-y-1">
                                                {availableSessions.map(session => (
                                                    <label key={session.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={state.filterSessions.includes(session.id)}
                                                            onChange={() => toggleFilter('filterSessions', session.id)}
                                                            className="rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                                                        />
                                                        <span className="text-sm text-gray-300 truncate">{session.name}</span>
                                                    </label>
                                                ))}
                                                {/* Option for Unassigned */}
                                                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer">
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
                                    <div>
                                        <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Element Type</div>
                                        <div className="space-y-1">
                                            {[
                                                { value: 'character', label: 'Character' },
                                                { value: 'prop', label: 'Object' },
                                                { value: 'place', label: 'Location' },
                                                { value: 'image', label: 'Image' },
                                                { value: 'video', label: 'Video' }
                                            ].map(opt => (
                                                <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer">
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

                                    {/* Media Type */}
                                    <div>
                                        <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Media Type</div>
                                        <div className="space-y-1">
                                            {['image', 'video'].map(type => (
                                                <label key={type} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer">
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
                                        <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Aspect Ratio</div>
                                        <div className="space-y-1">
                                            {['16:9', '9:16', '1:1', '2.35:1', '4:3'].map(ratio => (
                                                <label key={ratio} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer">
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
                                            <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tags</div>
                                            <div className="flex flex-wrap gap-1 px-2">
                                                {availableTags.map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => toggleFilter('filterTags', tag)}
                                                        className={clsx(
                                                            "px-2 py-1 rounded-full text-xs border transition-colors",
                                                            state.filterTags.includes(tag)
                                                                ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
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

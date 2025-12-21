import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Image as ImageIcon, Video, User, Crown, Wand2, Sparkles, Filter, Check, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_MODELS, ModelInfo, ModelCapability, PROVIDER_DEFINITIONS } from '@/lib/ModelRegistry';

interface EngineLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModelId: string;
    onSelect: (model: ModelInfo) => void;
    initialCategory?: ModelCapability | 'all';
}

const CATEGORIES: { id: ModelCapability | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Engines', icon: Sparkles },
    { id: 'text-to-image', label: 'Image Generation', icon: ImageIcon },
    { id: 'text-to-video', label: 'Text to Video', icon: Video },
    { id: 'image-to-video', label: 'Animation (I2V)', icon: Video },
    { id: 'avatar', label: 'Character & Avatar', icon: User },
    // { id: 'image-editing', label: 'Image Edit/Upscale', icon: Wand2 },
    // { id: 'video-editing', label: 'Video Edit/Inpaint', icon: Wand2 },
];

export function EngineLibraryModal({ isOpen, onClose, currentModelId, onSelect, initialCategory = 'all' }: EngineLibraryModalProps) {
    const [favorites, setFavorites] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('vibeboard_model_favorites');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    const toggleFavorite = (e: React.MouseEvent, modelId: string) => {
        e.stopPropagation();
        setFavorites(prev => {
            const next = prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId];
            localStorage.setItem('vibeboard_model_favorites', JSON.stringify(next));
            return next;
        });
    };

    // Filters
    const [filters, setFilters] = useState({
        capability: 'all',
        maker: 'all',
        provider: 'all',
        favorites: false
    });

    useEffect(() => {
        if (isOpen && initialCategory) {
            setFilters(prev => ({
                ...prev,
                capability: initialCategory === 'all' ? 'all' : initialCategory,
                favorites: false // reset favorites on open
            }));
        }
    }, [isOpen, initialCategory]);

    const [searchQuery, setSearchQuery] = useState('');

    // Toggle logic for sections
    const [expandedSections, setExpandedSections] = useState({
        useCase: true,
        maker: true,
        provider: true
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const filteredModels = useMemo(() => {
        return ALL_MODELS.filter(model => {
            // favorites check
            if (filters.favorites && !favorites.includes(model.id)) return false;

            // capability check
            if (filters.capability !== 'all' && model.capability !== filters.capability) return false;

            // maker check
            if (filters.maker !== 'all' && model.maker !== filters.maker) return false;

            // provider check
            if (filters.provider !== 'all' && model.provider !== filters.provider) return false;

            // search check
            const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                model.maker.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch;
        });
    }, [filters, searchQuery, favorites]);

    // Unique Counts for Sidebar
    const getCount = (key: 'capability' | 'maker' | 'provider', value: string) => {
        return ALL_MODELS.filter(m => m[key] === value).length;
    };

    const uniqueMakers = Array.from(new Set(ALL_MODELS.map(m => m.maker))).sort();
    const uniqueProviders = Array.from(new Set(ALL_MODELS.map(m => m.provider))).sort();

    const handleSelect = (model: ModelInfo) => {
        onSelect(model);
        onClose();
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 pb-4">
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
                        className="relative w-full max-w-6xl h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        < div className="w-64 bg-black/40 border-r border-white/5 flex flex-col overflow-y-auto scrollbar-none" >
                            <div className="p-4 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Models</h2>
                                </div>
                            </div>

                            <div className="p-2 space-y-1">
                                {/* Favorites Toggle */}
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, favorites: !prev.favorites }))}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left mb-2",
                                        filters.favorites
                                            ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Crown className={clsx("w-4 h-4", filters.favorites && "fill-current")} />
                                    <span>My Favorites</span>
                                    {favorites.length > 0 && <span className="ml-auto text-xs opacity-60 bg-black/20 px-1.5 rounded">{favorites.length}</span>}
                                </button>

                                {/* Capability Section */}
                                <div className="mb-2">
                                    <button
                                        onClick={() => toggleSection('useCase')}
                                        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2 hover:text-white"
                                    >
                                        <span>Use Case</span>
                                        {expandedSections.useCase ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>

                                    {expandedSections.useCase && (
                                        <div className="space-y-0.5">
                                            <button
                                                onClick={() => setFilters(p => ({ ...p, capability: 'all' }))}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-all",
                                                    filters.capability === 'all' ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <span>All Uses</span>
                                            </button>
                                            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setFilters(p => ({ ...p, capability: cat.id as any }))}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all group",
                                                        filters.capability === cat.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <cat.icon className="w-3 h-3 opacity-70" />
                                                    <span className="truncate">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Maker Section */}
                                <div className="mb-2 border-t border-white/5 pt-2">
                                    <button
                                        onClick={() => toggleSection('maker')}
                                        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2 hover:text-white"
                                    >
                                        <span>Maker</span>
                                        {expandedSections.maker ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                    {expandedSections.maker && (
                                        <div className="space-y-0.5">
                                            <button
                                                onClick={() => setFilters(p => ({ ...p, maker: 'all' }))}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-all",
                                                    filters.maker === 'all' ? "bg-white/10 text-white border border-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <span>All Makers</span>
                                            </button>
                                            {uniqueMakers.map(maker => (
                                                <button
                                                    key={maker}
                                                    onClick={() => setFilters(p => ({ ...p, maker: maker as any }))}
                                                    className={clsx(
                                                        "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-all",
                                                        filters.maker === maker ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="truncate">{maker}</span>
                                                    <span className="text-[10px] opacity-50">{getCount('maker', maker)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Provider Section */}
                                <div className="mb-2 border-t border-white/5 pt-2">
                                    <button
                                        onClick={() => toggleSection('provider')}
                                        className="w-full flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2 hover:text-white"
                                    >
                                        <span>Provider</span>
                                        {expandedSections.provider ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                    {expandedSections.provider && (
                                        <div className="space-y-0.5">
                                            <button
                                                onClick={() => setFilters(p => ({ ...p, provider: 'all' }))}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-all",
                                                    filters.provider === 'all' ? "bg-white/10 text-white border border-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <span>All Providers</span>
                                            </button>
                                            {uniqueProviders.map(provider => {
                                                const pDef = PROVIDER_DEFINITIONS[provider];
                                                return (
                                                    <button
                                                        key={provider}
                                                        onClick={() => setFilters(p => ({ ...p, provider: provider as any }))}
                                                        className={clsx(
                                                            "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all",
                                                            filters.provider === provider ? "bg-white/10 text-white border border-white/10" : "text-gray-400 hover:text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        {pDef?.icon && <pDef.icon className={clsx("w-3 h-3", pDef.color)} />}
                                                        <span className="truncate">{pDef?.name || provider}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div >

                        {/* Main Content */}
                        < div className="flex-1 flex flex-col bg-gradient-to-br from-[#0A0A0A] to-[#111111]" >
                            {/* Header */}
                            < div className="h-16 border-b border-white/5 flex items-center px-6 justify-between gap-4" >
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search models..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>

                                {/* Active Filter Chips */}
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-[400px]">
                                    {filters.capability !== 'all' && (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30 whitespace-nowrap">
                                            {CATEGORIES.find(c => c.id === filters.capability)?.label}
                                            <button onClick={() => setFilters(p => ({ ...p, capability: 'all' }))}><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {filters.maker !== 'all' && (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30 whitespace-nowrap">
                                            {filters.maker}
                                            <button onClick={() => setFilters(p => ({ ...p, maker: 'all' }))}><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {filters.provider !== 'all' && (
                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 whitespace-nowrap">
                                            {PROVIDER_DEFINITIONS[filters.provider]?.name || filters.provider}
                                            <button onClick={() => setFilters(p => ({ ...p, provider: 'all' }))}><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                </div>

                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div >

                            {/* Grid */}
                            < div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredModels.map((model) => {
                                        const providerDef = PROVIDER_DEFINITIONS[model.provider];
                                        const isSelected = currentModelId === model.id;

                                        return (
                                            <div
                                                key={model.id}
                                                onClick={() => handleSelect(model)}
                                                className={clsx(
                                                    "relative group flex flex-col p-4 rounded-xl border transition-all cursor-pointer overflow-hidden",
                                                    isSelected
                                                        ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10"
                                                        : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 hover:shadow-xl"
                                                )}
                                            >
                                                <button
                                                    onClick={(e) => toggleFavorite(e, model.id)}
                                                    className={clsx(
                                                        "absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all opacity-0 group-hover:opacity-100",
                                                        favorites.includes(model.id) ? "opacity-100 text-yellow-400 bg-black/20" : "text-gray-500 hover:text-yellow-400 hover:bg-white/10"
                                                    )}
                                                >
                                                    <Crown className={clsx("w-4 h-4", favorites.includes(model.id) && "fill-current")} />
                                                </button>

                                                {/* Provider Pill */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className={clsx("flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border border-white/5", providerDef?.bgColor || 'bg-gray-800')}>
                                                        {providerDef?.icon && <providerDef.icon className={clsx("w-3 h-3", providerDef.color)} />}
                                                        <span className={clsx(providerDef?.color || "text-gray-300")}>{providerDef?.name || model.provider}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{model.name}</h3>
                                                <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">{model.desc || "No description available."}</p>

                                                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                                                    <span className={clsx(
                                                        "text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                                                        model.type === 'video' ? "bg-purple-500/20 text-purple-300" : "bg-emerald-500/20 text-emerald-300"
                                                    )}>
                                                        {model.type === 'video' ? 'Video' : 'Image'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                                        {model.maker}
                                                    </span>
                                                    {model.capability === 'avatar' && (
                                                        <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">Avatar</span>
                                                    )}
                                                </div>

                                                {/* Hover Effect Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </div>
                                        );
                                    })}
                                </div>
                                {
                                    filteredModels.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                            <Search className="w-8 h-8 mb-2 opacity-20" />
                                            <p>No models found matching filters</p>
                                        </div>
                                    )
                                }
                            </div >
                        </div >
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

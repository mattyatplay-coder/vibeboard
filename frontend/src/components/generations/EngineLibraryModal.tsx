import React, { useState, useMemo } from 'react';
import { X, Search, Image as ImageIcon, Video, User, Crown, Wand2, Sparkles, Filter, Check } from 'lucide-react';
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
            const next = prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId];
            localStorage.setItem('vibeboard_model_favorites', JSON.stringify(next));
            return next;
        });
    };

    const [selectedCategory, setSelectedCategory] = useState<ModelCapability | 'all' | 'favorites'>('all');

    // Update selected category when modal opens or initialCategory changes
    React.useEffect(() => {
        if (isOpen && initialCategory) {
            setSelectedCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);
    const [searchQuery, setSearchQuery] = useState('');

    // Infer mode from initialCategory
    const isVideoMode = initialCategory === 'text-to-video' || initialCategory === 'image-to-video';
    const isImageMode = initialCategory === 'text-to-image';

    const filteredModels = useMemo(() => {
        return ALL_MODELS.filter(model => {
            let matchesCategory = false;

            // Handle "All" - respect mode restrictions
            if (selectedCategory === 'all') {
                if (isVideoMode) matchesCategory = model.type === 'video';
                else if (isImageMode) matchesCategory = model.type === 'image';
                else matchesCategory = true;
            }
            else if (selectedCategory === 'favorites') {
                matchesCategory = favorites.includes(model.id);
                // Verify favorite matches mode too? Maybe safer to show all favorites or filter them too.
                // Let's filter favorites by mode too for consistency.
                if (matchesCategory) {
                    if (isVideoMode && model.type !== 'video') matchesCategory = false;
                    if (isImageMode && model.type !== 'image') matchesCategory = false;
                }
            }
            else matchesCategory = model.capability === selectedCategory;

            const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                model.provider.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery, favorites, isVideoMode, isImageMode]);

    // Filter categories for sidebar
    const displayedCategories = CATEGORIES.filter(cat => {
        if (cat.id === 'all') return true;
        if (isVideoMode) return ['text-to-video', 'image-to-video', 'video-editing'].includes(cat.id);
        if (isImageMode) return ['text-to-image', 'avatar', 'image-editing'].includes(cat.id);
        return true;
    });

    // Group by Capability if 'all' is selected, or just list
    // Actually, simple grid is better for now.

    const handleSelect = (model: ModelInfo) => {
        onSelect(model);
        onClose();
    };

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
                        className="relative w-full max-w-5xl h-[80vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-64 bg-black/40 border-r border-white/5 flex flex-col p-4">
                            <div className="flex items-center gap-2 mb-8 px-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Model Library</h2>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                                        selectedCategory === 'all'
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Sparkles className={clsx("w-4 h-4", selectedCategory === 'all' ? "text-white" : "text-gray-500")} />
                                    <span>All Engines</span>
                                </button>

                                <button
                                    onClick={() => setSelectedCategory('favorites')}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                                        selectedCategory === 'favorites'
                                            ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20"
                                            : "text-gray-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Crown className={clsx("w-4 h-4", selectedCategory === 'favorites' ? "text-white fill-current" : "text-gray-500")} />
                                    <span>Favorites</span>
                                </button>

                                <div className="my-2 border-t border-white/10" />

                                {displayedCategories.filter(c => c.id !== 'all').map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={clsx(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                                            selectedCategory === cat.id
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <cat.icon className={clsx("w-4 h-4", selectedCategory === cat.id ? "text-white" : "text-gray-500 group-hover:text-white")} />
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5">
                                <div className="px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <p className="text-xs text-blue-300 font-medium mb-1">Total Models</p>
                                    <p className="text-2xl font-bold text-blue-100">{ALL_MODELS.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0A0A0A] to-[#111111]">
                            {/* Header */}
                            <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between gap-4">
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
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Grid */}
                            <div className="flex-1 overflow-y-auto p-6">
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

                                                <div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
                                                    <span className={clsx(
                                                        "text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded",
                                                        model.type === 'video' ? "bg-purple-500/20 text-purple-300" : "bg-emerald-500/20 text-emerald-300"
                                                    )}>
                                                        {model.type === 'video' ? 'Video' : 'Image'}
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
                                {filteredModels.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <Search className="w-8 h-8 mb-2 opacity-20" />
                                        <p>No models found matching "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

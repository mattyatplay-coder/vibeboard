"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ChevronDown, Check, Sparkles, Ban, Plus, X, Search } from "lucide-react";
import {
    CAMERA_PRESETS,
    CameraPreset,
    CameraCategory,
    Genre,
    getAllPresets,
    getPresetById,
    getCategoryForPreset,
    TOTAL_PRESETS
} from "@/data/CameraPresets";
import {
    GENRE_TEMPLATES,
    getRecommendedCameraPresets,
    getAvoidedCameraPresets,
    isCameraPresetRecommended,
    isCameraPresetAvoided,
    getGenreOptions
} from "@/data/GenreTemplates";

interface CameraPresetSelectorProps {
    selectedPreset: string | null;
    onSelect: (preset: CameraPreset) => void;
    genre?: Genre | null;
    showGenreRecommendations?: boolean;
    allowMixing?: boolean; // Enable Higgsfield Mix style combining
    selectedMixPresets?: string[]; // For mixing mode
    onMixSelect?: (presets: string[]) => void;
    className?: string;
}

export function CameraPresetSelector({
    selectedPreset,
    onSelect,
    genre = null,
    showGenreRecommendations = true,
    allowMixing = false,
    selectedMixPresets = [],
    onMixSelect,
    className
}: CameraPresetSelectorProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [mixMode, setMixMode] = useState(false);

    const genreTemplate = genre ? GENRE_TEMPLATES[genre] : null;

    // Filter presets by search query
    const filteredPresets = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase();
        return getAllPresets().filter(preset =>
            preset.name.toLowerCase().includes(query) ||
            preset.description.toLowerCase().includes(query) ||
            preset.prompt.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Get recommended presets for current genre
    const recommendedPresets = useMemo(() => {
        if (!genre) return [];
        return getRecommendedCameraPresets(genre);
    }, [genre]);

    // Handle preset selection
    const handlePresetClick = (preset: CameraPreset) => {
        if (mixMode && allowMixing && onMixSelect) {
            // Mixing mode - toggle selection
            const newSelection = selectedMixPresets.includes(preset.id)
                ? selectedMixPresets.filter(id => id !== preset.id)
                : [...selectedMixPresets, preset.id].slice(0, 3); // Max 3 presets
            onMixSelect(newSelection);
        } else {
            // Normal mode - single selection
            onSelect(preset);
        }
    };

    // Get combined prompt for mixed presets
    const getMixedPrompt = () => {
        if (selectedMixPresets.length === 0) return "";
        return selectedMixPresets
            .map(id => getPresetById(id)?.prompt)
            .filter(Boolean)
            .join(", ");
    };

    // Render preset button
    const renderPresetButton = (preset: CameraPreset) => {
        const isSelected = mixMode
            ? selectedMixPresets.includes(preset.id)
            : selectedPreset === preset.id;
        const isRecommended = genre && isCameraPresetRecommended(preset.id, genre);
        const isAvoided = genre && isCameraPresetAvoided(preset.id, genre);

        return (
            <button
                key={preset.id}
                onClick={() => !isAvoided && handlePresetClick(preset)}
                disabled={isAvoided ?? false}
                title={preset.description}
                className={clsx(
                    "relative px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left",
                    isSelected
                        ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/25"
                        : isAvoided
                            ? "bg-red-500/5 border-red-500/20 text-gray-600 cursor-not-allowed opacity-50"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white"
                )}
            >
                <span className="block truncate">{preset.name}</span>
                {/* Indicators */}
                {isRecommended && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" title="Recommended for this genre" />
                )}
                {isAvoided && (
                    <Ban className="absolute -top-1 -right-1 w-3 h-3 text-red-400" />
                )}
                {isSelected && mixMode && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {selectedMixPresets.indexOf(preset.id) + 1}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className={clsx("space-y-3", className)}>
            {/* Header with search and mix toggle */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Camera Move
                    </h4>
                    <span className="text-[10px] text-gray-500">
                        ({TOTAL_PRESETS} presets)
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Search toggle */}
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={clsx(
                            "p-1.5 rounded-lg transition-colors",
                            showSearch ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                        title="Search presets"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </button>
                    {/* Mix mode toggle */}
                    {allowMixing && (
                        <button
                            onClick={() => {
                                setMixMode(!mixMode);
                                if (!mixMode) onMixSelect?.([]);
                            }}
                            className={clsx(
                                "px-2 py-1 rounded-lg text-[10px] font-medium transition-colors flex items-center gap-1",
                                mixMode
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"
                            )}
                            title="Combine multiple camera moves"
                        >
                            <Plus className="w-3 h-3" />
                            Mix
                        </button>
                    )}
                </div>
            </div>

            {/* Search input */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search camera moves..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mix mode preview */}
            <AnimatePresence>
                {mixMode && selectedMixPresets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-purple-400">
                                Camera Mix ({selectedMixPresets.length}/3)
                            </span>
                            <button
                                onClick={() => onMixSelect?.([])}
                                className="text-xs text-gray-400 hover:text-white"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {selectedMixPresets.map((id, index) => {
                                const preset = getPresetById(id);
                                return preset ? (
                                    <span
                                        key={id}
                                        className="px-2 py-0.5 bg-purple-500/20 rounded text-[10px] text-purple-300 flex items-center gap-1"
                                    >
                                        <span className="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                                            {index + 1}
                                        </span>
                                        {preset.name}
                                        <button
                                            onClick={() => onMixSelect?.(selectedMixPresets.filter(p => p !== id))}
                                            className="hover:text-white"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 italic">
                            {getMixedPrompt()}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Genre recommendations */}
            {showGenreRecommendations && genreTemplate && !searchQuery && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-medium text-green-400">
                            Recommended for {genreTemplate.name}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {recommendedPresets.slice(0, 6).map(presetId => {
                            const preset = getPresetById(presetId);
                            return preset ? (
                                <button
                                    key={presetId}
                                    onClick={() => handlePresetClick(preset)}
                                    className={clsx(
                                        "px-2 py-1 text-[10px] rounded-full border transition-colors",
                                        (selectedPreset === presetId || selectedMixPresets.includes(presetId))
                                            ? "bg-green-500 border-green-500 text-white"
                                            : "bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                                    )}
                                >
                                    {preset.name}
                                </button>
                            ) : null;
                        })}
                        {recommendedPresets.length > 6 && (
                            <span className="px-2 py-1 text-[10px] text-gray-500">
                                +{recommendedPresets.length - 6} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Search results */}
            {searchQuery && filteredPresets && (
                <div className="space-y-2">
                    <p className="text-xs text-gray-400">
                        {filteredPresets.length} results for "{searchQuery}"
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                        {filteredPresets.map(preset => renderPresetButton(preset))}
                    </div>
                </div>
            )}

            {/* Category grid */}
            {!searchQuery && (
                <>
                    <div className="grid grid-cols-5 gap-1.5">
                        {Object.entries(CAMERA_PRESETS).map(([key, category]) => (
                            <button
                                key={key}
                                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                                className={clsx(
                                    "p-2 rounded-lg border text-center transition-all",
                                    activeCategory === key
                                        ? "bg-white/10 border-white/30 text-white"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                )}
                                title={category.description}
                            >
                                <span className="text-base block">{category.icon}</span>
                                <span className="text-[9px] mt-0.5 block truncate">{category.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Expanded category presets */}
                    <AnimatePresence mode="wait">
                        {activeCategory && (
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-white flex items-center gap-2">
                                            <span>{CAMERA_PRESETS[activeCategory].icon}</span>
                                            {CAMERA_PRESETS[activeCategory].label}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {CAMERA_PRESETS[activeCategory].presets.length} presets
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mb-3">
                                        {CAMERA_PRESETS[activeCategory].description}
                                    </p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {CAMERA_PRESETS[activeCategory].presets.map(preset =>
                                            renderPresetButton(preset)
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            {/* Current selection display */}
            {selectedPreset && !mixMode && (
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-300 truncate">
                            {getPresetById(selectedPreset)?.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                            {getPresetById(selectedPreset)?.prompt}
                        </p>
                    </div>
                    <button
                        onClick={() => onSelect({ id: '', name: '', prompt: '', description: '', genres: [] })}
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                        title="Clear selection"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact version for inline use
// ═══════════════════════════════════════════════════════════════════════════

interface CameraPresetDropdownProps {
    selectedPreset: string | null;
    onSelect: (preset: CameraPreset) => void;
    genre?: Genre | null;
    className?: string;
}

export function CameraPresetDropdown({
    selectedPreset,
    onSelect,
    genre = null,
    className
}: CameraPresetDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedPresetData = selectedPreset ? getPresetById(selectedPreset) : null;
    const category = selectedPreset ? getCategoryForPreset(selectedPreset) : null;

    return (
        <div className={clsx("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-left flex items-center justify-between text-sm hover:bg-white/5 transition-colors"
            >
                <span className="flex items-center gap-2">
                    {category && <span>{category.icon}</span>}
                    <span className={selectedPresetData ? "text-white" : "text-gray-500"}>
                        {selectedPresetData?.name || "Select camera move..."}
                    </span>
                </span>
                <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 top-full left-0 right-0 mt-1 p-3 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl max-h-80 overflow-y-auto"
                    >
                        <CameraPresetSelector
                            selectedPreset={selectedPreset}
                            onSelect={(preset) => {
                                onSelect(preset);
                                setIsOpen(false);
                            }}
                            genre={genre}
                            showGenreRecommendations={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

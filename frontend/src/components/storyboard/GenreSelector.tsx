"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ChevronDown, Check, Sparkles, Palette, Film } from "lucide-react";
import {
    Genre,
    GenreTemplate,
    GENRE_TEMPLATES,
    getGenreOptions,
    getGenreTemplate
} from "@/data/GenreTemplates";

interface GenreSelectorProps {
    selectedGenre: Genre | null;
    onSelect: (genre: Genre | null) => void;
    showStylePreview?: boolean;
    className?: string;
    /** When true, shows adult/NSFW genres like "Adult / OnlyFans" */
    includeMature?: boolean;
}

export function GenreSelector({
    selectedGenre,
    onSelect,
    showStylePreview = true,
    className,
    includeMature = false
}: GenreSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedTemplate = selectedGenre ? GENRE_TEMPLATES[selectedGenre] : null;
    const genreOptions = getGenreOptions(includeMature);

    return (
        <div className={clsx("space-y-2", className)}>
            {/* Dropdown trigger */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {selectedTemplate ? (
                            <>
                                <span className="text-xl">{selectedTemplate.icon}</span>
                                <div>
                                    <span className="text-sm font-medium text-white block">
                                        {selectedTemplate.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {selectedTemplate.description.slice(0, 50)}...
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <Film className="w-5 h-5 text-gray-500" />
                                <span className="text-sm text-gray-400">
                                    Select a genre for smart recommendations...
                                </span>
                            </>
                        )}
                    </div>
                    <ChevronDown
                        className={clsx(
                            "w-5 h-5 text-gray-400 transition-transform",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                        >
                            {/* Clear option */}
                            <button
                                onClick={() => {
                                    onSelect(null);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full px-4 py-3 text-left flex items-center gap-3 border-b border-white/10 transition-colors",
                                    !selectedGenre
                                        ? "bg-blue-500/10 text-blue-300"
                                        : "text-gray-400 hover:bg-white/5"
                                )}
                            >
                                <span className="w-6 text-center text-gray-500">✕</span>
                                <span className="text-sm">No genre (show all camera moves)</span>
                                {!selectedGenre && <Check className="w-4 h-4 ml-auto text-blue-400" />}
                            </button>

                            {/* Genre options grid */}
                            <div className="grid grid-cols-2 gap-1 p-2 max-h-80 overflow-y-auto">
                                {genreOptions.map(({ value, label, icon }) => {
                                    const template = GENRE_TEMPLATES[value];
                                    const isSelected = selectedGenre === value;

                                    return (
                                        <button
                                            key={value}
                                            onClick={() => {
                                                onSelect(value);
                                                setIsOpen(false);
                                            }}
                                            className={clsx(
                                                "p-3 rounded-lg text-left transition-all",
                                                isSelected
                                                    ? "bg-blue-500/20 border border-blue-500/50"
                                                    : "bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{icon}</span>
                                                <span className={clsx(
                                                    "text-sm font-medium",
                                                    isSelected ? "text-blue-300" : "text-white"
                                                )}>
                                                    {label}
                                                </span>
                                                {isSelected && (
                                                    <Check className="w-3.5 h-3.5 ml-auto text-blue-400" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 line-clamp-2">
                                                {template.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Style preview panel */}
            {showStylePreview && selectedTemplate && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-xl space-y-4"
                >
                    {/* Default style */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Palette className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Default Visual Style
                            </span>
                        </div>
                        <p className="text-xs text-gray-300 italic">
                            "{selectedTemplate.defaultStyle}"
                        </p>
                    </div>

                    {/* Color palette */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                            Color Palette
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTemplate.colorPalette.map((color: string, i: number) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 bg-black/30 rounded text-[10px] text-gray-300"
                                >
                                    {color}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Recommended cameras */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Recommended Camera Moves
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {selectedTemplate.cameraPreferences.slice(0, 6).map((preset: string, i: number) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full text-[10px] text-green-300"
                                >
                                    {preset.replace(/_/g, ' ')}
                                </span>
                            ))}
                            {selectedTemplate.cameraPreferences.length > 6 && (
                                <span className="text-[10px] text-gray-500">
                                    +{selectedTemplate.cameraPreferences.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Style notes */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                            Style Tips
                        </span>
                        <ul className="space-y-1">
                            {selectedTemplate.styleNotes.slice(0, 3).map((note: string, i: number) => (
                                <li key={i} className="text-[10px] text-gray-400 flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    {note}
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact inline version
// ═══════════════════════════════════════════════════════════════════════════

interface GenreBadgeProps {
    genre: Genre;
    onClick?: () => void;
    showRemove?: boolean;
    onRemove?: () => void;
}

export function GenreBadge({ genre, onClick, showRemove, onRemove }: GenreBadgeProps) {
    const template = GENRE_TEMPLATES[genre];

    return (
        <span
            onClick={onClick}
            className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-300",
                onClick && "cursor-pointer hover:bg-blue-500/20"
            )}
        >
            <span>{template.icon}</span>
            <span>{template.name}</span>
            {showRemove && onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-1 hover:text-white"
                >
                    ×
                </button>
            )}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick genre pills for compact selection
// ═══════════════════════════════════════════════════════════════════════════

interface GenrePillsProps {
    selectedGenre: Genre | null;
    onSelect: (genre: Genre | null) => void;
    maxVisible?: number;
    /** When true, shows adult/NSFW genres like "Adult / OnlyFans" */
    includeMature?: boolean;
}

export function GenrePills({ selectedGenre, onSelect, maxVisible = 6, includeMature = false }: GenrePillsProps) {
    const [showAll, setShowAll] = useState(false);
    const genreOptions = getGenreOptions(includeMature);
    const visibleOptions = showAll ? genreOptions : genreOptions.slice(0, maxVisible);

    return (
        <div className="flex flex-wrap gap-1.5">
            {visibleOptions.map(({ value, label, icon }) => (
                <button
                    key={value}
                    onClick={() => onSelect(selectedGenre === value ? null : value)}
                    className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                        selectedGenre === value
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                            : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <span>{icon}</span>
                    <span>{label}</span>
                </button>
            ))}
            {genreOptions.length > maxVisible && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-white hover:bg-white/10"
                >
                    {showAll ? "Show less" : `+${genreOptions.length - maxVisible} more`}
                </button>
            )}
        </div>
    );
}

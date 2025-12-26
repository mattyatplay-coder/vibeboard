/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Check, ChevronDown, ChevronRight, Film } from "lucide-react";
import { clsx } from "clsx";
import {
    ALL_CATEGORIES,
    CATEGORY_MAP,
    CinematicTag,
    TagCategory,
    TagSubcategory,
    searchTags,
    getTagsForSubcategory
} from "@/data/CinematicTags";
import { GENRE_TEMPLATES, GenreTemplate } from "@/data/GenreTemplates";
import { Genre } from "@/data/CameraPresets";

interface CinematicTagsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTag: (tag: CinematicTag, categoryId: string) => void;
    initialCategory?: string;
    embedded?: boolean;
    selectedTags?: string[];
}

export function CinematicTagsModal({
    isOpen,
    onClose,
    onSelectTag,
    initialCategory,
    embedded = false,
    selectedTags = []
}: CinematicTagsModalProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory || null);
    const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
    const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);

    // Update active category when initialCategory changes
    useEffect(() => {
        if (initialCategory) {
            setActiveCategory(initialCategory);
            setActiveSubcategory(null);
        }
    }, [initialCategory]);

    const category = activeCategory ? CATEGORY_MAP[activeCategory] : null;
    const genreTemplate = selectedGenre ? GENRE_TEMPLATES[selectedGenre] : null;

    // Filter tags based on search and subcategory
    const filteredTags = useMemo(() => {
        let tags: CinematicTag[] = [];

        if (searchQuery) {
            return searchTags(searchQuery);
        }

        if (!category) {
            tags = [];
        } else if (activeSubcategory) {
            tags = getTagsForSubcategory(activeCategory!, activeSubcategory);
        } else {
            tags = category.tags;
        }

        // Apply Genre Sorting if active
        if (genreTemplate && tags.length > 0) {
            return [...tags].sort((a, b) => {
                const aRec = genreTemplate.recommendedTags.includes(a.id);
                const bRec = genreTemplate.recommendedTags.includes(b.id);
                const aAvoid = genreTemplate.avoidedTags.includes(a.id);
                const bAvoid = genreTemplate.avoidedTags.includes(b.id);

                // Recommended first
                if (aRec && !bRec) return -1;
                if (!aRec && bRec) return 1;

                // Avoided last
                if (aAvoid && !bAvoid) return 1;
                if (!aAvoid && bAvoid) return -1;

                return 0;
            });
        }

        return tags;
    }, [searchQuery, category, activeCategory, activeSubcategory, genreTemplate]);

    const toggleSubcategory = (subcategoryId: string) => {
        setExpandedSubcategories(prev => {
            const next = new Set(prev);
            if (next.has(subcategoryId)) {
                next.delete(subcategoryId);
            } else {
                next.add(subcategoryId);
            }
            return next;
        });
    };

    const handleSelectTag = (tag: CinematicTag) => {
        const categoryId = activeCategory || findCategoryForTag(tag.id);
        onSelectTag(tag, categoryId);
    };

    const findCategoryForTag = (tagId: string): string => {
        for (const cat of ALL_CATEGORIES) {
            if (cat.tags.some(t => t.id === tagId)) {
                return cat.id;
            }
        }
        return 'unknown';
    };

    if (!isOpen) return null;

    const content = (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl overflow-hidden",
            embedded ? "w-full min-w-[400px] max-w-[700px] h-full max-h-full" : "w-full max-w-2xl max-h-[80vh]"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white">
                        {category ? (
                            <span className="flex items-center gap-2">
                                <span>{category.icon}</span>
                                {category.label}
                            </span>
                        ) : (
                            "Cinematic Tags"
                        )}
                    </h2>

                    {/* Genre Selector */}
                    <div className="relative group">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors">
                            <Film className="w-3 h-3" />
                            {selectedGenre ? (
                                <span className="flex items-center gap-2">
                                    <span>{GENRE_TEMPLATES[selectedGenre].icon}</span>
                                    <span>{GENRE_TEMPLATES[selectedGenre].name}</span>
                                </span>
                            ) : "AI Director: Genre"}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>

                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 hidden group-hover:block max-h-64 overflow-y-auto">
                            <button
                                onClick={() => setSelectedGenre(null)}
                                className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
                            >
                                No Genre Filter
                            </button>
                            {Object.values(GENRE_TEMPLATES).map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedGenre(template.id)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center justify-between",
                                        selectedGenre === template.id ? "text-purple-400 bg-purple-500/10" : "text-gray-300 hover:text-white"
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{template.icon}</span>
                                        <span>{template.name}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Category Pills */}
            <div className="p-4 border-b border-white/10">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            setActiveCategory(null);
                            setActiveSubcategory(null);
                        }}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            activeCategory === null
                                ? "bg-blue-600 text-white"
                                : "bg-white/5 text-gray-300 hover:bg-white/10"
                        )}
                    >
                        All
                    </button>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                setActiveSubcategory(null);
                                setSearchQuery("");
                            }}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                                activeCategory === cat.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                            )}
                        >
                            <span>{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/5 bg-black/20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                    />
                </div>
                {selectedGenre && (
                    <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        AI Director active: Prioritizing {GENRE_TEMPLATES[selectedGenre].name} style
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
                {/* Subcategory Sidebar (if category selected) */}
                {category?.subcategories && !searchQuery && (
                    <div className="w-48 border-r border-white/10 overflow-y-auto bg-black/10">
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setActiveSubcategory(null)}
                                className={clsx(
                                    "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                                    activeSubcategory === null
                                        ? "bg-blue-600/20 text-blue-400"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                All {category.label}
                            </button>
                            {category.subcategories.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubcategory(sub.id)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between",
                                        activeSubcategory === sub.id
                                            ? "bg-blue-600/20 text-blue-400"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <span>{sub.label}</span>
                                    <span className="text-[10px] opacity-50">{sub.tagIds.length}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags Grid */}
                <div className="flex-1 overflow-y-auto p-4 scroller">
                    {searchQuery ? (
                        // Search Results
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 mb-3">
                                {filteredTags.length} results for "{searchQuery}"
                            </p>
                            {filteredTags.map(tag => (
                                <TagItem
                                    key={tag.id}
                                    tag={tag}
                                    isSelected={selectedTags.includes(tag.id)}
                                    isRecommended={selectedGenre ? GENRE_TEMPLATES[selectedGenre].recommendedTags.includes(tag.id) : false}
                                    onClick={() => handleSelectTag(tag)}
                                />
                            ))}
                        </div>
                    ) : category ? (
                        // Category View
                        activeSubcategory ? (
                            // Subcategory tags
                            <div className="space-y-2">
                                {filteredTags.map(tag => (
                                    <TagItem
                                        key={tag.id}
                                        tag={tag}
                                        isSelected={selectedTags.includes(tag.id)}
                                        isRecommended={selectedGenre ? GENRE_TEMPLATES[selectedGenre].recommendedTags.includes(tag.id) : false}
                                        onClick={() => handleSelectTag(tag)}
                                    />
                                ))}
                            </div>
                        ) : (
                            // All tags in category, grouped by subcategory
                            <div className="space-y-6">
                                {category.subcategories?.map(sub => {
                                    // Use the helper but filter by genre if needed
                                    const subTags = getTagsForSubcategory(category.id, sub.id);

                                    // Manually sort subcategory tags because standard getTagsFor... returns default order
                                    let displayTags = subTags;
                                    if (genreTemplate) {
                                        displayTags = [...subTags].sort((a, b) => {
                                            const aRec = genreTemplate.recommendedTags.includes(a.id);
                                            const bRec = genreTemplate.recommendedTags.includes(b.id);
                                            if (aRec && !bRec) return -1;
                                            if (!aRec && bRec) return 1;
                                            return 0;
                                        });
                                    }

                                    const isExpanded = expandedSubcategories.has(sub.id);

                                    return (
                                        <div key={sub.id} className="space-y-2">
                                            <button
                                                onClick={() => toggleSubcategory(sub.id)}
                                                className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                )}
                                                {sub.label}
                                                <span className="text-[10px] font-normal opacity-50">({subTags.length})</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="grid grid-cols-2 gap-2 pl-5">
                                                    {displayTags.map(tag => (
                                                        <TagItem
                                                            key={tag.id}
                                                            tag={tag}
                                                            isSelected={selectedTags.includes(tag.id)}
                                                            isRecommended={selectedGenre ? GENRE_TEMPLATES[selectedGenre].recommendedTags.includes(tag.id) : false}
                                                            onClick={() => handleSelectTag(tag)}
                                                            compact
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        // All Categories Overview
                        <div className="space-y-6">
                            {ALL_CATEGORIES.map(cat => (
                                <div key={cat.id} className="space-y-2">
                                    <button
                                        onClick={() => setActiveCategory(cat.id)}
                                        className="flex items-center gap-2 text-sm font-bold text-white hover:text-blue-400 transition-colors"
                                    >
                                        <span>{cat.icon}</span>
                                        {cat.label}
                                        <span className="text-[10px] font-normal text-gray-500">
                                            ({cat.tags.length} tags)
                                        </span>
                                    </button>
                                    <p className="text-xs text-gray-500 pl-6">{cat.description}</p>

                                    {/* Preview tags - if genre sorted, show recommended first */}
                                    <div className="flex flex-wrap gap-1 pl-6">
                                        {(() => {
                                            let previewTags = [...cat.tags];
                                            if (genreTemplate) {
                                                previewTags.sort((a, b) => {
                                                    const aRec = genreTemplate.recommendedTags.includes(a.id);
                                                    const bRec = genreTemplate.recommendedTags.includes(b.id);
                                                    return (aRec === bRec) ? 0 : aRec ? -1 : 1;
                                                });
                                            }
                                            return previewTags.slice(0, 5).map(tag => (
                                                <div key={tag.id} className="relative">
                                                    <button
                                                        onClick={() => handleSelectTag(tag)}
                                                        className={clsx(
                                                            "px-2 py-1 border rounded text-[10px] transition-colors",
                                                            genreTemplate?.recommendedTags.includes(tag.id)
                                                                ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                                                                : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        {tag.name}
                                                    </button>
                                                </div>

                                            ));
                                        })()}
                                        {cat.tags.length > 5 && (
                                            <button
                                                onClick={() => setActiveCategory(cat.id)}
                                                className="px-2 py-1 text-[10px] text-blue-400 hover:text-blue-300"
                                            >
                                                +{cat.tags.length - 5} more
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredTags.length === 0 && searchQuery && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">No tags found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}>
                {content}
            </div>
        </div>
    );
}

// Tag Item Component
function TagItem({
    tag,
    isSelected,
    isRecommended,
    onClick,
    compact = false
}: {
    tag: CinematicTag;
    isSelected: boolean;
    isRecommended?: boolean;
    onClick: () => void;
    compact?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 rounded-lg border transition-all text-left group relative",
                compact ? "p-2" : "p-3",
                isSelected
                    ? "bg-blue-500/10 border-blue-500/50"
                    : isRecommended
                        ? "bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40"
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
            )}
        >
            <div className={clsx(
                "flex-shrink-0 rounded flex items-center justify-center border transition-colors",
                compact ? "w-5 h-5" : "w-6 h-6",
                isSelected
                    ? "bg-blue-500 border-blue-400 text-white"
                    : isRecommended
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                        : "bg-white/5 border-white/10 text-gray-500"
            )}>
                {isSelected && <Check className={compact ? "w-3 h-3" : "w-4 h-4"} />}
                {!isSelected && isRecommended && <Film className={compact ? "w-3 h-3" : "w-4 h-4"} />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h4 className={clsx(
                        "font-medium transition-colors",
                        compact ? "text-xs" : "text-sm truncate",
                        isSelected
                            ? "text-blue-200"
                            : isRecommended
                                ? "text-purple-300 group-hover:text-purple-200"
                                : "text-white"
                    )}>
                        {tag.name}
                    </h4>
                    {isRecommended && !compact && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 uppercase tracking-wider">
                            AI Pick
                        </span>
                    )}
                </div>
                {!compact && tag.description && (
                    <p className={clsx(
                        "text-[10px] truncate transition-colors",
                        isRecommended ? "text-purple-400/70" : "text-gray-500"
                    )}>{tag.description}</p>
                )}
            </div>
        </button>
    );
}

// Compact version for dropdown replacement
export function CinematicTagsDropdown({
    categoryId,
    onSelectTag,
    className
}: {
    categoryId: string;
    onSelectTag: (tag: CinematicTag) => void;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const category = CATEGORY_MAP[categoryId];

    if (!category) return null;

    return (
        <div className={clsx("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white flex items-center justify-between transition-colors",
                    isOpen && "bg-white/10 border-white/30 text-white"
                )}
            >
                <span className="flex items-center gap-1.5 truncate">
                    <span>{category.icon}</span> {category.label}
                </span>
                <ChevronDown className={clsx(
                    "w-3 h-3 opacity-50 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                        {/* Subcategory Groups */}
                        {category.subcategories?.map(sub => (
                            <div key={sub.id}>
                                <div className="px-3 py-1.5 bg-white/5 text-[10px] font-bold text-gray-500 uppercase sticky top-0">
                                    {sub.label}
                                </div>
                                {getTagsForSubcategory(categoryId, sub.id).map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => {
                                            onSelectTag(tag);
                                            setIsOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        ))}

                        {/* Flat list if no subcategories */}
                        {!category.subcategories && category.tags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => {
                                    onSelectTag(tag);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

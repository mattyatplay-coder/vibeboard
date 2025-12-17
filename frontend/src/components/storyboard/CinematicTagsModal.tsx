 /* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Check, ChevronDown, ChevronRight } from "lucide-react";
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

    // Update active category when initialCategory changes
    useEffect(() => {
        if (initialCategory) {
            setActiveCategory(initialCategory);
            setActiveSubcategory(null);
        }
    }, [initialCategory]);

    const category = activeCategory ? CATEGORY_MAP[activeCategory] : null;

    // Filter tags based on search and subcategory
    const filteredTags = useMemo(() => {
        if (searchQuery) {
            return searchTags(searchQuery);
        }

        if (!category) {
            return [];
        }

        if (activeSubcategory) {
            return getTagsForSubcategory(activeCategory!, activeSubcategory);
        }

        return category.tags;
    }, [searchQuery, category, activeCategory, activeSubcategory]);

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
            embedded ? "w-[700px] h-[90vh]" : "w-full max-w-2xl max-h-[80vh]"
        )}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
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
            <div className="p-4 border-b border-white/5">
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
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
                {/* Subcategory Sidebar (if category selected) */}
                {category?.subcategories && !searchQuery && (
                    <div className="w-48 border-r border-white/10 overflow-y-auto">
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
                <div className="flex-1 overflow-y-auto p-4">
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
                                        onClick={() => handleSelectTag(tag)}
                                    />
                                ))}
                            </div>
                        ) : (
                            // All tags in category, grouped by subcategory
                            <div className="space-y-4">
                                {category.subcategories?.map(sub => {
                                    const subTags = getTagsForSubcategory(category.id, sub.id);
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
                                                    {subTags.map(tag => (
                                                        <TagItem
                                                            key={tag.id}
                                                            tag={tag}
                                                            isSelected={selectedTags.includes(tag.id)}
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

                                    {/* Preview of first few tags */}
                                    <div className="flex flex-wrap gap-1 pl-6">
                                        {cat.tags.slice(0, 5).map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleSelectTag(tag)}
                                                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-400 hover:text-white transition-colors"
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
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
    onClick,
    compact = false
}: {
    tag: CinematicTag;
    isSelected: boolean;
    onClick: () => void;
    compact?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 rounded-lg border transition-colors text-left",
                compact ? "p-2" : "p-3",
                isSelected
                    ? "bg-blue-500/10 border-blue-500/50"
                    : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
            )}
        >
            <div className={clsx(
                "flex-shrink-0 rounded flex items-center justify-center border",
                compact ? "w-5 h-5" : "w-6 h-6",
                isSelected
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-gray-500"
            )}>
                {isSelected && <Check className={compact ? "w-3 h-3" : "w-4 h-4"} />}
            </div>
            <div className="min-w-0 flex-1">
                <h4 className={clsx(
                    "font-medium",
                    compact ? "text-xs" : "text-sm truncate",
                    isSelected ? "text-blue-200" : "text-white"
                )}>
                    {tag.name}
                </h4>
                {!compact && tag.description && (
                    <p className="text-[10px] text-gray-500 truncate">{tag.description}</p>
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

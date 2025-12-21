"use client";

import { useState, useEffect } from "react";
import { X, Plus, Users, Search, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { fetchAPI, resolveFileUrl } from "@/lib/api";



interface ElementReferencePickerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    selectedElements: string[];
    onSelectionChange: (elements: string[]) => void;
    maxElements?: number;
    // Global fallback (optional if we fully switch to per-element)
    creativity?: number;
    onCreativityChange?: (value: number) => void;
    // Per-element strength
    elementStrengths: Record<string, number>;
    onStrengthChange: (id: string, value: number) => void;
}

export function ElementReferencePicker({
    projectId,
    isOpen,
    onClose,
    selectedElements,
    onSelectionChange,
    maxElements = 4,
    creativity = 0.6,
    onCreativityChange,
    elementStrengths,
    onStrengthChange
}: ElementReferencePickerProps) {
    const [elements, setElements] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "character" | "style" | "prop">("all");
    const [activeElementId, setActiveElementId] = useState<string | null>(null);

    // Set first selected element as active on open if none active
    useEffect(() => {
        if (isOpen && selectedElements.length > 0 && !activeElementId) {
            setActiveElementId(selectedElements[0]);
        }
    }, [isOpen, selectedElements]);

    useEffect(() => {
        if (isOpen) {
            loadElements();
        }
    }, [isOpen, projectId]);

    const loadElements = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI(`/projects/${projectId}/elements`);
            setElements(data);
        } catch (err) {
            console.error("Failed to load elements", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleElement = (elementId: string) => {
        if (selectedElements.includes(elementId)) {
            // Deselecting
            const newSelection = selectedElements.filter(e => e !== elementId);
            onSelectionChange(newSelection);
            if (activeElementId === elementId) {
                setActiveElementId(newSelection.length > 0 ? newSelection[0] : null);
            }
        } else if (selectedElements.length < maxElements) {
            // Selecting
            onSelectionChange([...selectedElements, elementId]);
            setActiveElementId(elementId); // Auto-activate newly selected
            // Initialize strength if not present
            if (!elementStrengths[elementId]) {
                onStrengthChange(elementId, 0.6);
            }
        }
    };

    const handleElementClick = (id: string) => {
        if (selectedElements.includes(id)) {
            setActiveElementId(id);
        } else {
            toggleElement(id);
        }
    };

    const filteredElements = elements.filter(el => {
        const matchesSearch = el.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            el.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === "all" || el.type === filterType;
        return matchesSearch && matchesType;
    });

    // Build the @Image reference string for prompting
    const buildReferencePrompt = () => {
        return selectedElements.map((_, idx) => `@Image${idx + 1}`).join(", ");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Element References</h2>
                            <p className="text-xs text-gray-500">Select up to {maxElements} elements for character/style consistency</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Filters */}
                <div className="p-4 border-b border-white/10 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search elements..."
                            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {["all", "character", "style", "prop"].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                    filterType === type
                                        ? "bg-purple-600 text-white"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Elements Preview */}
                {selectedElements.length > 0 && (
                    <div className="p-4 bg-purple-500/5 border-b border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium text-purple-300">
                                    Selected ({selectedElements.length}/{maxElements})
                                </span>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wider">Creative</span>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1.0"
                                            step="0.01"
                                            value={activeElementId ? (elementStrengths[activeElementId] || 0.6) : creativity}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (activeElementId) {
                                                    onStrengthChange(activeElementId, val);
                                                } else if (onCreativityChange) {
                                                    onCreativityChange(val);
                                                }
                                            }}
                                            disabled={!activeElementId && !onCreativityChange}
                                            className={clsx(
                                                "w-32 h-1.5 rounded-lg appearance-none cursor-pointer transition-all",
                                                activeElementId ? "bg-gray-700 accent-purple-500 hover:accent-purple-400" : "bg-gray-800 accent-gray-600"
                                            )}
                                        />
                                        <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wider">Strict</span>
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[8px] text-gray-500">Picasso</span>
                                        <span className="text-[8px] text-gray-500">Da Vinci</span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-purple-400 w-8 text-right font-bold">
                                    {((activeElementId ? (elementStrengths[activeElementId] || 0.6) : creativity) * 100).toFixed(0)}%
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                                Prompt ref: {buildReferencePrompt()}
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {selectedElements.map((id, idx) => {
                                const el = elements.find(e => e.id === id);
                                const url = resolveFileUrl(el?.fileUrl);
                                return (
                                    <div
                                        key={id}
                                        className={clsx(
                                            "relative flex-shrink-0 cursor-pointer transition-all",
                                            activeElementId === id ? "scale-105 z-10" : "opacity-80 hover:opacity-100"
                                        )}
                                        onClick={() => setActiveElementId(id)}
                                    >
                                        <img
                                            src={url}
                                            alt={`Element ${idx + 1}`}
                                            className={clsx(
                                                "w-16 h-16 rounded-lg object-cover border-2",
                                                activeElementId === id ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "border-purple-500"
                                            )}
                                            onError={(e) => {
                                                console.error("Image load failed for URL:", url);
                                                console.error("Original fileUrl:", el?.fileUrl);
                                                e.currentTarget.style.border = "2px solid red";
                                            }}
                                        />
                                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold z-10 shadow-sm border border-white/20">
                                            {idx + 1}
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] py-0.5 px-1 text-center flex justify-between items-center">
                                            <span className="text-[8px] text-white font-mono font-medium">@Image{idx + 1}</span>
                                            <span className="text-[8px] text-blue-300 font-bold ml-1">
                                                {((elementStrengths[id] || 0.6) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleElement(id);
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-400 z-10 shadow-sm border border-white/20"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Elements Grid */}
                <div className="p-4 max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading elements...</div>
                    ) : filteredElements.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No elements found. Create elements on the Elements page.
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-3">
                            {filteredElements.map((element) => {
                                const isSelected = selectedElements.includes(element.id);
                                const selectionIndex = selectedElements.indexOf(element.id);
                                const canSelect = selectedElements.length < maxElements || isSelected;
                                const url = resolveFileUrl(element.fileUrl);

                                return (
                                    <button
                                        key={element.id}
                                        onClick={() => handleElementClick(element.id)}
                                        disabled={!canSelect}
                                        className={clsx(
                                            "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                            isSelected
                                                ? (activeElementId === element.id ? "border-blue-500 ring-2 ring-blue-500/30" : "border-purple-500 ring-2 ring-purple-500/30")
                                                : canSelect
                                                    ? "border-white/10 hover:border-white/30"
                                                    : "border-white/5 opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <img
                                            src={url}
                                            alt={element.name}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg border border-white/20">
                                                        {selectionIndex + 1}
                                                    </div>
                                                    <span className="px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-mono font-medium border border-white/10">
                                                        @Image{selectionIndex + 1}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Element Name */}
                                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 backdrop-blur-sm">
                                            <p className="text-[10px] text-white truncate text-center">
                                                {element.name}
                                            </p>
                                        </div>

                                        {/* Type Badge */}
                                        <div className="absolute top-1 left-1">
                                            <span className={clsx(
                                                "px-1.5 py-0.5 rounded text-[8px] font-medium",
                                                element.type === "character" && "bg-blue-500/80 text-white",
                                                element.type === "style" && "bg-purple-500/80 text-white",
                                                element.type === "prop" && "bg-green-500/80 text-white",
                                                !element.type && "bg-gray-500/80 text-white"
                                            )}>
                                                {element.type || "other"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info & Actions */}
                <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
                    <div className="flex items-start gap-2 mb-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-300/80 leading-relaxed">
                            <strong>Kling O1 Elements:</strong> Reference selected elements in your prompt using{" "}
                            <code className="px-1 bg-black/30 rounded">@Image1</code>,{" "}
                            <code className="px-1 bg-black/30 rounded">@Image2</code>, etc. for character/style consistency.
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Apply ({selectedElements.length})
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Library, Download, Check, ChevronDown, ChevronUp, Search, Box, Layers, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";

interface GlobalLoRAItem {
    id: string;
    name: string;
    triggerWord?: string;
    fileUrl: string;
    baseModel: string;
    type: 'lora' | 'checkpoint' | 'embedding';
    strength: number;
    imageUrl?: string;
    settings?: any;
    description?: string;
    tags: string[];
    usageCount: number;
    isInstalled: boolean;
    projectLoRAId?: string;
}

interface GlobalLibraryPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onInstalled?: () => void; // Callback when something is installed
    filterBaseModel?: string;
}

export function GlobalLibraryPanel({
    projectId,
    isOpen,
    onClose,
    onInstalled,
    filterBaseModel
}: GlobalLibraryPanelProps) {
    const [items, setItems] = useState<GlobalLoRAItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("");
    const [installing, setInstalling] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadLibrary();
        }
    }, [isOpen, projectId]);

    const loadLibrary = async () => {
        setIsLoading(true);
        try {
            const response = await fetchAPI(`/library/project/${projectId}`);
            setItems(Array.isArray(response) ? response : []);
        } catch (err) {
            console.error("Failed to load global library:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async (item: GlobalLoRAItem) => {
        if (item.isInstalled || installing) return;

        setInstalling(item.id);
        try {
            await fetchAPI(`/library/${item.id}/install`, {
                method: "POST",
                body: JSON.stringify({ projectId })
            });

            // Update local state to show as installed
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, isInstalled: true } : i
            ));

            onInstalled?.();
        } catch (err) {
            console.error("Failed to install:", err);
        } finally {
            setInstalling(null);
        }
    };

    const filteredItems = items.filter(item => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.tags.some(t => t.toLowerCase().includes(query));
            if (!matchesSearch) return false;
        }

        // Type filter
        if (filterType && item.type !== filterType) return false;

        // Base model filter
        if (filterBaseModel && item.baseModel !== filterBaseModel) return false;

        return true;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'checkpoint': return <Box className="w-3 h-3" />;
            case 'embedding': return <Sparkles className="w-3 h-3" />;
            default: return <Layers className="w-3 h-3" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'checkpoint': return 'text-purple-400 bg-purple-500/20';
            case 'embedding': return 'text-pink-400 bg-pink-500/20';
            default: return 'text-blue-400 bg-blue-500/20';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="border-t border-white/10 bg-gradient-to-b from-purple-500/5 to-transparent">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-white">Global Library</span>
                    <span className="text-[10px] text-gray-500">
                        ({items.length} items)
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search & Filters */}
            <div className="p-2 flex gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search library..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white"
                >
                    <option value="">All Types</option>
                    <option value="checkpoint">Checkpoints</option>
                    <option value="lora">LoRAs</option>
                    <option value="embedding">Embeddings</option>
                </select>
            </div>

            {/* Items List */}
            <div className="max-h-64 overflow-y-auto px-2 pb-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                        {items.length === 0 ? (
                            <>
                                <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No items in library yet</p>
                                <p className="text-[10px] mt-1">Add LoRAs/Checkpoints with "Add to Library" option</p>
                            </>
                        ) : (
                            <p>No items match your search</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className={clsx(
                                    "flex items-center gap-2 p-2 rounded-lg transition-colors",
                                    item.isInstalled
                                        ? "bg-green-500/10 border border-green-500/30"
                                        : "bg-white/5 hover:bg-white/10 border border-transparent"
                                )}
                            >
                                {/* Thumbnail */}
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className={clsx(
                                        "w-10 h-10 rounded flex items-center justify-center flex-shrink-0",
                                        getTypeColor(item.type)
                                    )}>
                                        {getTypeIcon(item.type)}
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className={clsx(
                                            "px-1 py-0.5 rounded text-[9px] font-medium",
                                            getTypeColor(item.type)
                                        )}>
                                            {item.type}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {item.baseModel}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white font-medium truncate">
                                        {item.name}
                                    </p>
                                    {item.triggerWord && (
                                        <p className="text-[10px] text-gray-500 truncate">
                                            Trigger: {item.triggerWord}
                                        </p>
                                    )}
                                    {item.settings && (
                                        <p className="text-[10px] text-purple-400 truncate">
                                            CFG: {item.settings.cfg || item.settings.cfgRange?.[0]}-{item.settings.cfgRange?.[1] || item.settings.cfg}
                                            {item.settings.steps && ` • Steps: ${item.settings.steps}`}
                                        </p>
                                    )}
                                </div>

                                {/* Install Button */}
                                <button
                                    onClick={() => handleInstall(item)}
                                    disabled={item.isInstalled || installing === item.id}
                                    className={clsx(
                                        "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0",
                                        item.isInstalled
                                            ? "bg-green-500/20 text-green-400 cursor-default"
                                            : installing === item.id
                                                ? "bg-purple-500/20 text-purple-400"
                                                : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 hover:text-purple-200"
                                    )}
                                >
                                    {item.isInstalled ? (
                                        <>
                                            <Check className="w-3 h-3" />
                                            Installed
                                        </>
                                    ) : installing === item.id ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                                            Installing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-3 h-3" />
                                            Install
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/10 text-[10px] text-gray-500">
                Items installed from the library are shared across all projects
            </div>
        </div>
    );
}

export default GlobalLibraryPanel;

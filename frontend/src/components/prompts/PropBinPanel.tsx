"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Edit2, Package, Image as ImageIcon, Tag, Search } from "lucide-react";
import { clsx } from "clsx";
import {
    usePropBinStore,
    Prop,
    PROP_CATEGORIES,
} from "@/lib/propBinStore";

interface PropBinPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

type PropCategory = keyof typeof PROP_CATEGORIES | 'all';

export function PropBinPanel({ isOpen, onClose }: PropBinPanelProps) {
    const { props, addProp, updateProp, deleteProp } = usePropBinStore();
    const [editingProp, setEditingProp] = useState<Prop | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<PropCategory>('all');

    // New prop form state
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newCategory, setNewCategory] = useState<Prop['category']>('custom');
    const [newTags, setNewTags] = useState("");

    const filteredProps = props.filter((prop) => {
        const matchesSearch =
            prop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prop.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || prop.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCreate = () => {
        if (!newName.trim() || !newDescription.trim()) return;

        addProp({
            name: newName.trim().replace(/\s+/g, ''), // Remove spaces from name
            description: newDescription.trim(),
            category: newCategory,
            tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        });

        // Reset form
        setNewName("");
        setNewDescription("");
        setNewCategory('custom');
        setNewTags("");
        setIsCreating(false);
    };

    const handleUpdate = () => {
        if (!editingProp) return;

        updateProp(editingProp.id, {
            name: editingProp.name.trim().replace(/\s+/g, ''),
            description: editingProp.description.trim(),
            category: editingProp.category,
            tags: editingProp.tags,
        });

        setEditingProp(null);
    };

    const handleCopyToClipboard = (propName: string) => {
        navigator.clipboard.writeText(`#${propName}`);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="fixed right-4 top-20 w-[420px] max-h-[85vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-400" />
                            <h2 className="text-lg font-bold text-white">Prop Bin</h2>
                            <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded-full">
                                #PropName
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Search & Filter */}
                    <div className="p-3 border-b border-white/10 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search props..."
                                className="w-full h-9 pl-10 pr-4 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <button
                                onClick={() => setFilterCategory('all')}
                                className={clsx(
                                    "px-2 py-1 text-xs rounded-md transition-colors",
                                    filterCategory === 'all'
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                All
                            </button>
                            {Object.entries(PROP_CATEGORIES).map(([key, { label, icon }]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilterCategory(key as PropCategory)}
                                    className={clsx(
                                        "px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1",
                                        filterCategory === key
                                            ? "bg-amber-500/20 text-amber-300"
                                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    <span>{icon}</span>
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Props List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {filteredProps.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                {searchQuery ? "No props match your search" : "No props yet. Create one!"}
                            </div>
                        ) : (
                            filteredProps.map((prop) => (
                                <div
                                    key={prop.id}
                                    className="p-3 bg-black/30 border border-white/10 rounded-lg hover:border-white/20 transition-colors group"
                                >
                                    {editingProp?.id === prop.id ? (
                                        // Editing Mode
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={editingProp.name}
                                                onChange={(e) =>
                                                    setEditingProp({ ...editingProp, name: e.target.value })
                                                }
                                                className="w-full h-8 px-2 bg-black/50 border border-amber-500/30 rounded text-sm text-white focus:outline-none"
                                                placeholder="PropName (no spaces)"
                                            />
                                            <textarea
                                                value={editingProp.description}
                                                onChange={(e) =>
                                                    setEditingProp({ ...editingProp, description: e.target.value })
                                                }
                                                className="w-full h-20 px-2 py-1 bg-black/50 border border-white/10 rounded text-xs text-white resize-none focus:outline-none focus:border-amber-500/30"
                                                placeholder="Detailed prompt description..."
                                            />
                                            <select
                                                value={editingProp.category || 'custom'}
                                                onChange={(e) =>
                                                    setEditingProp({
                                                        ...editingProp,
                                                        category: e.target.value as Prop['category'],
                                                    })
                                                }
                                                className="w-full h-8 px-2 bg-black/50 border border-white/10 rounded text-xs text-white focus:outline-none"
                                            >
                                                {Object.entries(PROP_CATEGORIES).map(([key, { label }]) => (
                                                    <option key={key} value={key}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleUpdate}
                                                    className="flex-1 h-8 bg-amber-500/20 text-amber-300 text-xs rounded hover:bg-amber-500/30 transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingProp(null)}
                                                    className="flex-1 h-8 bg-white/5 text-gray-400 text-xs rounded hover:bg-white/10 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Display Mode
                                        <>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleCopyToClipboard(prop.name)}
                                                            className="font-mono text-sm text-amber-400 hover:text-amber-300 transition-colors"
                                                            title="Click to copy"
                                                        >
                                                            #{prop.name}
                                                        </button>
                                                        {prop.category && PROP_CATEGORIES[prop.category] && (
                                                            <span className="text-xs opacity-60">
                                                                {PROP_CATEGORIES[prop.category].icon}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                        {prop.description}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingProp(prop)}
                                                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProp(prop.id)}
                                                        className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            {prop.tags && prop.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {prop.tags.map((tag, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[9px] px-1.5 py-0.5 bg-white/5 text-gray-500 rounded"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Create New Prop */}
                    <div className="p-3 border-t border-white/10">
                        {isCreating ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value.replace(/\s+/g, ''))}
                                    placeholder="PropName (no spaces)"
                                    className="w-full h-9 px-3 bg-black/30 border border-amber-500/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
                                />
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Detailed prompt description (e.g., 'vintage rotary telephone, cherry red bakelite, brass dial')"
                                    className="w-full h-24 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-amber-500/30"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value as Prop['category'])}
                                        className="flex-1 h-9 px-3 bg-black/30 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
                                    >
                                        {Object.entries(PROP_CATEGORIES).map(([key, { label, icon }]) => (
                                            <option key={key} value={key}>
                                                {icon} {label}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={newTags}
                                        onChange={(e) => setNewTags(e.target.value)}
                                        placeholder="Tags (comma-separated)"
                                        className="flex-1 h-9 px-3 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim() || !newDescription.trim()}
                                        className="flex-1 h-10 bg-amber-500/20 text-amber-300 font-medium rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Prop
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewName("");
                                            setNewDescription("");
                                            setNewTags("");
                                        }}
                                        className="px-4 h-10 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full h-10 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-400 font-medium rounded-lg hover:bg-amber-500/20 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add New Prop</span>
                            </button>
                        )}
                    </div>

                    {/* Usage Hint */}
                    <div className="px-3 pb-3">
                        <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] text-amber-400/70">
                            <strong>Usage:</strong> Type <code className="bg-black/30 px-1 rounded">#PropName</code> in your prompt.
                            It will expand to the full description when generating.
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

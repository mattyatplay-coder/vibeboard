 /* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, Pencil, Library, Search, X, Settings } from "lucide-react";
import { clsx } from "clsx";

// Default negative prompt categories
export const DEFAULT_NEGATIVE_CATEGORIES = [
    { id: 'all', name: 'All', icon: '📦' },
    { id: 'quality', name: 'Quality', icon: '✨' },
    { id: 'anatomy', name: 'Anatomy', icon: '🦴' },
    { id: 'style', name: 'Style', icon: '🎨' },
    { id: 'composition', name: 'Composition', icon: '📐' },
    { id: 'artifacts', name: 'Artifacts', icon: '🔧' },
    { id: 'nsfw', name: 'Content', icon: '🔞' },
    { id: 'other', name: 'Other', icon: '📁' },
] as const;

export type NegativePromptCategory = string;

// LocalStorage keys (project-scoped)
const getNegativePromptsKey = (projectId: string) => `vibeboard-negative-prompts-${projectId}`;
const getCustomCategoriesKey = (projectId: string) => `vibeboard-custom-negative-categories-${projectId}`;

export interface SavedNegativePrompt {
    id: string;
    name: string;
    prompt: string;
    category: NegativePromptCategory;
    createdAt: string;
}

// Helper to get saved negative prompts from localStorage (project-scoped)
function getSavedPrompts(projectId: string): SavedNegativePrompt[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(getNegativePromptsKey(projectId));
        return stored ? JSON.parse(stored) : getDefaultPrompts();
    } catch {
        return getDefaultPrompts();
    }
}

// Helper to save prompts to localStorage (project-scoped)
function savePrompts(projectId: string, prompts: SavedNegativePrompt[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getNegativePromptsKey(projectId), JSON.stringify(prompts));
}

// Helper to get custom categories from localStorage (project-scoped)
function getCustomCategories(projectId: string): { id: string; name: string; icon: string }[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(getCustomCategoriesKey(projectId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Helper to save custom categories to localStorage (project-scoped)
function saveCustomCategories(projectId: string, categories: { id: string; name: string; icon: string }[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getCustomCategoriesKey(projectId), JSON.stringify(categories));
}

// Helper to add a new custom category (project-scoped)
function addCustomCategory(projectId: string, name: string): { id: string; name: string; icon: string } {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const newCategory = { id, name, icon: '🏷️' };
    const existing = getCustomCategories(projectId);
    if (!existing.find(c => c.id === id)) {
        saveCustomCategories(projectId, [...existing, newCategory]);
    }
    return newCategory;
}

// Helper to update a custom category (project-scoped)
function updateCustomCategory(projectId: string, oldId: string, newName: string): { id: string; name: string; icon: string } | null {
    const existing = getCustomCategories(projectId);
    const index = existing.findIndex(c => c.id === oldId);
    if (index === -1) return null;

    const newId = newName.toLowerCase().replace(/\s+/g, '-');
    const updated = { ...existing[index], id: newId, name: newName };
    existing[index] = updated;
    saveCustomCategories(projectId, existing);
    return updated;
}

// Helper to delete a custom category (project-scoped)
function deleteCustomCategory(projectId: string, categoryId: string): boolean {
    const existing = getCustomCategories(projectId);
    const filtered = existing.filter(c => c.id !== categoryId);
    if (filtered.length === existing.length) return false;
    saveCustomCategories(projectId, filtered);
    return true;
}

// Default starter prompts
function getDefaultPrompts(): SavedNegativePrompt[] {
    return [
        {
            id: 'default-quality-1',
            name: 'Low Quality',
            prompt: 'low quality, blurry, pixelated, jpeg artifacts, compression artifacts, noisy, grainy',
            category: 'quality',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-quality-2',
            name: 'Bad Resolution',
            prompt: 'low resolution, worst quality, normal quality, lowres, bad quality',
            category: 'quality',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-anatomy-1',
            name: 'Bad Anatomy',
            prompt: 'bad anatomy, bad proportions, deformed, disfigured, malformed, mutated, extra limbs, missing limbs',
            category: 'anatomy',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-anatomy-2',
            name: 'Bad Hands',
            prompt: 'bad hands, extra fingers, missing fingers, fused fingers, too many fingers, mutated hands, malformed hands',
            category: 'anatomy',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-anatomy-3',
            name: 'Bad Face',
            prompt: 'bad face, ugly face, deformed face, asymmetric face, crooked nose, bad eyes, cross-eyed',
            category: 'anatomy',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-style-1',
            name: 'Cartoon/Anime',
            prompt: 'cartoon, anime, 3d render, illustration, painting, drawing, sketch, unrealistic',
            category: 'style',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-composition-1',
            name: 'Bad Composition',
            prompt: 'cropped, out of frame, cut off, poorly framed, bad composition, awkward pose',
            category: 'composition',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-artifacts-1',
            name: 'Watermarks & Text',
            prompt: 'watermark, text, logo, signature, username, artist name, copyright, banner',
            category: 'artifacts',
            createdAt: new Date().toISOString()
        },
        {
            id: 'default-artifacts-2',
            name: 'AI Artifacts',
            prompt: 'artifacts, glitch, distortion, overexposed, underexposed, oversaturated, unnatural colors',
            category: 'artifacts',
            createdAt: new Date().toISOString()
        },
    ];
}

interface NegativePromptManagerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    currentPrompt?: string;
    onSelect: (prompt: string) => void;
    onAppend?: (prompt: string) => void;
    embedded?: boolean;
}

export function NegativePromptManager({
    projectId,
    isOpen,
    onClose,
    currentPrompt = "",
    onSelect,
    onAppend,
    embedded = false
}: NegativePromptManagerProps) {
    const [prompts, setPrompts] = useState<SavedNegativePrompt[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<SavedNegativePrompt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<NegativePromptCategory>('all');
    const [customCategories, setCustomCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string } | null>(null);
    const [editCategoryName, setEditCategoryName] = useState("");

    // Form State (for adding new)
    const [newName, setNewName] = useState("");
    const [newPrompt, setNewPrompt] = useState("");
    const [newCategory, setNewCategory] = useState<NegativePromptCategory>('other');
    const [newCustomCategory, setNewCustomCategory] = useState("");

    // Edit Form State
    const [editName, setEditName] = useState("");
    const [editPromptText, setEditPromptText] = useState("");
    const [editCategory, setEditCategory] = useState<NegativePromptCategory>('other');
    const [editCustomCategory, setEditCustomCategory] = useState("");

    // Load prompts and custom categories on mount (project-scoped)
    useEffect(() => {
        if (isOpen && projectId) {
            setPrompts(getSavedPrompts(projectId));
            setCustomCategories(getCustomCategories(projectId));
        }
    }, [isOpen, projectId]);

    // Combine default and custom categories
    const allCategories = useMemo((): { id: string; name: string; icon: string }[] => {
        const promptCategories = new Set(prompts.map(p => p.category).filter(Boolean));
        const defaultIds = new Set(DEFAULT_NEGATIVE_CATEGORIES.map(c => c.id));
        const customIds = new Set(customCategories.map(c => c.id));

        const missingCategories: { id: string; name: string; icon: string }[] = [];
        promptCategories.forEach(catId => {
            if (catId && !defaultIds.has(catId as any) && !customIds.has(catId)) {
                missingCategories.push({ id: catId, name: catId.charAt(0).toUpperCase() + catId.slice(1), icon: '🏷️' });
            }
        });

        const result: { id: string; name: string; icon: string }[] = [
            ...DEFAULT_NEGATIVE_CATEGORIES.slice(0, -1).map(c => ({ id: c.id, name: c.name, icon: c.icon }))
        ];
        result.push(...customCategories);
        result.push(...missingCategories);
        result.push({ id: 'other', name: 'Other', icon: '📁' });
        return result;
    }, [customCategories, prompts]);

    // Filter prompts by category and search
    const filteredPrompts = useMemo(() => {
        let filtered = prompts;
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory || (!p.category && selectedCategory === 'other'));
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.prompt.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [prompts, selectedCategory, searchQuery]);

    const handleAddPrompt = () => {
        if (!newName || !newPrompt) return;
        setError(null);

        let finalCategory = newCategory;
        if (newCategory === '__custom__' && newCustomCategory.trim()) {
            const customCat = addCustomCategory(projectId, newCustomCategory.trim());
            finalCategory = customCat.id;
            setCustomCategories(getCustomCategories(projectId));
        }

        const newSavedPrompt: SavedNegativePrompt = {
            id: `prompt-${Date.now()}`,
            name: newName,
            prompt: newPrompt,
            category: finalCategory,
            createdAt: new Date().toISOString()
        };

        const updated = [...prompts, newSavedPrompt];
        setPrompts(updated);
        savePrompts(projectId, updated);
        setIsAdding(false);
        resetForm();
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this prompt?")) return;
        const updated = prompts.filter(p => p.id !== id);
        setPrompts(updated);
        savePrompts(projectId, updated);
    };

    const resetForm = () => {
        setNewName("");
        setNewPrompt("");
        setNewCategory("other");
        setNewCustomCategory("");
    };

    const startEditing = (prompt: SavedNegativePrompt, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPrompt(prompt);
        setEditName(prompt.name);
        setEditPromptText(prompt.prompt);
        setEditCategory(prompt.category || 'other');
        setEditCustomCategory("");
        setError(null);
    };

    const cancelEditing = () => {
        setEditingPrompt(null);
        setEditName("");
        setEditPromptText("");
        setEditCategory("other");
        setEditCustomCategory("");
        setError(null);
    };

    const handleUpdatePrompt = () => {
        if (!editingPrompt || !editName || !editPromptText) return;
        setError(null);

        let finalCategory = editCategory;
        if (editCategory === '__custom__' && editCustomCategory.trim()) {
            const customCat = addCustomCategory(projectId, editCustomCategory.trim());
            finalCategory = customCat.id;
            setCustomCategories(getCustomCategories(projectId));
        }

        const updated = prompts.map(p =>
            p.id === editingPrompt.id
                ? { ...p, name: editName, prompt: editPromptText, category: finalCategory }
                : p
        );
        setPrompts(updated);
        savePrompts(projectId, updated);
        cancelEditing();
    };

    // Category management functions
    const handleEditCategory = (category: { id: string; name: string; icon: string }) => {
        setEditingCategory(category);
        setEditCategoryName(category.name);
    };

    const handleSaveCategoryEdit = () => {
        if (!editingCategory || !editCategoryName.trim()) return;

        const oldId = editingCategory.id;
        const newId = editCategoryName.toLowerCase().replace(/\s+/g, '-');

        // Update the category
        updateCustomCategory(projectId, oldId, editCategoryName.trim());

        // Update any prompts that used the old category
        if (oldId !== newId) {
            const updatedPrompts = prompts.map(p =>
                p.category === oldId ? { ...p, category: newId } : p
            );
            setPrompts(updatedPrompts);
            savePrompts(projectId, updatedPrompts);
        }

        setCustomCategories(getCustomCategories(projectId));
        setEditingCategory(null);
        setEditCategoryName("");
    };

    const handleDeleteCategory = (category: { id: string; name: string; icon: string }) => {
        if (!confirm(`Delete category "${category.name}"? Prompts in this category will be moved to "Other".`)) return;

        // Move prompts from this category to "other"
        const updatedPrompts = prompts.map(p =>
            p.category === category.id ? { ...p, category: 'other' } : p
        );
        setPrompts(updatedPrompts);
        savePrompts(projectId, updatedPrompts);

        // Delete the category
        deleteCustomCategory(projectId, category.id);
        setCustomCategories(getCustomCategories(projectId));

        // Reset selection if we were viewing the deleted category
        if (selectedCategory === category.id) {
            setSelectedCategory('all');
        }
    };

    const handleSelectPrompt = (prompt: SavedNegativePrompt) => {
        onSelect(prompt.prompt);
        if (!embedded) onClose();
    };

    const handleAppendPrompt = (prompt: SavedNegativePrompt, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAppend) {
            onAppend(prompt.prompt);
        } else {
            const separator = currentPrompt?.trim() ? ', ' : '';
            onSelect(currentPrompt + separator + prompt.prompt);
        }
    };

    // Save current prompt as new
    const handleSaveCurrentPrompt = () => {
        if (!currentPrompt?.trim()) return;
        setNewPrompt(currentPrompt);
        setIsAdding(true);
    };

    if (!isOpen) return null;

    const content = (
        <div className={clsx(
            "bg-[#1a1a1a] border border-white/10 rounded-xl flex flex-col shadow-2xl overflow-hidden",
            embedded ? "w-full h-full max-h-[90vh]" : "w-full max-w-4xl max-h-[85vh]"
        )}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Negative Prompts</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 show-scrollbar-on-hover">
                {/* Search Bar */}
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
                    />
                </div>

                {/* Category Filter Tabs */}
                <div className="mb-4 flex flex-wrap gap-1 items-center">
                    {allCategories.map((cat) => {
                        const count = cat.id === 'all'
                            ? prompts.length
                            : prompts.filter(p => p.category === cat.id || (!p.category && cat.id === 'other')).length;
                        if (count === 0 && cat.id !== 'all') return null;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                                    selectedCategory === cat.id
                                        ? "bg-red-500/30 text-red-300 border border-red-500/50"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
                                )}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                                <span className="text-[10px] opacity-60">({count})</span>
                            </button>
                        );
                    })}
                    {customCategories.length > 0 && (
                        <button
                            onClick={() => setShowCategoryManager(!showCategoryManager)}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all ml-1",
                                showCategoryManager
                                    ? "bg-red-500/30 text-red-300"
                                    : "text-gray-500 hover:text-gray-300 hover:bg-white/10"
                            )}
                            title="Manage custom categories"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Category Manager Panel */}
                {showCategoryManager && customCategories.length > 0 && (
                    <div className="mb-4 bg-white/5 rounded-lg border border-white/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-white">Manage Custom Categories</h3>
                            <button
                                onClick={() => setShowCategoryManager(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {customCategories.map((cat) => (
                                <div
                                    key={cat.id}
                                    className="flex items-center gap-2 p-2 bg-black/30 rounded-lg"
                                >
                                    <span className="text-sm">{cat.icon}</span>
                                    {editingCategory?.id === cat.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editCategoryName}
                                                onChange={(e) => setEditCategoryName(e.target.value)}
                                                className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white focus:border-red-500 outline-none"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveCategoryEdit();
                                                    if (e.key === 'Escape') {
                                                        setEditingCategory(null);
                                                        setEditCategoryName("");
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={handleSaveCategoryEdit}
                                                className="p-1 text-green-400 hover:text-green-300"
                                                title="Save"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingCategory(null);
                                                    setEditCategoryName("");
                                                }}
                                                className="p-1 text-gray-500 hover:text-white"
                                                title="Cancel"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-xs text-white">{cat.name}</span>
                                            <span className="text-[10px] text-gray-500">
                                                ({prompts.filter(p => p.category === cat.id).length})
                                            </span>
                                            <button
                                                onClick={() => handleEditCategory(cat)}
                                                className="p-1 text-gray-500 hover:text-blue-400"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat)}
                                                className="p-1 text-gray-500 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            Custom categories are project-specific. Deleting moves prompts to "Other".
                        </p>
                    </div>
                )}

                {editingPrompt ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Edit Negative Prompt</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Prompt</label>
                                <textarea
                                    value={editPromptText}
                                    onChange={(e) => setEditPromptText(e.target.value)}
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Category</label>
                                <select
                                    value={editCategory}
                                    onChange={(e) => {
                                        setEditCategory(e.target.value as NegativePromptCategory);
                                        if (e.target.value !== '__custom__') {
                                            setEditCustomCategory("");
                                        }
                                    }}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                >
                                    {allCategories.filter(c => c.id !== 'all').map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                    <option value="__custom__">+ New Category...</option>
                                </select>
                            </div>
                            {editCategory === '__custom__' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Custom Category Name</label>
                                    <input
                                        type="text"
                                        value={editCustomCategory}
                                        onChange={(e) => setEditCustomCategory(e.target.value)}
                                        placeholder="e.g. My Custom Category"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs px-1">{error}</div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={cancelEditing}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdatePrompt}
                                disabled={!editName || !editPromptText}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : isAdding ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                        <h3 className="font-medium text-white text-sm">Add Negative Prompt</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Low Quality, Bad Hands"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Prompt</label>
                                <textarea
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    placeholder="e.g. low quality, blurry, deformed..."
                                    rows={3}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Category</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => {
                                        setNewCategory(e.target.value as NegativePromptCategory);
                                        if (e.target.value !== '__custom__') {
                                            setNewCustomCategory("");
                                        }
                                    }}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                >
                                    {allCategories.filter(c => c.id !== 'all').map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                    <option value="__custom__">+ New Category...</option>
                                </select>
                            </div>
                            {newCategory === '__custom__' && (
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Custom Category Name</label>
                                    <input
                                        type="text"
                                        value={newCustomCategory}
                                        onChange={(e) => setNewCustomCategory(e.target.value)}
                                        placeholder="e.g. My Custom Category"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 outline-none"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs px-1">{error}</div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => { setIsAdding(false); resetForm(); }}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPrompt}
                                disabled={!newName || !newPrompt}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                            >
                                Save Prompt
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex-1 py-2 border border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add New
                            </button>
                            {currentPrompt?.trim() && (
                                <button
                                    onClick={handleSaveCurrentPrompt}
                                    className="px-4 py-2 border border-dashed border-red-500/30 rounded-lg text-red-400 hover:text-red-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Library className="w-4 h-4" />
                                    Save Current
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {filteredPrompts.map((prompt) => (
                                <div
                                    key={prompt.id}
                                    className="group flex items-start gap-3 p-3 rounded-lg border bg-white/5 border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-colors cursor-pointer"
                                    onClick={() => handleSelectPrompt(prompt)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm text-white truncate">
                                                {prompt.name}
                                            </h4>
                                            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                                                {allCategories.find(c => c.id === prompt.category)?.name || 'Other'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {prompt.prompt}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleAppendPrompt(prompt, e)}
                                            className="p-1.5 text-gray-500 hover:text-green-400 transition-colors"
                                            title="Append to current"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => startEditing(prompt, e)}
                                            className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(prompt.id, e)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredPrompts.length === 0 && (
                                <p className="text-center text-gray-500 text-xs py-4">
                                    {searchQuery ? "No prompts match your search." : "No prompts in this category."}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {content}
        </div>
    );
}

export default NegativePromptManager;

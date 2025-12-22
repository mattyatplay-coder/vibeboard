'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Check, Pencil, Library, Search, X, Settings } from 'lucide-react';
import { clsx } from 'clsx';

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
const getCustomCategoriesKey = (projectId: string) =>
  `vibeboard-custom-negative-categories-${projectId}`;

export interface SavedNegativePrompt {
  id: string;
  name: string;
  prompt: string;
  category: NegativePromptCategory;
  createdAt: string;
}

// Helper to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
function saveCustomCategories(
  projectId: string,
  categories: { id: string; name: string; icon: string }[]
) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getCustomCategoriesKey(projectId), JSON.stringify(categories));
}

// Helper to add a new custom category (project-scoped)
function addCustomCategory(
  projectId: string,
  name: string
): { id: string; name: string; icon: string } {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const newCategory = { id, name, icon: '🏷️' };
  const existing = getCustomCategories(projectId);
  if (!existing.find(c => c.id === id)) {
    saveCustomCategories(projectId, [...existing, newCategory]);
  }
  return newCategory;
}

// Helper to update a custom category (project-scoped)
function updateCustomCategory(
  projectId: string,
  oldId: string,
  newName: string
): { id: string; name: string; icon: string } | null {
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
      prompt:
        'low quality, blurry, pixelated, jpeg artifacts, compression artifacts, noisy, grainy',
      category: 'quality',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-quality-2',
      name: 'Bad Resolution',
      prompt: 'low resolution, worst quality, normal quality, lowres, bad quality',
      category: 'quality',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-anatomy-1',
      name: 'Bad Anatomy',
      prompt:
        'bad anatomy, bad proportions, deformed, disfigured, malformed, mutated, extra limbs, missing limbs',
      category: 'anatomy',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-anatomy-2',
      name: 'Bad Hands',
      prompt:
        'bad hands, extra fingers, missing fingers, fused fingers, too many fingers, mutated hands, malformed hands',
      category: 'anatomy',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-anatomy-3',
      name: 'Bad Face',
      prompt:
        'bad face, ugly face, deformed face, asymmetric face, crooked nose, bad eyes, cross-eyed',
      category: 'anatomy',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-style-1',
      name: 'Cartoon/Anime',
      prompt: 'cartoon, anime, 3d render, illustration, painting, drawing, sketch, unrealistic',
      category: 'style',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-composition-1',
      name: 'Bad Composition',
      prompt: 'cropped, out of frame, cut off, poorly framed, bad composition, awkward pose',
      category: 'composition',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-artifacts-1',
      name: 'Watermarks & Text',
      prompt: 'watermark, text, logo, signature, username, artist name, copyright, banner',
      category: 'artifacts',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-artifacts-2',
      name: 'AI Artifacts',
      prompt:
        'artifacts, glitch, distortion, overexposed, underexposed, oversaturated, unnatural colors',
      category: 'artifacts',
      createdAt: new Date().toISOString(),
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
  currentPrompt = '',
  onSelect,
  onAppend,
  embedded = false,
}: NegativePromptManagerProps) {
  const [prompts, setPrompts] = useState<SavedNegativePrompt[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedNegativePrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NegativePromptCategory>('all');
  const [customCategories, setCustomCategories] = useState<
    { id: string; name: string; icon: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
    icon: string;
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Form State (for adding new)
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState<NegativePromptCategory>('other');
  const [newCustomCategory, setNewCustomCategory] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPromptText, setEditPromptText] = useState('');
  const [editCategory, setEditCategory] = useState<NegativePromptCategory>('other');
  const [editCustomCategory, setEditCustomCategory] = useState('');

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
        missingCategories.push({
          id: catId,
          name: catId.charAt(0).toUpperCase() + catId.slice(1),
          icon: '🏷️',
        });
      }
    });

    const result: { id: string; name: string; icon: string }[] = [
      ...DEFAULT_NEGATIVE_CATEGORIES.slice(0, -1).map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
      })),
    ];
    result.push(...customCategories);
    result.push(...missingCategories);
    result.push({ id: 'other', name: 'Other', icon: '📁' });
    return result;
  }, [customCategories, prompts]);

  // Helper to check if a prompt is already in the current negative prompt
  const isPromptAdded = (promptText: string): boolean => {
    if (!currentPrompt?.trim()) return false;
    // Normalize both strings for comparison (trim whitespace, lowercase)
    const normalizedCurrent = currentPrompt.toLowerCase();
    const normalizedPrompt = promptText.toLowerCase().trim();
    // Check if the prompt text is contained in the current prompt
    return normalizedCurrent.includes(normalizedPrompt);
  };

  // Filter prompts by category and search
  const filteredPrompts = useMemo(() => {
    let filtered = prompts;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        p => p.category === selectedCategory || (!p.category && selectedCategory === 'other')
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(query) || p.prompt.toLowerCase().includes(query)
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
      createdAt: new Date().toISOString(),
    };

    const updated = [...prompts, newSavedPrompt];
    setPrompts(updated);
    savePrompts(projectId, updated);
    setIsAdding(false);
    resetForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    const updated = prompts.filter(p => p.id !== id);
    setPrompts(updated);
    savePrompts(projectId, updated);
  };

  const resetForm = () => {
    setNewName('');
    setNewPrompt('');
    setNewCategory('other');
    setNewCustomCategory('');
  };

  const startEditing = (prompt: SavedNegativePrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setEditName(prompt.name);
    setEditPromptText(prompt.prompt);
    setEditCategory(prompt.category || 'other');
    setEditCustomCategory('');
    setError(null);
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setEditName('');
    setEditPromptText('');
    setEditCategory('other');
    setEditCustomCategory('');
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
    setEditCategoryName('');
  };

  const handleDeleteCategory = (category: { id: string; name: string; icon: string }) => {
    if (
      !confirm(
        `Delete category "${category.name}"? Prompts in this category will be moved to "Other".`
      )
    )
      return;

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
    // Toggle behavior - if already added, remove it; otherwise add it
    if (isPromptAdded(prompt.prompt)) {
      // Remove the prompt from current
      handleRemovePrompt(prompt.prompt);
    } else {
      // Append behavior - don't close modal to allow multiple selections
      if (onAppend) {
        onAppend(prompt.prompt);
      } else {
        const separator = currentPrompt?.trim() ? ', ' : '';
        onSelect(currentPrompt + separator + prompt.prompt);
      }
    }
    // Don't close - allow user to select multiple prompts
  };

  const handleRemovePrompt = (promptText: string) => {
    if (!currentPrompt?.trim()) return;

    // Remove the prompt text from current prompt
    const normalizedPrompt = promptText.toLowerCase().trim();

    // Split by comma, filter out matching prompt, rejoin
    const parts = currentPrompt
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    const filteredParts = parts.filter(p => p.toLowerCase() !== normalizedPrompt);

    // If filtering didn't remove anything, try substring removal for compound prompts
    if (filteredParts.length === parts.length) {
      // Try to remove as substring (handles prompts with embedded commas)
      let newPrompt = currentPrompt;
      // Remove with leading comma
      newPrompt = newPrompt.replace(new RegExp(',\\s*' + escapeRegExp(promptText), 'gi'), '');
      // Remove with trailing comma
      newPrompt = newPrompt.replace(new RegExp(escapeRegExp(promptText) + '\\s*,', 'gi'), '');
      // Remove if it's the only/last item
      newPrompt = newPrompt.replace(new RegExp(escapeRegExp(promptText), 'gi'), '');
      // Clean up extra commas and whitespace
      newPrompt = newPrompt
        .replace(/,\s*,/g, ',')
        .replace(/^\s*,\s*/, '')
        .replace(/\s*,\s*$/, '')
        .trim();
      onSelect(newPrompt);
    } else {
      onSelect(filteredParts.join(', '));
    }
  };

  const handleReplacePrompt = (prompt: SavedNegativePrompt, e: React.MouseEvent) => {
    e.stopPropagation();
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
    // Don't close - allow user to select multiple prompts
  };

  // Save current prompt as new
  const handleSaveCurrentPrompt = () => {
    if (!currentPrompt?.trim()) return;
    setNewPrompt(currentPrompt);
    setIsAdding(true);
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={clsx(
        'flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl',
        embedded ? 'h-full max-h-[90vh] w-full' : 'max-h-[85vh] w-full max-w-4xl'
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h2 className="text-lg font-bold text-white">Negative Prompts</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="show-scrollbar-on-hover flex-1 overflow-y-auto p-4">
        {/* Current Negative Prompt Display */}
        {currentPrompt?.trim() && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-red-300">Current Negative Prompt</span>
              <button
                onClick={() => onSelect('')}
                className="text-xs text-red-400 transition-colors hover:text-red-300"
              >
                Clear All
              </button>
            </div>
            <p className="text-sm leading-relaxed break-words text-gray-300">{currentPrompt}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pr-3 pl-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-1">
          {allCategories.map(cat => {
            const count =
              cat.id === 'all'
                ? prompts.length
                : prompts.filter(p => p.category === cat.id || (!p.category && cat.id === 'other'))
                    .length;
            if (count === 0 && cat.id !== 'all') return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={clsx(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all',
                  selectedCategory === cat.id
                    ? 'border border-red-500/50 bg-red-500/30 text-red-300'
                    : 'border border-transparent bg-white/5 text-gray-400 hover:bg-white/10'
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
                'ml-1 rounded-lg p-1.5 transition-all',
                showCategoryManager
                  ? 'bg-red-500/30 text-red-300'
                  : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
              )}
              title="Manage custom categories"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Manager Panel */}
        {showCategoryManager && customCategories.length > 0 && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-white">Manage Custom Categories</h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {customCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
                  <span className="text-sm">{cat.icon}</span>
                  {editingCategory?.id === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={e => setEditCategoryName(e.target.value)}
                        className="flex-1 rounded border border-white/20 bg-black/50 px-2 py-1 text-xs text-white outline-none focus:border-red-500"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveCategoryEdit();
                          if (e.key === 'Escape') {
                            setEditingCategory(null);
                            setEditCategoryName('');
                          }
                        }}
                      />
                      <button
                        onClick={handleSaveCategoryEdit}
                        className="p-1 text-green-400 hover:text-green-300"
                        title="Save"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setEditCategoryName('');
                        }}
                        className="p-1 text-gray-500 hover:text-white"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
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
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-gray-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              Custom categories are project-specific. Deleting moves prompts to "Other".
            </p>
          </div>
        )}

        {editingPrompt ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-white">Edit Negative Prompt</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Prompt</label>
                <textarea
                  value={editPromptText}
                  onChange={e => setEditPromptText(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Category</label>
                <select
                  value={editCategory}
                  onChange={e => {
                    setEditCategory(e.target.value as NegativePromptCategory);
                    if (e.target.value !== '__custom__') {
                      setEditCustomCategory('');
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                >
                  {allCategories
                    .filter(c => c.id !== 'all')
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  <option value="__custom__">+ New Category...</option>
                </select>
              </div>
              {editCategory === '__custom__' && (
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Custom Category Name</label>
                  <input
                    type="text"
                    value={editCustomCategory}
                    onChange={e => setEditCustomCategory(e.target.value)}
                    placeholder="e.g. My Custom Category"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {error && <div className="px-1 text-xs text-red-400">{error}</div>}

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
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : isAdding ? (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-medium text-white">Add Negative Prompt</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Low Quality, Bad Hands"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Prompt</label>
                <textarea
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  placeholder="e.g. low quality, blurry, deformed..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Category</label>
                <select
                  value={newCategory}
                  onChange={e => {
                    setNewCategory(e.target.value as NegativePromptCategory);
                    if (e.target.value !== '__custom__') {
                      setNewCustomCategory('');
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                >
                  {allCategories
                    .filter(c => c.id !== 'all')
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  <option value="__custom__">+ New Category...</option>
                </select>
              </div>
              {newCategory === '__custom__' && (
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Custom Category Name</label>
                  <input
                    type="text"
                    value={newCustomCategory}
                    onChange={e => setNewCustomCategory(e.target.value)}
                    placeholder="e.g. My Custom Category"
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {error && <div className="px-1 text-xs text-red-400">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPrompt}
                disabled={!newName || !newPrompt}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-2 text-sm text-gray-400 transition-all hover:border-white/40 hover:bg-white/5 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>
              {currentPrompt?.trim() && (
                <button
                  onClick={handleSaveCurrentPrompt}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-red-500/30 px-4 py-2 text-sm text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Library className="h-4 w-4" />
                  Save Current
                </button>
              )}
            </div>

            <div className="space-y-2">
              {filteredPrompts.map(prompt => {
                const alreadyAdded = isPromptAdded(prompt.prompt);
                return (
                  <div
                    key={prompt.id}
                    className={clsx(
                      'group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      alreadyAdded
                        ? 'border-green-500/40 bg-green-500/15 hover:bg-green-500/20'
                        : 'border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5'
                    )}
                    onClick={() => handleSelectPrompt(prompt)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4
                          className={clsx(
                            'truncate text-sm font-medium',
                            alreadyAdded ? 'text-green-300' : 'text-white'
                          )}
                        >
                          {prompt.name}
                        </h4>
                        {alreadyAdded && (
                          <span className="flex items-center gap-1 rounded bg-green-500/30 px-1.5 py-0.5 text-[10px] text-green-300">
                            <Check className="h-2.5 w-2.5" />
                            Added
                          </span>
                        )}
                        <span
                          className={clsx(
                            'rounded px-1.5 py-0.5 text-[10px]',
                            alreadyAdded
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          )}
                        >
                          {allCategories.find(c => c.id === prompt.category)?.name || 'Other'}
                        </span>
                      </div>
                      <p
                        className={clsx(
                          'line-clamp-2 text-xs',
                          alreadyAdded ? 'text-green-400/70' : 'text-gray-500'
                        )}
                      >
                        {prompt.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => handleAppendPrompt(prompt, e)}
                        className={clsx(
                          'rounded p-1.5 transition-colors',
                          alreadyAdded
                            ? 'text-green-400 hover:bg-green-500/20 hover:text-green-300'
                            : 'text-green-500 hover:bg-green-500/10 hover:text-green-400'
                        )}
                        title={alreadyAdded ? 'Add again' : 'Append to current'}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={e => startEditing(prompt, e)}
                        className="p-1.5 text-gray-500 transition-colors hover:text-blue-400"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => handleDelete(prompt.id, e)}
                        className="p-1.5 text-gray-500 transition-colors hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPrompts.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-500">
                  {searchQuery ? 'No prompts match your search.' : 'No prompts in this category.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Use Selected Prompts Button */}
      <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
        <button
          onClick={onClose}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all',
            currentPrompt?.trim()
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500'
              : 'bg-white/10 text-gray-400 hover:bg-white/15'
          )}
        >
          <Check className="h-4 w-4" />
          {currentPrompt?.trim() ? `Use Selected Prompts` : 'Close'}
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      {content}
    </div>
  );
}

export default NegativePromptManager;

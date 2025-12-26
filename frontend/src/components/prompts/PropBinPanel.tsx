'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Package, Image as ImageIcon, Tag, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { usePropBinStore, Prop, PROP_CATEGORIES } from '@/lib/propBinStore';

interface PropBinPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PropCategory = keyof typeof PROP_CATEGORIES | 'all';

export function PropBinPanel({ isOpen, onClose }: PropBinPanelProps) {
  const { props, addProp, updateProp, deleteProp } = usePropBinStore();
  const [editingProp, setEditingProp] = useState<Prop | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<PropCategory>('all');

  // New prop form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<Prop['category']>('custom');
  const [newTags, setNewTags] = useState('');

  const filteredProps = props.filter(prop => {
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
      tags: newTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    });

    // Reset form
    setNewName('');
    setNewDescription('');
    setNewCategory('custom');
    setNewTags('');
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
          className="fixed top-20 right-4 z-50 flex max-h-[85vh] w-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Prop Bin</h2>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">
                #PropName
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2 border-b border-white/10 p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search props..."
                className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterCategory('all')}
                className={clsx(
                  'rounded-md px-2 py-1 text-xs transition-colors',
                  filterCategory === 'all'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                All
              </button>
              {Object.entries(PROP_CATEGORIES).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategory(key as PropCategory)}
                  className={clsx(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                    filterCategory === key
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  )}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Props List */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {filteredProps.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                {searchQuery ? 'No props match your search' : 'No props yet. Create one!'}
              </div>
            ) : (
              filteredProps.map(prop => (
                <div
                  key={prop.id}
                  className="group rounded-lg border border-white/10 bg-black/30 p-3 transition-colors hover:border-white/20"
                >
                  {editingProp?.id === prop.id ? (
                    // Editing Mode
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingProp.name}
                        onChange={e => setEditingProp({ ...editingProp, name: e.target.value })}
                        className="h-8 w-full rounded border border-amber-500/30 bg-black/50 px-2 text-sm text-white focus:outline-none"
                        placeholder="PropName (no spaces)"
                      />
                      <textarea
                        value={editingProp.description}
                        onChange={e =>
                          setEditingProp({ ...editingProp, description: e.target.value })
                        }
                        className="h-20 w-full resize-none rounded border border-white/10 bg-black/50 px-2 py-1 text-xs text-white focus:border-amber-500/30 focus:outline-none"
                        placeholder="Detailed prompt description..."
                      />
                      <select
                        value={editingProp.category || 'custom'}
                        onChange={e =>
                          setEditingProp({
                            ...editingProp,
                            category: e.target.value as Prop['category'],
                          })
                        }
                        className="h-8 w-full rounded border border-white/10 bg-black/50 px-2 text-xs text-white focus:outline-none"
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
                          className="h-8 flex-1 rounded bg-amber-500/20 text-xs text-amber-300 transition-colors hover:bg-amber-500/30"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingProp(null)}
                          className="h-8 flex-1 rounded bg-white/5 text-xs text-gray-400 transition-colors hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyToClipboard(prop.name)}
                              className="font-mono text-sm text-amber-400 transition-colors hover:text-amber-300"
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
                          <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                            {prop.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setEditingProp(prop)}
                            className="rounded p-1.5 transition-colors hover:bg-white/10"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                          <button
                            onClick={() => deleteProp(prop.id)}
                            className="rounded p-1.5 transition-colors hover:bg-red-500/20"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                      {prop.tags && prop.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prop.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500"
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
          <div className="border-t border-white/10 p-3">
            {isCreating ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value.replace(/\s+/g, ''))}
                  placeholder="PropName (no spaces)"
                  className="h-9 w-full rounded-lg border border-amber-500/30 bg-black/30 px-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Detailed prompt description (e.g., 'vintage rotary telephone, cherry red bakelite, brass dial')"
                  className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-amber-500/30 focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as Prop['category'])}
                    className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white focus:outline-none"
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
                    onChange={e => setNewTags(e.target.value)}
                    placeholder="Tags (comma-separated)"
                    className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newDescription.trim()}
                    className="h-10 flex-1 rounded-lg bg-amber-500/20 font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create Prop
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewName('');
                      setNewDescription('');
                      setNewTags('');
                    }}
                    className="h-10 rounded-lg bg-white/5 px-4 text-gray-400 transition-colors hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Prop</span>
              </button>
            )}
          </div>

          {/* Usage Hint */}
          <div className="px-3 pb-3">
            <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-2 text-[10px] text-amber-400/70">
              <strong>Usage:</strong> Type{' '}
              <code className="rounded bg-black/30 px-1">#PropName</code> in your prompt. It will
              expand to the full description when generating.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

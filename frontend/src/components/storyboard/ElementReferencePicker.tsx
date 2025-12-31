'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Users, Search, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { fetchAPI, resolveFileUrl } from '@/lib/api';

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
  onStrengthChange,
}: ElementReferencePickerProps) {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'character' | 'style' | 'prop'>('all');
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
      console.error('Failed to load elements', err);
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
    const matchesSearch =
      el.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || el.type === filterType;
    return matchesSearch && matchesType;
  });

  // Build the @Image reference string for prompting
  const buildReferencePrompt = () => {
    return selectedElements.map((_, idx) => `@Image${idx + 1}`).join(', ');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Element References</h2>
              <p className="text-xs text-gray-500">
                Select up to {maxElements} elements for character/style consistency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search elements..."
              className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'character', 'style', 'prop'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  filterType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Elements Preview */}
        {selectedElements.length > 0 && (
          <div className="border-b border-purple-500/20 bg-purple-500/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-purple-300">
                  Selected ({selectedElements.length}/{maxElements})
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium tracking-wider text-purple-300 uppercase">
                      Creative
                    </span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.01"
                      value={
                        activeElementId ? elementStrengths[activeElementId] || 0.6 : creativity
                      }
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (activeElementId) {
                          onStrengthChange(activeElementId, val);
                        } else if (onCreativityChange) {
                          onCreativityChange(val);
                        }
                      }}
                      disabled={!activeElementId && !onCreativityChange}
                      className={clsx(
                        'h-1.5 w-32 cursor-pointer appearance-none rounded-lg transition-all',
                        activeElementId
                          ? 'bg-gray-700 accent-purple-500 hover:accent-purple-400'
                          : 'bg-gray-800 accent-gray-600'
                      )}
                    />
                    <span className="text-[10px] font-medium tracking-wider text-purple-300 uppercase">
                      Strict
                    </span>
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[8px] text-gray-500">Picasso</span>
                    <span className="text-[8px] text-gray-500">Da Vinci</span>
                  </div>
                </div>
                <span className="w-8 text-right font-mono text-xs font-bold text-purple-400">
                  {(
                    (activeElementId ? elementStrengths[activeElementId] || 0.6 : creativity) * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <span className="font-mono text-xs text-gray-500">
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
                      'relative flex-shrink-0 cursor-pointer transition-all',
                      activeElementId === id ? 'z-10 scale-105' : 'opacity-80 hover:opacity-100'
                    )}
                    onClick={() => setActiveElementId(id)}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={`Element ${idx + 1}`}
                        className={clsx(
                          'h-16 w-16 rounded-lg border-2 object-cover',
                          activeElementId === id
                            ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                            : 'border-purple-500'
                        )}
                        onError={e => {
                          console.error('Image load failed for URL:', url);
                          console.error('Original fileUrl:', el?.fileUrl);
                          e.currentTarget.style.border = '2px solid red';
                        }}
                      />
                    ) : (
                      <div
                        className={clsx(
                          'flex h-16 w-16 items-center justify-center rounded-lg border-2 bg-gray-800',
                          activeElementId === id
                            ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                            : 'border-purple-500'
                        )}
                      >
                        <span className="text-[10px] text-gray-500">No image</span>
                      </div>
                    )}
                    <div className="absolute -top-1 -left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-purple-500 text-[10px] font-bold text-white shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="absolute right-0 bottom-0 left-0 flex items-center justify-between bg-black/60 px-1 py-0.5 text-center backdrop-blur-[2px]">
                      <span className="font-mono text-[8px] font-medium text-white">
                        @Image{idx + 1}
                      </span>
                      <span className="ml-1 text-[8px] font-bold text-blue-300">
                        {((elementStrengths[id] || 0.6) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleElement(id);
                      }}
                      className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-red-500 text-white shadow-sm hover:bg-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Elements Grid */}
        <div className="max-h-80 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading elements...</div>
          ) : filteredElements.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No elements found. Create elements on the Elements page.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredElements.map(element => {
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
                      'relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                      isSelected
                        ? activeElementId === element.id
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-purple-500 ring-2 ring-purple-500/30'
                        : canSelect
                          ? 'border-white/10 hover:border-white/30'
                          : 'cursor-not-allowed border-white/5 opacity-50'
                    )}
                  >
                    {url ? (
                      <img src={url} alt={element.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-800">
                        <span className="text-xs text-gray-500">No image</span>
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-purple-500/20 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-purple-500 font-bold text-white shadow-lg">
                            {selectionIndex + 1}
                          </div>
                          <span className="rounded border border-white/10 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white">
                            @Image{selectionIndex + 1}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Element Name */}
                    <div className="absolute right-0 bottom-0 left-0 bg-black/60 p-1 backdrop-blur-sm">
                      <p className="truncate text-center text-[10px] text-white">{element.name}</p>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-1 left-1">
                      <span
                        className={clsx(
                          'rounded px-1.5 py-0.5 text-[8px] font-medium',
                          element.type === 'character' && 'bg-blue-500/80 text-white',
                          element.type === 'style' && 'bg-purple-500/80 text-white',
                          element.type === 'prop' && 'bg-green-500/80 text-white',
                          !element.type && 'bg-gray-500/80 text-white'
                        )}
                      >
                        {element.type || 'other'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info & Actions */}
        <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
            <div className="text-xs leading-relaxed text-blue-300/80">
              <strong>Kling O1 Elements:</strong> Reference selected elements in your prompt using{' '}
              <code className="rounded bg-black/30 px-1">@Image1</code>,{' '}
              <code className="rounded bg-black/30 px-1">@Image2</code>, etc. for character/style
              consistency.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
            >
              Apply ({selectedElements.length})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

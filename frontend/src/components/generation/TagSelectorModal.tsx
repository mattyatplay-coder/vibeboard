'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { X, Check, Search, Tag as TagIcon } from 'lucide-react';
import { Tag } from '@/components/tag-system';
import { sampleTagData } from '@/components/tag-system/sampleTagData';

export interface TagSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsApply: (tags: Tag[]) => void;
  initialTags?: Tag[];
}

export function TagSelectorModal({
  isOpen,
  onClose,
  onTagsApply,
  initialTags = [],
}: TagSelectorModalProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialTags);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleApply = () => {
    onTagsApply(selectedTags);
    onClose();
  };

  const handleClose = () => {
    setSelectedTags(initialTags);
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(sampleTagData.map(tag => tag.category)))];
  }, []);

  const filteredTags = useMemo(() => {
    return sampleTagData.filter(tag => {
      const matchesSearch =
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.promptKeyword.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
      const notSelected = !selectedTags.find(st => st.id === tag.id);
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [searchQuery, selectedCategory, selectedTags]);

  const handleAddTag = useCallback(
    (tag: Tag) => {
      if (selectedTags.length < 15) {
        setSelectedTags(prev => [...prev, tag]);
      }
    },
    [selectedTags]
  );

  const handleRemoveTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTags([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Add Tags to Prompt</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Selected Tags Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <TagIcon className="h-4 w-4" />
                Selected Tags ({selectedTags.length}/15)
              </label>
              {selectedTags.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              {selectedTags.length === 0 ? (
                <span className="text-sm text-gray-500 italic">No tags selected</span>
              ) : (
                selectedTags.map(tag => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white transition-all"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 rounded-full p-0.5 transition-colors hover:bg-white/20"
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-10 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="-mb-2 flex gap-1.5 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>

          {/* Available Tags */}
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {filteredTags.slice(0, 50).map(tag => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag)}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-2 text-left transition-colors hover:border-white/10 hover:bg-white/10"
              >
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color || '#6B7280' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{tag.name}</div>
                  <div className="truncate text-xs text-gray-500">{tag.category}</div>
                </div>
              </button>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <div className="py-8 text-center text-gray-500">No tags found matching your search</div>
          )}

          {selectedTags.length >= 15 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-400">
              Maximum 15 tags reached. Remove a tag to add more.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-6 py-4">
          <div className="text-sm text-gray-400">
            {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedTags.length === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Apply Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagSelectorModal;

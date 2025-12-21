"use client";

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
      const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.promptKeyword.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
      const notSelected = !selectedTags.find(st => st.id === tag.id);
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [searchQuery, selectedCategory, selectedTags]);

  const handleAddTag = useCallback((tag: Tag) => {
    if (selectedTags.length < 15) {
      setSelectedTags(prev => [...prev, tag]);
    }
  }, [selectedTags]);

  const handleRemoveTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTags([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Add Tags to Prompt</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Selected Tags Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Selected Tags ({selectedTags.length}/15)
              </label>
              {selectedTags.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 min-h-[42px] p-3 bg-white/5 rounded-lg border border-white/10">
              {selectedTags.length === 0 ? (
                <span className="text-sm text-gray-500 italic">No tags selected</span>
              ) : (
                selectedTags.map(tag => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white transition-all"
                    style={{ backgroundColor: tag.color || '#6B7280' }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex overflow-x-auto gap-1.5 pb-2 -mb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {filteredTags.slice(0, 50).map(tag => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag)}
                className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left border border-white/5 hover:border-white/10"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color || '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {tag.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {tag.category}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No tags found matching your search
            </div>
          )}

          {selectedTags.length >= 15 && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              Maximum 15 tags reached. Remove a tag to add more.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20">
          <div className="text-sm text-gray-400">
            {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedTags.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagSelectorModal;

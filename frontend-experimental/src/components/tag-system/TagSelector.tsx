import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, X, Tag as TagIcon, ChevronDown } from 'lucide-react';

export interface Tag {
  id: string;
  name: string;
  category: string;
  promptKeyword: string;
  color?: string;
  description?: string;
}

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
  availableTags?: Tag[];
  availableCategories?: string[];
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  maxTags = 10,
  availableTags = [],
  availableCategories,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Use provided tags or empty array
  const allTags = availableTags;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(allTags.map(tag => tag.category)));
    return availableCategories || cats;
  }, [allTags, availableCategories]);

  const filteredTags = useMemo(() => {
    return allTags.filter(tag => {
      const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.promptKeyword.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
      const notSelected = !selectedTags.find(st => st.id === tag.id);
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [allTags, searchQuery, selectedCategory, selectedTags]);

  const handleAddTag = useCallback((tag: Tag) => {
    if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  }, [selectedTags, maxTags, onTagsChange]);

  const handleRemoveTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  }, [selectedTags, onTagsChange]);

  const handleClearAll = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  const canAddMore = selectedTags.length < maxTags;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Tags Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <TagIcon className="w-4 h-4" />
            Selected Tags ({selectedTags.length}/{maxTags})
          </label>
          {selectedTags.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 min-h-[42px] p-3 bg-gray-50 rounded-lg border border-gray-200">
          {selectedTags.length === 0 ? (
            <span className="text-sm text-gray-400 italic">No tags selected</span>
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

      {/* Search and Filter */}
      {canAddMore && (
        <div className="space-y-3" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex overflow-x-auto gap-1.5 pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => {
                  if (selectedCategory === category && isDropdownOpen) {
                    setIsDropdownOpen(false);
                  } else {
                    setSelectedCategory(category);
                    setIsDropdownOpen(true);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Tag Dropdown */}
          {isDropdownOpen && filteredTags.length > 0 && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 space-y-1">
                  {filteredTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tag.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tag.category}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Max Tags Warning */}
      {!canAddMore && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Maximum {maxTags} tags reached. Remove a tag to add more.
        </div>
      )}
    </div>
  );
};

export default TagSelector;

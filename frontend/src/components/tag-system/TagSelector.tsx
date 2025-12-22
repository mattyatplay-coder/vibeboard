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
      const matchesSearch =
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tag.promptKeyword.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
      const notSelected = !selectedTags.find(st => st.id === tag.id);
      return matchesSearch && matchesCategory && notSelected;
    });
  }, [allTags, searchQuery, selectedCategory, selectedTags]);

  const handleAddTag = useCallback(
    (tag: Tag) => {
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tag]);
        setSearchQuery('');
        setIsDropdownOpen(false);
      }
    },
    [selectedTags, maxTags, onTagsChange]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onTagsChange(selectedTags.filter(t => t.id !== tagId));
    },
    [selectedTags, onTagsChange]
  );

  const handleClearAll = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  const canAddMore = selectedTags.length < maxTags;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Selected Tags Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <TagIcon className="h-4 w-4" />
            Selected Tags ({selectedTags.length}/{maxTags})
          </label>
          {selectedTags.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {selectedTags.length === 0 ? (
            <span className="text-sm text-gray-400 italic">No tags selected</span>
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

      {/* Search and Filter */}
      {canAddMore && (
        <div className="space-y-3" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search tags..."
              className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent -mb-2 flex gap-1.5 overflow-x-auto pb-2">
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
                className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
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
              <div className="absolute top-0 right-0 left-0 z-10 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="space-y-1 p-2">
                  {filteredTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                          <div className="text-xs text-gray-500">{tag.category}</div>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-600">
          Maximum {maxTags} tags reached. Remove a tag to add more.
        </div>
      )}
    </div>
  );
};

export default TagSelector;

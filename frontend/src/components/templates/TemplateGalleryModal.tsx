import { useState, useEffect } from 'react';
import { X, LayoutTemplate, Search, Trash2, Check, User, Globe } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  config: any;
  previewUrl?: string;
  isPublic: boolean;
  userId?: string;
}

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: any) => void;
  userId?: string; // Optional: current user ID to show delete options
}

export const TemplateGalleryModal = ({
  isOpen,
  onClose,
  onApply,
  userId,
}: TemplateGalleryModalProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAPI('/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await fetchAPI(`/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (err) {
      console.error('Failed to delete template', err);
      toast.error('Failed to delete template');
    }
  };

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        {/* Sidebar */}
        <div className="flex w-64 flex-col border-r border-white/10 bg-white/5">
          <div className="border-b border-white/10 p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <LayoutTemplate className="h-5 w-5 text-purple-400" />
              Templates
            </h2>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-lg border border-white/10 bg-black/50 py-2 pr-4 pl-9 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <LayoutTemplate className="mb-4 h-12 w-12 opacity-20" />
                <p>No templates found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
                    onClick={() => {
                      onApply(template.config);
                      onClose();
                      toast.success(`Applied "${template.name}" template`);
                    }}
                  >
                    {/* Preview Area */}
                    <div className="relative aspect-video bg-black/50">
                      {template.previewUrl ? (
                        <img
                          src={template.previewUrl}
                          alt={template.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-600">
                          <LayoutTemplate className="h-8 w-8 opacity-50" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {template.isPublic ? (
                          <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 backdrop-blur-sm">
                            <Globe className="h-3 w-3" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] text-gray-400 backdrop-blur-sm">
                            <User className="h-3 w-3" /> Private
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info Area */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-medium text-white transition-colors group-hover:text-purple-400">
                          {template.name}
                        </h3>
                        {/* Delete Button (Only if owner) */}
                        {/* For now, allow deleting any non-public or if we implement user auth properly later */}
                        {!template.isPublic && (
                          <Tooltip content="Delete Template" side="top">
                            <button
                              onClick={e => handleDelete(template.id, e)}
                              className="text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                      <p className="mb-4 line-clamp-2 flex-1 text-xs text-gray-400">
                        {template.description || 'No description'}
                      </p>

                      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-xs text-gray-500">
                        <span>
                          {template.config.engineConfig?.model?.split('/').pop() || 'Unknown Model'}
                        </span>
                        <span className="flex items-center gap-1 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
                          Apply <Check className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

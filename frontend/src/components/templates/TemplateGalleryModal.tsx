import { useState, useEffect } from 'react';
import { X, LayoutTemplate, Search, Trash2, Check, User, Globe } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

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

export const TemplateGalleryModal = ({ isOpen, onClose, onApply, userId }: TemplateGalleryModalProps) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
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
            console.error("Failed to load templates", err);
            toast.error("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            await fetchAPI(`/templates/${id}`, { method: 'DELETE' });
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success("Template deleted");
        } catch (err) {
            console.error("Failed to delete template", err);
            toast.error("Failed to delete template");
        }
    };

    const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl">
                {/* Sidebar */}
                <div className="w-64 border-r border-white/10 bg-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-purple-400" />
                            Templates
                        </h2>
                    </div>
                    <div className="p-2 overflow-y-auto flex-1 space-y-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Loading templates...
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <LayoutTemplate className="w-12 h-12 mb-4 opacity-20" />
                                <p>No templates found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer flex flex-col"
                                        onClick={() => {
                                            onApply(template.config);
                                            onClose();
                                            toast.success(`Applied "${template.name}" template`);
                                        }}
                                    >
                                        {/* Preview Area */}
                                        <div className="aspect-video bg-black/50 relative">
                                            {template.previewUrl ? (
                                                <img src={template.previewUrl} alt={template.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <LayoutTemplate className="w-8 h-8 opacity-50" />
                                                </div>
                                            )}

                                            {/* Badges */}
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                {template.isPublic ? (
                                                    <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                                        <Globe className="w-3 h-3" /> Public
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-500/20 text-gray-400 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                                        <User className="w-3 h-3" /> Private
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Area */}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">
                                                    {template.name}
                                                </h3>
                                                {/* Delete Button (Only if owner) */}
                                                {/* For now, allow deleting any non-public or if we implement user auth properly later */}
                                                {!template.isPublic && (
                                                    <button
                                                        onClick={(e) => handleDelete(template.id, e)}
                                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-2 mb-4 flex-1">
                                                {template.description || "No description"}
                                            </p>

                                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-3 mt-auto">
                                                <span>{template.config.engineConfig?.model?.split('/').pop() || 'Unknown Model'}</span>
                                                <span className="flex items-center gap-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Apply <Check className="w-3 h-3" />
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

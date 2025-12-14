import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

interface SaveTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: any; // The current configuration to save
}

export const SaveTemplateModal = ({ isOpen, onClose, config }: SaveTemplateModalProps) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Custom");
    const [isPublic, setIsPublic] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Please enter a template name");
            return;
        }

        setIsSaving(true);
        try {
            await fetchAPI('/templates', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description,
                    category,
                    config,
                    isPublic
                })
            });
            toast.success("Template saved successfully");
            onClose();
            // Reset form
            setName("");
            setDescription("");
            setCategory("Custom");
            setIsPublic(false);
        } catch (err) {
            console.error("Failed to save template", err);
            toast.error("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Save className="w-5 h-5 text-purple-400" />
                        Save as Template
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Template Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Cinematic Dark Sci-Fi"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe what this template does..."
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none h-24"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="Custom">Custom</option>
                                <option value="Cinematic">Cinematic</option>
                                <option value="Anime">Anime</option>
                                <option value="Photorealistic">Photorealistic</option>
                                <option value="Product">Product</option>
                                <option value="3D Render">3D Render</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Visibility</label>
                            <div className="flex items-center gap-2 h-10">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="rounded border-gray-600 bg-black/50"
                                />
                                <span className="text-sm text-gray-400">Make Public</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save Template
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

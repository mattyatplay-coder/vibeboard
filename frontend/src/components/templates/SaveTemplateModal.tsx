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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
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
          isPublic,
        }),
      });
      toast.success('Template saved successfully');
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setCategory('Custom');
      setIsPublic(false);
    } catch (err) {
      console.error('Failed to save template', err);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Save className="h-5 w-5 text-purple-400" />
            Save as Template
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cinematic Dark Sci-Fi"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe what this template does..."
              className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
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
              <div className="flex h-10 items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="rounded border-gray-600 bg-black/50"
                />
                <span className="text-sm text-gray-400">Make Public</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 bg-white/5 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

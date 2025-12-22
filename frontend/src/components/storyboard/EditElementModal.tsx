import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface EditElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: any;
  onSave: (id: string, updates: any) => Promise<void>;
  sessions?: any[];
}

export function EditElementModal({
  isOpen,
  onClose,
  element,
  onSave,
  sessions = [],
}: EditElementModalProps) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (element) {
      setName(element.name || '');
      setTags(element.tags || []);
      setSessionId(element.session?.id || '');
    }
  }, [element]);

  if (!isOpen || !element) return null;

  const handleSave = async () => {
    await onSave(element.id, {
      name,
      tags,
      sessionId: sessionId || null,
    });
    onClose();
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-semibold text-white">Edit Element</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Preview */}
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/50">
            {element.type === 'video' ? (
              <video src={element.url} controls className="max-h-full max-w-full" />
            ) : (
              <img
                src={element.url}
                alt={element.name}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Element name..."
            />
          </div>

          {/* Session */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Session</label>
            <select
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">No Session</option>
              {sessions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Tags</label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Add a tag..."
              />
              <button
                onClick={addTag}
                className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded bg-purple-500/20 px-2 py-1 text-sm text-purple-300"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Element as StoreElement, ElementType } from '@/lib/store';
import { X, User, Car, FlaskConical, Mic, Plus, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface EditElementModalProps {
  element: StoreElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: any) => void;
  sessions: { id: string; name: string }[];
}

const ELEMENT_TYPES: { id: ElementType; label: string; icon: any }[] = [
  { id: 'character', label: 'Character', icon: User },
  { id: 'prop', label: 'Object', icon: Car }, // Mapping 'prop' to 'Object' label for UI
  { id: 'place', label: 'Other', icon: FlaskConical }, // Mapping 'place' to 'Other' for UI
];

export function EditElementModal({
  element,
  isOpen,
  onClose,
  onSave,
  sessions,
}: EditElementModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ElementType>('character');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (element) {
      setName(element.name);
      setType(element.type);
      setFile(null);
      setPreviewUrl(null);
      setTags(Array.isArray(element.tags) ? element.tags : []);
      setSelectedSessionId(element.session?.id || null);
      setError(null);
    }
  }, [element]);

  const handleSave = async () => {
    if (element && name.trim()) {
      try {
        await onSave(element.id, { name, type, file, tags, sessionId: selectedSessionId });
        onClose();
      } catch (err: any) {
        console.error('Save failed', err);
        if (err.message.includes('already exists')) {
          setError('Name already taken. Please choose another.');
        } else {
          setError('Failed to save changes.');
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && element && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
          >
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Element</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Name*
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/5 bg-[#2a2a2a] px-4 py-3 text-white transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  placeholder="Element Name"
                />
                {error && <p className="mt-1 text-xs font-medium text-red-400">{error}</p>}
              </div>

              {/* Session Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Session
                </label>
                <select
                  value={selectedSessionId || ''}
                  onChange={e => setSelectedSessionId(e.target.value || null)}
                  className="w-full appearance-none rounded-lg border border-white/5 bg-[#2a2a2a] px-4 py-3 text-white transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                >
                  <option value="">Global / Unassigned</option>
                  {sessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Image Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Source Image
                </label>
                <div className="group relative aspect-video overflow-hidden rounded-lg border border-white/5 bg-black/50">
                  {previewUrl ? (
                    file?.type.startsWith('video') ? (
                      <video src={previewUrl} className="h-full w-full object-cover" />
                    ) : (
                      <img src={previewUrl} className="h-full w-full object-cover" />
                    )
                  ) : element.type === 'video' ? (
                    <video src={element.url} className="h-full w-full object-cover" />
                  ) : (
                    <img
                      src={element.url}
                      alt={element.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-2 left-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-black/80"
                    >
                      Upload
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,video/*"
                    />
                  </div>
                </div>
              </div>

              {/* Element Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Select Element Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {ELEMENT_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={clsx(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all',
                        type === t.id
                          ? 'border-blue-500 bg-blue-900/20 text-blue-400'
                          : 'border-transparent bg-[#2a2a2a] text-gray-400 hover:bg-[#333]'
                      )}
                    >
                      <t.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Tags
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-lg border border-white/5 bg-[#2a2a2a] py-2 pr-4 pl-9 text-sm text-white transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                      placeholder="Add a tag..."
                    />
                  </div>
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="rounded-lg bg-white/10 px-3 py-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Voice (Placeholder) */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                  Voice
                </label>
                <button className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#2a2a2a] px-4 py-3 text-white transition-colors hover:bg-[#333]">
                  <div className="flex items-center gap-3">
                    <Mic className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Alnilam</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/5 bg-[#2a2a2a]/50 p-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500"
              >
                Save Element
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

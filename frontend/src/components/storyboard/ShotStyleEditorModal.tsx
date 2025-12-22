/* eslint-disable react-hooks/rules-of-hooks */
'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { CinematicTagsModal } from './CinematicTagsModal';
import { ALL_CATEGORIES, CinematicTag } from '@/data/CinematicTags';

interface ShotStyleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: any;
  onSave: (shotId: string, newPrompt: string) => void;
}

export function ShotStyleEditorModal({ isOpen, onClose, shot, onSave }: ShotStyleEditorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [initialTagCategory, setInitialTagCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (shot && shot.generation) {
      setPrompt(shot.generation.inputPrompt || '');
    }
  }, [shot]);

  const handleAddTag = (tag: CinematicTag, categoryId: string) => {
    const prefix = prompt ? `${prompt}, ` : '';
    // Use the tag's prompt directly - it already includes the proper formatting
    setPrompt(prefix + tag.prompt);
    setIsTagsModalOpen(false);
  };

  const openTagsModal = (categoryId?: string) => {
    setInitialTagCategory(categoryId);
    setIsTagsModalOpen(true);
  };

  const handleSave = () => {
    if (shot) {
      onSave(shot.id, prompt);
      onClose();
    }
  };

  if (!shot) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Edit Shot Style
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6 p-6">
                {/* Preview Thumbnail (if available) */}
                {shot.generation?.outputs?.[0] && (
                  <div className="mb-4 h-32 w-full overflow-hidden rounded-lg border border-white/10 bg-black/50">
                    <img
                      src={shot.generation.outputs[0].url}
                      className="h-full w-full object-cover opacity-50"
                    />
                  </div>
                )}

                {/* Prompt Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Shot Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="h-32 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="Describe the shot..."
                  />
                </div>

                {/* Quick Add Tags */}
                <div>
                  <p className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    Quick Add Cinematic Tags
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => openTagsModal(cat.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-white/10 bg-[#1a1a1a] p-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cinematic Tags Modal */}
      <CinematicTagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        onSelectTag={handleAddTag}
        initialCategory={initialTagCategory}
      />
    </>
  );
}

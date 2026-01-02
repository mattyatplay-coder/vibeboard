'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * CreateProjectModal - Glassmorphic Project Creation
 *
 * A sleek modal for creating new projects with the
 * "Midnight & Neon" aesthetic.
 *
 * @example
 * <CreateProjectModal
 *   onClose={() => setIsCreating(false)}
 *   onSuccess={handleProjectCreated}
 * />
 */
export const CreateProjectModal = ({ onClose, onSuccess }: CreateProjectModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchAPI('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      toast.success('Project created!', {
        description: `"${name}" is ready to use.`,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create project', {
        description: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
      >
        <div className="rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">New Project</h2>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-medium text-zinc-400"
                >
                  Project Name <span className="text-violet-400">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Production"
                  autoFocus
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-all focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="project-desc"
                  className="mb-2 block text-sm font-medium text-zinc-400"
                >
                  Description <span className="text-zinc-600">(optional)</span>
                </label>
                <textarea
                  id="project-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your project..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-lg border border-white/10 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 transition-all focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <motion.button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default CreateProjectModal;

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface NewProjectButtonProps {
  onClick: () => void;
}

/**
 * NewProjectButton - Violet Glow Hero Button
 *
 * The primary CTA on the dashboard. Designed to draw attention
 * with animated glow effect and satisfying press response.
 *
 * @example
 * <NewProjectButton onClick={() => setIsCreating(true)} />
 */
export const NewProjectButton = ({ onClick }: NewProjectButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 -z-10 rounded-xl bg-violet-500 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-50" />

      {/* Icon with rotation on hover */}
      <motion.div
        className="flex items-center justify-center"
        whileHover={{ rotate: 90 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Plus className="h-5 w-5" />
      </motion.div>

      <span>New Project</span>

      {/* Subtle shine effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.button>
  );
};

export default NewProjectButton;

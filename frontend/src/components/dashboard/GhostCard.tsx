'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface GhostCardProps {
  onClick: () => void;
}

/**
 * GhostCard - Inviting "Create New" Card
 *
 * Polished Obsidian variant:
 * - Visible but subtle (not invisible)
 * - Clear invitation to create
 * - Violet glow on hover
 * - Shadow glow effect
 */
export const GhostCard = ({ onClick }: GhostCardProps) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full aspect-[4/3] rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-white/[0.02] transition-all duration-300 flex flex-col items-center justify-center gap-3"
    >
      {/* Icon Container with glow */}
      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-violet-500/50 group-hover:text-violet-400 text-zinc-600 flex items-center justify-center transition-all duration-300 shadow-lg group-hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]">
        <Plus size={24} />
      </div>

      {/* Label */}
      <div className="text-center">
        <span className="block text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
          Create New
        </span>
        <span className="block text-[10px] text-zinc-600 font-mono mt-1">
          Start from scratch
        </span>
      </div>
    </motion.button>
  );
};

export default GhostCard;

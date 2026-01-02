'use client';

import React from 'react';
import { Search, Plus, Settings, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  onNewProject: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * DashboardHeader - Command Center Navigation
 *
 * Polished Obsidian variant:
 * - Wide, prominent search bar (Raycast-style)
 * - Brand mark with pulse indicator
 * - Glowing CTA button
 * - Keyboard shortcut hints
 */
export const DashboardHeader = ({
  onNewProject,
  searchQuery = '',
  onSearchChange,
}: DashboardHeaderProps) => {
  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-50">
      {/* Left: Brand */}
      <div className="flex flex-col shrink-0">
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.6)] animate-pulse" />
          VibeBoard
        </h1>
        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] -mt-0.5">
          Production Studio
        </span>
      </div>

      {/* Center: Command Center Search */}
      <div className="flex-1 max-w-xl mx-auto relative group hidden md:block">
        {/* Focus glow effect */}
        <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search projects, assets, or commands..."
            className="w-full h-10 pl-11 pr-16 bg-zinc-900/80 border border-white/10 rounded-full text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 focus:bg-zinc-900 transition-all shadow-inner"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications */}
        <button className="relative p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-500 rounded-full" />
        </button>

        {/* Settings */}
        <button className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
          <Settings size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/5" />

        {/* New Project Button (The Glow) */}
        <motion.button
          onClick={onNewProject}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="h-9 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Project</span>
        </motion.button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 ring-2 ring-zinc-950 flex items-center justify-center text-[10px] font-bold text-zinc-400">
          U
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

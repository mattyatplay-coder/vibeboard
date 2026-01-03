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
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/5 bg-zinc-950/90 px-8 backdrop-blur-xl">
      {/* Left: Brand */}
      <div className="flex shrink-0 flex-col">
        <h1 className="flex items-center gap-2 text-base font-bold tracking-tight text-white">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
          VibeBoard
        </h1>
        <span className="-mt-0.5 font-mono text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
          Production Studio
        </span>
      </div>

      {/* Center: Command Center Search */}
      <div className="group relative mx-auto hidden max-w-xl flex-1 md:block">
        {/* Focus glow effect */}
        <div className="absolute inset-0 rounded-full bg-violet-500/20 opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100" />

        <div className="relative flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-violet-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder="Search projects, assets, or commands..."
            className="h-10 w-full rounded-full border border-white/10 bg-zinc-900/80 pr-16 pl-11 text-sm text-zinc-200 placeholder-zinc-600 shadow-inner transition-all focus:border-violet-500/40 focus:bg-zinc-900 focus:outline-none"
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 gap-1">
            <kbd className="hidden h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-zinc-400 sm:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 text-zinc-500 transition-colors hover:text-zinc-300">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-500" />
        </button>

        {/* Settings */}
        <button className="p-2 text-zinc-500 transition-colors hover:text-zinc-300">
          <Settings size={16} />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-white/5" />

        {/* New Project Button (The Glow) */}
        <motion.button
          onClick={onNewProject}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Project</span>
        </motion.button>

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-zinc-700 to-zinc-800 text-[10px] font-bold text-zinc-400 ring-2 ring-zinc-950">
          U
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

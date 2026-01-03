'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MoreHorizontal, Trash2, Clock, Play, Film } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { clsx } from 'clsx';

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  updatedAt: string | Date;
  thumbnail?: string;
  shotCount?: number;
  aspectRatio?: string;
  resolution?: string;
  onDelete?: (e: React.MouseEvent) => void;
}

/**
 * ProjectCard - Polished Obsidian Card
 *
 * Designed with "Specular Highlights" aesthetic:
 * - Sharp contrast (zinc-800 on zinc-950)
 * - Hover glow effect behind card
 * - Glass backdrop with crisp borders
 * - Spotlight lighting on hover
 *
 * @example
 * <ProjectCard
 *   id="abc123"
 *   name="Nike_Air_Max_Commercial_V2"
 *   description="High-energy product showcase..."
 *   updatedAt={new Date()}
 *   onDelete={handleDelete}
 * />
 */
export const ProjectCard = ({
  id,
  name,
  description,
  updatedAt,
  thumbnail,
  shotCount,
  aspectRatio = '16:9',
  resolution = '4K',
  onDelete,
}: ProjectCardProps) => {
  const formattedDate = new Date(updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="group relative"
    >
      <Link href={`/projects/${id}/story-editor`} className="relative block w-full">
        {/* 1. The Glow Effect behind the card (Only visible on hover) */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-20" />

        {/* 2. The Card Surface */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 group-hover:border-white/10 group-hover:bg-zinc-800/50">
          {/* Thumbnail Viewport */}
          <div className="relative h-2/3 w-full overflow-hidden border-b border-white/5 transition-colors group-hover:border-white/10">
            {/* Subtle noise pattern for texture */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* The Content - Thumbnail or Placeholder */}
            {thumbnail ? (
              <>
                <img
                  src={thumbnail}
                  alt={name}
                  className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-black/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500 transition-all duration-300 group-hover:scale-110 group-hover:border-white/20 group-hover:text-white">
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            )}

            {/* Top Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="rounded border border-white/5 bg-black/50 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-300 backdrop-blur-sm">
                {aspectRatio}
              </span>
              {resolution && (
                <span className="rounded border border-white/5 bg-black/50 px-2 py-0.5 font-mono text-[10px] font-medium text-cyan-400 backdrop-blur-sm">
                  {resolution}
                </span>
              )}
            </div>

            {/* Delete Button - Top Right */}
            {onDelete && (
              <Tooltip content="Delete Project" side="left">
                <button
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(e);
                  }}
                  className="absolute top-3 right-3 rounded-full p-1.5 text-white/40 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="relative flex h-1/3 flex-col justify-between bg-gradient-to-t from-black/20 to-transparent p-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 transition-colors group-hover:text-white">
                {name}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                {description || 'No description'}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-600 transition-colors group-hover:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formattedDate}
                </span>
                {shotCount !== undefined && shotCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Film size={10} />
                    {shotCount} shots
                  </span>
                )}
              </div>

              {/* Context Menu Trigger */}
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:text-white"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProjectCard;

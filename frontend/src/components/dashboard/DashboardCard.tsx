'use client';

import React, { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MoreHorizontal, Clock, Film, Trash2, Copy, ExternalLink } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface DashboardCardProps {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  thumbnail?: string;
  aspectRatio?: string;
  resolution?: string;
  shotCount?: number;
  onDelete?: (e: React.MouseEvent) => void;
  onDuplicate?: () => void;
}

/**
 * DashboardCard - Polished Obsidian Card
 *
 * Designed to beat Linear/Raycast standards:
 * - Glow effect BEHIND the card (not just border)
 * - Mouse-reactive spotlight that follows cursor
 * - Sharper contrast (zinc-800 on zinc-950)
 * - Specular highlights on hover
 */
export const DashboardCard = ({
  id,
  title,
  description,
  date,
  thumbnail,
  aspectRatio = '16:9',
  resolution = '4K',
  shotCount,
  onDelete,
  onDuplicate,
}: DashboardCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Track mouse position for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Glow effect BEHIND the card (only visible on hover) */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-20" />

      <Link
        href={`/projects/${id}/story-editor`}
        className="relative block overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:border-white/10 hover:bg-zinc-800/50"
      >
        {/* Mouse-following spotlight effect */}
        {isHovered && (
          <div
            className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.06), transparent 60%)`,
            }}
          />
        )}

        {/* 1. Thumbnail Area */}
        <div className="relative h-36 overflow-hidden bg-zinc-900">
          {/* Gradient placeholder or actual thumbnail */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
            />
          ) : (
            <>
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 transition-transform duration-500 group-hover:scale-105" />

              {/* Subtle Grid Pattern */}
              <div
                className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]"
                style={{
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
            </>
          )}

          {/* Center Icon (The 'Lens') */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-zinc-500 backdrop-blur-sm transition-all duration-300 group-hover:border-violet-500/30 group-hover:bg-black/40 group-hover:text-violet-400">
              <Film size={20} />
            </div>
          </div>

          {/* Gradient Overlay (bottom fade) */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent" />

          {/* Badges (top-left) */}
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

          {/* Actions Menu (top-right) */}
          <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  onClick={e => e.preventDefault()}
                  className="rounded-lg border border-white/5 bg-black/40 p-1.5 text-zinc-400 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[140px] rounded-lg border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl"
                  sideOffset={4}
                  align="end"
                >
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 transition-colors outline-none hover:bg-white/5 hover:text-white"
                    onClick={e => {
                      e.preventDefault();
                      window.open(`/projects/${id}/story-editor`, '_blank');
                    }}
                  >
                    <ExternalLink size={12} />
                    Open in New Tab
                  </DropdownMenu.Item>

                  {onDuplicate && (
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 transition-colors outline-none hover:bg-white/5 hover:text-white"
                      onClick={e => {
                        e.preventDefault();
                        onDuplicate();
                      }}
                    >
                      <Copy size={12} />
                      Duplicate
                    </DropdownMenu.Item>
                  )}

                  {onDelete && (
                    <>
                      <DropdownMenu.Separator className="my-1 h-px bg-white/5" />
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-red-400 transition-colors outline-none hover:bg-red-500/10 hover:text-red-300"
                        onClick={e => {
                          e.preventDefault();
                          onDelete(e as unknown as React.MouseEvent);
                        }}
                      >
                        <Trash2 size={12} />
                        Delete
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        {/* 2. Metadata Area */}
        <div className="relative p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-violet-200">
                {title}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                {description || 'No description'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
            {/* Shot count indicator */}
            {shotCount !== undefined && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Film size={10} />
                <span>{shotCount} shots</span>
              </div>
            )}

            {/* Timestamp */}
            <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-zinc-600">
              <Clock size={10} />
              {date}
            </span>
          </div>
        </div>

        {/* Hover border glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-violet-500/0 transition-colors group-hover:border-violet-500/20" />
      </Link>
    </motion.div>
  );
};

export default DashboardCard;

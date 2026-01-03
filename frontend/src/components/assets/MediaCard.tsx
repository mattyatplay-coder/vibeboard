'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  MoreVertical,
  Play,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Download,
  Copy,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface Asset {
  id: string;
  type: 'video' | 'image';
  src: string;
  thumbnail: string;
  title: string;
  duration?: string; // "00:05"
  resolution?: string; // "1080p"
  createdAt?: Date;
}

interface MediaCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onDuplicate?: () => void;
}

/**
 * MediaCard - Light Table Asset Unit
 *
 * Designed to be "quiet" until interacted with:
 * - Idle: Just the thumbnail and duration badge
 * - Hover: Video plays (muted), metadata appears, quick actions reveal
 * - Selected: Neon violet border indicates ready for timeline
 *
 * @example
 * <MediaCard
 *   asset={{ id: '1', type: 'video', src: '/clip.mp4', ... }}
 *   selected={isSelected}
 *   onSelect={() => toggleSelection(asset.id)}
 * />
 */
export const MediaCard = ({
  asset,
  selected,
  onSelect,
  onDoubleClick,
  onDelete,
  onDownload,
  onDuplicate,
}: MediaCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);

  // Hover Scrub Logic - video plays on hover
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (asset.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {}); // Ignore play interruptions
    }
  }, [asset.type]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (asset.type === 'video' && videoRef.current) {
      videoRef.current.pause();
    }
  }, [asset.type]);

  // Scrub through video based on mouse X position
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (asset.type !== 'video' || !videoRef.current || !isHovered) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const clampedX = Math.max(0, Math.min(1, x));
      setScrubPosition(clampedX);

      // Scrub video to position
      if (videoRef.current.duration) {
        videoRef.current.currentTime = clampedX * videoRef.current.duration;
      }
    },
    [asset.type, isHovered]
  );

  return (
    <motion.div
      layout
      className={clsx(
        'group relative aspect-video cursor-pointer overflow-hidden rounded-lg border bg-zinc-900 transition-all duration-200',
        selected
          ? 'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] ring-1 ring-violet-500'
          : 'border-white/5 hover:border-zinc-700'
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -2 }} // Tactile lift
    >
      {/* 1. Media Layer */}
      {asset.type === 'video' ? (
        <>
          <img
            src={asset.thumbnail}
            alt={asset.title}
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
              isHovered && 'opacity-0'
            )}
          />
          <video
            ref={videoRef}
            src={asset.src}
            muted
            loop
            playsInline
            preload="metadata"
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-200',
              !isHovered && 'opacity-0'
            )}
          />
        </>
      ) : (
        <img src={asset.src} alt={asset.title} className="h-full w-full object-cover" />
      )}

      {/* 2. Overlay Layer (Gradient for text readability) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      {/* 3. Scrub Progress Bar (video only) */}
      {asset.type === 'video' && isHovered && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-black/50">
          <div
            className="h-full bg-violet-500 transition-all duration-75"
            style={{ width: `${scrubPosition * 100}%` }}
          />
        </div>
      )}

      {/* 4. Status Indicators */}
      <div className="absolute top-2 left-2 flex gap-1">
        {selected && (
          <div className="rounded-full bg-violet-500 p-0.5 text-white shadow-lg">
            <CheckCircle2 size={12} />
          </div>
        )}
      </div>

      {/* 5. Actions Menu */}
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="rounded p-1 text-white/80 transition-colors hover:bg-black/50 hover:text-white"
              onClick={e => e.stopPropagation()}
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[140px] rounded-lg border border-white/10 bg-zinc-900/95 p-1 shadow-xl backdrop-blur-md"
              sideOffset={4}
              align="end"
            >
              {onDownload && (
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 transition-colors outline-none hover:bg-white/10 hover:text-white"
                  onClick={e => {
                    e.stopPropagation();
                    onDownload();
                  }}
                >
                  <Download size={12} />
                  Download
                </DropdownMenu.Item>
              )}
              {onDuplicate && (
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-300 transition-colors outline-none hover:bg-white/10 hover:text-white"
                  onClick={e => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy size={12} />
                  Duplicate
                </DropdownMenu.Item>
              )}
              {onDelete && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-400 transition-colors outline-none hover:bg-red-500/10 hover:text-red-300"
                    onClick={e => {
                      e.stopPropagation();
                      onDelete();
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

      {/* 6. Metadata Layer */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between p-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-medium text-white drop-shadow-md">
            {asset.title}
          </span>
          <div className="flex items-center gap-2 opacity-0 transition-opacity delay-75 group-hover:opacity-100">
            {asset.resolution && (
              <span className="rounded bg-black/50 px-1 font-mono text-[10px] text-zinc-300 backdrop-blur-sm">
                {asset.resolution}
              </span>
            )}
            {asset.type === 'video' && asset.duration && (
              <span className="rounded bg-black/50 px-1 font-mono text-[10px] text-zinc-300 backdrop-blur-sm">
                {asset.duration}
              </span>
            )}
          </div>
        </div>

        {/* Type Icon */}
        <div className="text-white/50">
          {asset.type === 'video' ? (
            <Play size={12} fill="currentColor" />
          ) : (
            <ImageIcon size={12} />
          )}
        </div>
      </div>

      {/* 7. Duration Badge (always visible for video) */}
      {asset.type === 'video' && asset.duration && !isHovered && (
        <div className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
          {asset.duration}
        </div>
      )}
    </motion.div>
  );
};

export default MediaCard;

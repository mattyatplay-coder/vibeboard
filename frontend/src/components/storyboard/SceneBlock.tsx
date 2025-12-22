'use client';

import { Scene } from '@/lib/store';
import { motion } from 'framer-motion';
import { Clock, MoreVertical, Play } from 'lucide-react';

interface SceneBlockProps {
  scene: Scene;
  isActive: boolean;
  onClick: () => void;
}

export function SceneBlock({ scene, isActive, onClick }: SceneBlockProps) {
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`relative aspect-video w-64 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
        isActive
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : 'border-white/10 hover:border-white/30'
      }`}
    >
      {/* Background Image/Video Thumbnail */}
      {scene.thumbnailUrl || scene.videoUrl ? (
        <img
          src={scene.thumbnailUrl || '/placeholder-scene.jpg'}
          alt="Scene thumbnail"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/5">
          <span className="text-xs text-gray-500">Generating...</span>
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold">
              #{scene.order + 1}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-300">
              <Clock className="h-3 w-3" />
              <span>{scene.duration}s</span>
            </div>
          </div>
          <button className="rounded-full p-1 hover:bg-white/20">
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-gray-400">{scene.prompt}</p>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Scene } from '@/lib/store';
import { useDroppable } from '@dnd-kit/core';

interface ShotNavigatorProps {
  scenes: any[];
  activeDragId?: string | null;
  isOverNavigator?: boolean;
  onDropIndexChange?: (index: number | null) => void;
  onRemove?: (shotId: string) => void;
}

export function ShotNavigator({
  scenes,
  activeDragId,
  isOverNavigator,
  onDropIndexChange,
  onRemove,
}: ShotNavigatorProps) {
  const [isOpen, setIsOpen] = useState(true); // Default to open for visibility

  // Container-level droppable (kept for drop detection, but visual feedback now comes from parent)
  const { setNodeRef: setContainerRef } = useDroppable({
    id: 'shot-navigator-container',
    data: { isContainer: true },
  });

  // Only show insert lines when actively dragging AND cursor is over the Shot Navigator area
  const showInsertIndicators = !!(activeDragId && isOverNavigator);

  // Flatten shots from scenes
  const allShots = scenes.flatMap(scene =>
    (scene.shots || []).map((shot: any, relativeIndex: number) => ({
      ...shot,
      sceneName: scene.name,
      sceneId: scene.id,
      relativeIndex,
    }))
  );

  const lastScene = scenes[scenes.length - 1];
  const lastSceneNextIndex = lastScene?.shots?.length || 0;

  return (
    <div className="border-b border-white/10 bg-[#0a0a0a]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-8 py-3 transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <span>Shot Navigator</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <div className="text-xs text-gray-500">{allShots.length} Shots</div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={setContainerRef}
              id="shot-navigator-container"
              className={clsx(
                'overflow-x-auto px-8 pb-6 transition-colors',
                activeDragId && 'bg-white/[0.02]',
                isOverNavigator && 'bg-blue-500/5'
              )}
            >
              <div className="flex min-w-max items-center gap-4">
                {allShots.map((shot, index) => (
                  <ShotThumbnail
                    key={shot.id || `shot-${index}`}
                    shot={shot}
                    index={shot.relativeIndex}
                    showInsertIndicator={showInsertIndicators}
                    displayIndex={index}
                    onRemove={onRemove}
                  />
                ))}
                {allShots.length === 0 && (
                  <EmptyStateDropTarget sceneId={scenes[0]?.id} isActive={!!activeDragId} />
                )}
                {allShots.length > 0 && (
                  <EndDropTarget
                    showInsertIndicator={showInsertIndicators}
                    index={lastSceneNextIndex}
                    sceneId={lastScene?.id}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyStateDropTarget({ sceneId, isActive }: { sceneId?: string; isActive?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop-empty',
    data: { index: 0, sceneId },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="shot-navigator-empty-state"
      className={clsx(
        'flex w-full min-w-[300px] items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors',
        isOver ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-500',
        isActive && !isOver && 'border-white/20'
      )}
    >
      <span className="text-sm italic">Drag generations here to create a storyboard</span>
    </div>
  );
}

function EndDropTarget({
  showInsertIndicator,
  index,
  sceneId,
}: {
  showInsertIndicator?: boolean;
  index: number;
  sceneId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-end`,
    data: { index, sceneId },
  });

  if (!showInsertIndicator) return null;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex h-24 w-12 items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200',
        isOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'
      )}
    >
      <span className={clsx('text-xs font-medium', isOver ? 'text-blue-400' : 'text-gray-600')}>
        End
      </span>
    </div>
  );
}

function ShotThumbnail({
  shot,
  index,
  showInsertIndicator,
  displayIndex,
  onRemove,
}: {
  shot: any;
  index: number;
  showInsertIndicator?: boolean;
  displayIndex: number;
  onRemove?: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `shot-${shot.id}`,
    data: { index, sceneId: shot.sceneId },
  });

  // Find the video or image output
  // Handle both array and stringified JSON from backend
  let outputs = shot.generation?.outputs;
  if (typeof outputs === 'string') {
    try {
      outputs = JSON.parse(outputs);
    } catch (e) {
      outputs = null;
    }
  }
  const output = Array.isArray(outputs)
    ? outputs.find((o: any) => o.type === 'video' || o.type === 'image')
    : null;
  const rawUrl = output?.url;
  const url = rawUrl
    ? rawUrl.startsWith('http')
      ? rawUrl
      : `http://localhost:3001${rawUrl}`
    : null;
  const isVideo = output?.type === 'video';

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="group/drop relative z-10 flex items-center gap-1" // Added z-10
    >
      {/* Drop Indicator (Left) - Only shows when cursor is over Shot Navigator container */}
      {showInsertIndicator && (
        <div
          className={clsx(
            'pointer-events-none absolute top-0 bottom-0 -left-4 z-50 flex w-8 items-center justify-center rounded-full transition-all duration-200', // Increased width and z-index, pointer-events-none to let drop pass through if needed, but actually we want this to BE the visual
            isOver ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="h-full w-1 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
        </div>
      )}

      <div
        className={clsx(
          'flex w-40 flex-col gap-2 transition-all duration-200',
          isOver && showInsertIndicator ? 'translate-x-2 opacity-80' : ''
        )}
      >
        <div
          className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/5"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {url ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={url}
                className="h-full w-full object-cover"
                muted
                playsInline
                loop
              />
            ) : (
              <img src={url} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-600">
              No Media
            </div>
          )}

          {/* Overlay Info */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {isVideo && <Play className="h-8 w-8 fill-white/20 text-white/80" />}
          </div>

          {/* Shot Number Badge */}
          <div className="absolute top-2 left-2 rounded border border-white/10 bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            Shot {displayIndex + 1}
          </div>

          {/* Delete Button */}
          <button
            onClick={e => {
              e.stopPropagation();
              onRemove?.(shot.id);
            }}
            className="absolute top-2 right-2 rounded border border-white/10 bg-black/60 p-1 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-red-500/80"
            title="Remove shot"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-0.5">
          <p
            className="truncate text-xs font-medium text-gray-300"
            title={shot.generation?.inputPrompt}
          >
            {shot.sceneName}
          </p>
          <p className="truncate text-[10px] text-gray-500">
            {shot.generation?.inputPrompt || 'No prompt'}
          </p>
        </div>
      </div>
    </div>
  );
}

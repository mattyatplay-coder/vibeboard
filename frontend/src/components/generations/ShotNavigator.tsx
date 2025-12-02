import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Scene } from "@/lib/store";
import { useDroppable } from "@dnd-kit/core";

interface ShotNavigatorProps {
    scenes: any[];
    activeDragId?: string | null;
    onDropIndexChange?: (index: number | null) => void;
    onRemove?: (shotId: string) => void;
}

export function ShotNavigator({ scenes, activeDragId, onDropIndexChange, onRemove }: ShotNavigatorProps) {
    const [isOpen, setIsOpen] = useState(true); // Default to open for visibility

    // Flatten shots from scenes
    const allShots = scenes.flatMap(scene =>
        (scene.shots || []).map((shot: any, relativeIndex: number) => ({
            ...shot,
            sceneName: scene.name,
            sceneId: scene.id,
            relativeIndex
        }))
    );

    const lastScene = scenes[scenes.length - 1];
    const lastSceneNextIndex = lastScene?.shots?.length || 0;

    return (
        <div className="border-b border-white/10 bg-[#0a0a0a]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-8 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <span>Shot Navigator</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <div className="text-xs text-gray-500">
                    {allShots.length} Shots
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-8 pb-6 overflow-x-auto">
                            <div className="flex gap-4 min-w-max items-center">
                                {allShots.map((shot, index) => (
                                    <ShotThumbnail
                                        key={shot.id || `shot-${index}`}
                                        shot={shot}
                                        index={shot.relativeIndex}
                                        activeDragId={activeDragId}
                                        displayIndex={index}
                                        onRemove={onRemove}
                                    />
                                ))}
                                {allShots.length === 0 && (
                                    <EmptyStateDropTarget sceneId={scenes[0]?.id} />
                                )}
                                {allShots.length > 0 && (
                                    <EndDropTarget
                                        activeDragId={activeDragId}
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

function EmptyStateDropTarget({ sceneId }: { sceneId?: string }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'drop-empty',
        data: { index: 0, sceneId }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg w-full transition-colors min-w-[300px]",
                isOver ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-500"
            )}
        >
            <span className="text-sm italic">Drag generations here to create a storyboard</span>
        </div>
    );
}

function EndDropTarget({ activeDragId, index, sceneId }: { activeDragId?: string | null, index: number, sceneId?: string }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `drop-end`,
        data: { index, sceneId }
    });

    if (!activeDragId) return null;

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "w-12 h-24 rounded-lg transition-all duration-200 flex items-center justify-center border-2 border-dashed",
                isOver ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/30"
            )}
        >
            <span className={clsx("text-xs font-medium", isOver ? "text-blue-400" : "text-gray-600")}>
                End
            </span>
        </div>
    );
}

function ShotThumbnail({ shot, index, activeDragId, displayIndex, onRemove }: { shot: any, index: number, activeDragId?: string | null, displayIndex: number, onRemove?: (id: string) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: `shot-${shot.id}`,
        data: { index, sceneId: shot.sceneId }
    });

    // Find the video or image output
    const output = shot.generation?.outputs?.find((o: any) => o.type === 'video' || o.type === 'image');
    const rawUrl = output?.url;
    const url = rawUrl
        ? (rawUrl.startsWith('http') ? rawUrl : `http://localhost:3001${rawUrl}`)
        : null;
    const isVideo = output?.type === 'video';

    const handleMouseEnter = () => {
        if (isVideo && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
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
            className="flex items-center gap-1 relative group/drop"
        >
            {/* Drop Indicator (Left) */}
            {activeDragId && (
                <div
                    className={clsx(
                        "absolute -left-3 top-0 bottom-0 w-6 rounded-full transition-all duration-200 z-30 flex items-center justify-center", // Increased width for hit area
                        isOver ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="w-1 h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                </div>
            )}

            <div className={clsx(
                "flex flex-col gap-2 w-40 transition-all duration-200",
                isOver && activeDragId ? "translate-x-2 opacity-80" : ""
            )}>
                <div
                    className="relative aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10 group cursor-pointer"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {url ? (
                        isVideo ? (
                            <video
                                ref={videoRef}
                                src={url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                loop
                            />
                        ) : (
                            <img src={url} className="w-full h-full object-cover" />
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                            No Media
                        </div>
                    )}

                    {/* Overlay Info */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isVideo && <Play className="w-8 h-8 text-white/80 fill-white/20" />}
                    </div>

                    {/* Shot Number Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-medium text-white border border-white/10">
                        Shot {displayIndex + 1}
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.(shot.id);
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500/80 backdrop-blur-sm rounded text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove shot"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-0.5">
                    <p className="text-xs font-medium text-gray-300 truncate" title={shot.generation?.inputPrompt}>
                        {shot.sceneName}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                        {shot.generation?.inputPrompt || "No prompt"}
                    </p>
                </div>
            </div>
        </div>
    );
}

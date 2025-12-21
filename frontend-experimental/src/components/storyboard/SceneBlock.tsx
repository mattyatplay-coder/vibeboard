"use client";

import { Scene } from "@/lib/store";
import { motion } from "framer-motion";
import { Clock, MoreVertical, Play } from "lucide-react";

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
            className={`relative flex-shrink-0 w-64 aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${isActive ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-white/10 hover:border-white/30"
                }`}
        >
            {/* Background Image/Video Thumbnail */}
            {scene.thumbnailUrl || scene.videoUrl ? (
                <img
                    src={scene.thumbnailUrl || "/placeholder-scene.jpg"}
                    alt="Scene thumbnail"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Generating...</span>
                </div>
            )}

            {/* Overlay Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-3 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{scene.order + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-300">
                            <Clock className="w-3 h-3" />
                            <span>{scene.duration}s</span>
                        </div>
                    </div>
                    <button className="p-1 hover:bg-white/20 rounded-full">
                        <MoreVertical className="w-3 h-3" />
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{scene.prompt}</p>
            </div>

            {/* Active Indicator */}
            {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                        <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                </div>
            )}
        </motion.div>
    );
}

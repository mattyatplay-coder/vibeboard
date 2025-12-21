"use client";

import { Monitor, Users, Wand2, Play, Download, Undo, Redo } from "lucide-react";
import { clsx } from "clsx";

interface StoryboardHeaderProps {
    aspectRatio: string;
    onAspectRatioChange: (ratio: string) => void;
    onStyleClick: () => void;
    onCastClick: () => void;
    onPreview: () => void;
}

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "2.35:1", "4:3"];

export function StoryboardHeader({
    aspectRatio,
    onAspectRatioChange,
    onStyleClick,
    onCastClick,
    onPreview
}: StoryboardHeaderProps) {
    return (
        <div className="h-16 border-b border-white/10 bg-[#1a1a1a] flex items-center justify-between px-6 sticky top-0 z-50">
            {/* Left Controls */}
            <div className="flex items-center gap-4">
                {/* Aspect Ratio Selector */}
                <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-gray-300 transition-colors">
                        <Monitor className="w-4 h-4" />
                        {aspectRatio}
                    </button>
                    <div className="absolute top-full left-0 pt-2 w-32 hidden group-hover:block">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                            {ASPECT_RATIOS.map((ratio) => (
                                <button
                                    key={ratio}
                                    onClick={() => onAspectRatioChange(ratio)}
                                    className={clsx(
                                        "w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors",
                                        aspectRatio === ratio ? "text-blue-400" : "text-gray-400"
                                    )}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-6 w-px bg-white/10" />

                {/* Style Button */}
                <button
                    onClick={onStyleClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-gray-300 transition-colors"
                >
                    <Wand2 className="w-4 h-4" />
                    Style
                </button>

                {/* Cast Button */}
                <button
                    onClick={onCastClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-gray-300 transition-colors"
                >
                    <Users className="w-4 h-4" />
                    Cast
                </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
                {/* Undo/Redo (Visual only) */}
                <div className="flex items-center gap-1 mr-4">
                    <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50">
                        <Undo className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50">
                        <Redo className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={onPreview}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                >
                    <Play className="w-4 h-4 fill-white" />
                    Preview
                </button>

                <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>
        </div>
    );
}

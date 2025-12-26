'use client';

import React, { useState, useRef } from 'react';
import { Play, Upload, Trash2, GripVertical, Loader2, Check, AlertCircle, Sparkles, Video } from 'lucide-react';
import { clsx } from 'clsx';

export interface ShotData {
    id: string;
    orderIndex: number;
    prompt: string;
    duration: number;
    firstFrameUrl?: string | null;
    lastFrameUrl?: string | null;
    outputUrl?: string | null;
    status: 'pending' | 'generating' | 'complete' | 'failed';
    failureReason?: string | null;
}

interface StoryboardShotProps {
    shot: ShotData;
    sceneTitle?: string;
    sceneDescription?: string;
    onUpdate: (id: string, updates: Partial<ShotData>) => void;
    onDelete: (id: string) => void;
    onGenerate: (id: string) => void;
    onUploadFrame: (id: string, frameType: 'first' | 'last', file: File) => void;
    onEnhancePrompt?: (id: string) => void;
    isGenerating?: boolean;
    dragHandleProps?: any;
}

export default function StoryboardShot({
    shot,
    sceneTitle,
    sceneDescription,
    onUpdate,
    onDelete,
    onGenerate,
    onUploadFrame,
    onEnhancePrompt,
    isGenerating = false,
    dragHandleProps
}: StoryboardShotProps) {
    const [isHoveringFirst, setIsHoveringFirst] = useState(false);
    const [isHoveringLast, setIsHoveringLast] = useState(false);
    const [isHoveringPreview, setIsHoveringPreview] = useState(false);
    const firstFrameInputRef = useRef<HTMLInputElement>(null);
    const lastFrameInputRef = useRef<HTMLInputElement>(null);

    const handleFrameUpload = (frameType: 'first' | 'last') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUploadFrame(shot.id, frameType, file);
        }
    };

    return (
        <div className="flex gap-4">
            {/* Left Panel - Scene Info */}
            <div className="w-80 flex-shrink-0 bg-[#1a1a1a] rounded-xl border border-white/10 p-4 flex flex-col">
                {/* Scene Title & Description */}
                <div className="flex items-start gap-2 mb-4">
                    <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white mt-1">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold">{sceneTitle || `Shot ${shot.orderIndex + 1}`}</h3>
                        {sceneDescription && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-3">{sceneDescription}</p>
                        )}
                    </div>
                    <button
                        onClick={() => onDelete(shot.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete shot"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Location & Style (placeholder rows) */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-3 px-3 py-2 bg-black/30 rounded-lg border border-white/5">
                        <span className="text-gray-500 text-sm">⊘</span>
                        <span className="text-gray-400 text-sm flex-1">LOCATION</span>
                        <span className="text-gray-600 text-xs">○</span>
                        <span className="text-gray-500">›</span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 bg-black/30 rounded-lg border border-white/5">
                        <span className="text-gray-500 text-sm">✎</span>
                        <span className="text-gray-400 text-sm flex-1">STYLE</span>
                        <span className="text-gray-600 text-xs">○</span>
                        <span className="text-gray-500">›</span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Beginning & Ending Frame Uploads */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    {/* Beginning Image */}
                    <div
                        className="relative"
                        onMouseEnter={() => setIsHoveringFirst(true)}
                        onMouseLeave={() => setIsHoveringFirst(false)}
                    >
                        <input
                            ref={firstFrameInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFrameUpload('first')}
                            className="hidden"
                        />
                        <div
                            onClick={() => firstFrameInputRef.current?.click()}
                            className={clsx(
                                "aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                                shot.firstFrameUrl
                                    ? "border-purple-500/50 bg-black/30"
                                    : "border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30"
                            )}
                        >
                            {shot.firstFrameUrl ? (
                                <>
                                    <img
                                        src={shot.firstFrameUrl}
                                        alt="Beginning frame"
                                        className="w-full h-full object-cover"
                                    />
                                    {isHoveringFirst && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                            <span className="text-xs text-white">Replace</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                    <Upload className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </div>
                        <span className="block text-[10px] text-center text-red-400 mt-1 font-medium">
                            beginning image<br />upload & Preview
                        </span>
                    </div>

                    {/* Ending Image */}
                    <div
                        className="relative"
                        onMouseEnter={() => setIsHoveringLast(true)}
                        onMouseLeave={() => setIsHoveringLast(false)}
                    >
                        <input
                            ref={lastFrameInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFrameUpload('last')}
                            className="hidden"
                        />
                        <div
                            onClick={() => lastFrameInputRef.current?.click()}
                            className={clsx(
                                "aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                                shot.lastFrameUrl
                                    ? "border-purple-500/50 bg-black/30"
                                    : "border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30"
                            )}
                        >
                            {shot.lastFrameUrl ? (
                                <>
                                    <img
                                        src={shot.lastFrameUrl}
                                        alt="Ending frame"
                                        className="w-full h-full object-cover"
                                    />
                                    {isHoveringLast && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                            <span className="text-xs text-white">Replace</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                    <Upload className="w-4 h-4 text-gray-500" />
                                </div>
                            )}
                        </div>
                        <span className="block text-[10px] text-center text-red-400 mt-1 font-medium">
                            ending image<br />upload & Preview
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Shot Card */}
            <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
                {/* Video Preview Area */}
                <div
                    className="relative bg-gradient-to-br from-gray-800/50 to-black/50"
                    onMouseEnter={() => setIsHoveringPreview(true)}
                    onMouseLeave={() => setIsHoveringPreview(false)}
                >
                    {/* Shot Number Badge */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2 py-1 bg-black/60 rounded backdrop-blur-sm">
                        <GripVertical className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-medium text-white">{shot.orderIndex + 1}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-10">
                        {shot.status === 'generating' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs backdrop-blur-sm">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating
                            </div>
                        )}
                        {shot.status === 'complete' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs backdrop-blur-sm">
                                <Check className="w-3 h-3" />
                                Complete
                            </div>
                        )}
                        {shot.status === 'failed' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs backdrop-blur-sm" title={shot.failureReason || ''}>
                                <AlertCircle className="w-3 h-3" />
                                Failed
                            </div>
                        )}
                    </div>

                    {/* Preview Content */}
                    <div className="aspect-video">
                        {shot.outputUrl ? (
                            <video
                                src={shot.outputUrl}
                                className="w-full h-full object-cover"
                                controls={isHoveringPreview}
                                muted
                                loop
                                playsInline
                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLVideoElement).pause();
                                    (e.target as HTMLVideoElement).currentTime = 0;
                                }}
                            />
                        ) : shot.firstFrameUrl ? (
                            <img
                                src={shot.firstFrameUrl}
                                alt="Preview"
                                className="w-full h-full object-cover opacity-60"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-16 h-16 text-gray-700" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-black/40 border-t border-white/5">
                    {/* Duration Input */}
                    <div className="flex items-center bg-white rounded overflow-hidden">
                        <span className="px-3 py-1.5 text-black text-sm font-medium">Duration</span>
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={shot.duration}
                            onChange={(e) => onUpdate(shot.id, { duration: parseInt(e.target.value) || 5 })}
                            className="w-16 px-2 py-1.5 bg-gray-100 text-black text-sm border-l border-gray-300 focus:outline-none"
                        />
                    </div>

                    <div className="flex-1" />

                    {/* Generate Button */}
                    <button
                        onClick={() => onGenerate(shot.id)}
                        disabled={isGenerating || shot.status === 'generating' || !shot.prompt.trim()}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            shot.status === 'generating' || isGenerating
                                ? "bg-gray-700 text-gray-400 cursor-wait"
                                : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] border border-white/10"
                        )}
                    >
                        {shot.status === 'generating' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <span className="text-purple-400">✧</span>
                                Generate Video
                            </>
                        )}
                    </button>
                </div>

                {/* Prompt Area */}
                <div className="px-4 py-3 border-t border-white/5">
                    <div className="relative">
                        <textarea
                            value={shot.prompt}
                            onChange={(e) => onUpdate(shot.id, { prompt: e.target.value })}
                            placeholder="Describe the action in this shot..."
                            className="w-full min-h-[80px] bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none"
                            disabled={shot.status === 'generating'}
                        />
                        {/* AI Enhance Button */}
                        {onEnhancePrompt && (
                            <button
                                onClick={() => onEnhancePrompt(shot.id)}
                                className="absolute bottom-1 right-1 p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                title="Enhance prompt with AI"
                            >
                                <Sparkles className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Shot Prompt Label */}
                    <div className="text-center text-gray-600 text-xs mt-2">
                        shot<br />prompt
                    </div>
                </div>

                {/* Error Message */}
                {shot.failureReason && (
                    <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                        <p className="text-red-400 text-xs">{shot.failureReason}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

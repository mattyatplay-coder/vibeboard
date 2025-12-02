"use client";

import { useState, useRef, useEffect } from "react";
import { Generation } from "@/lib/store";
import { Heart, Download, Trash2, X, Play, Loader2, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface GenerationCardProps {
    generation: Generation;
    onUpdate: (id: string, updates: Partial<Generation>) => void;
    onDelete: (id: string) => void;
    onIterate: (prompt: string) => void;
    onEdit?: () => void;
    onAnimate?: (imageUrl: string) => void;
    onRetake?: (videoUrl: string) => void;

    onInpaint?: (imageUrl: string, aspectRatio?: string) => void;
    isSelected?: boolean;
    onToggleSelection?: () => void;
}

export function GenerationCard({ generation, onUpdate, onDelete, onIterate, onEdit, onAnimate, onRetake, onInpaint, isSelected, onToggleSelection }: GenerationCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: generation.id,
        data: {
            type: 'generation',
            generation
        }
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : undefined,
    } : undefined;

    const [isHovered, setIsHovered] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState(generation.inputPrompt);
    const [isEditing, setIsEditing] = useState(false);

    // Reset edited prompt when popup opens/closes or generation changes
    useEffect(() => {
        setEditedPrompt(generation.inputPrompt);
        setIsEditing(false);
    }, [generation.inputPrompt, showPopup]);

    const [showStatus, setShowStatus] = useState(() => {
        if (generation.status !== 'succeeded') return true;
        // Only show if created in the last 10 seconds
        return (Date.now() - new Date(generation.createdAt).getTime()) < 10000;
    });

    useEffect(() => {
        if (generation.status === 'succeeded') {
            const timer = setTimeout(() => setShowStatus(false), 5000);
            return () => clearTimeout(timer);
        } else {
            setShowStatus(true);
        }
    }, [generation.status]);

    const output = generation.outputs?.[0];
    const isVideo = output?.type === 'video';
    const rawUrl = output?.url;
    const mediaUrl = rawUrl
        ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `http://localhost:3001${rawUrl}`)
        : undefined;

    useEffect(() => {
        if (isVideo && videoRef.current) {
            if (isHovered) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => { });
                // Stop after 5 seconds
                const timeout = setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                    }
                }, 5000);
                return () => clearTimeout(timeout);
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovered, isVideo]);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (mediaUrl) {
            const a = document.createElement('a');
            a.href = mediaUrl;
            a.download = `generation-${generation.id}.${isVideo ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const confirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(generation.id);
        setShowDeleteConfirm(false);
    };

    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(generation.id, { isFavorite: !generation.isFavorite });
    };

    const handleIterate = () => {
        onIterate(editedPrompt);
        setShowPopup(false);
    };

    const handleUpdatePrompt = () => {
        onUpdate(generation.id, { inputPrompt: editedPrompt });
        setIsEditing(false);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={clsx(
                    "group relative bg-white/5 border rounded-xl overflow-hidden transition-all cursor-pointer touch-none",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-white/10 hover:border-blue-500/50"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => {
                    // If selection mode is active (onToggleSelection provided), clicking card toggles selection
                    // Otherwise, it opens popup
                    if (onToggleSelection && (e.ctrlKey || e.metaKey || isSelected)) {
                        e.stopPropagation();
                        onToggleSelection();
                    } else if (generation.status === 'succeeded') {
                        setShowPopup(true);
                    }
                }}
            >
                {/* Selection Checkbox */}
                {onToggleSelection && (
                    <div
                        className={clsx(
                            "absolute top-2 left-2 z-20 transition-opacity duration-200",
                            (isHovered || isSelected) ? "opacity-100" : "opacity-0"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelection();
                        }}
                    >
                        <div className={clsx(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "bg-black/50 border-white/50 hover:border-white hover:bg-black/70"
                        )}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                )}
                <div
                    className="bg-black/50 relative overflow-hidden"
                    style={{ aspectRatio: generation.aspectRatio?.replace(':', '/') || '16/9' }}
                >
                    {generation.status === 'succeeded' && mediaUrl ? (
                        isVideo ? (
                            <video
                                ref={videoRef}
                                src={mediaUrl}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <img src={mediaUrl} className="w-full h-full object-cover" />
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {generation.status === 'queued' || generation.status === 'running' ? (
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            ) : (
                                <div className="flex flex-col items-center gap-2 px-4 text-center">
                                    <span className="text-red-500 font-medium">Failed</span>
                                    {generation.failureReason && (
                                        <span className="text-[10px] text-red-400/80 leading-tight line-clamp-3">
                                            {generation.failureReason}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Badge */}
                    <AnimatePresence>
                        {showStatus && generation.status !== 'failed' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white capitalize backdrop-blur-md z-10 pointer-events-none"
                            >
                                {generation.status}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action Buttons Overlay */}
                    {/* Action Buttons Overlay */}
                    {(generation.status === 'succeeded' || generation.status === 'failed') && (
                        <div className={clsx(
                            "absolute inset-0 bg-black/40 flex items-start justify-between p-2 transition-opacity duration-200",
                            isHovered ? "opacity-100" : "opacity-0"
                        )}>
                            {generation.status === 'succeeded' ? (
                                <button
                                    onClick={toggleFavorite}
                                    className="p-2 bg-black/50 hover:bg-red-500/20 rounded-lg text-white backdrop-blur-md transition-colors"
                                >
                                    <Heart className={clsx("w-4 h-4", generation.isFavorite ? "fill-red-500 text-red-500" : "text-white")} />
                                </button>
                            ) : <div />}

                            <div className="flex gap-2">
                                {generation.status === 'succeeded' && (
                                    <button
                                        onClick={handleDownload}
                                        className="p-2 bg-black/50 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={handleDelete}
                                    className="p-2 bg-black/50 hover:bg-red-500/20 rounded-lg text-white backdrop-blur-md transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                                {generation.status === 'succeeded' && onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                        className="p-2 bg-black/50 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
                                        title="Edit Prompt"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                    </button>
                                )}
                                {generation.status === 'succeeded' && onAnimate && !isVideo && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (mediaUrl) onAnimate(mediaUrl);
                                        }}
                                        className="p-2 bg-purple-600/80 hover:bg-purple-500 rounded-lg text-white backdrop-blur-md transition-colors"
                                        title="Animate with Wan 2.1"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                    </button>
                                )}
                                {generation.status === 'succeeded' && onRetake && isVideo && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (mediaUrl) onRetake(mediaUrl);
                                        }}
                                        className="p-2 bg-blue-600/80 hover:bg-blue-500 rounded-lg text-white backdrop-blur-md transition-colors"
                                        title="Retake / Inpaint"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wand-2"><path d="m19 2 2 2-2 2-2-2 2-2Z" /><path d="m5 7 2 2-2 2-2-2 2-2Z" /><path d="m15 11 2 2-2 2-2-2 2-2Z" /><path d="M14.5 18.5 10 14l-4 4 4 4 4.5-4.5Z" /><path d="m21 22-5.5-5.5" /></svg>
                                    </button>
                                )}
                                {generation.status === 'succeeded' && onInpaint && !isVideo && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (mediaUrl) onInpaint(mediaUrl, generation.aspectRatio);
                                        }}
                                        className="p-2 bg-blue-600/80 hover:bg-blue-500 rounded-lg text-white backdrop-blur-md transition-colors"
                                        title="Inpaint / Edit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brush"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2.5 2.24 0 .46.62.8 1 .8 2.48 0 4.5-2.01 4.5-4.5 0-.72-1.66-.72-1.66-2.24 0-1.67 1.35-3.02 3.02-3.02 1.67 0 3.02 1.35 3.02 3.02 0 .72-1.66.72-1.66 2.24 0 2.49 2.02 4.5 4.5 4.5.38 0 1-.34 1-.8 0-.72-2.5-.91-2.5-2.24 0-1.67-1.34-3.02-3-3.02-1.67 0-3.02 1.35-3.02 3.02" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3">
                    <p className="text-sm text-gray-300 line-clamp-2">{generation.inputPrompt}</p>
                    <div className="mt-2 text-xs text-gray-500">
                        {new Date(generation.createdAt).toLocaleTimeString()}
                    </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-medium text-white mb-3">Delete this generation?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Popup Modal */}
            <AnimatePresence>
                {showPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowPopup(false)}>
                        {(() => {
                            // Determine if vertical layout is needed
                            const isVertical = generation.aspectRatio ?
                                (generation.aspectRatio.includes(':') ?
                                    parseInt(generation.aspectRatio.split(':')[1]) > parseInt(generation.aspectRatio.split(':')[0]) :
                                    generation.aspectRatio.startsWith('portrait') || generation.aspectRatio === '9:16'
                                ) : false;

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`relative w-full bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex ${isVertical ? 'flex-row max-w-7xl h-[85vh]' : 'flex-col max-w-5xl max-h-[90vh]'
                                        }`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => setShowPopup(false)}
                                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>

                                    <div className={`bg-black flex items-center justify-center overflow-hidden ${isVertical ? 'w-2/3 h-full' : 'w-full flex-1'
                                        }`}>
                                        {isVideo ? (
                                            <video src={mediaUrl} controls autoPlay className="w-full h-full object-contain" />
                                        ) : (
                                            <img src={mediaUrl} className="w-full h-full object-contain" />
                                        )}
                                    </div>

                                    <div className={`bg-[#1a1a1a] border-white/10 ${isVertical ? 'w-1/3 h-full overflow-y-auto border-l p-6' : 'w-full border-t p-6'
                                        }`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-white">Generation Details</h3>
                                            <button
                                                onClick={() => setIsEditing(!isEditing)}
                                                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                                            >
                                                {isEditing ? "Cancel Edit" : "Iterate Prompt"}
                                            </button>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={editedPrompt}
                                                    onChange={(e) => setEditedPrompt(e.target.value)}
                                                    className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="Edit your prompt..."
                                                />
                                                <div className="flex gap-3 justify-end">
                                                    <button
                                                        onClick={handleUpdatePrompt}
                                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Update Current
                                                    </button>
                                                    <button
                                                        onClick={handleIterate}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
                                                    >
                                                        Generate New
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-gray-400 mb-4">{generation.inputPrompt}</p>
                                                <button
                                                    onClick={() => {
                                                        // TODO: Trigger Smart Refine
                                                        // For now, we'll just log it as a placeholder
                                                        console.log("Triggering Smart Refine for", generation.id);
                                                        setIsEditing(true);
                                                        // Ideally, this would call an API endpoint that uses the new refinePrompt service
                                                    }}
                                                    className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm font-medium transition-colors border border-purple-500/30 flex items-center justify-center gap-2"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    Smart Refine (Vision)
                                                </button>
                                            </div>
                                        )}

                                        {/* Generation Metadata */}
                                        <div className="mt-6 pt-4 border-t border-white/10">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Generation Details</h4>
                                            <div className={`grid gap-4 text-xs ${isVertical ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Provider</span>
                                                    <span className="text-white capitalize">{generation.usedLoras?.provider || 'Unknown'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Model</span>
                                                    <span className="text-white break-all">{generation.usedLoras?.model || 'Unknown'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Resolution</span>
                                                    <span className="text-white">{generation.aspectRatio || 'Unknown'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Seed</span>
                                                    <span className="text-white font-mono">{generation.usedLoras?.seed || 'Random'}</span>
                                                </div>

                                                {generation.usedLoras?.sampler && (
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">Sampler</span>
                                                        <span className="text-white">
                                                            {typeof generation.usedLoras.sampler === 'object'
                                                                ? (generation.usedLoras.sampler as any).name || (generation.usedLoras.sampler as any).value
                                                                : generation.usedLoras.sampler}
                                                        </span>
                                                    </div>
                                                )}

                                                {generation.usedLoras?.scheduler && (
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">Scheduler</span>
                                                        <span className="text-white">
                                                            {typeof generation.usedLoras.scheduler === 'object'
                                                                ? (generation.usedLoras.scheduler as any).name || (generation.usedLoras.scheduler as any).value
                                                                : generation.usedLoras.scheduler}
                                                        </span>
                                                    </div>
                                                )}

                                                {generation.usedLoras?.strength !== undefined && (
                                                    <div>
                                                        <span className="text-gray-500 block mb-1">Strength</span>
                                                        <span className="text-white">{generation.usedLoras.strength}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* LoRAs Section */}
                                            {generation.usedLoras?.loras && generation.usedLoras.loras.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-white/5">
                                                    <span className="text-gray-500 block mb-2 text-xs">Active LoRAs</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {generation.usedLoras.loras.map((lora: any, idx: number) => (
                                                            <div key={idx} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 border border-white/10">
                                                                {lora.path?.split('/').pop() || lora.id}
                                                                <span className="text-gray-500 ml-1">({lora.strength})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

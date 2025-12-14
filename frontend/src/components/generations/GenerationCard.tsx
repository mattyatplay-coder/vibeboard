"use client";

import { useState, useRef, useEffect } from "react";
import { Generation, Element } from "@/lib/store";
import { analyzeGeneration, refineGeneration } from "@/lib/api";
import { Heart, Download, Trash2, X, Play, Loader2, Sparkles, Check, Maximize2, ZoomIn, FilePlus, Wand2, AlertTriangle, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface GenerationCardProps {
    generation: Generation;
    elements?: Element[]; // Pass elements for lookup
    onUpdate: (id: string, updates: Partial<Generation>) => void;
    onDelete: (id: string) => void;
    onIterate: (prompt: string) => void;
    onUseSettings?: (generation: Generation) => void;
    onEdit?: () => void;
    onAnimate?: (imageUrl: string) => void;
    onRetake?: (videoUrl: string) => void;
    onInpaint?: (imageUrl: string, aspectRatio?: string) => void;
    onUpscale?: (imageUrl: string, model: string) => void;
    onSaveAsElement?: (url: string, type: 'image' | 'video') => void;
    onEnhanceVideo?: (generationId: string, mode: 'full' | 'audio-only' | 'smooth-only') => void;
    isSelected?: boolean;
    onToggleSelection?: () => void;
}

// Upscale options
const UPSCALE_OPTIONS = [
    { id: 'fal-ai/clarity-upscaler', name: 'Clarity 2x', description: 'Sharp, detailed upscale' },
    { id: 'fal-ai/creative-upscaler', name: 'Clarity 4x', description: 'Maximum quality upscale' },
    { id: 'fal-ai/aura-sr', name: 'Aura SR', description: 'Fast AI upscaling' },
];

export function GenerationCard({ generation, elements, onUpdate, onDelete, onIterate, onUseSettings, onEdit, onAnimate, onRetake, onInpaint, onUpscale, onSaveAsElement, onEnhanceVideo, isSelected, onToggleSelection }: GenerationCardProps) {
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showUpscaleMenu, setShowUpscaleMenu] = useState(false);
    const [showEnhanceMenu, setShowEnhanceMenu] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleRestoreSettings = async () => {
        if (!onUseSettings) return;
        setIsRestoring(true);
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        onUseSettings(generation);
        setIsRestoring(false);
        setShowPopup(false);
    };

    // Feedback State for Analysis
    const [showAnalysisInput, setShowAnalysisInput] = useState(false);
    const [analysisFeedback, setAnalysisFeedback] = useState("");

    const handleSmartRefine = async () => {
        setIsRefining(true);
        try {
            console.log("Triggering Smart Refine for", generation.id);
            const result = await refineGeneration(generation.projectId, generation.id);
            if (result.success && result.refinedPrompt) {
                setEditedPrompt(result.refinedPrompt);
                console.log("Smart Refine success:", result);
            }
            setIsEditing(true); // Open edit mode with refined prompt (or old one if moved too fast)
        } catch (error) {
            console.error("Smart Refine failed", error);
            setIsEditing(true);
        } finally {
            setIsRefining(false);
        }
    };

    const confirmAnalyze = async () => {
        setIsAnalyzing(true);
        setShowAnalysisInput(false);
        try {
            const analysis = await analyzeGeneration(generation.projectId, generation.id, analysisFeedback);
            // Update local state via onUpdate to show the new analysis immediately
            onUpdate(generation.id, {
                aiAnalysis: JSON.stringify(analysis),
                rating: analysis.rating
            });
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
            setAnalysisFeedback("");
        }
    };

    const handleAnalyzeClick = () => {
        // Show input dialog first
        setShowAnalysisInput(true);
    };

    const analysis = typeof generation.aiAnalysis === 'string'
        ? JSON.parse(generation.aiAnalysis)
        : generation.aiAnalysis;

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

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (mediaUrl) {
            try {
                // Fetch the file and download it properly
                const response = await fetch(mediaUrl);
                if (!response.ok) throw new Error('Network response was not ok');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `generation-${generation.id}.${isVideo ? 'mp4' : 'png'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // Optional: success toast could go here
            } catch (error) {
                console.error('Download failed:', error);
                // Fallback to direct link
                const a = document.createElement('a');
                a.href = mediaUrl;
                a.download = `generation-${generation.id}.${isVideo ? 'mp4' : 'png'}`;
                a.target = "_blank"; // Safety fallback
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // TODO: Add toast.error("Download failed") here when toast provider is available
            }
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

    const handleUpscale = (e: React.MouseEvent, model: string) => {
        e.stopPropagation();
        if (mediaUrl && onUpscale) {
            onUpscale(mediaUrl, model);
        }
        setShowUpscaleMenu(false);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...listeners}
                {...attributes}
                className={clsx(
                    "group relative bg-white/5 border rounded-xl transition-all cursor-pointer touch-none",
                    isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-white/10 hover:border-blue-500/50"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowUpscaleMenu(false); setShowEnhanceMenu(false); }}
                onClick={(e) => {
                    if (onToggleSelection && (e.ctrlKey || e.metaKey || isSelected)) {
                        e.stopPropagation();
                        onToggleSelection();
                    } else if (generation.status === 'succeeded') {
                        setShowPopup(true);
                    }
                }}
            >
                {/* TOP LEFT: Selection Checkbox + Favorite Heart */}
                <div
                    className={clsx(
                        "absolute top-2 left-2 z-20 flex items-center gap-1.5 transition-opacity duration-200",
                        (isHovered || isSelected || generation.isFavorite) ? "opacity-100" : "opacity-0"
                    )}
                >
                    {onToggleSelection && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelection();
                            }}
                            className={clsx(
                                "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm",
                                isSelected
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-black/40 border-white/60 hover:border-white hover:bg-black/60"
                            )}
                        >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                    )}
                    {generation.status === 'succeeded' && (
                        <button
                            onClick={toggleFavorite}
                            className={clsx(
                                "w-6 h-6 rounded flex items-center justify-center transition-colors backdrop-blur-sm",
                                generation.isFavorite ? "bg-red-500/80" : "bg-black/40 hover:bg-red-500/50"
                            )}
                        >
                            <Heart className={clsx("w-4 h-4", generation.isFavorite ? "fill-white text-white" : "text-white")} />
                        </button>
                    )}
                </div>

                {/* TOP RIGHT: Action Buttons */}
                <div
                    className={clsx(
                        "absolute top-2 right-2 z-20 flex items-center gap-1 transition-opacity duration-200",
                        isHovered ? "opacity-100" : "opacity-0"
                    )}
                >
                    {/* Fullscreen (Success only) */}
                    {generation.status === 'succeeded' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPopup(true);
                                setIsFullscreen(true);
                            }}
                            className="w-7 h-7 rounded bg-black/50 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Fullscreen"
                            aria-label="View fullscreen"
                        >
                            <Maximize2 className="w-4 h-4 text-white" />
                        </button>
                    )}

                    {/* Upscale (Success + Image only) */}
                    {generation.status === 'succeeded' && !isVideo && onUpscale && (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowUpscaleMenu(!showUpscaleMenu);
                                }}
                                className="w-7 h-7 rounded bg-green-600/80 hover:bg-green-500 flex items-center justify-center transition-colors backdrop-blur-sm"
                                title="Upscale"
                                aria-label="Upscale image"
                                aria-haspopup="true"
                                aria-expanded={showUpscaleMenu}
                            >
                                <ZoomIn className="w-4 h-4 text-white" />
                            </button>

                            {/* Upscale Dropdown */}
                            <AnimatePresence>
                                {showUpscaleMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute top-full right-0 mt-1 w-44 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                        role="menu"
                                    >
                                        {UPSCALE_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={(e) => handleUpscale(e, option.id)}
                                                className="w-full text-left px-3 py-2 hover:bg-green-500/20 transition-colors border-b border-white/5 last:border-0"
                                                role="menuitem"
                                                aria-label={`Upscale with ${option.name}`}
                                            >
                                                <div className="text-sm text-white font-medium">{option.name}</div>
                                                <div className="text-[10px] text-gray-500">{option.description}</div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Animate (Success + Image only) */}
                    {generation.status === 'succeeded' && !isVideo && onAnimate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (mediaUrl) onAnimate(mediaUrl);
                            }}
                            className="w-7 h-7 rounded bg-purple-600/80 hover:bg-purple-500 flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Animate"
                            aria-label="Animate image"
                        >
                            <Play className="w-4 h-4 text-white fill-current" />
                        </button>
                    )}

                    {/* Enhance Video Menu (Success + Video only) */}
                    {generation.status === 'succeeded' && isVideo && onEnhanceVideo && (
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEnhanceMenu(!showEnhanceMenu);
                                }}
                                className="w-7 h-7 rounded bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 flex items-center justify-center transition-colors backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                aria-label="Enhance video options"
                                title="Enhance video"
                                aria-haspopup="true"
                                aria-expanded={showEnhanceMenu}
                            >
                                <Wand2 className="w-4 h-4 text-white" />
                            </button>
                            {showEnhanceMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden min-w-[180px] z-50">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEnhanceVideo(generation.id, 'audio-only');
                                            setShowEnhanceMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-purple-600/50 flex items-center gap-2"
                                        aria-label="Add audio only"
                                    >
                                        <span className="text-lg">🔊</span>
                                        <div>
                                            <div className="font-medium">Add Audio Only</div>
                                            <div className="text-xs text-gray-400">MMAudio (no speed change)</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEnhanceVideo(generation.id, 'smooth-only');
                                            setShowEnhanceMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-purple-600/50 flex items-center gap-2"
                                        aria-label="Apply smoothing only"
                                    >
                                        <span className="text-lg">🎬</span>
                                        <div>
                                            <div className="font-medium">Smooth Only</div>
                                            <div className="text-xs text-gray-400">RIFE interpolation (24fps)</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEnhanceVideo(generation.id, 'full');
                                            setShowEnhanceMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-purple-600/50 flex items-center gap-2"
                                        aria-label="Apply full enhancement"
                                    >
                                        <span className="text-lg">✨</span>
                                        <div>
                                            <div className="font-medium">Full Enhancement</div>
                                            <div className="text-xs text-gray-400">Smooth + Audio</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save as Element (Success only) */}
                    {generation.status === 'succeeded' && onSaveAsElement && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (mediaUrl) onSaveAsElement(mediaUrl, isVideo ? 'video' : 'image');
                            }}
                            className="w-7 h-7 rounded bg-black/50 hover:bg-blue-500/50 flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Save as Element"
                            aria-label="Save as Element"
                        >
                            <FilePlus className="w-4 h-4 text-white" />
                        </button>
                    )}

                    {/* Download (Success only) */}
                    {generation.status === 'succeeded' && (
                        <button
                            onClick={handleDownload}
                            className="w-7 h-7 rounded bg-black/50 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Download"
                            aria-label="Download media"
                        >
                            <Download className="w-4 h-4 text-white" />
                        </button>
                    )}

                    {/* Delete (ALWAYS VISIBLE) */}
                    <button
                        onClick={handleDelete}
                        className="w-7 h-7 rounded bg-black/50 hover:bg-red-500/50 flex items-center justify-center transition-colors backdrop-blur-sm"
                        title="Delete"
                        aria-label="Delete generation"
                    >
                        <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                </div>

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
                                onContextMenu={(e) => e.stopPropagation()}
                                onPointerDown={(e) => {
                                    // Stop propagation for right click (button 2) to prevent dnd-kit from grabbing it
                                    if (e.button === 2) {
                                        e.stopPropagation();
                                    }
                                }}
                            />
                        ) : (
                            <img
                                src={mediaUrl}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onContextMenu={(e) => e.stopPropagation()}
                                onPointerDown={(e) => {
                                    // Stop propagation for right click (button 2) to prevent dnd-kit from grabbing it
                                    if (e.button === 2) {
                                        e.stopPropagation();
                                    }
                                }}
                            />
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
                        {showStatus && generation.status !== 'failed' && generation.status !== 'succeeded' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white capitalize backdrop-blur-md z-10 pointer-events-none"
                            >
                                {generation.status}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-3">
                    <p className="text-sm text-gray-300 line-clamp-2">{generation.inputPrompt}</p>
                    <div className="mt-2 text-xs text-gray-500">
                        {new Date(generation.createdAt).toLocaleTimeString()}
                    </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => { setShowPopup(false); setIsFullscreen(false); }}>
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
                                    {/* Top buttons row */}
                                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                                        <button
                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                            className="p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                                        >
                                            <Maximize2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => { setShowPopup(false); setIsFullscreen(false); }}
                                            className="p-2 bg-black/50 hover:bg-white/20 rounded-full text-white transition-colors"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {/* Fullscreen mode - just show the image/video */}
                                    {isFullscreen ? (
                                        <div className="w-full h-full flex items-center justify-center bg-black" onClick={() => setIsFullscreen(false)}>
                                            {isVideo ? (
                                                <video src={mediaUrl} controls autoPlay className="max-w-full max-h-full object-contain" />
                                            ) : (
                                                <img src={mediaUrl} className="max-w-full max-h-full object-contain" />
                                            )}
                                        </div>
                                    ) : (
                                        <>
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
                                                    <div className="flex gap-4">
                                                        {onUseSettings && (
                                                            <button
                                                                onClick={handleRestoreSettings}
                                                                className={clsx(
                                                                    "text-sm font-medium flex items-center gap-1.5 transition-all duration-200",
                                                                    isRestoring
                                                                        ? "text-green-400 scale-105"
                                                                        : "text-purple-400 hover:text-purple-300"
                                                                )}
                                                                title="Load these settings into the generator"
                                                            >
                                                                {isRestoring ? (
                                                                    <>
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        Restored!
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Wand2 className="w-3.5 h-3.5" />
                                                                        Use Settings
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setIsEditing(!isEditing)}
                                                            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                                                        >
                                                            {isEditing ? "Cancel Edit" : "Iterate Prompt"}
                                                        </button>
                                                    </div>
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
                                                        {generation.usedLoras?.negativePrompt && (
                                                            <div className="mb-4 pt-3 border-t border-white/5">
                                                                <span className="text-gray-500 block mb-1 text-xs">Negative Prompt</span>
                                                                <p className="text-gray-400 italic font-mono text-[10px] break-words">
                                                                    {generation.usedLoras.negativePrompt}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={handleSmartRefine}
                                                            disabled={isRefining}
                                                            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm font-medium transition-colors border border-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            {isRefining ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="w-4 h-4" />
                                                            )}
                                                            Smart Refine (Vision)
                                                        </button>

                                                        {/* Analyze Failure Button */}
                                                        {!analysis && generation.status === 'succeeded' && !showAnalysisInput && (
                                                            <button
                                                                onClick={handleAnalyzeClick}
                                                                disabled={isAnalyzing}
                                                                className="w-full mt-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-500/30 flex items-center justify-center gap-2"
                                                            >
                                                                {isAnalyzing ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <AlertTriangle className="w-4 h-4" />
                                                                )}
                                                                Analyze Failure
                                                            </button>
                                                        )}

                                                        {/* Analysis Feedback Input */}
                                                        {showAnalysisInput && (
                                                            <div className="mt-2 p-3 bg-red-900/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <p className="text-xs text-red-200 mb-2 font-medium">What seems to be wrong? (Optional)</p>
                                                                <textarea
                                                                    value={analysisFeedback}
                                                                    onChange={(e) => setAnalysisFeedback(e.target.value)}
                                                                    className="w-full h-20 bg-black/40 border border-white/10 rounded p-2 text-xs text-white mb-2 focus:outline-none focus:border-red-500/50 resize-none placeholder:text-white/20"
                                                                    placeholder="E.g. The eyes are asymmetrical..."
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <button
                                                                        onClick={() => setShowAnalysisInput(false)}
                                                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={confirmAnalyze}
                                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                                                                    >
                                                                        {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                        Start Analysis
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Analysis Results Display */}
                                                        {analysis && (
                                                            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <h4 className="text-sm font-semibold text-red-200 flex items-center gap-2">
                                                                        <Lightbulb className="w-4 h-4" />
                                                                        AI Critique ({analysis.rating}/5)
                                                                    </h4>
                                                                </div>

                                                                <div className="space-y-3 text-xs">
                                                                    <div>
                                                                        <span className="text-red-400 font-medium block">Flaws:</span>
                                                                        <ul className="list-disc list-inside text-gray-300 pl-1">
                                                                            {analysis.flaws?.map((flaw: string, i: number) => (
                                                                                <li key={i}>{flaw}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>

                                                                    <div>
                                                                        <span className="text-green-400 font-medium block">Good:</span>
                                                                        <p className="text-gray-300">{analysis.positiveTraits?.join(', ')}</p>
                                                                    </div>

                                                                    <div className="pt-2 border-t border-white/5">
                                                                        <span className="text-blue-300 font-medium block">Advice:</span>
                                                                        <p className="text-gray-300 italic">"{analysis.advice}"</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
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

                                                        {generation.usedLoras?.steps && (
                                                            <div>
                                                                <span className="text-gray-500 block mb-1">Steps</span>
                                                                <span className="text-white">{generation.usedLoras.steps}</span>
                                                            </div>
                                                        )}

                                                        {generation.usedLoras?.guidanceScale && (
                                                            <div>
                                                                <span className="text-gray-500 block mb-1">CFG</span>
                                                                <span className="text-white">{generation.usedLoras.guidanceScale}</span>
                                                            </div>
                                                        )}

                                                        {generation.usedLoras?.strength !== undefined && (
                                                            <div>
                                                                <span className="text-gray-500 block mb-1">Denoise</span>
                                                                <span className="text-white">{Number(generation.usedLoras.strength).toFixed(2)}</span>
                                                            </div>
                                                        )}

                                                        {generation.usedLoras?.referenceStrengths && Object.keys(generation.usedLoras.referenceStrengths).length > 0 && (
                                                            <div className="col-span-2">
                                                                <span className="text-gray-500 block mb-1">Ref Strengths</span>
                                                                <div className="flex flex-col gap-1">
                                                                    {Object.entries(generation.usedLoras.referenceStrengths).map(([id, str]: [string, any]) => {
                                                                        const element = elements?.find(e => e.id === id);
                                                                        const name = element ? element.name : id.substring(0, 6) + '...';
                                                                        return (
                                                                            <div key={id} className="flex justify-between items-center text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">
                                                                                <span className="truncate max-w-[80px]" title={element?.name || id}>{name}</span>
                                                                                <span className="ml-2 text-gray-300">{Number(str).toFixed(2)}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {generation.usedLoras?.loras && generation.usedLoras.loras.length > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-white/5">
                                                            <span className="text-gray-500 block mb-2 text-xs">Active LoRAs</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {generation.usedLoras.loras.map((lora: any, idx: number) => (
                                                                    <div key={idx} className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300 border border-white/10">
                                                                        {lora.name || lora.path?.split('/').pop() || lora.id}
                                                                        <span className="text-gray-500 ml-1">({lora.strength})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            );
                        })()}
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

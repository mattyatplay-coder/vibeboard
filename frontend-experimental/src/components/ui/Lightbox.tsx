"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, Pause, Download, Info } from "lucide-react";
import { resolveFileUrl } from "@/lib/api";
import { clsx } from "clsx";
import { Generation } from "@/lib/store";

interface LightboxProps {
    items: Generation[];
    initialIndex: number;
    onClose: () => void;
}

export function Lightbox({ items, initialIndex, onClose }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentItem = items[currentIndex];

    // Parse output
    const output = currentItem?.outputs?.[0] ?
        (typeof currentItem.outputs[0] === 'string' ? JSON.parse(currentItem.outputs as any)[0] : currentItem.outputs[0])
        : null;

    // Handle really raw legacy data if necessary, but assuming standardized Generation object
    const fileUrl = output?.url;
    const isVideo = output?.type === 'video' || fileUrl?.endsWith('.mp4') || fileUrl?.endsWith('.webm');

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") navigate(-1);
            if (e.key === "ArrowRight") navigate(1);
            if (e.key === " " && isVideo) {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, isVideo]);

    const navigate = (dir: number) => {
        const newIndex = currentIndex + dir;
        if (newIndex >= 0 && newIndex < items.length) {
            setCurrentIndex(newIndex);
            setIsPlaying(true); // Auto-play next video
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Thumbnail scroll
    const thumbRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        thumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [currentIndex]);

    if (!currentItem || !fileUrl) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 lg:p-8"
        >
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/60 to-transparent">
                <div className="text-white/80">
                    <div className="text-sm font-bold">{currentItem.inputPrompt?.slice(0, 50)}...</div>
                    <div className="text-xs text-white/40 font-mono mt-1">
                        {currentIndex + 1} / {items.length} • {new Date(currentItem.createdAt).toLocaleTimeString()}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowInfo(!showInfo)} className={clsx("p-2 rounded-full transition-colors", showInfo ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60")}>
                        <Info className="w-5 h-5" />
                    </button>
                    <a href={resolveFileUrl(fileUrl)} download className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <Download className="w-5 h-5" />
                    </a>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full flex items-center justify-center relative my-8">
                {/* Nav Buttons */}
                <button
                    onClick={() => navigate(-1)}
                    disabled={currentIndex === 0}
                    className="absolute left-4 p-4 rounded-full hover:bg-white/10 disabled:opacity-0 text-white transition-all z-10"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <button
                    onClick={() => navigate(1)}
                    disabled={currentIndex === items.length - 1}
                    className="absolute right-4 p-4 rounded-full hover:bg-white/10 disabled:opacity-0 text-white transition-all z-10"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentItem.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden"
                    >
                        {isVideo ? (
                            <div className="relative group">
                                <video
                                    ref={videoRef}
                                    src={resolveFileUrl(fileUrl)}
                                    className="max-h-[80vh] w-auto rounded-lg shadow-2xl"
                                    autoPlay
                                    loop
                                    playsInline
                                    controls={false}
                                    onClick={togglePlay}
                                />
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <Play className="w-16 h-16 text-white/80 fill-current" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={resolveFileUrl(fileUrl)}
                                alt={currentItem.inputPrompt}
                                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Filmstrip */}
            <div className="h-20 w-full max-w-4xl flex items-center gap-2 overflow-x-auto p-2 scrollbar-hide z-20">
                {items.map((item, i) => {
                    const itemOutput = item.outputs?.[0] ?
                        (typeof item.outputs[0] === 'string' ? JSON.parse(item.outputs as any)[0] : item.outputs[0])
                        : null;
                    const thumbUrl = itemOutput?.url;
                    if (!thumbUrl) return null;

                    return (
                        <button
                            key={item.id}
                            ref={i === currentIndex ? thumbRef : null}
                            onClick={() => setCurrentIndex(i)}
                            className={clsx(
                                "flex-shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 transition-all relative",
                                i === currentIndex ? "border-white scale-110 z-10" : "border-transparent opacity-50 hover:opacity-100"
                            )}
                        >
                            {/* Simple thumb */}
                            {itemOutput.type === 'video' || thumbUrl.endsWith('.mp4') ? (
                                <video src={resolveFileUrl(thumbUrl)} className="w-full h-full object-cover" muted />
                            ) : (
                                <img src={resolveFileUrl(thumbUrl)} className="w-full h-full object-cover" />
                            )}
                        </button>
                    );
                })}
            </div>

        </motion.div>
    );
}

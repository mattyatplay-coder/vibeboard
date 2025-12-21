"use client";

import { Project, resolveFileUrl } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Play, Clock, Film, Calendar, Trash2, Settings, Edit } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";

interface ProductionCardProps {
    project: Project;
    onDelete: (id: string) => void;
    index: number;
}

export function ProductionCard({ project, onDelete, index }: ProductionCardProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [scrubIndex, setScrubIndex] = useState(0);
    const scrubIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Mock Metadata derived from Project Data
    // Determine status based on recency
    const now = new Date();
    const updatedAt = new Date(project.updatedAt);
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

    let status: 'Pre-Prod' | 'Production' | 'Post-Prod' = 'Post-Prod';
    let statusColor = "bg-blue-500/80 text-blue-100";

    if (hoursSinceUpdate < 24) {
        status = 'Production';
        statusColor = "bg-red-500/80 text-red-100";
    } else if ((now.getTime() - new Date(project.createdAt).getTime()) < 1000 * 60 * 60 * 24) {
        status = 'Pre-Prod';
        statusColor = "bg-yellow-500/80 text-yellow-100";
    }

    // Mock stats
    const shotCount = (project.name.length * 3) + 5; // Deterministic randomish number
    const runtime = `0${Math.floor(project.name.length / 5)}:${(project.name.length * 2) % 60}`.padStart(5, '0');

    // Handle Scrubbing Effect
    useEffect(() => {
        if (isHovering) {
            scrubIntervalRef.current = setInterval(() => {
                setScrubIndex(prev => (prev + 1) % 4); // Cycle through 4 "frames"
            }, 600);
        } else {
            if (scrubIntervalRef.current) clearInterval(scrubIntervalRef.current);
            setScrubIndex(0);
        }
        return () => {
            if (scrubIntervalRef.current) clearInterval(scrubIntervalRef.current);
        };
    }, [isHovering]);

    // Extract Preview Assets (Video or Images)
    const previewData = project.generations?.reduce((acc, g) => {
        try {
            if (!g.outputs) return acc;
            const parsed = JSON.parse(g.outputs);
            const asset = parsed[0];
            if (!asset?.url) return acc;

            const isVideo = asset.type === 'video' || asset.url.endsWith('.mp4') || asset.url.endsWith('.webm');

            if (isVideo && !acc.video) {
                acc.video = asset.url; // Take the first video found as the preview
            } else if (!isVideo) {
                acc.images.push(asset.url);
            }
            return acc;
        } catch (e) { return acc; }
    }, { video: null as string | null, images: [] as string[] }) || { video: null, images: [] };

    // Mock gradients for fallback
    const gradientFrames = [
        "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
        "bg-gradient-to-br from-gray-800 via-indigo-950 to-black",
        "bg-gradient-to-br from-gray-900 via-slate-800 to-black",
        "bg-gradient-to-br from-gray-800 via-gray-900 to-zinc-900",
    ];

    const hasRealImages = previewData.images.length > 0;
    const effectiveFrames = hasRealImages ? previewData.images : gradientFrames;

    // Video Ref for hover playback
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (previewData.video && videoRef.current) {
            if (isHovering) {
                videoRef.current.play().catch(() => { }); // catch abort errors
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovering, previewData.video]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative w-full aspect-[16/9] rounded-xl overflow-hidden glass-panel border border-white/5 hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/10"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <Link href={`/projects/${project.id}/generate`} className="block w-full h-full relative z-0">
                {/* Background / Poster / Scrubbing Area */}
                <div className="absolute inset-0 transition-opacity duration-500 bg-black">
                    {/* 
                        MODE 1: VIDEO PREVIEW 
                        If we have a video, show it. Play on hover.
                     */}
                    {previewData.video ? (
                        <div className="w-full h-full relative">
                            {/* Fallback image (first frame or first image) while loading/paused */}
                            <div
                                className={clsx("absolute inset-0 bg-cover bg-center transition-opacity duration-300", isHovering ? "opacity-0" : "opacity-100")}
                                style={{ backgroundImage: `url(${resolveFileUrl(previewData.images[0] || previewData.video.replace('.mp4', '.jpg'))})` }} // naive fallback or use first image
                            />
                            <video
                                ref={videoRef}
                                src={resolveFileUrl(previewData.video)}
                                muted
                                loop
                                playsInline
                                className={clsx("w-full h-full object-cover transition-opacity duration-500", isHovering ? "opacity-100" : "opacity-0")}
                            />
                        </div>
                    ) : (
                        /* 
                           MODE 2: IMAGE SCRUB 
                           If no video, cycle through images on hover. 
                        */
                        hasRealImages ? (
                            <div
                                className="w-full h-full bg-cover bg-center transition-all duration-300"
                                style={{ backgroundImage: `url(${resolveFileUrl(effectiveFrames[scrubIndex % effectiveFrames.length])})` }}
                            />
                        ) : (
                            <div className={clsx("w-full h-full transition-colors duration-500", effectiveFrames[scrubIndex % effectiveFrames.length])} />
                        )
                    )}

                    {/* Static Noise Overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-cover pointer-events-none" />

                    {/* Darken overlay for text readability (lighter on hover) */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-5 flex flex-col justify-between">

                    {/* Top Bar: Status & Menu */}
                    <div className="flex justify-between items-start">
                        <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm", statusColor)}>
                            {status}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.preventDefault(); onDelete(project.id); }}
                                className="p-2 rounded-full bg-black/50 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors backdrop-blur-md"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Bar: Info */}
                    <div>
                        <div className="flex items-end justify-between mb-1">
                            <h3 className="text-xl font-bold text-white leading-tight group-hover:text-indigo-300 transition-colors">
                                {project.name}
                            </h3>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                                <Film className="w-3 h-3" /> {shotCount} Shots
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {runtime}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(project.updatedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

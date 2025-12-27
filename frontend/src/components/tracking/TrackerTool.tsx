'use client';

/**
 * TrackerTool - Pro Trajectory Engine Frontend
 *
 * Provides:
 * - 4-point corner selection for planar tracking
 * - Real-time preview with OpenCV.js homography transforms
 * - Prop overlay with perspective correction
 * - Export tracking data for compositing
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Play,
    Pause,
    RotateCcw,
    Download,
    Upload,
    Crosshair,
    Square,
    Loader2,
    Check,
    X,
    Move,
    Maximize2,
} from 'lucide-react';
import clsx from 'clsx';

// OpenCV.js will be loaded dynamically
declare global {
    interface Window {
        cv: any;
    }
}

interface CornerPoint {
    id: number;
    x: number;
    y: number;
    label: string;
}

interface TrackedFrame {
    frameIndex: number;
    corners: CornerPoint[];
    homography: number[];
}

interface PropOverlay {
    id: string;
    imageUrl: string;
    width: number;
    height: number;
}

interface TrackerToolProps {
    videoUrl: string;
    onTrackingComplete?: (data: TrackedFrame[]) => void;
    onClose?: () => void;
    propOverlay?: PropOverlay;
}

export default function TrackerTool({
    videoUrl,
    onTrackingComplete,
    onClose,
    propOverlay,
}: TrackerToolProps) {
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [totalFrames, setTotalFrames] = useState(0);
    const [corners, setCorners] = useState<CornerPoint[]>([
        { id: 0, x: 100, y: 100, label: 'TL' },
        { id: 1, x: 300, y: 100, label: 'TR' },
        { id: 2, x: 300, y: 300, label: 'BR' },
        { id: 3, x: 100, y: 300, label: 'BL' },
    ]);
    const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [trackingProgress, setTrackingProgress] = useState(0);
    const [trackedFrames, setTrackedFrames] = useState<TrackedFrame[]>([]);
    const [isOpenCVReady, setIsOpenCVReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'select' | 'preview'>('select');

    // Load OpenCV.js
    useEffect(() => {
        const loadOpenCV = async () => {
            if (window.cv) {
                setIsOpenCVReady(true);
                return;
            }

            try {
                const script = document.createElement('script');
                script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
                script.async = true;
                script.onload = () => {
                    // Wait for cv to be ready
                    const checkCV = setInterval(() => {
                        if (window.cv && window.cv.Mat) {
                            clearInterval(checkCV);
                            setIsOpenCVReady(true);
                            console.log('[TrackerTool] OpenCV.js loaded');
                        }
                    }, 100);
                };
                script.onerror = () => {
                    setError('Failed to load OpenCV.js');
                };
                document.body.appendChild(script);
            } catch (err) {
                setError('Failed to load OpenCV.js');
            }
        };

        loadOpenCV();
    }, []);

    // Initialize video
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            const fps = 24; // Assume 24fps, can be extracted from video
            setTotalFrames(Math.floor(video.duration * fps));

            // Set canvas dimensions
            if (canvasRef.current) {
                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;
            }
            if (overlayCanvasRef.current) {
                overlayCanvasRef.current.width = video.videoWidth;
                overlayCanvasRef.current.height = video.videoHeight;
            }
        };

        const handleTimeUpdate = () => {
            const fps = 24;
            setCurrentFrame(Math.floor(video.currentTime * fps));
            drawFrame();
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [videoUrl]);

    // Draw current frame with corners
    const drawFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw corner points and connecting lines
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#00ff00';

        // Draw quadrilateral
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw semi-transparent fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fill();

        // Draw corner points
        corners.forEach((corner, index) => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, selectedCorner === index ? 12 : 8, 0, Math.PI * 2);
            ctx.fillStyle = selectedCorner === index ? '#ff00ff' : '#00ff00';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(corner.label, corner.x, corner.y - 15);
        });
    }, [corners, selectedCorner]);

    // Handle corner dragging
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Check if clicking on a corner
        for (let i = 0; i < corners.length; i++) {
            const dx = corners[i].x - x;
            const dy = corners[i].y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                setSelectedCorner(i);
                setIsDragging(true);
                return;
            }
        }

        setSelectedCorner(null);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || selectedCorner === null) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setCorners(prev =>
            prev.map((corner, index) =>
                index === selectedCorner ? { ...corner, x, y } : corner
            )
        );

        drawFrame();
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
    };

    // Start tracking
    const handleStartTracking = async () => {
        if (!videoUrl || corners.length !== 4) return;

        setIsTracking(true);
        setTrackingProgress(0);
        setError(null);

        try {
            // Upload video and corners to backend
            const formData = new FormData();

            // Fetch video as blob
            const videoResponse = await fetch(videoUrl);
            const videoBlob = await videoResponse.blob();
            formData.append('video', videoBlob, 'video.mp4');
            formData.append('corners', JSON.stringify(corners.map(c => ({ x: c.x, y: c.y }))));

            const response = await fetch('/api/tracking/planar', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Tracking request failed');
            }

            const data = await response.json();

            if (data.success && data.planarTracking) {
                // Convert tracked data to our format
                const frames: TrackedFrame[] = data.planarTracking.homographies.map(
                    (h: any, idx: number) => ({
                        frameIndex: idx,
                        corners: h.dstPoints.map((p: any, i: number) => ({
                            id: i,
                            x: p.x,
                            y: p.y,
                            label: corners[i].label,
                        })),
                        homography: h.matrix,
                    })
                );

                setTrackedFrames(frames);
                setMode('preview');
                onTrackingComplete?.(frames);
            }
        } catch (err: any) {
            console.error('[TrackerTool] Tracking error:', err);
            setError(err.message || 'Tracking failed');
        } finally {
            setIsTracking(false);
            setTrackingProgress(100);
        }
    };

    // Apply homography transform for prop overlay
    const applyPropOverlay = useCallback(() => {
        if (!isOpenCVReady || !propOverlay || trackedFrames.length === 0) return;

        const cv = window.cv;
        const overlayCanvas = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!overlayCanvas || !video) return;

        const ctx = overlayCanvas.getContext('2d');
        if (!ctx) return;

        // Get current frame's tracked corners
        const frameData = trackedFrames[currentFrame];
        if (!frameData) return;

        try {
            // Source points (prop image corners)
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0,
                0,
                propOverlay.width,
                0,
                propOverlay.width,
                propOverlay.height,
                0,
                propOverlay.height,
            ]);

            // Destination points (tracked corners)
            const dstPoints = cv.matFromArray(
                4,
                1,
                cv.CV_32FC2,
                frameData.corners.flatMap(c => [c.x, c.y])
            );

            // Calculate homography
            const H = cv.getPerspectiveTransform(srcPoints, dstPoints);

            // Create prop image mat
            const propImg = new Image();
            propImg.src = propOverlay.imageUrl;

            propImg.onload = () => {
                const propCanvas = document.createElement('canvas');
                propCanvas.width = propOverlay.width;
                propCanvas.height = propOverlay.height;
                const propCtx = propCanvas.getContext('2d');
                propCtx?.drawImage(propImg, 0, 0);

                const propMat = cv.imread(propCanvas);
                const warpedMat = new cv.Mat();

                // Apply perspective warp
                cv.warpPerspective(
                    propMat,
                    warpedMat,
                    H,
                    new cv.Size(overlayCanvas.width, overlayCanvas.height),
                    cv.INTER_LINEAR,
                    cv.BORDER_CONSTANT,
                    new cv.Scalar(0, 0, 0, 0)
                );

                // Draw to overlay canvas
                cv.imshow(overlayCanvas, warpedMat);

                // Cleanup
                srcPoints.delete();
                dstPoints.delete();
                H.delete();
                propMat.delete();
                warpedMat.delete();
            };
        } catch (err) {
            console.error('[TrackerTool] Overlay error:', err);
        }
    }, [isOpenCVReady, propOverlay, trackedFrames, currentFrame]);

    // Apply overlay when frame changes
    useEffect(() => {
        if (mode === 'preview' && propOverlay) {
            applyPropOverlay();
        }
    }, [currentFrame, mode, propOverlay, applyPropOverlay]);

    // Redraw when corners change
    useEffect(() => {
        drawFrame();
    }, [corners, drawFrame]);

    // Play/Pause
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Reset corners to default
    const resetCorners = () => {
        const video = videoRef.current;
        if (!video) return;

        const w = video.videoWidth;
        const h = video.videoHeight;
        const margin = 0.2;

        setCorners([
            { id: 0, x: w * margin, y: h * margin, label: 'TL' },
            { id: 1, x: w * (1 - margin), y: h * margin, label: 'TR' },
            { id: 2, x: w * (1 - margin), y: h * (1 - margin), label: 'BR' },
            { id: 3, x: w * margin, y: h * (1 - margin), label: 'BL' },
        ]);
    };

    // Export tracking data
    const exportData = () => {
        const data = {
            videoUrl,
            corners,
            trackedFrames,
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tracking-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            ref={containerRef}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-cyan-400" />
                    <span className="font-semibold text-white">Pro Trajectory Engine</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                        {mode === 'select' ? 'Corner Selection' : 'Preview'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {!isOpenCVReady && (
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading OpenCV...
                        </span>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="relative flex-1 overflow-hidden">
                {/* Video and Canvas Stack */}
                <div className="relative h-full w-full">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="absolute inset-0 h-full w-full object-contain"
                        crossOrigin="anonymous"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 h-full w-full cursor-crosshair object-contain"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    />
                    {mode === 'preview' && propOverlay && (
                        <canvas
                            ref={overlayCanvasRef}
                            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                            style={{ mixBlendMode: 'normal' }}
                        />
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Tracking Progress */}
                {isTracking && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                        <Loader2 className="mb-4 h-12 w-12 animate-spin text-cyan-400" />
                        <div className="mb-2 text-lg font-medium text-white">
                            Tracking Points...
                        </div>
                        <div className="h-2 w-64 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full bg-cyan-500 transition-all"
                                style={{ width: `${trackingProgress}%` }}
                            />
                        </div>
                        <div className="mt-2 text-sm text-gray-400">
                            {trackingProgress}% complete
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                {/* Left: Playback Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={togglePlay}
                        className="rounded-lg bg-white/5 p-2 text-white hover:bg-white/10"
                    >
                        {isPlaying ? (
                            <Pause className="h-4 w-4" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                    </button>
                    <span className="font-mono text-sm text-gray-400">
                        {currentFrame} / {totalFrames}
                    </span>
                </div>

                {/* Center: Mode Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={resetCorners}
                        disabled={isTracking}
                        className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </button>

                    {mode === 'select' && (
                        <button
                            onClick={handleStartTracking}
                            disabled={isTracking || !isOpenCVReady}
                            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
                        >
                            {isTracking ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Tracking...
                                </>
                            ) : (
                                <>
                                    <Target className="h-4 w-4" />
                                    Start Tracking
                                </>
                            )}
                        </button>
                    )}

                    {mode === 'preview' && (
                        <button
                            onClick={() => setMode('select')}
                            className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10"
                        >
                            <Crosshair className="h-4 w-4" />
                            Edit Corners
                        </button>
                    )}
                </div>

                {/* Right: Export */}
                <div className="flex items-center gap-2">
                    {trackedFrames.length > 0 && (
                        <button
                            onClick={exportData}
                            className="flex items-center gap-1 rounded-lg bg-green-600/20 px-3 py-2 text-sm text-green-400 hover:bg-green-600/30"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* Corner Coordinates Panel */}
            <div className="border-t border-white/10 bg-black/30 px-4 py-2">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-500 uppercase">Corners:</span>
                    {corners.map((corner, idx) => (
                        <div
                            key={corner.id}
                            className={clsx(
                                'rounded px-2 py-1 font-mono text-xs',
                                selectedCorner === idx
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-white/5 text-gray-400'
                            )}
                        >
                            {corner.label}: ({Math.round(corner.x)}, {Math.round(corner.y)})
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

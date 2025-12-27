'use client';

/**
 * VideoScopes - Director's Loupe
 *
 * Professional-grade scopes for the A/B Lightbox:
 * 1. RGB Histogram - Shows distribution of R/G/B channels
 * 2. Luma Waveform - Shows brightness levels across the image
 *
 * Real DPs use scopes to check for:
 * - Clipped highlights (peaks at right edge)
 * - Crushed blacks (peaks at left edge)
 * - Color balance (RGB channel alignment)
 *
 * Uses canvas-based rendering for performance.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { clsx } from 'clsx';
import { BarChart3, Activity, Maximize2, Minimize2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface HistogramData {
    r: number[];
    g: number[];
    b: number[];
    luma: number[];
}

type ScopeType = 'histogram' | 'waveform';

interface VideoScopesProps {
    /** Video or image element to analyze */
    mediaRef: React.RefObject<HTMLVideoElement | HTMLImageElement>;
    /** Position on screen */
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    /** Whether scopes are enabled */
    enabled?: boolean;
    /** Optional label (e.g., "Draft" or "Master") */
    label?: string;
    /** Size variant */
    size?: 'compact' | 'normal';
    /** Which scope to show */
    scopeType?: ScopeType;
    /** Allow toggling between scope types */
    allowToggle?: boolean;
}

// ============================================================================
// HISTOGRAM COMPONENT
// ============================================================================

function Histogram({
    data,
    width,
    height,
    showLuma = true,
}: {
    data: HistogramData | null;
    width: number;
    height: number;
    showLuma?: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Find max value for normalization
        const allChannels = [...data.r, ...data.g, ...data.b];
        const maxVal = Math.max(...allChannels, 1);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw RGB channels with transparency
        const channels = [
            { data: data.r, color: 'rgba(255, 50, 50, 0.6)' },
            { data: data.g, color: 'rgba(50, 255, 50, 0.5)' },
            { data: data.b, color: 'rgba(50, 100, 255, 0.6)' },
        ];

        channels.forEach(({ data: channelData, color }) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, height);

            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * width;
                const barHeight = (channelData[i] / maxVal) * height;
                ctx.lineTo(x, height - barHeight);
            }

            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fill();
        });

        // Draw luma overlay if enabled
        if (showLuma && data.luma) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 256; i++) {
                const x = (i / 255) * width;
                const barHeight = (data.luma[i] / maxVal) * height;
                if (i === 0) {
                    ctx.moveTo(x, height - barHeight);
                } else {
                    ctx.lineTo(x, height - barHeight);
                }
            }
            ctx.stroke();
        }

        // Draw clipping indicators
        const clipThreshold = maxVal * 0.8;

        // Crushed blacks warning (left edge)
        if (data.luma[0] + data.luma[1] + data.luma[2] > clipThreshold * 3) {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.fillRect(0, 0, 3, height);
        }

        // Clipped highlights warning (right edge)
        if (data.luma[255] + data.luma[254] + data.luma[253] > clipThreshold * 3) {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.fillRect(width - 3, 0, 3, height);
        }
    }, [data, width, height, showLuma]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-sm"
            style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        />
    );
}

// ============================================================================
// WAVEFORM COMPONENT (Luma)
// ============================================================================

function Waveform({
    data,
    width,
    height,
}: {
    data: HistogramData | null;
    width: number;
    height: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear with dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);

        // Draw reference lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;

        // IRE levels: 0 (black), 50 (mid), 100 (white)
        [0, 0.5, 1].forEach(level => {
            const y = height - level * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        });

        // Draw luma values as dots with varying brightness
        const points = data.luma;
        const maxVal = Math.max(...points, 1);

        for (let i = 0; i < 256; i++) {
            const x = (i / 255) * width;
            const value = points[i] / maxVal;
            const y = height - (i / 255) * height;

            // Draw a vertical scatter of dots based on the histogram value
            const intensity = Math.min(value * 2, 1);
            if (intensity > 0.01) {
                ctx.fillStyle = `rgba(120, 255, 180, ${intensity * 0.5})`;
                ctx.fillRect(x - 0.5, y - 1, 1, 2);
            }
        }

        // Draw warning zones
        // Clipped whites (top)
        if (data.luma[255] + data.luma[254] > maxVal * 0.5) {
            ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
            ctx.fillRect(0, 0, width, 5);
        }
        // Crushed blacks (bottom)
        if (data.luma[0] + data.luma[1] > maxVal * 0.5) {
            ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
            ctx.fillRect(0, height - 5, width, 5);
        }
    }, [data, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-sm"
        />
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VideoScopes({
    mediaRef,
    position = 'bottom-right',
    enabled = true,
    label,
    size = 'compact',
    scopeType: initialScopeType = 'histogram',
    allowToggle = true,
}: VideoScopesProps) {
    const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
    const [scopeType, setScopeType] = useState<ScopeType>(initialScopeType);
    const [isExpanded, setIsExpanded] = useState(false);
    const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    // Dimensions based on size
    const dimensions = isExpanded
        ? { width: 280, height: 180 }
        : size === 'compact'
            ? { width: 140, height: 80 }
            : { width: 200, height: 120 };

    // Extract histogram data from media
    const analyzeFrame = useCallback(() => {
        if (!enabled || !mediaRef.current) return;

        const canvas = analysisCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const media = mediaRef.current;

        // For images, only analyze once
        const isVideo = media instanceof HTMLVideoElement;

        // Set canvas size (downsample for performance)
        const sampleWidth = 160;
        const sampleHeight = 90;
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        try {
            // Draw media to canvas
            ctx.drawImage(media, 0, 0, sampleWidth, sampleHeight);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
            const pixels = imageData.data;

            // Initialize histogram arrays
            const r = new Array(256).fill(0);
            const g = new Array(256).fill(0);
            const b = new Array(256).fill(0);
            const luma = new Array(256).fill(0);

            // Count pixel values
            for (let i = 0; i < pixels.length; i += 4) {
                const rVal = pixels[i];
                const gVal = pixels[i + 1];
                const bVal = pixels[i + 2];

                r[rVal]++;
                g[gVal]++;
                b[bVal]++;

                // Calculate luma (BT.709)
                const lumaVal = Math.round(0.2126 * rVal + 0.7152 * gVal + 0.0722 * bVal);
                luma[Math.min(255, Math.max(0, lumaVal))]++;
            }

            setHistogramData({ r, g, b, luma });
        } catch (e) {
            // Cross-origin or security error - silently fail
        }

        // Schedule next frame for video
        if (isVideo && enabled) {
            animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        }
    }, [enabled, mediaRef]);

    // Start/stop analysis based on enabled state and media type
    useEffect(() => {
        if (!enabled) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        const media = mediaRef.current;
        if (!media) return;

        const isVideo = media instanceof HTMLVideoElement;

        if (isVideo) {
            // For video, analyze on each frame
            const video = media as HTMLVideoElement;

            const handlePlay = () => {
                analyzeFrame();
            };
            const handlePause = () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            };
            const handleSeeked = () => {
                analyzeFrame();
            };

            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('seeked', handleSeeked);

            // Initial analysis if already playing
            if (!video.paused) {
                analyzeFrame();
            }

            return () => {
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('seeked', handleSeeked);
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
            };
        } else {
            // For images, analyze once when loaded
            const img = media as HTMLImageElement;

            if (img.complete) {
                analyzeFrame();
            } else {
                img.addEventListener('load', analyzeFrame);
                return () => img.removeEventListener('load', analyzeFrame);
            }
        }
    }, [enabled, mediaRef, analyzeFrame]);

    // Position classes
    const positionClasses = {
        'bottom-left': 'bottom-3 left-3',
        'bottom-right': 'bottom-3 right-3',
        'top-left': 'top-3 left-3',
        'top-right': 'top-3 right-3',
    };

    if (!enabled) return null;

    return (
        <>
            {/* Hidden canvas for pixel analysis */}
            <canvas ref={analysisCanvasRef} className="hidden" />

            {/* Scope display */}
            <div
                className={clsx(
                    'absolute z-30 flex flex-col overflow-hidden rounded-lg border border-white/20 bg-black/80 backdrop-blur-sm transition-all',
                    positionClasses[position]
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-2 py-1">
                    <div className="flex items-center gap-1.5">
                        {scopeType === 'histogram' ? (
                            <BarChart3 className="h-3 w-3 text-green-400" />
                        ) : (
                            <Activity className="h-3 w-3 text-green-400" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                            {label ? `${label} ` : ''}
                            {scopeType === 'histogram' ? 'RGB' : 'Luma'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {allowToggle && (
                            <button
                                onClick={() =>
                                    setScopeType(prev => (prev === 'histogram' ? 'waveform' : 'histogram'))
                                }
                                className="rounded p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                title="Toggle scope type"
                            >
                                {scopeType === 'histogram' ? (
                                    <Activity className="h-3 w-3" />
                                ) : (
                                    <BarChart3 className="h-3 w-3" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(prev => !prev)}
                            className="rounded p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? (
                                <Minimize2 className="h-3 w-3" />
                            ) : (
                                <Maximize2 className="h-3 w-3" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Scope content */}
                <div className="p-1">
                    {scopeType === 'histogram' ? (
                        <Histogram
                            data={histogramData}
                            width={dimensions.width}
                            height={dimensions.height}
                            showLuma={true}
                        />
                    ) : (
                        <Waveform
                            data={histogramData}
                            width={dimensions.width}
                            height={dimensions.height}
                        />
                    )}
                </div>

                {/* Legend */}
                {isExpanded && scopeType === 'histogram' && (
                    <div className="flex items-center justify-center gap-3 border-t border-white/10 px-2 py-1">
                        <span className="flex items-center gap-1 text-[8px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            <span className="text-red-300">R</span>
                        </span>
                        <span className="flex items-center gap-1 text-[8px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span className="text-green-300">G</span>
                        </span>
                        <span className="flex items-center gap-1 text-[8px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span className="text-blue-300">B</span>
                        </span>
                        <span className="flex items-center gap-1 text-[8px]">
                            <span className="h-1.5 w-3 rounded-full bg-white/70" />
                            <span className="text-white/70">L</span>
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}

export default VideoScopes;

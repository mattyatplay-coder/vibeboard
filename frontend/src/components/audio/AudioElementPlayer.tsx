'use client';

/**
 * Audio Element Player
 *
 * A compact audio player with waveform visualization for displaying
 * audio elements in the Element library. Features play/pause controls,
 * volume slider, and a visual waveform representation.
 *
 * - Click on waveform to scrub/seek to position
 * - Play/pause button in bottom control bar
 * - Volume control with popup slider
 * - Double-click anywhere to open detail view
 */

import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';

// ============================================================================
// TYPES
// ============================================================================

export interface AudioElementPlayerRef {
    togglePlay: () => void;
    pause: () => void;
    isPlaying: boolean;
}

interface AudioElementPlayerProps {
    /** URL of the audio file */
    audioUrl: string;
    /** Name of the audio file */
    name: string;
    /** Optional className for container */
    className?: string;
    /** Called on double-click (e.g., to open detail view) */
    onDoubleClick?: () => void;
}

// ============================================================================
// WAVEFORM GENERATION
// ============================================================================

/**
 * Generate waveform peaks from audio buffer
 */
async function generateWaveformPeaks(audioUrl: string, peakCount: number): Promise<number[]> {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const samplesPerPeak = Math.floor(channelData.length / peakCount);
        const peaks: number[] = [];

        for (let i = 0; i < peakCount; i++) {
            const start = i * samplesPerPeak;
            const end = Math.min(start + samplesPerPeak, channelData.length);

            let max = 0;
            for (let j = start; j < end; j++) {
                const abs = Math.abs(channelData[j]);
                if (abs > max) max = abs;
            }
            peaks.push(max);
        }

        // Normalize peaks
        const maxPeak = Math.max(...peaks, 0.01);
        return peaks.map(p => p / maxPeak);
    } catch (error) {
        console.warn('[AudioElementPlayer] Failed to generate waveform, using fallback:', error);
        // Return synthetic waveform as fallback
        return generateSyntheticPeaks(audioUrl, peakCount);
    }
}

/**
 * Generate synthetic waveform when actual audio data unavailable
 */
function generateSyntheticPeaks(audioUrl: string, count: number): number[] {
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) {
        seed = ((seed << 5) - seed) + audioUrl.charCodeAt(i);
        seed = seed & seed;
    }

    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const random = (seed % 1000) / 1000;
        const baseAmplitude = 0.3 + random * 0.5;
        const phase = (i / count) * Math.PI * 6;
        const envelope = Math.sin(phase * 0.4 + random * 2) * 0.3 + 0.7;
        peaks.push(Math.min(1, Math.max(0.15, baseAmplitude * envelope)));
    }

    return peaks;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AudioElementPlayer = forwardRef<AudioElementPlayerRef, AudioElementPlayerProps>(
    function AudioElementPlayer({ audioUrl, name, className, onDoubleClick }, ref) {
        const audioRef = useRef<HTMLAudioElement>(null);
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const animationRef = useRef<number | undefined>(undefined);
        const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const [isPlaying, setIsPlaying] = useState(false);
        const [volume, setVolume] = useState(1);
        const [showVolumeSlider, setShowVolumeSlider] = useState(false);
        const [currentTime, setCurrentTime] = useState(0);
        const [duration, setDuration] = useState(0);
        const [peaks, setPeaks] = useState<number[]>([]);
        const [isLoading, setIsLoading] = useState(true);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            togglePlay: () => {
                if (!audioRef.current) return;
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    audioRef.current.play().catch(() => {});
                    setIsPlaying(true);
                }
            },
            pause: () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                }
            },
            isPlaying,
        }), [isPlaying]);

        // Load waveform on mount
        useEffect(() => {
            let cancelled = false;

            setIsLoading(true);
            generateWaveformPeaks(audioUrl, 60).then(waveformPeaks => {
                if (!cancelled) {
                    setPeaks(waveformPeaks);
                    setIsLoading(false);
                }
            });

            return () => {
                cancelled = true;
            };
        }, [audioUrl]);

        // Draw waveform
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas || peaks.length === 0) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const render = () => {
                const width = canvas.width;
                const height = canvas.height;
                const mid = height / 2;

                // Clear canvas
                ctx.clearRect(0, 0, width, height);

                // Calculate progress
                const progress = duration > 0 ? currentTime / duration : 0;
                const progressX = progress * width;

                // Draw waveform bars
                const barWidth = width / peaks.length;
                const maxBarHeight = (height - 4) / 2;

                peaks.forEach((peak, i) => {
                    const x = i * barWidth;
                    const barHeight = peak * maxBarHeight;
                    const isPast = x < progressX;

                    // Purple gradient for played, dimmer for unplayed
                    const alpha = isPast ? 0.9 : 0.4;
                    const color = isPast ? `rgba(168, 85, 247, ${alpha})` : `rgba(148, 163, 184, ${alpha})`;

                    ctx.fillStyle = color;

                    // Draw upper bar
                    ctx.fillRect(x, mid - barHeight, Math.max(1, barWidth - 1), barHeight);
                    // Draw lower bar (mirrored)
                    ctx.fillRect(x, mid, Math.max(1, barWidth - 1), barHeight);
                });

                // Draw playhead line
                if (isPlaying || currentTime > 0) {
                    ctx.strokeStyle = '#a855f7';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(progressX, 0);
                    ctx.lineTo(progressX, height);
                    ctx.stroke();
                }

                if (isPlaying) {
                    animationRef.current = requestAnimationFrame(render);
                }
            };

            render();

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }, [peaks, currentTime, duration, isPlaying]);

        // Audio event handlers
        const handleLoadedMetadata = useCallback(() => {
            if (audioRef.current) {
                setDuration(audioRef.current.duration);
            }
        }, []);

        const handleTimeUpdate = useCallback(() => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        }, []);

        const handleEnded = useCallback(() => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
            }
        }, []);

        // Toggle play/pause
        const togglePlay = useCallback(() => {
            if (!audioRef.current) return;

            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().catch(() => {});
                setIsPlaying(true);
            }
        }, [isPlaying]);

        // Handle volume change
        const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            const newVolume = parseFloat(e.target.value);
            setVolume(newVolume);
            if (audioRef.current) {
                audioRef.current.volume = newVolume;
            }
        }, []);

        // Toggle mute
        const toggleMute = useCallback((e: React.MouseEvent) => {
            e.stopPropagation();
            setShowVolumeSlider(prev => !prev);
        }, []);

        // Click on waveform to seek
        const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
            e.stopPropagation();

            if (!audioRef.current || !canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const ratio = x / rect.width;
            const seekTime = ratio * duration;

            audioRef.current.currentTime = seekTime;
            setCurrentTime(seekTime);
        }, [duration]);

        // Handle single click vs double click
        const handleClick = useCallback((e: React.MouseEvent) => {
            e.stopPropagation();

            if (clickTimeoutRef.current) {
                // Double click - clear timeout and call handler
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                if (onDoubleClick) {
                    onDoubleClick();
                }
            } else {
                // Single click - wait to see if it's a double click
                clickTimeoutRef.current = setTimeout(() => {
                    clickTimeoutRef.current = null;
                    togglePlay();
                }, 200);
            }
        }, [togglePlay, onDoubleClick]);

        // Format time as M:SS
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <div
                className={clsx(
                    'relative flex h-full w-full flex-col bg-gradient-to-br from-purple-950/80 via-zinc-900 to-zinc-900 p-3',
                    className
                )}
                onClick={handleClick}
            >
                {/* Hidden audio element */}
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    preload="metadata"
                />

                {/* Waveform visualization - takes up most of the space */}
                <div className="relative flex-1 min-h-[60px]">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            width={240}
                            height={80}
                            className="h-full w-full cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={handleWaveformClick}
                            title="Click to scrub"
                        />
                    )}
                </div>

                {/* Bottom controls bar - Play button between time and volume */}
                <div className="mt-2 flex items-center gap-2">
                    {/* Time display */}
                    <div className="min-w-0">
                        <p className="text-[10px] font-mono text-purple-400">
                            {formatTime(currentTime)} / {formatTime(duration || 0)}
                        </p>
                    </div>

                    {/* Play/Pause button - centered */}
                    <div className="flex-1 flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                            className={clsx(
                                'flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95',
                                isPlaying
                                    ? 'bg-purple-500/40 hover:bg-purple-500/50'
                                    : 'bg-purple-500/60 shadow-lg hover:bg-purple-500/70'
                            )}
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4 text-white" />
                            ) : (
                                <Play className="h-4 w-4 text-white ml-0.5" />
                            )}
                        </button>
                    </div>

                    {/* Volume control */}
                    <div className="relative flex items-center">
                        <button
                            onClick={toggleMute}
                            className={clsx(
                                'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                                showVolumeSlider
                                    ? 'bg-purple-500/30 text-purple-300'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                            )}
                        >
                            {volume === 0 ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </button>

                        {/* Volume slider popup */}
                        {showVolumeSlider && (
                            <div
                                className="absolute bottom-full right-0 mb-2 flex flex-col items-center rounded-lg border border-white/10 bg-zinc-900 p-2 shadow-xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="h-20 w-2 cursor-pointer appearance-none rounded-full bg-white/20 accent-purple-500"
                                    style={{
                                        writingMode: 'vertical-lr',
                                        direction: 'rtl',
                                    }}
                                />
                                <span className="mt-1 text-[9px] font-mono text-gray-400">
                                    {Math.round(volume * 100)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hint text */}
                <p className="mt-1 text-center text-[9px] text-gray-500">
                    Click waveform to scrub • Double-click to expand
                </p>
            </div>
        );
    }
);

export default AudioElementPlayer;

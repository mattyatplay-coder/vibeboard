 /* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';

interface VideoPreviewProps {
    src?: string;
    file?: File | null;
    onClear?: () => void;
    className?: string;
    autoPlay?: boolean;
}

export function VideoPreview({ src, file, onClear, className, autoPlay = false }: VideoPreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (src) {
            setPreviewUrl(src);
        } else {
            setPreviewUrl(null);
        }
    }, [src, file]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    if (!previewUrl) return null;

    return (
        <div className={clsx("relative group rounded-xl overflow-hidden bg-black border border-white/10", className)}>
            <video
                ref={videoRef}
                src={previewUrl}
                className="w-full h-full object-contain"
                autoPlay={autoPlay}
                muted={isMuted}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                    onClick={togglePlay}
                    className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all transform hover:scale-110"
                >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={toggleMute}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm"
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                {onClear && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white backdrop-blur-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

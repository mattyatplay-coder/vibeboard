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

export function VideoPreview({
  src,
  file,
  onClear,
  className,
  autoPlay = false,
}: VideoPreviewProps) {
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
    <div
      className={clsx(
        'group relative overflow-hidden rounded-xl border border-white/10 bg-black',
        className
      )}
    >
      <video
        ref={videoRef}
        src={previewUrl}
        className="h-full w-full object-contain"
        autoPlay={autoPlay}
        muted={isMuted}
        loop
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Overlay Controls */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/20 group-hover:opacity-100">
        <button
          onClick={togglePlay}
          className="transform rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/70"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={toggleMute}
          className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/70"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {onClear && (
          <button
            onClick={e => {
              e.stopPropagation();
              onClear();
            }}
            className="rounded-lg bg-red-500/80 p-1.5 text-white backdrop-blur-sm hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2 } from 'lucide-react';
import { clsx } from 'clsx';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: any[];
}

interface PlaylistItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration: number; // in seconds
  sceneName: string;
  shotIndex: number;
}

export function PreviewModal({ isOpen, onClose, scenes }: PreviewModalProps) {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Build playlist when scenes change or modal opens
  useEffect(() => {
    if (isOpen && scenes) {
      const newPlaylist: PlaylistItem[] = [];
      scenes.forEach(scene => {
        if (scene.shots) {
          scene.shots.forEach((shot: any) => {
            const output = shot.generation?.outputs?.[0];
            if (output) {
              newPlaylist.push({
                id: shot.id,
                url: output.url,
                type: output.type === 'video' || output.url.endsWith('.mp4') ? 'video' : 'image',
                duration: 3, // Default duration for images
                sceneName: scene.name,
                shotIndex: shot.index,
              });
            }
          });
        }
      });
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
      setIsPlaying(true); // Auto-play
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [isOpen, scenes]);

  // Handle Playback Logic
  useEffect(() => {
    if (!isOpen || playlist.length === 0) return;

    const currentItem = playlist[currentIndex];

    // Clear previous timers
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);

    if (!isPlaying) return;

    if (currentItem.type === 'image') {
      // Image Logic
      const startTime = Date.now();
      const durationMs = currentItem.duration * 1000;

      // Progress Timer
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / durationMs) * 100, 100);
        setProgress(p);
      }, 50);

      // Next Item Timer
      imageTimerRef.current = setTimeout(() => {
        handleNext();
      }, durationMs);
    } else {
      // Video Logic is handled by onEnded and onTimeUpdate events on the video element
      // But we need to make sure video plays
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(console.error);
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    };
  }, [currentIndex, isPlaying, isOpen, playlist]);

  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      setIsPlaying(false); // End of playlist
      setProgress(100);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (!isPlaying) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (!isOpen) return null;

  const currentItem = playlist[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      {/* Header */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex h-16 items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-6">
        <div className="pointer-events-auto">
          <h2 className="text-lg font-bold text-white drop-shadow-md">
            {currentItem ? `${currentItem.sceneName} - Shot ${currentItem.shotIndex}` : 'Preview'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-center bg-black">
        {currentItem ? (
          currentItem.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentItem.url}
              className="max-h-full max-w-full object-contain"
              onEnded={handleNext}
              onTimeUpdate={e => {
                const video = e.currentTarget;
                if (video.duration) {
                  setProgress((video.currentTime / video.duration) * 100);
                }
              }}
              onClick={togglePlay}
            />
          ) : (
            <img
              src={currentItem.url}
              className="animate-in fade-in max-h-full max-w-full object-contain duration-500"
              alt="Shot Preview"
            />
          )
        ) : (
          <div className="text-gray-500">No shots to preview</div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute right-0 bottom-0 left-0 z-10 flex h-24 flex-col justify-end bg-gradient-to-t from-black/90 to-transparent px-8 pb-6">
        {/* Progress Bar */}
        <div className="group mb-4 h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="w-20 font-mono text-sm text-gray-400">
            {currentIndex + 1} / {playlist.length}
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 text-white/70 transition-colors hover:text-white disabled:opacity-30"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              onClick={togglePlay}
              className="rounded-full bg-white p-4 text-black shadow-lg shadow-white/10 transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-black" />
              ) : (
                <Play className="ml-1 h-6 w-6 fill-black" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === playlist.length - 1}
              className="p-2 text-white/70 transition-colors hover:text-white disabled:opacity-30"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          <div className="flex w-20 justify-end">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/70 transition-colors hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

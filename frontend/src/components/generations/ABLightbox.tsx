/**
 * A/B Lightbox - Quality Comparison Component
 *
 * REFINEMENT B: The "Mastering" View
 * Allows side-by-side comparison of Draft vs Master renders using a split-screen slider.
 * Helps pros justify the cost difference by seeing exactly what detail was gained.
 *
 * Two modes:
 * 1. ABLightbox - Full integration with Render Queue (requires projectId, sceneChainId)
 * 2. SimpleABLightbox - Direct comparison of any two images/videos (just pass URLs)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  Crown,
  DollarSign,
  Hash,
  Cpu,
  ArrowRight,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Check,
  XCircle,
  Monitor,
  Search,
} from 'lucide-react';
import { BACKEND_URL } from '@/lib/api';

type RenderQuality = 'draft' | 'review' | 'master';

interface PassInfo {
  passId: string;
  quality: RenderQuality;
  outputUrl: string;
  thumbnailUrl?: string;
  cost: number;
  seed?: number;
  model: string;
  resolution?: string; // e.g., "540p", "1080p", "4K"
  width?: number;
  height?: number;
}

interface ComparisonData {
  shotId: string;
  shotName: string;
  passA: PassInfo | null;
  passB: PassInfo | null;
  costDifference: number;
  qualityUpgrade: string;
}

interface ABLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sceneChainId: string;
  initialShotId?: string;
  initialQualityA?: RenderQuality;
  initialQualityB?: RenderQuality;
  onAcceptMaster?: (shotId: string, passId: string) => void;
  onRejectMaster?: (shotId: string) => void;
}

const QUALITY_ICONS: Record<RenderQuality, React.ReactNode> = {
  draft: <Zap className="h-4 w-4" />,
  review: <Star className="h-4 w-4" />,
  master: <Crown className="h-4 w-4" />,
};

const QUALITY_COLORS: Record<RenderQuality, string> = {
  draft: 'text-amber-400 bg-amber-500/20',
  review: 'text-blue-400 bg-blue-500/20',
  master: 'text-purple-400 bg-purple-500/20',
};

export function ABLightbox({
  isOpen,
  onClose,
  projectId,
  sceneChainId,
  initialShotId,
  initialQualityA = 'draft',
  initialQualityB = 'master',
  onAcceptMaster,
  onRejectMaster,
}: ABLightboxProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [availableShots, setAvailableShots] = useState<
    Array<{
      shotId: string;
      shotName: string;
      availableQualities: RenderQuality[];
    }>
  >([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [qualityA, setQualityA] = useState<RenderQuality>(initialQualityA);
  const [qualityB, setQualityB] = useState<RenderQuality>(initialQualityB);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Video refs for synchronized playback
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  // Video transport state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(true);

  // Flicker mode state (rapidly toggles between A and B at full width)
  const [flickerMode, setFlickerMode] = useState(false);
  const [flickerShowA, setFlickerShowA] = useState(true);
  const flickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronized Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoomMode, setZoomMode] = useState(false); // Alt/Option key held

  // Magnifier Lens State (The "Pixel-Peeper")
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [showMagnifier, setShowMagnifier] = useState(false);
  const MAGNIFIER_SIZE = 180; // Diameter in pixels
  const MAGNIFIER_ZOOM = 4; // 4x zoom inside the lens

  // Fetch available comparisons
  useEffect(() => {
    if (!isOpen) return;

    const fetchComparisons = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/render-queue/scene-chains/${sceneChainId}/comparisons`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableShots(data);

          // Set initial shot
          if (initialShotId) {
            const idx = data.findIndex((s: { shotId: string }) => s.shotId === initialShotId);
            if (idx >= 0) setCurrentShotIndex(idx);
          }
        }
      } catch (error) {
        console.error('Failed to fetch comparisons:', error);
      }
    };

    fetchComparisons();
  }, [isOpen, projectId, sceneChainId, initialShotId]);

  // Fetch comparison data for current shot
  useEffect(() => {
    if (!isOpen || availableShots.length === 0) return;

    const shot = availableShots[currentShotIndex];
    if (!shot) return;

    const fetchComparison = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/projects/${projectId}/render-queue/scene-chains/${sceneChainId}/shots/${shot.shotId}/compare?qualityA=${qualityA}&qualityB=${qualityB}`
        );
        if (res.ok) {
          const data = await res.json();
          setComparison(data);
        }
      } catch (error) {
        console.error('Failed to fetch comparison:', error);
      }
    };

    fetchComparison();
  }, [isOpen, availableShots, currentShotIndex, qualityA, qualityB, projectId, sceneChainId]);

  // Handle slider drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percent);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Navigation
  const goToPrevShot = () => {
    setCurrentShotIndex(prev => (prev > 0 ? prev - 1 : availableShots.length - 1));
    resetZoom();
  };

  const goToNextShot = () => {
    setCurrentShotIndex(prev => (prev < availableShots.length - 1 ? prev + 1 : 0));
    resetZoom();
  };

  // Zoom Controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 8));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom (synchronized)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 1), 8);

      // Adjust pan to zoom toward mouse position
      if (newZoom !== zoom) {
        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - pan.x) * scale;
        const newPanY = mouseY - (mouseY - pan.y) * scale;

        setPan({ x: newPanX, y: newPanY });
        setZoom(newZoom);
      }
    },
    [zoom, pan]
  );

  // Pan handling (when zoomed in)
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return; // Only pan when zoomed
      if (e.altKey || zoomMode) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.preventDefault();
      }
    },
    [zoom, pan, zoomMode]
  );

  const handlePanMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    },
    [isPanning, panStart]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Track Alt/Option key for zoom mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setZoomMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setZoomMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen]);

  // Magnifier lens mouse tracking
  const handleMagnifierMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!magnifierEnabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMagnifierPos({ x, y });
      setShowMagnifier(true);
    },
    [magnifierEnabled]
  );

  const handleMagnifierLeave = useCallback(() => {
    setShowMagnifier(false);
  }, []);

  // Video transport controls
  const togglePlayPause = useCallback(() => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA && !videoB) return;

    if (isPlaying) {
      videoA?.pause();
      videoB?.pause();
    } else {
      videoA?.play();
      videoB?.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const stepFrame = useCallback(
    (direction: 'forward' | 'backward') => {
      const videoA = videoARef.current;
      const videoB = videoBRef.current;
      if (!videoA && !videoB) return;

      // Pause videos first
      videoA?.pause();
      videoB?.pause();
      setIsPlaying(false);

      // Step by 1/24th of a second (assuming 24fps)
      const frameTime = 1 / 24;
      const newTime =
        direction === 'forward'
          ? Math.min(currentTime + frameTime, duration)
          : Math.max(currentTime - frameTime, 0);

      if (videoA) videoA.currentTime = newTime;
      if (videoB) videoB.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [currentTime, duration]
  );

  // Sync video time updates
  useEffect(() => {
    const videoA = videoARef.current;
    if (!videoA) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoA.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(videoA.duration);
    };
    const handleEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    videoA.addEventListener('timeupdate', handleTimeUpdate);
    videoA.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoA.addEventListener('ended', handleEnded);

    return () => {
      videoA.removeEventListener('timeupdate', handleTimeUpdate);
      videoA.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoA.removeEventListener('ended', handleEnded);
    };
  }, [isLooping, comparison]);

  // Flicker mode toggle effect
  useEffect(() => {
    if (flickerMode) {
      flickerIntervalRef.current = setInterval(() => {
        setFlickerShowA(prev => !prev);
      }, 150); // Toggle every 150ms for rapid comparison
    } else {
      if (flickerIntervalRef.current) {
        clearInterval(flickerIntervalRef.current);
        flickerIntervalRef.current = null;
      }
      setFlickerShowA(true);
    }

    return () => {
      if (flickerIntervalRef.current) {
        clearInterval(flickerIntervalRef.current);
      }
    };
  }, [flickerMode]);

  // Accept/Reject handlers
  const handleAcceptMaster = useCallback(() => {
    if (comparison?.shotId && comparison?.passB?.passId && onAcceptMaster) {
      onAcceptMaster(comparison.shotId, comparison.passB.passId);
    }
  }, [comparison, onAcceptMaster]);

  const handleRejectMaster = useCallback(() => {
    if (comparison?.shotId && onRejectMaster) {
      onRejectMaster(comparison.shotId);
    }
  }, [comparison, onRejectMaster]);

  // Helper to format time as MM:SS.FF
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 24);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  // Helper to get resolution label
  const getResolutionLabel = (pass: PassInfo): string => {
    if (pass.resolution) return pass.resolution;
    if (pass.height) {
      if (pass.height >= 2160) return '4K';
      if (pass.height >= 1080) return '1080p';
      if (pass.height >= 720) return '720p';
      if (pass.height >= 540) return '540p';
      return `${pass.height}p`;
    }
    return pass.quality === 'master' ? '4K' : pass.quality === 'review' ? '1080p' : '540p';
  };

  // Helper to determine if comparison has video content
  const isVideoComparison =
    comparison?.passA?.outputUrl &&
    (comparison.passA.outputUrl.endsWith('.mp4') || comparison.passA.outputUrl.includes('video'));

  // Keyboard navigation (includes zoom shortcuts, transport, flicker)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && !e.metaKey && !e.shiftKey) goToPrevShot();
      if (e.key === 'ArrowRight' && !e.metaKey && !e.shiftKey) goToNextShot();
      // Zoom shortcuts: + / - or = / -
      if (e.key === '=' || e.key === '+') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') resetZoom();
      // Video transport shortcuts
      if (e.key === ' ' && !e.shiftKey) {
        e.preventDefault();
        togglePlayPause();
      }
      // Frame stepping with shift+arrow
      if (e.key === 'ArrowLeft' && e.shiftKey) stepFrame('backward');
      if (e.key === 'ArrowRight' && e.shiftKey) stepFrame('forward');
      // Flicker mode with 'f' key
      if (e.key === 'f') setFlickerMode(prev => !prev);
      // Magnifier mode with 'm' key
      if (e.key === 'm') setMagnifierEnabled(prev => !prev);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Could add hold-spacebar flicker here if desired
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, resetZoom, togglePlayPause, stepFrame]);

  if (!isOpen) return null;

  const currentShot = availableShots[currentShotIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Arrows */}
        {availableShots.length > 1 && (
          <>
            <button
              onClick={goToPrevShot}
              className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={goToNextShot}
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        {/* Main Content */}
        <div className="w-full max-w-6xl px-16">
          {/* Shot Name & Navigation */}
          <div className="mb-2 flex items-center justify-center gap-4">
            <h2 className="text-lg font-medium text-white/80">
              {comparison?.shotName || currentShot?.shotName || 'A/B Comparison'}
            </h2>
            {availableShots.length > 1 && (
              <span className="text-sm text-gray-500">
                ({currentShotIndex + 1} / {availableShots.length})
              </span>
            )}
          </div>

          {/* Professional Metadata Header - DaVinci Resolve Style */}
          {comparison?.passA && comparison?.passB && (
            <div className="mb-3 flex items-stretch justify-between overflow-hidden rounded-lg border border-white/10 bg-black/40">
              {/* Left Side (Quality A) Metadata */}
              <div className="flex-1 border-r border-white/10 px-4 py-2">
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'rounded px-2 py-0.5 text-xs font-bold tracking-wider uppercase',
                      QUALITY_COLORS[qualityA]
                    )}
                  >
                    {qualityA}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span className="font-mono text-sm text-white/80">
                    {getResolutionLabel(comparison.passA)}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span className="max-w-[120px] truncate text-sm text-white/60">
                    {comparison.passA.model.split('/').pop()}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span className="font-mono text-sm text-green-400">
                    ${comparison.passA.cost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Center Controls - Zoom */}
              <div className="flex items-center gap-1 bg-white/5 px-3">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="Zoom out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={resetZoom}
                  disabled={zoom === 1}
                  className="min-w-[48px] rounded px-2 py-1 font-mono text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="Reset zoom (0)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 8}
                  className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  title="Zoom in (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="mx-1 h-6 w-px bg-white/10" />
                <button
                  onClick={() => setFlickerMode(prev => !prev)}
                  className={clsx(
                    'rounded p-1.5 transition-colors',
                    flickerMode
                      ? 'bg-cyan-500/30 text-cyan-400'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                  title="Flicker mode (F)"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMagnifierEnabled(prev => !prev)}
                  className={clsx(
                    'rounded p-1.5 transition-colors',
                    magnifierEnabled
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  )}
                  title="Magnifier lens (M)"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {/* Right Side (Quality B) Metadata */}
              <div className="flex-1 border-l border-white/10 px-4 py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <span className="font-mono text-sm text-green-400">
                    ${comparison.passB.cost.toFixed(2)}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span className="max-w-[120px] truncate text-sm text-white/60">
                    {comparison.passB.model.split('/').pop()}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span className="font-mono text-sm text-white/80">
                    {getResolutionLabel(comparison.passB)}
                  </span>
                  <span className="text-sm text-white/60">•</span>
                  <span
                    className={clsx(
                      'rounded px-2 py-0.5 text-xs font-bold tracking-wider uppercase',
                      QUALITY_COLORS[qualityB]
                    )}
                  >
                    {qualityB}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quality Selector - only if more than 2 qualities available */}
          {currentShot && currentShot.availableQualities.length > 2 && (
            <div className="mb-3 flex justify-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-1.5">
                <span className="text-xs text-gray-500">Compare:</span>
                <select
                  value={qualityA}
                  onChange={e => setQualityA(e.target.value as RenderQuality)}
                  className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm text-white"
                >
                  {currentShot.availableQualities.map(q => (
                    <option key={q} value={q} className="bg-gray-900">
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">vs</span>
                <select
                  value={qualityB}
                  onChange={e => setQualityB(e.target.value as RenderQuality)}
                  className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-sm text-white"
                >
                  {currentShot.availableQualities.map(q => (
                    <option key={q} value={q} className="bg-gray-900">
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Split-Screen Comparison */}
          {comparison?.passA && comparison?.passB ? (
            <div
              ref={containerRef}
              className={clsx(
                'relative aspect-video overflow-hidden rounded-lg bg-gray-900',
                isPanning
                  ? 'cursor-grabbing'
                  : zoomMode && zoom > 1
                    ? 'cursor-grab'
                    : magnifierEnabled
                      ? 'cursor-none'
                      : 'cursor-col-resize'
              )}
              onMouseDown={e => {
                if (magnifierEnabled) return; // Don't drag slider in magnifier mode
                // Check if clicking on the slider handle area
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = e.clientX - rect.left;
                  const sliderX = (sliderPosition / 100) * rect.width;
                  const isNearSlider = Math.abs(x - sliderX) < 30;

                  if (isNearSlider && !e.altKey && !zoomMode) {
                    setIsDragging(true);
                  } else if ((e.altKey || zoomMode) && zoom > 1) {
                    handlePanStart(e);
                  } else if (!e.altKey && !zoomMode) {
                    setIsDragging(true);
                  }
                }
              }}
              onMouseMove={handleMagnifierMove}
              onMouseLeave={handleMagnifierLeave}
              onWheel={handleWheel}
            >
              {/* Synchronized transform wrapper for both sides */}
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
              >
                {/* Left Side (Quality A) - Flicker mode or Split mode */}
                <div
                  className="absolute inset-0 overflow-hidden transition-opacity duration-75"
                  style={{
                    clipPath: flickerMode ? 'none' : `inset(0 ${100 - sliderPosition}% 0 0)`,
                    opacity: flickerMode ? (flickerShowA ? 1 : 0) : 1,
                  }}
                >
                  {comparison.passA.outputUrl.endsWith('.mp4') ||
                  comparison.passA.outputUrl.includes('video') ? (
                    <video
                      ref={videoARef}
                      src={comparison.passA.outputUrl}
                      className="h-full w-full object-contain"
                      autoPlay={isPlaying}
                      loop={isLooping}
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={comparison.passA.outputUrl}
                      alt={`${qualityA} quality`}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  )}
                </div>

                {/* Right Side (Quality B) - Flicker mode or Split mode */}
                <div
                  className="absolute inset-0 overflow-hidden transition-opacity duration-75"
                  style={{
                    clipPath: flickerMode ? 'none' : `inset(0 0 0 ${sliderPosition}%)`,
                    opacity: flickerMode ? (flickerShowA ? 0 : 1) : 1,
                  }}
                >
                  {comparison.passB.outputUrl.endsWith('.mp4') ||
                  comparison.passB.outputUrl.includes('video') ? (
                    <video
                      ref={videoBRef}
                      src={comparison.passB.outputUrl}
                      className="h-full w-full object-contain"
                      autoPlay={isPlaying}
                      loop={isLooping}
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={comparison.passB.outputUrl}
                      alt={`${qualityB} quality`}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  )}
                </div>
              </div>

              {/* Flicker Mode Indicator */}
              {flickerMode && (
                <div
                  className={clsx(
                    'absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-bold tracking-wider uppercase transition-all duration-75',
                    flickerShowA ? QUALITY_COLORS[qualityA] : QUALITY_COLORS[qualityB]
                  )}
                >
                  {flickerShowA ? qualityA : qualityB}
                </div>
              )}

              {/* Labels (outside transform to stay fixed) - hidden in flicker mode */}
              {!flickerMode && (
                <>
                  <div
                    className={clsx(
                      'absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg px-3 py-1.5',
                      QUALITY_COLORS[qualityA]
                    )}
                  >
                    {QUALITY_ICONS[qualityA]}
                    <span className="text-sm font-medium uppercase">{qualityA}</span>
                  </div>
                  <div
                    className={clsx(
                      'absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg px-3 py-1.5',
                      QUALITY_COLORS[qualityB]
                    )}
                  >
                    {QUALITY_ICONS[qualityB]}
                    <span className="text-sm font-medium uppercase">{qualityB}</span>
                  </div>
                </>
              )}

              {/* Slider Handle - hidden in flicker mode */}
              {!flickerMode && (
                <div
                  className="absolute top-0 bottom-0 z-20 w-1 cursor-col-resize bg-white/80"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <GripVertical className="h-5 w-5 text-gray-600" />
                  </div>
                </div>
              )}

              {/* Zoom indicator */}
              {zoom > 1 && !flickerMode && (
                <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90">
                  {Math.round(zoom * 100)}%
                </div>
              )}

              {/* Help Hints */}
              {!isDragging && !isPanning && !flickerMode && !magnifierEnabled && (
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                  <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                    Drag slider to compare
                  </div>
                  {zoom === 1 && (
                    <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                      Scroll to zoom
                    </div>
                  )}
                  {zoom > 1 && (
                    <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                      Hold ⌥ + drag to pan
                    </div>
                  )}
                </div>
              )}

              {/* Magnifier Lens - The "Pixel-Peeper" */}
              {magnifierEnabled && showMagnifier && containerRef.current && (
                <div
                  className="pointer-events-none absolute z-30 overflow-hidden rounded-full border-2 border-purple-400/80 shadow-xl"
                  style={{
                    width: MAGNIFIER_SIZE,
                    height: MAGNIFIER_SIZE,
                    left: magnifierPos.x - MAGNIFIER_SIZE / 2,
                    top: magnifierPos.y - MAGNIFIER_SIZE / 2,
                    boxShadow:
                      '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {/* Magnified Master (Right side - Quality B) content */}
                  <div
                    className="absolute"
                    style={{
                      width: containerRef.current.offsetWidth,
                      height: containerRef.current.offsetHeight,
                      transform: `scale(${MAGNIFIER_ZOOM})`,
                      transformOrigin: `${magnifierPos.x}px ${magnifierPos.y}px`,
                      left: -magnifierPos.x + MAGNIFIER_SIZE / 2,
                      top: -magnifierPos.y + MAGNIFIER_SIZE / 2,
                    }}
                  >
                    {comparison.passB.outputUrl.endsWith('.mp4') ||
                    comparison.passB.outputUrl.includes('video') ? (
                      <video
                        src={comparison.passB.outputUrl}
                        className="h-full w-full object-contain"
                        autoPlay={isPlaying}
                        loop={isLooping}
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={comparison.passB.outputUrl}
                        alt="Magnified master"
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    )}
                  </div>
                  {/* Crosshair */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-full w-px bg-purple-400/30" />
                    <div className="absolute h-px w-full bg-purple-400/30" />
                  </div>
                  {/* Quality label */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-purple-500/80 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                    {qualityB} @ {MAGNIFIER_ZOOM}×
                  </div>
                </div>
              )}

              {/* Magnifier Mode Hint */}
              {magnifierEnabled && !showMagnifier && (
                <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-purple-400/30 bg-purple-500/30 px-3 py-1.5 text-xs text-purple-300">
                  Hover to inspect {qualityB} at {MAGNIFIER_ZOOM}× zoom
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-gray-900 text-gray-500">
              {availableShots.length === 0
                ? 'No comparisons available. Render at multiple quality levels first.'
                : 'Loading comparison...'}
            </div>
          )}

          {/* Professional Footer - Video Transport & Actions */}
          {comparison?.passA && comparison?.passB && (
            <div className="mt-3 flex items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-black/40">
              {/* Left Side - Reject / Keep Draft */}
              <div className="flex-1 px-4 py-2.5">
                <button
                  onClick={handleRejectMaster}
                  disabled={!onRejectMaster}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 transition-all',
                    onRejectMaster
                      ? 'border border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-500'
                  )}
                >
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Keep {qualityA.charAt(0).toUpperCase() + qualityA.slice(1)} Only
                  </span>
                </button>
              </div>

              {/* Center - Video Transport Controls */}
              <div className="flex items-center gap-1 bg-white/5 px-4 py-2.5">
                {isVideoComparison ? (
                  <>
                    {/* Frame step backward */}
                    <button
                      onClick={() => stepFrame('backward')}
                      className="rounded p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                      title="Previous frame (Shift+←)"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    {/* Play/Pause */}
                    <button
                      onClick={togglePlayPause}
                      className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
                      title="Play/Pause (Space)"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>

                    {/* Frame step forward */}
                    <button
                      onClick={() => stepFrame('forward')}
                      className="rounded p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                      title="Next frame (Shift+→)"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    {/* Loop toggle */}
                    <button
                      onClick={() => setIsLooping(prev => !prev)}
                      className={clsx(
                        'rounded p-2 transition-colors',
                        isLooping
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      )}
                      title="Toggle loop"
                    >
                      <Repeat className="h-4 w-4" />
                    </button>

                    {/* Timecode */}
                    <div className="ml-2 rounded bg-black/40 px-2 py-1 font-mono text-xs text-white/70">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </>
                ) : (
                  /* Image mode - just show upgrade cost */
                  <div className="px-4 text-sm text-gray-400">
                    Upgrade cost:{' '}
                    <span className="font-medium text-green-400">
                      +${comparison.costDifference.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Side - Accept Master */}
              <div className="flex flex-1 justify-end px-4 py-2.5">
                <button
                  onClick={handleAcceptMaster}
                  disabled={!onAcceptMaster}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2 transition-all',
                    onAcceptMaster
                      ? 'border border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'cursor-not-allowed border border-white/10 bg-white/5 text-gray-500'
                  )}
                >
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Approve {qualityB.charAt(0).toUpperCase() + qualityB.slice(1)}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Seed Info - Compact row below footer */}
          {comparison?.passA &&
            comparison?.passB &&
            (comparison.passA.seed || comparison.passB.seed) && (
              <div className="mt-2 flex items-center justify-center gap-6 text-xs text-gray-500">
                {comparison.passA.seed && (
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    <span className="text-gray-400">{qualityA}:</span>
                    <span className="font-mono">{comparison.passA.seed}</span>
                  </div>
                )}
                {comparison.passB.seed && (
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    <span className="text-gray-400">{qualityB}:</span>
                    <span className="font-mono">{comparison.passB.seed}</span>
                  </div>
                )}
              </div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Simple A/B Lightbox - Direct comparison without Render Queue integration
// =============================================================================

interface SimpleABLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageA: {
    url: string;
    label: string;
    sublabel?: string;
  };
  imageB: {
    url: string;
    label: string;
    sublabel?: string;
  };
  title?: string;
}

export function SimpleABLightbox({
  isOpen,
  onClose,
  imageA,
  imageB,
  title = 'A/B Comparison',
}: SimpleABLightboxProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronized Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoomMode, setZoomMode] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setSliderPosition(50);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle slider drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percent);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Zoom Controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 8));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 1), 8);

      if (newZoom !== zoom) {
        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - pan.x) * scale;
        const newPanY = mouseY - (mouseY - pan.y) * scale;

        setPan({ x: newPanX, y: newPanY });
        setZoom(newZoom);
      }
    },
    [zoom, pan]
  );

  // Pan handling
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      if (e.altKey || zoomMode) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.preventDefault();
      }
    },
    [zoom, pan, zoomMode]
  );

  const handlePanMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    },
    [isPanning, panStart]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Alt') setZoomMode(true);
      if (e.key === '=' || e.key === '+') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') resetZoom();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setZoomMode(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, resetZoom]);

  const isVideo = (url: string) => url.endsWith('.mp4') || url.includes('video');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="w-full max-w-5xl px-8">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{title}</h2>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={resetZoom}
                disabled={zoom === 1}
                className="min-w-[40px] rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Reset zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 8}
                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Split-Screen Comparison */}
          <div
            ref={containerRef}
            className={clsx(
              'relative aspect-video overflow-hidden rounded-lg bg-gray-900',
              isPanning
                ? 'cursor-grabbing'
                : zoomMode && zoom > 1
                  ? 'cursor-grab'
                  : 'cursor-col-resize'
            )}
            onMouseDown={e => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) {
                const x = e.clientX - rect.left;
                const sliderX = (sliderPosition / 100) * rect.width;
                const isNearSlider = Math.abs(x - sliderX) < 30;

                if (isNearSlider && !e.altKey && !zoomMode) {
                  setIsDragging(true);
                } else if ((e.altKey || zoomMode) && zoom > 1) {
                  handlePanStart(e);
                } else if (!e.altKey && !zoomMode) {
                  setIsDragging(true);
                }
              }
            }}
            onWheel={handleWheel}
          >
            {/* Synchronized transform wrapper */}
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {/* Left Side (A) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                {isVideo(imageA.url) ? (
                  <video
                    src={imageA.url}
                    className="h-full w-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={imageA.url}
                    alt={imageA.label}
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                )}
              </div>

              {/* Right Side (B) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
              >
                {isVideo(imageB.url) ? (
                  <video
                    src={imageB.url}
                    className="h-full w-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={imageB.url}
                    alt={imageB.label}
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                )}
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-10 flex flex-col rounded-lg bg-blue-500/20 px-3 py-1.5 text-blue-400">
              <span className="text-sm font-medium">{imageA.label}</span>
              {imageA.sublabel && (
                <span className="text-xs text-blue-300/70">{imageA.sublabel}</span>
              )}
            </div>
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end rounded-lg bg-purple-500/20 px-3 py-1.5 text-purple-400">
              <span className="text-sm font-medium">{imageB.label}</span>
              {imageB.sublabel && (
                <span className="text-xs text-purple-300/70">{imageB.sublabel}</span>
              )}
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 z-20 w-1 cursor-col-resize bg-white/80"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <GripVertical className="h-5 w-5 text-gray-600" />
              </div>
            </div>

            {/* Zoom indicator */}
            {zoom > 1 && (
              <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white/90">
                {Math.round(zoom * 100)}%
              </div>
            )}

            {/* Help Hints */}
            {!isDragging && !isPanning && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                  Drag slider to compare
                </div>
                {zoom === 1 && (
                  <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                    Scroll to zoom
                  </div>
                )}
                {zoom > 1 && (
                  <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/70">
                    Hold ⌥ + drag to pan
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

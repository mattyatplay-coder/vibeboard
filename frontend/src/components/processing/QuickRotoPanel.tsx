import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  Upload,
  Brush,
  Undo2,
  Video,
  Wand2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Download,
  Scissors,
  Eraser,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';

const MAX_HISTORY = 10;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

interface QuickRotoPanelProps {
  initialVideoUrl?: string;
}

export function QuickRotoPanel({ initialVideoUrl }: QuickRotoPanelProps) {
  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Mask drawing state
  const [brushSize, setBrushSize] = useState(30);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);

  // Display dimensions for proper scaling
  const [displayDimensions, setDisplayDimensions] = useState({ w: 0, h: 0 });

  // Parameters
  const [prompt, setPrompt] = useState('clean natural background, seamless blend');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [resolution, setResolution] = useState<'480p' | '580p' | '720p'>('720p');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enablePromptExpansion, setEnablePromptExpansion] = useState(true);

  // Undo history
  const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const originalDimensionsRef = useRef({ w: 0, h: 0 });
  const isDrawingRef = useRef(false);
  const brushSizeRef = useRef(brushSize);
  const zoomLevelRef = useRef(zoomLevel);

  // Sync brush size ref
  useEffect(() => {
    brushSizeRef.current = brushSize;
    if (cursorRef.current) {
      cursorRef.current.style.width = `${brushSize}px`;
      cursorRef.current.style.height = `${brushSize}px`;
    }
  }, [brushSize]);

  // Sync zoom level ref
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Load initial video if provided
  useEffect(() => {
    if (initialVideoUrl) {
      setVideoUrl(initialVideoUrl);
      extractFirstFrame(initialVideoUrl);
    }
  }, [initialVideoUrl]);

  // Zoom controls
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel]);

  // Mouse wheel zoom (with Cmd/Ctrl)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomLevel]);

  // Handle video file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setResultVideoUrl(null);
      setMaskHistory([]);
      setZoomLevel(1);
      setDisplayDimensions({ w: 0, h: 0 });

      // Create object URL for video playback
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      await extractFirstFrame(url);
    }
  };

  // Extract first frame from video
  const extractFirstFrame = async (url: string) => {
    setIsExtracting(true);
    try {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.load();
      });

      // Seek to first frame
      video.currentTime = 0;
      await new Promise<void>(resolve => {
        video.onseeked = () => resolve();
      });

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const frameDataUrl = canvas.toDataURL('image/png');
        setFirstFrame(frameDataUrl);
        originalDimensionsRef.current = { w: video.videoWidth, h: video.videoHeight };
      }

      video.remove();
      toast.success('Video loaded - draw mask on first frame');
    } catch (err) {
      console.error('Failed to extract first frame:', err);
      toast.error('Failed to load video');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle image load to calculate display dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    const canvas = maskCanvasRef.current;
    if (!container || !canvas) return;

    // Calculate fit for display
    const maxWidth = container.clientWidth - 32; // Account for padding
    const maxHeight = 500;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const ratio = w / h;

    if (w > maxWidth) {
      w = maxWidth;
      h = w / ratio;
    }
    if (h > maxHeight) {
      h = maxHeight;
      w = h * ratio;
    }

    const finalW = Math.round(w);
    const finalH = Math.round(h);

    if (dimensionsRef.current.w !== finalW || dimensionsRef.current.h !== finalH) {
      dimensionsRef.current = { w: finalW, h: finalH };
      setDisplayDimensions({ w: finalW, h: finalH });

      // Set canvas dimensions
      canvas.width = finalW;
      canvas.height = finalH;
    }
  };

  // Native DOM event handlers for drawing
  useEffect(() => {
    if (displayDimensions.w === 0 || displayDimensions.h === 0) return;

    const canvas = maskCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const drawAt = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSizeRef.current * scaleX;
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)';

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Save current state for undo before starting new stroke
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setMaskHistory(prev => [...prev.slice(-MAX_HISTORY + 1), imageData]);
      }
      isDrawingRef.current = true;
      drawAt(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const cursor = cursorRef.current;
      if (cursor) {
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const zoom = zoomLevelRef.current;
        const scaledBrushSize = brushSizeRef.current * zoom;
        cursor.style.width = `${scaledBrushSize}px`;
        cursor.style.height = `${scaledBrushSize}px`;
        cursor.style.left = `${x - scaledBrushSize / 2}px`;
        cursor.style.top = `${y - scaledBrushSize / 2}px`;
      }
      drawAt(e.clientX, e.clientY);
    };

    const handleMouseEnter = () => {
      const cursor = cursorRef.current;
      if (cursor) cursor.style.display = 'block';
    };

    const handleMouseLeave = () => {
      const cursor = cursorRef.current;
      if (cursor) cursor.style.display = 'none';
      isDrawingRef.current = false;
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    wrapper.addEventListener('mouseenter', handleMouseEnter);
    wrapper.addEventListener('mouseleave', handleMouseLeave);
    wrapper.addEventListener('mousemove', handleMouseMove);

    const handleGlobalMouseUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const ctx = canvas.getContext('2d');
        ctx?.beginPath();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseenter', handleMouseEnter);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
      wrapper.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [displayDimensions]);

  // Undo last stroke
  const handleUndo = () => {
    if (maskHistory.length === 0) return;

    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = maskHistory[maskHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setMaskHistory(prev => prev.slice(0, -1));
    toast.success('Undone!');
  };

  // Clear mask
  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setMaskHistory([]);
  };

  // Process Quick Roto
  const handleProcess = async () => {
    if (!videoFile && !videoUrl) {
      toast.error('Please upload a video first');
      return;
    }

    const canvas = maskCanvasRef.current;
    if (!canvas) {
      toast.error('Please draw a mask on the first frame');
      return;
    }

    // Check if mask has any content
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);

    if (!hasContent) {
      toast.error('Please draw a mask on the object you want to remove');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();

      // Add video
      if (videoFile) {
        formData.append('video', videoFile);
      } else if (videoUrl) {
        formData.append('videoUrl', videoUrl);
      }

      // Add mask as PNG
      const maskBlob = await new Promise<Blob>(resolve => {
        canvas.toBlob(blob => resolve(blob!), 'image/png');
      });
      formData.append('mask', maskBlob, 'mask.png');

      // Add parameters
      formData.append('prompt', prompt);
      formData.append('mode', 'guiding');
      formData.append('resolution', resolution);
      formData.append('enablePromptExpansion', String(enablePromptExpansion));

      if (negativePrompt) {
        formData.append('negativePrompt', negativePrompt);
      }

      const response = await fetch('/api/process/quick-roto', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      const result = await response.json();
      setResultVideoUrl(result.videoUrl);
      toast.success('Quick Roto complete!');
    } catch (err: any) {
      console.error('Quick Roto failed:', err);
      toast.error(err.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download result
  const handleDownload = () => {
    if (!resultVideoUrl) return;

    const a = document.createElement('a');
    a.href = resultVideoUrl;
    a.download = `quick-roto-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-purple-400">
        <Scissors className="h-6 w-6" />
        Quick Roto
      </h2>

      <div className="flex min-h-0 flex-1 gap-8">
        {/* Sidebar Controls */}
        <div className="w-64 flex-none space-y-6">
          {/* Video Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Video</label>
            <label className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 p-4 transition-colors hover:bg-white/5">
              {videoFile ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <Video className="h-8 w-8 text-purple-400" />
                </div>
              ) : (
                <Video className="mb-2 h-6 w-6 text-gray-500" />
              )}
              <span className="z-10 text-center text-xs text-gray-400">
                {videoFile ? 'Change Video' : 'Upload Video'}
              </span>
              <span className="z-10 text-[10px] text-gray-500">MP4, WebM, MOV</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>

          {firstFrame && (
            <div className="space-y-4 rounded-lg border border-white/5 bg-black/20 p-4">
              {/* Prompt */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Fill Prompt</label>
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="What to replace with..."
                  className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-gray-600"
                />
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Resolution</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['480p', '580p', '720p'] as const).map(res => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`rounded p-2 text-xs transition-all ${
                        resolution === res
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-center gap-1 rounded bg-white/5 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-300"
              >
                <Settings2 className="h-3 w-3" />
                Advanced Settings
                {showAdvanced ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {/* Advanced Settings Panel */}
              {showAdvanced && (
                <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
                  {/* Negative Prompt */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Negative Prompt</label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={e => setNegativePrompt(e.target.value)}
                      placeholder="artifacts, blur, distortion"
                      className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-gray-600"
                    />
                  </div>

                  {/* Prompt Expansion */}
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enablePromptExpansion}
                      onChange={e => setEnablePromptExpansion(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <span className="text-xs text-gray-400">LLM Prompt Expansion</span>
                  </label>
                </div>
              )}

              {/* Brush Size */}
              <div className="flex items-center gap-2 text-purple-300">
                <Brush className="h-4 w-4" />
                <span className="text-sm font-medium">Brush Size: {brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-purple-500"
              />

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={clearMask}
                  className="flex-1 rounded bg-white/5 py-2 text-xs text-gray-300 hover:bg-white/10"
                >
                  Clear Mask
                </button>
                <button
                  onClick={handleUndo}
                  disabled={maskHistory.length === 0}
                  className={`flex flex-1 items-center justify-center gap-1 rounded py-2 text-xs font-bold ${
                    maskHistory.length > 0
                      ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                      : 'cursor-not-allowed bg-white/5 text-gray-500'
                  }`}
                >
                  <Undo2 className="h-3 w-3" />
                  Undo ({maskHistory.length})
                </button>
              </div>

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-500 disabled:bg-gray-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Remove Object
                  </>
                )}
              </button>

              {/* Download Result */}
              {resultVideoUrl && (
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-1 rounded bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-500"
                >
                  <Download className="h-3 w-3" />
                  Download Result
                </button>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-1 text-xs text-gray-500">
            <p className="mb-2 font-medium text-gray-400">How to use:</p>
            <p>1. Upload a video</p>
            <p>
              2. <span className="text-purple-400">Paint over the object</span> to remove on the
              first frame
            </p>
            <p>3. Click Remove Object</p>
            <p>4. VACE auto-tracks and removes across all frames</p>
            <p className="mt-3 mb-1 font-medium text-gray-400">Shortcuts:</p>
            <p>
              <kbd className="rounded bg-white/10 px-1">+</kbd> /{' '}
              <kbd className="rounded bg-white/10 px-1">-</kbd> Zoom in/out
            </p>
            <p>
              <kbd className="rounded bg-white/10 px-1">0</kbd> Reset zoom
            </p>
            <p>
              <kbd className="rounded bg-white/10 px-1">⌘</kbd>+scroll Zoom
            </p>
          </div>
        </div>

        {/* Editor Area */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-auto rounded-lg border border-white/10 bg-black/40 select-none"
        >
          {/* Zoom Controls */}
          {firstFrame && (
            <div className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-black/70 p-1 backdrop-blur-sm">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel === ZOOM_LEVELS[0]}
                className="rounded p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={handleZoomReset}
                className="min-w-[50px] rounded px-2 py-1 text-xs text-white hover:bg-white/10"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                className="rounded p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={handleZoomReset}
                className="ml-1 rounded border-l border-white/20 p-1.5 hover:bg-white/10"
                title="Fit to View"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </button>
            </div>
          )}

          {/* Empty State */}
          {!firstFrame && !isExtracting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-gray-600">Upload a video to start editing</p>
            </div>
          )}

          {/* Loading State */}
          {isExtracting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-purple-500" />
                <p className="text-sm text-gray-400">Extracting first frame...</p>
              </div>
            </div>
          )}

          {/* Canvas Area */}
          {firstFrame && !isExtracting && (
            <div className="inline-block p-4">
              <div
                ref={wrapperRef}
                className="relative inline-block cursor-none"
                style={{
                  width: displayDimensions.w > 0 ? displayDimensions.w * zoomLevel : undefined,
                  height: displayDimensions.h > 0 ? displayDimensions.h * zoomLevel : undefined,
                }}
              >
                {/* First Frame Image */}
                <img
                  src={firstFrame}
                  alt="First frame"
                  onLoad={handleImageLoad}
                  className="pointer-events-none block"
                  style={{
                    width: displayDimensions.w > 0 ? displayDimensions.w * zoomLevel : undefined,
                    height: displayDimensions.h > 0 ? displayDimensions.h * zoomLevel : undefined,
                    maxWidth: displayDimensions.w > 0 ? undefined : '100%',
                    maxHeight: displayDimensions.w > 0 ? undefined : '500px',
                    objectFit: 'contain',
                  }}
                />

                {/* Mask Canvas Overlay */}
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 z-[5] touch-none"
                  style={{
                    width: displayDimensions.w > 0 ? displayDimensions.w * zoomLevel : 0,
                    height: displayDimensions.h > 0 ? displayDimensions.h * zoomLevel : 0,
                    cursor: 'none',
                    pointerEvents: displayDimensions.w > 0 ? 'auto' : 'none',
                    opacity: 0.6,
                    mixBlendMode: 'screen',
                  }}
                />

                {/* Brush Cursor */}
                <div
                  ref={cursorRef}
                  className="pointer-events-none absolute z-10 rounded-full border-2 border-white bg-purple-500/30"
                  style={{
                    width: brushSize,
                    height: brushSize,
                    display: 'none',
                    boxShadow: '0 0 4px 2px rgba(0,0,0,0.5)',
                  }}
                />

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-purple-500" />
                      <span className="text-xs text-white">Processing video...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result Video */}
          {resultVideoUrl && (
            <div className="absolute right-4 bottom-4 left-4 rounded-lg bg-black/80 p-4 backdrop-blur-sm">
              <h3 className="mb-2 text-sm font-medium text-white">Result</h3>
              <video src={resultVideoUrl} controls className="max-h-48 w-full rounded-lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickRotoPanel;

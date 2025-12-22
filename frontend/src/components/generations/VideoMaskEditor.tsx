import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Eraser, Pencil, Undo } from 'lucide-react';
import { clsx } from 'clsx';

interface VideoMaskEditorProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (maskDataUrl: string) => void;
}

export function VideoMaskEditor({ videoUrl, isOpen, onClose, onSave }: VideoMaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });

  // Initialize canvas when video loads
  useEffect(() => {
    if (isOpen && videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.onloadedmetadata = () => {
        setVideoSize({ width: video.videoWidth, height: video.videoHeight });
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
          // Clear canvas
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
            // Fill with transparent black if needed, but for mask we usually want:
            // White = Inpaint area
            // Black = Keep area
            // Or Transparent = Keep area?
            // Fal VACE usually expects a B&W mask image.
            // Let's assume we draw White on Black.
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, video.videoWidth, video.videoHeight);
          }
        }
      };
    }
  }, [isOpen, videoUrl]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath(); // Reset path
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate coordinates
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Map client coords to canvas coords
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = tool === 'brush' ? 'white' : 'black';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Retake / Inpaint</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
          <div className="relative" ref={containerRef}>
            {/* Background Video (First Frame / Poster) */}
            <video
              src={videoUrl}
              className="max-h-[70vh] max-w-full object-contain opacity-50"
              muted
              playsInline
            />

            {/* Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg bg-black/50 p-1">
              <button
                onClick={() => setTool('brush')}
                className={clsx(
                  'rounded-md p-2 transition-colors',
                  tool === 'brush' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={clsx(
                  'rounded-md p-2 transition-colors',
                  tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <Eraser className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Size</span>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="w-32 accent-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-500"
            >
              <Check className="h-4 w-4" />
              Apply Retake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

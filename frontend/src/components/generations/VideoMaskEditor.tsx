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
            video.crossOrigin = "anonymous";
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

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl flex flex-col gap-4 h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Retake / Inpaint</h2>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative bg-[#1a1a1a] rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
                    <div className="relative" ref={containerRef}>
                        {/* Background Video (First Frame / Poster) */}
                        <video
                            src={videoUrl}
                            className="max-w-full max-h-[70vh] object-contain opacity-50"
                            muted
                            playsInline
                        />

                        {/* Canvas Overlay */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
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
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-black/50 rounded-lg p-1">
                            <button
                                onClick={() => setTool('brush')}
                                className={clsx("p-2 rounded-md transition-colors", tool === 'brush' ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")}
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTool('eraser')}
                                className={clsx("p-2 rounded-md transition-colors", tool === 'eraser' ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")}
                            >
                                <Eraser className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Size</span>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-32 accent-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Apply Retake
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

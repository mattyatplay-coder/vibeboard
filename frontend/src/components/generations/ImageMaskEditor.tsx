import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Eraser, Pencil, Undo } from 'lucide-react';
import { clsx } from 'clsx';

interface ImageMaskEditorProps {
    imageUrl: string;
    isOpen: boolean;
    onClose: () => void;
    onSave: (maskDataUrl: string, prompt: string, negativePrompt: string, strength: number, seed?: number) => void;
    initialPrompt?: string;
}

export function ImageMaskEditor({ imageUrl, isOpen, onClose, onSave, initialPrompt = "" }: ImageMaskEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [prompt, setPrompt] = useState(initialPrompt);
    const [negativePrompt, setNegativePrompt] = useState("");
    const [strength, setStrength] = useState(1.0);
    const [seed, setSeed] = useState<string>(""); // Seed as string for input
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // Initialize canvas when image loads
    useEffect(() => {
        if (isOpen && imageUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            img.onload = () => {
                setImageSize({ width: img.width, height: img.height });
                if (canvasRef.current) {
                    canvasRef.current.width = img.width;
                    canvasRef.current.height = img.height;
                    // Clear canvas (transparent)
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, img.width, img.height);
                    }
                }
            };
        }
    }, [isOpen, imageUrl]);

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
        ctx.lineJoin = 'round';
        // We draw with White for the mask (Inpaint area)
        // If eraser, we use 'destination-out' to make it transparent again
        ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
        ctx.strokeStyle = 'white'; // Always white for mask

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    };

    const handleSave = () => {
        if (canvasRef.current) {
            // Create a temporary canvas to composite the mask
            // We need a Black background (Keep) and White foreground (Inpaint)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasRef.current.width;
            tempCanvas.height = canvasRef.current.height;
            const tCtx = tempCanvas.getContext('2d');

            if (tCtx) {
                // 1. Fill with Black (Keep area)
                tCtx.fillStyle = 'black';
                tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 2. Draw the user's mask (White/Transparent) on top
                tCtx.drawImage(canvasRef.current, 0, 0);

                try {
                    const dataUrl = tempCanvas.toDataURL('image/png');
                    const seedNumber = seed ? parseInt(seed) : undefined;
                    onSave(dataUrl, prompt, negativePrompt, strength, seedNumber);
                    onClose();
                } catch (e) {
                    console.error("Failed to export mask from canvas:", e);
                    alert("Failed to create mask. The image might be protected or failed to load correctly.");
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-5xl flex flex-col gap-4 h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Inpaint Image</h2>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative bg-[#1a1a1a] rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
                    <div className="relative" ref={containerRef}>
                        {/* Background Image */}
                        <img
                            src={imageUrl}
                            crossOrigin="anonymous"
                            className="max-w-full max-h-[60vh] object-contain opacity-50"
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

                {/* Controls & Prompt */}
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/10 flex flex-col gap-4">

                    <div className="grid grid-cols-2 gap-4">
                        {/* Prompt Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inpaint Prompt</label>
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe what you want to see..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Negative Prompt Input */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Negative Prompt</label>
                            <input
                                type="text"
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="What to avoid (e.g. clothes, bad quality)..."
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-4">
                            <div className="flex bg-black/50 rounded-lg p-1">
                                <button
                                    onClick={() => setTool('brush')}
                                    className={clsx("p-2 rounded-md transition-colors", tool === 'brush' ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")}
                                    title="Brush (Mask)"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setTool('eraser')}
                                    className={clsx("p-2 rounded-md transition-colors", tool === 'eraser' ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white")}
                                    title="Eraser (Unmask)"
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Brush Size</span>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-24 accent-blue-600"
                                />
                            </div>

                            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                <span className="text-xs text-gray-400">Strength ({strength})</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.05"
                                    value={strength}
                                    onChange={(e) => setStrength(parseFloat(e.target.value))}
                                    className="w-24 accent-green-600"
                                />
                            </div>

                            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                                <span className="text-xs text-gray-400">Seed</span>
                                <input
                                    type="text"
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Random"
                                    className="w-32 bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

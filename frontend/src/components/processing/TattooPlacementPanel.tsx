import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Upload, Sliders, Save, Layers, Eraser, Move, Grid3X3, Circle, Sparkles, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

interface TattooPlacementPanelProps {
    initialImageUrl?: string;
    projectId?: string;
}

interface WarpPoint {
    x: number;
    y: number;
}

type WarpMode = 'none' | 'mesh' | 'cylindrical';

export function TattooPlacementPanel({ initialImageUrl, projectId }: TattooPlacementPanelProps) {
    const [baseImage, setBaseImage] = useState<File | null>(null);
    const [tattooImage, setTattooImage] = useState<File | null>(null);
    const [maskImage, setMaskImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(false);
    const initialLoadedRef = useRef(false);

    // Canvas refs for interactive placement
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tattoo position (normalized 0-1 relative to canvas)
    const [tattooPos, setTattooPos] = useState({ x: 0.5, y: 0.5 });
    const [tattooScale, setTattooScale] = useState(0.4);
    const [tattooRotation, setTattooRotation] = useState(0);

    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [activeMeshPoint, setActiveMeshPoint] = useState<{ row: number; col: number } | null>(null);

    // Warp controls
    const [warpMode, setWarpMode] = useState<WarpMode>('none');
    const [meshPoints, setMeshPoints] = useState<WarpPoint[][]>([
        [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }],
        [{ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }],
        [{ x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }]
    ]);
    const [cylindricalBend, setCylindricalBend] = useState(0.3); // 0 = flat, 1 = full wrap

    // Other parameters
    const [opacity, setOpacity] = useState(0.85);
    const [removeBackground, setRemoveBackground] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // AI Generation
    const [showAIPrompt, setShowAIPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Image dimensions for canvas
    const [baseImageDimensions, setBaseImageDimensions] = useState({ width: 0, height: 0 });
    const [tattooImageUrl, setTattooImageUrl] = useState<string | null>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load initial image from URL if provided
    useEffect(() => {
        if (!initialImageUrl || initialLoadedRef.current) return;
        initialLoadedRef.current = true;

        const loadInitialImage = async () => {
            setIsLoadingInitial(true);
            try {
                const response = await fetch(initialImageUrl);
                if (!response.ok) throw new Error('Failed to fetch image');
                const blob = await response.blob();
                const file = new File([blob], 'initial-image.png', { type: blob.type || 'image/png' });
                setBaseImage(file);
                toast.success('Image loaded');
            } catch (err) {
                console.error('Failed to load initial image:', err);
                toast.error('Failed to load image');
            } finally {
                setIsLoadingInitial(false);
            }
        };

        loadInitialImage();
    }, [initialImageUrl]);

    // Load base image dimensions
    useEffect(() => {
        if (!baseImage) return;
        const url = URL.createObjectURL(baseImage);
        const img = new Image();
        img.onload = () => {
            setBaseImageDimensions({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, [baseImage]);

    // Update tattoo image URL
    useEffect(() => {
        if (tattooImage) {
            const url = URL.createObjectURL(tattooImage);
            setTattooImageUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setTattooImageUrl(null);
        }
    }, [tattooImage]);

    // Draw interactive canvas
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !baseImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Calculate aspect ratio fitting
        const baseAspect = baseImageDimensions.width / baseImageDimensions.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;
        if (baseAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / baseAspect;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * baseAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw base image
        const baseUrl = URL.createObjectURL(baseImage);
        const baseImg = new Image();
        baseImg.onload = () => {
            ctx.drawImage(baseImg, offsetX, offsetY, drawWidth, drawHeight);
            URL.revokeObjectURL(baseUrl);

            // Draw tattoo overlay if available
            if (tattooImageUrl) {
                const tattooImg = new Image();
                tattooImg.onload = () => {
                    const tattooWidth = drawWidth * tattooScale;
                    const tattooHeight = (tattooImg.height / tattooImg.width) * tattooWidth;

                    const posX = offsetX + (tattooPos.x * drawWidth) - (tattooWidth / 2);
                    const posY = offsetY + (tattooPos.y * drawHeight) - (tattooHeight / 2);

                    ctx.save();
                    ctx.globalAlpha = 0.7; // Semi-transparent for placement preview

                    // Apply rotation
                    const centerX = posX + tattooWidth / 2;
                    const centerY = posY + tattooHeight / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate((tattooRotation * Math.PI) / 180);
                    ctx.translate(-centerX, -centerY);

                    // Apply warp visualization
                    if (warpMode === 'cylindrical') {
                        // Draw with perspective simulation
                        drawCylindricalWarp(ctx, tattooImg, posX, posY, tattooWidth, tattooHeight);
                    } else if (warpMode === 'mesh') {
                        // Draw mesh grid overlay
                        ctx.drawImage(tattooImg, posX, posY, tattooWidth, tattooHeight);
                        drawMeshGrid(ctx, posX, posY, tattooWidth, tattooHeight);
                    } else {
                        ctx.drawImage(tattooImg, posX, posY, tattooWidth, tattooHeight);
                    }

                    ctx.restore();

                    // Draw selection handles
                    drawHandles(ctx, posX, posY, tattooWidth, tattooHeight);
                };
                tattooImg.src = tattooImageUrl;
            }
        };
        baseImg.src = baseUrl;
    }, [baseImage, tattooImageUrl, tattooPos, tattooScale, tattooRotation, warpMode, cylindricalBend, meshPoints, baseImageDimensions]);

    // Draw cylindrical warp effect
    const drawCylindricalWarp = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        const slices = 20;
        const sliceWidth = w / slices;

        for (let i = 0; i < slices; i++) {
            const t = i / slices;
            const angle = (t - 0.5) * Math.PI * cylindricalBend;

            // Calculate perspective scaling
            const perspectiveScale = Math.cos(angle);
            const sliceHeight = h * (0.7 + 0.3 * perspectiveScale);
            const yOffset = (h - sliceHeight) / 2;

            // Calculate x position with curve
            const curveOffset = Math.sin(angle) * w * 0.1 * cylindricalBend;

            ctx.drawImage(
                img,
                (i / slices) * img.width,
                0,
                img.width / slices,
                img.height,
                x + (i * sliceWidth) + curveOffset,
                y + yOffset,
                sliceWidth,
                sliceHeight
            );
        }
    };

    // Draw mesh grid for warp mode
    const drawMeshGrid = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;

        // Draw grid lines
        for (let row = 0; row < meshPoints.length; row++) {
            ctx.beginPath();
            for (let col = 0; col < meshPoints[row].length; col++) {
                const px = x + meshPoints[row][col].x * w;
                const py = y + meshPoints[row][col].y * h;
                if (col === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        for (let col = 0; col < meshPoints[0].length; col++) {
            ctx.beginPath();
            for (let row = 0; row < meshPoints.length; row++) {
                const px = x + meshPoints[row][col].x * w;
                const py = y + meshPoints[row][col].y * h;
                if (row === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Draw control points
        ctx.fillStyle = '#a855f7';
        for (let row = 0; row < meshPoints.length; row++) {
            for (let col = 0; col < meshPoints[row].length; col++) {
                const px = x + meshPoints[row][col].x * w;
                const py = y + meshPoints[row][col].y * h;
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    };

    // Draw selection handles
    const drawHandles = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        const handleSize = 8;
        ctx.fillStyle = '#a855f7';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Corner handles
        const handles = [
            { id: 'tl', x: x, y: y },
            { id: 'tr', x: x + w, y: y },
            { id: 'bl', x: x, y: y + h },
            { id: 'br', x: x + w, y: y + h },
            { id: 'center', x: x + w / 2, y: y + h / 2 },
        ];

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
        });

        // Rotation handle
        ctx.beginPath();
        ctx.arc(x + w / 2, y - 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Line to rotation handle
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y - 20);
        ctx.strokeStyle = '#a855f7';
        ctx.stroke();
    };

    // Redraw canvas when dependencies change
    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Helper to get canvas draw dimensions
    const getCanvasDrawDimensions = () => {
        const canvas = canvasRef.current;
        if (!canvas || baseImageDimensions.width === 0) return null;

        const baseAspect = baseImageDimensions.width / baseImageDimensions.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;
        if (baseAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / baseAspect;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * baseAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        return { drawWidth, drawHeight, offsetX, offsetY };
    };

    // Handle mouse events for dragging
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !tattooImageUrl) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dims = getCanvasDrawDimensions();
        if (!dims) return;

        const { drawWidth, drawHeight, offsetX, offsetY } = dims;

        // Calculate tattoo bounding box
        const tattooWidth = drawWidth * tattooScale;
        const tattooHeight = tattooWidth; // Approximate, will be refined
        const posX = offsetX + (tattooPos.x * drawWidth) - (tattooWidth / 2);
        const posY = offsetY + (tattooPos.y * drawHeight) - (tattooHeight / 2);

        // Check if clicking on a mesh control point (only in mesh mode)
        if (warpMode === 'mesh') {
            const hitRadius = 12; // Larger hit area for easier clicking
            for (let row = 0; row < meshPoints.length; row++) {
                for (let col = 0; col < meshPoints[row].length; col++) {
                    const px = posX + meshPoints[row][col].x * tattooWidth;
                    const py = posY + meshPoints[row][col].y * tattooHeight;
                    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
                    if (dist < hitRadius) {
                        // Hit a mesh control point
                        setActiveMeshPoint({ row, col });
                        setIsDragging(true);
                        setDragStart({ x, y });
                        return; // Don't start image drag
                    }
                }
            }
        }

        // No mesh point hit, start regular image drag
        setActiveMeshPoint(null);
        setIsDragging(true);
        setDragStart({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dims = getCanvasDrawDimensions();
        if (!dims) return;

        const { drawWidth, drawHeight, offsetX, offsetY } = dims;

        // If dragging a mesh point, update its position
        if (activeMeshPoint) {
            const tattooWidth = drawWidth * tattooScale;
            const tattooHeight = tattooWidth;
            const posX = offsetX + (tattooPos.x * drawWidth) - (tattooWidth / 2);
            const posY = offsetY + (tattooPos.y * drawHeight) - (tattooHeight / 2);

            // Calculate normalized position within the tattoo bounds
            const localX = (x - posX) / tattooWidth;
            const localY = (y - posY) / tattooHeight;

            // Clamp to reasonable bounds (allow some overflow for extreme warping)
            const clampedX = Math.max(-0.5, Math.min(1.5, localX));
            const clampedY = Math.max(-0.5, Math.min(1.5, localY));

            // Update the mesh point
            setMeshPoints(prev => {
                const newPoints = prev.map(row => row.map(p => ({ ...p })));
                newPoints[activeMeshPoint.row][activeMeshPoint.col] = { x: clampedX, y: clampedY };
                return newPoints;
            });
            return;
        }

        // Calculate normalized position for tattoo movement
        const normalizedX = Math.max(0, Math.min(1, (x - offsetX) / drawWidth));
        const normalizedY = Math.max(0, Math.min(1, (y - offsetY) / drawHeight));

        setTattooPos({ x: normalizedX, y: normalizedY });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setActiveMeshPoint(null);
            // Trigger preview update
            if (baseImage && tattooImage) {
                updatePreview();
            }
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.02 : 0.02;
        setTattooScale(prev => Math.max(0.1, Math.min(1.5, prev + delta)));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'base' | 'tattoo' | 'mask') => {
        if (e.target.files?.[0]) {
            if (type === 'base') setBaseImage(e.target.files[0]);
            else if (type === 'tattoo') setTattooImage(e.target.files[0]);
            else setMaskImage(e.target.files[0]);
        }
    };

    const updatePreview = async () => {
        if (!baseImage || !tattooImage) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setIsProcessing(true);
            try {
                const formData = new FormData();
                formData.append('base_image', baseImage);
                formData.append('tattoo_image', tattooImage);
                if (maskImage) formData.append('mask_image', maskImage);

                // Convert normalized position to pixel offset
                const xOffset = Math.round((tattooPos.x - 0.5) * baseImageDimensions.width);
                const yOffset = Math.round((tattooPos.y - 0.5) * baseImageDimensions.height);

                formData.append('opacity', opacity.toString());
                formData.append('xOffset', xOffset.toString());
                formData.append('yOffset', yOffset.toString());
                formData.append('widthRatio', tattooScale.toString());
                formData.append('removeBackground', removeBackground.toString());
                formData.append('rotation', tattooRotation.toString());

                // Warp parameters
                formData.append('warpMode', warpMode);
                if (warpMode === 'cylindrical') {
                    formData.append('cylindricalBend', cylindricalBend.toString());
                } else if (warpMode === 'mesh') {
                    formData.append('meshPoints', JSON.stringify(meshPoints));
                }

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/tattoo-composite`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) throw new Error("Processing failed");

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });

            } catch (err) {
                console.error(err);
                toast.error("Failed to update preview");
            } finally {
                setIsProcessing(false);
            }
        }, 300);
    };

    // AI Generation
    const handleAIGenerate = async () => {
        if (!baseImage || !aiPrompt.trim()) {
            toast.error("Please upload a base image and enter a prompt");
            return;
        }

        setIsGeneratingAI(true);
        try {
            // Convert base image to URL for API
            const formData = new FormData();
            formData.append('base_image', baseImage);
            formData.append('prompt', aiPrompt);
            formData.append('projectId', projectId || '');

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/tattoo-ai-generate`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error("AI generation failed");

            const data = await res.json();
            if (data.imageUrl) {
                // Load the generated image as preview
                setPreviewUrl(data.imageUrl);
                toast.success("Tattoo generated with AI!");
            }
        } catch (err) {
            console.error(err);
            toast.error("AI generation failed");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = `tattoo_composite_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Image downloaded");
    };

    const resetTransform = () => {
        setTattooPos({ x: 0.5, y: 0.5 });
        setTattooScale(0.4);
        setTattooRotation(0);
        setMeshPoints([
            [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 }],
            [{ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }],
            [{ x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }]
        ]);
        setCylindricalBend(0.3);
    };

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-purple-400">
                <Layers className="w-6 h-6" />
                Tattoo Studio
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                {/* Left: Uploads */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 block">Base Skin</label>
                        <label className="border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors h-28 relative">
                            {baseImage ? (
                                <img src={URL.createObjectURL(baseImage)} className="absolute inset-0 w-full h-full object-cover opacity-50 rounded-lg" />
                            ) : (
                                <Upload className="w-5 h-5 text-gray-500 mb-1" />
                            )}
                            <span className="text-xs text-gray-400 text-center z-10">{baseImage ? "Change Photo" : "Select Photo"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'base')} />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 block">Tattoo Design</label>
                        <label className="border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors h-28 relative">
                            {tattooImage ? (
                                <img src={URL.createObjectURL(tattooImage)} className="absolute inset-0 w-full h-full object-contain opacity-50 rounded-lg p-2" />
                            ) : (
                                <Upload className="w-5 h-5 text-gray-500 mb-1" />
                            )}
                            <span className="text-xs text-gray-400 text-center z-10">{tattooImage ? "Change Design" : "Select PNG"}</span>
                            <input type="file" accept="image/png,image/*" className="hidden" onChange={e => handleFileSelect(e, 'tattoo')} />
                        </label>
                    </div>

                    {/* Masking */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                                <Eraser className="w-3 h-3" /> Optional Mask
                            </label>
                            {maskImage && (
                                <button onClick={() => setMaskImage(null)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                            )}
                        </div>
                        <label className="cursor-pointer block">
                            <div className="text-xs text-center border border-dashed border-gray-600 rounded bg-black/20 py-2 hover:bg-white/5 transition-colors">
                                {maskImage ? maskImage.name : "Upload Mask"}
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'mask')} />
                        </label>
                        <p className="text-[10px] text-gray-600 mt-1">White = erase tattoo</p>
                    </div>

                    {/* AI Generation */}
                    <div className="p-3 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/30">
                        <button
                            onClick={() => setShowAIPrompt(!showAIPrompt)}
                            className="flex items-center gap-2 text-sm font-medium text-purple-300 w-full"
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Tattoo Generation
                        </button>
                        {showAIPrompt && (
                            <div className="mt-3 space-y-2">
                                <textarea
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    placeholder="Describe the tattoo you want (e.g., 'tribal dragon sleeve tattoo')"
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 resize-none"
                                    rows={3}
                                />
                                <button
                                    onClick={handleAIGenerate}
                                    disabled={isGeneratingAI || !baseImage}
                                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-2 rounded flex items-center justify-center gap-2"
                                >
                                    {isGeneratingAI ? (
                                        <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Sparkles className="w-3 h-3" /> Generate with AI</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Interactive Canvas */}
                <div
                    ref={containerRef}
                    className="bg-black/40 rounded-lg overflow-hidden border border-white/10 relative min-h-[400px] lg:col-span-1"
                >
                    {!baseImage ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isLoadingInitial ? (
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Loading...</p>
                                </div>
                            ) : (
                                <p className="text-gray-600 text-sm">Upload an image to start</p>
                            )}
                        </div>
                    ) : (
                        <>
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full cursor-move"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onWheel={handleWheel}
                            />

                            {/* Canvas overlay instructions */}
                            {tattooImage && (
                                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-gray-400">
                                    {warpMode === 'mesh' ? (
                                        <><Grid3X3 className="w-3 h-3 inline mr-1" /> Drag purple points to warp | Drag elsewhere to move</>
                                    ) : (
                                        <><Move className="w-3 h-3 inline mr-1" /> Drag to move | Scroll to scale</>
                                    )}
                                </div>
                            )}

                            {isProcessing && (
                                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right: Controls & Preview */}
                <div className="space-y-4">
                    {/* Warp Mode Selection */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Warp Mode</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setWarpMode('none')}
                                className={`py-2 px-3 rounded text-xs flex flex-col items-center gap-1 transition-colors ${warpMode === 'none' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                <Move className="w-4 h-4" />
                                Flat
                            </button>
                            <button
                                onClick={() => setWarpMode('mesh')}
                                className={`py-2 px-3 rounded text-xs flex flex-col items-center gap-1 transition-colors ${warpMode === 'mesh' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                <Grid3X3 className="w-4 h-4" />
                                Mesh
                            </button>
                            <button
                                onClick={() => setWarpMode('cylindrical')}
                                className={`py-2 px-3 rounded text-xs flex flex-col items-center gap-1 transition-colors ${warpMode === 'cylindrical' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            >
                                <Circle className="w-4 h-4" />
                                Cylinder
                            </button>
                        </div>

                        {warpMode === 'cylindrical' && (
                            <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Bend Amount</span>
                                    <span>{Math.round(cylindricalBend * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={cylindricalBend}
                                    onChange={e => setCylindricalBend(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Fine Tuning */}
                    <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-purple-300">
                                <Sliders className="w-4 h-4" />
                                <span className="font-medium text-xs">Fine Tuning</span>
                            </div>
                            <button
                                onClick={resetTransform}
                                className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={removeBackground}
                                onChange={e => setRemoveBackground(e.target.checked)}
                                className="w-3 h-3 rounded bg-white/10 border-white/20 accent-purple-500"
                            />
                            <span>Remove White BG</span>
                        </label>

                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Opacity</span>
                                <span>{Math.round(opacity * 100)}%</span>
                            </div>
                            <input
                                type="range" min="0.1" max="1.0" step="0.05"
                                value={opacity}
                                onChange={e => setOpacity(parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Scale</span>
                                <span>{Math.round(tattooScale * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setTattooScale(s => Math.max(0.1, s - 0.05))} className="p-1 bg-white/5 rounded hover:bg-white/10">
                                    <ZoomOut className="w-3 h-3 text-gray-400" />
                                </button>
                                <input
                                    type="range" min="0.1" max="1.5" step="0.05"
                                    value={tattooScale}
                                    onChange={e => setTattooScale(parseFloat(e.target.value))}
                                    className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <button onClick={() => setTattooScale(s => Math.min(1.5, s + 0.05))} className="p-1 bg-white/5 rounded hover:bg-white/10">
                                    <ZoomIn className="w-3 h-3 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Rotation</span>
                                <span>{tattooRotation}°</span>
                            </div>
                            <input
                                type="range" min="-180" max="180" step="5"
                                value={tattooRotation}
                                onChange={e => setTattooRotation(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                        </div>
                    </div>

                    {/* Preview Result */}
                    {previewUrl && (
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-400 block">Final Result</label>
                            <div className="relative aspect-[4/3] bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                <img src={previewUrl} className="w-full h-full object-contain" alt="Final Preview" />
                            </div>
                            <button
                                onClick={handleDownload}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
                            >
                                <Save className="w-4 h-4" /> Download
                            </button>
                        </div>
                    )}

                    {/* Generate Preview Button */}
                    {baseImage && tattooImage && !previewUrl && (
                        <button
                            onClick={updatePreview}
                            disabled={isProcessing}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                                <>Generate Preview</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
